/**
 * AlertRuntimeConfigurationProvider
 *
 * Sprint 202 — Runtime Configuration Wiring.
 *
 * THE OFFICIAL runtime configuration source of the Alert Capability.
 *
 * The Runtime NEVER reads storage keys nor interprets metadata. It asks the
 * Runtime Configuration Provider, and the Provider in turn delegates 100% of
 * the configuration reading to the AlertConfigurationResolver — the ONLY
 * authorized owner of resource configuration (SSOT, Sprint 197).
 *
 * This component is a WIRE. It adds NO rules, NO decisions, NO evaluation,
 * NO defaulting and NO duplication. It only transports the RESOLVED
 * AlertConfiguration Value Object (with its provenance: source, resourceId)
 * into the Runtime contract:
 *
 *   { source, resourceId, configuration, configurationSource,
 *     configurationHash, configurationVersion, produceAlert }
 *
 * Runtime Configuration Provider ONLY. Never executes, notifies or persists.
 */

import {
  resolveResourceAlertConfiguration,
  shouldProduceAlert,
} from '../operational-configuration/AlertConfigurationResolver.js';

export const RUNTIME_CONFIGURATION_VERSION = '202.1';

/**
 * Deterministic, stable configuration hash over the canonical Value Object
 * surface. It hashes the sorted canonical entries so structurally equal
 * configurations ALWAYS produce the same hash.
 *
 * Pure. Never computes alert semantics.
 *
 * @param {Object} configuration AlertConfiguration Value Object.
 * @returns {string} Stable hex hash.
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
 * Resolves the OFFICIAL Runtime Configuration of a resource by delegating
 * exclusively to the AlertConfigurationResolver. The Provider NEVER reads
 * storage keys itself and NEVER interprets the metadata — it transports the
 * canonical, immutable Value Object produced by the Resolver.
 *
 * @param {Object} resource Form or Repository resource metadata.
 * @returns {Object} Frozen runtime configuration with provenance.
 */
export function provideRuntimeConfiguration(resource) {
  const resolution = resolveResourceAlertConfiguration(resource);
  return Object.freeze({
    source: resolution.source, // 'metadata' | 'default'
    resourceId: resolution.resourceId,
    configuration: resolution.configuration,
    configurationSource: resolution.source,
    configurationHash: hashRuntimeConfiguration(resolution.configuration),
    configurationVersion: RUNTIME_CONFIGURATION_VERSION,
    produceAlert: shouldProduceAlert(resolution.configuration),
    delivered: Object.freeze({
      via: 'AlertConfigurationResolver',
      official: true,
    }),
  });
}

export const runtimeConfigurationProvider = Object.freeze({
  key: 'runtime-configuration-provider',
  name: 'Alert Runtime Configuration Provider',
  version: RUNTIME_CONFIGURATION_VERSION,
  capabilityKey: 'alerts',
  source: 'AlertConfigurationResolver',
  official: true,
  provide: provideRuntimeConfiguration,
});

export default runtimeConfigurationProvider;