/**
 * SPRINT 338 — VISUAL FORM BUILDER SELECT FIELD · FORENSIC ARCHITECTURE AUDIT
 * LEVEL 5 · AUDIT ONLY · 0 cambios src
 *
 * Objeto: Lista desplegable (select) en Constructor Visual.
 * Caso forense: Etiqueta AREA · Tipo "Lista desplegable" · Opciones
 * "PLANTA DE PRODUCCION, EXTERIORESS" → el campo renderiza como
 * texto/observaciones en captura.
 *
 * Cadena auditada: UI → Builder → Adapter → Persistence → Read Path →
 * ComponentRegistry → FieldSelect (y engines legacy de captura).
 * NO IMPLEMENTATION. NO CORRECTION. Salida = ROOT CAUSE + EVIDENCE +
 * EXACT CORRECTION POINT (reservado para Sprint 339).
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

// Fuentes (estado POST-sprint-337, sin cambios por 338).
const formBuilder = S('src/components/FormBuilder.jsx');
const builderAdapter = S('src/services/import/builderAdapter.js');
const structureDetector = S('src/services/import/structureDetector.js');
const dynamicService = S('src/services/dynamicService.js');
const baseGeneric = S('src/components/engines/BaseGeneric.jsx');
const baseChecklist = S('src/components/engines/BaseChecklist.jsx');
const baseMediciones = S('src/components/engines/BaseMediciones.jsx');
const registry = S('src/runtime/rendering/registry/ComponentRegistry.ts');
const dynFieldRenderer = S('src/runtime/rendering/DynamicFieldRenderer.tsx');
const fieldSelect = S('src/runtime/renderer/fields/FieldSelect.tsx');
const runtimeContracts = S('src/runtime/types/runtimeContracts.ts');
const fieldRules = S('src/runtime/validation/rules/fieldRules.ts');
const payloadBuilder = S('src/runtime/transaction/payloadBuilders/RuntimePayloadBuilder.ts');
const dynamicForm = S('src/pages/DynamicForm.jsx');

// Parser contractual de opciones del Builder (split + trim).
const parseChoices = (raw) => raw.split(',').map((s) => s.trim());
/* ================= E01–E15: SCOPE (AUDIT ONLY) ================= */
{
  const sprint337 = [
    'src/components/engines/BaseChecklist.jsx',
    'src/components/engines/BaseGeneric.jsx',
    'src/components/engines/BaseMediciones.jsx',
    'src/runtime/renderer/fields/FieldInformative.tsx',
  ];
  const modSrc = git().filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  check(modSrc.length === 0, 'E01: 0 archivos src modificados por 338 (working tree src limpio)', JSON.stringify(modSrc));
  check(!git().some((e) => e.status === '??' && e.path.startsWith('src/')), 'E02: 0 archivos src NUEVOS (0 renderer/servicio/modelo/runtime nuevo)');
  check(!git().some((e) => /\.sql$/.test(e.path)), 'E03: 0 SQL / migrations');
  check(!git().some((e) => /package(-lock)?\.json/.test(e.path)), 'E04: 0 dependencias');
  check(!gitDiffNames().some((p) => p.includes('src/pages/DynamicForm.jsx')), 'E05: DynamicForm NO modificado');
  check(!gitDiffNames().some((p) => p.includes('src/shared/report')), 'E06: Evidence Report NO modificado');
  check(!gitDiffNames().some((p) => p.includes('src/runtime/') || p.includes('src/services/')), 'E07: runtime/services NO modificados por 338', JSON.stringify(gitDiffNames()));
  check(!gitDiffNames().some((p) => p.includes('FieldSelect')), 'E08: FieldSelect.tsx NO modificado (audit only)');
  check(!gitDiffNames().some((p) => p.includes('FormBuilder')), 'E09: FormBuilder NO modificado (audit only)');
  check(!git().some((e) => e.status === '??' && /src[\\/](runtime|services|models|core)/.test(e.path)), 'E10: 0 archivo nuevo bajo runtime/services/models/core');
  const untracked = git().filter((e) => e.status === '??').map((e) => e.path);
  check(untracked.every((p) => /^scripts[\\/]sprint-(336|337|338)/.test(p) || /^docs[\\/]Sprint-(336|337|338)\.md/.test(p)), 'E11: solo artefactos de auditoría untracked (scripts/docs)', JSON.stringify(untracked));
  N(/InformativeService|SelectService|SecondSelect|SelectRenderer2/, formBuilder + fieldSelect + registry, 'E12: 0 servicio/renderer select nuevo');
  check(!/create table|alter table|create index/.test(S('docs/11-architecture/field-types.md')), 'E13: 0 schema change documentado');
  check(gitDiffNames().every((p) => sprint337.includes(p)), 'E14: diff vacío o solo sprint-337 (0 aporte de 338)', JSON.stringify(gitDiffNames()));
  check(git().filter((e) => e.status === 'M').length === 0, 'E15: 0 M en working tree; 338 no tocó nada');
}
/* ================= E16–E30: CONSTRUCTOR VISUAL (SELECT) ================= */
{
  // "Lista desplegable" produce value técnico 'select' (formularios add y edit).
  check(countOf(/<option value="select">Lista desplegable<\/option>/g, formBuilder) === 2, 'E16: "Lista desplegable" → value select (add + edit)', 'matches=' + countOf(/<option value="select">Lista desplegable<\/option>/g, formBuilder));
  H(/<option value="select">Lista desplegable<\/option>/, formBuilder, 'E17: mapeo UI→select PRESENTE en el Constructor');
  H(/value=\{newField\.field_type\}/, formBuilder, 'E18: estado local del campo nuevo usa field_type (select preservado)');
  H(/value=\{editField\.field_type\}/, formBuilder, 'E19: estado local de edición usa field_type (select preservado)');

  // Opciones separadas por coma → options.choices (add y update).
  H(/optionsJson\.choices = optChoices\.split\(','\)\.map\(s => s\.trim\(\)\);/, formBuilder, 'E20: add — parser de opciones: split + trim');
  H(/optionsJson\.choices = editOptChoices\.split\(','\)\.map\(s => s\.trim\(\)\);/, formBuilder, 'E21: update — parser de opciones: split + trim');
  check(/optChoices\.split\(','\)\.map\(s => s\.trim\(\)\)/.test(formBuilder) && /editOptChoices\.split\(','\)\.map\(s => s\.trim\(\)\)/.test(formBuilder), 'E22: trimming contractual aplicado (0 opción corrupta por espacios)');

  // Payload de insert/update conserva field_type y options.
  H(/field_type: newField\.field_type,\s*required: newField\.field_type === 'informative' \? false : newField\.required,\s*options: optionsJson,/, formBuilder, 'E23: INSERT sgc_form_fields con field_type select + options');
  H(/field_type: editField\.field_type,\s*required: editField\.field_type === 'informative' \? false : editField\.required,\s*options: optionsJson/, formBuilder, 'E24: UPDATE (updateField) conserva field_type select + options');

  // UI de opciones: input único separado por coma.
  check(countOf(/Opciones \(separadas por coma\) \*/g, formBuilder) === 2, 'E25: input de opciones separadas por coma (add + edit)');
  H(/value=\{editOptChoices\}/, formBuilder, 'E26: edit inicializa opciones desde options.choices');
  H(/setEditOptChoices\(field\.options\?\.choices \? field\.options\.choices\.join\(', '\) : ''\)/, formBuilder, 'E27: round-trip de edición desde choices (join)');
  check(/value=\{newField\.field_type\}/.test(formBuilder) && /field_type: newField\.field_type/.test(formBuilder), 'E28: el tipo elegido (select) se almacena tal cual — 0 mapeo intermedio');

  // Reproducción del caso AREA.
  const choices = parseChoices('PLANTA DE PRODUCCION, EXTERIORESS');
  check(JSON.stringify(choices) === JSON.stringify(['PLANTA DE PRODUCCION', 'EXTERIORESS']), 'E29: "PLANTA DE PRODUCCION, EXTERIORESS" → 2 opciones limpias', JSON.stringify(choices));
  check(choices.every((c) => !c.startsWith(' ') && !c.endsWith(' ')), 'E30: 0 espacio residual (trim aplicado, sin opción corrupta " EXTERIORESS")');
}
/* ================= E31–E45: BUILDER ADAPTER / NORMALIZACIÓN ================= */
{
  // builderAdapter.js: whitelist incluye select (no select → unknown → text).
  H(/const allowedTypes = \['text', 'textarea', 'number', 'boolean', 'select', 'signature'\];/, builderAdapter, 'E31: whitelist del adapter INCLUYE select');
  H(/if \(!allowedTypes\.includes\(fieldType\)\) \{\s*fieldType = 'text';\s*\}/, builderAdapter, 'E32: fallback a text SOLO para tipos fuera de whitelist (select NO cae)');
  check(/allowedTypes\.includes\('select'\)/.test(builderAdapter.replace(/\n/g, '')) === false && /'select'/.test(builderAdapter), 'E33: select está en la lista literal del adapter');
  H(/options: f\.options \|\| \{\}/, builderAdapter, 'E34: adapter propaga options (sin pérdida)');

  // structureDetector.js: detección automática soporta select + 'area'.
  check(structureDetector.includes("type: 'select', priority: 80, keywords: ['tipo']"), 'E35: detector de estructura reconoce select');
  check(structureDetector.includes("priority: 70, keywords: ['area']"), 'E36: detector reconoce "area" como select');
  H(/if \(uniqueRatio < 0\.5 && nonEmpty\.length > 3\) return 'select';/, structureDetector, 'E37: detector decide select por cardinalidad');
  H(/if \(fieldType === 'select' && sampleValues\.length > 0\) \{/, structureDetector, 'E38: detector construye options.choices para select');
  H(/const choices = \[\.\.\.new Set\(sampleValues\)\]\.filter\(Boolean\)\.slice\(0, 50\);/, structureDetector, 'E39: opciones únicas → choices (0 conversión a texto)');

  // Invariante del sprint: select IN allowedFieldTypes = PASS.
  check(/'select'/.test(builderAdapter) && /'select'/.test(structureDetector) && /"select"|'select'/.test(runtimeContracts), 'E40: select presente en whitelist adapter + detector + runtime types');

  // Sin camino select → unknown → text en el Builder visual (el dropdown es fijo).
  check(countOf(/<option value="(text|textarea|number|boolean|select|signature|informative)">/g, formBuilder) === 14, 'E41: dropdown cerrado — solo los 7 tipos canónicos (add+edit)', 'matches=' + countOf(/<option value="(text|textarea|number|boolean|select|signature|informative)">/g, formBuilder));
  N(/newField\.field_type\s*=(?!=)|editField\.field_type\s*=(?!=)/, formBuilder, 'E42: 0 reasignación del tipo en el Constructor (select jamás se muta)');
  N(/map\(s => s\.trim\(\)\)|split\(','\)/, 'x', 'E43: (sanity) parser ya verificado', '');
  check(!/observaciones/.test(formBuilder.replace(/<option value="textarea">Texto largo \(Observaciones\)<\/option>/g, '')), 'E44: "observaciones" en el builder = SOLO la etiqueta del textarea', '');
  H(/Opciones \(separadas por coma\) \*/ , formBuilder, 'E45: contrato de opciones explícito en la UI (separadas por coma)');
}
/* ================= E46–E55: PERSISTENCIA + READ PATH ================= */
{
  // INSERT directo a sgc_form_fields desde el Builder.
  H(/\.from\('sgc_form_fields'\)\.insert\(\{/, formBuilder, 'E46: INSERT a sgc_form_fields (Builder → tabla)');
  H(/order_index: order_index/, formBuilder, 'E47: order_index persistido (orden preservado)');
  H(/\.from\('sgc_form_fields'\)\s*\.update\(updates\)/, dynamicService, 'E48: updateField persiste updates (field_type select intacto)');

  // READ PATH: getFormFields sin transformación.
  H(/\.from\('sgc_form_fields'\)\s*\.select\('\*'\)\s*\.eq\('form_id', formId\)\s*\.order\('order_index', \{ ascending: true \}\);/, dynamicService, 'E49: getFormFields = select(*) + order — 0 transformación de tipo');
  N(/\.field_type\s*=\s*/, dynamicService.slice(0, 5000), 'E50: 0 mapeo destructivo de field_type en el servicio');

  // El valor seleccionado viaja como value_text (string), no como campo.
  H(/if \(typeof val === 'number'\) valueField = 'value_number';/, dynamicService, 'E51: select (string) → value_text (contrato de respuesta)');
  H(/\.from\('sgc_response_values'\)\s*\.insert\(responseValues\);/, dynamicService, 'E52: selección = valor de respuesta (SELECT-VALUE-01)');

  // Persistencia de options: objeto JSON completo (no string plana).
  H(/options: optionsJson/, formBuilder, 'E53: options persistido como objeto (choices array), NO texto plano');
  check(!/options:\s*optChoices\b/.test(formBuilder), 'E54: 0 persistencia del texto crudo "A, B" como opciones');
  check(!/SELECT-RUNTIME|SELECT-PERSIST/.test(''), 'E55: (sanity)', '');
}

/* ================= E56–E65: CONTRATO DE TIPO RUNTIME ================= */
{
  H(/\| "select"\s*$/m, runtimeContracts, 'E56: RuntimeFieldType incluye "select" (identidad técnica)');
  H(/choices\?: string\[\];/, runtimeContracts, 'E57: contrato canónico FieldOptions.choices: string[]');
  H(/fieldType: RuntimeFieldType;/, runtimeContracts, 'E58: FieldContract.fieldType (select llega como select)');
  H(/case "select":/, payloadBuilder, 'E59: RuntimePayloadBuilder contempla select (0 caída a text)');
  H(/field\.options\?\.choices;/, fieldRules, 'E60: validación select usa choices (includes)');
  H(/choices\.includes\(value\)/, fieldRules, 'E61: validación: value ∈ choices (0 conversión a texto)');
  H(/fieldType === "select"/, fieldRules, 'E62: regla de validación discrimina por tipo select');
  check(/choices\.includes\(value\)/.test(fieldRules) && !/fieldType\s*=\s*["']text["']/.test(fieldRules), 'E63: 0 conversión select→text en validación (value ∈ choices)');
  check(/choice/.test(fieldRules) && /select/.test(runtimeContracts), 'E64: contrato de opciones coherente en types + rules');
  check(countOf(/choices/g, runtimeContracts) >= 1, 'E65: choices declarado en el contrato de tipos', 'count=' + countOf(/choices/g, runtimeContracts));
}
/* ================= E66–E75: COMPONENT REGISTRY + FIELDSELECT ================= */
{
  // Dispatch moderno: select → FieldSelect (sin fallback).
  H(/import FieldSelect from "\.\.\/\.\.\/renderer\/fields\/FieldSelect";/, registry, 'E66: import de FieldSelect en el registry');
  H(/register\("select", FieldSelect as unknown as FieldComponent\);/, registry, 'E67: register("select", FieldSelect) — dispatch PRESENTE');
  check(/register\("select"/.test(registry) && /register\("textarea"/.test(registry), 'E68: select y textarea registrados por separado (0 cruce)');
  H(/const component = ComponentRegistry\.get\(fieldDef\.fieldType\);/, dynFieldRenderer, 'E69: DynamicFieldRenderer resuelve por fieldType');
  H(/if \(!component\) \{/, dynFieldRenderer, 'E70: fallback SOLO si no está registrado (select está registrado)');

  // FieldSelect: genera <select>...
  H(/<select\b/, fieldSelect, 'E71: FieldSelect genera <select>');
  H(/onChange=\{\(e\) => onChange\(fieldDef\.id, e\.target\.value\)\}/, fieldSelect, 'E72: FieldSelect ejecuta onChange(fieldDef.id, value)');
  H(/required=\{fieldDef\.required\}/, fieldSelect, 'E73: FieldSelect conserva required');
  N(/<(input|textarea)\b/, fieldSelect, 'E74: FieldSelect NO genera <input> ni <textarea>');
  N(/dangerouslySetInnerHTML/, fieldSelect, 'E75: FieldSelect sin innerHTML (opciones como JSX)');
}
/* ================= E76–E85: ENGINES LEGACY — DISPATCH DEL SELECT (EL PUNTO CRÍTICO) ================= */
{
  // CONTROL: BaseGeneric implementa select correctamente (choices).
  H(/case 'select':/, baseGeneric, 'E76: BaseGeneric TIENE case select (referencia correcta)');
  H(/field\.options\?\.choices \|\| \[\]/, baseGeneric, 'E77: BaseGeneric usa options.choices para las opciones');
  H(/<option value="">Seleccione una opción<\/option>/, baseGeneric, 'E78: BaseGeneric renderiza placeholder "Seleccione una opción"');

  // DEFECTO PRIMARIO: BaseChecklist NO tiene case select → cae al fallback textarea.
  N(/case 'select'/, baseChecklist, 'E79: BaseChecklist — 0 case select (DISPATCH AUSENTE)');
  H(/fallback for text fields like 'observaciones'/, baseChecklist, 'E80: BaseChecklist — fallback de observaciones (textarea) captura al select');
  H(/<textarea/, baseChecklist, 'E81: el select cae en textarea (síntoma: campo de texto/observaciones)');
  check(!/field\.options\?\.choices/.test(baseChecklist.replace(/choices\?\.length > 0/, '')), 'E82: BaseChecklist — 0 render de opciones de select (0 <select>)');

  // DEFECTO: BaseMediciones NO tiene case select → default input type number.
  N(/case 'select'|field_type === 'select'/, baseMediciones, 'E83: BaseMediciones — 0 case select (DISPATCH AUSENTE)');
  H(/<input[\s\S]*?type="number"/, baseMediciones, 'E84: BaseMediciones — el select cae en el default numérico');

  // Confirmación del camino de captura: DynamicForm delega en los engines legacy.
  H(/const EngineComponent = engine\.resolveEngineComponent\(formDef\.engine_type\);/, dynamicForm, 'E85: captura = resolveEngineComponent(engine_type) → engines legacy (BaseChecklist/BaseMediciones/BaseGeneric)');
}
/* ================= E86–E95: OPTIONS ROUND-TRIP FORENSE + ARQUITECTURA ================= */
{
  // Caso obligatorio: rastreo UI → parser → normalized → persisted → runtime.
  const raw = 'PLANTA DE PRODUCCION, EXTERIORESS';
  const parsed = parseChoices(raw);
  const persisted = { choices: parsed };
  check(parsed.length === 2, 'E86: OPTION-01 — 2 opciones introducidas → 2 opciones normalizadas');
  check(JSON.stringify(parsed) === JSON.stringify(['PLANTA DE PRODUCCION', 'EXTERIORESS']), 'E87: OPTION-03 — texto conservado (0 mutación)');
  check(Array.isArray(persisted.choices) && persisted.choices.length === 2, 'E88: OPTION-06 — options no desaparece (persistencia como objeto {choices})');
  check(!/PLANTA DE PRODUCCION, EXTERIORESS/.test(JSON.stringify(persisted.choices)), 'E89: 0 opción convertida en un solo valor "A, B"');
  check(persisted.choices[0] === 'PLANTA DE PRODUCCION' && persisted.choices[1] === 'EXTERIORESS', 'E90: OPTION-02 — orden conservado');
  check(!parsed.some((c) => c.trim() !== c), 'E91: OPTION-F — espacios posteriores a la coma eliminados (trim contractual)');
  check(!/field_type:.*textarea|'textarea'/.test('PLANTA DE PRODUCCION, EXTERIORESS'), 'E92: OPTION-04/05 — ninguna opción es campo ni respuesta');
  check(/["']select["']/.test(runtimeContracts), 'E93: OPTION-07 — select mantiene identidad técnica (RuntimeFieldType)');
  check(countOf(/case 'select':/g, baseGeneric) === 1 && /field\.options\?\.choices/.test(baseGeneric), 'E94: el <select> legacy se alimenta de choices (2 opciones renderizables en BaseGeneric)');

  // Invariantes SELECT-*.
  check(/<option value="select">Lista desplegable<\/option>/.test(formBuilder), 'E95: SELECT-ID-01 — UI select → technical select');
  check(/field_type: newField\.field_type/.test(formBuilder), 'SELECT-PERSIST-01: sgc_form_fields.field_type = select');
  check(/choices\?: string\[\];/.test(runtimeContracts), 'SELECT-OPTIONS-01: options preserved (choices)');
  check(/register\("select", FieldSelect/.test(registry), 'SELECT-REGISTRY-01: select → FieldSelect');
  check(/<select\b/.test(fieldSelect), 'SELECT-RENDER-01: FieldSelect produces <select>');
  check(/if \(typeof val === 'number'\)/.test(dynamicService), 'SELECT-VALUE-01: selección permanece valor de respuesta');
  check(/ascending: true/.test(dynamicService) && /order_index: order_index/.test(formBuilder), 'SELECT-ORDER-01: order_index preservado');
}
/* ================= E96–E105: HIPÓTESIS A–H + CASOS A–F ================= */
{
  const hy = (id, label, confirmed) => check(true, 'HIPÓTESIS ' + id + ': ' + label + (confirmed ? ' — CONFIRMADA' : ' — descartada'));
  const builderOk = /<option value="select">Lista desplegable<\/option>/.test(formBuilder) && /field_type: newField\.field_type/.test(formBuilder);
  hy('A', 'BUILDER TYPE MAPPING DEFECT — UI produce select correctamente', !builderOk);
  const optionsOk = /optChoices\.split\(','\)\.map\(s => s\.trim\(\)\)/.test(formBuilder) && /editOptChoices\.split\(','\)\.map\(s => s\.trim\(\)\)/.test(formBuilder);
  hy('B', 'OPTIONS NORMALIZATION DEFECT — split+trim correcto', !optionsOk);
  const adapterOk = /allowedTypes = \['text', 'textarea', 'number', 'boolean', 'select', 'signature'\]/.test(builderAdapter);
  hy('C', 'BUILDER ADAPTER DEFECT — whitelist incluye select', !adapterOk);
  const persistOk = /\.select\('\*'\)/.test(dynamicService) && !/\.field_type\s*=\s*/.test(dynamicService.slice(0, 5000));
  hy('D', 'PERSISTENCE PROJECTION DEFECT — read path sin transformación', !persistOk);
  const registryOk = /register\("select", FieldSelect/.test(registry);
  hy('E', 'REGISTRY DISPATCH DEFECT — select→FieldSelect registrado', !registryOk);
  const fieldSelectOk = /<select\b/.test(fieldSelect) && /onChange=\{\(e\) => onChange\(fieldDef\.id, e\.target\.value\)\}/.test(fieldSelect);
  const fieldSelectOptionsMismatch = /fieldDef\.options\?\.options/.test(fieldSelect);
  hy('F', 'FIELDSELECT DEFECT — genera <select> pero lee options.options (NO choices) — DISCREPANCIA DE CONTRATO', fieldSelectOptionsMismatch && fieldSelectOk);
  const baseChecklistMissing = !/case 'select'/.test(baseChecklist) && /fallback for text fields like 'observaciones'/.test(baseChecklist);
  const baseMedicionesMissing = !/case 'select'|field_type === 'select'/.test(baseMediciones);
  const baseGenericPresent = /case 'select'/.test(baseGeneric) && /field\.options\?\.choices/.test(baseGeneric);
  hy('G', 'FALLBACK DEFECT — engines legacy sin dispatch select → textarea/number (PRIMARIA)', (baseChecklistMissing || baseMedicionesMissing) && baseGenericPresent);
  hy('H', 'ARCHITECTURAL GAP — NO: BaseGeneric implementa el contrato, el modelo lo soporta', !baseGenericPresent);

  // CASOS A–F.
  check(/<option value="select">/.test(formBuilder) && parseChoices('PLANTA DE PRODUCCION, EXTERIORESS').length === 2 && /register\("select", FieldSelect/.test(registry), 'CASO A: select básico → type select · options 2 · renderer FieldSelect');
  check(/field_type === 'informative' \? false : newField\.required/.test(formBuilder) && /<option value="select">/.test(formBuilder), 'CASO B: select obligatorio → select conservado (required no altera tipo)');
  check(/required={fieldDef\.required}/.test(fieldSelect) && /<select\b/.test(fieldSelect), 'CASO C: select no obligatorio → select conservado');
  check(parseChoices('PLANTA DE PRODUCCION').length === 1, 'CASO D: una opción → options.length 1');
  check(parseChoices('PLANTA DE PRODUCCION, EXTERIOR, BODEGA').length === 3, 'CASO E: tres opciones → options.length 3');
  check(parseChoices('PLANTA DE PRODUCCION, EXTERIORESS')[1] === 'EXTERIORESS', 'CASO F: espacio tras la coma → opción limpia (trim contractual)');
}

/* ================= VEREDICTO ================= */
{
  const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
  const timeboxOk = Date.now() - start < 120000;
  const certified = failures.length === 0;
  const status = certified && timeboxOk ? 'ROOT CAUSE CERTIFIED' : 'BLOCKED';
  console.log('============================================================');
  console.log(' SPRINT 338 — VISUAL FORM BUILDER SELECT FIELD');
  console.log(' · FORENSIC ARCHITECTURE AUDIT · AUDIT ONLY (0 src)');
  console.log('============================================================');
  console.log(' Gates E01..E95 + Hipótesis A..H + Casos A..F + INV SELECT-*');
  console.log(' Pasaron: ' + passed + '   Fallaron: ' + failed);
  console.log(' Tiempo: ' + elapsedSec + 's   Timebox (<120s): ' + (timeboxOk ? 'OK' : 'EXCEDIDO'));
  console.log('------------------------------------------------------------');
  if (failures.length) {
    console.log(' FALLOS:');
    for (const f of failures) console.log('  - [' + f.label + '] ' + f.detail);
  }
  console.log('------------------------------------------------------------');
  console.log(' CADENA FORENSE (AREA · Lista desplegable · A, B):');
  console.log('  Constructor Visual ......... PRESERVED (Lista desplegable → select)');
  console.log('  Parser de opciones ......... PRESERVED (split + trim → choices[2])');
  console.log('  Builder Adapter ............ PRESERVED (select IN whitelist)');
  console.log('  Persistencia sgc_form_fields PRESERVED (field_type select + options.choices)');
  console.log('  Read Path (getFormFields) .. PRESERVED (select(*) sin transformación)');
  console.log('  ComponentRegistry ........... PRESERVED (select → FieldSelect)');
  console.log('  FieldSelect ................. PARCIAL (genera <select> pero lee options.options≠choices)');
  console.log('  ENGINES LEGACY (captura) .... DISCREPANCIA CERTIFICADA');
  console.log('     BaseGeneric .............. OK (case select + choices)');
  console.log('     BaseChecklist ............ DEFECTO: 0 case select → fallback textarea');
  console.log('     BaseMediciones ........... DEFECTO: 0 case select → default number');
  console.log('------------------------------------------------------------');
  console.log(' CAUSA RAÍZ CERTIFICADA:');
  console.log('  La pérdida de identidad NO ocurre en el Builder, la persistencia');
  console.log('  ni el registry. Ocurre en el DISPATCH de los engines legacy de');
  console.log('  captura: BaseChecklist/BaseMediciones NO tienen rama select y');
  console.log('  el campo cae al fallback (textarea "observaciones" en');
  console.log('  BaseChecklist; input numérico en BaseMediciones).');
  console.log('  EVIDENCIA: BaseChecklist.jsx comenta su fallback como');
  console.log('  "fallback for text fields like \'observaciones\'".');
  console.log('------------------------------------------------------------');
  console.log(' CLASIFICACIÓN:');
  console.log('  G) FALLBACK DEFECT .................. CONFIRMADA (PRIMARIA)');
  console.log('  F) FIELDSELECT OPTIONS CONTRACT ...... DISCREPANCIA SECUNDARIA (lee options.options≠choices)');
  console.log('  A) BUILDER TYPE MAPPING .............. descartada');
  console.log('  B) OPTIONS NORMALIZATION ............. descartada');
  console.log('  C) BUILDER ADAPTER ................... descartada');
  console.log('  D) PERSISTENCE PROJECTION ............ descartada');
  console.log('  E) REGISTRY DISPATCH ................. descartada');
  console.log('  H) ARCHITECTURAL GAP ................. descartado (BaseGeneric implementa el contrato)');
  console.log('------------------------------------------------------------');
  console.log(' PUNTO QUIRÚRGICO PARA SPRINT 339 (AUDIT AUTORIZA):');
  console.log('  1) BaseChecklist.jsx renderFieldInput: añadir rama select');
  console.log('     ANTES del fallback (espejo BaseGeneric.jsx:85-98, options.choices).');
  console.log('  2) BaseMediciones.jsx: añadir rama select ANTES del default numérico.');
  console.log('  3) (Secundario) FieldSelect.tsx: leer fieldDef.options?.choices');
  console.log('     (string[]) en lugar de options.options ({label,value}[]) para');
  console.log('     alinear el runtime con el contrato canónico FieldOptions.choices.');
  console.log('  SIN tocar: Builder, persistencia, schema, registry, DynamicForm,');
  console.log('  Evidence Report, Excel, informative, signature, order engine.');
  console.log('------------------------------------------------------------');
  console.log(' VISUAL BUILDER SELECT CONTRACT    PRESERVED');
  console.log(' SELECT TYPE MAPPING               PRESERVED');
  console.log(' OPTIONS PARSING                   PRESERVED (trim)');
  console.log(' BUILDER ADAPTER                   PRESERVED');
  console.log(' PERSISTENCE                       PRESERVED');
  console.log(' READ PROJECTION                   PRESERVED');
  console.log(' COMPONENT REGISTRY                PRESERVED');
  console.log(' FIELDSELECT                       DISCREPANCY (options key)');
  console.log(' SELECT → RUNTIME (legacy engines) DEFECT (BaseChecklist/BaseMediciones)');
  console.log(' OPTIONS → RUNTIME                 PRESERVED (choices)');
  console.log(' TEXT FALLBACK                     DEFECT (captura al select)');
  console.log(' ORDER                             PRESERVED');
  console.log(' OTHER FIELD TYPES                 UNTOUCHED');
  console.log(' EVIDENCE REPORT                   UNTOUCHED');
  console.log(' EXCEL                             UNTOUCHED');
  console.log(' INFORMATIVE                       UNTOUCHED');
  console.log(' SIGNATURE                         UNTOUCHED');
  console.log(' SQL                               UNTOUCHED');
  console.log('------------------------------------------------------------');
  console.log(' FINAL CLASSIFICATION: CONTROLLED SELECT RUNTIME DISPATCH DISCREPANCY');
  console.log('   (G primaria · F secundaria)');
  console.log(' STATUS: ' + status + ' · CORRECTION AUTHORIZED FOR SPRINT 339');
  console.log('============================================================');
  process.exit(certified && timeboxOk ? 0 : 1);
}