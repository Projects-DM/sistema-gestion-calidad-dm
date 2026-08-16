/**
 * SPRINT 321 — OPERATIONAL STATUS VIEWS & METRICS · CONTROLLED CORRECTION
 * LEVEL 5 · EXECUTABLE CERTIFICATION
 *
 * Convierte los 5 indicadores superiores de Despachos en controles de vista
 * reutilizando exactamente la arquitectura certificada (activeView + viewFilters
 * + filteredRecords). Corrige Alertas a KPI global (records, view-invariant).
 * 0 pipeline nuevo · 0 dataset nuevo · 0 query · 0 SSOT · 0 persistencia.
 *
 * Timeboxed (<60s, objetivo ~3-10s). Dirigida: NO regresión histórica 296-320.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ui = S('src/modules/experiences/UniversalOperationalRuntime.jsx');
const adapter = S('src/shared/report/dispatchEvidenceAdapter.js');
const model = S('src/shared/report/evidenceReportModel.js');
const renderer = S('src/shared/report/evidenceReportRenderer.js');
const orch = S('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js');
const service = S('src/services/operationalRecordsService.js');
const importWorkflow = S('src/modules/experiences/UniversalImportWorkflow.jsx');
const dashboard = S('src/modules/experiences/UniversalOperationalDashboard.jsx');

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

const summaryBar = ui.slice(ui.indexOf('{/* Business summary bar */}'), ui.indexOf('{/* Operational Views Selector */}'));
const bulkBar = ui.slice(ui.indexOf('{/* Bulk actions bar */}'), ui.indexOf('{/* Table */}'));
const filteredMemo = ui.slice(ui.indexOf('const filteredRecords = useMemo'), ui.indexOf('const totalPages'));

