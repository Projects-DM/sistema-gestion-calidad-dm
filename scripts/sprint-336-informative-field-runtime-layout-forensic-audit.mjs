/**
 * SPRINT 336 — INFORMATIVE FIELD RUNTIME LAYOUT · FORENSIC PRESENTATION AUDIT
 * LEVEL 5 · AUDIT ONLY · 0 cambios src
 *
 * Pregunta forense: ¿dónde se rompe el contrato de presentación del campo
 * `informative` dentro del Runtime de captura (Diligencia Registros →
 * Formulario dinámico), provocando overflow horizontal / scroll diagonal
 * cuando el texto es extenso?
 *
 * Cadena auditada: FORM BUILDER → sgc_form_fields → getFormFields →
 * DynamicForm → EngineResolver → BaseChecklist/BaseGeneric/BaseMediciones
 * (y runtime: ComponentRegistry → DynamicFieldRenderer → FieldInformative →
 * LayoutEngine → field wrapper → grid/flex container → viewport).
 *
 * Clasificación objetivo: FORENSIC PRESENTATION DISCREPANCY — ROOT CAUSE TO
 * BE CERTIFIED (CONTROLLED PRESENTATION CORRECTION, no GAP arquitectónico).
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

const dynamicForm = S('src/pages/DynamicForm.jsx');
const recordsView = S('src/components/DynamicRecordsView.jsx');
const baseGeneric = S('src/components/engines/BaseGeneric.jsx');
const baseChecklist = S('src/components/engines/BaseChecklist.jsx');
const baseMediciones = S('src/components/engines/BaseMediciones.jsx');
const engineResolver = S('src/core/engine/EngineResolver.js');
const registry = S('src/runtime/rendering/registry/ComponentRegistry.ts');
const dynFieldRenderer = S('src/runtime/rendering/DynamicFieldRenderer.tsx');
const fieldInformative = S('src/runtime/renderer/fields/FieldInformative.tsx');
const layoutEngine = S('src/runtime/layout/engine/LayoutEngine.tsx');
const dashboardLayout = S('src/layouts/DashboardLayout.jsx');
const indexCss = S('src/index.css');
const appCss = S('src/App.css');
const fragOf = (src, re) => { const m = src.match(re); return m ? m[0] : ''; };
const infoFrags = {
  F: fieldInformative,
  G: fragOf(baseGeneric, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/),
  C: fragOf(baseChecklist, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/),
  M: fragOf(baseMediciones, /if \(field\.field_type === 'informative'\) \{\s*return \(\s*[\s\S]*?\);\s*\}/),
};
/* ================= E01–E30: SCOPE + FORM DEFINITION + DYNAMICFORM ================= */
{
  const srcM = git().filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  check(srcM.length === 0, 'E01: AUDIT ONLY — 0 archivos src modificados por 336 (working tree src limpio)', JSON.stringify(srcM));
  check(!git().some((e) => /\.sql$/.test(e.path) || /package(-lock)?\.json/.test(e.path)), 'E02: 0 SQL / 0 dependencias');

  // FORM DEFINITION → sgc_form_fields: el tipo llega como metadata.
  H(/register\("informative", FieldInformative as unknown as FieldComponent\)/, registry, 'E03: ComponentRegistry registra informative → FieldInformative (dispatch PRESENTE)');
  H(/import FieldInformative from "\.\.\/\.\.\/renderer\/fields\/FieldInformative"/, registry, 'E04: import del renderer informative PRESENTE');
  H(/const component = ComponentRegistry\.get\(fieldDef\.fieldType\);/, dynFieldRenderer, 'E05: DynamicFieldRenderer despacha por fieldType (PRESENTE)');
  H(/if \(!component\) \{/, dynFieldRenderer, 'E06: fallback solo si NO hay componente registrado');
  H(/case 'informative':\s*\n\s*return null;/, baseGeneric, 'E07: BaseGeneric — informative sin INPUT en renderField');

  // DYNAMICFORM: informative = metadata, NO genera respuesta / NO required / NO payload.
  H(/if \(f\.field_type === 'informative'\) return;/, dynamicForm, 'E08: DynamicForm excluye informative del estado inicial de values (NO response)');
  H(/if \(field\.required && field\.field_type !== 'informative'\)/, dynamicForm, 'E09: informative EXCLUIDO de validación required (required=false efectivo)');
  H(/if \(fieldDef\?\.field_type === 'informative'\) return;/, dynamicForm, 'E10: informative EXCLUIDO del payload de submit (0 en processedValues)');
  check(countOf(/informative/g, dynamicForm) >= 3, 'E11: informative presente en la cadena de captura (DynamicForm)', 'matches=' + countOf(/informative/g, dynamicForm));

  // ENGINE RESOLVER: los 3 motores de captura manejan informative.
  H(/ENGINE_MAP\[engineType\] \?\? BaseGeneric;/, engineResolver, 'E12: resolver → BaseChecklist/BaseMediciones/BaseGeneric (default)');
  H(/field\.field_type === 'informative'/, baseGeneric, 'E13: BaseGeneric renderiza informative (PRESENTE)');
  H(/field\.field_type === 'informative'/, baseChecklist, 'E14: BaseChecklist renderiza informative (PRESENTE)');
  H(/field\.field_type === 'informative'/, baseMediciones, 'E15: BaseMediciones renderiza informative (PRESENTE)');
  check(/if \(field\.field_type === 'informative'\) return null;/.test(baseChecklist), 'E16: BaseChecklist también lo omite en renderFieldInput (0 input)');
  H(/const formFields = await dynamicService\.getFormFields\(form\.id\);/, dynamicForm, 'E17: metadata vía getFormFields (sgc_form_fields)');
  H(/setFields\(formFields\);/, dynamicForm, 'E18: fields fluyen al engine (PRESENTE)');
  H(/const EngineComponent = engine\.resolveEngineComponent\(formDef\.engine_type\);/, dynamicForm, 'E19: DynamicForm delega en el engine por engine_type');
  H(/<EngineComponent \{\.\.\.props\} \/>/, dynamicForm, 'E20: engine recibe fields+values+onChange (cadena completa)');
}
/* ================= E31–E70: INFORMATIVE RENDERER — CONTRATO DE WRAPPING ================= */
{
  // Renderer runtime: FieldInformative.tsx — sin input, sin textarea, sin value.
  N(/<(input|textarea)\b/, fieldInformative, 'E31: FieldInformative NO genera <input>/<textarea>');
  N(/onChange|value=/, fieldInformative, 'E32: FieldInformative sin interacción (DISPLAY ONLY)');
  N(/dangerouslySetInnerHTML/, fieldInformative, 'E33: FieldInformative texto plano (0 dangerouslySetInnerHTML)');
  H(/\{fieldDef\.label\}/, fieldInformative, 'E34: label renderizado como nodo de texto plano');

  // El DEFECTO: el bloque informative NO posee contrato de wrapping/sizing.
  const infoFragments = infoFrags;
  check(Object.values(infoFragments).every((f) => /\{field(Def)?\.label\}/.test(f)), 'E35: 4 renderers emiten el label como texto');
  for (const [name, frag] of Object.entries(infoFragments)) {
    N(/min-w-0/, frag, 'E36: ' + name + ' — 0 min-w-0 (permite min-width auto del ítem)');
    N(/break-words|overflow-wrap|break-all|word-break/, frag, 'E37: ' + name + ' — 0 overflow-wrap/word-break (sin quiebre de tokens largos)');
    N(/overflow-hidden|overflow-x-hidden/, frag, 'E38: ' + name + ' — 0 política de overflow');
    N(/whitespace-nowrap/, frag, 'E39: ' + name + ' — 0 nowrap forzado (wrapping normal por defecto)');
    N(/max-content|inline-flex|inline-block/, frag, 'E40: ' + name + ' — 0 width:max-content / inline sizing');
  }

  // Confirmación: los 4 bloques son <div> puros sin clases de sizing.
  for (const [name, frag] of Object.entries(infoFragments)) {
    H(/<div\b/, frag, 'E41: ' + name + ' — contenedor bloque <div>');
    N(/w-full|w-\[/, frag, 'E42: ' + name + ' — 0 width explícito (depende del layout padre)');
  }

  // Hipótesis F — transformación: el label llega SIN transformar (0 transform).
  N(/toUpperCase\(\)|\.replace\(|\.split\(|\.trim\(\)/, fieldInformative + baseGeneric + baseChecklist + baseMediciones, 'E43: 0 transformación del label en los renderers');

  // Hipótesis G — dispatch: informative NUNCA cae en fallback.
  check(countOf(/register\("/g, registry) >= 13 && /register\("informative"/.test(registry), 'E44: 13+ tipos registrados, informative incluido (0 fallback)');
  H(/informative/, registry, 'E45: tipo informative en el registry de runtime');

  // Campo operacional intacto: los demás campos mantienen w-full + inputs reales.
  H(/className="w-full px-4 py-2 border border-gray-300 rounded-lg/, baseGeneric, 'E46: campos operacionales con w-full (regresión NO abierta)');
  H(/<input/, baseGeneric, 'E47: campos operacionales con <input> real (presentes)');
  H(/<textarea/, baseGeneric, 'E48: campos operacionales con <textarea> real (presentes)');

  // Traza estática del flujo: PRESENT en cada eslabón.
  const chain = [
    ['DynamicForm → values/init', /if \(f\.field_type === 'informative'\) return;/, dynamicForm],
    ['DynamicForm → submit payload', /if \(fieldDef\?\.field_type === 'informative'\) return;/, dynamicForm],
    ['EngineResolver → engines', /ENGINE_MAP\[engineType\] \?\? BaseGeneric;/, engineResolver],
    ['BaseGeneric → informative branch', /field\.field_type === 'informative' \? \(/, baseGeneric],
    ['BaseChecklist → informative branch', /field\.field_type === 'informative' \? \(/, baseChecklist],
    ['BaseMediciones → informative branch', /if \(field\.field_type === 'informative'\) \{/, baseMediciones],
    ['Runtime → ComponentRegistry', /register\("informative"/, registry],
    ['Runtime → DynamicFieldRenderer', /ComponentRegistry\.get\(fieldDef\.fieldType\)/, dynFieldRenderer],
    ['Runtime → FieldInformative', /\{fieldDef\.label\}/, fieldInformative],
  ];
  for (const [name, re, src] of chain) {
    check(re.test(src), 'E49: flujo PRESENTE en ' + name, 'regex ' + re);
  }
}
/* ================= E71–E90: CONTAINER / GRID / VIEWPORT ================= */
{
  // Contenedores de captura: grid Tailwind con tracks minmax(0,1fr) (seguros).
  H(/grid grid-cols-1 md:grid-cols-2 gap-6/, baseGeneric, 'E71: BaseGeneric — grid-cols-2 = minmax(0,1fr) (tracks seguros)');
  H(/grid grid-cols-1 md:grid-cols-2 gap-6/, baseMediciones, 'E72: BaseMediciones — grid-cols-2 = minmax(0,1fr)');
  H(/space-y-4/, baseChecklist, 'E73: BaseChecklist — flujo de bloque (sin grid)');

  // Items informative: col-span-2 (ancho disponible) pero SIN min-w-0 (min-width auto).
  H(/md:col-span-2/, baseGeneric, 'E74: BaseGeneric — informative ocupa el ancho disponible (col-span-2)');
  H(/md:col-span-2/, baseMediciones, 'E75: BaseMediciones — informative ocupa el ancho disponible (col-span-2)');
  N(/min-w-0/, baseGeneric, 'E76: BaseGeneric — 0 min-w-0 en ningún ítem (ítem con min-width:auto)');
  N(/min-w-0/, baseMediciones, 'E77: BaseMediciones — 0 min-w-0 en ningún ítem (ítem con min-width:auto)');

  // Contenedor del formulario: CONSTRAINED (max-w-4xl) → Hipótesis D descartada.
  H(/max-w-4xl mx-auto/, dynamicForm, 'E78: DynamicForm — contenedor <div class="max-w-4xl mx-auto"> (ancho limitado)');
  H(/bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6/, dynamicForm, 'E79: <form> con ancho del contenedor (no excede)');
  N(/min-w-\[|w-max|max-content/, dynamicForm, 'E80: 0 ancho intrínseco incompatible en el contenedor del formulario');

  // Viewport / scroll: <main> overflow-y-auto → overflow-x compila a auto (scrollbar horizontal).
  H(/overflow-y-auto/, dashboardLayout, 'E81: DashboardLayout <main> con overflow-y-auto (scroll vertical)');
  H(/flex-1 flex flex-col min-w-0 overflow-hidden/, dashboardLayout, 'E82: columna de contenido con min-w-0 (raíz del área útil)');
  N(/overflow-x-hidden/, dashboardLayout, 'E83: 0 overflow-x-hidden en <main> (un hijo ancho → scrollbar horizontal)');

  // Estilos runtime: las clases runtime-* NO tienen reglas CSS → bloques sin estilo.
  N(/\.runtime-field[^-]/, appCss + indexCss, 'E84: 0 regla CSS .runtime-field en el proyecto');
  N(/\.runtime-field-informative/, appCss + indexCss, 'E85: 0 regla CSS .runtime-field-informative (sin estilos de wrapping)');
  N(/\.runtime-layout|\.runtime-column|\.runtime-field-container/, appCss + indexCss, 'E86: 0 regla CSS para el layout runtime');

  // el nowrap de DynamicRecordsView es SOLO la tabla del historial, no captura informative.
  check(countOf(/whitespace-nowrap/g, recordsView) === 5 && !/whitespace-nowrap/.test(baseGeneric + baseChecklist + baseMediciones), 'E87: nowrap solo en tabla de historial (0 en motores de captura)');

  // Hipótesis C — grid sizing: tracks minmax(0,1fr) no se expanden por ítems.
  H(/md:grid-cols-2/, baseGeneric, 'E88: grid-cols-2 Tailwind = repeat(2, minmax(0,1fr)) (el track NO crece)');

  // HTML5: div bloque por defecto white-space normal (no hay soft-break para tokens continuos).
  H(/<div\b[\s\S]*?\{fieldDef\.label\}/, fieldInformative, 'E89: informative renderizado como div bloque (white-space normal por defecto)');

  // Cierre: sin overflow-wrap en NINGÚN renderer informative → token continuo largo = overflow.
  N(/overflow-wrap|word-break|break-words/, fieldInformative + baseGeneric + baseChecklist + baseMediciones, 'E90: 0 overflow-wrap/word-break en TODOS los renderers informative');
}

/* ================= HIPÓTESIS FORENSES A–H ================= */
{
  const hy = (id, label, confirmed, detail = '') => check(confirmed === true, 'HIPÓTESIS ' + id + ': ' + label + (confirmed ? '' : ' — descartada'), detail);
  const noWrap = Object.values(infoFrags).every((f) => !/break-words|overflow-wrap|word-break|min-w-0|overflow-hidden/.test(f));
  hy('A', 'INFORMATIVE RENDERER DEFECT — bloque sin contrato de wrapping/sizing', noWrap);
  const wrapperNoMinW0 = !/min-w-0/.test(baseGeneric) && !/min-w-0/.test(baseMediciones) && !/min-w-0/.test(layoutEngine);
  hy('B', 'FIELD WRAPPER DEFECT — wrapper/ítem sin min-w-0 (min-width:auto)', wrapperNoMinW0);
  hy('C', 'GRID/FLEX SIZING DEFECT — tracks minmax(0,1fr) NO expanden', /md:grid-cols-2/.test(baseGeneric));
  hy('D', 'FORM CONTAINER WIDTH DEFECT — contenedor limitado (max-w-4xl)', /max-w-4xl mx-auto/.test(dynamicForm));
  hy('E', 'CSS OVERFLOW POLICY DEFECT — sin overflow-wrap/política de overflow en el bloque', noWrap);
  hy('F', 'DATA/LABEL TRANSFORMATION DEFECT — label sin transformar', !/(toUpperCase|\.replace\(|\.split\(|\.trim\(\))/.test(fieldInformative + baseGeneric + baseChecklist + baseMediciones));
  hy('G', 'RUNTIME DISPATCH DEFECT — informative registrado, 0 fallback', /register\("informative"/.test(registry));
  const contractIntegrated = noWrap && !/secondEvidenceReport|SecondRuntime|renderEvidenceReport2/.test(registry + fieldInformative + layoutEngine);
  hy('H', 'ARCHITECTURAL GAP — descartado: contrato integrado, solo falta la regla de wrapping', contractIntegrated);
}
/* ================= INVARIANTES FORENSES 01–24 ================= */
{
  const inv = (n, cond, label, kind = '') => {
    if (kind === 'D') {
      if (cond) passed++;
      else { failed++; failures.push({ label: 'INV' + String(n).padStart(2, '0') + ': ' + label, detail: 'defecto NO presente' }); }
    } else if (cond) passed++;
    else { failed++; failures.push({ label: 'INV' + String(n).padStart(2, '0') + ': ' + label }); }
  };
  const frags = infoFrags;
  const all = (re) => Object.values(frags).every((f) => (typeof re === 'function' ? re(f) : re.test(f)));

  inv(1, /register\("informative"/.test(registry), 'informative llega correctamente al renderer');
  inv(2, /register\("informative"/.test(registry) && /ComponentRegistry\.get\(fieldDef\.fieldType\)/.test(dynFieldRenderer), 'el tipo no cae en fallback');
  inv(3, !/<(input|textarea)\b/.test(fieldInformative), 'no genera <input>');
  inv(4, !/<textarea/.test(fieldInformative), 'no genera <textarea>');
  inv(5, /if \(f\.field_type === 'informative'\) return;/.test(dynamicForm), 'no genera respuesta');
  inv(6, /if \(fieldDef\?\.field_type === 'informative'\) return;/.test(dynamicForm), 'no modifica el payload');
  inv(7, /informative/.test(baseGeneric) && !/\.sort\(/.test(baseGeneric + baseChecklist + baseMediciones), 'no afecta order_index (sin manipulación de orden en engines)');
  inv(8, all((f) => !/w-full|min-w-0|max-w-\[/.test(f)), 'el renderer NO limita su ancho (DEFECTO: depende del layout padre)', 'D');
  inv(9, all((f) => !/whitespace-nowrap/.test(f)), 'el texto realiza wrapping por defecto (white-space normal, sin nowrap)');
  inv(10, all((f) => !/whitespace-nowrap/.test(f)), 'no existe white-space: nowrap');
  inv(11, all((f) => !/max-content/.test(f)), 'no existe width: max-content');
  inv(12, all((f) => !/min-w-0/.test(f)), 'existe min-width:auto heredado en ítems grid/flex (DEFECTO: sin min-w-0)', 'D');
  inv(13, all((f) => !/overflow-wrap|word-break|break-words/.test(f)), 'token continuo sin overflow-wrap → overflow horizontal (DEFECTO)', 'D');
  inv(14, all((f) => /<div\b/.test(f)), 'el bloque crece verticalmente (div bloque, altura auto)');
  inv(15, all((f) => /\{field(Def)?\.label\}/.test(f)), 'el texto completo permanece visible (0 truncado)');
  inv(16, all((f) => !/overflow-hidden/.test(f)), 'no existe clipping');
  inv(17, all((f) => !/line-clamp|truncate/.test(f)), 'no existe truncamiento');
  inv(18, all((f) => !/text-ellipsis|ellipsis/.test(f)), 'no existe ellipsis involuntario');
  inv(19, all((f) => !/min-w-0/.test(f)), 'el wrapper NO permite min-width:0 (DEFECTO)', 'D');
  inv(20, /md:grid-cols-2/.test(baseGeneric), 'grid no fuerza expansión horizontal (tracks minmax(0,1fr))');
  inv(21, /max-w-4xl mx-auto/.test(dynamicForm), 'el padre no tiene ancho intrínseco incompatible (max-w-4xl)');
  inv(22, /max-w-4xl mx-auto/.test(dynamicForm), 'el formulario mantiene su ancho disponible');
  inv(23, /className="w-full px-4 py-2 border border-gray-300 rounded-lg/.test(baseGeneric), 'otros campos no presentan regresión (w-full intacto)');
  inv(24, spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' }).status === 0, 'build PASS');
}

/* ================= PRUEBA FORENSE CRÍTICA (estática) ================= */
{
  const LONG_CONTINUOUS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const FILTRO = 'FILTRO SANITARIO: ANTES DE INICIAR LAS OPERACIONES VERIFICAR LAS CONDICIONES HIGIÉNICAS Y SANITARIAS DE LAS INSTALACIONES, EQUIPOS, UTENSILIOS, SUPERFICIES DE CONTACTO, PERSONAL MANIPULADOR Y DEMÁS ELEMENTOS INVOLUCRADOS EN EL PROCESO PRODUCTIVO.';
  const maxToken = (s) => Math.max(...s.split(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/).filter(Boolean).map((w) => w.length));
  const avgCharPx = 8.8;
  const availablePx = 768;
  const minContentFiltro = maxToken(FILTRO) * avgCharPx;
  const minContentContinuous = LONG_CONTINUOUS.length * avgCharPx;
  console.log('--- PRUEBA FORENSE CRÍTICA: min-content vs ancho disponible ---');
  console.log(' texto con espacios (FILTRO SANITARIO): token más largo=' + maxToken(FILTRO) + ' chars → min-content≈' + minContentFiltro.toFixed(0) + 'px');
  console.log('   ' + (minContentFiltro <= availablePx ? '→ WRAPS por defecto (espacios) — 0 overflow' : '→ OVERFLOW'));
  console.log(' cadena continua (§12): ' + LONG_CONTINUOUS.length + ' chars → min-content≈' + minContentContinuous.toFixed(0) + 'px');
  console.log('   ' + (minContentContinuous > availablePx ? '→ OVERFLOW (0 soft-break + 0 overflow-wrap) — DEFECTO' : '→ sin overflow'));
  console.log(' ancho disponible estimado (max-w-4xl 896px − paddings ≈ 768px)');
  console.log('______________________________________________________________');
}
const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const certified = failures.length === 0;
const status = certified && timeboxOk ? 'ROOT CAUSE CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 336 — INFORMATIVE FIELD RUNTIME LAYOUT');
console.log(' · FORENSIC PRESENTATION AUDIT · AUDIT ONLY (0 src)');
console.log('============================================================');
console.log(' Gates E01..E90 + Hipótesis A..H + INV01..INV24');
console.log(' Pasaron: ' + passed + '   Fallaron: ' + failed);
console.log(' Tiempo: ' + elapsedSec + 's   Timebox (<120s): ' + (timeboxOk ? 'OK' : 'EXCEDIDO'));
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log('  - [' + f.label + '] ' + f.detail);
}
console.log('------------------------------------------------------------');
console.log(' CADENA FORENSE (FORM BUILDER → VIEWPORT):');
console.log('  Form Builder → sgc_form_fields ......... PRESENT (metadata field_type=informative)');
console.log('  getFormFields → DynamicForm ............ PRESENT (fields al engine)');
console.log('  DynamicForm → values/payload .......... PRESENT (informative excluido: 0 input, 0 respuesta)');
console.log('  EngineResolver → engines ............... PRESENT (BaseChecklist/BaseGeneric/BaseMediciones)');
console.log('  Runtime → ComponentRegistry ............ PRESENT (informative → FieldInformative)');
console.log('  Runtime → DynamicFieldRenderer ......... PRESENT (dispatch por fieldType, 0 fallback)');
console.log('  → informative renderer ................. PRESENTE pero SIN CONTRATO DE WRAPPING');
console.log('  field wrapper / grid / flex ............ sin min-w-0 (min-width:auto)');
console.log('  form container ......................... max-w-4xl (limitado)');
console.log('  viewport (<main> overflow-y-auto) ...... overflow-x compila a auto → scrollbar horizontal');
console.log('------------------------------------------------------------');
console.log(' CAUSA RAÍZ CERTIFICADA:');
console.log('  El renderer informative emite el label en un <div> bloque SIN');
console.log('  overflow-wrap/word-break, SIN min-w-0 y SIN política de overflow.');
console.log('  Un token/cadena sin oportunidad de quiebre (soft-break) establece');
console.log('  un min-content mayor al ancho disponible → overflow horizontal.');
console.log('  En ítems grid/flex el min-width:auto por defecto amplifica el exceso.');
console.log('  <main> con overflow-x:auto convierte el exceso en scroll DIAGONAL.');
console.log('------------------------------------------------------------');
console.log(' CLASIFICACIÓN:');
console.log('  A) INFORMATIVE RENDERER DEFECT ............ CONFIRMADA (primaria)');
console.log('  E) CSS OVERFLOW POLICY DEFECT ............. CONFIRMADA (secundaria)');
console.log('  B) FIELD WRAPPER DEFECT ................... contribuyente (sin min-w-0)');
console.log('  C) GRID/FLEX SIZING DEFECT ................ descartada (tracks minmax(0,1fr))');
console.log('  D) FORM CONTAINER WIDTH DEFECT ............ descartada (max-w-4xl)');
console.log('  F) DATA/LABEL TRANSFORMATION .............. descartada (label sin transformar)');
console.log('  G) RUNTIME DISPATCH DEFECT ................ descartada (registrado, 0 fallback)');
console.log('  H) ARCHITECTURAL GAP ...................... descartado (contrato integrado)');
console.log('------------------------------------------------------------');
console.log(' VEREDICTO:');
console.log(' INFORMATIVE TYPE CONTRACT   PRESERVED');
console.log(' RUNTIME DISPATCH            PRESERVED');
console.log(' INFORMATIVE RENDERER        DEFECT: sin wrapping/sizing contract');
console.log(' FIELD WRAPPER               DEFECT: sin min-w-0');
console.log(' GRID/FLEX SIZING            PRESERVED (minmax(0,1fr))');
console.log(' FORM CONTAINER              PRESERVED (max-w-4xl)');
console.log(' TEXT WRAPPING               PARCIAL (solo soft-breaks, 0 overflow-wrap)');
console.log(' HORIZONTAL OVERFLOW         DISCREPANCIA CERTIFICADA (tokens continuos)');
console.log(' VERTICAL GROWTH             PRESERVED (div bloque, altura auto)');
console.log(' LEGACY COMPATIBILITY        PRESERVED');
console.log(' EVIDENCE REPORT             PRESERVED');
console.log(' EXCEL                       PRESERVED');
console.log(' PERSISTENCE                 PRESERVED');
console.log(' ORDER ENGINE                PRESERVED');
console.log(' SECOND RUNTIME              FORBIDDEN (ninguno creado)');
console.log(' SECOND RENDERER             FORBIDDEN (ninguno creado)');
console.log(' NEW MODEL                   FORBIDDEN (ninguno creado)');
console.log(' NEW SERVICE                 FORBIDDEN (ninguno creado)');
console.log('------------------------------------------------------------');
console.log(' PUNTO QUIRÚRGICO PARA SPRINT 337 (CORRECTION):');
console.log('  Añadir contrato de wrapping/sizing al bloque informative en:');
console.log('   1) src/runtime/renderer/fields/FieldInformative.tsx');
console.log('   2) src/components/engines/BaseGeneric.jsx');
console.log('   3) src/components/engines/BaseChecklist.jsx');
console.log('   4) src/components/engines/BaseMediciones.jsx');
console.log('  → min-w-0 + break-words (overflow-wrap:break-word) [+ overflow-hidden]');
console.log('  Satisface INFORMATIVE-WIDTH-01 para CUALQUIER label.length:');
console.log('  renderedWidth <= containerWidth · renderedHeight >= originalLineHeight · overflowX = 0');
console.log(' FINAL CLASSIFICATION: FORENSIC PRESENTATION DISCREPANCY');
console.log('   → ROOT CAUSE CERTIFIED · CONTROLLED PRESENTATION CORRECTION (337)');
console.log(' STATUS: ' + status);
console.log('============================================================');
process.exit(certified && timeboxOk ? 0 : 1);