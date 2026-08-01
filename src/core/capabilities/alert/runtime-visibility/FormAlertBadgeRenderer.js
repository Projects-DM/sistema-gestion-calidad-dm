/**
 * FormAlertBadgeRenderer
 *
 * Sprint 181 — Renders an alert badge for the existing Dynamic Forms
 * engine.
 *
 * Wrapper ONLY. Reuses the existing renderer. Never creates forms,
 * never creates new components.
 */

export const FORM_VISIBILITY_KEY = 'dynamicForms';

export function renderFormAlertBadge(alertContext) {
  if (!alertContext) {
    return Object.freeze({
      renderer: FORM_VISIBILITY_KEY,
      show: false,
      badge: null,
      reasons: ['no-alert-context'],
    });
  }

  return Object.freeze({
    renderer: FORM_VISIBILITY_KEY,
    show: true,
    badge: Object.freeze({
      icon: alertContext.visual.icon,
      color: alertContext.visual.color,
      label: alertContext.visual.label,
      tooltip: alertContext.visual.tooltip,
      severity: alertContext.severity,
    }),
    reasons: [],
  });
}

export default renderFormAlertBadge;
