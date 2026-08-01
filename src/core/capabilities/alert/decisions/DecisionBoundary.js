/**
 * DecisionBoundary
 *
 * Sprint 156 — Protects the decision context from premature
 * evaluation and from internal rule leakage.
 *
 * Path: Event Context → Decision Contract → Future Evaluation Layer.
 * Context NEVER triggers rule execution.
 */

export const DECISION_BOUNDARY = Object.freeze({
  key: 'decision-boundary',
  name: 'Alert Decision Boundary',
  protectedPath: Object.freeze([
    'Event Context',
    'Decision Contract',
    'Future Evaluation Layer',
  ]),
  forbiddenPath: Object.freeze([
    'Context',
    'Rule Execution',
  ]),
});

export default DECISION_BOUNDARY;
