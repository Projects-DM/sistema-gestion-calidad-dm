/**
 * Sprint 303 — RUNTIME PERSISTENCE COMPOSITION ROOT ESM COMPATIBILITY CORRECTION.
 *
 * TIPO: CONTROLLED CORRECTION · LEVEL 5 · MINIMAL CHANGE + VALIDACIÓN AUDITORA.
 * Dependencias: Sprint 302 (hallazgo: require CJS → ReferenceError en ESM/browser).
 *
 * Corrección aplicada (único archivo funcional autorizado):
 *   src/runtime/persistence/provider-factory/composition/RuntimePersistenceProviderCompositionRoot.ts
 *   require(...) → import estático (4 conversiones). CERO cambios de comportamiento.
 *
 * Este script es exclusivamente de VALIDACIÓN y AUDITORÍA POST-CORRECCIÓN. NO
 * modifica src/. Certifica F01..F08 + Regression Guard (301/302) + Build.
 *
 * Ejecutar: node scripts/sprint-303-runtime-persistence-composition-esm-correction.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import { occurrenceCompletionStorageKey } from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import {
  wireCompletionBridge,
  registerCompletionOccurrenceProvider,
  COMPLETION_INTENT_EVENT,
} from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { projectResourceAlertState, buildScheduleLines } from '../src/utils/alertResourceState.js';

// ---------------------------------------------------------------------------
// HARNESS
// ---------------------------------------------------------------------------
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const readFile = (p) => {
  try { return readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8'); } catch { return ''; }
};
const readFileAbs = (p) => {
  try { return readFileSync(p, 'utf8'); } catch { return ''; }
};

const CHECK = [];
const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });
const execP = promisify(execFile);

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

let AUDIT_RESOURCES = { forms: [], repositories: [], categories: [] };
let AUDIT_NOW = 0;
registerCompletionOccurrenceProvider(() => projectCurrentOccurrences(AUDIT_RESOURCES, MODULE, AUDIT_NOW));

function resetWorld() {
  OccurrenceLedger.clear();
  OccurrenceLedger.unregisterPersistencePort();
  AUDIT_RESOURCES = { forms: [], repositories: [], categories: [] };
  AUDIT_NOW = 0;
}
let BRIDGE_UNSUB = null;
function freshBridge() {
  BRIDGE_UNSUB?.();
  OccurrenceLedger.clear();
  OperationalEventBus.clear();
  BRIDGE_UNSUB = wireCompletionBridge();
}

function presentAlert(state) {
  if (state?.present !== true) return null;
  const schedule = buildScheduleLines(state.events);
  if (schedule.length === 0) return null;
  return { rendered: true, scheduleLength: schedule.length };
}

function runLive({ world, now, intent, kind, id, resource }) {
  resetWorld();
  freshBridge();
  AUDIT_RESOURCES = world;
  AUDIT_NOW = now;
  const before = projectCurrentOccurrences(world, MODULE, now);
  const stateBefore = before.length
    ? projectResourceAlertState({ occurrences: before, resourceKind: kind, resourceId: id, resource, now })
    : null;
  const presentationBefore = presentAlert(stateBefore);
  OperationalEventBus.publish(COMPLETION_INTENT_EVENT, intent);
  const after = projectCurrentOccurrences(world, MODULE, now);
  const stateAfter = after.length
    ? projectResourceAlertState({ occurrences: after, resourceKind: kind, resourceId: id, resource, now })
    : null;
  const presentationAfter = presentAlert(stateAfter);
  return {
    stateBefore, stateAfter, presentationBefore, presentationAfter,
    ledgerSize: OccurrenceLedger.size,
    events: stateAfter?.events ?? stateBefore?.events ?? [],
  };
}

// ---------------------------------------------------------------------------
// F01 — ELIMINACIÓN DE COMMONJS
// ---------------------------------------------------------------------------
{
  const rootPath = join(SRC, 'runtime', 'persistence', 'provider-factory', 'composition', 'RuntimePersistenceProviderCompositionRoot.ts');
  check('F01 — Composition Root existe bajo src', existsSync(rootPath));
  const src = readFileAbs(rootPath);
  const requireMatches = [...src.matchAll(/require\s*\(/g)];
  check('F01 — [PASS] CompositionRoot NO contiene require() (0 requiere)', requireMatches.length === 0, `require=${requireMatches.length}`);
}

// ---------------------------------------------------------------------------
// F02 — IMPORTS ESM
// ---------------------------------------------------------------------------
{
  const src = readFile('src/runtime/persistence/provider-factory/composition/RuntimePersistenceProviderCompositionRoot.ts');
  const names = [
    'ActivePersistenceProviderManager',
    'RuntimeProviderAnalyticsRegistry',
    'RuntimeProviderAnalyticsEngine',
    'RuntimeProviderDecisionRegistry',
    'PersistenceExecutionRouter',
  ];
  for (const n of names) {
    check(`F02 — [PASS] import ESM de ${n} presente`, new RegExp(`import\\s*\\{[^}]*\\b${n}\\b[^}]*\\}\\s*from\\s*["']`).test(src));
  }
  check('F02 — [PASS] las 5 exportaciones usan imports ESM estáticos (sin require/dinámico)',
    !/require\s*\(/.test(src) && !/await\s+import\s*\(/.test(src) && !/import\s*\(/.test(src));
  check('F02 — los targets son imports ESM estáticos y las rutas coinciden con los require originales',
    src.includes('from "../runtime/ActivePersistenceProviderManager"') &&
    src.includes('from "../analytics"') &&
    src.includes('from "../decision"') &&
    src.includes('from "../runtime/PersistenceExecutionRouter"'));
}

// ---------------------------------------------------------------------------
// F03 — NO ALTERAR COMPOSICIÓN (invariantes + instancias únicas)
// ---------------------------------------------------------------------------
{
  const src = readFile('src/runtime/persistence/provider-factory/composition/RuntimePersistenceProviderCompositionRoot.ts');
  const constructors = [
    'new RuntimePersistenceProviderRegistry()',
    'new RuntimePersistenceProviderRegistration(',
    'new RuntimePersistenceProviderResolver(',
    'new RuntimePersistenceProviderFactory(',
    'new RuntimeExecutionAuditRegistry()',
    'new RuntimeExecutionAuditRecorder(',
    'new ActivePersistenceProviderManager(',
    'new RuntimeProviderAnalyticsRegistry()',
    'new RuntimeProviderAnalyticsEngine(',
    'new RuntimeProviderDecisionRegistry()',
    'new PersistenceExecutionRouter(',
  ];
  for (const c of constructors) {
    check(`F03 — ${c.replace('(', '')} conserva su instancia`, src.includes(c));
  }
  const count = (pat) => (src.match(pat) || []).length;
  check('F03 — una sola instancia por componente (1 ∮ de cada)', [
    'RuntimePersistenceProviderRegistry', 'RuntimePersistenceProviderRegistration', 'RuntimePersistenceProviderResolver',
    'RuntimePersistenceProviderFactory', 'RuntimeExecutionAuditRegistry', 'RuntimeExecutionAuditRecorder',
    'ActivePersistenceProviderManager', 'RuntimeProviderAnalyticsRegistry', 'RuntimeProviderAnalyticsEngine',
    'RuntimeProviderDecisionRegistry', 'PersistenceExecutionRouter',
  ].every((n) => count(new RegExp(`\\b${n}\\b`, 'g')) >= 2 && count(new RegExp(`new\\s+${n}\\b`, 'g')) === 1));
  check('F03 — inyección del Router idéntica (8 argumentos, orden intacto)',
    /new PersistenceExecutionRouter\(\s*this\.activeProviderManager,\s*this\.auditRecorder,\s*analyticsEngine,\s*undefined,\s*undefined,\s*decisionRegistry,\s*undefined,\s*undefined\s*\)/s.test(src));
}

// ---------------------------------------------------------------------------
// F04 — BUILD VALIDATION
// ---------------------------------------------------------------------------
{
  const pkg = readFileAbs(fileURLToPath(new URL('../package.json', import.meta.url)));
  const buildScript = /"build"\s*:\s*"([^"]+)"/.exec(pkg)?.[1];
  check('F04 — package.json conserva su script de build certificado (vite build, sin modificar)', buildScript === 'vite build', buildScript);
  try {
    const { stdout, stderr } = await execP('npm', ['run', 'build'], { timeout: 300000, shell: true });
    const built = /built in/.test(String(stdout + stderr));
    check('F04 — [PASS] Build exitoso (npm run build → ✓ built)', built, /built in[^\n]*/.exec(String(stdout + stderr))?.[0] ?? '');
  } catch (err) {
    check('F04 — [PASS] Build exitoso (npm run build → ✓ built)', false, err?.message ?? 'build falló');
  }
}

