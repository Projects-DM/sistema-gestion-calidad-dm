/**
 * AlertLifecycleBoundary
 *
 * Sprint 207 — Alert Lifecycle Persistence Integration.
 *
 * Declares the official frontier between the Consumption Layer and the
 * Lifecycle Persistence:
 *
 *   Consumption  ↓  Lifecycle
 *
 * The Lifecycle may consume ONLY the certified Consumption objects
 * (`{ descriptor, evaluation }` evaluationEntries / Consumption DTO). It
 * never crosses into Runtime, Evaluation Engine, Strategy, Policy, Resolver,
 * Metadata, configuration or runtimeContext, and it never generates new
 * alerts nor schedules.
 *
 * Declarative boundary ONLY. No logic, no state, no persistence on its own.
 */

import { AlertLifecycleContract, ALERT_LIFECYCLE_VERSION } from './AlertLifecycleContract.js';

export const LIFECYCLE_ALERT_BOUNDARY = Object.freeze({
  boundaryKey: 'alert.lifecycle.boundary',
  name: 'Alert Lifecycle Persistence Integration Boundary',
  version: ALERT_LIFECYCLE_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  upstream: 'consumption-layer',
  downstream: 'lifecycle',
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
  ]),
  producesOnly: Object.freeze(['lifecycle-record']),
  singleFlow: AlertLifecycleContract.singleFlow,
});

export const ALERT_LIFECYCLE_BOUNDARY = Object.freeze({
  key: 'lifecycle',
  name: 'Alert Lifecycle Persistence Integration Boundary',
  integration: true,
  creation: false,
  evaluation: false,
  eventing: false,
  persistence: true,
});

export default LIFECYCLE_ALERT_BOUNDARY;