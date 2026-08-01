/**
 * DecisionContextBuilder
 *
 * Sprint 171 — Constructs a governed decision context from a
 * consumed event.
 *
 * Maps and structures ONLY. Never evaluates rules, thresholds or
 * decisions.
 */

export function buildDecisionContext(event) {
  if (!event || event.compatible !== true) {
    return Object.freeze({
      capabilityKey: 'alerts',
      eventReference: event && event.reference ? event.reference : null,
      contextData: {},
      readyForDecision: false,
      decisionExecuted: false,
      reasons: ['event-not-consumed'],
    });
  }

  return Object.freeze({
    capabilityKey: 'alerts',
    eventReference: event.reference ? event.reference : null,
    contextData: Object.freeze(event.data ? { ...event.data } : {}),
    readyForDecision: true,
    decisionExecuted: false,
    reasons: [],
  });
}

export default buildDecisionContext;
