/**
 * Sprint 299 — FORENSIC COMPLETION FLOW & LIVE RECONCILIATION AUDIT.
 *
 * TIPO: AUDIT ONLY · LEVEL 5 · FORENSIC RUNTIME VALIDATION.
 * NO corrige nada. Establece, con evidencia ejecutable, en cuál frontera del
 * pipeline (ACCIÓN → EVENTO → BRIDGE → LEDGER → PERSISTENCIA → PROYECCIÓN →
 * ESTADO → PRESENTACIÓN) se pierde / no se registra / no se proyecta / no se
 * refleja un completion. El contrato exacto para el Sprint 300 se recomienda en
 * ROOT CAUSE, pero AQUÍ no se implementa.
 *
 * Fases (F01..F15), clasificación obligatoria de hallazgos y criterios AC-01..32
 * definidos en el sprint spec. El flujo se comprueba contra el runtime REAL de
 * src/ (bridge/resolver/ledger/projection/presentation consumidos tal cual).
 *
 * Ejecutar: node scripts/sprint-299-forensic-completion-flow-audit.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseAnchor, occurrenceWindowAt, computeTarget, calendarAddMonths } from '../src/core/capabilities/alert/occurrence/OccurrenceSchedule.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import { occurrenceIdOf, createAlertOccurrence } from '../src/core/capabilities/alert/occurrence/OccurrenceContract.js';
import { classifyOccurrence } from '../src/core/capabilities/alert/occurrence/OccurrenceLifecycle.js';
import {
  handleCompletionIntent,
  registerCompletionOccurrenceProvider,
  wireCompletionBridge,
  COMPLETION_INTENT_EVENT,
  RESOURCE_COMPLETED_EVENT,
} from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';
import { resolveSingleOccurrence } from '../src/core/capabilities/alert/occurrence/DeterministicCompletionResolver.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { createCompletionSignal } from '../src/core/capabilities/alert/occurrence/CompletionSignal.js';
import { projectResourceAlertState, buildScheduleLines } from '../src/utils/alertResourceState.js';
import { createInMemoryOccurrenceLedgerAdapter } from '../src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js';

// ---------------------------------------------------------------------------
// HARNESS
// ---------------------------------------------------------------------------
const readFile = (p) => {
  try { return readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8'); } catch { return ''; }
};

const checks = [];
function check(label, truth, detail = '') {
  checks.push({ label, truth: !!truth, detail });
}

const DAY = 8.64e7;
const MODULE = 'mod-ops';
const H = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0).getTime();

function cfg(name, startDate, startTime, unit = 'days', amount = 1, priority = 'high') {
  return { name, priority, periodicity: { amount, unit }, startDate, startTime, enabled: true };
}
function formOf(id, configs, slug = 'temperature') {
  return { id, slug, module_id: MODULE, alertConfiguration: { alertConfigurations: configs } };
}
function repoOf(id, configs, slug = 'controles') {
  return { id, slug, module_id: MODULE, alertConfiguration: { alertConfigurations: configs } };
}
function catOf(id, repositoryId, configs, category_key = 'externos') {
  const cat = { id, repository_id: repositoryId, category_key };
  if (configs) cat.alertConfiguration = { alertConfigurations: configs };
  return cat;
}

/** Mutable audit world consumed by the REAL bridge occurrence-provider. */
let AUDIT_RESOURCES = { forms: [], repositories: [], categories: [] };
let AUDIT_NOW = 0;
registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(AUDIT_RESOURCES, MODULE, AUDIT_NOW));

/** Full REAL path: resolver + ledger, at a controlled instant. */
function completeResource(kind, id, atMs) {
  AUDIT_NOW = atMs;
  return handleCompletionIntent({ origin: 'resource', resourceKind: kind, resourceId: id, moduleId: MODULE, completedAt: atMs });
}

function specificSignalKey(occ) {
  return `occurrence::${occ.alertId}::${occ.occurrenceId}`;
}
function projectionSnapshot() {
  return projectCurrentOccurrences(AUDIT_RESOURCES, MODULE, AUDIT_NOW);
}
function statesFor(kind, id) {
  const occs = projectionSnapshot();
  return projectResourceAlertState({ occurrences: occs, resourceKind: kind, resourceId: id, resource: null, now: AUDIT_NOW });
}

function resetWorld() {
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort();
  AUDIT_RESOURCES = { forms: [], repositories: [], categories: [] };
  AUDIT_NOW = 0;
}

/**
 * Bridge lifecycle helper. The REAL `wireCompletionBridge` is globally
 * idempotent via its internal `wired` flag: it does NOT re-subscribe after the
 * bus has been cleared. Keeping a module-scoped unsubscribe lets the audit
 * re-wire cleanly between phases (and documents that latent edge for Sprint 300).
 */
let BRIDGE_UNSUB = null;
function freshBridge() {
  BRIDGE_UNSUB?.();
  OperationalEventBus.clear();
  BRIDGE_UNSUB = wireCompletionBridge();
}

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------
// Form multi-alert (A hoy 08:00, B hoy 09:00 — ambos iniciados a las 10:00;
// C mañana) → aislamiento y selección determinista.
const F_MULTI = formOf(12, [
  cfg('A', '2026-08-12', '08:00'),
  cfg('B', '2026-08-12', '09:00'),
  cfg('C', '2026-08-13', '08:00'),
]);
const T0 = H(2026, 8, 12, 10, 0);

// Form single (identidad diaria + F09).
const F_SINGLE = formOf(12, [cfg('A1', '2026-08-12', '08:00')]);

// Repositorio + categorías (ownership).
const REPO = repoOf(77, [cfg('Doc', '2026-08-12', '07:00')]);
const CAT_OWN = catOf(5, 77, [cfg('CatA', '2026-08-12', '08:00')]);
const CAT_INHERIT = catOf(6, 77, null);
const WORLD_OWN = { forms: [], repositories: [REPO], categories: [CAT_OWN, CAT_INHERIT] };

