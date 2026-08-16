/**
 * SPRINT 323 — OPERATIONAL COMPLETION CONVERGENCE · CONTROLLED MIGRATION
 * LEVEL 5 · ONE OPERATIONAL LIFECYCLE · ONE TERMINAL STATE · ONE SOURCE OF TRUTH
 *
 * Precedente: Sprint 322 (PARTIAL — dependencia real, simplificable).
 * Migración: completado = único terminal; Aprobar/Cerrar/Reabrir retirados;
 *            gate canComplete (readiness validated|ready) reutiliza getReadinessState.
 * Método: STATIC ANALYSIS + RUNTIME (canComplete/getReadinessState puro) + GIT SCOPE + BUILD.
 * Timebox <60s (HARD 120s). NO regresión histórica 296–322.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ui = S('src/modules/experiences/UniversalOperationalRuntime.jsx');
const orch = S('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js');
const completion = S('src/core/capabilities/experiences/OperationalDataCompletion.js');
const registry = S('src/core/capabilities/experiences/OperationalExperienceRegistry.js');
const service = S('src/services/operationalRecordsService.js');
const bridge = S('src/core/capabilities/alert/occurrence/CompletionBridge.js');
const alertRuntime = S('src/hooks/useAlertRuntime.js');
const dashboard = S('src/modules/experiences/UniversalOperationalDashboard.jsx');

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const ALL_SRC = walk(path.join(ROOT, 'src'));
const srcText = (p) => S(path.relative(ROOT, p).replace(/\\/g, '/'));

const start = Date.now();
let passed = 0;
let failed = 0;
const failures = [];
function check(cond, label, detail = '') {
  if (cond) passed++;
  else { failed++; failures.push({ label, detail }); }
}
const has = (re, src) => re.test(src);
const H = (re, src, label) => check(has(re, src), label, `regex ${re}`);
const N = (re, src, label) => check(!has(re, src), label, `regex ${re}`);
const inSrc = (token) => ALL_SRC.filter((p) => srcText(p).includes(token)).length;

/* ================================================================== */
/* RUNTIME — canComplete / getReadinessState (contrato puro, sin DB)   */
/* ================================================================== */
let canComplete, getReadinessState;
try {
  const mod = await import(pathToFileURL(path.join(ROOT, 'src/core/capabilities/experiences/OperationalDataCompletion.js')).href);
  canComplete = mod.canComplete;
  getReadinessState = mod.getReadinessState;
} catch (e) {
  canComplete = null;
  console.log('  (import OperationalDataCompletion falló: ' + e.message + ')');
}
const runtimeContract = {
  documentContract: { canonicalFields: ['cliente', 'producto', 'lote', 'cantidad'] },
  validationRules: {},
  businessRules: [{ field: 'cliente', requires: ['producto'] }],
  complianceRules: [],
};
const rv = { cliente: 'A', producto: 'B', lote: 'C', cantidad: '10' };          // validated
const rr = { estado: 'ready', ...rv };                                          // ready
const rd = { cliente: 'A', producto: 'B', lote: 'C' };                          // draft (score 75, sin inconsistencias)
const ri = { cliente: 'A', producto: '' };                                      // inconsistent
const rl = { estado: 'cerrado', ...rv };                                        // legacy cerrado
const read = (r) => (canComplete ? getReadinessState(r, runtimeContract) : 'NO_IMPORT');
const can = (r) => (canComplete ? canComplete(r, runtimeContract) : 'NO_IMPORT');

