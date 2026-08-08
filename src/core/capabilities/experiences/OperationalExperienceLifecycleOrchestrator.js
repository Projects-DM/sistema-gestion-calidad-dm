import { format } from 'date-fns';
import { OperationalExperienceRegistry } from './OperationalExperienceRegistry.js';
import { createOperationalRecordsService } from '../../../services/operationalRecordsService.js';
import { isSupabaseConfigured } from '../../../lib/supabase';
import {
  evaluateRecord,
  applyFormAutomations,
  getFormVisibility,
} from './rules/UniversalOperationalRulesEngine.js';
import { OperationalAuditService } from '../../../services/operationalAuditService.js';
import { OperationalEventBus } from './OperationalEventBus.js';
// Sprint 132.1 — CERTIFIED: el Orchestrator es la única autoridad del lifecycle.
// Las validaciones canApprove/canClose/canReopen se ejecutan aquí, no en el UI Runtime.
import { canApprove, canClose, canReopen } from './OperationalDataCompletion.js';

export class OperationalExperienceLifecycleOrchestrator {
  constructor(experienceKey) {
    this.experienceKey = experienceKey;
    this.contract = null;
    this._service = null;
    this._initialized = false;
  }

  get initialized() { return this._initialized; }

  initialize() {
    this.contract = OperationalExperienceRegistry.getExperienceContract(this.experienceKey);
    if (!this.contract) throw new Error(`Experience ${this.experienceKey} not registered`);
    const config = this.contract.persistence || {};
    this._service = createOperationalRecordsService(config.tableName || this.experienceKey, {
      prefix: config.prefix || this.experienceKey.slice(0, 3).toUpperCase(),
      fieldMapping: config.fieldMapping,
    });
    this._initialized = true;
    return this.contract;
  }

  _detectInputType(field) {
    const normalizer = this.contract.documentContract.fieldNormalizers?.[field];
    if (normalizer?.name === 'toYmd') return 'date';
    if (normalizer?.name === 'toHm') return 'time';
    if (normalizer?.name === 'toNumber') return 'number';
    return 'text';
  }

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------
  loadRecords() {
    if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');
    return this._service.fetch();
  }

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------
  buildInitialForm(editingRecord) {
    const canonicalFields = this.contract.documentContract.canonicalFields || [];
    let initial;
    if (editingRecord) {
      initial = {};
      for (const f of canonicalFields) initial[f] = editingRecord[f] ?? '';
    } else {
      initial = {};
      for (const f of canonicalFields) {
        const type = this._detectInputType(f);
        if (type === 'date') initial[f] = format(new Date(), 'yyyy-MM-dd');
        else if (type === 'time') initial[f] = format(new Date(), 'HH:mm');
        else initial[f] = '';
      }
    }
    const formData = applyFormAutomations(initial, this.contract);
    const visibility = getFormVisibility(formData, this.contract);
    const { allErrors, complianceIssues } = evaluateRecord(formData, this.contract);
    return { formData, visibility, errors: allErrors, compliance: complianceIssues };
  }

  recalcVisibility(formData) {
    return getFormVisibility(formData, this.contract);
  }

