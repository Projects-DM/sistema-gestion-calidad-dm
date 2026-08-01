/**
 * AlertWorkspaceResolver
 *
 * Sprint 181 (iteración 2) — Builds the complete Operational Workspace
 * ViewModel from the Runtime Context.
 *
 * Resolution ONLY. Never queries Supabase, never modifies data.
 */

import { buildAlertWorkspaceCard } from './AlertWorkspaceBuilder.js';
import { buildOperationalGrouping } from './AlertOperationalGrouping.js';

export function resolveAlertWorkspace(request) {
  if (!request) {
    return Object.freeze({
      resolved: false,
      alerts: [],
      cards: [],
      groups: Object.freeze({ byPriority: [], bySource: [] }),
      empty: true,
      reasons: ['missing-workspace-context'],
    });
  }

  const moduleId = request.moduleId || request.module || null;
  const alerts = Array.isArray(request.alerts) ? request.alerts : [];
  const cards = alerts.map((a) => buildAlertWorkspaceCard(a, moduleId));
  const groups = buildOperationalGrouping(cards);

  return Object.freeze({
    resolved: true,
    moduleId,
    alerts: Object.freeze(alerts),
    cards: Object.freeze(cards),
    groups,
    empty: cards.length === 0,
    reasons: [],
  });
}

export default resolveAlertWorkspace;
