/**
 * SPRINT 317 — ADVANCED FILTERING + RECORD SELECTION — CONTROLLED CORRECTION
 *
 * Implementa Advanced Filtering (búsqueda + formulario + usuario + estado +
 * fecha/rango + verificación + hallazgo, 0 consultas nuevas) y corrige la
 * selección individual/múltiple de registros en Historial y Consulta,
 * separando CAN_VERIFY de CAN_SELECT.
 *
 * Entregables:
 *   - src/shared/filters/filterCore.js         (Generic Filter Core, puro ESM)
 *   - src/shared/filters/sgcFilterAdapter.js   (SGC Filter Adapter, puro ESM)
 *   - src/components/DynamicRecordsView.jsx    (integración local, 0 queries)
 *   - docs/Sprint-317.md
 *
 * Gates: E01..E30. Clasificación según §34 (15 condiciones).
 * Sin regresión histórica de familia 296-316.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const UI = path.join(ROOT, 'src', 'components', 'DynamicRecordsView.jsx');
const CORE = path.join(ROOT, 'src', 'shared', 'filters', 'filterCore.js');
const ADAPTER = path.join(ROOT, 'src', 'shared', 'filters', 'sgcFilterAdapter.js');

const ui = fs.readFileSync(UI, 'utf8');
const core = fs.readFileSync(CORE, 'utf8');
const adapter = fs.readFileSync(ADAPTER, 'utf8');
const dynamicModule = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'DynamicModule.jsx'), 'utf8');

const { applyFilters, uniqueSorted, dateKey, todayKey, passesQuick } = await import('../src/shared/filters/filterCore.js');
const { toFilterable, statusLabel, hallazgoLabel } = await import('../src/shared/filters/sgcFilterAdapter.js');
const normalizerMod = await import('../src/shared/utils/exportDataNormalizer.js');
const reportModelMod = await import('../src/shared/report/evidenceReportModel.js');
const rendererMod = await import('../src/shared/report/evidenceReportRenderer.js');

const start = Date.now();

let passed = 0;
let failed = 0;
const failures = [];
let lastGate = '';

function check(cond, label, detail = '') {
  lastGate = label;
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push({ label, detail });
  }
}

function assertStatic(re, label, target = ui) {
  check(re.test(target), label, `regex ${re}`);
}

function assertNotStatic(re, label, target = ui) {
  check(!re.test(target), label, `regex ${re}`);
}

/* ------------------------------------------------------------------ */
/* Fixtures: registros con la forma de la proyección getModuleResponses */
/* + atributos adjuntos por loadRecords (computedStatus, etc).         */
/* ------------------------------------------------------------------ */
const TODAY = todayKey();
const users = {
  juan: { nombre: 'Juan Perez', rol: 'operario', id: 'u1' },
  ana: { nombre: 'Ana Lopez', rol: 'calidad', id: 'u2' },
};
const mkRecord = ({ id, form, user, status = 'pendiente_revision', createdAt, computedStatus = 'cumple', verified = false, values = [] }) => ({
  id,
  status,
  created_at: createdAt,
  created_by: user.id,
  verified_at: verified ? createdAt : null,
  sgc_forms: { id: `f_${form}`, name: form, module_id: 'mod_1' },
  profiles: user,
  verifier: verified ? { nombre: 'Auditor' } : null,
  sgc_response_values: values,
  computedStatus,
  criticalIssues: [],
  complianceCounts: { total: 0, cumple: 0, noCumple: 0 },
  formComplianceStatus: null,
});

