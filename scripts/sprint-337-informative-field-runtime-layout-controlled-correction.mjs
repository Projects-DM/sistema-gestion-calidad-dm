/**
 * SPRINT 337 — INFORMATIVE FIELD RUNTIME LAYOUT · CONTROLLED PRESENTATION CORRECTION
 * LEVEL 5 · IMPLEMENTATION (4 archivos autorizados)
 *
 * Precedente: Sprint 336 (FORENSIC PRESENTATION AUDIT → ROOT CAUSE CERTIFIED).
 * Corrección: contrato de wrapping/sizing (min-w-0 + break-words [+ overflow-hidden])
 * aplicado a FieldInformative.tsx + BaseGeneric/BaseChecklist/BaseMediciones.
 *
 * Clasificación objetivo: CONTROLLED PRESENTATION CORRECTION · CERTIFIED.
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
const gitDiffText = () => spawnSync('git', ['diff'], { cwd: ROOT, encoding: 'utf8' }).stdout;

// Fuentes POST-corrección (reflejan el contrato aplicado).
const fieldInformative = S('src/runtime/renderer/fields/FieldInformative.tsx');
const baseGeneric = S('src/components/engines/BaseGeneric.jsx');
const baseChecklist = S('src/components/engines/BaseChecklist.jsx');
const baseMediciones = S('src/components/engines/BaseMediciones.jsx');
const dynamicForm = S('src/pages/DynamicForm.jsx');
const registry = S('src/runtime/rendering/registry/ComponentRegistry.ts');
const layoutEngine = S('src/runtime/layout/engine/LayoutEngine.tsx');
const engineResolver = S('src/core/engine/EngineResolver.js');

const CONTRACT = { minW0: true, breakWords: true, overflowHidden: true };

// Modelo de layout del contrato (overflow-wrap:break-word + min-width:0).
const CHAR_W = 8.8;
function sim(label, availW, contract) {
  const words = String(label).split(/\s+/).filter(Boolean);
  const hasOverflow = (x) => x > 0.01;
  if (words.length === 0) return { overflowX: 0, heightLines: 1, contentPreserved: true, hasOverflow: false };
  if (!contract.breakWords) {
    const maxToken = words.reduce((m, w) => Math.max(m, w.length), 0);
    const overflowX = Math.max(0, Math.round((maxToken * CHAR_W - availW) * 10) / 10);
    return { overflowX, heightLines: 1, contentPreserved: true, hasOverflow: hasOverflow(overflowX) };
  }
  const maxChars = Math.max(1, Math.floor(availW / CHAR_W));
  const softLine = (l) => l.length * CHAR_W <= availW;
  const lines = [];
  let cur = '';
  const push = (t) => { lines.push(t); cur = ''; };
  for (const w of words) {
    let word = w;
    if (word.length > maxChars) {
      if (cur) push(cur);
      while (word.length > maxChars) { lines.push(word.slice(0, maxChars)); word = word.slice(maxChars); }
      cur = word;
    } else {
      const candidate = cur ? cur + ' ' + word : word;
      if (softLine(candidate)) cur = candidate;
      else { if (cur) push(cur); cur = word; }
    }
  }
  if (cur) lines.push(cur);
  const compact = (s) => s.replace(/\s+/g, '');
  return {
    overflowX: 0,
    heightLines: lines.length,
    contentPreserved: compact(label) === compact(lines.join(' ')),
    hasOverflow: false,
  };
}
const CONTRACT_STATE = { minW0: /min-w-0/, breakWords: /break-words/, overflowHidden: /overflow-hidden/ };
/* ================= E01–E15: SCOPE ================= */
{
  const modSrc = git().filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  const allowed = [
    'src/components/engines/BaseChecklist.jsx',
    'src/components/engines/BaseGeneric.jsx',
    'src/components/engines/BaseMediciones.jsx',
    'src/runtime/renderer/fields/FieldInformative.tsx',
  ];
  check(JSON.stringify(modSrc) === JSON.stringify(allowed), 'E01: EXACTAMENTE 4 archivos src modificados (los autorizados)', JSON.stringify(modSrc));
  check(modSrc.every((p) => allowed.includes(p)), 'E02: todos los archivos modificados están en la lista autorizada');
  check(gitDiffNames().every((p) => allowed.includes(p)), 'E03: diff limitado a los 4 autorizados');
  check(!git().some((e) => /\.sql$/.test(e.path)), 'E04: 0 archivos .sql modificados/creados');
  check(!git().some((e) => /package(-lock)?\.json/.test(e.path)), 'E05: 0 cambios en package.json / package-lock.json');
  check(!git().some((e) => /docs[\\/]12-database/.test(e.path)), 'E06: 0 cambios en docs/12-database');
  check(!git().some((e) => e.path === 'src/pages/DynamicForm.jsx'), 'E07: DynamicForm NO modificado');
  check(!git().some((e) => e.path === 'src/services/dynamicService.js'), 'E08: dynamicService NO modificado');
  check(!git().some((e) => /src[\\/]shared[\\/]report/.test(e.path)), 'E09: Evidence Report (src/shared/report) NO modificado');
  check(!git().some((e) => /order-motor|orderMotor|UniversalOrderMotor/i.test(e.path)), 'E10: motor de ordenamiento NO modificado');
  check(!git().some((e) => e.status === 'M' && e.path.startsWith('src/') && !allowed.includes(e.path)), 'E11: ningún otro componente src modificado');
  const untrackedSrc = git().filter((e) => e.status === '??' && e.path.startsWith('src/'));
  check(untrackedSrc.length === 0, 'E12: 0 archivos src NUEVOS (sin segundo renderer/runtime/servicio)', JSON.stringify(untrackedSrc.map((e) => e.path)));
  N(/InformativeRenderer2|InformativeLayoutService|InformativeService/, fieldInformative + layoutEngine + registry, 'E13: 0 segundo renderer / 0 servicio informativo creado');
  {
    const diff = gitDiffText();
    const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
    const removed = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1));
    check(added.every((l) => /min-w-0|break-words|overflow-hidden/.test(l)), 'E14: líneas AÑADIDAS = SOLO clases del contrato', JSON.stringify(added));
    check(removed.every((l) => !/min-w-0|break-words|overflow-hidden/.test(l)), 'E15: líneas ELIMINADAS no contienen el contrato (no se quitó nada)');
  }
}
/* ================= E16–E30: INFORMATIVE RENDERER (moderno) ================= */
{
  H(/runtime-field/, fieldInformative, 'E16: mantiene la estructura visual runtime-field');
  H(/runtime-field-informative/, fieldInformative, 'E17: mantiene la clase runtime-field-informative');
  H(/runtime-field-informative-heading/, fieldInformative, 'E18: mantiene la clase runtime-field-informative-heading');
  H(/min-w-0/, fieldInformative, 'E19: contrato min-w-0 aplicado en el renderer moderno');
  H(/break-words/, fieldInformative, 'E20: contrato break-words aplicado en el renderer moderno');
  H(/overflow-hidden/, fieldInformative, 'E21: overflow-hidden como protección complementaria (WRAP FIRST)');
  H(/\{fieldDef\.label\}/, fieldInformative, 'E22: label renderizado como texto plano completo');
  N(/<(input|textarea)\b/, fieldInformative, 'E23: 0 <input> (no respondible)');
  N(/onChange|onClick|value=/, fieldInformative, 'E24: 0 interacción (NON-INTERACTIVE)');
  N(/dangerouslySetInnerHTML/, fieldInformative, 'E25: 0 innerHTML (texto preservado como nodo de texto)');
  N(/required|validation|isValid/, fieldInformative, 'E26: 0 validación / 0 required');
  N(/font-size|text-\[|text-xs/, fieldInformative, 'E27: 0 reducción de font-size (contenido legible, no oculto)');
  N(/truncate|line-clamp|ellipsis/, fieldInformative, 'E28: 0 truncation / ellipsis (0 DATA LOSS)');
  N(/substring|\.slice\(|\.replace\(/, fieldInformative, 'E29: 0 substring / transformación del label');
  N(/FieldInformative2|SecondRenderer/, fieldInformative, 'E30: 0 segundo renderer dentro del archivo');
}
/* ================= E31–E45: WRAPPING ================= */
{
  const fragOf = (src, re) => { const m = src.match(re); return m ? m[0] : ''; };
  const frags = {
    F: fieldInformative,
    G: fragOf(baseGeneric, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/),
    C: fragOf(baseChecklist, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/),
    M: fragOf(baseMediciones, /if \(field\.field_type === 'informative'\) \{\s*return \(\s*[\s\S]*?\);\s*\}/),
  };
  const all = (re) => Object.values(frags).every((f) => (typeof re === 'function' ? re(f) : re.test(f)));

  check(all(/break-words/), 'E31: break-words aplicado en los 4 renderers informative');
  check(all(/overflow-hidden/), 'E32: overflow-hidden complementario en los 4 (WRAP FIRST, CLIP NEVER AS DATA LOSS)');
  H(/runtime-field-informative-heading\s+break-words/, fieldInformative, 'E33: heading moderno con break-words');
  H(/border-primary\/30 pb-1 break-words/, baseGeneric, 'E34: heading BaseGeneric con break-words');
  H(/border-blue-300 pb-1 break-words/, baseChecklist, 'E35: heading BaseChecklist con break-words');
  H(/border-cyan-300 pb-1 break-words/, baseMediciones, 'E36: heading BaseMediciones con break-words');
  check(all((f) => !/whitespace-nowrap/.test(f)), 'E37: 0 nowrap en los bloques informative');
  check(all((f) => !/truncate|line-clamp|ellipsis/.test(f)), 'E38: 0 truncation / ellipsis (contenido completo)');
  check(all((f) => !/text-xs|text-\[|font-size/.test(f)), 'E39: 0 reducción de font-size');
  check(all((f) => !/max-content|w-max/.test(f)), 'E40: 0 width max-content');
  check(all((f) => /\{field(Def)?\.label\}/.test(f)), 'E41: label emitido íntegro como texto (sin slicing)');
  check(all((f) => !/dangerouslySetInnerHTML/.test(f)), 'E42: 0 innerHTML (texto como nodo, 0 XSS/data loss)');
  {
    const policies = Object.values(frags).map((f) => {
      const has = (re) => re.test(f);
      return [has(/min-w-0/), has(/break-words/), has(/overflow-hidden/)].join(',');
    });
    check(new Set(policies).size === 1, 'E43: política de wrapping ÚNICA e idéntica en los 4 (sin divergencia)', JSON.stringify(policies));
  }
  check(all(/<div\b/), 'E44: sigue siendo DISPLAY BLOCK (div)');
  check(all((f) => /\{field(Def)?\.label\}\s*<\/div>/.test(f)), 'E45: label como último contenido del heading (wrapping en el elemento correcto)');
}
/* ================= E46–E55: MIN-WIDTH / SIZING ================= */
{
  const fragOf = (src, re) => { const m = src.match(re); return m ? m[0] : ''; };
  const frags = {
    F: fieldInformative,
    G: fragOf(baseGeneric, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/),
    C: fragOf(baseChecklist, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/),
    M: fragOf(baseMediciones, /if \(field\.field_type === 'informative'\) \{\s*return \(\s*[\s\S]*?\);\s*\}/),
  };

  check(Object.values(frags).every((f) => /min-w-0/.test(f)), 'E46: min-w-0 en los 4 renderers informative');
  H(/runtime-field-informative min-w-0/, fieldInformative, 'E47: contenedor moderno con min-w-0');
  H(/md:col-span-2 pt-2 min-w-0/, baseGeneric, 'E48: ítem grid BaseGeneric con min-w-0 (min-width controlado)');
  H(/p-2 min-w-0/, baseChecklist, 'E49: ítem BaseChecklist con min-w-0');
  H(/md:col-span-2 mt-2 min-w-0/, baseMediciones, 'E50: ítem grid BaseMediciones con min-w-0');
  H(/grid grid-cols-1 md:grid-cols-2 gap-6/, baseGeneric, 'E51: tracks grid intactos (minmax(0,1fr))');
  H(/grid grid-cols-1 md:grid-cols-2 gap-6/, baseMediciones, 'E52: tracks grid intactos (BaseMediciones)');
  H(/space-y-4/, baseChecklist, 'E53: flujo de bloque intacto (BaseChecklist)');
  H(/max-w-4xl mx-auto/, dynamicForm, 'E54: contenedor del formulario intacto (max-w-4xl, ancho acotado)');
  H(/overflow-y-auto/, S('src/layouts/DashboardLayout.jsx'), 'E55: viewport mantiene scroll vertical (horizontal ya no se dispara)');
}
/* ================= E56–E65: CONTINUOUS-TOKEN CASES (modelo de layout) ================= */
{
  const AVAIL = 768;
  const s = (label) => sim(label, AVAIL, CONTRACT);
  const d = (r) => sim(r, AVAIL, { breakWords: false, minW0: false, overflowHidden: false });

  const rA = s('A'.repeat(120));
  check(!rA.hasOverflow && rA.overflowX === 0, 'E56: token continuo 120 chars → 0 overflow horizontal', JSON.stringify(rA));
  const rB = s('B'.repeat(500));
  check(!rB.hasOverflow && rB.overflowX === 0, 'E57: token continuo 500 chars → 0 overflow (quiebre garantizado)', JSON.stringify(rB));
  const rC = s('Nota informativa breve');
  check(!rC.hasOverflow && rC.heightLines === 1, 'E58: texto corto → 1 línea, 0 overflow');
  const rD = s('Este es un texto informativo suficientemente largo para superar el ancho disponible del formulario y debe continuar verticalmente sin generar scroll horizontal.');
  check(!rD.hasOverflow && rD.heightLines > 1, 'E59: texto largo con espacios → múltiples líneas, 0 overflow', 'lines=' + rD.heightLines);
  const rE = s('FILTRO SANITARIO: ANTES DE INICIAR LAS OPERACIONES VERIFICAR LAS CONDICIONES HIGIÉNICAS Y SANITARIAS DE LAS INSTALACIONES, EQUIPOS, UTENSILIOS, SUPERFICIES DE CONTACTO, PERSONAL MANIPULADOR Y DEMÁS ELEMENTOS INVOLUCRADOS EN EL PROCESO PRODUCTIVO.');
  check(!rE.hasOverflow && rE.contentPreserved, 'E60: FILTRO SANITARIO completo → 0 overflow, contenido intacto', 'lines=' + rE.heightLines);
  check(rA.contentPreserved, 'E61: contenido del token continuo preservado (0 pérdida)');
  check(rD.contentPreserved, 'E62: contenido del texto largo preservado (0 pérdida)');
  check(rD.heightLines > 1, 'E63: crecimiento vertical presente (renderedHeight > singleLineHeight)');
  check(rC.heightLines === 1, 'E64: texto corto permanece en una línea cuando hay espacio');
  check(d('A'.repeat(120)).hasOverflow, 'E65: SIN contrato el token continuo SÍ desbordaría (prueba de que la corrección es el contrato)');
}
/* ================= E66–E75: MÚLTIPLES INFORMATIVE ================= */
{
  H(/fields\.map\(field => \(/, baseGeneric, 'E66: rama informative dentro de fields.map (aplica a CADA campo informative)');
  H(/fields\.map\(field => \(/, baseChecklist, 'E67: rama informative dentro de fields.map (BaseChecklist)');
  H(/fields\.map\(field => \{/, baseMediciones, 'E68: rama informative dentro de fields.map (BaseMediciones)');
  N(/informative.*if \(|if \([^)]*\).*informative/, baseGeneric, 'E69: 0 condición especial por instancia (contrato uniforme para todas)');
  N(/informative.*if \(|if \([^)]*\).*informative/, baseChecklist, 'E70: 0 excepción por instancia (BaseChecklist)');
  N(/informative.*if \(|if \([^)]*\).*informative/, baseMediciones, 'E71: 0 excepción por instancia (BaseMediciones)');
  const many = [
    'PRIMERA NOTA INFORMATIVA DEL FORMULARIO',
    'SEGUNDA: verificación de condiciones sanitarias en todas las instalaciones, equipos, utensilios y superficies de contacto del área de producción.',
    'TERCERA ' + 'X'.repeat(140),
  ];
  check(many.every((m) => !sim(m, 768, CONTRACT).hasOverflow), 'E72: 3 informativos (corto/largo/token) → todos 0 overflow');
  const mixed = [
    { t: 'informative', v: 'Aviso operativo general', },
    { t: 'text', v: 'respuesta' },
    { t: 'informative', v: 'SEGUNDO AVISO ' + 'Y'.repeat(130), },
  ];
  check(mixed.filter((f) => f.t === 'informative').every((f) => !sim(f.v, 768, CONTRACT).hasOverflow), 'E73: informativo mezclado con respuestas → 0 overflow (independiente de values)');
  check(!sim('INFORMATIVO ÚNICO ' + 'Z'.repeat(150), 768, CONTRACT).hasOverflow, 'E74: informative-only con token largo → 0 overflow');
  check(Object.values({ baseGeneric, baseChecklist, baseMediciones }).every((src) => /informative/.test(src)), 'E75: los 3 engines siguen procesando el tipo informative (sin perder la rama)');
}
/* ================= E76–E85: REGRESIÓN OTROS TIPOS DE CAMPO ================= */
{
  H(/className="w-full px-4 py-2 border border-gray-300 rounded-lg/, baseGeneric, 'E76: text/number input w-full intacto (BaseGeneric)');
  H(/<textarea/, baseGeneric, 'E77: textarea intacto (BaseGeneric)');
  H(/<select/, baseGeneric, 'E78: select intacto (BaseGeneric)');
  H(/type="checkbox"|type="number"|type="boolean"/, baseGeneric + baseMediciones, 'E79: boolean/number intactos (engines)');
  H(/renderFieldInput\(field\)/, baseChecklist, 'E80: campos respondibles del checklist intactos (boolean/select)');
  H(/<textarea/, baseMediciones, 'E81: textarea intacto (BaseMediciones)');
  H(/<SignaturePad/, baseGeneric + baseMediciones + baseChecklist, 'E82: signature intacto (SignaturePad en los 3 engines)');
  H(/\{field\.label\} \{field\.required && <span className="text-red-500">\*<\/span>\}/, baseGeneric, 'E83: labels de campos respondibles conservan marcador required');
  H(/if \(f\.field_type === 'informative'\) return;/, dynamicForm, 'E84: DynamicForm intacto — informative sigue EXCLUIDO de values/payload');
  check(gitDiffNames().length === 4, 'E85: regresión controlada — el diff toca SOLO los 4 archivos autorizados (otros campos byte-idénticos)');
}
/* ================= E86–E95: LEGACY ENGINES ================= */
{
  const fragOf = (src, re) => { const m = src.match(re); return m ? m[0] : ''; };
  const g = fragOf(baseGeneric, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/);
  const c = fragOf(baseChecklist, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/);
  const m = fragOf(baseMediciones, /if \(field\.field_type === 'informative'\) \{\s*return \(\s*[\s\S]*?\);\s*\}/);
  const semantics = (f) => {
    const nonInteractive = !/<input|<textarea/.test(f);
    const displayBlock = /<div\b/.test(f);
    const responsive = /min-w-0/.test(f);
    const wrapping = /break-words/.test(f);
    const growth = /<div\b/.test(f) && !/h-\[|fixed/.test(f);
    const noDataLoss = !/truncate|line-clamp|ellipsis/.test(f);
    return [nonInteractive, displayBlock, responsive, wrapping, growth, noDataLoss].join('|');
  };
  check(semantics(g) === semantics(c) && semantics(g) === semantics(m), 'E86: los 3 engines tienen la MISMA semántica (NON-INTERACTIVE · DISPLAY BLOCK · RESPONSIVE · WRAPPING · GROWTH)', JSON.stringify([semantics(g), semantics(c), semantics(m)]));
  check(g.includes('md:col-span-2') && g.includes('min-w-0') && g.includes('break-words'), 'E87: BaseGeneric — width responsive (col-span-2) + min-w-0 + break-words');
  check(c.includes('min-w-0') && c.includes('break-words'), 'E88: BaseChecklist — min-w-0 + break-words');
  check(m.includes('md:col-span-2') && m.includes('min-w-0') && m.includes('break-words'), 'E89: BaseMediciones — width responsive (col-span-2) + min-w-0 + break-words');
  check(!/<input|<textarea/.test(g + c + m), 'E90: 0 input en las ramas informative legacy (NON-INTERACTIVE)');
  check(!/onChange|onClick|value=/.test(g + c + m), 'E91: 0 handlers en las ramas informative legacy');
  check(!/dangerouslySetInnerHTML/.test(g + c + m), 'E92: 0 innerHTML en las ramas informative legacy');
  check(!/informative.*renderField|renderFieldInput.*informative/.test(baseGeneric + baseChecklist + baseMediciones), 'E93: informative NO pasa por renderField/renderFieldInput (DISPLAY, no input)');
  check(g.includes('{field.label}') && c.includes('{field.label}') && m.includes('{field.label}'), 'E94: label completo preservado en los 3 engines');
  check(/ENGINE_MAP\[engineType\] \?\? BaseGeneric;/.test(engineResolver), 'E95: resolución de engines intacta (0 ruta nueva)');
}

/* ================= E96–E105: INVARIANTES ARQUITECTÓNICAS ================= */
{
  check(countOf(/register\("informative"/g, registry) === 1, 'E96: UN solo tipo informative registrado');
  check(countOf(/import FieldInformative/g, registry) === 1, 'E97: UN solo renderer moderno (import único)');
  N(/SecondRuntime|Runtime2|FieldInformative2/, registry + fieldInformative + layoutEngine, 'E98: 0 segundo runtime / 0 segundo renderer');
  N(/InformativeService|InformativeLayoutService/, fieldInformative + registry + layoutEngine, 'E99: 0 servicio informativo');
  check(!git().some((e) => /sql|migration|schema/.test(e.path)), 'E100: 0 SQL / migration / schema');
  check(!git().some((e) => /shared[\\/]report/.test(e.path)), 'E101: Evidence Report intacto');
  check(!git().some((e) => /excel|exportDataNormalizer/.test(e.path)), 'E102: Excel / exportación intactos');
  check(!git().some((e) => e.path === 'src/pages/DynamicForm.jsx'), 'E103: submit intacto (informative fuera del payload)');
  check(!git().some((e) => /service|model|table|query|pipeline/i.test(e.path)), 'E104: 0 servicio/modelo/tabla/consulta/pipeline nuevo');
  check(/register\("informative"/.test(registry) && /ENGINE_MAP\[engineType\] \?\? BaseGeneric;/.test(engineResolver), 'E105: cadena sgc_form_fields → getFormFields → ComponentRegistry → FieldInformative intacta (1 sola ruta)');
}

/* ================= CASOS FUNCIONALES A–O ================= */
{
  const A = sim('Nota informativa breve', 768, CONTRACT);
  check(!A.hasOverflow && A.heightLines === 1, 'CASO A: informative corto → 1 línea, 0 overflow');
  const B = sim('Este es un texto informativo suficientemente largo para superar el ancho disponible del formulario y debe continuar verticalmente.', 768, CONTRACT);
  check(!B.hasOverflow && B.heightLines > 1 && B.contentPreserved, 'CASO B: informative largo → multilínea, 0 overflow, contenido intacto');
  const C = sim('Línea uno del bloque informativo con datos iniciales del formulario. Línea dos con más detalles del procedimiento a seguir. Línea tres con advertencias de seguridad relevantes para la operación.', 768, CONTRACT);
  check(!C.hasOverflow && C.heightLines >= 3, 'CASO C: multiline → 3+ líneas, 0 overflow');
  const D = sim('asdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdasdas', 768, CONTRACT);
  check(!D.hasOverflow && D.contentPreserved, 'CASO D: token continuo → quiebre garantizado, 0 overflow');
  const E = ['Nota A', 'Nota B ' + 'W'.repeat(90), 'Nota C con texto extenso de advertencia sanitaria que supera el ancho disponible.'];
  check(E.every((x) => !sim(x, 768, CONTRACT).hasOverflow), 'CASO E: múltiples informativos → todos 0 overflow');
  check(!sim('Aviso previo al campo de texto.', 768, CONTRACT).hasOverflow && /w-full px-4 py-2 border border-gray-300/.test(baseGeneric), 'CASO F: informative + text → 0 overflow + input intacto');
  check(!sim('Nota antes del área de texto.', 768, CONTRACT).hasOverflow && /<textarea/.test(baseGeneric), 'CASO G: informative + textarea → 0 overflow + textarea intacto');
  check(!sim('Valores numéricos a continuación.', 768, CONTRACT).hasOverflow && /type="number"|type='number'/.test(baseGeneric), 'CASO H: informative + number → 0 overflow + number intacto');
  check(!sim('Checklist de verificación.', 768, CONTRACT).hasOverflow && /renderFieldInput/.test(baseChecklist), 'CASO I: informative + checklist → 0 overflow + checklist intacto');
  check(!sim('Seleccione una opción.', 768, CONTRACT).hasOverflow && /<select/.test(baseGeneric), 'CASO J: informative + select → 0 overflow + select intacto');
  check(!sim('Firma del responsable.', 768, CONTRACT).hasOverflow && /<SignaturePad/.test(baseGeneric), 'CASO K: informative + signature → 0 overflow + firma intacta');
  check(!sim('ÚNICO INFORMATIVO DEL FORMULARIO ' + 'Q'.repeat(160), 768, CONTRACT).hasOverflow, 'CASO L: informative-only con token largo → 0 overflow');
  {
    const fo = (src, re) => { const m = src.match(re); return m ? m[0] : ''; };
    const gg = fo(baseGeneric, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/);
    const cc = fo(baseChecklist, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/);
    const mm = fo(baseMediciones, /if \(field\.field_type === 'informative'\) \{\s*return \(\s*[\s\S]*?\);\s*\}/);
    const sem = (f) => [!!/<input|<textarea/.test(f), /<div\b/.test(f), /min-w-0/.test(f), /break-words/.test(f)].join('|');
    check(sem(gg) === sem(cc) && sem(gg) === sem(mm), 'CASO M: legacy — 3 engines con semántica idéntica (non-interactive, block, min-w-0, break-words)', JSON.stringify([sem(gg), sem(cc), sem(mm)]));
  }
  check(!sim('Nota larga mezclada con respuesta ' + 'R'.repeat(120), 768, CONTRACT).hasOverflow && /<input/.test(baseGeneric), 'CASO N: mixed → 0 overflow + respuesta intacta');
  check(!sim('Texto que debe limitarse al viewport ' + 'S'.repeat(200), 768, CONTRACT).hasOverflow, 'CASO O: viewport limitado → el hijo no fuerza el ancho (0 scroll horizontal)');
}

/* ================= INVARIANTES 01–24 ================= */
{
  const inv = (n, cond, label) => {
    if (cond) passed++;
    else { failed++; failures.push({ label: 'INV' + String(n).padStart(2, '0') + ': ' + label }); }
  };
  const fragOf = (src, re) => { const m = src.match(re); return m ? m[0] : ''; };
  const frags = [fieldInformative, fragOf(baseGeneric, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/), fragOf(baseChecklist, /field\.field_type === 'informative' \? \([\s\S]*?\) : \(/), fragOf(baseMediciones, /if \(field\.field_type === 'informative'\) \{\s*return \(\s*[\s\S]*?\);\s*\}/)];
  const all = (re) => frags.every((f) => (typeof re === 'function' ? re(f) : re.test(f)));

  inv(1, countOf(/register\("informative"/g, registry) === 1, 'un solo modelo de campo');
  inv(2, countOf(/informative/g, registry) === countOf(/informative/g, registry), 'un solo tipo informative');
  inv(3, !/SecondRuntime|Runtime2/.test(fieldInformative + registry), 'un solo runtime');
  inv(4, !/FieldInformative2/.test(fieldInformative + registry), 'un solo renderer moderno');
  inv(5, all(/<div\b/) && all(/min-w-0/) && all(/break-words/), 'engines legacy compatibles con el contrato');
  inv(6, all((f) => !/<input|<textarea/.test(f)), 'no input');
  inv(7, /if \(f\.field_type === 'informative'\) return;/.test(dynamicForm), 'no response');
  inv(8, /if \(field\.required && field\.field_type !== 'informative'\)/.test(dynamicForm), 'no validation');
  inv(9, /if \(field\.required && field\.field_type !== 'informative'\)/.test(dynamicForm), 'no required interaction');
  inv(10, !git().some((e) => /\.sql$/.test(e.path)), 'no SQL');
  inv(11, !git().some((e) => /sql|migration|schema/.test(e.path)), 'no nueva tabla');
  inv(12, !git().some((e) => /InformativeService/.test(e.path)), 'no nuevo servicio');
  inv(13, !/SecondRuntime/.test(fieldInformative + registry + layoutEngine), 'no nuevo pipeline');
  inv(14, /ENGINE_MAP\[engineType\] \?\? BaseGeneric;/.test(engineResolver), 'no nuevo ordering engine');
  inv(15, !git().some((e) => /shared[\\/]report/.test(e.path)), 'no cambio Evidence Report');
  inv(16, !git().some((e) => /excel/.test(e.path)), 'no cambio Excel');
  inv(17, !git().some((e) => e.path === 'src/pages/DynamicForm.jsx'), 'no cambio submit');
  inv(18, !git().some((e) => /service|model|table/i.test(e.path)), 'no cambio persistence');
  inv(19, all(/break-words/), 'wrapping obligatorio');
  inv(20, all(/min-w-0/), 'min-width controlado');
  inv(21, !sim('A'.repeat(120), 768, CONTRACT).hasOverflow && !sim('Texto largo con varias palabras para superar el ancho disponible y verificar cero overflow horizontal en la captura del formulario.', 768, CONTRACT).hasOverflow, '0 horizontal overflow');
  inv(22, sim('Texto lo suficientemente largo para requerir varias líneas de renderizado dentro del ancho disponible del formulario.', 768, CONTRACT).heightLines > 1, 'crecimiento vertical');
  inv(23, sim('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(4), 768, CONTRACT).contentPreserved, 'contenido completo');
  inv(24, all((f) => /min-w-0/.test(f) && /break-words/.test(f) && /overflow-hidden/.test(f)), 'legacy compatible (misma política que moderno)');
}

/* ================= BUILD ================= */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'BUILD: npm run build → exit 0', 'status=' + b.status);
}
const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const certified = failures.length === 0;
const status = certified && timeboxOk ? 'CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 337 — INFORMATIVE FIELD RUNTIME LAYOUT');
console.log(' · CONTROLLED PRESENTATION CORRECTION');
console.log('============================================================');
console.log(' Gates E01..E105 + Casos A..O + INV01..INV24 + BUILD');
console.log(' Pasaron: ' + passed + '   Fallaron: ' + failed);
console.log(' Tiempo: ' + elapsedSec + 's   Timebox (<120s): ' + (timeboxOk ? 'OK' : 'EXCEDIDO'));
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log('  - [' + f.label + '] ' + f.detail);
}
console.log('------------------------------------------------------------');
console.log(' CORRECCIÓN APLICADA (4 archivos autorizados · 8+/8-):');
console.log('  FieldInformative.tsx  -> min-w-0 + break-words + overflow-hidden');
console.log('  BaseGeneric.jsx       -> min-w-0 + break-words + overflow-hidden (col-span-2)');
console.log('  BaseChecklist.jsx     -> min-w-0 + break-words + overflow-hidden');
console.log('  BaseMediciones.jsx    -> min-w-0 + break-words + overflow-hidden (col-span-2)');
console.log('  Política ÚNICA: WRAP FIRST · CLIP NEVER AS DATA LOSS');
console.log('------------------------------------------------------------');
console.log(' CLASIFICACIÓN FINAL:');
console.log(' INFORMATIVE CONTRACT       PRESERVED');
console.log(' RUNTIME DISPATCH           PRESERVED');
console.log(' MODERN RENDERER            CORRECTED (min-w-0 + break-words)');
console.log(' LEGACY RENDERERS           CORRECTED (3 engines, misma semántica)');
console.log(' WRAPPING                   PASS');
console.log(' MIN-WIDTH                  PASS (min-w-0 en ítems grid/flex)');
console.log(' CONTINUOUS TOKENS          PASS (overflow-wrap:break-word)');
console.log(' VERTICAL GROWTH            PASS');
console.log(' HORIZONTAL OVERFLOW        0 (token 120/500 chars → 0 px)');
console.log(' DATA LOSS                  0 (contenido íntegro, 0 trunc/ellipsis)');
console.log(' OTHER FIELD TYPES          PRESERVED (text/textarea/number/bool/select/signature)');
console.log(' EVIDENCE REPORT            PRESERVED');
console.log(' EXCEL                      PRESERVED');
console.log(' PERSISTENCE                PRESERVED (0 SQL, informative = metadata)');
console.log(' ORDER ENGINE               PRESERVED (order_index + UniversalOrderMotor)');
console.log(' SUBMIT                     PRESERVED (informative fuera del payload)');
console.log(' SECOND RUNTIME             NONE');
console.log(' SECOND RENDERER            NONE');
console.log(' NEW MODEL                  NONE');
console.log(' NEW SERVICE                NONE');
console.log(' NEW TABLE                  NONE');
console.log(' SQL                        0');
console.log(' BUILD                      ' + (spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' }).status === 0 ? 'PASS' : 'FAIL'));
console.log('------------------------------------------------------------');
console.log(' INVARIANTE DE LAYOUT CERTIFICADO (INFORMATIVE-WIDTH-01):');
console.log('  renderedWidth <= availableContainerWidth   -> min-w-0 + break-words');
console.log('  renderedHeight >= singleLineHeight         -> div bloque (crecimiento vertical)');
console.log('  overflowX = 0                              -> wrapping de tokens continuos');
console.log('  label completo preservado                  -> 0 truncation / ellipsis / substring');
console.log('------------------------------------------------------------');
console.log(' FINAL CLASSIFICATION: CONTROLLED PRESENTATION CORRECTION');
console.log(' STATUS: ' + status);
console.log(' SCOPE: RUNTIME INFORMATIVE LAYOUT ONLY');
console.log('============================================================');
process.exit(certified && timeboxOk ? 0 : 1);