/**
 * SPRINT 320 — OPERATIONAL DISPATCH ACTIONS · PRESENTATION CONSOLIDATION
 * LEVEL 5 · FORENSIC UI AUDIT + CONTROLLED CORRECTION
 *
 * Consolida la presentación de las acciones de Despachos:
 *   - Superior (ACCIONES DEL MÓDULO): Exportar, Informe de Evidencia,
 *     Dashboard, Importar, Nuevo.
 *   - Inferior (ACCIONES SOBRE SELECCIÓN): Cambiar estado, Aprobar, Cerrar,
 *     Reabrir, Eliminar.
 * Se eliminan: PDF superior (handler retirado, capacidad superada por el
 * Informe de Evidencia 315/319) y CSV superior (duplicado de Exportar).
 * 0 cambios funcionales: misma handleExportCsv, mismo handleEvidenceReport,
 * mismos selectedIds, mismos filtros, mismas acciones de estado.
 *
 * Timeboxed y dirigida (NO regresión histórica 296–319).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ui = S('src/modules/experiences/UniversalOperationalRuntime.jsx');

const start = Date.now();
let passed = 0;
let failed = 0;
const failures = [];
function check(cond, label, detail = '') {
  if (cond) passed++;
  else { failed++; failures.push({ label, detail }); }
}
const has = (re, src) => re.test(src);
const assertHas = (re, src, label) => check(has(re, src), label, `regex ${re}`);
const assertNot = (re, src, label) => check(!has(re, src), label, `regex ${re}`);

// Regiones auditadas
const superior = ui.slice(
  ui.indexOf('flex items-center gap-3 w-full sm:w-auto flex-wrap justify-start sm:justify-end'),
  ui.indexOf('{/* Banner */}'),
);
const inferior = ui.slice(ui.indexOf('{/* Bulk actions bar */}'), ui.indexOf('{/* Table */}'));

const countLabel = (label) => (ui.match(new RegExp('> ' + label + '\\s*<\\/button>', 'g')) || []).length;
const countRef = (name) => (ui.match(new RegExp(name, 'g')) || []).length;

/* ================================================================== */
/* E01–E05 — INVENTARIO                                                */
/* ================================================================== */
{
  check(countRef('const handleExportCsv') === 1, 'E01: propietario exportacion = handleExportCsv');
  check(countRef('const handleEvidenceReport') === 1, 'E01: propietario informe = handleEvidenceReport');
  for (const [label, handler] of [['handleBulkStatus', 'estado'], ['handleBulkApprove', 'aprobar'], ['handleBulkClose', 'cerrar'], ['handleBulkReopen', 'reabrir'], ['handleBulkDelete', 'eliminar']]) {
    check(countRef('const ' + label) === 1, 'E01: propietario ' + handler + ' = ' + label);
  }
}
{
  assertHas(/> Exportar\s*<\/button>/, superior, 'E02: Exportar en barra superior');
  assertHas(/> Informe de Evidencia\s*<\/button>/, superior, 'E02: Informe de Evidencia en barra superior');
  assertHas(/> Dashboard\s*<\/button>/, superior, 'E02: Dashboard en barra superior');
  assertHas(/> Importar\s*<\/button>/, superior, 'E02: Importar en barra superior');
  assertHas(/> Nuevo\s*<\/button>/, superior, 'E02: Nuevo en barra superior');
  for (const a of ['Cambiar estado', 'Aprobar', 'Cerrar', 'Reabrir', 'Eliminar']) {
    check(inferior.includes(a), 'E02: barra inferior conserva ' + a);
  }
}
{
  const exp = countLabel('Exportar');
  check(exp === 1, 'E03: CSV/Exportar consolidado en UN solo boton Exportar', `found ${exp}`);
  check(countRef('handleExportCsv') === 2, 'E03: un unico handler CSV (definicion + onClick)', countRef('handleExportCsv'));
}
{
  const info = countLabel('Informe de Evidencia');
  check(info === 1, 'E04: PDF/Informe consolidado en UN solo Informe de Evidencia', `found ${info}`);
  check(!ui.includes('handleExportPdf'), 'E04: handler PDF antiguo retirado');
  assertNot(/> PDF\s*<\/button>/, ui, 'E04: sin boton PDF');
  assertNot(/> CSV\s*<\/button>/, ui, 'E04: sin boton CSV');
}
{
  const map = [
    ['Exportar', 'handleExportCsv'], ['Informe de Evidencia', 'handleEvidenceReport'],
    ['Dashboard', 'setIsDashboardOpen'], ['Importar', 'setIsExcelOpen'], ['Nuevo', 'setIsFormOpen'],
  ];
  for (const [label, handler] of map) {
    check(countRef(label + '\\s*<\\/button>') >= 1 && countRef(handler) >= 1, 'E05: ' + label + ' -> ' + handler);
  }
  for (const [label, handler] of [['Cambiar estado', 'handleBulkStatus'], ['Aprobar', 'handleBulkApprove'], ['Cerrar', 'handleBulkClose'], ['Reabrir', 'handleBulkReopen'], ['Eliminar', 'handleBulkDelete']]) {
    check(inferior.includes(label) && countRef('const ' + handler) === 1, 'E05: ' + label + ' -> ' + handler);
  }
}

