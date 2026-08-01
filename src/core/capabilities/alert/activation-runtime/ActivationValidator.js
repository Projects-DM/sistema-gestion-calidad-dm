/**
 * ActivationValidator
 *
 * Sprint 167 — Executes activation validations ONLY.
 *
 * Pure, deterministic validation. Never mutates runtime, registry or
 * events. Returns a validation result object.
 */

export const ACTIVATION_VALIDATION = Object.freeze({
  capabilityKey: 'alerts',
  checks: Object.freeze(['capabilityExists', 'contractCompatible', 'governanceApproved', 'activationAllowed']),
});

export function validateActivation(request) {
  const capabilityExists = !!request && request.capabilityKey === 'alerts';
  const contractCompatible = !!request && request.contractVersion === '1';
  const governanceApproved = !!request && !!request.governanceContext && request.governanceContext.approved === true;
  const activationAllowed = !!request && request.activated !== true;

  const checks = {
    capabilityExists,
    contractCompatible,
    governanceApproved,
    activationAllowed,
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

export default validateActivation;
