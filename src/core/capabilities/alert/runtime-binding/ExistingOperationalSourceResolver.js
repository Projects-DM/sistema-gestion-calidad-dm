/**
 * ExistingOperationalSourceResolver
 *
 * Sprint 185 — Runtime Binding Finalization.
 *
 * Determines, per existing operational source, whether resources exist
 * and whether an Alert Context can be generated from them.
 *
 *   ¿Existe formulario?
 *     → Sí   → Puede generar Alert Context.
 *     → No   → No existe alerta.
 *
 * Resolution ONLY. Never evaluates, never executes, never invents data.
 */

import { AlertConfigurationContract } from '../operational-configuration/AlertConfigurationContract.js';

export const SOURCE_KEYS = Object.freeze(['dynamicForms', 'dynamicRecords', 'documentRepository']);

function sourceResourceType(source) {
  switch (source) {
    case 'dynamicForms':
      return 'dynamicForm';
    case 'dynamicRecords':
      return 'dynamicRecord';
    case 'documentRepository':
      return 'document';
    default:
      return null;
  }
}

function resourcesForSource(existing, source) {
  switch (source) {
    case 'dynamicForms':
      return existing?.forms ?? [];
    case 'dynamicRecords':
      return existing?.records ?? [];
    case 'documentRepository':
      return existing?.documents ?? [];
    default:
      return [];
  }
}

/**
 * Resolves whether an existing operational source can generate an
 * Alert Context for the module.
 *
 * @param {Object} existing Existing module resources snapshot (from the collector).
 * @param {string} source dynamicForms | dynamicRecords | documentRepository
 * @returns {Object}
 */
export function resolveExistingOperationalSource(existing, source) {
  if (!existing || !AlertConfigurationContract.supportedSources.includes(source)) {
    return Object.freeze({
      source,
      exists: false,
      count: 0,
      resourceType: sourceResourceType(source),
      canGenerateAlertContext: false,
      resources: Object.freeze([]),
      reasons: ['resource-not-found'],
    });
  }

  const resources = resourcesForSource(existing, source);
  const exists = resources.length > 0;

  return Object.freeze({
    source,
    exists,
    count: resources.length,
    resourceType: sourceResourceType(source),
    canGenerateAlertContext: exists,
    resources: Object.freeze(resources),
    reasons: exists ? [] : ['no-existing-resource'],
  });
}

/**
 * Resolves all existing operational sources for the module.
 *
 * @param {Object} existing Existing module resources snapshot.
 * @returns {Object} Keyed resolution per source.
 */
export function resolveExistingOperationalSources(existing) {
  const resolved = Object.freeze(
    SOURCE_KEYS.reduce((acc, source) => {
      acc[source] = resolveExistingOperationalSource(existing, source);
      return acc;
    }, {}),
  );

  const anyExists = SOURCE_KEYS.some((s) => resolved[s].exists);

  return Object.freeze({
    sources: resolved,
    anyExists,
    counts: Object.freeze({
      dynamicForms: resolved.dynamicForms.count,
      dynamicRecords: resolved.dynamicRecords.count,
      documentRepository: resolved.documentRepository.count,
    }),
  });
}

export default resolveExistingOperationalSources;
