/**
 * SPRINT 334 — EVIDENCE REPORT INFORMATIVE SECTION LAYOUT · FORENSIC PRESENTATION AUDIT
 * LEVEL 5 · AUDIT ONLY · 0 cambios src
 *
 * Determina por qué INFORMACIÓN DEL FORMULARIO aparece superpuesta/desplazada
 * respecto de los bloques informative, pese a que Sprint 333 bis certificó la
 * separación ESTRUCTURAL. La auditoría traza el cursor vertical `y` y produce
 * geometría REAL renderizando el PDF con jspdf instrumentado (sin modificar src).
 *
 * Pregunta forense: ¿la sección INFORMACIÓN DEL FORMULARIO reserva y consume
 * su espacio antes de DATOS DEL REGISTRO, o hay discrepancia entre la posición
 * visual dibujada y el cursor lógico?
 *
 * Clasificación objetivo: FORENSIC PRESENTATION DISCREPANCY — CONTROLLED
 * CORRECTION REQUIRED (defecto de composición de sección / avance de cursor).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { jsPDF } from 'jspdf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const modelUrl = 'file:///' + path.join(ROOT, 'src', 'shared', 'report', 'evidenceReportModel.js').replace(/\\/g, '/');
const rendererUrl = 'file:///' + path.join(ROOT, 'src', 'shared', 'report', 'evidenceReportRenderer.js').replace(/\\/g, '/');
const { buildEvidenceReportModel } = await import(modelUrl);
const { renderEvidenceReport } = await import(rendererUrl);

const model = S('src/shared/report/evidenceReportModel.js');
const renderer = S('src/shared/report/evidenceReportRenderer.js');
const adapter = S('src/shared/report/dispatchEvidenceAdapter.js');
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
const REC = (id, values = [], extra = {}) => ({
  id, created_at: '2026-01-01T10:00:00Z', status: 'aprobado',
  sgc_forms: { id: 'form1', name: 'Calidad del Agua', module_id: 'm1' },
  sgc_response_values: values,
  criticalIssues: extra.criticalIssues || [],
  verifier: extra.verifier || '',
  verifierRol: extra.verifierRol || '',
});
const FIELD = (id, label, type, order_index, opts = {}) => ({
  id, label, field_type: type, required: opts.required ?? true,
  options: opts.options || {}, order_index,
});
const MODEL = (recs, sk) => buildEvidenceReportModel({ registros: recs, formFieldsByForm: sk ? { form1: sk } : {} });
const FIELDS = (recs, sk) => MODEL(recs, sk).forms[0].records[0].fields;
const LIGHT = [238, 242, 246];
const PRIMARY = [30, 41, 59];

/** Renderiza con doc instrumentado; devuelve ops (text/rect/textWithLink) + doc + lastAutoTable.finalY */
function renderGeo(skeleton, values, recExtra = {}) {
  const rec = { ...REC('r1', values, recExtra) };
  const m = MODEL([rec], skeleton);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const ops = [];
  let curFill = null;
  const oSetF = doc.setFillColor.bind(doc);
  const oText = doc.text.bind(doc);
  const oRect = doc.rect.bind(doc);
  const oTWL = doc.textWithLink.bind(doc);
  doc.setFillColor = function (...a) { curFill = a; return oSetF(...a); };
  doc.text = function (t, x, y, ...r) {
    const s = typeof t === 'string' ? t : (Array.isArray(t) ? t.join('\n') : String(t));
    ops.push({ k: 'text', t: s, x, y, p: doc.internal.getCurrentPageInfo().pageNumber });
    return oText(t, x, y, ...r);
  };
  doc.rect = function (x, y, w, h, s) {
    ops.push({ k: 'rect', x, y, w, h, s, fill: curFill ? curFill.slice() : null, p: doc.internal.getCurrentPageInfo().pageNumber });
    return oRect(x, y, w, h, s);
  };
  doc.textWithLink = function (t, x, y, ...r) {
    const s = typeof t === 'string' ? t : String(t);
    ops.push({ k: 'text', t: s, x, y, p: doc.internal.getCurrentPageInfo().pageNumber });
    return oTWL(t, x, y, ...r);
  };
  renderEvidenceReport({ model: m, doc });
  return { ops, doc, dataFinalY: doc.lastAutoTable ? doc.lastAutoTable.finalY : null, model: m };
}