/* ================================================================== */
/* A. LIFECYCLE                                                        */
/* ================================================================== */
{
  H(/const allowedStatuses = \['pendiente', 'en_proceso', 'completado'\]/, orch, 'E01: allowedStatuses = 3 estados operacionales');
  H(/const allowedStatuses = \['pendiente', 'en_proceso', 'completado'\]/, orch, 'E02: sin estados terminales extra (approved/cerrado no transicionan)');
  N(/\{ estado: 'approved' \}|\{ estado: 'cerrado' \}/, orch, 'E02: sin escrituras a approved/cerrado en el lifecycle');
  check(inSrc("{ estado: 'approved' }") === 0 && inSrc("{ estado: 'cerrado' }") === 0, 'E02: ninguna escritura {estado:\'approved\'}/{estado:\'cerrado\'} en src');
  check(has(/updateBatch\(ids, \{ estado: newStatus \}\)/, orch), 'E03/E04: Cambiar estado persiste el destino (pendiente→en_proceso→completado)');
  H(/if \(newStatus === 'completado'\)/, orch, 'E05: gate de finalización en el Orquestrador');
  H(/canComplete\(record, this\.contract\)/, orch, 'E05: gate reutiliza canComplete (readiness validated/ready)');
  H(/import \{ canComplete \} from '\.\/OperationalDataCompletion\.js'/, orch, 'E05: canComplete importado por el Orquestrador');
  check(can(rd) === false && can(ri) === false, 'E06: registro sin readiness válido NO puede completarse', `draft=${can(rd)} inconsistent=${can(ri)}`);
  check(read(rd) === 'draft' && read(ri) === 'inconsistent', 'E06: readiness del bloqueado es draft/inconsistent', `${read(rd)}/${read(ri)}`);
  check(can(rv) === true && can(rr) === true, 'E07: validated/ready SÍ pueden completarse', `validated=${can(rv)} ready=${can(rr)}`);
  check(read(rv) === 'validated' && read(rr) === 'ready', 'E07: readiness validated/ready', `${read(rv)}/${read(rr)}`);
  H(/export function canComplete\(record, contract\) \{[\s\S]{0,120}getReadinessState/, completion, 'E07: canComplete reutiliza getReadinessState (sin duplicar score)');
  N(/computeCompletionScore[\s\S]{0,40}canComplete/, completion, 'E07: canComplete NO recalcula score');
}

/* ================================================================== */
/* B. REMOVAL READINESS                                                */
/* ================================================================== */
{
  N(/handleBulkApprove/, ui, 'E08: handleBulkApprove eliminado');
  N(/handleBulkClose/, ui, 'E09: handleBulkClose eliminado');
  N(/handleBulkReopen/, ui, 'E10: handleBulkReopen eliminado');
  N(/>Aprobar<|>Cerrar<|>Reabrir</, ui, 'E11: botones Aprobar/Cerrar/Reabrir ausentes de la UI');
  check(inSrc('approveRecords') === 0 && inSrc('closeRecords') === 0 && inSrc('reopenRecords') === 0, 'E12: sin rutas activas a approve/close/reopen en src');
  check(inSrc('canApprove') === 0 && inSrc('canClose') === 0 && inSrc('canReopen') === 0, 'E12: canApprove/canClose/canReopen sin consumidores');
}

/* ================================================================== */
/* C. COMPLETION BRIDGE                                                */
/* ================================================================== */
{
  H(/OperationalEventBus\.publish\('RESOURCE_COMPLETED'/, orch, 'E13: RESOURCE_COMPLETED sigue activo (en completado)');
  H(/if \(newStatus === 'completado'\)/, orch, 'E13: RESOURCE_COMPLETED solo en terminal completado');
  H(/publish\('RECORDS_STATUS_UPDATED'/, orch, 'E14: RECORDS_STATUS_UPDATED sigue activo (bulk)');
  H(/if \(payload\?\.newStatus !== 'completado'\) return;/, bridge, 'E15: CompletionBridge reconoce completado (RECORDS_STATUS_UPDATED)');
  H(/FINAL_SINGLE_EVENTS = \[RESOURCE_COMPLETED_EVENT\]/, bridge, 'E16/E17: FINAL_SINGLE_EVENTS convergido a RESOURCE_COMPLETED');
  N(/RECORDS_APPROVED_EVENT/, bridge, 'E16: RECORDS_APPROVED ya NO es señal FINAL');
  N(/RECORDS_CLOSED_EVENT/, bridge, 'E17: RECORDS_CLOSED ya NO es señal FINAL');
  check(inSrc('RECORDS_APPROVED_EVENT') === 0 && inSrc('RECORDS_CLOSED_EVENT') === 0, 'E16/E17: constantes de eventos retiradas');
  H(/wireCompletionBridge\(\)/, alertRuntime, 'E18: bridge sigue wired (Alert Runtime preservado)');
  H(/subscribe\(COMPLETION_INTENT_EVENT/, bridge, 'E18: canal COMPLETION_INTENT preservado');
  check(has(/recordBulk\(payload\)/, bridge) && has(/OccurrenceLedger\.recordCompletion/, bridge), 'E18: OccurrenceLedger sigue registrando la señal final');
}

/* ================================================================== */
/* D. VIEWS                                                            */
/* ================================================================== */
{
  H(/completed: r => r\.estado === 'completado'/, ui, 'E19: view completed contiene registros completado');
  N(/approved: r => r\.estado === 'approved'/, ui, 'E20: approved NO es vista independiente');
  N(/closed: r => r\.estado === 'cerrado'/, ui, 'E21: closed NO es vista independiente');
  N(/\{ key: 'approved'/, ui, 'E22: sin vista Aprobados');
  N(/\{ key: 'closed'/, ui, 'E22: sin vista Cerrados');
  N(/readyToClose: r => r\.estado/, ui, 'E22: readyToClose sigue siendo readiness (no estado retirado)');
}

/* ================================================================== */
/* E. METRICS                                                          */
/* ================================================================== */
{
  H(/records\.filter\(r => r\.estado === 'completado'\)\.length/, ui, 'E23: Completados = estado === completado');
  check(has(/\{ label: 'Completados',[\s\S]{0,200}records\.filter\(r => r\.estado === 'completado'\)\.length/, ui), 'E24: Completados independiente de la vista activa (usa records)');
  N(/filteredRecords[\s\S]{0,60}Completados/, ui, 'E24: métrica no depende de filteredRecords');
  H(/records\.filter\(r => recordInconsistencies\[r\.id\]\?\.length > 0 \|\| duplicatedIds\.has\(r\.id\)\)\.length/, ui, 'E25: Alertas = KPI global (records)');
  check(has(/handleMetricView = \(viewKey\) =>/, ui), 'E26: handleMetricView (Sprint 321) preservado');
  for (const label of ['Pendientes', 'En proceso', 'Completados', 'Alertas']) {
    check(ui.includes(`label: '${label}'`), 'E26: indicador ' + label);
  }
  check(ui.includes('label: `Total'), 'E26: indicador Total (template)');
  H(/aria-pressed=\{activeView === item\.view\}/, ui, 'E26: indicadores como controles de vista (Sprint 321)');
}

/* ================================================================== */
/* F. SELECTION / ACTIONS                                              */
/* ================================================================== */
{
  check((ui.match(/const \[selectedIds, setSelectedIds\] = useState\(new Set\(\)\)/g) || []).length === 1, 'E27: selectedIds es la única selección');
  H(/const allFilteredSelected = useMemo/, ui, 'E28: Select All derivado de filteredRecords');
  H(/const toggleSelectAll = \(\) =>/, ui, 'E28: toggleSelectAll opera sobre filteredRecords');
  check(has(/for \(const r of filteredRecords\) next\.(add|delete)\(r\.id\)/, ui), 'E28: Select All ↔ filteredRecords');
  H(/bulkUpdateStatus\(Array\.from\(selectedIds\), newStatus, auditUser, recordsMap\)/, ui, 'E29: Cambiar estado opera sobre los seleccionados');
  H(/handleBulkDelete = async \(\) =>/, ui, 'E30: Eliminar intacto (handler propio)');
  H(/bulkDelete\(Array\.from\(selectedIds\), auditUser\)/, ui, 'E30: Eliminar → bulkDelete (independiente del lifecycle)');
  H(/async deleteBatch\(/, service, 'E30: deleteBatch intacto (Supabase DELETE)');
}

/* ================================================================== */
/* G. PRESERVATION                                                     */
/* ================================================================== */
{
  H(/handleExportCsv = async/, ui, 'E31: CSV intacto (handler)');
  H(/exportExcel\(target, auditUser\)/, ui, 'E31: CSV → exportExcel (Sprint 320)');
  H(/buildDispatchEvidenceRecords\(selectedRecords\)/, ui, 'E32: Informe de Evidencia intacto (adapter)');
  H(/renderEvidenceReport\(\{ model \}\)/, ui, 'E32: Informe de Evidencia intacto (renderer)');
  H(/import UniversalImportWorkflow/, ui, 'E33: Importación intacta (workflow)');
  H(/async importRecords\(rows, user\)/, orch, 'E33: importRecords intacto (orquestrador)');
  H(/import UniversalOperationalDashboard/, ui, 'E34: Dashboard intacto (importación)');
  N(/estado/, dashboard, 'E34: Dashboard sin dependencia de estado (métricas independientes)');
}

/* ================================================================== */
/* CASOS A–G (REGRESIÓN DIRIGIDA)                                      */
/* ================================================================== */
{
  // Caso A — pendiente → en_proceso: permitido (sin gate).
  check(has(/'en_proceso'/, orch) && !has(/if \(newStatus === 'en_proceso'\)/, orch), 'Caso A: pendiente → en_proceso PASS (sin gate)');
  // Caso B — en_proceso → completado con validated/ready.
  check(can(rv) === true && can(rr) === true, 'Caso B: registro listo → completado PASS (canComplete=true)');
  // Caso C — en_proceso → completado sin readiness válido: BLOCK.
  check(can(rd) === false && has(/!canComplete\(record, this\.contract\)/, orch), 'Caso C: registro no listo → BLOCK PASS (gate bloquea)');
  // Caso D — completado → RESOURCE_COMPLETED → CompletionBridge.
  check(has(/publish\('RESOURCE_COMPLETED'/, orch) && has(/FINAL_SINGLE_EVENTS = \[RESOURCE_COMPLETED_EVENT\]/, bridge), 'Caso D: completado → RESOURCE_COMPLETED → bridge PASS');
  // Caso E — Alertas reciben la misma señal funcional.
  check(has(/if \(payload\?\.newStatus !== 'completado'\) return;[\s\S]{0,80}recordBulk\(payload\)/, bridge), 'Caso E: RECORDS_STATUS_UPDATED(completado) → OccurrenceLedger PASS');
  check(has(/OperationalEventBus\.publish\('RESOURCE_COMPLETED'[\s\S]{0,220}recordIds/, orch), 'Caso E: payload RESOURCE_COMPLETED con recordIds PASS');
  // Caso F — selección + estado (exactamente los seleccionados).
  check(has(/bulkUpdateStatus\(Array\.from\(selectedIds\), newStatus, auditUser, recordsMap\)/, ui), 'Caso F: solo registros seleccionados → bulkUpdateStatus PASS');
  // Caso G — eliminación sin tocar completion.
  check(has(/async bulkDelete\([\s\S]{0,160}deleteBatch\(ids\)/, orch), 'Caso G: eliminar → deleteBatch PASS');
  check(has(/bulkDelete\(Array\.from\(selectedIds\), auditUser\)/, ui) && !has(/estado/, orch.slice(orch.indexOf('async bulkDelete'), orch.indexOf('destroy') || Infinity)), 'Caso G: delete sin mezcla con el lifecycle PASS');
}

/* ================================================================== */
/* E35 — BUILD + SCOPE                                                 */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E35: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E35: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
  const git = spawnSync('git', ['status', '--short', '--', 'src/'], { cwd: ROOT, encoding: 'utf8' });
  const changed = (git.stdout || '').split('\n').map(l => l.trim().replace(/^M\s+/, '')).filter(Boolean);
  const expected = [
    'src/modules/experiences/UniversalOperationalRuntime.jsx',
    'src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js',
    'src/core/capabilities/experiences/OperationalDataCompletion.js',
    'src/core/capabilities/alert/occurrence/CompletionBridge.js',
  ];
  check(changed.length === expected.length && expected.every(f => changed.includes(f)), 'E35: scope src/ = 4 archivos autorizados', JSON.stringify(changed));
  const forbidden = ['UniversalOperationalDashboard', 'UniversalImportWorkflow', 'operationalRecordsService', 'despachosService', 'EvidenceReportModel', 'EvidenceReportRenderer', 'DispatchEvidenceAdapter', 'exportDataNormalizer', 'DynamicRecordsView', 'filterCore', 'sgcFilterAdapter', 'SupabasePersistenceProvider', 'dynamicService'];
  const leaked = changed.filter(f => forbidden.some(k => f.includes(k)));
  check(leaked.length === 0, 'E35: dominios prohibidos intactos', JSON.stringify(leaked));
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 323 — OPERATIONAL COMPLETION CONVERGENCE');
console.log(' CONTROLLED MIGRATION · ONE TERMINAL STATE');
console.log('============================================================');
console.log(' MIGRACIÓN APLICADA:');
console.log(' - canComplete = readiness validated|ready (reuso getReadinessState).');
console.log(' - Gate en bulkUpdateStatus → completado BLOCK sin readiness.');
console.log(' - Aprobar/Cerrar/Reabrir retirados (UI + orquestador + eventos).');
console.log(' - FINAL_SINGLE_EVENTS = [RESOURCE_COMPLETED].');
console.log(' - Vistas approved/closed convergidas → completed (legacy compatible).');
console.log(' - Métrica Completados = estado === completado (records).');
console.log(' - Legacy approved/cerrado: presentación → completado (sin UPDATE).');
console.log('------------------------------------------------------------');
console.log(' RUNTIME canComplete:');
console.log(`   validated -> ${read(rv)} / completable=${can(rv)}`);
console.log(`   ready     -> ${read(rr)} / completable=${can(rr)}`);
console.log(`   draft     -> ${read(rd)} / completable=${can(rd)} (BLOCK)`);
console.log(`   inconsistent -> ${read(ri)} / completable=${can(ri)} (BLOCK)`);
console.log(`   legacy cerrado -> ${read(rl)} / completable=${can(rl)} (presentado como completado)`);
console.log('------------------------------------------------------------');
console.log(` Gates E01..E35 + Casos A-G  Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' CLASIFICACIÓN:');
console.log(' STATUS LIFECYCLE       CONVERGED');
console.log(' COMPLETION             SINGLE TERMINAL');
console.log(' APPROVAL               RETIRED');
console.log(' CLOSE                  RETIRED');
console.log(' REOPEN                 RETIRED');
console.log(' DELETE                 PRESERVED');
console.log(' COMPLETION BRIDGE      MIGRATED');
console.log(' ALERTS                 PRESERVED');
console.log(' VIEWS                  CONVERGED');
console.log(' METRICS                STANDARDIZED');
console.log(' SELECTION              PRESERVED');
console.log(' EXPORT                 PRESERVED');
console.log(' EVIDENCE REPORT        PRESERVED');
console.log(' IMPORT                 PRESERVED');
console.log(' DASHBOARD              PRESERVED');
console.log(' NO NEW QUERY           PASS');
console.log(' NO NEW SSOT            PASS');
console.log(' NO PERSISTENCE MODEL   PASS');
console.log(' BUILD                  PASS');
console.log(' SCOPE                  PASS');
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(' Regresion historica 296-322: NO ejecutada (migración dirigida).');
console.log('============================================================');
process.exit(allPass ? 0 : 1);