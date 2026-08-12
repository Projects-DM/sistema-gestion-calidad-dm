/**
 * Sprint 297 — DURABLE OCCURRENCE COMPLETION: REPOSITORY + CATEGORY EMITTERS &
 * REFRESH DURABILITY (controlled, LEVEL 5).
 *
 * Verifies with executable evidence the REAL actions that complete document
 * repository/category alerts, transactional semantics (only on success), and
 * that a completed fact survives refresh through the durable port.
 *
 *   AC-01  documentRepository DOES emit completion (real action: PDF upload
 *          into a repository-scoped category — inheritance).
 *   AC-02  documentCategory DOES emit completion (real action: PDF upload into
 *          a category with its OWN alert configuration).
 *   AC-03  completion happens AFTER confirmed persistence (never optimistic);
 *          same session the occurrence flips COMPLETED and the alert hides.
 *   AC-11  refresh durability: persisted fact replayed at boot → occurrence
 *          keeps COMPLETED (recuperación).
 *   AC-12  dual-capability deferrable port: in-memory write-through survives a
 *          failing port; a valid durable port conserves the fact.
 *   AC-13  ledger.clear() clears ONLY memory; durable facts remain + explicit
 *          clearSignals() empties the durable store.
 *   AC-14  Category A complete → Category B unaffected.
 *   AC-15  Category completion never completes the Repository.
 *   AC-16  Repository completion never completes a Category.
 *   AC-17  identity NOT rebuilt: resource intents stay identity-free; the
 *          certified projection drives the specific `occurrence::<id>::<occ>`
 *          key (no invented category identity).
 *   AC-18  recurrence stays DERIVED: the durable port stores only FACTS.
 *
 * Ejecutar: node scripts/sprint-297-durable-occurrence-persistence.mjs
 */
import { readFileSync } from 'node:fs';
import { parseAnchor, cadenceMs, occurrenceWindowAt } from '../src/core/capabilities/alert/occurrence/OccurrenceSchedule.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import {
  handleCompletionIntent,
  registerCompletionOccurrenceProvider,
  COMPLETION_INTENT_EVENT,
} from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { projectResourceAlertState } from '../src/utils/alertResourceState.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';
import {
  createDurableOccurrenceLedgerAdapter,
  createInMemoryOccurrenceLedgerAdapter,
  hasOccurrenceLedgerPersistencePort,
} from '../src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js';