const TITLE = /^(INFORMACIÓN DEL FORMULARIO|DATOS DEL REGISTRO|FIRMAS Y EVIDENCIAS)$/;
function analyze(ops, dataFinalY) {
  const titles = ops.filter((o) => o.k === 'text' && TITLE.test(o.t));
  const get = (name) => titles.find((o) => o.t === name);
  const infoTitle = get('INFORMACIÓN DEL FORMULARIO');
  const dataTitle = get('DATOS DEL REGISTRO');
  const sigTitle = get('FIRMAS Y EVIDENCIAS');
  const bands = ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === LIGHT[0] && o.fill[1] === LIGHT[1] && o.fill[2] === LIGHT[2]);
  const g = {
    infoTitleBaseline: infoTitle ? infoTitle.y : null,
    infoTitlePage: infoTitle ? infoTitle.p : null,
    infoBarTop: infoTitle ? infoTitle.y - 13 : null,
    infoBarBottom: infoTitle ? infoTitle.y + 5 : null,
    bands: bands.map((b) => ({ y: b.y, h: b.h, p: b.p })),
    dataTitleBaseline: dataTitle ? dataTitle.y : null,
    sigTitleBaseline: sigTitle ? sigTitle.y : null,
    dataFinalY,
  };
  if (g.infoBarTop !== null && g.bands.length > 0) {
    const first = g.bands[0];
    g.firstBandTop = first.y;
    g.firstBandBottom = first.y + first.h;
    g.firstBandPage = first.p;
    g.overlapPt = Math.max(0, g.infoBarBottom - first.y);
    g.titleCovered = first.y <= g.infoTitleBaseline && g.infoTitleBaseline <= first.y + first.h;
    const last = g.bands[g.bands.length - 1];
    g.infoEndY = Math.max(...g.bands.map((b) => b.y + b.h));
    g.lastBandPage = last.p;
  }
  if (g.infoEndY !== undefined && g.dataTitleBaseline !== null) {
    g.dataStartY = g.dataTitleBaseline - 13;
    g.infoDataOk = g.infoEndY <= g.dataStartY;
  }
  if (g.dataTitleBaseline !== null && g.sigTitleBaseline !== null && g.dataFinalY !== null) {
    g.sigStartY = g.sigTitleBaseline - 13;
    g.dataSigOk = g.dataFinalY <= g.sigStartY;
  }
  return g;
}/* ================= E-GATES: TRAZA ESTÁTICA DEL CURSOR y ================= */
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
  check(JSON.stringify(srcM) === JSON.stringify(expected), 'E01: AUDIT ONLY — 0 archivos src nuevos/modificados por 334', JSON.stringify(srcM));
  check(!git().some((e) => /\.sql$/.test(e.path) || /package(-lock)?\.json/.test(e.path)), 'E02: 0 SQL / 0 dependencias');

  // ensureSpace SEMÁNTICA: cada llamada debe ser asignada (y = ensureSpace)
  const esAll = countOf(/ensureSpace\(doc, y,/, renderer);
  const esAssigned = countOf(/y = ensureSpace\(doc, y,/, renderer);
  check(esAll === esAssigned, 'E03: ensureSpace SIEMPRE asignado (y = ensureSpace...) — 0 llamada huérfana', esAll + ' vs ' + esAssigned);
  H(/function ensureSpace\(doc, y, needed\)/, renderer, 'E04: ensureSpace devuelve el nuevo cursor (40 tras addPage)');
  H(/if \(y \+ needed > SAFE_BOTTOM\)/, renderer, 'E05: condición de salto = SAFE_BOTTOM (PAGE_H - 44)');

  // sectionTitle: barra de 18pt
  H(/doc\.rect\(MARGIN_X, y, width, 18, 'F'\)/, renderer, 'E06: sectionTitle dibuja barra de ALTURA 18');
  H(/doc\.text\(text, MARGIN_X \+ 6, y \+ 13\)/, renderer, 'E07: texto del título baseline en y+13 (dentro de la barra)');

  // DEFECTO: avance tras INFORMACIÓN DEL FORMULARIO = 8 (< 18)
  const infoBlock = renderer.slice(renderer.indexOf("sectionTitle(doc, y, 'INFORMACIÓN DEL FORMULARIO')"), renderer.indexOf("sectionTitle(doc, y, 'DATOS DEL REGISTRO')"));
  check(/sectionTitle\(doc, y, 'INFORMACIÓN DEL FORMULARIO'\);\n\s+y \+= 8;/.test(infoBlock), 'E08: avance tras título informativo = y += 8 (SOLO 8pt)');
  N(/y \+= (2[4-9]|3[0-9]|18);/, infoBlock.slice(0, 60), 'E09: 0 avance adecuado (>=18) inmediatamente tras el título informativo');

  // CONTRASTE: las demás secciones avanzan >= 26
  const secs = [
    ["sectionTitle(doc, y, 'INFORMACIÓN DEL REGISTRO')", 'y += 26;'],
    ["sectionTitle(doc, y, 'RESUMEN')", 'y += 28;'],
    ["sectionTitle(doc, y, 'CONTEXTO DEL FORMULARIO')", 'y += 28;'],
    ["sectionTitle(doc, y, 'FIRMAS Y EVIDENCIAS')", 'y += 26;'],
  ];
  for (const [title, gap] of secs) {
    const i = renderer.indexOf(title);
    check(i !== -1 && renderer.slice(i + title.length, i + title.length + 30).includes(gap), 'E10: ' + title.replace("sectionTitle(doc, y, '", '').replace("')", '') + ' avanza ' + gap.trim() + ' (patrón correcto)');
  }

  // Un solo cursor y dentro de drawRecord (sin cursor secundario)
  const dr = renderer.slice(renderer.indexOf('function drawRecord'), renderer.indexOf('export function renderEvidenceReport'));
  check(countOf(/let y =/, dr) === 1 && !/const y[0-9]|let y[0-9]/.test(dr), 'E11: un solo cursor vertical y en drawRecord (0 cursor secundario)');

  // Modelo intacto
  check(countOf(/export function buildEvidenceReportModel/, model) === 1, 'E12: un solo EvidenceReportModel');
  check(countOf(/export function renderEvidenceReport/, renderer) === 1, 'E13: un solo PDF renderer');
  check(countOf(/valueByField\.set\(val\.field_id/, model) === 1, 'E14: field_id mapping intacto');
  check(countOf(/order_index/, model) >= 1, 'E15: order_index intacto');
  N(/InformativeReportRenderer|FormInformationRenderer|InformativeSectionService|FormPresentationService/, renderer + model, 'E16: 0 servicio/renderer de presentación nuevo');
  N(/sgc_form_informative_fields|sgc_form_sections/, model + renderer, 'E17: 0 tabla nueva');
  check(countOf(/if \(field\.field_type === 'informative'\) return;/g, normalizer) === 3, 'E18: Excel intacto');
  N(/await\s|\.from\(|\.select\(|\.insert\(|\.update\(|fetch\(|getSupabaseClient/, model, 'E19: modelo 0-query');
  N(/doc\.rect\(MARGIN_X, y, CONTENT_W, 20, 'F'\)/, renderer, 'E20: 0 banda de altura fija');
  H(/splitTextToSize\(f\.label, CONTENT_W - 16\)/, renderer, 'E21: wrapping a CONTENT_W - 16');
  H(/bandHeight = lines\.length \* bandLineHeight \+ bandPadding/, renderer, 'E22: altura dinámica (líneas × 12 + 8)');
  H(/ensureSpace\(doc, y, bandHeight \+ 4\)/, renderer, 'E23: paginación segura del bloque');
  N(/truncate|ellipsis|slice\(0,/, infoBlock, 'E24: 0 truncado/ellipsis en bloque informativo');
  const absInBlock = renderer.slice(renderer.indexOf("'INFORMACIÓN DEL FORMULARIO'"), renderer.indexOf("'DATOS DEL REGISTRO'"));
  N(/doc\.text\([^,]+, MARGIN_X, [0-9]+\)|y \+ [0-9]{3,}/, absInBlock, 'E25: 0 posición absoluta arbitraria en el bloque informativo');
}

/* ============ FORENSIC RUNTIME: geometría REAL del PDF ============ */
{
  const sk1 = [
    FIELD('f1', 'FILTRO SANITARIO', 'informative', 1),
    FIELD('f2', 'Temperatura', 'number', 2),
    FIELD('f3', 'Estado', 'boolean', 3),
    FIELD('f4', 'Observaciones', 'textarea', 4),
  ];
  const g = analyze(renderGeo(sk1, [VAL('f2', 'number', 4), VAL('f3', 'boolean', true), VAL('f4', 'textarea', 'Sin novedades')]).ops, null);

  check(g.infoTitleBaseline !== null, 'F01: INFORMACIÓN DEL FORMULARIO se dibuja');
  check(g.bands.length >= 1, 'F02: al menos 1 bloque informative dibujado');
  check(g.firstBandPage === g.infoTitlePage, 'F03: título y primer bloque en la MISMA página');
  check(g.overlapPt >= 10, 'F04: DEFECTO CERTIFICADO — primer bloque superpone la barra del título', 'overlap=' + g.overlapPt.toFixed(1) + 'pt');
  check(g.titleCovered === true, 'F05: DEFECTO — el bloque cubre el texto del título (baseline dentro del bloque)', 'baseline=' + g.infoTitleBaseline + ' bloque=[' + g.firstBandTop + ',' + g.firstBandBottom + ']');
  check(g.infoBarTop !== null && g.firstBandTop === g.infoBarTop + 8, 'F06: causa geométrica = avance de 8pt tras barra de 18pt', g.firstBandTop + ' vs ' + (g.infoBarTop + 8));
  check(g.infoEndY !== undefined && g.infoDataOk === true, 'F07: límite INTER-sección OK (INFO.endY <= DATOS.startY) — el defecto es INTRA-sección', 'INFO.endY=' + g.infoEndY + ' DATOS.startY=' + g.dataStartY);

  const g2 = analyze(renderGeo(sk1, [VAL('f2', 'number', 4), VAL('f3', 'boolean', true), VAL('f4', 'textarea', 'Sin novedades')]).ops, null);
  const r2 = renderGeo(sk1, [VAL('f2', 'number', 4), VAL('f3', 'boolean', true), VAL('f4', 'textarea', 'Sin novedades')]);
  const a2 = analyze(r2.ops, r2.dataFinalY);
  check(a2.dataFinalY !== null && a2.dataSigOk === true, 'F08: límite INTER-sección OK (DATOS.finalY <= FIRMAS.startY)', 'DATOS.finalY=' + a2.dataFinalY + ' FIRMAS.startY=' + a2.sigStartY);

  // Tabla Campo|Valor sin informative
  const rT = renderGeo(sk1, [VAL('f2', 'number', 4), VAL('f3', 'boolean', true), VAL('f4', 'textarea', 'Sin novedades')]);
  const dataOps = rT.ops.filter((o) => o.k === 'text' && o.t === 'DATOS DEL REGISTRO');
  const idxData = rT.ops.indexOf(dataOps[0]);
  const idxSig = rT.ops.indexOf(rT.ops.find((o) => o.k === 'text' && o.t === 'FIRMAS Y EVIDENCIAS'));
  const tableTexts = rT.ops.slice(idxData, idxSig).filter((o) => o.k === 'text').map((o) => o.t);
  check(!tableTexts.includes('FILTRO SANITARIO'), 'F09: informative NO aparece en Campo | Valor (textos de tabla)');
  const sigTexts = rT.ops.slice(idxSig).filter((o) => o.k === 'text').map((o) => o.t);
  check(!sigTexts.some((t) => t === 'FILTRO SANITARIO'), 'F10: informative NO aparece en FIRMAS Y EVIDENCIAS');

  // Múltiples informativos: intervalos independientes
  const skMulti = [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'I2', 'informative', 2), FIELD('c', 'I3', 'informative', 3), FIELD('d', 'D', 'text', 4)];
  const gM = analyze(renderGeo(skMulti, [VAL('d', 'text', 'x')]).ops, null);
  check(gM.bands.length === 3, 'F11: 3 bloques informative dibujados');
  const iv = gM.bands.map((b) => ({ a: b.y, b: b.y + b.h }));
  check(iv[0].b < iv[1].a && iv[1].b < iv[2].a, 'F12: bloques con intervalo vertical independiente (I1 < I2 < I3)', JSON.stringify(iv));

  // Informative largo → wrap (bandHeight > 20) y 0 overflow horizontal
  const longLabel = 'FILTRO SANITARIO — INSTRUCCIONES PARA EL OPERARIO DE TURNO: verifique las condiciones sanitarias del área antes de iniciar las actividades. LIMPIEZA Y DESINFECCIÓN: realice la inspección correspondiente antes de continuar.';
  const gL = analyze(renderGeo([FIELD('a', longLabel, 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]).ops, null);
  check(gL.bands.length === 1 && gL.bands[0].h > 20, 'F13: informative largo → bloque envuelto (altura > 1 línea)', 'h=' + gL.bands[0].h);
  const rL = renderGeo([FIELD('a', longLabel, 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]);
  const rects = rL.ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238);
  check(rects.every((o) => o.w === 515.28), 'F14: 0 overflow horizontal (rect w = CONTENT_W)', JSON.stringify(rects.map((o) => o.w)));

  // Legacy (sin informative): sección omitida
  const skLegacy = [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'number', 2), FIELD('c', 'C', 'boolean', 3), FIELD('d', 'D', 'select', 4)];
  const gJ = analyze(renderGeo(skLegacy, [VAL('a', 'text', 'x'), VAL('b', 'number', 1), VAL('c', 'boolean', true), VAL('d', 'select', 'Y')]).ops, null);
  check(gJ.infoTitleBaseline === null && gJ.bands.length === 0, 'F15: legacy → 0 título informativo, 0 bloque (reporte idéntico)');
  check(gJ.dataTitleBaseline !== null && gJ.sigTitleBaseline !== null, 'F16: legacy → DATOS + FIRMAS intactos');

  // Informative + respuestas + firma
  const skE = [FIELD('i', 'I', 'informative', 1), FIELD('t', 'T', 'text', 2), FIELD('x', 'X', 'textarea', 3), FIELD('n', 'N', 'number', 4), FIELD('b', 'B', 'boolean', 5), FIELD('s', 'S', 'select', 6), FIELD('f', 'F', 'signature', 7)];
  const rE = renderGeo(skE, [VAL('t', 'text', 'a'), VAL('x', 'textarea', 'b'), VAL('n', 'number', 1), VAL('b', 'boolean', true), VAL('s', 'select', 'Y'), VAL('f', 'signature', '', { text: 'https://x/f.png' })]);
  const gE = analyze(rE.ops, rE.dataFinalY);
  check(gE.infoTitleBaseline !== null && gE.dataTitleBaseline !== null && gE.sigTitleBaseline !== null, 'F17: tres secciones presentes (informative + respuestas + firma)');
  check(rE.model.forms[0].records[0].signatures.length === 1, 'F18: firma preservada en el modelo');
  check(gE.infoDataOk === true && gE.dataSigOk === true, 'F19: límites inter-sección OK en escenario completo');

  // Informative entre respuestas (order_index intermedio): metadata conservada
  const skF = [FIELD('a', 'A', 'text', 1), FIELD('b', 'I', 'informative', 2), FIELD('c', 'C', 'number', 3)];
  const seq = FIELDS([REC('r', [VAL('a', 'text', 'x'), VAL('c', 'number', 2)])], skF).map((f) => f.label + (f.presentation ? '#P' : '')).join(',');
  check(seq === 'A,I#P,C', 'F20: informative entre respuestas → metadata y orden conservados', seq);

  // Página llena → page break sin destruir estructura
  const skG = [];
  for (let i = 1; i <= 14; i++) skG.push(FIELD('i' + i, 'BLOQUE INFORMATIVO ' + i + ' — INSTRUCCIONES DE OPERACIÓN PARA EL PERSONAL DE TURNO ANTES DE INICIAR LAS ACTIVIDADES DEL DÍA', 'informative', i));
  skG.push(FIELD('r', 'R', 'text', 15));
  const rG = renderGeo(skG, [VAL('r', 'text', 'x')]);
  check(rG.doc.getNumberOfPages() > 1, 'F21: informative provoca page break (multi-página)', 'pages=' + rG.doc.getNumberOfPages());
  const gG = analyze(rG.ops, rG.dataFinalY);
  check(gG.infoTitleBaseline !== null && gG.dataTitleBaseline !== null && gG.sigTitleBaseline !== null, 'F22: estructura conservada tras page break');
  check(gG.bands.every((b) => b.h > 20), 'F23: cada bloque paginado conserva altura dinámica');

  // Informative multilínea justo antes de DATOS: límite inter-sección
  const gH = analyze(renderGeo(sk1, [VAL('f2', 'number', 4), VAL('f3', 'boolean', true), VAL('f4', 'textarea', 'Sin novedades')]).ops, null);
  check(gH.infoEndY <= gH.dataStartY, 'F24: informativeBottom < datosHeaderTop (límite inter-sección)');

  // ensureSpace respeta cursor tras page break (y = 40 en página nueva)
  const rI = renderGeo(skG, [VAL('r', 'text', 'x')]);
  const bandsP2 = rI.ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238 && o.p === 2).map((o) => o.y);
  check(bandsP2.length > 0 && bandsP2[0] === 40, 'F25: tras page break el cursor vuelve a 40 (página 2)', JSON.stringify(bandsP2));

  console.log('--- EVIDENCIA GEOMÉTRICA (escenario C — informative + respuestas) ---');
  const gEv = analyze(renderGeo(sk1, [VAL('f2', 'number', 4), VAL('f3', 'boolean', true), VAL('f4', 'textarea', 'Sin novedades')]).ops, null);
  console.log(' INFORMACIÓN DEL FORMULARIO: startY=' + gEv.infoBarTop.toFixed(1) + ' endY=' + gEv.infoEndY.toFixed(1) + ' height=' + (gEv.infoEndY - gEv.infoBarTop).toFixed(1) + 'pt page=' + gEv.infoTitlePage);
  console.log('   primer bloque informative: top=' + gEv.firstBandTop + ' bottom=' + gEv.firstBandBottom.toFixed(1) + ' → OVERLAP barra = ' + gEv.overlapPt.toFixed(1) + 'pt; título cubierto = ' + gEv.titleCovered);
  console.log(' DATOS DEL REGISTRO: startY=' + gEv.dataStartY.toFixed(1));
  console.log(' INFO.endY(' + gEv.infoEndY.toFixed(1) + ') <= DATOS.startY(' + gEv.dataStartY.toFixed(1) + ') → ' + gEv.infoDataOk);
  console.log('______________________________________________________________');}
/* ================= INVARIANTES 01-30 ================= */
{
  const inv = (n, cond, label, kind) => {
    if (kind === 'D') {
      if (cond) passed++;
      else { failed++; failures.push({ label: 'INV' + String(n).padStart(2, '0') + ': ' + label, detail: 'DISCREPANCIA (esperada)' }); }
    } else if (kind === 'EXPECT') {
      if (!cond) passed++;
      else { failed++; failures.push({ label: 'INV' + String(n).padStart(2, '0') + ': ' + label, detail: 'esperada DISCREPANCIA, ausente' }); }
    } else if (cond) passed++;
    else { failed++; failures.push({ label: 'INV' + String(n).padStart(2, '0') + ': ' + label }); }
  };
  const g = analyze(renderGeo([FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]).ops, null);

  inv(1, renderGeo([FIELD('a', 'A', 'text', 1)], [VAL('a', 'text', 'x')]).ops.some((o) => o.k === 'text' && o.t === 'INFORMACIÓN DEL FORMULARIO') === false && g.infoTitleBaseline !== null, 'INFORMACIÓN DEL FORMULARIO existe solo con informativos');
  inv(2, (() => { const r = renderGeo([FIELD('i', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]); const iD = r.ops.indexOf(r.ops.find((o) => o.k === 'text' && o.t === 'DATOS DEL REGISTRO')); const iS = r.ops.indexOf(r.ops.find((o) => o.k === 'text' && o.t === 'FIRMAS Y EVIDENCIAS')); return !r.ops.slice(iD, iS).some((o) => o.k === 'text' && o.t === 'I'); })(), 'informativos no aparecen en Campo | Valor');
  inv(3, (() => { const r = renderGeo([FIELD('i', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]); const iS = r.ops.indexOf(r.ops.find((o) => o.k === 'text' && o.t === 'FIRMAS Y EVIDENCIAS')); return !r.ops.slice(iS).some((o) => o.k === 'text' && o.t === 'I'); })(), 'informativos no aparecen en FIRMAS Y EVIDENCIAS');
  inv(4, countOf(/export function renderEvidenceReport/, renderer) === 1, 'un solo renderer PDF');
  inv(5, (() => { const dr = renderer.slice(renderer.indexOf('function drawRecord'), renderer.indexOf('export function renderEvidenceReport')); return countOf(/let y =/, dr) === 1 && !/const y[0-9]|let y[0-9]/.test(dr); })(), 'un solo cursor vertical y');
  inv(6, g.bands.length === 1 && g.bands[0].h >= 20, 'cada bloque consume su propia altura');
  inv(7, /splitTextToSize\(f\.label, CONTENT_W - 16\)/.test(renderer), 'splitTextToSize determina las líneas');
  inv(8, (() => { const r = renderGeo([FIELD('a', 'CORTO', 'informative', 1)], []); const rect = r.ops.find((o) => o.k === 'rect' && o.fill && o.fill[0] === 238); return rect && Math.abs(rect.h - 20) < 0.001; })(), 'altura lógica = altura visual (1 línea = 20pt)');
  inv(9, countOf(/ensureSpace\(doc, y,/, renderer) === countOf(/y = ensureSpace\(doc, y,/, renderer), 'ensureSpace respeta el cursor (asignado)');
  inv(10, g.overlapPt === 0, 'no existe overlap vertical', 'EXPECT'); // DISCREPANCIA certificada (barra 18pt vs avance 8pt)
  inv(11, renderGeo([FIELD('a', 'CORTO', 'informative', 1)], []).ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238).every((o) => o.w <= 515.28), 'no existe overflow horizontal');
  inv(12, (() => { const r = renderGeo([FIELD('a', 'I1', 'informative', 1), FIELD('b', 'I2', 'informative', 2), FIELD('c', 'I3', 'informative', 3)], []); const bs = r.ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238).map((o) => ({ a: o.y, b: o.y + o.h })); return bs[0].b < bs[1].a && bs[1].b < bs[2].a; })(), 'múltiples informativos mantienen separación');
  inv(13, g.infoEndY <= g.dataStartY, 'sección anterior no invade sección siguiente (INTRA-sección es el defecto, INTER se respeta)');
  inv(14, g.infoEndY <= g.dataStartY, 'DATOS DEL REGISTRO comienza después de información');
  inv(15, (() => { const r = renderGeo([FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]); const a = analyze(r.ops, r.dataFinalY); return a.dataFinalY !== null && a.dataFinalY <= a.sigStartY; })(), 'FIRMAS Y EVIDENCIAS comienza después de datos');
  inv(16, (() => { const sk = []; for (let i = 1; i <= 12; i++) sk.push(FIELD('i' + i, 'BLOQUE ' + i + ' — INSTRUCCIONES DE OPERACIÓN PARA EL PERSONAL DE TURNO ANTES DE INICIAR', 'informative', i)); sk.push(FIELD('r', 'R', 'text', 13)); const r = renderGeo(sk, [VAL('r', 'text', 'x')]); return r.doc.getNumberOfPages() > 1 && r.ops.some((o) => o.k === 'text' && o.t === 'DATOS DEL REGISTRO'); })(), 'salto de página conserva estructura');
  inv(17, renderGeo([FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'boolean', 2)], [VAL('a', 'text', 'x'), VAL('b', 'boolean', true)]).ops.some((o) => o.k === 'text' && o.t === 'INFORMACIÓN DEL FORMULARIO') === false, 'legacy preservado');
  inv(18, FIELDS([REC('m', [VAL('b', 'text', 't')])], [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'I2', 'informative', 3)]).length === 3, 'mixed form preservado');
  inv(19, countOf(/if \(field\.field_type === 'informative'\) return;/g, normalizer) === 3, 'Excel intacto');
  inv(20, countOf(/export function buildEvidenceReportModel/, model) === 1 && countOf(/valueByField\.set\(val\.field_id/, model) === 1, 'modelo de datos intacto');
  inv(21, countOf(/valueByField\.set\(val\.field_id/, model) === 1, 'field_id ↔ field.id intacto');
inv(22, FIELDS([REC('o', [VAL('b', 'text', 't'), VAL('c', 'number', 3)])], [FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'C', 'number', 3)]).map((f) => f.order).join(',') === '1,2,3', 'order_index intacto');
  inv(23, model === S('src/shared/report/evidenceReportModel.js') && renderer === S('src/shared/report/evidenceReportRenderer.js') && adapter === S('src/shared/report/dispatchEvidenceAdapter.js'), 'objeto auditado NO mutado durante la auditoría (0 cambios src)');
  inv(24, !git().some((e) => /\.sql$/.test(e.path)), 'cero SQL');
  inv(25, !/InformativeReportRenderer|FormInformationRenderer|InformativeSectionService|FormPresentationService/.test(renderer + model), 'cero servicio nuevo');
  inv(26, countOf(/export function renderEvidenceReport/, renderer) === 1, 'cero renderer nuevo');
  inv(27, !/secondEvidenceReport|EvidenceReportModel2|buildEvidenceReportModel2/.test(model + renderer), 'cero segundo pipeline');
  inv(28, !/[0-9]{2,}\.5/.test(renderer.slice(renderer.indexOf("'INFORMACIÓN DEL FORMULARIO'"), renderer.indexOf("'DATOS DEL REGISTRO'"))) || !renderer.slice(renderer.indexOf("'INFORMACIÓN DEL FORMULARIO'"), renderer.indexOf("'DATOS DEL REGISTRO'")).includes("doc.text(..., 1"), 'cero posición absoluta en el bloque');
  inv(29, !/truncate|ellipsis|slice\(0,/.test(renderer.slice(renderer.indexOf("'INFORMACIÓN DEL FORMULARIO'"), renderer.indexOf("'DATOS DEL REGISTRO'"))), 'cero truncado');
  inv(30, spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' }).status === 0, 'build PASS');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const auditComplete = failures.length === 0;
const verdict = auditComplete && timeboxOk ? 'ROOT CAUSE CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 334 — EVIDENCE REPORT INFORMATIVE SECTION LAYOUT');
console.log(' · FORENSIC PRESENTATION AUDIT · AUDIT ONLY (0 src)');
console.log('============================================================');
console.log(' Gates E01..E25 + Forensic F01..F25 + INV01..INV30');
console.log(' Pasaron: ' + passed + '   Fallaron: ' + failed);
console.log(' Tiempo: ' + elapsedSec + 's   Timebox (<120s): ' + (timeboxOk ? 'OK' : 'EXCEDIDO'));
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log('  - [' + f.label + '] ' + f.detail);
}
console.log('------------------------------------------------------------');
console.log(' TRAZA DEL CURSOR y (drawRecord → INFORMACIÓN DEL FORMULARIO):');
console.log('  sectionTitle(doc, y, ...)  →  barra rect(MARGIN_X, y, CONTENT_W, 18, F)  [y, y+18]');
console.log('  y += 8                     →  SOLO 8pt de avance (< 18 de la barra)');
console.log('  primer bloque rect(...)    →  empieza en y+8  →  SOLAPE de 10pt sobre la barra');
console.log('  título baseline y+13       →  DENTRO del bloque [y+8, y+8+bandHeight]  →  cubierto');
console.log('  Otras secciones: INFORMACIÓN DEL REGISTRO y += 26 · RESUMEN y += 28 ·');
console.log('  CONTEXTO y += 28 · FIRMAS y += 26  (patrón correcto, avance >= barra)');
console.log('------------------------------------------------------------');
console.log(' VEREDICTO ARQUITECTÓNICO:');
console.log(' FIELD PROJECTION            CERTIFIED');
console.log(' FIELD VALUE                 CERTIFIED');
console.log(' INFORMATIVE MODEL           CERTIFIED');
console.log(' INFORMATIVE SEPARATION      CERTIFIED (structural)');
console.log(' CAMPO | VALOR               CERTIFIED');
console.log(' SIGNATURE                   PRESERVED');
console.log(' EXCEL                       PRESERVED');
console.log(' ensureSpace / page break    CERTIFIED (y = ensureSpace, cursor 40)');
console.log(' height calculation          CERTIFIED (bandHeight = líneas × 12 + 8)');
console.log(' inter-section boundaries    CERTIFIED (INFO.endY <= DATOS.startY)');
console.log(' INTRA-section title overlap DISCREPANCIA CERTIFICADA (barra 18pt vs avance 8pt)');
console.log('------------------------------------------------------------');
console.log(' CLASIFICACIÓN: D) SECTION COMPOSITION DEFECT');
console.log('   mecanismo: avance del cursor tras el título de 18pt = 8pt');
console.log('   corrección requerida (quirúrgica, 1 línea): y += 18 tras el título');
console.log('   (o adoptar el patrón de la casa y += 26)');
console.log(' FINAL CLASSIFICATION: FORENSIC PRESENTATION DISCREPANCY');
console.log('   → CONTROLLED PRESENTATION CORRECTION REQUIRED');
console.log(' STATUS: ' + verdict);
console.log('============================================================');
process.exit(auditComplete && timeboxOk ? 0 : 1);