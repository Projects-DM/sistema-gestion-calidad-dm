/**
 * OccurrenceLedger
 *
 * Sprint 257 — THE OCCURRENCE STATE STORE (Gate G/J).
 *
 * There is exactly ONE alert runtime; the occurrence ledger is NOT a second
 * store of configuration — it records only the OCCURRENCE EXECUTION FACTS
 * (generic Completion Signals, keyed by resource identity).
 *
 * Rule (Gate J): configuration lives in the AlertConfiguration store (SSOT);
 * the ledger holds ONLY completion facts: for each `resourceKind+resourceId
 * (+moduleId)` it keeps the LATEST semantically-final signal recorded by the
 * CompletionBridge. It never stores 'periodicity', 'startDate', enabled, etc.
 * It answers: "did the RESOURCE really reach a final (completado/approved/
 * cerrado) state, and WHEN?".
 *
 * Completion is DERIVED per occurrence window (OCC-CERT-12): an occurrence is
 * COMPLETED when a signal identity matches the resource AND the signal's
 * completedAt falls inside [startsAt, dueAt). A signal recorded OUTSIDE the
 * window does NOT mark the past occurrence (Gate F / OCC-CERT-08: the
 * completed OCC-001 never reappears as OVERDUE).
 *
 * The ledger is IN-MEMORY and NON-REACTIVE (documented limitation, Sprint
 * 257). The persistence PORT is the map-like interface below; a durable
 * implementation reproduces the same key + the same methods so the bridge,
 * runtime and consumers never change (OCC-CERT-30 boundary).
 */
import { occurrenceIdOf } from './OccurrenceContract.js';

const signals = new Map(); // `${resourceKind}::${resourceId}::${moduleId}` -> controlled signal

function keyFor({ resourceKind, resourceId, moduleId }) {
  return `${String(resourceKind ?? '')}::${String(resourceId ?? '')}::${String(moduleId ?? '')}`;
}

const OccurrenceLedger = {
  /**
   * Records a generic COMPLETION SIGNAL (operation-wide, resource-scoped).
   * Idempotent by identity: repeated deliveries overwrite to the same entry
   * (Gate J/C), keeping the latest `completedAt`.
   *
   * @returns {boolean} true when a signal is present (recorded or replaced).
   */
  recordCompletion(signal) {
    if (!signal || !signal.resourceKind || !signal.resourceId) return false;
    signals.set(signalKey(signal), Object.freeze({ ...signal }));
    return true;
  },

  /**
   * Window-aware matching (OCC-CERT-12). Pure read; never writes.
   *
   * An occurrence is COMPLETED when its resource identity has a final signal
   * whose completedAt falls inside the occurrence window [startsAt, dueAt).
   * When the signal completedAt is unknown, the identity match suffices.
   *
   * @param {Object} occurrence AlertOccurrence (startsAt/dueAt in ms).
   * @returns {Object|null} matching signal, or null.
   */
  completionSignalFor(occurrence) {
    if (!occurrence) return null;
    const signal = signals.get(signalKey(occurrence));
    if (!signal) return null;
    const completedAt = Number.isFinite(signal.completedAt) ? signal.completedAt : null;
    if (completedAt === null) return signal;
    const startsAt = occurrence.startsAt ?? null;
    const dueAt = occurrence.dueAt ?? null;
    if (startsAt !== null && completedAt < startsAt) return null;
    if (dueAt !== null && completedAt > dueAt) return null;
    return signal;
  },

  /** Identity-level check: a final signal exists for the resource. */
  hasFinalSignal({ resourceKind, resourceId, moduleId }) {
    return signals.has(signalKey({ resourceKind, resourceId, moduleId }));
  },

  /** True when the occurrence has a matching in-window final signal. */
  isCompleted(occurrence) {
    return this.completionSignalFor(occurrence) !== null;
  },

  /** Full reset — consumers/devtools ONLY. */
  clear() {
    signals.clear();
  },

  get size() {
    return signals.size;
  },

  list() {
    return [...signals.values()];
  },
};

function signalKey({ resourceKind, resourceId, moduleId }) {
  return keyFor({ resourceKind, resourceId, moduleId });
}

/** Deterministic occurrence identity helper (reused across the domain). */
export function occurrenceLedgerId(alertId, sequence) {
  return occurrenceIdOf(alertId, sequence);
}

export default OccurrenceLedger;