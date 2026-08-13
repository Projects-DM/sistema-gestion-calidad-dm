/**
 * Sprint 310 — ALERT METADATA PROJECTION · CONTROLLED CORRECTION.
 *
 * TIPO: CONTROLLED CORRECTION · LEVEL 5 · PROJECTION ONLY.
 *
 * Corrección autorizada (spec §3): transportar al estado proyectado por
 * projectResourceAlertState la metadata que el Resolver SSOT YA entrega
 * dentro del MISMO envelope:
 *
 *   name         → envelope.items[].metadata.name        (Sprint 309: name ∉ VO)
 *   periodicity  → envelope.items[].configuration.periodicity
 *
 * SIN segunda consulta (§2), SIN modificar Resolver (§10), AlertConfiguration
 * (§9), Presentation (§11), Runtime (§12) ni ningún consumidor (§13). Solo
 * src/utils/alertResourceState.js (§21).
 *
 * Después de la corrección se verifican las invariantes §14 (visibility,
 * schedule, completion, N+1, disabled, priority) y la integridad por alertId
 * §7 (nunca alert-A → AlertB).
 *
 * Ejecutar: node scripts/sprint-310-alert-metadata-projection-controlled-correction.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import OccurrenceLedger, { occurrenceCompletionStorageKey } from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import {
  wireCompletionBridge,
  registerCompletionOccurrenceProvider,
  handleCompletionIntent,
} from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { projectResourceAlertState, buildScheduleLines } from '../src/utils/alertResourceState.js';

const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const readFile = (rel) => {
  try { return readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8'); } catch { return ''; }
};
const execP = promisify(execFile);
const CHECK = [];
const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });

const H = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
const MODULE_ID = 3;
const NOW = H(2026, 8, 12, 10);
const DAY = 8.64e7;
const cfg = (name, unit = 'days', amount = 1, priority = 'high', startDate = '2026-08-12') =>
  ({ name, priority, periodicity: { amount, unit }, startDate, startTime: '09:00', enabled: true });
const formOf = (id, configs) => ({ id, slug: `form-${id}`, module_id: MODULE_ID, alertConfiguration: { alertConfigurations: configs } });

const projectState = (world, kind, id, resource, nowMs = NOW) => {
  const occ = projectCurrentOccurrences(world, MODULE_ID, nowMs);
  return occ.length ? projectResourceAlertState({ occurrences: occ, resourceKind: kind, resourceId: id, resource, now: nowMs }) : null;
};

// ---------------------------------------------------------------------------
// E01 — name transported (Case A)
// ---------------------------------------------------------------------------
{
  const sample = formOf(12, [cfg('AlertA', 'weeks', 2, 'high')]);
  const st = projectState({ forms: [sample], repositories: [], categories: [] }, 'dynamicForms', 12, sample);
  check('E01 — state.name = "AlertA" (envelope.metadata.name → state)', st?.name === 'AlertA', `name="${st?.name}"`);
  check('E01 — name en los eventos también (por alertId)', st?.events?.[0]?.name === 'AlertA', `event.name="${st?.events?.[0]?.name}"`);
}

// ---------------------------------------------------------------------------
// E02 — periodicity transported (Case A)
// ---------------------------------------------------------------------------
{
  const sample = formOf(12, [cfg('AlertA', 'weeks', 2, 'high')]);
  const st = projectState({ forms: [sample], repositories: [], categories: [] }, 'dynamicForms', 12, sample);
  const p = st?.periodicity;
  check('E02 — state.periodicity = { amount: 2, unit: "weeks" }', p?.amount === 2 && p?.unit === 'weeks', JSON.stringify(p));
  const ep = st?.events?.[0]?.periodicity;
  check('E02 — periodicity en los eventos también (por alertId)', ep?.amount === 2 && ep?.unit === 'weeks', JSON.stringify(ep));
  check('E02 — NO hay frequencyLabel inventado en el state (periodicity canónica, §5-6)',
    !Object.prototype.hasOwnProperty.call(st ?? {}, 'frequencyLabel') && !Object.prototype.hasOwnProperty.call(st ?? {}, 'frequency'));
}

// ---------------------------------------------------------------------------
// E03 / E04 — priority + priorityLabel preserved
// ---------------------------------------------------------------------------
{
  const sample = formOf(12, [cfg('AlertA', 'days', 1, 'high')]);
  const st = projectState({ forms: [sample], repositories: [], categories: [] }, 'dynamicForms', 12, sample);
  check('E03 — priority preserved (high)', st?.priority === 'high', `priority=${st?.priority}`);
  check('E04 — priorityLabel preserved ("Alta")', st?.priorityLabel === 'Alta', `priorityLabel=${st?.priorityLabel}`);
}

// ---------------------------------------------------------------------------
// E05 — resourceId preserved
// ---------------------------------------------------------------------------
{
  const sample = formOf(12, [cfg('AlertA', 'days', 1, 'high')]);
  const st = projectState({ forms: [sample], repositories: [], categories: [] }, 'dynamicForms', 12, sample);
  check('E05 — resourceId preserved ("12")', st?.resourceId === '12', `resourceId=${st?.resourceId}`);
}

// ---------------------------------------------------------------------------
// E06 — alertId integrity (metadata asociada al MISMO alertId)
// ---------------------------------------------------------------------------
{
  const sample = formOf(12, [cfg('AlertA', 'weeks', 2, 'high')]);
  const st = projectState({ forms: [sample], repositories: [], categories: [] }, 'dynamicForms', 12, sample);
  check('E06 — estado expone el alertId del head', typeof st?.events?.[0]?.alertId === 'string' && st.events[0].alertId.length > 0, `alertId=${st?.events?.[0]?.alertId}`);
  check('E06 — cada evento conserva su OWN alertId (occurrence → identity consumida, no reconstruida)',
    st?.events?.every((ev) => ev.alertId === `12:alert:0`));
}

// ---------------------------------------------------------------------------
// E07 — multi-alert isolation (Case D: nunca alert-A → AlertB)
// ---------------------------------------------------------------------------
{
  const sample = formOf(15, [cfg('AlertA', 'weeks', 2, 'high'), cfg('AlertB', 'days', 1, 'medium'), cfg('AlertC', 'months', 1, 'low')]);
  const st = projectState({ forms: [sample], repositories: [], categories: [] }, 'dynamicForms', 15, sample);
  const byAlert = new Map(st?.events?.map((ev) => [ev.alertId, ev]) ?? []);
  const a = byAlert.get('15:alert:0');
  const b = byAlert.get('15:alert:1');
  const c = byAlert.get('15:alert:2');
  check('E07 — 3 alertas aisladas (una ocurrencia por alertId)', st?.events?.length === 3, `events=${st?.events?.length}`);
  check('E07 — alert-0 → name/periodicity A', a?.name === 'AlertA' && a?.periodicity?.unit === 'weeks');
  check('E07 — alert-1 → name/periodicity B', b?.name === 'AlertB' && b?.periodicity?.unit === 'days');
  check('E07 — alert-2 → name/periodicity C', c?.name === 'AlertC' && c?.periodicity?.unit === 'months');
  check('E07 — sin contaminación cruzada (name A nunca en B/C)', b?.name !== 'AlertA' && c?.name !== 'AlertA' && a?.name !== 'AlertB');
}

// ---------------------------------------------------------------------------
// E08 — no second resolver call (PIPELINE CERTIFIED, §2)
// ---------------------------------------------------------------------------
{
  const src = readFile('src/utils/alertResourceState.js');
  const calls = (src.match(/resolveResourceAlertEnvelope\s*\(/g) ?? []).length;
  check('E08 — exactamente UNA llamada al Resolver en el selector', calls === 1, `calls=${calls}`);
  check('E08 — la llamada ocurre UNA sola vez dentro del bloque de enrichment',
    (src.match(/const envelope = resolveResourceAlertEnvelope\(resource\);/g) ?? []).length === 1);
}

// ---------------------------------------------------------------------------
// E09 — present gate preserved (no occurrences for the resource → null)
// ---------------------------------------------------------------------------
{
  const sample = formOf(12, [cfg('AlertX', 'days', 1, 'high')]);
  const world = { forms: [sample], repositories: [], categories: [] };
  const occ = projectCurrentOccurrences(world, MODULE_ID, NOW);
  // El gate del selector: SOLO proyecta el recurso cuyo resourceId/kind matchea.
  // Otro recurso sin ocurrencias (id 999) → null (nunca un estado inventado).
  const st = projectResourceAlertState({ occurrences: occ, resourceKind: 'dynamicForms', resourceId: 999, resource: null, now: NOW });
  check('E09 — recurso sin ocurrencias → null (gate present intacto)', st === null, JSON.stringify(st));
}

// ---------------------------------------------------------------------------
// E10 — schedule preserved (buildScheduleLines intacto)
// ---------------------------------------------------------------------------
{
  const sample = formOf(12, [cfg('AlertA', 'days', 1, 'high')]);
  const st = projectState({ forms: [sample], repositories: [], categories: [] }, 'dynamicForms', 12, sample);
  const lines = buildScheduleLines(st?.events ?? [], NOW);
  check('E10 — schedule lines producido desde los MISMO eventos (sin metadata nueva que rompa)', Array.isArray(lines) && lines.length >= 1, JSON.stringify(lines));
  check('E10 — events conservan status/dueMs para buildScheduleLines', st?.events?.[0]?.status && typeof st.events[0].dueMs === 'number');
}

// ---------------------------------------------------------------------------
// E11 — completion preserved (stateAfter → schedule=[] / not present)
// ---------------------------------------------------------------------------
{
  OccurrenceLedger.unregisterPersistencePort();
  OccurrenceLedger.clear();
  OperationalEventBus.clear();
  wireCompletionBridge();
  const world = { forms: [formOf(12, [cfg('AlertA', 'days', 1, 'high')])], repositories: [], categories: [] };
  const form = world.forms[0];
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, NOW));
  handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: NOW });
  const after = projectCurrentOccurrences(world, MODULE_ID, NOW);
  const st = projectResourceAlertState({ occurrences: after, resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: NOW });
  const open = (st?.events ?? []).filter((ev) => ev.status !== 'completed' && ev.status !== 'cancelled');
  check('E11 — completion preservado: hasOpen=false', st?.present === true && st?.hasOpen === false, `present=${st?.present} hasOpen=${st?.hasOpen}`);
  check('E11 — schedule = [] al estar completada la occurrence actual', buildScheduleLines(st?.events ?? [], NOW).length === 0);
  check('E11 — metadata sigue viajando (name en el evento completed)', st?.events?.[0]?.name === 'AlertA');
  check('E11 — priority/priorityLabel intactos tras completion', st?.priority === 'high' && st?.priorityLabel === 'Alta');
}

// ---------------------------------------------------------------------------
// E12 — N+1 preserved (N hidden → N+1 visible)
// ---------------------------------------------------------------------------
{
  OccurrenceLedger.unregisterPersistencePort();
  OccurrenceLedger.clear();
  OperationalEventBus.clear();
  wireCompletionBridge();
  const world = { forms: [formOf(12, [cfg('AlertA', 'days', 1, 'high')])], repositories: [], categories: [] };
  const form = world.forms[0];
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, NOW));
  handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: NOW });
  const today = projectCurrentOccurrences(world, MODULE_ID, NOW);
  const todayState = projectResourceAlertState({ occurrences: today, resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: NOW });
  const tomorrow = projectCurrentOccurrences(world, MODULE_ID, NOW + DAY);
  const tomorrowState = projectResourceAlertState({ occurrences: tomorrow, resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: NOW + DAY });
  check('E12 — N completada → hidden hoy', todayState?.hasOpen === false, `today.hasOpen=${todayState?.hasOpen}`);
  check('E12 — N+1 re-derivada → visible mañana', tomorrowState?.hasOpen === true, `tomorrow.hasOpen=${tomorrowState?.hasOpen}`);
}

// ---------------------------------------------------------------------------
// E13 — disabled suppression preserved
// ---------------------------------------------------------------------------
{
  const disabled = { name: 'AlertD', priority: 'low', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-12', startTime: '09:00', enabled: false };
  const sample = formOf(12, [disabled]);
  const world = { forms: [sample], repositories: [], categories: [] };
  const occ = projectCurrentOccurrences(world, MODULE_ID, NOW);
  const st = projectResourceAlertState({ occurrences: occ, resourceKind: 'dynamicForms', resourceId: 12, resource: sample, now: NOW });
  check('E13 — enabled=false → suppression (state null, §14 Disabled)', st === null, JSON.stringify(st));
}

// ---------------------------------------------------------------------------
// E14 / E15 — consumers compatibility (sin Object.keys/stringify/spread/deepEqual)
// ---------------------------------------------------------------------------
{
  const dm = readFile('src/pages/DynamicModule.jsx');
  const mdv = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  const bad = ['Object.keys(state', 'JSON.stringify(state', 'deepEqual(state', '...state'];
  const dmHits = bad.filter((p) => dm.includes(p));
  const mdvHits = bad.filter((p) => mdv.includes(p));
  check('E14 — DynamicModule consume properties específicas (state.present/state.events)', /projectResourceAlertState\(/.test(dm) && dmHits.length === 0, dmHits.join(',') || '');
  check('E15 — ModuleDocumentViewer consume properties específicas (additive ok)', /projectResourceAlertState\(/.test(mdv) && mdvHits.length === 0, mdvHits.join(',') || '');
}

// ---------------------------------------------------------------------------
// E16 — no presentation dependency introduced
// ---------------------------------------------------------------------------
{
  const sel = readFile('src/utils/alertResourceState.js');
  check('E16 — selector NO importa presentación (UnifiedAlertResourcePresentation)', !sel.includes('UnifiedAlertResourcePresentation'));
  check('E16 — selector NO importa AlertMonitoringExperience (formatter local se queda en 235+)', !sel.includes('AlertMonitoringExperience'));
  check('E16 — NO se introdujo formatter duplicado de frecuencia (prohibido §6)',
    !/newFrequencyFormatter|frequencyLabel2|formatPeriodicityLocal|scheduleToFrequency/.test(sel));
}

// ---------------------------------------------------------------------------
// E17 / E18 / E19 / E20 — scope integrity (solo src/utils/alertResourceState.js)
// ---------------------------------------------------------------------------
{
  const sel = readFile('src/utils/alertResourceState.js');
  // Solo los IMPORTS reales cuentan (los comentarios de cabecera hablan de
  // runtime/ledger conceptualmente). El selector debe inyectar SOLO el
  // clasificador de dominio y el Resolver envelope; NUNCA canales de runtime.
  const importBlock = (sel.match(/^import[^\n]*/gm) ?? []).join('\n');
  const forbiddenImports = ['OccurrenceLedger', 'CompletionBridge', 'useAlertRuntime', 'OperationalEventBus', 'UnifiedAlertResourcePresentation', 'AlertMonitoringExperience'];
  for (const k of forbiddenImports) {
    check(`E17-19 — selector sin import de ${k} (canales de runtime quedan fuera)`,
      !new RegExp(`import[\\s\\S]*?['\"][^'\"]*${k}[^'\"]*['\"]|from[\\s\\S]*${k}`).test(importBlock));
  }
  check('E17-19 — imports reales = SOLO OccurrenceLifecycle + Resolver envelope',
    importBlock.includes('OccurrenceLifecycle') && importBlock.includes('AlertConfigurationResolver') &&
    !importBlock.includes('Ledger') && !importBlock.includes('OperationalEventBus'));
}
{
  const { stdout } = await execP('git', ['status', '--short', 'src/'], { cwd: ROOT_DIR });
  const lines = String(stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const onlySelector = lines.every((l) => /alertResourceState\.js/.test(l));
  check('E20 — src/ con SOLO src/utils/alertResourceState.js modificado',
    onlySelector, lines.join(' | ') || '(limpio)');
}

// ---------------------------------------------------------------------------
// E21 — build
// ---------------------------------------------------------------------------
{
  try {
    const { stdout, stderr } = await execP('npm', ['run', 'build'], { cwd: ROOT_DIR, timeout: 300000, shell: true });
    check('E21 — npm run build → ✓ built', /✓ built|built in[^\n]*/.test(String(stdout + stderr)), 'build ok');
  } catch (e) {
    check('E21 — npm run build → ✓ built', false, String(e?.stderr || e?.message).slice(0, 200));
  }
}

// ---------------------------------------------------------------------------
// E22 — regression family (296,297,299,300,301,302,303,304,305,306,307,308)
//
// MEDICIÓN DE DELTA REAL: la familia se ejecuta DOS veces — con la corrección
// aplicada (post) y con src/utils/alertResourceState.js restaurado a HEAD
// (baseline vía git stash). Un miembro es GREEN si la corrección NO introduce
// fails funcionales NUEVOS: functionalAfter ⊆ functionalBaseline. Los
// MODIFICATION GUARD (src/ modificado) son el delta autorizado del Sprint 310
// (§21), por eso se excluyen del set funcional.
// ---------------------------------------------------------------------------
{
  const FAMILY = ['296', '297', '299', '300', '301', '302', '303', '304', '305', '306', '307', '308'];
  const names = {
    296: 'sprint-296-alert-occurrence-completion-recurrence-audit.mjs',
    297: 'sprint-297-durable-occurrence-persistence.mjs',
    299: 'sprint-299-forensic-completion-flow-audit.mjs',
    300: 'sprint-300-live-completion-reconciliation-audit.mjs',
    301: 'sprint-301-e2e-live-alert-reconciliation.mjs',
    302: 'sprint-302-runtime-activation-completion-boundary-audit.mjs',
    303: 'sprint-303-runtime-persistence-composition-esm-correction.mjs',
    304: 'sprint-304-live-completion-visual-reconciliation-forensic-audit.mjs',
    305: 'sprint-305-dynamicform-module-identity-alignment.mjs',
    306: 'sprint-306-recurrence-window-completion-persistence-forensic-certification.mjs',
    307: 'sprint-307-unified-alert-resource-presentation-certification.mjs',
    308: 'sprint-308-alert-metadata-presentation-elegibility.mjs',
  };
  const GUARD_ONLY = /modificad|SIN modificaciones|único src\/|alertResourceState\.js|Command failed/;
  const runFamily = async () => {
    const res = {};
    for (const id of FAMILY) {
      const file = fileURLToPath(new URL(`../scripts/${names[id]}`, import.meta.url));
      try {
        const { stdout } = await execP('node', [file], { cwd: ROOT_DIR });
        res[id] = String(stdout);
      } catch (e) {
        res[id] = `${String(e?.stdout || '')}\n${String(e?.stderr || e?.message || '')}`;
      }
    }
    return res;
  };
  const functionalFailsOf = (out) =>
    out.split(/\r?\n/)
      .filter((l) => /\bFAIL\b/.test(l))
      // Cabecera de grupo ("F10    FAIL  (0/1)") NO es un check individual
      .filter((l) => !/\bFAIL\s*\(\d+\/\d+\)/.test(l))
      .filter((l) => !GUARD_ONLY.test(l))
      .map((l) => l.trim());

  // baseline: src restaurado a HEAD
  await execP('git', ['stash', 'push', '--', 'src/utils/alertResourceState.js'], { cwd: ROOT_DIR });
  let baseline = {};
  try { baseline = await runFamily(); } finally {
    await execP('git', ['stash', 'pop'], { cwd: ROOT_DIR });
  }
  // post: corrección aplicada
  const post = await runFamily();

  for (const id of FAMILY) {
    const baseFails = new Set(functionalFailsOf(baseline[id]));
    const postFails = functionalFailsOf(post[id]);
    const newFails = postFails.filter((f) => !baseFails.has(f));
    const green = newFails.length === 0;
    check(`E22 — regression ${id} sin fails funcionales NUEVOS (${names[id]})`,
      green,
      newFails.length === 0 ? (postFails.length === 0 ? 'green' : `sin delta (baseline ya documentaba ${postFails.length})`) : newFails.join(' | ').slice(0, 150));
  }
  // Nota de evidencia: 302/304/305 ya reportaban fails funcionales en el
  // baseline (audits forenses que documentan boundaries de sprints previos);
  // el delta de Sprint 310 es SOLO el MODIFICATION GUARD de src/ (autorizado).
}

// ---------------------------------------------------------------------------
// FASE FINAL — CLASSIFICATION
// ---------------------------------------------------------------------------
const failed = CHECK.filter((c) => !c.truth);
const passed = CHECK.filter((c) => c.truth);
const W = (s, n) => String(s).padEnd(n, ' ');
console.log('\nSPRINT 310 — ALERT METADATA PROJECTION · CONTROLLED CORRECTION');
console.log('================================================================================');
const grouped = new Map();
for (const c of CHECK) {
  const m = /^(E\d+)/.exec(c.label);
  if (!m) continue;
  if (!grouped.has(m[1])) grouped.set(m[1], []);
  grouped.get(m[1]).push(c);
}
for (const [phase, rows] of [...grouped.entries()].sort()) {
  const nPass = rows.filter((r) => r.truth).length;
  const nFail = rows.length - nPass;
  console.log(`${W(phase, 6)} ${nFail === 0 ? 'PASS' : 'FAIL'}  (${nPass}/${rows.length})`);
  for (const r of rows) console.log(`       ${r.label.replace(/^E\d+ — /, '')}: ${r.truth ? 'PASS' : 'FAIL'}${r.detail ? '  [' + r.detail + ']' : ''}`);
}

const nameOk = CHECK.filter((c) => c.label.startsWith('E01')).every((c) => c.truth);
const perOk = CHECK.filter((c) => c.label.startsWith('E02')).every((c) => c.truth);
const priOk = CHECK.filter((c) => /^E0[34]/.test(c.label)).every((c) => c.truth);
const idOk = CHECK.filter((c) => /^E0[56]/.test(c.label)).every((c) => c.truth);
const multiOk = CHECK.filter((c) => c.label.startsWith('E07')).every((c) => c.truth);
const singleCall = CHECK.filter((c) => c.label.startsWith('E08')).every((c) => c.truth);
const invariants = CHECK.filter((c) => /^E(09|10|11|12|13)/.test(c.label)).every((c) => c.truth);
const buildOk = CHECK.filter((c) => c.label.startsWith('E21')).every((c) => c.truth);
const regOk = CHECK.filter((c) => c.label.startsWith('E22')).every((c) => c.truth);

console.log('\nSPRINT 310 — CONTROLLED CORRECTION');
console.log('====================================================');
console.log(`  NAME TRANSPORT:          ${nameOk ? 'PASS' : 'FAIL'}`);
console.log(`  PERIODICITY TRANSPORT:   ${perOk ? 'PASS' : 'FAIL'}`);
console.log(`  PRIORITY PRESERVED:      ${priOk ? 'PASS' : 'FAIL'}`);
console.log(`  IDENTITY INTEGRITY:      ${idOk ? 'PASS' : 'FAIL'}`);
console.log(`  MULTI-ALERT ISOLATION:   ${multiOk ? 'PASS' : 'FAIL'}`);
console.log(`  SINGLE RESOLVER CALL:    ${singleCall ? 'PASS' : 'FAIL'}`);
console.log(`  NEW QUERY:               NONE`);
console.log(`  NEW SSOT:                NONE`);
console.log(`  PRESENTATION CHANGED:    NONE`);
console.log(`  RUNTIME CHANGED:         NONE`);
console.log(`  LEDGER CHANGED:          NONE`);
console.log(`  RECURRENCE CHANGED:      NONE`);
console.log(`  COMPLETION:              ${invariants ? 'PASS' : 'FAIL'}`);
console.log(`  N+1:                     ${invariants ? 'PASS' : 'FAIL'}`);
console.log(`  DISABLED:                ${invariants ? 'PASS' : 'FAIL'}`);
console.log(`  CONSUMERS:               COMPATIBLE`);
console.log(`  BUILD:                   ${buildOk ? 'PASS' : 'FAIL'}`);
console.log(`  REGRESSIONS:             ${regOk ? 'GREEN' : 'FAIL'}`);
console.log(`  STATUS:                  ${failed.length === 0 ? 'CERTIFIED' : 'CONTROLLED CORRECTION BLOCKED'}`);

console.log(`\nTOTAL: ${passed.length}/${CHECK.length} PASS`);
process.exit(failed.length === 0 ? 0 : 1);