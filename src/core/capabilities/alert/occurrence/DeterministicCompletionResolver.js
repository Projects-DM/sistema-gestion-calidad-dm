/**
 * DeterministicCompletionResolver
 *
 * Sprint 280 — F7. THE single policy that selects AT MOST ONE eligible
 * occurrence for a direct (origin='resource') completion action.
 *
 * Reuses OccurrenceLifecycle.classifyOccurrence — the certified temporal
 * semantics. Never creates a second classifier, never persists, never
 * evaluates dates outside the occurrence contract, never notifies.
 *
 * Policy (Sprint 268 §6 / Sprint 279 §6):
 *   1. overdue           → MIN(dueAt)        (the oldest overdue)
 *   2. today / active    → MIN(dueAt)        (the closest to due)
 *   3. upcoming / others → NOT eligible
 *   no eligible candidate → null (NO COMPLETION)
 *
 * Total deterministic order: (priority, dueAt ASC, occurrenceId ASC).
 * NEVER array index, NEVER first element, NEVER configuration order.
 *
 * Pure ONLY. No state, no persistence, no bus, no scheduler.
 */

import { classifyOccurrence } from './OccurrenceLifecycle.js';

const ELIGIBLE_KEYS = Object.freeze(['overdue', 'today', 'active']);

function priorityOf(key) {
  if (key === 'overdue') return 0;
  if (key === 'today' || key === 'active') return 1;
  return 2;
}

function occurrenceDueAt(occurrence) {
  const dueAt = occurrence?.dueAt;
  return Number.isFinite(dueAt) ? dueAt : Number.MAX_SAFE_INTEGER;
}

function occurrenceKeyOf(occurrence) {
  return String(occurrence?.occurrenceId ?? '');
}

/**
 * Selects AT MOST ONE eligible occurrence deterministically.
 *
 * @param {Object} options
 * @param {Array<Object>} options.occurrences Projected AlertOccurrences.
 * @param {number} [options.nowMs] Moment of resolution (ms), pure input.
 * @returns {Object|null} The single occurrence to complete, or null.
 */
export function resolveSingleOccurrence({ occurrences, nowMs } = {}) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  if (!Array.isArray(occurrences) || occurrences.length === 0) return null;

  const eligible = occurrences.filter((occ) => {
    if (!occ || typeof occ !== 'object') return false;
    const cls = classifyOccurrence(occ, now);
    // Completed/cancelled and unclassifiable candidates are never candidates.
    if (cls.persistent) return false;
    return ELIGIBLE_KEYS.includes(cls.key);
  });

  if (eligible.length === 0) return null;

  const sorted = eligible.slice().sort((a, b) => {
    const pa = priorityOf(classifyOccurrence(a, now).key);
    const pb = priorityOf(classifyOccurrence(b, now).key);
    if (pa !== pb) return pa - pb;
    const da = occurrenceDueAt(a);
    const db = occurrenceDueAt(b);
    if (da !== db) return da - db;
    return String(occurrenceKeyOf(a)).localeCompare(String(occurrenceKeyOf(b)));
  });

  return sorted[0];
}

export default resolveSingleOccurrence;