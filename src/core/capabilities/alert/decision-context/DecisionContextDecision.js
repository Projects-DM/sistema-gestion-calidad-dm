/**
 * DecisionContextDecision
 *
 * Sprint 171 — Produces the decision readiness result.
 *
 * Pure decision logic based on validation results. Never executes
 * decisions or triggers policies.
 */

export function decideDecisionContext(validation) {
  if (!validation || validation.valid !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      contextAvailable: false,
      decisionExecuted: false,
      policyTriggered: false,
      reasons: validation && validation.reasons ? validation.reasons : ['validation-failed'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decision: 'ready',
    contextAvailable: true,
    decisionExecuted: false,
    policyTriggered: false,
    reasons: [],
  });
}

export default decideDecisionContext;
