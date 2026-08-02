/**
 * RuntimeBindingDescriptor
 *
 * Sprint 185 — Runtime Binding Finalization.
 *
 * Produces the binding descriptor of existing module resources ONLY:
 *
 *   { module, resource, resourceId, resourceType, available, runtimeBound }
 *
 * It NEVER produces priority, message or status. Those belong to the
 * existing Runtime.
 *
 * Descriptor ONLY. Pure function. Never evaluates, never executes.
 */

/**
 * Builds the binding descriptor for an existing resource.
 *
 * @param {Object} existing Existing module resources snapshot.
 * @param {string} source  dynamicForms | dynamicRecords | documentRepository
 * @param {Object} resource Existing resource (form/record/document).
 * @returns {Object} Binding descriptor entry.
 */
export function buildResourceBindingDescriptor(existing, source, resource) {
  const resourceId = resource?.id ?? resource?.slug ?? resource?.type ?? null;
  const resourceKey = resource?.slug ?? resource?.name ?? resource?.type ?? resourceId;

  let resourceType = null;
  if (source === 'dynamicForms') resourceType = 'dynamicForm';
  else if (source === 'dynamicRecords') resourceType = 'dynamicRecord';
  else if (source === 'documentRepository') resourceType = 'document';

  return Object.freeze({
    module: existing?.module ?? null,
    resource: resourceKey,
    resourceId,
    resourceType,
    available: resourceId !== null && resourceId !== undefined,
    runtimeBound: resourceId !== null && resourceId !== undefined,
  });
}

/**
 * Builds the full Runtime Binding descriptor from a resolved binding.
 *
 * @param {Object} existing Existing module resources snapshot.
 * @returns {Object}
 */
export function buildRuntimeBindingDescriptor(existing) {
  const forms = Array.isArray(existing?.forms) ? existing.forms : [];
  const records = Array.isArray(existing?.records) ? existing.records : [];
  const documents = Array.isArray(existing?.documents) ? existing.documents : [];

  const resources = Object.freeze([
    ...forms.map((f) => buildResourceBindingDescriptor(existing, 'dynamicForms', f)),
    ...records.map((r) => buildResourceBindingDescriptor(existing, 'dynamicRecords', r)),
    ...documents.map((d) => buildResourceBindingDescriptor(existing, 'documentRepository', d)),
  ]);

  return Object.freeze({
    module: existing?.module ?? null,
    resources,
    counts: Object.freeze({
      dynamicForms: forms.length,
      dynamicRecords: records.length,
      documentRepository: documents.length,
      total: resources.length,
    }),
    runtimeBound: resources.some((r) => r.runtimeBound === true),
  });
}

export default buildRuntimeBindingDescriptor;