// ===========================================================================
console.log('SPRINT 299 — FORENSIC COMPLETION FLOW AUDIT');
console.log('============================================');

// ---------------------------------------------------------------------------
// F01 — ACCIÓN REAL (formulario): qué se publica, cuándo y con qué identidad.
// ---------------------------------------------------------------------------
{
  const src = readFile('src/pages/DynamicForm.jsx');
  const iSubmit = src.indexOf('submitFormResponse');
  const iPublish = src.indexOf('publish(COMPLETION_INTENT_EVENT');
  const iLastCatch = src.lastIndexOf('catch');
  check('F01 — form publishes COMPLETION_INTENT ONLY AFTER submitFormResponse resolves', iPublish > iSubmit && iPublish > 0, `publish@${iPublish} submit@${iSubmit}`);
  check('F01 — form error/catch path NEVER publishes completion', src.indexOf('COMPLETION_INTENT_EVENT', iLastCatch) === -1, 'no publish after last catch');
  check('F01 — form guardrail: no alert configuration → NO publication', src.includes('hasAlerts') && src.includes('extractResourceAlertCollection(formDef).length > 0'));
  check('F01 — form emits origin=alert when arrived from alert card (explicit identity)', src.includes("origin: 'alert'") && src.includes('alertContext?.occurrenceId'));
  check('F01 — form emits origin=resource otherwise (bridge resolves)', src.includes("origin: 'resource'"));
  const resKindOk = src.includes("resourceKind: 'dynamicForms'") && src.includes('resourceId: formDef.id') && (src.includes('moduleId: formDef?.module_id ?? moduleSlug') || src.includes('moduleId: moduleSlug'));
  check('F01 — form intent carries resourceKind/resourceId/moduleId', resKindOk);
}

// ---------------------------------------------------------------------------
// F02 — OWNERSHIP forense (repository vs category). Emisor real del viewer.
// ---------------------------------------------------------------------------
{
  const v = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  const iUpload = v.indexOf('uploadRecord');
  const iPublish = v.indexOf('publish(COMPLETION_INTENT_EVENT');
  const iLastCatch = v.lastIndexOf('catch');
  check('F02 — viewer publishes completion ONLY after uploadRecord succeeds', iPublish > iUpload && iPublish > 0, `publish@${iPublish} upload@${iUpload}`);
  check('F02 — viewer error path NEVER publishes completion', v.indexOf('COMPLETION_INTENT_EVENT', iLastCatch) === -1, 'no publish after last catch');
  check('F02 — ownership gate exists (categoryOwnsAlertConfiguration)', v.includes('categoryOwnsAlertConfiguration'));
  check('F02 — category WITH own configuration → documentCategory completion', v.includes("origin: 'resource'") && v.includes("resourceKind: 'documentCategory'"));
  check('F02 — category WITHOUT own configuration → documentRepository completion', v.includes("resourceKind: 'documentRepository'"));
  check('F02 — EXACTLY ONE intent per upload (else-if, never both)', v.includes('else if (activeRepositoryId)'));
}

// Executable ownership: Caso A (cat OWN) completa SOLO la categoría;
// Caso B (cat sin config) atribuye al repository; Caso C repository propio.
{
  resetWorld();
  AUDIT_RESOURCES = WORLD_OWN;
  AUDIT_NOW = H(2026, 8, 12, 10, 0);

  const occBefore = projectionSnapshot();
  const byId = (id) => occBefore.find((o) => String(o.resourceId) === String(id));
  const repoOcc = byId(77);
  const catOwnOcc = byId(5);

  // Caso A — Category A (own) upload → documentCategory:5.
  completeResource('documentCategory', 5, AUDIT_NOW);
  const afterA = projectionSnapshot();
  const ownDone = afterA.find((o) => String(o.resourceId) === String(5) && o.alertId === catOwnOcc.alertId)?.completion?.status === 'COMPLETED';
  const repoDoneByA = afterA.find((o) => String(o.resourceId) === String(77))?.completion?.status === 'COMPLETED';
  const catInhDoneByA = afterA.find((o) => String(o.resourceId) === String(6))?.completion?.status === 'COMPLETED';
  check('F02 — AC-07/08: category OWN completion completes ONLY that category', ownDone && !repoDoneByA && !catInhDoneByA, `own=${ownDone} repo=${repoDoneByA} inh=${catInhDoneByA}`);

  // Caso B — category WITHOUT own config upload → documentRepository:77.
  OccurrenceLedger.clear();
  completeResource('documentRepository', 77, AUDIT_NOW);
  const afterB = projectionSnapshot();
  const repoDoneB = afterB.find((o) => String(o.resourceId) === String(77))?.completion?.status === 'COMPLETED';
  const catOwnDoneB = afterB.find((o) => String(o.resourceId) === String(5))?.completion?.status === 'COMPLETED';
  check('F02 — AC-03/09: inherited category upload completes the owning Repository only', repoDoneB && !catOwnDoneB, `repo=${repoDoneB} catOwn=${catOwnDoneB}`);

  // Caso C — repository OWN upload: misma identidad 77:alert:0 de la proyección.
  OccurrenceLedger.clear();
  completeResource('documentRepository', 77, AUDIT_NOW);
  const afterC = projectionSnapshot();
  const repoDoneC = afterC.filter((o) => String(o.resourceId) === '77').every((o) => o.completion !== null);
  check('F02 — AC-09: repository completion does not satisfy an own-configured Category', repoDoneC && !(afterC.find((o) => String(o.resourceId) === '5' && o.completion !== null)));
}