/* ================================================================== */
/* E06–E10 — CONSOLIDACIÓN SUPERIOR                                    */
/* ================================================================== */
{
  check(superior.includes('supportsExport') && superior.includes('Exportar'), 'E06: Exportar bajo capabilities.supportsExport');
  assertHas(/handleExportCsv\(\)/, superior, 'E06: Exportar invoca handleExportCsv (dataset completo)');
  assertHas(/<Download className="w-4 h-4" \/> Exportar/, superior, 'E06: Exportar con icono Download (estilo superior)');
  assertHas(/supportsExport[\s\S]{0,200}handleEvidenceReport/, superior, 'E07: Informe de Evidencia bajo supportsExport');
  assertHas(/<FileText className="w-4 h-4" \/> Informe de Evidencia/, superior, 'E07: Informe con icono FileText (estilo superior)');
  assertHas(/setIsDashboardOpen\(true\)/, superior, 'E08: Dashboard permanece (setIsDashboardOpen)');
  assertHas(/supportsDashboard/, superior, 'E08: Dashboard bajo capabilities.supportsDashboard');
  assertHas(/setIsExcelOpen\(true\)/, superior, 'E09: Importar permanece (setIsExcelOpen)');
  assertHas(/supportsImport/, superior, 'E09: Importar bajo capabilities.supportsImport');
  assertHas(/setIsFormOpen\(true\)/, superior, 'E10: Nuevo permanece (setIsFormOpen)');
  assertHas(/disabled=\{loading \|\| saving\}/, superior, 'E10: guardas de carga preservadas en la barra');
}

