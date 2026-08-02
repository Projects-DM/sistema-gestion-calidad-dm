/**
 * RuntimeAuditReport
 *
 * Sprint 186 — Operational Resource Integrity Audit (MASTER SSOT LEVEL 4).
 *
 * Produces the Resource Integrity Report of an Operational Resource
 * Audit:
 *
 *   {
 *     scanned:  { forms, records, documents, total },
 *     valid:    { forms, records, documents, total },
 *     orphan:   { forms, records, documents, total },
 *     archived: { forms, records, documents, total },
 *     hidden:   { forms, records, documents, total },
 *     rejected: { forms, records, documents, total },
 *   }
 *
 * Report ONLY. Pure function. Never executes, never queries, never
 * generates Alert Context.
 */

import { RESOURCE_INTEGRITY_STATES } from './RuntimeSourceIntegrityPolicy.js';

function counter(entries) {
  return Object.freeze({
    forms: entries.forms.length,
    records: entries.records.length,
    documents: entries.documents.length,
  });
}

function totalOf(counterValue) {
  return counterValue.forms + counterValue.records + counterValue.documents;
}

/**
 * Builds the Resource Integrity Report from an Operational Resource
 * Inventory.
 *
 * @param {Object} inventory Operational resource inventory
 *   ({ forms, records, documents } of inventory entries with `state`).
 * @returns {Object} Resource integrity report.
 */
export function buildRuntimeAuditReport(inventory = {}) {
  const forms = Array.isArray(inventory.forms) ? inventory.forms : [];
  const records = Array.isArray(inventory.records) ? inventory.records : [];
  const documents = Array.isArray(inventory.documents) ? inventory.documents : [];

  const scanned = Object.freeze({ forms: forms.length, records: records.length, documents: documents.length });

  const partition = (sourceEntries, predicate) => Object.freeze(sourceEntries.filter(predicate));

  const valid = Object.freeze({
    forms: partition(forms, (e) => e.state === RESOURCE_INTEGRITY_STATES.VALID),
    records: partition(records, (e) => e.state === RESOURCE_INTEGRITY_STATES.VALID),
    documents: partition(documents, (e) => e.state === RESOURCE_INTEGRITY_STATES.VALID),
  });

  const orphan = Object.freeze({
    forms: partition(forms, (e) => e.state === RESOURCE_INTEGRITY_STATES.ORPHAN),
    records: partition(records, (e) => e.state === RESOURCE_INTEGRITY_STATES.ORPHAN),
    documents: partition(documents, (e) => e.state === RESOURCE_INTEGRITY_STATES.ORPHAN),
  });

  const archived = Object.freeze({
    forms: partition(forms, (e) => e.state === RESOURCE_INTEGRITY_STATES.ARCHIVED),
    records: partition(records, (e) => e.state === RESOURCE_INTEGRITY_STATES.ARCHIVED),
    documents: partition(documents, (e) => e.state === RESOURCE_INTEGRITY_STATES.ARCHIVED),
  });

  const hidden = Object.freeze({
    forms: partition(
      forms,
      (e) => e.state === RESOURCE_INTEGRITY_STATES.HIDDEN || e.state === RESOURCE_INTEGRITY_STATES.INACTIVE,
    ),
    records: partition(
      records,
      (e) => e.state === RESOURCE_INTEGRITY_STATES.HIDDEN || e.state === RESOURCE_INTEGRITY_STATES.INACTIVE,
    ),
    documents: partition(
      documents,
      (e) => e.state === RESOURCE_INTEGRITY_STATES.HIDDEN || e.state === RESOURCE_INTEGRITY_STATES.INACTIVE,
    ),
  });

  const rejected = Object.freeze({
    forms: partition(forms, (e) => e.state !== RESOURCE_INTEGRITY_STATES.VALID),
    records: partition(records, (e) => e.state !== RESOURCE_INTEGRITY_STATES.VALID),
    documents: partition(documents, (e) => e.state !== RESOURCE_INTEGRITY_STATES.VALID),
  });

  const validCount = counter(valid);
  const orphanCount = counter(orphan);
  const archivedCount = counter(archived);
  const hiddenCount = counter(hidden);
  const rejectedCount = counter(rejected);

  return Object.freeze({
    scanned: Object.freeze({ ...scanned, total: totalOf(scanned) }),
    valid: Object.freeze({ ...validCount, total: totalOf(validCount) }),
    orphan: Object.freeze({ ...orphanCount, total: totalOf(orphanCount) }),
    archived: Object.freeze({ ...archivedCount, total: totalOf(archivedCount) }),
    hidden: Object.freeze({ ...hiddenCount, total: totalOf(hiddenCount) }),
    rejected: Object.freeze({ ...rejectedCount, total: totalOf(rejectedCount) }),
  });
}

/**
 * Merges multiple audit reports (e.g. global/dashboard aggregation).
 *
 * @param {Array} reports Audit reports.
 * @returns {Object} Combined report.
 */
export function mergeRuntimeAuditReports(reports = []) {
  const keys = ['scanned', 'valid', 'orphan', 'archived', 'hidden', 'rejected'];
  const sources = ['forms', 'records', 'documents'];

  const merged = {};
  for (const key of keys) {
    merged[key] = {};
    for (const source of sources) {
      merged[key][source] = reports.reduce((sum, r) => sum + (r?.[key]?.[source] ?? 0), 0);
    }
    merged[key].total = merged[key].forms + merged[key].records + merged[key].documents;
  }

  return Object.freeze({
    scanned: Object.freeze({ ...merged.scanned }),
    valid: Object.freeze({ ...merged.valid }),
    orphan: Object.freeze({ ...merged.orphan }),
    archived: Object.freeze({ ...merged.archived }),
    hidden: Object.freeze({ ...merged.hidden }),
    rejected: Object.freeze({ ...merged.rejected }),
  });
}

export const RUNTIME_AUDIT_REPORT = Object.freeze({
  key: 'runtime-audit-report',
  name: 'Alert Runtime Audit Report',
  shape: Object.freeze({
    scanned: Object.freeze({ type: 'counter', description: 'Total resources scanned' }),
    valid: Object.freeze({ type: 'counter', description: 'Visible resources eligible for the Runtime' }),
    orphan: Object.freeze({ type: 'counter', description: 'Resources not belonging to the module' }),
    archived: Object.freeze({ type: 'counter', description: 'Resources archived' }),
    hidden: Object.freeze({ type: 'counter', description: 'Resources hidden in the workspace' }),
    rejected: Object.freeze({ type: 'counter', description: 'Resources rejected from the Runtime' }),
  }),
});

export default RUNTIME_AUDIT_REPORT;
