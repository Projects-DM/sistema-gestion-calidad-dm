/**
 * AlertRuntimeConfigurationBridge
 *
 * Sprint 202 — Runtime Configuration Wiring.
 * Sprint 202.R — Boundary certified: TRANSPORT layer.
 *
 * The BRIDGE between the Operational Experience (persisted metadata) and the
 * Runtime (consumption). It is PURE WIRING: it connects what the Operational
 * Experience delivered to what the Runtime consumes, WITHOUT touching the
 * frozen Operational Experience components and WITHOUT creating any parallel
 * Runtime.
 *
 * The Bridge NEVER computes rules, NEVER evaluates, NEVER normalizes, NEVER
 * validates, NEVER persists, NEVER consults infrastructure and NEVER executes
 * the Engine. It only TRANSPORTS the configured entry into the Runtime input
 * contract:
 *
 *   { descriptor, configuration, runtimeContext }
 *
 * The `configuration` it transports is ALWAYS the already-resolved AlertConfiguration
 * Value Object delivered as input. The `runtimeContext` is TRANSPORTED with the
 * configuration provenance (version/hash/source) — never built here.
 *
 * Bridge ONLY. Never executes, notifies or persists. Produces Runtime INPUT
 * only — never Runtime OUTPUT (never an AlertEvaluation/Descriptor/Policy).
 */

import { provideRuntimeConfiguration } from './AlertRuntimeConfigurationProvider.js';
import { synchronizeRuntimeConfiguration } from './RuntimeConfigurationSynchronization.js';

export const RUNTIME_CONFIGURATION_BRIDGE_VERSION = '202.1';

/**
 * Produces the runtime-facing entry `{ descriptor, configuration,
 * runtimeContext }`, wiring the Operational Experience delivered configuration
 * into the Runtime input contract.
 *
 * The `descriptor` and the `configuration` are provided by the caller (the
 * Operational Experience) — the Bridge TRANSPORTS them, never computes them.
 * The `runtimeContext` is synchronized with the configuration provenance.
 *
 * @param {Object} input
 * @param {Object} [input.descriptor] Runtime descriptor (already built).
 * @param {Object} [input.configuration] Resolved AlertConfiguration VO.
 * @param {String} [input.configurationSource] 'metadata' | 'default'.
 * @param {Object} [input.runtimeContext] Existing runtime context to enrich.
 * @param {String} [input.resourceReference] Resource identity (provenance).
 * @param {String} [input.resourceId] Resource id (provenance).
 * @param {Boolean} [input.produceAlert] Transported decision.
 * @returns {Object} Frozen runtime input entry.
 */
export function buildRuntimeConfigurationEntry({
  descriptor,
  configuration,
  configurationSource,
  runtimeContext,
  resourceReference,
  resourceId,
  produceAlert,
} = {}) {
  const resolution = provideRuntimeConfiguration({
    configuration,
    configurationSource,
    resourceId: resourceId || resourceReference,
    produceAlert,
  });

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
  layer: 'integration',
  wiring: true,
  computes: false,
  buildRuntimeConfigurationEntry,
});

export default alertRuntimeConfigurationBridge;