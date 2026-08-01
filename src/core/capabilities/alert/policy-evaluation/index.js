/**
 * Alert Policy Evaluation
 *
 * Sprint 172 — Controlled policy evaluation boundary.
 *
 * LEVEL 4 PHASE. Maps and validates policy evaluation contexts. NO
 * policy execution, NO rule evaluation, NO response trigger.
 */

import { validatePolicyEvaluation } from './PolicyEvaluationValidator.js';
import { decidePolicyEvaluation } from './PolicyEvaluationDecision.js';

export { PolicyEvaluationContract, POLICY_EVALUATION_VERSION } from './PolicyEvaluationContract.js';
export { buildPolicyContext } from './PolicyContextBuilder.js';
export { validatePolicyEvaluation, POLICY_EVALUATION_VALIDATION } from './PolicyEvaluationValidator.js';
export { decidePolicyEvaluation } from './PolicyEvaluationDecision.js';
export { POLICY_EVALUATION_BOUNDARY } from './PolicyEvaluationBoundary.js';

export function requestPolicyEvaluation(request) {
  if (!request) {
    return Object.freeze({
      capabilityKey: 'alerts',
      decision: 'rejected',
      evaluationAvailable: false,
      policyExecuted: false,
      responseTriggered: false,
      reasons: ['missing-policy-context'],
    });
  }

  const validation = validatePolicyEvaluation(request);
  const decision = decidePolicyEvaluation(validation);

  return Object.freeze({
    ...decision,
    validation,
  });
}

export const ALERT_POLICY_EVALUATION = Object.freeze({
  key: 'policy-evaluation',
  name: 'Alert Controlled Policy Evaluation',
  execution: false,
});

export default ALERT_POLICY_EVALUATION;
