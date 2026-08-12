/**
 * OccurrenceLedgerPersistencePort — Sprint 297 (Controlled, LEVEL 5).
 *
 * The OFFICIAL persistence port of the OccurrenceLedger. The ledger stays the
 * business authority (identity, matching, idempotency); this port ONLY
 * CONSERVES the completion FACTS written through it.
 *
 * Contract — three operations (map-like, mirroring the ledger's own key):
 *
 *   1. readSignals()
 *        Returns the persisted completion signals as an Array (may be empty).
 *   2. writeSignal(signal)
 *        Persists ONE completion signal. MUST be idempotent by the identity-
 *        derived key: writing the same signal twice never duplicates it.
 *   3. clearSignals()
 *        Removes all persisted signals (tests/devtools only).
 *
 * The KEY continues deriving from identity (resourceKind + resourceId +
 * moduleId + alertId + occurrenceId) — the same key the ledger uses
 * (occurrenceCompletionStorageKey / occurrence::alertId::occurrenceId). The
 * port NEVER stores the next occurrence and NEVER decides (AC-18, AC-07).
 *
 * Two certified adapters:
 *   - InMemoryOccurrenceLedgerAdapter  → Map-backed (tests / fallback).
 *   - DurableOccurrenceLedgerAdapter   → localStorage-backed (refresh survives).
 *
 * Both implement ONLY the port contract; no infra, no Supabase, no React.
 */
import { occurrenceCompletionStorageKey } from '../OccurrenceLedger.js';

export const OCCURRENCE_LEDGER_PERSISTENCE_PORT_OPERATIONS = Object.freeze([
  'readSignals',
  'writeSignal',
  'clearSignals',
]);

/**
 * Validates a candidate adapter against the port contract (AND ONLY it).
 * @param {Object|null|undefined} port
 * @returns {boolean}
 */
export function hasOccurrenceLedgerPersistencePort(port) {
  return (
    !!port &&
    typeof port === 'object' &&
    typeof port.readSignals === 'function' &&
    typeof port.writeSignal === 'function' &&
    typeof port.clearSignals === 'function'
  );
}

/**
 * In-memory adapter (Map-backed). Fully honors the contract; used by tests and
 * as the portable reference implementation of the port semantics.
 */
export function createInMemoryOccurrenceLedgerAdapter() {
  const store = new Map(); // storageKey -> signal
  return Object.freeze({
    kind: 'in-memory',
    readSignals() {
      return [...store.values()];
    },
    writeSignal(signal) {
      if (!signal || typeof signal !== 'object') return;
      const key = occurrenceCompletionStorageKey(signal) || String(signal?.resourceId ?? '');
      store.set(key, Object.freeze({ ...signal }));
    },
    clearSignals() {
      store.clear();
    },
  });
}

const LOCAL_STORAGE_KEY = 'sgc.alert.occurrence-completion-ledger.v1';

function readRaw(storage) {
  try {
    const raw = storage?.getItem?.(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(storage, list) {
  try {
    storage?.setItem?.(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota / private mode — the ledger keeps working in-memory; best effort.
  }
}

function safeLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' && localStorage ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Durable adapter (localStorage-backed). The write path is idempotent by the
 * identity-derived key: writeSignal replaces the entry of the same key instead
 * of appending (OCC-CERT-13 semantics preserved across reloads). readSignals
 * returns only well-formed facts (resourceKind+resourceId present).
 *
 * An optional `storage` may be injected (tests); defaults to window.localStorage.
 */
export function createDurableOccurrenceLedgerAdapter(options = {}) {
  const storage = options?.storage ?? safeLocalStorage();
  return Object.freeze({
    kind: 'durable',
    readSignals() {
      return readRaw(storage).filter(
        (s) => s && typeof s === 'object' && s.resourceKind && s.resourceId,
      );
    },
    writeSignal(signal) {
      if (!signal || typeof signal !== 'object' || !signal.resourceKind || !signal.resourceId) return;
      const key = occurrenceCompletionStorageKey(signal) || `${signal.resourceKind}::${signal.resourceId}`;
      const list = readRaw(storage).filter((s) => {
        if (!s || typeof s !== 'object') return false;
        return (occurrenceCompletionStorageKey(s) || `${s.resourceKind}::${s.resourceId}`) !== key;
      });
      list.push(Object.freeze({ ...signal }));
      writeRaw(storage, list);
    },
    clearSignals() {
      try {
        storage?.removeItem?.(LOCAL_STORAGE_KEY);
      } catch {
        // no-op
      }
    },
  });
}

export const OCCURRENCE_LEDGER_PERSISTENCE_PORT = Object.freeze({
  key: 'occurrence-ledger-persistence',
  storageKey: LOCAL_STORAGE_KEY,
  operations: OCCURRENCE_LEDGER_PERSISTENCE_PORT_OPERATIONS,
});

export default OCCURRENCE_LEDGER_PERSISTENCE_PORT;