  evaluate(formData) {
    return evaluateRecord(formData, this.contract);
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------
  async createRecord(formData, user) {
    const evaluation = evaluateRecord(formData, this.contract);
    if (!evaluation.isValid) {
      return { success: false, errors: evaluation.allErrors, compliance: evaluation.complianceIssues, action: 'validation_failed' };
    }
    try {
      const inserted = await this._service.insert(formData);
      OperationalAuditService.auditCreate({ experienceKey: this.experienceKey, recordId: inserted.id, eventData: { fieldCount: Object.keys(formData).length }, user });
      if (evaluation.complianceIssues?.length) {
        OperationalAuditService.auditCompliance({ experienceKey: this.experienceKey, recordId: inserted.id, eventData: { warnings: evaluation.complianceIssues }, user });
      }
      OperationalEventBus.publish('RECORD_CREATED', { experienceKey: this.experienceKey, recordId: inserted.id, action: 'created' });
      return { success: true, record: inserted, compliance: evaluation.complianceIssues, action: 'created' };
    } catch (err) {
      return { success: false, errors: [{ field: 'general', message: err?.message || 'Error de persistencia' }], compliance: [], action: 'persistence_failed' };
    }
  }

  async updateRecord(id, formData, user) {
    const evaluation = evaluateRecord(formData, this.contract);
    if (!evaluation.isValid) {
      return { success: false, errors: evaluation.allErrors, compliance: evaluation.complianceIssues, action: 'validation_failed' };
    }
    try {
      const updated = await this._service.update(id, formData);
      OperationalAuditService.auditUpdate({ experienceKey: this.experienceKey, recordId: id, eventData: { fieldCount: Object.keys(formData).length }, user });
      if (evaluation.complianceIssues?.length) {
        OperationalAuditService.auditCompliance({ experienceKey: this.experienceKey, recordId: id, eventData: { warnings: evaluation.complianceIssues }, user });
      }
      OperationalEventBus.publish('RECORD_UPDATED', { experienceKey: this.experienceKey, recordId: id, action: 'updated' });
      return { success: true, record: updated, compliance: evaluation.complianceIssues, action: 'updated' };
    } catch (err) {
      return { success: false, errors: [{ field: 'general', message: err?.message || 'Error de persistencia' }], compliance: [], action: 'persistence_failed' };
    }
  }

  async deleteRecord(id, user) {
    await this._service.delete(id);
    OperationalAuditService.auditDelete({ experienceKey: this.experienceKey, recordId: id, user });
    OperationalEventBus.publish('RECORD_DELETED', { experienceKey: this.experienceKey, recordId: id, action: 'deleted' });
    return { success: true, action: 'deleted' };
  }

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------
  async importRecords(rows, user) {
    if (!rows?.length) throw new Error('No hay filas para importar');
    const inserted = await this._service.insertBatch(rows);
    OperationalAuditService.auditImport({ experienceKey: this.experienceKey, recordId: null, eventData: { count: inserted.length }, user });
    OperationalEventBus.publish('RECORDS_IMPORTED', { experienceKey: this.experienceKey, count: inserted.length, action: 'imported' });
    return { success: true, count: inserted.length, records: inserted, action: 'imported' };
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  async exportPdf(records, user) {
    if (!records?.length) throw new Error('No hay registros para exportar');
    const { default: jsPDF } = await import('jspdf');
    const mod = await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(this.contract.metadata.name || 'Registros', 14, 22);
    doc.setFontSize(10);
    doc.text(`Exportado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
    const tableFields = this.contract.ui?.tableFields || this.contract.documentContract.canonicalFields || [];
    const cols = tableFields.map(f => this.contract.ui?.fieldDisplay?.[f]?.label || f);
    const data = records.map(r => tableFields.map(f => String(r[f] ?? '')));
    doc.autoTable({ head: [cols], body: data, startY: 36 });
    const filename = `${this.experienceKey}-${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(filename);
    OperationalAuditService.auditExport({ experienceKey: this.experienceKey, recordId: null, eventData: { count: records.length, format: 'pdf' }, user });
    return { success: true, filename, action: 'exported' };
  }

  async exportExcel(records, user) {
    if (!records?.length) throw new Error('No hay registros para exportar');
    const tableFields = this.contract.ui?.tableFields || this.contract.documentContract.canonicalFields || [];
    const cols = tableFields.map(f => this.contract.ui?.fieldDisplay?.[f]?.label || f);
    const data = records.map(r => tableFields.map(f => String(r[f] ?? '')));
    const BOM = '\uFEFF';
    const csvContent = data.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.experienceKey}-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    OperationalAuditService.auditExport({ experienceKey: this.experienceKey, recordId: null, eventData: { count: records.length, format: 'csv' }, user });
    return { success: true, filename: a.download, action: 'exported' };
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------
  async getRecordTimeline(recordId) {
    return OperationalAuditService.getRecordTimeline(this.experienceKey, recordId);
  }

  async bulkUpdateStatus(ids, newStatus, user) {
    if (!ids?.length) throw new Error('No hay registros seleccionados');
    const allowedStatuses = ['pendiente', 'en_proceso', 'completado'];
    if (!allowedStatuses.includes(newStatus)) {
      return { success: false, errors: [{ field: 'estado', message: `Estado '${newStatus}' no es un estado operacional válido. Solo se permiten: ${allowedStatuses.join(', ')}` }], action: 'validation_failed' };
    }
    const updated = await this._service.updateBatch(ids, { estado: newStatus });
    OperationalAuditService.auditBatchUpdate({ experienceKey: this.experienceKey, recordId: null, eventData: { action: 'bulk_status_updated', newStatus, count: updated.length, ids }, user });
    OperationalEventBus.publish('RECORDS_STATUS_UPDATED', { experienceKey: this.experienceKey, count: updated.length, newStatus, recordIds: ids, action: 'bulk_status_updated' });
    if (newStatus === 'completado') {
      // Sprint 257 — semantically-final operational signal (OCC-CERT-10/11):
      // completion is emitted ONLY upon reaching a final state; RECORD_CREATED
      // never emits it. The payload carries recordIds for the occurrence bridge.
      OperationalEventBus.publish('RESOURCE_COMPLETED', {
        experienceKey: this.experienceKey,
        count: updated.length,
        recordIds: ids,
        resourceKind: 'dynamicRecords',
        action: 'record_completed',
        completedAt: Date.now(),
      });
    }
    return { success: true, count: updated.length, records: updated, action: 'bulk_status_updated' };
  }

  async bulkDelete(ids, user) {
    if (!ids?.length) throw new Error('No hay registros seleccionados');
    const deleted = await this._service.deleteBatch(ids);
    OperationalAuditService.auditBatchDelete({ experienceKey: this.experienceKey, recordId: null, eventData: { count: deleted.length, ids }, user });
    OperationalEventBus.publish('RECORDS_BULK_DELETED', { experienceKey: this.experienceKey, count: deleted.length, action: 'bulk_deleted' });
    return { success: true, count: deleted.length, action: 'bulk_deleted' };
  }

  async approveRecords(ids, user, recordsMap = {}) {
    if (!ids?.length) throw new Error('No hay registros seleccionados');
    const invalid = ids.filter(id => {
      const record = recordsMap[id];
      return record && !canApprove(record, this.contract);
    });
    if (invalid.length > 0) {
      return { success: false, errors: [{ field: 'estado', message: `${invalid.length} registro(s) no cumplen los requisitos para aprobación (score < 100% o inconsistencias).` }], invalidIds: invalid, action: 'validation_failed' };
    }
    const validIds = ids.filter(id => {
      const record = recordsMap[id];
      return !record || canApprove(record, this.contract);
    });
    const updated = await this._service.updateBatch(validIds, { estado: 'approved' });
    OperationalAuditService.auditBatchUpdate({ experienceKey: this.experienceKey, recordId: null, eventData: { action: 'approved', count: updated.length, ids: validIds }, user });
    OperationalEventBus.publish('RECORDS_APPROVED', { experienceKey: this.experienceKey, count: updated.length, recordIds: validIds, action: 'approved' });
    return { success: true, count: updated.length, records: updated, action: 'approved' };
  }

  async closeRecords(ids, user, recordsMap = {}) {
    if (!ids?.length) throw new Error('No hay registros seleccionados');
    const invalid = ids.filter(id => {
      const record = recordsMap[id];
      return record && !canClose(record, this.contract);
    });
    if (invalid.length > 0) {
      return { success: false, errors: [{ field: 'estado', message: `${invalid.length} registro(s) no están aprobados. Solo registros con estado 'approved' pueden cerrarse.` }], invalidIds: invalid, action: 'validation_failed' };
    }
    const validIds = ids.filter(id => {
      const record = recordsMap[id];
      return !record || canClose(record, this.contract);
    });
    const updated = await this._service.updateBatch(validIds, { estado: 'cerrado' });
    OperationalAuditService.auditBatchUpdate({ experienceKey: this.experienceKey, recordId: null, eventData: { action: 'closed', count: updated.length, ids: validIds }, user });
    OperationalEventBus.publish('RECORDS_CLOSED', { experienceKey: this.experienceKey, count: updated.length, recordIds: validIds, action: 'closed' });
    return { success: true, count: updated.length, records: updated, action: 'closed' };
  }

  async reopenRecords(ids, user, recordsMap = {}) {
    if (!ids?.length) throw new Error('No hay registros seleccionados');
    const invalid = ids.filter(id => {
      const record = recordsMap[id];
      return record && !canReopen(record, this.contract);
    });
    if (invalid.length > 0) {
      return { success: false, errors: [{ field: 'estado', message: `${invalid.length} registro(s) no pueden reabrirse. Solo registros con estado 'approved' o 'cerrado' pueden reabrirse.` }], invalidIds: invalid, action: 'validation_failed' };
    }
    const validIds = ids.filter(id => {
      const record = recordsMap[id];
      return !record || canReopen(record, this.contract);
    });
    const updated = await this._service.updateBatch(validIds, { estado: 'en_proceso' });
    OperationalAuditService.auditBatchUpdate({ experienceKey: this.experienceKey, recordId: null, eventData: { action: 'reopened', targetState: 'en_proceso', count: updated.length, ids: validIds }, user });
    OperationalEventBus.publish('RECORDS_REOPENED', { experienceKey: this.experienceKey, count: updated.length, action: 'reopened' });
    return { success: true, count: updated.length, records: updated, action: 'reopened' };
  }

  destroy() {
    this.contract = null;
    this._service = null;
    this._initialized = false;
  }
}