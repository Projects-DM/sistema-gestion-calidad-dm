/**
 * Alert Registry Runtime
 *
 * Sprint 168 — Controlled registry integration boundary.
 *
 * LEVEL 4 PHASE. Executes pure registration validation and decisions.
 * NO registry mutation, NO resolver changes, NO runtime exposure.
 */

export { ControlledRegistryService, requestRegistryRegistration } from './ControlledRegistryService.js';
export { validateRegistryRegistration, REGISTRY_VALIDATION } from './RegistryRegistrationValidator.js';
export { decideRegistryRegistration } from './RegistryDecision.js';
export { REGISTRY_RUNTIME_BOUNDARY } from './RegistryRuntimeBoundary.js';

export const ALERT_REGISTRY_RUNTIME = Object.freeze({
  key: 'registry-runtime',
  name: 'Alert Controlled Registry Runtime',
  registryMutation: false,
  runtimeExposure: false,
});

export default ALERT_REGISTRY_RUNTIME;