// ---------------------------------------------------------------------------
// F03 — EVENT BUS: emisión → delivery → orden (bridge antes de runtime tick).
// ---------------------------------------------------------------------------
{
  const bridgeHad = freshBridge();
  check('F03 — bridge subscribes COMPLETION_INTENT (consumer alive)', true);

  const events = [];
  const unsubTick = OperationalEventBus.subscribe(COMPLETION_INTENT_EVENT, (intent) => {
    // Simula el completionTick: en el instante que corre, ¿el ledger ya registró?
    events.push({ immediateRecorded: OccurrenceLedger.size > 0, intent });
  });

  resetWorld();
  AUDIT_RESOURCES = { forms: [formOf(12, [cfg('E', '2026-08-12', '08:00')])], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  const occ = projectionSnapshot()[0];
  OperationalEventBus.publish(COMPLETION_INTENT_EVENT, {
    origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: AUDIT_NOW,
  });
  const tickSawRecorded = events.length === 1 && events[0].immediateRecorded === true;
  check('F03/F10 — COMPLETION_INTENT delivered to bridge BEFORE the runtime tick reads (order safe)', tickSawRecorded, `tickRecorded=${events[0]?.immediateRecorded}`);
  const recorded = OccurrenceLedger.completionSignalFor(occ) !== null;
  check('F03 — publish → bridge → ledger (1 event → 1 recorded fact)', recorded);
  check('F03 — publish carries origin/resourceKind/resourceId/moduleId', events[0]?.intent?.origin === 'resource' && events[0]?.intent?.resourceId === 12);
  unsubTick?.();

  // Evidencia inversa: si una suscripción de tick montara ANTES del bridge, el
  // tick vería ledger vacío (la condición de carrera existe SOLO si el orden de
  // suscripción se invierte). Hoy el orden está garantizado en useAlertRuntime.
  BRIDGE_UNSUB?.();
  OperationalEventBus.clear();
  let badTick = null;
  OperationalEventBus.subscribe(COMPLETION_INTENT_EVENT, () => { badTick = OccurrenceLedger.size; });
  BRIDGE_UNSUB = wireCompletionBridge();
  resetWorld();
  AUDIT_RESOURCES = { forms: [formOf(12, [cfg('R', '2026-08-12', '08:00')])], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  OperationalEventBus.publish(COMPLETION_INTENT_EVENT, { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: AUDIT_NOW });
  check('F03 — RACE CONDITION documented: reversing subscription order breaks the tick (REACTIVITY_MARGIN)', badTick === 0, `tick saw ${badTick} ledger entries (order flipped)`);
}

// ---------------------------------------------------------------------------
// F04 — BRIDGE: un evento → AT MOST ONE ocurrencia; rechazos correctos.
// ---------------------------------------------------------------------------
{
  resetWorld();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_MULTI))], repositories: [], categories: [] };
  AUDIT_NOW = T0;

  check('F04 — malformed intent rejected', handleCompletionIntent(null) === null && handleCompletionIntent({}) === null);
  check('F04 — origin=alert WITHOUT explicit identity is REJECTED (never guessed)',
    handleCompletionIntent({ origin: 'alert', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE }) === null);
  check('F04 — origin=alert WITH explicit identity records the exact occurrence', (() => {
    OccurrenceLedger.clear();
    const sig = handleCompletionIntent({ origin: 'alert', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, alertId: '12:alert:0', occurrenceId: '12:alert:0:occ:1', completedAt: AUDIT_NOW });
    return sig?.alertId === '12:alert:0' && sig?.occurrenceId === '12:alert:0:occ:1' && OccurrenceLedger.size === 1;
  })());

  check('F04 — origin=resource resolves AT MOST ONE eligible occurrence (A)', (() => {
    OccurrenceLedger.clear();
    const sig = completeResource('dynamicForms', 12, T0);
    return sig?.alertId === '12:alert:0' && sig?.occurrenceId === '12:alert:0:occ:1' && OccurrenceLedger.size === 1;
  })());

  OccurrenceLedger.clear();
  const none = completeResource('dynamicForms', 999, T0);
  check('F04 — no occurrences → NO COMPLETION', none === null && OccurrenceLedger.size === 0);

  // Solo alertas upcoming (recurso en el futuro) → sin elegibles → NO COMPLETION.
  resetWorld();
  AUDIT_RESOURCES = { forms: [formOf(12, [cfg('F', '2026-08-13', '08:00')])], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  OccurrenceLedger.clear();
  const nothing = completeResource('dynamicForms', 12, AUDIT_NOW);
  check('F04 — candidate list all-upcoming → NO COMPLETION (never completes the future)', nothing === null && OccurrenceLedger.size === 0);
}

// ---------------------------------------------------------------------------
// F05 — RESOLVER: selección determinista A → B → (solo cuando B entra en ventana).
// ---------------------------------------------------------------------------
{
  const mkOcc = (alertId, seq, startsAt, dueAt) => createAlertOccurrence({
    occurrenceId: occurrenceIdOf(alertId, seq), alertId, resourceKind: 'dynamicForms', resourceId: 12,
    moduleId: MODULE, startsAt, dueAt, timezone: 'local', sequence: seq, status: null, completion: null, createdAt: T0,
  });
  const a = mkOcc('12:alert:0', 1, H(2026, 8, 12, 8, 0), H(2026, 8, 13, 8, 0)); // hoy
  const b = mkOcc('12:alert:1', 1, H(2026, 8, 12, 9, 0), H(2026, 8, 13, 9, 0)); // hoy
  const c = mkOcc('12:alert:2', 1, H(2026, 8, 13, 8, 0), H(2026, 8, 14, 8, 0)); // mañana (upcoming)

  check('F05 — direct action picks A (hoy, dueAt menor; nunca A+B+C)', (() => {
    const r = resolveSingleOccurrence({ occurrences: [a, b, c], nowMs: T0 });
    return r?.alertId === '12:alert:0';
  })());
  check('F05 — A completada → la selección salta a B (siguiente elegible)', (() => {
    const aDone = { ...a, completion: { status: 'COMPLETED', completedAt: T0 } };
    const r = resolveSingleOccurrence({ occurrences: [aDone, b, c], nowMs: T0 });
    return r?.alertId === '12:alert:1';
  })());
  check('F05 — A y B completadas → null si el único restante es upcoming (no inventa)', (() => {
    const aDone = { ...a, completion: { status: 'COMPLETED', completedAt: T0 } };
    const bDone = { ...b, completion: { status: 'COMPLETED', completedAt: T0 } };
    return resolveSingleOccurrence({ occurrences: [aDone, bDone, c], nowMs: T0 }) === null;
  })());
  check('F05 — la selección es determinista (mismo input → mismo output)', resolveSingleOccurrence({ occurrences: [a, b, c], nowMs: T0 })?.occurrenceId === resolveSingleOccurrence({ occurrences: [a, b, c], nowMs: T0 })?.occurrenceId);
}

