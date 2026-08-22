/**
 * OccurrenceLedger
 *
 * Sprint 257 — THE OCCURRENCE STATE STORE (Gate G/J).
 * Sprint 280 — F8. OCCURRENCE-ISOLATED COMPLETION (Sprint 268/279).
 *
 * There is exactly ONE alert runtime; the occurrence ledger is NOT a second
 * store of configuration — it records only the OCCURRENCE EXECUTION FACTS
 * (generic Completion Signals, keyed by resource identity).
 *
 * Rule (Gate J): configuration lives in the AlertConfiguration store (SSOT);
 * the ledger holds ONLY completion facts.
 *
 * Sprint 280 — TWO-LEVEL KEYS:
 *   1. SPECIFIC (identity-aware, Sprint 280): `occurrence::<alertId>::<occurrenceId>`
 *      — an explicit `origin='alert'` signal, or a deterministically-resolved
 *      `origin='resource'` signal, records THE exact occurrence. A completion
 *      of A:occ:001 NEVER satisfies B:occ:001/C:occ:001 though they share
 *      resourceId/moduleId/formId (Sprint 279 §5, §18).
 *   2. LEGACY (resource-scoped, Sprint 257 compatibility):
 *      `resourceKind::resourceId::moduleId` — retained as fallback ONLY so past
 *      certified consumers keep resolving; it is NEVER the path for new
 *      identity-aware actions.
 *
 * Completion is DERIVED per occurrence window (OCC-CERT-12): for the LEGACY
 * path an occurrence is COMPLETED when a signal identity matches the resource
 * AND the signal's completedAt falls inside [startsAt, dueAt). The SPECIFIC
 * path requires exact alertId+occurrenceId equality — no temporal fallback.
 *
 * The ledger is IN-MEMORY and NON-REACTIVE (documented limitation, Sprint
 * 257). The persistence PORT is the map-like interface below; a durable
 * implementation reproduces the same key + the same methods so the bridge,
 * runtime and consumers never change (OCC-CERT-30 boundary).
 *
 * Sprint 297 — DURABLE OCCURRENCE LEDGER ADAPTER (controlled, LEVEL 5).
 * The ledger remains THE business authority; the persistence port only
 * CONSERVES the completion FACTS (never the schedule, never the next
 * occurrence — recurrence stays derived). A registered port (optional) is
 * notified on every `recordCompletion` (write-through) and can be replayed at
 * boot via `hydrateFromPersistencePort()` — the replay is idempotent because
 * `recordCompletion` overwrites the same key (OCC-CERT-13). The KEY continues
 * deriving from identity (resourceKind + resourceId + moduleId + alertId +
 * occurrenceId); no new identity is introduced (AC-07/AC-18).
 */
import { occurrenceIdOf } from './OccurrenceContract.js';
import { hasOccurrenceIdentity, matchExplicitOccurrence } from './CompletionSignal.js';

const signals = new Map(); // specific/legacy key -> controlled signal

// Sprint 297 — optional durable port: { readSignals(), writeSignal(), clearSignals() }.
// Absence/invalid port → ledger behaves EXACTLY as before (fully backward compatible).
let persistencePort = null;

/**
 * Sprint 346 — TENANT-SCOPED PERSISTENCE (Controlled Correction).
 * The storage key now includes tenantId for multi-tenant isolation.
 * Tenant resolution is the responsibility of the signal producer (CompletionBridge).
 */
export function getTenantIdFromSignal(signal) {
  if (!signal || typeof signal !== 'object') return null;
  return signal.tenantId ?? null;
}

export function occurrenceCompletionStorageKey(signal) {
  if (!signal || typeof signal !== 'object') return null;
  const tenantId = getTenantIdFromSignal(signal);
  const prefix = tenantId ? `tenant::${tenantId}::` : '';
  return hasOccurrenceIdentity(signal)
    ? `${prefix}occurrence::${String(signal?.alertId ?? '')}::${String(signal?.occurrenceId ?? '')}`
    : `${prefix}resource::${String(signal?.resourceKind ?? '')}::${String(signal?.resourceId ?? '')}::${String(signal?.moduleId ?? '')}`;
}

function resourceKeyFor({ resourceKind, resourceId, moduleId }) {
  return `resource::${String(resourceKind ?? '')}::${String(resourceId ?? '')}::${String(moduleId ?? '')}`;
}

function specificKeyFor(signal) {
  return `occurrence::${String(signal?.alertId ?? '')}::${String(signal?.occurrenceId ?? '')}`;
}

