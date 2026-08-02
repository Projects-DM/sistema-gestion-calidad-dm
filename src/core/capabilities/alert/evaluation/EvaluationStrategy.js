/**
 * EvaluationStrategy
 *
 * Sprint 199 — THE official strategy interface of the Alert Evaluation Engine.
 *
 * Certified by Sprint 198.R5: the Engine NEVER contains a single algorithm.
 * It always works through strategies selected by metadata. Every strategy
 * implements EXACTLY the certified contract:
 *
 *   evaluate(descriptor, configuration, runtimeContext) → AlertEvaluation
 *
 * Strategies NEVER know Metadata, Dashboard, Runtime or the Resolver. They
 * only receive the certified contract.
 *
 * Interface ONLY. Never evaluates.
 */

import { STRATEGY_EVALUATE_SIGNATURE } from './AlertEvaluationContract.js';

/**
 * Base interface every Evaluation Strategy must implement.
 */
export class EvaluationStrategy {
  constructor({ key }) {
    this.key = key;
  }

  /**
   * Whether this strategy handles the given periodicity metadata.
   * Metadata-driven selection signal (Sprint 198.R5 §7). Must be implemented
   * by every concrete strategy.
   *
   * @param {Object|string|null} periodicity configuration.periodicity.
   * @returns {boolean}
   */
  selects() {
    return false;
  }

  /**
   * Evaluates a descriptor against its configuration using the transported
   * runtime context. Must be implemented by every concrete strategy.
   *
   * @param {Object} descriptor AlertRuleDescriptor (inmutable).
   * @param {Object} configuration AlertConfiguration Value Object (inmutable).
   * @param {Object} runtimeContext Transport context (inmutable).
   * @returns {Object} AlertEvaluation Value Object.
   */
  evaluate() {
    throw new Error('EvaluationStrategy: evaluate() debe ser implementado por la estrategia.');
  }
}

export const STRATEGY_CONTRACT = Object.freeze({
  contractKey: 'alert.evaluation.strategy',
  signature: STRATEGY_EVALUATE_SIGNATURE,
  never: Object.freeze([
    'reads metadata',
    'reads dashboard',
    'reads runtime',
    'implements more than one method',
  ]),
});

export default EvaluationStrategy;
