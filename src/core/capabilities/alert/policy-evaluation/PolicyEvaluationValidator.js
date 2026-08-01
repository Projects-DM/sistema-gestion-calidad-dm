/**
 * PolicyEvaluationValidator
 *
 * Sprint 172 — Executes policy evaluation validations ONLY.
 *
 * Pure, deterministic validation. Never evaluates policies or rules.
 * Returns a validation result object.
 */

export const POLICY_EVALUATION_VALIDATION = Object.freeze({
  capabilityKey: 'alerts',
  checks: Object.freeze(['decisionContextAvailable', 'policyCompatible', 'capabilityAvailable', 'evaluationReady']),
});

export function validatePolicyEvaluation(request) {
  const decisionContextAvailable = !!request && request.decisionContextAvailable === true;
  const policyCompatible = !!request && request.policyContractVersion === '1';
  const capabilityAvailable = !!request && request.capabilityAvailable === true;
  const evaluationReady = !!request && request.evaluationReady !== true;

  const checks = {
    decisionContextAvailable,
    policyCompatible,
    capabilityAvailable,
    evaluationReady,
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

export default validatePolicyEvaluation;