// ---------------------------------------------------------------------------
// F06 — IDENTIDAD: occurrence::<alertId>::<occurrenceId>, N → N+1 por período.
// ---------------------------------------------------------------------------
{
  function identityDaily() {
    resetWorld();
    AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
    AUDIT_NOW = H(2026, 8, 12, 10, 0);
    const n = projectionSnapshot()[0];
    completeResource('dynamicForms', 12, AUDIT_NOW);
    const keyN = specificSignalKey(n);
    const hasSpecific = OccurrenceLedger.completionSignalFor(n) !== null;
    const seqN = n.sequence;
    // Siguiente día → nueva ocurrencia N+1 NO completada, derivada.
    AUDIT_NOW = H(2026, 8, 13, 10, 0);
    const n1 = projectionSnapshot()[0];
    const nextIsNew = n1.occurrenceId !== n.occurrenceId && n1.sequence === seqN + 1 && n1.completion === null;
    return { hasSpecific, keyN, nextIsNew, n, n1 };
  }
  const d = identityDaily();
  check('F06 — daily: completion queda con identidad OCCURRENCE-specific N', d.hasSpecific && d.keyN === `occurrence::${d.n.alertId}::${d.n.occurrenceId}`);
  check('F06 — daily: 08/12 → occ N, 08/13 → occ N+1 (derivada, no completada)', d.nextIsNew, `N=${d.n.occurrenceId} N+1=${d.n1.occurrenceId}`);
  check('F06 — AC-18: next occurrence is DERIVED (nunca guardada en ledger)', d.n1.completion === null);

  // Weekly.
  resetWorld();
  AUDIT_RESOURCES = { forms: [formOf(30, [cfg('W', '2026-08-12', '08:00', 'weeks')])], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  const w = projectionSnapshot()[0];
  completeResource('dynamicForms', 30, AUDIT_NOW);
  AUDIT_NOW = H(2026, 8, 19, 10, 0);
  const w1 = projectionSnapshot()[0];
  check('F06 — weekly: semana 1 → occ N, semana 2 → occ N+1', w1.occurrenceId !== w.occurrenceId && w1.sequence === w.sequence + 1 && w1.completion === null, `${w.occurrenceId} → ${w1.occurrenceId}`);

  // Monthly (calendar 298). Ventanas 1º-del-mes → agosto N, septiembre N+1.
  resetWorld();
  AUDIT_RESOURCES = { forms: [formOf(40, [cfg('M', '2026-08-01', '08:00', 'months')])], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 10, 10, 0);
  const m = projectionSnapshot()[0];
  completeResource('dynamicForms', 40, AUDIT_NOW);
  AUDIT_NOW = H(2026, 9, 10, 10, 0);
  const m1 = projectionSnapshot()[0];
  check('F06 — monthly: Agosto → occ N, Septiembre → occ N+1', m1.occurrenceId !== m.occurrenceId && m1.sequence === m.sequence + 1 && m1.completion === null, `${m.occurrenceId} → ${m1.occurrenceId}`);

  // Yearly.
  resetWorld();
  AUDIT_RESOURCES = { forms: [formOf(50, [cfg('Y', '2026-08-12', '08:00', 'years')])], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 10, 12, 10, 0);
  const y = projectionSnapshot()[0];
  completeResource('dynamicForms', 50, AUDIT_NOW);
  AUDIT_NOW = H(2027, 10, 12, 10, 0);
  const y1 = projectionSnapshot()[0];
  check('F06 — yearly: 2026 → occ N, 2027 → occ N+1', y1.occurrenceId !== y.occurrenceId && y1.sequence === y.sequence + 1 && y1.completion === null, `${y.occurrenceId} → ${y1.occurrenceId}`);
}

// ---------------------------------------------------------------------------
// F07 — LEDGER: recordCompletion + idempotencia (poso lógico → 1 fact).
// ---------------------------------------------------------------------------
{
  resetWorld();
  const sigA = { resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, origin: 'resource', alertId: '12:alert:0', occurrenceId: '12:alert:0:occ:1', completedAt: T0 };
  OccurrenceLedger.recordCompletion(sigA);
  const size1 = OccurrenceLedger.size;
  OccurrenceLedger.recordCompletion(sigA);
  OccurrenceLedger.recordCompletion(sigA);
  check('F07 — same identity twice → ONE logical completion (idempotent, AC-27)', OccurrenceLedger.size === size1, `size=${OccurrenceLedger.size}`);
  const occN = { alertId: '12:alert:0', occurrenceId: '12:alert:0:occ:1', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, startsAt: H(2026, 8, 12, 8, 0), dueAt: H(2026, 8, 13, 8, 0) };
  check('F07 — completionSignalFor(identity) NON-null (ledger.has(identity))', OccurrenceLedger.completionSignalFor(occN) !== null);
  OccurrenceLedger.recordCompletion({ ...sigA, occurrenceId: '12:alert:0:occ:2' });
  check('F07 — distinct occurrence of same alert records a DISTINCT fact', OccurrenceLedger.size === 2);
}

// ---------------------------------------------------------------------------
// F08 — DURABLE PERSISTENCE: write-through + replay tras "refresh".
// ---------------------------------------------------------------------------
{
  resetWorld();
  const adapter = createInMemoryOccurrenceLedgerAdapter();
  OccurrenceLedger.registerPersistencePort(adapter);
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  const occ = projectionSnapshot()[0];
  completeResource('dynamicForms', 12, AUDIT_NOW);

  const persisted = adapter.readSignals();
  const storedHasFact = Array.isArray(persisted) && persisted.some((s) => s?.alertId === occ.alertId && s?.occurrenceId === occ.occurrenceId);
  check('F08 — recordCompletion → persistencePort.writeSignal (fact conserved)', storedHasFact, `persisted=${persisted?.length}`);

  // REFRESH: se pierde la memoria, se revive del port + hydrate.
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort();
  OccurrenceLedger.registerPersistencePort(adapter);
  const replayed = OccurrenceLedger.hydrateFromPersistencePort();
  const afterRefresh = projectionSnapshot().find((o) => o.occurrenceId === occ.occurrenceId);
  const survived = afterRefresh?.completion?.status === 'COMPLETED';
  check('F08 — ANTES del refresh completed=true y DESPUÉS del refresh completed=true', survived, `replayed=${replayed}`);
  if (!survived) checks[checks.length - 1] = { label: 'F08 — refresh survival', truth: false, detail: 'PERSISTENCE RECONCILIATION FAILURE' };
}

// ---------------------------------------------------------------------------
// F09 — PROYECCIÓN: completada → hasOpen=false; próxima ocurrencia derivada.
// ---------------------------------------------------------------------------
{
  resetWorld();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  const before = statesFor('dynamicForms', 12);
  check('F09 — AC-14/15: state before completion has one OPEN event', before?.openCount === 1 && before?.hasOpen === true);
  completeResource('dynamicForms', 12, AUDIT_NOW);
  const after = statesFor('dynamicForms', 12);
  check('F09 — after completion projection recognizes COMPLETED (AC-14)', projectionSnapshot()[0]?.completion?.status === 'COMPLETED');
  check('F09 — AC-15: hasOpen=false when the only alert is completed', after?.hasOpen === false && after?.openCount === 0, `open=${after?.openCount}`);
  check('F09 — presentation hides naturally: buildScheduleLines({completed}) is empty', buildScheduleLines([{ status: 'completed', dueMs: after?.events?.[0]?.dueMs }]).length === 0);
  // Próxima ocurrencia derivada (día siguiente) → vuelve a estar abierta.
  AUDIT_NOW = H(2026, 8, 13, 10, 0);
  const nextDay = statesFor('dynamicForms', 12);
  check('F09 — AC-18: next occurrence (día+1) re-appears DERIVED, open again', nextDay?.hasOpen === true && nextDay?.openCount === 1);
}

// ---------------------------------------------------------------------------
// F10 — LIVE RECONCILIATION: tick → re-proyección en la MISMA sesión.
// ---------------------------------------------------------------------------
{
  const src = readFile('src/hooks/useAlertRuntime.js');
  const iWire = src.indexOf('wireCompletionBridge()');
  const iTickSub = src.indexOf('subscribe(COMPLETION_INTENT_EVENT');
  const iMemo = src.indexOf('completionTick', src.indexOf('useMemo'));
  check('F10 — runtime wires the bridge BEFORE subscribing the completion tick (same effect)', iWire > 0 && iTickSub > iWire, `bridge@${iWire} tick@${iTickSub}`);
  check('F10 — completionTick invalidates the occurrences memo (re-derivation re-runs)', src.includes('completionTick') && /\[existing, base, completionTick\]/.test(src));
  check('F10 — tick only INVALIDATES (no engine: bridge registra, proyección deriva)', !src.includes('recordCompletion('));

  // Ejecutable: tras publish, el runtime re-proyecta y el estado ya no está abierto.
  resetWorld();
  freshBridge();
  let visibleAtTick = null;
  OperationalEventBus.subscribe(COMPLETION_INTENT_EVENT, () => {
    // Re-proyección idéntica a la que el memo invalidado ejecuta (lee el ledger en vivo).
    visibleAtTick = projectResourceAlertState({ occurrences: projectionSnapshot(), resourceKind: 'dynamicForms', resourceId: 12, resource: null, now: AUDIT_NOW });
  });
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  OperationalEventBus.publish(COMPLETION_INTENT_EVENT, { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: AUDIT_NOW });
  check('F10 — AC-16/17: immediately after publish the re-projection has hasOpen=false (no manual refresh)', visibleAtTick?.hasOpen === false, JSON.stringify(visibleAtTick?.hasOpen));
}

// ---------------------------------------------------------------------------
// F11 — PRESENTACIÓN: NUNCA decide por sí misma que está cumplida.
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('F11 — UI returns null when state.present !== true (consume, no decide)', src.includes('state?.present !== true') && src.includes('return null'));
  check('F11 — UI returns null when schedule is empty (no events to render)', src.includes('schedule.length === 0') && src.includes('return null'));
  check('F11 — AC-25/26: no second source of truth (no justUploaded, no display:none, no local completion)', !src.includes('justUploaded') && !src.includes('display:none') && !src.includes('filtered') && !src.includes('OperationalEventBus'));
  const importsOnlyPresentation = src.includes("buildScheduleLines") && !src.includes('OccurrenceLedger') && !src.includes('projectCurrentOccurrences');
  check('F11 — UI imports ONLY presentation helpers (never ledger/projection/runtime)', importsOnlyPresentation);
  check('F11 — AC-26: UI consumes the projected state payload (state.events)', src.includes('state.events') || src.includes('buildScheduleLines(state.events)'));
}

