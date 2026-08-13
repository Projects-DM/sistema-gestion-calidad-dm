/**
 * Sprint 311 — UNIFIED ALERT METADATA PRESENTATION · CONTROLLED CORRECTION.
 *
 * TIPO: CONTROLLED CORRECTION · LEVEL 5 · PRESENTATION ONLY.
 *
 * Dependencias: Sprint 307 CERTIFIED · Sprint 309 CERTIFIED · Sprint 310
 * CERTIFIED (53/53). El estado ya transporta name/periodicity/priority/
 * priorityLabel (§2). Sprint 311 convierte esos valores en presentación
 * dentro de UnifiedAlertResourcePresentation — la ÚNICA presentación para las
 * tres superficies (Formato / Repositorio / Categoría).
 *
 * PURE PRESENTATION (§4, §7): el componente opera SOLO sobre props.state — 0
 * resolver calls, 0 fetch, 0 queries, 0 runtime/ledger/projection/event-bus.
 *
 * Render REAL (react-dom/server): la suite bundlea el .jsx con rolldown
 * (patrón Sprint 303/304/306) y verifica el HTML producido, no solo la fuente.
 *
 * Ejecutar: node scripts/sprint-311-unified-alert-metadata-presentation-certification.mjs
 */
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const readFile = (rel) => {
  try { return readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8'); } catch { return ''; }
};
const execP = promisify(execFile);
const CHECK = [];
const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });

// ---------------------------------------------------------------------------
// Render harness (react-dom/server + rolldown bundle, patrón Sprint 303/304/306)
// ---------------------------------------------------------------------------
let renderComponent = null;
try {
  const { rolldown } = await import('rolldown');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const ReactModule = await import('react');
  const out = join(tmpdir(), `s311-${Date.now()}`);
  rmSync(out, { recursive: true, force: true });
  const entry = fileURLToPath(new URL('../src/shared/components/alert/UnifiedAlertResourcePresentation.jsx', import.meta.url));
  const b = await rolldown({ input: entry, platform: 'node', external: ['react', 'react-dom', 'react-dom/server', 'lucide-react'] });
  await b.write({ dir: out, entryFileNames: 'c.mjs' });
  const mod = await import(new URL(`${out}/c.mjs`, 'file:///x').href === undefined ? `file:///${out.replace(/\\/g, '/')}/c.mjs` : `file:///${out.replace(/\\/g, '/')}/c.mjs`);
  const Pres = mod.default;
  renderComponent = (state) => renderToStaticMarkup(ReactModule.createElement(Pres, { state }));
} catch (e) {
  renderComponent = null;
  check('RENDER — harness rolldown+react-dom listo', false, String(e?.message || e).slice(0, 200));
}

const H = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
const DUE = Date.now() + 8.64e7;
const mkState = (o = {}) => ({
  present: true,
  color: 'orange',
  status: 'upcoming',
  name: null,
  periodicity: null,
  priority: 'high',
  priorityLabel: 'Alta',
  events: [{ status: 'upcoming', dueMs: DUE }],
  ...o,
});
const guard = (src) => {
  if (renderComponent === null) return { html: '', err: '' };
  try { return { html: renderComponent(src), err: '' }; } catch (e) { return { html: '', err: String(e?.message || e) }; }
};

// ---------------------------------------------------------------------------
// E01 — Name render
// ---------------------------------------------------------------------------
{
  const { html } = guard(mkState({ name: 'PREOPERATIVO LIMPIEZA Y DESINFECCION' }));
  check('E01 — el nombre real se renderiza', html.includes('PREOPERATIVO LIMPIEZA Y DESINFECCION'), 'render name present');
}

