/**
 * DashboardAlertBoundary
 *
 * Sprint 205 — Alert Dashboard Runtime Integration.
 *
 * Declares the official frontier between the Consumption Layer and the
 * Dashboard:
 *
 *   Consumption  ↓  Dashboard
 *
 * The Dashboard may consume ONLY the certified Consumption objects
 * (`{ descriptor, evaluation }` evaluationEntries / Consumption DTO). It
 * never crosses into Runtime, Evaluation, Strategy, Policy, Resolver,
 * Metadata, configuration or runtimeContext.
 *
 * Declarative boundary ONLY. No logic, no state.
 */

import { DashboardAlertContract, DASHBOARD_ALERT_VERSION } from './DashboardAlertContract.js';

export const DASHBOARD_ALERT_BOUNDARY = Object.freeze({
  boundaryKey: 'alert.dashboard-alert.boundary',
  name: 'Alert Dashboard Runtime Integration Boundary',
  version: DASHBOARD_ALERT_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  upstream: 'consumption-layer',
  downstream: 'dashboard',
  consumesOnly: Object.freeze(['consumption-layer']),
  neverImports: Object.freeze([
    'runtime',
    'evaluation-engine',
    'strategy',
    'policy',
    'resolver',
    'operational-configuration',
    'metadata',
    'runtime-wiring',
    'runtime-activation',
    'workspace',
  ]),
  producesOnly: Object.freeze(['dashboard-view-model']),
  singleFlow: DashboardAlertContract.singleFlow,
});

export const ALERT_DASHBOARD_ALERT_BOUNDARY = Object.freeze({
  key: 'dashboard-alert',
  name: 'Alert Dashboard Runtime Integration Boundary',
  integration: true,
  creation: false,
  evaluation: false,
});

export default DASHBOARD_ALERT_BOUNDARY;