/**
 * PolicyEvaluationContract
 *
 * Sprint 172 — Declares the controlled policy evaluation boundary of
 * the Alert Capability.
 *
 * Evaluation preparation declaration ONLY. Evaluates nothing.
 */

export const POLICY_EVALUATION_VERSION = '1';

export const PolicyEvaluationContract = Object.freeze({
  contractKey: 'alert.policy-evaluation',
  name: 'Policy Evaluation Contract',
  version: POLICY_EVALUATION_VERSION,
  capabilityKey: 'alerts',
  evaluationMode: 'controlled',
  policyExecution: false,
  responseExecution: false,
  automationEnabled: false,
  representation: Object.freeze({
    policyEvaluationIdentity: Object.freeze({ type: 'string', required: true, description: 'Policy evaluation identity' }),
    capabilityReference: Object.freeze({ type: 'string', required: true, description: 'Capability key reference' }),
    decisionContextReference: Object.freeze({ type: 'string', required: true, description: 'Decision context reference' }),
    evaluationRequirements: Object.freeze({ type: 'array', required: true, description: 'Certified evaluation constraints' }),
  }),
});

export default PolicyEvaluationContract;