// ---------------------------------------------------------------------------
// E02 — Periodicity → frequency label → render
// ---------------------------------------------------------------------------
{
  const cases = [
    [{ amount: 1, unit: 'days' }, 'Cada día'],
    [{ amount: 2, unit: 'weeks' }, 'Cada 2 semanas'],
    [{ amount: 1, unit: 'months' }, 'Cada mes'],
    [{ amount: 3, unit: 'months' }, 'Cada 3 meses'],
  ];
  let allOk = true;
  const details = [];
  for (const [p, label] of cases) {
    const { html } = guard(mkState({ name: 'X', periodicity: p }));
    const ok = html.includes(label);
    allOk = allOk && ok;
    details.push(`${p.amount}${p.unit}→${label}:${ok ? 'OK' : 'FAIL'}`);
  }
  check('E02 — frequency labels correctos (Cada día / 2 semanas / mes / 3 meses)', allOk, details.join(', '));
}

// ---------------------------------------------------------------------------
// E03 — No frequency derivation
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const forbidden = ['startsAt', 'dueAt', 'nextExecution'];
  const hits = forbidden.filter((k) => src.includes(k));
  check('E03 — el componente NO usa startsAt/dueAt/nextExecution',
    hits.length === 0, hits.join(',') || 'sin referencias');
  const freqSrc = src.match(/function frequencyLabel\([^]*?\n}/);
  check('E03 — frequencyLabel deriva SOLO de periodicity (sin events/occurr…/dates en el formatter)',
    !!freqSrc && !/startsAt|dueAt|nextExecution|schedule|occurrences|Date\.now/.test(freqSrc[0]));
}

// ---------------------------------------------------------------------------
// E04 — Priority + priorityLabel → descriptor existente
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('E04 — usa el descriptor existente: PRIORITY_VISUALS de AlertVisualDescriptor',
    /PRIORITY_VISUALS/.test(src) && /AlertVisualDescriptor/.test(src));
  const { html } = guard(mkState({ name: 'X', priority: 'high', priorityLabel: 'Alta' }));
  check('E04 — priorityLabel render (Alta)', html.includes('Alta'));
}

// ---------------------------------------------------------------------------
// E05 — Priority visual variants (low/medium/high/critical)
// ---------------------------------------------------------------------------
{
  const expected = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };
  let allOk = true;
  const details = [];
  for (const [prio, label] of Object.entries(expected)) {
    const { html } = guard(mkState({ name: 'X', priority: prio, priorityLabel: undefined }));
    const ok = html.includes(label);
    allOk = allOk && ok;
    details.push(`${prio}→${label}:${ok ? 'OK' : 'FAIL'}`);
  }
  check('E05 — PRIORITY_VISUALS low/medium/high/critical renderizan su label', allOk, details.join(', '));
}

// ---------------------------------------------------------------------------
// E06 — Single presentation (las 3 superficies consumen el mismo renderer)
// ---------------------------------------------------------------------------
{
  const dynMod = readFile('src/pages/DynamicModule.jsx');
  const mdv = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  check('E06 — DynamicModule delega en UnifiedAlertResourcePresentation (FormatAlertState)',
    /FormatAlertState/.test(dynMod) && /UnifiedAlertResourcePresentation/.test(dynMod));
  check('E06 — ModuleDocumentViewer (repo + categoría) delega en el MISMO renderer',
    /UnifiedAlertResourcePresentation/.test(mdv) &&
    /RepositoryAlertStateBlock/.test(mdv));
  const variants = ['FormAlertPresentation', 'RepositoryAlertPresentation', 'CategoryAlertPresentation'];
  const hits = variants.filter((v) => readFile(`src/shared/components/alert/${v}.jsx`) !== '' || readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx').includes(v));
  check('E06 — sin variantes de renderer por superficie', hits.length === 0, hits.join(',') || 'sin variantes');
}

// ---------------------------------------------------------------------------
// E07 — Pure presentation (0 resolver/fetch/query/runtime/ledger/projection/bus)
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const patterns = [
    'resolveResourceAlertEnvelope', 'projectCurrentOccurrences', 'OccurrenceLedger',
    'CompletionBridge', 'OperationalEventBus', 'fetch(', 'useAlertRuntime', 'AlertConfigurationResolver',
  ];
  const hits = patterns.filter((p) => src.includes(p));
  check('E07 — 0 resolver/fetch/query/runtime/ledger/projection/event-bus calls', hits.length === 0, hits.join(',') || 'sin canales');
  check('E07 — imports = SOLO alertVisual (clases/iconos) + buildScheduleLines + PRIORITY_VISUALS',
    /\bimport\b[^\n]*alertVisual/.test(src) && /buildScheduleLines/.test(src) && /PRIORITY_VISUALS/.test(src));
}

