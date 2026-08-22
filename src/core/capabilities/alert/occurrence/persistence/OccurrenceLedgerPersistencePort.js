/**
 * OccurrenceLedgerPersistencePort — Sprint 297 (Controlled, LEVEL 5).
 * Sprint 346 — TENANT-SCOPED PERSISTENCE (Controlled Correction).
 * Sprint 348 — RUNTIME WIRING & BOOT SEQUENCING (Controlled Correction).
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
 *
 * Sprint 346 — added tenant-scoped Supabase adapter.
 * Sprint 348 — fixed missing Supabase imports.
 * Both implement ONLY the port contract; the ledger remains the authority.
 */
import { occurrenceCompletionStorageKey } from '../OccurrenceLedger.js';
import { getSupabaseClient, isSupabaseConfigured } from '../../../../../lib/supabase.js';

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

/**
 * Tenant-scoped Supabase adapter (Sprint 346 — Controlled Correction).
 * Persists completion signals per tenant in the `sgc_alert_occurrence_completions` table.
 * Key format: `occurrence::<tenantId>::<alertId>::<occurrenceId>` for specific,
 * or `resource::<tenantId>::<resourceKind>::<resourceId>::<moduleId>` for legacy.
 *
 * The adapter implements the same port contract; the ledger remains the authority.
 */
export function createTenantScopedSupabaseAdapter(options = {}) {
  const getTenantId = options?.getTenantId ?? (() => null);
  const supabase = getSupabaseClient();

  // Table schema (to be created via migration):
  // CREATE TABLE IF NOT EXISTS sgc_alert_occurrence_completions (
  //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  //   tenant_id TEXT NOT NULL,
  //   storage_key TEXT NOT NULL,
  //   signal JSONB NOT NULL,
  //   created_at TIMESTAMPTZ DEFAULT NOW(),
  //   updated_at TIMESTAMPTZ DEFAULT NOW(),
  //   UNIQUE (tenant_id, storage_key)
  // );
  // CREATE INDEX IF NOT EXISTS idx_alert_occ_completions_tenant ON sgc_alert_occurrence_completions (tenant_id);

  async function readAll() {
    if (!isSupabaseConfigured() || !supabase) return [];
    const tenantId = getTenantId();
    if (!tenantId) return [];

    try {
      const { data, error } = await supabase
        .from('sgc_alert_occurrence_completions')
        .select('signal')
        .eq('tenant_id', tenantId);
      if (error) {
        console.error('[TenantSupabaseAdapter] read failed:', error.message);
        return [];
      }
      return (data || []).map(row => row.signal).filter(s => s && typeof s === 'object' && s.resourceKind && s.resourceId);
    } catch (err) {
      console.error('[TenantSupabaseAdapter] read exception:', err);
      return [];
    }
  }

  async function writeOne(signal) {
    if (!signal || typeof signal !== 'object' || !signal.resourceKind || !signal.resourceId) return;
    const tenantId = getTenantId();
    if (!tenantId) return;

    const key = occurrenceCompletionStorageKey(signal) || `${signal.resourceKind}::${signal.resourceId}`;
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      const { error } = await supabase
        .from('sgc_alert_occurrence_completions')
        .upsert({
          tenant_id: tenantId,
          storage_key: key,
          signal: Object.freeze({ ...signal }),
        }, { onConflict: 'tenant_id,storage_key' });
      if (error) console.error('[TenantSupabaseAdapter] write failed:', error.message);
    } catch (err) {
      console.error('[TenantSupabaseAdapter] write exception:', err);
    }
  }

  async function clearAll() {
    if (!isSupabaseConfigured() || !supabase) return;
    const tenantId = getTenantId();
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('sgc_alert_occurrence_completions')
        .delete()
        .eq('tenant_id', tenantId);
      if (error) console.error('[TenantSupabaseAdapter] clear failed:', error.message);
    } catch (err) {
      console.error('[TenantSupabaseAdapter] clear exception:', err);
    }
  }

  // Synchronous wrapper for port contract compatibility
  // The ledger calls these synchronously; we fire-and-forget async writes
  // and return immediately. Reads are async but the port contract expects sync.
  // For true sync behavior with Supabase, we'd need a local cache.
  // This implementation uses a local in-memory cache synced with Supabase.

  let localCache = [];
  let cacheLoaded = false;

  async function ensureCache() {
    if (cacheLoaded) return;
    localCache = await readAll();
    cacheLoaded = true;
  }

  return Object.freeze({
    kind: 'tenant-supabase',
    async readSignals() {
      await ensureCache();
      return [...localCache];
    },
    async writeSignal(signal) {
      if (!signal || typeof signal !== 'object' || !signal.resourceKind || !signal.resourceId) return;
      await ensureCache();
      const key = occurrenceCompletionStorageKey(signal) || `${signal.resourceKind}::${signal.resourceId}`;
      // Update local cache immediately (idempotent by key)
      localCache = localCache.filter(s => occurrenceCompletionStorageKey(s) !== key);
      localCache.push(Object.freeze({ ...signal }));
      // Fire-and-forget to Supabase
      writeOne(signal);
    },
    async clearSignals() {
      await ensureCache();
      localCache = [];
      await clearAll();
    },
  });
}

/**
 * Hybrid adapter: localStorage for immediate UI feedback + Supabase for tenant sharing.
 * Writes to both; reads from Supabase (tenant-scoped) on boot, falls back to localStorage.
 */
export function createHybridTenantAdapter(options = {}) {
  const localAdapter = createDurableOccurrenceLedgerAdapter(options);
  const supabaseAdapter = createTenantScopedSupabaseAdapter(options);
  return Object.freeze({
    kind: 'hybrid-tenant',
    async readSignals() {
      // Priority: Supabase (tenant-scoped) → localStorage (fallback)
      const supabaseSignals = await supabaseAdapter.readSignals();
      if (supabaseSignals.length > 0) return supabaseSignals;
      return localAdapter.readSignals();
    },
    async writeSignal(signal) {
      // Write to both for immediate local feedback + tenant sharing
      localAdapter.writeSignal(signal);
      await supabaseAdapter.writeSignal(signal);
    },
    async clearSignals() {
      localAdapter.clearSignals();
      await supabaseAdapter.clearSignals();
    },
  });
}

export const OCCURRENCE_LEDGER_PERSISTENCE_PORT = Object.freeze({
  key: 'occurrence-ledger-persistence',
  storageKey: LOCAL_STORAGE_KEY,
  operations: OCCURRENCE_LEDGER_PERSISTENCE_PORT_OPERATIONS,
});

export default OCCURRENCE_LEDGER_PERSISTENCE_PORT;