/**
 * PolicyEvaluationContract
 *
 * Sprint 157 — Declares the policy evaluation boundary of the
 * Alert Capability.
 *
 * Sources from a governed decision context. Evaluates nothing.
 * Executes nothing.
 */

export const POLICY_EVALUATION_VERSION = '1';

export const PolicyEvaluationContract = Object.freeze({
  contractKey: 'alert.policy-evaluation',
  name: 'Policy Evaluation Contract',
  version: POLICY_EVALUATION_VERSION,
  source: 'decision-context',
  evaluation: false,
  execution: false,
  representation: Object.freeze({
    policyIdentity: Object.freeze({ type: 'string', required: true, description: 'Policy identity' }),
    policyVersion: Object.freeze({ type: 'string', required: true, description: 'Policy version' }),
    decisionContextReference: Object.freeze({ type: 'string', required: true, description: 'Governed decision context' }),
    evaluationRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified evaluation constraints' }),
  }),
  boundaries: Object.freeze({
    neverConsumes: Object.freeze([
      'Internal rules',
      'Runtime state',
      'Database structures',
    ]),
    neverExecutes: Object.freeze([
      'Policy evaluation',
      'Severity calculation',
      'Alert generation',
    ]),
  }),
});

export default PolicyEvaluationContract;
