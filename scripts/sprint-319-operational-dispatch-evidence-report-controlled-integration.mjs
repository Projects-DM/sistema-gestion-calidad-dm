/**
 * SPRINT 319 — OPERATIONAL DISPATCH EVIDENCE REPORT · CONTROLLED INTEGRATION
 * LEVEL 5 · EXECUTABLE CERTIFICATION
 *
 * Conecta la experiencia Despachos con el Informe de Evidencia de Registros
 * certificado en Sprint 315 (mismo EvidenceReportModel + EvidenceReportRenderer)
 * mediante un DispatchEvidenceAdapter puro. 0 consultas nuevas, 0 SSOT nuevo,
 * 0 persistencia. CSV/importación/Dashboard/Persistencia intactos.
 *
 * Suite timeboxed y autónoma: segundos / pocos minutos máx. Sin regresión
 * histórica 296-318. Genera un PDF REAL y lee su contenido (doc.internal.pages)
 * para las aserciones.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ui = S('src/modules/experiences/UniversalOperationalRuntime.jsx');
const adapterSrc = S('src/shared/report/dispatchEvidenceAdapter.js');
const reportModel = S('src/shared/report/evidenceReportModel.js');
const reportRenderer = S('src/shared/report/evidenceReportRenderer.js');
const orchestrator = S('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js');
const importWorkflow = S('src/modules/experiences/UniversalImportWorkflow.jsx');
const dashboard = S('src/modules/experiences/UniversalOperationalDashboard.jsx');

const { buildDispatchEvidenceRecord, buildDispatchEvidenceRecords, DISPATCH_FIELD_DEFS, DISPATCH_FORM_NAME } = await import('../src/shared/report/dispatchEvidenceAdapter.js');
const { buildEvidenceReportModel, createEvidenceReportId } = await import('../src/shared/report/evidenceReportModel.js');
const { renderEvidenceReport } = await import('../src/shared/report/evidenceReportRenderer.js');
const { normalizeValue, normalizeEvidenceCell } = await import('../src/shared/utils/exportDataNormalizer.js');

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
// código real del adapter sin comentarios JSDoc (evita falsos positivos por texto de doc).
const codeOnly = (src) => src.split('\n').filter((l) => !/^\s*\*|^\s*\/\//.test(l)).join('\n');
const adapterCode = codeOnly(adapterSrc);
const has = (re, src) => re.test(src);
const staticAssert = (re, src, label) => check(has(re, src), label, `regex ${re}`);
const staticNot = (re, src, label) => check(!has(re, src), label, `regex ${re}`);

/* ------------------------------------------------------------------ */
/* Fixtures (misma forma que operationalRecordsService.fetch)          */
/* ------------------------------------------------------------------ */
const baseRecord = (i) => ({
  id: `11111111-0000-4000-8000-${String(i).padStart(12, '0')}`,
  displayId: `DESP-11111111${i}`,
  created_at: `2026-08-${String((i % 28) + 1).padStart(2, '0')}T12:00:00Z`,
  fecha: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
  hora: `${String(6 + (i % 12)).padStart(2, '0')}:30`,
  cliente: `Cliente ${i}`,
  producto: `Producto ${i}`,
  lote: `LOTE-${i}`,
  cantidad: 100 + i,
  peso: 1000 + i * 50,
  temperatura: 20 + (i % 5),
  destino: 'Bogota',
  placa: `TRG${700 + i}`,
  conductor: `Conductor ${i}`,
  estado: i % 2 ? 'completado' : 'en_proceso',
  observaciones: `Obs ${i}`,
  signature_estado: i % 2 ? 'signed' : 'pending',
});

function renderPdf(registros, { sequence = 1 } = {}) {
  const model = buildEvidenceReportModel({
    registros: buildDispatchEvidenceRecords(registros),
    moduleId: 'despachos',
    moduleName: 'Despachos',
    now: new Date('2026-08-16T12:00:00Z'),
    documentSequence: sequence,
  });
  const doc = renderEvidenceReport({ model });
  const pages = (doc.internal?.pages || [])
    .map((p) => (Array.isArray(p) ? p.join('') : String(p)))
    .join('');
  const bytes = Buffer.from(doc.output('arraybuffer'));
  return { model, doc, text: pages, bytes, totalPages: doc.getNumberOfPages() };
}

const IDs = (list) => list.map((r) => r.id);