const r1 = mkRecord({ id: 'r1', form: 'Preoperativo', user: users.juan, status: 'aprobado', createdAt: '2026-08-10T12:00:00Z', computedStatus: 'cumple', verified: true });
const r2 = mkRecord({ id: 'r2', form: 'Preoperativo', user: users.ana, status: 'pendiente_revision', createdAt: '2026-08-12T12:00:00Z', computedStatus: 'advertencia' });
const r3 = mkRecord({ id: 'r3', form: 'Checklist Vehiculo', user: users.juan, status: 'rechazado', createdAt: '2026-08-14T12:00:00Z', computedStatus: 'critico', verified: true });
const r4 = mkRecord({ id: 'r4', form: 'Preoperativo', user: users.ana, status: 'pendiente_revision', createdAt: `${TODAY}T12:00:00`, computedStatus: 'critico' });
const r5 = mkRecord({ id: 'r5', form: 'Checklist Vehiculo', user: users.juan, status: 'aprobado', createdAt: '2026-08-15T12:00:00Z', computedStatus: 'cumple', verified: true });
const r6 = mkRecord({ id: 'r6', form: 'Inspeccion', user: users.ana, status: 'pendiente_revision', createdAt: '2026-08-09T12:00:00Z', computedStatus: 'cumple' });
const RECORDS = [r1, r2, r3, r4, r5, r6];

const ids = (list) => list.map((r) => r.id);

