/**
 * RegistryCompatibility
 *
 * Sprint 153 — Compatibility boundary with the existing
 * Capability Registry / Resolver / Discovery model.
 *
 * Declares WHAT the capability exposes for future registration.
 * Does NOT register, activate or discover anything.
 */

export const REGISTRY_COMPATIBILITY = Object.freeze({
  registryModel: Object.freeze({
    compatibleWith: Object.freeze([
      'Capability Registry',
      'Capability Resolver',
      'Capability Discovery',
    ]),
    integration: 'prepared — not implemented',
  }),
  allowedMetadata: Object.freeze({
    identity: true,
    contracts: true,
    availability: true,
  }),
  forbiddenExposure: Object.freeze([
    'Internal domain structure',
    'Internal files',
    'Implementation details',
    'Runtime state',
  ]),
});

export default REGISTRY_COMPATIBILITY;