const OccurrenceLedger = {
  /**
   * Records a COMPLETION SIGNAL. A signal carrying occurrence IDENTITY
   * (alertId + occurrenceId, ANY origin — explicit alert OR deterministically
   * resolved resource) is recorded OCCURRENCE-SPECIFIC
   * (`occurrence::<alertId>::<occurrenceId>`, F8 isolation); otherwise it falls
   * back to the legacy resource key (Sprint 257 compatibility). Idempotent by
   * identity: repeated deliveries overwrite to the same entry (Gate J/C).
   *
   * @returns {boolean} true when a signal is present (recorded or replaced).
   */
  recordCompletion(signal) {
    if (!signal || !signal.resourceKind || !signal.resourceId) return false;
    const key = hasOccurrenceIdentity(signal)
      ? specificKeyFor(signal)
      : resourceKeyFor(signal);
    const frozen = Object.freeze({ ...signal });
    signals.set(key, frozen);
    // Sprint 297 — WRITE-THROUGH to the durable port (optional). The port only
    // conserves the fact; it NEVER decides anything. A failing port must never
    // break the business path (best-effort, swallow + log once).
    if (persistencePort && typeof persistencePort.writeSignal === 'function') {
      try {
        persistencePort.writeSignal(frozen);
      } catch (err) {
        console.error('[OccurrenceLedger] durable write failed', err);
      }
    }
    return true;
  },

  /**
   * Window-aware matching (OCC-CERT-12) + identity-aware matching (Sprint 280).
   * Pure read; never writes.
   *
   * Resolution order for a projected occurrence:
   *   1. SPECIFIC key: `occurrence::<alertId>::<occurrenceId>` — exact identity
   *      (Sprint 280). No temporal fallback for a specific match.
   *   2. LEGACY resource key (compat): a final signal whose completedAt falls
   *      inside the occurrence window [startsAt, dueAt).
   *
   * @param {Object} occurrence AlertOccurrence (startsAt/dueAt in ms).
   * @returns {Object|null} matching signal, or null.
   */
  completionSignalFor(occurrence) {
    if (!occurrence) return null;

    if (occurrence.alertId && occurrence.occurrenceId) {
      const specific = signals.get(specificKeyFor(occurrence));
      if (specific && matchExplicitOccurrence(occurrence, specific)) return specific;
    }

    const signal = signals.get(resourceKeyFor(occurrence));
    if (!signal) return null;
    const completedAt = Number.isFinite(signal.completedAt) ? signal.completedAt : null;
    if (completedAt === null) return signal;
    const startsAt = occurrence.startsAt ?? null;
    const dueAt = occurrence.dueAt ?? null;
    if (startsAt !== null && completedAt < startsAt) return null;
    if (dueAt !== null && completedAt > dueAt) return null;
    return signal;
  },

  /** Identity-level check (legacy semantics): a final signal exists for the resource. */
  hasFinalSignal({ resourceKind, resourceId, moduleId }) {
    return signals.has(resourceKeyFor({ resourceKind, resourceId, moduleId }));
  },

  /** True when the occurrence has a matching specific or in-window final signal. */
  isCompleted(occurrence) {
    return this.completionSignalFor(occurrence) !== null;
  },

  /** True when the occurrence has an explicit specific completion recorded. */
  hasSpecificCompletion(occurrence) {
    if (!occurrence?.alertId || !occurrence?.occurrenceId) return false;
    return signals.has(specificKeyFor(occurrence));
  },

  /** Full reset — consumers/devtools ONLY. */
  clear() {
    signals.clear();
  },

  /**
   * Sprint 297 — registers the durable persistence port. Optional; when absent
   * the ledger behaves exactly as before (in-memory). Re-registering replaces
   * the previous port (last wins). Never throws.
   *
   * @param {Object} port Must expose { readSignals(), writeSignal(), clearSignals() }.
   * @returns {boolean} Whether a valid port was registered.
   */
  registerPersistencePort(port) {
    persistencePort =
      port && typeof port === 'object' ? port : null;
    return persistencePort !== null;
  },

  /**
   * Sprint 297 — detaches the persistence port (tests/devtools). Idempotent.
   * @returns {boolean} true
   */
  unregisterPersistencePort() {
    persistencePort = null;
    return true;
  },

  /**
   * Sprint 297 — replays persisted completion FACTS into the ledger. The
   * replay goes through `recordCompletion`, so it is idempotent by identity
   * (OCC-CERT-13): a persisted single fact yields exactly ONE transition.
   * Called once at application boot (refresh / recuperación). It NEVER stores
   * the next occurrence (AC-18): recurrence keeps being derived.
   *
   * @returns {number} How many persisted facts were replayed.
   */
  hydrateFromPersistencePort() {
    if (!persistencePort || typeof persistencePort.readSignals !== 'function') return 0;
    let persisted;
    try {
      persisted = persistencePort.readSignals();
    } catch (err) {
      console.error('[OccurrenceLedger] durable read failed', err);
      return 0;
    }
    if (!Array.isArray(persisted)) persisted = [];
    let replayed = 0;
    for (const signal of persisted) {
      if (signal && typeof signal === 'object' && signal.resourceKind && signal.resourceId) {
        if (this.recordCompletion(signal)) replayed += 1;
      }
    }
    return replayed;
  },

  get size() {
    return signals.size;
  },

  list() {
    return [...signals.values()];
  },
};

export { signals as _ledgerSignals };

/** Deterministic occurrence identity helper (reused across the domain). */
export function occurrenceLedgerId(alertId, sequence) {
  return occurrenceIdOf(alertId, sequence);
}

export default OccurrenceLedger;