/**
 * OccurrenceLedgerDurableBoot — Sprint 297 (Controlled, LEVEL 5).
 * Sprint 346 — TENANT-SCOPED PERSISTENCE (Controlled Correction).
 * Sprint 348 — RUNTIME WIRING & BOOT SEQUENCING (Controlled Correction).
 *
 * ONE-time application boot: registers the HYBRID tenant-aware occurrence ledger
 * persistence port (localStorage + Supabase) on the OccurrenceLedger and
 * replays the persisted completion FACTS (refresh / recuperación). After a
 * page reload a completed occurrence keeps being completed — never re-created,
 * never re-derived (AC-11).
 *
 * Idempotent module: repeated calls (StrictMode double-render, hot reload) are
 * no-ops after the first registration. The ledger remains the authority; this
 * module only conserves + replays.
 */
import OccurrenceLedger from '../OccurrenceLedger.js';
import { createHybridTenantAdapter } from './OccurrenceLedgerPersistencePort.js';

let booted = false;
let tenantIdProvider = null;
let hydrated = false;

/**
 * Sets the tenantId provider for the hybrid adapter.
 * Called once AuthContext is initialized.
 * @param {Function} provider — function returning tenantId string or null
 */
export function setTenantIdProvider(provider) {
  tenantIdProvider = typeof provider === 'function' ? provider : null;
}

/**
 * Registers the hybrid tenant-aware port. Does NOT hydrate if tenantId is not available.
 * Hydration is deferred until a valid tenantId is available.
 * @param {Object} [options] { storage } — injectable storage for tests.
 * @returns {number} Persisted facts replayed (0 when already booted or no tenant).
 */
export function bootDurableOccurrenceLedger(options = {}) {
  if (booted) return 0;

  // The hybrid adapter uses localStorage for immediate writes + Supabase for tenant sharing
  // It reads tenantId from the provider function
  const adapter = createHybridTenantAdapter({
    storage: options?.storage ?? null,
    getTenantId: () => tenantIdProvider ? tenantIdProvider() : null,
  });

  OccurrenceLedger.unregisterPersistencePort();
  OccurrenceLedger.registerPersistencePort(adapter);
  booted = true;

  // Only hydrate if tenantId is available; otherwise defer to lazyHydrate()
  const tenantId = tenantIdProvider ? tenantIdProvider() : null;
  if (tenantId) {
    const replayed = OccurrenceLedger.hydrateFromPersistencePort();
    hydrated = true;
    return replayed;
  }
  return 0;
}

/**
 * Lazy hydration: call when tenantId becomes available after boot.
 * Safe to call multiple times; only hydrates once per tenant.
 * @returns {number} Persisted facts replayed (0 if already hydrated or no tenant).
 */
export function lazyHydrate() {
  if (!booted || hydrated) return 0;
  const tenantId = tenantIdProvider ? tenantIdProvider() : null;
  if (!tenantId) return 0;
  const replayed = OccurrenceLedger.hydrateFromPersistencePort();
  hydrated = true;
  return replayed;
}

export default bootDurableOccurrenceLedger;