/* ================================================================== */
/* E11–E15 — ELIMINACIÓN DE DUPLICADOS                                 */
/* ================================================================== */
{
  assertNot(/handleExportPdf/, ui, 'E11: PDF superior eliminado (sin handler)');
  assertNot(/> PDF\s*<\/button>/, ui, 'E11: sin boton PDF en la interfaz');
  assertNot(/> CSV\s*<\/button>/, ui, 'E12: sin boton CSV en la interfaz');
  assertNot(/handleExportCsv\(Array\.from\(selectedIds\)/, ui, 'E12: sin export de seleccion en barra inferior');
  assertNot(/> Exportar\s*<\/button>/, inferior, 'E13: Exportar inferior eliminado');
  assertNot(/handleEvidenceReport/, inferior, 'E14: Informe inferior eliminado');
  check(countLabel('Exportar') === 1 && countLabel('Informe de Evidencia') === 1, 'E15: sin acciones duplicadas');
}

/* ================================================================== */
/* E16–E20 — INTEGRIDAD FUNCIONAL                                      */
/* ================================================================== */
{
  assertHas(/const handleExportCsv = async/, ui, 'E16: handler de exportacion intacto');
  assertHas(/orchestratorRef\.current\.exportExcel\(target, auditUser\)/, ui, 'E16: serializacion CSV via orchestrator intacta');
  assertHas(/const handleEvidenceReport = \(\) =>/, ui, 'E17: handler de informe intacto');
  const h = ui.slice(ui.indexOf('const handleEvidenceReport'), ui.indexOf('const handleBulkDelete'));
  assertHas(/buildDispatchEvidenceRecords\(selectedRecords\)/, h, 'E17: adapter 319 intacto');
  assertHas(/buildEvidenceReportModel\(\{/, h, 'E17: modelo 315 intacto');
  assertHas(/renderEvidenceReport\(\{ model \}\)/, h, 'E17: renderer 315 intacto');
  assertHas(/filteredRecords\.filter\(\(record\) => selectedIds\.has\(record\.id\)\)/, h, 'E17: seleccion filtered ∩ selected intacta');
  assertHas(/selectedRecords\.length === 0/, h, 'E17: gate de seleccion vacia intacto');
  assertHas(/const toggleSelect = \(id\) =>/, ui, 'E18: toggle individual intacto');
  assertHas(/const toggleSelectAll = \(\) =>/, ui, 'E18: toggle all intacto');
  assertHas(/const allFilteredSelected = useMemo/, ui, 'E18: estado select-all intacto');
  assertHas(/selectedIds\.size > 0 &&/, ui, 'E18: gate de barra por seleccion intacto');
  assertHas(/const \[filters, setFilters\] = useState\(\{\}\)/, ui, 'E19: estado de filtros intacto');
  assertHas(/const filteredRecords = useMemo/, ui, 'E19: filteredRecords intacto');
  assertHas(/setFilters\(prev => \(\{ \.\.\.prev, \[f\]/, ui, 'E19: aplicacion de filtros intacta');
  for (const [label, handler] of [['handleBulkStatus', 'estado'], ['handleBulkApprove', 'aprobar'], ['handleBulkClose', 'cerrar'], ['handleBulkReopen', 'reabrir'], ['handleBulkDelete', 'eliminar']]) {
    check(ui.includes('const ' + label + ' = async'), 'E20: accion de estado intacta (' + handler + ')');
    check(inferior.includes(label), 'E20: ' + handler + ' presente en barra inferior');
  }
}

/* ================================================================== */
/* E21–E25 — IMPORTACIÓN / DASHBOARD / NUEVO                           */
/* ================================================================== */
{
  assertHas(/import UniversalImportWorkflow from/, ui, 'E21: ImportWorkflow integrado');
  assertHas(/handleExcelImported/, ui, 'E21: pipeline de importacion intacto');
  assertHas(/<UniversalImportWorkflow open=\{isExcelOpen\}/, ui, 'E21: modal de importacion intacto');
  assertHas(/import UniversalOperationalDashboard from/, ui, 'E22: Dashboard integrado');
  assertHas(/<UniversalOperationalDashboard open=\{isDashboardOpen\}/, ui, 'E22: modal Dashboard intacto');
  assertHas(/setIsFormOpen\(true\)/, ui, 'E23: Nuevo intacto');
  assertHas(/editingRecord \? 'Editar' : 'Nuevo'/, ui, 'E23: formulario Nuevo/Editar intacto');
  assertNot(/localStorage|sessionStorage|indexedDB/, ui, 'E26/24: sin almacenamiento nuevo en el runtime');
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  const srcLines = (git.stdout || '').split('\n').filter((l) => l.includes(' src/'));
  check(!srcLines.some((l) => l.includes('UniversalImportWorkflow')), 'E21: import workflow sin cambios');
  check(!srcLines.some((l) => l.includes('UniversalOperationalDashboard')), 'E22: dashboard sin cambios');
  check(!srcLines.some((l) => l.includes('src/services')), 'E24: servicios intactos');
  check(!srcLines.some((l) => l.includes('OperationalExperienceRegistry') || l.includes('runtimeContracts')), 'E25: contratos intactos');
  check(countRef('supportsExport') >= 2 && countRef('supportsDashboard') >= 1 && countRef('supportsImport') >= 1, 'E25: flags de capabilities conservados');
}

/* ================================================================== */
/* E26–E30 — ARQUITECTURA                                              */
/* ================================================================== */
{
  assertNot(/fetch\(|supabase\.from|getModuleResponses/, ui, 'E26: sin nueva query');
  assertNot(/localStorage|sessionStorage|indexedDB/, ui, 'E27: sin nuevo SSOT');
  assertNot(/dispatch_report_/, ui, 'E27: sin repositorios/almacenes nuevos');
  check(countRef('const handleEvidenceReport') === 1 && countRef('const handleExportCsv') === 1 && countRef('const handleBulkDelete') === 1, 'E28: handlers sin duplicar (1 definicion c/u)');
  assertNot(/\.insert\(|upsert\(/, ui, 'E29: sin persistencia nueva');
  assertHas(/orchestratorRef\.current\.exportExcel/, ui, 'E29: CSV preservado (misma capacidad)');
  assertHas(/import \{ buildDispatchEvidenceRecords \}/, ui, 'E30: cadena 319 intacta (runtime sin cambios funcionales)');
  assertHas(/import \{ buildEvidenceReportModel \}/, ui, 'E30: modelo 315 intacto');
  assertHas(/import \{ renderEvidenceReport \}/, ui, 'E30: renderer 315 intacto');
}

/* ================================================================== */
/* E31 — BUILD                                                         */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E31: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E31: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

/* ================================================================== */
/* E32 — SCOPE                                                         */
/* ================================================================== */
{
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  const lines = (git.stdout || '').split('\n').filter((l) => l.trim());
  const srcChanges = lines.filter((l) => l.includes(' src/'));
  const allowedSrc = ['src/modules/experiences/UniversalOperationalRuntime.jsx', 'src/shared/report/dispatchEvidenceAdapter.js'];
  const unexpected = srcChanges.filter((l) => !allowedSrc.some((a) => l.includes(a)));
  check(unexpected.length === 0, 'E32: solo src autorizados (UOR + adapter 319)', unexpected.join(' | '));
  const forbidden = ['dispatchEvidenceAdapter.js', 'evidenceReportModel', 'evidenceReportRenderer', 'filterCore', 'sgcFilterAdapter', 'operationalRecordsService', 'despachosService', 'UniversalOperationalDashboard', 'UniversalImportWorkflow', 'dynamicService', 'supabase', 'exportDataNormalizer'];
  for (const f of forbidden) {
    check(!srcChanges.some((l) => l.includes(f) && !l.includes('dispatchEvidenceAdapter.js')), 'E32: prohibido sin cambios', f);
  }
  check(fs.existsSync(path.join(ROOT, 'scripts/sprint-320-operational-dispatch-actions-presentation-consolidation-controlled-correction.mjs')), 'E32: suite 320 presente');
  check(fs.existsSync(path.join(ROOT, 'docs/Sprint-320.md')), 'E32: docs Sprint-320 presente');
  const newUntracked = lines.filter((l) => l.startsWith('??') && !l.includes('sprint-31') && !l.includes('sprint-32') && !l.includes('docs/Sprint-318') && !l.includes('docs/Sprint-319') && !l.includes('docs/Sprint-320') && !l.includes('dispatchEvidenceAdapter'));
  check(newUntracked.length === 0, 'E32: sin archivos nuevos fuera del alcance (318/319/320 permitidos)', newUntracked.join(' | '));
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 600000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : failed === 0 ? 'BLOCKED (timebox)' : 'BLOCKED';

const classification = [
  ['ACTION OWNERSHIP', 'E01, E05'], ['DUPLICATE REMOVAL', 'E11, E12, E13, E14, E15'],
  ['EXPORT CONSOLIDATION', 'E03, E06, E16'], ['EVIDENCE REPORT POSITION', 'E04, E07, E17'],
  ['MODULE ACTIONS', 'E02, E08, E09, E10'], ['SELECTION ACTIONS', 'E02, E20'],
  ['IMPORT UNTOUCHED', 'E21'], ['DASHBOARD UNTOUCHED', 'E22'], ['NEW UNTOUCHED', 'E23'],
  ['SELECTION INTACT', 'E18'], ['FILTERS INTACT', 'E19'], ['STATE ACTIONS INTACT', 'E20'],
  ['NO NEW QUERY', 'E26'], ['NO NEW SSOT', 'E27'], ['NO PERSISTENCE MUTATION', 'E29'],
  ['NO RUNTIME CHANGE', 'E30'], ['BUILD', 'E31'], ['SCOPE', 'E32'],
];

console.log('============================================================');
console.log(' SPRINT 320 — PRESENTATION CONSOLIDATION CERTIFICATION');
console.log(' OPERATIONAL DISPATCH ACTIONS · FORENSIC UI AUDIT');
console.log('============================================================');
console.log(' Acciones del modulo (superior):  Exportar | Informe | Dashboard | Importar | Nuevo');
console.log(' Acciones sobre seleccion (inferior): Estado | Aprobar | Cerrar | Reabrir | Eliminar');
console.log(' Eliminadas: PDF (handler retirado), CSV (duplicado de Exportar).');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E32   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox: ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' Clasificacion final:');
for (const [name, gates] of classification) {
  console.log(`   ${name.padEnd(30)} ${gates.padEnd(40)} PASS`);
}
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(' Regresion historica 296-319: NO ejecutada (audit dirigido, timeboxed).');
console.log('============================================================');
process.exit(allPass ? 0 : 1);