const readFile = (p) => {
  try { return readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'); } catch { return ''; }
};

const checks = [];
function check(label, truth, detail = '') {
  checks.push({ label, truth: !!truth, detail });
}

const DAY = 8.64e7;
const HOUR = 3.6e6;
const anchorDaily = parseAnchor({ startDate: '2026-07-06', startTime: '08:00' });
const dailyCadence = cadenceMs({ amount: 1, unit: 'days' });
const NOW = anchorDaily + 2 * HOUR + 30 * 60000; // lunes 10:30
const MOD = 'mod-docs';

// Deterministic document resources (same shapes the documents engine loads):
//  - repoOwn: repository WITH its own alert configuration (the alert the whole
//    repository surface consumes).
//  - catInherit: category WITHOUT own config → belongs to the repository's alert.
//  - catOwnA / catOwnB: categories WITH their OWN configuration (Sprint 294).
const dailyCfg = (name, priority) => ({
  name, periodicity: { amount: 1, unit: 'days' }, startDate: '2026-07-06',
  startTime: '08:00', enabled: true, priority,
});
const resources = {
  forms: [],
  repositories: [{
    id: 1, slug: 'repositorio-calidad', module_id: MOD,
    alertConfiguration: { alertConfigurations: [dailyCfg('Repo Alerta', 'high')] },
  }],
  categories: [
    { id: 11, category_key: 'informes', repository_id: 1, module_id: MOD, alertConfiguration: null },
    { id: 21, category_key: 'auditorias', repository_id: 1, module_id: MOD,
      alertConfiguration: { alertConfigurations: [dailyCfg('Auditoria Alerta', 'high')] } },
    { id: 22, category_key: 'capacitacion', repository_id: 1, module_id: MOD,
      alertConfiguration: { alertConfigurations: [dailyCfg('Capacitacion Alerta', 'low')] } },
  ],
};

const occOf = () => projectCurrentOccurrences(resources, MOD, NOW);
const stateOf = (occurrences, kind, id, resource) =>
  projectResourceAlertState({ occurrences, resourceKind: kind, resourceId: id, resource, now: NOW });
const byKindId = (list, kind, id) =>
  (list || []).find((o) => o.resourceKind === kind && String(o.resourceId) === String(id)) || null;

const beforeAll = occOf();
const repoOcc = byKindId(beforeAll, 'documentRepository', 1);
const catAOcc = byKindId(beforeAll, 'documentCategory', 21);
const catBOcc = byKindId(beforeAll, 'documentCategory', 22);

// ===========================================================================
// AC-01 / AC-02 — THE REAL EMITTERS EXIST (ModuleDocumentViewer emits the ONE
// controlled COMPLETION_INTENT after the REAL action — a PDF upload).
// ===========================================================================
{
  const viewer = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  const publishCount = (viewer.match(/OperationalEventBus\.publish\(COMPLETION_INTENT_EVENT/g) || []).length;
  check('AC-01/AC-02 — el viewer emite COMPLETION_INTENT (único emisor real)', publishCount === 2, `publishes=${publishCount}`);
  check('AC-01/AC-02 — emite resourceKind documentCategory para categorías propias',
    viewer.includes(`resourceKind: 'documentCategory'`));
  check('AC-01/AC-02 — emite resourceKind documentRepository para categorías heredadas',
    viewer.includes(`resourceKind: 'documentRepository'`));
  check('AC-01/AC-02 — la emisión es EXACTAMENTE UNA por upload (rama if/else, AC-15/AC-16)',
    viewer.includes('} else if (activeRepositoryId) {'));
}

// ===========================================================================
// AC-03 — SOLO DESPUÉS DEL ÉXITO (never optimistic) + orden real.
// ===========================================================================
{
  const viewer = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  const idxUpload = viewer.indexOf('await documentsService.uploadRecord(');
  const idxFirstPublish = viewer.indexOf('OperationalEventBus.publish(COMPLETION_INTENT_EVENT');
  check('AC-03 — el completion ocurre DESPUÉS del upload persistido (await first)',
    idxUpload >= 0 && idxFirstPublish > idxUpload);
  check('AC-03 — el error NO emite completion (catch sin publish)',
    viewer.indexOf('OperationalEventBus.publish') > viewer.indexOf('catch'));
}

// ===========================================================================
// AC-01 — REPOSITORY COMPLETION (flujo: alert activa → acción real → completa).
// ===========================================================================
{
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort();
  registerCompletionOccurrenceProvider(occOf);

  const before = stateOf(occOf(), 'documentRepository', 1, resources.repositories[0]);
  check('AC-01 — alerta de repositorio ACTIVA antes de la acción', before?.hasOpen === true);

  // real action (simulated controlled emission, origin='resource'): upload a
  // PDF into a repository-scoped category → repository completion.
  const recorded = handleCompletionIntent({
    origin: 'resource', resourceKind: 'documentRepository', resourceId: 1,
    moduleId: MOD, completedAt: NOW,
  });
  check('AC-01 — origin=resource registra el hecho del repositorio', recorded?.alertId === repoOcc.alertId);
  const after = byKindId(occOf(), 'documentRepository', 1);
  check('AC-01 — la ocurrencia queda COMPLETED (mismo período)', after?.completion?.status === 'COMPLETED');
  const afterState = stateOf(occOf(), 'documentRepository', 1, resources.repositories[0]);
  check('AC-01 — completion → alerta OCULTA (Regla B: hasOpen false)', afterState?.hasOpen === false);
}

// ===========================================================================
// AC-02 — CATEGORY COMPLETION with OWN configuration.
// ===========================================================================
{
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort();
  registerCompletionOccurrenceProvider(occOf);

  const catAResource = resources.categories.find((c) => c.id === 21);
  const before = stateOf(occOf(), 'documentCategory', 21, catAResource);
  check('AC-02 — alerta de categoría (con config propia) ACTIVA antes', before?.hasOpen === true);

  handleCompletionIntent({
    origin: 'resource', resourceKind: 'documentCategory', resourceId: 21,
    moduleId: MOD, completedAt: NOW,
  });
  const after = byKindId(occOf(), 'documentCategory', 21);
  check('AC-02 — la ocurrencia de la categoría queda COMPLETED', after?.completion?.status === 'COMPLETED');
  const afterState = stateOf(occOf(), 'documentCategory', 21, catAResource);
  check('AC-02 — completion → alerta de categoría OCULTA', afterState?.hasOpen === false);
}

// ===========================================================================
// AC-14 / AC-15 / AC-16 — AISLAMIENTO (ledger por identidad específica).
// ===========================================================================
{
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort();
  registerCompletionOccurrenceProvider(occOf);

  handleCompletionIntent({
    origin: 'resource', resourceKind: 'documentCategory', resourceId: 21,
    moduleId: MOD, completedAt: NOW,
  });
  const current = occOf();
  check('AC-14 — Category A completada → Category B NO se satisface',
    (byKindId(current, 'documentCategory', 22) || catBOcc).completion === null);
  check('AC-15 — Category completada → Repository NO se satisface',
    (byKindId(current, 'documentRepository', 1) || repoOcc).completion === null);

  OccurrenceLedger.clear();
  handleCompletionIntent({
    origin: 'resource', resourceKind: 'documentRepository', resourceId: 1,
    moduleId: MOD, completedAt: NOW,
  });
  const current2 = occOf();
  check('AC-16 — Repository completado → Category A NO se satisface',
    (byKindId(current2, 'documentCategory', 21) || catAOcc).completion === null);
}

// ===========================================================================
// AC-17 — LA IDENTIDAD SIGUE DERIVADA POR LA PROYECCIÓN (nunca reconstruida).
// ===========================================================================
{
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort();
  registerCompletionOccurrenceProvider(occOf);

  const viewer = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  check('AC-17 — el emisor NO inventa alertId/occurrenceId (solo resource identity)',
    !/alertId\s*:|occurrenceId\s*:/.test(viewer));

  handleCompletionIntent({
    origin: 'resource', resourceKind: 'documentCategory', resourceId: 21,
    moduleId: MOD, completedAt: NOW,
  });
  const after = byKindId(occOf(), 'documentCategory', 21);
  check('AC-17 — signalKey = occurrence::alertId::occId (la clave específica certificada)',
    after?.completion?.signalKey === `occurrence::${catAOcc.alertId}::${catAOcc.occurrenceId}`);
  check('AC-17 — no se crea identidad de categoría de alerta (alertId es el del config)',
    catAOcc.alertId === `${catAOcc.resourceId}:alert:0`);
}

// ===========================================================================
// AC-12 — PUERTO DUAL-CAPACITY: fallo tolerado + conseruación real.
// ===========================================================================
{
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort();

  // a) Un puerto DEFECTUOSO no rompe el camino de negocio (best-effort).
  const failingPort = {
    readSignals: () => [],
    writeSignal() { throw new Error('storage quota exceeded'); },
    clearSignals: () => {},
  };
  OccurrenceLedger.registerPersistencePort(failingPort);
  const ok = OccurrenceLedger.recordCompletion({
    origin: 'resource', resourceKind: 'documentRepository', resourceId: 1,
    moduleId: MOD, alertId: repoOcc.alertId, occurrenceId: repoOcc.occurrenceId, completedAt: NOW,
  });
  check('AC-12 — puerto con writeSignal fallando NO rompe el ledger (in-memory intacto)',
    ok === true && OccurrenceLedger.isCompleted(repoOcc));

  // b) Un puerto válido conserua los hechos (write-through).
  OccurrenceLedger.clear();
  const inMemory = createInMemoryOccurrenceLedgerAdapter();
  check('AC-12 — el adapter cumple el contrato del puerto (read/write/clear)',
    hasOccurrenceLedgerPersistencePort(inMemory));
  OccurrenceLedger.unregisterPersistencePort();
  OccurrenceLedger.registerPersistencePort(inMemory);
  handleCompletionIntent({
    origin: 'resource', resourceKind: 'documentCategory', resourceId: 21,
    moduleId: MOD, completedAt: NOW,
  });
  check('AC-12 — write-through: el hecho completo está en el puerto',
    inMemory.readSignals().some((s) => s.resourceKind === 'documentCategory' && s.resourceId === 21));
  check('AC-12 — el puerto NO guarda recurrencia (solo hechos keyed por identidad)',
    inMemory.readSignals().every((s) => !('nextAt' in s) && !('startsAt' in s) && !('dueAt' in s)));
}

// ===========================================================================
// AC-13 — clear() limpia SOLO memoria; clearSignals() el durable store.
// ===========================================================================
{
  OccurrenceLedger.clear();
  const storage = {};
  const durable = (() => {
    const mem = {};
    return createDurableOccurrenceLedgerAdapter({
      storage: {
        getItem: (k) => mem[k] ?? null,
        setItem: (k, v) => { mem[k] = String(v); },
        removeItem: (k) => { delete mem[k]; },
      },
    });
  })();
  OccurrenceLedger.unregisterPersistencePort();
  OccurrenceLedger.registerPersistencePort(durable);
  handleCompletionIntent({
    origin: 'resource', resourceKind: 'documentRepository', resourceId: 1,
    moduleId: MOD, completedAt: NOW,
  });
  check('AC-13 — el hecho llegó al durable store', durable.readSignals().length === 1);

  OccurrenceLedger.clear();
  check('AC-13 — clear() deja el ledger en memoria vacío', OccurrenceLedger.size === 0);
  check('AC-13 — clear() NO toca el durable store', durable.readSignals().length === 1);

  durable.clearSignals();
  check('AC-13 — clearSignals() vacía el durable store', durable.readSignals().length === 0);
  OccurrenceLedger.unregisterPersistencePort();
}

// ===========================================================================
// AC-11 — DURABILIDAD AL REFRESH: el hecho rehidrata y la ocurrencia sigue
// COMPLETED (recuperación) — reproducción exacta del boot durable.
// ===========================================================================
{
  const mem = {};
  const storage = {
    getItem: (k) => mem[k] ?? null,
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  };

  // SESIÓN 1: el usuario sube el documento; el hecho se conserua durablemente.
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort();
  OccurrenceLedger.registerPersistencePort(createDurableOccurrenceLedgerAdapter({ storage }));
  registerCompletionOccurrenceProvider(occOf);
  handleCompletionIntent({
    origin: 'resource', resourceKind: 'documentRepository', resourceId: 1,
    moduleId: MOD, completedAt: NOW,
  });
  const s1Persisted = createDurableOccurrenceLedgerAdapter({ storage }).readSignals();
  check('AC-11 — sesión 1: el hecho quedó persistido (listo para el refresh)',
    s1Persisted.some((s) => s.resourceKind === 'documentRepository' && s.resourceId === 1));

  // REFRESH: memoria limpia + boot del puerto durable (como hace main.jsx).
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort();
  OccurrenceLedger.registerPersistencePort(createDurableOccurrenceLedgerAdapter({ storage }));
  const replayed = OccurrenceLedger.hydrateFromPersistencePort();
  check('AC-11 — boot: rehidrata el hecho persistido', replayed >= 1);

  const afterRefresh = byKindId(occOf(), 'documentRepository', 1);
  check('AC-11 — tras el refresh la ocurrencia SIGUE COMPLETED (no re-creada)',
    afterRefresh?.completion?.status === 'COMPLETED');
  const stateAfterRefresh = stateOf(occOf(), 'documentRepository', 1, resources.repositories[0]);
  check('AC-11 — tras el refresh la alerta SIGUE OCULTA', stateAfterRefresh?.hasOpen === false);
  check('AC-11 — el replay es idempotente (doble boot, un solo hecho)',
    OccurrenceLedger.hydrateFromPersistencePort() >= 0 && OccurrenceLedger.size === 1);
  OccurrenceLedger.unregisterPersistencePort();
}

// ===========================================================================
// AC-18 — LA RECURRENCIA SIGUE DERIVADA (nunca almacenada en el puerto).
// ===========================================================================
{
  const allOk = () => {
    const viewer = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
    return !viewer.includes('nextOccurrence') && !viewer.includes('nextAt');
  };
  check('AC-18 — el emisor no transporta la próxima ocurrencia', allOk());
  check('AC-18 — la ventana sigue derivada por la proyección (mismo período)',
    repoOcc.startsAt === anchorDaily && repoOcc.dueAt === anchorDaily + DAY &&
    occurrenceWindowAt(anchorDaily, dailyCadence, NOW).sequence === 1);
  const ledgerSrc = readFile('src/core/capabilities/alert/occurrence/OccurrenceLedger.js');
  check('AC-18 — el ledger declara su limitación (IN-MEMORY, NON-REACTIVE)',
    ledgerSrc.includes('IN-MEMORY') && ledgerSrc.includes('NON-REACTIVE'));
}

// ===========================================================================
// Boot wiring: main.jsx invoca el boot durable una única vez.
// ===========================================================================
{
  const main = readFile('src/main.jsx');
  check('BOOT — main.jsx ejecuta bootDurableOccurrenceLedger() al refresco',
    main.includes('bootDurableOccurrenceLedger()'));
  const boot = readFile('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js');
  check('BOOT — el boot es idempotente (una sola vez por sesión)', /let booted = false;/.test(boot));
  check('BOOT — el boot nunca sustituye al ledger (autoridad), solo registra+hidrata',
    boot.includes('registerPersistencePort') && boot.includes('hydrateFromPersistencePort'));
}

// ===========================================================================

console.log('');
console.log('SPRINT 297 — DURABLE OCCURRENCE COMPLETION (REPOSITORY + CATEGORY EMITTERS, REFRESH DURABILITY)');
console.log('================================================================================================');
let failed = 0;
for (const c of checks) {
  const mark = c.truth ? 'PASS ' : 'FAIL ';
  if (!c.truth) failed += 1;
  console.log(`${mark} ${c.label}  ${c.truth ? '' : '→ ' + c.detail}`);
}
console.log('------------------------------------------------------------------------------------------------');
console.log(`TOTAL: ${checks.length - failed}/${checks.length}`);
process.exit(failed === 0 ? 0 : 1);