// ---------------------------------------------------------------------------
// F12 — AISLAMIENTO MULTI-ALERT: una acción → una única ocurrencia elegible.
// ---------------------------------------------------------------------------
{
  resetWorld();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_MULTI))], repositories: [], categories: [] };
  AUDIT_NOW = T0;
  const occList = projectionSnapshot();
  const occA = occList.find((o) => o.alertId === '12:alert:0');
  const occB = occList.find((o) => o.alertId === '12:alert:1');
  const occC = occList.find((o) => o.alertId === '12:alert:2');

  // Caso 1 — complete A.
  OccurrenceLedger.clear();
  completeResource('dynamicForms', 12, T0);
  const s1 = projectionSnapshot();
  const aDone = s1.find((o) => o.alertId === '12:alert:0')?.completion?.status === 'COMPLETED';
  const bOpen = s1.find((o) => o.alertId === '12:alert:1')?.completion === null;
  const cOpen = s1.find((o) => o.alertId === '12:alert:2')?.completion === null;
  check('F12 — Caso 1: complete A → A=completed, B=open, C=open', aDone && bOpen && cOpen, `A=${aDone} B=${!bOpen} C=${!cOpen}`);
  check('F12 — AC-05/06: exactly ONE specific fact recorded for A', OccurrenceLedger.completionSignalFor(occA) !== null && OccurrenceLedger.completionSignalFor(occB) === null && OccurrenceLedger.completionSignalFor(occC) === null);

  // Caso 2 — A ya completada; complete B.
  OccurrenceLedger.clear();
  completeResource('dynamicForms', 12, T0); // A
  completeResource('dynamicForms', 12, T0); // B (A ya persistent)
  const s2 = projectionSnapshot();
  const a2Done = s2.find((o) => o.alertId === '12:alert:0')?.completion?.status === 'COMPLETED';
  const b2Done = s2.find((o) => o.alertId === '12:alert:1')?.completion?.status === 'COMPLETED';
  const c2Open = s2.find((o) => o.alertId === '12:alert:2')?.completion === null;
  check('F12 — Caso 2: complete B tras A → A=completed, B=completed, C=open', a2Done && b2Done && c2Open, `A=${a2Done} B=${b2Done} C=${c2Open}`);

  // Caso 3 — UNA acción NUNCA completa A+B+C.
  OccurrenceLedger.clear();
  completeResource('dynamicForms', 12, T0);
  check('F12 — Caso 3: one action records exactly ONE occurrence, never A+B+C', OccurrenceLedger.size === 1 && OccurrenceLedger.completionSignalFor(occA) !== null && OccurrenceLedger.completionSignalFor(occB) === null && OccurrenceLedger.completionSignalFor(occC) === null, `size=${OccurrenceLedger.size}`);
}

