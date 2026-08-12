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
 * Sprint 289 — KPI consolidation. `activeAlerts` ("Alertas Activas") is
 * derived EXCLUSIVELY from the certified occurrence projection
 * (request.occurrences → OccurrenceProjection) classified by the certified
 * OccurrenceLifecycle.classifyOccurrence — the SAME alert state the
 * operational monitor consumes. A COMPLETED/CANCELLED occurrence is NEVER
 * counted as active (Sprint 280 identity isolation; Sprint 284 canonical
 * alert identity). The provider consumes the projected occurrence and the
 * certified classifier; it NEVER rebuilds alertId/occurrenceId, NEVER
 * recomputes windows, schedules or completion. criticalAlerts /
 * expiringDocuments / pendingActions remain aggregated from the certified
 * evaluation entries (never recomputed).
 *
 * Provider ONLY. Never creates a dashboard.
 */

import { classifyOccurrence } from '../occurrence/OccurrenceLifecycle.js';
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

/**
 * Sprint 289 — KPI consolidation. Active alerts = the count of CURRENTLY
 * PROJECTED occurrences that are NOT completed and NOT cancelled, classified
 * by the certified OccurrenceLifecycle classifier. Pure read over the
 * projected occurrence state; never rebuilds identity or completion.
 *
 * @param {Array} occurrences Projected AlertOccurrence VOs (OccurrenceProjection).
 * @returns {number} Count of active (open) occurrences.
 */
export function countActiveOccurrences(occurrences) {
  if (!Array.isArray(occurrences)) return 0;
  return occurrences.filter((o) => {
    if (!o || typeof o !== 'object') return false;
    const state = classifyOccurrence(o);
    return state.key !== 'completed' && state.key !== 'cancelled';
  }).length;
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
  const occurrences = Array.isArray(request.occurrences) ? request.occurrences : null;

  // Sprint 289 — SINGLE ALERT AUTHORITY FOR "Alertas Activas". The KPI is a
  // summary projection of the SAME certified operational alert state the
  // monitor consumes: the projected occurrences decide the count. Without a
  // projection (legacy/no-occurrence call sites) the provider falls back to
  // the certified evaluation entries, never to local algebra.
  const evalMetrics = entries.length > 0
    ? mapEvaluationsToDashboardMetrics(entries)
    : fallbackMetrics(request);
  const activeAlerts = occurrences !== null
    ? countActiveOccurrences(occurrences)
    : evalMetrics.activeAlerts;
  const metrics = Object.freeze({
    activeAlerts,
    criticalAlerts: evalMetrics.criticalAlerts,
    expiringDocuments: evalMetrics.expiringDocuments,
    pendingActions: evalMetrics.pendingActions,
  });

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