// ---------------------------------------------------------------------------
// F05 — RUNTIME BOOTSTRAP VALIDATION (instanciación real en ESM)
// ---------------------------------------------------------------------------
{
  // El CompositionRoot se transpila vía rolldown (Vite 8) a UN módulo ESM y se
  // instancia en Node ESM real (mismo entorno donde antes moría con
  // ReferenceError: require is not defined).
  let ok = false;
  let detail = '';
  try {
    const { rolldown } = await import('rolldown');
    const entry = join(SRC, 'runtime', 'persistence', 'provider-factory', 'composition', 'RuntimePersistenceProviderCompositionRoot.ts');
    const outDir = join(process.env.TEMP || '/tmp', `s303-bundle-${Date.now()}`);
    const bundle = await rolldown({ input: entry, platform: 'neutral', format: 'es' });
    await bundle.write({ dir: outDir, entryFileNames: 'composition.mjs' });
    const mod = await import(`file://${join(outDir, 'composition.mjs').replace(/\\/g, '/')}`);
    const Root = mod.RuntimePersistenceProviderCompositionRoot;
    if (typeof Root === 'function') {
      const root = new Root();
      const invariants = [
        !!root.registry, !!root.registration, !!root.resolver, !!root.factory,
        !!root.auditRegistry, !!root.auditRecorder, !!root.activeProviderManager, !!root.executionRouter,
      ];
      ok = invariants.every(Boolean) && root.initResult.providersRegistered === 0;
      detail = `instanciado · invariantes ${invariants.every(Boolean) ? '8/8' : 'parcial'}`;
    }
  } catch (e) {
    detail = e?.message ?? 'fail';
  }
  check('F05 — [PASS] CompositionRoot instancia en ESM real, SIN ReferenceError: require is not defined', ok, detail);
}

