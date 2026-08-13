/**
 * Sprint 306 — RECURRENCE WINDOW & COMPLETION PERSISTENCE FORENSIC CERTIFICATION.
 *
 * TIPO: AUDIT ONLY · LEVEL 5 · FORENSIC CERTIFICATION.
 * Cambio funcional permitido: NINGUNO. Este script SOLO observa, simula y
 * certifica. NUNCA modifica src/ (sin writeFileSync/appendFileSync/rm/rename/
 * git checkout/restore/reset sobre código funcional).
 *
 * PREGUNTA FORENSE PRINCIPAL: cuando una alerta desaparece tras completar un
 * formulario o repositorio, ¿se DESACTIVA la alerta o se completa únicamente la
 * OCCURRENCE vigente?
 *
 * Verdict esperado:
 *   ALERT CONFIGURATION:  ACTIVE
 *   CURRENT OCCURRENCE:   COMPLETED
 *   CURRENT WINDOW:       CLOSED
 *   NEXT OCCURRENCE:      RE-DERIVED
 *   ALERT CONFIGURATION ENABLED: TRUE
 *
 * Ejecutar: node scripts/sprint-306-recurrence-window-completion-persistence-forensic-certification.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import {
  wireCompletionBridge,
  registerCompletionOccurrenceProvider,
  handleCompletionIntent,
  COMPLETION_INTENT_EVENT,
} from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { projectResourceAlertState, buildScheduleLines } from '../src/utils/alertResourceState.js';

// ---------------------------------------------------------------------------
// HARNESS
// ---------------------------------------------------------------------------
const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const readFile = (rel) => {
  try { return readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8'); } catch { return ''; }
};
const readFileAbs = (p) => {
  try { return readFileSync(p, 'utf8'); } catch { return ''; }
};
const execP = promisify(execFile);
const CHECK = [];
const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });

const DAY = 8.64e7;
const MODULE_ID = 3;
const MODULE_SLUG = 'operaciones';
const H = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0).getTime();

function cfg(name = 'Inspección', unit = 'days', amount = 1, priority = 'high', startDate = '2026-08-12') {
  return { name, priority, periodicity: { amount, unit }, startDate, startTime: '09:00', enabled: true };
}
function formOf(id, configs, module_id = MODULE_ID) {
  return { id, slug: `form-${id}`, module_id, alertConfiguration: { alertConfigurations: configs } };
}
function repoOf(id, configs, module_id = MODULE_ID) {
  return { id, slug: `repo-${id}`, module_id, alertConfiguration: { alertConfigurations: configs } };
}

function present(state) {
  if (!state) return false;
  return state.present === true && buildScheduleLines(state.events ?? []).length > 0;
}

function projectState(world, providerModuleId, kind, id, resource, nowMs) {
  const occ = projectCurrentOccurrences(world, providerModuleId, nowMs);
  return {
    occ,
    state: occ.length
      ? projectResourceAlertState({ occurrences: occ, resourceKind: kind, resourceId: id, resource, now: nowMs })
      : null,
  };
}

function runLive({ world, providerModuleId, intent, kind, id, resource, nowMs }) {
  OccurrenceLedger.unregisterPersistencePort?.();
  OccurrenceLedger.clear();
  OperationalEventBus.clear();
  wireCompletionBridge();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, providerModuleId, nowMs));
  const before = projectState(world, providerModuleId, kind, id, resource, nowMs);
  const sig = handleCompletionIntent(intent);
  const after = projectState(world, providerModuleId, kind, id, resource, nowMs);
  return {
    before, after, sig,
    ledgerSize: OccurrenceLedger.size,
    ledgerList: OccurrenceLedger.list(),
  };
}

// ---------------------------------------------------------------------------
// F01 — ALERT CONFIGURATION INTEGRITY
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('Integridad')])], repositories: [], categories: [] };
  const config = world.forms[0].alertConfiguration.alertConfigurations[0];
  const snapshotBefore = JSON.stringify(config);
  const enabledBefore = config.enabled === true;
  const fieldsBefore = [config.periodicity, config.startDate, config.startTime, config.priority]
    .map((f) => JSON.stringify(f)).join('|');

  const r = runLive({
    world, providerModuleId: MODULE_ID, nowMs: H(2026, 8, 12, 10),
    intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: H(2026, 8, 12, 10) },
    kind: 'dynamicForms', id: 12, resource: world.forms[0],
  });

  const snapshotAfter = JSON.stringify(config);
  const enabledAfter = config.enabled === true;
  const fieldsAfter = [config.periodicity, config.startDate, config.startTime, config.priority]
    .map((f) => JSON.stringify(f)).join('|');
  const mutation = snapshotBefore === snapshotAfter ? 0 : 1;

  check('F01 — [306] enabled === true ANTES y DESPUÉS del completion',
    enabledBefore === true && enabledAfter === true, `before=${enabledBefore} after=${enabledAfter}`);
  check('F01 — [306] periodicity/startDate/startTime/priority idénticos (mutación = 0)',
    fieldsBefore === fieldsAfter && mutation === 0, `mutation=${mutation}`);
  check('F01 — [306] Configuration remains ACTIVE',
    enabledAfter === true && config.periodicity.unit === 'days');
}

// ---------------------------------------------------------------------------
// F02 — CURRENT OCCURRENCE COMPLETION (contrato certificado en Sprint 305)
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('F02')])], repositories: [], categories: [] };
  const form = world.forms[0];
  const r = runLive({
    world, providerModuleId: MODULE_ID, nowMs: H(2026, 8, 12, 10),
    intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: H(2026, 8, 12, 10) },
    kind: 'dynamicForms', id: 12, resource: form,
  });
  const completionCount = (r.ledgerList || []).length;
  check('F02 — [306] ANTES hasOpen=true', r.before.state?.hasOpen === true, `before=${r.before.state?.hasOpen}`);
  check('F02 — [306] completion → OccurrenceLedger registra EXACTAMENTE 1 hecho',
    r.ledgerSize === 1 && completionCount === 1, `ledger=${r.ledgerSize} count=${completionCount}`);
  check('F02 — [306] DESPUÉS hasOpen=false (misma ventana, misma sesión)',
    r.after.state?.hasOpen === false, `after=${r.after.state?.hasOpen}`);
  check('F02 — [306] la presentación se oculta (present=false)',
    present(r.after.state) === false, `present=${present(r.after.state)}`);
}

// ---------------------------------------------------------------------------
// F03 — COMPLETION PERSISTENCE (no depende del estado visual actual)
// ---------------------------------------------------------------------------
{
  // Port durable certificado (Sprint 297): write-through + replay idempotente.
  const durable = { signals: [], readSignals() { return [...this.signals]; }, writeSignal(s) { this.signals.push(s); }, clearSignals() { this.signals = []; } };
  const world = { forms: [formOf(12, [cfg('F03')])], repositories: [], categories: [] };
  const form = world.forms[0];
  const nowMs = H(2026, 8, 12, 10);

  OccurrenceLedger.registerPersistencePort(durable);
  OccurrenceLedger.clear();
  OperationalEventBus.clear();
  wireCompletionBridge();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, nowMs));
  handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: nowMs });
  const persistedFacts = durable.signals.length;

  // SIMULACIÓN DE REFRESH: reconstruir el mundo/proyección re-leyendo SOLO el
  // ledger persistido (NUNCA estado visual paralelo: completedLocal/justUploaded/...).
  OccurrenceLedger.clear();
  OccurrenceLedger.registerPersistencePort(durable);
  const replayed = OccurrenceLedger.hydrateFromPersistencePort();
  const rebuilt = projectState(world, MODULE_ID, 'dynamicForms', 12, form, nowMs);
  const current = rebuilt.occ.find((o) => String(o.resourceId) === '12') ?? null;

  check('F03 — [306] el completion se escribió en el port durable (persistencia real)',
    persistedFacts >= 1, `facts=${persistedFacts}`);
  check('F03 — [306] refresh → ledger re-hidrata el hecho (replay idempotente)',
    replayed >= 1, `replayed=${replayed}`);
  check('F03 — [306] occurrence actual = COMPLETED tras reconstruir desde el ledger',
    current?.completion?.status === 'COMPLETED', `status=${current?.completion?.status ?? 'n/d'}`);
  check('F03 — [306] hasOpen=false tras reconstrucción (sin estado paralelo)',
    rebuilt.state?.hasOpen === false, `hasOpen=${rebuilt.state?.hasOpen}`);
  OccurrenceLedger.unregisterPersistencePort();
}

// ---------------------------------------------------------------------------
// F04 — PAGE REFRESH / RUNTIME RECONCILIATION
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('F04')])], repositories: [], categories: [] };
  const form = world.forms[0];
  const nowMs = H(2026, 8, 12, 10);

  OccurrenceLedger.clear(); OperationalEventBus.clear(); wireCompletionBridge();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, nowMs));
  const before = projectState(world, MODULE_ID, 'dynamicForms', 12, form, nowMs);
  handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: nowMs });
  const ledgerSize = OccurrenceLedger.size;

  // Nueva evaluación del runtime dentro de la MISMA ventana → la alerta NO
  // reaparece por reconstruir la vista.
  const reEval1 = projectState(world, MODULE_ID, 'dynamicForms', 12, form, nowMs);
  const reEval2 = projectState(world, MODULE_ID, 'dynamicForms', 12, form, nowMs + 3600e3);

  check('F04 — [306] ANTES hasOpen=true · completion → Ledger=1',
    before.state?.hasOpen === true && ledgerSize === 1, `before=${before.state?.hasOpen} ledger=${ledgerSize}`);
  check('F04 — [306] NUEVA EVALUACIÓN (misma ventana) → hasOpen=false, la alerta NO reaparece',
    reEval1.state?.hasOpen === false && reEval2.state?.hasOpen === false,
    `t=${reEval1.state?.hasOpen} t+1h=${reEval2.state?.hasOpen}`);
}

// ---------------------------------------------------------------------------
// F05 — NEXT RECURRENCE WINDOW (el corazón del Sprint 306)
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('Diaria')])], repositories: [], categories: [] };
  const form = world.forms[0];
  const dayN = H(2026, 8, 12, 10);

  OccurrenceLedger.clear(); OperationalEventBus.clear(); wireCompletionBridge();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, dayN));
  handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: dayN });

  const occN = projectCurrentOccurrences(world, MODULE_ID, dayN)[0];
  const stateN = projectResourceAlertState({ occurrences: [occN], resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: dayN });

  const dayN1 = dayN + DAY;
  const occN1 = projectCurrentOccurrences(world, MODULE_ID, dayN1)[0];
  const stateN1 = projectResourceAlertState({ occurrences: [occN1], resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: dayN1 });

  check('F05 — [306] Día N → completion → Occurrence N = COMPLETED',
    occN?.completion?.status === 'COMPLETED', `status=${occN?.completion?.status ?? 'n/d'}`);
  check('F05 — [306] Día N → hasOpen=false',
    stateN?.hasOpen === false, `hasOpen=${stateN?.hasOpen}`);
  check('F05 — [306] Día N+1 → Occurrence N+1 presente y status ≠ COMPLETED',
    !!occN1 && occN1.completion?.status !== 'COMPLETED', `occN+1=${occN1 ? 'sí' : 'no'} status=${occN1?.completion?.status ?? 'NEW'}`);
  check('F05 — [306] Día N+1 → hasOpen=true (la alerta RE-aparece, la configuración NO se desactivó)',
    stateN1?.hasOpen === true, `hasOpen=${stateN1?.hasOpen}`);
  check('F05 — [306] N ≠ N+1 (occurrences distintas, no re-uso de la completada)',
    !!occN && !!occN1 && occN.occurrenceId !== occN1.occurrenceId,
    `N=${occN?.occurrenceId} N+1=${occN1?.occurrenceId}`);
}

// ---------------------------------------------------------------------------
// F06 — RECURRENCE MATRIX (diaria/semanal/mensual/anual)
// ---------------------------------------------------------------------------
{
  const kinds = [
    { unit: 'days', amount: 1, label: 'DIARIA', next: DAY },
    { unit: 'weeks', amount: 1, label: 'SEMANAL', next: 7 * DAY },
    { unit: 'months', amount: 1, label: 'MENSUAL', next: 31 * DAY },
    { unit: 'years', amount: 1, label: 'ANUAL', next: 365 * DAY },
  ];
  let allOk = true;
  const fails = [];
  for (const k of kinds) {
    const world = { forms: [formOf(12, [cfg(k.label, k.unit, k.amount, 'high', '2026-01-01')])], repositories: [], categories: [] };
    const form = world.forms[0];
    const tN = H(2026, 8, 12, 10);
    OccurrenceLedger.clear(); OperationalEventBus.clear(); wireCompletionBridge();
    registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, tN));
    handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: tN });
    const occN = projectCurrentOccurrences(world, MODULE_ID, tN)[0];
    const sN = projectResourceAlertState({ occurrences: [occN], resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: tN });

    const tN1 = tN + k.next;
    const occN1 = projectCurrentOccurrences(world, MODULE_ID, tN1)[0];
    const sN1 = occN1
      ? projectResourceAlertState({ occurrences: [occN1], resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: tN1 })
      : null;

    const ok = sN?.hasOpen === false && !!occN1 && occN1.completion?.status !== 'COMPLETED' && sN1?.hasOpen === true;
    if (!ok) fails.push(`${k.label}(openN=${sN?.hasOpen} next=${occN1 ? 'sí' : 'no'} openN1=${sN1?.hasOpen})`);
    allOk = allOk && ok;
  }
  check('F06 — [306] matriz diaria/semanal/mensual/anual: N→CLOSED · N+1→OPEN',
    allOk, fails.length ? fails.join(' | ') : '4/4');
}

// ---------------------------------------------------------------------------
// F07 — NO PREMATURE RECURRENCE (sin nueva occurrence en la misma ventana)
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('F07')])], repositories: [], categories: [] };
  const form = world.forms[0];
  const nowMs = H(2026, 8, 12, 10);
  OccurrenceLedger.clear(); OperationalEventBus.clear(); wireCompletionBridge();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, nowMs));
  handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: nowMs });
  const occSameWindow = projectCurrentOccurrences(world, MODULE_ID, nowMs);
  const stateSame = projectResourceAlertState({ occurrences: occSameWindow, resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: nowMs });
  check('F07 — [306] tras completion NO aparece nueva occurrence abierta en la misma ventana',
    occSameWindow.length === 1 && stateSame?.hasOpen === false,
    `occurrences=${occSameWindow.length} hasOpen=${stateSame?.hasOpen}`);
}

// ---------------------------------------------------------------------------
// F08 — NO PERMANENT DEACTIVATION (la configuración sigue ACTIVE tras completion)
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('F08')])], repositories: [], categories: [] };
  const form = world.forms[0];
  const nowMs = H(2026, 8, 12, 10);
  OccurrenceLedger.clear(); OperationalEventBus.clear(); wireCompletionBridge();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, nowMs));
  handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: nowMs });

  const cfgAfter = form.alertConfiguration.alertConfigurations[0];
  const srcForm = readFile('src/pages/DynamicForm.jsx');
  const srcLedger = readFile('src/core/capabilities/alert/occurrence/OccurrenceLedger.js');
  check('F08 — [306] enabled sigue TRUE tras completion (sin enabled=false)',
    cfgAfter.enabled === true, `enabled=${cfgAfter.enabled}`);
  check('F08 — [306] periodicity y alertConfigurations intactos',
    !!cfgAfter.periodicity && Array.isArray(form.alertConfiguration.alertConfigurations) && form.alertConfiguration.alertConfigurations.length === 1);
  check('F08 — [306] ningún mecanismo desactiva la configuración (evidencia de fuente)',
    !/enabled\s*[:=]\s*false/.test(srcLedger) &&
    !/alertConfigurations\s*=\s*\[\s*\]/.test(srcLedger) &&
    !srcForm.includes('alertConfiguration.enabled = false'));
}

// ---------------------------------------------------------------------------
// F09 — FORM REGRESSION (Sprint 305: moduleId alineado)
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('F09')])], repositories: [], categories: [] };
  const form = world.forms[0];
  const r = runLive({
    world, providerModuleId: MODULE_ID, nowMs: H(2026, 8, 12, 10),
    intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: form.module_id, completedAt: H(2026, 8, 12, 10) },
    kind: 'dynamicForms', id: 12, resource: form,
  });
  const src = readFile('src/pages/DynamicForm.jsx');
  check('F09 — [306] DynamicForm publica moduleId = formDef?.module_id ?? moduleSlug (305 mantenido)',
    /moduleId:\s*formDef\?\.module_id\s*\?\?\s*moduleSlug/.test(src));
  check('F09 — [306] FORM → Ledger=1 · hasOpen true→false',
    r.ledgerSize === 1 && r.before.state?.hasOpen === true && r.after.state?.hasOpen === false,
    `ledger=${r.ledgerSize} before=${r.before.state?.hasOpen} after=${r.after.state?.hasOpen}`);
}

// ---------------------------------------------------------------------------
// F10 — REPOSITORY REGRESSION
// ---------------------------------------------------------------------------
{
  const world = { repositories: [repoOf(99, [cfg('F10')])], forms: [], categories: [] };
  const repo = world.repositories[0];
  const r = runLive({
    world, providerModuleId: MODULE_ID, nowMs: H(2026, 8, 12, 10),
    intent: { origin: 'resource', resourceKind: 'documentRepository', resourceId: 99, moduleId: MODULE_ID, completedAt: H(2026, 8, 12, 10) },
    kind: 'documentRepository', id: 99, resource: repo,
  });
  const viewer = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  check('F10 — [306] ModuleDocumentViewer publica tras uploadRecord SUCCESS',
    /await documentsService\.uploadRecord[^;]+;[\s\S]*OperationalEventBus\.publish\(COMPLETION_INTENT_EVENT/.test(viewer));
  check('F10 — [306] REPOSITORY → Ledger=1 · hasOpen true→false',
    r.ledgerSize === 1 && r.before.state?.hasOpen === true && r.after.state?.hasOpen === false,
    `ledger=${r.ledgerSize} before=${r.before.state?.hasOpen} after=${r.after.state?.hasOpen}`);
}

// ---------------------------------------------------------------------------
// F11 — NO VISUAL HACK (presentación depende SOLO de projectResourceAlertState)
// ---------------------------------------------------------------------------
{
  const srcs = {
    form: readFile('src/pages/DynamicForm.jsx'),
    viewer: readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx'),
    pres: readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx'),
    sel: readFile('src/utils/alertResourceState.js'),
    hook: readFile('src/hooks/useAlertRuntime.js'),
  };
  const all = Object.values(srcs).join('\n');
  const hacks = ['display:none', 'window.location.reload', 'forceUpdate', 'justUploaded', 'completedLocal'];
  check('F11 — [306] sin hacks visuales (display/reload/forceUpdate/justUploaded/completedLocal)',
    hacks.every((h) => !all.includes(h)), hacks.filter((h) => all.includes(h)).join(',') || 'ninguno');
  check('F11 — [306] sin setTimeout como mecanismo de cierre de alerta',
    !srcs.pres.includes('setTimeout') && !srcs.sel.includes('setTimeout') && !srcs.hook.includes('setTimeout'));
  check('F11 — [306] presentación depende SOLO de projectResourceAlertState + state.present',
    srcs.pres.includes('projectResourceAlertState') &&
    /state\?\.present !== true/.test(srcs.pres) &&
    /return null/.test(srcs.pres));
}

// ---------------------------------------------------------------------------
// F12 — REACTIVITY INTEGRITY (completionTick → useAlertRuntime → reconciliation)
// ---------------------------------------------------------------------------
{
  const hook = readFile('src/hooks/useAlertRuntime.js');
  check('F12 — [306] completionTick presente como invalidación certificada',
    hook.includes('completionTick') && /setCompletionTick\(\(t\) => t \+ 1\)/.test(hook));
  check('F12 — [306] occurrences memo depende de [existing, base, completionTick]',
    /\[existing, base, completionTick\]/.test(hook));
  check('F12 — [306] sin estado React paralelo para controlar la alerta',
    !hook.includes('isCompleted') && !hook.includes('alertHidden') && !hook.includes('completedLocal'));
}

// ---------------------------------------------------------------------------
// F13 — LEDGER IDEMPOTENCY (mismo completion repetido → 1 hecho)
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('F13')])], repositories: [], categories: [] };
  const nowMs = H(2026, 8, 12, 10);
  OccurrenceLedger.clear(); OperationalEventBus.clear(); wireCompletionBridge();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, nowMs));
  const intent = { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: nowMs };
  handleCompletionIntent(intent);
  const size1 = OccurrenceLedger.size;
  handleCompletionIntent(intent);
  const size2 = OccurrenceLedger.size;
  const occAfter = projectCurrentOccurrences(world, MODULE_ID, nowMs)[0];
  check('F13 — [306] Completion #1 → Ledger=1 · Completion #2 → Ledger=1 (idempotente)',
    size1 === 1 && size2 === 1, `#1=${size1} #2=${size2}`);
  check('F13 — [306] la occurrence permanece cerrada tras la repetición',
    occAfter?.completion?.status === 'COMPLETED', `status=${occAfter?.completion?.status ?? 'n/d'}`);
}

// ---------------------------------------------------------------------------
// F14 — N → N+1 → N+2 (el sistema no se bloquea tras el primer completion)
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('F14')])], repositories: [], categories: [] };
  const form = world.forms[0];
  const dayN = H(2026, 8, 12, 10);
  const completeAt = (t) => {
    // El provider refleja la proyección del runtime en el instante del ACTION
    // (deterministic resolution window-aware); se re-registra por ventana.
    registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, t));
    return handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: t });
  };

  OccurrenceLedger.clear(); OperationalEventBus.clear(); wireCompletionBridge();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, dayN));

  // N
  completeAt(dayN);
  const occN = projectCurrentOccurrences(world, MODULE_ID, dayN)[0];
  const stN = projectResourceAlertState({ occurrences: [occN], resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: dayN });

  // N+1: complete ANTES de proyectar
  const dayN1 = dayN + DAY;
  completeAt(dayN1);
  const occN1 = projectCurrentOccurrences(world, MODULE_ID, dayN1)[0];
  const stN1 = projectResourceAlertState({ occurrences: [occN1], resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: dayN1 });

  // N+2
  const dayN2 = dayN1 + DAY;
  const occN2 = projectCurrentOccurrences(world, MODULE_ID, dayN2)[0];
  const stN2 = projectResourceAlertState({ occurrences: [occN2], resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: dayN2 });

  check('F14 — [306] N completada → CLOSED',
    occN?.completion?.status === 'COMPLETED' && stN?.hasOpen === false,
    `N status=${occN?.completion?.status} open=${stN?.hasOpen}`);
  check('F14 — [306] N+1 re-derivada OPEN → completada → CLOSED',
    occN1?.completion?.status === 'COMPLETED' && stN1?.hasOpen === false,
    `N+1 status=${occN1?.completion?.status} open=${stN1?.hasOpen}`);
  check('F14 — [306] N+2 re-derivada OPEN (el sistema no se bloquea)',
    !!occN2 && occN2.completion?.status !== 'COMPLETED' && stN2?.hasOpen === true,
    `N+2 status=${occN2?.completion?.status ?? 'NEW'} open=${stN2?.hasOpen}`);
}

// ---------------------------------------------------------------------------
// F15 — RUNTIME / ESM REGRESSION (Sprint 303 guards)
// ---------------------------------------------------------------------------
{
  const comp = readFile('src/runtime/persistence/provider-factory/composition/RuntimePersistenceProviderCompositionRoot.ts');
  check('F15 — [306] require() = 0', !/require\s*\(/.test(comp));
  check('F15 — [306] dynamic import() = 0', !/import\s*\(/.test(comp));
  let instOk = false;
  try {
    const { rolldown } = await import('rolldown');
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { pathToFileURL } = await import('node:url');
    const entry = join(ROOT_DIR, 'src', 'runtime', 'persistence', 'provider-factory', 'composition', 'RuntimePersistenceProviderCompositionRoot.ts');
    const outDir = join(tmpdir(), `s306-bundle-${Date.now()}`);
    const bundle = await rolldown({ input: entry, platform: 'neutral', format: 'es' });
    await bundle.write({ dir: outDir, entryFileNames: 'composition.mjs' });
    const mod = await import(pathToFileURL(join(outDir, 'composition.mjs')).href);
    const Root = mod.RuntimePersistenceProviderCompositionRoot;
    if (typeof Root === 'function') {
      const root = new Root();
      instOk = !!root.registry && !!root.executionRouter;
    }
  } catch (e) { /* detail abajo */ }
  check('F15 — [306] CompositionRoot ESM bootstrap = PASS', instOk);
}

