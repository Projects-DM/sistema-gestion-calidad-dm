/**
 * OccurrenceLifecycle
 *
 * Sprint 257 — Occurrence lifecycle + classification (DEC-256-04/05,
 * OCC-CERT-07/08).
 *
 * Persisted states:   COMPLETED · CANCELLED (optional)
 * Derived states:     PENDING · TODAY · UPCOMING · ACTIVE · OVERDUE
 *
 * COMPLETED has ABSOLUTE precedence: a completed occurrence is NEVER derived
 * as OVERDUE again (the Sprint 255 bug). Derived states are computed from
 * (startsAt, dueAt, completion, now) and are NEVER persisted (Gate F).
 *
 * Pure derivation ONLY. This module does not build occurrences, does not
 * evaluate risk, does not mutate any state.
 */

/** Persisted (non-derived) occurrence states. */
export const PERSISTENT_OCCURRENCE_STATES = Object.freeze([
  'COMPLETED',
  'CANCELLED',
]);

/** Derived (never persisted) occurrence states. These map onto the
 *  existing ViewModel buckets (overdue · today · upcoming · active). */
export const DERIVED_OCCURRENCE_STATES = Object.freeze([
  'pending',
  'today',
  'upcoming',
  'active',
  'overdue',
]);

/**
 * Certified precedence rule (OCC-CERT-08):
 *
 *   completed           → completed
 *   cancelled           → cancelled
 *   now > dueAt         → overdue
 *   startsAt <= now <=  dueAt → today
 *   startsAt > now      → upcoming
 *   else                → active
 *
 * @param {Object} occurrence An AlertOccurrence (or window-derived fields).
 * @param {number|null} nowMs Moment of classification (ms). Pure input.
 * @returns {{ key: string, label: string, persistent: boolean }}
 */
export function classifyOccurrence(occurrence, nowMs) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const completion = occurrence?.completion ?? null;

  if (completion && (completion.status === 'COMPLETED' || completion === true)) {
    return { key: 'completed', label: 'Cumplida', persistent: true, state: 'COMPLETED' };
  }
  if (completion && completion.status === 'CANCELLED') {
    return { key: 'cancelled', label: 'Cancelada', persistent: true, state: 'CANCELLED' };
  }

  const startsAt = occurrence?.startsAt ?? null;
  const dueAt = occurrence?.dueAt ?? null;
  if (dueAt === null || startsAt === null) return { key: 'active', label: 'Activa', persistent: false, state: null };

  if (now > dueAt) return { key: 'overdue', label: 'Vencida', persistent: false, state: null };
  if (now >= startsAt) return { key: 'today', label: 'Hoy', persistent: false, state: null };
  if (startsAt > now) return { key: 'upcoming', label: 'Próxima', persistent: false, state: null };
  return { key: 'active', label: 'Activa', persistent: false, state: null };
}

/**
 * The schedule-decision helper: from an occurrence window this returns the
 * derived classification PRIORITY used by consumers (config cards, future
 * Global Alert Center). See classifyOccurrence.
 */
export function deriveOccurrenceStatus(occurrence, nowMs) {
  return classifyOccurrence(occurrence, nowMs).key;
}