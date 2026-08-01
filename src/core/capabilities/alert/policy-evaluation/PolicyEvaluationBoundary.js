/**
 * PolicyEvaluationBoundary
 *
 * Sprint 172 — Protects the policy layer from context-driven
 * automatic policy execution.
 *
 * Path: Decision Context → Policy Layer → Future Policy Engine.
 * Policy context NEVER triggers automatic policy execution.
 */

export const POLICY_EVALUATION_BOUNDARY = Object.freeze({
  key: 'policy-evaluation-boundary',
  name: 'Alert Policy Evaluation Boundary',
  protectedPath: Object.freeze([
    'Decision Context',
    'Policy Layer',
    'Future Policy Engine',
  ]),
  forbiddenPath: Object.freeze([
    'Policy Context',
    'Automatic Policy Execution',
  ]),
});

export default POLICY_EVALUATION_BOUNDARY;
