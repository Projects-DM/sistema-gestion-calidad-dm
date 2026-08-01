/**
 * AlertDashboardDataProvider
 *
 * Sprint 180 — Delivers consolidated alert metrics to the existing
 * Dashboard engine.
 *
 * Provider ONLY. Never creates a dashboard.
 */

export const DASHBOARD_CONSUMER_KEY = 'dashboard';

export const EMPTY_ALERT_METRICS = Object.freeze({
  activeAlerts: 0,
  criticalAlerts: 0,
  expiringDocuments: 0,
  pendingActions: 0,
});

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

  const metrics = Object.freeze({
    activeAlerts: Number(request.activeAlerts ?? 0),
    criticalAlerts: Number(request.criticalAlerts ?? 0),
    expiringDocuments: Number(request.expiringDocuments ?? 0),
    pendingActions: Number(request.pendingActions ?? 0),
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
