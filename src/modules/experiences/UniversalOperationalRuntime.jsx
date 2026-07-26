import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Download, FileText, Search, Filter, Save, X, CheckCircle, AlertTriangle, ShieldAlert, Edit2, Trash2, BarChart3, History, ListChecks, Columns3, Clock, CheckCheck, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import RoleGate from '../../components/RoleGate';
import UniversalImportWorkflow from './UniversalImportWorkflow';
import UniversalOperationalDashboard from './UniversalOperationalDashboard';
import { OperationalExperienceRegistry } from '../../core/capabilities/experiences/OperationalExperienceRegistry.js';
import { OperationalExperienceLifecycleOrchestrator } from '../../core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js';
import { computeCompletionScore, detectDuplicates, detectInconsistencies, getReadinessState, canApprove, canClose, canReopen } from '../../core/capabilities/experiences/OperationalDataCompletion.js';
import Pagination from '../../components/Pagination.jsx';

function getFieldLabel(field, contract) {
  return contract.ui?.fieldDisplay?.[field]?.label
    || contract.documentContract.synonyms?.[field]?.[0]
    || field;
}

function getFieldOptions(field, contract) {
  return contract.ui?.fieldDisplay?.[field]?.options || null;
}

function getAutocompleteSource(field, contract) {
  return contract.ui?.fieldDisplay?.[field]?.autocomplete || null;
}

function getTableFields(contract) {
  return contract.ui?.tableFields || contract.documentContract.canonicalFields || [];
}

