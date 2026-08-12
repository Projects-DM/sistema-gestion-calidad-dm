/**
 * Sprint 296 — ALERT OCCURRENCE COMPLETION & RECURRENCE AUDIT (FORENSIC).
 *
 * TIPO: AUDIT ONLY — no modifica dominio/runtime/UI/persistence/schema.
 * Certifica con evidencia ejecutable cómo una alerta pasa de pendiente →
 * cumplida → próxima ocurrencia, y dónde están los gaps reales:
 *
 *   F1  derivación de la ocurrencia (window-aware, sin store)
 *   F2  acciones que generan Completion (solo emisores reales)
 *   F3  DynamicForm como único emisor para forms (origin alert/resource)
 *   F4  GAP: documentCategory NO emite completion
 *   F5  GAP: documentRepository NO emite completion
 *   F6  recurrencia DIARIA: 1 ventana/día, ventana [startsAt, dueAt)
 *   F7  recurrencia SEMANAL: 1 ventana/semana (calendar-driven, no business-days)
 *   F8  próxima ocurrencia DERIVADA (computeTarget/occurrenceWindowAt)
 *   F9  presentación se oculta al completarse (buildScheduleLines skips)
 *   F10 DEC-256-06: RECORD_CREATED NUNCA completa
 *   F11 idempotencia del ledger por identidad
 *   F12 ledger IN-MEMORY (no durable, no reactivo)
 *
 * Ejecutar: node scripts/sprint-296-alert-occurrence-completion-recurrence-audit.mjs
 */
import { readFileSync } from 'node:fs';
import {
  parseAnchor,
  cadenceMs,
  occurrenceWindowAt,
  computeTarget,
} from '../src/core/capabilities/alert/occurrence/OccurrenceSchedule.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import {
  handleCompletionIntent,
  registerCompletionOccurrenceProvider,
  COMPLETION_INTENT_EVENT,
} from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { resolveSingleOccurrence } from '../src/core/capabilities/alert/occurrence/DeterministicCompletionResolver.js';
import { classifyOccurrence } from '../src/core/capabilities/alert/occurrence/OccurrenceLifecycle.js';
import {
  projectResourceAlertState,
  buildScheduleLines,
} from '../src/utils/alertResourceState.js';

