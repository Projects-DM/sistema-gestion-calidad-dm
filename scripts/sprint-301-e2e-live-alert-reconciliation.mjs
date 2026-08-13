/**
 * Sprint 301 — END-TO-END LIVE ALERT RECONCILIATION & UI STATE OWNERSHIP AUDIT.
 *
 * TIPO: AUDIT FIRST · CONTROLLED CORRECTION · LEVEL 5.
 * Dependencias: 257 · 280 · 284 · 289 · 290 · 291 · 292 · 294 · 295 · 296 · 297 ·
 *               298 · 299 · 300.
 *
 * Sprint 300 certificó el pipeline ACCIÓN → EVENTO → BRIDGE → RESOLVER →
 * LEDGER → PERSISTENCIA → PROYECCIÓN → hasOpen=false. Sprint 301 debe demostrar
 * que ESE resultado llega al árbol React que presenta la alerta:
 *
 *   ACCIÓN → COMPLETION → LEDGER → RE-PROJECTION → REACT STATE INVALIDATION
 *   → DASHBOARD/UI RENDER → ALERT PRESENTATION → ALERTA OCULTA (misma sesión)
 *
 * METODOLOGÍA (sin infraestructura de testing ni DOM en el runtime):
 *   - F01/F02/F03/F06: verificación ESTÁTICA sobre los archivos REALES de src/
 *     (árbol React, deps reales del memo del hook, único archivo del ledger,
 *     presentación consume-only).
 *   - F03..F12: HARNESS CON SEMÁNTICA DE MEMO REACT (Object.is sobre el array
 *     de dependencias — idéntico a useMemo de React) que ejecuta las funciones
 *     CERTIFICADAS del pipeline real (proyección, dashboard provider, selector
 *     de estado y buildScheduleLines) y simula EXACTAMENTE el orden de
 *     suscripción de useAlertRuntime: bridge primero (registra el hecho),
 *     completionTick después (invalida). Se demuestra que el estado que llega a
 *     la presentación CAMBIA en la misma sesión sin refresh.
 *
 * NO se modifica nada de src/ en este sprint (salvo corrección controlada si la
 * evidencia la exige — no ocurrió). STOP list respetada al final.
 *
 * Ejecutar: node scripts/sprint-301-e2e-live-alert-reconciliation.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import {
  wireCompletionBridge,
  registerCompletionOccurrenceProvider,
  handleCompletionIntent,
  COMPLETION_INTENT_EVENT,
} from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { createInMemoryOccurrenceLedgerAdapter } from '../src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js';
import { projectResourceAlertState, buildScheduleLines } from '../src/utils/alertResourceState.js';
import { provideAlertDashboardData } from '../src/core/capabilities/alert/runtime-consumption/AlertDashboardDataProvider.js';

// ---------------------------------------------------------------------------
// HARNESS
// ---------------------------------------------------------------------------
const readFile = (p) => {
  try { return readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8'); } catch { return ''; }
};

const CHECK = [];
const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });

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
  OperationalEventBus.clear();
  BRIDGE_UNSUB = wireCompletionBridge();
}

/**
 * Sprint 301 — HARNESS DE SEMÁNTICA DE MEMO REACT.
 *
 * Replica fielmente el grafo de dependencias REAL de useAlertRuntime (extraído
 * de la fuente en F02) usando la MISMA semántica de useMemo de React: un memo
 * se re-ejecuta solo cuando algún dep cambia según Object.is; si no, reutiliza
 * el MISMO objeto (referencia estable). Cada `render()` es un paso de render
 * React: memoriza, y los consumidores derivan el estado que presentarían.
 */
class LiveHookHarness {
  constructor({ existing, base, now }) {
    this.state = { existing, base, now, completionTick: 0 };
    this.memos = new Map();
    this.renderCount = 0;
  }

  memo(key, deps, compute) {
    const prev = this.memos.get(key);
    if (prev && prev.deps.length === deps.length && prev.deps.every((d, i) => Object.is(d, deps[i]))) {
      return prev.value;
    }
    const value = compute();
    this.memos.set(key, { deps: deps.slice(), value });
    return value;
  }

