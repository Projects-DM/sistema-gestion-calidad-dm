/**
 * RuntimeActivationContract
 *
 * Sprint 203 — Runtime Activation Integration.
 *
 * The certified contract for the Runtime Activation pipeline. A single
 * declarative contract that fixes the ONLY official activation flow:
 *
 *   Runtime Input
 *     ↓
 *   Runtime Activation
 *     ↓
 *   Runtime Execution
 *
 * Never any other flow. This contract is an immutable descriptor: it declares
 * NO logic, NO state, NO evaluation.
 *
 * Contract ONLY. Never executes, notifies or persists.
 */

export const RUNTIME_ACTIVATION_VERSION = '203.1';

export const RUNTIME_ACTIVATION_FLOW = Object.freeze([
  'runtime-input',
  'runtime-activation',
  'runtime-execution',
]);

export const RUNTIME_ACTIVATION_NEVER = Object.freeze([
  'interpret-metadata',
  'calc',
  'evaluate',
  'modify-configuration',
  'modify-runtimeContext',
  'create-runtime',
  'create-parallel-runtime',
  'create-runtime-provider',
  'create-runtime-store',
  'create-runtime-manager',
  'create-runtime-scheduler',
  'create-runtime-polling',
]);

export const RuntimeActivationContract = Object.freeze({
  contractKey: 'alert.runtime-activation',
  name: 'Alert Runtime Activation Contract',
  version: RUNTIME_ACTIVATION_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  input: 'runtime-input',
  output: 'runtime-input',
  flow: RUNTIME_ACTIVATION_FLOW,
  officialActivationPoint: 'RuntimeActivationCoordinator',
  consumes: 'runtime-wiring',
  never: RUNTIME_ACTIVATION_NEVER,
});

export const ALERT_RUNTIME_ACTIVATION = Object.freeze({
  key: 'runtime-activation',
  name: 'Alert Runtime Activation',
  activation: false,
  creation: false,
});

export default RuntimeActivationContract;