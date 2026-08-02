/**
 * AlertEvaluation
 *
 * Sprint 199 — THE Alert Evaluation VALUE OBJECT.
 *
 * The official result of the Alert Evaluation Engine. A Value Object is
 * immutable, deeply frozen and structurally equal to any other instance
 * holding the same field values.
 *
 * It is completely independent of the descriptor: it NEVER references the
 * Runtime, the Metadata, the Resolver or any resource. It carries EXACTLY the
 * EVALUATION_KEYS (Sprint 199 §4.1).
 *
 * Structural ONLY. No behavior, no interpretation, no notification.
 */

import { EVALUATION_KEYS } from './AlertEvaluationContract.js';

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

/**
 * Creates the canonical AlertEvaluation Value Object. Any extra property is
 * dropped — the result has exactly the contract fields, deeply frozen.
 *
 * @param {Object} input Computed evaluation state from a strategy.
 * @returns {Object} Deeply frozen AlertEvaluation Value Object.
 */
export function createAlertEvaluation(input) {
  const source = input && typeof input === 'object' ? input : {};
  const value = {};
  for (const key of EVALUATION_KEYS) value[key] = source[key];
  return deepFreeze(value);
}

/**
 * Structural guard: a valid Alert Evaluation is a frozen object holding
 * exactly the contract fields.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isAlertEvaluation(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.isFrozen(value) &&
    EVALUATION_KEYS.every((k) => k in value)
  );
}

/**
 * Contract assertion. Throws when the value is not a complete, immutable
 * Alert Evaluation.
 *
 * @param {*} value
 * @returns {Object} The value when valid.
 */
export function assertAlertEvaluation(value) {
  if (!isAlertEvaluation(value)) {
    throw new Error(
      'AlertEvaluation: debe ser un Value Object completo e inmutable (9 campos canónicos, Object.freeze).',
    );
  }
  return value;
}

export default createAlertEvaluation;
