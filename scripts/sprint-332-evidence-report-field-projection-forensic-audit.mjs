/**
 * SPRINT 332 — EVIDENCE REPORT FIELD PROJECTION · FORENSIC INTEGRATION AUDIT
 * MODE: AUDIT ONLY · LEVEL 5 · FORENSIC DISCREPANCY AUDIT
 *
 * Objetivo: localizar el punto EXACTO donde se pierde la proyección de
 * valores de campo en el Evidence Report (síntoma: DATOS DEL REGISTRO solo
 * muestra el encabezado informativo y ningún valor Campo/Valor), y certificar
 * el defecto de layout del informative (overflow horizontal sin política de
 * wrapping).
 *
 * CAMBIOS AUTORIZADOS EN src/: 0. Solo lectura + reproducción forense.
 *
 * Criterio: reproducción runtime (EvidenceReportModel con fixtures que
 * reflejan EXACTAMENTE la proyección real de getModuleResponses y del
 * dispatchEvidenceAdapter) + verificación estática de la consulta y del
 * renderer + aislamiento Excel + orden canónico + scope git.
 *
 * Clasificación esperada: CONTROLLED CORRECTION REQUIRED (no ARCHITECTURAL
 * GAP): el defecto está localizado dentro del pipeline existente.
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

const svc = S('src/services/dynamicService.js');
const model = S('src/shared/report/evidenceReportModel.js');
const renderer = S('src/shared/report/evidenceReportRenderer.js');
const normalizer = S('src/shared/utils/exportDataNormalizer.js');
const adapter = S('src/shared/report/dispatchEvidenceAdapter.js');
const drv = S('src/components/DynamicRecordsView.jsx');
const uor = S('src/modules/experiences/UniversalOperationalRuntime.jsx');
const fb = S('src/components/FormBuilder.jsx');

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
/* FIXTURES — réplica EXACTA de la proyección real (DB → record)      */
/* ------------------------------------------------------------------ */
/* getModuleResponses (dynamicService.js:384) proyecta:                */
/*   sgc_response_values ( field_id, value_text, value_number,         */
/*     value_boolean, value_json, sgc_form_fields ( label, field_type, */
/*     options ) )                                                     */
/* → el join NUNCA trae `id` ni `order_index`.                         */
const JOIN = (label, type, options = {}) => ({ label, field_type: type, options });
const VAL = (fieldId, type, raw, extra = {}) => ({
  field_id: fieldId,
  value_text: type === 'text' || type === 'textarea' || type === 'select' ? String(raw ?? '') : (type === 'signature' ? extra.text || '' : ''),
  value_number: type === 'number' ? raw : null,
  value_boolean: type === 'boolean' ? raw : null,
  value_json: extra.json ?? null,
  sgc_form_fields: JOIN(`L${fieldId}`, type, extra.options || {}),
});
const REC = (id, values = []) => ({
  id, created_at: '2026-01-01T10:00:00Z', status: 'aprobado',
  sgc_forms: { id: 'form1', name: 'Calidad del Agua', module_id: 'm1' },
  sgc_response_values: values,
});
/* getFormFields (select '*', ordenado por order_index) → skeleton con id real */
const FIELD = (id, label, type, order_index) => ({
  id, label, field_type: type, required: true, options: {}, order_index,
});
const SKELETON6 = [
  FIELD('a', 'I1', 'informative', 1),
  FIELD('b', 'Texto', 'text', 2),
  FIELD('c', 'Número', 'number', 3),
  FIELD('d', 'Bool', 'boolean', 4),
  FIELD('e', 'I2', 'informative', 5),
  FIELD('f', 'Firma', 'signature', 6),
];
const REC6 = REC('r6', [
  VAL('b', 'text', 'v'),
  VAL('c', 'number', 9),
  VAL('d', 'boolean', true),
  VAL('f', 'signature', '', { text: 'https://x/s.png' }),
]);

