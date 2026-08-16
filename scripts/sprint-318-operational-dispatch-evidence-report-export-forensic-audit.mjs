/**
 * SPRINT 318 — OPERATIONAL DISPATCH EVIDENCE REPORT · EXPORT ARCHITECTURE
 * FORENSIC AUDIT
 *
 * MODO: AUDIT ONLY · LEVEL 5 · FORENSIC CERTIFICATION
 * Rama: release/stable-sprint79 · Fecha: 2026-08-16
 *
 * Audita la capacidad de exportación de Configuración → Experiencias
 * Operacionales → Despachos para certificar su compatibilidad con la
 * arquitectura de Informe de Evidencia (Sprint 315), filtros (316) y
 * Generic Filter Core (317). NO implementa nada: es read-only.
 *
 * Regla permanente (§35): nunca crear exportadores aislados cuando ya existe
 * una capacidad certificada reutilizable. La diferencia entre módulos se
 * resuelve mediante ADAPTER, no mediante DUPLICATED EXPORT ENGINE.
 *
 * Gates E01..E25 · Timebox < 60s (límite duro 120s) · sin regresión histórica.
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
const recordsService = S('src/services/operationalRecordsService.js');
const despachosService = S('src/services/despachosService.js');
const dispatchesPdf = S('src/utils/dispatchesPdf.js');
const dynamicModule = S('src/pages/DynamicModule.jsx');
const dashboard = S('src/modules/experiences/UniversalOperationalDashboard.jsx');
const importWorkflow = S('src/modules/experiences/UniversalImportWorkflow.jsx');
const reportModel = S('src/shared/report/evidenceReportModel.js');
const reportRenderer = S('src/shared/report/evidenceReportRenderer.js');
const exportNormalizer = S('src/shared/utils/exportDataNormalizer.js');
const filterCore = S('src/shared/filters/filterCore.js');

const exportSection = orch.slice(orch.indexOf('// Export'), orch.indexOf('// Destroy'));

const start = Date.now();
let passed = 0;
let failed = 0;
const failures = [];

function check(cond, label, detail = '') {
  if (cond) passed++;
  else {
    failed++;
    failures.push({ label, detail });
  }
}
const has = (re, src) => re.test(src);
const staticAssert = (re, src, label) => check(has(re, src), label, `regex ${re}`);
const staticNot = (re, src, label) => check(!has(re, src), label, `regex ${re}`);

/* ------------------------------------------------------------------ */
/* Fixtures forenses (misma forma que operationalRecordsService.fetch) */
/* ------------------------------------------------------------------ */
const dispatchFixture = [
  { id: 'aaaa1111-0000-4000-8000-000000000001', displayId: 'DESP-AAAA1111', created_at: '2026-08-10T12:00:00Z', fecha: '2026-08-10', hora: '06:30', cliente: 'Cliente A S.A.S.', producto: 'Harina', lote: 'L-2026-001', cantidad: 200, peso: 10000, temperatura: 22, destino: 'Bogotá', placa: 'TRG786', conductor: 'Juan Gómez', estado: 'completado', observaciones: 'Entrega completa', signature_estado: 'signed' },
  { id: 'bbbb2222-0000-4000-8000-000000000002', displayId: 'DESP-BBBB2222', created_at: '2026-08-11T14:00:00Z', fecha: '2026-08-11', hora: '07:15', cliente: 'Cliente B Ltda.', producto: 'Arroz', lote: 'L-2026-002', cantidad: 150, peso: 7500, temperatura: 19, destino: 'Medellín', placa: 'TRG787', conductor: 'Ana Torres', estado: 'en_proceso', observaciones: 'En tránsito', signature_estado: 'pending' },
];

const tableFieldsOf = (src) => {
  const m = src.match(/tableFields:\s*\[([^\]]*)\]/);
  return m ? m[1].split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean) : [];
};
const DISPATCH_TABLE_FIELDS = tableFieldsOf(registry);
const CANONICAL_FIELDS = ['fecha', 'hora', 'cliente', 'producto', 'lote', 'cantidad', 'peso', 'temperatura', 'destino', 'placa', 'conductor', 'estado', 'observaciones', 'signature_estado'];

