/**
 * PolicyEvaluationDecision
 *
 * Sprint 172 — Produces the policy evaluation readiness result.
 *
 * Pure decision logic based on validation results. Never executes
 * policies or triggers responses.
 */

export function decidePolicyEvaluation(validation) {
  if (!validation || validation.valid !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      evaluationAvailable: false,
      policyExecuted: false,
      responseTriggered: false,
      reasons: validation && validation.reasons ? validation.reasons : ['validation-failed'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: 'ready',
    evaluationAvailable: true,
    policyExecuted: false,
    responseTriggered: false,
    reasons: [],
  });
}

export default decidePolicyEvaluation;
