/**
 * AlertTemporalState
 *
 * Sprint 199.R — THE temporal VALUE OBJECT of the Alert Evaluation Engine.
 *
 * Produced exclusively by the temporal dimension (the Strategy). It carries
 * ONLY the time computation of an alert rule:
 *
 *   baseDate, period, nextDue, remaining, elapsed, overdue
 *
 * It NEVER knows risk, priority, severity, status or the Dashboard. It is the
 * pure input of the business dimension (the Policy).
 *
 * Structural ONLY. No behavior, no interpretation.
 */

/**
 * The exact canonical field set of an Alert Temporal State.
 */
export const TEMPORAL_STATE_KEYS = Object.freeze([
  'baseDate',
  'period',
  'nextDue',
  'remaining',
  'elapsed',
  'overdue',
]);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

/**
 * Creates the canonical AlertTemporalState Value Object. Any extra property
 * is dropped — the result has exactly the 6 contract fields, deeply frozen.
 *
 * @param {Object} input Temporal computation from a strategy.
 * @returns {Object} Deeply frozen AlertTemporalState Value Object.
 */
export function createAlertTemporalState(input) {
  const source = input && typeof input === 'object' ? input : {};
  const value = {};
  for (const key of TEMPORAL_STATE_KEYS) value[key] = source[key];
  return deepFreeze(value);
}

/**
 * Structural guard: a valid Alert Temporal State is a frozen object holding
 * exactly the 6 contract fields.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isAlertTemporalState(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.isFrozen(value) &&
    TEMPORAL_STATE_KEYS.every((k) => k in value)
  );
}

/**
 * Contract assertion. Throws when the value is not a complete, immutable
 * Alert Temporal State.
 *
 * @param {*} value
 * @returns {Object} The value when valid.
 */
export function assertAlertTemporalState(value) {
  if (!isAlertTemporalState(value)) {
    throw new Error(
      'AlertTemporalState: debe ser un Value Object completo e inmutable (6 campos canónicos, Object.freeze).',
    );
  }
  return value;
}

export default createAlertTemporalState;
