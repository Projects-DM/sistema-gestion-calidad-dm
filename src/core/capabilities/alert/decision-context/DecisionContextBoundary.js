/**
 * DecisionContextBoundary
 *
 * Sprint 171 — Protects the decision architecture from context-driven
 * automatic decisions.
 *
 * Path: Event Context → Decision Architecture → Future Decision
 * Engine. Context creation NEVER triggers an automatic decision.
 */

export const DECISION_CONTEXT_BOUNDARY = Object.freeze({
  key: 'decision-context-boundary',
  name: 'Alert Decision Context Boundary',
  protectedPath: Object.freeze([
    'Event Context',
    'Decision Architecture',
    'Future Decision Engine',
  ]),
  forbiddenPath: Object.freeze([
    'Context Creation',
    'Automatic Decision',
  ]),
});

export default DECISION_CONTEXT_BOUNDARY;
