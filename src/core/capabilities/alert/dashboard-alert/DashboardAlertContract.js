/**
 * DashboardAlertContract
 *
 * Sprint 205 — Alert Dashboard Runtime Integration.
 *
 * THE single certified contract of the Dashboard Alert integration. The only
 * official flow:
 *
 *   Consumption Entry  →  Dashboard Card / KPI
 *
 * The Dashboard consumes ONLY the certified Consumption objects. It never
 * interprets rules, never calculates states and never evaluates alerts. This
 * is an immutable declarative contract: NO logic, NO state, NO evaluation.
 *
 * Contract ONLY. Never executes, notifies or persists.
 */

export const DASHBOARD_ALERT_VERSION = '205.1';

export const DASHBOARD_ALERT_CONSUMED_FIELDS = Object.freeze([
  'descriptor.message',
  'descriptor.priority',
  'evaluation.status',
  'evaluation.severity',
  'evaluation.remaining',
  'evaluation.nextDue',
  'evaluation.transition',
  'evaluation.overdue',
  'evaluation.escalation',
]);

export const DASHBOARD_ALERT_FORBIDDEN_FIELDS = Object.freeze([
  'configuration',
  'runtimeContext',
  'AlertTemporalState',
  'Strategy',
  'Policy',
  'Resolver',
  'Metadata',
]);

export const DashboardAlertContract = Object.freeze({
  contractKey: 'alert.dashboard-alert',
  name: 'Alert Dashboard Runtime Integration Contract',
  version: DASHBOARD_ALERT_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  input: 'consumption-entry',
  output: 'dashboard-view-model',
  consumes: 'consumption-layer',
  consumedFields: DASHBOARD_ALERT_CONSUMED_FIELDS,
  never: DASHBOARD_ALERT_FORBIDDEN_FIELDS,
  singleFlow: Object.freeze({
    evaluationEngine: 'evaluation-engine',
    consumptionLayer: 'consumption-layer',
    dashboard: 'dashboard',
    direction: Object.freeze([
      'evaluation-engine',
      'consumption-layer',
      'dashboard',
    ]),
  }),
});

export const ALERT_DASHBOARD_ALERT = Object.freeze({
  key: 'dashboard-alert',
  name: 'Alert Dashboard Runtime Integration',
  integration: true,
  creation: false,
  evaluation: false,
});

export default DashboardAlertContract;