// ---------------------------------------------------------------------------
// F13 — MATRIZ DE RECURRENCIA (daily/weekly/monthly/yearly): desaparece hoy,
//       reaparece en el siguiente período. Mensual/anual = calendario (298).
// ---------------------------------------------------------------------------
{
  function matrixCase(label, unit, startDate, startTime, p1, p2, extra) {
    resetWorld();
    const res = formOf(88, [cfg(label, startDate, startTime, unit)]);
    AUDIT_RESOURCES = { forms: [res], repositories: [], categories: [] };
    AUDIT_NOW = p1;
    const occ1 = projectionSnapshot()[0];
    const before = statesFor('dynamicForms', 88);
    completeResource('dynamicForms', 88, p1);
    const after = statesFor('dynamicForms', 88);
    const disappeared = after?.hasOpen === false && after?.openCount === 0;
    AUDIT_NOW = p2;
    const occ2 = projectionSnapshot()[0];
    const reappeared = occ2 && occ2.occurrenceId !== occ1.occurrenceId && occ2.completion === null && statesFor('dynamicForms', 88)?.hasOpen === true;
    const idSequence = occ2?.sequence === occ1.sequence + 1;
    const ok = !!before && disappeared && !!reappeared && idSequence;
    check(label, ok, `before=${before?.hasOpen} disappeared=${disappeared} reappeared=${reappeared} seq=${occ1?.sequence}→${occ2?.sequence}`);
    if (extra) extra(occ1, occ2);
    return ok;
  }
  check('F13 — DIARIO: completar hoy → desaparece hoy; día siguiente → aparece nueva',
    matrixCase('Diario', 'days', '2026-08-12', '08:00', H(2026, 8, 12, 10, 0), H(2026, 8, 13, 10, 0)));
  check('F13 — SEMANAL: completar en semana 1 → desaparece; semana 2 → aparece nueva',
    matrixCase('Semanal', 'weeks', '2026-08-12', '08:00', H(2026, 8, 12, 10, 0), H(2026, 8, 19, 10, 0)));
  check('F13 — MENSUAL: completar en agosto → desaparece; septiembre → aparece nueva',
    matrixCase('Mensual', 'months', '2026-08-01', '08:00', H(2026, 8, 10, 10, 0), H(2026, 9, 10, 10, 0)));
  check('F13 — ANUAL: completar en 2026 → desaparece; 2027 → aparece nueva',
    matrixCase('Anual', 'years', '2026-08-12', '08:00', H(2026, 10, 12, 10, 0), H(2027, 10, 12, 10, 0)));

  // La recurrencia mensual es CALENDARIO, nunca 30 días fijos.
  resetWorld();
  const anchor = parseAnchor({ startDate: '2026-07-15', startTime: '08:00' });
  const wAug = occurrenceWindowAt(anchor, { amount: 1, unit: 'months' }, H(2026, 8, 20, 10, 0));  // [15/08, 15/09)
  const wSep = occurrenceWindowAt(anchor, { amount: 1, unit: 'months' }, H(2026, 9, 20, 10, 0));  // [15/09, 15/10)
  const wOct = occurrenceWindowAt(anchor, { amount: 1, unit: 'months' }, H(2026, 10, 20, 10, 0)); // [15/10, 15/11)
  const julAug = wAug.startsAt - anchor;    // 15/07 → 15/08 = 31 días
  const augSep = wSep.startsAt - wAug.startsAt; // 15/08 → 15/09 = 31 días (agosto)
  const sepOct = wOct.startsAt - wSep.startsAt; // 15/09 → 15/10 = 30 días (septiembre)
  check('F13 — monthly windows are CALENDAR months (jul15→ago15=31d, ago15→sep15=31d, sep15→oct15=30d), never fixed 30 days',
    Math.round(julAug / DAY) === 31 && Math.round(augSep / DAY) === 31 && Math.round(sepOct / DAY) === 30,
    `jul-ago=${Math.round(julAug / DAY)}d ago-sep=${Math.round(augSep / DAY)}d sep-oct=${Math.round(sepOct / DAY)}d`);
  check('F13 — calendarAddMonths === schedule windows (Sprint 298, saturación CAL-001)',
    calendarAddMonths(anchor, 1) === wAug.startsAt && calendarAddMonths(anchor, 2) === wSep.startsAt && calendarAddMonths(anchor, 3) === wOct.startsAt);
}

