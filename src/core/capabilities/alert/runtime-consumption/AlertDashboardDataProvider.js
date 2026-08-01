/**
 * AlertDashboardDataProvider
 *
 * Sprint 180 / Audit-4 — Delivers consolidated alert metrics to the
 * existing Dashboard engine.
 *
 * Audit-4: the existing Dashboard reuses this provider. It NEVER creates
 * a parallel Alert Dashboard and NEVER administers configurations.
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

function deriveMetricsFromDescriptor(request) {
  const descriptor = request?.configurationDescriptor;
  const alerts = descriptor && Array.isArray(descriptor.alerts) ? descriptor.alerts : [];
  if (alerts.length === 0) return null;

  const activeAlerts = alerts.filter((a) => a.active !== false).length;
  const criticalAlerts = alerts.filter((a) => a.priority === 'critical' || a.priority === 'high').length;
  const expiringDocuments = alerts.filter((a) => a.source === 'documentRepository').length;
  const pendingActions = alerts.filter((a) => a.source === 'dynamicRecords').length;

  return Object.freeze({
    activeAlerts,
    criticalAlerts,
    expiringDocuments,
    pendingActions,
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

  const metrics = deriveMetricsFromDescriptor(request) || Object.freeze({
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
