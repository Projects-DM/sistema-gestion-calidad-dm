/**
 * AlertOperationalActionBoundary
 *
 * Sprint 208 — Alert Operational Actions Integration.
 *
 * Declares the official frontier between the Consumption Layer and the
 * Operational Actions:
 *
 *   Consumption  ↓  Operational Actions
 *
 * Operational Actions may consume ONLY the certified Consumption objects
 * (`{ descriptor, evaluation }`) plus the transported user intent. They never
 * cross into Runtime, Runtime Wiring, Runtime Activation, Evaluation Engine,
 * Strategy, Policy, Resolver, Metadata, configuration or runtimeContext, and
 * they never mutate Runtime, Consumption or Lifecycle.
 *
 * Declarative boundary ONLY. No logic, no state, no runtime mutation on its
 * own.
 */

import { AlertOperationalActionContract, OPERATIONAL_ACTIONS_VERSION } from './AlertOperationalActionContract.js';

export const OPERATIONAL_ACTIONS_BOUNDARY = Object.freeze({
  boundaryKey: 'alert.operational-actions.boundary',
  name: 'Alert Operational Actions Integration Boundary',
  version: OPERATIONAL_ACTIONS_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  upstream: 'consumption-layer',
  downstream: 'operational-actions',
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
    'dashboard',
    'notification',
    'lifecycle',
  ]),
  producesOnly: Object.freeze(['operational-action-request']),
  singleFlow: AlertOperationalActionContract.singleFlow,
});

export const ALERT_OPERATIONAL_ACTIONS_BOUNDARY = Object.freeze({
  key: 'operational-actions',
  name: 'Alert Operational Actions Integration Boundary',
  integration: true,
  creation: false,
  evaluation: false,
  eventing: false,
  runtimeMutation: false,
});

export default OPERATIONAL_ACTIONS_BOUNDARY;