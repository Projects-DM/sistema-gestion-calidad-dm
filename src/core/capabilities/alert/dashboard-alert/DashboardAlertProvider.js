/**
 * DashboardAlertProvider
 *
 * Sprint 205 — Alert Dashboard Runtime Integration.
 *
 * Supplies the Dashboard exclusively with the certified CONSUMPTION objects
 * produced by the Consumption Layer (`evaluationEntries` — the `{ descriptor,
 * evaluation }` contract). It never evaluates, never interprets and never
 * modifies the evaluated data; it only routes it to the Dashboard Alert
 * Adapter to produce View Models + KPIs.
 *
 * Provider ONLY. Never creates a Dashboard, never computes, never queries
 * metadata.
 */

import {
  adaptDashboardAlert,
  adaptDashboardKpis,
} from './DashboardAlertAdapter.js';

export const DASHBOARD_ALERT_VERSION = '205.1';

/**
 * Provides Dashboard Alert View Models + KPIs from the certified Consumption
 * layer output. Expects `request.evaluationEntries` (list of { descriptor,
 * evaluation }). Returns an empty set when no consumption output is present —
 * it NEVER builds view models from rules or descriptors directly.
 *
 * @param {Object} [request]
 * @param {Array} [request.evaluationEntries] Consumption { descriptor, evaluation } entries.
 * @returns {Object} Frozen Dashboard Alert provider result.
 */
export function provideDashboardAlerts(request = {}) {
  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      consumer: 'dashboard',
      capabilityKey: 'alerts',
      provider: false,
      consumed: false,
      available: false,
      cards: [],
      kpis: Object.freeze({
        activeAlerts: 0,
        criticalAlerts: 0,
        expiringDocuments: 0,
        pendingActions: 0,
      }),
      moduleId: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  const entries = Array.isArray(request.evaluationEntries) ? request.evaluationEntries : [];

  const cards = entries
    .map((entry) => adaptDashboardAlert(entry))
    .filter((r) => r.provided === true)
    .map((r) => r.viewModel);

  const kpis = adaptDashboardKpis(entries).kpis;

  return Object.freeze({
    consumer: 'dashboard',
    capabilityKey: 'alerts',
    provider: true,
    consumed: true,
    available: true,
    moduleId: request.moduleId || request.module || null,
    cards: Object.freeze(cards),
    kpis,
    reasons: [],
  });
}

export const dashboardAlertProvider = Object.freeze({
  key: 'dashboard-alert-provider',
  name: 'Alert Dashboard Provider',
  version: DASHBOARD_ALERT_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  consumes: 'consumption-layer',
  computes: false,
  interprets: false,
  modifies: false,
  provide: provideDashboardAlerts,
});

export default dashboardAlertProvider;