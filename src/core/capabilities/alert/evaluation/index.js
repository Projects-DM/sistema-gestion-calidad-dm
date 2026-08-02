/**
 * Alert Evaluation Layer
 *
 * Sprint 199 — THE official evaluation layer of the Alert Capability.
 * Sprint 199.R — decoupled in TWO dimensions:
 *
 *   Temporal dimension (Strategy):  period/date/due computation
 *                                   → AlertTemporalState
 *   Business dimension (Policy):    risk/priority/status/transition/escalation
 *                                   → AlertEvaluation
 *
 * This is the ONLY entry point for producing operational alert state.
 * The Runtime never produces state; the Dashboard never interprets rules.
 *
 * Layer ONLY. Never executes, notifies or persists.
 */

export { AlertEvaluationContract, EVALUATION_KEYS } from './AlertEvaluationContract.js';
export { createAlertEvaluation, isAlertEvaluation, assertAlertEvaluation } from './AlertEvaluation.js';
export { createAlertTemporalState, isAlertTemporalState, assertAlertTemporalState, TEMPORAL_STATE_KEYS } from './AlertTemporalState.js';
export { EvaluationStrategy, STRATEGY_CONTRACT } from './EvaluationStrategy.js';
export { AlertEvaluationPolicy, POLICY_CONTRACT } from './AlertEvaluationPolicy.js';
export { PeriodicEvaluationStrategy, PERIODIC_STRATEGY_KEY, PeriodicEvaluationStrategyContract } from './PeriodicEvaluationStrategy.js';
export { RelativeRiskPolicy, RELATIVE_RISK_POLICY_KEY, RelativeRiskPolicyContract } from './RelativeRiskPolicy.js';
export { resolveEvaluationStrategy, EVALUATION_STRATEGY_RESOLVER } from './EvaluationStrategyResolver.js';
export { resolveEvaluationPolicy, EVALUATION_POLICY_RESOLVER } from './AlertEvaluationPolicyResolver.js';
export { evaluateAlert, evaluateAlertSet, ALERT_EVALUATION_ENGINE } from './AlertEvaluationEngine.js';

export const EVALUATION_BOUNDARY = Object.freeze({
  contractKey: 'alert.evaluation.boundary',
  version: 2,
  capabilityKey: 'alerts',
  dimensions: Object.freeze([
    'temporal → Strategy → AlertTemporalState',
    'business → Policy → AlertEvaluation',
  ]),
  output: Object.freeze({
    descriptor: 'nunca modificado',
    evaluation: 'nuevo Value Object inmutable',
  }),
  dependencies: Object.freeze([
    'evaluation/AlertEvaluationContract',
    'evaluation/AlertEvaluation',
    'evaluation/AlertTemporalState',
    'evaluation/EvaluationStrategy',
    'evaluation/AlertEvaluationPolicy',
    'evaluation/PeriodicEvaluationStrategy',
    'evaluation/RelativeRiskPolicy',
    'evaluation/EvaluationStrategyResolver',
    'evaluation/AlertEvaluationPolicyResolver',
    'evaluation/AlertEvaluationEngine',
  ]),
  never: Object.freeze([
    'modifica el descriptor',
    'lee metadata',
    'notifica',
  ]),
});
