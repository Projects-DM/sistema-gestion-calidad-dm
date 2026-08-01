/**
 * DocumentAlertBadgeRenderer
 *
 * Sprint 181 — Renders an alert badge for the existing Document
 * Repository engine.
 *
 * Wrapper ONLY. Reuses the existing renderer. Never creates
 * documents, never creates new components.
 */

export const DOCUMENT_VISIBILITY_KEY = 'documentRepository';

export function renderDocumentAlertBadge(alertContext) {
  if (!alertContext) {
    return Object.freeze({
      renderer: DOCUMENT_VISIBILITY_KEY,
      show: false,
      badge: null,
      reasons: ['no-alert-context'],
    });
  }

  return Object.freeze({
    renderer: DOCUMENT_VISIBILITY_KEY,
    show: true,
    badge: Object.freeze({
      icon: alertContext.visual.icon,
      color: alertContext.visual.color,
      label: alertContext.visual.label,
      tooltip: alertContext.visual.tooltip,
      severity: alertContext.severity,
      message: alertContext.visual.message || alertContext.visual.tooltip,
    }),
    reasons: [],
  });
}

export default renderDocumentAlertBadge;
