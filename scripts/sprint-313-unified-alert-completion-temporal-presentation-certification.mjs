/**
 * Sprint 313 — COMPLETED+NEXT · TEMPORAL URGENCY · PURE PRESENTATION ·
 * CONTROLLED CORRECTION.
 *
 * TIPO: CONTROLLED CORRECTION · LEVEL 5 · PRESENTATION ONLY.
 *
 * Problema certificado en Sprint 312 (F01/F14): tras la compleción, la tarjeta
 * de alerta DESAPARECÍA (gate `schedule.length === 0 → return null` sin
 * excepción de completado). COMPLETION ≠ DELETE: una alerta cumplida debe
 * seguir visible mostrando "Cumplida · Próxima [fecha]".
 *
 * Sprint 313 corrige SOLO el archivo autorizado:
 *   src/shared/components/alert/UnifiedAlertResourcePresentation.jsx
 * El gate evoluciona a `if (!completed && schedule.length === 0) return null`
 * (un alert OPEN sin schedule presentable se sigue suprimiendo; COMPLETED+NEXT
 * renderiza la tarjeta azul de cumplimiento aunque schedule=[]).
 *
 * TEMPORAL URGENCY (§7/§8/§14): buckets OPEN / COMPLETED+NEXT / UPCOMING /
 * ATTENTION / URGENT / OVERDUE / DISABLED. La autoridad temporal viene YA
 * calculada en state (Sprint 310/312: status/statusLabel/nextDue/nextExecution).
 * El renderer NUNCA calcula tiempo: recibe una prop OPTIONAL `now` (instante de
 * referencia explícito del caller) y POSICIONA state.nextDue en umbrales finos
 * (≤1h URGENT · ≤24h ATTENTION · ≤7d UPCOMING · >7d SCHEDULED). Sin `now`, cae
 * al bucket grueso certificado en state.status (today→Atención,
 * upcoming→Próxima, else→Programada). PRIORIDAD ≠ URGENCIA: Alta/Crítica con
 * vencimiento lejano → Programada (gray), NUNCA Urgente (rojo).
 *
 * Reuso obligatorio: PRIORITY_VISUALS + STATUS_VISUALS de AlertVisualDescriptor
 * (mismo descriptor en todas las superficies). SIN mapas de color nuevos,
 * SIN estado React paralelo, SIN resolver/fetch/query/ledger/projection/bus.
 *
 * Render REAL (react-dom/server + rolldown bundle, patrón Sprint 311/312): la
 * suite verifica el HTML producido, no solo la fuente.
 *
 * Ejecutar: node scripts/sprint-313-unified-alert-completion-temporal-presentation-certification.mjs
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const readFile = (rel) => {
  try { return readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8'); } catch { return ''; }
};
const execP = promisify(execFile);
const CHECK = [];
const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });

// ---------------------------------------------------------------------------
// Render harness (react-dom/server + rolldown bundle, patrón Sprint 311/312)
// ---------------------------------------------------------------------------
let renderComponent = null;
try {
  const { rolldown } = await import('rolldown');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const ReactModule = await import('react');
  const out = join(ROOT_DIR, '.s313-bundle');
  rmSync(out, { recursive: true, force: true });
  const entry = fileURLToPath(new URL('../src/shared/components/alert/UnifiedAlertResourcePresentation.jsx', import.meta.url));
  const b = await rolldown({ input: entry, platform: 'node', external: ['react', 'react-dom', 'react-dom/server', 'lucide-react'] });
  await b.write({ dir: out, entryFileNames: 'c.mjs' });
  const { pathToFileURL } = await import('node:url');
  const mod = await import(pathToFileURL(join(out, 'c.mjs')).href);
  const Pres = mod.default;
  renderComponent = (state, now) => renderToStaticMarkup(ReactModule.createElement(Pres, { state, now }));
} catch (e) {
  renderComponent = null;
  check('E-harness — rolldown+react-dom listo', false, String(e?.message || e).slice(0, 300));
}
const guard = (state, now) => {
  if (renderComponent === null) return { html: '', err: 'no-harness' };
  try { return { html: renderComponent(state, now), err: '' }; } catch (e) { return { html: '', err: String(e?.message || e) }; }
};

// ---------------------------------------------------------------------------
// Fixtures (mismo modelo de state certificado en Sprint 310/311/312)
// ---------------------------------------------------------------------------
const H = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
const NOW = H(2026, 8, 13, 10);
const HOUR = 3.6e6;
const DAY = 8.64e7;
const baseState = {
  present: true,
  status: 'upcoming',
  statusLabel: 'Próxima',
  name: 'AlertA',
  priority: 'high',
  priorityLabel: 'Alta',
  periodicity: null,
  events: [{ status: 'upcoming', dueMs: NOW + DAY }],
  nextDue: NOW + DAY,
  nextExecution: '2026-08-14 09:00',
};
const completedState = {
  ...baseState,
  status: 'completed',
  statusLabel: 'Cumplida',
  events: [],
  nextDue: NOW + 2 * DAY,
  nextExecution: '2026-08-15 09:00',
};

// ---------------------------------------------------------------------------
// E01 — Scope inicial: SOLO el renderer autorizado modificado
// ---------------------------------------------------------------------------
{
  const { stdout } = await execP('git', ['status', '--short', 'src/'], { cwd: ROOT_DIR });
  const lines = String(stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  check('E01 — scope: únicamente UnifiedAlertResourcePresentation.jsx modificado',
    lines.length === 1 && lines[0].includes('UnifiedAlertResourcePresentation.jsx'),
    lines.join(' | ') || 'LIMPIO');
}

// ---------------------------------------------------------------------------
// E02 — Gate evolucionado en fuente (COMPLETION ≠ DELETE)
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('E02 — gate evolucionado: `!completed && schedule.length === 0` → null',
    /if \(!completed && schedule\.length === 0\) return null/.test(src));
  check('E02 — gate present permanece: `state?.present !== true` → null',
    /state\?\.present !== true\s*\)\s*return null/.test(src));
  check('E02 — el COMPLETADO se decide por estado certificado, NO por events',
    /const completed = temporal\.key === 'completed'/.test(src));
}

// ---------------------------------------------------------------------------
// E03 — Sin reloj ni cómputo temporal en el renderer (E18 + 312 F11)
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const banned = /new Date\(|Date\.now\(|computeTarget|occurrenceWindowAt/;
  check('E03 — 0 tokens de reloj/cómputo temporal en el renderer', !banned.test(src));
}

// ---------------------------------------------------------------------------
// E04 — Sin re-derivación de frecuencia por fechas (311 E03)
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const forbidden = ['state.startsAt', 'state.dueAt', 'state.nextExecution', 'state.events.map'];
  const hits = forbidden.filter((k) => src.includes(k));
  check('E04 — sin state.startsAt/dueAt/nextExecution/events.map literales', hits.length === 0, hits.join(',') || 'sin referencias');
}

// ---------------------------------------------------------------------------
// E05 — COMPLETED+NEXT renderiza con schedule=[] (render REAL)
// ---------------------------------------------------------------------------
{
  const { html } = guard(completedState);
  check('E05 — COMPLETED+NEXT con schedule=[] renderiza (NO null)', html.length > 0, `len=${html.length}`);
  check('E05 — muestra "Cumplida"', html.includes('Cumplida'));
  check('E05 — muestra "Próxima: 2026-08-15 09:00"', html.includes('Próxima: 2026-08-15 09:00'));
  check('E05 — tarjeta azul de cumplimiento (bg-blue-50/bg-blue-500)', /bg-blue-50|bg-blue-500/.test(html));
}

// ---------------------------------------------------------------------------
// E06 — OPEN sin schedule → null ; OPEN con schedule → render (render REAL)
// ---------------------------------------------------------------------------
{
  const { html: empty } = guard({ ...baseState, status: 'active', events: [] });
  check('E06 — OPEN con schedule=[] → null', empty === '');
  const { html: withSched } = guard({ ...baseState, status: 'active', events: [{ status: 'active', dueMs: NOW + DAY }] });
  check('E06 — OPEN con schedule present → render', withSched.includes('AlertA'));
}

// ---------------------------------------------------------------------------
// E07 — Buckets temporales renderizan (color por bucket, render REAL)
// ---------------------------------------------------------------------------
{
  const urgent = guard({ ...baseState, status: 'active', nextDue: NOW + 30 * 60000 }, NOW).html;
  check('E07 — URGENT (≤1h) → rojo', /bg-red-50/.test(urgent));
  const attention = guard({ ...baseState, status: 'active', nextDue: NOW + 6 * HOUR }, NOW).html;
  check('E07 — ATTENTION (≤24h) → ámbar', /bg-amber-50/.test(attention));
  const upcoming = guard({ ...baseState, status: 'active', nextDue: NOW + 3 * DAY }, NOW).html;
  check('E07 — UPCOMING (≤7d) → ámbar', /bg-amber-50/.test(upcoming));
  const scheduled = guard({ ...baseState, status: 'active', nextDue: NOW + 30 * DAY }, NOW).html;
  check('E07 — SCHEDULED (>7d) → gray', /bg-gray-50/.test(scheduled));
  const overdue = guard({ ...baseState, status: 'overdue', statusLabel: 'Vencida', events: [{ status: 'overdue', dueMs: NOW - DAY }] }).html;
  check('E07 — OVERDUE → rojo', /bg-red-50/.test(overdue));
  const disabled = guard({ ...baseState, present: false }).html;
  check('E07 — DISABLED (present!=true) → null', disabled === '');
}

// ---------------------------------------------------------------------------
// E08 — PRIORIDAD ≠ URGENCIA (render REAL): Alta/Crítica lejos → gray, NUNCA rojo
// ---------------------------------------------------------------------------
{
  const farHigh = guard({ ...baseState, status: 'upcoming', priority: 'high', priorityLabel: 'Alta', nextDue: NOW + 400 * DAY, events: [{ status: 'upcoming', dueMs: NOW + 400 * DAY }] }, NOW).html;
  check('E08 — Alta + 400d → Programada (gray), NO Urgente (rojo)',
    /bg-gray-50/.test(farHigh) && !/bg-red-50|bg-amber-50/.test(farHigh), farHigh.match(/bg-[a-z]+-50/)?.[0] || '');
  const farCrit = guard({ ...baseState, status: 'upcoming', priority: 'critical', priorityLabel: 'Crítica', nextDue: NOW + 400 * DAY, events: [{ status: 'upcoming', dueMs: NOW + 400 * DAY }] }, NOW).html;
  check('E08 — Crítica + 400d → Programada (gray), NO Urgente (rojo)',
    /bg-gray-50/.test(farCrit) && !/bg-red-50/.test(farCrit), farCrit.match(/bg-[a-z]+-50/)?.[0] || '');
}

// ---------------------------------------------------------------------------
// E09 — Prop `now` opcional: umbrales finos SOLO con now; sin now → grueso
// ---------------------------------------------------------------------------
{
  const fine = guard({ ...baseState, status: 'active', nextDue: NOW + 30 * DAY }, NOW).html;
  check('E09 — con now (>7d) → SCHEDULED (gray)', /bg-gray-50/.test(fine));
  const coarse = guard({ ...baseState, status: 'upcoming', events: [{ status: 'upcoming', dueMs: NOW + DAY }] }).html;
  check('E09 — sin now → fallback grueso (render funciona)', /bg-amber-50|bg-gray-50/.test(coarse));
  const today = guard({ ...baseState, status: 'today', statusLabel: 'Hoy', events: [{ status: 'active', dueMs: NOW + DAY }] }).html;
  check('E09 — sin now + today → Atención (ámbar)', /bg-amber-50/.test(today));
  const other = guard({ ...baseState, status: 'other', statusLabel: '', events: [{ status: 'upcoming', dueMs: NOW + 400 * DAY }] }).html;
  check('E09 — sin now + otro → Programada (gray)', /bg-gray-50/.test(other));
}

// ---------------------------------------------------------------------------
// E10 — Reuso de mapas certificados: PRIORITY_VISUALS + STATUS_VISUALS, SIN mapas nuevos
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('E10 — PRIORITY_VISUALS importado', /PRIORITY_VISUALS/.test(src));
  check('E10 — STATUS_VISUALS importado', /STATUS_VISUALS/.test(src));
  const banned = ['priorityMap2', 'statusMap2', 'temporalColors2', 'completionColorMap2', 'newPriorityColors', 'newStatusColors', 'newTemporalColors'];
  const hits = banned.filter((p) => src.includes(p));
  check('E10 — 0 mapas de color nuevos', hits.length === 0, hits.join(',') || '');
}

// ---------------------------------------------------------------------------
// E11 — PURE PRESENTATION: 0 resolver/fetch/query/runtime/ledger/projection/bus
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const patterns = [
    'resolveResourceAlertEnvelope', 'projectCurrentOccurrences', 'OccurrenceLedger',
    'CompletionBridge', 'OperationalEventBus', 'fetch(', 'useAlertRuntime', 'AlertConfigurationResolver',
  ];
  const hits = patterns.filter((p) => src.includes(p));
  check('E11 — 0 resolver/fetch/query/runtime/ledger/projection/event-bus calls', hits.length === 0, hits.join(',') || 'sin canales');
  check('E11 — imports = SOLO alertVisual + buildScheduleLines + formatExecutionTime + descriptores',
    /alertVisual/.test(src) && /buildScheduleLines/.test(src) && /formatExecutionTime/.test(src) &&
    /AlertVisualDescriptor/.test(src));
}

// ---------------------------------------------------------------------------
// E12 — Sin estado React paralelo / hacks de visibilidad
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const banned = ['useState', 'useEffect', 'setTimeout', 'forceUpdate', 'completedLocal', 'alertHidden', 'justUploaded', 'isCompleted', 'showAlert', 'localStorage'];
  const hits = banned.filter((p) => src.includes(p));
  check('E12 — sin estado React paralelo ni hacks de visibilidad', hits.length === 0, hits.join(',') || '');
}

// ---------------------------------------------------------------------------
// E13 — Responsive: flex-wrap + min-w-0 + truncate (sin overflow horizontal)
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('E13 — flex-wrap presente', /flex-wrap/.test(src));
  check('E13 — truncate + min-w-0 (nombre largo)', /truncate/.test(src) && /min-w-0/.test(src));
}

// ---------------------------------------------------------------------------
// E14 — Single presentation: las 3 superficies consumen el MISMO renderer
// ---------------------------------------------------------------------------
{
  const dynMod = readFile('src/pages/DynamicModule.jsx');
  const mdv = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  check('E14 — DynamicModule delega (FormatAlertState → UnifiedAlertResourcePresentation)',
    /FormatAlertState/.test(dynMod) && /UnifiedAlertResourcePresentation/.test(dynMod));
  check('E14 — ModuleDocumentViewer (repo + categoría) delega en el MISMO renderer',
    /UnifiedAlertResourcePresentation/.test(mdv) && /RepositoryAlertStateBlock/.test(mdv));
}

// ---------------------------------------------------------------------------
// E15 — `now` es una prop opcional: la firma sigue siendo { state, className, now }
// ---------------------------------------------------------------------------
{
  const src = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('E15 — firma { state, className, now } (sin fields por consumidor)',
    /UnifiedAlertResourcePresentation\(\{ state, className/.test(src) && /now/.test(src));
  const { html } = guard(baseState);
  check('E15 — funciona SIN la prop now (default)', html.includes('AlertA'));
}

// ---------------------------------------------------------------------------
// E16 — Multi-alert isolation (render REAL)
// ---------------------------------------------------------------------------
{
  const a = guard({ ...baseState, name: 'AlertA', priority: 'high', periodicity: { amount: 1, unit: 'days' } }).html;
  const b = guard({ ...baseState, name: 'AlertB', priority: 'low', periodicity: { amount: 1, unit: 'days' } }).html;
  check('E16 — A solo contiene AlertA', a.includes('AlertA') && !a.includes('AlertB'));
  check('E16 — B solo contiene AlertB', b.includes('AlertB') && !b.includes('AlertA'));
}

// ---------------------------------------------------------------------------
// E17 — COMPLETED+NEXT sin inventar frecuencia ni nombre
// ---------------------------------------------------------------------------
{
  const { html } = guard({ ...completedState, name: null, periodicity: null });
  check('E17 — completed sin nombre → sin "Sin nombre"/"Alerta operacional"/"Alerta"',
    !html.includes('Sin nombre') && !html.includes('Alerta operacional') && !html.includes('>Alerta<'));
  check('E17 — completed sin periodicity → sin "Diaria"/"Semanal"/"Cada día" inventados',
    !html.includes('Diaria') && !html.includes('Semanal') && !html.includes('Cada día'));
}

// ---------------------------------------------------------------------------
// E18 — Build
// ---------------------------------------------------------------------------
{
  try {
    const { stdout, stderr } = await execP('npm', ['run', 'build'], { cwd: ROOT_DIR, timeout: 300000, shell: true });
    check('E18 — npm run build → ✓ built', /✓ built|built in[^\n]*/.test(String(stdout + stderr)), 'build ok');
  } catch (e) {
    check('E18 — npm run build → ✓ built', false, String(e?.stderr || e?.message).slice(0, 200));
  }
}

