/**
 * Alert Dashboard — Runtime Integration
 *
 * Sprint 205 — Alert Dashboard Runtime Integration (LEVEL 5, dashboard only).
 *
 * Integrates the Alert Capability into the Dashboard as the SECOND operational
 * consumer, reusing the certified pipeline:
 *
 *   Evaluation Engine → Consumption Layer → Dashboard Integration → Dashboard
 *
 * The Dashboard NEVER interprets rules, NEVER calculates states, NEVER
 * evaluates alerts and NEVER consults metadata. It only REPRESENTS the
 * operational state produced by the certified Evaluation Engine + Consumption
 * Layer.
 *
 * Components (all frozen after this Sprint):
 *   1. DashboardAlertProvider — obtains only certified Consumption objects.
 *   2. DashboardAlertAdapter  — Consumption DTO → Dashboard View Model + KPIs.
 *   3. DashboardAlertBoundary — official frontier Consumption ↓ Dashboard.
 *   4. DashboardAlertContract — single contract Consumption Entry → Card / KPI.
 */

export {
  DashboardAlertContract,
  DASHBOARD_ALERT_VERSION,
  DASHBOARD_ALERT_CONSUMED_FIELDS,
  DASHBOARD_ALERT_FORBIDDEN_FIELDS,
  ALERT_DASHBOARD_ALERT,
} from './DashboardAlertContract.js';

export {
  DASHBOARD_ALERT_BOUNDARY,
  ALERT_DASHBOARD_ALERT_BOUNDARY,
} from './DashboardAlertBoundary.js';

export {
  dashboardAlertAdapter,
  adaptDashboardAlert,
  adaptDashboardKpis,
} from './DashboardAlertAdapter.js';

export {
  dashboardAlertProvider,
  provideDashboardAlerts,
} from './DashboardAlertProvider.js';

export const ALERT_DASHBOARD_ALERT_LAYER = Object.freeze({
  key: 'dashboard-alert',
  name: 'Alert Dashboard Runtime Integration Layer',
  version: '205',
  capabilityKey: 'alerts',
  layer: 'integration',
  consumes: 'consumption-layer',
  produces: 'dashboard-view-model',
  integrationOnly: true,
  creation: false,
  evaluation: false,
});

export default ALERT_DASHBOARD_ALERT_LAYER;