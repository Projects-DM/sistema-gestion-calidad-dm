/**
 * PolicyContextBuilder
 *
 * Sprint 172 — Maps a decision context into a policy evaluation
 * context.
 *
 * Maps and structures ONLY. Never matches policies, evaluates rules
 * or changes decisions.
 */

export function buildPolicyContext(context) {
  if (!context || context.readyForDecision !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decisionContext: context ? context.eventReference : null,
      policyContext: {},
      readyForEvaluation: false,
      policyExecuted: false,
      reasons: ['invalid-context'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    decisionContext: context.eventReference ? context.eventReference : null,
    policyContext: Object.freeze(context.contextData ? { ...context.contextData } : {}),
    readyForEvaluation: true,
    policyExecuted: false,
    reasons: [],
  });
}

export default buildPolicyContext;