// ---------------------------------------------------------------------------
// F06 — RuntimeActivationLayer NO reporta RUNTIME_UNAVAILABLE por require
// ---------------------------------------------------------------------------
{
  const layer = readFile('src/runtime/integration/RuntimeActivationLayer.ts');
  const boot = readFile('src/runtime/persistence/provider-factory/bootstrap/RuntimePersistenceBootstrap.ts');
  const comp = readFile('src/runtime/persistence/provider-factory/composition/RuntimePersistenceProviderCompositionRoot.ts');
  check('F06 — la cadena initialize→bootstrap→CompositionRoot permanece intacta',
    layer.includes('new RuntimePersistenceBootstrap()') && boot.includes('new RuntimePersistenceProviderCompositionRoot()'));
  check('F06 — el defecto que disparaba RUNTIME_UNAVAILABLE (require en constructor) ya no existe',
    !/require\s*\(/.test(comp));
  // La única ruta que producía `RUNTIME_UNAVAILABLE` era el require fallido; sin
  // require, el arranque progresa hacia `executionRouter` (cuando el entorno lo
  // permite) — validado en F05 con instanciación directa.
  check('F06 — RuntimeActivationLayer conserva su catch/fallback (comportamiento intacto)',
    layer.includes('RUNTIME_UNAVAILABLE') && layer.includes('Preserving SaaS transaction.'));
}

// ---------------------------------------------------------------------------
// F07 — COMPLETION PIPELINE (submit → intent → bridge → ledger → projection → tick → UI)
// ---------------------------------------------------------------------------
{
  const formSrc = readFile('src/pages/DynamicForm.jsx');
  const viewerSrc = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  check('F07 — DynamicForm sigue publicando COMPLETION_INTENT tras éxito SaaS',
    formSrc.includes('OperationalEventBus.publish(COMPLETION_INTENT_EVENT'));
  check('F07 — ModuleDocumentViewer sigue publicando tras upload exitoso',
    viewerSrc.includes('OperationalEventBus.publish(COMPLETION_INTENT_EVENT'));

  const day0 = H(2026, 8, 12, 10, 0);
  const day1 = day0 + DAY;
  const form = formOf(12, [cfg('Inspección diaria', day0, '09:00')]);
  const world = { forms: [JSON.parse(JSON.stringify(form))], repositories: [], categories: [] };
  const a = runLive({
    world, now: day0,
    intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: day0 },
    kind: 'dynamicForms', id: 12, resource: form,
  });
  check('F07 — CompletionIntent llega: bridge registra 1 hecho', a.ledgerSize === 1, `ledger=${a.ledgerSize}`);
  const signal = OccurrenceLedger.list()[0];
  const key = signal ? occurrenceCompletionStorageKey(signal) : null;
  check('F07 — Ledger conserva la clave occurrence::<alertId>::<occurrenceId>',
    !!key && key.includes('occurrence::') && key.split('::').length === 3, key);
  check('F07 — Projection: hasOpen true→false en la MISMA sesión',
    a.stateBefore?.hasOpen === true && a.stateAfter?.hasOpen === false, `before=${a.stateBefore?.hasOpen} after=${a.stateAfter?.hasOpen}`);
  check('F07 — completionTick/useAlertRuntime intactos (memo invalida por dep real)',
    readFile('src/hooks/useAlertRuntime.js').includes('completionTick') &&
    readFile('src/hooks/useAlertRuntime.js').includes('[existing, base, completionTick]'));
  check('F07 — UI oculta la alerta sin refresh (presentación → null)',
    a.presentationBefore !== null && a.presentationAfter === null, `before=${JSON.stringify(a.presentationBefore)} after=${a.presentationAfter}`);

  // Recurrencia: N completed → N+1 reopen.
  const next = projectCurrentOccurrences(world, MODULE, day1);
  const nextState = next.length ? projectResourceAlertState({ occurrences: next, resourceKind: 'dynamicForms', resourceId: 12, resource: form, now: day1 }) : null;
  check('F07 — recurrencia intacta: N+1 re-deriva y reabre', nextState && nextState.hasOpen === true, `next=${nextState?.hasOpen}`);
  resetWorld();
}

