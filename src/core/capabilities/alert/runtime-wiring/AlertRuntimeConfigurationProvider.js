/**
 * AlertRuntimeConfigurationProvider
 *
 * Sprint 202 — Runtime Configuration Wiring.
 * Sprint 202.R — Boundary certified: TRANSPORT layer.
 *
 * THE OFFICIAL runtime configuration source of the Alert Capability.
 *
 * The Runtime NEVER reads storage keys nor interprets metadata. It asks the
 * Runtime Configuration Provider, and the Provider TRANSPORTS the ALREADY
 * RESOLVED AlertConfiguration Value Object (delivered by the Operational
 * Experience through the certified Resolver) into the Runtime contract:
 *
 *   { source, resourceId, configuration, configurationSource,
 *     configurationHash, configurationVersion, produceAlert }
 *
 * This component is a WIRE. It NEVER reads metadata, NEVER interprets, NEVER
 * computes alert semantics, NEVER normalizes, NEVER validates, NEVER persists
 * and NEVER consults infrastructure. It only TRANSPORTS what the Operational
 * Experience delivers as input.
 *
 * Runtime Configuration Provider ONLY. Never executes, notifies or persists.
 */

export const RUNTIME_CONFIGURATION_VERSION = '202.1';

/**
 * Deterministic, stable provenance signature over the canonical Value Object
 * surface. It hashes the sorted canonical entries so structurally equal
 * configurations ALWAYS produce the same signature.
 *
 * This is transport metadata (provenance), NOT an alert computation: it never
 * interprets field meaning, never evaluates and never produces alert state.
 *
 * @param {Object} configuration AlertConfiguration Value Object.
 * @returns {string} Stable hex signature.
 */
export function hashRuntimeConfiguration(configuration) {
  const source = configuration && typeof configuration === 'object' ? configuration : {};
  const keys = Object.keys(source).sort();
  let value = 5381 >>> 0; // djb2 32-bit
  for (const key of keys) {
    value = ((value * 33) ^ hashString(key)) >>> 0;
    value = ((value * 33) ^ hashString(JSON.stringify(source[key]))) >>> 0;
  }
  return value.toString(16).padStart(8, '0');
}

function hashString(str) {
  let value = 0;
  const input = String(str);
  for (let i = 0; i < input.length; i += 1) {
    value = (Math.imul(31, value) + input.charCodeAt(i)) >>> 0;
  }
  return value;
}

/**
 * TRANSPORTS the already-resolved configuration into the Runtime contract.
 *
 * The Provider does NOT resolve, does NOT read metadata and does NOT compute.
 * It receives the configuration + provenance as INPUT (produced by the
 * Operational Experience) and transports it to the Runtime AS-IS.
 *
 * When no configuration is delivered, the Provider returns an inert,
 * non-provisioned record (transport of "nothing") — it NEVER falls back to
 * defaults (defaulting is Metadata's responsibility, not the wiring's).
 *
 * @param {Object} [input]
 * @param {Object} [input.configuration] Resolved AlertConfiguration VO.
 * @param {String} [input.configurationSource] 'metadata' | 'default'.
 * @param {String} [input.resourceId] Resource identity.
 * @param {Boolean} [input.produceAlert] Transported decision (else null).
 * @returns {Object} Frozen runtime configuration with provenance.
 */
export function provideRuntimeConfiguration({
  configuration,
  configurationSource,
  resourceId,
  produceAlert,
} = {}) {
  const hasConfiguration =
    configuration && typeof configuration === 'object' && Object.isFrozen(configuration);

  if (!hasConfiguration) {
    return Object.freeze({
      source: null,
      resourceId: resourceId || null,
      configuration: null,
      configurationSource: configurationSource || null,
      configurationHash: null,
      configurationVersion: RUNTIME_CONFIGURATION_VERSION,
      produceAlert: null,
      provided: false,
      delivered: Object.freeze({
        via: 'transport',
        official: true,
      }),
    });
  }

  return Object.freeze({
    source: configurationSource || 'metadata',
    resourceId: resourceId || null,
    configuration,
    configurationSource: configurationSource || 'metadata',
    configurationHash: hashRuntimeConfiguration(configuration),
    configurationVersion: RUNTIME_CONFIGURATION_VERSION,
    produceAlert: produceAlert === undefined || produceAlert === null ? null : produceAlert,
    provided: true,
    delivered: Object.freeze({
      via: 'transport',
      official: true,
    }),
  });
}

export const runtimeConfigurationProvider = Object.freeze({
  key: 'runtime-configuration-provider',
  name: 'Alert Runtime Configuration Provider',
  version: RUNTIME_CONFIGURATION_VERSION,
  capabilityKey: 'alerts',
  layer: 'integration',
  transport: true,
  official: true,
  provide: provideRuntimeConfiguration,
});

export default runtimeConfigurationProvider;