/**
 * Alert Registry
 *
 * Sprint 161 — Certified registry registration boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares how the Alert Capability may be
 * registered in a governed way. No registry writes, no discovery
 * engine, no resolver.
 */

export { RegistryRegistrationContract, REGISTRY_REGISTRATION_VERSION } from './RegistryRegistrationContract.js';
export { REGISTRY_COMPATIBILITY } from './RegistryCompatibility.js';
export { REGISTRY_BOUNDARY } from './RegistryBoundary.js';

export const ALERT_REGISTRY = Object.freeze({
  key: 'registry',
  name: 'Alert Registry Registration Boundary',
  registration: false,
});

export default ALERT_REGISTRY;