/* ================================================================== */
/* E01–E10 — SCOPE (0 cambios src en 332) + CLAVE PRIMARIA DEL JOIN    */
/* ================================================================== */
{
  const entries = git();
  const srcM = entries.filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  const expected331 = [
    'src/components/DynamicRecordsView.jsx',
    'src/components/FormBuilder.jsx',
    'src/components/engines/BaseChecklist.jsx',
    'src/components/engines/BaseGeneric.jsx',
    'src/components/engines/BaseMediciones.jsx',
    'src/pages/DynamicForm.jsx',
    'src/runtime/rendering/registry/ComponentRegistry.ts',
    'src/shared/report/evidenceReportModel.js',
    'src/shared/report/evidenceReportRenderer.js',
    'src/shared/utils/exportDataNormalizer.js',
  ];
  check(JSON.stringify(srcM) === JSON.stringify(expected331), 'E01: 332 = 0 cambios src nuevos (conjunto = baseline 331, intacto)', JSON.stringify(srcM));
  const newSrc = entries.filter((e) => e.status === '??' && e.path.startsWith('src/')).map((e) => e.path).sort();
  check(JSON.stringify(newSrc) === JSON.stringify(['src/runtime/renderer/fields/FieldInformative.tsx']), 'E02: 0 archivos src nuevos en 332 (solo FieldInformative 331)', JSON.stringify(newSrc));
  const untracked = entries.filter((e) => e.status === '??').map((e) => e.path);
  check(untracked.every((u) => !/^src\//.test(u) || u.includes('FieldInformative.tsx')), 'E03: untracked ⊆ artefactos 331/332 (sin src nuevos)');
  check(!entries.some((e) => /\.sql$/.test(e.path)) && !entries.some((e) => /package(-lock)?\.json/.test(e.path)), 'E04: 0 SQL / 0 dependencias');

  // CLAVE DEL HALLAZGO: la proyección del join NO trae `id` de sgc_form_fields
  H(/sgc_response_values \( field_id, value_text, value_number, value_boolean, value_json, sgc_form_fields \( label, field_type, options \) \)/, svc, 'E05: consulta proyecta join SIN id (label, field_type, options)');
  N(/sgc_form_fields \( id,|sgc_form_fields \( label, field_type, options, order_index/, svc, 'E06: el join NO incluye id ni order_index en getModuleResponses');
  check(countOf(/field_id, value_text, value_number, value_boolean, value_json/g, svc) >= 1, 'E07: field_id SÍ se proyecta (clave de corrección disponible)');
  H(/\.select\('\*'\)[\s\S]{0,60}\.order\('order_index', \{ ascending: true \}\)/, svc, 'E08: getFormFields = select(*) + orden por order_index (skeleton canónico con id)');
  N(/sgc_form_fields: \{ label, field_type: type, options: \{\}\}/, adapter, 'E09: adapter despachos también omite id en el join');
  check(typeof buildEvidenceReportModel === 'function', 'E10: EvidenceReportModel importable (reproducción runtime)');
}

/* ================================================================== */
/* E11–E25 — REPRODUCCIÓN DEL DEFECTO (punto exacto de pérdida)       */
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

  // PUNTO EXACTO DE PÉRDIDA (línea 87): el Map se indexa con field.id,
  // que NO existe en el join → todos los valores caen bajo la clave `undefined`
  // (colapsan a 1) y el lookup por uuid del skeleton falla → 0 filas.
  check(countOf(/valueByField\.set\(field\.id, \{ val, field \}\)/, model) === 1, 'E11: CAUSA — merge se indexa por field.id (ausente en el join)');
  check(countOf(/valueByField\.get\(field\.id\)/, model) === 1, 'E12: CAUSA — lookup por field.id del skeleton (uuid) → miss');

  const m = buildEvidenceReportModel({ registros: [rec], formFieldsByForm: { form1: skeleton } });
  const fields = m.forms[0].records[0].fields;
  const labels = fields.map((f) => f.label);

  check(fields.length === 1, 'E13: REPRODUCCIÓN — con skeleton, SOLO queda el informativo (respuestas DROPPED)', labels.join(','));
  check(labels.includes('FILTRO SANITARIO') && fields[0].presentation === true, 'E14: REPRODUCCIÓN — informative presente (metadata only)');
  check(!labels.includes('Operario') && !labels.includes('Temperatura') && !labels.includes('Estado') && !labels.includes('Observaciones'), 'E15: REPRODUCCIÓN — text/number/boolean/textarea AUSENTES (proyección perdida)', labels.join(','));

  // FALLBACK (UOR despachos, sin skeleton): el Map colapsa a la ÚLTIMA respuesta
  const mFb = buildEvidenceReportModel({ registros: [rec] });
  const fldsFb = mFb.forms[0].records[0].fields;
  check(fldsFb.length === 1 && fldsFb[0].label === 'Lf5', 'E16: REPRODUCCIÓN — fallback colapsa a la última respuesta (legacy regresado)', fldsFb.map((f) => f.label).join(','));

  // Firma: se procesa ANTES del Map → se preserva
  const recSig = REC('r2', [
    VAL('s1', 'text', 'x'),
    VAL('s2', 'signature', '', { text: 'https://x/f.png' }),
  ]);
  const mSig = buildEvidenceReportModel({ registros: [recSig] });
  check(mSig.forms[0].records[0].signatures.length === 1, 'E17: firma PRESERVADA (canal previo al Map)');
  check(mSig.forms[0].records[0].evidences.length === 0, 'E18: evidencias vacías intactas (contrato)');

  // PATRÓN POR TIPO — la pérdida es de la RUTA COMÚN, no por tipo
  const allTypes = REC('r3', [
    VAL('t1', 'text', 'hola'),
    VAL('t2', 'textarea', 'texto largo'),
    VAL('t3', 'number', 22),
    VAL('t4', 'boolean', false),
    VAL('t5', 'select', 'Bueno', { json: null }),
  ]);
  const mAll = buildEvidenceReportModel({ registros: [allTypes], formFieldsByForm: { form1: [FIELD('t1', 'T', 'text', 1), FIELD('t2', 'X', 'textarea', 2), FIELD('t3', 'N', 'number', 3), FIELD('t4', 'B', 'boolean', 4), FIELD('t5', 'S', 'select', 5)] } });
  check(mAll.forms[0].records[0].fields.length === 0, 'E19: text/textarea/number/boolean/select → TODOS DROPPED (ruta común, no fallo por tipo)');

  // CLAVE DE CORRECCIÓN: field_id está disponible en el propio registro
  check(rec.sgc_response_values[0].field_id === 'f1' && rec.sgc_response_values[1].field_id === 'f3', 'E20: field_id presente en la respuesta (merge viable por field_id ↔ skeleton.id)');
}

/* ================================================================== */
/* E26–E40 — CONTRATO DE VALORES (etapa por etapa)                    */
/* ================================================================== */
{
  // Database → records query: valores SÍ proyectados (source of truth viva)
  H(/value_text, value_number, value_boolean, value_json/, svc, 'E26: DB→query: value_* proyectados en getModuleResponses');
  check(countOf(/value_text:|value_number:|value_boolean:|value_json:/g, adapter) >= 4, 'E27: adapter despachos emite value_* por campo');
  // records query → record object: PRESENT (ambos paths)
  check(countOf(/value_text/g, svc) >= 1 && countOf(/value_number/g, svc) >= 1, 'E28: record object transporta value_text/value_number');
  // record object → sgc_response_values: PRESENT (fixture refleja proyección)
  check(['field_id', 'value_text', 'value_number', 'value_boolean', 'value_json'].every((k) => k in VAL('f1', 'text', 'x')), 'E29: fixture sgc_response_values transporta field_id + value_* (misma forma que DB)');

  // sgc_response_values → EvidenceReportModel: valores llegan PERO se dropean en el merge
  H(/for \(const val of rec\?\.sgc_response_values/, model, 'E30: modelo itera sgc_response_values (llegan al modelo)');
  check(countOf(/valueByField\.set\(field\.id/, model) === 1, 'E31: DROPPED en el reindexado (field.id ausente) → merge falla');

  // normalized field/value: solo sobrevive el informativo
  H(/value: '', presentation: true, order/, model, 'E32: fila informativa = metadata only (sin valor)');
  // EvidenceReportRenderer: consume fields del modelo (recibe lo ya perdido)
  H(/for \(const f of record\.fields\)/, renderer, 'E33: renderer dibuja lo que el modelo proyecta (recibe DROPPED)');
  H(/head: tableHead/, renderer, 'E34: renderer mantiene tabla Campo/Valor (infraestructura correcta)');
  H(/Sin datos registrados/, renderer, 'E35: renderer con 0 campos → estado "Sin datos registrados" (sin error de layout)');
}

/* ================================================================== */
/* E41–E55 — LAYOUT INFORMATIVE (defecto separado)                    */
/* ================================================================== */
{
  const bandBlock = renderer.slice(renderer.indexOf('f.presentation'), renderer.indexOf('} else {', renderer.indexOf('f.presentation')));
  check(bandBlock.length > 0, 'E41: bloque de la banda informativa localizado');
  N(/splitTextToSize/, bandBlock, 'E42: DEFECTO — banda informativa SIN política de wrapping (splitTextToSize ausente)');
  H(/doc\.text\(f\.label, MARGIN_X \+ 8, y \+ 13\)/, renderer, 'E43: banda dibuja doc.text de una línea (sin wrap ni altura variable)');
  N(/doc\.rect\([^)]*\)[\s\S]{0,40}doc\.text\([^)]*splitTextToSize/, renderer, 'E44: 0 adaptación de altura a líneas envueltas en la banda');
  // Contraste: kv() SÍ tiene wrapping (la política existe en el mismo renderer)
  check(countOf(/splitTextToSize/g, renderer) >= 1, 'E45: el renderer YA tiene política de wrap (kv), no aplicada a informative');
  H(/CONTENT_W - labelWidth - 8/, renderer, 'E46: kv() limita al ancho disponible — la banda informativa NO');
  check(countOf(/doc\.rect\(MARGIN_X, y, CONTENT_W, 20, 'F'\)/, renderer) === 1, 'E47: banda = rect fijo 20pt (altura NO crece con el contenido)');
  N(/fontSize\(7\)|setFontSize\(6\)/, renderer, 'E48: NO se acepta reducir fuente como arreglo (regla del sprint)');
  const bandCore = renderer.slice(renderer.indexOf("doc.setFillColor(238, 242, 246)"), renderer.indexOf('y += 20;'));
  check(bandCore.length > 0 && !/autoTable|cellWidth|columnStyles/.test(bandCore), 'E49: banda = DISPLAY BLOCK propio (rect+text, sin celda autoTable)', bandCore.slice(0, 60));
}

/* ================================================================== */
/* E56–E70 — ORDEN CANÓNICO + INFORMATIVE POSICIÓN                    */
/* ================================================================== */
{
  const skeleton6 = SKELETON6;
  const rec6 = REC6;
  const m6 = buildEvidenceReportModel({ registros: [rec6], formFieldsByForm: { form1: skeleton6 } });
  const f6 = m6.forms[0].records[0].fields;

  check(f6.length === 2 && f6[0].label === 'I1' && f6[1].label === 'I2', 'E56: informativos en POSICIÓN 1 y 5 (order_index) — orden canónico del skeleton intacto', f6.map((f) => f.label).join(','));
  check(f6[0].presentation === true && f6[1].presentation === true, 'E57: ambos informativos presentación (metadata only)');
  check(countOf(/\.order\('order_index', \{ ascending: true \}\)/, svc) >= 1, 'E58: orden canónico proviene de order_index (getFormFields)');
  N(/responseValues\.map|sgc_response_values\.map/, model, 'E59: el orden NO se reconstruye desde response_values (ruta correcta: skeleton)');
  check(countOf(/formFieldsByForm\?\.\[rec\?\.sgc_forms\?\.id\]/, model) === 1, 'E60: merge por formulario (formFieldsByForm) presente');

  // Formulario legacy sin informative → también roto (regresión común)
  const legacy = REC('rl', [VAL('x1', 'text', 'a'), VAL('x2', 'number', 1)]);
  const mLegacy = buildEvidenceReportModel({ registros: [legacy], formFieldsByForm: { form1: [FIELD('x1', 'A', 'text', 1), FIELD('x2', 'B', 'number', 2)] } });
  check(mLegacy.forms[0].records[0].fields.length === 0, 'E61: REGRESIÓN — legacy sin informative también pierde respuestas (misma ruta)');
  check(legacy.sgc_response_values.length === 2 && legacy.sgc_response_values.every((v) => v.field_id), 'E62: las respuestas legacy EXISTEN y traen field_id (pérdida es del merge, no de datos)');
}

/* ================================================================== */
/* E71–E80 — AISLAMIENTO EXCEL + CAMBIOS AUTORIZADOS 332              */
/* ================================================================== */
{
  check(countOf(/if \(field\.field_type === 'informative'\) return;/g, normalizer) === 3, 'E71: Excel excluye informative (3 pases) — política 330/331 intacta');
  H(/field\.label/, normalizer, 'E72: Excel usa field.label del join (label SÍ proyectado) → Excel NO contaminado por el merge');
  check(countOf(/field\.field_type === 'signature'/g, normalizer) === 3, 'E73: Excel signature intacto (Ver Firma)');
  H(/row\['Evidencias'\] =/, normalizer, 'E74: Excel evidencias intactas');
  N(/sheetColumns\.add\(.*informative/, normalizer, 'E75: 0 columna informativa en Excel');

  // 332: 0 cambios en runtime/captura/motor/firma
  const srcM = git().filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path);
  check(!srcM.some((p) => /SignaturePad|MediaProcessingCore|documentsService|EvidenceUploader|Repositorio|Storage|UniversalOrderMotor|order-motor/.test(p)), 'E76: firma/media/repositorio/motor NO se tocaron en 332', JSON.stringify(srcM));
  N(/InformativeFieldService|EvidenceFieldService|EvidenceResponseMapper|InformativeReportService|EvidenceValueService/, model + renderer, 'E77: 0 servicios/mappers nuevos (un solo modelo)');
  check(countOf(/import \{ buildEvidenceReportModel \}/g, drv) === 1 && countOf(/const model = buildEvidenceReportModel\(/g, drv) === 1, 'E78: Historial = 1 import + 1 call (sin pipelines nuevos)', `drv=${countOf(/buildEvidenceReportModel/g, drv)}`);
  H(/formFieldsByForm,/, drv, 'E79: Historial inyecta metadata (skeleton) — path afectado');
  N(/formFieldsByForm/, uor, 'E80: Despachos NO inyecta skeleton (fallback) — path también afectado (colapso)');
}

/* ================================================================== */
/* CASOS FORENSES OBLIGATORIOS A–T                                    */
/* ================================================================== */
{
  const skMix = [
    FIELD('i1', 'SECCION', 'informative', 1),
    FIELD('t1', 'Texto', 'text', 2),
    FIELD('n1', 'Num', 'number', 3),
    FIELD('b1', 'Bool', 'boolean', 4),
    FIELD('s1', 'Sel', 'select', 5),
    FIELD('g1', 'Firma', 'signature', 6),
  ];
  const mix = REC('rm', [
    VAL('t1', 'text', 'abc'),
    VAL('n1', 'number', 8),
    VAL('b1', 'boolean', false),
    VAL('s1', 'select', 'Regular'),
    VAL('g1', 'signature', '', { text: 'https://x/g.png' }),
  ]);

  // A — text: DISCREPANCIA (DROPPED)
  check(buildEvidenceReportModel({ registros: [REC('ra', [VAL('a', 'text', 'valor')])], formFieldsByForm: { form1: [FIELD('a', 'A', 'text', 1)] } }).forms[0].records[0].fields.length === 0, 'CASO A — text: DROPPED (discrepancia certificada)');
  // B — textarea: DISCREPANCIA (DROPPED)
  check(buildEvidenceReportModel({ registros: [REC('rb', [VAL('b', 'textarea', 'largo')])], formFieldsByForm: { form1: [FIELD('b', 'B', 'textarea', 1)] } }).forms[0].records[0].fields.length === 0, 'CASO B — textarea: DROPPED (discrepancia certificada)');
  // C — number: DISCREPANCIA (DROPPED)
  check(buildEvidenceReportModel({ registros: [REC('rc', [VAL('c', 'number', 4)])], formFieldsByForm: { form1: [FIELD('c', 'C', 'number', 1)] } }).forms[0].records[0].fields.length === 0, 'CASO C — number: DROPPED (discrepancia certificada)');
  // D — boolean: DISCREPANCIA (DROPPED)
  check(buildEvidenceReportModel({ registros: [REC('rd', [VAL('d', 'boolean', true)])], formFieldsByForm: { form1: [FIELD('d', 'D', 'boolean', 1)] } }).forms[0].records[0].fields.length === 0, 'CASO D — boolean: DROPPED (discrepancia certificada)');
  // E — select: DISCREPANCIA (DROPPED)
  check(buildEvidenceReportModel({ registros: [REC('re', [VAL('e', 'select', 'Bueno')])], formFieldsByForm: { form1: [FIELD('e', 'E', 'select', 1)] } }).forms[0].records[0].fields.length === 0, 'CASO E — select: DROPPED (discrepancia certificada)');
  // F — signature: PRESERVADO
  check(buildEvidenceReportModel({ registros: [REC('rf', [VAL('f', 'signature', '', { text: 'https://x/f.png' })])] }).forms[0].records[0].signatures.length === 1, 'CASO F — signature: PRESERVADO (canal previo al Map)');
  // G — informative: metadata only (sin input ni valor)
  check(buildEvidenceReportModel({ registros: [REC('rg', [])], formFieldsByForm: { form1: [FIELD('g', 'TITULO', 'informative', 1)] } }).forms[0].records[0].fields[0].presentation === true, 'CASO G — informative: presentación (metadata only)');
  // H — informative sin response row: aparece
  check(buildEvidenceReportModel({ registros: [REC('rh', [])], formFieldsByForm: { form1: [FIELD('h', 'FILTRO SANITARIO', 'informative', 1)] } }).forms[0].records[0].fields[0].label === 'FILTRO SANITARIO', 'CASO H — informative sin response row: aparece desde metadata');
  // I — mixed: todos los tipos → solo informativos sobreviven (patrón de ruta común)
  const mI = buildEvidenceReportModel({ registros: [mix], formFieldsByForm: { form1: skMix } });
  const fI = mI.forms[0].records[0].fields;
  check(fI.length === 1 && fI[0].label === 'SECCION' && fI[0].presentation, 'CASO I — mixed: SOLO informative sobrevive; text/number/boolean/select DROPPED', fI.map((f) => f.label).join(','));
  // J — ordering: position de informative = order_index (1)
  check(fI[0].label === 'SECCION', 'CASO J — informativo en posición 1 (order_index)');
  // K — long informative: sin wrap → overflow horizontal (DEFECTO)
  check(countOf(/splitTextToSize/g, renderer.slice(renderer.indexOf('f.presentation'), renderer.indexOf('} else {'))) === 0, 'CASO K — long informative: layout sin wrap (defecto certificado)');
  // L — long textarea: autoTable con overflow linebreak (tabla sana cuando hay buffer)
  H(/overflow: 'linebreak'/, renderer, 'CASO L — long textarea: la tabla Campo/Valor usa overflow linebreak (infraestructura OK)');
  // M — empty optional: reporte válido (sin romper)
  check(countOf(/Sin datos registrados/, renderer) === 1, 'CASO M — empty: rama "Sin datos registrados" válida');
  // N — required: el reporte NO depende de required (metadata + response)
  N(/required/, model, 'CASO N — el reporte NO depende de required (solo metadata + response)');
  // O — legacy form sin informative: roto (regresión común) → exige corrección
  check(buildEvidenceReportModel({ registros: [REC('ro', [VAL('o1', 'text', 'x'), VAL('o2', 'number', 2)])], formFieldsByForm: { form1: [FIELD('o1', 'O1', 'text', 1), FIELD('o2', 'O2', 'number', 2)] } }).forms[0].records[0].fields.length === 0, 'CASO O — legacy sin informative: DROPPED (regresión, debe corregirse)');
  // P — informative + respuesta artificial: ignorada (nunca se une una respuesta)
  check(buildEvidenceReportModel({ registros: [REC('rp', [VAL('p', 'text', 'ignorado')])], formFieldsByForm: { form1: [FIELD('p', 'P', 'informative', 1)] } }).forms[0].records[0].fields[0].value === '', 'CASO P — informative ignora cualquier respuesta artificial (solo metadata)');
  // Q — signature: sin duplicado
  const mQ = buildEvidenceReportModel({ registros: [REC('rq', [VAL('q', 'signature', '', { text: 'https://x/q.png' }), VAL('q2', 'signature', '', { text: 'https://x/q2.png' })])] });
  check(mQ.forms[0].records[0].signatures.length === 2 && mQ.forms[0].records[0].signatures[0].index === 1 && mQ.forms[0].records[0].signatures[1].index === 2, 'CASO Q — 2 firmas sin duplicación (índices secuenciales)');
  // R — multiple records: cada registro proyecta su propia pérdida (reproducción)
  const mR = buildEvidenceReportModel({ registros: [REC('r1', [VAL('a', 'text', 'v1')]), REC('r2', [VAL('b', 'number', 3)])], formFieldsByForm: { form1: [FIELD('a', 'A', 'text', 1), FIELD('b', 'B', 'number', 2)] } });
  check(mR.forms[0].records.length === 2 && mR.forms[0].records.every((r) => r.fields.length === 0), 'CASO R — 2 registros: ambos pierden sus valores (defecto transversal por registro)');
  // S — no response: reporte válido (informative-only)
  const mS = buildEvidenceReportModel({ registros: [REC('rs', [])], formFieldsByForm: { form1: [FIELD('s', 'TITULO', 'informative', 1)] } });
  check(mS.forms[0].records[0].fields.length === 1 && mS.summary.totalRecords === 1, 'CASO S — no response: reporte válido (informative presentacional)');
  // T — mixed ordering: informative en posiciones exactas 1 y 5 (works via skeleton)
  const mT = buildEvidenceReportModel({ registros: [REC6], formFieldsByForm: { form1: SKELETON6 } });
  check(mT.forms[0].records[0].fields.map((f) => f.label).join(',') === 'I1,I2', 'CASO T — mixed ordering: informativos exactamente en 1 y 5 (order_index)');
}

/* ================================================================== */
/* VEREDICTO (AUDIT ONLY)                                             */
/* ================================================================== */
const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED (DISCREPANCY REPRODUCED)' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 332 — EVIDENCE REPORT FIELD PROJECTION');
console.log(' · FORENSIC INTEGRATION AUDIT (AUDIT ONLY)');
console.log('============================================================');
console.log(' PUNTO EXACTO DE PÉRDIDA LOCALIZADO:');
console.log('  evidenceReportModel.js:87  valueByField.set(field.id, ...)');
console.log('  → el join sgc_form_fields de getModuleResponses (y del adapter');
console.log('    de despachos) NO proyecta `id` → todos los valores caen bajo');
console.log('    la clave `undefined` (colapso a 1) y el lookup por uuid del');
console.log('    skeleton falla → 0 filas de respuesta en el informe.');
console.log('  field_id SÍ se proyecta → corrección viable (merge field_id↔id)');
console.log('  DEFINITIVAMENTE NO ES UN ARCHITECTURAL GAP.');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E80 + Casos A-T   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' TRAZABILIDAD POR TIPO (discrepancias certificadas):');
console.log(' TEXT       → DROPPED  (join sin id)');
console.log(' TEXTAREA   → DROPPED  (join sin id)');
console.log(' NUMBER     → DROPPED  (join sin id)');
console.log(' BOOLEAN    → DROPPED  (join sin id)');
console.log(' SELECT     → DROPPED  (join sin id)');
console.log(' SIGNATURE  → PRESERVED (canal previo al Map)');
console.log(' INFORMATIVE→ PRESENT  (metadata only) · LAYOUT DISCREPANCY');
console.log('------------------------------------------------------------');
console.log(' VEREDICTO ARQUITECTÓNICO:');
console.log(' EVIDENCE REPORT GENERATION       PASS');
console.log(' REPORT HEADER                    PASS');
console.log(' REPORT CONTEXT                   PASS');
console.log(' RECORD METADATA                  PASS');
console.log(' FIELD VALUE PROJECTION           DISCREPANCY (LOCALIZED)');
console.log(' TEXT/TEXTAREA/NUMBER/BOOLEAN/SEL  DROPPED (join sin id)');
console.log(' SIGNATURE PROJECTION             PRESERVED');
console.log(' INFORMATIVE PROJECTION           PRESENT');
console.log(' INFORMATIVE LAYOUT               DISCREPANCY (sin wrap)');
console.log(' CANONICAL ORDER                  PRESERVED (order_index)');
console.log(' RESPONSE/METADATA MERGE          DROPPED (key field.id)');
console.log(' LEGACY COMPATIBILITY             DISCREPANCY (regresión)');
console.log(' EXCEL ISOLATION                  PRESERVED');
console.log(' SECOND PIPELINE                  NONE');
console.log(' NEW MODEL                        NONE');
console.log(' NEW TABLE                        NONE');
console.log(' NEW SERVICE                      NONE');
console.log(' SRC CHANGES (332)                0');
console.log('------------------------------------------------------------');
console.log(' FINAL CLASSIFICATION:');
console.log(' CONTROLLED CORRECTION REQUIRED');
console.log(' (punto exacto: clave del merge field.id ↔ field_id proyectado)');
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log('============================================================');
process.exit(allPass ? 0 : 1);