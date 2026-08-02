/**
 * RuntimeBindingValidator
 *
 * Sprint 185 — Runtime Binding Finalization.
 *
 * Verifies that EVERY Runtime Context consumed by the UI derives 100%
 * from existing module resources. Any resource referenced by the binding
 * descriptor must exist in the collected existing snapshot.
 *
 * Validation ONLY. Never executes, never creates data.
 */

import { SOURCE_KEYS } from './ExistingOperationalSourceResolver.js';

const RESOURCE_TYPE_TO_SOURCE = Object.freeze({
  dynamicForm: 'dynamicForms',
  dynamicRecord: 'dynamicRecords',
  document: 'documentRepository',
});

function resourceIdsForSource(existing, resourceType) {
  const source = RESOURCE_TYPE_TO_SOURCE[resourceType] || resourceType;
  if (source === 'dynamicForms') return new Set((existing?.forms ?? []).map((f) => f?.id).filter(Boolean));
  if (source === 'dynamicRecords') return new Set((existing?.records ?? []).map((r) => r?.id).filter(Boolean));
  if (source === 'documentRepository') return new Set((existing?.documents ?? []).map((d) => d?.id).filter(Boolean));
  return new Set();
}

/**
 * Validates that every resource in the binding descriptor traces back to
 * an existing module resource (100% traceability).
 *
 * @param {Object} existing Existing module resources snapshot.
 * @param {Object} descriptor Binding descriptor (from RuntimeBindingDescriptor).
 * @returns {Object}
 */
export function validateRuntimeBinding(existing, descriptor) {
  const resources = Array.isArray(descriptor?.resources) ? descriptor.resources : [];

  const missing = [];
  const bound = [];
  for (const res of resources) {
    const ids = resourceIdsForSource(existing, res.resourceType);
    if (!res.runtimeBound || !res.resourceId || !ids.has(res.resourceId)) {
      missing.push(Object.freeze({
        resource: res.resource,
        resourceId: res.resourceId,
        resourceType: res.resourceType,
      }));
    } else {
      bound.push(res);
    }
  }

  const anySourceExists = SOURCE_KEYS.some((s) =>
    resourceIdsForSource(existing, s).size > 0,
  );

  return Object.freeze({
    valid: missing.length === 0,
    traceable: resources.length === bound.length,
    totalResources: resources.length,
    boundResources: bound.length,
    missing,
    anySourceExists,
    reasons: missing.length > 0 ? ['non-traceable-resources'] : [],
  });
}

export default validateRuntimeBinding;
