/**
 * RegistryRegistrationValidator
 *
 * Sprint 168 — Executes registry registration validations ONLY.
 *
 * Pure, deterministic validation. Never mutates the registry or the
 * resolver. Returns a validation result object.
 */

export const REGISTRY_VALIDATION = Object.freeze({
  capabilityKey: 'alerts',
  checks: Object.freeze(['identityValid', 'registryContractCompatible', 'activationApproved', 'registrationAllowed']),
});

export function validateRegistryRegistration(request) {
  const identityValid = !!request && request.capabilityKey === 'alerts';
  const registryContractCompatible = !!request && request.registryContractVersion === '1';
  const activationApproved = !!request && request.activationDecision === 'approved';
  const registrationAllowed = !!request && request.registered !== true;

  const checks = {
    identityValid,
    registryContractCompatible,
    activationApproved,
    registrationAllowed,
  };

  return Object.freeze({
    capabilityKey: 'alerts',
    valid: Object.values(checks).every(Boolean),
    checks,
    reasons: Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([name]) => name),
  });
}

export default validateRegistryRegistration;