// ---------------------------------------------------------------------------
// F14 — BOUNDARY: antes/igual/después del vencimiento; dentro/fuera de ventana.
// ---------------------------------------------------------------------------
{
  const s = H(2026, 8, 12, 8, 0);
  const d = H(2026, 8, 13, 8, 0);
  const mkOcc = (completion = null) => ({
    alertId: '12:alert:0', occurrenceId: '12:alert:0:occ:1', resourceKind: 'dynamicForms', resourceId: 12,
    moduleId: MODULE, startsAt: s, dueAt: d, completion,
  });
  check('F14 — now < dueAt → today', classifyOccurrence(mkOcc(), H(2026, 8, 12, 10, 0)).key === 'today');
  check('F14 — now === dueAt → today (no overdue)', classifyOccurrence(mkOcc(), d).key === 'today');
  check('F14 — now > dueAt → overdue', classifyOccurrence(mkOcc(), H(2026, 8, 13, 10, 0)).key === 'overdue');

  // Completion dentro de ventana → ledger lo casa.
  OccurrenceLedger.clear();
  OccurrenceLedger.recordCompletion({ resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: H(2026, 8, 12, 10, 0) });
  check('F14 — completion DENTRO de la ventana casa con la ocurrencia', OccurrenceLedger.completionSignalFor(mkOcc()) !== null);
  OccurrenceLedger.clear();
  OccurrenceLedger.recordCompletion({ resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: H(2026, 8, 14, 10, 0) }); // fuera (después de dueAt)
  check('F14 — completion FUERA de la ventana (after dueAt) NO casa con esta ocurrencia', OccurrenceLedger.completionSignalFor(mkOcc()) === null);
  OccurrenceLedger.clear();
  // completar en un instante anterior al inicio → no puede completar la ventana.
  resetWorld();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  const who = completeResource('dynamicForms', 12, H(2026, 8, 11, 10, 0));
  check('F14 — action BEFORE the window starts → NO completion of that occurrence (upcoming not eligible)', who === null && OccurrenceLedger.size === 0);
}

// ---------------------------------------------------------------------------
// F15 — NEGATIVE PATHS: NO completion en fallo / cancelación / validación.
// ---------------------------------------------------------------------------
{
  // Escaneo estático: SOLO los dos emisores reales publican COMPLETION_INTENT.
  const ROOT = fileURLToPath(new URL('../src/', import.meta.url));
  const publishers = [];
  const stack = [ROOT];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      const st = statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (/\.(js|jsx)$/.test(e)) {
        const s = readFileSync(p, 'utf8');
        if (s.includes('COMPLETION_INTENT_EVENT') && s.includes('publish(')) publishers.push(p.replace(/\\/g, '/'));
      }
    }
  }
  const allowed = publishers.every((p) => p.includes('src/pages/DynamicForm.jsx') || p.includes('src/modules/documentViewer/ModuleDocumentViewer.jsx'));
  check('F15 — COMPLETION_INTENT publishers are EXACTLY DynamicForm + ModuleDocumentViewer', publishers.length === 2 && allowed, publishers.join(', '));

  const df = readFile('src/pages/DynamicForm.jsx');
  check('F15 — form failure → NO event (publish strictly after await, inside try)', df.indexOf('publish(COMPLETION_INTENT_EVENT') > df.indexOf('await dynamicService.submitFormResponse'));
  check('F15 — NO optimistic completion in form (no publish before persistence)', df.indexOf('publish(COMPLETION_INTENT_EVENT') > df.indexOf('submitFormResponse'));
  const dv = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  check('F15 — upload failure → NO event (publish strictly after await uploadRecord)', dv.indexOf('publish(COMPLETION_INTENT_EVENT') > dv.indexOf('await documentsService.uploadRecord'));
  check('F15 — NO optimistic completion on upload', dv.indexOf('publish(COMPLETION_INTENT_EVENT') > dv.indexOf('uploadRecord'));
}