function detectInputType(field, contract) {
  const normalizer = contract.documentContract.fieldNormalizers?.[field];
  if (normalizer?.name === 'toYmd') return 'date';
  if (normalizer?.name === 'toHm') return 'time';
  if (normalizer?.name === 'toNumber') return 'number';
  return 'text';
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

function getUniqueValues(records, field) {
  const set = new Set();
  for (const r of records) {
    const v = String(r[field] ?? '').trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}

export default function UniversalOperationalRuntime({ experienceKey, moduleSlug, moduleName }) {
  const contract = OperationalExperienceRegistry.getExperienceContract(experienceKey);
  const { canonicalFields } = contract.documentContract;
  const tableFields = getTableFields(contract);

  const orchestratorRef = useRef(null);
  const [ready, setReady] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [banner, setBanner] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState([]);
  const [complianceWarnings, setComplianceWarnings] = useState([]);
  const [visibility, setVisibility] = useState({});

  const [activeView, setActiveView] = useState('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [timelineRecord, setTimelineRecord] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const formTouchedRef = useRef(false);

  const { user: authUser, profile } = useAuth();
  const auditUser = { id: authUser?.id, nombre: profile?.nombre, email: authUser?.email };

  useEffect(() => {
    const orch = new OperationalExperienceLifecycleOrchestrator(experienceKey);
    orch.initialize();
    orchestratorRef.current = orch;
    setReady(true);
    return () => { orch.destroy(); };
  }, [experienceKey]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await orchestratorRef.current.loadRecords();
        if (!cancelled) setRecords(data);
      } catch (err) {
        if (!cancelled) setBanner({ type: 'error', message: err?.message || 'Error al cargar registros.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [ready]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filters, activeView]);

  useEffect(() => {
    if (!ready || !isFormOpen) return;
    formTouchedRef.current = false;
    const result = orchestratorRef.current.buildInitialForm(editingRecord);
    setFormData(result.formData);
    setVisibility(result.visibility);
    setFormErrors(editingRecord ? result.errors : []);
    setComplianceWarnings(editingRecord ? result.compliance : []);
  }, [ready, isFormOpen, editingRecord]);

  useEffect(() => {
    if (!isFormOpen || !orchestratorRef.current || !formTouchedRef.current) return;
    const { allErrors, complianceIssues } = orchestratorRef.current.evaluate(formData);
    setFormErrors(allErrors || []);
    setComplianceWarnings(complianceIssues || []);
    setVisibility(orchestratorRef.current.recalcVisibility(formData));
  }, [formData, isFormOpen]);

  const handleChange = (field, value) => {
    formTouchedRef.current = true;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = editingRecord
        ? await orchestratorRef.current.updateRecord(editingRecord.id, formData, auditUser)
        : await orchestratorRef.current.createRecord(formData, auditUser);
      if (!result.success) {
        setFormErrors(result.errors || []);
        setComplianceWarnings(result.compliance || []);
        const msg = result.errors?.[0]?.message || result.errors?.[0]?.field || result.message || 'Error al guardar.';
        setBanner({ type: 'error', message: `${result.errors?.length || 1} error(es): ${msg}` });
        return;
      }
      if (result.action === 'created') {
        setRecords(prev => [result.record, ...prev]);
        setBanner({ type: 'success', message: 'Registro guardado.' });
      } else {
        setRecords(prev => prev.map(r => r.id === result.record.id ? result.record : r));
        setBanner({ type: 'success', message: 'Registro actualizado.' });
      }
      setIsFormOpen(false);
      setEditingRecord(null);
    } catch (err) {
      setBanner({ type: 'error', message: err?.message || 'Error al guardar el registro.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      await orchestratorRef.current.deleteRecord(id, auditUser);
      setRecords(prev => prev.filter(r => r.id !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      setBanner({ type: 'success', message: 'Registro eliminado.' });
    } catch (err) {
      setBanner({ type: 'error', message: 'Error al eliminar: ' + err.message });
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleExcelImported = async (rows) => {
    setSaving(true);
    try {
      const result = await orchestratorRef.current.importRecords(rows, auditUser);
      setRecords(prev => [...result.records, ...prev]);
      setIsExcelOpen(false);
      setBanner({ type: 'success', message: `Importación exitosa: ${result.count} registros.` });
    } catch (err) {
      setBanner({ type: 'error', message: err?.message || 'Error al importar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async (recordsToExport) => {
    const target = recordsToExport || records;
    if (!target?.length) {
      setBanner({ type: 'error', message: 'No hay registros para exportar.' });
      return;
    }
    try {
      await orchestratorRef.current.exportPdf(target, auditUser);
      setBanner({ type: 'success', message: 'PDF generado.' });
    } catch {
      setBanner({ type: 'error', message: 'No se pudo generar el PDF.' });
    }
  };

  const handleExportCsv = async (recordsToExport) => {
    const target = recordsToExport || records;
    if (!target?.length) {
      setBanner({ type: 'error', message: 'No hay registros para exportar.' });
      return;
    }
    try {
      await orchestratorRef.current.exportExcel(target, auditUser);
      setBanner({ type: 'success', message: 'CSV exportado.' });
    } catch {
      setBanner({ type: 'error', message: 'No se pudo exportar.' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedIds.size} registro(s)?`)) return;
    try {
      await orchestratorRef.current.bulkDelete(Array.from(selectedIds), auditUser);
      setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setBanner({ type: 'success', message: `${selectedIds.size} registro(s) eliminados.` });
    } catch (err) {
      setBanner({ type: 'error', message: 'Error al eliminar: ' + err.message });
    }
  };

  const handleBulkStatus = async (newStatus) => {
    if (selectedIds.size === 0) return;
    try {
      const result = await orchestratorRef.current.bulkUpdateStatus(Array.from(selectedIds), newStatus, auditUser);
      const updatedIds = new Set(result.records.map(r => r.id));
      setRecords(prev => prev.map(r => updatedIds.has(r.id) ? (result.records.find(ur => ur.id === r.id) || r) : r));
      setSelectedIds(new Set());
      setBanner({ type: 'success', message: `${result.count} registro(s) actualizados a "${newStatus}".` });
    } catch (err) {
      setBanner({ type: 'error', message: 'Error al actualizar estado: ' + err.message });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const selected = records.filter(r => selectedIds.has(r.id));
    const invalid = selected.filter(r => !canApprove(r, contract));
    if (invalid.length > 0) {
      setBanner({ type: 'error', message: `${invalid.length} registro(s) no cumplen los requisitos para aprobación (score < 100% o inconsistencias).` });
      return;
    }
    try {
      // Sprint 132.1 — CERTIFIED: se pasa el recordsMap para que el Orchestrator valide canApprove internamente.
      const recordsMap = Object.fromEntries(selected.map(r => [r.id, r]));
      const result = await orchestratorRef.current.approveRecords(Array.from(selectedIds), auditUser, recordsMap);
      if (!result.success) {
        setBanner({ type: 'error', message: result.errors?.[0]?.message || 'Error al aprobar.' });
        return;
      }
      const updatedIds = new Set(result.records.map(r => r.id));
      setRecords(prev => prev.map(r => updatedIds.has(r.id) ? (result.records.find(ur => ur.id === r.id) || r) : r));
      setSelectedIds(new Set());
      setBanner({ type: 'success', message: `${result.count} registro(s) aprobados.` });
    } catch (err) {
      setBanner({ type: 'error', message: 'Error al aprobar: ' + err.message });
    }
  };

  const handleBulkClose = async () => {
    if (selectedIds.size === 0) return;
    const selected = records.filter(r => selectedIds.has(r.id));
    const invalid = selected.filter(r => !canClose(r, contract));
    if (invalid.length > 0) {
      setBanner({ type: 'error', message: `${invalid.length} registro(s) no están aprobados. Apruebe primero.` });
      return;
    }
    try {
      // Sprint 132.1 — CERTIFIED: se pasa el recordsMap para que el Orchestrator valide canClose internamente.
      const recordsMap = Object.fromEntries(selected.map(r => [r.id, r]));
      const result = await orchestratorRef.current.closeRecords(Array.from(selectedIds), auditUser, recordsMap);
      if (!result.success) {
        setBanner({ type: 'error', message: result.errors?.[0]?.message || 'Error al cerrar.' });
        return;
      }
      const updatedIds = new Set(result.records.map(r => r.id));
      setRecords(prev => prev.map(r => updatedIds.has(r.id) ? (result.records.find(ur => ur.id === r.id) || r) : r));
      setSelectedIds(new Set());
      setBanner({ type: 'success', message: `${result.count} registro(s) cerrados.` });
    } catch (err) {
      setBanner({ type: 'error', message: 'Error al cerrar: ' + err.message });
    }
  };

  const handleBulkReopen = async () => {
    if (selectedIds.size === 0) return;
    const selected = records.filter(r => selectedIds.has(r.id));
    const invalid = selected.filter(r => !canReopen(r, contract));
    if (invalid.length > 0) {
      setBanner({ type: 'error', message: `${invalid.length} registro(s) no pueden reabrirse. Solo registros aprobados o cerrados.` });
      return;
    }
    try {
      // Sprint 132.1 — CERTIFIED: se pasa el recordsMap para que el Orchestrator valide canReopen internamente.
      // El destino es 'en_proceso' (nunca 'validated' — estado interno del Readiness Engine).
      const recordsMap = Object.fromEntries(selected.map(r => [r.id, r]));
      const result = await orchestratorRef.current.reopenRecords(Array.from(selectedIds), auditUser, recordsMap);
      if (!result.success) {
        setBanner({ type: 'error', message: result.errors?.[0]?.message || 'Error al reabrir.' });
        return;
      }
      const updatedIds = new Set(result.records.map(r => r.id));
      setRecords(prev => prev.map(r => updatedIds.has(r.id) ? (result.records.find(ur => ur.id === r.id) || r) : r));
      setSelectedIds(new Set());
      setBanner({ type: 'success', message: `${result.count} registro(s) reabiertos.` });
    } catch (err) {
      setBanner({ type: 'error', message: 'Error al reabrir: ' + err.message });
    }
  };

  const handleViewTimeline = async (record) => {
    setTimelineRecord(record);
    setLoadingTimeline(true);
    setTimeline([]);
    try {
      const events = await orchestratorRef.current.getRecordTimeline(record.id);
      setTimeline(events || []);
    } catch {
      setTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const filterFields = useMemo(() => {
    return tableFields.filter(f => f !== 'id');
  }, [tableFields]);

  const filterValues = useMemo(() => {
    const vals = {};
    for (const f of filterFields) {
      vals[f] = getUniqueValues(records, f);
    }
    return vals;
  }, [records, filterFields]);

  const completionScores = useMemo(() => {
    const map = {};
    for (const r of records) {
      map[r.id] = computeCompletionScore(r, contract);
    }
    return map;
  }, [records, contract]);

  const readinessStates = useMemo(() => {
    const map = {};
    for (const r of records) {
      map[r.id] = getReadinessState(r, contract);
    }
    return map;
  }, [records, contract]);

  const recordInconsistencies = useMemo(() => {
    const map = {};
    for (const r of records) {
      map[r.id] = detectInconsistencies(r, contract);
    }
    return map;
  }, [records, contract]);

  const duplicateGroups = useMemo(() => {
    const groupFields = ['cliente', 'producto', 'lote'].filter(f => canonicalFields.includes(f));
    if (!groupFields.length) return [];
    return detectDuplicates(records, groupFields);
  }, [records, canonicalFields]);

  const duplicatedIds = useMemo(() => {
    const set = new Set();
    for (const group of duplicateGroups) {
      for (const id of group.ids) set.add(id);
    }
    return set;
  }, [duplicateGroups]);

  const isIncomplete = (record) => {
    const score = completionScores[record.id];
    return score ? score.errors.length > 0 : false;
  };

  const isImportedToday = (record) => {
    const d = record.created_at ? record.created_at.slice(0, 10) : '';
    return d === todayStr();
  };

  const viewFilters = useMemo(() => ({
    all: () => true,
    pending: r => r.estado === 'pendiente' || !r.estado,
    completed: r => r.estado === 'completado',
    withObservations: r => String(r.observaciones ?? '').trim().length > 0,
    incomplete: r => isIncomplete(r),
    importedToday: r => isImportedToday(r),
    inProcess: r => r.estado === 'en_proceso',
    draft: r => readinessStates[r.id] === 'draft',
    pendingCompletion: r => readinessStates[r.id] === 'pending_completion',
    inconsistent: r => recordInconsistencies[r.id]?.length > 0,
    duplicates: r => duplicatedIds.has(r.id),
    readyToClose: r => readinessStates[r.id] === 'validated' || readinessStates[r.id] === 'ready',
    approved: r => r.estado === 'approved',
    closed: r => r.estado === 'cerrado',
  }), [records, completionScores, readinessStates, recordInconsistencies, duplicatedIds]);

  const views = [
    { key: 'all', label: 'Todos', icon: ListChecks },
    { key: 'pending', label: 'Pendientes', icon: Clock },
    { key: 'inProcess', label: 'En proceso', icon: Columns3 },
    { key: 'completed', label: 'Completados', icon: CheckCircle },
    { key: 'draft', label: 'Borradores', icon: Edit2 },
    { key: 'pendingCompletion', label: 'Por completar', icon: AlertTriangle },
    { key: 'inconsistent', label: 'Inconsistentes', icon: ShieldAlert },
    { key: 'duplicates', label: 'Duplicados', icon: Copy },
    { key: 'readyToClose', label: 'Listos', icon: CheckCheck },
    { key: 'approved', label: 'Aprobados', icon: CheckCheck },
    { key: 'closed', label: 'Cerrados', icon: CheckCircle },
    { key: 'withObservations', label: 'Con observaciones', icon: AlertTriangle },
    { key: 'importedToday', label: 'Importados hoy', icon: Download },
  ];

  const viewCounts = useMemo(() => {
    const counts = {};
    for (const v of views) {
      counts[v.key] = records.filter(viewFilters[v.key]).length;
    }
    return counts;
  }, [records, viewFilters]);

  const filteredRecords = useMemo(() => {
    let result = records;

    result = result.filter(viewFilters[activeView]);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r =>
        canonicalFields.some(f =>
          String(r[f] ?? '').toLowerCase().includes(term)
        )
      );
    }

    for (const [field, value] of Object.entries(filters)) {
      if (!value) continue;
      result = result.filter(r => String(r[field] ?? '') === value);
    }

    return result;
  }, [records, activeView, searchTerm, filters, viewFilters, canonicalFields]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRecords.length / pageSize)), [filteredRecords, pageSize]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const allFilteredSelected = useMemo(() => {
    if (filteredRecords.length === 0) return false;
    return filteredRecords.every(r => selectedIds.has(r.id));
  }, [filteredRecords, selectedIds]);

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (const r of filteredRecords) next.delete(r.id);
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (const r of filteredRecords) next.add(r.id);
        return next;
      });
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const estadoOptions = useMemo(() => {
    const opts = getFieldOptions('estado', contract);
    if (opts) return opts;
    return ['pendiente', 'en_proceso', 'completado'];
  }, [contract]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {contract.metadata.description && (
          <div>
            <p className="text-sm text-gray-500">{contract.metadata.description}</p>
          </div>
        )}

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap justify-start sm:justify-end">
          {!isFormOpen && (
            <>
              {contract.capabilities?.supportsExport && (
                <RoleGate allowedRoles={['administrador', 'calidad']}>
                  <button onClick={() => handleExportPdf()} disabled={loading || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200 text-sm disabled:opacity-50 whitespace-nowrap">
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                </RoleGate>
              )}
              {contract.capabilities?.supportsExport && (
                <RoleGate allowedRoles={['administrador', 'calidad']}>
                  <button onClick={() => handleExportCsv()} disabled={loading || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200 text-sm disabled:opacity-50 whitespace-nowrap">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                </RoleGate>
              )}
              {contract.capabilities?.supportsDashboard && (
                <RoleGate allowedRoles={['administrador', 'calidad']}>
                  <button onClick={() => setIsDashboardOpen(true)} disabled={loading || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200 text-sm disabled:opacity-50 whitespace-nowrap">
                    <BarChart3 className="w-4 h-4" /> Dashboard
                  </button>
                </RoleGate>
              )}
              {contract.capabilities?.supportsImport && (
                <RoleGate allowedRoles={['administrador', 'calidad']}>
                  <button onClick={() => setIsExcelOpen(true)} disabled={loading || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200 text-sm disabled:opacity-50 whitespace-nowrap">
                    <Download className="w-4 h-4" /> Importar
                  </button>
                </RoleGate>
              )}
              <RoleGate allowedRoles={['administrador', 'operativo', 'calidad']}>
                <button onClick={() => setIsFormOpen(true)} disabled={loading || saving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-light text-white rounded-xl font-bold shadow-md shadow-primary/20 text-sm disabled:opacity-50 whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Nuevo
                </button>
              </RoleGate>
            </>
          )}
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div className={`rounded-2xl border px-5 py-4 text-sm flex items-start gap-3 ${
          banner.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {banner.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5" /> : <AlertTriangle className="w-5 h-5 mt-0.5" />}
          <div className="flex-1">
            <p className="font-bold">{banner.type === 'success' ? 'Listo' : 'Atención'}</p>
            <p className="text-xs mt-1">{banner.message}</p>
          </div>
          <button onClick={() => setBanner(null)} className="p-1.5 rounded-lg hover:bg-black/5"><X className="w-4 h-4" /></button>
        </div>
      )}

      {isFormOpen ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-primary px-8 py-5 flex items-center justify-between text-white">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingRecord ? 'Editar' : 'Nuevo'} {contract.metadata.name || 'Registro'}
              </h2>
            </div>
            <button onClick={() => { setIsFormOpen(false); setEditingRecord(null); }} className="p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {formErrors.filter(e => e.field === 'general').map((e, i) => (
              <div key={i} className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {e.message}
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              {canonicalFields.filter(f => visibility[f] !== false).map((field) => {
                const type = detectInputType(field, contract);
                const label = getFieldLabel(field, contract);
                const options = getFieldOptions(field, contract);
                const autocomplete = getAutocompleteSource(field, contract);
                const inputId = `ufield-${field}-${moduleSlug}`;
                const err = formErrors.find(e => e.field === field);
                const warn = complianceWarnings.find(c => c.field === field);
                return (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase">{label}</label>
                    {options ? (
                      <select value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        <option value="">Seleccionar...</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : autocomplete ? (
                      <>
                        <input list={inputId} value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                          className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                        <datalist id={inputId}>
                          {autocomplete.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                      </>
                    ) : type === 'date' ? (
                      <input type="date" value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    ) : type === 'time' ? (
                      <input type="time" value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    ) : type === 'number' ? (
                      <input type="number" step="any" value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    ) : (
                      <input type="text" value={formData[field] ?? ''} onChange={e => handleChange(field, e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 ${err ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    )}
                    {err && <p className="text-xs text-red-600 mt-0.5">{err.message}</p>}
                    {warn && <p className="text-xs text-accent mt-0.5">{warn.message}</p>}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex items-center justify-end gap-3 border-t pt-6">
              <button type="button" onClick={() => { setIsFormOpen(false); setEditingRecord(null); }}
                className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-light text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Guardando…' : editingRecord ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Business summary bar */}
          {!isFormOpen && records.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-gray-200">
              {[
                { label: `Total ${contract.metadata.name || 'registros'}`, count: records.length, color: 'text-gray-900', bg: 'bg-white' },
                { label: 'Pendientes', count: records.filter(r => r.estado === 'pendiente' || !r.estado).length, color: 'text-yellow-800', bg: 'bg-yellow-50' },
                { label: 'En proceso', count: records.filter(r => r.estado === 'en_proceso').length, color: 'text-blue-800', bg: 'bg-blue-50' },
                { label: 'Completados', count: records.filter(r => r.estado === 'completado' || r.estado === 'cerrado').length, color: 'text-green-800', bg: 'bg-green-50' },
                { label: 'Alertas', count: filteredRecords.filter(r => recordInconsistencies[r.id]?.length > 0 || duplicatedIds.has(r.id)).length, color: 'text-red-800', bg: 'bg-red-50' },
              ].map(item => (
                <div key={item.label} className={`${item.bg} px-5 py-4`}>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Operational Views Selector */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-200 bg-gray-50/30">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Vista operacional</label>
            <div className="relative">
              <select value={activeView} onChange={e => { setActiveView(e.target.value); setFilters({}); setSelectedIds(new Set()); }}
                className="w-full sm:w-72 appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-gray-900 shadow-sm cursor-pointer">
                {views.map(v => {
                  const count = viewCounts[v.key];
                  return (
                    <option key={v.key} value={v.key}>{v.label} ({count})</option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Search + Filters bar */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative w-full sm:w-80">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder={`Buscar en ${canonicalFields.length} campos...`}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm" />
              </div>
              <button onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all shadow-sm ${
                  showFilterPanel ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}>
                <Filter className="w-4 h-4" /> Filtros
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span><strong>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRecords.length)}</strong> de <strong>{filteredRecords.length}</strong> registros</span>
              {selectedIds.size > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{selectedIds.size} seleccionados</span>
              )}
            </div>
          </div>

          {/* Expanded filter panel */}
          {showFilterPanel && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap gap-3">
                {filterFields.map(f => {
                  const vals = filterValues[f];
                  if (!vals?.length) return null;
                  return (
                    <div key={f} className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{getFieldLabel(f, contract)}</label>
                      <select value={filters[f] || ''} onChange={e => setFilters(prev => ({ ...prev, [f]: e.target.value || '' }))}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 min-w-[140px]">
                        <option value="">Todos</option>
                        {vals.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  );
                })}
                {Object.keys(filters).length > 0 && (
                  <div className="flex items-end">
                    <button onClick={() => setFilters({})}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200">
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <span className="text-xs font-bold text-primary"><strong>{selectedIds.size}</strong> registro(s) seleccionados</span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <select onChange={e => { const v = e.target.value; if (v) { handleBulkStatus(v); e.target.value = ''; } }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700">
                  <option value="">Cambiar estado...</option>
                  {estadoOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button onClick={handleBulkApprove}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100">
                  Aprobar
                </button>
                <button onClick={handleBulkClose}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                  Cerrar
                </button>
                <button onClick={handleBulkReopen}
                  className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100">
                  Reabrir
                </button>
                <button onClick={() => handleExportCsv(Array.from(selectedIds).map(id => records.find(r => r.id === id)).filter(Boolean))}
                  className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  Exportar
                </button>
                <button onClick={handleBulkDelete}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">
                  Eliminar
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 pl-6 w-10">
                    <input type="checkbox" checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-primary" />
                  </th>
                  <th className="p-4 w-16 text-center">Score</th>
                  <th className="p-4">ID</th>
                  {tableFields.map(f => (
                    <th key={f} className="p-4">{getFieldLabel(f, contract)}</th>
                  ))}
                  <th className="p-4 pr-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={tableFields.length + 4} className="p-10 text-center text-sm text-gray-500">Cargando...</td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan={tableFields.length + 4} className="p-10 text-center text-sm text-gray-500">
                    {searchTerm || activeView !== 'all' ? 'Sin resultados.' : `No hay registros. Cree uno o importe.`}
                  </td></tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr key={record.id} className={`hover:bg-primary/[0.02] transition-colors ${isIncomplete(record) ? 'bg-amber-50/30' : ''}`}>
                      <td className="p-4 pl-6">
                        <input type="checkbox" checked={selectedIds.has(record.id)}
                          onChange={() => toggleSelect(record.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary" />
                      </td>
                      <td className="p-4 text-center">
                        {(() => {
                          const s = completionScores[record.id];
                          const score = s ? s.score : 0;
                          return (
                            <span className={`inline-flex items-center justify-center w-8 h-6 rounded-md text-[10px] font-bold ${
                              score === 100 ? 'bg-green-100 text-green-800' :
                              score >= 80 ? 'bg-blue-100 text-blue-800' :
                              score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`} title={`${s?.filled || 0}/${s?.total || 0} campos`}>
                              {score}%
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <button onClick={() => handleViewTimeline(record)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-bold hover:bg-gray-200 transition-colors">
                          {record.displayId || record.id?.slice(0, 8)}
                          <History className="w-3 h-3 text-gray-500" />
                        </button>
                      </td>
                      {tableFields.map(f => {
                        const val = record[f];
                        const isEstado = f === 'estado';
                        return (
                          <td key={f} className={`p-4 text-sm max-w-[200px] truncate ${
                            isEstado ? 'font-semibold' : 'text-gray-900'
                          }`}>
                            {isEstado ? (
                              // Sprint 132.1 — CERTIFIED: badge solo para los 5 estados persistentes.
                              // 'rechazado' eliminado — estado huérfano que nunca se genera.
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                val === 'completado' ? 'bg-green-100 text-green-800' :
                                val === 'en_proceso' ? 'bg-blue-100 text-blue-800' :
                                val === 'pendiente' || !val ? 'bg-yellow-100 text-yellow-800' :
                                val === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                val === 'cerrado' ? 'bg-gray-200 text-gray-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{val || 'pendiente'}</span>
                            ) : detectInputType(f, contract) === 'date' ? String(val ?? '').slice(0, 10) : String(val ?? '')}
                          </td>
                        );
                      })}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <RoleGate allowedRoles={['administrador', 'calidad', 'operativo']}>
                            <button onClick={() => handleEdit(record)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-primary bg-gray-50 hover:bg-primary/5 border border-gray-200 rounded-lg transition-colors" title="Editar">
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                          </RoleGate>
                          <RoleGate allowedRoles={['administrador', 'calidad', 'operativo']}>
                            <button onClick={() => handleDelete(record.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Eliminar</span>
                            </button>
                          </RoleGate>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} totalRecords={filteredRecords.length} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />
        </div>
      )}

      {/* Completion summary cards */}
      {!isFormOpen && filteredRecords.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Completos (100%)', count: filteredRecords.filter(r => (completionScores[r.id]?.score || 0) === 100).length, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Por completar', count: filteredRecords.filter(r => (completionScores[r.id]?.score || 0) < 100 && (completionScores[r.id]?.score || 0) > 0).length, color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'Vacíos (0%)', count: filteredRecords.filter(r => (completionScores[r.id]?.score || 0) === 0).length, color: 'text-red-700 bg-red-50 border-red-200' },
            { label: 'Inconsistentes', count: filteredRecords.filter(r => recordInconsistencies[r.id]?.length > 0).length, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
            { label: 'Duplicados', count: filteredRecords.filter(r => duplicatedIds.has(r.id)).length, color: 'text-purple-700 bg-purple-50 border-purple-200' },
            { label: 'Listos', count: filteredRecords.filter(r => readinessStates[r.id] === 'validated' || readinessStates[r.id] === 'ready').length, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          ].map(item => (
            <div key={item.label} className={`rounded-xl border px-4 py-3 ${item.color}`}>
              <p className="text-2xl font-bold">{item.count}</p>
              <p className="text-xs font-medium mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Import Workflow modal */}
      {contract.capabilities?.supportsImport && (
        <UniversalImportWorkflow open={isExcelOpen} onClose={() => setIsExcelOpen(false)} onImported={handleExcelImported} contract={contract} />
      )}

      {/* Dashboard modal */}
      {contract.capabilities?.supportsDashboard && (
        <UniversalOperationalDashboard open={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} experienceKey={experienceKey} />
      )}

      {/* Timeline modal */}
      {timelineRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setTimelineRecord(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90dvh] flex flex-col">
            <div className="bg-primary px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5" />
                <div>
                  <h2 className="text-lg font-bold">Trazabilidad</h2>
                  <p className="text-primary-100 text-xs">{timelineRecord.displayId || timelineRecord.id?.slice(0, 8)}</p>
                </div>
              </div>
              <button onClick={() => setTimelineRecord(null)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingTimeline ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">No hay eventos registrados para este registro.</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((event, i) => (
                    <div key={event.id || i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          event.event_type === 'create' ? 'bg-green-500' :
                          event.event_type === 'update' ? 'bg-blue-500' :
                          event.event_type === 'delete' ? 'bg-red-500' :
                          event.event_type === 'compliance' ? 'bg-yellow-500' :
                          event.event_type === 'import' ? 'bg-purple-500' :
                          event.event_type === 'export' ? 'bg-gray-500' :
                          'bg-gray-400'
                        }`} />
                        {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-900 capitalize">{event.event_type?.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] text-gray-400">{event.created_at ? format(new Date(event.created_at), 'dd/MM/yyyy HH:mm') : ''}</p>
                        </div>
                        {event.user_name && (
                          <p className="text-xs text-gray-500 mt-0.5">Por: {event.user_name}</p>
                        )}
                        {event.event_data && Object.keys(event.event_data).length > 0 && (
                          <pre className="text-[10px] text-gray-400 mt-1 bg-gray-50 rounded-lg p-2 overflow-x-auto">
                            {JSON.stringify(event.event_data, null, 1)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}