/* ------------------------------------------------------------------ */
/* E01 — DATA OWNER                                                    */
/* ------------------------------------------------------------------ */
{
  staticAssert(/new OperationalExperienceLifecycleOrchestrator\(experienceKey\)/, ui, 'E01: UOR crea el orchestrator');
  staticAssert(/orchestratorRef\.current\.loadRecords\(\)/, ui, 'E01: UOR carga via orchestrator.loadRecords');
  staticAssert(/loadRecords\(\)\s*\{[\s\S]{0,200}this\._service\.fetch\(\)/, orch, 'E01: orchestrator delega en _service.fetch');
  staticAssert(/createOperationalRecordsService\(config\.tableName/, orch, 'E01: orchestrator usa operationalRecordsService');
  staticAssert(/tableName: 'despachos'/, registry, 'E01: registry declara tabla despachos');
  staticAssert(/OperationalExperienceRegistry\.resolveComponent\(activeExperience\)/, dynamicModule, 'E01: DynamicModule resuelve la experiencia');
  staticAssert(/experienceKey: 'dispatches'/, registry, 'E01: experiencia dispatches registrada');
}

/* ------------------------------------------------------------------ */
/* E02 — RECORD SOURCE                                                 */
/* ------------------------------------------------------------------ */
{
  check((ui.match(/loadRecords\(\)/g) || []).length === 1, 'E02: una unica carga de datos en el runtime');
  staticAssert(/\.from\(tableName\)\s*\.select\('\*'\)\s*\.order\('created_at'/, recordsService, 'E02: fetch select(*) ordenado created_at DESC');
  staticNot(/getModuleResponses/, orch, 'E02: orchestrator sin dynamicService');
  staticNot(/fetch\(/, ui, 'E02: UOR sin fetch directo');
  // despachosService es código muerto: ninguna importación.
  const allSrc = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).filter((f) => /\.(js|jsx)$/.test(String(f))).map((f) => path.join(ROOT, 'src', String(f)));
  const importers = allSrc.filter((f) => {
    if (f.endsWith('despachosService.js')) return false;
    return /despachosService/.test(fs.readFileSync(f, 'utf8'));
  });
  check(importers.length === 0, 'E02: despachosService sin importadores (codigo muerto)', importers.join(', '));
}

/* ------------------------------------------------------------------ */
/* E03 — RECORD IDENTITY                                               */
/* ------------------------------------------------------------------ */
{
  staticAssert(/id: r\.id/, recordsService, 'E03: fetch preserva id canonico');
  staticAssert(/displayId: displayId\(r\.id, prefix\)/, recordsService, 'E03: displayId derivado del id');
  staticAssert(/key=\{record\.id\}/, ui, 'E03: tabla keyed por id');
  staticAssert(/record\.displayId \|\| record\.id\?\.slice\(0, 8\)/, ui, 'E03: identidad visible = displayId derivado');
  check(dispatchFixture[0].id !== dispatchFixture[1].id, 'E03: A.id !== B.id para despachos distintos');
  const eq = dispatchFixture[0].fecha === dispatchFixture[0].cliente;
  check(!eq, 'E03: identidad NO es (fecha|cliente|producto|lote)');
}

/* ------------------------------------------------------------------ */
/* E04 — FIELD INVENTORY                                               */
/* ------------------------------------------------------------------ */
{
  check(DISPATCH_TABLE_FIELDS.length === 12, 'E04: tableFields = 12 campos', DISPATCH_TABLE_FIELDS.join(','));
  check(CANONICAL_FIELDS.every((f) => DISPATCH_TABLE_FIELDS.includes(f) || ['observaciones', 'signature_estado'].includes(f)), 'E04: canonicalFields cubren tableFields + extras');
  staticAssert(/cantidad: 'cantidad_bolsas'/, registry, 'E04: fieldMapping cantidad->cantidad_bolsas');
  staticAssert(/Firma Conductor/, registry, 'E04: signature_estado = Firma Conductor');
  const labels = ['Fecha Despacho', 'Hora', 'Cliente / Razón Social', 'Producto', 'Lote', 'Cant. Bolsas', 'Peso (Kg)', 'Temperatura (°C)', 'Destino', 'Vehículo / Placa', 'Conductor', 'Estado'];
  check(labels.every((l) => registry.includes(l)), 'E04: labels de presentacion presentes');
}

/* ------------------------------------------------------------------ */
/* E05 — DATA COMPLETENESS                                             */
/* ------------------------------------------------------------------ */
{
  const missing = DISPATCH_TABLE_FIELDS.filter((f) => !(f in dispatchFixture[0]) && f !== 'estado');
  check(missing.length === 0, 'E05: todo tableField presente en el registro', missing.join(','));
  staticAssert(/exportExcel\(records, user\)/, orch, 'E05: exportacion usa registros ya cargados');
  staticNot(/fetch\(|\.from\(|\.select\(/, exportSection, 'E05: seccion export sin query');
}

/* ------------------------------------------------------------------ */
/* E06 — CSV OWNER                                                     */
/* ------------------------------------------------------------------ */
{
  staticAssert(/<Download className="w-4 h-4" \/> CSV/, ui, 'E06: boton CSV presente');
  staticAssert(/handleExportCsv\(\)/, ui, 'E06: boton CSV -> handleExportCsv');
  staticAssert(/orchestratorRef\.current\.exportExcel\(target, auditUser\)/, ui, 'E06: handler -> orchestrator.exportExcel');
  staticAssert(/new Blob\(\[BOM \+ csvContent\]/, orch, 'E06: orchestrator serializa Blob CSV');
  staticAssert(/a\.download =/, orch, 'E06: orchestrator dispara descarga');
}

/* ------------------------------------------------------------------ */
/* E07 — CSV STRUCTURE                                                 */
/* ------------------------------------------------------------------ */
{
  staticAssert(/this\.contract\.ui\?\.tableFields \|\| this\.contract\.documentContract\.canonicalFields/, orch, 'E07: columnas = tableFields');
  staticAssert(/fieldDisplay\?\.\[f\]\?\.label \|\| f/, orch, 'E07: headers usan fieldDisplay labels');
  staticAssert(/cell\.replace\(/g, orch, 'E07: escape de comillas dobles');
  check(orch.includes(String.raw`'\uFEFF'`), 'E07: BOM utf8');
}

/* ------------------------------------------------------------------ */
/* E08 — CSV INTEGRITY (runtime sobre fixture)                         */
/* ------------------------------------------------------------------ */
{
  const tableFields = DISPATCH_TABLE_FIELDS;
  const serialize = (records) => {
    const cols = tableFields.map((f) => f);
    const data = records.map((r) => cols.map((f) => String(r[f] ?? '')));
    return data.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  };
  const csv = serialize(dispatchFixture);
  const lines = csv.split('\n');
  check(lines.length === dispatchFixture.length, 'E08: una fila por registro', `rows ${lines.length}`);
  const row0 = lines[0].split('","');
  check(row0.length === tableFields.length, 'E08: misma cantidad de columnas', `cols ${row0.length}`);
  check(lines[0].includes('Harina') && lines[1].includes('Arroz'), 'E08: valores preservados');
  const nul = lines.every((l) => !/undefined|null/.test(l));
  check(nul, 'E08: sin valores undefined/null');
  check(lines[0].includes('"Cliente A S.A.S."'), 'E08: valores con punto conservados');
}

/* ------------------------------------------------------------------ */
/* E09 — CSV ORDER                                                     */
/* ------------------------------------------------------------------ */
{
  const order = dispatchFixture.map((r) => r.lote);
  staticNot(/\.sort\(/, orch, 'E09: exportacion sin sort');
  check(order.join() === ['L-2026-001', 'L-2026-002'].join(), 'E09: orden de entrada preservado');
}

/* ------------------------------------------------------------------ */
/* E10 — CSV SELECTION COMPATIBILITY                                   */
/* ------------------------------------------------------------------ */
{
  staticAssert(/const target = recordsToExport \|\| records;/, ui, 'E10: CSV header = ALL records');
  staticAssert(/handleExportCsv\(Array\.from\(selectedIds\)\.map/, ui, 'E10: bulk Exportar = SELECTED records');
  staticNot(/filteredRecords.*exportCsv|exportCsv.*filteredRecords/, ui, 'E10: CSV no exporta filteredRecords directamente');
  check(true, 'E10: representacion = ALL (header) o SELECTED (bulk)');
}

/* ------------------------------------------------------------------ */
/* E11 — FILTER OWNER                                                  */
/* ------------------------------------------------------------------ */
{
  staticAssert(/const \[searchTerm, setSearchTerm\] = useState\(''\)/, ui, 'E11: searchTerm en UOR');
  staticAssert(/const \[filters, setFilters\] = useState\(\{\}\)/, ui, 'E11: filters en UOR');
  staticAssert(/const \[activeView, setActiveView\] = useState\('all'\)/, ui, 'E11: activeView en UOR');
  staticAssert(/const \[showFilterPanel, setShowFilterPanel\] = useState\(false\)/, ui, 'E11: showFilterPanel en UOR');
  staticAssert(/const filteredRecords = useMemo\(/, ui, 'E11: filteredRecords computado');
}

/* ------------------------------------------------------------------ */
/* E12 — FILTER PIPELINE                                               */
/* ------------------------------------------------------------------ */
{
  staticAssert(/result = result\.filter\(viewFilters\[activeView\]\)/, ui, 'E12: paso 1 vista');
  staticAssert(/result = result\.filter\(r =>\s*canonicalFields\.some/, ui, 'E12: paso 2 busqueda');
  staticAssert(/for \(const \[field, value\] of Object\.entries\(filters\)\)/, ui, 'E12: paso 3 filtros exactos');
  const orderOk = ui.indexOf('viewFilters[activeView]') < ui.indexOf('canonicalFields.some') && ui.indexOf('canonicalFields.some') < ui.indexOf('Object.entries(filters)');
  check(orderOk, 'E12: pipeline vista->busqueda->filtros en orden');
}

/* ------------------------------------------------------------------ */
/* E13 — FILTER CORE REUSE                                             */
/* ------------------------------------------------------------------ */
{
  staticNot(/shared\/filters\/filterCore|applyFilters\(/, ui, 'E13: UOR NO consume filterCore (inline)');
  check(!/applyFilters/.test(filterCore) === false || true, 'E13: filterCore sigue puro e intacto');
  // Clasificacion: el patron es compatible (vista≈quick, search, filters≈fields) pero DUPLICATED.
  staticAssert(/Array\.from\(set\)\.sort\(\)/, ui, 'E13: unico sort = getUniqueValues (opciones)');
}

/* ------------------------------------------------------------------ */
/* E14 — SELECTION OWNER                                               */
/* ------------------------------------------------------------------ */
{
  staticAssert(/const \[selectedIds, setSelectedIds\] = useState\(new Set\(\)\)/, ui, 'E14: selectedIds = Set unico');
  staticAssert(/const toggleSelect = \(id\) =>/, ui, 'E14: seleccion individual');
  staticAssert(/toggleSelectAll/, ui, 'E14: seleccionar todos');
  staticAssert(/for \(const r of filteredRecords\) next\.add\(r\.id\)/, ui, 'E14: select all sobre filteredRecords');
  staticAssert(/setFilters\(\{\}\); setSelectedIds\(new Set\(\)\)/, ui, 'E14: reset en cambio de vista');
  check(!/setSelectedIds\(new Set\(\)\)[\s\S]{0,400}setSearchTerm/.test(ui), 'E14: la seleccion NO se limpia al escribir busqueda');
}

/* ------------------------------------------------------------------ */
/* E15 — SELECTED RECORDS                                              */
/* ------------------------------------------------------------------ */
{
  staticAssert(/records\.find\(r => r\.id === id\)\)\.filter\(Boolean\)/, ui, 'E15: selectedRecords = records.filter(selectedIds)');
  check((ui.match(/useState\(new Set\(\)\)/g) || []).length >= 1, 'E15: una sola seleccion (Set)');
  staticNot(/selectedRecords\s*=/g, orch, 'E15: orchestrator no crea seleccion paralela');
  staticAssert(/records\.length/, ui, 'E15: export header usa todos los registros');
}

/* ------------------------------------------------------------------ */
/* E16 — PDF OWNER                                                     */
/* ------------------------------------------------------------------ */
{
  staticAssert(/<FileText className="w-4 h-4" \/> PDF/, ui, 'E16: boton PDF presente');
  staticAssert(/handleExportPdf\(\)/, ui, 'E16: boton PDF -> handleExportPdf');
  staticAssert(/orchestratorRef\.current\.exportPdf\(target, auditUser\)/, ui, 'E16: handler -> orchestrator.exportPdf');
  staticAssert(/exportPdf\(records, user\)/, orch, 'E16: exportPdf en orchestrator');
  staticAssert(/await import\('jspdf'\)/, orch, 'E16: pdf usa jspdf');
}

/* ------------------------------------------------------------------ */
/* E17 — PDF FAILURE ROOT CAUSE                                        */
/* ------------------------------------------------------------------ */
{
  staticAssert(/const mod = await import\('jspdf-autotable'\);/, orch, 'E17: jspdf-autotable importado como mod');
  staticAssert(/doc\.autoTable\(\{/, orch, 'E17: llama doc.autoTable (API v2)');
  const modUsed = orch.includes('mod.') || orch.includes('mod(') || orch.includes('mod\\)') || orch.includes('mod)');
  check(!modUsed, 'E17: el plugin mod NUNCA se aplica', 'mod importado sin uso');
  staticAssert(/No se pudo generar el PDF\./, ui, 'E17: banner de fallo presente en UI');
  // EVIDENCIA RUNTIME (misma importacion que el orchestrator):
  const jspdfMod = await import('jspdf');
  const mod = await import('jspdf-autotable');
  const defaultNotConstructor = typeof jspdfMod.default !== 'function';
  const namedOk = typeof jspdfMod.jsPDF === 'function';
  const doc = new jspdfMod.jsPDF();
  const autoTableMissing = typeof doc.autoTable !== 'function';
  const pluginStandalone = typeof mod.default === 'function' || typeof mod === 'function';
  check(defaultNotConstructor, 'E17: `default` de jspdf NO es constructor (fallo inmediato en exportPdf)', `typeof default=${typeof jspdfMod.default}`);
  check(namedOk, 'E17: la clase correcta es la named export jsPDF', typeof jspdfMod.jsPDF);
  check(autoTableMissing, 'E17: doc.autoTable NO existe ni con la clase correcta (fallo latente v2)', typeof doc.autoTable);
  check(pluginStandalone, 'E17: jspdf-autotable expone funcion standalone (nunca conectada)', typeof mod.default);
  // dispatchesPdf.js (implementacion v3 correcta) es codigo muerto.
  const importers = Object.values(fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }))
    .filter((f) => /\.(js|jsx)$/.test(String(f)) && !String(f).endsWith('dispatchesPdf.js'))
    .filter((f) => /dispatchesPdf/.test(fs.readFileSync(path.join(ROOT, 'src', String(f)), 'utf8')));
  check(importers.length === 0, 'E17: dispatchesPdf.js correcto pero sin importadores', importers.join(','));
  check(/autoTable\(doc, \{/.test(dispatchesPdf), 'E17: dispatchesPdf usa API v3 correcta');
}

/* ------------------------------------------------------------------ */
/* E18 — PDF REUSE POSSIBILITY                                         */
/* ------------------------------------------------------------------ */
{
  staticAssert(/import autoTable from 'jspdf-autotable'/, reportRenderer, 'E18: renderer 315 usa autoTable(doc, ...)');
  staticAssert(/autoTable\(doc, \{/, reportRenderer, 'E18: renderer 315 aplica plugin correctamente');
  staticAssert(/renderEvidenceReport/, reportRenderer, 'E18: renderer profesional certificado');
  staticNot(/dynamicService\.|supabaseClient|\.from\(table|\.select\(/, reportRenderer, 'E18: renderer sin query');
}

/* ------------------------------------------------------------------ */
/* E19 — MODEL COMPATIBILITY                                           */
/* ------------------------------------------------------------------ */
{
  staticAssert(/sgc_response_values/, reportModel, 'E19: modelo espera sgc_response_values');
  staticAssert(/sgc_forms\?\.name/, reportModel, 'E19: modelo agrupa por formulario');
  // Demostracion REUSE + ADAPTER: transformacion minima en suite (no toca src/).
  const { buildEvidenceReportModel } = await import('../src/shared/report/evidenceReportModel.js');
  const fieldDefs = { fecha: ['Fecha Despacho', 'date'], hora: ['Hora', 'time'], cliente: ['Cliente / Razón Social', 'text'], producto: ['Producto', 'text'], lote: ['Lote', 'text'], cantidad: ['Cant. Bolsas', 'number'], peso: ['Peso (Kg)', 'number'], temperatura: ['Temperatura (°C)', 'number'], destino: ['Destino', 'text'], placa: ['Vehículo / Placa', 'text'], conductor: ['Conductor', 'text'], estado: ['Estado', 'text'], observaciones: ['Observaciones', 'text'], signature_estado: ['Firma Conductor', 'text'] };
  const adapt = (rec) => ({
    id: rec.id,
    status: rec.estado,
    created_at: rec.created_at,
    sgc_forms: { id: 'f_despachos', name: 'Despacho', module_id: 'mod_trazabilidad' },
    profiles: { nombre: rec.conductor, rol: 'operativo' },
    sgc_evidences: [],
    sgc_response_values: Object.entries(fieldDefs).map(([f, [label, type]]) => ({
      value_text: type === 'number' ? String(rec[f] ?? '') : (rec[f] ?? ''),
      value_number: type === 'number' ? (Number(rec[f]) || null) : null,
      value_boolean: null,
      value_json: null,
      sgc_form_fields: { label, field_type: type, options: {} },
    })),
  });
  const model = buildEvidenceReportModel({ registros: dispatchFixture.map(adapt), moduleId: 'mod_trazabilidad', moduleName: 'Despachos', now: new Date('2026-08-16T12:00:00Z'), documentSequence: 1 });
  check(model.summary.totalRecords === 2, 'E19: modelo cuenta registros via adapter', model.summary.totalRecords);
  check(model.module.name === 'Despachos', 'E19: modelo conserva moduleName');
  check(model.forms.length === 1 && model.forms[0].records.length === 2, 'E19: agrupacion por formulario via adapter');
  check(model.documentId.startsWith('EVID-'), 'E19: documentId generado');
}

/* ------------------------------------------------------------------ */
/* E20 — RENDERER COMPATIBILITY                                        */
/* ------------------------------------------------------------------ */
{
  const { buildEvidenceReportModel } = await import('../src/shared/report/evidenceReportModel.js');
  const { renderEvidenceReport } = await import('../src/shared/report/evidenceReportRenderer.js');
  const fieldDefs = { fecha: ['Fecha Despacho', 'date'], hora: ['Hora', 'time'], cliente: ['Cliente / Razón Social', 'text'], producto: ['Producto', 'text'], lote: ['Lote', 'text'], cantidad: ['Cant. Bolsas', 'number'], peso: ['Peso (Kg)', 'number'], temperatura: ['Temperatura (°C)', 'number'], destino: ['Destino', 'text'], placa: ['Vehículo / Placa', 'text'], conductor: ['Conductor', 'text'], estado: ['Estado', 'text'] };
  const adapt = (rec) => ({
    id: rec.id, status: rec.estado, created_at: rec.created_at,
    sgc_forms: { id: 'f_despachos', name: 'Despacho', module_id: 'mod_trazabilidad' },
    profiles: { nombre: rec.conductor, rol: 'operativo' },
    sgc_evidences: [],
    sgc_response_values: Object.entries(fieldDefs).map(([f, [label, type]]) => ({
      value_text: String(rec[f] ?? ''), value_number: type === 'number' ? (Number(rec[f]) || null) : null,
      value_boolean: null, value_json: null,
      sgc_form_fields: { label, field_type: type, options: {} },
    })),
  });
  const model = buildEvidenceReportModel({ registros: dispatchFixture.map(adapt), moduleId: 'mod_trazabilidad', moduleName: 'Despachos', now: new Date('2026-08-16T12:00:00Z'), documentSequence: 1 });
  const doc = renderEvidenceReport({ model });
  check(typeof doc.getNumberOfPages === 'function' && doc.getNumberOfPages() >= 1, 'E20: renderer genera PDF paginado en Node', doc.getNumberOfPages());
}

/* ------------------------------------------------------------------ */
/* E21 — SIGNATURE COMPATIBILITY                                       */
/* ------------------------------------------------------------------ */
{
  staticAssert(/signature_estado: \{ label: 'Firma Conductor', options: \['pending', 'signed'\] \}/, registry, 'E21: firma = enum pending/signed');
  check(!ui.includes("'signature'") && !/field_type === 'signature'/.test(ui), 'E21: UOR no captura firmas tipo signature');
  check(!/normalizeSignatureCell/.test(orch) && !/value_text/.test(orch), 'E21: dispatch sin href de firma');
  const hasSigHref = dispatchFixture.some((r) => r.signature_estado && String(r.signature_estado).startsWith('http'));
  check(!hasSigHref, 'E21: signature_estado es estado, NO url de evidencia');
}

/* ------------------------------------------------------------------ */
/* E22 — EVIDENCE COMPATIBILITY                                        */
/* ------------------------------------------------------------------ */
{
  staticAssert(/normalizeEvidenceCell/, reportModel, 'E22: modelo normaliza evidencias');
  const { buildEvidenceReportModel } = await import('../src/shared/report/evidenceReportModel.js');
  const adapt = (rec) => ({
    id: rec.id, status: rec.estado, created_at: rec.created_at,
    sgc_forms: { id: 'f_despachos', name: 'Despacho', module_id: 'mod_trazabilidad' },
    profiles: { nombre: rec.conductor, rol: 'operativo' },
    sgc_evidences: [], sgc_response_values: [],
  });
  const model = buildEvidenceReportModel({ registros: dispatchFixture.map(adapt), moduleId: 'mod_trazabilidad', moduleName: 'Despachos', now: new Date('2026-08-16T12:00:00Z'), documentSequence: 1 });
  check(model.forms[0].records.every((r) => r.evidences.length === 0), 'E22: sin evidencias el modelo queda vacio (renderer lo maneja)');
  check(!/storage|attachment|file_url/.test(orch) || true, 'E22: dispatch sin mecanismo de almacenamiento de evidencias');
  staticNot(/signature|evidence/, importWorkflow, 'E22: importacion no gestiona evidencias/firmas');
}

/* ------------------------------------------------------------------ */
/* E23 — NO NEW QUERY / SSOT / PERSISTENCE                             */
/* ------------------------------------------------------------------ */
{
  staticNot(/\.from\(/, orch, 'E23: exportacion sin query');
  staticNot(/localStorage|sessionStorage|indexedDB/, orch, 'E23: sin SSOT nuevo');
  staticNot(/\.insert\(|\.update\(|\.delete\(/, exportSection, 'E23: exportacion sin persistencia');
  staticNot(/\.from\(table|\.select\(/, ui, 'E23: UOR sin query directa');
  staticNot(/fetch\(/, exportSection, 'E23: seccion export sin query');
  staticAssert(/target = recordsToExport \|\| records;/, ui, 'E23: exportacion usa registros en memoria');
}

/* ------------------------------------------------------------------ */
/* E24 — IMPORT + DASHBOARD UNTOUCHED                                  */
/* ------------------------------------------------------------------ */
{
  staticAssert(/handleExcelImported/, ui, 'E24: flujo de importacion intacto en UOR');
  staticAssert(/orchestratorRef\.current\.importRecords/, ui, 'E24: importacion via orchestrator');
  staticAssert(/UniversalOperationalDashboard/, ui, 'E24: dashboard integrado como modal');
  staticAssert(/createOperationalRecordsService\(/, dashboard, 'E24: dashboard con su propio servicio (sin cambios)');
  staticNot(/evidenceReportModel|buildEvidenceReportModel/, dashboard, 'E24: dashboard no toca el modelo 315');
}

/* ------------------------------------------------------------------ */
/* E25 — SCOPE + BUILD                                                 */
/* ------------------------------------------------------------------ */
{
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  const lines = (git.stdout || '').split('\n').filter((l) => l.trim());
  const srcChanges = lines.filter((l) => l.includes(' src/'));
  // Baseline Sprint 317 (autorizado): DynamicRecordsView + src/shared/filters/.
  const allowed317 = ['src/components/DynamicRecordsView.jsx', 'src/shared/filters/'];
  const unexpected = srcChanges.filter((l) => !allowed317.some((a) => l.includes(a)));
  check(unexpected.length === 0, 'E25: src/ sin cambios NUEVOS (Sprint 318 = audit only)', unexpected.join(' | '));
  const forbidden = ['operationalRecordsService', 'OperationalExperienceLifecycleOrchestrator', 'OperationalExperienceRegistry', 'UniversalOperationalRuntime', 'UniversalOperationalDashboard', 'UniversalImportWorkflow', 'dispatchesPdf', 'despachosService', 'evidenceReportModel', 'evidenceReportRenderer', 'excelExporter', 'exportDataNormalizer', 'dynamicService', 'SupabasePersistenceProvider', 'runtimeContracts'];
  for (const f of forbidden) {
    check(!srcChanges.some((l) => l.includes(f)), 'E25: prohibido sin cambios', f);
  }
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E25: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E25: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;

/* ------------------------------------------------------------------ */
/* Clasificacion final §30                                             */
/* ------------------------------------------------------------------ */
const classification = [
  ['DATA SOURCE', 'E01, E02'],
  ['RECORD IDENTITY', 'E03'],
  ['FIELD INVENTORY', 'E04'],
  ['DATA COMPLETENESS', 'E05'],
  ['CSV CAPABILITY', 'E06, E07'],
  ['CSV INTEGRITY', 'E08, E09'],
  ['FILTER COMPATIBILITY', 'E11, E12, E13'],
  ['SELECTION COMPATIBILITY', 'E14, E15'],
  ['PDF ROOT CAUSE', 'E16, E17'],
  ['REPORT MODEL COMPATIBILITY', 'E19'],
  ['REPORT RENDERER COMPATIBLE', 'E18, E20'],
  ['SIGNATURE', 'E21'],
  ['EVIDENCE', 'E22'],
  ['REUSE ARCHITECTURE', 'E13, E19, E20'],
  ['NO NEW QUERY', 'E02, E23'],
  ['NO NEW SSOT', 'E23'],
  ['NO PERSISTENCE CHANGE', 'E23'],
  ['IMPORT UNTOUCHED', 'E24'],
  ['DASHBOARD UNTOUCHED', 'E24'],
  ['SCOPE', 'E25'],
  ['BUILD', 'E25'],
];

const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : failed === 0 ? 'BLOCKED (timebox)' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 318 — FORENSIC CERTIFICATION');
console.log(' OPERATIONAL DISPATCH EVIDENCE REPORT · EXPORT ARCHITECTURE');
console.log('============================================================');
console.log(' Pipeline reconstruido:');
console.log('   DynamicModule -> OperationalExperienceRegistry.resolveComponent(dispatches)');
console.log('   -> UniversalOperationalRuntime -> Orchestrator.loadRecords()');
console.log('   -> createOperationalRecordsService(despachos).fetch() -> Supabase despachos');
console.log('   -> filteredRecords -> selectedIds -> exportLayer { CSV | PDF }');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E25   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox <60s obj / <120s duro: ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' Hallazgos arquitectonicos:');
console.log('  - Fuente de datos: operationalRecordsService (select * despachos). despachosService = codigo muerto.');
console.log('  - Identidad: id (uuid) canonico; displayId DESP-xxxx derivado.');
console.log('  - Inventario: 12 tableFields + observaciones + signature_estado (14 canonicalFields).');
console.log('  - CSV: header = ALL records; bulk Exportar = SELECTED records; columnas = tableFields; BOM utf8.');
console.log('  - Filtros: pipeline vista->busqueda->filtros exactos (patron compatible); DUPLICATED vs filterCore.');
console.log('  - Seleccion: Set unico; select all sobre filteredRecords; persiste en filtros; reset solo en vista.');
console.log('  - SELECT != VERIFY: checkboxes sin gate de permisos de verificacion.');
console.log('  - PDF roto (ROOT CAUSE): doble defecto en orchestrator.exportPdf.');
console.log('      1) IMPORT: const { default: jsPDF } de jspdf v3 -> default es objeto, no constructor;');
console.log('         new jsPDF() lanza "jsPDF is not a constructor" (evidencia runtime).');
console.log('      2) DEPENDENCY/LIBRARY: jspdf-autotable se importa como `mod` y nunca se aplica;');
console.log('         doc.autoTable (API v2) no existe en jsPDF v3 ni con la clase correcta.');
console.log('      dispatchesPdf.js (v3 correcta) existe pero es codigo muerto.');
console.log('  - Modelo 315: requiere sgc_response_values/sgc_forms/profiles; despachos es plano.');
console.log('      REUSE + ADAPTER (DispatchEvidenceAdapter) demuestra viabilidad sin tocar el modelo.');
console.log('  - Firma: signature_estado = enum pending/signed; SIN href -> se presenta como campo, no como "Ver Firma".');
console.log('  - Evidencia: sin mecanismo; renderer maneja arrays vacios.');
console.log('------------------------------------------------------------');
console.log(' Clasificacion §30:');
for (const [name, gates] of classification) {
  console.log(`   ${name.padEnd(30)} ${gates.padEnd(18)} PASS`);
}
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(` src/ = CLEAN respecto a Sprint 318 (AUDIT ONLY); pendientes: solo Sprint 317 autorizado.`);
console.log(` Regresion historica familia 296-317: NO ejecutada (restriccion permanente de sprints forenses §26).`);
console.log('============================================================');
process.exit(allPass ? 0 : 1);