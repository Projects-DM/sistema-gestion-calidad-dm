/**
 * ResponsePreparationValidator
 *
 * Sprint 173 — Executes response preparation validations ONLY.
 *
 * Pure, deterministic validation. Never executes responses or
 * sends notifications.
 */

export const RESPONSE_PREPARATION_VALIDATION = Object.freeze({
  capabilityKey: 'alerts',
  checks: Object.freeze(['policyResultAvailable', 'responseCompatible', 'capabilityAvailable', 'responseReady']),
});

export function validateResponsePreparation(request) {
  const policyResultAvailable = !!request && request.policyResultAvailable === true;
  const responseCompatible = !!request && request.responseContractVersion === '1';
  const capabilityAvailable = !!request && request.capabilityAvailable === true;
  const responseReady = !!request && request.responseReady !== true;

  const checks = {
    policyResultAvailable,
    responseCompatible,
    capabilityAvailable,
    responseReady,
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

export default validateResponsePreparation;
