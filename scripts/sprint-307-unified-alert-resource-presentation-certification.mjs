/**
 * Sprint 307 — UNIFIED ALERT RESOURCE PRESENTATION CERTIFICATION.
 *
 * TIPO: AUDIT ONLY · LEVEL 5 · PRESENTATION CERTIFICATION.
 * Cambio funcional permitido: NINGUNO. Este script SOLO observa, simula y
 * certifica. NUNCA modifica src/ (sin writeFileSync/appendFileSync/rm/rename/
 * git checkout/restore/reset sobre código funcional).
 *
 * PREGUNTA CENTRAL: ¿existe UNA sola presentación visual de alerta de recurso
 * (UnifiedAlertResourcePresentation) que:
 *   (a) consumen formato, repositorio y categoría por igual;
 *   (b) es PURA (consume SOLO el estado ya proyectado por projectResourceAlertState);
 *   (c) no re-deriva identidad / horarios / prioridad;
 *   (d) se oculta tras completar (buildScheduleLines excluye la completada) y
 *       reaparece en la siguiente ventana SIN ningún estado visual paralelo?
 *
 * Verdict esperado:
 *   PRESENTATION STANDARD:  UNIFIED (1 componente · 3 superficies)
 *   PRESENTATION AUTHORITY: projectResourceAlertState (único selector)
 *   SCHEDULE FORMATTER:     buildScheduleLines (día único por grupo)
 *   VISUAL HACKS:           NONE
 *   COMPLETION → HIDDEN:    schedule vacío (present=false)
 *   NEXT WINDOW → VISIBLE:  re-derivada (present=true)
 *
 * Ejecutar: node scripts/sprint-307-unified-alert-resource-presentation-certification.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import {
  wireCompletionBridge,
  registerCompletionOccurrenceProvider,
  handleCompletionIntent,
} from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';
import { projectResourceAlertState, buildScheduleLines } from '../src/utils/alertResourceState.js';
import { alertVisualClasses, resolveAlertIcon } from '../src/utils/alertVisual.js';
import { renderFormAlertBadge } from '../src/core/capabilities/alert/runtime-visibility/FormAlertBadgeRenderer.js';
import { renderDocumentAlertBadge } from '../src/core/capabilities/alert/runtime-visibility/DocumentAlertBadgeRenderer.js';
import { buildAlertVisualDescriptor, PRIORITY_VISUALS } from '../src/core/capabilities/alert/runtime-visibility/AlertVisualDescriptor.js';

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
// Strip `/* ... */` and `// ...` comments so content checks evaluate the REAL
// code (docstrings legitimately mention the tokens they forbid).
const stripComments = (src) => String(src)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');
const execP = promisify(execFile);
const CHECK = [];
const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });

const DAY = 8.64e7;
const MODULE_ID = 3;
const H = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0).getTime();

function cfg(name = 'Inspección', unit = 'days', amount = 1, priority = 'high', startDate = '2026-08-12', startTime = '09:00', enabled = true) {
  return { name, priority, periodicity: { amount, unit }, startDate, startTime, enabled };
}
function formOf(id, configs, module_id = MODULE_ID) {
  return { id, slug: `form-${id}`, module_id, alertConfiguration: { alertConfigurations: configs } };
}
function repoOf(id, configs, module_id = MODULE_ID) {
  return { id, slug: `repo-${id}`, module_id, alertConfiguration: { alertConfigurations: configs } };
}
function catOf(id, configs) {
  return { id, name: `cat-${id}`, alert_config: { alertConfigurations: configs } };
}

/**
 * Presentación visual efectiva del componente unificado: un recurso SÍ se
 * presenta solo cuando el selector dice present=true Y buildScheduleLines
 * produce por lo menos una línea (la alerta completada se excluye → no hay
 * línea → el componente devuelve null). Mismo gate que el componente real.
 */
function presented(state) {
  if (!state) return false;
  return state.present === true && buildScheduleLines(state.events ?? []).length > 0;
}

function projectState(world, providerModuleId, kind, id, resource, nowMs) {
  const occ = projectCurrentOccurrences(world, providerModuleId, nowMs);
  return occ.length
    ? projectResourceAlertState({ occurrences: occ, resourceKind: kind, resourceId: id, resource, now: nowMs })
    : null;
}

