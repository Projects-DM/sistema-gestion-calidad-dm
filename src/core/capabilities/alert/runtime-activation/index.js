/**
 * Alert Runtime Activation
 *
 * Sprint 203 — Runtime Activation Integration (LEVEL 5, activation only).
 *
 * Activates the certified Runtime Wiring so the Runtime officially consumes
 * the persisted configuration. This layer does NOT create a Runtime, Provider,
 * Context, Store, Service or Engine — it only connects Wiring with Runtime:
 *
 *   Runtime Wiring output → Runtime Activation → Runtime Execution
 *
 * Components:
 *   1. RuntimeActivationCoordinator — activates the Runtime Wiring.
 *   2. RuntimeActivationBoundary    — official point where Runtime consumes Wiring.
 *   3. RuntimeActivationContract    — single certified activation flow.
 *
 * No certified layer is modified (Engine, Evaluation, Consumption, Dashboard,
 * Workspace, Operational Experience, Resolver, Runtime Binding all intact).
 */

export {
  RuntimeActivationContract,
  RUNTIME_ACTIVATION_VERSION,
  RUNTIME_ACTIVATION_FLOW,
  RUNTIME_ACTIVATION_NEVER,
  ALERT_RUNTIME_ACTIVATION,
} from './RuntimeActivationContract.js';

export {
  RUNTIME_ACTIVATION_BOUNDARY,
  ALERT_RUNTIME_ACTIVATION_BOUNDARY,
} from './RuntimeActivationBoundary.js';

export {
  runtimeActivationCoordinator,
  activateRuntimeWiring,
} from './RuntimeActivationCoordinator.js';

export const ALERT_RUNTIME_ACTIVATION_LAYER = Object.freeze({
  key: 'runtime-activation',
  name: 'Alert Runtime Activation Layer',
  version: '203',
  capabilityKey: 'alerts',
  layer: 'integration',
  activationOnly: true,
  consumes: 'runtime-wiring',
  produces: 'runtime-input',
  creation: false,
  evaluation: false,
});

export default ALERT_RUNTIME_ACTIVATION_LAYER;