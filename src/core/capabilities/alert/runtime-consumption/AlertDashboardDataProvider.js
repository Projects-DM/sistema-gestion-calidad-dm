/**
 * AlertDashboardDataProvider
 *
 * Sprint 180 / Audit-4 — Delivers consolidated alert metrics to the
 * existing Dashboard engine.
 *
 * Sprint 200 — The metrics are aggregated ONLY from the ALREADY-COMPUTED
 * evaluations ({ descriptor, evaluation }) produced by the Consumption
 * layer. The provider NEVER derives state from descriptor rules and NEVER
 * recomputes risk/severity/expirations/priorities.
 *
 * Provider ONLY. Never creates a dashboard.
 */

import { mapEvaluationsToDashboardMetrics } from '../evaluation/consumption/AlertConsumptionMapper.js';

export const DASHBOARD_CONSUMER_KEY = 'dashboard';

export const EMPTY_ALERT_METRICS = Object.freeze({
  activeAlerts: 0,
  criticalAlerts: 0,
  expiringDocuments: 0,
  pendingActions: 0,
});

function fallbackMetrics(request) {
  return Object.freeze({
    activeAlerts: Number(request?.activeAlerts ?? 0),
    criticalAlerts: Number(request?.criticalAlerts ?? 0),
    expiringDocuments: Number(request?.expiringDocuments ?? 0),
    pendingActions: Number(request?.pendingActions ?? 0),
  });
}

export function provideAlertDashboardData(request) {
  if (!request) {
    return Object.freeze({
      consumer: DASHBOARD_CONSUMER_KEY,
      capabilityKey: 'alerts',
      provider: false,
      consumed: false,
      available: false,
      metrics: EMPTY_ALERT_METRICS,
      reasons: ['missing-consumption-context'],
    });
  }

  const capabilityValid = request.capability === 'alerts' || request.capabilityKey === 'alerts';
  const moduleAssigned = request.moduleAssigned !== false;
  const targetSupported = request.target === undefined || request.target === DASHBOARD_CONSUMER_KEY;

  if (!capabilityValid || !moduleAssigned) {
    return Object.freeze({
      consumer: DASHBOARD_CONSUMER_KEY,
      capabilityKey: 'alerts',
      provider: false,
      consumed: false,
      available: false,
      metrics: EMPTY_ALERT_METRICS,
      moduleId: request.moduleId || request.module || null,
      reasons: ['capability-not-assigned'],
    });
  }

  if (!targetSupported) {
    return Object.freeze({
      consumer: DASHBOARD_CONSUMER_KEY,
      capabilityKey: 'alerts',
      provider: false,
      consumed: false,
      available: false,
      metrics: EMPTY_ALERT_METRICS,
      moduleId: request.moduleId || request.module || null,
      reasons: ['unsupported-target'],
    });
  }

  const entries = Array.isArray(request.evaluationEntries) ? request.evaluationEntries : [];
  const metrics = entries.length > 0
    ? mapEvaluationsToDashboardMetrics(entries)
    : fallbackMetrics(request);

  return Object.freeze({
    consumer: DASHBOARD_CONSUMER_KEY,
    capabilityKey: 'alerts',
    provider: true,
    consumed: true,
    available: true,
    moduleId: request.moduleId || request.module || null,
    metrics,
    reasons: [],
  });
}

export default provideAlertDashboardData;