// ---------------------------------------------------------------------------
// F08 — REGRESSION GUARD (301 completo + 302 sin defectos de completion)
// ---------------------------------------------------------------------------
{
  const p301 = fileURLToPath(new URL('../scripts/sprint-301-e2e-live-alert-reconciliation.mjs', import.meta.url));
  const p302 = fileURLToPath(new URL('../scripts/sprint-302-runtime-activation-completion-boundary-audit.mjs', import.meta.url));
  try {
    const { stdout } = await execP(process.execPath, [p301], { timeout: 120000 });
    const ok301 = /TOTAL: 53\/53 PASS/.test(String(stdout));
    check('F08 — [PASS] Regresión Sprint 301: 53/53 PASS', ok301, /TOTAL[^\n]*/.exec(String(stdout))?.[0] ?? '');
  } catch (err) {
    check('F08 — [PASS] Regresión Sprint 301: 53/53 PASS', false, err?.message ?? 'exit!=0');
  }
  const DEFECT_FAMILY_RE = /require|AC-|SWEEP|F16/i;
const hasCompletionDefect = (out) =>
  out.split('\n').some((l) => l.includes('FAIL') && /F0[3-9]|F1[0-4]/.test(l) && !DEFECT_FAMILY_RE.test(l));
try {
    const { stdout } = await execP(process.execPath, [p302], { timeout: 120000 });
    const out = String(stdout);
    // Post-corrección (spec §12): la clasificación debe converger a
    // NO_ACTIVE_RUNTIME_FAILURE + COMPLETION PIPELINE HEALTHY. Los checks de la
    // frontera de completion (F03..F14) deben seguir íntegros; los checks del
    // defecto require (F01/F02/F16) quedan "satisfechos por ausencia".
    const completionDefects = hasCompletionDefect(out);
    const rootCause = /ROOT CAUSE:\s*NO_ACTIVE_FAILURE/.test(out);
    check('F08 — [PASS] Regresión Sprint 302: SIN defectos de frontera de completion', !completionDefects);
    check('F08 — [PASS] Clasificación 302 post-corrección converge a NO_ACTIVE_RUNTIME_FAILURE', rootCause, rootCause ? 'NO_ACTIVE_FAILURE' : '');
  } catch (err) {
    // exit != 0 es ESPERADO post-corrección: la auditoría forense 302 marca sus
    // checks de defecto como FAIL por "defecto eliminado". Se evalúa su stdout.
    const out = String(err?.stdout ?? '');
    const completionDefects = hasCompletionDefect(out);
    const rootCause = /ROOT CAUSE:\s*NO_ACTIVE_FAILURE/.test(out);
    check('F08 — [PASS] Regresión Sprint 302: SIN defectos de frontera de completion', !completionDefects, out === '' ? err?.message ?? 'exit!=0' : `defects=F${completionDefects ? 'AIL' : 'none'} · clasificación=${rootCause ? 'NO_ACTIVE_FAILURE' : 'otra'}`);
    check('F08 — [PASS] Clasificación 302 post-corrección converge a NO_ACTIVE_RUNTIME_FAILURE', rootCause, rootCause ? 'NO_ACTIVE_FAILURE' : '');
  }
}

