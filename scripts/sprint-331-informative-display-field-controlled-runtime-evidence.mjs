/**
 * SPRINT 331 — INFORMATIVE DISPLAY FIELD · CONTROLLED RUNTIME + EVIDENCE
 * LEVEL 5 · CONTROLLED METADATA EXTENSION (CERTIFICADO por Sprint 330)
 *
 * Implementa el tipo de campo "informative" (UI: "Texto informativo")
 * dentro del CONTRATO existente, sin segundo modelo/servicio/pipeline/tabla:
 *
 *   CONTRATO: { id, label, field_type:"informative", required:false, options, order_index }
 *   RUNTIME  : presentación (banda/sección) en los 3 engines legacy + registry
 *              moderno (13 tipos). NUNCA un input de texto.
 *   SUBMIT   : informative queda FUERA de values iniciales, validación required
 *              y payload → 0 filas en sgc_response_values.
 *   EVIDENCE : merge metadata (sgc_form_fields) + response en orden canónico
 *              (order_index); informative = fila de presentación, nunca
 *              "label: — / N/A / undefined".
 *   EXCEL    : informative EXCLUIDO explícitamente de columnas y filas.
 *   SEGURIDAD: texto plano, 0 dangerouslySetInnerHTML.
 *
 * Áreas autorizadas (Sprint 331 §11): FormBuilder, ComponentRegistry/runtime,
 * DynamicForm/submit, engines legacy, Evidence Report Model, Evidence Report
 * Renderer, Export normalizer, DynamicRecordsView (caller del informe).
 *
 * Prohibido: nuevas tablas/servicios/modelos, otro motor de orden, Media
 * Processing Core, documentsService, SignaturePad, EvidenceUploader,
 * Repositorio, Storage, schema Supabase.
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

const engineUrl = 'file:///' + path.join(ROOT, 'src', 'order-motor', 'UniversalOrderMotor.js').replace(/\\/g, '/');
const { moveFieldToOrder, normalizeFieldOrder, moveUp, moveDown } = await import(engineUrl);

const modelUrl = 'file:///' + path.join(ROOT, 'src', 'shared', 'report', 'evidenceReportModel.js').replace(/\\/g, '/');
const { buildEvidenceReportModel } = await import(modelUrl);

const fb = S('src/components/FormBuilder.jsx');
const gen = S('src/components/engines/BaseGeneric.jsx');
const chk = S('src/components/engines/BaseChecklist.jsx');
const med = S('src/components/engines/BaseMediciones.jsx');
const df = S('src/pages/DynamicForm.jsx');
const model = S('src/shared/report/evidenceReportModel.js');
const renderer = S('src/shared/report/evidenceReportRenderer.js');
const normalizer = S('src/shared/utils/exportDataNormalizer.js');
const registry = S('src/runtime/rendering/registry/ComponentRegistry.ts');
const fieldInfo = S('src/runtime/renderer/fields/FieldInformative.tsx');
const drv = S('src/components/DynamicRecordsView.jsx');

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
const idx = (s, t) => s.indexOf(t);
const git = () => {
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  return gs.stdout.split('\n').filter(Boolean).map((l) => ({ status: l.slice(0, 2).trim(), path: l.slice(3).trim() }));
};

/* ---------- Fixtures de evidencia (0 DB, forma de getModuleResponses) ---------- */
const FIELD = (id, label, type, order_index, opts = {}) => ({
  id, label, field_type: type, required: opts.required ?? true,
  options: opts.options || {}, order_index,
});
const REC = (id, formId, name, values = []) => ({
  id, created_at: '2026-01-01T10:00:00Z', status: 'aprobado',
  sgc_forms: { id: formId, name, module_id: 'm1' },
  sgc_response_values: values,
});
const VAL = (fieldId, type, raw, extra = {}) => ({
  field_id: fieldId,
  sgc_form_fields: { id: fieldId, label: `L${fieldId}`, field_type: type, options: extra.options || {} },
  value_text: type === 'text' ? raw : (type === 'signature' ? extra.text || '' : ''),
  value_boolean: type === 'boolean' ? raw : null,
  value_number: type === 'number' ? raw : null,
  value_json: extra.json ?? null,
});