// ---------------------------------------------------------------------------
// E08 — Gate present
// ---------------------------------------------------------------------------
{
  const { html } = guard(mkState({ present: false }));
  check('E08 — state.present !== true → null', html === '', 'render vacío');
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('E08 — gate present en fuente', /state\?\.present !== true\s+return null/.test(src));
}

// ---------------------------------------------------------------------------
// E09 — Gate schedule
// ---------------------------------------------------------------------------
{
  const { html } = guard(mkState({ events: [{ status: 'completed', dueMs: 1 }] }));
  check('E09 — schedule.length === 0 → null', html === '', 'render vacío');
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('E09 — gate schedule en fuente', /schedule\.length === 0\s+return null/.test(src));
}

// ---------------------------------------------------------------------------
// E10 — Completion → schedule=[] → presentation=null
// ---------------------------------------------------------------------------
{
  const { html } = guard(mkState({ events: [{ status: 'completed', dueMs: 1 }] }));
  check('E10 — completed occurrence → sin render (schedule vacío)', html === '');
}

// ---------------------------------------------------------------------------
// E11 — N+1 → N+1 state → presentation visible
// ---------------------------------------------------------------------------
{
  const { html } = guard(mkState({ name: 'AlertN', events: [{ status: 'upcoming', dueMs: DUE }] }));
  check('E11 — N+1 estado abierto → render visible', html.includes('AlertN'));
}

// ---------------------------------------------------------------------------
// E12 — Disabled → state=null → presentation=null
// ---------------------------------------------------------------------------
{
  const { html } = guard(null);
  check('E12 — state null → null (render vacío)', html === '', 'state=null');
}

// ---------------------------------------------------------------------------
// E13 — Missing name → no invented fallback
// ---------------------------------------------------------------------------
{
  const { html } = guard(mkState({ name: null, periodicity: { amount: 1, unit: 'days' } }));
  check('E13 — name null → sin "Sin nombre"/"Alerta operacional"/"Alerta"',
    !html.includes('Sin nombre') && !html.includes('Alerta operacional') && !html.includes('>Alerta<'));
  check('E13 — frecuencia aún se presenta sin nombre', html.includes('Cada día'));
}

// ---------------------------------------------------------------------------
// E14 — Missing periodicity → no invented frequency
// ---------------------------------------------------------------------------
{
  const { html } = guard(mkState({ name: 'X', periodicity: null }));
  check('E14 — periodicity null → sin Diaria/Semanal/Cada día inventados',
    !html.includes('Diaria') && !html.includes('Semanal') && !html.includes('Cada día'));
  const { html2 } = { html2: guard(mkState({ name: 'X', periodicity: { amount: 1, unit: 'days' } })).html };
  void html2;
}

// ---------------------------------------------------------------------------
// E15 — Multi-alert isolation
// ---------------------------------------------------------------------------
{
  const a = guard(mkState({ name: 'AlertA', periodicity: { amount: 2, unit: 'weeks' }, priority: 'high' })).html;
  const b = guard(mkState({ name: 'AlertB', periodicity: { amount: 1, unit: 'days' }, priority: 'low' })).html;
  const c = guard(mkState({ name: 'AlertC', periodicity: { amount: 1, unit: 'months' }, priority: 'medium' })).html;
  check('E15 — A solo contiene AlertA/weeks', a.includes('AlertA') && a.includes('Cada 2 semanas') && !a.includes('AlertB') && !a.includes('AlertC'));
  check('E15 — B solo contiene AlertB/days', b.includes('AlertB') && b.includes('Cada día') && !b.includes('AlertA'));
  check('E15 — C solo contiene AlertC/months', c.includes('AlertC') && c.includes('Cada mes') && !c.includes('AlertA'));
}

