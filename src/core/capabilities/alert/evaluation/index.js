/**
 * Alert Evaluation Layer
 *
 * Sprint 199 — THE official evaluation layer of the Alert Capability.
 *
 * This is the ONLY entry point for producing operational alert state.
 * The Runtime never produces state; the Dashboard never interprets rules.
 *
 * Exposes: the engine, the strategy contract, the strategy resolver, the
 * first implemented strategy (Periodic), the AlertEvaluation Value Object
 * and the AlertEvaluationContract.
 *
 * Layer ONLY. Never executes, notifies or persists.
 */

export { AlertEvaluationContract, EVALUATION_KEYS } from './AlertEvaluationContract.js';
export { createAlertEvaluation, isAlertEvaluation, assertAlertEvaluation } from './AlertEvaluation.js';
export { EvaluationStrategy, STRATEGY_CONTRACT } from './EvaluationStrategy.js';
export { PeriodicEvaluationStrategy, PERIODIC_STRATEGY_KEY, PeriodicEvaluationStrategyContract } from './PeriodicEvaluationStrategy.js';
export { resolveEvaluationStrategy, EVALUATION_STRATEGY_RESOLVER } from './EvaluationStrategyResolver.js';
export { evaluateAlert, evaluateAlertSet, ALERT_EVALUATION_ENGINE } from './AlertEvaluationEngine.js';

export const EVALUATION_BOUNDARY = Object.freeze({
  contractKey: 'alert.evaluation.boundary',
  version: 1,
  capabilityKey: 'alerts',
  output: Object.freeze({
    descriptor: 'nunca modificado',
    evaluation: 'nuevo Value Object inmutable',
  }),
  dependencies: Object.freeze([
    'evaluation/AlertEvaluationContract',
    'evaluation/AlertEvaluation',
    'evaluation/EvaluationStrategy',
    'evaluation/PeriodicEvaluationStrategy',
    'evaluation/EvaluationStrategyResolver',
    'evaluation/AlertEvaluationEngine',
  ]),
  never: Object.freeze([
    'modifica el descriptor',
    'lee metadata',
    'notifica',
  ]),
});
