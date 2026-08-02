/**
 * AlertWorkspaceResolver
 *
 * Sprint 182 — Builds the complete Operational Workspace ViewModel
 * from the Runtime Context.
 *
 * Sprint 200 — When the request carries the single-contract evaluation
 * entries (`{ descriptor, evaluation }`), each card consumes its
 * ALREADY-COMPUTED evaluation state. The resolver NEVER recomputes
 * risk/severity/priorities and NEVER interprets descriptor rules.
 *
 * Resolution ONLY. Never queries Supabase, never modifies data.
 */

import { buildAlertWorkspaceCard } from './AlertWorkspaceBuilder.js';
import { buildAlertWorkspaceViewModel } from './AlertWorkspaceViewModel.js';

function matchEvaluationEntry(alert, entries) {
  if (!Array.isArray(entries)) return null;

  for (const entry of entries) {
    const d = entry?.descriptor;
    if (!d || d.source !== alert.source) continue;

    if (alert.source === 'documentRepository') {
      if (alert.documentId && d.documentId && String(alert.documentId) === String(d.documentId)) return entry;
      if (alert.documentType && d.formId && String(alert.documentType) === String(d.formId)) return entry;
    } else {
      if (alert.formId && d.formId && String(alert.formId) === String(d.formId)) return entry;
      if (alert.recordType && d.formId && String(alert.recordType) === String(d.formId)) return entry;
    }
  }

  return entries.find((e) => e?.descriptor?.source === alert.source) || null;
}

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
  const entries = request.evaluationEntries;
  const cards = alerts.map((a) => buildAlertWorkspaceCard(a, moduleId, matchEvaluationEntry(a, entries)));
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
