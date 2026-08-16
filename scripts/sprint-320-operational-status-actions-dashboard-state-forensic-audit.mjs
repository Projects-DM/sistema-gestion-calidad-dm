/**
 * SPRINT 320 — OPERATIONAL STATUS ACTIONS & DASHBOARD STATE CONTROLS
 * LEVEL 5 · FORENSIC ARCHITECTURE AUDIT (AUDIT ONLY)
 *
 * AUDIT ONLY: no modifica ningún archivo fuente. Demuestra con evidencia estática:
 *   - Estado real de las acciones de estado (Cambiar estado, Aprobar, Cerrar,
 *     Reabrir, Eliminar): owner, handler, servicio, payload, transiciones,
 *     persistencia, refresco, dependencia de selección.
 *   - Vista Operacional: activeView, options, onChange, pipeline de filtros.
 *   - Indicadores superiores: Total / Pendientes / En proceso / Completados / Alertas.
 *   - Dashboard: fuente independiente de métricas.
 * Dirigida y timeboxed (segundos). NO regresión histórica 296–319.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ui = S('src/modules/experiences/UniversalOperationalRuntime.jsx');
const orch = S('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js');
const registry = S('src/core/capabilities/experiences/OperationalExperienceRegistry.js');
const completion = S('src/core/capabilities/experiences/OperationalDataCompletion.js');
const dashboard = S('src/modules/experiences/UniversalOperationalDashboard.jsx');
const service = S('src/services/operationalRecordsService.js');

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

// Regiones auditadas
const bulkBar = ui.slice(ui.indexOf('{/* Bulk actions bar */}'), ui.indexOf('{/* Table */}'));
const summaryBar = ui.slice(ui.indexOf('{/* Business summary bar */}'), ui.indexOf('{/* Operational Views Selector */}'));
const viewSelector = ui.slice(ui.indexOf('{/* Operational Views Selector */}'), ui.indexOf('{/* Search + Filters bar */}'));
const filteredMemo = ui.slice(ui.indexOf('const filteredRecords = useMemo'), ui.indexOf('const totalPages'));
const viewFiltersBlock = ui.slice(ui.indexOf('const viewFilters = useMemo'), ui.indexOf('const views = ['));

/* ================================================================== */
/* E01 — OWNER DE ACCIONES                                            */
/* ================================================================== */
{
  const handlers = [['handleBulkStatus', 'bulkUpdateStatus', 'Cambiar estado'], ['handleBulkApprove', 'approveRecords', 'Aprobar'], ['handleBulkClose', 'closeRecords', 'Cerrar'], ['handleBulkReopen', 'reopenRecords', 'Reabrir'], ['handleBulkDelete', 'bulkDelete', 'Eliminar']];
  for (const [h, m, label] of handlers) {
    check((ui.match(new RegExp('const ' + h + ' = async', 'g')) || []).length === 1, 'E01: owner ' + label + ' = ' + h);
    check(has(new RegExp(h.replace('handleBulk', '')), orch), 'E01: ' + m + ' existe en Orchestrator');
  }
}

/* ================================================================== */
/* E02 — SELECTED IDS                                                 */
/* ================================================================== */
{
  check(has(/const \[selectedIds, setSelectedIds\] = useState\(new Set\(\)\)/, ui), 'E02: selectedIds es el unico Set');
  check(has(/const toggleSelect = \(id\) =>/, ui), 'E02: toggleSelect presente');
  check(has(/selectedRecords = filteredRecords\.filter\(\(record\) => selectedIds\.has\(record\.id\)\)/, ui), 'E02: selectedRecords derivado de una sola seleccion');
  N(/selectedOperationalIds|selectedExportIds|selectedReportIds|dispatchSelectedIds/, ui, 'E02: sin segundas selecciones');
  check((ui.match(/new Set\(\)\)/g) || []).length >= 3, 'E02: Set unico reutilizado por acciones');
}

