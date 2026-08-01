/**
 * CapabilityIdentity
 *
 * Sprint 153 — Official identity source for registry compatibility.
 *
 * Single authoritative identity. READ ONLY. Derived from
 * governance/CapabilityMetadata.js (SSOT).
 *
 * Defines: name, key, version, type, ownership.
 * Does NOT register, activate or discover anything.
 */

export const CAPABILITY_IDENTITY = Object.freeze({
  name: 'Alert Capability',
  key: 'alerts',
  version: 1,
  type: 'operational-capability',
  ownership: Object.freeze({
    owner: 'SGC-DM Core',
    lineage: 'Sprint 144.0 → 152',
    immutableCore: true,
  }),
});

export default CAPABILITY_IDENTITY;
