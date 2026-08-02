/**
 * AlertEvaluationPolicy
 *
 * Sprint 199.R — THE official business policy interface of the Alert
 * Evaluation Engine.
 *
 * The Engine is decoupled in two dimensions:
 *
 *   Temporal dimension (Strategy):
 *     computes ONLY periods, dates and due instants → AlertTemporalState
 *
 *   Business dimension (Policy):
 *     interprets ONLY risk, priority, status, transition, escalation
 *     → AlertEvaluation
 *
 * The Policy NEVER computes dates. It receives the Temporal State (already
 * computed) plus the Configuration, and produces the evaluation result.
 *
 * Future policies (RegulatoryPolicy, SLAPolicy, EnterprisePolicy,
 * CustomerPolicy) will implement this same contract WITHOUT modifying the
 * Engine (Open/Closed).
 *
 * Interface ONLY. Never evaluates.
 */

import { STRATEGY_EVALUATE_SIGNATURE } from './AlertEvaluationContract.js';

export const POLICY_EVALUATE_SIGNATURE =
  'evaluate(temporalState, descriptor, configuration, runtimeContext)';

/**
 * Base interface every Evaluation Policy must implement.
 */
export class AlertEvaluationPolicy {
  constructor({ key }) {
    this.key = key;
  }

  /**
   * Whether this policy handles the given risk model metadata.
   * Metadata-driven selection signal (Sprint 198.R5 §7). Must be implemented
   * by every concrete policy.
   *
   * @param {string} riskModel configuration.risk.model.
   * @returns {boolean}
   */
  selects() {
    return false;
  }

  /**
   * Interprets an already-computed Temporal State into an AlertEvaluation.
   * Must be implemented by every concrete policy.
   *
   * @param {Object} temporalState AlertTemporalState (inmutable).
   * @param {Object} descriptor AlertRuleDescriptor (inmutable).
   * @param {Object} configuration AlertConfiguration Value Object (inmutable).
   * @param {Object} runtimeContext Transport context (inmutable).
   * @returns {Object} AlertEvaluation Value Object.
   */
  evaluate() {
    throw new Error('AlertEvaluationPolicy: evaluate() debe ser implementado por la política.');
  }
}

export const POLICY_CONTRACT = Object.freeze({
  contractKey: 'alert.evaluation.policy',
  signature: POLICY_EVALUATE_SIGNATURE,
  never: Object.freeze([
    'computes dates',
    'reads metadata',
    'reads dashboard',
    'reads runtime',
    'implements more than one method',
  ]),
});

export default AlertEvaluationPolicy;