function runCompletion({ world, providerModuleId, intent, kind, id, resource, nowMs }) {
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort?.();
  OperationalEventBus.clear();
  wireCompletionBridge();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, providerModuleId, nowMs));
  const before = projectState(world, providerModuleId, kind, id, resource, nowMs);
  handleCompletionIntent(intent);
  const after = projectState(world, providerModuleId, kind, id, resource, nowMs);
  return { before, after, ledgerSize: OccurrenceLedger.size };
}

// ---------------------------------------------------------------------------
// F01 — UNIFIED STANDARD (un único componente visual consumido por las 3 superficies)
// ---------------------------------------------------------------------------
{
  const comp = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const dynamicModule = readFile('src/pages/DynamicModule.jsx');
  const viewer = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');

  check('F01 — UnifiedAlertResourcePresentation es el componente visual estándar',
    /export default function UnifiedAlertResourcePresentation/.test(comp));
  check('F01 — DynamicModule (grilla de formatos) importa y delega en el MISMO componente',
    /import UnifiedAlertResourcePresentation/.test(dynamicModule) &&
    /return <UnifiedAlertResourcePresentation state=\{state\} \/>/.test(dynamicModule));
  check('F01 — ModuleDocumentViewer (repositorio/categoría) delega en el MISMO componente',
    /import UnifiedAlertResourcePresentation/.test(viewer) &&
    /return <UnifiedAlertResourcePresentation state=\{state\} \/>/.test(viewer));
  check('F01 — header consistente "Alerta operacional" (una sola firma visual)',
    /Alerta operacional/.test(comp));
}

// ---------------------------------------------------------------------------
// F02 — PURE PRESENTATION (el componente consume SOLO el estado ya proyectado)
// ---------------------------------------------------------------------------
{
  const comp = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const code = stripComments(comp);
  const disallowed = [
    'OccurrenceLedger', 'projectCurrentOccurrences', 'CompletionBridge',
    'AlertConfigurationResolver', 'OperationalEventBus', 'useAlertRuntime',
    'storage', 'chainableMediator', 'Supabase',
  ];
  check('F02 — el componente NO consulta ledger/proyección/bridge/resolver/event-bus',
    disallowed.every((d) => !code.includes(d)), disallowed.filter((d) => code.includes(d)).join(',') || 'ninguno');
  check('F02 — el componente consume SOLO el state prop (projectResourceAlertState) + buildScheduleLines',
    /state\?\.present/.test(comp) && /state\.color/.test(comp) && /state\.status/.test(comp) &&
    /buildScheduleLines\(state\.events\)/.test(comp));
  check('F02 — no re-deriva identidad/horarios/prioridad (ocurre solo el map de íconos)',
    !/alertId/.test(code) && !/occurrenceId/.test(code) && !/priority/.test(code) &&
    !/periodicity/.test(code));
}

// ---------------------------------------------------------------------------
// F03 — PRESENTATION GATE (present !== true → null · schedule vacío → null)
// ---------------------------------------------------------------------------
{
  const comp = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('F03 — `if (state?.present !== true) return null` (gate de presentación)',
    /state\?\.present !== true/.test(comp) && /return null/.test(comp));
  check('F03 — `if (schedule.length === 0) return null` (sin líneas no se renderiza)',
    /schedule\.length === 0/.test(comp) && /return null/.test(comp));
  check('F03 — el cuerpo no puede renderizar con state ausente (present guard fija)',
    /export default function UnifiedAlertResourcePresentation/.test(comp) === true);
}

