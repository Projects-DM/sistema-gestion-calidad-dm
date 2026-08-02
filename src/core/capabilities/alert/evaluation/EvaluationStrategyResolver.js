/**
 * EvaluationStrategyResolver
 *
 * Sprint 199 — Selects the correct Evaluation Strategy from metadata.
 *
 * Certified Sprint 198.R5: selection is METADATA-DRIVEN. It never reads
 * modules, names, slugs, special forms or repositories.
 *
 * Today only ONE strategy family is implemented (Periodic). It is the ONLY
 * strategy this resolver can return. Future strategies will register here
 * WITHOUT ever modifying the Engine (Open/Closed).
 *
 * The resolver does NOT know the Dashboard, the Runtime or the Metadata
 * internals — it only inspects the configuration Value Object.
 *
 * Resolution ONLY. Never evaluates.
 */

import { PeriodicEvaluationStrategy } from './PeriodicEvaluationStrategy.js';

const IMPLEMENTED_STRATEGIES = Object.freeze([
  new PeriodicEvaluationStrategy(),
]);

/**
 * Selects the strategy for a configuration.
 *
 * Selection is metadata-driven: the periodicity model is the ONLY signal.
 * When no metadata signal matches, the default (Periodic) is returned.
 *
 * @param {Object} configuration AlertConfiguration Value Object (inmutable).
 * @returns {Object} EvaluationStrategy.
 */
export function resolveEvaluationStrategy(configuration) {
  const periodicity = configuration?.periodicity ?? null;
  const matches = IMPLEMENTED_STRATEGIES.filter((s) => s.selects && s.selects(periodicity));
  if (matches.length > 0) return matches[0];
  return IMPLEMENTED_STRATEGIES[0];
}

export const EVALUATION_STRATEGY_RESOLVER = Object.freeze({
  contractKey: 'alert.evaluation.strategy-resolver',
  version: 1,
  capabilityKey: 'alerts',
  implemented: IMPLEMENTED_STRATEGIES.map((s) => s.key),
  selection: 'metadata-driven',
});

export default resolveEvaluationStrategy;
