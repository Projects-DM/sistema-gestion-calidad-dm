/**
 * RegistryCompatibility
 *
 * Sprint 161 — Declares registry model compatibility rules for the
 * Alert Capability.
 *
 * Describes compatibility only. Does NOT mutate the registry.
 */

export const REGISTRY_COMPATIBILITY = Object.freeze({
  registryModel: Object.freeze({
    compatibleWith: Object.freeze(['SGC-DM Capability Registry']),
    registration: false,
    discovery: false,
    resolverUsage: 'existing resolver only',
  }),
  compatibilityRules: Object.freeze([
    'Capability defines its identity, not the registry storage',
    'Registry lifecycle is controlled by the registry, not the capability',
    'Discovery engine belongs to the platform, not the capability',
  ]),
  futureRegistrationSupport: Object.freeze({
    contractVersioned: true,
    futureVersions: 'compatibility validated on registration',
  }),
  stableIdentity: Object.freeze({
    guarantee: 'capability metadata → registry representation → stable discovery identity',
  }),
});

export default REGISTRY_COMPATIBILITY;
