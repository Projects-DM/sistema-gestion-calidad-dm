/**
 * PolicyBoundary
 *
 * Sprint 157 — Protects the policy evaluation path from hidden
 * execution and internal rule leakage.
 *
 * Path: Decision Context → Policy Contract → Future Evaluation Layer.
 * Decision context NEVER reaches internal rules directly.
 */

export const POLICY_BOUNDARY = Object.freeze({
  key: 'policy-boundary',
  name: 'Alert Policy Boundary',
  protectedPath: Object.freeze([
    'Decision Context',
    'Policy Contract',
    'Future Evaluation Layer',
  ]),
  forbiddenPath: Object.freeze([
    'Decision Context',
    'Internal Rules',
    'Hidden Execution',
  ]),
});

export default POLICY_BOUNDARY;
