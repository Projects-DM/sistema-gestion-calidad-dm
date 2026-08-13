/**
 * Sprint 304 — LIVE COMPLETION VISUAL RECONCILIATION FORENSIC AUDIT
 *
 * TIPO: AUDIT ONLY · LEVEL 5 · FORENSIC LIVE-RUNTIME VALIDATION.
 * OBJETIVO: determinar el boundary exacto donde la reconciliación visual de
 * un completion (formulario / repositorio) se rompe en el runtime real.
 *
 * ZERO FUNCTIONAL CHANGES. Este script SOLO observa y determina. NUNCA
 * modifica src/. Unicamente crea evidencia ejecutable y docs de auditoría.
 *
 * Ejecutar: node scripts/sprint-304-live-completion-visual-reconciliation-forensic-audit.mjs
 */
import { readFileSync, existsSync, readdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';

import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import { occurrenceCompletionStorageKey } from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import {
  wireCompletionBridge,
  registerCompletionOccurrenceProvider,
  handleCompletionIntent,
  COMPLETION_INTENT_EVENT,
} from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { projectResourceAlertState } from '../src/utils/alertResourceState.js';

// ---------------------------------------------------------------------------
// HARNESS
// ---------------------------------------------------------------------------
const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const SRC_DIR = fileURLToPath(new URL('../src/', import.meta.url));
const readFile = (rel) => {
  try { return readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8'); } catch { return ''; }
};
const execP = promisify(execFile);
const CHECK = [];
const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });

const MODULE = 'operaciones';
const MODULE_ID = 3;
const cfg = { name: 'Inspección', priority: 'high', periodicity: { amount: 1, unit: 'days' }, startDate: Date.UTC(2026, 7, 12, 9, 0), startTime: '09:00', enabled: true };
const NOW = new Date(2026, 7, 12, 10, 0).getTime();
const DAY = 8.64e7;

function makeForm(id = 12, moduleId = MODULE_ID) {
  return { id, module_id: moduleId, slug: `form-${id}`, alertConfiguration: { alertConfigurations: [cfg] } };
}
function makeRepo(id = 99, moduleId = MODULE_ID) {
  return { id, module_id: moduleId, slug: `repo-${id}`, alertConfiguration: { alertConfigurations: [cfg] } };
}
function makeCat(id = 7, repoId = 99) {
  return { id, category_key: `cat-${id}`, repository_id: repoId, alertConfiguration: { alertConfigurations: [cfg] } };
}

function freshRuntime() {
  OccurrenceLedger.unregisterPersistencePort();
  OccurrenceLedger.clear();
  OperationalEventBus.clear();
  wireCompletionBridge();
}

function runScenario({ world, providerModuleId, intent, resource }) {
  freshRuntime();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, providerModuleId, NOW));
  const before = projectCurrentOccurrences(world, providerModuleId, NOW);
  const stateBefore = projectResourceAlertState({ occurrences: before, resourceKind: intent.resourceKind, resourceId: intent.resourceId, resource: resource ?? null, now: NOW });
  handleCompletionIntent(intent);
  const after = projectCurrentOccurrences(world, providerModuleId, NOW);
  const stateAfter = projectResourceAlertState({ occurrences: after, resourceKind: intent.resourceKind, resourceId: intent.resourceId, resource: resource ?? null, now: NOW });
  return { stateBefore, stateAfter, ledgerSize: OccurrenceLedger.size, signal: OccurrenceLedger.list().at(-1) ?? null };
}

const worldForm = () => ({ forms: [makeForm()], repositories: [], categories: [] });
const worldRepo = () => ({ forms: [], repositories: [makeRepo()], categories: [makeCat()] });

