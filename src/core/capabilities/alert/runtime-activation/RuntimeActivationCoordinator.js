/**
 * RuntimeActivationCoordinator
 *
 * Sprint 203 — Runtime Activation Integration.
 *
 * The OFFICIAL point where the Runtime consumes the certified Runtime
 * Wiring. It ACTIVATES the existing wiring — it does NOT create a Runtime,
 * Provider, Context, Store, Service or Engine.
 *
 * The Coordinator produces the "Runtime Ready Input" by TRANSPORTING the
 * output of the Runtime Wiring (configuration + runtimeContext + provenance)
 * into the Runtime input, AS-IS:
 *
 *   Runtime Wiring output  →  Runtime Ready Input  →  Runtime Execution
 *
 * It NEVER computes, NEVER interprets, NEVER evaluates, NEVER modifies the
 * configuration and NEVER modifies the runtimeContext object (identity
 * preserved — the SAME references are transported; the Wiring already delivers
 * the runtimeContext carrying the configuration provenance).
 *
 * Activation ONLY. Never executes, notifies or persists.
 */

export const RUNTIME_ACTIVATION_VERSION = '203.1';

/**
 * ACTIVATES the certified Runtime Wiring: transports its output into a
 * Runtime Ready (Runtime Input) record without modifying, computing or
 * interpreting anything.
 *
 * The `configuration` and `runtimeContext` references delivered by the Wiring
 * are preserved IDENTICALLY (no copy, no mutation). Only the observable
 * provenance + an activation flag are annotated on the ready record.
 *
 * @param {Object} [wiringOutput] Output of runtime-wiring.
 * @param {Object} [wiringOutput.configuration] AlertConfiguration VO.
 * @param {Object} [wiringOutput.runtimeContext] Runtime context (with provenance).
 * @param {String} [wiringOutput.configurationVersion]
 * @param {String} [wiringOutput.configurationHash]
 * @param {String} [wiringOutput.configurationSource]
 * @returns {Object} Frozen Runtime Ready Input.
 */
export function activateRuntimeWiring(wiringOutput = {}) {
  const configuration = wiringOutput.configuration || null;
  const runtimeContext = wiringOutput.runtimeContext || {};

  return Object.freeze({
    kind: 'runtime-activation-input',
    configuration,
    runtimeContext,
    provenance: Object.freeze({
      version: wiringOutput.configurationVersion || runtimeContext.configurationVersion || null,
      hash: wiringOutput.configurationHash || runtimeContext.configurationHash || null,
      source: wiringOutput.configurationSource || runtimeContext.configurationSource || null,
      via: 'runtime-wiring',
      activation: true,
    }),
    ready: configuration !== null,
    execution: Object.freeze({
      runtime: 'certified-runtime',
      enabled: false,
      flow: 'runtime-input → runtime-activation → runtime-execution',
    }),
  });
}

export const runtimeActivationCoordinator = Object.freeze({
  key: 'runtime-activation-coordinator',
  name: 'Alert Runtime Activation Coordinator',
  version: RUNTIME_ACTIVATION_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  activates: 'runtime-wiring',
  computes: false,
  interprets: false,
  evaluates: false,
  createRuntime: false,
  parallelRuntime: false,
});

export default runtimeActivationCoordinator;