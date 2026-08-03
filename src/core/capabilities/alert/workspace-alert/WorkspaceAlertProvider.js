/**
 * WorkspaceAlertProvider
 *
 * Sprint 204 — Alert Workspace Runtime Integration.
 *
 * Supplies the Workspace exclusively with the certified CONSUMPTION objects
 * produced by the Consumption Layer (`evaluationEntries` — the `{ descriptor,
 * evaluation }` contract). It never evaluates, never interprets and never
 * modifies the evaluated data; it only routes it to the Workspace Alert
 * Adapter to produce View Models.
 *
 * Provider ONLY. Never creates a Workspace, never computes, never queries
 * metadata.
 */

import { adaptWorkspaceAlert } from './WorkspaceAlertAdapter.js';

export const WORKSPACE_ALERT_VERSION = '204.1';

/**
 * Provides Workspace Alert View Models from the certified Consumption layer
 * output. Expects `request.evaluationEntries` (list of { descriptor,
 * evaluation }). Returns an empty set when no consumption output is present —
 * it NEVER builds View Models from rules or descriptors directly.
 *
 * @param {Object} [request]
 * @param {Array} [request.evaluationEntries] Consumption { descriptor, evaluation } entries.
 * @returns {Object} Frozen Workspace Alert provider result.
 */
export function provideWorkspaceAlerts(request = {}) {
  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      consumer: 'workspace',
      capabilityKey: 'alerts',
      provider: false,
      consumed: false,
      available: false,
      cards: [],
      moduleId: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  const entries = Array.isArray(request.evaluationEntries) ? request.evaluationEntries : [];

  const cards = entries
    .map((entry) => adaptWorkspaceAlert(entry))
    .filter((r) => r.provided === true)
    .map((r) => r.viewModel);

  return Object.freeze({
    consumer: 'workspace',
    capabilityKey: 'alerts',
    provider: true,
    consumed: true,
    available: true,
    moduleId: request.moduleId || request.module || null,
    cards: Object.freeze(cards),
    reasons: [],
  });
}

export const workspaceAlertProvider = Object.freeze({
  key: 'workspace-alert-provider',
  name: 'Alert Workspace Provider',
  version: WORKSPACE_ALERT_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  consumes: 'consumption-layer',
  computes: false,
  interprets: false,
  modifies: false,
  provide: provideWorkspaceAlerts,
});

export default workspaceAlertProvider;