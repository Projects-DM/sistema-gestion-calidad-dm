/**
 * AlertOperationalGrouping
 *
 * Sprint 181 (iteración 2) — Groups operational alerts by priority
 * (Críticas → Altas → Medias → Bajas) and by source (Formularios,
 * Registros, Documentos).
 *
 * Grouping ONLY. Never executes, never navigates.
 */

export const PRIORITY_ORDER = Object.freeze(['critical', 'high', 'medium', 'low']);

export const SOURCE_GROUPS = Object.freeze({
  dynamicForms: 'Formularios',
  dynamicRecords: 'Registros',
  documentRepository: 'Documentos',
});

export function groupAlertsByPriority(alerts) {
  const groups = PRIORITY_ORDER.map((priority) => ({
    priority,
    label: priority === 'critical' ? 'Críticas' : priority === 'high' ? 'Altas' : priority === 'medium' ? 'Medias' : 'Bajas',
    alerts: alerts.filter((a) => a.priority === priority),
  }));

  return groups
    .filter((g) => g.alerts.length > 0)
    .map((g) => Object.freeze({ ...g, alerts: Object.freeze(g.alerts) }));
}

export function groupAlertsBySource(alerts) {
  return Object.keys(SOURCE_GROUPS)
    .map((source) => ({
      source,
      label: SOURCE_GROUPS[source],
      alerts: alerts.filter((a) => a.source === source),
    }))
    .filter((g) => g.alerts.length > 0)
    .map((g) => Object.freeze({ ...g, alerts: Object.freeze(g.alerts) }));
}

export function buildOperationalGrouping(alerts) {
  return Object.freeze({
    byPriority: groupAlertsByPriority(alerts),
    bySource: groupAlertsBySource(alerts),
  });
}

export default buildOperationalGrouping;