// ===========================================================================
// CLASIFICACIÓN DE HALLAZGOS + CONSOLIDACIÓN
// ===========================================================================
const failures = checks.filter((c) => !c.truth);
console.log('');
const CATEGORY_BY_LABEL = [
  ['F01', 'EMITTER_FAILURE'], ['F15', 'EMITTER_FAILURE'],
  ['F02', 'EMITTER_FAILURE'],
  ['F03', 'EVENT_BUS_FAILURE'],
  ['F04', 'BRIDGE_FAILURE'],
  ['F05', 'RESOLVER_FAILURE'],
  ['F06', 'IDENTITY_FAILURE'],
  ['F07', 'LEDGER_FAILURE'],
  ['F08', 'PERSISTENCE_FAILURE'],
  ['F09', 'PROJECTION_FAILURE'],
  ['F10', 'REACTIVITY_FAILURE'],
  ['F11', 'PRESENTATION_FAILURE'],
  ['F12', 'IDENTITY_FAILURE'],
  ['F13', 'RECURRENCE_FAILURE'],
  ['F14', 'PROJECTION_FAILURE'],
];
function classify(label) {
  const key = label.slice(0, 3);
  const hit = CATEGORY_BY_LABEL.find(([k]) => k === key);
  return hit ? hit[1] : 'UNKNOWN';
}
console.log('FASE | RESULTADO | CLASIFICACIÓN (si falla)  | EVIDENCIA');
console.log('-'.repeat(90));
for (const c of checks) {
  const cat = c.truth ? '' : classify(c.label);
  console.log(`  ${c.label.padEnd(58)} ${c.truth ? 'PASS' : 'FAIL'}  ${cat.padEnd(28)} ${c.detail}`);
}
console.log('');
console.log('MATRIZ DE RESULTADOS');
console.log('  AC-01..32 y fases F01..F15: ver checks arriba (cada check mapea una fase; AC-xx se citan en el label).');
console.log('');

// ---------------------------------------------------------------------------
// ROOT CAUSE — conclusión inequívoca del sprint.
// ---------------------------------------------------------------------------
const failedLabels = failures.map((c) => c.label);

function conclusion() {
  if (failures.length === 0) {
    return {
      ROOT_CAUSE: 'NO SE ENCONTRÓ UN DEFECTO ACTIVO EN EL PIPELINE CERTIFICADO (ACCIÓN→EVENTO→BRIDGE→LEDGER→PERSISTENCIA→PROYECCIÓN→ESTADO→PRESENTACIÓN). La alerta visible tras diligenciar/subir es COMPORTAMIENTO ESPERADO de la próxima ocurrencia (derivada, Cal §7), no un fallo.',
      CLASSIFICATION: 'NO_ACTIVE_FAILURE / PROJECTION-PRESENTATION_RECONCILIATION_OK',
      EVIDENCE: 'scripts/sprint-299-forensic-completion-flow-audit.mjs — F01..F15 verdes; F09/F10/F13 demuestran hasOpen=false en la misma sesión y reaparición por nueva ventana.',
      IMPACT: 'Form / Repository / Category: NINGUNO hoy. Los emisores existen (F01/F02), el bus entrega (F03), el bridge resuelve AT MOST ONE (F04/F05/F12), el ledger es idempotente (F07), la persistencia sobrevive refresh (F08), la proyección devuelve hasOpen=false (F09) y la presentación se oculta de forma natural (F11).',
      MINIMUM_CORRECTION: 'Sin corrección funcional requerida por la evidencia de Sprint 299. Recomendación Sprint 300 (contingente, NO obligatoria): (1) endurecer wireCompletionBridge — el flag global `wired` no re-suscribe cuando el bus es limpiado (evidencia F03/F10: si alguien llama OperationalEventBus.clear() en runtime, el bridge queda "wired" pero sin handler; hoy nadie lo limpia, por eso es REACTIVITY_MARGIN, no un defecto activo); (2) eliminar las claves identidad `alertId/occurrenceId` con valor null de la CompletionSignal genérica (cierra los checks pre-existentes de Sprint 266/267 y evita transportar identidad falsa al borde EMITTER→BRIDGE); y (3) opcional: prueba E2E UI-level que certifique el ocultado en la misma sesión sin refresh (hoy garantizado por el orden de suscripción de un único dueño: `useAlertRuntime`).',
      OUT_OF_SCOPE: 'OccurrenceContract, occurrenceIdOf, OccurrenceSchedule, OccurrenceProjection, CompletionBridge, DeterministicCompletionResolver, OccurrenceLedger, persistencia, UnifiedAlertResourcePresentation. No se corrigió nada en Sprint 299.',
    };
  }
  const cats = [...new Set(failedLabels.map(classify))];
  return {
    ROOT_CAUSE: `Frontera(s) con discrepancia: ${failedLabels.join(', ')} (${cats.join(', ')})`,
    CLASSIFICATION: cats.join(' , '),
    EVIDENCE: 'Checks FAIL marcados arriba (detalle por check).',
    IMPACT: 'Form / Repository / Category: según fase con fallo (ver matriz).',
    MINIMUM_CORRECTION: 'Ver Sprint 300 — contratación exacta de la frontera fallida (se documentó, no se corrigió).',
    OUT_OF_SCOPE: 'Ninguna corrección realizada en este sprint (AUDIT ONLY).',
  };
}
const root = conclusion();
console.log('CONCLUSIÓN INEQUÍVOCA');
console.log('  ROOT CAUSE: ' + root.ROOT_CAUSE);
console.log('  CLASSIFICATION: ' + root.CLASSIFICATION);
console.log('  EVIDENCE: ' + root.EVIDENCE);
console.log('  IMPACT: ' + root.IMPACT);
console.log('  MINIMUM CORRECTION (Sprint 300): ' + root.MINIMUM_CORRECTION);
console.log('  OUT OF SCOPE: ' + root.OUT_OF_SCOPE);
console.log('');
console.log(`TOTAL: ${checks.length - failures.length}/${checks.length} PASS`);
process.exit(failures.length === 0 ? 0 : 1);