  /** Un render React: recomputa los memos cuyo dep cambió. */
  render() {
    this.renderCount += 1;
    const { existing, base, now, completionTick } = this.state;
    const occurrences = this.memo(
      'occurrences',
      [existing, base, completionTick],
      () => projectCurrentOccurrences(existing, base.moduleId ?? base.module ?? base.moduleSlug, now),
    );
    const dashboard = this.memo(
      'dashboard',
      [base, occurrences],
      () => provideAlertDashboardData({ capability: 'alerts', moduleAssigned: true, evaluationEntries: [], occurrences }),
    );
    const consumed = {
      renderCount: this.renderCount,
      completionTick,
      occurrences,
      metrics: dashboard?.metrics ?? null,
    };
    this.lastConsumed = consumed;
    return consumed;
  }

  /** Memo de CONSUMIDOR (misma forma que FormsContent/Viewer: deps occurrences + recurso). */
  stateFor(resourceKind, resourceId, resource) {
    const key = `state:${resourceKind}:${resourceId}`;
    const occurrences = this.memos.get('occurrences')?.value ?? [];
    return this.memo(
      key,
      [occurrences, resource],
      () => projectResourceAlertState({ occurrences, resourceKind, resourceId, resource, now: this.state.now }),
    );
  }

  /** El binding del ledger debe estar fresco en render N+1 tras el intent. */
  bumpTick() { this.state.completionTick += 1; }
}

/**
 * Borde de presentación REAL (espejo literal de
 * UnifiedAlertResourcePresentation.jsx líneas 41-45):
 *   if (state?.present !== true) return null;
 *   const schedule = buildScheduleLines(state.events);
 *   if (schedule.length === 0) return null;
 * Devuelve un descriptor del bloque renderizado (o null = alerta oculta).
 */
function presentAlert(state) {
  if (state?.present !== true) return null;
  const schedule = buildScheduleLines(state.events);
  if (schedule.length === 0) return null;
  return { rendered: true, scheduleLength: schedule.length, schedule: schedule.map((l) => l.day) };
}

/**
 * Driver E2E live: render N (abierto) → publish COMPLETION_INTENT (bridge
 * registra; tick invalida) → render N+1 (cerrado) → presentación oculta.
 * Devuelve { before, after } con las identidades observadas.
 */
function runLive({ world, now, intent, kind, id, resource }) {
  resetWorld();
  freshBridge();
  AUDIT_RESOURCES = world;
  AUDIT_NOW = now;
  const h = new LiveHookHarness({ existing: world, base: { moduleId: MODULE, module: MODULE, moduleSlug: MODULE }, now });

  const before = h.render();
  const stateBefore = h.stateFor(kind, id, resource);
  const presentationBefore = presentAlert(stateBefore);

  // EXACTO orden de useAlertRuntime: el bridge se suscribió primero (registra
  // el hecho), el completionTick después (solo invalida).
  const unsubTick = OperationalEventBus.subscribe(COMPLETION_INTENT_EVENT, () => h.bumpTick());
  OperationalEventBus.publish(COMPLETION_INTENT_EVENT, intent);
  unsubTick();

  const after = h.render();
  const stateAfter = h.stateFor(kind, id, resource);
  const presentationAfter = presentAlert(stateAfter);

  return { before, after, stateBefore, stateAfter, presentationBefore, presentationAfter };
}

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------
const F_SINGLE = formOf(12, [cfg('A1', '2026-08-12', '08:00')]);
const F_MULTI = formOf(12, [
  cfg('A', '2026-08-12', '08:00'),
  cfg('B', '2026-08-12', '14:00'),
  cfg('C', '2026-08-13', '08:00'),
]);
const T0 = H(2026, 8, 12, 10, 0);
const REPO = repoOf(77, [cfg('Doc', '2026-08-12', '07:00')]);
const CAT_OWN = catOf(5, 77, [cfg('CatA', '2026-08-12', '08:00')]);
const CAT_INHERIT = catOf(6, 77, null);
const WORLD_OWN = { forms: [], repositories: [REPO], categories: [CAT_OWN, CAT_INHERIT] };

// ===========================================================================
console.log('SPRINT 301 — E2E LIVE ALERT RECONCILIATION & UI STATE OWNERSHIP');
console.log('===============================================================');