/* ================================================================== */
/* E01–E10 — SCOPE, NO-TOUCH Y ARTEFACTOS                              */
/* ================================================================== */
{
  const entries = git();
  const srcM = entries.filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  const expected = [
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
  check(JSON.stringify(srcM) === JSON.stringify(expected), 'E01: src/ modificados = 10 archivos autorizados EXACTO', JSON.stringify(srcM));

  const finger = {
    'src/order-motor/UniversalOrderMotor.js': '5DBB3848AE2171ADF11E3EAF48B560BB2A18A8C16C6C0CB42CFB6627624883F9',
    'src/order-motor/adapters/FormBuilderOrderAdapter.js': 'EB4D60EF1438C489F5FBDDD66F33F022EECE5DC980B4A8D7550DBCD6678C3F89',
    'src/services/dynamicService.js': 'A7E2885C4BED35510B5177CAB88DBE93DCC53B1C60C4DEB735B59D7B5F29554D',
  };
  let fi = 0;
  for (const [p, fp] of Object.entries(finger)) {
    fi += 1;
    check(sha(p) === fp, `E0${1 + fi}: fingerprint inalterado — ${p}`, `sha ${sha(p)}`);
  }

  const ALL = entries.map((e) => e.path);
  const prohibited = ALL.filter((p) => (
    p.includes('MediaProcessingCore') || p.includes('media-processing-core') ||
    p.includes('documentsService') || p.includes('SignaturePad') ||
    p.includes('EvidenceUploader') || p.includes('Repositorio') || p.includes('Storage') ||
    /supabase\b/.test(p) || p.includes('sql_setup_dynamic')
  ));
  check(prohibited.length === 0, 'E05: 0 archivos de áreas PROHIBIDAS modificados', JSON.stringify(prohibited));
  check(!ALL.some((p) => /\.sql$/.test(p)), 'E06: 0 SQL / 0 schema Supabase');
  check(!ALL.some((p) => /package(-lock)?\.json/.test(p)), 'E07: 0 dependencias / 0 package.json');

  const newSrc = entries.filter((e) => e.status === '??' && e.path.startsWith('src/')).map((e) => e.path).sort();
  check(JSON.stringify(newSrc) === JSON.stringify(['src/runtime/renderer/fields/FieldInformative.tsx']), 'E08: único archivo src/ nuevo = FieldInformative.tsx (ruta autorizada)', JSON.stringify(newSrc));

  const untracked = entries.filter((e) => e.status === '??').map((e) => e.path);
  const allowedUntracked = [
    'docs/Sprint-330.md',
    'docs/Sprint-331.md',
    'scripts/sprint-330-informative-display-field-forensic-architecture-audit.mjs',
    'scripts/sprint-331-informative-display-field-controlled-runtime-evidence.mjs',
    'src/runtime/renderer/fields/FieldInformative.tsx',
  ];
  check(untracked.every((u) => allowedUntracked.includes(u)), 'E09: untracked ⊆ artefactos 330/331 + FieldInformative', JSON.stringify(untracked));
  check(!entries.some((e) => /src\/services\/informative|InformativeFieldService|InformativeReportRenderer|InformativeRuntime|informative-schema/.test(e.path)), 'E10: 0 servicios/modelos/pipelines informativos nuevos');
}

/* ================================================================== */
/* E11–E25 — BUILDER (FormBuilder)                                    */
/* ================================================================== */
{
  check((fb.match(/<option value="informative">Texto informativo<\/option>/g) || []).length === 2, 'E11: opción "Texto informativo" en AMBOS selects (crear+editar)', String(countOf(/<option value="informative">Texto informativo<\/option>/g, fb)));
  check(countOf(/disabled=\{newField\.field_type === 'informative'\}/g, fb) === 1, 'E12: checkbox "obligatorio" DESHABILITADO en crear para informative');
  check(countOf(/disabled=\{editField\.field_type === 'informative'\}/g, fb) === 1, 'E13: checkbox "obligatorio" DESHABILITADO en editar para informative');
  check(countOf(/checked=\{newField\.required && newField\.field_type !== 'informative'\}/g, fb) === 1, 'E14: crear — required fuerza false cuando informative');
  check(countOf(/checked=\{editField\.required && editField\.field_type !== 'informative'\}/g, fb) === 1, 'E15: editar — required fuerza false cuando informative');
  check(countOf(/required: newField\.field_type === 'informative' \? false : newField\.required/g, fb) === 2, 'E16: crear — normalización required=false (importMode + persistencia)', String(countOf(/required: newField\.field_type === 'informative' \? false : newField\.required/g, fb)));
  check(countOf(/required: editField\.field_type === 'informative' \? false : editField\.required/g, fb) === 2, 'E17: editar — normalización required=false (importMode + persistencia)', String(countOf(/required: editField\.field_type === 'informative' \? false : editField\.required/g, fb)));
  check(countOf(/required: field\.field_type === 'informative' \? false : field\.required/g, fb) === 1, 'E18: startEdit normaliza required legacy true → false');
  check(countOf(/\{newField\.field_type === 'informative' &&/g, fb) === 0, 'E19: 0 bloque de configuración específica para informative (crear)');
  check(countOf(/\{editField\.field_type === 'informative' &&/g, fb) === 0, 'E20: 0 bloque de configuración específica para informative (editar)');
  check(countOf(/Orden dentro del formulario/g, fb) === 2, 'E21: regresión 329 — 1 control de orden por panel (sin duplicados)');
  const createBlock = fb.slice(idx(fb, 'onSubmit={handleAddField}'), fb.indexOf('</form>', idx(fb, 'onSubmit={handleAddField}')));
  const editBlock = fb.slice(idx(fb, 'onSubmit={handleUpdateField}'), fb.indexOf('</form>', idx(fb, 'onSubmit={handleUpdateField}')));
  check(idx(createBlock, 'Orden dentro del formulario') > idx(createBlock, 'Este campo es obligatorio'), 'E22: crear — Orden tras "obligatorio" (regresión 329)');
  check(idx(editBlock, 'Orden dentro del formulario') > idx(editBlock, 'Este campo es obligatorio'), 'E23: editar — Orden tras "obligatorio" (regresión 329)');
  check(countOf(/onSubmit=\{handleAddField\}/g, fb) === 1 && countOf(/onSubmit=\{handleUpdateField\}/g, fb) === 1, 'E24: acciones Guardar/Actualizar Campo intactas');
  N(/description|displayText|sectionTitle|instruction|presentationType|informativeValue/, fb, 'E25: builder NO agrega propiedades inventadas (contrato minimal)');
}

/* ================================================================== */
/* E26–E35 — RUNTIME LEGACY (3 engines)                               */
/* ================================================================== */
{
  H(/case 'informative':\s*return null;/, gen, 'E26: BaseGeneric — informative → null (sin input de texto por defecto)');
  H(/field\.field_type === 'informative' \? \(/, gen, 'E27: BaseGeneric — rama heading presentacional (md:col-span-2)');
  H(/if \(field\.field_type === 'informative'\) return null;/, chk, 'E28: BaseChecklist — renderFieldInput retorna null para informative');
  H(/field\.field_type === 'informative' \? \(/, chk, 'E29: BaseChecklist — rama heading presentacional');
  H(/field\.field_type === 'informative'[\s\S]{0,200}md:col-span-2/, med, 'E30: BaseMediciones — rama heading presentacional (md:col-span-2)');
  const branchOk = gen + chk + med;
  N(/informative'[\s\S]{0,400}<input|informative'[\s\S]{0,400}<textarea|informative'[\s\S]{0,400}SignaturePad/, branchOk, 'E31: informative NUNCA renderiza input/textarea/SignaturePad en engines legacy');
  N(/border-b-2[\s\S]{0,120}field\.required && <span/, branchOk, 'E32: heading informativo NO muestra asterisco de obligatorio');
  check(countOf(/onChange=\{\(e\) => onChange\(field\.id/g, gen) >= 5, 'E33: regresión — casos text/number/boolean/select/textarea de BaseGeneric intactos');
  check(countOf(/renderFieldInput\(field\)/g, chk) === 1 && countOf(/field\.field_type === 'boolean'/g, chk) >= 2, 'E34: regresión — BaseChecklist intacto (boolean + fallback)');
  check(countOf(/field\.field_type === 'signature'/g, med) === 1 && countOf(/field\.field_type === 'text' \|\| field\.field_type === 'textarea'/g, med) === 1, 'E35: regresión — BaseMediciones intacto (signature/text/textarea)');
}

/* ================================================================== */
/* E36–E45 — RUNTIME MODERNO (ComponentRegistry + FieldInformative)   */
/* ================================================================== */
{
  check(fs.existsSync(path.join(ROOT, 'src/runtime/renderer/fields/FieldInformative.tsx')), 'E36: FieldInformative.tsx existe');
  N(/<input|<textarea|<select|SignaturePad|onChange\(/, fieldInfo, 'E37: FieldInformative — 0 input/textarea/select/interacción');
  N(/dangerouslySetInnerHTML/, fieldInfo, 'E38: FieldInformative — 0 dangerouslySetInnerHTML (texto plano)');
  H(/fieldDef\.label/, fieldInfo, 'E39: FieldInformative renderiza SOLO el label (presentación)');
  H(/FieldInformative/, registry, 'E40: ComponentRegistry importa FieldInformative');
  H(/register\("informative", FieldInformative/, registry, 'E41: ComponentRegistry registra "informative"');
  check(countOf(/^register\(/gm, registry) === 13, 'E42: registry moderno = 13 registros (12 previos + informative)', String(countOf(/^register\(/gm, registry)));
  check(countOf(/register\("informative"/g, registry) === 1, 'E43: informative registrado UNA sola vez (sin duplicados)');
  check(countOf(/^register\("(text|textarea|number|select|checkbox|radio|multiselect|file_upload|signature|calculated|workflow_status|table)"/gm, registry) === 12, 'E44: regresión — 12 registros legacy intactos');
  H(/\| string;/, S('src/runtime/types/runtimeContracts.ts'), 'E45: RuntimeFieldType admite informative vía `| string` (SSOT tipo sin CHECK)');
}

/* ================================================================== */
/* E46–E55 — SUBMIT / VALIDACIÓN (DynamicForm)                        */
/* ================================================================== */
{
  check(countOf(/if \(f\.field_type === 'informative'\) return;[\s\S]{0,120}initial\[f\.id\] = '';/, df) === 1, 'E46: values iniciales EXCLUYEN informative');
  check(countOf(/if \(field\.required && field\.field_type !== 'informative'\)/g, df) === 1, 'E47: validación required IGNORA informative');
  check(countOf(/if \(fieldDef\?\.field_type === 'informative'\) return;/g, df) === 1, 'E48: processedValues (payload) EXCLUYE informative');
  H(/submitFormResponse\(formDef\.id/, df, 'E49: submitFormResponse intacto');
  H(/El campo "[\s\S]{0,30}" es obligatorio/, df, 'E50: alerta de obligatorio intacta (mensaje)');
  H(/hasCriticals = true/, df, 'E51: cálculo evidenceRequired (boolean/number) intacto');
  H(/field\.field_type === 'boolean' && f\.options\?\.choices/, df, 'E52: validación compliance boolean intacta');
  H(/field\.field_type === 'boolean'[\s\S]{0,80}initial\[f\.id\] = false/, df, 'E53: values iniciales boolean/number intactos (regresión)');
  H(/obsField = fields\.find\(f => f\.name/, df, 'E54: hallazgo observación intacto');
  N(/dangerouslySetInnerHTML/, df, 'E55: DynamicForm — 0 innerHTML');
}

/* ================================================================== */
/* E56–E69 — EVIDENCE REPORT MODEL (runtime: merge metadata+response) */
/* ================================================================== */
{
  check(typeof buildEvidenceReportModel === 'function', 'E56: buildEvidenceReportModel exportado y ejecutable');
  N(/dynamicService|supabase|fetch|await/, model, 'E57: modelo 0-query (no importa dynamicService/supabase)');

  const skeleton = [
    FIELD('f1', 'Registro N°', 'text', 1),
    FIELD('f2', 'SECCIÓN A', 'informative', 2, { required: true }),
    FIELD('f3', 'Temperatura', 'number', 3),
    FIELD('f4', 'Estado operativo', 'boolean', 4),
    FIELD('f5', 'SECCIÓN B', 'informative', 5),
    FIELD('f6', 'Observaciones', 'text', 6),
  ];
  const rec = REC('rec1', 'form1', 'Chequeo Diario', [
    VAL('f1', 'text', 'R-1001'),
    VAL('f3', 'number', 22),
    VAL('f4', 'boolean', null, { json: { value: 'Cumple' }, options: { choices: ['Cumple', 'No cumple'] } }),
    VAL('f6', 'text', 'Sin novedades'),
  ]);
  const m = buildEvidenceReportModel({ registros: [rec], formFieldsByForm: { form1: skeleton } });
  const fields = m.forms[0].records[0].fields;
  const seq = fields.map((f) => `${f.label}${f.presentation ? '#P' : ''}`).join(' | ');

  check(fields.length === 6, 'E58: merge = 6 filas (4 respuesta + 2 informativas)', seq);
  check(seq === 'Registro N° | SECCIÓN A#P | Temperatura | Estado operativo | SECCIÓN B#P | Observaciones', 'E59: ORDEN CANÓNICO intercalado por order_index', seq);
  check(fields.filter((f) => f.presentation).length === 2, 'E60: exactamente 2 filas de presentación');
  const infA = fields.find((f) => f.label === 'SECCIÓN A');
  check(infA.presentation === true && infA.value === '', 'E61: informativo = presentation:true + value:"" (nunca "—")', JSON.stringify(infA));
  check(fields.find((f) => f.label === 'SECCIÓN B').presentation === true, 'E62: segundo informativo también presentación');
  check(fields.find((f) => f.label === 'Temperatura').value === 22, 'E63: respuesta number normalizada intacta', JSON.stringify(fields.find((f) => f.label === 'Temperatura')));
  check(fields.find((f) => f.label === 'Estado operativo').value === 'Cumple', 'E64: respuesta boolean-compliance normalizada (value_json → Cumple)');
  N(/SECCIÓN A: (—|N\/A|undefined)/, model + JSON.stringify(fields), 'E65: jamás se emite "label: —" para un informativo');

  // E66 — fallback sin metadata: comportamiento previo (solo respuesta, sin presentación)
  const mFb = buildEvidenceReportModel({ registros: [rec] });
  const fldsFb = mFb.forms[0].records[0].fields;
  check(fldsFb.length === 4 && fldsFb.every((f) => !f.presentation), 'E66: fallback (sin formFieldsByForm) = solo respuestas, sin presentación', fldsFb.map((f) => f.label).join(', '));

  // E67 — signature: canal propio, fuera de fields
  const skSig = [FIELD('s1', 'Firma', 'signature', 1), FIELD('s2', 'Anotación', 'informative', 2), FIELD('s3', 'Texto', 'text', 3)];
  const recSig = REC('rec2', 'form2', 'Acta', [VAL('s1', 'signature', '', { text: 'https://x/firma.png' }), VAL('s3', 'text', 'ok')]);
  const mSig = buildEvidenceReportModel({ registros: [recSig], formFieldsByForm: { form2: skSig } });
  const rec2 = mSig.forms[0].records[0];
  check(rec2.signatures.length === 1 && rec2.signatures[0].index === 1 && rec2.signatures[0].label === 'Firma', 'E67: signature → signatures (canal propio) intacto', JSON.stringify(rec2.signatures));
  check(rec2.fields.length === 2 && rec2.fields[0].label === 'Anotación' && rec2.fields[0].presentation, 'E68: signature NO aparece en fields; informativo intercalado antes del texto', rec2.fields.map((f) => f.label).join(','));

  // E69 — registro sin responses con skeleton informativo: solo presentación, 0 vacíos falsos
  const recEmpty = REC('rec3', 'form1', 'Chequeo Diario', []);
  const mE = buildEvidenceReportModel({ registros: [recEmpty], formFieldsByForm: { form1: skeleton } });
  const fldsE = mE.forms[0].records[0].fields;
  check(fldsE.length === 2 && fldsE.every((f) => f.presentation), 'E69: sin respuestas + skeleton → SOLO filas informativas (sin "—")', fldsE.map((f) => f.label).join(','));
}

/* ================================================================== */
/* E70–E79 — EVIDENCE REPORT RENDERER                                 */
/* ================================================================== */
{
  H(/if \(f\.presentation\)/, renderer, 'E70: renderer maneja filas de presentación (rama explícita)');
  H(/doc\.rect\(MARGIN_X, y, CONTENT_W, 20, 'F'\)/, renderer, 'E71: informativo = banda de presentación (rect + text), no celda Campo/Valor');
  H(/doc\.text\(f\.label, MARGIN_X \+ 8, y \+ 13\)/, renderer, 'E72: banda usa doc.text (texto plano) con f.label');
  H(/Sin datos registrados/, renderer, 'E73: rama "Sin datos registrados" preservada (0 campos)');
  N(/dangerouslySetInnerHTML|innerHTML/, renderer, 'E74: renderer — 0 innerHTML');
  check(countOf(/head: tableHead/g, renderer) >= 1, 'E75: autoTable con encabezado Campo/Valor intacto', String(countOf(/head: tableHead/g, renderer)));
  H(/buffer\.push\(\[f\.label, f\.value\]\)/, renderer, 'E76: solo filas NO presentacionales entran a la tabla Campo/Valor');
  check(countOf(/sectionTitle\(doc, y, 'DATOS DEL REGISTRO'\)/g, renderer) === 1, 'E77: sección DATOS DEL REGISTRO única');
  H(/lastAutoTable\.finalY \+ 10/, renderer, 'E78: flujo de y tras tabla preservado');
  H(/linkLine\(doc, MARGIN_X, y,/, renderer, 'E79: firmas/evidencias como enlaces intactos');
}

/* ================================================================== */
/* E80–E85 — EXPORT NORMALIZER (Excel)                                */
/* ================================================================== */
{
  const loops = (normalizer.match(/if \(field\.field_type === 'informative'\) return;/g) || []).length;
  check(loops === 3, 'E80: normalizador excluye informative en los 3 pases (columnas/orden/filas)', String(loops));
  H(/sheetColumns\.add\(field\.label\)/, normalizer, 'E81: columnas dinámicas por label intactas (fuera de informative)');
  H(/sheetColumns\.add\('Ver Firma'\)/, normalizer, 'E82: columna Ver Firma intacta');
  H(/row\['Evidencias'\] =/, normalizer, 'E83: columna Evidencias intacta');
  check(countOf(/field\.field_type === 'signature'/g, normalizer) === 3, 'E84: manejo signature intacto (3 pases)', String(countOf(/field\.field_type === 'signature'/g, normalizer)));
  N(/sheetColumns\.add\(.*informative|informative[^;]{0,80}sheetColumns/, normalizer, 'E85: 0 columna informativa agregada al Excel');
}

/* ================================================================== */
/* E86–E95 — REGRESIÓN MOTOR + SCOPE FINAL + BUILD                    */
/* ================================================================== */
{
  const mk = (id, order) => ({ id, label: id, type: 'text', required: true, order });
  const mkMany = (n) => Array.from({ length: n }, (_, i) => mk(`c${i + 1}`, i + 1));
  const up = moveUp(mkMany(50), 'c50');
  const dn = moveDown(mkMany(50), 'c10');
  const mv = moveFieldToOrder(mkMany(50), 'c50', 10);
  check(up.find((f) => f.id === 'c50').order === 49 && dn.find((f) => f.id === 'c10').order === 11 && mv.find((f) => f.id === 'c50').order === 10, 'E86: motor de orden intacto (↑/↓/move)');

  check(countOf(/reorderFormFieldsOrder\(/g, fb) >= 3 && countOf(/moveFieldToOrder\(/g, fb) >= 4, 'E87: builder sigue consumiendo ONE REORDER ENGINE (motor 328)');

  const srcFiles = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).filter((f) => f.endsWith('.tsx') || f.endsWith('.jsx'));
  const inform = srcFiles.filter((f) => f.includes('Informative'));
  check(JSON.stringify(inform) === JSON.stringify(['runtime\\renderer\\fields\\FieldInformative.tsx'].map((x) => x.replace(/\\/g, ''))) || inform.length === 1, 'E88: ÚNICO archivo con "Informative" en src/ = FieldInformative.tsx (sin servicios/modelos)', JSON.stringify(inform));

  N(/sgc_form_sections|InformativeFieldService|InformativeRuntime|InformativeReportModel|InformativeReportRenderer/, model + renderer + fb + df, 'E89: 0 alusiones a tablas/servicios/modelos informativos inventados');

  // Caller: DynamicRecordsView inyecta metadata al modelo
  H(/formFieldsByForm,/, drv, 'E90: caller del informe inyecta formFieldsByForm');
  check(countOf(/dynamicService\.getFormFields\(id\)/g, drv) === 1, 'E91: 1 consulta de metadata por formulario (formIds dedup)');
  H(/buildEvidenceReportModel\(\{/, drv, 'E92: llamada al modelo intacta');

  N(/dangerouslySetInnerHTML/, fieldInfo + renderer, 'E93: 0 innerHTML en renderer nuevo/modificado (texto plano)');

  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E94: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E95: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

/* ================================================================== */
/* CASOS OBLIGATORIOS A–T                                             */
/* ================================================================== */
{
  const sk = [
    FIELD('a', 'A1', 'text', 1),
    FIELD('b', 'SECCIÓN INFO', 'informative', 2),
    FIELD('c', 'A3', 'number', 3),
  ];
  const mkRec = (vals) => REC('r', 'f1', 'F', vals);

  // A — Builder: opción informative en crear
  check(countOf(/<option value="informative">Texto informativo<\/option>/g, fb.slice(0, idx(fb, 'onSubmit={handleUpdateField}'))) === 1, 'CASO A — opción informative presente en el select de CREAR');
  // B — Builder: opción informative en editar
  check(countOf(/<option value="informative">Texto informativo<\/option>/g, fb.slice(idx(fb, 'onSubmit={handleUpdateField}'))) === 1, 'CASO B — opción informative presente en el select de EDITAR');
  // C — Crear normaliza required=false
  check(countOf(/required: newField\.field_type === 'informative' \? false : newField\.required/g, fb) === 2, 'CASO C — crear SIEMPRE persiste required=false para informative');
  // D — Editar normaliza required=false
  check(countOf(/required: editField\.field_type === 'informative' \? false : editField\.required/g, fb) === 2, 'CASO D — editar SIEMPRE persiste required=false para informative');
  // E — startEdit normaliza legacy true → false
  check(countOf(/required: field\.field_type === 'informative' \? false : field\.required/g, fb) === 1, 'CASO E — legacy required:true reeditado → forzado false');
  // F — Checkbox deshabilitado (crear)
  check(countOf(/disabled=\{newField\.field_type === 'informative'\}/g, fb) === 1, 'CASO F — checkbox obligatorio deshabilitado al crear informative');
  // G — Checkbox deshabilitado (editar)
  check(countOf(/disabled=\{editField\.field_type === 'informative'\}/g, fb) === 1, 'CASO G — checkbox obligatorio deshabilitado al editar informative');
  // H — BaseGeneric presentacional
  check(countOf(/field\.field_type === 'informative' \? \(/, gen) === 1 && countOf(/case 'informative':/, gen) === 1, 'CASO H — BaseGeneric: rama presentacional + case defensivo');
  // I — BaseChecklist presentacional
  check(countOf(/field\.field_type === 'informative' \? \(/, chk) === 1 && countOf(/if \(field\.field_type === 'informative'\) return null;/, chk) === 1, 'CASO I — BaseChecklist: heading + sin textarea fallback');
  // J — BaseMediciones presentacional
  check(countOf(/field\.field_type === 'informative'[\s\S]{0,20}md:col-span-2/, med) === 1, 'CASO J — BaseMediciones: heading en grid 2 col');
  // K — Registry moderno reconoce informative
  check(countOf(/register\("informative"/g, registry) === 1, 'CASO K — registry reconoce informative (nunca cae a UnsupportedFieldTypeFallback)');
  // L — Submit: excluido de values iniciales
  check(countOf(/if \(f\.field_type === 'informative'\) return;[\s\S]{0,30}if \(f\.field_type === 'boolean'/, df) === 1, 'CASO L — informative nunca entra a values iniciales');
  // M — Submit: excluido de validación required
  check(countOf(/field\.required && field\.field_type !== 'informative'/g, df) === 1, 'CASO M — informative jamás valida required');
  // N — Submit: excluido del payload
  check(countOf(/if \(fieldDef\?\.field_type === 'informative'\) return;/g, df) === 1, 'CASO N — informative jamás llega a submitFormResponse (0 EAV rows)');

  // O — Model: informativo = fila de presentación
  const mO = buildEvidenceReportModel({ registros: [mkRec([VAL('a', 'text', 'x'), VAL('c', 'number', 5)])], formFieldsByForm: { f1: sk } });
  const fO = mO.forms[0].records[0].fields;
  check(fO.find((f) => f.label === 'SECCIÓN INFO').presentation === true, 'CASO O — informativo es fila de presentación en el modelo');
  // P — Model: intercalado en orden canónico
  check(fO.map((f) => f.label).join('|') === 'A1|SECCIÓN INFO|A3', 'CASO P — informativo intercalado por order_index', fO.map((f) => f.label).join('|'));
  // Q — Model: sin respuesta no emite "label: —"
  N(/(SECCIÓN INFO: |SECCIÓN INFO — )/, JSON.stringify(fO), 'CASO Q — 0 valor fantasma para informativo');
  // R — Renderer: banda de presentación (no celda con "—")
  check(countOf(/f\.presentation/g, renderer) >= 2 && countOf(/doc\.rect\(MARGIN_X, y, CONTENT_W, 20, 'F'\)/g, renderer) === 1, 'CASO R — renderer dibuja banda, no fila "label: —"');
  // S — Excel: informative excluido
  check(countOf(/if \(field\.field_type === 'informative'\) return;/g, normalizer) === 3, 'CASO S — Excel excluye informative en columnas y filas');
  // T — Seguridad: texto plano
  check(countOf(/dangerouslySetInnerHTML/g, fieldInfo + renderer + gen) === 0, 'CASO T — 0 innerHTML en render informativo (texto plano)');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 331 — INFORMATIVE DISPLAY FIELD');
console.log(' · CONTROLLED RUNTIME + EVIDENCE (METADATA EXTENSION)');
console.log('============================================================');
console.log(' CONTRATO CERTIFICADO:');
console.log('  BUILDER  → "Texto informativo" en crear/editar · required=false');
console.log('  RUNTIME  → presentación en 3 engines legacy + registry moderno');
console.log('  SUBMIT   → 0 valores iniciales · 0 validación · 0 payload EAV');
console.log('  EVIDENCE → merge metadata+response por order_index · sin "—"');
console.log('  EXCEL    → informative excluido (3 pases)');
console.log('  SAFETY   → texto plano · 0 innerHTML');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E95 + Casos A-T   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' VEREDICTO ARQUITECTÓNICO:');
console.log(' FORM BUILDER              EXTENDED (informative)');
console.log(' REQUIRED INVARIANT        FORCED FALSE');
console.log(' LEGACY RUNTIME            EXTENDED (presentational)');
console.log(' MODERN RUNTIME            EXTENDED (registry 13)');
console.log(' SUBMIT PAYLOAD            UNCHANGED (informative 0 EAV)');
console.log(' EVIDENCE REPORT           EXTENDED (metadata merge)');
console.log(' EXCEL                     EXCLUDED (informative)');
console.log(' ORDER MOTOR               PRESERVED');
console.log(' PERSISTENCE               UNCHANGED (TEXT free, order_index)');
console.log(' DATABASE                  UNCHANGED');
console.log(' SCOPE                     CONTROLLED');
console.log(' SECURITY                  PLAIN TEXT (0 innerHTML)');
console.log(' BUILD                     ' + (failed === 0 ? 'PASS' : 'FAIL'));
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log('============================================================');
process.exit(allPass ? 0 : 1);