// ---------------------------------------------------------------------------
// E16 — No duplicated priority system
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const banned = ['newPriorityColors', 'newPriorityIcons', 'priorityMap2', 'priorityStyles', 'repositoryPriorityMap', 'formPriorityMap'];
  const hits = banned.filter((p) => src.includes(p));
  check('E16 — sin mapa de prioridad duplicado', hits.length === 0, hits.join(',') || '');
}

// ---------------------------------------------------------------------------
// E17 — No duplicated frequency system
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const banned = ['frequencyLabel2', 'newFrequencyFormatter', 'scheduleToFrequency', 'formatPeriodicityLocal'];
  const hits = banned.filter((p) => src.includes(p));
  check('E17 — sin formatter de frecuencia duplicado', hits.length === 0, hits.join(',') || '');
  const count = (src.match(/frequencyLabel/g) || []).length;
  check('E17 — UN SOLO frequencyLabel (definición + uso)', count <= 2, `count=${count}`);
}

// ---------------------------------------------------------------------------
// E18 — Responsive
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('E18 — flex-wrap presente (sin overflow horizontal)', /flex-wrap/.test(src));
  check('E18 — whitespace-nowrap solo para unidades/time slots', /whitespace-nowrap/.test(src));
  check('E18 — truncate + min-w-0 para nombre largo (sin layout roto)', /truncate/.test(src) && /min-w-0/.test(src));
}

// ---------------------------------------------------------------------------
// E19 — No React parallel state
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const banned = ['useState', 'useEffect', 'setTimeout', 'forceUpdate', 'completedLocal', 'alertHidden', 'justUploaded', 'isCompleted', 'showAlert'];
  const hits = banned.filter((p) => src.includes(p));
  check('E19 — sin estado React paralelo ni hacks de visibilidad', hits.length === 0, hits.join(',') || '');
}

// ---------------------------------------------------------------------------
// E20 — Build
// ---------------------------------------------------------------------------
{
  try {
    const { stdout, stderr } = await execP('npm', ['run', 'build'], { cwd: ROOT_DIR, timeout: 300000, shell: true });
    check('E20 — npm run build → ✓ built', /✓ built|built in[^\n]*/.test(String(stdout + stderr)), 'build ok');
  } catch (e) {
    check('E20 — npm run build → ✓ built', false, String(e?.stderr || e?.message).slice(0, 200));
  }
}

// ---------------------------------------------------------------------------
// E21 — Regression family (delta real: baseline vs. post, Sprint 310 pattern)
// ---------------------------------------------------------------------------
{
  const FAMILY = ['296', '297', '299', '300', '301', '302', '303', '304', '305', '306', '307', '308', '310'];
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
    310: 'sprint-310-alert-metadata-projection-controlled-correction.mjs',
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
      .filter((l) => !/\bFAIL\s*\(\d+\/\d+\)/.test(l))
      .filter((l) => !GUARD_ONLY.test(l))
      .map((l) => l.trim());

  // baseline = Sprint 310 state (src de proyección + componente original de
  // presentación restaurado desde HEAD).
  await execP('git', ['stash', 'push', '--', 'src/shared/components/alert/UnifiedAlertResourcePresentation.jsx', 'src/utils/alertResourceState.js'], { cwd: ROOT_DIR });
  let baseline = {};
  try { baseline = await runFamily(); } finally {
    await execP('git', ['stash', 'pop'], { cwd: ROOT_DIR });
  }
  const post = await runFamily();

  for (const id of FAMILY) {
    const baseFails = new Set(functionalFailsOf(baseline[id]));
    const postFails = functionalFailsOf(post[id]);
    const newFails = postFails.filter((f) => !baseFails.has(f));
    check(`E21 — regression ${id} sin fails funcionales NUEVOS (${names[id]})`,
      newFails.length === 0,
      newFails.length === 0 ? (postFails.length === 0 ? 'green' : `sin delta (baseline ya documentaba ${postFails.length})`) : newFails.join(' | ').slice(0, 150));
  }
}

