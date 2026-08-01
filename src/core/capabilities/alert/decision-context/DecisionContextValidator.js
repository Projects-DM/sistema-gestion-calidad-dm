/**
 * DecisionContextValidator
 *
 * Sprint 171 — Executes decision context validations ONLY.
 *
 * Pure, deterministic validation. Never evaluates rules or executes
 * decisions. Returns a validation result object.
 */

export const DECISION_CONTEXT_VALIDATION = Object.freeze({
  capabilityKey: 'alerts',
  checks: Object.freeze(['eventConsumptionApproved', 'contextValid', 'capabilityAvailable', 'decisionReady']),
});

export function validateDecisionContext(request) {
  const eventConsumptionApproved = !!request && request.eventConsumptionApproved === true;
  const contextValid = !!request && request.contextValid === true;
  const capabilityAvailable = !!request && request.capabilityAvailable === true;
  const decisionReady = !!request && request.decisionReady !== true;

  const checks = {
    eventConsumptionApproved,
    contextValid,
    capabilityAvailable,
    decisionReady,
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

export default validateDecisionContext;
