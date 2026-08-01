/**
 * AlertNavigationResolver
 *
 * Sprint 181 (iteración 2) — Resolves the correct destination for an
 * alert. The alert NEVER resolves there; it only directs the user to
 * the existing resource.
 *
 * Navigation resolution ONLY. Never executes.
 */

export const NAVIGATION_TARGETS = Object.freeze({
  dynamicForms: { target: 'dynamicForms', action: 'open-form', label: 'Ir al formulario' },
  dynamicRecords: { target: 'dynamicRecords', action: 'open-record', label: 'Ir al registro' },
  documentRepository: { target: 'documentRepository', action: 'open-document', label: 'Abrir documento' },
});

export function resolveAlertNavigation(alert) {
  if (!alert || !alert.source) {
    return Object.freeze({
      navigable: false,
      target: null,
      action: null,
      label: null,
      reasons: ['missing-alert-source'],
    });
  }

  const nav = NAVIGATION_TARGETS[alert.source];

  if (!nav) {
    return Object.freeze({
      navigable: false,
      target: null,
      action: null,
      label: null,
      reasons: ['unsupported-alert-source'],
    });
  }

  return Object.freeze({
    navigable: true,
    target: nav.target,
    action: nav.action,
    label: nav.label,
    reasons: [],
  });
}

export default resolveAlertNavigation;
