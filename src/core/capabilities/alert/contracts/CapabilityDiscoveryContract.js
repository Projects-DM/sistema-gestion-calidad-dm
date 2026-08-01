/**
 * CapabilityDiscoveryContract
 *
 * Sprint 153 — Declares HOW the Alert Capability can be discovered.
 *
 * Contract of availability — does NOT execute discovery,
 * registration or activation.
 */

export const CAPABILITY_DISCOVERY_VERSION = '1';

export const CapabilityDiscoveryContract = Object.freeze({
  contractKey: 'alert.discovery',
  name: 'Capability Discovery Contract',
  version: CAPABILITY_DISCOVERY_VERSION,
  purpose: 'Declare how the capability can be discovered.',
  representation: Object.freeze({
    identity: Object.freeze({
      type: 'string',
      required: true,
      description: 'Capability identity key',
    }),
    metadata: Object.freeze({
      type: 'object',
      required: true,
      description: 'Capability metadata (SSOT)',
    }),
    availability: Object.freeze({
      type: 'boolean',
      required: true,
      description: 'Capability availability',
    }),
  }),
  boundaries: Object.freeze({
    exposes: Object.freeze(['Capability contract', 'Capability metadata', 'Capability availability']),
    neverExposes: Object.freeze([
      'Domain structure',
      'Internal files',
      'Implementation details',
    ]),
  }),
});

export default CapabilityDiscoveryContract;
