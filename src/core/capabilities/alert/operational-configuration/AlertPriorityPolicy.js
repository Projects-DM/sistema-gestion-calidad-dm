/**
 * AlertPriorityPolicy
 *
 * Sprint 180 (iteración 2) — Controls the priority model of the
 * Alert Capability.
 *
 * Policy ONLY. Never evaluates or executes.
 */

export const ALERT_PRIORITY_LEVELS = Object.freeze([
  'low',
  'medium',
  'high',
  'critical',
]);

export const PRIORITY_LABELS = Object.freeze({
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
});

export function resolvePriority(priority) {
  const normalized = String(priority ?? '').toLowerCase();
  if (ALERT_PRIORITY_LEVELS.includes(normalized)) {
    return Object.freeze({
      level: normalized,
      label: PRIORITY_LABELS[normalized],
      valid: true,
    });
  }
  return Object.freeze({
    level: 'medium',
    label: PRIORITY_LABELS.medium,
    valid: false,
  });
}

export default resolvePriority;
