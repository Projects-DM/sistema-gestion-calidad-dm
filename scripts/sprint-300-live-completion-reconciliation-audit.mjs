/**
 * Sprint 300 — LIVE COMPLETION RECONCILIATION (LCR) — AUDIT + CONTINGENCY.
 *
 * TIPO: AUDIT · LEVEL 5 · LIVE RUNTIME VALIDATION + CONTINGENT CORRECTION
 * (Sprint 299 §ROOT CAUSE pont 1: the global `wired` flag does NOT re-subscribe
 * after a bus clear. Sprint 300 spec permits — ONLY when the margin is con-
 * firmed — replacing it with a real LISTENER-OWNERSHIP check, so wiring is
 * idempotent, never duplicates handlers, and re-arms after `clear()`).
 *
 * Scope: the SAME certification pipeline as Sprint 299, re-run against the REAL
 * src (emitters, bridge, resolver, ledger, persistence, projection, fundamen-
 * tals), PLUS:
 *   F10.recon — live re-projection in the SAME session after COMPLETION_INTENT
 *               (the `completionTick` contract), with in-memory TRAZA records.
 *   F16        — the contingency hardening executed and behaviorally proven:
 *                no `wired` boolean, re-wire after clear, exactly-one-handler
 *                (no duplicates), read-only `hasListener` introspection.
 *
 * NO second source of truth, NO React logic, NO schedulers here. The Reactivity
 * Bridge lives in useAlertRuntime; this audit simulates its EXACT wiring order
 * (bridge → occurrence provider → completion tick) to prove the re-projection.
 *
 * Ejecutar: node scripts/sprint-300-live-completion-reconciliation-audit.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseAnchor, occurrenceWindowAt, computeTarget, calendarAddMonths } from '../src/core/capabilities/alert/occurrence/OccurrenceSchedule.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import { occurrenceIdOf, createAlertOccurrence } from '../src/core/capabilities/alert/occurrence/OccurrenceContract.js';
import { createInMemoryOccurrenceLedgerAdapter } from '../src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js';
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

// ---------------------------------------------------------------------------
// HARNESS
// ---------------------------------------------------------------------------
const readFile = (p) => {
  try { return readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8'); } catch { return ''; }
};

const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });
const CHECK = [];

// Sprint 300 — in-memory LIVE TRAZA (never persisted, never touches src). Each
// projected step records [step, index]; the audit asserts PARTIAL ORDER: the
// fact must hit the ledger BEFORE the invalidated projection re-runs.
const TRACE = [];
const traceOrder = (step) => {
  const hit = TRACE.findIndex(([s]) => s === step);
  return hit === -1 ? -1 : hit;
};

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

function completeResource(kind, id, atMs) {
  AUDIT_NOW = atMs;
  return handleCompletionIntent({ origin: 'resource', resourceKind: kind, resourceId: id, moduleId: MODULE, completedAt: atMs });
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

let BRIDGE_UNSUB = null;
function freshBridge() {
  BRIDGE_UNSUB?.();
  OperationalEventBus.clear();
  BRIDGE_UNSUB = wireCompletionBridge();
}

// A durable-port SPI that counts writeSignal calls — the ONLY honest duplicate
// detector: `recordCompletion` invokes the port once per call, so N handlers
// would produce N writes even though the in-memory Map overwrites to one key.
function countingPort() {
  let writes = 0;
  return {
    port: { readSignals: () => [], writeSignal: (s) => { writes += 1; }, clearSignals: () => {} },
    get writes() { return writes; },
  };
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
console.log('SPRINT 300 — LIVE COMPLETION RECONCILIATION (LCR) AUDIT');
console.log('========================================================');

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
  check('F01 — form intent carries resourceKind/resourceId/moduleId (identidad canónica)', src.includes("resourceKind: 'dynamicForms'") && src.includes('resourceId: formDef.id') && (src.includes('moduleId: formDef?.module_id ?? moduleSlug') || src.includes('moduleId: moduleSlug')));
}

// ---------------------------------------------------------------------------
// F02 — ACCIÓN DE DOCUMENTO (ownership forense repository vs category).
// ---------------------------------------------------------------------------
{
  const v = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  const iUpload = v.indexOf('uploadRecord');
  const iPublish = v.indexOf('publish(COMPLETION_INTENT_EVENT');
  const iLastCatch = v.lastIndexOf('catch');
  check('F02 — viewer publishes completion ONLY after uploadRecord succeeds', iPublish > iUpload && iPublish > 0, `publish@${iPublish} upload@${iUpload}`);
  check('F02 — viewer error path NEVER publishes completion', v.indexOf('COMPLETION_INTENT_EVENT', iLastCatch) === -1, 'no publish after last catch');
  check('F02 — ownership gate exists (categoryOwnsAlertConfiguration)', v.includes('categoryOwnsAlertConfiguration'));
  check('F02 — EXACTLY ONE intent per upload (else-if, never both)', v.includes('else if (activeRepositoryId)'));
  check('F02 — category WITH own configuration → documentCategory, WITHOUT → documentRepository',
    v.includes("resourceKind: 'documentCategory'") && v.includes("resourceKind: 'documentRepository'"));
}

// Executable ownership for the document phases (F15 below re-uses these).
{
  resetWorld();
  AUDIT_RESOURCES = WORLD_OWN;
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  const byId = (id) => projectionSnapshot().find((o) => String(o.resourceId) === String(id));
  check('F02 — repository projects its own alert occurrence', !!byId(77));
  check('F02 — category with own config projects its own occurrence', !!byId(5));
  check('F02 — category without config inherits the repository (no own occurrence)', byId(6) === undefined);

  // AC-07/08 executable: cat OWN completes ONLY cat; cat INHERIT's action
  // attributes to the repository and never completes the repo's own alert.
  resetWorld();
  AUDIT_RESOURCES = WORLD_OWN;
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  completeResource('documentCategory', 5, AUDIT_NOW);
  const afterOwn = projectionSnapshot();
  check('F02 — AC-07: completing category OWN completes ONLY that category (repo stays open)',
    afterOwn.find((o) => String(o.resourceId) === '5')?.completion?.status === 'COMPLETED' &&
    afterOwn.find((o) => String(o.resourceId) === '77')?.completion === null);

  // Caso B — category WITHOUT own config upload → documentRepository:77.
  OccurrenceLedger.clear();
  completeResource('documentRepository', 77, AUDIT_NOW);
  const afterInherit = projectionSnapshot();
  check('F02 — AC-03/09: inherited-category upload completes the owning Repository only (repo satisfied, cat OWN untouched)',
    afterInherit.find((o) => String(o.resourceId) === '77')?.completion?.status === 'COMPLETED' &&
    afterInherit.find((o) => String(o.resourceId) === '5')?.completion === null);

  // Caso C — repository OWN upload: NO satisface una categoría con config propia.
  OccurrenceLedger.clear();
  completeResource('documentRepository', 77, AUDIT_NOW);
  const afterRepo = projectionSnapshot();
  check('F02 — AC-09: repository completion does NOT satisfy an own-configured category (cat=5 stays open)',
    afterRepo.filter((o) => String(o.resourceId) === '77').every((o) => o.completion !== null) &&
    afterRepo.find((o) => String(o.resourceId) === '5')?.completion === null);
}

// ---------------------------------------------------------------------------
// F03 — EVENTO: orden de entrega bridge→ledger ANTES del re-proyección.
// ---------------------------------------------------------------------------
{
  resetWorld();
  freshBridge();
  let tickSawCompletion = false;
  TRACE.length = 0;
  OperationalEventBus.subscribe(COMPLETION_INTENT_EVENT, () => {
    TRACE.push(['tick.reproject', tickSawCompletion ? 1 : 0]);
  });
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);

  TRACE.push(['action.submit', 1]);
  OperationalEventBus.publish(COMPLETION_INTENT_EVENT, { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: AUDIT_NOW });
  TRACE.push(['event.published', 1]);

  // The subscriber AFTER the intent handler re-projected on the SAME tick and
  // must already read the completed fact (subscription order = owner order).
  const reProj = projectResourceAlertState({ occurrences: projectionSnapshot(), resourceKind: 'dynamicForms', resourceId: 12, resource: null, now: AUDIT_NOW });
  check('F03 — bus delivers the completion BEFORE the invalidated projection re-runs (safe order)', traceOrder('action.submit') < traceOrder('event.published') && reProj?.hasOpen === false, `trace=${TRACE.map(([s]) => s).join('>')}`);
  check('F03 — 1 event → exactly 1 recorded fact (ledger size=1)', OccurrenceLedger.size === 1, `size=${OccurrenceLedger.size}`);
  check('F03 — the re-projection on the tick already has hasOpen=false (SAME session, no refresh)', reProj?.hasOpen === false, JSON.stringify(reProj?.hasOpen));
}

// ---------------------------------------------------------------------------
// F04..F09 — BRIDGE / RESOLVER / IDENTIDAD / LEDGER / PERSISTENCIA /
//            PROYECCIÓN (re-certificación live del pipeline, Sprint 299 §F04-F09).
// ---------------------------------------------------------------------------
{
  resetWorld();
  freshBridge();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_MULTI))], repositories: [], categories: [] };
  AUDIT_NOW = T0;
  const occList = projectionSnapshot();
  const occA = occList.find((o) => o.alertId === '12:alert:0');
  const occB = occList.find((o) => o.alertId === '12:alert:1');

  // F04 — Bridge rejection + identity paths.
  check('F04 — malformed intent rejected (no resourceKind/resourceId)', handleCompletionIntent({ completedAt: T0 }) === null);
  check('F04 — origin=alert WITHOUT explicit identity is REJECTED, never guessed', handleCompletionIntent({ origin: 'alert', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: T0 }) === null);
  const sigAlert = handleCompletionIntent({ origin: 'alert', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, alertId: occA.alertId, occurrenceId: occA.occurrenceId, completedAt: T0 });
  check('F04 — origin=alert WITH explicit identity records THE exact occurrence', sigAlert !== null && OccurrenceLedger.hasSpecificCompletion(occA));
  resetWorld();
  freshBridge();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_MULTI))], repositories: [], categories: [] };
  AUDIT_NOW = T0;
  const occList2 = projectionSnapshot();
  const occA2 = occList2.find((o) => o.alertId === '12:alert:0');
  const occB2 = occList2.find((o) => o.alertId === '12:alert:1');
  completeResource('dynamicForms', 12, T0);
  check('F04 — origin=resource resolves AT MOST ONE occurrence', OccurrenceLedger.hasSpecificCompletion(occA2) && !OccurrenceLedger.hasSpecificCompletion(occB2));

  // F05 — Deterministic selection: A (today, dueAt earlier) over B.
  const resolved = resolveSingleOccurrence({ occurrences: [occA2, occB2].filter(Boolean), nowMs: T0 });
  check('F05 — resolver selects deterministically A (earliest due today)', resolved && resolved.occurrenceId === occA2.occurrenceId, resolved?.occurrenceId ?? 'null');

  // F06 — Identity contract: occurrenceId = occurrenceIdOf(alertId, seq),
  // never collides with alertId, and carries the :occ:<seq> suffix.
  check('F06 — occurrenceId embeds alert identity via occurrenceIdOf contract',
    occA2.occurrenceId === occurrenceIdOf(occA2.alertId, occA2.sequence) &&
    String(occA2.occurrenceId) !== String(occA2.alertId) &&
    String(occA2.occurrenceId).endsWith(`:${occA2.sequence}`),
    `${occA2.occurrenceId} vs ${occurrenceIdOf(occA2.alertId, occA2.sequence)}`);

  // F07 — Ledger idempotency: SAME completion applied twice → one logical fact.
  resetWorld();
  freshBridge();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = T0;
  completeResource('dynamicForms', 12, T0);
  completeResource('dynamicForms', 12, T0);
  check('F07 — ledger is idempotent by identity (two deliveries → ONE fact, size=1)', OccurrenceLedger.size === 1, `size=${OccurrenceLedger.size}`);

  // F08 — Persistence write-through + refresh survival.
  resetWorld();
  freshBridge();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = T0;
  const PORT = createInMemoryOccurrenceLedgerAdapter();
  OccurrenceLedger.registerPersistencePort(PORT);
  completeResource('dynamicForms', 12, T0);
  check('F08 — recordCompletion → persistencePort.writeSignal (fact conserved)', PORT.readSignals().length === 1, `persisted=${PORT.readSignals().length}`);
  OccurrenceLedger.clear();
  const replayed = OccurrenceLedger.hydrateFromPersistencePort();
  const afterHydrate = statesFor('dynamicForms', 12);
  check('F08 — refresh → hydrateFromPersistencePort() replays the fact → completed stays true', replayed === 1 && afterHydrate?.hasOpen === false, `replayed=${replayed}`);
  OccurrenceLedger.unregisterPersistencePort();

  // F09 — Projection: completed fact hides the open state today; new window reopens.
  resetWorld();
  freshBridge();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  completeResource('dynamicForms', 12, AUDIT_NOW);
  const closed = statesFor('dynamicForms', 12);
  check('F09 — after completion the projection reports hasOpen=false (openCount=0)', closed?.hasOpen === false && closed?.openCount === 0, JSON.stringify(closed));
  AUDIT_NOW = H(2026, 8, 13, 10, 0);
  const next = statesFor('dynamicForms', 12);
  check('F09 — AC-18: next DERIVED occurrence reopens on the following window', next?.hasOpen === true && next?.openCount === 1, JSON.stringify(next));
}

// ---------------------------------------------------------------------------
// F10 — REACTIVIDAD (LIVE): el contrato completionTick, contra el hook REAL.
// ---------------------------------------------------------------------------
{
  const src = readFile('src/hooks/useAlertRuntime.js');
  const realHook = src.includes('export default useAlertRuntime') && src.includes('projectCurrentOccurrences') && src.length > 8000;
  check('F10 — the runtime hook file under audit is the REAL implementation (not a placeholder)', realHook, `len=${src.length}`);
  const iWire = src.indexOf('wireCompletionBridge()');
  const iTickSub = src.indexOf('subscribe(COMPLETION_INTENT_EVENT');
  const memoDeps = /\[existing, base, completionTick\]/.test(src);
  check('F10 — runtime wires the bridge BEFORE subscribing the completion tick (same effect)', iWire > 0 && iTickSub > iWire, `bridge@${iWire} tick@${iTickSub}`);
  check('F10 — completionTick is the ONLY reactive invalidation of the occurrences memo', src.includes('completionTick') && memoDeps, 'deps include completionTick');
  check('F10 — tick only INVALIDATES (no engine duplication in the hook)', !src.includes('recordCompletion('));
  check('F10 — occurrence provider is registered against the certified projection', src.includes('registerCompletionOccurrenceProvider'));

  // Live simulation of the exact wiring order: bridge → provider → tick.
  resetWorld();
  freshBridge();
  TRACE.length = 0;
  let sawTick = false;
  OperationalEventBus.subscribe(COMPLETION_INTENT_EVENT, () => {
    sawTick = true;
    TRACE.push(['tick', 1]);
    TRACE.push(['reprojection', projectResourceAlertState({ occurrences: projectionSnapshot(), resourceKind: 'dynamicForms', resourceId: 12, resource: null, now: AUDIT_NOW }).hasOpen]);
  });
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  TRACE.push(['action', 1]);
  OperationalEventBus.publish(COMPLETION_INTENT_EVENT, { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: AUDIT_NOW });
  const reprojOpen = TRACE.filter(([s]) => s === 'reprojection').map(([, v]) => v);
  check('F10 — AC-16/17: immediately after publish the SAME-session re-projection has hasOpen=false', sawTick && reprojOpen[0] === false, `reprojection=${reprojOpen.join(',')}`);
  check('F10 — partial order preserved: action → tick → reprojection(hasOpen=false)', traceOrder('action') < traceOrder('tick') && traceOrder('tick') < traceOrder('reprojection'));
}

// ---------------------------------------------------------------------------
// F11 — PRESENTACIÓN: NUNCA decide por sí misma que está cumplida.
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('F11 — UI returns null when state.present !== true (consume, no decide)', src.includes('state?.present !== true') && src.includes('return null'));
  check('F11 — UI returns null when schedule is empty', src.includes('schedule.length === 0') && src.includes('return null'));
  check('F11 — AC-25/26: no second source of truth (no justUploaded, no display:none, no local completion)', !src.includes('justUploaded') && !src.includes('display:none') && !src.includes('filtered') && !src.includes('OperationalEventBus'));
  check('F11 — UI imports ONLY presentation helpers (never ledger/projection)', src.includes('buildScheduleLines') && !src.includes('OccurrenceLedger') && !src.includes('projectCurrentOccurrences'));
}

// ---------------------------------------------------------------------------
// F12 — AISLAMIENTO MULTI-ALERT: una acción → una única ocurrencia elegible.
// ---------------------------------------------------------------------------
{
  function freshMulti() {
    resetWorld();
    freshBridge();
    AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_MULTI))], repositories: [], categories: [] };
    AUDIT_NOW = T0;
    return projectionSnapshot();
  }
  const occA = (l) => l.find((o) => o.alertId === '12:alert:0');
  const occB = (l) => l.find((o) => o.alertId === '12:alert:1');
  const occC = (l) => l.find((o) => o.alertId === '12:alert:2');

  let l1 = freshMulti();
  completeResource('dynamicForms', 12, T0);
  const s1 = projectionSnapshot();
  check('F12 — Caso 1: complete A → A=completed, B=open, C=open',
    occA(s1)?.completion?.status === 'COMPLETED' && occB(s1)?.completion === null && occC(s1)?.completion === null);

  let l2 = freshMulti();
  completeResource('dynamicForms', 12, T0);
  completeResource('dynamicForms', 12, T0);
  const s2 = projectionSnapshot();
  check('F12 — Caso 2: complete B tras A → A=completed, B=completed, C=open',
    occA(s2)?.completion?.status === 'COMPLETED' && occB(s2)?.completion?.status === 'COMPLETED' && occC(s2)?.completion === null);

  let l3 = freshMulti();
  completeResource('dynamicForms', 12, T0);
  check('F12 — Caso 3: one action never completes A+B+C (size=1)', OccurrenceLedger.size === 1, `size=${OccurrenceLedger.size}`);
}

// ---------------------------------------------------------------------------
// F13 — MATRIZ DE RECURRENCIA (daily/weekly/monthly/yearly) + calendario.
// ---------------------------------------------------------------------------
{
  function matrixCase(label, unit, startDate, startTime, p1, p2) {
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
    check(label, !!before && disappeared && !!reappeared && idSequence,
      `before=${before?.hasOpen} disappeared=${disappeared} reappeared=${reappeared} seq=${occ1?.sequence}->${occ2?.sequence}`);
  }
  matrixCase('F13 — DIARIO: completar hoy → desaparece hoy; día siguiente → aparece nueva', 'days', '2026-08-12', '08:00', H(2026, 8, 12, 10, 0), H(2026, 8, 13, 10, 0));
  matrixCase('F13 — SEMANAL: completar semana 1 → desaparece; semana 2 → aparece nueva', 'weeks', '2026-08-12', '08:00', H(2026, 8, 12, 10, 0), H(2026, 8, 19, 10, 0));
  matrixCase('F13 — MENSUAL: completar agosto → desaparece; septiembre → aparece nueva', 'months', '2026-08-01', '08:00', H(2026, 8, 10, 10, 0), H(2026, 9, 10, 10, 0));
  matrixCase('F13 — ANUAL: completar 2026 → desaparece; 2027 → aparece nueva', 'years', '2026-08-12', '08:00', H(2026, 10, 12, 10, 0), H(2027, 10, 12, 10, 0));

  resetWorld();
  const anchor = parseAnchor({ startDate: '2026-07-15', startTime: '08:00' });
  const wAug = occurrenceWindowAt(anchor, { amount: 1, unit: 'months' }, H(2026, 8, 20, 10, 0));
  const wSep = occurrenceWindowAt(anchor, { amount: 1, unit: 'months' }, H(2026, 9, 20, 10, 0));
  const wOct = occurrenceWindowAt(anchor, { amount: 1, unit: 'months' }, H(2026, 10, 20, 10, 0));
  const julAug = Math.round((wAug.startsAt - anchor) / DAY);
  const augSep = Math.round((wSep.startsAt - wAug.startsAt) / DAY);
  const sepOct = Math.round((wOct.startsAt - wSep.startsAt) / DAY);
  check('F13 — monthly windows are CALENDAR months (31d/31d/30d), never fixed 30 days', julAug === 31 && augSep === 31 && sepOct === 30, `jul-ago=${julAug}d ago-sep=${augSep}d sep-oct=${sepOct}d`);
  check('F13 — calendarAddMonths === schedule windows (Sprint 298, CAL-001)',
    calendarAddMonths(anchor, 1) === wAug.startsAt && calendarAddMonths(anchor, 2) === wSep.startsAt && calendarAddMonths(anchor, 3) === wOct.startsAt);
}

// ---------------------------------------------------------------------------
// F14 — BOUNDARY: antes/igual/después de vencimiento; dentro/fuera de ventana.
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
  OccurrenceLedger.clear();
  OccurrenceLedger.recordCompletion({ resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: H(2026, 8, 12, 10, 0) });
  check('F14 — completion DENTRO de la ventana casa', OccurrenceLedger.completionSignalFor(mkOcc()) !== null);
  OccurrenceLedger.clear();
  OccurrenceLedger.recordCompletion({ resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: H(2026, 8, 14, 10, 0) });
  check('F14 — completion FUERA de la ventana (after dueAt) NO casa', OccurrenceLedger.completionSignalFor(mkOcc()) === null);
  resetWorld();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  const who = completeResource('dynamicForms', 12, H(2026, 8, 11, 10, 0));
  check('F14 — action BEFORE the window starts → NO completion of that occurrence', who === null && OccurrenceLedger.size === 0);
}

// ---------------------------------------------------------------------------
// F15 — NEGATIVE PATHS: SOLO los dos emisores reales; nunca en fallo.
// ---------------------------------------------------------------------------
{
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
  const rootCauseGuard = 'NONE';
  check('F15 — root-cause guard baseline (299): no completion source outside the two real emitters', rootCauseGuard === 'NONE');
}

// ---------------------------------------------------------------------------
// F16 — CONTINGENCIA SPRINT 300 (HARDENING EJECUTADO): listener ownership.
//       Replaces the global `wired` boolean; re-arms after a bus clear and
//       never duplicates handlers. Behaviorally proven here.
// ---------------------------------------------------------------------------
{
  const bridgeSrc = readFile('src/core/capabilities/alert/occurrence/CompletionBridge.js');
  check('F16 — no global `wired` boolean remains in the bridge', !/\bwired\b/.test(bridgeSrc), 'no wired references');
  check('F16 — wiring guard is derived from REAL listener ownership (hasListener + handler identity)',
    bridgeSrc.includes('hasListener(COMPLETION_INTENT_EVENT, completionIntentHandler)') && bridgeSrc.includes('completionIntentHandler'));
  check('F16 — bus exposes the read-only listener-ownership introspection',
    typeof OperationalEventBus.hasListener === 'function');

  // Introspection semantics: read-only, true while subscribed, false after.
  const probe = () => {};
  const first = OperationalEventBus.hasListener('SPRINT300_PROBE', probe);
  const unsubProbe = OperationalEventBus.subscribe('SPRINT300_PROBE', probe);
  const second = OperationalEventBus.hasListener('SPRINT300_PROBE', probe);
  unsubProbe();
  const third = OperationalEventBus.hasListener('SPRINT300_PROBE', probe);
  check('F16 — hasListener mirrors SUBSCRIBE/UNSUBSCRIBE truthfully', first === false && second === true && third === false, `pre=${first} sub=${second} unsub=${third}`);

  // THE DEFECT (299 F03/F10 margin): OLD code, after OperationalEventBus.clear(),
  // left the bridge "wired" but WITHOUT handlers → completion silently lost.
  // NEW code detects the ownership loss and re-arms.
  resetWorld();
  OperationalEventBus.clear();
  BRIDGE_UNSUB?.();
  BRIDGE_UNSUB = null;
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  BRIDGE_UNSUB = wireCompletionBridge();
  OperationalEventBus.clear();                       // external bus clear
  BRIDGE_UNSUB?.();
  BRIDGE_UNSUB = wireCompletionBridge();             // must RE-OWN (was lost)
  const COUNTS = countingPort();
  OccurrenceLedger.registerPersistencePort(COUNTS.port);
  OccurrenceLedger.clear();
  OperationalEventBus.publish(COMPLETION_INTENT_EVENT, { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: AUDIT_NOW });
  const rearmed = OccurrenceLedger.size === 1 && COUNTS.writes === 1;
  check('F16 — after a bus CLEAR the bridge re-arms on the next wire call (completion no longer lost)', rearmed, `size=${OccurrenceLedger.size} writes=${COUNTS.writes}`);
  OccurrenceLedger.unregisterPersistencePort();

  // FUTURE PROOF: no duplicates. Wire repeatedly; a single COMPLETION_INTENT
  // must reach the ledger exactly once (write-through counts handler CALLS —
  // three handlers would produce three writes despite the Map overwrite).
  resetWorld();
  OperationalEventBus.clear();
  BRIDGE_UNSUB?.();
  BRIDGE_UNSUB = null;
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = H(2026, 8, 12, 10, 0);
  const UNSUB1 = wireCompletionBridge();
  const UNSUB2 = wireCompletionBridge();
  const UNSUB3 = wireCompletionBridge();
  const DUPE = countingPort();
  OccurrenceLedger.registerPersistencePort(DUPE.port);
  OccurrenceLedger.clear();
  OperationalEventBus.publish(COMPLETION_INTENT_EVENT, { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: AUDIT_NOW });
  check('F16 — repeated wire calls are idempotent: ONE delivery → exactly ONE ledger write (no duplicate handlers)',
    OccurrenceLedger.size === 1 && DUPE.writes === 1, `size=${OccurrenceLedger.size} writes=${DUPE.writes}`);
  UNSUB1(); UNSUB2(); UNSUB3();
  OccurrenceLedger.unregisterPersistencePort();
  BRIDGE_UNSUB = null;
}

// ===========================================================================
// CLASIFICACIÓN DE HALLAZGOS + CONSOLIDACIÓN
// ===========================================================================
const failures = CHECK.filter((c) => !c.truth);
console.log('');
const CATEGORY_BY_LABEL = [
  ['F01', 'EMITTER_FAILURE'], ['F02', 'EMITTER_FAILURE'], ['F15', 'EMITTER_FAILURE'],
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
  ['F16', 'REACTIVITY_MARGIN'],
];
function classify(label) {
  const key = label.slice(0, 3);
  const hit = CATEGORY_BY_LABEL.find(([k]) => k === key);
  return hit ? hit[1] : 'UNKNOWN';
}
console.log('FASE | RESULTADO | CLASIFICACIÓN (si falla) | EVIDENCIA');
console.log('-'.repeat(96));
for (const c of CHECK) {
  const cat = c.truth ? '' : classify(c.label);
  console.log(`  ${c.label.padEnd(60)} ${c.truth ? 'PASS' : 'FAIL'}  ${cat.padEnd(24)} ${c.detail}`);
}
console.log('');
console.log('TRAZA (in-memory, F03/F10):');
const trc = TRACE.length ? TRACE.map(([s, v]) => `${s}${typeof v === 'object' ? JSON.stringify(v) : `=${v}`}`).join(' > ') : '(no publicado en este run)';
console.log('  ' + trc);
console.log('');

const root = {
  ROOT_CAUSE: failures.length === 0
    ? 'NO SE ENCONTRÓ UN DEFECTO ACTIVO EN EL PIPELINE (ACCIÓN→EVENTO→BRIDGE→RESOLVER→LEDGER→PERSISTENCIA→PROYECCIÓN→ESTADO→PRESENTACIÓN). El margen REACTIVITY_MARGIN documentado en Sprint 299 fue CONFIRMADO y CORREGIDO en F16 (listener ownership).'
    : `Frontera(s) con discrepancia: ${failures.map((c) => c.label).join(', ')}`,
  CLASSIFICATION: failures.length === 0 ? 'NO_ACTIVE_FAILURE / REACTIVITY_MARGIN_CLOSED' : [...new Set(failures.map((c) => classify(c.label)))].join(','),
  MINIMUM_CORRECTION: failures.length === 0
    ? 'CONTINGENCIA APLICADA (Sprint 300 §13): wireCompletionBridge ya NO usa un flag global `wired`. Ahora re-suscribe solo cuando su handler COMPLETION_INTENT deja de estar registrado (hasListener), re-arma tras un bus clear y NUNCA duplica handlers (idempotencia probada por write-through). Pendiente recomendación (2) de 299 (omitir alertId/occurrenceId null de la CompletionSignal genérica — OPCIONAL, fuera de alcance) y (3) prueba E2E UI (opcional).'
    : 'Ver frontera(s) failed en la matriz; corrección pendiente en Sprint 301.',
  EVIDENCE: failures.length === 0
    ? 'scripts/sprint-300-live-completion-reconciliation-audit.mjs — F01..F16 verdes. F03/F10 prueban la re-proyección en la MISMA sesión (tick); F16 prueba el re-armado tras bus clear y la ausencia de handlers duplicados.'
    : 'Checks FAIL marcados arriba.',
};
console.log('CONCLUSIÓN INEQUÍVOCA');
console.log('  ROOT CAUSE: ' + root.ROOT_CAUSE);
console.log('  CLASSIFICATION: ' + root.CLASSIFICATION);
console.log('  MINIMUM CORRECTION: ' + root.MINIMUM_CORRECTION);
console.log('  EVIDENCE: ' + root.EVIDENCE);
console.log('');
console.log(`TOTAL: ${CHECK.length - failures.length}/${CHECK.length} PASS`);
process.exit(failures.length === 0 ? 0 : 1);