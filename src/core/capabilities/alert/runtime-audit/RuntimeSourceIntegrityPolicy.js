/**
 * RuntimeSourceIntegrityPolicy
 *
 * Sprint 186 — Operational Resource Integrity Audit (MASTER SSOT LEVEL 4).
 *
 * Defines the integrity states that a Runtime source resource MAY and MAY
 * NOT be in. The Runtime may ONLY consume resources that are:
 *
 *   - real (exists)
 *   - belonging to the active module
 *   - visible in the Operational Workspace
 *   - enabled
 *   - navigable
 *
 * Prohibited integrity states (never allowed into the Runtime):
 *
 *   - archived   → resource or parent module archived
 *   - deleted    → resource no longer exists
 *   - hidden     → not visible in the Operational Workspace
 *   - orphan     → does not belong to the active module
 *   - detached   → parent module is not operational
 *   - inactive   → resource disabled
 *   - historical → resource belongs to a historical/deprecated module
 *
 * Policy ONLY. Pure functions. No Supabase, no services, no Runtime, no
 * Alert Context generation.
 */

export const RESOURCE_INTEGRITY_STATES = Object.freeze({
  VALID: 'valid',
  ORPHAN: 'orphan',
  ARCHIVED: 'archived',
  HIDDEN: 'hidden',
  DETACHED: 'detached',
  INACTIVE: 'inactive',
  DELETED: 'deleted',
  UNKNOWN: 'unknown',
});

/**
 * Every state that must NEVER reach the Runtime. A resource is eligible
 * ONLY when its state is `valid`.
 */
export const FORBIDDEN_INTEGRITY_STATES = Object.freeze([
  RESOURCE_INTEGRITY_STATES.ORPHAN,
  RESOURCE_INTEGRITY_STATES.ARCHIVED,
  RESOURCE_INTEGRITY_STATES.HIDDEN,
  RESOURCE_INTEGRITY_STATES.DETACHED,
  RESOURCE_INTEGRITY_STATES.INACTIVE,
  RESOURCE_INTEGRITY_STATES.DELETED,
  RESOURCE_INTEGRITY_STATES.UNKNOWN,
]);

/**
 * Whether a module is operational for Runtime consumption.
 *
 * A module is operational ONLY when it is active, visible in the UI and
 * in the `operational` lifecycle state. `draft`, `configurable`,
 * `deprecated` and `archived` modules are NOT operational.
 *
 * @param {Object} moduleCtx Module context.
 * @returns {boolean}
 */
export function isModuleOperational(moduleCtx) {
  if (!moduleCtx) return false;
  if (moduleCtx.is_active === false) return false;
  if (moduleCtx.visible === false) return false;

  const state = moduleCtx.state;
  // NULL/undefined state is treated as operational (seed modules without
  // lifecycle state assigned are considered operational).
  if (state === undefined || state === null) return true;
  return state === 'operational';
}

function ok(state, reasons) {
  return Object.freeze({ state, visible: state === RESOURCE_INTEGRITY_STATES.VALID, reasons: Object.freeze(reasons) });
}

function sameId(a, b) {
  if (a === undefined || a === null || a === '') return false;
  if (b === undefined || b === null || b === '') return false;
  return String(a) === String(b);
}

/**
 * Classifies an existing Dynamic Form.
 *
 * @param {Object} form Real `sgc_forms` row.
 * @param {Object} context
 * @param {string} [context.moduleId] Active module id.
 * @param {boolean} [context.moduleOperational] Whether the module is operational.
 * @returns {Object} { state, visible, reasons }
 */
export function classifyForm(form, context = {}) {
  if (!form || !form.id) {
    return ok(RESOURCE_INTEGRITY_STATES.DELETED, ['form-not-found']);
  }

  if (!sameId(form.module_id, context.moduleId)) {
    return ok(RESOURCE_INTEGRITY_STATES.ORPHAN, ['form-does-not-belong-to-module']);
  }

  if (form.is_active === false) {
    return ok(RESOURCE_INTEGRITY_STATES.INACTIVE, ['form-inactive']);
  }

  if (!context.moduleOperational) {
    return ok(RESOURCE_INTEGRITY_STATES.DETACHED, ['module-not-operational']);
  }

  return ok(RESOURCE_INTEGRITY_STATES.VALID, []);
}

/**
 * Classifies an existing Dynamic Record.
 *
 * A record is valid ONLY when its parent form is still part of the
 * visible Operational Resource Set. A record whose parent form is
 * inactive, hidden or missing is an orphan and must never reach the
 * Runtime.
 *
 * @param {Object} record Real `sgc_form_responses` row.
 * @param {Object} context
 * @param {boolean} [context.moduleOperational]
 * @param {Set} [context.activeFormIds] Ids of the visible forms.
 * @returns {Object} { state, visible, reasons }
 */
export function classifyRecord(record, context = {}) {
  if (!record || !record.id) {
    return ok(RESOURCE_INTEGRITY_STATES.DELETED, ['record-not-found']);
  }

  const formId = record.sgc_forms?.id ?? record.form_id ?? null;
  if (!formId || !(context.activeFormIds instanceof Set) || !context.activeFormIds.has(String(formId))) {
    return ok(RESOURCE_INTEGRITY_STATES.ORPHAN, ['parent-form-not-operational']);
  }

  if (!context.moduleOperational) {
    return ok(RESOURCE_INTEGRITY_STATES.DETACHED, ['module-not-operational']);
  }

  return ok(RESOURCE_INTEGRITY_STATES.VALID, []);
}