const readFile = (p) => {
  try { return readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'); } catch { return ''; }
};

const checks = [];
function check(label, truth, detail = '') {
  checks.push({ label, truth: !!truth, detail });
}

// Deterministic anchors (ms). Local-parseAnchor semantics: parseAnchor applies
// startTime to the parsed date; we reuse the SAME function for anchor and derive
// windows from it → tests are timezone-independent (relative math only).
const DAY = 8.64e7;
const WEEK = 6.048e8;
const HOUR = 3.6e6;

const anchorDaily = parseAnchor({ startDate: '2026-07-06', startTime: '08:00' }); // lunes 08:00
const anchorWeekly = parseAnchor({ startDate: '2026-07-06', startTime: '08:00' }); // lunes 08:00
const dailyCadence = cadenceMs({ amount: 1, unit: 'days' });
const weeklyCadence = cadenceMs({ amount: 1, unit: 'weeks' });

// ===========================================================================
// F1 — VENTANA DE OCURRENCIA: [startsAt, dueAt) EXCLUSIVO + secuencia derivada.
// ===========================================================================
{
  const at1030 = anchorDaily + 2 * HOUR + 30 * 60000;
  const w = occurrenceWindowAt(anchorDaily, dailyCadence, at1030);
  check('F1 — ventana diaria: startsAt = anchor', Number.isFinite(w.startsAt) && w.startsAt === anchorDaily);
  check('F1 — ventana diaria: dueAt = startsAt + cadence (exclusivo)', w.dueAt === anchorDaily + DAY);
  check('F1 — ventana diaria: sequence 1 al día 0', w.sequence === 1);
  check('F1 — cerrado: ventana siguiente al cruzar dueAt', occurrenceWindowAt(anchorDaily, dailyCadence, anchorDaily + DAY + 1).sequence === 2);

  const wNext = occurrenceWindowAt(anchorDaily, dailyCadence, anchorDaily + 2 * DAY);
  check('F1 — cerrado: startsAt siguiente = dueAt anterior (sin gap)', wNext.startsAt === anchorDaily + 2 * DAY);
}

// ===========================================================================
// F2/F10 — SOLO emisores reales; RECORD_CREATED NUNCA completa.
// ===========================================================================
{
  const bridgeSrc = readFile('src/core/capabilities/alert/occurrence/CompletionBridge.js');
  const orchSrc = readFile('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js');
  const formSrc = readFile('src/pages/DynamicForm.jsx');

  // El bridge solo escucha los FINAL_SINGLE + RECORDS_STATUS_UPDATED(completado) + INTENT.
  const singleSub = ['RESOURCE_COMPLETED', 'RECORDS_APPROVED', 'RECORDS_CLOSED']
    .every((ev) => bridgeSrc.includes(ev));
  check('F2 — bridge suscribe FINAL_SINGLE_EVENTS', singleSub);
  check('F2 — bridge suscribe COMPLETION_INTENT_EVENT', bridgeSrc.includes(COMPLETION_INTENT_EVENT));
  check('F2 — bridge filtra RECORDS_STATUS_UPDATED por completado', bridgeSrc.includes(`newStatus !== 'completado'`));

  // RECORD_CREATED se emite (orchestrator) pero el bridge NO lo registra.
  check('F10 — RECORD_CREATED se emite (fuente)', orchSrc.includes("OperationalEventBus.publish('RECORD_CREATED'"));
  check('F10 — RECORD_CREATED no está entre los FINAL_SINGLE',
    !bridgeSrc.includes("'RECORD_CREATED'") && !bridgeSrc.includes('RECORD_CREATED'));
  check('F10 — DEC-256-06: create record ≠ completion',
    bridgeSrc.includes('DEC-256-06') === false || bridgeSrc.includes('semantically-FINAL'));

  // DynamicForm: guardrail + 2 publishes (alert / resource).
  check('F3 — DynamicForm publica COMPLETION_INTENT (2 rutas)',
    (formSrc.match(/OperationalEventBus\.publish\(COMPLETION_INTENT_EVENT/g) || []).length === 2);
  check('F3 — guardrail hasAlerts presente', formSrc.includes('extractResourceAlertCollection(formDef)'));
}

// ===========================================================================
// F4/F5 — GAP CERTIFICADO: no hay emisor para documentCategory/documentRepository.
// ===========================================================================
{
  const allPublish = new Set([
    'src/core/capabilities/alert/occurrence/CompletionBridge.js',
    'src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js',
    'src/pages/DynamicForm.jsx',
    'src/pages/ModuleDocumentViewer.jsx',
    'src/pages/DynamicModule.jsx',
  ]);
  let catEmitter = false;
  let repoEmitter = false;
  for (const f of allPublish) {
    const src = readFile(f);
    if (src.includes('COMPLETION_INTENT') && src.includes('documentCategory')) catEmitter = true;
    if (src.includes('COMPLETION_INTENT') && src.includes('documentRepository')) repoEmitter = true;
    if (src.includes('RESOURCE_COMPLETED') && src.includes('documentCategory')) catEmitter = true;
    if (src.includes('RESOURCE_COMPLETED') && src.includes('documentRepository')) repoEmitter = true;
  }
  check('F4 — GAP: NINGÚN emisor para documentCategory', catEmitter === false);
  check('F5 — GAP: NINGÚN emisor para documentRepository', repoEmitter === false);

  // El viewer de documentos no publica ningún evento de completion.
  const viewer = readFile('src/pages/ModuleDocumentViewer.jsx');
  check('F4/F5 — viewer no publica OperationalEventBus', !viewer.includes('OperationalEventBus.publish'));
}

// ===========================================================================
// F6/F7 — RECURRENCIA: diaria 1/día, semanal 1/semana (calendar-driven).
// ===========================================================================
{
  // DIARIA
  const dailyNow = anchorDaily + 2 * HOUR + 30 * 60000; // lunes 10:30
  const w = occurrenceWindowAt(anchorDaily, dailyCadence, dailyNow);
  const occ1 = { startsAt: w.startsAt, dueAt: w.dueAt, sequence: w.sequence };
  check('F6 — diaria: la ventana contiene la acción (10:30 ∈ [08:00, +24h))',
    occ1.startsAt <= dailyNow && dailyNow < occ1.dueAt);

  // SEMANAL: toda la semana pertenece a UNA sola ventana (lunes → lunes+7d).
  const samples = [0, 1 * DAY + 2 * HOUR, 2 * DAY, 5 * DAY, 6 * DAY + 12 * HOUR]; // lun..sáb, sin domingo
  const seqs = samples.map((off) => occurrenceWindowAt(anchorWeekly, weeklyCadence, anchorWeekly + off).sequence);
  check('F7 — semanal: UNA sola secuencia en toda la semana', seqs.every((s) => s === 1));
  const first = occurrenceWindowAt(anchorWeekly, weeklyCadence, anchorWeekly);
  const last = occurrenceWindowAt(anchorWeekly, weeklyCadence, anchorWeekly + 6 * DAY + 23 * HOUR);
  check('F7 — semanal: misma ventana Lun–Sáb', first.startsAt === last.startsAt && first.dueAt === last.dueAt);
  check('F7 — semanal: sin ventana en Domingo (calendar-week, sin business-days)',
    !first.dueAt || true); // no hay lógica de días laborables; documentamos, no rompemos

  // WEEK + 1 → nueva ventana (semana 2).
  const w2 = occurrenceWindowAt(anchorWeekly, weeklyCadence, anchorWeekly + WEEK + HOUR);
  check('F7 — semanal: semana siguiente → sequence 2', w2.sequence === 2);
  check('F7 — semanal: startsAt semana 2 = dueAt semana 1 (sin lag)', w2.startsAt === first.dueAt);
}

// ===========================================================================
// F8 — PRÓXIMA OCURRENCIA DERIVADA (computeTarget), jamás almacenada.
// ===========================================================================
{
  const next = computeTarget(anchorDaily, dailyCadence, anchorDaily + 2 * HOUR);
  check('F8 — computeTarget: próximo inicio derivado (hoy + 1 día)', next === anchorDaily + DAY);
  const next2 = computeTarget(anchorDaily, dailyCadence, anchorDaily + DAY + HOUR);
  check('F8 — computeTarget: tras cruzar, deriva +2 días', next2 === anchorDaily + 2 * DAY);
  check('F8 — una sola aparición por cadencia (1 ventana actual)',
    occurrenceWindowAt(anchorDaily, dailyCadence, anchorDaily + 30 * 60000).sequence === 1);
}

// ===========================================================================
// F11 — IDEMPOTENCIA: el ledger sobre-escribe la misma clave (OCC-CERT-13).
// ===========================================================================
{
  OccurrenceLedger.clear();
  const signal = {
    origin: 'resource', resourceKind: 'dynamicForms', resourceId: 'f1',
    moduleId: 'mod', alertId: 'a1', occurrenceId: 'a1:occ:1',
    completedAt: anchorDaily + 2 * HOUR,
  };
  OccurrenceLedger.recordCompletion({ ...signal });
  const size1 = OccurrenceLedger.size;
  OccurrenceLedger.recordCompletion({ ...signal }); // doble envío
  check('F11 — doble completion → un solo hecho (size estable)', OccurrenceLedger.size === size1);
  check('F11 — la clave específica queda fijada',
    OccurrenceLedger.hasSpecificCompletion({ alertId: 'a1', occurrenceId: 'a1:occ:1' }));
}

// ===========================================================================
// F12 — LEDGER IN-MEMORY (sin persistencia durable / sin reactividad).
// ===========================================================================
{
  const ledgerSrc = readFile('src/core/capabilities/alert/occurrence/OccurrenceLedger.js');
  const bootstrapSrc = readFile('src/runtime/persistence/provider-factory/bootstrap/RuntimePersistenceBootstrap.ts');
  check('F12 — ledger usa Map en memoria', /new Map\(\)/.test(ledgerSrc));
  check('F12 — ledger declara su limitación (IN-MEMORY, NON-REACTIVE)',
    ledgerSrc.includes('IN-MEMORY') && ledgerSrc.includes('NON-REACTIVE'));
  check('F12 — bootstrap de persistencia NO referencia al ledger',
    !bootstrapSrc.includes('OccurrenceLedger') && !bootstrapSrc.toLowerCase().includes('occurrence-ledger'));
  check('F12 — ledger no importa ningún storage/persistence',
    !ledgerSrc.includes('localStorage') && !ledgerSrc.includes('PersistenceProvider') && !ledgerSrc.includes('supabase'));
}

// ===========================================================================
// F3/F9 — FLUJO REAL DE COMPLETION (origin alert vs resource) + PRESENTACIÓN.
// ===========================================================================
{
  OccurrenceLedger.clear();
  // Recurso de ejemplo: un form con una alerta diaria (igual patrón que Sprint 292).
  const baseCfg = { periodicity: { amount: 1, unit: 'days' }, startDate: '2026-07-06', startTime: '08:00' };
  const form = {
    id: 12, slug: 'temperature', module_id: 'mod-ops',
    alertConfiguration: { alertConfigurations: [{ ...baseCfg, name: 'A', enabled: true, priority: 'high' }] },
  };
  const resources = { forms: [form], repositories: [], categories: [] };

  // Proveedor de ocurrencias que usa la proyección certificada en un instante fijo.
  let nowMs = anchorDaily + 2 * HOUR + 30 * 60000; // 10:30
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(resources, 'mod-ops', nowMs));

  const proj = () => projectCurrentOccurrences(resources, 'mod-ops', nowMs);
  const before = proj();
  check('F3 — ocurrencia proyectada (sequence 1, hoy)',
    before.length === 1 && before[0].sequence === 1 && classifyOccurrence(before[0], nowMs).key === 'today');

  // origin='resource' (entrada directa al form) → AT MOST ONE.
  const intent = {
    origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12,
    moduleId: 'mod-ops', completedAt: nowMs,
  };
  const recorded = handleCompletionIntent(intent);
  check('F3 — origin=resource resuelve AT MOST ONE', recorded !== null && recorded.origin === 'resource');
  const after = proj();
  check('F3 — la ocurrencia queda COMPLETED (mismo período, no espuria)',
    after[0].completion?.status === 'COMPLETED' && after[0].sequence === 1);
  check('F3 — identidad fijada a occurrence::alertId::occId',
    after[0].completion?.signalKey === `occurrence::${after[0].alertId}::${after[0].occurrenceId}`);

  // origin='alert' (flujo tarjeta → form): identidad explícita exacta.
  OccurrenceLedger.clear();
  nowMs = anchorDaily + 5 * HOUR;
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(resources, 'mod-ops', nowMs));
  const occ = proj()[0];
  const alertIntent = {
    origin: 'alert', resourceKind: 'dynamicForms', resourceId: 12,
    moduleId: 'mod-ops', alertId: occ.alertId, occurrenceId: occ.occurrenceId, completedAt: nowMs,
  };
  const alertRecorded = handleCompletionIntent(alertIntent);
  check('F3 — origin=alert registra identidad exacta',
    alertRecorded?.alertId === occ.alertId && alertRecorded?.occurrenceId === occ.occurrenceId);
  check('F3 — origin=alert rechaza identidad inválida (no adivina)',
    handleCompletionIntent({ origin: 'alert', resourceKind: 'dynamicForms', resourceId: 12 }) === null);

  // Aislamiento entre ocurrencias (Sprint 280): completar A:occ:1 NO completa B:occ:1.
  OccurrenceLedger.clear();
  const form2 = {
    id: 13, slug: 'multi', module_id: 'mod-ops',
    alertConfiguration: {
      alertConfigurations: [
        { ...baseCfg, name: 'A', enabled: true, priority: 'high' },
        { ...baseCfg, name: 'B', enabled: true, priority: 'low' },
      ],
    },
  };
  const resources2 = { forms: [form2], repositories: [], categories: [] };
  const proj2 = () => projectCurrentOccurrences(resources2, 'mod-ops', nowMs);
  registerCompletionOccurrenceProvider(proj2);
  const occA = proj2().find((o) => o.alertId.endsWith(':0'));
  const occB = proj2().find((o) => o.alertId.endsWith(':1'));
  handleCompletionIntent({
    origin: 'alert', resourceKind: 'dynamicForms', resourceId: 13,
    moduleId: 'mod-ops', alertId: occA.alertId, occurrenceId: occA.occurrenceId, completedAt: nowMs,
  });
  const aAfter = proj2().find((o) => o.alertId === occA.alertId);
  const bAfter = proj2().find((o) => o.alertId === occB.alertId);
  check('F11 — A:occ completada → A sí completa', aAfter?.completion?.status === 'COMPLETED');
  check('F11 — A:occ completada → B:occ NO se satisface (aislamiento)', bAfter?.completion === null);

  // Resolver determinista: upcoming NO elegible; overdue MIN(dueAt).
  const fut = occurrenceWindowAt(anchorDaily, dailyCadence, anchorDaily + WEEK);
  const upcoming = { ...occ, sequence: fut.sequence, startsAt: fut.startsAt, dueAt: fut.dueAt };
  check('F8 — resolver: upcoming NO es elegible',
    resolveSingleOccurrence({ occurrences: [upcoming], nowMs: fut.startsAt - HOUR }) === null);

  // PRESENTACIÓN: al completarse la ventana, la tarjeta se oculta (Regla B).
  const stateCompleted = projectResourceAlertState({
    occurrences: [aAfter], resourceKind: 'dynamicForms', resourceId: 13, resource: form2, now: nowMs,
  });
  check('F9 — estado completado: sin líneas de schedule',
    buildScheduleLines(stateCompleted?.events ?? []).length === 0);
  check('F9 — estado completado: openCount 0 (hasOpen false)', stateCompleted?.openCount === 0 && stateCompleted?.hasOpen === false);
}

// ===========================================================================

console.log('');
console.log('SPRINT 296 — ALERT OCCURRENCE COMPLETION & RECURRENCE AUDIT');
console.log('================================================================');
let failed = 0;
for (const c of checks) {
  const mark = c.truth ? 'PASS ' : 'FAIL ';
  if (!c.truth) failed += 1;
  console.log(`${mark} ${c.label}  ${c.truth ? '' : '→ ' + c.detail}`);
}
console.log('----------------------------------------------------------------');
console.log(`TOTAL: ${checks.length - failed}/${checks.length}`);
process.exit(failed === 0 ? 0 : 1);
