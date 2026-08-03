/**
 * AlertRuntimeConfigurationBridge
 *
 * Sprint 202 — Runtime Configuration Wiring.
 *
 * The BRIDGE between the Operational Experience (persisted metadata) and the
 * Runtime (consumption). It is PURE WIRING: it connects what the Operational
 * Experience persisted to what the Runtime consumes, WITHOUT touching the
 * frozen Operational Experience components and WITHOUT creating any parallel
 * Runtime.
 *
 * The Bridge NEVER computes rules, NEVER evaluates and NEVER interprets
 * metadata. It transports the OFFICIAL configuration obtained from the
 * AlertRuntimeConfigurationProvider (which in turn delegates exclusively to
 * the AlertConfigurationResolver) into the Runtime entry contract:
 *
 *   { descriptor, configuration, runtimeContext }
 *
 * `configuration` ALWAYS originates from the AlertConfigurationResolver
 * (persisted metadata). `runtimeContext` is TRANSPORTED with the
 * configuration provenance (version/hash/source) — never built here.
 *
 * Bridge ONLY. Never executes, notifies or persists.
 */

import { provideRuntimeConfiguration } from './AlertRuntimeConfigurationProvider.js';
import { synchronizeRuntimeConfiguration } from './RuntimeConfigurationSynchronization.js';

export const RUNTIME_CONFIGURATION_BRIDGE_VERSION = '202.1';

/**
 * Produces the runtime-facing entry `{ descriptor, configuration,
 * runtimeContext }` for a single resource, wiring the Operational
 * Experience persisted metadata into the Runtime contract.
 *
 * The `descriptor` is provided by the caller (it describes the bound alert —
 * source/resource identity). The `configuration` is ALWAYS resolved here by
 * the Runtime Configuration Provider (official source). The `runtimeContext`
 * is synchronized with the configuration provenance.
 *
 * @param {Object} input
 * @param {Object} [input.resource] RAW existing resource (metadata owner).
 * @param {Object} [input.descriptor] Runtime descriptor (already built).
 * @param {Object} [input.runtimeContext] Existing runtime context to enrich.
 * @param {String} [input.resourceReference] Resource identity (fallback).
 * @returns {Object} Frozen runtime entry.
 */
export function buildRuntimeConfigurationEntry({
  resource,
  descriptor,
  runtimeContext,
  resourceReference,
} = {}) {
  const resolution = provideRuntimeConfiguration(resource);

  const context = synchronizeRuntimeConfiguration({
    configuration: resolution.configuration,
    configurationSource: resolution.configurationSource,
    configurationHash: resolution.configurationHash,
    configurationVersion: resolution.configurationVersion,
    runtimeContext,
  });

  return Object.freeze({
    descriptor: descriptor || null,
    configuration: resolution.configuration,
    runtimeContext: context.runtimeContext,
    provenance: Object.freeze({
      source: resolution.configurationSource,
      hash: resolution.configurationHash,
      version: resolution.configurationVersion,
      resourceId: resolution.resourceId,
      reference: resourceReference || null,
      via: resolution.delivered.via,
      official: resolution.delivered.official,
    }),
  });
}

export const alertRuntimeConfigurationBridge = Object.freeze({
  key: 'alert-runtime-configuration-bridge',
  name: 'Alert Runtime Configuration Bridge',
  version: RUNTIME_CONFIGURATION_BRIDGE_VERSION,
  capabilityKey: 'alerts',
  wiring: true,
  computes: false,
  buildRuntimeConfigurationEntry,
});

export default alertRuntimeConfigurationBridge;