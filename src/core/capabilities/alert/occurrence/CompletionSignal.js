/**
 * CompletionSignal
 *
 * Sprint 257 — THE completion contract (OCC-CERT-10..12, Gates D/E).
 * Sprint 280 — F5. Identity-aware extension (Sprint 268/279).
 *
 * A Completion Signal is a GENERIC OPERATIONAL event (not an alert concept):
 *   { resourceKind, resourceId, moduleId, completedAt }
 *
 * Sprint 280 adds the multi-entry identity contract:
 *   { origin: 'alert'|'resource', alertId?, occurrenceId?, completedAt }
 *
 * - `origin='alert'` → the signal CARRIES explicit alert identity
 *   (`alertId` + `occurrenceId`). Matching REQUIRES exact equality with the
 *   occurrence — there is NO temporal fallback for an explicit identity
 *   (Sprint 279 §5). Invalid explicit identity (missing alertId/occurrenceId)
 *   is REJECTED, never guessed.
 * - `origin='resource'` / legacy signals → window-aware resource matching
 *   (Sprint 257), used as compatibility fallback ONLY.
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

export const COMPLETION_ORIGIN = Object.freeze({
  alert: 'alert',
  resource: 'resource',
});

/**
 * Builds the completion signal. Pure. Identity fields are required ONLY when
 * `origin === 'alert'` (otherwise the explicit identity is invalid and the
 * signal must be rejected by the consumer — never silently resolved).
 */
export function createCompletionSignal({
  resourceKind,
  resourceId,
  moduleId,
  completedAt,
  status = COMPLETION_STATUS.completed,
  origin = COMPLETION_ORIGIN.resource,
  alertId = null,
  occurrenceId = null,
}) {
  const timeMs = Number.isFinite(completedAt)
    ? completedAt
    : (typeof completedAt === 'number' ? completedAt : new Date(completedAt || Date.now()).getTime());
  return Object.freeze({
    resourceKind: resourceKind ?? null,
    resourceId: resourceId ?? null,
    moduleId: moduleId ?? null,
    origin: origin ?? COMPLETION_ORIGIN.resource,
    alertId: alertId ?? null,
    occurrenceId: occurrenceId ?? null,
    status,
    completedAt: Number.isFinite(timeMs) ? timeMs : Date.now(),
  });
}

/**
 * True when the signal carries a valid EXPLICIT alert identity
 * (origin='alert' with both alertId and occurrenceId).
 */
export function hasExplicitOccurrenceIdentity(signal) {
  return !!(
    signal &&
    signal.origin === COMPLETION_ORIGIN.alert &&
    signal.alertId != null &&
    signal.occurrenceId != null
  );
}

/**
 * True when the signal references an occurrence IDENTITY (both alertId and
 * occurrenceId present), regardless of origin. Used by the ledger so a
 * deterministically-resolved `origin='resource'` signal ALSO records THE exact
 * occurrence (F8 isolation) — never the legacy resource-scoped key.
 */
export function hasOccurrenceIdentity(signal) {
  return !!(signal && signal.alertId != null && signal.occurrenceId != null);
}

/**
 * Identity-aware matching (Sprint 280), ORIGIN-AGNOSTIC. Used by the ledger for
 * the specific path: the signal must reference the EXACT occurrence.
 */
export function matchExplicitOccurrence(occurrence, signal) {
  if (!occurrence || !signal || !hasOccurrenceIdentity(signal)) return false;
  return (
    String(occurrence.alertId ?? '') === String(signal.alertId ?? '') &&
    String(occurrence.occurrenceId ?? '') === String(signal.occurrenceId ?? '')
  );
}

/**
 * Window-aware matching. `moduleId` is matched ONLY when both sides provide one.
 * Used by the LEGACY / resource-scoped path (Sprint 257 compatibility).
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