/**
 * AlertWorkspaceViewModel
 *
 * Sprint 182-R — Builds the final Operational Workspace ViewModel from
 * the resolved workspace (Runtime Context + cards + grouping).
 *
 * THE UNIQUE contract allowed for UI. The UI never consumes Runtime
 * Context directly.
 *
 * ViewModel ONLY. Never consults the database, never modifies data,
 * never executes rules.
 */

import { applyAlertGroupingPolicy } from './AlertGroupingPolicy.js';

export function buildAlertWorkspaceViewModel(resolution) {
  const cards = Array.isArray(resolution.cards) ? resolution.cards : [];
  const grouping = applyAlertGroupingPolicy(cards);
  const actions = cards
    .map((c) => c.action)
    .filter((a) => a && a.action !== null);

  return Object.freeze({
    workspaceType: 'operational-workspace',
    navigationEnabled: true,
    moduleId: resolution.moduleId || null,
    empty: cards.length === 0,
    emptyMessage: cards.length === 0 ? 'No existen alertas activas' : null,
    cards: Object.freeze(cards),
    groups: grouping,
    critical: Object.freeze(cards.filter((c) => c.priority === 'critical')),
    high: Object.freeze(cards.filter((c) => c.priority === 'high')),
    medium: Object.freeze(cards.filter((c) => c.priority === 'medium')),
    low: Object.freeze(cards.filter((c) => c.priority === 'low')),
    actions: Object.freeze(actions),
    summary: Object.freeze({
      total: cards.length,
      critical: cards.filter((c) => c.priority === 'critical').length,
      high: cards.filter((c) => c.priority === 'high').length,
      medium: cards.filter((c) => c.priority === 'medium').length,
      low: cards.filter((c) => c.priority === 'low').length,
      forms: cards.filter((c) => c.source === 'dynamicForms').length,
      records: cards.filter((c) => c.source === 'dynamicRecords').length,
      documents: cards.filter((c) => c.source === 'documentRepository').length,
    }),
  });
}

export default buildAlertWorkspaceViewModel;