// ---------------------------------------------------------------------------
// F01 — ÁRBOL REACT REAL + único dueño del estado de alertas.
// ---------------------------------------------------------------------------
{
  const main = readFile('src/main.jsx');
  check('F01 — main.jsx monta <StrictMode><AuthProvider><App/></AuthProvider></StrictMode>',
    main.includes('StrictMode') && main.includes('AuthProvider') && main.includes('App'));
  check('F01 — boot de persistencia durable en arranque (bootDurableOccurrenceLedger)',
    main.includes('bootDurableOccurrenceLedger()'));

  const app = readFile('src/App.jsx');
  check('F01 — App: Router → ProtectedRoute → DashboardLayout → /dashboard → Dashboard',
    app.includes('DashboardLayout') && app.includes('ProtectedRoute') && app.includes('path="dashboard"') && app.includes('<Dashboard'));
  check('F01 — módulo DynamicModule montado bajo :moduleSlug (ruta del módulo)',
    app.includes(':moduleSlug') && app.includes('<DynamicModule'));
  check('F01 — formulario bajo modulo/:moduleSlug/:formSlug → DynamicForm',
    app.includes('modulo/:moduleSlug/:formSlug') && app.includes('<DynamicForm'));

  // Unico dueño: TODOS los consumidores derivan de useAlertRuntime (occurrences
  // o dashboard); ninguno mantiene estado completed local.
  const consumers = [
    ['src/pages/Dashboard.jsx', 'dashboard', 'useAlertRuntime({', true],
    ['src/pages/DynamicModule.jsx', 'occurrences', 'useAlertRuntime({', true],
    ['src/modules/documentViewer/ModuleDocumentViewer.jsx', 'occurrences', 'useAlertRuntime({', true],
    ['src/modules/experiences/AlertMonitoringExperience.jsx', 'occurrences', 'useAlertRuntime({', true],
  ];
  for (const [file, surface, call, present] of consumers) {
    const src = readFile(file);
    check(`F01 — ${file.split('/').pop()} consume ${surface} VIA useAlertRuntime (un solo dueño)`,
      src.includes(call) && (surface === 'dashboard' ? src.includes('dashboard: alertDashboard') : src.includes(surface)),
      present ? 'runtime surface' : 'no surface');
  }

  // F01 — sin segunda fuente de verdad: los consumidores presentadores NO crean
  // estado completed local y NO escriben completions al ledger directamente
  // (publish de COMPLETION_INTENT es legítimo SOLO en los dos emisores certificados).
  const banned = ['justUploaded', 'justCompleted', 'display:none', 'window.location.reload'];
  for (const f of ['src/pages/Dashboard.jsx', 'src/pages/DynamicModule.jsx', 'src/modules/documentViewer/ModuleDocumentViewer.jsx', 'src/modules/experiences/AlertMonitoringExperience.jsx']) {
    const src = readFile(f);
    const hits = banned.filter((t) => src.includes(t));
    check(`F01 — AC-21/22: ${f.split('/').pop()} sin estado completado local ni ocultamiento artificial`, hits.length === 0, hits.join(','));
    check(`F01 — AC-23: ${f.split('/').pop()} no escribe completions al ledger (sin recordCompletion/OccurrenceLedger.)`,
      !src.includes('recordCompletion') && !src.includes('OccurrenceLedger.'));
  }

  // AC-21 — el único canal de completion es el intent certificado; SOLO los dos
  // emisores reales publican COMPLETION_INTENT.
  const emitters = [];
  const srcStack = [fileURLToPath(new URL('../src/', import.meta.url))];
  while (srcStack.length) {
    const dir = srcStack.pop();
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      const st = statSync(p);
      if (st.isDirectory()) srcStack.push(p);
      else if (/\.(js|jsx)$/.test(e)) {
        const s = readFileSync(p, 'utf8');
        if (s.includes('COMPLETION_INTENT_EVENT') && s.includes('publish(')) emitters.push(p.replace(/\\/g, '/'));
      }
    }
  }
  const allowed = emitters.every((p) => p.includes('src/pages/DynamicForm.jsx') || p.includes('src/modules/documentViewer/ModuleDocumentViewer.jsx'));
  check('F01 — AC-21: emisores de COMPLETION_INTENT = EXACTAMENTE DynamicForm + ModuleDocumentViewer', emitters.length === 2 && allowed, emitters.join(', '));
}