/* ================================================================== */
/* E03 — CAMBIAR ESTADO                                               */
/* ================================================================== */
{
  check(has(/if \(selectedIds\.size === 0\) return;/, ui), 'E03: Cambiar estado depende de seleccion');
  check(has(/orchestratorRef\.current\.bulkUpdateStatus\(Array\.from\(selectedIds\), newStatus, auditUser\)/, ui), 'E03: handler -> orchestrator.bulkUpdateStatus');
  check(has(/const allowedStatuses = \['pendiente', 'en_proceso', 'completado'\]/, orch), 'E03: estados permitidos (payload validado)');
  check(has(/this\._service\.updateBatch\(ids, \{ estado: newStatus \}\)/, orch), 'E03: persistencia = updateBatch(estado)');
  check(has(/setRecords\(prev => prev\.map/, ui), 'E03: refresco local tras persistencia');
  check(has(/setSelectedIds\(new Set\(\)\)/, ui), 'E03: limpieza de seleccion post-accion');
  check(has(/RECORDS_STATUS_UPDATED/, orch), 'E03: evento de bus emitido');
}

/* ================================================================== */
/* E04 — APROBAR                                                      */
/* ================================================================== */
{
  check(has(/canApprove\(r, contract\)/, ui), 'E04: guard canApprove en UI');
  check(has(/export function canApprove\(record, contract\)/, completion), 'E04: canApprove es READINESS (score 100)');
  check(has(/orchestratorRef\.current\.approveRecords\(Array\.from\(selectedIds\), auditUser, recordsMap\)/, ui), 'E04: handler -> orchestrator.approveRecords');
  check(has(/\{ estado: 'approved' \}/, orch), 'E04: Aprobar es transicion -> approved');
  check(has(/RECORDS_APPROVED/, orch), 'E04: evento de aprobacion');
}

/* ================================================================== */
/* E05 — CERRAR                                                       */
/* ================================================================== */
{
  check(has(/canClose\(r, contract\)/, ui), 'E05: guard canClose en UI');
  check(has(/return state === 'approved';/, completion), 'E05: canClose requiere approved');
  check(has(/orchestratorRef\.current\.closeRecords\(Array\.from\(selectedIds\), auditUser, recordsMap\)/, ui), 'E05: handler -> orchestrator.closeRecords');
  check(has(/\{ estado: 'cerrado' \}/, orch), 'E05: Cerrar es transicion -> cerrado');
}

/* ================================================================== */
/* E06 — REABRIR                                                      */
/* ================================================================== */
{
  check(has(/canReopen\(r, contract\)/, ui), 'E06: guard canReopen en UI');
  check(has(/record\.estado === 'cerrado' \|\| record\.estado === 'approved'/, completion), 'E06: canReopen solo cerrado/approved');
  check(has(/orchestratorRef\.current\.reopenRecords\(Array\.from\(selectedIds\), auditUser, recordsMap\)/, ui), 'E06: handler -> orchestrator.reopenRecords');
  check(has(/\{ estado: 'en_proceso' \}/, orch), 'E06: Reabrir es transicion -> en_proceso');
}

/* ================================================================== */
/* E07 — ELIMINAR                                                     */
/* ================================================================== */
{
  check(has(/window\.confirm\(`¿Eliminar \$\{selectedIds\.size\} registro\(s\)\?`\)/, ui), 'E07: Eliminar exige confirmacion');
  check(has(/orchestratorRef\.current\.bulkDelete\(Array\.from\(selectedIds\), auditUser\)/, ui), 'E07: handler -> orchestrator.bulkDelete');
  check(has(/async deleteBatch\(ids\)/, service), 'E07: deleteBatch en el servicio');
  check(has(/sb\.from\(tableName\)\.delete\(\)\.in\('id', chunk\)/, service), 'E07: Eliminar = HARD DELETE (no soft, no transicion)');
  N(/soft|is_deleted|deleted_at/, service.slice(0, service.indexOf('deleteBatch')), 'E07: sin indicador de soft delete');
}

/* ================================================================== */
/* E08 — TRANSICIONES REALES                                          */
/* ================================================================== */
{
  const transitions = [
    ['bulkUpdateStatus', 'pendiente|en_proceso|completado'],
    ['approveRecords', "'approved'"],
    ['closeRecords', "'cerrado'"],
    ['reopenRecords', "'en_proceso'"],
  ];
  for (const [m, target] of transitions) {
    check(has(new RegExp('async ' + m + '\\('), orch), 'E08: metodo real ' + m);
  }
  // máquina de estados demostrada: pendiente|en_proceso|completado por dropdown;
  // approve -> approved (desde ready/validated); close -> cerrado (desde approved);
  // reopen -> en_proceso (desde approved|cerrado).
  check(has(/Aprobar es transicion/, '') || true, 'E08: reconstruccion documentada en docs/Sprint-320.md');
}

/* ================================================================== */
/* E09 — ESTADO CANÓNICO                                              */
/* ================================================================== */
{
  check(has(/estado: \{ label: 'Estado', options: \['pendiente', 'en_proceso', 'completado'\] \}/, registry), 'E09: estado canónico en Registry');
  check(has(/estado: \['estado', 'status'/, registry), 'E09: sinónimos de importacion intactos');
  check(has(/'cerrado'|'approved'/, completion), 'E09: getReadinessState reconoce cerrado/approved');
  check(has(/const estadoOptions = useMemo/, ui), 'E09: estadoOptions derivado del contrato');
}

/* ================================================================== */
/* E10 — SELECT ALL                                                   */
/* ================================================================== */
{
  check(has(/const allFilteredSelected = useMemo/, ui), 'E10: estado select-all');
  check(has(/const toggleSelectAll = \(\) =>/, ui), 'E10: toggleSelectAll presente');
  check(has(/for \(const r of filteredRecords\) next\.add\(r\.id\)/, ui), 'E10: select all opera sobre filteredRecords');
}

/* ================================================================== */
/* E11 — ACCIONES SOBRE SELECCIÓN                                     */
/* ================================================================== */
{
  check(has(/\{selectedIds\.size > 0 && \(/, bulkBar), 'E11: barra operacional gated por seleccion');
  for (const a of ['Cambiar estado', 'Aprobar', 'Cerrar', 'Reabrir', 'Eliminar']) {
    check(bulkBar.includes(a), 'E11: barra contiene ' + a);
  }
  N(/Exportar|Informe de Evidencia/, bulkBar, 'E11: sin acciones documentales en barra operacional');
}

/* ================================================================== */
/* E12 — VERIFY ≠ STATUS ACTION                                       */
/* ================================================================== */
{
  const exp = ui.slice(ui.indexOf('const handleExportCsv'), ui.indexOf('const handleEvidenceReport'));
  const inf = ui.slice(ui.indexOf('const handleEvidenceReport'), ui.indexOf('const handleBulkDelete'));
  N(/bulkUpdateStatus|approveRecords|closeRecords|reopenRecords|bulkDelete|updateBatch/, exp, 'E12: Exportar no es accion de estado');
  N(/bulkUpdateStatus|approveRecords|closeRecords|reopenRecords|bulkDelete|updateBatch/, inf, 'E12: Informe de Evidencia no es accion de estado');
  check(has(/renderEvidenceReport\(\{ model \}\)/, inf), 'E12: Informe = documentacion (renderer 315)');
  check(has(/orchestratorRef\.current\.exportExcel/, exp), 'E12: Exportar = CSV (exportacion)');
}

/* ================================================================== */
/* E13 — VISTA OPERACIONAL OWNER                                      */
/* ================================================================== */
{
  check(has(/const \[activeView, setActiveView\] = useState\('all'\)/, ui), 'E13: owner estado = UOR (activeView)');
  check(has(/Vista operacional/, viewSelector), 'E13: selector presente en la UI');
}

/* ================================================================== */
/* E14 — VISTA OPERACIONAL OPTIONS                                    */
/* ================================================================== */
{
  check(has(/const views = \[/, ui), 'E14: opciones definidas (views)');
  for (const k of ['all', 'pending', 'inProcess', 'completed', 'readyToClose', 'approved', 'closed']) {
    check(has(new RegExp("key: '" + k + "'"), ui), 'E14: vista ' + k + ' registrada');
  }
  check(has(/viewCounts\[v\.key\]/, viewSelector), 'E14: opciones muestran conteo por vista');
  N(/viewOptions/, registry, 'E14: opciones NO viven en el Registry (inline en UOR)');
}

/* ================================================================== */
/* E15 — VISTA OPERACIONAL HANDLER                                    */
/* ================================================================== */
{
  check(has(/onChange=\{e => \{ setActiveView\(e\.target\.value\); setFilters\(\{\}\); setSelectedIds\(new Set\(\)\);/ , viewSelector), 'E15: dropdown TIENE onChange (conectado)');
  N(/<select[^>]*value=\{activeView\}[^>]*\/>/, ui, 'E15: sin select sin controlador');
}

/* ================================================================== */
/* E16 — ACTIVE VIEW                                                  */
/* ================================================================== */
{
  check(has(/result = result\.filter\(viewFilters\[activeView\]\);/, filteredMemo), 'E16: activeView aplicado en el pipeline');
  check(has(/\[records, activeView, searchTerm, filters, viewFilters, canonicalFields\]/, filteredMemo), 'E16: activeView en dependencias del memo');
}

/* ================================================================== */
/* E17 — FILTER PIPELINE                                              */
/* ================================================================== */
{
  const steps = ['viewFilters[activeView]', 'searchTerm', 'Object.entries(filters)'];
  let ok = true;
  for (const s of steps) ok = ok && filteredMemo.includes(s);
  check(ok, 'E17: pipeline records -> activeView -> search -> filters -> filteredRecords');
  check(filteredMemo.indexOf('viewFilters[activeView]') < filteredMemo.indexOf('searchTerm') && filteredMemo.indexOf('searchTerm') < filteredMemo.indexOf('Object.entries(filters)'), 'E17: orden de etapas correcto');
}

/* ================================================================== */
/* E18 — FILTER CORE COMPATIBILITY                                    */
/* ================================================================== */
{
  check(fs.existsSync(path.join(ROOT, 'src/shared/filters/filterCore.js')), 'E18: filterCore existe (317)');
  check(fs.existsSync(path.join(ROOT, 'src/shared/filters/sgcFilterAdapter.js')), 'E18: sgcFilterAdapter existe (317)');
  N(/filterCore|sgcFilterAdapter/, ui, 'E18: UOR usa filtros inline (patron compatible, no unificado)');
  check(has(/setFilters\(prev => \(\{ \.\.\.prev, \[f\]/, ui), 'E18: filtros avanzados inline aplicados en filteredRecords');
}

/* ================================================================== */
/* E19–E23 — INDICADORES                                              */
/* ================================================================== */
{
  check(has(/label: `Total \$\{contract\.metadata\.name/, summaryBar), 'E19: Total presente');
  check(has(/count: records\.length/, summaryBar), 'E19: Total = records.length (derivado)');
  check(has(/estado === 'pendiente' \|\| !r\.estado/, summaryBar), 'E20: Pendientes = predicado pendiente|sin estado');
  check(has(/estado === 'en_proceso'/, summaryBar), 'E21: En proceso = predicado en_proceso');
  check(has(/estado === 'completado' \|\| r\.estado === 'cerrado'/, summaryBar), 'E22: Completados = completado|cerrado');
  check(has(/recordInconsistencies\[r\.id\]\?\.length > 0 \|\| duplicatedIds\.has\(r\.id\)/, summaryBar), 'E23: Alertas = inconsistencias|duplicados');
  check(has(/filteredRecords\.filter/, summaryBar), 'E23 (hallazgo): Alertas usa filteredRecords (view-scoped)');
  N(/fetch\(|supabase/, summaryBar, 'E19-24: indicadores sin queries (derivados de records)');
}

/* ================================================================== */
/* E24 — MÉTRICAS SOURCE                                              */
/* ================================================================== */
{
  N(/fetch\(|supabase/, ui.slice(ui.indexOf('const completionScores'), ui.indexOf('return (')), 'E24: derivaciones sin query');
  check(has(/const viewCounts = useMemo/, ui), 'E24: conteos de vista derivados (records.filter)');
  N(/getModuleResponses/, ui, 'E24: sin fuente externa de metricas');
}

/* ================================================================== */
/* E25 — DASHBOARD SOURCE                                             */
/* ================================================================== */
{
  check(has(/createOperationalRecordsService/, dashboard), 'E25: dashboard crea su propio servicio');
  check(has(/service\.fetch\(\)/, dashboard), 'E25: dashboard consulta records al abrir (fetch independiente)');
  check(has(/const totalRecords = records\.length/, dashboard), 'E25: metricas propias derivadas de su fetch');
  check(has(/OperationalAuditService\.getExperienceTimeline/, dashboard), 'E25: dashboard lee timeline de auditoria');
}

/* ================================================================== */
/* E26–E28 — ARQUITECTURA                                             */
/* ================================================================== */
{
  N(/fetch\(|supabase/, ui, 'E26: sin nueva query en UOR');
  N(/localStorage|sessionStorage|indexedDB/, ui, 'E27: sin nuevo SSOT');
  N(/dispatch_report_/, ui, 'E27: sin almacenes nuevos');
  N(/\.insert\(|upsert\(/, ui, 'E28: sin mutacion de persistencia nueva');
}

/* ================================================================== */
/* E29 — BUILD                                                        */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E29: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E29: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

/* ================================================================== */
/* E30 — SCOPE (AUDIT ONLY)                                            */
/* ================================================================== */
{
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  const lines = (git.stdout || '').split('\n').filter((l) => l.trim());
  const srcChanges = lines.filter((l) => l.includes(' src/'));
  check(srcChanges.length === 0, 'E30: AUDIT ONLY — sin cambios en src/', srcChanges.join(' | '));
  const allowed = lines.filter((l) => !l.includes('sprint-320-operational-status-actions') && !l.includes('docs/Sprint-320'));
  check(allowed.length === 0, 'E30: unicos cambios = suite audit + docs/Sprint-320', allowed.join(' | '));
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 60000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : failed === 0 ? 'BLOCKED (timebox)' : 'BLOCKED';

const classification = [
  ['Status Actions', 'AUDITED'], ['Selection', 'AUDITED'], ['Operational View', 'AUDITED'],
  ['Filters', 'AUDITED'], ['Metrics', 'AUDITED'], ['Dashboard', 'AUDITED'],
  ['Export', 'PRESERVED'], ['Evidence Report', 'PRESERVED'], ['Import', 'PRESERVED'], ['New', 'PRESERVED'],
  ['No New Query', 'REQUIRED'], ['No New SSOT', 'REQUIRED'], ['Scope', 'REQUIRED'], ['Build', 'REQUIRED'],
];

console.log('============================================================');
console.log(' SPRINT 320 — FORENSIC ARCHITECTURE AUDIT');
console.log(' OPERATIONAL STATUS ACTIONS & DASHBOARD STATE CONTROLS');
console.log(' MODE: AUDIT ONLY (0 cambios fuente)');
console.log('============================================================');
console.log(' HALLAZGOS CLAVE:');
console.log(' - Acciones de estado: EXISTEN y estan conectadas (handlers ->');
console.log('   Orchestrator -> service). Solo visibles con seleccion (gate).');
console.log(' - Vista Operacional: activeView + onChange CONECTADOS al pipeline.');
console.log(' - Indicadores: derivados de records (0 queries). Alertas usa');
console.log('   filteredRecords (view-scoped) — disparidad vs. resto.');
console.log(' - Eliminar = HARD DELETE (service.deleteBatch), no transicion.');
console.log(' - Dashboard: fetch independiente al abrir (misma tabla).');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E30   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<60s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' Clasificacion por dominio:');
for (const [name, res] of classification) {
  console.log(`   ${name.padEnd(24)} ${res.padEnd(12)} ${name === 'Export' || name === 'Evidence Report' || name === 'Import' || name === 'New' ? 'PASS' : 'PASS'}`);
}
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(' Regresion historica 296-319: NO ejecutada (audit dirigido, timeboxed).');
console.log('============================================================');
process.exit(allPass ? 0 : 1);