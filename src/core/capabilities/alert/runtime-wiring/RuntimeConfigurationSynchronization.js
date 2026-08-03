/**
 * RuntimeConfigurationSynchronization
 *
 * Sprint 202 — Runtime Configuration Wiring.
 *
 * Transports the configuration provenance of the Operational Experience into
 * the Runtime Context. It carries configurationVersion, configurationHash and
 * configurationSource so the Runtime can observe which configuration produced
 * the alert state — WITHOUT the Runtime ever re-reading storage keys.
 *
 * This component is PURE TRANSPORT. It never computes, never decides, never
 * stores. It only ENRICHES a runtime context object with the metadata
 * provenance provided by the wiring.
 *
 * Synchronization ONLY. Never executes, notifies or persists.
 */

export const RUNTIME_CONFIGURATION_SYNC_VERSION = '202.1';

/**
 * Synchronizes the configuration provenance into the Runtime Context.
 *
 * The resulting context is a frozen object that carries the configuration
 * metadata alongside the existing context. No field is removed; the existing
 * context is never mutated (a new object is produced).
 *
 * @param {Object} input
 * @param {Object} [input.configuration] Resolved AlertConfiguration VO.
 * @param {String} [input.configurationSource] 'metadata' | 'default'.
 * @param {String} [input.configurationHash] Stable configuration hash.
 * @param {String} [input.configurationVersion] Configuration contract version.
 * @param {Object} [input.runtimeContext] Existing runtime context.
 * @returns {Object} { synchronized: true, runtimeContext } frozen.
 */
export function synchronizeRuntimeConfiguration({
  configuration,
  configurationSource,
  configurationHash,
  configurationVersion,
  runtimeContext,
} = {}) {
  const base = runtimeContext && typeof runtimeContext === 'object' ? runtimeContext : {};

  const runtimeContextSync = Object.freeze({
    ...base,
    configurationVersion,
    configurationHash,
    configurationSource,
  });

  return Object.freeze({
    synchronized: true,
    ownsConfiguration: configuration !== undefined && configuration !== null,
    configuration: configuration || null,
    runtimeContext: runtimeContextSync,
  });
}

export const runtimeConfigurationSynchronization = Object.freeze({
  key: 'runtime-configuration-synchronization',
  name: 'Runtime Configuration Synchronization',
  version: RUNTIME_CONFIGURATION_SYNC_VERSION,
  capabilityKey: 'alerts',
  transport: true,
  computes: false,
  synchronizeRuntimeConfiguration,
});

export default runtimeConfigurationSynchronization;