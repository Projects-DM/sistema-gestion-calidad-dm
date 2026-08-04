/**
 * DashboardAlertAdapter
 *
 * Sprint 205 — Alert Dashboard Runtime Integration.
 *
 * Adapts a certified Consumption entry `{ descriptor, evaluation }` into a
 * Dashboard View Model (card + KPI). It copies ONLY the permitted consumption
 * fields and aggregates KPIs ETHEREALLY by COUNTING the already-computed
 * evaluation states — it NEVER recalculates risk, severity, due dates or
 * priorities (those belong exclusively to the Evaluation Engine).
 *
 * It reuses the certified Consumption Mapper for the DTO + visual
 * presentation (icon/color/label) and the certified Dashboard Metrics mapper
 * for KPI aggregation.
 *
 * Adapter ONLY. Never executes, never recomputes. AlertEvaluation stays
 * immutable (only read, never modified).
 */

import {
  mapEvaluationToConsumption,
  mapEvaluationsToDashboardMetrics,
} from '../evaluation/consumption/AlertConsumptionMapper.js';

export const DASHBOARD_ALERT_VERSION = '205.1';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
};

/**
 * Maps a certified Consumption entry into a Dashboard Alert View Model.
 *
 * @param {Object} entry { descriptor, evaluation } Consumption entry.
 * @returns {Object} Frozen { provided, viewModel }.
 */
export function adaptDashboardAlert(entry) {
  if (!entry || !entry.evaluation) {
    return Object.freeze({ provided: false, viewModel: null, reasons: ['missing-consumption-entry'] });
  }
  const descriptor = entry.descriptor || null;
  const consumption = mapEvaluationToConsumption(entry);

  return Object.freeze({
    provided: true,
    viewModel: deepFreeze({
      id: descriptor?.formId || descriptor?.documentId || descriptor?.resource || descriptor?.source || null,
      source: consumption.source,
      message: consumption.message,
      priority: consumption.priority,
      priorityLabel: consumption.priorityLabel,
      status: consumption.status,
      severity: consumption.severity,
      remaining: consumption.remaining,
      nextDue: consumption.nextDue,
      transition: consumption.transition,
      overdue: consumption.overdue,
      escalation: consumption.escalation,
      icon: consumption.icon,
      color: consumption.color,
      label: consumption.label,
      action: 'view-detail',
    }),
    reasons: [],
  });
}

/**
 * Aggregates Dashboard KPIs by COUNTING the already-computed (Consumption)
 * evaluation states. Never recomputes: uses the certified
 * `mapEvaluationsToDashboardMetrics`.
 *
 * @param {Array} entries List of { descriptor, evaluation }.
 * @returns {Object} Frozen KPI set.
 */
export function adaptDashboardKpis(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const metrics = mapEvaluationsToDashboardMetrics(list);
  return Object.freeze({
    provided: true,
    kpis: deepFreeze({
      activeAlerts: metrics.activeAlerts,
      criticalAlerts: metrics.criticalAlerts,
      expiringDocuments: metrics.expiringDocuments,
      pendingActions: metrics.pendingActions,
    }),
  });
}

export const dashboardAlertAdapter = Object.freeze({
  key: 'dashboard-alert-adapter',
  name: 'Alert Dashboard Adapter',
  version: DASHBOARD_ALERT_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  produces: 'dashboard-view-model',
  computes: false,
  interprets: false,
  queriesMetadata: false,
  adapt: adaptDashboardAlert,
  kpis: adaptDashboardKpis,
});

export default dashboardAlertAdapter;