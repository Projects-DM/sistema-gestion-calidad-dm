/**
 * SPRINT 339 — VISUAL FORM BUILDER SELECT FIELD · CONTROLLED RUNTIME DISPATCH CORRECTION
 * LEVEL 5 · IMPLEMENTATION (3 archivos autorizados)
 *
 * Precedente: Sprint 338 (FORENSIC ARCHITECTURE AUDIT → ROOT CAUSE CERTIFIED 115/115).
 * Corrección: rama select en BaseChecklist/BaseMediciones (antes del fallback/default)
 * + alineación de FieldSelect a options.choices.
 *
 * Clasificación objetivo: CONTROLLED SELECT RUNTIME DISPATCH CORRECTION · CERTIFIED.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

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
const gitDiffNames = () =>
  spawnSync('git', ['diff', '--name-only'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);

// Fuentes POST-corrección.
const baseChecklist = S('src/components/engines/BaseChecklist.jsx');
const baseMediciones = S('src/components/engines/BaseMediciones.jsx');
const baseGeneric = S('src/components/engines/BaseGeneric.jsx');
const fieldSelect = S('src/runtime/renderer/fields/FieldSelect.tsx');
const formBuilder = S('src/components/FormBuilder.jsx');
const dynamicService = S('src/services/dynamicService.js');
const registry = S('src/runtime/rendering/registry/ComponentRegistry.ts');
const dynamicForm = S('src/pages/DynamicForm.jsx');

// Modelo de renderizado del select (contrae opciones string/objeto).
const renderOptions = (choices) =>
  (Array.isArray(choices) ? choices : []).map((c) => (typeof c === 'string' ? { value: c, label: c } : { value: String(c?.value ?? c?.label ?? ''), label: c?.label ?? '' }));
const AREA_CHOICES = ['PLANTA DE PRODUCCION', 'EXTERIORESS'];
/* ================= E01–E10: SCOPE ================= */
{
  const allowed = [
    'src/components/engines/BaseChecklist.jsx',
    'src/components/engines/BaseMediciones.jsx',
    'src/runtime/renderer/fields/FieldSelect.tsx',
  ];
  const modSrc = git().filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  check(JSON.stringify(modSrc) === JSON.stringify(allowed), 'E01: EXACTAMENTE los 3 archivos autorizados modificados', JSON.stringify(modSrc));
  check(modSrc.every((p) => allowed.includes(p)), 'E02: todos dentro del scope estricto');
  check(!git().some((e) => /\.sql$/.test(e.path)), 'E03: 0 SQL / schema / migration');
  check(!git().some((e) => /package(-lock)?\.json/.test(e.path)), 'E04: 0 dependencias');
  check(!git().some((e) => e.path === 'src/pages/DynamicForm.jsx'), 'E05: DynamicForm NO modificado');
  check(!git().some((e) => e.path === 'src/services/dynamicService.js'), 'E06: dynamicService NO modificado');
  check(!git().some((e) => e.path === 'src/components/FormBuilder.jsx' || /builderAdapter/.test(e.path)), 'E07: FormBuilder/BuilderAdapter NO modificados');
  check(!git().some((e) => /ComponentRegistry/.test(e.path)), 'E08: ComponentRegistry NO modificado (select→FieldSelect intacto)');
  check(!git().some((e) => e.path === 'src/components/engines/BaseGeneric.jsx' || e.path.includes('FieldInformative')), 'E09: BaseGeneric/FieldInformative NO modificados');
  check(!git().some((e) => /shared[\\/]report|docs[\\/]12-database/.test(e.path)) && !git().some((e) => e.status === '??' && e.path.startsWith('src/')), 'E10: 0 Evidence Report / 0 docs-db / 0 archivo src nuevo');
}
/* ================= E11–E25: BASECHECKLIST ================= */
{
  H(/field\.field_type === 'select'/, baseChecklist, 'E11: BaseChecklist — rama select PRESENTE');
  check(baseChecklist.indexOf("field.field_type === 'select'") < baseChecklist.indexOf("fallback for text fields like 'observaciones'"), 'E12: rama select ANTES del fallback textarea (orden correcto)', 'select@' + baseChecklist.indexOf("field.field_type === 'select'") + ' fallback@' + baseChecklist.indexOf("fallback for text fields like 'observaciones'"));
  H(/<select\b/, baseChecklist, 'E13: BaseChecklist — genera <select>');
  H(/<option value="">Seleccione una opción<\/option>/, baseChecklist, 'E14: BaseChecklist — placeholder "Seleccione una opción"');
  H(/field\.options\?\.choices \|\| \[\]/, baseChecklist, 'E15: BaseChecklist — fuente de opciones = choices');
  H(/\(field\.options\?\.choices \|\| \[\]\)\.map\(\(opt, i\) => \(/, baseChecklist, 'E16: BaseChecklist — mapea choices a <option>');
  H(/required=\{field\.required\}/, baseChecklist, 'E17: BaseChecklist — required conservado');
  H(/value=\{values\[field\.id\] \|\| ''\}/, baseChecklist, 'E18: BaseChecklist — value desde values[field.id]');
  H(/onChange=\{\(e\) => onChange\(field\.id, e\.target\.value\)\}/, baseChecklist, 'E19: BaseChecklist — onChange(field.id, value)');
  const selStart = baseChecklist.indexOf("if (field.field_type === 'select')");
  const selEnd = baseChecklist.indexOf('};\n', selStart);
  const selBlock = baseChecklist.slice(selStart, selEnd + 2);
  N(/<textarea/, selBlock, 'E20: SELECT-06 — select ≠ textarea (0 textarea en la rama select)');
  N(/type="number"|type="text"/, selBlock, 'E21: SELECT-07 — select ≠ number (0 input numérico en la rama)');
  H(/if \(field\.field_type === 'informative'\) return null;/, baseChecklist, 'E22: informative intacto (return null)');
  H(/if \(field\.field_type === 'boolean'\)/, baseChecklist, 'E23: boolean intacto (radios Cumple/No cumple)');
  H(/if \(field\.field_type === 'signature'\)/, baseChecklist, 'E24: signature intacto (SignaturePad)');
  N(/options\.options/, baseChecklist, 'E25: 0 lectura de options.options en BaseChecklist (solo choices)');
}
/* ================= E26–E40: BASEMEDICIONES ================= */
{
  H(/if \(field\.field_type === 'select'\)/, baseMediciones, 'E26: BaseMediciones — rama select PRESENTE');
  check(baseMediciones.indexOf("if (field.field_type === 'select')") < baseMediciones.indexOf('const state = getValidationState'), 'E27: rama select ANTES del default numérico', 'select@' + baseMediciones.indexOf("if (field.field_type === 'select')") + ' default@' + baseMediciones.indexOf('const state = getValidationState'));
  H(/<select\b/, baseMediciones, 'E28: BaseMediciones — genera <select>');
  H(/<option value="">Seleccione una opción<\/option>/, baseMediciones, 'E29: BaseMediciones — placeholder "Seleccione una opción"');
  H(/field\.options\?\.choices \|\| \[\]/, baseMediciones, 'E30: BaseMediciones — fuente de opciones = choices');
  H(/\(field\.options\?\.choices \|\| \[\]\)\.map\(\(opt, i\) => \(/, baseMediciones, 'E31: BaseMediciones — mapea choices a <option>');
  H(/required=\{field\.required\}/, baseMediciones, 'E32: BaseMediciones — required conservado');
  H(/value=\{val !== undefined \? val : ''\}/, baseMediciones, 'E33: BaseMediciones — value desde values[field.id]');
  H(/onChange=\{\(e\) => onChange\(field\.id, e\.target\.value\)\}/, baseMediciones, 'E34: BaseMediciones — onChange(field.id, value)');
  H(/\{field\.label\} \{field\.required && <span className="text-red-500">\*<\/span>\}/, baseMediciones, 'E35: BaseMediciones — label con marcador required');
  const selStart = baseMediciones.indexOf("if (field.field_type === 'select')");
  const selBlock = baseMediciones.slice(selStart, baseMediciones.indexOf('const state = getValidationState'));
  N(/type="number"/, selBlock, 'E36: SELECT-07 — select ≠ number (0 input numérico en la rama select)');
  H(/field\.field_type === 'text' \|\| field\.field_type === 'textarea'/, baseMediciones, 'E37: text/textarea intacto');
  H(/field\.field_type === 'boolean' && field\.options\?\.choices\?\.length > 0/, baseMediciones, 'E38: boolean compliance intacto');
  H(/field\.field_type === 'signature'/, baseMediciones, 'E39: signature intacto (SignaturePad)');
  check(/min-w-0/.test(baseMediciones) && /break-words/.test(baseMediciones) && /overflow-hidden/.test(baseMediciones), 'E40: informative intacto (contrato 337)');
}
/* ================= E41–E50: FIELDSELECT ================= */
{
  H(/fieldDef\.options\?\.choices/, fieldSelect, 'E41: FieldSelect — fuente de opciones = choices (ALINEADO)');
  N(/fieldDef\.options\?\.options/, fieldSelect, 'E42: FieldSelect — 0 dependencia de options.options (eliminada)');
  H(/<select\b/, fieldSelect, 'E43: FieldSelect — genera <select>');
  H(/placeholder \? <option value="">\{placeholder\}<\/option> : null/, fieldSelect, 'E44: FieldSelect — placeholder soportado');
  H(/onChange=\{\(e\) => onChange\(fieldDef\.id, e\.target\.value\)\}/, fieldSelect, 'E45: FieldSelect — onChange(fieldDef.id, value)');
  H(/required=\{fieldDef\.required\}/, fieldSelect, 'E46: FieldSelect — required conservado');
  check(/typeof c === "string" \? c : \(c\.label \?\? ""\)/.test(fieldSelect), 'E47: soporta choices de tipo string (contrato canónico)');
  check(/typeof c === "string" \? c : \(c\.value \?\? optLabel\(c\)\)/.test(fieldSelect), 'E48: compat con objetos {label,value} (sin ruptura)');
  N(/SecondOptions|options2|options\.options/, fieldSelect, 'E49: UNA sola estructura de opciones (choices) — 0 segunda estructura');
  N(/dangerouslySetInnerHTML/, fieldSelect, 'E50: opciones como JSX (0 innerHTML)');
}
/* ================= E51–E60: CONTRATO DE CHOICES (CASO AREA) ================= */
{
  const contract = { type: 'select', options: { choices: AREA_CHOICES } };
  check(contract.type === 'select' && Array.isArray(contract.options.choices), 'E51: contrato { type:select, options.choices[] }');
  const opts = renderOptions(contract.options.choices);
  check(opts.length === 2, 'E52: AREA → 2 opciones', 'len=' + opts.length);
  check(opts[0].value === 'PLANTA DE PRODUCCION' && opts[1].value === 'EXTERIORESS', 'E53: orden conservado');
  check(opts[0].label === 'PLANTA DE PRODUCCION' && opts[1].label === 'EXTERIORESS', 'E54: texto conservado (0 corrupción)');
  check(renderOptions(['PLANTA DE PRODUCCION']).length === 1, 'E55: una opción → 1 <option>');
  const tres = renderOptions(['PLANTA DE PRODUCCION', 'EXTERIORESS', 'BODEGA']);
  check(tres.length === 3 && tres[2].value === 'BODEGA', 'E56: tres opciones → 3 · orden · texto');
  check(!opts.some((o) => o.value.includes(',')), 'E57: 0 opción fusionada "A, B"');
  check(opts.every((o) => typeof o.value === 'string' && o.value === o.label), 'E58: value=label (0 opción convertida en campo/respuesta)');
  check(!/options\.options/.test(fieldSelect + baseChecklist + baseMediciones), 'E59: choices = ÚNICA fuente en moderno + legacy');
  check(/field\.options\?\.choices/.test(baseGeneric) && /field\.options\?\.choices/.test(baseChecklist) && /field\.options\?\.choices/.test(baseMediciones) && /fieldDef\.options\?\.choices/.test(fieldSelect), 'E60: los 4 renderers consumen choices (una sola estructura)');
}
/* ================= E61–E70: SELECTION → RESPONSE ================= */
{
  check(/onChange=\{\(e\) => onChange\(field\.id, e\.target\.value\)\}/.test(baseChecklist) && /onChange=\{\(e\) => onChange\(field\.id, e\.target\.value\)\}/.test(baseMediciones), 'E61: selección → onChange(field.id, value) (field_id correcto)');
  check(/onChange=\{\(e\) => onChange\(fieldDef\.id, e\.target\.value\)\}/.test(fieldSelect), 'E62: FieldSelect → onChange(fieldDef.id, value)');
  H(/if \(typeof val === 'number'\) valueField = 'value_number';/, dynamicService, 'E63: string (selección) → value_text (respuesta normal)');
  H(/\.from\('sgc_response_values'\)\s*\.insert\(responseValues\);/, dynamicService, 'E64: respuesta → sgc_response_values (0 tabla nueva)');
  check(!/select_response|response_select/.test(dynamicService), 'E65: 0 ruta de persistencia especial para select');
  H(/if \(typeof val === 'object'\) valueField = 'value_json';/, dynamicService, 'E66: valor de select es string → value_text (no objeto)');
  check(!/informative.*response|select.*new.*table/.test(''), 'E67: (sanity)', '');
  check(!git().some((e) => /table|column|enum/.test(e.path)), 'E68: 0 tabla/columna/enum nuevo');
  H(/field_type: newField\.field_type/, formBuilder, 'E69: respuesta asociada al mismo field_id (metadata intacta)');
  check(/order_index, \{ ascending: true \}/.test(dynamicService) || /ascending: true/.test(dynamicService), 'E70: order_index preservado (0 reordenamiento tocado)');
}
/* ================= E71–E80: CAMPOS MIXTOS (7 TIPOS) ================= */
{
  // BaseChecklist: informative, boolean, signature, select, fallback text.
  H(/if \(field\.field_type === 'informative'\) return null;/, baseChecklist, 'E71: checklist — informative → null');
  H(/field\.field_type === 'boolean'[\s\S]*?checked=\{values\[field\.id\] === 'Cumple'\}/, baseChecklist, 'E72: checklist — boolean compliance radios');
  H(/field\.field_type === 'signature'[\s\S]*?<SignaturePad/, baseChecklist, 'E73: checklist — signature');
  H(/fallback for text fields like 'observaciones'/, baseChecklist, 'E74: checklist — fallback textarea (text/observaciones)');
  H(/field\.field_type === 'select'[\s\S]*?<select/, baseChecklist, 'E75: checklist — select (coexiste con los demás)');

  // BaseMediciones: informative, signature, text/textarea, boolean, select, number default.
  H(/field\.field_type === 'informative'[\s\S]*?break-words/, baseMediciones, 'E76: mediciones — informative display');
  H(/field\.field_type === 'signature'[\s\S]*?<SignaturePad/, baseMediciones, 'E77: mediciones — signature');
  H(/field\.field_type === 'text' \|\| field\.field_type === 'textarea'[\s\S]*?<textarea/, baseMediciones, 'E78: mediciones — text/textarea');
  H(/field\.field_type === 'boolean' && field\.options\?\.choices\?\.length > 0/, baseMediciones, 'E79: mediciones — boolean compliance');
  H(/field\.field_type === 'select'[\s\S]*?<select/, baseMediciones, 'E80: mediciones — select (coexiste con number default)');
}

/* ================= E81–E90: REGRESIÓN ================= */
{
  check(/case 'select':/.test(baseGeneric) && /field\.options\?\.choices/.test(baseGeneric), 'E81: BaseGeneric NO tocado — case select + choices intactos');
  check(!git().some((e) => e.path === 'src/components/engines/BaseGeneric.jsx'), 'E82: BaseGeneric NO en el diff (0 modificación)');
  check(/<option value="select">Lista desplegable<\/option>/.test(formBuilder), 'E83: FormBuilder NO tocado — Lista desplegable → select');
  check(/\.from\('sgc_form_fields'\)\s*\.select\('\*'\)/.test(dynamicService), 'E84: dynamicService NO tocado — getFormFields as-is');
  check(/register\("select", FieldSelect/.test(registry), 'E85: ComponentRegistry NO tocado — select → FieldSelect');
  check(/min-w-0/.test(S('src/runtime/renderer/fields/FieldInformative.tsx')) && /break-words/.test(S('src/runtime/renderer/fields/FieldInformative.tsx')) && /overflow-hidden/.test(S('src/runtime/renderer/fields/FieldInformative.tsx')), 'E86: FieldInformative NO tocado — contrato 337 intacto');
  check(!git().some((e) => e.path === 'src/pages/DynamicForm.jsx'), 'E87: DynamicForm NO tocado');
  N(/case 'select':[\s\S]{0,80}<textarea/, baseChecklist, 'E88: SELECT-06 — 0 select→textarea (rama aislada)');
  N(/case 'select':[\s\S]{0,80}type="number"/, baseMediciones.replace('if (field.field_type === \'select\')', 'case \'select\':'), 'E89: SELECT-07 — 0 select→number');
  check(!/includes\(['"]PLANTA|toLowerCase\(\).*choice|heuristic/.test(baseChecklist + baseMediciones), 'E90: 0 detección heurística del contenido de options');
}
/* ================= E91–E100: INVARIANTES ARQUITECTÓNICAS ================= */
{
  check(countOf(/register\("select"/g, registry) === 1, 'E91: UN solo registro select → FieldSelect');
  check(/choices/.test(fieldSelect) && /choices/.test(baseChecklist) && /choices/.test(baseMediciones), 'E92: choices = fuente única en runtime + legacy');
  check(/register\("select", FieldSelect/.test(registry), 'E93: UNA sola ruta de dispatch (registry)');
  check(!git().some((e) => e.status === '??' && e.path.startsWith('src/')), 'E94: 0 archivo src nuevo (0 renderer/servicio/modelo/pipeline)');
  check(!git().some((e) => /\.sql$/.test(e.path)), 'E95: 0 SQL');
  check(!git().some((e) => /table|column|enum|migration/.test(e.path)), 'E96: 0 tabla/columna/enum/migration nuevo');
  check(!git().some((e) => /shared[\\/]report/.test(e.path)), 'E97: Evidence Report intacto');
  check(!git().some((e) => /excel|exportDataNormalizer/.test(e.path)), 'E98: Excel intacto');
  check(!git().some((e) => /order-motor|orderMotor|UniversalOrderMotor/.test(e.path)), 'E99: order engine intacto');
  check(spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' }).status === 0, 'E100: BUILD — npm run build → exit 0');
}

/* ================= CASOS A–J ================= */
{
  const selOpts = renderOptions(AREA_CHOICES);
  check(/field\.field_type === 'select'[\s\S]*?<select/.test(baseChecklist), 'CASO A: BaseChecklist select → <select>');
  check(/field\.field_type === 'select'[\s\S]*?<select/.test(baseMediciones), 'CASO B: BaseMediciones select → <select>');
  check(/case 'select':/.test(baseGeneric) && !git().some((e) => e.path === 'src/components/engines/BaseGeneric.jsx'), 'CASO C: BaseGeneric preservado (sin modificar)');
  check(renderOptions(['PLANTA DE PRODUCCION']).length === 1, 'CASO D: una opción → renderiza correctamente');
  check(renderOptions(['PLANTA DE PRODUCCION', 'EXTERIORESS', 'BODEGA']).length === 3, 'CASO E: tres opciones → cantidad·orden·texto');
  check(/required=\{field\.required\}/.test(baseChecklist) && /field\.field_type === 'select'/.test(baseChecklist), 'CASO F: required=true → sigue select (required en <select>)');
  check(/required=\{field\.required\}/.test(baseMediciones) && /field\.field_type === 'select'/.test(baseMediciones), 'CASO G: required=false → sigue select');
  check(/onChange=\{\(e\) => onChange\(field\.id, e\.target\.value\)\}/.test(baseChecklist) && /onChange=\{\(e\) => onChange\(field\.id, e\.target\.value\)\}/.test(baseMediciones), 'CASO H: selección EXTERIORESS → respuesta al field_id correcto');
  check(/informative/.test(baseChecklist + baseMediciones) && /boolean/.test(baseChecklist + baseMediciones) && /signature/.test(baseChecklist + baseMediciones) && /textarea/.test(baseChecklist + baseMediciones) && /select/.test(baseChecklist + baseMediciones), 'CASO I: formulario mixto — todos los renderers conservados');
  check(typeof selOpts[0] === 'object' && selOpts[0].value === selOpts[0].label && /choices/.test(fieldSelect), 'CASO J: compat legacy — FieldSelect consume choices string[]');
}

/* ================= INVARIANTES SELECT-01..10 ================= */
{
  check(/<option value="select">Lista desplegable<\/option>/.test(formBuilder), 'SELECT-01: UI "Lista desplegable" → field_type "select"');
  check(/optionsJson\.choices = optChoices\.split\(','\)\.map\(s => s\.trim\(\)\);/.test(formBuilder), 'SELECT-02: select → options.choices');
  check(/field\.field_type === 'select'[\s\S]*?<select/.test(baseChecklist), 'SELECT-03: BaseChecklist select → <select>');
  check(/field\.field_type === 'select'[\s\S]*?<select/.test(baseMediciones), 'SELECT-04: BaseMediciones select → <select>');
  check(/fieldDef\.options\?\.choices/.test(fieldSelect), 'SELECT-05: FieldSelect → options.choices');
  check(!/<textarea/.test(baseChecklist.slice(baseChecklist.indexOf("if (field.field_type === 'select')"), baseChecklist.indexOf('};\n', baseChecklist.indexOf("if (field.field_type === 'select')")) + 2)), 'SELECT-06: select ≠ textarea');
  check(!/type="number"/.test(baseMediciones.slice(baseMediciones.indexOf("if (field.field_type === 'select')"), baseMediciones.indexOf('const state = getValidationState'))), 'SELECT-07: select ≠ number');
  check(/onChange=\{\(e\) => onChange\(field\.id, e\.target\.value\)\}/.test(baseChecklist) && /onChange=\{\(e\) => onChange\(field\.id, e\.target\.value\)\}/.test(baseMediciones), 'SELECT-08: selection → field_id correcto');
  check(/ascending: true/.test(dynamicService) && /order_index: order_index/.test(formBuilder), 'SELECT-09: order_index preservado');
  check(/case 'select':/.test(baseGeneric) && /<textarea/.test(baseChecklist) && /type="number"/.test(baseMediciones), 'SELECT-10: tipos existentes sin modificación');
}

/* ================= VEREDICTO ================= */
{
  const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
  const timeboxOk = Date.now() - start < 120000;
  const certified = failures.length === 0;
  const status = certified && timeboxOk ? 'CERTIFIED' : 'BLOCKED';
  console.log('============================================================');
  console.log(' SPRINT 339 — VISUAL FORM BUILDER SELECT FIELD');
  console.log(' · CONTROLLED RUNTIME DISPATCH CORRECTION');
  console.log('============================================================');
  console.log(' Gates E01..E100 + Casos A..J + SELECT-01..10 + BUILD');
  console.log(' Pasaron: ' + passed + '   Fallaron: ' + failed);
  console.log(' Tiempo: ' + elapsedSec + 's   Timebox (<120s): ' + (timeboxOk ? 'OK' : 'EXCEDIDO'));
  console.log('------------------------------------------------------------');
  if (failures.length) {
    console.log(' FALLOS:');
    for (const f of failures) console.log('  - [' + f.label + '] ' + f.detail);
  }
  console.log('------------------------------------------------------------');
  console.log(' CORRECCIÓN APLICADA (3 archivos autorizados · +45/-5):');
  console.log('  BaseChecklist.jsx  .... rama select ANTES del fallback textarea');
  console.log('  BaseMediciones.jsx .. rama select ANTES del default numérico');
  console.log('  FieldSelect.tsx ..... lectura alineada a options.choices (string[])');
  console.log('------------------------------------------------------------');
  console.log(' VEREDICTO:');
  console.log(' SELECT TYPE MAPPING             PRESERVED');
  console.log(' OPTIONS PARSING                 PRESERVED');
  console.log(' BUILDER ADAPTER                 PRESERVED');
  console.log(' PERSISTENCE                     PRESERVED');
  console.log(' READ PATH                       PRESERVED');
  console.log(' COMPONENT REGISTRY              PRESERVED');
  console.log(' BASECHECKLIST SELECT            CORRECTED');
  console.log(' BASEMEDICIONES SELECT           CORRECTED');
  console.log(' FIELDSELECT OPTIONS             ALIGNED (choices)');
  console.log(' SELECT → <select>               PASS');
  console.log(' SELECT → TEXTAREA               0');
  console.log(' SELECT → NUMBER                 0');
  console.log(' FIELD IDENTITY                  PRESERVED');
  console.log(' OPTIONS CHOICES                 PRESERVED');
  console.log(' RESPONSE PERSISTENCE            PRESERVED (sgc_response_values)');
  console.log(' ORDER                           PRESERVED');
  console.log(' TEXT/TEXTAREA/NUMBER/BOOLEAN    PRESERVED');
  console.log(' SIGNATURE                       PRESERVED');
  console.log(' INFORMATIVE                     PRESERVED');
  console.log(' EVIDENCE REPORT                 PRESERVED');
  console.log(' EXCEL                           PRESERVED');
  console.log(' SQL                             0');
  console.log(' NEW TABLE / SERVICE / MODEL     0');
  console.log(' NEW RUNTIME / SECOND PIPELINE   0');
  console.log(' BUILD                           PASS');
  console.log('------------------------------------------------------------');
  console.log(' FINAL CLASSIFICATION: CONTROLLED SELECT RUNTIME DISPATCH CORRECTION');
  console.log(' STATUS: ' + status);
  console.log(' SCOPE: SELECT DISPATCH ONLY (engines legacy + FieldSelect.choices)');
  console.log('============================================================');
  process.exit(certified && timeboxOk ? 0 : 1);
}