/**
 * RecordAlertBadgeRenderer
 *
 * Sprint 181 — Renders an alert badge for the existing Dynamic Records
 * engine.
 *
 * Wrapper ONLY. Reuses the existing renderer. Never creates records,
 * never creates new components.
 */

export const RECORD_VISIBILITY_KEY = 'dynamicRecords';

export function renderRecordAlertBadge(alertContext) {
  if (!alertContext) {
    return Object.freeze({
      renderer: RECORD_VISIBILITY_KEY,
      show: false,
      badge: null,
      reasons: ['no-alert-context'],
    });
  }

  return Object.freeze({
    renderer: RECORD_VISIBILITY_KEY,
    show: true,
    badge: Object.freeze({
      icon: alertContext.visual.icon,
      color: alertContext.visual.color,
      label: alertContext.visual.label,
      tooltip: alertContext.visual.tooltip,
      severity: alertContext.severity,
      priority: alertContext.visual.priority,
      priorityLabel: alertContext.visual.priorityLabel,
    }),
    reasons: [],
  });
}

export default renderRecordAlertBadge;