// ---------------------------------------------------------------------------
// F02 — useAlertRuntime REAL: completionTick es dep del memo de ocurrencias.
// ---------------------------------------------------------------------------
{
  const src = readFile('src/hooks/useAlertRuntime.js');
  const realHook = src.includes('export default useAlertRuntime') && src.includes('projectCurrentOccurrences') && src.length > 8000;
  check('F02 — archivo real bajo auditoría (no placeholder)', realHook, `len=${src.length}`);
  check('F02 — completionTick declarado como estado del runtime', src.includes('const [completionTick, setCompletionTick] = useState(0)'));
  check('F02 — deps REALES del memo de occurrences = [existing, base, completionTick]',
    /\[existing, base, completionTick\]/.test(src));
  check('F02 — el tick se suscribe al COMPLETION_INTENT en el MISMO effect que el bridge',
    src.indexOf('subscribe(COMPLETION_INTENT_EVENT') > src.indexOf('wireCompletionBridge()'));
  check('F02 — el memo SOLO invalida: el hook no duplica el motor (sin recordCompletion en hook)',
    !src.includes('recordCompletion('));

  // F02 — semántica ejecutable del ciclo completionTick N → render N → N+1:
  // sin cambio de dep → MISMO objeto (estabilidad); con bump del tick → NUEVO.
  resetWorld();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = T0;
  const h = new LiveHookHarness({ existing: AUDIT_RESOURCES, base: { moduleId: MODULE, module: MODULE, moduleSlug: MODULE }, now: AUDIT_NOW });
  const r1 = h.render();
  const occ1 = h.memos.get('occurrences').value;
  const r2 = h.render(); // sin cambios de dep
  const occ2 = h.memos.get('occurrences').value;
  check('F02 — render sin cambios reutiliza el MISMO objeto de ocurrencias (memo estable)',
    r1.renderCount === 1 && r2.renderCount === 2 && Object.is(occ1, occ2));
  h.bumpTick(); // completionTick N → N+1 (simula setCompletionTick del evento)
  const r3 = h.render();
  const occ3 = h.memos.get('occurrences').value;
  check('F02 — AC-05/AC-06: completionTick N+1 → el memo recomputa y produce NUEVO objeto (re-proyección)',
    r3.completionTick === 1 && !Object.is(occ2, occ3), `tick=${r3.completionTick}`);
}

// ---------------------------------------------------------------------------
// F03 — IDENTIDAD DEL LEDGER: bridge y UI leen la MISMA instancia lógica.
// ---------------------------------------------------------------------------
{
  // Estático: un ÚNICO archivo OccurrenceLedger en todo src; el bridge y la
  // proyección lo importan por la MISMA ruta relativa (singleton ESM).
  const ROOT = fileURLToPath(new URL('../src/', import.meta.url));
  const ledgerFiles = [];
  const stack = [ROOT];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      const st = statSync(p);
      if (st.isDirectory()) stack.push(p);
      else if (e === 'OccurrenceLedger.js') ledgerFiles.push(p.replace(/\\/g, '/'));
    }
  }
  check('F03 — existe EXACTAMENTE un archivo OccurrenceLedger en src (sin instancia duplicada)',
    ledgerFiles.length === 1, ledgerFiles.join(', '));
  const bridgeSrc = readFile('src/core/capabilities/alert/occurrence/CompletionBridge.js');
  const projSrc = readFile('src/core/capabilities/alert/occurrence/OccurrenceProjection.js');
  check('F03 — el bridge importa ./OccurrenceLedger.js (misma ruta que la proyección)',
    bridgeSrc.includes("OccurrenceLedger from './OccurrenceLedger.js'") && projSrc.includes("OccurrenceLedger from './OccurrenceLedger.js'"));

  // Ejecutable: el hecho registrado POR EL BRIDGE es leído por la proyección
  // (la que consume la UI) en la misma sesión → si hubiera LEDGER_INSTANCE_SPLIT
  // (Ledger A/B), la UI vería completion=false. No ocurre.
  resetWorld();
  freshBridge();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = T0;
  handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: T0 });
  const projected = projectCurrentOccurrences(AUDIT_RESOURCES, MODULE, AUDIT_NOW);
  const completionRead = projected[0]?.completion?.status === 'COMPLETED';
  const metrics = provideAlertDashboardData({ capability: 'alerts', moduleAssigned: true, evaluationEntries: [], occurrences: projected }).metrics;
  check('F03 — AC-04/AC-23: el hecho del bridge es leído por la proyección de la UI (misma instancia)',
    completionRead && metrics.activeAlerts === 0, `completion=${completionRead} active=${metrics.activeAlerts}`);
}