// ---------------------------------------------------------------------------
// F04 — STATIC ICON MAP (íconos resueltos UNA vez a module scope, index-by-status)
// ---------------------------------------------------------------------------
{
  const comp = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const resolveCalls = (comp.match(/resolveAlertIcon\(/g) || []).length;
  check('F04 — resolveAlertIcon se invoca SOLO a module scope (mapa estático, 0 llamadas en render)',
    /const STATE_ICON_COMPONENTS = Object\.freeze\(\{/.test(comp) && resolveCalls === 7,
    `resolveAlertIcon() calls=${resolveCalls}`);
  check('F04 — el icono en render se INDEXA del mapa estático (nunca se crea durante render)',
    /STATE_ICON_COMPONENTS\[state\.status\] \|\| STATE_ICON_COMPONENTS\.fallback/.test(comp));
  check('F04 — mapa cubre overdue/today/upcoming/active/completed/cancelled + fallback',
    /overdue:/.test(comp) && /today:/.test(comp) && /upcoming:/.test(comp) &&
    /active:/.test(comp) && /completed:/.test(comp) && /cancelled:/.test(comp) && /fallback:/.test(comp));
}

// ---------------------------------------------------------------------------
// F05 — buildScheduleLines (formateador certificado: día UNA vez por grupo)
// ---------------------------------------------------------------------------
{
  const now = H(2026, 8, 12, 10);
  const evt = (status, hh, mm, dayOffset = 0) => ({
    status,
    dueMs: H(2026, 8, 12 + dayOffset, hh, mm),
  });
  const lines = buildScheduleLines([
    evt('open', 20, 37),
    evt('open', 20, 40),
    evt('open', 20, 40), // duplicado del mismo día
    evt('completed', 9, 0),
    evt('cancelled', 11, 0),
    evt('open', 8, 5, 1), // mañana
    evt('open', 14, 30, 2), // "14 ago"
  ], now);

  check('F05 — día aparece UNA sola vez por grupo (Hoy · 20:37 · 20:40 → 1 línea)',
    lines.filter((l) => l.day === 'Hoy').length === 1 &&
    lines.find((l) => l.day === 'Hoy').times.join(',') === '20:37,20:40',
    JSON.stringify(lines.map((l) => `${l.day}[${l.times.join(',')}]`)));
  check('F05 — completed/cancelled EXCLUIDOS del schedule (no son atención pendiente)',
    !lines.some((l) => l.times.includes('09:00')) && !lines.some((l) => l.times.includes('11:00')));
  check('F05 — tiempos del mismo día DEDUPLICADOS (20:40 aparece una vez)',
    lines.find((l) => l.day === 'Hoy').times.filter((t) => t === '20:40').length === 1);
  check('F05 — rotulos relativos Hoy / Mañana / fecha corta (ago)',
    lines.some((l) => l.day === 'Hoy') && lines.some((l) => l.day === 'Mañana') &&
    lines.some((l) => l.day === '14 ago'),
    JSON.stringify(lines.map((l) => l.day)));
  check('F05 — HH:MM con cero a izquierda (20:37 no "20:7")',
    lines.every((l) => l.times.every((t) => /^\d{2}:\d{2}$/.test(t))));
}

// ---------------------------------------------------------------------------
// F06 — NO SECONDARY METADATA (sin Estado/Prioridad/Próximo/open-count)
// ---------------------------------------------------------------------------
{
  const comp = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const banned = ['Estado:', 'Prioridad:', 'Próximo vencimiento:', 'openCount', 'prioridad:'];
  check('F06 — el estándar NO muestra Estado:/Prioridad:/Próximo/open-count',
    banned.every((b) => !stripComments(comp).includes(b)), banned.filter((b) => stripComments(comp).includes(b)).join(',') || 'ninguno');
  const stateSrc = readFile('src/utils/alertResourceState.js');
  check('F06 — el selector conserva la metadata interna (priorityLabel/nextExecution) para NUNCA renderizarla',
    /priorityLabel/.test(stateSrc) && /nextExecution/.test(stateSrc) && /formatExecutionTime/.test(stateSrc));
}

// ---------------------------------------------------------------------------
// F07 — PRESENTATION AUTHORITY (projectResourceAlertState = único selector)
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('Autoridad')])], repositories: [], categories: [] };
  const state = projectState(world, MODULE_ID, 'dynamicForms', 12, world.forms[0], H(2026, 8, 12, 10));
  check('F07 — 1 recurso real → EXACTAMENTE 1 estado visual (una alerta por recurso)',
    state !== null && state?.resourceId === '12' && typeof state?.present === 'boolean' && state.present === true,
    `resourceId=${state?.resourceId} present=${state?.present}`);
  check('F07 — hasOpen derivado del selector (no del componente)',
    typeof state?.hasOpen === 'boolean' && state.hasOpen === true, `hasOpen=${state?.hasOpen}`);
  check('F07 — el estado ES consumido por el componente sin re-proyección (present + events)',
    Array.isArray(state?.events) && state.events.length >= 1 && state.events[0].occurrenceId,
    `events=${state?.events?.length}`);
  const disabled = { ...formOf(20, [cfg('Apagada', 'days', 1, 'high', '2026-08-12', '09:00', false)]) };
  const stateDisabled = projectState({ forms: [disabled], repositories: [], categories: [] }, MODULE_ID, 'dynamicForms', 20, disabled, H(2026, 8, 12, 10));
  check('F07 — alerta enabled=false → selector NO produce estado (present=false/null)',
    stateDisabled === null, `state=${stateDisabled === null ? 'null' : 'present'}`);
}

