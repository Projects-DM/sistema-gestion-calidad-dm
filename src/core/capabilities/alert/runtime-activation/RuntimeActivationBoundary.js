/**
 * RuntimeActivationBoundary
 *
 * Sprint 203 — Runtime Activation Integration.
 *
 * Determines the OFFICIAL point where the Runtime consumes the certified
 * Runtime Wiring. It certifies the boundary: Runtime Wiring → Runtime
 * Activation → Runtime Execution, and explicitly forbids any other connection
 * the Runtime might attempt to use the wiring through.
 *
 * This is a declarative boundary (structural descriptor). It performs NO
 * logic, NO state, NO creation.
 *
 * Boundary ONLY. Never executes, notifies or persists.
 */

import { RuntimeActivationContract, RUNTIME_ACTIVATION_VERSION } from './RuntimeActivationContract.js';

export const RUNTIME_ACTIVATION_BOUNDARY = Object.freeze({
  boundaryKey: 'alert.runtime-activation.boundary',
  name: 'Alert Runtime Activation Boundary',
  version: RUNTIME_ACTIVATION_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  officialConsumptionPoint: 'RuntimeActivationCoordinator',
  consumes: Object.freeze(['runtime-wiring']),
  produces: Object.freeze(['runtime-input']),
  neverProduces: Object.freeze([
    'evaluation',
    'status',
    'alert',
    'severity',
    'risk',
    'runtime',
    'configuration',
  ]),
  singleRuntime: Object.freeze({
    certified: true,
    parallel: false,
    cache: false,
    provider: false,
    store: false,
    manager: false,
    scheduler: false,
    polling: false,
  }),
  flow: RuntimeActivationContract.flow,
});

export const ALERT_RUNTIME_ACTIVATION_BOUNDARY = Object.freeze({
  key: 'runtime-activation',
  name: 'Alert Runtime Activation Boundary',
  activation: false,
  creation: false,
});

export default RUNTIME_ACTIVATION_BOUNDARY;