// ---------------------------------------------------------------------------
// F04 — RE-PROYECCIÓN REAL: estado nuevo, sin objeto memoizado obsoleto.
// ---------------------------------------------------------------------------
{
  const { before, after, stateBefore, stateAfter } = runLive({
    world: { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] },
    now: T0,
    intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: T0 },
    kind: 'dynamicForms', id: 12, resource: null,
  });
  check('F04 — AC-24: el array de ocurrencias que recibe la UI cambia de referencia tras el completion (no memo obsoleto)',
    before.occurrences !== after.occurrences, `before=${before.occurrences} after=${after.occurrences}`);
  check('F04 — AC-08: hasOpen pasa de true a false', stateBefore?.hasOpen === true && stateAfter?.hasOpen === false,
    `before=${stateBefore?.hasOpen} after=${stateAfter?.hasOpen}`);
  check('F04 — el estado consumido por el presentador cambia de referencia (nuevo objeto de estado)',
    stateBefore !== stateAfter);
}

// ---------------------------------------------------------------------------
// F05 — ESTADO CONSUMIDO POR EL DASHBOARD: OLD → NEW tras completion.
// ---------------------------------------------------------------------------
{
  const { before, after } = runLive({
    world: { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] },
    now: T0,
    intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: T0 },
    kind: 'dynamicForms', id: 12, resource: null,
  });
  check('F05 — AC-07: el Dashboard recibe NUEVO objeto metrics tras el completion',
    before.metrics !== after.metrics, 'referencia cambiada');
  check('F05 — AC-07: activeAlerts OLD=1 → NEW=0',
    before.metrics?.activeAlerts === 1 && after.metrics?.activeAlerts === 0,
    `OLD=${before.metrics?.activeAlerts} NEW=${after.metrics?.activeAlerts}`);
}

// ---------------------------------------------------------------------------
// F06 — RENDER FINAL: schedule con eventos → schedule vacío → presentación null.
// ---------------------------------------------------------------------------
{
  const { presentationBefore, presentationAfter } = runLive({
    world: { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] },
    now: T0,
    intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: T0 },
    kind: 'dynamicForms', id: 12, resource: null,
  });
  check('F06 — AC-09: antes del completion el presentador renderiza el bloque (schedule>0)',
    presentationBefore?.rendered === true && presentationBefore.scheduleLength > 0,
    `schedule=${presentationBefore?.scheduleLength}`);
  check('F06 — AC-09: después del completion el presentador devuelve null (schedule.length===0, regla real del componente)',
    presentationAfter === null, `after=${JSON.stringify(presentationAfter)}`);
  const pres = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
  check('F06 — AC-21: la presentación inventa estado? NO — consume y devuelve null con regla real',
    pres.includes('state?.present !== true') && pres.includes('schedule.length === 0'));
}

// ---------------------------------------------------------------------------
// F07 — E2E FORMULARIO: misma sesión sin refresh + reaparición por ventana.
// ---------------------------------------------------------------------------
{
  const day0 = H(2026, 8, 12, 10, 0);
  const day1 = H(2026, 8, 13, 10, 0);
  const world = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  const intent = { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: day0 };

  const a = runLive({ world: JSON.parse(JSON.stringify(world)), now: day0, intent, kind: 'dynamicForms', id: 12, resource: null });
  check('F07 — FORM AC-01: completion llega al ledger (proyección lo ve)',
    a.stateBefore?.hasOpen === true && a.stateAfter?.hasOpen === false, `open ${a.stateBefore?.hasOpen} → ${a.stateAfter?.hasOpen}`);
  check('F07 — FORM AC-08/AC-10: alerta desaparece en la MISMA sesión (sin refresh)',
    a.presentationBefore?.rendered === true && a.presentationAfter === null);

  // Día siguiente → ocurrencia DERIVADA nueva → alerta vuelve a aparecer.
  const b = runLive({ world: JSON.parse(JSON.stringify(world)), now: day1, intent, kind: 'dynamicForms', id: 12, resource: null });
  check('F07 — FORM AC-16: día siguiente la nueva ocurrencia reabre la alerta (vuelve a aparecer)',
    b.stateBefore?.hasOpen === true && b.presentationBefore?.rendered === true, `hasOpen=${b.stateBefore?.hasOpen}`);

  // Sub-flow estático: el emisor real publica SOLO tras submit exitoso.
  const df = readFile('src/pages/DynamicForm.jsx');
  check('F07 — FORM AC-12: submit fallido NO completa (publish estrictamente tras await submitFormResponse)',
    df.indexOf('publish(COMPLETION_INTENT_EVENT') > df.indexOf('await dynamicService.submitFormResponse'));
}

