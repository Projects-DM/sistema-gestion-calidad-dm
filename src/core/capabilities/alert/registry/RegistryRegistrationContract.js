/**
 * RegistryRegistrationContract
 *
 * Sprint 161 — Declares the governed registry registration boundary
 * of the Alert Capability.
 *
 * Prepares registration metadata ONLY. Registers nothing.
 * Discovers nothing.
 */

export const REGISTRY_REGISTRATION_VERSION = '1';

export const RegistryRegistrationContract = Object.freeze({
  contractKey: 'alert.registry-registration',
  name: 'Registry Registration Contract',
  version: REGISTRY_REGISTRATION_VERSION,
  capabilityKey: 'alerts',
  registration: false,
  discovery: false,
  runtimeVisibility: false,
  representation: Object.freeze({
    capabilityIdentity: Object.freeze({ type: 'string', required: true, description: 'Capability identity key' }),
    registryKey: Object.freeze({ type: 'string', required: true, description: 'Registry entry key' }),
    registrationVersion: Object.freeze({ type: 'string', required: true, description: 'Registration contract version' }),
    discoveryRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified discovery constraints' }),
  }),
  boundaries: Object.freeze({
    neverExecutes: Object.freeze([
      'Registry write',
      'Capability activation',
      'Runtime exposure',
    ]),
  }),
});

export default RegistryRegistrationContract;
