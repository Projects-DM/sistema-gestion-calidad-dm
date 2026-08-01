/**
 * CapabilityMetadata
 *
 * Sprint 151 — Official identity of the Alert Capability.
 *
 * READ ONLY. Derived from the certified series Sprint 144.0 → 150.
 */

export const CAPABILITY_METADATA = Object.freeze({
  capabilityKey: 'alerts',
  name: 'Alert Capability',
  description:
    'Universal Operational Capability for governed signals, decisions, policies and responses.',
  level: 'LEVEL 3 — OPERATIONAL DOMAIN ARCHITECTURE FOUNDATION',
  certified: Object.freeze({
    fromSprint: '144.0',
    toSprint: '150',
    immutableCore: true,
  }),
  identity: Object.freeze({
    purpose: 'Transform certified signals into governed operational responses.',
    responsibilities: Object.freeze([
      'Receive operational signals',
      'Generate governed decisions',
      'Apply certified alert policies',
      'Produce authorized operational responses',
    ]),
    neverResponsible: Object.freeze([
      'Notifications',
      'Publication',
      'Infrastructure',
      'Persistence',
      'UI',
    ]),
  }),
});