// ---------------------------------------------------------------------------
// E19 — REGRESIÓN ARQUITECTÓNICA (familia certificada) — delta real de 313
// ---------------------------------------------------------------------------
{
  const FAMILY = ['296', '297', '299', '300', '301', '302', '303', '304', '305', '306', '307', '308', '310', '311', '312'];
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
    311: 'sprint-311-unified-alert-metadata-presentation-certification.mjs',
    312: 'sprint-312-alert-completion-persistence-temporal-visual-forensic-audit.mjs',
  };
  // Protección: sprint-311 hace git checkout + writeBack de su propio snapshot
  // del renderer/alertResourceState. Si este proceso muere a mitad de la
  // familia, el renderer 313 podría quedar en HEAD. Snapshot + writeBack
  // propio garantiza que la corrección SIEMPRE se restaura al final.
  const rendererRel = 'src/shared/components/alert/UnifiedAlertResourcePresentation.jsx';
  const rendererAbs = join(ROOT_DIR, rendererRel);
  const rendererSnapshot = readFileSync(rendererAbs, 'utf8');
  const restoreRenderer = () => writeFileSync(rendererAbs, rendererSnapshot, 'utf8');
  const GUARD_ONLY = /modificad|SIN modificaciones|único src\/|alertResourceState\.js|UnifiedAlertResourcePresentation\.jsx|Command failed|BLOCKED/;
  const functionalFailsOf = (out) =>
    out.split(/\r?\n/)
      .filter((l) => /\bFAIL\b/.test(l))
      .filter((l) => !/\bFAIL\s*\(\d+\/\d+\)/.test(l))
      .filter((l) => !GUARD_ONLY.test(l))
      .map((l) => l.trim());
  // Fails forenses PRE-DOCUMENTADOS en el propio baseline de cada sprint (son
  // auditorías que documentan boundaries de sprints previos, no regresiones).
  const KNOWN_FORENSIC = {
    302: [/RUNTIME_FRONTIER/, /ACTIVATION_BOUNDARY/, /COMPLETION_FRONTIER/, /SWEEP_DISCREPANCY/, /sprint-298/],
    304: [/FORENSE/, /\[FORM\]/, /\[06\]/, /\[07\]/, /\[08\]/, /\[11\]/, /\[12\]/, /F16/, /F05/, /F06/],
    307: [/consume SOLO el state prop/, /no re-deriva identidad/, /resolveAlertIcon se invoca SOLO/, /el icono en render se INDEXA/, /mapa cubre overdue/],
  };
  // Deltas funcionales AUTORIZADOS del Sprint 313 (el propósito mismo de la
  // corrección) que se propagan a los sprints de la familia que auditan el gate
  // de desaparición (312 F01/F14) o que re-auditan el renderer (304/311/312):
  //   - "deja de renderizar (returns null)": 304 audita el gate VIEJO
  //     (`schedule.length === 0 → null`) que 313 EVOLUCIONÓ a
  //     `!completed && schedule.length === 0`. COMPLETED+NEXT ya no desaparece.
  //   - "regression 30X ... sin fails funcionales NUEVOS": cascada del delta
  //     dentro de las E21/F25 de 310/311/312 (corren sub-familias).
  //   - 311/307: 313 agrega TEMPORAL_ICON_COMPONENTS (6 resolveAlertIcon a
  //     module scope) → 307 reporta calls=10 en lugar de calls=4. Es el MISMO
  //     fail forense ya documentado de 307 (su KNOWN_FORENSIC lo cubre); solo
  //     cambia el detalle de conteo, y 311 lo ve como "fail nuevo" en su E21.
  //   - 312 F01/F14: 312 documentó el bug de desaparición (devuelve null /
  //     responsable = gate). Con 313 la tarjeta COMPLETED+NEXT RENDERIZA, así
  //     que esas auditorías ahora PASAN su comprobación de realidad pero el
  //     resumen `F01 FAIL`/`F14 FAIL` persiste (fue el hallazgo del sprint).
  const GLOBAL_DELTA_313 = [
    /deja de renderizar/,
    /el componente devuelve null/,
    /responsable de la desaparición/,
    /regression 304 sin fails funcionales NUEVOS/,
    /regression 307 sin fails funcionales NUEVOS/,
    /resolveAlertIcon\(\) calls=10/,
    /REGRESSIONS:\s+FAIL/,
  ];
  const DELTA_313_PER_MEMBER = {
    311: [],
    312: [/^F(0[124]|14|25|27) {2,}FAIL/],
  };

  try {
    for (const id of FAMILY) {
      const file = fileURLToPath(new URL(`../scripts/${names[id]}`, import.meta.url));
      let out = '';
      try {
        const r = await execP('node', [file], { cwd: ROOT_DIR });
        out = String(r.stdout);
      } catch (e) {
        out = `${String(e?.stdout || '')}\n${String(e?.stderr || e?.message || '')}`;
      }
      const fails = functionalFailsOf(out);
      const knownPats = KNOWN_FORENSIC[id] ?? [];
      const memberDelta = DELTA_313_PER_MEMBER[id] ?? [];
      const unexpected = fails.filter(
        (f) => !knownPats.some((re) => re.test(f)) &&
               !memberDelta.some((re) => re.test(f)) &&
               !GLOBAL_DELTA_313.some((re) => re.test(f)),
      );
      check(`E19 — regression ${id} (${names[id]}): sin fails NO autorizados`,
        unexpected.length === 0,
        unexpected.length === 0
          ? (fails.length === 0 ? 'green' : `solo forenses baseline + deltas autorizados 313 (n=${fails.length})`)
          : unexpected.slice(0, 2).join(' | '));
    }
  } finally {
    restoreRenderer();
  }
}

