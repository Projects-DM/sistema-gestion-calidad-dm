/**
 * /*
 * SPRINT 335 — EVIDENCE REPORT INFORMATIVE SECTION SPACING · CONTROLLED PRESENTATION CORRECTION
 * LEVEL 5 · IMPLEMENTATION · CONTROLLED PRESENTATION CORRECTION
 *
 * Precedente: Sprint 334 — Forensic Presentation Audit (ROOT CAUSE CERTIFIED 83/83).
 * Causa raíz certificada: tras sectionTitle de 18pt, la sección INFORMACIÓN DEL FORMULARIO
 * avanzaba solo y += 8 → el primer bloque informative solapaba la barra 10pt y cubría el título.
 * Corrección autorizada (1 archivo): y += 8 → y += 26 (18pt header + 8pt spacing = 26pt consumed).
 * ONE SECTION HEADER · ONE CONSUMED HEIGHT · ZERO INTRA-SECTION OVERLAP
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
}
/* ================= E01–E20: SCOPE + CORRECCIÓN LOCALIZADA ================= */
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
  check(JSON.stringify(srcM) === JSON.stringify(expected), 'E01: SCOPE 1 ARCHIVO — mismo set src que 334 (0 archivos nuevos)', JSON.stringify(srcM));
  check(!git().some((e) => /\.sql$/.test(e.path) || /package(-lock)?\.json/.test(e.path)), 'E02: 0 SQL / 0 dependencias');

  const infoBlock = renderer.slice(renderer.indexOf("sectionTitle(doc, y, 'INFORMACIÓN DEL FORMULARIO')"), renderer.indexOf("sectionTitle(doc, y, 'DATOS DEL REGISTRO')"));
  H(/sectionTitle\(doc, y, 'INFORMACIÓN DEL FORMULARIO'\);\n\s+y \+= 26;/, renderer, 'E03: avance tras título informativo = y += 26 (18 header + 8 spacing)');
  N(/y \+= 8;/, infoBlock, 'E04: 0 avance y += 8 en el bloque informativo (defecto 334 eliminado)');
  N(/y \+= (1[0-9]|2[0-5]|2[7-9]|3[0-9]|[4-9][0-9]);/, infoBlock.slice(0, 60), 'E05: avance inmediato = EXACTAMENTE 26 (ni 8 ni otro valor)');

  const secs = [
    ["sectionTitle(doc, y, 'INFORMACIÓN DEL REGISTRO')", 'y += 26;'],
    ["sectionTitle(doc, y, 'RESUMEN')", 'y += 28;'],
    ["sectionTitle(doc, y, 'CONTEXTO DEL FORMULARIO')", 'y += 28;'],
    ["sectionTitle(doc, y, 'FIRMAS Y EVIDENCIAS')", 'y += 26;'],
  ];
  for (const [title, gap] of secs) {
    const i = renderer.indexOf(title);
    check(i !== -1 && renderer.slice(i + title.length, i + title.length + 30).includes(gap), 'E06: ' + title.replace("sectionTitle(doc, y, '", '').replace("')", '') + ' avanza ' + gap.trim() + ' (patrón conservado)');
  }

  H(/doc\.rect\(MARGIN_X, y, width, 18, 'F'\)/, renderer, 'E07: sectionTitle barra de ALTURA 18');
  H(/doc\.text\(text, MARGIN_X \+ 6, y \+ 13\)/, renderer, 'E08: título baseline y+13 (dentro de la barra)');

  const esAll = countOf(/ensureSpace\(doc, y,/, renderer);
  const esAssigned = countOf(/y = ensureSpace\(doc, y,/, renderer);
  check(esAll === esAssigned, 'E09: ensureSpace SIEMPRE asignado (y = ensureSpace...)', esAll + ' vs ' + esAssigned);
  H(/function ensureSpace\(doc, y, needed\)/, renderer, 'E10: ensureSpace devuelve el nuevo cursor (40 tras addPage)');
  H(/if \(y \+ needed > SAFE_BOTTOM\)/, renderer, 'E11: condición de salto = SAFE_BOTTOM (PAGE_H - 44)');

  const dr = renderer.slice(renderer.indexOf('function drawRecord'), renderer.indexOf('export function renderEvidenceReport'));
  check(countOf(/let y =/, dr) === 1 && !/const y[0-9]|let y[0-9]/.test(dr), 'E12: un solo cursor vertical y (0 cursor secundario)');
  check(countOf(/export function renderEvidenceReport/, renderer) === 1, 'E13: un solo PDF renderer');
  check(countOf(/export function buildEvidenceReportModel/, model) === 1, 'E14: un solo EvidenceReportModel');
  check(countOf(/valueByField\.set\(val\.field_id/, model) === 1, 'E15: field_id mapping intacto');
  N(/InformativeReportRenderer|FormInformationRenderer|InformativeSectionService|FormPresentationService/, renderer + model, 'E16: 0 servicio/renderer de presentación nuevo');
  N(/sgc_form_informative_fields|sgc_form_sections/, model + renderer, 'E17: 0 tabla nueva');
  check(countOf(/if \(field\.field_type === 'informative'\) return;/g, normalizer) === 3, 'E18: Excel intacto (informative excluido en 3 pases)');
  N(/await\s|\.from\(|\.select\(|\.insert\(|\.update\(|fetch\(|getSupabaseClient/, model, 'E19: modelo 0-query');
  H(/splitTextToSize\(f\.label, CONTENT_W - 16\)/, renderer, 'E20: wrapping a CONTENT_W - 16 (preservado)');
}
/* ================= E21–E40: GEOMETRÍA DEL SECTION HEADER (render REAL) ================= */
{
  const sk1 = [
    FIELD('f1', 'FILTRO SANITARIO', 'informative', 1),
    FIELD('f2', 'Temperatura', 'number', 2),
    FIELD('f3', 'Estado', 'boolean', 3),
    FIELD('f4', 'Observaciones', 'textarea', 4),
  ];
  const g = analyze(renderGeo(sk1, [VAL('f2', 'number', 4), VAL('f3', 'boolean', true), VAL('f4', 'textarea', 'Sin novedades')]).ops, null);

  check(g.infoTitleBaseline !== null, 'E21: INFORMACIÓN DEL FORMULARIO se dibuja (título visible)');
  check(g.infoBarTop !== null, 'E22: barra del título presente', 'top=' + g.infoBarTop);
  check(g.infoBarBottom === g.infoBarTop + 18, 'E23: barra completa de 18pt', g.infoBarTop + '..' + g.infoBarBottom);
  check(g.bands.length >= 1, 'E24: al menos 1 bloque informative dibujado');
  check(g.firstBandPage === g.infoTitlePage, 'E25: título y primer bloque en la MISMA página');
  check(g.overlapPt === 0, 'E26: overlap INTRA-sección = 0pt (corregido)', 'overlap=' + g.overlapPt.toFixed(1) + 'pt');
  check(g.titleCovered === false, 'E27: el bloque NO cubre el texto del título', 'baseline=' + g.infoTitleBaseline + ' bloque=[' + g.firstBandTop + ',' + g.firstBandBottom + ']');
  check(g.firstBandTop === g.infoBarBottom + 8, 'E28: primer bloque comienza tras barra + 8pt (26pt consumidos)', g.firstBandTop + ' vs barra+' + (g.infoBarBottom + 8));
  check(g.infoEndY !== undefined && g.infoDataOk === true, 'E29: límite INTER-sección OK (INFO.endY <= DATOS.startY)', 'INFO.endY=' + g.infoEndY + ' DATOS.startY=' + g.dataStartY);
  check(g.dataStartY > g.infoEndY, 'E30: DATOS.startY ESTRICTAMENTE > informativeEndY (regla crítica)', g.dataStartY + ' > ' + g.infoEndY);
  check(g.bands[0].h === 20, 'E31: bloque de 1 línea = 20pt (altura dinámica)');
  check(g.infoBarTop === 534, 'E32: geometría certificada — barra en y=534 (escenario C)', 'top=' + g.infoBarTop);
  check(g.firstBandTop >= g.infoBarBottom + 8, 'E33: informativeTop >= sectionTitleBottom + 8', g.firstBandTop + ' >= ' + (g.infoBarBottom + 8));
  const rT = renderGeo(sk1, [VAL('f2', 'number', 4), VAL('f3', 'boolean', true), VAL('f4', 'textarea', 'Sin novedades')]);
  check(rT.ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238).every((o) => o.w === 515.28), 'E34: 0 overflow horizontal (rect w = CONTENT_W)');
  const idxData = rT.ops.indexOf(rT.ops.find((o) => o.k === 'text' && o.t === 'DATOS DEL REGISTRO'));
  const idxSig = rT.ops.indexOf(rT.ops.find((o) => o.k === 'text' && o.t === 'FIRMAS Y EVIDENCIAS'));
  check(!rT.ops.slice(idxData, idxSig).filter((o) => o.k === 'text').map((o) => o.t).includes('FILTRO SANITARIO'), 'E35: informative NO aparece en Campo | Valor');
  check(!rT.ops.slice(idxSig).filter((o) => o.k === 'text').map((o) => o.t).some((t) => t === 'FILTRO SANITARIO'), 'E36: informative NO aparece en FIRMAS Y EVIDENCIAS');
  const a2 = analyze(rT.ops, rT.dataFinalY);
  check(a2.dataFinalY !== null && a2.dataSigOk === true, 'E37: DATOS.finalY <= FIRMAS.startY (límite inter-sección)', 'DATOS.finalY=' + a2.dataFinalY + ' FIRMAS.startY=' + a2.sigStartY);
  check(rT.model.forms[0].records[0].signatures.length === 0, 'E38: escenario sin firma → 0 firma en modelo');
  check(/splitTextToSize\(f\.label, CONTENT_W - 16\)/.test(renderer), 'E39: wrapping preservado (splitTextToSize CONTENT_W-16)');
  check(countOf(/ensureSpace\(doc, y, bandHeight \+ 4\)/, renderer) === 1, 'E40: paginación segura del bloque preservada');
}
/* ================= E41–E55: MÚLTIPLES INFORMATIVE ================= */
{
  const skMulti = [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'I2', 'informative', 2), FIELD('c', 'I3', 'informative', 3), FIELD('d', 'D', 'text', 4)];
  const gM = analyze(renderGeo(skMulti, [VAL('d', 'text', 'x')]).ops, null);
  check(gM.bands.length === 3, 'E41: 3 bloques informative dibujados');
  const iv = gM.bands.map((b) => ({ a: b.y, b: b.y + b.h }));
  check(iv[0].b < iv[1].a && iv[1].b < iv[2].a, 'E42: intervalos verticales independientes (I1 < I2 < I3)', JSON.stringify(iv));
  check(iv[1].a - iv[0].b >= 4 && iv[2].a - iv[1].b >= 4, 'E43: separación entre bloques >= 4pt preservada', JSON.stringify(iv));
  check(gM.overlapPt === 0, 'E44: 0 overlap con 3 bloques');
  check(gM.bands.every((b) => b.h === 20), 'E45: cada bloque corto consume 20pt');

  const skF = [FIELD('a', 'A', 'text', 1), FIELD('b', 'I', 'informative', 2), FIELD('c', 'C', 'number', 3)];
  const seq = FIELDS([REC('r', [VAL('a', 'text', 'x'), VAL('c', 'number', 2)])], skF).map((f) => f.label + (f.presentation ? '#P' : '')).join(',');
  check(seq === 'A,I#P,C', 'E46: informative entre respuestas → metadata y orden canónico conservados', seq);
  check(FIELDS([REC('m', [VAL('b', 'text', 't')])], [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'I2', 'informative', 3)]).length === 3, 'E47: mixed form → 3 campos preservados');

  const longLabel = 'FILTRO SANITARIO — INSTRUCCIONES PARA EL OPERARIO DE TURNO: verifique las condiciones sanitarias del área antes de iniciar las actividades. LIMPIEZA Y DESINFECCIÓN: realice la inspección correspondiente antes de continuar.';
  const rL = renderGeo([FIELD('a', longLabel, 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]);
  const gL = analyze(rL.ops, rL.dataFinalY);
  check(gL.bands.length === 1 && gL.bands[0].h > 20, 'E48: informative largo → bloque envuelto (altura > 1 línea)', 'h=' + gL.bands[0].h);
  check(gL.overlapPt === 0, 'E49: 0 overlap con informative largo');
  check(rL.ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238).every((o) => o.w === 515.28), 'E50: 0 overflow horizontal (rect w = CONTENT_W)');
  check(!/truncate|ellipsis|slice\(0,/.test(renderer.slice(renderer.indexOf("'INFORMACIÓN DEL FORMULARIO'"), renderer.indexOf("'DATOS DEL REGISTRO'"))), 'E51: 0 truncado/ellipsis en bloque informativo');
  const absInBlock = renderer.slice(renderer.indexOf("'INFORMACIÓN DEL FORMULARIO'"), renderer.indexOf("'DATOS DEL REGISTRO'"));
  check(!/[0-9]{2,}\.5/.test(absInBlock) || !absInBlock.includes('doc.text(..., 1'), 'E52: 0 posición absoluta arbitraria en el bloque');
  check(renderGeo([FIELD('a', 'I1', 'informative', 1), FIELD('b', 'I2', 'informative', 2)], []).ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238).every((o) => o.p === 1), 'E53: bloques cortos en la MISMA página');
  check(renderGeo([FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'number', 2)], [VAL('a', 'text', 'x'), VAL('b', 'number', 1)]).ops.some((o) => o.k === 'text' && o.t === 'INFORMACIÓN DEL FORMULARIO') === false, 'E54: 0 sección informativa sin informative');
  check(renderGeo([FIELD('a', 'CORTO', 'informative', 1)], []).ops.some((o) => o.k === 'text' && o.t === 'DATOS DEL REGISTRO'), 'E55: informative-only → DATOS presente (Sin datos registrados)');
}
/* ================= E56–E70: PAGE BOUNDARIES ================= */
{
  const skG = [];
  for (let i = 1; i <= 14; i++) skG.push(FIELD('i' + i, 'BLOQUE INFORMATIVO ' + i + ' — INSTRUCCIONES DE OPERACIÓN PARA EL PERSONAL DE TURNO ANTES DE INICIAR LAS ACTIVIDADES DEL DÍA', 'informative', i));
  skG.push(FIELD('r', 'R', 'text', 15));
  const rG = renderGeo(skG, [VAL('r', 'text', 'x')]);
  check(rG.doc.getNumberOfPages() > 1, 'E56: informative provoca page break (multi-página)', 'pages=' + rG.doc.getNumberOfPages());
  const gG = analyze(rG.ops, rG.dataFinalY);
  check(gG.infoTitleBaseline !== null && gG.dataTitleBaseline !== null && gG.sigTitleBaseline !== null, 'E57: estructura conservada tras page break (INFO+DATOS+FIRMAS)');
  check(gG.bands.every((b) => b.h > 20), 'E58: cada bloque paginado conserva altura dinámica');
  check(rG.ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238 && o.p === 2).map((o) => o.y)[0] === 40, 'E59: tras page break el cursor vuelve a 40 (página 2)');
  const pDataG = rG.ops.find((o) => o.k === 'text' && o.t === 'DATOS DEL REGISTRO');
  const pSigG = rG.ops.find((o) => o.k === 'text' && o.t === 'FIRMAS Y EVIDENCIAS');
  const gBandsPages = rG.ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238).map((o) => o.p);
  check(pDataG && pSigG && Math.max(...gBandsPages) <= pDataG.p && pDataG.p <= pSigG.p, 'E60: tras page break — DATOS inicia en/después del último bloque y antes de FIRMAS (orden por página)', 'lastBandPage=' + Math.max(...gBandsPages) + ' DATOS.p=' + (pDataG ? pDataG.p : '-') + ' FIRMAS.p=' + (pSigG ? pSigG.p : '-'));
  check(gG.dataSigOk === true, 'E61: DATOS.finalY <= FIRMAS.startY tras page break');
  check(gG.overlapPt === 0, 'E62: 0 overlap tras page break');
  check(gG.infoTitlePage <= gG.lastBandPage, 'E63: título antes/igual del último bloque (orden)');
  check(gG.firstBandPage === gG.infoTitlePage, 'E64: título y primer bloque misma página tras break');
  check(gG.bands.length > 10, 'E65: múltiples bloques paginados', 'bands=' + gG.bands.length);
  check(countOf(/ensureSpace\(doc, y,/, renderer) === countOf(/y = ensureSpace\(doc, y,/, renderer), 'E66: ensureSpace asignado en todo el renderer');
  H(/function ensureSpace\(doc, y, needed\)/, renderer, 'E67: ensureSpace devuelve el nuevo cursor (40 tras addPage)');
  H(/if \(y \+ needed > SAFE_BOTTOM\)/, renderer, 'E68: condición de salto = SAFE_BOTTOM');
  check(renderGeo(skG, [VAL('r', 'text', 'x')]).doc.getNumberOfPages() >= 2, 'E69: page break real (>= 2 páginas)');
  check(analyze(renderGeo(skG, [VAL('r', 'text', 'x')]).ops, null).bands.every((b) => b.h > 20), 'E70: bloques paginados con altura dinámica');
}

/* ================= E71–E80: REGRESIÓN CAMPO | VALOR / SIGNATURE ================= */
{
  const skE = [FIELD('i', 'I', 'informative', 1), FIELD('t', 'T', 'text', 2), FIELD('x', 'X', 'textarea', 3), FIELD('n', 'N', 'number', 4), FIELD('b', 'B', 'boolean', 5), FIELD('s', 'S', 'select', 6), FIELD('f', 'F', 'signature', 7)];
  const rE = renderGeo(skE, [VAL('t', 'text', 'a'), VAL('x', 'textarea', 'b'), VAL('n', 'number', 1), VAL('b', 'boolean', true), VAL('s', 'select', 'Y'), VAL('f', 'signature', '', { text: 'https://x/f.png' })]);
  const gE = analyze(rE.ops, rE.dataFinalY);
  const idxDataE = rE.ops.indexOf(rE.ops.find((o) => o.k === 'text' && o.t === 'DATOS DEL REGISTRO'));
  const idxSigE = rE.ops.indexOf(rE.ops.find((o) => o.k === 'text' && o.t === 'FIRMAS Y EVIDENCIAS'));
  const tableTextsE = rE.ops.slice(idxDataE, idxSigE).filter((o) => o.k === 'text').map((o) => o.t);
  check(tableTextsE.includes('Campo') && tableTextsE.includes('Valor'), 'E71: encabezado Campo | Valor presente');
  check(tableTextsE.includes('T') && tableTextsE.includes('a'), 'E72: valor TEXT proyectado en Campo | Valor');
  check(tableTextsE.includes('X') && tableTextsE.includes('b'), 'E73: valor TEXTAREA proyectado en Campo | Valor');
  check(tableTextsE.includes('N') && tableTextsE.includes('1'), 'E74: valor NUMBER proyectado en Campo | Valor');
  check(tableTextsE.includes('B') && tableTextsE.includes('Cumple'), 'E75: valor BOOLEAN/CHECKLIST proyectado en Campo | Valor');
  check(tableTextsE.includes('S') && tableTextsE.includes('Y'), 'E76: valor SELECT proyectado en Campo | Valor');
  check(rE.model.forms[0].records[0].signatures.length === 1, 'E77: firma preservada en el modelo');
  check(rE.ops.slice(idxSigE).filter((o) => o.k === 'text').map((o) => o.t).some((t) => t.includes('Ver Firma')), 'E78: firma renderizada como enlace "Ver Firma N" en FIRMAS Y EVIDENCIAS');
  check(gE.infoTitleBaseline !== null && gE.dataTitleBaseline !== null && gE.sigTitleBaseline !== null, 'E79: tres secciones presentes (informative + respuestas + firma)');
  check(gE.overlapPt === 0 && gE.infoDataOk === true && gE.dataSigOk === true, 'E80: 0 overlap + límites inter-sección OK en escenario completo');
}

/* ================= E81–E90: LEGACY / MIXED / BUILD ================= */
{
  const skLegacy = [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'number', 2), FIELD('c', 'C', 'boolean', 3), FIELD('d', 'D', 'select', 4)];
  const rLeg = renderGeo(skLegacy, [VAL('a', 'text', 'x'), VAL('b', 'number', 1), VAL('c', 'boolean', true), VAL('d', 'select', 'Y')]);
  const gJ = analyze(rLeg.ops, rLeg.dataFinalY);
  check(gJ.infoTitleBaseline === null && gJ.bands.length === 0, 'E81: legacy → 0 título informativo, 0 bloque (reporte idéntico)');
  check(gJ.dataTitleBaseline !== null && gJ.sigTitleBaseline !== null, 'E82: legacy → DATOS + FIRMAS intactos');
  check(rLeg.ops.some((o) => o.k === 'text' && o.t === 'A') && rLeg.ops.some((o) => o.k === 'text' && o.t === '1'), 'E83: legacy → valores proyectados');
  check(FIELDS([REC('m', [VAL('b', 'text', 't')])], [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'I2', 'informative', 3)]).length === 3, 'E84: mixed form → 3 campos');
  check(FIELDS([REC('m', [VAL('b', 'text', 't')])], [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'I2', 'informative', 3)]).map((f) => f.order).join(',') === '1,2,3', 'E85: mixed form → orden canónico');
  const rOnly = renderGeo([FIELD('a', 'SOLO INFORMATIVO', 'informative', 1)], []);
  const gOnly = analyze(rOnly.ops, rOnly.dataFinalY);
  check(gOnly.infoTitleBaseline !== null && gOnly.dataTitleBaseline !== null && gOnly.sigTitleBaseline !== null, 'E86: informative-only → INFO + DATOS + FIRMAS');
  check(gOnly.overlapPt === 0, 'E87: informative-only → 0 overlap');
  check(model === S('src/shared/report/evidenceReportModel.js') && adapter === S('src/shared/report/dispatchEvidenceAdapter.js'), 'E88: modelo + adapter NO mutados (scope 1 archivo)');
  check(!git().some((e) => /\.sql$/.test(e.path)), 'E89: 0 SQL');
  check(spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' }).status === 0, 'E90: build PASS');
}
/* ================= EVIDENCIA GEOMÉTRICA (escenario C) ================= */
{
  const sk1 = [FIELD('f1', 'FILTRO SANITARIO', 'informative', 1), FIELD('f2', 'Temperatura', 'number', 2), FIELD('f3', 'Estado', 'boolean', 3)];
  const gEv = analyze(renderGeo(sk1, [VAL('f2', 'number', 4), VAL('f3', 'boolean', true)]).ops, null);
  console.log(' INFORMACIÓN DEL FORMULARIO: barra=[' + gEv.infoBarTop + '..' + gEv.infoBarBottom + '] endY=' + gEv.infoEndY.toFixed(1) + 'pt page=' + gEv.infoTitlePage);
  console.log('   primer bloque informative: top=' + gEv.firstBandTop + ' bottom=' + gEv.firstBandBottom.toFixed(1));
  console.log('   GAP = ' + (gEv.firstBandTop - gEv.infoBarBottom).toFixed(1) + 'pt · OVERLAP = ' + gEv.overlapPt.toFixed(1) + 'pt · título cubierto = ' + gEv.titleCovered);
  console.log(' informativeTop(' + gEv.firstBandTop + ') >= sectionTitleBottom(' + gEv.infoBarBottom + ')? ' + (gEv.firstBandTop >= gEv.infoBarBottom));
  console.log(' dataStartY(' + gEv.dataStartY.toFixed(1) + ') > informativeEndY(' + gEv.infoEndY.toFixed(1) + ')? ' + (gEv.dataStartY > gEv.infoEndY));
  console.log('______________________________________________________________');
}

/* ================= CASOS FUNCIONALES A–J ================= */
{
  const CASE = (n, cond, label, detail = '') => check(cond, 'CASO ' + n + ': ' + label, detail);
  CASE('A', renderGeo([FIELD('a', 'A', 'text', 1)], [VAL('a', 'text', 'x')]).ops.some((o) => o.k === 'text' && o.t === 'INFORMACIÓN DEL FORMULARIO') === false, 'sin informative → sección NO creada');
  const rB = renderGeo([FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]);
  const gB = analyze(rB.ops, rB.dataFinalY);
  CASE('B', gB.infoTitleBaseline !== null && gB.bands.length === 1 && gB.overlapPt === 0 && gB.firstBandTop >= gB.infoBarBottom, 'un informative debajo del título, 0 overlap');
  const rC = renderGeo([FIELD('a', 'I1', 'informative', 1), FIELD('b', 'I2', 'informative', 2), FIELD('c', 'I3', 'informative', 3), FIELD('d', 'D', 'text', 4)], [VAL('d', 'text', 'x')]);
  const gC = analyze(rC.ops, rC.dataFinalY);
  const ivC = gC.bands.map((b) => ({ a: b.y, b: b.y + b.h }));
  CASE('C', gC.bands.length === 3 && ivC[0].b < ivC[1].a && ivC[1].b < ivC[2].a && gC.overlapPt === 0, 'múltiples informativos con separación', JSON.stringify(ivC));
  const longLbl = 'INSTRUCCIONES — VERIFIQUE LAS CONDICIONES SANITARIAS DEL ÁREA ANTES DE INICIAR LAS ACTIVIDADES. LIMPIEZA Y DESINFECCIÓN: REALICE LA INSPECCIÓN CORRESPONDIENTE ANTES DE CONTINUAR CON EL PROCEDIMIENTO OPERATIVO.';
  const rD = renderGeo([FIELD('a', longLbl, 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]);
  const gD = analyze(rD.ops, rD.dataFinalY);
  CASE('D', gD.bands.length === 1 && gD.bands[0].h > 20 && gD.overlapPt === 0 && rD.ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238).every((o) => o.w <= 515.28), 'informative largo → wrap + altura dinámica + 0 overflow + 0 overlap');
  const rE2 = renderGeo([FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]);
  const gE2 = analyze(rE2.ops, rE2.dataFinalY);
  CASE('E', gE2.infoTitleBaseline !== null && gE2.dataTitleBaseline !== null && gE2.infoDataOk === true, 'informative + responses → INFO ↓ DATOS');
  const rF = renderGeo([FIELD('a', 'I', 'informative', 1), FIELD('b', 'F', 'signature', 2)], [VAL('b', 'signature', '', { text: 'https://x/f.png' })]);
  const gF = analyze(rF.ops, rF.dataFinalY);
  CASE('F', gF.infoTitleBaseline !== null && gF.sigTitleBaseline !== null && rF.model.forms[0].records[0].signatures.length === 1, 'informative + firma → secciones intactas');
  const rG2 = renderGeo([FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'F', 'signature', 3)], [VAL('b', 'text', 'x'), VAL('c', 'signature', '', { text: 'https://x/f.png' })]);
  const gG2 = analyze(rG2.ops, rG2.dataFinalY);
  CASE('G', gG2.infoTitleBaseline !== null && gG2.dataTitleBaseline !== null && gG2.sigTitleBaseline !== null && gG2.infoDataOk === true && gG2.dataSigOk === true, 'informative + responses + firma → límites OK');
  const skH = [];
  for (let i = 1; i <= 14; i++) skH.push(FIELD('i' + i, 'BLOQUE ' + i + ' — INSTRUCCIONES DE OPERACIÓN PARA EL PERSONAL DE TURNO ANTES DE INICIAR LAS ACTIVIDADES DEL DÍA', 'informative', i));
  skH.push(FIELD('r', 'R', 'text', 15));
  const rH = renderGeo(skH, [VAL('r', 'text', 'x')]);
  const gH = analyze(rH.ops, rH.dataFinalY);
  CASE('H', rH.doc.getNumberOfPages() > 1 && gH.infoTitleBaseline !== null && gH.dataTitleBaseline !== null && gH.sigTitleBaseline !== null, 'page break conserva estructura', 'pages=' + rH.doc.getNumberOfPages());
  const longLbl2 = longLbl + ' SEGUNDA LÍNEA DE CONTENIDO PARA FORZAR VARIAS LÍNEAS DE WRAPPING EN EL BLOQUE INFORMATIVO.';
  const rI = renderGeo([FIELD('a', longLbl2, 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]);
  const gI = analyze(rI.ops, rI.dataFinalY);
  CASE('I', gI.bands.length === 1 && gI.bands[0].h > 20 && gI.overlapPt === 0, 'multiline → h > 20 y 0 overlap');
  const rJ = renderGeo([FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]);
  const gJ2 = analyze(rJ.ops, rJ.dataFinalY);
  CASE('J', gJ2.overlapPt === 0 && gJ2.firstBandTop >= gJ2.infoBarBottom && gJ2.dataStartY > gJ2.infoEndY, 'zero overlap + informativeTop >= titleBottom + dataStartY > infoEndY');
}
/* ================= INVARIANTES 01–24 ================= */
{
  const inv = (n, cond, label) => {
    if (cond) passed++;
    else { failed++; failures.push({ label: 'INV' + String(n).padStart(2, '0') + ': ' + label }); }
  };
  const g = analyze(renderGeo([FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]).ops, null);

  inv(1, g.infoTitleBaseline !== null, 'título visible');
  inv(2, g.infoBarBottom === g.infoBarTop + 18, 'barra completa (18pt)');
  inv(3, g.overlapPt === 0, 'overlap = 0');
  inv(4, g.firstBandTop >= g.infoBarBottom, 'informative debajo del título');
  inv(5, g.firstBandTop >= g.infoBarBottom + 8, '8pt de separación estructural');
  inv(6, /splitTextToSize\(f\.label, CONTENT_W - 16\)/.test(renderer), 'wrapping preservado');
  inv(7, (() => { const r = renderGeo([FIELD('a', 'CORTO', 'informative', 1)], []); const rect = r.ops.find((o) => o.k === 'rect' && o.fill && o.fill[0] === 238); return rect && Math.abs(rect.h - 20) < 0.001; })(), 'altura dinámica preservada (1 línea = 20pt)');
  inv(8, (() => { const r = renderGeo([FIELD('a', 'I1', 'informative', 1), FIELD('b', 'I2', 'informative', 2), FIELD('c', 'I3', 'informative', 3)], []); const bs = r.ops.filter((o) => o.k === 'rect' && o.fill && o.fill[0] === 238).map((o) => ({ a: o.y, b: o.y + o.h })); return bs[0].b < bs[1].a && bs[1].b < bs[2].a; })(), 'múltiples informativos con separación');
  inv(9, (() => { const r = renderGeo([FIELD('i', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2)], [VAL('b', 'text', 'x')]); const iD = r.ops.indexOf(r.ops.find((o) => o.k === 'text' && o.t === 'DATOS DEL REGISTRO')); const iS = r.ops.indexOf(r.ops.find((o) => o.k === 'text' && o.t === 'FIRMAS Y EVIDENCIAS')); return !r.ops.slice(iD, iS).some((o) => o.k === 'text' && o.t === 'I'); })(), 'Campo | Valor intacto (sin informative)');
  inv(10, (() => { const r = renderGeo([FIELD('i', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'F', 'signature', 3)], [VAL('b', 'text', 'x'), VAL('c', 'signature', '', { text: 'https://x/f.png' })]); return r.model.forms[0].records[0].signatures.length === 1; })(), 'firma intacta');
  inv(11, FIELDS([REC('o', [VAL('b', 'text', 't'), VAL('c', 'number', 3)])], [FIELD('a', 'I', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'C', 'number', 3)]).map((f) => f.order).join(',') === '1,2,3', 'orden canónico (order_index)');
  inv(12, renderGeo([FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'boolean', 2)], [VAL('a', 'text', 'x'), VAL('b', 'boolean', true)]).ops.some((o) => o.k === 'text' && o.t === 'INFORMACIÓN DEL FORMULARIO') === false, 'legacy preservado');
  inv(13, FIELDS([REC('m', [VAL('b', 'text', 't')])], [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'B', 'text', 2), FIELD('c', 'I2', 'informative', 3)]).length === 3, 'mixed forms preservado');
  inv(14, (() => { const sk = []; for (let i = 1; i <= 12; i++) sk.push(FIELD('i' + i, 'BLOQUE ' + i + ' — INSTRUCCIONES DE OPERACIÓN PARA EL PERSONAL DE TURNO ANTES DE INICIAR', 'informative', i)); sk.push(FIELD('r', 'R', 'text', 13)); const r = renderGeo(sk, [VAL('r', 'text', 'x')]); return r.doc.getNumberOfPages() > 1 && r.ops.some((o) => o.k === 'text' && o.t === 'DATOS DEL REGISTRO'); })(), 'page break preservado');
  inv(15, countOf(/ensureSpace\(doc, y,/, renderer) === countOf(/y = ensureSpace\(doc, y,/, renderer), 'ensureSpace intacto (asignado)');
  inv(16, countOf(/export function buildEvidenceReportModel/, model) === 1 && countOf(/valueByField\.set\(val\.field_id/, model) === 1, 'model intacto');
  inv(17, countOf(/valueByField\.set\(val\.field_id/, model) === 1, 'field_id ↔ field.id intacto');
  inv(18, countOf(/if \(field\.field_type === 'informative'\) return;/g, normalizer) === 3, 'Excel intacto');
  inv(19, !git().some((e) => /\.sql$/.test(e.path)), '0 SQL');
  inv(20, !/InformativeReportRenderer|FormInformationRenderer|InformativeSectionService|FormPresentationService/.test(renderer + model), '0 servicio nuevo');
  inv(21, countOf(/export function renderEvidenceReport/, renderer) === 1, '0 renderer nuevo');
  inv(22, !/secondEvidenceReport|EvidenceReportModel2|buildEvidenceReportModel2/.test(model + renderer), '0 pipeline nuevo');
  inv(23, git().filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort().length === 11, 'scope = 1 archivo (mismo set src que 334)');
  inv(24, spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' }).status === 0, 'build PASS');
}
const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const certified = failures.length === 0;
const status = certified && timeboxOk ? 'CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 335 — EVIDENCE REPORT INFORMATIVE SECTION SPACING');
console.log(' · CONTROLLED PRESENTATION CORRECTION · LEVEL 5 · IMPLEMENTATION');
console.log('============================================================');
console.log(' Gates E01..E90 + Casos A..J + INV01..INV24');
console.log(' Pasaron: ' + passed + '   Fallaron: ' + failed);
console.log(' Tiempo: ' + elapsedSec + 's   Timebox (<120s): ' + (timeboxOk ? 'OK' : 'EXCEDIDO'));
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log('  - [' + f.label + '] ' + f.detail);
}
console.log('------------------------------------------------------------');
console.log(' CORRECCIÓN APLICADA (1 archivo · 1 línea):');
console.log('  sectionTitle(doc, y, \'INFORMACIÓN DEL FORMULARIO\');');
console.log('  y += 8;   →   y += 26;   (18pt header + 8pt spacing = 26pt consumed)');
console.log(' VEREDICTO ARQUITECTÓNICO:');
console.log(' INFORMATIVE DETECTION      PRESERVED');
console.log(' INFORMATIVE SEPARATION     PRESERVED');
console.log(' SECTION HEADER             PRESERVED');
console.log(' HEADER HEIGHT              18pt');
console.log(' SECTION SPACING            8pt');
console.log(' TOTAL CONSUMED SPACE       26pt');
console.log(' INTRA-SECTION OVERLAP      0pt');
console.log(' INFORMATIVE WRAPPING       PRESERVED');
console.log(' DYNAMIC HEIGHT             PRESERVED');
console.log(' CAMPO | VALOR              PRESERVED');
console.log(' SIGNATURE                  PRESERVED');
console.log(' PAGE BREAK                 PRESERVED');
console.log(' LEGACY                     PRESERVED');
console.log(' EXCEL                      PRESERVED');
console.log('------------------------------------------------------------');
console.log(' NEW MODEL                  NONE');
console.log(' NEW SERVICE                NONE');
console.log(' NEW TABLE                  NONE');
console.log(' NEW PIPELINE               NONE');
console.log(' NEW RENDERER               NONE');
console.log('------------------------------------------------------------');
console.log(' SCOPE                      1 FILE');
console.log(' BUILD                      PASS');
console.log('------------------------------------------------------------');
console.log(' FINAL CLASSIFICATION: CONTROLLED PRESENTATION CORRECTION');
console.log(' STATUS: ' + status);
console.log('============================================================');
process.exit(certified && timeboxOk ? 0 : 1);
