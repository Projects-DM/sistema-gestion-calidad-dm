/**
 * AlertNavigationResolver
 *
 * Sprint 182-R — Resolves the correct destination for an alert into a
 * pure navigation descriptor.
 *
 * Produces ONLY:
 *   { action, resourceType, resourceId, moduleId, metadata }
 *
 * NEVER navigates, NEVER imports React Router, NEVER opens components,
 * NEVER opens Alert Monitoring again, NEVER creates routes.
 */

export const NAVIGATION_SPECS = Object.freeze({
  dynamicForms: Object.freeze({ action: 'open-form', resourceType: 'dynamicForm', label: 'Ir al formulario' }),
  dynamicRecords: Object.freeze({ action: 'open-record', resourceType: 'dynamicRecord', label: 'Ir al registro' }),
  documentRepository: Object.freeze({ action: 'open-document', resourceType: 'document', label: 'Abrir documento' }),
});

export function resolveAlertNavigation(alert) {
  if (!alert || !alert.source) {
    return Object.freeze({
      action: null,
      resourceType: null,
      resourceId: null,
      moduleId: null,
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
      moduleId: null,
      metadata: Object.freeze({}),
      label: null,
      navigable: false,
      reasons: ['unsupported-alert-source'],
    });
  }

  const resourceId = alert.formId || alert.recordType || alert.documentType || alert.documentId || null;

  return Object.freeze({
    action: spec.action,
    resourceType: spec.resourceType,
    resourceId,
    moduleId: alert.moduleId || alert.module || null,
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
