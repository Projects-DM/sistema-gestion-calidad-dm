/**
 * WorkspaceResourceResolver
 *
 * Sprint 186 — Operational Resource Integrity Audit (MASTER SSOT LEVEL 4).
 *
 * Resolves the Operational Resource Set of a module: the ONLY resources
 * the Runtime may consume.
 *
 * The Operational Resource Set is EXACTLY what the user can operate in
 * the Workspace Operacional:
 *
 *   Dynamic Forms visibles
 *     + Dynamic Records visibles
 *     + Document Repository visible
 *     = Operational Resource Set
 *
 * It NEVER resolves external tables, historical rows, archived modules
 * or hidden resources. Resolution ONLY — never executes, never queries.
 */

import {
  classifyResource,
  RESOURCE_INTEGRITY_STATES,
} from './RuntimeSourceIntegrityPolicy.js';

export const WORKSPACE_SOURCE_KEYS = Object.freeze([
  'dynamicForms',
  'dynamicRecords',
  'documentRepository',
]);

function resourcesForSource(operational, source) {
  switch (source) {
    case 'dynamicForms':
      return operational?.forms ?? [];
    case 'dynamicRecords':
      return operational?.records ?? [];
    case 'documentRepository':
      return operational?.documents ?? [];
    default:
      return [];
  }
}

/**
 * Resolves the Operational Resource Set from a raw existing snapshot.
 *
 * @param {Object} input
 * @param {Array} [input.forms] Raw existing forms.
 * @param {Array} [input.records] Raw existing records.
 * @param {Array} [input.documents] Raw existing documents.
 * @param {Object} [input.context] Resource policy context.
 * @returns {Object} Operational Resource Set + per-source resolutions.
 */
export function resolveWorkspaceOperationalSet({ forms = [], records = [], documents = [], context = {} } = {}) {
  const raw = {
    forms: Array.isArray(forms) ? forms : [],
    records: Array.isArray(records) ? records : [],
    documents: Array.isArray(documents) ? documents : [],
  };

  const resolutions = Object.freeze({
    dynamicForms: Object.freeze({
      source: 'dynamicForms',
      scanned: raw.forms.length,
      resources: Object.freeze(raw.forms),
      valid: Object.freeze(raw.forms.filter((f) => classifyResource('dynamicForms', f, context).state === RESOURCE_INTEGRITY_STATES.VALID)),
    }),
    dynamicRecords: Object.freeze({
      source: 'dynamicRecords',
      scanned: raw.records.length,
      resources: Object.freeze(raw.records),
      valid: Object.freeze(raw.records.filter((r) => classifyResource('dynamicRecords', r, context).state === RESOURCE_INTEGRITY_STATES.VALID)),
    }),
    documentRepository: Object.freeze({
      source: 'documentRepository',
      scanned: raw.documents.length,
      resources: Object.freeze(raw.documents),
      valid: Object.freeze(raw.documents.filter((d) => classifyResource('documentRepository', d, context).state === RESOURCE_INTEGRITY_STATES.VALID)),
    }),
  });

  const operational = Object.freeze({
    forms: Object.freeze(resolutions.dynamicForms.valid),
    records: Object.freeze(resolutions.dynamicRecords.valid),
    documents: Object.freeze(resolutions.documentRepository.valid),
  });

  return Object.freeze({
    sources: resolutions,
    operational,
    counts: Object.freeze({
      dynamicForms: resolutions.dynamicForms.valid.length,
      dynamicRecords: resolutions.dynamicRecords.valid.length,
      documentRepository: resolutions.documentRepository.valid.length,
    }),
    anyExists:
      resolutions.dynamicForms.valid.length > 0 ||
      resolutions.dynamicRecords.valid.length > 0 ||
      resolutions.documentRepository.valid.length > 0,
    empty:
      resolutions.dynamicForms.valid.length === 0 &&
      resolutions.dynamicRecords.valid.length === 0 &&
      resolutions.documentRepository.valid.length === 0,
  });
}

/**
 * Resolves a single source from the raw existing snapshot.
 *
 * @param {string} source dynamicForms | dynamicRecords | documentRepository
 * @param {Object} raw Existing snapshot { forms, records, documents }.
 * @param {Object} context Policy context.
 * @returns {Object} Resolved source.
 */
export function resolveWorkspaceSource(source, raw = {}, context = {}) {
  const set = resolveWorkspaceOperationalSet({ ...raw, context });
  return set.sources[source] ?? Object.freeze({ source, scanned: 0, resources: [], valid: [] });
}

export const WORKSPACE_RESOURCE_RESOLVER = Object.freeze({
  key: 'workspace-resource-resolver',
  name: 'Alert Workspace Resource Resolver',
  allowedSources: WORKSPACE_SOURCE_KEYS,
  boundary: Object.freeze([
    'Dynamic Forms',
    'Dynamic Records',
    'Document Repository',
  ]),
  neverResolves: Object.freeze([
    'external tables',
    'historical rows',
    'archived modules',
    'hidden resources',
  ]),
});

export default WORKSPACE_RESOURCE_RESOLVER;
