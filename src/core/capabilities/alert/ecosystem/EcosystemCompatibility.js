/**
 * EcosystemCompatibility
 *
 * Sprint 165 — Declares the Alert Capability's alignment with the
 * SGC-DM ecosystem.
 *
 * Describes compatibility only. Does NOT execute anything.
 */

export const ECOSYSTEM_COMPATIBILITY = Object.freeze({
  capabilityKey: 'alerts',
  ecosystem: 'SGC-DM',
  compatibilityVersion: 1,
  runtimeCompatible: true,
  registryCompatible: true,
  integrationCompatible: true,
  executionEnabled: false,
});

export default ECOSYSTEM_COMPATIBILITY;