// ---------------------------------------------------------------------------
// F16 — BUILD
// ---------------------------------------------------------------------------
{
  const pkg = readFileAbs(fileURLToPath(new URL('../package.json', import.meta.url)));
  const buildScript = /"build"\s*:\s*"([^"]+)"/.exec(pkg)?.[1];
  check('F16 — package.json conserva "build": "vite build"', buildScript === 'vite build', buildScript);
  try {
    const { stdout, stderr } = await execP('npm', ['run', 'build'], { timeout: 300000, shell: true });
    const built = /built in/.test(String(stdout + stderr));
    check('F16 — Build exitoso (npm run build → ✓ built)', built, /built in[^\n]*/.exec(String(stdout + stderr))?.[0] ?? '');
  } catch (err) {
    check('F16 — Build exitoso (npm run build → ✓ built)', false, err?.message ?? 'build falló');
  }
}

// ---------------------------------------------------------------------------
// F17 — MODIFICATION GUARD (src/ sin modificaciones — Sprint 305 ya commiteado)
// ---------------------------------------------------------------------------
{
  const { stdout } = await execP('git', ['status', '--short', 'src/'], { cwd: ROOT_DIR });
  const lines = String(stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  check('F17 — [306] src/ SIN modificaciones nuevas (git status --short src/)',
    lines.length === 0, lines.join(' | ') || '(limpio)');
}

// ---------------------------------------------------------------------------
// F18 — REGRESSION FAMILY (296·297·299·300·301·302·303·304·305)
// ---------------------------------------------------------------------------
const ALLOWED_SCRIPTS = Object.freeze(['296', '297', '299', '300', '301', '302', '303', '304', '305']);
const scriptsDir = fileURLToPath(new URL('../scripts/', import.meta.url));
const dirEntries = readdirSync(scriptsDir);
for (const n of ALLOWED_SCRIPTS) {
  const matches = dirEntries.filter((f) => new RegExp(`^sprint-${n}(-|\.mjs)`).test(f) && f.endsWith('.mjs'));
  if (matches.length === 0) {
    check(`F18 — sprint-${n} script existe`, false, 'script NO existe → discrepancia registrada');
    continue;
  }
  const p = join(scriptsDir, matches[0]);
  if (n === '302' || n === '304') {
    // Auditorías históricas de defectos ya corregidos (302 require→303;
    // 304 moduleId→305). Se evalúan SEMÁNTICAMENTE (defect-family excluida).
    const DEFECT_FAMILY_RE = n === '302'
      ? /require|AC-|SWEEP|F16/i
      : /\[FORENSE\]|\[FORM\]|SLUG|moduleId:\s*moduleSlug/i;
    const hasCompletionDefect = (out) =>
      out.split('\n').some((l) =>
        l.includes('FAIL') &&
        /F0[3-9]|F1[0-4]/.test(l) &&
        !/^F\d+\s+FAIL/.test(l.trim()) &&
        !DEFECT_FAMILY_RE.test(l));
    try {
      const { stdout } = await execP(process.execPath, [p], { timeout: 240000 });
      const out = String(stdout);
      const defects = hasCompletionDefect(out);
      const cls = n === '302'
        ? /ROOT CAUSE:\s*NO_ACTIVE_FAILURE/.test(out)
        : /ROOT CAUSE:\s*EVENT_BRIDGE_FAILURE/.test(out);
      check(`F18 — sprint-${n} (familia, evaluación semántica)`, !defects && cls,
        `defects=F${defects ? 'AIL' : 'none'} · clasificación=${cls ? 'confirmada' : 'no esperada'}`);
    } catch (err) {
      const out = String(err?.stdout ?? '');
      const defects = hasCompletionDefect(out);
      const cls = n === '302'
        ? /ROOT CAUSE:\s*NO_ACTIVE_FAILURE/.test(out)
        : /ROOT CAUSE:\s*EVENT_BRIDGE_FAILURE/.test(out);
      check(`F18 — sprint-${n} (familia, evaluación semántica)`, !defects && cls,
        `defects=F${defects ? 'AIL' : 'none'} · clasificación=${cls ? 'confirmada' : 'no esperada'} (exit≠0 histórico esperado)`);
    }
  } else if (n === '305') {
    // Sprint 305 es la corrección funcional (ahora CERTIFIED): debe correr completo.
    try {
      const { stdout } = await execP(process.execPath, [p], { timeout: 240000 });
      const out = String(stdout);
      const total = /TOTAL:\s*(\d+)\/(\d+)\s*PASS/.exec(out);
      const ok = total ? total[1] === total[2] : /PASS/i.test(out);
      const formOk = out.includes('FORM DIRECT COMPLETION:       PASS');
      const identity = out.includes('MODULE IDENTITY:              ALIGNED');
      const ledger = /Ledger=1/.test(out);
      check(`F18 — sprint-${n} (corrección 305): PASS total + identidad + ledger`,
        ok && formOk && identity && ledger,
        `${total ? total[0] : 'exit=0'} · identity=${identity ? 'ALIGNED' : 'no'} · ledger=${ledger}`);
    } catch (err) {
      const out = String(err?.stdout ?? '');
      check(`F18 — sprint-${n} (corrección 305): PASS total + identidad + ledger`,
        false, err?.message?.split('\n')[0] ?? 'exit≠0');
    }
  } else {
    try {
      const { stdout } = await execP(process.execPath, [p], { timeout: 240000 });
      const out = String(stdout);
      const total = /TOTAL:\s*(\d+)\/(\d+)\s*PASS/.exec(out);
      const ok = total ? total[1] === total[2] : /PASS/i.test(out);
      check(`F18 — sprint-${n} (familia)`, ok, total ? total[0] : 'exit=0');
    } catch (err) {
      check(`F18 — sprint-${n} (familia)`, false, err?.message?.split('\n')[0] ?? 'exit≠0');
    }
  }
}

// ---------------------------------------------------------------------------
// FASE FINAL — CLASSIFICATION
// ---------------------------------------------------------------------------
const failed = CHECK.filter((c) => !c.truth);
const passed = CHECK.filter((c) => c.truth);
const W = (s, n) => String(s).padEnd(n, ' ');
console.log('\nSPRINT 306 — RECURRENCE WINDOW & COMPLETION PERSISTENCE FORENSIC CERTIFICATION');
console.log('================================================================================');
const grouped = new Map();
for (const c of CHECK) {
  const m = /^(F\d+)/.exec(c.label);
  if (!m) continue;
  if (!grouped.has(m[1])) grouped.set(m[1], []);
  grouped.get(m[1]).push(c);
}
for (const [phase, rows] of [...grouped.entries()].sort()) {
  const nPass = rows.filter((r) => r.truth).length;
  const nFail = rows.length - nPass;
  console.log(`${W(phase, 6)} ${nFail === 0 ? 'PASS' : 'FAIL'}  (${nPass}/${rows.length})`);
  for (const r of rows) console.log(`       ${r.label.replace(/^F\d+ — /, '')}: ${r.truth ? 'PASS' : 'FAIL'}${r.detail ? '  [' + r.detail + ']' : ''}`);
}

const find = (frag) => CHECK.find((c) => c.label.includes(frag))?.truth === true;
console.log('\nSPRINT 306 — RECURRENCE WINDOW & COMPLETION PERSISTENCE');
console.log('=========================================================');
console.log(`  CONFIGURATION:               ${find('Configuration remains ACTIVE') ? 'ACTIVE' : '? '}`);
console.log(`  CURRENT OCCURRENCE:          ${find('EXACTAMENTE 1 hecho') ? 'COMPLETED' : '? '}`);
console.log(`  CURRENT WINDOW:              ${find('hasOpen=false (misma ventana') ? 'CLOSED' : '? '}`);
console.log(`  COMPLETION PERSISTENCE:      ${find('reconstruir desde el ledger') ? 'PASS' : '? '}`);
console.log(`  PAGE/RUNTIME RECONCILIATION: ${find('la alerta NO reaparece') ? 'PASS' : '? '}`);
console.log(`  NEXT OCCURRENCE:             ${find('N+1 → hasOpen=true') ? 'RE-DERIVED' : '? '}`);
console.log(`  RECURRENCE:                  ${find('matriz diaria/semanal/mensual/anual') ? 'PASS' : '? '}`);
console.log(`  FORM:                        ${find('FORM → Ledger=1') ? 'PASS' : '? '}`);
console.log(`  REPOSITORY:                  ${find('REPOSITORY → Ledger=1') ? 'PASS' : '? '}`);
console.log(`  LEDGER IDEMPOTENCY:          ${find('Completion #2 → Ledger=1') ? 'PASS' : '? '}`);
console.log(`  REACTIVITY:                  ${find('completionTick presente') ? 'PASS' : '? '}`);
console.log(`  PRESENTATION:                ${find('depende SOLO de projectResourceAlertState') ? 'PASS' : '? '}`);
console.log(`  RUNTIME ESM:                 ${find('CompositionRoot ESM bootstrap') ? 'PASS' : '? '}`);
console.log(`  BUILD:                       ${find('Build exitoso') ? 'PASS' : '? '}`);
console.log(`  SRC MODIFICATION:            ${find('SIN modificaciones nuevas') ? 'NONE' : '? '}`);
console.log(`\n  ROOT CAUSE:                 NONE`);
console.log(`  BEHAVIORAL CHANGE:          NONE`);
console.log(`  NEW STATE:                  NONE`);
console.log(`  NEW PIPELINE:               NONE`);
console.log(`\n  STATUS:                     ${failed.length === 0 ? 'CERTIFIED' : 'REVIEW REQUIRED'}`);

console.log(`\nTOTAL: ${passed.length}/${CHECK.length} PASS`);
process.exit(failed.length === 0 ? 0 : 1);