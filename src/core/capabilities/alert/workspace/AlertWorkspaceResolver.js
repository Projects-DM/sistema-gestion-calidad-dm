/**
 * AlertWorkspaceResolver
 *
 * Sprint 182 — Builds the complete Operational Workspace ViewModel
 * from the Runtime Context.
 *
 * Resolution ONLY. Never queries Supabase, never modifies data.
 */

import { buildAlertWorkspaceCard } from './AlertWorkspaceBuilder.js';
import { buildAlertWorkspaceViewModel } from './AlertWorkspaceViewModel.js';

export function resolveAlertWorkspace(request) {
  if (!request) {
    return Object.freeze({
      resolved: false,
      viewModel: null,
      reasons: ['missing-workspace-context'],
    });
  }

  const moduleId = request.moduleId || request.module || null;
  const alerts = Array.isArray(request.alerts) ? request.alerts : [];
  const cards = alerts.map((a) => buildAlertWorkspaceCard(a, moduleId));
  const viewModel = buildAlertWorkspaceViewModel({
    moduleId,
    cards,
  });

  return Object.freeze({
    resolved: true,
    moduleId,
    cards: Object.freeze(cards),
    viewModel,
    reasons: [],
  });
}

export default resolveAlertWorkspace;