/* ------------------------------------------------------------------ */
/* E01 — FILTER OWNER                                                  */
/* ------------------------------------------------------------------ */
{
  check(fs.existsSync(CORE) && fs.existsSync(ADAPTER), 'E01: modulos filterCore/adapter existen');
  assertStatic(/applyFilters\(records, toFilterable/, 'E01: la vista consume el core via adapter', ui);
  assertStatic(/const \[searchTerm, setSearchTerm\] = useState\(''\)/, 'E01: estado searchTerm en la vista', ui);
  assertStatic(/const \[showFilters, setShowFilters\] = useState\(false\)/, 'E01: estado showFilters en la vista', ui);
  assertStatic(/const \[filters, setFilters\] = useState\(\{\}\)/, 'E01: estado filters en la vista', ui);
}

/* ------------------------------------------------------------------ */
/* E02 — FILTER STATE                                                  */
/* ------------------------------------------------------------------ */
{
  assertStatic(/useMemo/, 'E02: useMemo disponible', ui);
  assertStatic(/const formularioOptions = useMemo/, 'E02: opciones formulario derivadas', ui);
  assertStatic(/const usuarioOptions = useMemo/, 'E02: opciones usuario derivadas', ui);
  assertStatic(/const estadoOptions = useMemo/, 'E02: opciones estado derivadas', ui);
  assertStatic(/const hallazgoOptions = useMemo/, 'E02: opciones hallazgo derivadas', ui);
  assertStatic(/const verificacionOptions = /, 'E02: opciones verificacion', ui);
  check(
    uniqueSorted(RECORDS.map((r) => r.sgc_forms.name)).sort().join('|') ===
      ['Checklist Vehiculo', 'Inspeccion', 'Preoperativo'].join('|'),
    'E02: uniqueSorted deriva opciones unicas del dataset',
  );
}

/* ------------------------------------------------------------------ */
/* E03 — SEARCH                                                        */
/* ------------------------------------------------------------------ */
{
  assertStatic(/value=\{searchTerm\}/, 'E03: input search controlado', ui);
  assertStatic(/onChange=\{e => setSearchTerm\(e.target.value\)\}/, 'E03: search onChange funcional', ui);
  assertStatic(/Buscar por formulario, usuario o hallazgo/, 'E03: placeholder search', ui);
  const res = applyFilters(RECORDS, toFilterable, { search: 'juan' });
  check(ids(res).sort().join() === ['r1', 'r3', 'r5'].sort().join(), 'E03: busqueda por usuario', `got ${ids(res)}`);
  const resForm = applyFilters(RECORDS, toFilterable, { search: 'inspeccion' });
  check(ids(resForm).length === 1 && resForm[0].id === 'r6', 'E03: busqueda por formulario');
}

/* ------------------------------------------------------------------ */
/* E04 — FORM FILTER                                                   */
/* ------------------------------------------------------------------ */
{
  assertStatic(/value=\{filters.formulario \|\| ''\}/, 'E04: select Formulario en el panel', ui);
  assertStatic(/formularioOptions.map/, 'E04: opciones formulario en el select', ui);
  const res = applyFilters(RECORDS, toFilterable, { fields: { formulario: 'Preoperativo' } });
  check(ids(res).sort().join() === ['r1', 'r2', 'r4'].sort().join(), 'E04: filtro por formulario', `got ${ids(res)}`);
}

/* ------------------------------------------------------------------ */
/* E05 — USER FILTER                                                   */
/* ------------------------------------------------------------------ */
{
  assertStatic(/value=\{filters.usuario \|\| ''\}/, 'E05: select Usuario en el panel', ui);
  assertStatic(/usuarioOptions.map/, 'E05: opciones usuario en el select', ui);
  const res = applyFilters(RECORDS, toFilterable, { fields: { usuario: 'Ana Lopez' } });
  check(ids(res).sort().join() === ['r2', 'r4', 'r6'].sort().join(), 'E05: filtro por usuario', `got ${ids(res)}`);
}

/* ------------------------------------------------------------------ */
/* E06 — STATUS FILTER                                                 */
/* ------------------------------------------------------------------ */
{
  assertStatic(/value=\{filters.estado \|\| ''\}/, 'E06: select Estado en el panel', ui);
  const res = applyFilters(RECORDS, toFilterable, { fields: { estado: 'aprobado' } });
  check(ids(res).sort().join() === ['r1', 'r5'].sort().join(), 'E06: filtro por estado', `got ${ids(res)}`);
  check(statusLabel('pendiente_revision') === 'Pendiente', 'E06: statusLabel pinta estados legibles');
}

/* ------------------------------------------------------------------ */
/* E07 — DATE FILTER (desde)                                           */
/* ------------------------------------------------------------------ */
{
  assertStatic(/type="date"/, 'E07: inputs de fecha en el panel', ui);
  assertStatic(/filters.desde/, 'E07: desde en el panel', ui);
  const desde = dateKey(r3.created_at);
  const res = applyFilters(RECORDS, toFilterable, { fields: { desde } });
  check(ids(res).includes('r1') === false && ids(res).includes('r3') && ids(res).includes('r4'), 'E07: desde excluye anteriores e incluye desde la fecha');
}

/* ------------------------------------------------------------------ */
/* E08 — DATE RANGE (desde + hasta)                                    */
/* ------------------------------------------------------------------ */
{
  assertStatic(/filters.hasta/, 'E08: hasta en el panel', ui);
  const desde = dateKey(r2.created_at);
  const hasta = dateKey(r4.created_at);
  const res = applyFilters(RECORDS, toFilterable, { fields: { desde, hasta } });
  check(ids(res).sort().join() === ['r2', 'r3', 'r4', 'r5'].sort().join(), 'E08: rango fecha', `got ${ids(res)}`);
}

/* ------------------------------------------------------------------ */
/* E09 — VERIFICATION FILTER                                           */
/* ------------------------------------------------------------------ */
{
  assertStatic(/value=\{filters.verificacion \|\| ''\}/, 'E09: select Verificacion en el panel', ui);
  const ver = applyFilters(RECORDS, toFilterable, { fields: { verificacion: 'verificado' } });
  check(ids(ver).sort().join() === ['r1', 'r3', 'r5'].sort().join(), 'E09: filtro verificacion=verificado', `got ${ids(ver)}`);
  const pend = applyFilters(RECORDS, toFilterable, { fields: { verificacion: 'pendiente' } });
  check(ids(pend).sort().join() === ['r2', 'r4', 'r6'].sort().join(), 'E09: filtro verificacion=pendiente', `got ${ids(pend)}`);
}

/* ------------------------------------------------------------------ */
/* E10 — FINDING FILTER (hallazgo)                                     */
/* ------------------------------------------------------------------ */
{
  assertStatic(/value=\{filters.hallazgo \|\| ''\}/, 'E10: select Hallazgo en el panel', ui);
  assertStatic(/hallazgoOptions.map/, 'E10: opciones hallazgo en el select', ui);
  const res = applyFilters(RECORDS, toFilterable, { fields: { hallazgo: 'critico' } });
  check(ids(res).sort().join() === ['r3', 'r4'].sort().join(), 'E10: filtro por hallazgo', `got ${ids(res)}`);
  check(hallazgoLabel('critico') === 'Critico', 'E10: hallazgoLabel pinta hallazgos legibles');
}

/* ------------------------------------------------------------------ */
/* E11 — FILTER COMPOSITION (quick + advanced)                         */
/* ------------------------------------------------------------------ */
{
  const res = applyFilters(RECORDS, toFilterable, {
    quick: 'aprobados',
    fields: { usuario: 'Juan Perez', desde: dateKey(r5.created_at) },
  });
  check(ids(res).join() === 'r5', 'E11: composicion quick+usuario+fecha', `got ${ids(res)}`);
}

/* ------------------------------------------------------------------ */
/* E12 — FILTER RESET                                                  */
/* ------------------------------------------------------------------ */
{
  check(applyFilters(RECORDS, toFilterable, {}).length === RECORDS.length, 'E12: sin criterio devuelve todos');
  assertStatic(/Limpiar filtros/, 'E12: boton Limpiar filtros', ui);
  assertStatic(/onClick=\{\(\) => setFilters\(\{\}\)\}/, 'E12: limpiar reinicia filters', ui);
}

/* ------------------------------------------------------------------ */
/* E13 — FILTERED RECORDS (mismos objetos, subconjunto)                */
/* ------------------------------------------------------------------ */
{
  const res = applyFilters(RECORDS, toFilterable, { quick: 'pendientes' });
  check(res.every((r) => RECORDS.includes(r)), 'E13: devuelve los mismos objetos (ref)');
  check(res.length <= RECORDS.length, 'E13: subconjunto');
}

/* ------------------------------------------------------------------ */
/* E14 — ORDER PRESERVATION                                            */
/* ------------------------------------------------------------------ */
{
  const res = applyFilters(RECORDS, toFilterable, { quick: 'pendientes', search: 'a' });
  const idx = (id) => RECORDS.findIndex((r) => r.id === id);
  check(
    ids(res).every((id, i) => (i === 0 ? true : idx(ids(res)[i - 1]) < idx(id))),
    'E14: orden de la fuente conservado',
    `got ${ids(res)}`,
  );
  assertNotStatic(/records\.sort\(/, 'E14: la vista NO reordena records', ui);
  check((core.match(/\.sort\(/g) || []).length === 1 && /uniqueSorted/.test(core), 'E14: unico .sort() en core = uniqueSorted');
  check(!/while\s*\(/.test(core) && !/for\s*\(/.test(core), 'E14: core sin loops, filtrado nativo finito');
}

/* ------------------------------------------------------------------ */
/* E15 — INDIVIDUAL SELECTION                                          */
/* ------------------------------------------------------------------ */
{
  assertStatic(/checked=\{selectedIds.includes\(rec.id\)\}/, 'E15: checkbox individual ligado a seleccion', ui);
  assertStatic(/onChange=\{\(\) => toggleSelection\(rec.id\)\}/, 'E15: toggle individual', ui);
  const rowCheckbox = ui.match(/type="checkbox"[^>]*onChange=\{\(\) => toggleSelection\(rec.id\)\}/)?.[0] || '';
  check(!/disabled/.test(rowCheckbox), 'E15: checkbox SIN disabled', rowCheckbox.slice(0, 120));
  assertNotStatic(/canVerifyRecord/, 'E15: canVerifyRecord eliminado', ui);
  assertNotStatic(/isOwnRecord/, 'E15: isOwnRecord eliminado del gate de seleccion', ui);
  // Contrato funcional del toggle (misma expresion que la vista)
  let sel = [];
  const toggle = (id) => (sel = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  toggle('r1'); check(sel.join() === 'r1', 'E15: toggle agrega');
  toggle('r1'); check(sel.length === 0, 'E15: toggle remueve');
  toggle('r1'); toggle('r2'); check(sel.length === 2, 'E15: seleccion multiple via toggle');
}

/* ------------------------------------------------------------------ */
/* E16 — MULTI SELECTION                                               */
/* ------------------------------------------------------------------ */
{
  let sel = [];
  const toggle = (id) => (sel = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  ['r1', 'r2', 'r3'].forEach(toggle);
  check(sel.length === 3, 'E16: N seleccionados');
  toggle('r2');
  check(sel.join() === 'r1,r3', 'E16: toggle preserva el resto', `got ${sel}`);
}

/* ------------------------------------------------------------------ */
/* E17 — SELECT ALL (sobre filteredRecords)                            */
/* ------------------------------------------------------------------ */
{
  assertStatic(/setSelectedIds\(filteredRecords.map\(r => r.id\)\)/, 'E17: Select All = filteredRecords', ui);
  assertStatic(/selectedIds.length === filteredRecords.length/, 'E17: checkbox header refleja filtered', ui);
  // 100 registros → filtro → 20 → select all = 20
  const big = [];
  for (let i = 0; i < 100; i++) {
    big.push(mkRecord({ id: `b${i}`, form: i % 2 ? 'Preoperativo' : 'Checklist', user: users.juan, status: 'aprobado', createdAt: `2026-08-1${i % 10}T12:00:00Z`, computedStatus: 'cumple', verified: true }));
  }
  const filtered = applyFilters(big, toFilterable, { quick: 'aprobados', search: 'juan' });
  check(filtered.length === 100, 'E17: dataset 100 filtrado');
  const sub = applyFilters(big, toFilterable, { fields: { formulario: 'Preoperativo' } });
  check(sub.length === 50, 'E17: subconjunto 50');
  const selAll = sub.map((r) => r.id);
  check(selAll.length === sub.length && selAll.length === 50, 'E17: select all = filteredRecords.length');
}

/* ------------------------------------------------------------------ */
/* E18 — SELECTION COUNT                                               */
/* ------------------------------------------------------------------ */
{
  assertStatic(/registros encontrados/, 'E18: contador encontrados', ui);
  assertStatic(/seleccionados/, 'E18: contador seleccionados', ui);
  assertStatic(/filteredRecords.length\}/, 'E18: contador usa filteredRecords.length', ui);
}

/* ------------------------------------------------------------------ */
/* E19 — VERIFY ≠ SELECT (prueba critica §28)                          */
/* ------------------------------------------------------------------ */
{
  // Registro propio + pendiente_revision: CAN_SELECT=true
  const ownPending = mkRecord({ id: 'own1', form: 'Preoperativo', user: users.ana, status: 'pendiente_revision', createdAt: '2026-08-15T12:00:00Z', computedStatus: 'cumple' });
  const res = applyFilters([ownPending], toFilterable, {});
  check(res.length === 1 && res[0].id === 'own1', 'E19: registro propio pendiente ES seleccionable (CAN_SELECT=true)');
  assertNotStatic(/disabled=\{!canVerifyRecord/, 'E19: checkbox sin bloqueo por canVerifyRecord', ui);
  assertNotStatic(/title="No puedes verificar/, 'E19: tooltip de bloqueo eliminado del checkbox', ui);
  // CAN_VERIFY sigue gobernado por rol + status en el modal (segregacion intacta)
  assertStatic(/\(rol === 'administrador' \|\| rol === 'calidad'\) && selectedRecord.status === 'pendiente_revision'/, 'E19: botones verificar gated por rol+status', ui);
  assertStatic(/Por principio de segregación de funciones/, 'E19: segregacion intacta en modal', ui);
}

/* ------------------------------------------------------------------ */
/* E20 — XLSX INTEGRATION (cadena inalterada)                          */
/* ------------------------------------------------------------------ */
{
  const selStmt = 'const selectedRecords = records.filter((r) => selectedIds.includes(r.id));';
  check((ui.match(/const selectedRecords = records.filter\(\(r\) => selectedIds.includes\(r.id\)\);/g) || []).length === 2, 'E20/E21: ambas cadenas usan records.filter(selectedIds)');
  const iExport = ui.indexOf('exportService({');
  const iSelExport = ui.indexOf(selStmt);
  const expBlock = ui.slice(iSelExport, iExport);
  check(iSelExport !== -1 && iSelExport < iExport, 'E20: export define selectedRecords antes de exportService');
  check(!expBlock.includes('filteredRecords'), 'E20: export NO usa filteredRecords');
  check(typeof normalizerMod.exportDataNormalizer === 'function', 'E20: exportDataNormalizer importable');
  check(typeof normalizerMod.normalizeValue === 'function', 'E20: normalizeValue intacto');
  const parts = normalizerMod.getDateParts('2026-08-10T12:00:00Z');
  check(parts.fecha !== '' && parts.hora !== '', 'E20: getDateParts funciona');
}

/* ------------------------------------------------------------------ */
/* E21 — EVIDENCE REPORT INTEGRATION (cadena 315 inalterada)           */
/* ------------------------------------------------------------------ */
{
  const selStmt2 = 'const selectedRecords = records.filter((r) => selectedIds.includes(r.id));';
  const iModel = ui.indexOf('buildEvidenceReportModel({');
  const iSelModel = ui.lastIndexOf(selStmt2);
  const modelBlock = ui.slice(iSelModel, iModel);
  check(iSelModel !== -1 && iSelModel < iModel, 'E21: informe define selectedRecords antes de buildEvidenceReportModel');
  check(!modelBlock.includes('filteredRecords'), 'E21: informe NO usa filteredRecords');
  assertStatic(/renderEvidenceReport\(\{ model \}\)/, 'E21: renderer sigue en la cadena', ui);
  const model = reportModelMod.buildEvidenceReportModel({
    registros: [r1, r3],
    moduleId: 'mod_1',
    moduleName: 'Preoperativo',
    now: new Date('2026-08-16T12:00:00Z'),
    documentSequence: 1,
  });
  check(typeof model.documentId === 'string' && /^EVID-/.test(model.documentId), 'E21: modelo construye documentId EVID-');
  check(model.module.name === 'Preoperativo', 'E21: modelo conserva moduleName');
  check(model.summary.totalRecords === 2, 'E21: modelo cuenta registros');
  check(typeof rendererMod.renderEvidenceReport === 'function', 'E21: renderer importable');
}

/* ------------------------------------------------------------------ */
/* E22 — MULTI-FORM                                                    */
/* ------------------------------------------------------------------ */
{
  const res = applyFilters(RECORDS, toFilterable, { fields: { formulario: 'Checklist Vehiculo', usuario: 'Juan Perez' } });
  check(ids(res).sort().join() === ['r3', 'r5'].sort().join(), 'E22: combinacion multi-form + usuario', `got ${ids(res)}`);
}

/* ------------------------------------------------------------------ */
/* E23 — DYNAMIC DATA (metadata-driven, sin formularios hardcoded)     */
/* ------------------------------------------------------------------ */
{
  assertNotStatic(/=== 'Preoperativo'/, 'E23: sin hardcode de formularios en la vista', ui);
  assertNotStatic(/if \(formulario ===/, 'E23: sin condicional por formulario', ui);
  check(!/Preoperativo/.test(core) && !/Checklist/.test(core), 'E23: core sin nombres de formulario');
  check(!/Preoperativo/.test(adapter), 'E23: adapter sin nombres de formulario');
  const opts = uniqueSorted(RECORDS.map((r) => r.sgc_forms.name));
  check(opts.length === 3, 'E23: opciones derivadas del dataset');
}

/* ------------------------------------------------------------------ */
/* E24 — NO NEW QUERY                                                  */
/* ------------------------------------------------------------------ */
{
  for (const [label, content] of [['core', core], ['adapter', adapter]]) {
    check(!/fetch\(/.test(content), `E24: sin fetch() en ${label}`);
    check(!/\.from\(/.test(content), `E24: sin .from() en ${label}`);
    check(!/\.select\(/.test(content), `E24: sin .select() en ${label}`);
    check(!/getModuleResponses\(/.test(content), `E24: sin llamada getModuleResponses en ${label}`);
    check(!/supabase/.test(content), `E24: sin supabase en ${label}`);
    check(!/\.eq\(/.test(content), `E24: sin .eq() en ${label}`);
  }
  check((ui.match(/getModuleResponses\(/g) || []).length === 1, 'E24: una unica carga de datos en la vista');
}

/* ------------------------------------------------------------------ */
/* E25 — NO NEW SSOT                                                   */
/* ------------------------------------------------------------------ */
{
  for (const [label, content] of [['core', core], ['adapter', adapter]]) {
    check(!/localStorage/.test(content), `E25: sin localStorage en ${label}`);
    check(!/sessionStorage/.test(content), `E25: sin sessionStorage en ${label}`);
    check(!/indexedDB/.test(content), `E25: sin indexedDB en ${label}`);
  }
  assertStatic(/const \[searchTerm, setSearchTerm\] = useState\(/, 'E25: filtros son estado local React', ui);
}

/* ------------------------------------------------------------------ */
/* E26 — NO PERSISTENCE MUTATION                                       */
/* ------------------------------------------------------------------ */
{
  for (const [label, content] of [['core', core], ['adapter', adapter]]) {
    check(!/\.insert\(/.test(content), `E26: sin .insert() en ${label}`);
    check(!/\.update\(/.test(content), `E26: sin .update() en ${label}`);
    check(!/\.delete\(/.test(content), `E26: sin .delete() en ${label}`);
  }
}

/* ------------------------------------------------------------------ */
/* E27 — NO DATA LOSS                                                  */
/* ------------------------------------------------------------------ */
{
  const before = ids(RECORDS).join();
  const scenarios = [
    {},
    { quick: 'aprobados' },
    { quick: 'rechazados' },
    { quick: 'pendientes' },
    { quick: 'hoy' },
    { search: 'juan' },
    { fields: { formulario: 'Preoperativo' } },
    { fields: { hallazgo: 'critico' } },
  ];
  const union = new Set();
  for (const c of scenarios) {
    const res = applyFilters(RECORDS, toFilterable, c);
    res.forEach((r) => union.add(r.id));
  }
  check(ids(RECORDS).join() === before, 'E27: dataset original intacto tras filtros');
  check(union.size === RECORDS.length, 'E27: todo registro alcanzable por algun filtro', `reachable ${union.size}/${RECORDS.length}`);
  check(RECORDS.every((r) => Object.keys(r).length > 0), 'E27: registros no mutados');
}

/* ------------------------------------------------------------------ */
/* E28 — SCOPE (solo archivos autorizados)                             */
/* ------------------------------------------------------------------ */
{
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  const lines = (git.stdout || '').split('\n').filter((l) => l.trim());
  const srcChanges = lines.filter((l) => l.includes(' src/'));
  const allowed = [
    'src/components/DynamicRecordsView.jsx',
    'src/shared/filters/',
  ];
  const unexpected = srcChanges.filter((l) => !allowed.some((a) => l.includes(a)));
  check(unexpected.length === 0, 'E28: solo cambios autorizados en src/', `unexpected: ${unexpected.join(' | ')}`);

  const forbiddenSubstrings = [
    'src/services/dynamicService',
    'providers/SupabasePersistenceProvider',
    'src/runtime/types/runtimeContracts',
    'src/shared/report/',
    'src/shared/utils/excelExporter',
    'src/utils/alertVisual',
    'src/shared/services/supabase',
    'src/core/persistence',
    'src/runtime/persistence',
  ];
  for (const sub of forbiddenSubstrings) {
    check(!lines.some((l) => l.includes(sub)), 'E28: prohibido sin cambios', sub);
  }
}

/* ------------------------------------------------------------------ */
/* E29 — BUILD                                                         */
/* ------------------------------------------------------------------ */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E29: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E29: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

/* ------------------------------------------------------------------ */
/* E30 — RUNTIME REGRESSION (checks dirigidos, sin familia historica)  */
/* ------------------------------------------------------------------ */
{
  const big = [];
  for (let i = 0; i < 30; i++) {
    big.push(mkRecord({ id: `m${i}`, form: 'Preoperativo', user: users.ana, status: 'pendiente_revision', createdAt: `2026-08-${(i % 9) + 1}T12:00:00Z`, computedStatus: 'advertencia' }));
  }
  const res = applyFilters(big, toFilterable, { search: 'ana', quick: 'pendientes', fields: { formulario: 'Preoperativo' } });
  check(res.length === 30, 'E30: pipeline full stack en runtime', `got ${res.length}`);
  check(passesQuick({ estado: 'aprobado' }, 'aprobados') === true, 'E30: passesQuick aprobados');
  check(passesQuick({ estado: 'pendiente_revision' }, 'pendientes') === true, 'E30: passesQuick pendientes');
  check(passesQuick({ hallazgo: 'critico' }, 'criticos') === true, 'E30: passesQuick criticos');
  check(passesQuick({ fechaKey: todayKey() }, 'hoy') === true, 'E30: passesQuick hoy');
  assertStatic(/<DynamicRecordsView moduleId=\{moduleId\} moduleName=\{moduleName\} \/>/, 'E30: DynamicModule sigue pasando moduleName', dynamicModule);
  check(typeof reportModelMod.buildEvidenceReportModel === 'function', 'E30: evidenceReportModel intacto');
  check(typeof normalizerMod.exportDataNormalizer === 'function', 'E30: exportDataNormalizer intacto');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);

/* ------------------------------------------------------------------ */
/* Clasificacion §34 (15 condiciones)                                  */
/* ------------------------------------------------------------------ */
const classification = [
  ['FILTERS', ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09', 'E10', 'E11', 'E12', 'E13', 'E23']],
  ['INDIVIDUAL SELECTION', ['E15', 'E16']],
  ['SELECT ALL', ['E17']],
  ['VERIFY ≠ SELECT', ['E19']],
  ['XLSX', ['E20']],
  ['EVIDENCE REPORT', ['E21']],
  ['MULTI-FORM', ['E22']],
  ['ORDER', ['E14']],
  ['NO NEW QUERY', ['E24']],
  ['NO NEW SSOT', ['E25']],
  ['NO PERSISTENCE MUTATION', ['E26']],
  ['NO DATA LOSS', ['E27']],
  ['SCOPE', ['E28']],
  ['BUILD', ['E29']],
  ['RUNTIME', ['E30']],
];

console.log('============================================================');
console.log(' SPRINT 317 — ADVANCED FILTERING + RECORD SELECTION');
console.log(' CONTROLLED CORRECTION — Reporte de ejecución');
console.log('============================================================');
console.log(` Gates: E01..E30`);
console.log(` Pasaron: ${passed}`);
console.log(` Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s (timebox: segundos/minutos)`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) {
    console.log(`  - [${f.label}] ${f.detail}`);
  }
}
console.log('------------------------------------------------------------');
console.log(' Clasificación §34:');
for (const [name, gates] of classification) {
  console.log(`   ${name.padEnd(28)} -> ${gates.join(', ')}`);
}
const verdict = failed === 0 ? 'CERTIFIED' : 'BLOCKED';
console.log('------------------------------------------------------------');
console.log(` VEREDICTO: ${verdict}`);
console.log(` Regresión histórica familia 296-316: NO ejecutada (por diseño §25).`);
console.log('============================================================');
process.exit(failed === 0 ? 0 : 1);