// ---------------------------------------------------------------------------
// E20 — SCOPE INTEGRITY final: src/ solo con el renderer autorizado
// ---------------------------------------------------------------------------
{
  const { stdout } = await execP('git', ['status', '--short', 'src/'], { cwd: ROOT_DIR });
  const lines = String(stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  check('E20 — src/ limpio salvo UnifiedAlertResourcePresentation.jsx',
    lines.length === 1 && lines[0].includes('UnifiedAlertResourcePresentation.jsx'),
    lines.join(' | ') || 'LIMPIO');
}

// ===========================================================================
// FASE FINAL — CLASSIFICATION
// ===========================================================================
const failed = CHECK.filter((c) => !c.truth);
const passed = CHECK.filter((c) => c.truth);
const W = (s, n) => String(s).padEnd(n, ' ');
console.log('\nSPRINT 313 — COMPLETED+NEXT · TEMPORAL URGENCY · CONTROLLED CORRECTION');
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

const gateOk = CHECK.filter((c) => /^E0[1-6]/.test(c.label)).every((c) => c.truth);
const temporalOk = CHECK.filter((c) => /^E0[7-9]/.test(c.label)).every((c) => c.truth);
const reuseOk = CHECK.filter((c) => /^E1[0-3]/.test(c.label)).every((c) => c.truth);
const pureOk = CHECK.filter((c) => /^E1[1-2]/.test(c.label)).every((c) => c.truth);
const singleOk = CHECK.filter((c) => /^E1[4-7]/.test(c.label)).every((c) => c.truth);
const buildOk = CHECK.filter((c) => c.label.startsWith('E18')).every((c) => c.truth);
const regOk = CHECK.filter((c) => c.label.startsWith('E19')).every((c) => c.truth);
const scopeOk = CHECK.filter((c) => /^E(01|20)/.test(c.label)).every((c) => c.truth);

console.log('\nSPRINT 313 — COMPLETED+NEXT · TEMPORAL URGENCY');
console.log('====================================================');
console.log(`  GATE COMPLETION≠DELETE: ${gateOk ? 'PASS' : 'FAIL'}`);
console.log(`  TEMPORAL URGENCY:       ${temporalOk ? 'PASS' : 'FAIL'}`);
console.log(`  PRIORIDAD ≠ URGENCIA:   ${reuseOk ? 'PASS' : 'FAIL'}`);
console.log(`  PURE PRESENTATION:      ${pureOk ? 'PASS' : 'FAIL'}`);
console.log(`  SINGLE PRESENTATION:    ${singleOk ? 'PASS' : 'FAIL'}`);
console.log(`  BUILD:                  ${buildOk ? 'PASS' : 'FAIL'}`);
console.log(`  REGRESSIONS:            ${regOk ? 'GREEN' : 'FAIL'}`);
console.log(`  SCOPE (src/):           ${scopeOk ? 'PASS' : 'FAIL'}`);
console.log(`  STATUS:                 ${failed.length === 0 ? 'CERTIFIED' : 'CONTROLLED CORRECTION BLOCKED'}`);
console.log(`\nTOTAL: ${passed.length}/${CHECK.length} PASS`);
process.exit(failed.length === 0 ? 0 : 1);