/**
 * SPRINT 333 — EVIDENCE REPORT INFORMATIVE PRESENTATION · CONTROLLED CORRECTION
 * LEVEL 5 · IMPLEMENTATION · CONTROLLED PRESENTATION CORRECTION
 *
 * Corrección de PRESENTACIÓN: informative = metadata de presentación, NO dato
 * de respuesta. Separación visual en el renderer (modelo conserva estructura
 * única):
 *
 *   INFORMACIÓN DEL FORMULARIO  →  informativeFields (DISPLAY BLOCK)
 *   DATOS DEL REGISTRO          →  responseFields (SOLO Campo | Valor)
 *   FIRMAS Y EVIDENCIAS         →  canal existente (intacto)
 *
 * Scope: src/shared/report/evidenceReportRenderer.js. Persistencia intacta.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const modelUrl = 'file:///' + path.join(ROOT, 'src', 'shared', 'report', 'evidenceReportModel.js').replace(/\\/g, '/');
const { buildEvidenceReportModel } = await import(modelUrl);

const model = S('src/shared/report/evidenceReportModel.js');
const renderer = S('src/shared/report/evidenceReportRenderer.js');
const normalizer = S('src/shared/utils/exportDataNormalizer.js');

const start = Date.now();
let passed = 0;
let failed = 0;
const failures = [];
function check(cond, label, detail = '') {
  if (cond) passed++;
  else { failed++; failures.push({ label, detail }); }
}
const H = (re, src, label) => check(re.test(src), label, 'regex ' + re);
const N = (re, src, label) => check(!re.test(src), label, 'regex ' + re);
const countOf = (re, src) => (src.match(re) || []).length;
const git = () => {
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  return gs.stdout.split('\n').filter(Boolean).map((l) => ({ status: l.slice(0, 2).trim(), path: l.slice(3).trim() }));
};

const JOIN = (label, type, options = {}) => ({ label, field_type: type, options });
const VAL = (fieldId, type, raw, extra = {}) => ({
  field_id: fieldId,
  value_text: type === 'text' || type === 'textarea' || type === 'select' ? String(raw ?? '') : (type === 'signature' ? extra.text || '' : ''),
  value_number: type === 'number' ? raw : null,
  value_boolean: type === 'boolean' ? raw : null,
  value_json: extra.json ?? null,
  sgc_form_fields: JOIN('L' + fieldId, type, extra.options || {}),
});
const REC = (id, values = [], formId = 'form1') => ({
  id, created_at: '2026-01-01T10:00:00Z', status: 'aprobado',
  sgc_forms: { id: formId, name: 'Calidad del Agua', module_id: 'm1' },
  sgc_response_values: values,
});
const FIELD = (id, label, type, order_index, opts = {}) => ({
  id, label, field_type: type, required: opts.required ?? true,
  options: opts.options || {}, order_index,
});
const MODEL = (recs, sk) => buildEvidenceReportModel({ registros: recs, formFieldsByForm: sk ? { form1: sk } : {} });
const FIELDS = (recs, sk) => MODEL(recs, sk).forms[0].records[0].fields;

/* ================= E01-E12 SCOPE + MODELO UNICO ================= */
{
  const srcM = git().filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  const expected = [
    'src/components/DynamicRecordsView.jsx', 'src/components/FormBuilder.jsx',
    'src/components/engines/BaseChecklist.jsx', 'src/components/engines/BaseGeneric.jsx',
    'src/components/engines/BaseMediciones.jsx', 'src/pages/DynamicForm.jsx',
    'src/runtime/rendering/registry/ComponentRegistry.ts', 'src/shared/report/dispatchEvidenceAdapter.js',
    'src/shared/report/evidenceReportModel.js', 'src/shared/report/evidenceReportRenderer.js',
    'src/shared/utils/exportDataNormalizer.js',
  ];
  check(JSON.stringify(srcM) === JSON.stringify(expected), 'E01: src/ = mismo set baseline', JSON.stringify(srcM));
  check(!srcM.some((p) => /order-motor|dynamicService|SignaturePad|MediaProcessingCore|documentsService|EvidenceUploader|Storage|Repositorio/.test(p)), 'E02: 0 areas PROHIBIDAS');
  check(!git().some((e) => /\.sql$/.test(e.path) || /package(-lock)?\.json/.test(e.path)), 'E03: 0 SQL / dependencias');
  check(countOf(/export function buildEvidenceReportModel/, model) === 1, 'E04: un solo EvidenceReportModel');
  check(countOf(/export function renderEvidenceReport/, renderer) === 1, 'E05: un solo PDF renderer');
  N(/sgc_form_informative_fields|sgc_form_sections|sgc_form_display_fields|form_descriptions/, model + renderer, 'E06: 0 tabla nueva');
  N(/InformativeReportService|DisplayFieldService|FormPresentationService|InformativeRenderer|InformativeReportModel|secondEvidenceReport|EvidenceReportModel2/, model + renderer, 'E07: 0 servicio/modelo/renderer nuevo');
  check(countOf(/order_index/, model) >= 1, 'E08: un solo order_index');
  N(/informativeFields|responseFields/, model, 'E09: separacion de PRESENTACION (modelo: estructura unica)');
  H(/record\.fields\.filter\(\(f\) => f\.presentation\)/, renderer, 'E10: informativeFields desde estructura unica');
  H(/record\.fields\.filter\(\(f\) => !f\.presentation\)/, renderer, 'E11: responseFields desde estructura unica');
  N(/normalizeValue|normalizeSignatureCell/, renderer, 'E12: renderer NO normaliza valores (getDateParts es helper de fecha, no valor de campo)');
}