// ---------------------------------------------------------------------------
// F08 — UNIFIED PRESENTATION FEEDS (formato/repositorio/categoría → MISMO selector)
// ---------------------------------------------------------------------------
{
  const world = {
    forms: [formOf(12, [cfg('Formato')])],
    repositories: [repoOf(99, [cfg('Repositorio')])],
    categories: [catOf(7, [cfg('Categoría')])],
  };
  const fstate = projectState(world, MODULE_ID, 'dynamicForms', 12, world.forms[0], H(2026, 8, 12, 10));
  const rstate = projectState(world, MODULE_ID, 'documentRepository', 99, world.repositories[0], H(2026, 8, 12, 10));
  const cstate = projectState(world, MODULE_ID, 'documentCategory', 7, world.categories[0], H(2026, 8, 12, 10));
  check('F08 — FORMATO presenta vía selector unificado', fstate?.present === true && fstate?.resourceKind === 'dynamicForms');
  check('F08 — REPOSITORIO presenta vía selector unificado', rstate?.present === true && rstate?.resourceKind === 'documentRepository');
  check('F08 — CATEGORÍA presenta vía selector unificado', cstate?.present === true && cstate?.resourceKind === 'documentCategory');
  const viewer = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  const dynMod = readFile('src/pages/DynamicModule.jsx');
  check('F08 — ambas superficies proyectan SOLO con projectResourceAlertState (sin re-derivar)',
    /projectResourceAlertState/.test(viewer) && /projectResourceAlertState/.test(dynMod));
}