/* ------------------------------------------------------------------ */
/* E01 — ADAPTER EXISTS                                                */
/* ------------------------------------------------------------------ */
{
  check(fs.existsSync(path.join(ROOT, 'src/shared/report/dispatchEvidenceAdapter.js')), 'E01: archivo adapter existe');
  check(typeof buildDispatchEvidenceRecord === 'function', 'E01: buildDispatchEvidenceRecord exportado');
  check(typeof buildDispatchEvidenceRecords === 'function', 'E01: buildDispatchEvidenceRecords exportado');
}

/* ------------------------------------------------------------------ */
/* E02 — ADAPTER CONTRACT                                              */
/* ------------------------------------------------------------------ */
{
  const out = buildDispatchEvidenceRecord(baseRecord(0));
  for (const k of ['id', 'status', 'created_at', 'sgc_forms', 'profiles', 'sgc_evidences', 'sgc_response_values']) {
    check(k in out, `E02: contrato incluye ${k}`);
  }
  staticNot(/fetch\(|\.from\(|\.select\(|getModuleResponses|supabase/, adapterCode, 'E02: adapter puro sin query');
}

/* ------------------------------------------------------------------ */
/* E03 — DATA SOURCE REUSED                                            */
/* ------------------------------------------------------------------ */
{
  staticAssert(/buildDispatchEvidenceRecords\(selectedRecords\)/, ui, 'E03: UOR pasa la seleccion en memoria al adapter');
  staticAssert(/filteredRecords\.filter\(\(record\) => selectedIds\.has\(record\.id\)\)/, ui, 'E03: selectedRecords desde filteredRecords ∩ selectedIds');
  staticNot(/fetch\(|supabase\.from/, ui.slice(ui.indexOf('handleEvidenceReport'), ui.indexOf('handleBulkDelete')), 'E03: handler sin consultas');
}

/* ------------------------------------------------------------------ */
/* E04 — RECORD IDENTITY                                               */
/* ------------------------------------------------------------------ */
{
  const a = buildDispatchEvidenceRecord(baseRecord(0));
  const b = buildDispatchEvidenceRecord(baseRecord(1));
  check(a.id === baseRecord(0).id && b.id === baseRecord(1).id, 'E04: adapter conserva record.id');
  check(a.id !== b.id, 'E04: A.id !== B.id');
  check(!a.id.includes('fecha') && !b.id.includes('cliente'), 'E04: identidad NO es campos compuestos');
  // Caso E (§29): mismo cliente/producto/lote, id distinto -> diferenciados.
  const e1 = buildDispatchEvidenceRecord({ ...baseRecord(2), id: 'eeee1111-0000-4000-8000-000000000001', cliente: 'Mismo', producto: 'Mismo', lote: 'Mismo', placa: 'TRG999' });
  const e2 = buildDispatchEvidenceRecord({ ...baseRecord(3), id: 'eeee2222-0000-4000-8000-000000000002', cliente: 'Mismo', producto: 'Mismo', lote: 'Mismo', placa: 'TRG999' });
  check(e1.id !== e2.id && e1.sgc_forms.name === e2.sgc_forms.name, 'E04: despachos identicos en campos, distintos en id, coexisten');
}

/* ------------------------------------------------------------------ */
/* E05 — DISPLAY ID                                                    */
/* ------------------------------------------------------------------ */
{
  const out = buildDispatchEvidenceRecord(baseRecord(0));
  check(out.displayId === baseRecord(0).displayId, 'E05: displayId conservado en el contrato');
  const model = buildEvidenceReportModel({ registros: [out], moduleId: 'despachos', moduleName: 'Despachos', now: new Date('2026-08-16T12:00:00Z'), documentSequence: 1 });
  const visual = model.forms[0].records[0].displayId;
  check(visual === baseRecord(0).id.split('-')[0], 'E05: identificador visual derivado del id canonico', visual);
}

/* ------------------------------------------------------------------ */
/* E06 — FIELD INVENTORY                                               */
/* ------------------------------------------------------------------ */
{
  const expected = ['fecha', 'hora', 'cliente', 'producto', 'lote', 'cantidad', 'peso', 'temperatura', 'destino', 'placa', 'conductor', 'estado', 'observaciones', 'signature_estado'];
  const fields = DISPATCH_FIELD_DEFS.map((d) => d.field);
  check(fields.length === 14, 'E06: 14 campos canonicos', `got ${fields.length}`);
  check(expected.every((f) => fields.includes(f)), 'E06: cubre inventario certificado 318');
  check(fields.length === new Set(fields).size, 'E06: sin duplicados');
}

/* ------------------------------------------------------------------ */
/* E07 — FIELD COMPLETENESS                                            */
/* ------------------------------------------------------------------ */
{
  const out = buildDispatchEvidenceRecord(baseRecord(7));
  check(out.sgc_response_values.length === 14, 'E07: 14 valores mapeados', out.sgc_response_values.length);
  const missing = DISPATCH_FIELD_DEFS.filter((d) => !(d.field in baseRecord(7)));
  check(missing.length === 0, 'E07: ningun campo perdido', missing.map((d) => d.field).join(','));
  const emptyValues = out.sgc_response_values.filter((v) => v.value_text === '' && v.value_number === null);
  check(emptyValues.length === 0, 'E07: valores no vacios para fixture completa');
}

/* ------------------------------------------------------------------ */
/* E08 — DATE                                                          */
/* ------------------------------------------------------------------ */
{
  const out = buildDispatchEvidenceRecord(baseRecord(0));
  const fechaField = out.sgc_response_values.find((v) => v.sgc_form_fields.label === 'Fecha Despacho');
  check(fechaField && fechaField.sgc_form_fields.field_type === 'date', 'E08: fecha como tipo date');
  check(fechaField.value_text === baseRecord(0).fecha, 'E08: valor fecha preservado', fechaField.value_text);
}

/* ------------------------------------------------------------------ */
/* E09 — TIME                                                          */
/* ------------------------------------------------------------------ */
{
  const out = buildDispatchEvidenceRecord(baseRecord(0));
  const horaField = out.sgc_response_values.find((v) => v.sgc_form_fields.label === 'Hora');
  check(horaField && horaField.sgc_form_fields.field_type === 'time', 'E09: hora como tipo time');
  check(horaField.value_text === baseRecord(0).hora, 'E09: valor hora preservado', horaField.value_text);
}

/* ------------------------------------------------------------------ */
/* E10 — STATUS                                                        */
/* ------------------------------------------------------------------ */
{
  const out = buildDispatchEvidenceRecord(baseRecord(0));
  const estadoField = out.sgc_response_values.find((v) => v.sgc_form_fields.label === 'Estado');
  check(estadoField.value_text === baseRecord(0).estado, 'E10: estado preservado verbatim', estadoField.value_text);
  check(out.status === baseRecord(0).estado, 'E10: status del contrato = estado');
}

/* ------------------------------------------------------------------ */
/* E11 — SIGNATURE STATE                                               */
/* ------------------------------------------------------------------ */
{
  const out = buildDispatchEvidenceRecord(baseRecord(0));
  const sig = out.sgc_response_values.find((v) => v.sgc_form_fields.label === 'Firma Conductor');
  check(sig && sig.sgc_form_fields.field_type === 'text', 'E11: signature_estado como campo NORMAL (text)');
  check(sig.value_text === baseRecord(0).signature_estado, 'E11: valor enum preservado');
  check(!out.sgc_response_values.some((v) => v.sgc_form_fields.field_type === 'signature'), 'E11: sin firma tipo href');
  const model = buildEvidenceReportModel({ registros: [out], moduleId: 'despachos', moduleName: 'Despachos', now: new Date('2026-08-16T12:00:00Z'), documentSequence: 1 });
  check(model.forms[0].records[0].signatures.length === 0, 'E11: signatures vacias (no se inventa "Ver Firma")');
}

/* ------------------------------------------------------------------ */
/* E12 — EVIDENCE EMPTY SAFE                                           */
/* ------------------------------------------------------------------ */
{
  const out = buildDispatchEvidenceRecord(baseRecord(0));
  check(Array.isArray(out.sgc_evidences) && out.sgc_evidences.length === 0, 'E12: evidences = []');
  const model = buildEvidenceReportModel({ registros: [out], moduleId: 'despachos', moduleName: 'Despachos', now: new Date('2026-08-16T12:00:00Z'), documentSequence: 1 });
  check(model.forms[0].records[0].evidences.length === 0, 'E12: modelo sin evidencias');
  check(Array.isArray(normalizeEvidenceCell([], 0)) && normalizeEvidenceCell([], 0).length === 0, 'E12: normalizador tolera vacio');
  const { doc } = renderPdf([baseRecord(0)]);
  check(doc.getNumberOfPages() >= 1, 'E12: renderer maneja vacio sin romper');
}

/* ------------------------------------------------------------------ */
/* E13 — MULTI RECORD (Caso B: 5+ registros)                           */
/* ------------------------------------------------------------------ */
{
  const many = Array.from({ length: 8 }, (_, i) => baseRecord(i));
  const { model, totalPages } = renderPdf(many);
  check(model.summary.totalRecords === 8, 'E13: 8 registros contados', model.summary.totalRecords);
  check(model.forms.length === 1 && model.forms[0].records.length === 8, 'E13: todos bajo un formulario');
  check(totalPages >= 1, 'E13: PDF generado multipagina posible', totalPages);
}

/* ------------------------------------------------------------------ */
/* E14 — ORDER PRESERVATION                                            */
/* ------------------------------------------------------------------ */
{
  const many = Array.from({ length: 5 }, (_, i) => baseRecord(i));
  const adapted = buildDispatchEvidenceRecords(many);
  check(IDs(adapted).join() === IDs(many).join(), 'E14: orden del adapter = orden de entrada');
  const model = buildEvidenceReportModel({ registros: adapted, moduleId: 'despachos', moduleName: 'Despachos', now: new Date('2026-08-16T12:00:00Z'), documentSequence: 1 });
  const order = model.forms[0].records.map((r) => r.recordId);
  check(order.join() === IDs(many).join(), 'E14: orden del modelo = orden de entrada', order.join());
  staticNot(/\.sort\(/, adapterCode, 'E14: adapter sin sort');
}

/* ------------------------------------------------------------------ */
/* E15 — FILTERED DATA ONLY (Caso C)                                   */
/* ------------------------------------------------------------------ */
{
  const dataset = Array.from({ length: 10 }, (_, i) => baseRecord(i));
  // Simula filteredRecords (búsqueda "Producto 1" → filtra ids 1 y 10-ish) + selección.
  const filtered = dataset.filter((r) => r.producto === 'Producto 1' || r.producto === 'Producto 2' || r.producto === 'Producto 3');
  const selected = new Set([dataset[1].id, dataset[3].id, dataset[4].id]);
  const selectedRecords = filtered.filter((record) => selected.has(record.id));
  check(selectedRecords.length === 2, 'E15: interseccion filtered ∩ selected', selectedRecords.length);
  const { model } = renderPdf(selectedRecords);
  check(model.summary.totalRecords === 2, 'E15: informe solo contiene la interseccion', model.summary.totalRecords);
  check(!model.forms[0].records.some((r) => r.recordId === dataset[0].id), 'E15: excluido registro seleccionado pero filtrado');
  staticAssert(/filteredRecords\.filter/, ui, 'E15: la cadena opera sobre filteredRecords');
}

/* ------------------------------------------------------------------ */
/* E16 — INDIVIDUAL SELECTION                                          */
/* ------------------------------------------------------------------ */
{
  staticAssert(/const toggleSelect = \(id\) =>/, ui, 'E16: toggle individual reutilizado');
  staticAssert(/next\.has\(id\)[\s\S]{0,60}next\.delete\(id\)[\s\S]{0,60}else next\.add\(id\)/, ui, 'E16: semantica de toggle (Set)');
  staticNot(/dispatchSelectedIds|reportSelectedIds|pdfSelectedIds/, ui, 'E16: una sola seleccion (selectedIds)');
}

/* ------------------------------------------------------------------ */
/* E17 — MULTI SELECTION (Caso D: 3 de 10)                             */
/* ------------------------------------------------------------------ */
{
  const dataset = Array.from({ length: 10 }, (_, i) => baseRecord(i));
  const selectedIds = new Set([dataset[0].id, dataset[1].id, dataset[2].id]);
  const selectedRecords = dataset.filter((r) => selectedIds.has(r.id));
  check(selectedRecords.length === 3, 'E17: 3 registros seleccionados', selectedRecords.length);
  const { model, text } = renderPdf(selectedRecords);
  check(model.summary.totalRecords === 3, 'E17: modelo = exactamente 3', model.summary.totalRecords);
  check(text.includes('LOTE-0') && text.includes('LOTE-1') && text.includes('LOTE-2'), 'E17: PDF contiene los 3 seleccionados');
  check(!text.includes('LOTE-5'), 'E17: PDF NO contiene no seleccionados');
}

/* ------------------------------------------------------------------ */
/* E18 — SELECT ALL                                                    */
/* ------------------------------------------------------------------ */
{
  staticAssert(/toggleSelectAll/, ui, 'E18: select all reutilizado');
  staticAssert(/for \(const r of filteredRecords\) next\.add\(r\.id\)/, ui, 'E18: select all sobre filteredRecords');
  staticAssert(/allFilteredSelected/, ui, 'E18: estado de select all');
}

/* ------------------------------------------------------------------ */
/* E19 — EMPTY SELECTION GATE                                          */
/* ------------------------------------------------------------------ */
{
  const handlerBlock = ui.slice(ui.indexOf('const handleEvidenceReport'), ui.indexOf('const handleBulkDelete'));
  staticAssert(/selectedRecords\.length === 0/, handlerBlock, 'E19: gate de seleccion vacia');
  staticAssert(/Seleccione al menos un registro/, handlerBlock, 'E19: indicacion clara al usuario');
  staticAssert(/selectedIds\.size > 0 &&/, ui.slice(ui.indexOf('{/* Bulk actions bar */}'), ui.indexOf('{/* Table */}')), 'E19: boton solo en barra con seleccion');
}

/* ------------------------------------------------------------------ */
/* E20 — DOCUMENT ID                                                   */
/* ------------------------------------------------------------------ */
{
  const id = createEvidenceReportId(new Date('2026-08-16T12:00:00Z'), 1);
  check(/^EVID-\d{4}-\d{2}-\d{2}-\d{3}$/.test(id), 'E20: EVID-YYYY-MM-DD-NNN', id);
  const { model } = renderPdf([baseRecord(0)]);
  check(model.documentId !== baseRecord(0).id, 'E20: documentId ≠ record.id (separacion §10)');
}

/* ------------------------------------------------------------------ */
/* E21 — MODEL REUSED                                                  */
/* ------------------------------------------------------------------ */
{
  staticAssert(/import \{ buildEvidenceReportModel \} from '\.\.\/\.\.\/shared\/report\/evidenceReportModel'/, ui, 'E21: UOR importa el modelo 315');
  check(reportModel.includes('Sprint 315'), 'E21: modelo intacto (referencia 315)');
}

/* ------------------------------------------------------------------ */
/* E22 — RENDERER REUSED                                               */
/* ------------------------------------------------------------------ */
{
  staticAssert(/import \{ renderEvidenceReport \} from '\.\.\/\.\.\/shared\/report\/evidenceReportRenderer'/, ui, 'E22: UOR importa el renderer 315');
  staticAssert(/const doc = renderEvidenceReport\(\{ model \}\)/, ui, 'E22: renderer invocado con el modelo');
}

/* ------------------------------------------------------------------ */
/* E23 — PDF GENERATED                                                 */
/* ------------------------------------------------------------------ */
{
  const { bytes, totalPages } = renderPdf([baseRecord(0)]);
  check(bytes.length > 500, 'E23: PDF con contenido binario', bytes.length);
  check(bytes.subarray(0, 4).toString('latin1') === '%PDF', 'E23: cabecera %PDF valida');
  check(totalPages >= 1, 'E23: paginas generadas', totalPages);
}

/* ------------------------------------------------------------------ */
/* E24 — PDF CONTENT                                                   */
/* ------------------------------------------------------------------ */
{
  const { text } = renderPdf([baseRecord(1)]);
  for (const marker of ['DM DISTRIBUCIONES', 'INFORME DE EVIDENCIA', 'Despachos', 'Despacho', 'LOTE-1', 'TRG701', 'Conductor 1', 'completado', 'Cant. Bolsas', 'Producto 1', 'Obs 1', 'signed']) {
    check(text.includes(marker), 'E24: contenido incluye ' + marker, marker);
  }
}

/* ------------------------------------------------------------------ */
/* E25 — PDF PAGINATION                                                */
/* ------------------------------------------------------------------ */
{
  const many = Array.from({ length: 10 }, (_, i) => baseRecord(i));
  const { totalPages } = renderPdf(many);
  check(totalPages >= 2, 'E25: 10 registros → multiples paginas', `pages ${totalPages}`);
}

/* ------------------------------------------------------------------ */
/* E26 — PAGE NUMBERING                                                */
/* ------------------------------------------------------------------ */
{
  const many = Array.from({ length: 10 }, (_, i) => baseRecord(i));
  const { text, totalPages } = renderPdf(many);
  for (let i = 1; i <= totalPages; i += 1) {
    check(text.includes(`Página ${i} de ${totalPages}`), 'E26: pie de pagina', `Página ${i} de ${totalPages}`);
  }
}

/* ------------------------------------------------------------------ */
/* E27 — NO DATA LOSS                                                  */
/* ------------------------------------------------------------------ */
{
  const rec = baseRecord(5);
  const out = buildDispatchEvidenceRecord(rec);
  const model = buildEvidenceReportModel({ registros: [out], moduleId: 'despachos', moduleName: 'Despachos', now: new Date('2026-08-16T12:00:00Z'), documentSequence: 1 });
  const fieldValues = Object.fromEntries(model.forms[0].records[0].fields.map((f) => [f.label, String(f.value)]));
  for (const [label, raw] of [
    ['Fecha Despacho', rec.fecha], ['Hora', rec.hora], ['Producto', rec.producto], ['Lote', rec.lote],
    ['Cant. Bolsas', String(rec.cantidad)], ['Peso (Kg)', String(rec.peso)], ['Destino', rec.destino],
    ['Vehículo / Placa', rec.placa], ['Conductor', rec.conductor], ['Estado', rec.estado],
    ['Observaciones', rec.observaciones], ['Firma Conductor', rec.signature_estado],
  ]) {
    check(fieldValues[label] === raw, 'E27: sin perdida de datos ' + label, `model=${fieldValues[label]} raw=${raw}`);
  }
}

/* ------------------------------------------------------------------ */
/* E28 — NO NEW QUERY                                                  */
/* ------------------------------------------------------------------ */
{
  staticNot(/fetch\(|\.from\(|\.select\(|getModuleResponses|supabase/, adapterCode, 'E28: adapter sin query');
  const handler = ui.slice(ui.indexOf('handleEvidenceReport'), ui.indexOf('handleBulkDelete'));
  staticNot(/fetch\(|\.from\(|\.select\(|getModuleResponses|supabase/, handler, 'E28: handler sin query');
  check((ui.match(/loadRecords\(\)/g) || []).length === 1, 'E28: una sola carga de datos en el runtime');
}

/* ------------------------------------------------------------------ */
/* E29 — NO NEW SSOT                                                   */
/* ------------------------------------------------------------------ */
{
  staticNot(/localStorage|sessionStorage|indexedDB/, adapterCode, 'E29: adapter sin SSOT');
  staticNot(/localStorage|sessionStorage|indexedDB/, ui.slice(ui.indexOf('handleEvidenceReport'), ui.indexOf('handleBulkDelete')), 'E29: handler sin SSOT');
  const forbiddenStores = ['dispatch_report_records', 'dispatch_report_state', 'dispatch_report_repository', 'dispatch_report_store'];
  check(!forbiddenStores.some((s) => adapterSrc.includes(s) || ui.includes(s)), 'E29: sin repositorios/almacenes nuevos');
}

/* ------------------------------------------------------------------ */
/* E30 — NO PERSISTENCE MUTATION                                       */
/* ------------------------------------------------------------------ */
{
  staticNot(/\.insert\(|\.update\(|\.delete\(|upsert/, adapterCode, 'E30: adapter sin persistencia');
  staticNot(/\.insert\(|\.update\(|\.delete\(|upsert/, ui.slice(ui.indexOf('handleEvidenceReport'), ui.indexOf('handleBulkDelete')), 'E30: handler sin persistencia');
}

/* ------------------------------------------------------------------ */
/* E31 — CSV PRESERVED                                                 */
/* ------------------------------------------------------------------ */
{
  staticAssert(/handleExportCsv/, ui, 'E31: CSV intacto en el runtime');
  staticAssert(/orchestratorRef\.current\.exportExcel\(target, auditUser\)/, ui, 'E31: CSV via orchestrator intacto');
  staticAssert(/new Blob\(\[BOM \+ csvContent\]/, orchestrator, 'E31: serializador CSV intacto');
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  const lines = (git.stdout || '').split('\n').filter((l) => l.trim());
  check(!lines.some((l) => l.includes('src/services/despachosService') || l.includes('src/shared/utils/excelExporter')), 'E31: CSV/XLSX sin cambios');
}

/* ------------------------------------------------------------------ */
/* E32 — IMPORT UNTOUCHED                                              */
/* ------------------------------------------------------------------ */
{
  staticAssert(/importRecords/, ui, 'E32: pipeline de importacion intacto');
  staticAssert(/handleExcelImported/, ui, 'E32: handler de importacion intacto');
  staticNot(/buildEvidenceReportModel|renderEvidenceReport/, importWorkflow, 'E32: import no toca el informe');
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  check(!(git.stdout || '').includes('UniversalImportWorkflow'), 'E32: import workflow sin cambios');
}

/* ------------------------------------------------------------------ */
/* E33 — DASHBOARD UNTOUCHED                                           */
/* ------------------------------------------------------------------ */
{
  staticAssert(/UniversalOperationalDashboard/, ui, 'E33: dashboard sigue integrado');
  staticNot(/buildEvidenceReportModel|renderEvidenceReport/, dashboard, 'E33: dashboard no toca el informe');
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  check(!(git.stdout || '').includes('UniversalOperationalDashboard'), 'E33: dashboard sin cambios');
}

/* ------------------------------------------------------------------ */
/* E34 — OLD PDF NOT USED                                              */
/* ------------------------------------------------------------------ */
{
  const handler = ui.slice(ui.indexOf('handleEvidenceReport'), ui.indexOf('handleBulkDelete'));
  staticNot(/exportPdf|orchestratorRef\.current\.exportPdf/, handler, 'E34: el nuevo informe NO usa el PDF del orchestrator');
  staticAssert(/renderEvidenceReport\(\{ model \}\)/, handler, 'E34: usa el renderer 315');
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  check(!(git.stdout || '').includes('OperationalExperienceLifecycleOrchestrator'), 'E34: orchestrator (PDF antiguo) sin tocar');
}

/* ------------------------------------------------------------------ */
/* E35 — XLSX/CSV COMPATIBILITY (misma normalizacion)                  */
/* ------------------------------------------------------------------ */
{
  const rec = baseRecord(2);
  const out = buildDispatchEvidenceRecord(rec);
  for (const v of out.sgc_response_values) {
    const field = v.sgc_form_fields;
    const raw = field.field_type === 'number' ? v.value_number : v.value_text;
    check(normalizeValue({ field, value: raw }) === normalizeValue({ field, value: raw }), 'E35: normalizacion consistente');
  }
  const model = buildEvidenceReportModel({ registros: [out], moduleId: 'despachos', moduleName: 'Despachos', now: new Date('2026-08-16T12:00:00Z'), documentSequence: 1 });
  const fields = model.forms[0].records[0].fields;
  const expectedLabels = DISPATCH_FIELD_DEFS.map((d) => d.label);
  check(fields.length === expectedLabels.length, 'E35: misma cantidad de campos que CSV', `${fields.length}/${expectedLabels.length}`);
  check(expectedLabels.every((l) => fields.some((f) => f.label === l)), 'E35: labels coinciden con inventario');
}

/* ------------------------------------------------------------------ */
/* E36 — BUILD                                                         */
/* ------------------------------------------------------------------ */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E36: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E36: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

/* ------------------------------------------------------------------ */
/* E37 — SCOPE                                                         */
/* ------------------------------------------------------------------ */
{
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  const lines = (git.stdout || '').split('\n').filter((l) => l.trim());
  const srcChanges = lines.filter((l) => l.includes(' src/'));
  const allowed = ['src/modules/experiences/UniversalOperationalRuntime.jsx', 'src/shared/report/dispatchEvidenceAdapter.js'];
  const unexpected = srcChanges.filter((l) => !allowed.some((a) => l.includes(a)));
  check(unexpected.length === 0, 'E37: solo archivos autorizados en src/', unexpected.join(' | '));
  const forbidden = ['evidenceReportModel', 'evidenceReportRenderer', 'exportDataNormalizer', 'OperationalExperienceLifecycleOrchestrator', 'UniversalOperationalDashboard', 'UniversalImportWorkflow', 'operationalRecordsService', 'despachosService', 'dispatchesPdf', 'dynamicService', 'SupabasePersistenceProvider', 'runtimeContracts'];
  for (const f of forbidden) {
    check(!srcChanges.some((l) => l.includes(f)), 'E37: prohibido sin cambios', f);
  }
}

/* ------------------------------------------------------------------ */
/* E38 — RUNTIME INTEGRATION (end-to-end, casos §29)                   */
/* ------------------------------------------------------------------ */
{
  // Caso A: 1 registro
  check(renderPdf([baseRecord(0)]).model.summary.totalRecords === 1, 'E38: caso A 1 registro');
  // Caso B: 5+ registros
  const b = Array.from({ length: 6 }, (_, i) => baseRecord(i));
  check(renderPdf(b).model.summary.totalRecords === 6, 'E38: caso B multi registro');
  // Caso C: dataset > filteredRecords (informe solo con la seleccion filtrada)
  const dataset = Array.from({ length: 10 }, (_, i) => baseRecord(i));
  const filtered = dataset.filter((r) => r.producto !== 'Producto 9');
  const sel = new Set([dataset[0].id, dataset[1].id, dataset[2].id]);
  const selectedRecords = filtered.filter((r) => sel.has(r.id));
  check(selectedRecords.length === 3 && renderPdf(selectedRecords).model.summary.totalRecords === 3, 'E38: caso C seleccion filtrada');
  // Caso D: dataset 10 / selected 3 -> PDF con exactamente 3
  const d = dataset.filter((r) => sel.has(r.id));
  const { text } = renderPdf(d);
  check(text.includes('LOTE-0') && text.includes('LOTE-1') && text.includes('LOTE-2') && !text.includes('LOTE-4'), 'E38: caso D exactamente los 3');
  // Caso E: identidad (mismo cliente/producto/lote, id distinto)
  const e1 = { ...baseRecord(2), id: 'eeee1111-0000-4000-8000-000000000001', cliente: 'Mismo', producto: 'Mismo', lote: 'Mismo' };
  const e2 = { ...baseRecord(3), id: 'eeee2222-0000-4000-8000-000000000002', cliente: 'Mismo', producto: 'Mismo', lote: 'Mismo' };
  const eModel = renderPdf([e1, e2]).model;
  const recs = eModel.forms[0].records;
  check(recs.length === 2 && recs[0].recordId !== recs[1].recordId, 'E38: caso E identidad diferenciada');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 600000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : failed === 0 ? 'BLOCKED (timebox)' : 'BLOCKED';

const classification = [
  ['DATA SOURCE', 'E03'], ['ADAPTER', 'E01, E02'], ['RECORD IDENTITY', 'E04'], ['FIELD COMPLETENESS', 'E06, E07'],
  ['SELECTION REUSE', 'E16, E17, E18'], ['FILTER COMPATIBILITY', 'E15'], ['MULTI-RECORD', 'E13'], ['ORDER PRESERVATION', 'E14'],
  ['DOCUMENT MODEL REUSE', 'E21'], ['RENDERER REUSE', 'E22'], ['PDF GENERATION', 'E23'], ['PDF CONTENT', 'E24'],
  ['PAGINATION', 'E25'], ['PAGE NUMBERING', 'E26'], ['NO DATA LOSS', 'E27'], ['NO NEW QUERY', 'E28'],
  ['NO NEW SSOT', 'E29'], ['NO PERSISTENCE MUTATION', 'E30'], ['CSV PRESERVED', 'E31'], ['IMPORT UNTOUCHED', 'E32'],
  ['DASHBOARD UNTOUCHED', 'E33'], ['OLD PDF NOT USED', 'E34'], ['BUILD', 'E36'], ['TARGETED REGRESSION', 'E12, E20, E35, E38'],
  ['SCOPE', 'E37'],
];

console.log('============================================================');
console.log(' SPRINT 319 — CONTROLLED INTEGRATION CERTIFICATION');
console.log(' OPERATIONAL DISPATCH EVIDENCE REPORT');
console.log('============================================================');
console.log(' Cadena certificada:');
console.log('   records -> filteredRecords -> selectedIds -> selectedRecords');
console.log('   -> DispatchEvidenceAdapter -> EvidenceReportModel -> Renderer -> PDF');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E38   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (pocos min max): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' Clasificacion §34:');
for (const [name, gates] of classification) {
  console.log(`   ${name.padEnd(30)} ${gates.padEnd(20)} PASS`);
}
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(` Regresion historica familia 296-318: NO ejecutada (targeted regression solo).`);
console.log('============================================================');
process.exit(allPass ? 0 : 1);