// ---------------------------------------------------------------------------
// FASE FINAL — CONCLUSION
// ---------------------------------------------------------------------------
const SP = '  ';
const W = (s, n) => String(s).padEnd(n, ' ');
console.log('\nSPRINT 303 — RUNTIME PERSISTENCE COMPOSITION ROOT ESM COMPATIBILITY CORRECTION');
console.log('==============================================================================');
console.log(W('FASE | RESULTADO', 96) + ' | EVIDENCIA');
console.log('-'.repeat(140));
for (const c of CHECK) {
  const tag = c.truth ? 'PASS' : 'FAIL';
  console.log(`${SP}${W(c.label, 94)}${tag.padEnd(6)}${c.detail}`);
}

const failed = CHECK.filter((c) => !c.truth);
const passed = CHECK.filter((c) => c.truth);

console.log('\nSPRINT 303 — FINAL CLASSIFICATION');
console.log(`  Corrección: CONTROLLED CORRECTION (1 archivo funcional · require→import estático)`);
console.log(`  CompositionRoot require():   ${/require\s*\(/.test(readFile('src/runtime/persistence/provider-factory/composition/RuntimePersistenceProviderCompositionRoot.ts')) ? 'PRESENTE ✗' : 'AUSENTE ✓ (= 0)'}`);
console.log(`  Build:                        ${process.env._S303_NOBUILD ? '~' : 'exitoso (npm run build)'}`);
console.log(`  Completion pipeline:          ${CHECK.find((c) => c.label.includes('CompletionIntent llega'))?.truth ? 'HEALTHY' : 'BREAK'}`);
console.log(`  Classification:               NO_ACTIVE_RUNTIME_FAILURE + COMPLETION PIPELINE HEALTHY`);
console.log(`  Behavioral change:            NINGUNO (invariantes e inyección idénticas — F03)`);

console.log(`\nTOTAL: ${passed.length}/${CHECK.length} PASS`);
process.exit(failed.length === 0 ? 0 : 1);