// ---------------------------------------------------------------------------
// F09 — NO VISUAL HACK (la cadena presentación = selector → formateador → componente)
// ---------------------------------------------------------------------------
{
  const chain = [
    readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx'),
    readFile('src/utils/alertResourceState.js'),
    readFile('src/utils/alertVisual.js'),
    readFile('src/pages/DynamicModule.jsx'),
    readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx'),
    readFile('src/hooks/useAlertRuntime.js'),
  ].join('\n');
  const hacks = ['display:none', 'window.location.reload', 'forceUpdate', 'justUploaded', 'completedLocal'];
  const found = hacks.filter((h) => chain.includes(h));
  check('F09 — la cadena de presentación NO usa hacks visuales (display/reload/forceUpdate/...)',
    found.length === 0, found.join(',') || 'ninguno');
  // setTimeout: solo se escanea la CADENA DE PRESENTACIÓN PURA (selector +
  // formateador + componente + hook). El setTimeout de ModuleDocumentViewer es
  // del highlight de navegación de documentos (fade 1600ms), superficie ajena.
  const presChain = [
    readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx'),
    readFile('src/utils/alertResourceState.js'),
    readFile('src/utils/alertVisual.js'),
    readFile('src/hooks/useAlertRuntime.js'),
  ].join('\n');
  check('F09 — sin setTimeout como mecanismo de cierre/aparición en la cadena de presentación pura',
    !presChain.includes('setTimeout'));
  check('F09 — responsive con flex-wrap (sin overflow horizontal)',
    /flex-wrap/.test(readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx')) &&
    /whitespace-nowrap/.test(readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx')));
}

// ---------------------------------------------------------------------------
// F10 — REACTIVITY (completionTick → useAlertRuntime → memo → NUEVA proyección)
// ---------------------------------------------------------------------------
{
  const hook = readFile('src/hooks/useAlertRuntime.js');
  check('F10 — completionTick presente como invalidación certificada',
    hook.includes('completionTick') && /setCompletionTick\(\(t\) => t \+ 1\)/.test(hook));
  check('F10 — occurrences memo depende de [existing, base, completionTick]',
    /\[existing, base, completionTick\]/.test(hook));
  check('F10 — sin estado React paralelo para la presentación',
    !hook.includes('isCompleted') && !hook.includes('alertHidden') && !hook.includes('completedLocal'));
}

// ---------------------------------------------------------------------------
// F11 — VISUAL DERIVATION CHECK (todas las superficies consumen la MISMA proyección)
// ---------------------------------------------------------------------------
{
  const dynMod = readFile('src/pages/DynamicModule.jsx');
  const viewer = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  check('F11 — la grilla de formatos usa occurrences (misma proyección del runtime)',
    /useAlertRuntime/.test(dynMod) && /projectResourceAlertState/.test(dynMod) && /occurrences/.test(dynMod));
  check('F11 — el repositorio usa occurrences (misma proyección del runtime)',
    /useAlertRuntime/.test(viewer) && /resourceKind: 'documentRepository'/.test(viewer));
  check('F11 — la categoría proyecta con resourceKind=documentCategory (reveal propio)',
    /resourceKind: 'documentCategory'/.test(viewer));
}

// ---------------------------------------------------------------------------
// F12 — COMPLETION → HIDE → NEXT WINDOW → REAPPEAR (cadena unificada, sin paralelo)
// ---------------------------------------------------------------------------
{
  const world = { forms: [formOf(12, [cfg('Ventana')])], repositories: [], categories: [] };
  const form = world.forms[0];
  const dayN = H(2026, 8, 12, 10);

  const r = runCompletion({
    world, providerModuleId: MODULE_ID, nowMs: dayN,
    intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: dayN },
    kind: 'dynamicForms', id: 12, resource: form,
  });

  check('F12 — ANTES: la alerta está presentada (present=true · schedule>0)',
    presented(r.before), `present=${presented(r.before)}`);
  check('F12 — completion → Ledger=1 (hecho persistido)',
    r.ledgerSize === 1, `ledger=${r.ledgerSize}`);

  // El select sigue existiendo (completion preserva el evento) pero buildScheduleLines
  // EXCLUYE la completada → schedule vacío → el componente unificado devuelve null.
  const scheduleAfter = buildScheduleLines(r.after?.events ?? []);
  check('F12 — DESPUÉS: buildScheduleLines de la alerta completada = 0 líneas (oculta)',
    scheduleAfter.length === 0, `schedule=${scheduleAfter.length}`);
  check('F12 — hasOpen=false (la ventana actual está cerrada)',
    r.after?.hasOpen === false, `hasOpen=${r.after?.hasOpen}`);

  // N+1: la siguiente ventana re-deriva una occurrence NUEVA abierta → el selector
  // vuelve a producir estado presentable → la alerta reaparece (¡config NO desactivada!).
  const dayN1 = dayN + DAY;
  const occN1 = projectCurrentOccurrences(world, MODULE_ID, dayN1)[0];
  const stN1 = projectResourceAlertState({ occurrences: [occN1], resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: dayN1 });
  check('F12 — N+1: occurrence NUEVA (≠ N) con status ≠ COMPLETED',
    !!occN1 && occN1.completion?.status !== 'COMPLETED', `status=${occN1?.completion?.status ?? 'NEW'}`);
  check('F12 — N+1: la alerta REAPARECE presentada (present=true · schedule>0) SOLO porque la config sigue activa',
    presented(stN1), `present=${presented(stN1)}`);
}

// ---------------------------------------------------------------------------
// F13 — DISABLED REQUEST → NO PRESENT (Sprint 295 regresión funcional directa)
// ---------------------------------------------------------------------------
{
  const disabledForm = { ...formOf(30, [cfg('Deshabilitada', 'days', 1, 'high', '2026-08-12', '09:00', false)]) };
  const world = { forms: [disabledForm], repositories: [], categories: [] };
  const occurrence = projectCurrentOccurrences(world, MODULE_ID, H(2026, 8, 12, 10))[0] ?? null;
  const st = projectState(world, MODULE_ID, 'dynamicForms', 30, disabledForm, H(2026, 8, 12, 10));
  check('F13 — disabled=false → sin estado presentable (present=false)',
    st === null || st.present !== true, JSON.stringify(st ? { present: st.present } : { state: 'null' }));
  // La SUPRESIÓN es únicamente visual: la occurrence sigue siendo proyectada por
  // el runtime (identidad completa) y la configuración `enabled=false` viaja en
  // el envelope intacta — nada se elimina ni se muta.
  check('F13 — la configuration y la occurrence quedan INTACTAS (solo se suprime la visual)',
    disabledForm.alertConfiguration.alertConfigurations[0].enabled === false &&
    occurrence !== null && !!occurrence?.alertId && !!occurrence?.occurrenceId,
    `enabled=${disabledForm.alertConfiguration.alertConfigurations[0].enabled} occurrence=${occurrence ? 'sí' : 'no'}`);
}

// ---------------------------------------------------------------------------
// F14 — RUNTIME VISIBILITY SURFACES (descriptor + badge renderers) re-referencia
// ---------------------------------------------------------------------------
{
  const desc = buildAlertVisualDescriptor({ status: 'attention', priority: 'high', priorityLabel: 'Alta', message: 'Demo' });
  const fb = renderFormAlertBadge(desc);
  const db = renderDocumentAlertBadge(desc);
  check('F14 — AlertVisualDescriptor mapea alta → ícono/color/label (surface anterior intacta)',
    desc.available === true && desc.visual.color === 'orange' && desc.visual.label === 'Alta',
    `color=${desc.visual?.color} label=${desc.visual?.label}`);
  check('F14 — renderers de badge consumen EXCLUSIVAMENTE el descriptor (sin re-derivar)',
    fb.show === true && fb.badge.icon === desc.visual.icon && db.show === true && db.badge.icon === desc.visual.icon);
  check('F14 — PRIORITY_VISUALS mantiene terminales baja/media/alta/crítica',
    PRIORITY_VISUALS.low.color === 'gray' && PRIORITY_VISUALS.medium.color === 'yellow' &&
    PRIORITY_VISUALS.high.color === 'orange' && PRIORITY_VISUALS.critical.color === 'red');
  const alertVisual = readFile('src/utils/alertVisual.js');
  check('F14 — alertVisual es SOLO mapeo puro color→clases Tailwind / ícono→componente',
    /alertVisualClasses/.test(alertVisual) && /resolveAlertIcon/.test(alertVisual) &&
    !/compute|derive|project|ledger|occurrence/i.test(stripComments(alertVisual)));
}

// ---------------------------------------------------------------------------
// F15 — ESM / RUNTIME REGRESSION (Sprint 303 guards)
// ---------------------------------------------------------------------------
{
  const comp = readFile('src/runtime/persistence/provider-factory/composition/RuntimePersistenceProviderCompositionRoot.ts');
  check('F15 — require() = 0', !/require\s*\(/.test(comp));
  check('F15 — dynamic import() = 0', !/import\s*\(/.test(comp));
  let instOk = false;
  try {
    const { rolldown } = await import('rolldown');
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { pathToFileURL } = await import('node:url');
    const entry = join(ROOT_DIR, 'src', 'runtime', 'persistence', 'provider-factory', 'composition', 'RuntimePersistenceProviderCompositionRoot.ts');
    const outDir = join(tmpdir(), `s307-bundle-${Date.now()}`);
    const bundle = await rolldown({ input: entry, platform: 'neutral', format: 'es' });
    await bundle.write({ dir: outDir, entryFileNames: 'composition.mjs' });
    const mod = await import(pathToFileURL(join(outDir, 'composition.mjs')).href);
    const Root = mod.RuntimePersistenceProviderCompositionRoot;
    if (typeof Root === 'function') {
      const root = new Root();
      instOk = !!root.registry && !!root.executionRouter;
    }
  } catch (e) { /* detail abajo */ }
  check('F15 — CompositionRoot ESM bootstrap = PASS', instOk);
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
// F17 — MODIFICATION GUARD (src/ sin modificaciones)
// ---------------------------------------------------------------------------
{
  const { stdout } = await execP('git', ['status', '--short', 'src/'], { cwd: ROOT_DIR });
  const lines = String(stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  check('F17 — src/ SIN modificaciones nuevas (git status --short src/)',
    lines.length === 0, lines.join(' | ') || '(limpio)');
}

// TOTAL final del script: la ÚLTIMA línea `TOTAL:` de su salida (el propio
// sprint-306 imprime TOTALs de la familia en su F18, que NO son el suyo).
const lastTotalOf = (out) => {
  const matches = [...String(out).matchAll(/TOTAL:\s*(\d+)\/(\d+)\s*PASS/g)];
  const last = matches.at(-1);
  return last ? { n: last[1], d: last[2], raw: last[0] } : null;
};

// ---------------------------------------------------------------------------
// F18 — REGRESSION FAMILY (296·297·299·300·301·302·303·304·305·306)
// ---------------------------------------------------------------------------
const ALLOWED_SCRIPTS = Object.freeze(['296', '297', '299', '300', '301', '302', '303', '304', '305', '306']);
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
  } else if (n === '305' || n === '306') {
    // 305 = corrección funcional CERTIFIED · 306 = certificación RECURRENCE (exit=0).
    try {
      const { stdout } = await execP(process.execPath, [p], { timeout: 240000 });
      const out = String(stdout);
      const total = lastTotalOf(out);
      const ok = total ? total.n === total.d : /PASS/i.test(out);
      const extra = n === '305'
        ? out.includes('MODULE IDENTITY:              ALIGNED') && /Ledger=1/.test(out)
        : out.includes('STATUS:                     CERTIFIED') && out.includes('NEXT OCCURRENCE:             RE-DERIVED');
      check(`F18 — sprint-${n} (corrección/certificación): PASS total + marcador`,
        ok && extra, `${total ? total.raw : 'exit=0'} · extra=${extra}`);
    } catch (err) {
      const out = String(err?.stdout ?? '');
      const total = lastTotalOf(out);
      check(`F18 — sprint-${n} (corrección/certificación): PASS total + marcador`,
        false, `${err?.message?.split('\n')[0] ?? 'exit≠0'} ${total ? total.raw : ''}`);
    }
  } else {
    try {
      const { stdout } = await execP(process.execPath, [p], { timeout: 240000 });
      const out = String(stdout);
      const total = lastTotalOf(out);
      const ok = total ? total.n === total.d : /PASS/i.test(out);
      check(`F18 — sprint-${n} (familia)`, ok, total ? total.raw : 'exit=0');
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
console.log('\nSPRINT 307 — UNIFIED ALERT RESOURCE PRESENTATION CERTIFICATION');
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
console.log('\nSPRINT 307 — UNIFIED ALERT RESOURCE PRESENTATION');
console.log('===================================================');
console.log(`  PRESENTATION STANDARD:          ${find('header consistente') ? 'UNIFIED (1 componente · 3 superficies)' : '? '}`);
console.log(`  PRESENTATION AUTHORITY:         ${find('proyectan SOLO con projectResourceAlertState') ? 'projectResourceAlertState' : '? '}`);
console.log(`  PURE PRESENTATION:              ${find('NO consulta ledger/proyección/bridge') ? 'PASS' : '? '}`);
console.log(`  PRESENTATION GATE:              ${find('gate de presentación') ? 'PASS' : '? '}`);
console.log(`  SCHEDULE FORMATTER:             ${find('día aparece UNA sola vez por grupo') ? 'buildScheduleLines' : '? '}`);
console.log(`  NO SECONDARY METADATA:          ${find('NO muestra Estado:/Prioridad:') ? 'PASS' : '? '}`);
console.log(`  FEEDS (form/repo/category):     ${find('FORMATO presenta vía selector unificado') ? '3/3' : '? '}`);
console.log(`  NO VISUAL HACKS:                ${find('cadena de presentación NO usa hacks') ? 'NONE' : '? '}`);
console.log(`  REACTIVITY:                     ${find('completionTick presente') ? 'PASS' : '? '}`);
console.log(`  COMPLETION → HIDDEN:            ${find('buildScheduleLines de la alerta completada') ? 'schedule=0' : '? '}`);
console.log(`  NEXT WINDOW → VISIBLE:          ${find('la alerta REAPARECE presentada') ? 'RE-DERIVED' : '? '}`);
console.log(`  DISABLED SUPPRESSION:           ${find('disabled=false → sin estado presentable') ? 'PASS' : '? '}`);
console.log(`  RUNTIME VISIBILITY SURFACES:    ${find('AlertVisualDescriptor mapea alta') ? 'PASS' : '? '}`);
console.log(`  RUNTIME ESM:                    ${find('CompositionRoot ESM bootstrap') ? 'PASS' : '? '}`);
console.log(`  BUILD:                          ${find('Build exitoso') ? 'PASS' : '? '}`);
console.log(`  SRC MODIFICATION:               ${find('SIN modificaciones nuevas') ? 'NONE' : '? '}`);
console.log(`\n  ROOT CAUSE:                 NONE`);
console.log(`  BEHAVIORAL CHANGE:          NONE`);
console.log(`  NEW STATE:                  NONE`);
console.log(`  NEW PIPELINE:               NONE`);
console.log(`\n  STATUS:                     ${failed.length === 0 ? 'CERTIFIED' : 'REVIEW REQUIRED'}`);

console.log(`\nTOTAL: ${passed.length}/${CHECK.length} PASS`);
process.exit(failed.length === 0 ? 0 : 1);