/**
 * Classifies an existing Document Repository document.
 *
 * `sgc_records` has no `is_active` column, so a document is visible in
 * the Operational Workspace ONLY when its repository and category are
 * active for the module. A document whose repository/category is
 * inactive, or that cannot be resolved to any repository, is hidden.
 *
 * @param {Object} doc Real `sgc_records` row.
 * @param {Object} context
 * @param {string} [context.moduleSlug] Active module slug.
 * @param {boolean} [context.moduleOperational]
 * @param {Map} [context.documentIndex] Map(type → { moduleSlug, repositoryActive, categoryActive }).
 * @returns {Object} { state, visible, reasons }
 */
export function classifyDocument(doc, context = {}) {
  if (!doc || !doc.id) {
    return ok(RESOURCE_INTEGRITY_STATES.DELETED, ['document-not-found']);
  }

  if (!sameId(doc.module, context.moduleSlug)) {
    return ok(RESOURCE_INTEGRITY_STATES.ORPHAN, ['document-does-not-belong-to-module']);
  }

  const entry = context.documentIndex instanceof Map ? context.documentIndex.get(String(doc.type ?? '')) : undefined;
  if (!entry || !sameId(entry.moduleSlug, doc.module)) {
    return ok(RESOURCE_INTEGRITY_STATES.HIDDEN, ['repository-not-resolved']);
  }

  if (!entry.repositoryActive) {
    return ok(RESOURCE_INTEGRITY_STATES.HIDDEN, ['repository-inactive']);
  }

  if (!entry.categoryActive) {
    return ok(RESOURCE_INTEGRITY_STATES.HIDDEN, ['category-inactive']);
  }

  if (!context.moduleOperational) {
    return ok(RESOURCE_INTEGRITY_STATES.DETACHED, ['module-not-operational']);
  }

  return ok(RESOURCE_INTEGRITY_STATES.VALID, []);
}

/**
 * Classifies a Document Repository CATEGORY.
 *
 * A category is valid ONLY when its owning repository is resolvable and
 * active and the category itself is active. The repository/category active
 * states come from the SAME `documentIndex` (keyed by `category_key`) used
 * for document visibility — no new lookup, no new policy.
 *
 * @param {Object} category Real `sgc_document_repository_categories` row.
 * @param {Object} context
 * @param {string} [context.moduleSlug] Active module slug.
 * @param {boolean} [context.moduleOperational]
 * @param {Map} [context.documentIndex] Map(type → { moduleSlug, repositoryActive, categoryActive }).
 * @returns {Object} { state, visible, reasons }
 */
export function classifyCategory(category, context = {}) {
  if (!category || !category.id) {
    return ok(RESOURCE_INTEGRITY_STATES.DELETED, ['category-not-found']);
  }

  const type = String(category.category_key ?? category.name ?? '');
  const entry = type && context.documentIndex instanceof Map ? context.documentIndex.get(type) : undefined;
  if (!entry || !sameId(entry.moduleSlug, context.moduleSlug)) {
    return ok(RESOURCE_INTEGRITY_STATES.HIDDEN, ['repository-not-resolved']);
  }

  if (!entry.repositoryActive) {
    return ok(RESOURCE_INTEGRITY_STATES.HIDDEN, ['repository-inactive']);
  }

  if (category.is_active === false || !entry.categoryActive) {
    return ok(RESOURCE_INTEGRITY_STATES.INACTIVE, ['category-inactive']);
  }

  if (!context.moduleOperational) {
    return ok(RESOURCE_INTEGRITY_STATES.DETACHED, ['module-not-operational']);
  }

  return ok(RESOURCE_INTEGRITY_STATES.VALID, []);
}

/**
 * Classifies a resource by source type.
 *
 * @param {string} source dynamicForms | dynamicRecords | documentRepository | documentCategory
 * @param {Object} resource Raw resource row.
 * @param {Object} context Policy context.
 * @returns {Object} { state, visible, reasons }
 */
export function classifyResource(source, resource, context = {}) {
  switch (source) {
    case 'dynamicForms':
      return classifyForm(resource, context);
    case 'dynamicRecords':
      return classifyRecord(resource, context);
    case 'documentRepository':
      return classifyDocument(resource, context);
    case 'documentCategory':
      return classifyCategory(resource, context);
    default:
      return ok(RESOURCE_INTEGRITY_STATES.UNKNOWN, ['unknown-source']);
  }
}

export const RUNTIME_SOURCE_INTEGRITY_POLICY = Object.freeze({
  key: 'runtime-source-integrity-policy',
  name: 'Alert Runtime Source Integrity Policy',
  eligibleState: RESOURCE_INTEGRITY_STATES.VALID,
  prohibitedStates: FORBIDDEN_INTEGRITY_STATES,
  requiredConditions: Object.freeze([
    'exists',
    'belongsToModule',
    'visibleInWorkspace',
    'enabled',
    'navigable',
  ]),
  moduleOperationalStates: Object.freeze(['operational']),
});

export default RUNTIME_SOURCE_INTEGRITY_POLICY;
