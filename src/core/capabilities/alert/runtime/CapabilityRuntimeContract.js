/**
 * CapabilityRuntimeContract
 *
 * Sprint 154 — Declares the runtime consumption boundary of the
 * Alert Capability.
 *
 * Exposes: capability key, available contracts and runtime
 * compatibility version. Does NOT implement execution.
 */

export const CAPABILITY_RUNTIME_VERSION = '1';

export const CapabilityRuntimeContract = Object.freeze({
  contractKey: 'alert.runtime',
  name: 'Capability Runtime Contract',
  version: CAPABILITY_RUNTIME_VERSION,
  purpose: 'Declare how the capability can be consumed by the Runtime.',
  representation: Object.freeze({
    capabilityKey: Object.freeze({
      type: 'string',
      required: true,
      description: 'Alert capability key',
    }),
    contractsAvailable: Object.freeze({
      type: 'array',
      required: true,
      description: 'Certified public contract keys',
    }),
    runtimeCompatibilityVersion: Object.freeze({
      type: 'string',
      required: true,
      description: 'Runtime compatibility contract version',
    }),
  }),
  boundaries: Object.freeze({
    exposes: Object.freeze(['Capability key', 'Contracts available', 'Runtime compatibility version']),
    neverExposes: Object.freeze([
      'Domain objects',
      'Internal files',
      'Private metadata',
    ]),
  }),
});

export default CapabilityRuntimeContract;