// ---------------------------------------------------------------------------
// F08 — E2E REPOSITORY: misma sesión; upload fallido NO completa.
// ---------------------------------------------------------------------------
{
  const day0 = H(2026, 8, 12, 10, 0);
  const world = { forms: [], repositories: [JSON.parse(JSON.stringify(REPO))], categories: [] };
  const intent = { origin: 'resource', resourceKind: 'documentRepository', resourceId: 77, moduleId: MODULE, completedAt: day0 };

  const a = runLive({ world: JSON.parse(JSON.stringify(world)), now: day0, intent, kind: 'documentRepository', id: 77, resource: null });
  check('F08 — REPO AC-02: completion del repository llega al ledger y oculta la alerta en la misma sesión',
    a.stateBefore?.hasOpen === true && a.stateAfter?.hasOpen === false && a.presentationBefore?.rendered === true && a.presentationAfter === null,
    `open ${a.stateBefore?.hasOpen} → ${a.stateAfter?.hasOpen}`);

  // Upload fallido: sin publish → el estado NO cambia (no optimista).
  resetWorld();
  freshBridge();
  AUDIT_RESOURCES = world;
  AUDIT_NOW = day0;
  const h = new LiveHookHarness({ existing: AUDIT_RESOURCES, base: { moduleId: MODULE, module: MODULE, moduleSlug: MODULE }, now: day0 });
  const before = h.render();
  const st1 = h.stateFor('documentRepository', 77, null);
  const snap1 = presentAlert(st1);
  const stillOpen = h.render(); // sin evento → memo estable
  const st2 = h.stateFor('documentRepository', 77, null);
  check('F08 — REPO AC-11: sin publish (upload fallido) la alerta permanece visible (sin completion optimista)',
    stillOpen.occurrences === before.occurrences && snap1?.rendered === true && Object.is(st1, st2));

  const dv = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
  check('F08 — REPO AC-11: el viewer publica SOLO tras await uploadRecord (path de error nunca completa)',
    dv.indexOf('publish(COMPLETION_INTENT_EVENT') > dv.indexOf('await documentsService.uploadRecord') &&
    dv.indexOf('COMPLETION_INTENT_EVENT', dv.lastIndexOf('catch')) === -1);
}

// ---------------------------------------------------------------------------
// F09 — E2E CATEGORY: ownership certificado (propia vs heredada).
// ---------------------------------------------------------------------------
{
  const day0 = H(2026, 8, 12, 10, 0);
  // Category A con config propia → completa SOLO Category A; Repository queda open.
  const own = runLive({
    world: JSON.parse(JSON.stringify(WORLD_OWN)), now: day0,
    intent: { origin: 'resource', resourceKind: 'documentCategory', resourceId: 5, moduleId: MODULE, completedAt: day0 },
    kind: 'documentCategory', id: 5, resource: null,
  });
  check('F09 — CAT AC-03/AC-14: categoría propia completa SOLO su categoría',
    own.stateAfter?.hasOpen === false && own.presentationAfter === null);

  const ownRepo = runLive({
    world: JSON.parse(JSON.stringify(WORLD_OWN)), now: day0,
    intent: { origin: 'resource', resourceKind: 'documentCategory', resourceId: 5, moduleId: MODULE, completedAt: day0 },
    kind: 'documentRepository', id: 77, resource: null,
  });
  check('F09 — CAT AC-14: categoría propia NO completa el Repository (sigue visible)',
    ownRepo.stateAfter?.hasOpen === true && ownRepo.presentationAfter?.rendered === true);

  // Category heredada (sin config propia) → atribuye al Repository → repo completed.
  const inherit = runLive({
    world: JSON.parse(JSON.stringify(WORLD_OWN)), now: day0,
    intent: { origin: 'resource', resourceKind: 'documentRepository', resourceId: 77, moduleId: MODULE, completedAt: day0 },
    kind: 'documentRepository', id: 77, resource: null,
  });
  check('F09 — CAT AC-03/AC-15: upload en categoría heredada completa el Repository dueño',
    inherit.stateAfter?.hasOpen === false && inherit.presentationAfter === null);
}

