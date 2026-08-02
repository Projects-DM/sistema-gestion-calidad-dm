/**
 * AlertEvaluationEngine
 *
 * Sprint 199 — THE official evaluation engine of the Alert Capability.
 *
 * Responsibilities:
 *   - receive descriptor
 *   - resolve Strategy (via EvaluationStrategyResolver)
 *   - execute Strategy
 *   - return AlertEvaluation
 *
 * The Engine NEVER computes directly. It NEVER decides via configuration
 * branching (periodicity/expiration/type based decisions) — every decision
 * occurs THROUGH a Strategy (Open/Closed, Sprint 198.R5).
 *
 * The Engine NEVER modifies the descriptor: it returns
 *   { descriptor, evaluation }
 * where `evaluation` is a new, independent Value Object.
 *
 * Execution ONLY via strategies. Never executes, notifies or persists.
 */

import { resolveEvaluationStrategy } from './EvaluationStrategyResolver.js';
import { assertAlertEvaluation } from './AlertEvaluation.js';

/**
 * Evaluates a descriptor through the strategy selected by its metadata.
 *
 * @param {Object} descriptor AlertRuleDescriptor (inmutable).
 * @param {Object} configuration AlertConfiguration Value Object (inmutable).
 * @param {Object} runtimeContext Transport context (inmutable).
 * @returns {Object} { descriptor, evaluation }
 */
export function evaluateAlert(descriptor, configuration, runtimeContext) {
  const strategy = resolveEvaluationStrategy(configuration);
  const evaluation = strategy.evaluate(descriptor, configuration, runtimeContext);
  assertAlertEvaluation(evaluation);
  return Object.freeze({
    descriptor,
    evaluation,
  });
}

/**
 * Evaluates every rule of a descriptor list through the strategy selected by
 * each rule's configuration.
 *
 * The descriptor is NEVER modified; only evaluations are produced.
 *
 * @param {Object} configurationDescriptor { alerts: [...] } o lista de reglas.
 * @param {Function} [resolveConfig] (rule) → AlertConfiguration (inmutable).
 * @param {Object} runtimeContext Transport context (inmutable).
 * @returns {Object} { descriptor, evaluations: AlertEvaluation[] }
 */
export function evaluateAlertSet(configurationDescriptor, resolveConfig, runtimeContext) {
  const rules = Array.isArray(configurationDescriptor)
    ? configurationDescriptor
    : (configurationDescriptor?.alerts ?? []);
  const configResolver = typeof resolveConfig === 'function' ? resolveConfig : () => null;

  const evaluations = rules.map((rule) => {
    const configuration = configResolver(rule);
    const evaluation = evaluateAlert(rule, configuration, runtimeContext).evaluation;
    return evaluation;
  });

  return Object.freeze({
    descriptor: configurationDescriptor,
    evaluations,
  });
}

export const ALERT_EVALUATION_ENGINE = Object.freeze({
  contractKey: 'alert.evaluation.engine',
  version: 1,
  capabilityKey: 'alerts',
  delegation: 'EvaluationStrategyResolver → Strategy → AlertEvaluation',
  openClosed: true,
  never: Object.freeze([
    'contains a single algorithm',
    'decides via configuration branching',
    'modifies the descriptor',
    'reads metadata keys',
    'notifies',
  ]),
});

export default evaluateAlert;