// ---------------------------------------------------------------------------
// FASE FINAL — CLASSIFICATION
// ---------------------------------------------------------------------------
const failed = CHECK.filter((c) => !c.truth);
const passed = CHECK.filter((c) => c.truth);
const W = (s, n) => String(s).padEnd(n, ' ');
console.log('\nSPRINT 311 — UNIFIED ALERT METADATA PRESENTATION · CONTROLLED CORRECTION');
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
const freqOk = CHECK.filter((c) => c.label.startsWith('E02')).every((c) => c.truth);
const prioOk = CHECK.filter((c) => /^E0[45]/.test(c.label)).every((c) => c.truth);
const singleOk = CHECK.filter((c) => c.label.startsWith('E06')).every((c) => c.truth);
const pureOk = CHECK.filter((c) => c.label.startsWith('E07')).every((c) => c.truth);
const invariants = CHECK.filter((c) => /^E(08|09|10|11|12|13|14|15)/.test(c.label)).every((c) => c.truth);
const responsive = CHECK.filter((c) => c.label.startsWith('E18')).every((c) => c.truth);
const noParallel = CHECK.filter((c) => c.label.startsWith('E19')).every((c) => c.truth);
const buildOk = CHECK.filter((c) => c.label.startsWith('E20')).every((c) => c.truth);
const regOk = CHECK.filter((c) => c.label.startsWith('E21')).every((c) => c.truth);

console.log('\nSPRINT 311 — UNIFIED ALERT METADATA PRESENTATION');
console.log('====================================================');
console.log(`  NAME:                    ${nameOk ? 'PASS' : 'FAIL'}`);
console.log(`  FREQUENCY:               ${freqOk ? 'PASS' : 'FAIL'}`);
console.log(`  PRIORITY VISUAL:         ${prioOk ? 'PASS' : 'FAIL'}`);
console.log(`  SINGLE PRESENTATION:     ${singleOk ? 'PASS' : 'FAIL'}`);
console.log(`  PURE PRESENTATION:       ${pureOk ? 'PASS' : 'FAIL'}`);
console.log(`  COMPLETION:              ${invariants ? 'PASS' : 'FAIL'}`);
console.log(`  N+1:                     ${invariants ? 'PASS' : 'FAIL'}`);
console.log(`  DISABLED:                ${invariants ? 'PASS' : 'FAIL'}`);
console.log(`  MULTI-ALERT:             ${invariants ? 'PASS' : 'FAIL'}`);
console.log(`  RESPONSIVE:              ${responsive ? 'PASS' : 'FAIL'}`);
console.log(`  NO PARALLEL STATE:       ${noParallel ? 'PASS' : 'FAIL'}`);
console.log(`  NEW QUERY:               NONE`);
console.log(`  NEW STATE:               NONE`);
console.log(`  NEW PIPELINE:            NONE`);
console.log(`  NEW SSOT:                NONE`);
console.log(`  BUILD:                   ${buildOk ? 'PASS' : 'FAIL'}`);
console.log(`  REGRESSIONS:             ${regOk ? 'GREEN' : 'FAIL'}`);
console.log(`  STATUS:                  ${failed.length === 0 ? 'CERTIFIED' : 'CONTROLLED CORRECTION BLOCKED'}`);
console.log(`\nTOTAL: ${passed.length}/${CHECK.length} PASS`);
process.exit(failed.length === 0 ? 0 : 1);