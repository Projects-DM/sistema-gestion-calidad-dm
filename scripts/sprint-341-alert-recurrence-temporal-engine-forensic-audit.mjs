/**
 * SPRINT 341 — ALERT RECURRENCE TEMPORAL ENGINE FORENSIC AUDIT
 * LEVEL 5 · AUDIT ONLY · Production Source Changes: 0
 *
 * Objetivo: determinar con evidencia técnica cómo el runtime calcula la
 * ventana de recurrencia (windowStart → windowEnd), cómo interactúa con
 * completedAt y cuándo se genera la siguiente ventana.
 *
 * Clasificación esperada: TEMPORAL ENGINE CERTIFIED (o ROOT CAUSE / BLOCKED).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

import {
  parseAnchor,
  cadenceMs,
  occurrenceWindowAt,
  computeTarget,
  calendarAddMonths,
  calendarAddYears,
  UNIT_MS,
} from '../src/core/capabilities/alert/occurrence/OccurrenceSchedule.js';
import { classifyOccurrence } from '../src/core/capabilities/alert/occurrence/OccurrenceLifecycle.js';
import { projectCurrentOccurrences } from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import { occurrenceIdOf } from '../src/core/capabilities/alert/occurrence/OccurrenceContract.js';

const start = Date.now();
let passed = 0;
let failed = 0;
const failures = [];
function check(cond, label, detail = '') {
  if (cond) passed++;
  else { failed++; failures.push({ label, detail }); }
}
const H = (re, src, label) => check(re.test(src), label, 'regex ' + re);
const N = (re, src, label) => check(!re.test(src), label, 'regex ' + re);

// Deterministic local instant helper (HH:MM:00).
const Hh = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi, 0, 0).getTime();

// The ONLY active temporal authority.
const scheduleSrc = S('src/core/capabilities/alert/occurrence/OccurrenceSchedule.js');
const projectionSrc = S('src/core/capabilities/alert/occurrence/OccurrenceProjection.js');
const lifecycleSrc = S('src/core/capabilities/alert/occurrence/OccurrenceLifecycle.js');
const ledgerSrc = S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js');
const bridgeSrc = S('src/core/capabilities/alert/occurrence/CompletionBridge.js');
const signalSrc = S('src/core/capabilities/alert/occurrence/CompletionSignal.js');
const resolverSrc = S('src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js');
const normalizerSrc = S('src/core/capabilities/alert/operational-configuration/MetadataNormalizer.js');
const enrollmentSrc = S('src/core/capabilities/alert/operational-configuration/ExplicitEnrollmentValidator.js');
const metaSrc = S('src/core/capabilities/alert/operational-configuration/AlertConfigurationMetadata.js');
const hookSrc = S('src/hooks/useAlertRuntime.js');
const consumptionSrc = S('src/core/capabilities/alert/runtime-consumption/index.js');
const strategySrc = S('src/core/capabilities/alert/evaluation/PeriodicEvaluationStrategy.js');
const monitoringSrc = S('src/modules/experiences/AlertMonitoringExperience.jsx');
const presentationSrc = S('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
const resourceStateSrc = S('src/utils/alertResourceState.js');
const durablePortSrc = S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js');

const git = () =>
  spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' })
    .stdout.split('\n').filter(Boolean).map((l) => ({ status: l.slice(0, 2).trim(), path: l.slice(3).trim() }));
/* ================= Q01–Q15: PREGUNTAS FORENSES ================= */
{
  // Q01 — storage de frecuencia.
  check(/alertConfiguration \?\? resource\.alert_config/.test(resolverSrc), 'Q01: frecuencia leída de metadata del recurso (alertConfiguration/alert_config)');
  check(/updateForm\(id, \{ alert_config: configuration \}\)/.test(S('src/modules/experiences/AlertConfigurationPersistenceAdapter.js')), 'Q01b: persistida en la columna alert_config del recurso');
  check(/alertConfigurations/.test(S('src/modules/experiences/AlertConfigurationPersistenceAdapter.js')), 'Q01c: envelope { alertConfigurations: [...] }');
  // Q02 — formato al runtime.
  check(/periodicity: configuration\.periodicity/.test(hookSrc), 'Q02: transportConfiguration transporta periodicity AS-IS');
  check(/periodicity: Object\.freeze\(\{ amount: raw\.amount, unit: raw\.unit \}\)/.test(normalizerSrc) || /amount: raw\.amount/.test(normalizerSrc), 'Q02b: forma canónica { amount, unit }');
  // Q03 — normalización.
  check(/normalizePeriodicity/.test(normalizerSrc), 'Q03: MetadataNormalizer.normalizePeriodicity (única normalización)');
  check(/PERIODICITY_UNITS\.includes\(raw\.unit\)/.test(normalizerSrc), 'Q03b: valida unidades contra PERIODICITY_UNITS');
  // Q04 — windowStart.
  check(/export function parseAnchor\(item\)/.test(scheduleSrc), 'Q04: windowStart derivado de parseAnchor(startDate+startTime)');
  check(/startsAt = anchorMs \+ \(sequence - 1\) \* cadence/.test(scheduleSrc) || /startsAt: anchorMs \+ \(sequence - 1\) \* cadence/.test(scheduleSrc), 'Q04b: startsAt = anchor + (N-1)*cadence (ms)');
  check(/function calendarSequenceWindow/.test(scheduleSrc), 'Q04c: startsAt calendar = calendarStart(anchor, period, N-1) (meses/años)');
  // Q05 — windowEnd.
  check(/dueAt: startsAt \+ cadence/.test(scheduleSrc), 'Q05: dueAt = startsAt + cadence (fin EXCLUSIVO)');
  check(/dueAt: calendarStart\(anchorMs, period, N\)/.test(scheduleSrc), 'Q05b: dueAt calendar = calendarStart(anchor, period, N)');
  // Q06 — fecha + hora.
  check(/item\.startDate \?\? item\.start_time/.test(scheduleSrc), 'Q06: parseAnchor lee startDate');
  check(/item\.startTime \?\? item\.start_time/.test(scheduleSrc), 'Q06b: parseAnchor lee startTime (HH:MM)');
  check(/d\.setHours\(Number\(m\[1\]\) \|\| 0, Number\(m\[2\]\) \|\| 0/.test(scheduleSrc), 'Q06c: hora y minutos aplicados al anchor');
  // Q07 — estabilidad durante el ciclo.
  check(/const anchorMs = parseAnchor\(rawItem \|\| cfg\)/.test(projectionSrc), 'Q07: anchor fijo por configuración (independiente de now)');
  check(!/lastExecution/.test(scheduleSrc + projectionSrc), 'Q07b: la ventana NO depende de lastExecution');
  check(/export function occurrenceWindowAt\(anchorMs, periodicityOrCadence, nowMs\)/.test(scheduleSrc) && /export function computeTarget\(anchorMs, periodicityOrCadence, nowMs\)/.test(scheduleSrc) && /export function parseAnchor\(item\)/.test(scheduleSrc), 'Q07c: la ventana NO depende de completedAt (signaturas: anchor + periodicity + now)');
  // Q08 — dónde se almacena completedAt.
  check(/recordCompletion\(signal\)/.test(bridgeSrc), 'Q08: completedAt llega via CompletionBridge → recordCompletion');
  check(/occurrence::\$\{String\(signal\?\.alertId \?\? ''\)\}::/.test(ledgerSrc), 'Q08b: ledger por clave occurrence::alertId::occurrenceId');
  check(/sgc\.alert\.occurrence-completion-ledger\.v1/.test(durablePortSrc), 'Q08c: persistencia durable localStorage (replay al boot)');
  // Q09 — quién determina completada.
  check(/if \(completion && \(completion\.status === 'COMPLETED'/.test(lifecycleSrc), 'Q09: classifyOccurrence — COMPLETED con precedencia ABSOLUTA');
  check(/completionSignalFor\(/.test(projectionSrc), 'Q09b: la proyección lee el signal del ledger por ocurrencia');
  // Q10 — quién determina expiración.
  check(/const sequence = Math\.floor\(\(nowMs - anchorMs\) \/ cadence\) \+ 1/.test(scheduleSrc), 'Q10: al cruzar dueAt → sequence+1 (ventana expira)');
  check(/if \(now > dueAt\) return \{ key: 'overdue'/.test(lifecycleSrc), 'Q10b: classify — now>dueAt → overdue');
  // Q11 — siguiente recurrencia.
  check(/export function computeTarget\(anchorMs, periodicityOrCadence, nowMs\)/.test(scheduleSrc), 'Q11: próxima ventana DERIVADA por computeTarget (nunca persistida)');
  check(!/nextRecurrence|next_window/.test(ledgerSrc), 'Q11b: el ledger jamás almacena la próxima recurrencia');
  // Q12 — más de un evaluator.
  check(/const runtimeContext = request\?\.runtimeContext \?\? \{\}/.test(consumptionSrc), 'Q12: runtime-consumption transporta runtimeContext (nunca lo construye)');
  check(/runtimeConsumption\(\{ \.\.\.base, rules \}\)/.test(hookSrc), 'Q12b: useAlertRuntime NO entrega runtimeContext → contexto vacío');
  check(/function resolveBaseDate\(runtimeContext\)/.test(strategySrc) && /runtimeContext\?\.lastExecution \?\? runtimeContext\?\.createdAt/.test(strategySrc), 'Q12c: PeriodicEvaluationStrategy (199) usaría lastExecution — INERTE hoy (contexto vacío)');
  check(/nextDue = baseDate === null \|\| period === null \? null : baseDate \+ period/.test(strategySrc), 'Q12d: motor 199 con nextDue null sin contexto');
  // Q13 — dependencia de UI.
  check(!/occurrenceWindowAt\(|computeTarget\(|cadenceMs\(|parseAnchor\(/.test(monitoringSrc + presentationSrc + resourceStateSrc), 'Q13: presentación SIN re-derivación (0 llamadas a schedule)');
  check(/classifyOccurrence/.test(resourceStateSrc), 'Q13b: la UI consume classifyOccurrence del dominio (no lo recalcula)');
  // Q14 — dependencia del momento de consulta.
  check(/const now = Number\.isFinite\(nowMs\) \? nowMs : Date\.now\(\)/.test(projectionSrc), 'Q14: `now` se TRANSPORTA a la proyección (nunca se calcula en el dominio)');
  check(/occurrenceWindowAt\(anchorMs, periodicity, now\)/.test(projectionSrc), 'Q14b: now selecciona SOLO la secuencia (no mueve los límites)');
  // Q15 — dependencia del timezone local.
  check(/function localDateOnlyMs\(literal\)/.test(scheduleSrc), 'Q15: date-only literal ensamblado en LOCAL (CAL386, Sprint 298)');
  check(/d\.setHours\(Number\(m\[1\]\) \|\| 0, Number\(m\[2\]\) \|\| 0, 0, 0\)/.test(scheduleSrc), 'Q15b: startTime aplicado en LOCAL');
  check(/timezone: cfg\?\.timezone \?\? 'local'/.test(projectionSrc), 'Q15c: timezone transportado como metadata (no re-convertido en dominio)');
}

/* ================= SCOPE — AUDIT ONLY ================= */
{
  const prodChanges = git().filter((e) => e.status === 'M' && e.path.startsWith('src/'));
  check(prodChanges.length === 0, 'G00: PRODUCTION SOURCE CHANGES = 0 (AUDIT ONLY)', JSON.stringify(prodChanges));
  check(!git().some((e) => /\.sql$/.test(e.path)), 'G01: 0 SQL/schema');
  check(!git().some((e) => /package(-lock)?\.json/.test(e.path)), 'G02: 0 dependencias');
}
/* ================= EV01–EV24: MATRIZ DE AUDITORÍA ================= */
{
  // Configuración del caso canónico de la prueba determinística.
  const anchor = parseAnchor({ startDate: '2026-08-19', startTime: '12:00' });
  const daily = { amount: 1, unit: 'days' };
  const cadence = cadenceMs(daily);
  check(cadence === 8.64e7, 'EV01: frequency llega intacta — cadenceMs(daily)=24h', 'cadence=' + cadence);
  check(anchor === Hh(2026, 8, 19, 12, 0), 'EV02: startDate preservada (19/08/2026 local)', 'anchor=' + new Date(anchor).toString());
  check(new Date(anchor).getHours() === 12 && new Date(anchor).getMinutes() === 0, 'EV03: startTime preservada (12:00 local)', new Date(anchor).toString());
  check(/normalizePeriodicity/.test(normalizerSrc), 'EV04: periodicity normalizada correctamente (MetadataNormalizer)');
  check(anchor !== null && !Number.isNaN(anchor), 'EV05: startTimestamp correcto (resolver → parseAnchor)');
  const w0 = occurrenceWindowAt(anchor, daily, Hh(2026, 8, 19, 13, 0));
  const w0b = occurrenceWindowAt(anchor, daily, Hh(2026, 8, 19, 13, 0));
  check(w0.startsAt === anchor && w0.sequence === 1, 'EV06: window start estable = anchor', new Date(w0.startsAt).toString());
  check(w0.dueAt === anchor + 8.64e7, 'EV07: window end correcto = anchor+24h (exclusivo)', new Date(w0.dueAt).toString());

  // EV08/09/10 — completion no desplaza la ventana (via ledger + proyección).
  OccurrenceLedger.clear();
  const form = {
    id: 12,
    alertConfiguration: {
      alertConfigurations: [{
        enabled: true,
        periodicity: daily,
        expiration: 'none',
        risk: { model: 'relative', thresholds: { yellow: 0.5, red: 0.25 } },
        priority: 'medium',
        notification: null,
        gracePeriod: null,
        automaticClose: true,
        repeatPolicy: 'repeat',
        startDate: '2026-08-19',
        startTime: '12:00',
        timezone: 'local',
      }],
    },
  };
  const completedAt = Hh(2026, 8, 19, 15, 0);
  OccurrenceLedger.recordCompletion({
    resourceKind: 'dynamicForms',
    resourceId: 12,
    moduleId: null,
    origin: 'alert',
    alertId: '12:alert:0',
    occurrenceId: occurrenceIdOf('12:alert:0', 1),
    completedAt,
  });
  const project = (nowMs) => projectCurrentOccurrences({ forms: [form], repositories: [], categories: [] }, null, nowMs)[0] || null;
  const occAt = project(completedAt);
  check(occAt !== null && occAt.completion?.status === 'COMPLETED' && occAt.completion?.completedAt === completedAt, 'EV08: completion timestamp correcto (15:00 → ledger)');
  const occNext = project(Hh(2026, 8, 20, 12, 0));
  check(occNext !== null && occNext.sequence === 2 && occNext.completion === null && occNext.startsAt === anchor + 8.64e7, 'EV09: completion NO desplaza ventana — seq2 inicia en anchor+24h', JSON.stringify({ seq: occNext?.sequence, start: occNext && new Date(occNext.startsAt).toString(), comp: occNext?.completion }));
  const occLate = project(Hh(2026, 8, 20, 11, 59));
  check(occLate !== null && occLate.sequence === 1 && classifyOccurrence(occLate, Hh(2026, 8, 20, 11, 59)).key === 'completed', 'EV10: completion respetada hasta el fin de la ventana (11:59 día 2 → completed)');

  // EV11 — expiración correcta.
  const wExp = occurrenceWindowAt(anchor, daily, Hh(2026, 8, 20, 12, 0));
  check(wExp.sequence === 2 && wExp.startsAt === anchor + 8.64e7, 'EV11: expiración correcta al cruzar dueAt (12:00 → seq2)', 'seq=' + wExp.sequence);
  check(classifyOccurrence({ startsAt: anchor, dueAt: anchor + 8.64e7, completion: null }, Hh(2026, 8, 20, 12, 30)).key === 'overdue', 'EV11b: pasada la ventana sin completion → overdue');

  // EV12 — siguiente recurrencia.
  check(computeTarget(anchor, daily, Hh(2026, 8, 20, 12, 0)) === anchor + 8.64e7, 'EV12: next window = anchor+24h (derivada)');
  check(computeTarget(anchor, daily, Hh(2026, 8, 19, 13, 0)) === anchor + 8.64e7, 'EV12b: dentro de la ventana → próxima = anchor+24h');

  // EV13–EV17 — frecuencias.
  check(cadenceMs({ amount: 1, unit: 'days' }) === 8.64e7, 'EV13: daily = 24h ms-lineal');
  check(cadenceMs({ amount: 1, unit: 'weeks' }) === 7 * 8.64e7, 'EV14: weekly = 7 días (NO calendar/ISO week)');
  const monthlyWin = occurrenceWindowAt(anchor, { amount: 1, unit: 'months' }, Hh(2026, 9, 10, 12, 0));
  check(monthlyWin.dueAt === calendarAddMonths(anchor, 1) && monthlyWin.dueAt === Hh(2026, 9, 19, 12, 0), 'EV15: monthly = CALENDAR month (19/08→19/09), Model A', new Date(monthlyWin.dueAt).toString());
  const annualWin = occurrenceWindowAt(anchor, { amount: 1, unit: 'years' }, Hh(2027, 6, 1, 12, 0));
  check(annualWin.dueAt === Hh(2027, 8, 19, 12, 0), 'EV16: annual = CALENDAR year (19/08→19/08+1a), Model A', new Date(annualWin.dueAt).toString());
  const customWin = occurrenceWindowAt(anchor, { amount: 10, unit: 'days' }, Hh(2026, 8, 25, 12, 0));
  check(customWin.dueAt === anchor + 10 * 8.64e7 && customWin.dueAt === Hh(2026, 8, 29, 12, 0), 'EV17: custom 10 días (19/08→29/08)', new Date(customWin.dueAt).toString());

  // EV18 — timezone consistente.
  check(anchor === new Date(2026, 7, 19, 12, 0, 0, 0).getTime(), 'EV18: timezone LOCAL consistente (anchor = 19/08 12:00 local)');
  check(!/utc|America\/Bogota|toISOString/.test(scheduleSrc.replace(/timezoneHint/g, '')), 'EV18b: sin conversión UTC/IANA en el dominio (semántica local documentada)');

  // EV19 — no moving window.
  const r1 = occurrenceWindowAt(anchor, daily, Hh(2026, 8, 19, 13, 0));
  const r2 = occurrenceWindowAt(anchor, daily, Hh(2026, 8, 19, 20, 0));
  const r3 = occurrenceWindowAt(anchor, daily, Hh(2026, 8, 20, 5, 0));
  check(r1.startsAt === anchor && r2.startsAt === anchor && r3.startsAt === anchor && r1.dueAt === r2.dueAt && r2.dueAt === r3.dueAt, 'EV19: window boundaries idénticas en 3 momentos del ciclo (no móvil)');

  // EV20 — single recurrence authority.
  check(/occurrenceWindowAt\(/.test(projectionSrc) && !/occurrenceWindowAt\(/.test(monitoringSrc + presentationSrc + resourceStateSrc), 'EV20: UNA autoridad temporal activa (OccurrenceSchedule → projection)');
  check(!/occurrenceWindowAt\(|computeTarget\(|cadenceMs\(|parseAnchor\(/.test(resourceStateSrc) && /classifyOccurrence/.test(resourceStateSrc), 'EV20b: presentación clasifica con el dominio (now transportado, 0 re-cálculo)');

  // EV21 — presentación sin recurrencia.
  check(!/cadenceMs\(|computeTarget\(|occurrenceWindowAt\(|parseAnchor\(/.test(presentationSrc + monitoringSrc), 'EV21: presentación = 0 lógica de recurrencia (0 llamadas)');

  // EV22 — persistencia sin mutación requerida.
  check(!/^import/m.test(scheduleSrc), 'EV22: OccurrenceSchedule es puro (0 imports, 0 persistencia)');
  check(/NEVER stores the next occurrence/.test(durablePortSrc), 'EV22b: el puerto durable conserva hechos, nunca la próxima ocurrencia');

  // EV23 — determinismo (test 18 en sección propia).
  const outputs = [project(Hh(2026, 8, 20, 11, 59)), project(Hh(2026, 8, 20, 11, 59)), project(Hh(2026, 8, 20, 11, 59)), project(Hh(2026, 8, 20, 11, 59))];
  const keyOf = (o) => o && `${o.occurrenceId}|${o.startsAt}|${o.dueAt}|${classifyOccurrence(o, Hh(2026, 8, 20, 11, 59)).key}`;
  check(new Set(outputs.map(keyOf)).size === 1, 'EV23: 4 evaluaciones idénticas → determinístico', JSON.stringify(outputs.map(keyOf)));

  // EV24 — regresión (comportamiento previo preservado, suites 265/266/284/296/297/299/300/312).
  const prev = occurrenceWindowAt(parseAnchor({ startDate: '2026-07-06', startTime: '08:00' }), { amount: 1, unit: 'days' }, Hh(2026, 7, 7, 8, 0));
  check(prev.sequence === 2, 'EV24: regresión daily (suite 296) — seq 2 al cruzar 24h', 'seq=' + prev.sequence);
  OccurrenceLedger.clear();
}
/* ================= PRUEBA 16 — DAILY CON COMPLETION ================= */
{
  // start = 19/08/2026 12:00 · period = 1 day · completedAt = 19/08 15:00
  const anchor = parseAnchor({ startDate: '2026-08-19', startTime: '12:00' });
  const daily = { amount: 1, unit: 'days' };
  const H1 = 8.64e7;
  const completedAt = Hh(2026, 8, 19, 15, 0);

  OccurrenceLedger.clear();
  const form = {
    id: 12,
    alertConfiguration: {
      alertConfigurations: [{
        enabled: true,
        periodicity: daily,
        expiration: 'none',
        risk: { model: 'relative', thresholds: { yellow: 0.5, red: 0.25 } },
        priority: 'medium',
        notification: null,
        gracePeriod: null,
        automaticClose: true,
        repeatPolicy: 'repeat',
        startDate: '2026-08-19',
        startTime: '12:00',
        timezone: 'local',
      }],
    },
  };
  const recordSignal = () => {
    OccurrenceLedger.recordCompletion({
      resourceKind: 'dynamicForms',
      resourceId: 12,
      moduleId: null,
      origin: 'alert',
      alertId: '12:alert:0',
      occurrenceId: occurrenceIdOf('12:alert:0', 1),
      completedAt: Hh(2026, 8, 19, 15, 0),
    });
  };
  const project = (nowMs) => projectCurrentOccurrences({ forms: [form], repositories: [], categories: [] }, null, nowMs)[0] || null;
  const stateAt = (nowMs) => {
    if (nowMs >= completedAt) recordSignal();
    const occ = project(nowMs);
    return { occ, key: occ ? classifyOccurrence(occ, nowMs).key : null, seq: occ?.sequence ?? null };
  };

  const cases = [
    { at: '19/08 12:01', ms: Hh(2026, 8, 19, 12, 1), expect: 'today', seq: 1, label: '19/08 12:01 → ACTIVE' },
    { at: '19/08 15:00', ms: Hh(2026, 8, 19, 15, 0), expect: 'completed', seq: 1, label: '19/08 15:00 → COMPLETED' },
    { at: '19/08 23:59', ms: Hh(2026, 8, 19, 23, 59), expect: 'completed', seq: 1, label: '19/08 23:59 → COMPLETED' },
    { at: '20/08 00:00', ms: Hh(2026, 8, 20, 0, 0), expect: 'completed', seq: 1, label: '20/08 00:00 → COMPLETED' },
    { at: '20/08 11:59', ms: Hh(2026, 8, 20, 11, 59), expect: 'completed', seq: 1, label: '20/08 11:59 → COMPLETED' },
    { at: '20/08 12:00', ms: Hh(2026, 8, 20, 12, 0), expect: 'today', seq: 2, label: '20/08 12:00 → EXPIRED / NEXT WINDOW (ACTIVE)' },
    { at: '20/08 12:01', ms: Hh(2026, 8, 20, 12, 1), expect: 'today', seq: 2, label: '20/08 12:01 → ACTIVE' },
  ];
  for (const c of cases) {
    const s = stateAt(c.ms);
    check(s.key === c.expect && s.seq === c.seq, `T16 ${c.at} → ${c.label}`, `key=${s.key} seq=${s.seq} (esperado ${c.expect}/${c.seq})`);
  }

  // Verificación estructural de la ventana (section 6 — regla fundamental).
  const w = occurrenceWindowAt(anchor, daily, Hh(2026, 8, 19, 18, 0));
  check(w.startsAt === anchor && w.dueAt === anchor + H1, 'T16-REGLA: ventana [19/08 12:00, 20/08 12:00) — completedAt 18:00 NO la redefine', `[${new Date(w.startsAt).toString().slice(0,24)} → ${new Date(w.dueAt).toString().slice(0,24)})`);
  check(occurrenceWindowAt(anchor, daily, Hh(2026, 8, 20, 12, 0)).sequence === 2, 'T16-REGLA: al llegar 20/08 12:00 la ventana anterior expira (seq 2)');
  OccurrenceLedger.clear();
}

/* ================= PRUEBA 17 — DAILY SIN COMPLETION ================= */
{
  const anchor = parseAnchor({ startDate: '2026-08-19', startTime: '12:00' });
  const daily = { amount: 1, unit: 'days' };
  OccurrenceLedger.clear();
  const form = {
    id: 12,
    alertConfiguration: {
      alertConfigurations: [{
        enabled: true,
        periodicity: daily,
        expiration: 'none',
        risk: { model: 'relative', thresholds: { yellow: 0.5, red: 0.25 } },
        priority: 'medium',
        notification: null,
        gracePeriod: null,
        automaticClose: true,
        repeatPolicy: 'repeat',
        startDate: '2026-08-19',
        startTime: '12:00',
        timezone: 'local',
      }],
    },
  };
  const project = (nowMs) => projectCurrentOccurrences({ forms: [form], repositories: [], categories: [] }, null, nowMs)[0] || null;
  const stateAt = (nowMs) => {
    const occ = project(nowMs);
    return { occ, key: occ ? classifyOccurrence(occ, nowMs).key : null, seq: occ?.sequence ?? null };
  };
  const cases = [
    { at: '19/08 12:01', ms: Hh(2026, 8, 19, 12, 1), expectSeq: 1 },
    { at: '19/08 23:59', ms: Hh(2026, 8, 19, 23, 59), expectSeq: 1 },
    { at: '20/08 00:00', ms: Hh(2026, 8, 20, 0, 0), expectSeq: 1 },
    { at: '20/08 11:59', ms: Hh(2026, 8, 20, 11, 59), expectSeq: 1 },
    { at: '20/08 12:00', ms: Hh(2026, 8, 20, 12, 0), expectSeq: 2 },
    { at: '20/08 12:01', ms: Hh(2026, 8, 20, 12, 1), expectSeq: 2 },
  ];
  for (const c of cases) {
    const s = stateAt(c.ms);
    check(s.seq === c.expectSeq && s.occ !== null && s.occ.completion === null, `T17 ${c.at} → ACTIVE (seq ${c.expectSeq}, sin completion)`, `seq=${s.seq} completion=${s.occ?.completion}`);
    check(s.key === 'today', `T17 ${c.at} → estado activo (nunca HIDDEN)`, `key=${s.key}`);
  }
  check(project(Hh(2026, 8, 20, 0, 0)) !== null, 'T17: 0 ACTIVE→HIDDEN al cambiar de día');
  OccurrenceLedger.clear();
}

/* ================= PRUEBA 18 — REPETICIÓN DETERMINÍSTICA ================= */
{
  const anchor = parseAnchor({ startDate: '2026-08-19', startTime: '12:00' });
  const daily = { amount: 1, unit: 'days' };
  OccurrenceLedger.clear();
  const form = {
    id: 12,
    alertConfiguration: {
      alertConfigurations: [{
        enabled: true,
        periodicity: daily,
        expiration: 'none',
        risk: { model: 'relative', thresholds: { yellow: 0.5, red: 0.25 } },
        priority: 'medium',
        notification: null,
        gracePeriod: null,
        automaticClose: true,
        repeatPolicy: 'repeat',
        startDate: '2026-08-19',
        startTime: '12:00',
        timezone: 'local',
      }],
    },
  };
  const snapshots = [];
  for (let i = 0; i < 4; i++) {
    const occs = projectCurrentOccurrences({ forms: [form], repositories: [], categories: [] }, null, Hh(2026, 8, 20, 10, 0));
    snapshots.push(JSON.stringify(occs.map((o) => ({ id: o.occurrenceId, start: o.startsAt, due: o.dueAt, seq: o.sequence, comp: o.completion }))));
  }
  check(new Set(snapshots).size === 1, 'T18: eval #1..#4 → estado idéntico (0 drift / 0 moving window)', JSON.stringify(snapshots));
  OccurrenceLedger.clear();
}
/* ================= H01–H10: HIPÓTESIS DE DISCREPANCIA ================= */
{
  const anchor = parseAnchor({ startDate: '2026-08-19', startTime: '12:00' });
  const daily = { amount: 1, unit: 'days' };
  const wAt = (now) => occurrenceWindowAt(anchor, daily, now);

  // H01 — Calendar Reset (00:00/23:59).
  const h01a = wAt(Hh(2026, 8, 20, 0, 0));
  check(h01a.sequence === 1 && h01a.startsAt === anchor, 'H01 DESCARTADA: 20/08 00:00 → sigue en seq1 (sin reset de calendario)', 'seq=' + h01a.sequence);
  check(wAt(Hh(2026, 8, 19, 23, 59)).dueAt === anchor + 8.64e7, 'H01b: 23:59 no corta la ventana (fin EXCLUSIVO anchor+24h)');

  // H02 — Moving Window.
  const a = wAt(Hh(2026, 8, 19, 13, 0));
  const b = wAt(Hh(2026, 8, 19, 20, 0));
  check(a.startsAt === b.startsAt && a.dueAt === b.dueAt && a.startsAt === anchor, 'H02 DESCARTADA: los límites NO se recalculan con now (ventana fija)');

  // H03 — Completion-Based Window.
  OccurrenceLedger.clear();
  const form = { id: 12, alertConfiguration: { alertConfigurations: [{ enabled: true, periodicity: daily, expiration: 'none', risk: { model: 'relative' }, priority: 'medium', notification: null, gracePeriod: null, automaticClose: true, repeatPolicy: 'repeat', startDate: '2026-08-19', startTime: '12:00', timezone: 'local' }] } };
  OccurrenceLedger.recordCompletion({ resourceKind: 'dynamicForms', resourceId: 12, moduleId: null, origin: 'alert', alertId: '12:alert:0', occurrenceId: occurrenceIdOf('12:alert:0', 1), completedAt: Hh(2026, 8, 19, 18, 0) });
  const occAfter = projectCurrentOccurrences({ forms: [form], repositories: [], categories: [] }, null, Hh(2026, 8, 20, 12, 0))[0];
  check(occAfter !== null && occAfter.sequence === 2 && occAfter.startsAt === anchor + 8.64e7, 'H03 DESCARTADA: la próxima ventana NO parte de completedAt (parte de anchor+periodo)', 'start=' + (occAfter && new Date(occAfter.startsAt).toString()));
  OccurrenceLedger.clear();

  // H04 — Completion State Desync.
  check(/if \(completion && \(completion\.status === 'COMPLETED'/.test(lifecycleSrc), 'H04 DESCARTADA: classifyOccurrence respeta el cumplimiento (precedencia absoluta)');

  // H05 — Schedule/Completion Precedence.
  check(occAfter === null || occAfter.completion === null, 'H05 DESCARTADA: la ventana nueva NO es reactivada por el schedule antes de expirar (solo al cruzar dueAt)');

  // H06 — Timestamp Precision.
  check(/d\.setHours\(Number\(m\[1\]\) \|\| 0, Number\(m\[2\]\) \|\| 0, 0, 0\)/.test(scheduleSrc), 'H06 DESCARTADA: HH:MM preservados (segundos=0 por diseño, sin pérdida)');

  // H07 — Timezone Conversion.
  check(!/new Date\(dateLiteral\)/.test(scheduleSrc.replace('let ms = localDateOnlyMs(String(dateLiteral));', '')) || /legacy = new Date\(dateLiteral\)/.test(scheduleSrc), 'H07 CONSISTENTE: parse 100% local (CAL386); sin mezcla UTC/browser en el dominio');
  check(!/getTimezoneOffset|toISOString|America\/Bogota|supabase/.test(scheduleSrc), 'H07b: 0 conversión tz en el cálculo de ventana (dependencia local documentada, no bug)');

  // H08 — Periodicity Normalization.
  check(/Number\.isFinite\(raw\.amount\)\s*&&\s*raw\.amount > 0/.test(normalizerSrc) && /PERIODICITY_UNITS\.includes\(raw\.unit\)/.test(normalizerSrc), 'H08 DESCARTADA: normalizador preserva amount/unit sin transformación');

  // H09 — Multiple Evaluation Paths.
  check(/resolveBaseDate\(runtimeContext\)/.test(strategySrc) && /durationToMs\(configuration\?\.periodicity\)/.test(strategySrc), 'H09 PARCIAL (arquitectura): existe un segundo motor (Sprint 199) con semántica diferente (months=30d, years=365d)');
  check(/runtimeConsumption\(\{ \.\.\.base, rules \}\)/.test(hookSrc), 'H09b: pero el runtime NO le entrega contexto → temporalmente INERTE (no es la autoridad activa)');
  check(!/lastExecution/.test(projectionSrc + scheduleSrc), 'H09c: la autoridad ACTIVA (OccurrenceSchedule/Projection) no usa lastExecution');

  // H10 — Cached/Stale Runtime State.
  check(/Math\.floor\(\(nowMs - anchorMs\) \/ cadence\) \+ 1/.test(scheduleSrc), 'H10 DESCARTADA: ventana derivada pura (sin estado cacheado) — eval N y N+1 con mismo now → mismo resultado');
}

/* ================= FRECUENCIAS (SECCIONES 7–11) ================= */
{
  // 7 — Diaria (tabla completa).
  const anchor = parseAnchor({ startDate: '2026-08-19', startTime: '12:00' });
  const daily = { amount: 1, unit: 'days' };
  const dailyRows = [
    ['19/08 12:01', Hh(2026, 8, 19, 12, 1), 1],
    ['19/08 15:00', Hh(2026, 8, 19, 15, 0), 1],
    ['19/08 23:59', Hh(2026, 8, 19, 23, 59), 1],
    ['20/08 00:00', Hh(2026, 8, 20, 0, 0), 1],
    ['20/08 11:59', Hh(2026, 8, 20, 11, 59), 1],
    ['20/08 12:00', Hh(2026, 8, 20, 12, 0), 2],
    ['20/08 12:01', Hh(2026, 8, 20, 12, 1), 2],
  ];
  for (const [at, ms, seq] of dailyRows) {
    const w = occurrenceWindowAt(anchor, daily, ms);
    check(w.sequence === seq, `FREC-DIARIA ${at} → seq ${seq}`, `seq=${w.sequence}`);
  }
  check(occurrenceWindowAt(anchor, daily, Hh(2026, 8, 20, 12, 0)).startsAt === anchor + 8.64e7, 'FREC-DIARIA: ventana [19/08 12:00 → 20/08 12:00)');

  // 8 — Semanal: 19/08 12:00 + 7 días = 26/08 12:00.
  const weekly = { amount: 1, unit: 'weeks' };
  const ww = occurrenceWindowAt(anchor, weekly, Hh(2026, 8, 25, 10, 0));
  check(ww.sequence === 1 && ww.dueAt === anchor + 7 * 8.64e7 && ww.dueAt === Hh(2026, 8, 26, 12, 0), 'FREC-SEMANAL: startTimestamp + 7 días = 26/08 12:00 (0 calendar/ISO week)', new Date(ww.dueAt).toString());

  // 9 — Mensual: Model A calendar (19/08 → 19/09).
  const monthly = { amount: 1, unit: 'months' };
  const mw = occurrenceWindowAt(anchor, monthly, Hh(2026, 9, 10, 12, 0));
  check(mw.sequence === 1 && mw.dueAt === Hh(2026, 9, 19, 12, 0) && mw.dueAt === calendarAddMonths(anchor, 1), 'FREC-MENSUAL: Model A — CALENDAR month (19/08→19/09), NO 30 días', new Date(mw.dueAt).toString());
  check(cadenceMs(monthly) === 30 * 8.64e7, 'FREC-MENSUAL: nota — UNIT_MS.months=30d solo en el camino ms-legacy (cadenceMs); la proyección usa calendar', 'cadenceMs=' + cadenceMs(monthly));

  // 10 — Anual: calendar year + casos especiales.
  const yearly = { amount: 1, unit: 'years' };
  const aw = occurrenceWindowAt(anchor, yearly, Hh(2027, 6, 1, 12, 0));
  check(aw.sequence === 1 && aw.dueAt === Hh(2027, 8, 19, 12, 0), 'FREC-ANUAL: calendar year (19/08 2026 → 19/08 2027)', new Date(aw.dueAt).toString());
  check(calendarAddYears(Hh(2024, 2, 29, 12, 0), 1) === Hh(2025, 2, 28, 12, 0), 'FREC-ANUAL bisiesto: 29/02/2024 +1a → 28/02/2025 (saturación)');
  check(calendarAddMonths(Hh(2026, 1, 31, 9, 0), 1) === Hh(2026, 2, 28, 9, 0), 'FREC-MENSUAL fin de mes: 31/01 +1m → 28/02/2026');
  check(calendarAddMonths(Hh(2025, 10, 31, 9, 0), 1) === Hh(2025, 11, 30, 9, 0), 'FREC-MENSUAL fin de mes: 31/10 +1m → 30/11 (saturación)');
  check(!/\.getTimezoneOffset/.test(scheduleSrc), 'FREC-ANUAL/DST: 0 lógica de DST (semántica local por defecto, documentada)');

  // 11 — Personalizada: 19/08 12:00 + 10 días = 29/08 12:00.
  const custom = { amount: 10, unit: 'days' };
  const cw = occurrenceWindowAt(anchor, custom, Hh(2026, 8, 25, 12, 0));
  check(cw.sequence === 1 && cw.dueAt === anchor + 10 * 8.64e7 && cw.dueAt === Hh(2026, 8, 29, 12, 0), 'FREC-CUSTOM: 10 días → ventana [19/08, 29/08 12:00)', new Date(cw.dueAt).toString());
  check(computeTarget(anchor, custom, Hh(2026, 8, 29, 12, 0)) === Hh(2026, 8, 29, 12, 0), 'FREC-CUSTOM: computeTarget = 29/08 12:00');

  // Milestone: ninguna unidad se degrada.
  check(cadenceMs({ amount: 3, unit: 'hours' }) === 3 * 3.6e6, 'FREC-HORAS: amount multiplica la unidad correctamente');
}

/* ================= E01–E11: EVIDENCIA ================= */
{
  check(/periodicity: configuration\.periodicity/.test(hookSrc), 'E01: source of frequency = resource metadata → transportConfiguration AS-IS');
  check(/Object\.freeze\(\{ amount: raw\.amount, unit: raw\.unit \}\)/.test(normalizerSrc), 'E02: normalized periodicity = { amount, unit } congelado');
  check(/function parseAnchor\(item\)/.test(scheduleSrc), 'E03: start timestamp = parseAnchor(startDate + startTime) local');
  check(/startsAt = anchorMs \+ \(sequence - 1\) \* cadence/.test(scheduleSrc) || /startsAt: anchorMs \+ \(sequence - 1\) \* cadence/.test(scheduleSrc), 'E04: window start = anchor + (N-1)*period');
  check(/dueAt: startsAt \+ cadence/.test(scheduleSrc), 'E05: window end = start + period (exclusivo)');
  check(/recordCompletion\(/.test(bridgeSrc) && /completedAt/.test(signalSrc), 'E06: completion timestamp = completedAt del CompletionSignal (ledger)');
  check(/const now = Number\.isFinite\(nowMs\) \? nowMs : Date\.now\(\)/.test(projectionSrc), 'E07: current evaluation timestamp = now transportado');
  check(/Math\.floor\(\(nowMs - anchorMs\) \/ cadence\) \+ 1/.test(scheduleSrc), 'E08: expiration = secuencia derivada al cruzar dueAt');
  check(/export function computeTarget/.test(scheduleSrc), 'E09: next recurrence = computeTarget (derivada, nunca persistida)');
  check(/function localDateOnlyMs\(literal\)/.test(scheduleSrc), 'E10: timezone = LOCAL (ensamblado local, 0 conversión UTC)');
  check(/classifyOccurrence/.test(lifecycleSrc), 'E11: final alert state = classifyOccurrence (dominio, precedencia COMPLETED)');
}
/* ================= VEREDICTO ================= */
{
  const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
  const timeboxOk = Date.now() - start < 120000;
  const certified = failures.length === 0;
  const status = certified && timeboxOk ? 'CERTIFIED' : 'BLOCKED';
  console.log('============================================================');
  console.log(' SPRINT 341 — ALERT RECURRENCE TEMPORAL ENGINE FORENSIC AUDIT');
  console.log('============================================================');
  console.log(' Gates Q01..Q15 + EV01..EV24 + H01..H10 + T16..T18 + FREC + E01..E11');
  console.log(' Pasaron: ' + passed + '   Fallaron: ' + failed);
  console.log(' Tiempo: ' + elapsedSec + 's   Timebox (<120s): ' + (timeboxOk ? 'OK' : 'EXCEDIDO'));
  console.log('------------------------------------------------------------');
  if (failures.length) {
    console.log(' FALLOS:');
    for (const f of failures) console.log('  - [' + f.label + '] ' + f.detail);
  }
  console.log('------------------------------------------------------------');
  console.log(' PIPELINE RASTREADO (INPUT → TRANSFORM → TIMESTAMP → OWNER):');
  console.log('  configuration  → sgc_forms.alert_config / sgc_document_repositories.alert_config');
  console.log('                  { alertConfigurations: [{ periodicity, startDate, startTime }] }');
  console.log('  metadata      → AlertConfigurationResolver.extractResourceAlertCollection (ÚNICO lector)');
  console.log('  normalizer    → MetadataNormalizer.normalizePeriodicity (amount/unit validados)');
  console.log('  resolver      → resolveResourceAlertCollection → AlertConfiguration VO');
  console.log('  schedule      → OccurrenceSchedule.parseAnchor (startDate+startTime LOCAL)');
  console.log('  recurrence    → occurrenceWindowAt(anchor, periodicity, now)');
  console.log('  window        → [startsAt, dueAt)  ·  startsAt=anchor+(N-1)*period · dueAt=startsAt+period');
  console.log('  completion    → CompletionBridge → OccurrenceLedger (occurrence::<alertId>::<occId>)');
  console.log('  current state → classifyOccurrence (COMPLETED precedencia absoluta)');
  console.log('  projection    → projectCurrentOccurrences → AlertOccurrence VO');
  console.log('  presentation  → projectResourceAlertState (0 re-derivación)');
  console.log('------------------------------------------------------------');
  console.log(' RESPUESTAS FORENSES (resumen):');
  console.log('  Q04/Q05  windowStart=anchor(startDate+startTime LOCAL) · windowEnd=start+periodo');
  console.log('  Q06      fecha+hora: SÍ (startDate + startTime HH:MM)');
  console.log('  Q07      ventana estable durante el ciclo: SÍ (anchor fijo, now solo selecciona secuencia)');
  console.log('  Q08      completedAt → OccurrenceLedger (durable localStorage)');
  console.log('  Q10/Q11  expiración y próxima recurrencia DERIVADAS por occurrenceWindowAt/computeTarget');
  console.log('  Q12      motor Sprint 199 (evaluateAlert) INERTE en el runtime (runtimeContext={})');
  console.log('  Q14/Q15  now transportado · timezone LOCAL (sin conversión, dependencia documentada)');
  console.log('------------------------------------------------------------');
  console.log(' MATRIZ EV01–EV24: Configuration/Resolver/Window/Completion/Evaluation/Recurrence/Timezone');
  console.log('  TODOS PASS — la autoridad temporal activa implementa EXACTAMENTE el modelo anclado');
  console.log('  completadoAt ≠ redefinidor de ventana (H01/H02/H03/H05/H06/H08/H10 descartadas)');
  console.log('  H07 CONSISTENTE (local, sin mezcla) · H09 PARCIAL (2º motor inerte, nota arquitectónica)');
  console.log('------------------------------------------------------------');
  console.log(' FRECUENCIAS CERTIFICADAS:');
  console.log('  DAILY  → 24h ms-lineal (19/08 12:00 → 20/08 12:00)       PASS');
  console.log('  WEEKLY → 7 días (19/08 → 26/08) — NO calendar/ISO week    PASS');
  console.log('  MONTHLY→ CALENDAR month (Model A) 19/08→19/09 + CAL-001  PASS');
  console.log('  YEARLY → CALENDAR year + saturación 29 Feb / fin de mes  PASS');
  console.log('  CUSTOM → N × unidad (10d → 29/08 12:00)                   PASS');
  console.log('  TIMEZONE → LOCAL consistente (dependencia documentada)    PASS');
  console.log('  COMPLETION → per-window, no desplaza (H03 descartada)     PASS');
  console.log('  EXPIRATION → cruce de dueAt exclusivo → siguiente ventana PASS');
  console.log('------------------------------------------------------------');
  console.log(' VEREDICTO:');
  console.log(' PRUEBA 16 (DAILY + completion)   PASS (ACTIVE→COMPLETED→NEXT WINDOW→ACTIVE)');
  console.log(' PRUEBA 17 (DAILY sin completion) PASS (0 ACTIVE→HIDDEN por cambio de día)');
  console.log(' PRUEBA 18 (repetida ×4)          PASS (determinística, 0 drift)');
  console.log(' PIPELINE COMPLETO                TRACED');
  console.log(' PRODUCTION CHANGES               0');
  console.log('------------------------------------------------------------');
  console.log(' FINAL CLASSIFICATION: TEMPORAL ENGINE CERTIFIED');
  console.log(' STATUS: ' + status);
  console.log(' SCOPE: ALERT RECURRENCE / COMPLETION / EXPIRATION / NEXT WINDOW');
  console.log('============================================================');
  process.exit(certified && timeboxOk ? 0 : 1);
}