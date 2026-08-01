/**
 * AlertGroupingPolicy
 *
 * Sprint 182 — Policy that groups operational alerts by priority
 * (Críticas → Altas → Medias → Bajas) and by source (Formularios,
 * Registros, Documentos).
 *
 * Grouping policy ONLY. Never executes, never navigates.
 */

export const PRIORITY_ORDER = Object.freeze(['critical', 'high', 'medium', 'low']);

export const PRIORITY_GROUP_LABELS = Object.freeze({
  critical: 'Críticas',
  high: 'Altas',
  medium: 'Medias',
  low: 'Bajas',
});

export const SOURCE_GROUP_LABELS = Object.freeze({
  dynamicForms: 'Formularios',
  dynamicRecords: 'Registros',
  documentRepository: 'Documentos',
});

export function groupAlertsByPriority(cards) {
  const groups = PRIORITY_ORDER.map((priority) => {
    const items = cards.filter((c) => c.priority === priority);
    return Object.freeze({
      priority,
      label: PRIORITY_GROUP_LABELS[priority],
      count: items.length,
      cards: Object.freeze(items),
    });
  });

  return Object.freeze(groups);
}

export function groupAlertsBySource(cards) {
  return Object.freeze(
    Object.keys(SOURCE_GROUP_LABELS).map((source) => {
      const items = cards.filter((c) => c.source === source);
      return Object.freeze({
        source,
        label: SOURCE_GROUP_LABELS[source],
        count: items.length,
        cards: Object.freeze(items),
      });
    }),
  );
}

export function applyAlertGroupingPolicy(cards) {
  return Object.freeze({
    byPriority: groupAlertsByPriority(cards),
    bySource: groupAlertsBySource(cards),
  });
}

export default applyAlertGroupingPolicy;
