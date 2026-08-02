/**
 * ResourceVisibilityValidator
 *
 * Sprint 186 — Operational Resource Integrity Audit (MASTER SSOT LEVEL 4).
 *
 * Validates that a Runtime source resource is VISIBLE in the Operational
 * Workspace before it may be consumed by the Runtime.
 *
 * A resource is visible ONLY when ALL of these hold:
 *
 *   exists               → the resource row exists
 *   belongsToModule      → the resource belongs to the active module
 *   visibleInWorkspace   → the user can operate it (workspace parity)
 *   enabled              → the resource is active/enabled
 *   navigable            → the resource can be reached from the UI
 *
 * Any failing condition ⇒ visible = false (the resource is excluded).
 *
 * Validation ONLY. Pure functions. Never queries, never generates
 * Alert Context, never executes.
 */

import { classifyResource, RESOURCE_INTEGRITY_STATES } from './RuntimeSourceIntegrityPolicy.js';

/**
 * Builds the document visibility index for a module.
 *
 * A document (`sgc_records` row: `module` + `type`) is visible when its
 * repository (`module_slug`) and category (`category_key` === type) are
 * both active.
 *
 * @param {Array} repositories Active/inactive repositories of the module.
 * @param {Array} categories Categories of the module's repositories.
 * @returns {Map<string, { moduleSlug, repositoryActive, categoryActive }>} Keyed by `type` (category_key).
 */
export function buildDocumentVisibilityIndex(repositories = [], categories = []) {
  const index = new Map();

  const categoriesByRepository = new Map();
  for (const category of categories || []) {
    if (!category || category.repository_id === undefined) continue;
    const list = categoriesByRepository.get(String(category.repository_id)) || [];
    list.push(category);
    categoriesByRepository.set(String(category.repository_id), list);
  }

  for (const repository of repositories || []) {
    if (!repository || repository.id === undefined) continue;
    const repoCategories = categoriesByRepository.get(String(repository.id)) || [];
    for (const category of repoCategories) {
      const type = String(category.category_key ?? category.name ?? '');
      if (!type) continue;
      const existing = index.get(type);
      const repositoryActive = repository.is_active !== false;
      const categoryActive = category.is_active !== false;
      if (!existing) {
        index.set(type, {
          moduleSlug: repository.module_slug,
          repositoryActive,
          categoryActive,
        });
        continue;
      }
      // A type resolved by multiple repositories: visible if ANY is active.
      index.set(type, {
        moduleSlug: existing.moduleSlug,
        repositoryActive: existing.repositoryActive || repositoryActive,
        categoryActive: existing.categoryActive || categoryActive,
      });
    }
  }

  return index;
}

/**
 * Builds the policy context used to classify the module's resources.
 *
 * @param {Object} input
 * @param {Object} [input.module] Module context (id, slug, state, visible, is_active).
 * @param {boolean} [input.moduleOperational] Pre-computed operational flag.
 * @param {Array} [input.activeForms] Visible forms of the module (for record parent checks).
 * @param {Array} [input.repositories] Module repositories.
 * @param {Array} [input.categories] Module repository categories.
 * @returns {Object} Policy context.
 */
export function buildResourcePolicyContext({ module, moduleOperational, activeForms = [], repositories = [], categories = [] } = {}) {
  const operational =
    moduleOperational !== undefined
      ? moduleOperational
      : module
        ? (module.state === 'operational' || module.state === undefined || module.state === null) &&
          module.visible !== false &&
          module.is_active !== false
        : false;

  return Object.freeze({
    moduleId: module?.id ?? null,
    moduleSlug: module?.slug ?? null,
    moduleOperational: operational,
    activeFormIds: Object.freeze(new Set((activeForms || []).map((f) => String(f.id)))),
    documentIndex: buildDocumentVisibilityIndex(repositories, categories),
  });
}

/**
 * Validates the visibility of a single resource.
 *
 * @param {string} source dynamicForms | dynamicRecords | documentRepository
 * @param {Object} resource Raw resource row.
 * @param {Object} context Policy context (see buildResourcePolicyContext).
 * @returns {Object} { source, resourceId, visible, state, reasons }
 */
export function validateResourceVisibility(source, resource, context = {}) {
  const classification = classifyResource(source, resource, context);
  return Object.freeze({
    source,
    resourceId: resource?.id ?? null,
    visible: classification.visible,
    state: classification.state,
    reasons: classification.reasons,
  });
}

/**
 * Validates the visibility of a batch of resources for a source.
 *
 * @param {string} source Source key.
 * @param {Array} resources Raw resource rows.
 * @param {Object} context Policy context.
 * @returns {Object} { source, scanned, visible, hidden, results }
 */
export function validateSourceVisibility(source, resources = [], context = {}) {
  const results = (Array.isArray(resources) ? resources : []).map((resource) =>
    validateResourceVisibility(source, resource, context),
  );
  const visible = results.filter((r) => r.visible);

  return Object.freeze({
    source,
    scanned: results.length,
    visible: visible.length,
    hidden: results.length - visible.length,
    results: Object.freeze(results),
    visibleResources: Object.freeze(visible.map((r) => r.resourceId)),
  });
}

export const RESOURCE_VISIBILITY_VALIDATOR = Object.freeze({
  key: 'resource-visibility-validator',
  name: 'Alert Resource Visibility Validator',
  conditions: Object.freeze([
    'exists',
    'belongsToModule',
    'visibleInWorkspace',
    'enabled',
    'navigable',
  ]),
  eligibleState: RESOURCE_INTEGRITY_STATES.VALID,
});

export default RESOURCE_VISIBILITY_VALIDATOR;