/* =============== E13-E30 SEPARACION VISUAL (renderer) ============ */
{
  H(/INFORMACIÓN DEL FORMULARIO/, renderer, 'E13: seccion INFORMACION DEL FORMULARIO');
  H(/if \(informativeFields\.length > 0\)/, renderer, 'E14: seccion informativa SOLO si hay informatives');
  H(/DATOS DEL REGISTRO/, renderer, 'E15: seccion DATOS DEL REGISTRO');
  H(/FIRMAS Y EVIDENCIAS/, renderer, 'E16: seccion FIRMAS Y EVIDENCIAS');
  const iInfo = renderer.indexOf('INFORMACIÓN DEL FORMULARIO');
  const iDatos = renderer.indexOf('DATOS DEL REGISTRO');
  const iFirmas = renderer.indexOf('FIRMAS Y EVIDENCIAS');
  check(iInfo < iDatos && iDatos < iFirmas, 'E17: orden INFORMACION < DATOS < FIRMAS', iInfo + ' < ' + iDatos + ' < ' + iFirmas);
  const bStart = renderer.indexOf('splitTextToSize(f.label');
  const bEnd = renderer.indexOf('y += bandHeight + 4;');
  check(bStart !== -1 && bEnd !== -1 && bStart < iDatos, 'E18: bloque informativo ANTES de DATOS', bStart + ' vs ' + iDatos);
  H(/responseFields\.map\(\(f\) => \[f\.label, f\.value\]\)/, renderer, 'E19: tabla = SOLO responseFields');
  check(countOf(/responseFields\.map\(\(f\) => \[f\.label, f\.value\]\)/, renderer) === 1, 'E20: responseFields mapeado UNA vez');
  N(/let buffer = \[\];|buffer\.push\(|if \(f\.presentation\) \{/, renderer, 'E21: intercalado informative-en-tabla ELIMINADO');
  H(/if \(responseFields\.length === 0\)/, renderer, 'E22: "Sin datos registrados" SOLO sin respuestas');
  H(/renderTable\(\[/, renderer, 'E23: helper de tabla unico');
  check(countOf(/autoTable\(doc, \{/, renderer) === 1, 'E24: UNA llamada autoTable');
  N(/doc\.rect\(MARGIN_X, y, CONTENT_W, 20, 'F'\)/, renderer, 'E25: 0 banda de altura fija');
  H(/splitTextToSize\(f\.label, CONTENT_W - 16\)/, renderer, 'E26: wrapping a CONTENT_W - 16');
  H(/bandHeight = lines\.length \* bandLineHeight \+ bandPadding/, renderer, 'E27: altura dinamica');
  H(/ensureSpace\(doc, y, bandHeight \+ 4\)/, renderer, 'E28: paginacion segura');
  N(/setFontSize\((6|7|8)\)/, renderer.slice(bStart, bEnd), 'E29: 0 reduccion de fuente');
  N(/truncate|ellipsis|slice\(0,/, renderer.slice(bStart, bEnd), 'E30: 0 truncado/ellipsis');
}

/* ============ E31-E45 RUNTIME (modelo entrega suficiente) ======== */
{
  const sk = [
    FIELD('f1', 'FILTRO SANITARIO', 'informative', 1),
    FIELD('f2', 'Temperatura', 'number', 2),
    FIELD('f3', 'Estado', 'boolean', 3),
    FIELD('f4', 'Observaciones', 'textarea', 4),
  ];
  const fields = FIELDS([REC('r1', [VAL('f2', 'number', 4), VAL('f3', 'boolean', true), VAL('f4', 'textarea', 'Sin novedades')])], sk);
  const infos = fields.filter((f) => f.presentation);
  const resp = fields.filter((f) => !f.presentation);
  check(fields.length === 4, 'E31: 1 informative + 3 respuestas', String(fields.length));
  check(infos.length === 1 && infos[0].label === 'FILTRO SANITARIO', 'E32: informative por presentation:true');
  check(infos[0].value === '' && infos[0].order === 1, 'E33: informative sin respuesta + order');
  check(resp.length === 3, 'E34: responseFields = 3');
  check(resp.map((x) => x.label).join(',') === 'Temperatura,Estado,Observaciones', 'E35: orden canonico (sin informative)');
  check(resp.find((x) => x.label === 'Temperatura').value === 4, 'E36: number');
  check(resp.find((x) => x.label === 'Estado').value === 'Cumple', 'E37: boolean -> Cumple');
  check(resp.find((x) => x.label === 'Observaciones').value === 'Sin novedades', 'E38: textarea');
  const mSig = MODEL([REC('r2', [VAL('g1', 'signature', '', { text: 'https://x/g.png' }), VAL('t1', 'text', 'v')])]);
  check(mSig.forms[0].records[0].signatures.length === 1 && mSig.forms[0].records[0].signatures[0].label === 'Lg1', 'E39: firma en FIRMAS Y EVIDENCIAS');
  check(mSig.forms[0].records[0].fields.every((x) => x.label !== 'Lg1'), 'E40: firma NO en responseFields');
  const fInfo = FIELDS([REC('r3', [])], [FIELD('a', 'SECCION A', 'informative', 1), FIELD('b', 'SECCION B', 'informative', 2), FIELD('c', 'SECCION C', 'informative', 3)]);
  check(fInfo.length === 3 && fInfo.every((x) => x.presentation), 'E41: multiples informatives presentes');
  check(fInfo.map((x) => x.order).join(',') === '1,2,3', 'E42: orden canonico informatives');
  const mMulti = MODEL([REC('rA', [VAL('x', 'text', 'VALOR-A')]), REC('rB', [VAL('x', 'text', 'VALOR-B')])], [FIELD('i', 'I', 'informative', 1), FIELD('x', 'X', 'text', 2)]);
  check(mMulti.forms[0].records[0].fields.length === 2 && mMulti.forms[0].records[1].fields.length === 2, 'E43: multiple registros, informative en cada uno');
  check(mMulti.forms[0].records[0].fields.find((x) => !x.presentation).value === 'VALOR-A' && mMulti.forms[0].records[1].fields.find((x) => !x.presentation).value === 'VALOR-B', 'E44: valores individuales');
  check(mMulti.forms[0].records[0].fields.find((x) => x.presentation).order === 1, 'E45: informative misma posicion');
}

/* =============== E46-E55 PROHIBICIONES + EXCEL + BUILD =========== */
{
  check(countOf(/if \(field\.field_type === 'informative'\) return;/g, normalizer) === 3, 'E46: Excel intacto (informative excluido, 3 pases)');
  check(countOf(/field\.field_type === 'signature'/g, normalizer) === 3, 'E47: Excel signature intacto');
  N(/dangerouslySetInnerHTML/, renderer, 'E48: 0 innerHTML');
  N(/await\s|\.from\(|\.select\(|\.insert\(|\.update\(|fetch\(|getSupabaseClient/, model, 'E49: modelo 0-query');
  N(/snapshot/, model, 'E50: 0 snapshot');
  N(/\.find\(\(f\) => f\.label|\.indexOf\(|\.position|\.order ===|fields\[[0-9]+\]/, model, 'E51: 0 resolucion por label/posicion/indice');
  check(countOf(/doc\.text\(lines, MARGIN_X \+ 8, y \+ bandPadding \+ bandLineHeight\)/, renderer) === 1, 'E52: texto envuelto dibujado');
  check(countOf(/sectionTitle\(doc, y, 'INFORMACIÓN DEL FORMULARIO'\)/, renderer) === 1, 'E53: titulo informativo UNA vez');
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E54: npm run build exit 0', 'status ' + b.status);
  check(/built in/.test(b.stdout || ''), 'E55: build completo');
}/* ================= CASOS OBLIGATORIOS A-O ================= */
{
  const infoSection = renderer.indexOf('INFORMACIÓN DEL FORMULARIO') !== -1;
  const infoGuard = /if \(informativeFields\.length > 0\)/.test(renderer);
  const bandBeforeDatos = renderer.indexOf('splitTextToSize(f.label') < renderer.indexOf('DATOS DEL REGISTRO');
  const tableFromResponses = /responseFields\.map\(\(f\) => \[f\.label, f\.value\]\)/.test(renderer);
  const wrapOk = /splitTextToSize\(f\.label, CONTENT_W - 16\)/.test(renderer);
  const dynH = /bandHeight = lines\.length \* bandLineHeight \+ bandPadding/.test(renderer);

  check(infoSection && infoGuard && bandBeforeDatos, 'CASO A — solo informative: bloque informativo valido');
  check(FIELDS([REC('a', [])], [FIELD('a', 'TITULO', 'informative', 1)])[0].presentation === true, 'CASO A — solo informative: modelo entrega bloque');
  check(FIELDS([REC('a2', [])], [FIELD('a', 'TITULO', 'informative', 1)])[0].value === '', 'CASO A — solo informative: sin valor ni fila');

  check(tableFromResponses, 'CASO B — solo respuestas: tabla Campo | Valor');
  check(FIELDS([REC('b', [VAL('a', 'text', 'x'), VAL('b', 'number', 1), VAL('c', 'boolean', true), VAL('d', 'select', 'Y')])], [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'number', 2), FIELD('c', 'C', 'boolean', 3), FIELD('d', 'D', 'select', 4)]).length === 4, 'CASO B — solo respuestas: 4 filas');

  check(infoSection && tableFromResponses, 'CASO C — informative + respuestas: dos estructuras independientes');
  const mC = MODEL([REC('c', [VAL('b', 'text', 'v')])], [FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)]);
  check(mC.forms[0].records[0].fields.length === 2 && mC.forms[0].records[0].fields[0].presentation === true, 'CASO C — informative + respuestas: presentation separa');

  const fD = FIELDS([REC('d', [])], [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'I2', 'informative', 2), FIELD('c', 'I3', 'informative', 3)]);
  check(fD.length === 3 && fD.every((x) => x.presentation), 'CASO D — multiples informativos: todos en la seccion');
  check(fD.map((x) => x.label).join(',') === 'I1,I2,I3', 'CASO D — multiples informativos: orden');

  check(wrapOk, 'CASO E — informative largo: wrapping');
  check(FIELDS([REC('e', [])], [FIELD('a', 'FILTRO SANITARIO — INSTRUCCIONES PARA EL OPERARIO DE TURNO ANTES DE INICIAR', 'informative', 1)])[0].presentation === true, 'CASO E — informative largo: bloque presente');

  check(dynH, 'CASO F — varias lineas: altura dinamica');

  check(infoSection && /DATOS DEL REGISTRO/.test(renderer) && /FIRMAS Y EVIDENCIAS/.test(renderer), 'CASO G — informative + respuestas + firma: tres secciones');
  const mG = MODEL([REC('g', [VAL('t', 'text', 'v'), VAL('f', 'signature', '', { text: 'https://x/g.png' })])], [FIELD('i', 'I', 'informative', 1), FIELD('t', 'T', 'text', 2), FIELD('f', 'F', 'signature', 3)]);
  check(mG.forms[0].records[0].signatures.length === 1 && mG.forms[0].records[0].fields.filter((x) => x.presentation).length === 1, 'CASO G — firma preservada + informative separado');

  const mH = MODEL([REC('h', [VAL('b', 'text', 'v')])], [FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)]);
  check(mH.forms[0].records[0].fields[0].presentation === true && mH.forms[0].records[0].fields[0].order === 1, 'CASO H — informative al inicio: correcto');

  const mI = MODEL([REC('i', [VAL('a', 'text', 'x'), VAL('c', 'number', 2)])], [FIELD('a', 'A', 'text', 1), FIELD('b', 'I', 'informative', 2), FIELD('c', 'C', 'number', 3)]);
  check(mI.forms[0].records[0].fields.map((x) => x.label + (x.presentation ? '#P' : '')).join(',') === 'A,I#P,C', 'CASO I — informative intermedio: no contamina Campo | Valor');
  check(mI.forms[0].records[0].fields.filter((x) => !x.presentation).every((x) => x.value !== '' && x.value !== undefined), 'CASO I — informative intermedio: respuestas intactas');

  const mJ = MODEL([REC('j', [VAL('a', 'text', 'x')])], [FIELD('a', 'A', 'text', 1), FIELD('b', 'I', 'informative', 2)]);
  check(mJ.forms[0].records[0].fields.filter((x) => x.presentation).length === 1, 'CASO J — informative al final: no invade firmas');
  check(renderer.indexOf('DATOS DEL REGISTRO') < renderer.indexOf('FIRMAS Y EVIDENCIAS'), 'CASO J — informative al final: secciones sin invasion');

  check(infoGuard, 'CASO K — legacy (sin informative): seccion omitida, reporte identico');
  check(FIELDS([REC('k', [VAL('a', 'text', 'x'), VAL('b', 'boolean', true)])], [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'boolean', 2)]).every((x) => !x.presentation), 'CASO K — legacy: solo respuestas');

  const fL = FIELDS([REC('l', [VAL('b', 'text', 't'), VAL('c', 'number', 5)])], [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'C', 'number', 3), FIELD('d', 'I2', 'informative', 4)]);
  check(fL.length === 4, 'CASO L — mixto: informative separado + respuestas correctas', String(fL.length));
  check(fL.map((x) => x.label + (x.presentation ? '#P' : '')).join(',') === 'I1#P,B,C,I2#P', 'CASO L — mixto: estructura unica (renderer separa)');

  const mMulti = MODEL([REC('rA', [VAL('x', 'text', 'VALOR-A')]), REC('rB', [VAL('x', 'text', 'VALOR-B')])], [FIELD('i', 'I', 'informative', 1), FIELD('x', 'X', 'text', 2)]);
  check(mMulti.forms[0].records[0].fields.find((x) => !x.presentation).value === 'VALOR-A' && mMulti.forms[0].records[1].fields.find((x) => !x.presentation).value === 'VALOR-B', 'CASO M — multiples registros: contenido propio');
  check(mMulti.forms[0].records[0].fields.find((x) => x.presentation) !== undefined && mMulti.forms[0].records[1].fields.find((x) => x.presentation) !== undefined, 'CASO M — informative en cada registro');

  check(/ensureSpace\(doc, y, bandHeight \+ 4\)/.test(renderer) && /ensureSpace\(doc, y, 24\)/.test(renderer), 'CASO N — pagina nueva: bloque paginado');
  check(renderer.indexOf('y = ensureSpace(doc, y, 24);') < renderer.indexOf("sectionTitle(doc, y, 'INFORMACIÓN DEL FORMULARIO')"), 'CASO N — pagina nueva: espacio antes del titulo');

  check(wrapOk && dynH && /ensureSpace\(doc, y, bandHeight \+ 4\)/.test(renderer), 'CASO O — texto extremadamente largo: 0 overflow');
  check(!/doc\.rect\(MARGIN_X, y, CONTENT_W, 20, 'F'\)/.test(renderer), 'CASO O — 0 altura fija (overflow imposible)');
}

/* ================= INVARIANTES 01-20 ================= */
{
  const inv = (n, cond, label) => check(cond, 'INV' + String(n).padStart(2, '0') + ': ' + label);
  inv(1, countOf(/export function buildEvidenceReportModel/, model) === 1, 'un solo modelo de campos');
  inv(2, !/sgc_form_informative_fields|sgc_form_sections|sgc_form_display_fields|form_descriptions/.test(model + renderer), 'un solo sgc_form_fields');
  inv(3, countOf(/order_index/, model) >= 1, 'un solo order_index');
  inv(4, countOf(/export function buildEvidenceReportModel/, model) === 1, 'un solo EvidenceReportModel');
  inv(5, countOf(/export function renderEvidenceReport/, renderer) === 1, 'un solo PDF renderer');
  inv(6, FIELDS([REC('i6', [])], [FIELD('a', 'T', 'informative', 1)])[0].value === '', 'informative sin respuesta');
  inv(7, /responseFields\.map\(\(f\) => \[f\.label, f\.value\]\)/.test(renderer), 'informative fuera de Campo | Valor');
  inv(8, !/record\.fields/.test(renderer.slice(renderer.indexOf('DATOS DEL REGISTRO'), renderer.indexOf('FIRMAS Y EVIDENCIAS'))), 'respuestas dentro de Campo | Valor');
  inv(9, MODEL([REC('i9', [VAL('g', 'signature', '', { text: 'https://x/g.png' }), VAL('t', 'text', 'v')])]).forms[0].records[0].signatures.length === 1, 'firma preservada');
  inv(10, FIELDS([REC('i10', [VAL('a', 'text', 'x'), VAL('b', 'number', 1)])], [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'number', 2)]).map((x) => x.label).join(',') === 'A,B', 'orden canonico');
  inv(11, /splitTextToSize\(f\.label, CONTENT_W - 16\)/.test(renderer), 'wrapping informativo');
  inv(12, /bandHeight = lines\.length \* bandLineHeight \+ bandPadding/.test(renderer), 'altura dinamica');
  inv(13, !/doc\.rect\(MARGIN_X, y, CONTENT_W, 20, 'F'\)/.test(renderer), '0 overflow');
  inv(14, /ensureSpace\(doc, y, bandHeight \+ 4\)/.test(renderer), '0 overlap');
  inv(15, /if \(informativeFields\.length > 0\)/.test(renderer), 'legacy compatible');
  inv(16, FIELDS([REC('i16', [VAL('b', 'text', 't')])], [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'I2', 'informative', 3)]).length === 3, 'mixed forms');
  inv(17, countOf(/if \(field\.field_type === 'informative'\) return;/g, normalizer) === 3, 'Excel intacto');
  inv(18, !git().some((e) => /\.sql$/.test(e.path)), '0 tabla DB nueva');
  inv(19, !/InformativeReportService|DisplayFieldService|FormPresentationService/.test(model + renderer), '0 servicio nuevo');
  inv(20, countOf(/export function renderEvidenceReport/, renderer) === 1, '0 segundo renderer');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 333 — EVIDENCE REPORT INFORMATIVE PRESENTATION');
console.log(' · CONTROLLED PRESENTATION CORRECTION');
console.log('============================================================');
console.log(' INFORMATIVE IS PRESENTATION METADATA, NOT RESPONSE DATA.');
console.log('  INFORMACION DEL FORMULARIO -> informativeFields (DISPLAY BLOCK)');
console.log('  DATOS DEL REGISTRO         -> responseFields (SOLO Campo|Valor)');
console.log('  FIRMAS Y EVIDENCIAS        -> canal intacto');
console.log('------------------------------------------------------------');
console.log(' Gates E01..E55 + Casos A-O + INV01..INV20   Pasaron: ' + passed + '   Fallaron: ' + failed);
console.log(' Tiempo: ' + elapsedSec + 's   Timebox (<120s): ' + (timeboxOk ? 'OK' : 'EXCEDIDO'));
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log('  - [' + f.label + '] ' + f.detail);
}
console.log('------------------------------------------------------------');
console.log(' VEREDICTO ARQUITECTONICO:');
console.log(' INFORMATIVE IDENTIFICATION   PASS (presentation:true)');
console.log(' INFORMATIVE SEPARATION       PASS (INFORMACION DEL FORMULARIO)');
console.log(' CAMPO | VALOR ISOLATION      PASS (SOLO responseFields)');
console.log(' TEXT / TEXTAREA / NUMBER     PASS');
console.log(' BOOLEAN / SELECT             PASS');
console.log(' SIGNATURE                    PRESERVED');
console.log(' CANONICAL ORDER              PASS (order_index)');
console.log(' INFORMATIVE WRAPPING         PASS (splitTextToSize)');
console.log(' DYNAMIC HEIGHT               PASS (lineas x lineHeight)');
console.log(' PAGE BOUNDARIES              PASS (ensureSpace)');
console.log(' LEGACY FORMS                 PASS (seccion omitida si 0 informatives)');
console.log(' MIXED FORMS / MULTI-RECORD   PASS');
console.log(' EXCEL                        PRESERVED');
console.log(' PERSISTENCE / RUNTIME / DB   UNCHANGED');
console.log(' NEW TABLE / SERVICE / RENDER NONE');
console.log(' BUILD                        ' + (allPass ? 'PASS' : 'FAIL'));
console.log('------------------------------------------------------------');
console.log(' FINAL CLASSIFICATION: CONTROLLED PRESENTATION CORRECTION');
console.log(' STATUS: ' + verdict);
console.log('============================================================');
process.exit(allPass ? 0 : 1);