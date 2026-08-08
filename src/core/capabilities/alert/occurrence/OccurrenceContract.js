/**
 * AlertOccurrence
 *
 * Sprint 257 — ALERT OCCURRENCE CONTRACT (VALUE OBJECT).
 *
 * The occurrence is the TEMPORAL INSTANCE of an alert configuration for a
 * concrete period. It is NEVER a second configuration: it derives from the
 * AlertConfiguration (SSOT, Sprint 197) through the certified schedule.
 *
 * DEC-256-01..03: alertId !== occurrenceId. One AlertConfiguration produces
 * N AlertOccurrences (OCC-001…OCC-N). An occurrence NEVER creates a new
 * AlertConfiguration.
 *
 * Structural ONLY. No behavior. The lifecycle/classification logic lives in
 * OccurrenceLifecycle; completion in CompletionSignal; the state runtime in
 * OccurrenceLedger. Nothing here computes, evaluates, notifies or persists.
 */

export const OCCURRENCE_CONTRACT_KEYS = Object.freeze([
  'occurrenceId',
  'alertId',
  'resourceKind',
  'resourceId',
  'moduleId',
  'startsAt',
  'dueAt',
  'timezone',
  'sequence',
  'status',
  'completion',
  'createdAt',
]);

/**
 * Deterministic occurrence identity. `alertId` is the configuration identity;
 * `occurrenceId` is the temporal instance identity. The `:occ:<seq>` suffix
 * guarantees they can never collide (DEC-256-03).
 */
export function occurrenceIdOf(alertId, sequence) {
  return `${String(alertId)}:occ:${String(sequence)}`;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

/**
 * Creates the canonical AlertOccurrence Value Object. Extra keys are dropped;
 * the result holds exactly the contract fields, deeply frozen.
 *
 * `completion` is a nullable structure { status: 'COMPLETED'|'CANCELLED',
 * completedAt, signal } owned by the Completion contract, never by config.
 */
export function createAlertOccurrence(input) {
  const source = input && typeof input === 'object' ? input : {};
  const value = {};
  for (const key of OCCURRENCE_CONTRACT_KEYS) value[key] = source[key];
  value.status = source.status ?? 'pending';
  value.completion = source.completion ?? null;
  return deepFreeze(value);
}

/**
 * Structural guard. An occurrence is valid when frozen, complete and
 * `occurrenceId !== alertId`.
 */
export function isAlertOccurrence(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.isFrozen(value) &&
    OCCURRENCE_CONTRACT_KEYS.every((k) => k in value) &&
    value.occurrenceId !== value.alertId
  );
}

/**
 * Contract assertion. Throws when the value is not a valid occurrence.
 */
export function assertAlertOccurrence(value) {
  if (!isAlertOccurrence(value)) {
    throw new Error(
      'AlertOccurrence: debe ser un Value Object completo e inmutable (12 campos, freeze, occurrenceId !== alertId).',
    );
  }
  return value;
}

export default createAlertOccurrence;