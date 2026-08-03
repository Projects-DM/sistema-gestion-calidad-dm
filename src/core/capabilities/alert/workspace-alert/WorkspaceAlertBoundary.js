/**
 * WorkspaceAlertBoundary
 *
 * Sprint 204 — Alert Workspace Runtime Integration.
 *
 * Declares the official frontier between the Consumption Layer and the
 * Workspace:
 *
 *   Consumption  ↓  Workspace
 *
 * The Workspace may consume ONLY the certified Consumption objects
 * (`{ descriptor, evaluation }` evaluationEntries / Consumption DTO). It
 * never crosses into Runtime, Evaluation, Strategy, Policy, Resolver,
 * Metadata, configuration or runtimeContext.
 *
 * Declarative boundary ONLY. No logic, no state.
 */

import { WorkspaceAlertContract, WORKSPACE_ALERT_VERSION } from './WorkspaceAlertContract.js';

export const WORKSPACE_ALERT_BOUNDARY = Object.freeze({
  boundaryKey: 'alert.workspace-alert.boundary',
  name: 'Alert Workspace Runtime Integration Boundary',
  version: WORKSPACE_ALERT_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  upstream: 'consumption-layer',
  downstream: 'workspace',
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
  ]),
  producesOnly: Object.freeze(['workspace-view-model']),
  singleFlow: WorkspaceAlertContract.singleFlow,
});

export const ALERT_WORKSPACE_ALERT_BOUNDARY = Object.freeze({
  key: 'workspace-alert',
  name: 'Alert Workspace Runtime Integration Boundary',
  integration: true,
  creation: false,
  evaluation: false,
});

export default WORKSPACE_ALERT_BOUNDARY;