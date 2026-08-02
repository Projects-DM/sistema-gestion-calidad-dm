/**
 * Alert Runtime Audit — CONSOLIDATED (Sprint 186)
 *
 * Operational Resource Integrity Audit (MASTER SSOT LEVEL 4).
 *
 * Certifies that the Alert Runtime consumes ONLY the Operational
 * Resource Set of a module:
 *
 *   Dynamic Forms visibles
 *     + Dynamic Records visibles
 *     + Document Repository visible
 *     = Operational Resource Set
 *
 * The audit NEVER consults the Runtime, NEVER queries external tables,
 * NEVER reads historical data and NEVER generates Alert Context. Audit
 * ONLY.
 *
 * The UI layer (useAlertRuntime) MUST feed the audit's visible
 * `operational` set into `AlertCapability.runtimeBinding({ ...base,
 * existing: visibleSet })` so the Runtime can only consume resources
 * the user can actually operate.
 */

import { auditOperationalResources } from './OperationalResourceAudit.js';
import { buildResourcePolicyContext } from './ResourceVisibilityValidator.js';
import { resolveWorkspaceOperationalSet } from './WorkspaceResourceResolver.js';
import { buildRuntimeAuditReport, mergeRuntimeAuditReports } from './RuntimeAuditReport.js';
import { evaluateIntegrityBoundary } from './RuntimeIntegrityBoundary.js';
import { isModuleOperational } from './RuntimeSourceIntegrityPolicy.js';

export {
  auditOperationalResources,
  OPERATIONAL_RESOURCE_AUDIT,
} from './OperationalResourceAudit.js';

export {
  buildResourcePolicyContext,
  validateResourceVisibility,
  validateSourceVisibility,
  RESOURCE_VISIBILITY_VALIDATOR,
} from './ResourceVisibilityValidator.js';

export {
  resolveWorkspaceOperationalSet,
  resolveWorkspaceSource,
  WORKSPACE_RESOURCE_RESOLVER,
  WORKSPACE_SOURCE_KEYS,
} from './WorkspaceResourceResolver.js';

export {
  buildRuntimeAuditReport,
  mergeRuntimeAuditReports,
  RUNTIME_AUDIT_REPORT,
} from './RuntimeAuditReport.js';

export {
  evaluateIntegrityBoundary,
  isIntegrityStateBlocked,
  blockedStateKey,
  RUNTIME_INTEGRITY_BOUNDARY,
} from './RuntimeIntegrityBoundary.js';

export {
  RESOURCE_INTEGRITY_STATES,
  FORBIDDEN_INTEGRITY_STATES,
  isModuleOperational,
  classifyResource,
  classifyForm,
  classifyRecord,
  classifyDocument,
  RUNTIME_SOURCE_INTEGRITY_POLICY,
} from './RuntimeSourceIntegrityPolicy.js';

/**
 * Runs the Operational Resource Integrity Audit for a module.
 *
 * Given the module's RAW existing resources (forms, records, documents)
 * plus the module context and document repository metadata, this returns:
 *
 *   - inventory   → every scanned resource classified
 *   - report      → { scanned, valid, orphan, archived, hidden, rejected }
 *   - boundary    → per-resource integrity boundary decision
 *   - operational → the VISIBLE resources (raw rows) eligible for the Runtime
 *
 * @param {Object} input
 * @param {Array} [input.forms] Raw existing forms (`sgc_forms` rows).
 * @param {Array} [input.records] Raw existing records (`sgc_form_responses` rows).
 * @param {Array} [input.documents] Raw existing documents (`sgc_records` rows).
 * @param {Object} [input.module] Module context (id, slug, state, visible, is_active).
 * @param {Array} [input.repositories] Module repositories (document visibility).
 * @param {Array} [input.categories] Module repository categories (document visibility).
 * @returns {Object} Audit result.
 */
export function runResourceIntegrityAudit({
  forms = [],
  records = [],
  documents = [],
  module = null,
  repositories = [],
  categories = [],
} = {}) {
  const context = buildResourcePolicyContext({
    module,
    activeForms: forms,
    repositories,
    categories,
  });

  const audited = auditOperationalResources({
    forms,
    records,
    documents,
    module,
    repositories,
    categories,
  });

  const report = buildRuntimeAuditReport(audited.inventory);
  const boundary = evaluateIntegrityBoundary(audited.inventory);

  return Object.freeze({
    module: module?.id ?? null,
    moduleSlug: module?.slug ?? null,
    moduleOperational: isModuleOperational(module),
    inventory: audited.inventory,
    report,
    boundary,
    operational: audited.operationalRaw,
    counts: Object.freeze({
      dynamicForms: audited.operationalRaw.forms.length,
      dynamicRecords: audited.operationalRaw.records.length,
      documentRepository: audited.operationalRaw.documents.length,
    }),
    anyExists:
      audited.operationalRaw.forms.length > 0 ||
      audited.operationalRaw.records.length > 0 ||
      audited.operationalRaw.documents.length > 0,
    empty:
      audited.operationalRaw.forms.length === 0 &&
      audited.operationalRaw.records.length === 0 &&
      audited.operationalRaw.documents.length === 0,
    context,
  });
}

export const RUNTIME_AUDIT_VERSION = '1';

export const AlertRuntimeAuditContract = Object.freeze({
  contractKey: 'alert.runtime-audit',
  name: 'Alert Runtime Audit Contract',
  version: RUNTIME_AUDIT_VERSION,
  capabilityKey: 'alerts',
  runtimeMode: 'audit-only',
  source: 'operational-workspace',
  supportedContexts: Object.freeze([
    'dynamicForms',
    'dynamicRecords',
    'documentRepository',
  ]),
  never: Object.freeze([
    'queries the Runtime',
    'generates Alert Context',
    'reads historical data',
    'consumes external tables',
  ]),
  report: Object.freeze({
    scanned: Object.freeze({ type: 'counter' }),
    valid: Object.freeze({ type: 'counter' }),
    orphan: Object.freeze({ type: 'counter' }),
    archived: Object.freeze({ type: 'counter' }),
    hidden: Object.freeze({ type: 'counter' }),
    rejected: Object.freeze({ type: 'counter' }),
  }),
});

export const ALERT_RUNTIME_AUDIT = Object.freeze({
  key: 'runtime-audit',
  name: 'Alert Runtime Audit',
  execution: false,
});

export default ALERT_RUNTIME_AUDIT;