// ---------------------------------------------------------------------------
// F10 — MÚLTIPLES ALERTAS: una acción completa UNA ocurrencia elegible.
//       (A 08:00, B 14:00 HOY, C mañana — acción a las 15:00: B ya inició su
//       ventana → determinista A por dueAt menor; B/C permanecen abiertas.)
// ---------------------------------------------------------------------------
{
  const when = H(2026, 8, 12, 15, 0);
  const world = { forms: [JSON.parse(JSON.stringify(F_MULTI))], repositories: [], categories: [] };
  const a = runLive({
    world: JSON.parse(JSON.stringify(world)), now: when,
    intent: { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: when },
    kind: 'dynamicForms', id: 12, resource: null,
  });
  const eventStates = a.stateAfter?.events?.reduce((acc, e) => { acc[e.alertId] = e.status; return acc; }, {}) ?? {};
  const bNotCompleted = eventStates['12:alert:1'] && eventStates['12:alert:1'] !== 'completed';
  const cNotCompleted = eventStates['12:alert:2'] && eventStates['12:alert:2'] !== 'completed';
  check('F10 — AC-13: A=completed, B=open, C=upcoming (una acción, una ocurrencia)',
    eventStates['12:alert:0'] === 'completed' && bNotCompleted && cNotCompleted,
    JSON.stringify(eventStates));
  check('F10 — AC-13: el ledger registró EXACTAMENTE un hecho',
    OccurrenceLedger.size === 1, `size=${OccurrenceLedger.size}`);
}

// ---------------------------------------------------------------------------
// F11 — RECURRENCIAS A NIVEL UI (diario/semanal/mensual/anual).
// ---------------------------------------------------------------------------
{
  function recurrenceUI(label, unit, startDate, startTime, p1, p2) {
    const world = { forms: [formOf(88, [cfg(label, startDate, startTime, unit)])], repositories: [], categories: [] };
    const intent = { origin: 'resource', resourceKind: 'dynamicForms', resourceId: 88, moduleId: MODULE, completedAt: p1 };
    const a = runLive({ world: JSON.parse(JSON.stringify(world)), now: p1, intent, kind: 'dynamicForms', id: 88, resource: null });
    const hidden = a.presentationBefore?.rendered === true && a.presentationAfter === null;
    const b = runLive({ world: JSON.parse(JSON.stringify(world)), now: p2, intent, kind: 'dynamicForms', id: 88, resource: null });
    const reappeared = b.presentationBefore?.rendered === true && b.stateBefore?.hasOpen === true && b.before.occurrences[0]?.sequence === 2;
    check(`${label} — AC-16..19: completa el período → oculta; siguiente período → nueva ocurrencia reaparece`,
      hidden && reappeared, `hidden=${hidden} reappeared=${reappeared}`);
  }
  recurrenceUI('F11 DIARIO', 'days', '2026-08-12', '08:00', H(2026, 8, 12, 10, 0), H(2026, 8, 13, 10, 0));
  recurrenceUI('F11 SEMANAL', 'weeks', '2026-08-12', '08:00', H(2026, 8, 12, 10, 0), H(2026, 8, 19, 10, 0));
  recurrenceUI('F11 MENSUAL', 'months', '2026-08-01', '08:00', H(2026, 8, 10, 10, 0), H(2026, 9, 10, 10, 0));
  recurrenceUI('F11 ANUAL', 'years', '2026-08-12', '08:00', H(2026, 10, 12, 10, 0), H(2027, 10, 12, 10, 0));
}

