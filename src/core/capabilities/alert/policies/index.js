/**
 * Alert Policies
 *
 * Sprint 157 — Certified policy evaluation boundary.
 *
 * CERTIFIED STRUCTURE ONLY. Declares how a governed decision context
 * reaches policy evaluation. No policy engine, no rules, no severity.
 */

export { PolicyEvaluationContract, POLICY_EVALUATION_VERSION } from './PolicyEvaluationContract.js';
export { POLICY_COMPATIBILITY } from './PolicyCompatibility.js';
export { POLICY_BOUNDARY } from './PolicyBoundary.js';

export const ALERT_POLICIES = Object.freeze({
  key: 'policies',
  name: 'Alert Policy Evaluation Boundary',
  evaluation: false,
});

export default ALERT_POLICIES;
