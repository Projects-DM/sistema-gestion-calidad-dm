/**
 * CompletionSignal
 *
 * Sprint 257 — THE completion contract (OCC-CERT-10..12, Gates D/E).
 *
 * A Completion Signal is a GENERIC OPERATIONAL event (not an alert concept):
 *   { resourceKind, resourceId, moduleId, completedAt }
 *
 * DEC-256-06: RECORD_CREATED must NEVER be used as completion. Completion
 * originates ONLY from a semantically-final operational signal (finalizado /
 * completado / approved / closed on the RESOURCE side).
 *
 * Matching (OCC-CERT-12): an occurrence is satisfied when a completion
 * signal matches resourceKind + resourceId (+ moduleId when available) AND
 * completedAt falls inside the occurrence temporal window [startsAt, dueAt).
 * "Existe un registro" is NOT a completion criterion.
 *
 * Idempotency (Gate J/C, OCC-CERT-13): applying the same completion twice
 * yields ONE transition — the ledger marks the occurrence once.
 */
import { occurrenceIdOf } from './OccurrenceContract.js';

export const COMPLETION_STATUS = Object.freeze({
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
});

/**
 * Builds the generic completion signal. Pure. Does NOT contain alert logic.
 */
export function createCompletionSignal({ resourceKind, resourceId, moduleId, completedAt, status = COMPLETION_STATUS.completed }) {
  const timeMs = Number.isFinite(completedAt)
    ? completedAt
    : (typeof completedAt === 'number' ? completedAt : new Date(completedAt || Date.now()).getTime());
  return Object.freeze({
    resourceKind: resourceKind ?? null,
    resourceId: resourceId ?? null,
    moduleId: moduleId ?? null,
    status,
    completedAt: Number.isFinite(timeMs) ? timeMs : Date.now(),
  });
}

/**
 * Window-aware matching. `moduleId` is matched ONLY when both sides provide one.
 */
export function matchCompletionToOccurrence(occurrence, signal) {
  if (!occurrence || !signal) return false;
  if (occurrence.resourceKind !== signal.resourceKind) return false;
  if (String(occurrence.resourceId ?? '') !== String(signal.resourceId ?? '')) return false;
  if (occurrence.moduleId && signal.moduleId && String(occurrence.moduleId) !== String(signal.moduleId)) return false;

  const startsAt = occurrence.startsAt ?? null;
  const dueAt = occurrence.dueAt ?? null;
  if (startsAt === null) return false;
  if (dueAt !== null && dueAt <= signal.completedAt) return false;
  if (signal.completedAt < startsAt) return false;
  return true;
}

/**
 * Applies a completion to an occurrence (returns a NEW frozen occurrence with
 * `completion` set). The transition is idempotent by construction: the LEDGER
 * records it once; this helper never produces a duplicate completion object.
 */
export function applyCompletionToOccurrence({ occurrence, completion }) {
  const base = { ...occurrence };
  base.completion = completion && completion.status
    ? Object.freeze({
        status: completion.status,
        completedAt: completion.completedAt,
        signalKey: completion.signalKey ?? null,
      })
    : null;
  return Object.freeze(base);
}

/**
 * Deterministic ledger key for the occurrence (occurrenceId when available).
 */
export function occurrenceCompletionKey(occurrence) {
  return occurrence?.occurrenceId
    ?? occurrenceIdOf(occurrence?.alertId, occurrence?.sequence ?? 1);
}