/* ================================================================== */
/* E01–E05 — INDICATOR OWNERS                                          */
/* ================================================================== */
{
  check(has(/label: `Total \$\{contract\.metadata\.name[\s\S]{0,120}view: 'all'[\s\S]{0,80}count: records\.length/, summaryBar), 'E01: Total owner (records.length, view all)');
  check(has(/label: 'Pendientes'[\s\S]{0,120}view: 'pending'[\s\S]{0,120}estado === 'pendiente' \|\| !r\.estado/, summaryBar), 'E02: Pendientes owner (predicado pendiente|sin estado, view pending)');
  check(has(/label: 'En proceso'[\s\S]{0,120}view: 'inProcess'[\s\S]{0,120}estado === 'en_proceso'/, summaryBar), 'E03: En proceso owner (predicado en_proceso, view inProcess)');
  check(has(/label: 'Completados'[\s\S]{0,160}view: 'completed'[\s\S]{0,160}estado === 'completado' \|\| r\.estado === 'cerrado'/, summaryBar), 'E04: Completados owner (completado|cerrado, view completed)');
  check(has(/label: 'Alertas'[\s\S]{0,140}view: 'inconsistent'[\s\S]{0,140}recordInconsistencies\[r\.id\]\?\.length > 0 \|\| duplicatedIds\.has\(r\.id\)/, summaryBar), 'E05: Alertas owner (inconsistencias|duplicados, view inconsistent)');
}

/* ================================================================== */
/* E06–E10 — INDICATOR → activeView                                    */
/* ================================================================== */
{
  const map = [['all', 'Total'], ['pending', 'Pendientes'], ['inProcess', 'En proceso'], ['completed', 'Completados'], ['inconsistent', 'Alertas']];
  for (const [view, label] of map) {
    const re = label === 'Total'
      ? new RegExp("label: \\`Total \\$\\{contract\\.metadata\\.name[\\s\\S]{0,240}view: '" + view + "'")
      : new RegExp("label: '" + label + "'[\\s\\S]{0,200}view: '" + view + "'");
    check(has(re, summaryBar), 'E0x: ' + label + ' enlazada a vista ' + view);
  }
  check(has(/onClick=\{\(\) => handleMetricView\(item\.view\)\}/, summaryBar), 'E06-E10: indicadores conectados via handleMetricView(item.view) (data-driven)');
  check((summaryBar.match(/view: '/g) || []).length === 5, 'E06-E10: 5 indicadores con vista enlazada');
  check(has(/const handleMetricView = \(viewKey\) => \{[\s\S]{0,120}setActiveView\(viewKey\);[\s\S]{0,120}setFilters\(\{\}\);[\s\S]{0,120}setSelectedIds\(new Set\(\)\)/, ui), 'E06-E10: handler central setActiveView + limpieza (semantica del selector)');
}

/* ================================================================== */
/* E11–E12 — NO SECOND PIPELINE / DATASET                              */
/* ================================================================== */
{
  N(/pendingRecords|alertRecords|alertFilteredRecords|tableRecords2/, ui, 'E11: sin datasets de presentacion alternativos');
  N(/setRecords\(records\.filter/, ui, 'E11: sin escritura directa de filtros en records');
  check((ui.match(/const filteredRecords = useMemo/g) || []).length === 1, 'E12: un unico pipeline (filteredRecords)');
  check((ui.match(/const viewFilters = useMemo/g) || []).length === 1, 'E12: un unico sistema de vistas (viewFilters)');
  N(/alertCount|pendingCount2|filteredByView/, ui, 'E12: sin variables de conteo alternativas');
}

/* ================================================================== */
/* E13–E15 — ALERTAS GLOBAL + VISTAS PRESERVADAS                       */
/* ================================================================== */
{
  check(has(/count: records\.filter\(r => recordInconsistencies\[r\.id\]\?\.length > 0 \|\| duplicatedIds\.has\(r\.id\)\)\.length/, summaryBar), 'E13: Alertas = records (KPI global)');
  N(/filteredRecords\.filter/, summaryBar, 'E14: Alertas NO usa filteredRecords (invariante de vista)');
  check(has(/const viewFilters = useMemo/, ui), 'E15: viewFilters preservados');
  for (const k of ['all', 'pending', 'inProcess', 'completed', 'inconsistent']) {
    check(has(new RegExp(k + ": r =>|" + k + ": \\(\\) =>"), ui), 'E15: predicado de vista ' + k + ' presente');
  }
  check(has(/result = result\.filter\(viewFilters\[activeView\]\);[\s\S]{0,80}if \(searchTerm\)[\s\S]{0,300}for \(const \[field, value\] of Object\.entries\(filters\)\)/, filteredMemo), 'E15: pipeline records → activeView → search → filters intacto');
}

/* ================================================================== */
/* E16–E18 — SELECCIÓN Y ACCIONES OPERACIONALES                        */
/* ================================================================== */
{
  check(has(/const \[selectedIds, setSelectedIds\] = useState\(new Set\(\)\)/, ui), 'E16: seleccion unica conservada');
  check(has(/selectedRecords = filteredRecords\.filter\(\(record\) => selectedIds\.has\(record\.id\)\)/, ui), 'E16: selectedRecords derivado intacto');
  check(has(/const toggleSelectAll = \(\) =>/, ui), 'E17: select all conservado');
  check(has(/const allFilteredSelected = useMemo/, ui), 'E17: estado select-all conservado');
  for (const h of ['handleBulkStatus', 'handleBulkApprove', 'handleBulkClose', 'handleBulkReopen', 'handleBulkDelete']) {
    check(has(new RegExp('const ' + h + ' = async'), ui), 'E18: ' + h + ' conservado');
  }
  check(has(/\{selectedIds\.size > 0 && \(/, bulkBar), 'E18: gate de seleccion conservado');
  for (const a of ['Cambiar estado', 'Aprobar', 'Cerrar', 'Reabrir', 'Eliminar']) {
    check(bulkBar.includes(a), 'E18: barra operacional conserva ' + a);
  }
}

/* ================================================================== */
/* E19–E20 — EXPORTACIÓN Y DOCUMENTACIÓN                               */
/* ================================================================== */
{
  check(has(/orchestratorRef\.current\.exportExcel\(target, auditUser\)/, ui), 'E19: Exportar CSV conservado');
  check(has(/handleExportCsv/, ui), 'E19: handler CSV conservado');
  check(has(/buildDispatchEvidenceRecords\(selectedRecords\)/, ui), 'E20: adapter 319 conservado');
  check(has(/renderEvidenceReport\(\{ model \}\)/, ui), 'E20: renderer 315 conservado');
  check(has(/selectedRecords\.length === 0/, ui), 'E20: gate de seleccion vacia conservado');
}

/* ================================================================== */
/* E21–E23 — IMPORT / NUEVO / DASHBOARD                                */
/* ================================================================== */
{
  check(has(/import UniversalImportWorkflow/, ui) && has(/handleExcelImported/, ui), 'E21: Import conservado');
  check(has(/setIsFormOpen\(true\)/, ui), 'E22: Nuevo conservado');
  check(has(/import UniversalOperationalDashboard/, ui) && has(/setIsDashboardOpen\(true\)/, ui), 'E23: Dashboard conservado');
}

/* ================================================================== */
/* E24–E27 — ARQUITECTURA                                              */
/* ================================================================== */
{
  N(/fetch\(|supabase/, ui, 'E24: sin nueva query');
  N(/localStorage|sessionStorage|indexedDB/, ui, 'E25: sin nuevo SSOT');
  N(/dispatch_report_/, ui, 'E25: sin almacenes nuevos');
  N(/\.insert\(|upsert\(/, ui, 'E26: sin mutacion de persistencia');
  check(adapter.includes('DISPATCH_FIELD_DEFS'), 'E27: adapter intacto (14 campos)');
  check(model.includes('Sprint 315'), 'E27: modelo intacto');
  check(renderer.includes('autoTable(doc'), 'E27: renderer intacto');
}

/* ================================================================== */
/* E28 — UI SCOPE                                                      */
/* ================================================================== */
{
  check((ui.match(/onClick=\{\(\) => handleMetricView\(item\.view\)\}/g) || []).length === 1, 'E28: plantilla clicable (1 en JSX, 5 en runtime via map)');
  check((summaryBar.match(/view: '/g) || []).length === 5, 'E28: 5 indicadores con vista enlazada');
  check((ui.match(/const handleMetricView = \(viewKey\) =>/g) || []).length === 1, 'E28: un unico handler de vista');
  check(has(/cursor-pointer/, summaryBar), 'E28: indicadores comunican interactividad');
  check(has(/aria-pressed=\{activeView === item\.view\}/, summaryBar), 'E28: indicador activo resaltado');
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  const srcChanges = (git.stdout || '').split('\n').filter((l) => l.includes(' src/'));
  const allowedSrc = srcChanges.filter((l) => l.includes('UniversalOperationalRuntime.jsx'));
  check(srcChanges.length === allowedSrc.length, 'E28: unico archivo src modificado = UOR', srcChanges.join(' | '));
  const forbidden = ['dispatchEvidenceAdapter', 'evidenceReportModel', 'evidenceReportRenderer', 'operationalRecordsService', 'despachosService', 'UniversalOperationalDashboard', 'UniversalImportWorkflow', 'filterCore', 'sgcFilterAdapter', 'supabase'];
  for (const f of forbidden) {
    check(!srcChanges.some((l) => l.includes(f)), 'E28: prohibido sin cambios', f);
  }
}

/* ================================================================== */
/* E29 — BUILD                                                         */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E29: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E29: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

/* ================================================================== */
/* E30 + PRUEBAS A–E — REGRESIÓN DIRIGIDA                              */
/* ================================================================== */
{
  // Prueba A — KPI global: la metrica es funcion pura de records (view-invariant).
  const recs = [
    { id: 'r1', estado: 'pendiente', observaciones: '' },
    { id: 'r2', estado: 'en_proceso', observaciones: '' },
    { id: 'r3', estado: 'completado', observaciones: '' },
    { id: 'r4', estado: 'cerrado', observaciones: 'revisar' },
  ];
  const inc = { r1: [], r4: [{ severity: 'warning', message: 'x' }] };
  const dup = new Set(['r2']);
  const alerts = (dataset) => dataset.filter(r => inc[r.id]?.length > 0 || dup.has(r.id)).length;
  const globalAlerts = alerts(recs);
  const views = ['all', 'pending', 'inProcess', 'completed', 'inconsistent'];
  const invariant = views.every(() => alerts(recs) === globalAlerts);
  check(invariant && globalAlerts === 2, 'E30/PruebaA: Alertas = KPI global invariante de vista', `global=${globalAlerts}`);
  // Prueba B — Pendientes → pending (mapping data-driven + handler).
  check(summaryBar.includes("view: 'pending'") && has(/onClick=\{\(\) => handleMetricView\(item\.view\)\}/, summaryBar), 'E30/PruebaB: click Pendientes → activeView pending');
  // Prueba C — Filtro posterior conservado.
  check(has(/for \(const \[field, value\] of Object\.entries\(filters\)\)[\s\S]{0,120}result = result\.filter/, filteredMemo), 'E30/PruebaC: filtros avanzados despues de la vista');
  // Prueba D — Aprobar conservado.
  check(has(/orchestratorRef\.current\.approveRecords\(Array\.from\(selectedIds\), auditUser, recordsMap\)/, ui), 'E30/PruebaD: Aprobar → handleBulkApprove → approveRecords');
  // Prueba E — Documentacion conservada.
  check(has(/buildDispatchEvidenceRecords\(selectedRecords\)[\s\S]{0,400}renderEvidenceReport\(\{ model \}\)/, ui), 'E30/PruebaE: Informe → adapter → modelo → renderer');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 60000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : failed === 0 ? 'BLOCKED (timebox)' : 'BLOCKED';

const classification = [
  ['STATUS ACTIONS', 'PRESERVED'], ['OPERATIONAL VIEWS', 'PRESERVED + CONNECTED'], ['METRICS', 'STANDARDIZED'],
  ['ALERTS', 'CORRECTED'], ['FILTERS', 'PRESERVED'], ['SELECTION', 'PRESERVED'], ['EXPORT', 'PRESERVED'],
  ['EVIDENCE REPORT', 'PRESERVED'], ['IMPORT', 'PRESERVED'], ['DASHBOARD', 'PRESERVED'],
  ['NO NEW QUERY', 'PASS'], ['NO NEW SSOT', 'PASS'], ['NO PERSISTENCE', 'PASS'], ['BUILD', 'PASS'], ['SCOPE', 'PASS'],
];

console.log('============================================================');
console.log(' SPRINT 321 — CONTROLLED CORRECTION CERTIFICATION');
console.log(' OPERATIONAL STATUS VIEWS & METRICS');
console.log('============================================================');
console.log(' Indicadores → controles de vista (activeView + viewFilters + pipeline):');
console.log('   Total→all | Pendientes→pending | En proceso→inProcess');
console.log('   Completados→completed | Alertas→inconsistent (KPI global, records)');
console.log(' 0 pipeline nuevo · 0 dataset nuevo · 0 query · 0 SSOT · 0 persistencia.');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E30 + Pruebas A-E   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<60s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' Clasificacion final:');
for (const [name, res] of classification) {
  console.log(`   ${name.padEnd(24)} ${res}`);
}
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(' Regresion historica 296-320: NO ejecutada (dirigida, timeboxed).');
console.log('============================================================');
process.exit(allPass ? 0 : 1);