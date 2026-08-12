/**
 * OccurrenceLedgerDurableBoot — Sprint 297 (Controlled, LEVEL 5).
 *
 * ONE-time application boot: registers the DUAL-CAPABILITY occurrence ledger
 * persistence port (durable, localStorage-backed) on the OccurrenceLedger and
 * replays the persisted completion FACTS (refresh / recuperación). After a
 * page reload a completed occurrence keeps being completed — never re-created,
 * never re-derived (AC-11).
 *
 * Idempotent module: repeated calls (StrictMode double-render, hot reload) are
 * no-ops after the first registration. The ledger remains the authority; this
 * module only conserves + replays.
 */
import OccurrenceLedger from '../OccurrenceLedger.js';
import { createDurableOccurrenceLedgerAdapter } from './OccurrenceLedgerPersistencePort.js';

let booted = false;

/**
 * Registers the durable port and hydrates persisted completion facts.
 * @param {Object} [options] { storage } — injectable storage for tests.
 * @returns {number} Persisted facts replayed (0 when already booted).
 */
export function bootDurableOccurrenceLedger(options = {}) {
  if (booted) return 0;
  const adapter = createDurableOccurrenceLedgerAdapter({ storage: options?.storage ?? null });
  OccurrenceLedger.unregisterPersistencePort();
  OccurrenceLedger.registerPersistencePort(adapter);
  const replayed = OccurrenceLedger.hydrateFromPersistencePort();
  booted = true;
  return replayed;
}

export default bootDurableOccurrenceLedger;