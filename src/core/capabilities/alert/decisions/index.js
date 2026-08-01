/**
 * Alert Decisions
 *
 * Sprint 156 — Certified decision context boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares how a certified event becomes a
 * governed decision context. No decision engine, no rules, no
 * evaluators.
 */

export { DecisionContextContract, DECISION_CONTEXT_VERSION } from './DecisionContextContract.js';
export { DECISION_COMPATIBILITY } from './DecisionCompatibility.js';
export { DECISION_BOUNDARY } from './DecisionBoundary.js';

export const ALERT_DECISIONS = Object.freeze({
  key: 'decisions',
  name: 'Alert Decision Context Boundary',
  evaluation: false,
});

export default ALERT_DECISIONS;