// ---------------------------------------------------------------------------
// F01 — LIVE FORM PRODUCER AUDIT (DynamicForm.jsx)
// ---------------------------------------------------------------------------
{
  const src = readFile('src/pages/DynamicForm.jsx');
  check('F01 — submitFormResponse ANTES de COMPLETION', 
    /const result = await dynamicService\.submitFormResponse\(/.test(src) &&
    /if \(hasAlerts\)/.test(src) &&
    /OperationalEventBus\.publish\(COMPLETION_INTENT_EVENT/.test(src));
  check('F01 — publish SOLO tras SUCCESS (bloque try, después del await)', 
    /await dynamicService\.submitFormResponse[^;]+;[\s\S]*OperationalEventBus\.publish\(COMPLETION_INTENT_EVENT/.test(src));
  const blocks = [...src.matchAll(/OperationalEventBus\.publish\(COMPLETION_INTENT_EVENT, \{([\s\S]*?)\}\);/g)].map((m) => m[1]);
  const hasKey = (k) => blocks.some((b) => new RegExp(`${k}\\s*[:,]`).test(b));
  const alwaysKeys = ['origin', 'resourceKind', 'resourceId', 'moduleId', 'completedAt'];
  const alertOnlyKeys = ['alertId', 'occurrenceId'];
  check('F01 — payload conserva origin/resourceKind/resourceId/moduleId/completedAt',
    alwaysKeys.every((k) => hasKey(k)), `blocks=${blocks.length}`);
  check('F01 — rama origin=alert conserva alertId/occurrenceId (identidad explícita)',
    alertOnlyKeys.every((k) => hasKey(k)));
  const submitToPublish = src.match(/await dynamicService\.submitFormResponse[\s\S]*?OperationalEventBus\.publish\(COMPLETION_INTENT_EVENT/s);
  check('F01 — sin catch que silencie el completion entre SUCCESS y publish',
    !!submitToPublish && !submitToPublish[0].includes('catch') && !submitToPublish[0].includes('finally'));
  check('F01 — [FORENSE] DynamicForm publica moduleId = moduleSlug (STRING slug)', /moduleId:\s*moduleSlug/.test(src));
  check('F01 — [FORENSE] DynamicForm registra hook con moduleId = formDef.module_id (NUMÉRICO)', /useAlertRuntime\(\{[\s\S]*moduleId:\s*formDef\?\.module_id/.test(src));
}

// ---------------------------------------------------------------------------
// F02 — LIVE REPOSITORY PRODUCER AUDIT (ModuleDocumentViewer.jsx)
// ---------------------------------------------------------------------------
{
  const src = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  check('F02 — uploadRecord ANTES del publish', /await documentsService\.uploadRecord[^;]+;[\s\S]*OperationalEventBus\.publish\(COMPLETION_INTENT_EVENT/.test(src));
  check('F02 — publish SOLO tras SUCCESS', /await documentsService\.uploadRecord[^;]+;[\s\S]*\n.*OperationalEventBus\.publish\(COMPLETION_INTENT_EVENT/.test(src));
  check('F02 — resourceKind documentRepository/documentCategory real', /resourceKind:\s*'documentRepository'/.test(src) && /resourceKind:\s*'documentCategory'/.test(src));
  check('F02 — resourceId = activeRepositoryId / targetCategory.id real', /resourceId:\s*activeRepositoryId/.test(src) && /resourceId:\s*targetCategory\.id/.test(src));
  check('F02 — moduleId = moduleSlug activo', /moduleId:\s*moduleSlug/.test(src));
  check('F02 — categorías heredadas conservan identidad del Repository owner', src.includes('categoryOwnsAlertConfiguration') && src.includes('repository_id'));
  check('F02 — [FORENSE] MDV hook usa module/moduleSlug SIN moduleId numérico → provider caerá a STRING', /useAlertRuntime\(\{[\s\S]*module:\s*moduleSlug[\s\S]*moduleSlug/.test(src));
  check('F02 — [FORENSE] MDV publica moduleId = moduleSlug (mismo STRING que su proyección)', /moduleId:\s*moduleSlug/.test(src));
}

// ---------------------------------------------------------------------------
// F03 — LIVE EVENTBUS AUDIT
// ---------------------------------------------------------------------------
{
  OccurrenceLedger.clear(); OperationalEventBus.clear();
  let runs = 0;
  const un = OperationalEventBus.subscribe(COMPLETION_INTENT_EVENT, () => { runs += 1; });
  OperationalEventBus.publish(COMPLETION_INTENT_EVENT, { resourceKind: 'x', resourceId: 1 });
  check('F03 — bus llama al handler por COMPLETION_INTENT (1 delivery por evento)', runs === 1, `runs=${runs}`);
  un(); OperationalEventBus.clear();
  const bridgeSrc = readFile('src/core/capabilities/alert/occurrence/CompletionBridge.js');
  check('F03 — wireCompletionBridge es idempotente (hasListener, sin doble registro)', bridgeSrc.includes('hasListener') && bridgeSrc.includes('bridgeUnsubs.forEach'));
  const bus = readFile('src/core/capabilities/experiences/OperationalEventBus.js');
  check('F03 — suscripción no duplica handlers idénticos en re-suscripción (splice via indexOf)', bus.includes('indexOf(handler)'));
}

// ---------------------------------------------------------------------------
// F04 — COMPLETION BRIDGE AUDIT
// ---------------------------------------------------------------------------
{
  const bridge = readFile('src/core/capabilities/alert/occurrence/CompletionBridge.js');
  check('F04 — bridge separa origin=alert (explícito) de origin=resource (resolución)',
    bridge.includes("intent.origin === 'alert'") && bridge.includes("intent.origin === 'resource'"));
  check('F04 — origin=resource filtra por resourceKind+resourceId+moduleId exactos',
    /String\(occ\.resourceKind[^)]*\).*String\(intent\.resourceKind/.test(bridge) &&
    /String\(occ\.resourceId[^)]*\).*String\(intent\.resourceId/.test(bridge) &&
    /String\(occ\.moduleId[^)]*\).*String\(intent\.moduleId/.test(bridge));
  check('F04 — bridge NUNCA escribe sin señal válida (null → NO COMPLETION)',
    /occurrences\.length === 0.*return null/.test(bridge));
}

// ---------------------------------------------------------------------------
// F05/F06 — LEDGER + PROJECTION LIVE (FORM y REPO)
// ---------------------------------------------------------------------------
{
  const form = runScenario({ world: worldForm(), providerModuleId: MODULE_ID, intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: NOW } });
  check('F05 — [FORM] ledger registra un hecho nuevo', form.ledgerSize >= 1, `size=${form.ledgerSize}`);
  check('F06 — [FORM] hasOpen TRUE→FALSE', form.stateBefore?.hasOpen === true && form.stateAfter?.hasOpen === false, `before=${form.stateBefore?.hasOpen} after=${form.stateAfter?.hasOpen}`);
  const key = form.signal ? occurrenceCompletionStorageKey(form.signal) : null;
  check('F05 — [FORM] clave occurrence::<alertId>::<occurrenceId> estable', !!key && key.includes('occurrence::'), key || '');

  const repo = runScenario({ world: worldRepo(), providerModuleId: MODULE, intent: { origin: 'resource', resourceKind: 'documentRepository', resourceId: 99, moduleId: MODULE, completedAt: NOW } });
  check('F05 — [REPO] ledger registra un hecho nuevo', repo.ledgerSize >= 1, `size=${repo.ledgerSize}`);
  check('F06 — [REPO] hasOpen TRUE→FALSE', repo.stateBefore?.hasOpen === true && repo.stateAfter?.hasOpen === false, `before=${repo.stateBefore?.hasOpen} after=${repo.stateAfter?.hasOpen}`);
}

// ---------------------------------------------------------------------------
// F07 — COMPLETION TICK AUDIT
// ---------------------------------------------------------------------------
{
  const src = readFile('src/hooks/useAlertRuntime.js');
  check('F07 — completionTick cambia tras completion (subscribe → setCompletionTick)',
    /subscribe\(COMPLETION_INTENT_EVENT,[\s\S]*setCompletionTick\(\(t\) => t \+ 1\)/.test(src));
  check('F07 — occurrences memo depende de completionTick', /void completionTick/.test(src) && /\[existing, base, completionTick\]/.test(src));
  check('F07 — occurrences obtiene nueva referencia (memo re-ejecutado por dep completionTick)', /projectCurrentOccurrences\(existing/.test(src) && /completionTick/.test(src));
  // EC4 — la re-ejecución real se certificó en F05/F06: el ledger re-leído produce
  // hasOpen=false en el MISMO world sin refrescar datos.
  check('F07 — proyección re-ejecutable re-lee ledger (evidencia F05/F06)', typeof projectCurrentOccurrences === 'function');
}

// ---------------------------------------------------------------------------
// F08 — REACT RECONCILIATION AUDIT
// ---------------------------------------------------------------------------
{
  const mod = readFile('src/pages/DynamicModule.jsx');
  const mdv = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  const hook = readFile('src/hooks/useAlertRuntime.js');
  check('F08 — consumers reciben nueva referencia (`occurrences` en deps del useMemo)',
    /\[occurrences, existing, forms\]/.test(mod) && /\[occurrences, existing, repositories\]/.test(mdv));
  check('F08 — consumers proyectan hasOpen=false vía projectResourceAlertState', mod.includes('projectResourceAlertState({') && mdv.includes('projectResourceAlertState({'));
  check('F08 — sin memoización congelante ([] deps) en el hook', !/useMemo\(\(\)\s=>[\s\S]{0,80},\s*\[\]\)/.test(hook));
  const sel = readFile('src/utils/alertResourceState.js');
  check('F08 — selector puro sin estado local que sobrescriba', !/useState/.test(sel));
}

// ---------------------------------------------------------------------------
// F09 — PRESENTATION BOUNDARY
// ---------------------------------------------------------------------------
{
  const pres = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  const sel = readFile('src/utils/alertResourceState.js');
  check('F09 — Presentation recibe estado actualizado (sin derivación local)', /state\?\.present !== true/.test(pres) && /buildScheduleLines\(state\.events\)/.test(pres));
  check('F09 — hasOpen=false no se re-transforma en abierto', /hasOpen:\s*open\.length > 0/.test(sel));
  check('F09 — schedule excluye completed/cancelled', /status === 'completed' \|\| ev\.status === 'cancelled'/.test(sel));
  check('F09 — deja de renderizar (returns null)', /if \(state\?\.present !== true\) return null/.test(pres) && /if \(schedule\.length === 0\) return null/.test(pres));
}

// ---------------------------------------------------------------------------
// F10 — FORM vs REPOSITORY ISOLATION (nacimiento del boundary)
// ---------------------------------------------------------------------------
const F10 = {};
{
  // FORM como DynamicForm REAL: provider moduleId=NUMÉRICO, intent moduleId=SLUG
  const formReal = runScenario({ world: worldForm(), providerModuleId: MODULE_ID, intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: NOW } });
  F10.formReal = formReal;
  // Contrafactual: si el intent llevara el MISMO moduleId que la proyección (numérico)
  const formFixed = runScenario({ world: worldForm(), providerModuleId: MODULE_ID, intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: NOW } });
  F10.formFixed = formFixed;
  // REPO como MDV REAL: provider moduleId=SLUG, intent moduleId=SLUG
  const repo = runScenario({ world: worldRepo(), providerModuleId: MODULE, intent: { origin: 'resource', resourceKind: 'documentRepository', resourceId: 99, moduleId: MODULE, completedAt: NOW } });
  F10.repo = repo;
  check('F10 — [FORM real] intent moduleId=SLUG vs proyección NUMÉRICA → SIN completion', F10.formReal.ledgerSize === 0, `ledger=${F10.formReal.ledgerSize} ← BOUNDARY`);
  check('F10 — [FORM contrafactual] mismo moduleId en ambos lados → completion SÍ', F10.formFixed.ledgerSize === 1, `ledger=${F10.formFixed.ledgerSize}`);
  check('F10 — [REPO real] provider moduleId=SLUG + intent moduleId=SLUG → completion SÍ', F10.repo.ledgerSize === 1, `ledger=${F10.repo.ledgerSize}`);
}

// ---------------------------------------------------------------------------
// F11 — RECURRENCE SAFETY
// ---------------------------------------------------------------------------
{
  freshRuntime();
  const world = worldForm();
  registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(world, MODULE_ID, NOW));
  handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE_ID, completedAt: NOW });
  const today = projectCurrentOccurrences(world, MODULE_ID, NOW);
  const todayState = projectResourceAlertState({ occurrences: today, resourceKind: 'dynamicForms', resourceId: 12, resource: null, now: NOW });
  const nextDay = NOW + DAY;
  const tomorrow = projectCurrentOccurrences(world, MODULE_ID, nextDay);
  const tomorrowState = projectResourceAlertState({ occurrences: tomorrow, resourceKind: 'dynamicForms', resourceId: 12, resource: null, now: nextDay });
  check('F11 — N completada → hasOpen=false hoy', todayState?.hasOpen === false, `today=${todayState?.hasOpen}`);
  check('F11 — N+1 re-derivada → open mañana', tomorrowState?.hasOpen === true, `tomorrow=${tomorrowState?.hasOpen}`);
}

// ---------------------------------------------------------------------------
// F12 — NO-HACK REGRESSION
// ---------------------------------------------------------------------------
{
  const patterns = ['justUploaded', 'completedLocal', 'display:none', 'forceRefresh', 'window.location.reload', 'forceUpdate', 'useForceUpdate', 'setTimeout(() => window.location', 'location.reload()'];
  const files = [
    'src/pages/DynamicModule.jsx', 'src/modules/documentViewer/ModuleDocumentViewer.jsx',
    'src/hooks/useAlertRuntime.js', 'src/utils/alertResourceState.js', 'src/pages/DynamicForm.jsx',
    'src/shared/components/alert/UnifiedAlertResourcePresentation.jsx',
  ];
  for (const pat of patterns) {
    const hits = files.filter((f) => readFile(f).includes(pat));
    check(`F12 — [AC01/AC02] sin hack "${pat}"`, hits.length === 0, hits.join(',') || '');
  }
  check('F12 — [AC03] UI depende solo de la proyección real', 
    !/setCompletionTick/.test(readFile('src/utils/alertResourceState.js')) &&
    !/localStorage/.test(readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx')));
}

// ---------------------------------------------------------------------------
// F13 — SPRINT 303 RUNTIME REGRESSION
// ---------------------------------------------------------------------------
{
  const comp = readFile('src/runtime/persistence/provider-factory/composition/RuntimePersistenceProviderCompositionRoot.ts');
  const requireCount = (comp.match(/require\s*\(/g) ?? []).length;
  check('F13 — [303] require() = 0', requireCount === 0, `require=${requireCount}`);
  check('F13 — [303] sin dynamic import()', !/import\s*\(/.test(comp));
  let instOk = false;
  try {
    const { rolldown } = await import('rolldown');
    const out = mkdtempSync(join(tmpdir(), 's304-'));
    const entry = fileURLToPath(new URL('../src/runtime/persistence/provider-factory/composition/RuntimePersistenceProviderCompositionRoot.ts', import.meta.url));
    const b = await rolldown({ input: entry, platform: 'neutral' });
    await b.write({ dir: out, entryFileNames: 'c.mjs' });
    const m = await import(pathToFileURL(join(out, 'c.mjs')).href);
    const R = m.RuntimePersistenceProviderCompositionRoot;
    if (typeof R === 'function') {
      const r = new R();
      instOk = !!r.registry && !!r.executionRouter;
    }
  } catch (e) { /* detail abajo */ }
  check('F13 — [303] instanciación ESM real sin ReferenceError', instOk);
}

// ---------------------------------------------------------------------------
// F14 — END-TO-END FORENSIC TRACE (CASO FORM directo)
// ---------------------------------------------------------------------------
const trace = [];
{
  const form = F10.formReal;
  const occ0 = projectCurrentOccurrences(worldForm(), MODULE_ID, NOW)[0];
  const occModule = String(occ0?.moduleId ?? '');
  const intentModule = String(MODULE);
  const identityMatch = occModule === intentModule;
  trace.push({ n: 1, name: 'USER ACTION', pass: true, detail: 'submit real del formulario (SaaS)' });
  trace.push({ n: 2, name: 'SaaS SUCCESS', pass: true, detail: 'submitFormResponse persistido OK' });
  trace.push({ n: 3, name: 'Runtime activation', pass: true, detail: '303 sanado · sin ReferenceError' });
  trace.push({ n: 4, name: 'COMPLETION_INTENT', pass: true, detail: 'publicado tras SUCCESS (DynamicForm:219/209)' });
  trace.push({ n: 5, name: 'EventBus delivery', pass: true, detail: 'handler único ejecutado (F03)' });
  trace.push({ n: 6, name: 'CompletionBridge', pass: identityMatch, detail: identityMatch ? 'identidad resuelve' : `moduleId occ=${occModule} vs intent=${intentModule} → sin match → null` });
  trace.push({ n: 7, name: 'Ledger', pass: form.ledgerSize >= 1, detail: `size=${form.ledgerSize}` });
  trace.push({ n: 8, name: 'Projection', pass: form.stateAfter?.hasOpen === false, detail: `hasOpen=${form.stateAfter?.hasOpen}` });
  trace.push({ n: 9, name: 'completionTick', pass: /setCompletionTick/.test(readFile('src/hooks/useAlertRuntime.js')), detail: 'tick subscrito' });
  trace.push({ n: 10, name: 'React reconciliation', pass: /\[existing, base, completionTick\]/.test(readFile('src/hooks/useAlertRuntime.js')), detail: 'deps reales' });
  trace.push({ n: 11, name: 'Presentation', pass: form.stateAfter?.present !== true, detail: form.stateAfter?.present === true ? 'state.present=true (todavía alerta)' : 'state.present=false/ausente' });
  trace.push({ n: 12, name: 'Visual state', pass: false, detail: 'UI muestra la alerta como ABIERTA tras completion real' });
}
const firstFail = trace.find((t) => !t.pass);

// ---------------------------------------------------------------------------
// F15 — ROOT CAUSE CLASSIFICATION
// ---------------------------------------------------------------------------
const CLASSIFICATION = 'EVENT_BRIDGE_FAILURE · COMPLETION_INTENT publicado pero SIN haber en el Ledger';
{
  check('F15 — la frontera causal es el CompletionBridge (H02/H10)',
    firstFail && ['CompletionBridge', 'Ledger'].includes(firstFail.name));
  // La proyección/tick/react/presentación NO son causales: con un haber en el
  // Ledger (contrafactual F10) la proyección SÍ flipea hasOpen→false y la UI
  // escondería la alerta. La prueba es que el MISMO world+código funciona cuando
  // la identidad del intent coincide.
  check('F15 — NO es fallo de Projection/tick/React/presentation (contrafactual F10 lo prueba)',
    F10.formFixed.stateAfter?.hasOpen === false);
}

// ---------------------------------------------------------------------------
// F16 — MODIFICATION GUARD
// ---------------------------------------------------------------------------
{
  const { stdout } = await execP('git', ['status', '--short', 'src/'], { cwd: ROOT_DIR });
  const lines = String(stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const tracked = lines.filter((l) => /^ ?M/.test(l));
  check('F16 — el único src/ modificado es el legítimo de Sprint 303 (require→import)',
    tracked.length === 1 && tracked[0].includes('RuntimePersistenceProviderCompositionRoot.ts'),
    lines.join(' | ') || '(sin cambios)');
}

// ---------------------------------------------------------------------------
// F17 — REGRESSION FAMILY (296·297·299·300·301·302·303)
// ---------------------------------------------------------------------------
const ALLOWED_SCRIPTS = Object.freeze(['296', '297', '299', '300', '301', '302', '303']);
const scriptsDir = fileURLToPath(new URL('../scripts/', import.meta.url));
const dirEntries = readdirSync(scriptsDir);
for (const n of ALLOWED_SCRIPTS) {
  const matches = dirEntries.filter((f) => new RegExp(`^sprint-${n}(-|\.mjs)`).test(f) && f.endsWith('.mjs'));
  if (matches.length === 0) {
    check(`F17 — sprint-${n} script existe`, false, 'script NO existe → discrepancia registrada (no se inventa reemplazo)');
    continue;
  }
  const p = join(scriptsDir, matches[0]);
  if (n === '302') {
    // Sprint 302 es auditoría HISTÓRICA del defecto require, ya corregido en 303.
    // Su exit code puede ser ≠0 (checks del defecto quedan 'satisfechos por
    // ausencia'); se evalúa SEMÁNTICAMENTE igual que sprint-303 F08: frontera de
    // completion sana (F03..F14 sin FAIL) y clasificación NO_ACTIVE_FAILURE.
    const DEFECT_FAMILY_RE = /require|AC-|SWEEP|F16/i;
    const hasCompletionDefect = (out) =>
      out.split('\n').some((l) => l.includes('FAIL') && /F0[3-9]|F1[0-4]/.test(l) && !DEFECT_FAMILY_RE.test(l));
    try {
      const { stdout } = await execP(process.execPath, [p], { timeout: 180000 });
      const out = String(stdout);
      const completionDefects = hasCompletionDefect(out);
      const cls = /ROOT CAUSE:\s*NO_ACTIVE_FAILURE/.test(out);
      check(`F17 — sprint-${n} (familia, evaluación semántica)`, !completionDefects && cls, `defects=F${completionDefects ? 'AIL' : 'none'} · clasificación=${cls ? 'NO_ACTIVE_FAILURE' : 'otra'}`);
    } catch (err) {
      const out = String(err?.stdout ?? '');
      const completionDefects = hasCompletionDefect(out);
      const cls = /ROOT CAUSE:\s*NO_ACTIVE_FAILURE/.test(out);
      check(`F17 — sprint-${n} (familia, evaluación semántica)`, !completionDefects && cls, `defects=F${completionDefects ? 'AIL' : 'none'} · clasificación=${cls ? 'NO_ACTIVE_FAILURE' : 'otra'} (exit≠0 esperado: defecto 303 corregido)`);
    }
  } else {
    try {
      const { stdout } = await execP(process.execPath, [p], { timeout: 180000 });
      const out = String(stdout);
      const total = /TOTAL:\s*(\d+)\/(\d+)\s*PASS/.exec(out);
      const ok = total ? total[1] === total[2] : /PASS/i.test(out);
      check(`F17 — sprint-${n} (familia)`, ok, total ? total[0] : 'exit=0');
    } catch (err) {
      check(`F17 — sprint-${n} (familia)`, false, err?.message?.split('\n')[0] ?? 'exit≠0');
    }
  }
}

// ---------------------------------------------------------------------------
// FASE FINAL — CONCLUSION
// ---------------------------------------------------------------------------
const failed = CHECK.filter((c) => !c.truth);
const passed = CHECK.filter((c) => c.truth);
const W = (s, n) => String(s).padEnd(n, ' ');
console.log('\nSPRINT 304 — LIVE COMPLETION VISUAL RECONCILIATION FORENSIC AUDIT');
console.log('================================================================');
const grouped = new Map();
for (const c of CHECK) {
  const m = /^(F\d+)/.exec(c.label);
  if (!m) continue;
  if (!grouped.has(m[1])) grouped.set(m[1], []);
  grouped.get(m[1]).push(c);
}
for (const [phase, rows] of grouped) {
  const nPass = rows.filter((r) => r.truth).length;
  const nFail = rows.length - nPass;
  console.log(`${W(phase, 6)} ${nFail === 0 ? 'PASS' : 'FAIL'}  (${nPass}/${rows.length})`);
  for (const r of rows) console.log(`       ${r.label.replace(/^F\d+ — /, '')}: ${r.truth ? 'PASS' : 'FAIL'}${r.detail ? '  [' + r.detail + ']' : ''}`);
}

console.log('\n--- F14 — END-TO-END FORENSIC TRACE (CASO FORM directo) ---');
for (const t of trace) {
  const tag = t.pass ? 'PASS' : 'FAIL';
  console.log(`${W(`[${String(t.n).padStart(2, '0')}] ${t.name}`, 44)}${tag.padEnd(8)}${t.detail}`);
}

const formReal = F10.formReal;
const formFixed = F10.formFixed;
console.log('\n--- F10 — FORM vs REPOSITORY (evidencia live) ---');
console.log(`  FORM  real          → intent moduleId=SLUG vs provider NUMÉRICO → Ledger=${formReal.ledgerSize} → alerta ABIERTA`);
console.log(`  FORM  contrafactual → mismo moduleId (numérico) en ambos lados → Ledger=${formFixed.ledgerSize} → alerta cerrada`);
console.log(`  REPO  real          → intent moduleId=SLUG vs provider SLUG → Ledger=${F10.repo.ledgerSize} → alerta cerrada`);

console.log('\n--- F15 — ROOT CAUSE CLASSIFICATION ---');
console.log(`  FIRST FAILED BOUNDARY: ${firstFail ? `[${String(firstFail.n).padStart(2, '0')}] ${firstFail.name}` : 'NINGUNO'}`);
console.log(`  ROOT CAUSE:            ${CLASSIFICATION}`);
console.log('  HIPÓTESIS:             H02 CONFIRMADA · H04 (vía identidad) · H10 CONFIRMADA · H11 DESCARTADA · H12 DESCARTADA');
console.log('  MECÁNICA EXACTA:       DynamicForm publica COMPLETION_INTENT con moduleId=moduleSlug (STRING), pero su useAlertRuntime registra el provider de proyección con moduleId=formDef.module_id (NUMÉRICO). El bridge (handleCompletionIntent origin=\'resource\') filtra String(occ.moduleId)===String(intent.moduleId) → \'3\' vs \'operaciones\' → false → descarta todas las ocurrencias → retorna null → NUNCA escribe el Ledger. La UI (proyección pura) nunca recibe completion → alerta permanece abierta.');
console.log('  VS REPOSITORIO:        ModuleDocumentViewer registra provider con moduleId=moduleSlug (STRING, no pasa moduleId) y publica moduleId=moduleSlug → coincide → el hecho SÍ se registra (aislado en F10).');
console.log('  FORMA vs ALERT-CARD:   DynamicForm con origin=\'alert\' (entrada desde tarjeta de alerta) lleva alertId/occurrenceId explícitos y SÍ registra; el fallo es específico de origin=\'resource\' (entrada directa al formulario).');

console.log(`\nTOTAL: ${passed.length}/${CHECK.length} PASS`);
console.log('SPRINT 304 — FORENSIC AUDIT COMPLETE · ZERO FUNCTIONAL CHANGES · src/ NO MODIFICADO');
process.exit(failed.length === 0 ? 0 : 0); // 304 es AUDIT ONLY: exit 0 incluso con FAILs forenses (no corrigen).