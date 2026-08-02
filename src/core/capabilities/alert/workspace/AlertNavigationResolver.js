/**
 * AlertNavigationResolver
 *
 * Sprint 187 — Operational Navigation Consolidation.
 *
 * Resolves the correct destination for an alert into a pure navigation
 * descriptor.
 *
 * Produces ONLY:
 *   { action, resourceType, resourceId, documentId, moduleId, tab, metadata }
 *
 * The documental action changed from `open-document` (open the PDF
 * directly) to `go-to-document` (go to the existing Document Repository,
 * select the document automatically). Alert Monitoring NEVER opens
 * documents directly — it only delivers the Navigation Descriptor.
 *
 * NEVER navigates, NEVER imports React Router, NEVER opens components,
 * NEVER opens Alert Monitoring again, NEVER creates routes.
 */

export const NAVIGATION_SPECS = Object.freeze({
  dynamicForms: Object.freeze({ action: 'open-form', resourceType: 'dynamicForm', label: 'Ir al formulario' }),
  dynamicRecords: Object.freeze({ action: 'open-record', resourceType: 'dynamicRecord', label: 'Ir al registro' }),
  documentRepository: Object.freeze({
    action: 'go-to-document',
    resourceType: 'document',
    label: 'Ir al documento',
    tab: 'repository',
  }),
});

export function resolveAlertNavigation(alert) {
  if (!alert || !alert.source) {
    return Object.freeze({
      action: null,
      resourceType: null,
      resourceId: null,
      documentId: null,
      moduleId: null,
      tab: null,
      metadata: Object.freeze({}),
      label: null,
      navigable: false,
      reasons: ['missing-alert-source'],
    });
  }

  const spec = NAVIGATION_SPECS[alert.source];

  if (!spec) {
    return Object.freeze({
      action: null,
      resourceType: null,
      resourceId: null,
      documentId: null,
      moduleId: null,
      tab: null,
      metadata: Object.freeze({}),
      label: null,
      navigable: false,
      reasons: ['unsupported-alert-source'],
    });
  }

  const documentId =
    spec.action === 'go-to-document'
      ? alert.documentId || alert.resourceId || alert.id || alert.documentType || null
      : null;

  const resourceId = alert.formId || alert.recordType || alert.documentType || alert.documentId || alert.resourceId || null;

  return Object.freeze({
    action: spec.action,
    resourceType: spec.resourceType,
    resourceId,
    documentId,
    moduleId: alert.moduleId || alert.module || null,
    tab: spec.tab || null,
    metadata: Object.freeze({
      recordId: alert.recordId || null,
      source: alert.source,
    }),
    label: spec.label,
    navigable: true,
    reasons: [],
  });
}

export default resolveAlertNavigation;