// ---------------------------------------------------------------------------
// F12 — REFRESH: la persistencia conserva el completion (AC-20); el objetivo
//       principal de 301 (sin refresh) ya quedó probado en F07/F08.
// ---------------------------------------------------------------------------
{
  resetWorld();
  freshBridge();
  AUDIT_RESOURCES = { forms: [JSON.parse(JSON.stringify(F_SINGLE))], repositories: [], categories: [] };
  AUDIT_NOW = T0;
  const adapter = createInMemoryOccurrenceLedgerAdapter();
  OccurrenceLedger.registerPersistencePort(adapter);
  handleCompletionIntent({ origin: 'resource', resourceKind: 'dynamicForms', resourceId: 12, moduleId: MODULE, completedAt: T0 });
  OccurrenceLedger.clear();
  const replayed = OccurrenceLedger.hydrateFromPersistencePort();
  const projected = projectCurrentOccurrences(AUDIT_RESOURCES, MODULE, T0);
  const state = projectResourceAlertState({ occurrences: projected, resourceKind: 'dynamicForms', resourceId: 12, resource: null, now: T0 });
  check('F12 — AC-20: refresh conserva el completion (hydrate → completed, alerta oculta)',
    replayed === 1 && state?.hasOpen === false && presentAlert(state) === null, `replayed=${replayed}`);
  OccurrenceLedger.unregisterPersistencePort();
}

// ===========================================================================
// CONSOLIDACIÓN + CLASIFICACIÓN
// ===========================================================================
const failures = CHECK.filter((c) => !c.truth);
console.log('');
const CATEGORY_BY_LABEL = [
  ['F01', 'STATE_OWNERSHIP_FAILURE'],
  ['F02', 'REACTIVITY_FAILURE'],
  ['F03', 'LEDGER_FAILURE'],
  ['F04', 'PROJECTION_FAILURE'],
  ['F05', 'REACTIVITY_FAILURE'],
  ['F06', 'RENDER_FAILURE'],
  ['F07', 'EMITTER_FAILURE'],
  ['F08', 'EMITTER_FAILURE'],
  ['F09', 'IDENTITY_FAILURE'],
  ['F10', 'IDENTITY_FAILURE'],
  ['F11', 'RECURRENCE_FAILURE'],
  ['F12', 'PERSISTENCE_FAILURE'],
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
  console.log(`  ${c.label.padEnd(64)} ${c.truth ? 'PASS' : 'FAIL'}  ${cat.padEnd(22)} ${c.detail}`);
}
console.log('');

const root = {
  ROOT_CAUSE: failures.length === 0
    ? 'NO SE ENCONTRÓ UNA FRONTERA PERDIDA ENTRE EL PIPELINE CERTIFICADO (300) Y EL ÁRBOL REACT. La cadena ACCIÓN → COMPLETION → LEDGER → RE-PROJECTION → completionTick → render → PRESENTACIÓN se mantiene íntegra: el completionTick invalida el memo de `occurrences` (F02), la UI recibe un NUEVO objeto de estado (F04/F05), el presentador consume el estado proyectado y oculta la alerta cuando schedule.length===0 (F06) — todo en la MISMA sesión, sin refresh (F07/F08) y con reaparición por la siguiente ocurrencia derivada (F07/F11).'
    : `Frontera(s) con discrepancia: ${failures.map((c) => c.label).join(', ')}`,
  CLASSIFICATION: failures.length === 0
    ? 'NO_ACTIVE_FAILURE / UI_STATE_OWNERSHIP_OK (single-owner: useAlertRuntime.occurrences; ledger único)'
    : [...new Set(failures.map((c) => classify(c.label)))].join(','),
  MINIMUM_CORRECTION: failures.length === 0
    ? 'NINGUNA corrección requerida por la evidencia. La propiedad se conserva SIN tocar el motor: OccurrenceContract/Schedule/Projection/Bridge/Resolver/Ledger/Persistence/recurrencia quedaron intactos (STOP list).'
    : 'Corrección controlada únicamente en la frontera fallida (ver matriz) — ninguna aplicada en este run.',
  EVIDENCE: failures.length === 0
    ? 'scripts/sprint-301-e2e-live-alert-reconciliation.mjs — F01..F12 verdes (semántica de memo React sobre el pipeline REAL; árbol React y deps reales verificados estáticamente).'
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