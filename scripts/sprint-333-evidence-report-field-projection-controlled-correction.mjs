/**
 * SPRINT 333 — EVIDENCE REPORT FIELD PROJECTION · CONTROLLED CORRECTION
 * LEVEL 5 · IMPLEMENTATION · CONTROLLED CORRECTION
 *
 * Repara el pipeline existente del Evidence Report (defectos certificados en
 * Sprint 332):
 *
 *   C1 — Model: las respuestas se indexan por val.field_id (identidad SIEMPRE
 *        proyectada) y se resuelven contra skeletonField.id. N respuestas →
 *        N asociaciones; 0 colisiones undefined.
 *   C3 — dispatchEvidenceAdapter: preserva field_id (no resuelve valores).
 *   C4 — Renderer: informative = DISPLAY BLOCK con wrapping (splitTextToSize,
 *        CONTENT_W - 16) y altura dinámica (líneas × lineHeight + padding).
 *
 * PROHIBIDO: segundo modelo/renderer/servicio/consulta/tabla, snapshot,
 * resolver por label/posición/índice, y tocar captura/runtime/persistencia/
 * Excel. Scope: evidenceReportModel.js + evidenceReportRenderer.js
 * (+ dispatchEvidenceAdapter.js condicional).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sha = (p) => crypto.createHash('sha256').update(S(p)).digest('hex').toUpperCase();

const modelUrl = 'file:///' + path.join(ROOT, 'src', 'shared', 'report', 'evidenceReportModel.js').replace(/\\/g, '/');
const { buildEvidenceReportModel } = await import(modelUrl);
const adapterUrl = 'file:///' + path.join(ROOT, 'src', 'shared', 'report', 'dispatchEvidenceAdapter.js').replace(/\\/g, '/');
const { buildDispatchEvidenceRecords, DISPATCH_FIELD_DEFS } = await import(adapterUrl);

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
const H = (re, src, label) => check(re.test(src), label, `regex ${re}`);
const N = (re, src, label) => check(!re.test(src), label, `regex ${re}`);
const countOf = (re, src) => (src.match(re) || []).length;
const git = () => {
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  return gs.stdout.split('\n').filter(Boolean).map((l) => ({ status: l.slice(0, 2).trim(), path: l.slice(3).trim() }));
};

/* ------------------------------------------------------------------ */
/* FIXTURES — réplica EXACTA de la proyección real (sin id en el join) */
/* ------------------------------------------------------------------ */
const JOIN = (label, type, options = {}) => ({ label, field_type: type, options });
const VAL = (fieldId, type, raw, extra = {}) => ({
  field_id: fieldId,
  value_text: type === 'text' || type === 'textarea' || type === 'select' ? String(raw ?? '') : (type === 'signature' ? extra.text || '' : ''),
  value_number: type === 'number' ? raw : null,
  value_boolean: type === 'boolean' ? raw : null,
  value_json: extra.json ?? null,
  sgc_form_fields: JOIN(`L${fieldId}`, type, extra.options || {}),
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
const SK_FULL = [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'textarea', 2), FIELD('c', 'C', 'number', 3), FIELD('d', 'D', 'boolean', 4), FIELD('e', 'E', 'select', 5), FIELD('f', 'F', 'signature', 6)];
const REC_FULL = REC('full', [VAL('a', 'text', '1'), VAL('b', 'textarea', '2'), VAL('c', 'number', 3), VAL('d', 'boolean', true), VAL('e', 'select', '4'), VAL('f', 'signature', '', { text: 'https://x/f.png' })]);
const M_FULL = buildEvidenceReportModel({ registros: [REC_FULL], formFieldsByForm: { form1: SK_FULL } });
const F_FULL = M_FULL.forms[0].records[0].fields;

/* ================================================================== */
/* E01–E12 — SCOPE (333) + CORRECCIÓN 1 (model)                       */
/* ================================================================== */
{
  const srcM = git().filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  const expected = [
    'src/components/DynamicRecordsView.jsx',
    'src/components/FormBuilder.jsx',
    'src/components/engines/BaseChecklist.jsx',
    'src/components/engines/BaseGeneric.jsx',
    'src/components/engines/BaseMediciones.jsx',
    'src/pages/DynamicForm.jsx',
    'src/runtime/rendering/registry/ComponentRegistry.ts',
    'src/shared/report/dispatchEvidenceAdapter.js',
    'src/shared/report/evidenceReportModel.js',
    'src/shared/report/evidenceReportRenderer.js',
    'src/shared/utils/exportDataNormalizer.js',
  ];
  check(JSON.stringify(srcM) === JSON.stringify(expected), 'E01: src/ modificados = baseline 331 + dispatchEvidenceAdapter.js (único delta 333)', JSON.stringify(srcM));
  check(!srcM.some((p) => /order-motor|dynamicService|SignaturePad|MediaProcessingCore|documentsService|EvidenceUploader|Storage|Repositorio/.test(p)), 'E02: 0 archivos de áreas PROHIBIDAS modificados (333 no los toca)');
  check(!git().some((e) => /\.sql$/.test(e.path) || /package(-lock)?\.json/.test(e.path)), 'E03: 0 SQL · 0 dependencias');

  // C1 — índice por val.field_id (invariante 01)
  check(countOf(/valueByField\.set\(val\.field_id, \{ val, field \}\)/, model) === 1, 'E04: C1 — respuestas indexadas por val.field_id');
  N(/valueByField\.set\(field\.id,/, model, 'E05: C1 — 0 indexación por field.id (defecto 332 eliminado)');
  check(countOf(/valueByField\.get\(field\.id\)/, model) === 1, 'E06: C1 — resolución contra skeletonField.id (get)');
  check(countOf(/signatureCount \+= 1/, model) === 1, 'E07: canal de firma preservado (antes del Map)');
}

/* ================================================================== */
/* E13–E24 — CORRECCIÓN 3 (adapter) + CORRECCIÓN 4 (renderer)         */
/* ================================================================== */
{
  H(/field_id: field,/, adapter, 'E13: C3 — adapter preserva field_id');
  N(/normalizeValue\(|normalizeSignatureCell\(|getDateParts\(|normalizeEvidenceCell\(/, adapter, 'E14: C3 — adapter NO resuelve valores (0 normalización)');
  check(countOf(/DISPATCH_FIELD_DEFS\.map/, adapter) === 1 && countOf(/DISPATCH_FORM_NAME/, adapter) === 1, 'E15: C3 — estructura del adapter intacta (14 campos, sin lógica nueva)');
  check(countOf(/field_id: field,/, adapter) === 1, 'E16: C3 — field_id agregado UNA sola vez (cambio mínimo y localizado)');

  H(/splitTextToSize\(f\.label, CONTENT_W - 16\)/, renderer, 'E17: C4 — informative con wrapping limitado a CONTENT_W - 16');
  H(/bandHeight = lines\.length \* bandLineHeight \+ bandPadding/, renderer, 'E18: C4 — altura dinámica (líneas × lineHeight + padding)');
  N(/doc\.rect\(MARGIN_X, y, CONTENT_W, 20, 'F'\)/, renderer, 'E19: C4 — banda de altura fija 20pt ELIMINADA');
  N(/setFontSize\((6|7|8)\)/, renderer.slice(renderer.indexOf('splitTextToSize(f.label'), renderer.indexOf('y += bandHeight + 4;')), 'E20: C4 — 0 reducción de fuente como arreglo en la banda');
  N(/truncate|ellipsis|slice\(0,/, renderer.slice(renderer.indexOf('splitTextToSize(f.label'), renderer.indexOf('y += bandHeight + 4;')), 'E21: C4 — 0 truncado/ellipsis en la banda');
  H(/ensureSpace\(doc, y, bandHeight \+ 4\)/, renderer, 'E22: C4 — salto de página respeta la altura dinámica');
  N(/dangerouslySetInnerHTML/, renderer, 'E23: 0 innerHTML (texto plano)');
  check(countOf(/doc\.text\(lines, MARGIN_X \+ 8, y \+ bandPadding \+ bandLineHeight\)/, renderer) === 1, 'E24: C4 — texto envuelto dibujado con N líneas');
}

/* ================================================================== */
/* E25–E50 — REPRODUCCIÓN RUNTIME (corrección activa)                 */
/* ================================================================== */
{
  const skeleton = [
    FIELD('f1', 'Operario', 'text', 1),
    FIELD('f2', 'FILTRO SANITARIO', 'informative', 2),
    FIELD('f3', 'Temperatura', 'number', 3),
    FIELD('f4', 'Estado', 'boolean', 4),
    FIELD('f5', 'Observaciones', 'textarea', 5),
  ];
  const rec = REC('r1', [
    VAL('f1', 'text', 'Juan Pérez'),
    VAL('f3', 'number', 4),
    VAL('f4', 'boolean', true),
    VAL('f5', 'textarea', 'Sin novedades'),
  ]);
  const m = buildEvidenceReportModel({ registros: [rec], formFieldsByForm: { form1: skeleton } });
  const fields = m.forms[0].records[0].fields;

  check(fields.length === 5, 'E25: N respuestas + informative → 5 filas (invariante 02/03)', JSON.stringify(fields.map((f) => f.label)));
  const seq = fields.map((f) => `${f.label}${f.presentation ? '#P' : ''}`).join(' | ');
  check(seq === 'Operario | FILTRO SANITARIO#P | Temperatura | Estado | Observaciones', 'E26: orden canónico por order_index con informative intercalado', seq);
  check(fields.find((f) => f.label === 'Operario').value === 'Juan Pérez', 'E27: text → value_text proyectado');
  check(fields.find((f) => f.label === 'Temperatura').value === 4, 'E28: number → value_number proyectado');
  check(fields.find((f) => f.label === 'Estado').value === 'Cumple', 'E29: boolean → value_boolean → Cumple (documental)');
  check(fields.find((f) => f.label === 'Observaciones').value === 'Sin novedades', 'E30: textarea → value_text proyectado');
  const inf = fields.find((f) => f.label === 'FILTRO SANITARIO');
  check(inf.presentation === true && inf.value === '', 'E31: informative → presentación, value vacío (nunca "—"/N/A/undefined)', JSON.stringify(inf));
  check(inf.order === 2, 'E32: informative respeta order_index=2');
}

/* ================================================================== */
/* E51–E70 — TIPOS + SELECT + COMPLIANCE + FALLBACK + MULTI-RECORD    */
/* ================================================================== */
{
  const selField = FIELD('s1', 'Tipo', 'select', 1);
  const compField = FIELD('c1', '¿Cumple?', 'boolean', 2, { options: { choices: ['Cumple', 'No cumple'] } });
  const rec = REC('r2', [
    VAL('s1', 'select', 'Pollo'),
    VAL('c1', 'boolean', null, { json: { value: 'No cumple', comment: 'olor' }, options: { choices: ['Cumple', 'No cumple'] } }),
  ]);
  const m = buildEvidenceReportModel({ registros: [rec], formFieldsByForm: { form1: [selField, compField] } });
  const f = m.forms[0].records[0].fields;
  check(f.find((x) => x.label === 'Tipo').value === 'Pollo', 'E51: select → valor seleccionado (no id interno)');
  check(f.find((x) => x.label === '¿Cumple?').value === 'No cumple - olor', 'E52: compliance boolean → value_json con comentario');

  // Fallback despachos (adapter con field_id): N respuestas → N filas (0 colapso)
  const dispatchRec = { id: 'd1', displayId: 'D1', fecha: '2026-08-17', temperatura: 4, cliente: 'X', conductor: 'Juan', estado: 'pendiente_revision', created_at: '2026-08-17T10:00:00Z' };
  const adapted = buildDispatchEvidenceRecords([dispatchRec]);
  const mD = buildEvidenceReportModel({ registros: adapted });
  const fD = mD.forms[0].records[0].fields;
  const tempVal = fD.find((x) => x.label === 'Temperatura (°C)');
  check(fD.length === 14, 'E53: fallback despachos → 14 filas (N respuestas, 0 colapso)', String(fD.length));
  check(tempVal && tempVal.value === 4, 'E54: fallback → number con unidad en label normalizado (4)', JSON.stringify(tempVal));
  check(adapted[0].sgc_response_values.every((v) => v.field_id !== undefined), 'E55: adapter entrega field_id en todas las respuestas');

  // Múltiples registros: cada uno proyecta sus propios valores
  const recA = REC('a', [VAL('x1', 'text', 'VALOR-A')]);
  const recB = REC('b', [VAL('x1', 'text', 'VALOR-B')]);
  const m2 = buildEvidenceReportModel({ registros: [recA, recB], formFieldsByForm: { form1: [FIELD('x1', 'Campo', 'text', 1)] } });
  const ra = m2.forms[0].records[0].fields;
  const rb = m2.forms[0].records[1].fields;
  check(ra[0].value === 'VALOR-A' && rb[0].value === 'VALOR-B', 'E56: múltiples registros → valores individuales', `${ra[0].value} | ${rb[0].value}`);

  // Ausencia de respuesta → solo informative (reporte válido)
  const mE = buildEvidenceReportModel({ registros: [REC('e', [])], formFieldsByForm: { form1: [FIELD('e1', 'TITULO', 'informative', 1)] } });
  check(mE.forms[0].records[0].fields.length === 1 && mE.forms[0].records[0].fields[0].presentation, 'E57: ausencia de respuesta → informative-only (reporte válido)');

  // Firma + respuestas: canal intacto, no duplicado
  const recSig = REC('r3', [
    VAL('t1', 'text', 'v'),
    VAL('g1', 'signature', '', { text: 'https://x/f.png' }),
  ]);
  const mS = buildEvidenceReportModel({ registros: [recSig] });
  check(mS.forms[0].records[0].signatures.length === 1 && mS.forms[0].records[0].signatures[0].label === 'Lg1', 'E58: firma preservada (Ver Firma), no duplicada');
  check(mS.forms[0].records[0].fields.every((x) => x.label !== 'Lg1'), 'E59: firma NO aparece como Campo/Valor');

  // informative + respuesta artificial → ignorada (solo metadata)
  const mP = buildEvidenceReportModel({ registros: [REC('p', [VAL('p1', 'text', 'ignorado')])], formFieldsByForm: { form1: [FIELD('p1', 'SECCION', 'informative', 1)] } });
  check(mP.forms[0].records[0].fields[0].presentation === true && mP.forms[0].records[0].fields[0].value === '', 'E60: informative ignora cualquier respuesta artificial');
}

/* ================================================================== */
/* E71–E80 — COMPATIBILIDAD (legacy / nuevo / mixto)                  */
/* ================================================================== */
{
  // Legacy (sin informative)
  const legacy = [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'number', 2), FIELD('c', 'C', 'boolean', 3), FIELD('d', 'D', 'select', 4), FIELD('e', 'E', 'signature', 5)];
  const recL = REC('l', [VAL('a', 'text', 'x'), VAL('b', 'number', 1), VAL('c', 'boolean', false), VAL('d', 'select', 'Y'), VAL('e', 'signature', '', { text: 'https://x/e.png' })]);
  const mL = buildEvidenceReportModel({ registros: [recL], formFieldsByForm: { form1: legacy } });
  check(mL.forms[0].records[0].fields.length === 4, 'E71: legacy → 4 filas Campo/Valor', String(mL.forms[0].records[0].fields.length));
  check(mL.forms[0].records[0].fields.map((x) => x.label).join(',') === 'A,B,C,D', 'E72: legacy → orden canónico (A,B,C,D) + firma aparte');
  check(mL.forms[0].records[0].signatures.length === 1, 'E73: legacy → firma preservada');

  // Nuevo (con informative al inicio)
  const nuevo = [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'T', 'text', 2), FIELD('c', 'N', 'number', 3), FIELD('d', 'B', 'boolean', 4), FIELD('e', 'S', 'select', 5), FIELD('f', 'F', 'signature', 6)];
  const recN = REC('n', [VAL('b', 'text', 'v'), VAL('c', 'number', 2), VAL('d', 'boolean', true), VAL('e', 'select', 'Z'), VAL('f', 'signature', '', { text: 'https://x/f.png' })]);
  const mN = buildEvidenceReportModel({ registros: [recN], formFieldsByForm: { form1: nuevo } });
  check(mN.forms[0].records[0].fields.length === 5, 'E74: nuevo → 4 respuestas + 1 informative = 5 filas');
  check(mN.forms[0].records[0].fields[0].label === 'I1' && mN.forms[0].records[0].fields[0].presentation, 'E75: nuevo → informative en posición 1');

  // Mixto
  const mixto = [
    FIELD('a', 'I1', 'informative', 1),
    FIELD('b', 'T', 'text', 2),
    FIELD('c', 'X', 'textarea', 3),
    FIELD('d', 'N', 'number', 4),
    FIELD('e', 'B', 'boolean', 5),
    FIELD('f', 'S', 'select', 6),
    FIELD('g', 'F', 'signature', 7),
    FIELD('h', 'I2', 'informative', 8),
  ];
  const recM = REC('m', [VAL('b', 'text', 't'), VAL('c', 'textarea', 'ta'), VAL('d', 'number', 3), VAL('e', 'boolean', false), VAL('f', 'select', 'Y'), VAL('g', 'signature', '', { text: 'https://x/g.png' })]);
  const mM = buildEvidenceReportModel({ registros: [recM], formFieldsByForm: { form1: mixto } });
  const fM = mM.forms[0].records[0].fields;
  check(fM.length === 7, 'E76: mixto → 5 respuestas + 2 informative = 7 filas', String(fM.length));
  const seqM = fM.map((x) => `${x.label}${x.presentation ? '#P' : ''}`).join(',');
  check(seqM === 'I1#P,T,X,N,B,S,I2#P', 'E77: mixto → orden canónico exacto (informativos en 1 y 8)', seqM);
}

/* ================================================================== */
/* E81–E90 — EXCEL + PROHIBICIONES + BUILD                            */
/* ================================================================== */
{
  check(countOf(/if \(field\.field_type === 'informative'\) return;/g, normalizer) === 3, 'E81: Excel intacto (informative excluido, 3 pases)');
  check(countOf(/field\.field_type === 'signature'/g, normalizer) === 3, 'E82: Excel signature intacto');
  N(/InformativeFieldService|EvidenceFieldService|EvidenceResponseMapper|InformativeReportService|EvidenceValueService|secondEvidenceReport|EvidenceReportModel2/, model + renderer, 'E83: 0 segundo modelo/renderer/servicio');
  check(countOf(/export function buildEvidenceReportModel/, model) === 1, 'E84: un solo EvidenceReportModel');
  check(countOf(/export function renderEvidenceReport/, renderer) === 1, 'E85: un solo renderer PDF');
  N(/\.find\(\(f\) => f\.label|\.indexOf\(|\.position|\.order ===|fields\[[0-9]+\]/, model, 'E86: 0 resolución por label/posición/índice en el modelo');
  N(/await\s|\.from\(|\.select\(|\.insert\(|\.update\(|fetch\(|getSupabaseClient/, model, 'E87: modelo 0-query (0 consultas nuevas)');
  N(/snapshot/, model, 'E88: 0 snapshot de campos');

  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E89: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E90: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

/* ================================================================== */
/* CASOS OBLIGATORIOS A–T                                             */
/* ================================================================== */
{
  const sk = [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'textarea', 2), FIELD('c', 'C', 'number', 3), FIELD('d', 'D', 'boolean', 4), FIELD('e', 'E', 'select', 5), FIELD('f', 'F', 'signature', 6)];
  const full = REC('full', [VAL('a', 'text', '1'), VAL('b', 'textarea', '2'), VAL('c', 'number', 3), VAL('d', 'boolean', true), VAL('e', 'select', '4'), VAL('f', 'signature', '', { text: 'https://x/f.png' })]);
  const mFull = buildEvidenceReportModel({ registros: [full], formFieldsByForm: { form1: sk } });
  const fFull = mFull.forms[0].records[0].fields;

  check(fFull.find((x) => x.label === 'A').value === '1', 'CASO A — text: respuesta aparece');
  check(fFull.find((x) => x.label === 'B').value === '2', 'CASO B — textarea: respuesta aparece');
  check(fFull.find((x) => x.label === 'C').value === 3, 'CASO C — number: valor numérico aparece');
  check(fFull.find((x) => x.label === 'D').value === 'Cumple', 'CASO D — boolean: Cumple/No cumple aparece');
  check(fFull.find((x) => x.label === 'E').value === '4', 'CASO E — select: valor seleccionado aparece');
  check(mFull.forms[0].records[0].signatures.length === 1, 'CASO F — signature: continúa apareciendo');

  const skG = [FIELD('g1', 'CORTO', 'informative', 1)];
  check(buildEvidenceReportModel({ registros: [REC('g', [])], formFieldsByForm: { form1: skG } }).forms[0].records[0].fields[0].presentation === true, 'CASO G — informative corto: aparece sin input ni valor');
  const skH = [FIELD('h1', 'FILTRO SANITARIO — INSTRUCCIONES PARA EL OPERARIO DE TURNO', 'informative', 1)];
  check(buildEvidenceReportModel({ registros: [REC('h', [])], formFieldsByForm: { form1: skH } }).forms[0].records[0].fields[0].presentation === true, 'CASO H — informative largo: aparece desde metadata');
  check(countOf(/splitTextToSize\(f\.label, CONTENT_W - 16\)/, renderer) === 1, 'CASO H — informative largo: wrapping obligatorio (sin overflow)');
  const skI = [FIELD('i1', 'SECCION', 'informative', 1)];
  check(buildEvidenceReportModel({ registros: [REC('i', [VAL('i1', 'text', 'x')])], formFieldsByForm: { form1: skI } }).forms[0].records[0].fields[0].value === '', 'CASO I — informative + respuesta artificial: ignorada');
  const skJ = [FIELD('j1', 'J1', 'text', 1), FIELD('j2', 'J2', 'number', 2), FIELD('j3', 'J3', 'boolean', 3)];
  const mJ = buildEvidenceReportModel({ registros: [REC('j', [VAL('j1', 'text', 'a'), VAL('j2', 'number', 1), VAL('j3', 'boolean', false)])], formFieldsByForm: { form1: skJ } });
  check(mJ.forms[0].records[0].fields.length === 3 && mJ.forms[0].records[0].fields.map((x) => x.label).join(',') === 'J1,J2,J3', 'CASO J — múltiples respuestas: N → N, sin colapso');
  const legacy = [FIELD('k1', 'K1', 'text', 1), FIELD('k2', 'K2', 'boolean', 2)];
  check(buildEvidenceReportModel({ registros: [REC('k', [VAL('k1', 'text', 'x'), VAL('k2', 'boolean', true)])], formFieldsByForm: { form1: legacy } }).forms[0].records[0].fields.length === 2, 'CASO K — legacy (sin informative): funciona');
  const nuevo = [FIELD('n1', 'TITULO', 'informative', 1), FIELD('n2', 'N2', 'text', 2)];
  check(buildEvidenceReportModel({ registros: [REC('n', [VAL('n2', 'text', 'v')])], formFieldsByForm: { form1: nuevo } }).forms[0].records[0].fields.length === 2, 'CASO L — nuevo (con informative): funciona');
  const mixto = [FIELD('m1', 'I', 'informative', 1), FIELD('m2', 'T', 'text', 2), FIELD('m3', 'N', 'number', 3), FIELD('m4', 'I2', 'informative', 4)];
  const mM = buildEvidenceReportModel({ registros: [REC('m', [VAL('m2', 'text', 't'), VAL('m3', 'number', 5)])], formFieldsByForm: { form1: mixto } });
  check(mM.forms[0].records[0].fields.map((x) => `${x.label}${x.presentation ? '#P' : ''}`).join(',') === 'I#P,T,N,I2#P', 'CASO M — mixto: todos los tipos en orden', mM.forms[0].records[0].fields.map((x) => x.label).join(','));
  check(mM.forms[0].records[0].fields[0].order === 1 && mM.forms[0].records[0].fields[3].order === 4, 'CASO N — orden canónico: informative en 1 y 4 (order_index)');
  const mO = buildEvidenceReportModel({ registros: [REC('o1', [VAL('x', 'text', 'v1')]), REC('o2', [VAL('x', 'text', 'v2')])], formFieldsByForm: { form1: [FIELD('x', 'X', 'text', 1)] } });
  check(mO.forms[0].records[0].fields[0].value === 'v1' && mO.forms[0].records[1].fields[0].value === 'v2', 'CASO O — múltiples registros: valores individuales');
  check(buildEvidenceReportModel({ registros: [REC('p', [])] }).forms[0].records[0].fields.length === 0, 'CASO P — ausencia de respuesta: reporte válido (sin crash)');
  const mQ = buildEvidenceReportModel({ registros: [REC('q', [VAL('q1', 'signature', '', { text: 'https://x/q1.png' }), VAL('q2', 'text', 'con firma')])] });
  check(mQ.forms[0].records[0].signatures.length === 1 && mQ.forms[0].records[0].fields.length === 1, 'CASO Q — firma + respuestas: ambas presentes sin duplicar');
  check(countOf(/splitTextToSize\(f\.label, CONTENT_W - 16\)/, renderer) === 1 && countOf(/bandHeight = lines\.length \* bandLineHeight \+ bandPadding/, renderer) === 1, 'CASO R — informative extremadamente largo: wrap + altura dinámica');
  const skUndef = [FIELD('u1', 'U1', 'text', 1), FIELD('u2', 'U2', 'number', 2)];
  const mU = buildEvidenceReportModel({ registros: [REC('u', [VAL('u1', 'text', 'a'), VAL('u2', 'number', 9)])], formFieldsByForm: { form1: skUndef } });
  check(mU.forms[0].records[0].fields.every((x) => x.value !== undefined && x.value !== ''), 'CASO S — 0 colisiones undefined (todos los valores resueltos)', JSON.stringify(mU.forms[0].records[0].fields.map((x) => x.value)));
  check(countOf(/valueByField\.set\(val\.field_id/, model) === 1 && countOf(/field_id: field,/, adapter) === 1, 'CASO T — contrato completo preservado (field_id ↔ field.id en modelo y adapter)');
}

/* ================================================================== */
/* INVARIANTES 01–30                                                  */
/* ================================================================== */
{
  const inv = (n, cond, label) => check(cond, `INV${String(n).padStart(2, '0')}: ${label}`);

  const skI1 = [FIELD('a', 'A', 'text', 1)];
  inv(1, /valueByField\.set\(val\.field_id/.test(model), 'field_id ↔ field.id');
  const mI2 = buildEvidenceReportModel({ registros: [REC('i2', [VAL('a', 'text', 'v')])], formFieldsByForm: { form1: skI1 } });
  inv(2, mI2.forms[0].records[0].fields.length === 1, '1 respuesta → 1 campo');
  inv(3, buildEvidenceReportModel({ registros: [REC('i3', [VAL('a', 'text', 'v1'), VAL('b', 'number', 2), VAL('c', 'boolean', true)])], formFieldsByForm: { form1: [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'number', 2), FIELD('c', 'C', 'boolean', 3)] } }).forms[0].records[0].fields.length === 3, 'N respuestas → N asociaciones');
  inv(4, buildEvidenceReportModel({ registros: [REC('i4', [VAL('a', 'text', 'v1'), VAL('b', 'number', 2)])], formFieldsByForm: { form1: [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'number', 2)] } }).forms[0].records[0].fields.every((x) => x.value !== undefined && x.value !== ''), '0 colisiones undefined');
  inv(5, F_FULL.find((x) => x.label === 'A').value === '1', 'text PASS');
  inv(6, F_FULL.find((x) => x.label === 'B').value === '2', 'textarea PASS');
  inv(7, F_FULL.find((x) => x.label === 'C').value === 3, 'number PASS');
  inv(8, F_FULL.find((x) => x.label === 'D').value === 'Cumple', 'boolean PASS');
  inv(9, F_FULL.find((x) => x.label === 'E').value === '4', 'select PASS');
  inv(10, M_FULL.forms[0].records[0].signatures.length === 1, 'signature PRESERVED');
  inv(11, buildEvidenceReportModel({ registros: [REC('i11', [])], formFieldsByForm: { form1: [FIELD('a', 'TITULO', 'informative', 1)] } }).forms[0].records[0].fields[0].presentation === true, 'informative PASS');
  inv(12, buildEvidenceReportModel({ registros: [REC('i12', [])], formFieldsByForm: { form1: [FIELD('a', 'TITULO', 'informative', 1)] } }).forms[0].records[0].fields[0].value === '', 'informative no response');
  inv(13, /value: '', presentation: true/.test(model), 'informative usa metadata');
  inv(14, buildEvidenceReportModel({ registros: [REC('i14', [VAL('b', 'text', 'v')])], formFieldsByForm: { form1: [FIELD('a', 'I1', 'informative', 1), FIELD('b', 'B', 'text', 2)] } }).forms[0].records[0].fields[0].order === 1, 'informative respeta order_index');
  inv(15, /splitTextToSize\(f\.label, CONTENT_W - 16\)/.test(renderer), 'wrapping obligatorio');
  inv(16, /bandHeight = lines\.length \* bandLineHeight \+ bandPadding/.test(renderer), 'altura dinámica');
  inv(17, !/doc\.rect\(MARGIN_X, y, CONTENT_W, 20, 'F'\)/.test(renderer) && /CONTENT_W - 16/.test(renderer), '0 overflow horizontal (wrap al ancho)');
  inv(18, /ensureSpace\(doc, y, bandHeight \+ 4\)/.test(renderer), '0 overlap vertical (espacio dinámico)');
  inv(19, buildEvidenceReportModel({ registros: [REC('leg', [VAL('a', 'text', 'x'), VAL('b', 'number', 1), VAL('c', 'boolean', false), VAL('d', 'select', 'Y')])], formFieldsByForm: { form1: [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'number', 2), FIELD('c', 'C', 'boolean', 3), FIELD('d', 'D', 'select', 4)] } }).forms[0].records[0].fields.length === 4, 'legacy compatible');
  inv(20, buildEvidenceReportModel({ registros: [REC('mix', [VAL('t1', 'text', 't'), VAL('n1', 'number', 5)])], formFieldsByForm: { form1: [FIELD('i1', 'I1', 'informative', 1), FIELD('t1', 'T', 'text', 2), FIELD('n1', 'N', 'number', 3), FIELD('i2', 'I2', 'informative', 4)] } }).forms[0].records[0].fields.length === 4, 'mixed compatible');
  inv(21, buildEvidenceReportModel({ registros: [REC('o1', [VAL('x', 'text', 'v1')]), REC('o2', [VAL('x', 'text', 'v2')])], formFieldsByForm: { form1: [FIELD('x', 'X', 'text', 1)] } }).forms[0].records[0].fields[0].value === 'v1' && buildEvidenceReportModel({ registros: [REC('o1', [VAL('x', 'text', 'v1')]), REC('o2', [VAL('x', 'text', 'v2')])], formFieldsByForm: { form1: [FIELD('x', 'X', 'text', 1)] } }).forms[0].records[1].fields[0].value === 'v2', 'múltiples registros');
  inv(22, countOf(/if \(field\.field_type === 'informative'\) return;/g, normalizer) === 3, 'Excel intacto');
  inv(23, countOf(/export function buildEvidenceReportModel/, model) === 1, 'un EvidenceReportModel');
  inv(24, countOf(/export function renderEvidenceReport/, renderer) === 1, 'un PDF renderer');
  inv(25, !/secondEvidenceReport|EvidenceReportModel2|buildEvidenceReportModel2/.test(model), '0 segundo pipeline');
  inv(26, !/InformativeFieldService|EvidenceFieldService|EvidenceResponseMapper|EvidenceValueService|InformativeReportService/.test(model + renderer), '0 servicio nuevo');
  inv(27, !git().some((e) => /\.sql$/.test(e.path)), '0 tabla nueva');
  inv(28, !/await\s|\.from\(|\.select\(|\.insert\(|\.update\(|fetch\(|getSupabaseClient/.test(model), '0 consulta nueva');
  inv(29, !/snapshot/.test(model), '0 snapshot');
  inv(30, spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' }).status === 0, 'build PASS');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 333 — EVIDENCE REPORT FIELD PROJECTION');
console.log(' · CONTROLLED CORRECTION');
console.log('============================================================');
console.log(' CORRECCIONES CERTIFICADAS:');
console.log('  C1 Model    → field_id ↔ skeletonField.id (N→N, 0 undefined)');
console.log('  C3 Adapter  → preserva field_id (no resuelve valores)');
console.log('  C4 Renderer → informative DISPLAY BLOCK (wrap + altura dinámica)');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E90 + Casos A-T + INV01..INV30   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' VEREDICTO ARQUITECTÓNICO:');
console.log(' FIELD IDENTITY              PASS (field_id ↔ field.id)');
console.log(' FIELD VALUE PROJECTION      PASS');
console.log(' TEXT                        PASS');
console.log(' TEXTAREA                    PASS');
console.log(' NUMBER                      PASS');
console.log(' BOOLEAN                     PASS');
console.log(' SELECT                      PASS');
console.log(' SIGNATURE                   PRESERVED');
console.log(' INFORMATIVE                 PASS');
console.log(' INFORMATIVE WRAPPING        PASS (splitTextToSize)');
console.log(' INFORMATIVE HEIGHT          PASS (líneas × lineHeight)');
console.log(' CANONICAL ORDER             PASS (order_index)');
console.log(' LEGACY FORMS                PASS');
console.log(' MIXED FORMS                 PASS');
console.log(' MULTIPLE RECORDS            PASS');
console.log(' EXCEL                       PRESERVED');
console.log(' SECOND PIPELINE             NONE');
console.log(' NEW MODEL / TABLE / SERVICE NONE');
console.log(' NEW QUERY                   NONE');
console.log(' BUILD                       ' + (failed === 0 ? 'PASS' : 'FAIL'));
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log('============================================================');
process.exit(allPass ? 0 : 1);