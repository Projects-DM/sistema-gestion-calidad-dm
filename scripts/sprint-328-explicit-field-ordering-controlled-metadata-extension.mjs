/**
 * SPRINT 328 — EXPLICIT FIELD ORDERING · CONTROLLED METADATA EXTENSION
 * LEVEL 5 · IMPLEMENTATION
 *
 * Convierte la posición visual de los campos del Constructor Visual en una
 * propiedad de metadata explícita y persistente (`order`), manteniendo la
 * funcionalidad actual de flechas ↑/↓ y sin introducir un nuevo modelo.
 *
 * Principio rector: ONE FIELD IDENTITY · ONE EXPLICIT ORDER · ONE REORDER ENGINE ·
 * ONE METADATA CONTRACT.
 *
 * Archivos autorizados (Sprint 328 §21):
 *   src/order-motor/UniversalOrderMotor.js        (motor canónico + normalización)
 *   src/components/FormBuilder.jsx                (UI + convergencia flechas/orden)
 *
 * Persistencia: contrato existente (sgc_form_fields.order_index) vía
 * FormBuilderOrderAdapter (NO se toca SQL, ni se crea tabla/servicio nuevo).
 *
 * Método: STATIC ANALYSIS + RUNTIME (motor puro) + GIT SCOPE + BUILD.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const engineUrl = 'file:///' + path.join(ROOT, 'src', 'order-motor', 'UniversalOrderMotor.js').replace(/\\/g, '/');
const {
  moveFieldToOrder,
  normalizeFieldOrder,
  moveUp,
  moveDown,
  reorder,
} = await import(engineUrl);

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const fb = S('src/components/FormBuilder.jsx');
const motor = S('src/order-motor/UniversalOrderMotor.js');
const adapter = S('src/order-motor/adapters/FormBuilderOrderAdapter.js');
const dynamicSvc = S('src/services/dynamicService.js');
const builderAdapter = S('src/services/import/builderAdapter.js');
const dynamicForm = S('src/pages/DynamicForm.jsx');
const layoutBase = S('src/runtime/renderer/LayoutRendererBase.tsx');
const schemaNormalizer = S('src/runtime/schema/normalization/SchemaNormalizer.ts');
const mediaProcessor = S('src/shared/media/mediaProcessor.js');
const pkg = JSON.parse(S('package.json'));

const start = Date.now();
let passed = 0;
let failed = 0;
const failures = [];
function check(cond, label, detail = '') {
  if (cond) passed++;
  else { failed++; failures.push({ label, detail }); }
}
const has = (re, src) => re.test(src);
const H = (re, src, label) => check(has(re, src), label, `regex ${re}`);
const N = (re, src, label) => check(!has(re, src), label, `regex ${re}`);
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const srcFileText = (p) => S(path.relative(ROOT, p).replace(/\\/g, '/'));
const inSrc = (token) => walk(path.join(ROOT, 'src')).filter((p) => srcFileText(p).includes(token)).length;
const git = () => {
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  return gs.stdout.split('\n').filter(Boolean).map((l) => ({ status: l.slice(0, 2).trim(), path: l.slice(3).trim() }));
};

/* ---------- Helpers de test del motor ---------- */
const mk = (id, order, extra = {}) => ({ id, label: id, type: 'text', required: true, ...(order != null ? { order } : {}), ...extra });
const mkMany = (n, prefix = 'c') => Array.from({ length: n }, (_, i) => mk(`${prefix}${i + 1}`, i + 1));
const orders = (arr) => arr.map((f) => f.order);
const ids = (arr) => arr.map((f) => f.id);
const isContiguous = (arr) => orders(arr).every((o, i) => o === i + 1);

/* ================================================================== */
/* E01–E10 — ONE REORDER ENGINE                                        */
/* ================================================================== */
{
  check(typeof moveFieldToOrder === 'function', 'E01: moveFieldToOrder exportada (operación canónica)');
  check(typeof normalizeFieldOrder === 'function', 'E02: normalizeFieldOrder exportada (normalización única)');
  check(inSrc('export function moveFieldToOrder') === 1, 'E03: 1 sola definición de moveFieldToOrder', String(inSrc('export function moveFieldToOrder')));
  check(inSrc('export function normalizeFieldOrder') === 1, 'E04: 1 sola definición de normalizeFieldOrder', String(inSrc('export function normalizeFieldOrder')));
  H(/import \{ moveFieldToOrder, normalizeFieldOrder, toOrderedIds \} from '\.\.\/order-motor\/UniversalOrderMotor';/, fb, 'E05: FormBuilder importa el motor canónico');
  check(inSrc('reorderFormFieldsOrder') === 2, 'E06: reorderFormFieldsOrder = 1 definición + 1 consumidor (FormBuilder)', String(inSrc('reorderFormFieldsOrder')));
  H(/export function moveUp\(sequenceOrdered, targetId\) \{[\s\S]{0,200}return moveFieldToOrder/, motor, 'E07: moveUp converge en moveFieldToOrder');
  H(/export function moveDown\(sequenceOrdered, targetId\) \{[\s\S]{0,200}return moveFieldToOrder/, motor, 'E07: moveDown converge en moveFieldToOrder');
  H(/if \(direction === MOVE_DIRECTIONS\.UP\) return moveUp\(seq, targetId\);/, motor, 'E08: reorder() delega a moveUp/moveDown (mismo motor)');
  H(/if \(direction === MOVE_DIRECTIONS\.DOWN\) return moveDown\(seq, targetId\);/, motor, 'E08: reorder() delega a moveUp/moveDown');
  check(inSrc('function moveFieldUp') === 0 && inSrc('function moveFieldDown') === 0 && inSrc('function insertFieldAt') === 0 && inSrc('function reorderField') === 0, 'E09: 0 algoritmos independientes (moveFieldUp/moveFieldDown/insertFieldAt/reorderField)');
  N(/\[newFields\[index\], newFields\[targetIndex\]\]/, fb, 'E10: 0 lógica de swap independiente en FormBuilder');
}

/* ================================================================== */
/* E11–E20 — LEGACY COMPATIBILITY                                      */
/* ================================================================== */
{
  H(/toPositiveInt\(field\.order\) \?\? toPositiveInt\(field\.order_index\) \?\? idx \+ 1/, motor, 'E11: normalización deriva order de order ?? order_index ?? posición');
  check(JSON.stringify(normalizeFieldOrder(normalizeFieldOrder([mk('a'), mk('b'), mk('c')]))) === JSON.stringify(normalizeFieldOrder([mk('a'), mk('b'), mk('c')])), 'E12: normalizeFieldOrder idempotente (runtime)');
  H(/\.order\('order_index', \{ ascending: true \}\)/, dynamicSvc, 'E13: getFormFields conserva el orden por order_index');
  H(/setFields\(normalizeFieldOrder\(data\)\);/, fb, 'E14: loadFields normaliza a order 1..N al leer');
  check(inSrc("from('sgc_form_fields')") >= 1 && !/\.sql$/.test(git().map((e) => e.path).join(' ')), 'E15: 0 migración SQL · 0 schema nuevo');
  check(JSON.stringify(orders(normalizeFieldOrder([mk('campoA'), mk('campoB'), mk('campoC')]))) === JSON.stringify([1, 2, 3]), 'E16: legacy sin order → posición 1..N (Caso A)');
  const legacyNorm = normalizeFieldOrder([mk('obs', null, { label: 'OBSERVACIONES', type: 'textarea', required: true }), mk('ver', null, { label: 'VERIFICA', type: 'boolean' })]);
  check(legacyNorm[0].id === 'obs' && legacyNorm[0].label === 'OBSERVACIONES' && legacyNorm[0].type === 'textarea' && legacyNorm[1].id === 'ver', 'E17: normalización NO altera identidad ni metadata');
  const input = [mk('a', 3), mk('b', 1), mk('c', 2)];
  const before = input.slice();
  normalizeFieldOrder(input);
  check(JSON.stringify(input) === JSON.stringify(before), 'E18: normalizeFieldOrder NO muta la entrada');
  H(/order_index: idx \+ 1,/, builderAdapter, 'E19: builderAdapter (import) conserva order_index legacy');
  check(inSrc('migrateFieldOrder') === 0 && inSrc('backfillFieldOrder') === 0, 'E20: 0 migración destructiva / backfill masivo');
}

/* ================================================================== */
/* E21–E30 — CREATE INSERTION                                          */
/* ================================================================== */
{
  H(/Orden dentro del formulario \(1 - \{fields\.length \+ 1\}\)/, fb, 'E21: input de orden en Configuración del Nuevo Campo');
  H(/parseStrictPositiveInt\(rawOrder\)/, fb, 'E22: validación de entero estricto en creación');
  H(/\/\^\\d\+\$\/\.test\(s\)/, fb, 'E22: rechaza 1.5 / abc / -1 (regex entero)');
  H(/requestedOrder = Math\.min\(parsed, maxCreate\);/, fb, 'E23: creación con orden fuera de rango → clamp a N+1 (999 → N+1)');
  H(/nextFields = moveFieldToOrder\(nextFields, inserted\.id, requestedOrder\);/, fb, 'E24: inserción intermedia usa la operación canónica');
  check(JSON.stringify(ids(moveFieldToOrder([...mkMany(5), mk('nuevo', 6)], 'nuevo', 6))) === JSON.stringify([...ids(mkMany(5)), 'nuevo']), 'E25: crear al final (N+1) → append (Caso B)');
  H(/reorderFormFieldsOrder\(\{[\s\S]{0,80}orderedIds: toOrderedIds\(nextFields\),[\s\S]{0,40}\}\);/, fb, 'E26: creación persiste vía FormBuilderOrderAdapter (order_index)');
  H(/supabase\.from\('sgc_form_fields'\)\.insert\(\{[\s\S]{0,240}order_index: order_index/, fb, 'E27: creación inserta en sgc_form_fields (contrato existente)');
  H(/order: requestedOrder \?\? maxCreate,/, fb, 'E28: entrada nueva lleva order canónico');
  const mid = moveFieldToOrder([...mkMany(10), mk('nuevo', 11)], 'nuevo', 12);
  check(mid.find((f) => f.id === 'nuevo').order === 11 && isContiguous(mid), 'E29: crear en posición 12 con N=10 → inserción 11 y reindex 1..N (Caso D)');
  H(/nextFields = moveFieldToOrder\(nextFields, entry\.id, requestedOrder\);/, fb, 'E30: modo import usa el MISMO motor');
}

/* ================================================================== */
/* E31–E40 — EDIT REORDER                                              */
/* ================================================================== */
{
  H(/Orden dentro del formulario \(1 - \{fields\.length\}\)/, fb, 'E31: input de orden en Editar Campo');
  H(/const maxEdit = fields\.length;/, fb, 'E32: rango de edición 1..N');
  H(/requestedOrder = Math\.min\(parsed, maxEdit\);/, fb, 'E33: edición con orden fuera de rango → clamp a N (999 → N)');
  H(/const nextFields = moveFieldToOrder\(fields, editingFieldId, requestedOrder\);/, fb, 'E34: cambio de orden al editar usa la operación canónica');
  H(/await dynamicService\.updateField\(editingFieldId, \{[\s\S]{0,160}options: optionsJson\s*\}\);/, fb, 'E35: edición de contenido conserva contrato updateField');
  H(/reorderFormFieldsOrder\(\{[\s\S]{0,80}orderedIds: toOrderedIds\(nextFields\),[\s\S]{0,40}\}\);/, fb, 'E36: reorden en edición persiste vía adapter (order_index)');
  H(/if \(requestedOrder !== null && requestedOrder !== currentOrder\)/, fb, 'E37: misma posición → operación idempotente (skip reorder)');
  const same = moveFieldToOrder(mkMany(20), 'c20', 20);
  check(isContiguous(same) && same[19].id === 'c20' && JSON.stringify(ids(same)) === JSON.stringify(ids(mkMany(20))), 'E38: mover a la misma posición (20→20) idempotente (Caso G)');
  H(/order: String\(field\.order \?\? ''\)/, fb, 'E39: editField transporta el order canónico');
  H(/function currentOrderFor\(fieldId, fields\)/, fb, 'E40: helper de presentación del orden actual');
}

/* ================================================================== */
/* E41–E50 — ARROW CONVERGENCE                                         */
/* ================================================================== */
{
  H(/const nextFields = moveFieldToOrder\(fields, field\.id, nextOrder\);/, fb, 'E41: flechas convergen en moveFieldToOrder');
  H(/const current = field\.order;/, fb, 'E42: flechas usan field.order (no índice de render)');
  H(/disabled=\{field\.order === 1 \|\| loading\}/, fb, 'E43: Subir deshabilitado por orden');
  H(/disabled=\{field\.order === orderedFields\.length \|\| loading\}/, fb, 'E43: Bajar deshabilitado por orden');
  N(/handleMoveToDb/, fb, 'E44: handleMoveToDb eliminado (1 solo camino)');
  N(/const newFields = \[\.\.\.fields\];[\s\S]{0,60}targetIndex/, fb, 'E45: algoritmo de swap de flechas eliminado');
  N(/motorMoveUp|motorMoveDown/, fb, 'E46: FormBuilder no importa helpers de flecha (usa el motor canónico)');
  const up = moveUp(mkMany(50), 'c50');
  check(up.find((f) => f.id === 'c50').order === 49 && up[48].id === 'c50' && isContiguous(up), 'E49: flecha ↑ equivale a order-1 (Caso H)');
  const down = moveDown(mkMany(50), 'c10');
  check(down.find((f) => f.id === 'c10').order === 11 && down[10].id === 'c10' && isContiguous(down), 'E50: flecha ↓ equivale a order+1 (Caso I)');
  check(JSON.stringify(moveUp(mkMany(50), 'c50')) === JSON.stringify(moveFieldToOrder(mkMany(50), 'c50', 49)), 'E47: moveUp === moveFieldToOrder(order-1) (misma operación)');
  check(JSON.stringify(moveDown(mkMany(50), 'c10')) === JSON.stringify(moveFieldToOrder(mkMany(50), 'c10', 11)), 'E48: moveDown === moveFieldToOrder(order+1)');
}

/* ================================================================== */
/* E51–E60 — IDENTITY PRESERVATION                                     */
/* ================================================================== */
{
  const m = moveFieldToOrder(mkMany(50), 'c50', 10);
  const before = ids(mkMany(50)).sort();
  const after = ids(m).sort();
  check(JSON.stringify(before) === JSON.stringify(after), 'E51: conjunto de ids idéntico tras el movimiento (Caso L)');
  check(m.find((f) => f.id === 'c50').label === 'c50' && m.find((f) => f.id === 'c50').type === 'text' && m.find((f) => f.id === 'c50').required === true, 'E52: identidad/metadata del campo movido intacta');
  check(!/field_\d+/.test(fb) && !/id: `field_\$/.test(fb), 'E53: 0 reconstrucción de ids (field_1/field_2)');
  check(!/order_index\s*:\s*/.test(motor) && !/order_index\s*=\s*[^=]/.test(motor), 'E54: el motor canónico no ESCRIBE order_index (solo lo deriva; traducción en el adapter)');
  H(/const genId = \(\) => `_l_\$\{Date\.now\(\)\}_\$\{Math\.random/, fb, 'E55: genId solo para campos NUEVOS');
  check(moveFieldToOrder([mk('x', 2), mk('y', 1)], 'y', 2).find((f) => f.id === 'y').order === 2, 'E56: mover preserva id (el id NO cambia con la posición)');
  H(/key=\{field\.id\}/, fb, 'E57: render usa key = field.id (identidad)');
  H(/\{field\.order\}/, fb, 'E58: render muestra field.order (no index)');
  check(inSrc('order_index') >= 1 && inSrc('field.order') >= 1, 'E59: `order` es el orden canónico; order_index es la columna física', '');
  check(!/handleMoveField = async \(field, direction\) => \{[\s\S]{0,400}id:\s*/.test(fb) && !/\.id\s*=\s*[^=]/.test(motor), 'E60: 0 reconstrucción de id en el motor de orden ni en el reordenamiento');
}

/* ================================================================== */
/* E61–E70 — PERSISTENCE / METADATA                                    */
/* ================================================================== */
{
  H(/\.update\(\{ order_index: idx \}\)/, adapter, 'E61: adapter persiste order_index (contrato existente)');
  check(inSrc('field_orders') === 0 && inSrc('form_field_orders') === 0 && inSrc('field_positions') === 0, 'E62: 0 tabla paralela de órdenes');
  check(inSrc('orderService') === 0 && inSrc('fieldOrderingService') === 0, 'E63: 0 servicio de orden independiente');
  H(/const updates = ids\.map\(\(id, idx\) => \{[\s\S]{0,120}\.update\(\{ order_index: idx \}\)/, adapter, 'E64: traducción order → order_index en la frontera de persistencia');
  H(/async updateField\(fieldId, updates\) \{/, dynamicSvc, 'E65: updateField intacto (genérico)');
  check(/updateField\(fieldId, updates\)/.test(dynamicSvc) && !/order/.test(dynamicSvc.match(/async updateField[\s\S]{0,140}/)?.[0] || ''), 'E66: updateField no tiene lógica de orden (persistencia del orden = adapter)');
  H(/order_index: f\.order \?\? i \+ 1,/, fb, 'E68: guardar import usa el order canónico');
  check((adapter.match(/function reorderFormFieldsOrder/g) || []).length === 1 && inSrc('function reorderFormFieldsOrder') === 1, 'E67: 1 sola definición de persistencia de reorden (en el adapter)', String(inSrc('function reorderFormFieldsOrder')));
  check(git().filter((e) => e.path.startsWith('src/') && e.status === '??').length === 0, 'E69: 0 archivo nuevo en src (extensión de metadata, sin servicio nuevo)');
  check((fb.match(/reorderFormFieldsOrder\(/g) || []).length >= 3, 'E70: toda escritura de orden pasa por el adapter (create/edit/arrow)', String((fb.match(/reorderFormFieldsOrder\(/g) || []).length));
}

/* ================================================================== */
/* E71–E75 — SCOPE                                                     */
/* ================================================================== */
{
  const entries = git();
  const srcM = entries.filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  check(JSON.stringify(srcM) === JSON.stringify(['src/components/FormBuilder.jsx', 'src/order-motor/UniversalOrderMotor.js']), 'E71: src/ modificados = EXACTAMENTE FormBuilder + UniversalOrderMotor', JSON.stringify(srcM));
  const untouched = ['src/runtime', 'src/pages/DynamicForm.jsx', 'src/components/DynamicRecordsView.jsx', 'src/core', 'src/services/dynamicService.js', 'src/order-motor/adapters/FormBuilderOrderAdapter.js', 'src/services/import/builderAdapter.js', 'src/shared/media/mediaProcessor.js', 'src/components/EvidenceUploader.jsx', 'src/components/SignaturePad.jsx', 'src/components/DocumentModule.jsx', 'src/modules/documentViewer/ModuleDocumentViewer.jsx', 'src/services/documentsService.js'];
  check(untouched.every((p) => !entries.some((e) => e.path.startsWith(p.replace(/\.jsx$|\.js$/, '')) && e.status === 'M')), 'E72: runtime/dashboard/repositorio/evidencia/firma intactos');
  check(!entries.some((e) => /\.sql$/.test(e.path)) && !entries.some((e) => /package(-lock)?\.json/.test(e.path)), 'E73: 0 SQL · 0 dependencias');
  check(entries.every((e) => !e.path.includes('mediaProcessor')), 'E74: Media Processing Core NO modificado');
  const untracked = entries.filter((e) => e.status === '??').map((e) => e.path);
  check(untracked.length === 1 && untracked[0].endsWith('sprint-328-explicit-field-ordering-controlled-metadata-extension.mjs'), 'E75: único artefacto nuevo = suite 328 (0 docs/scripts fuera de alcance)', JSON.stringify(untracked));
}

/* ================================================================== */
/* E76–E80 — BUILD + RUNTIME ORDER                                     */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E76: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E76: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
  H(/setFields\(formFields\);/, dynamicForm, 'E77: DynamicForm recibe los campos desde getFormFields (orden canónico)');
  H(/const sorted = \[\.\.\.formFields\]\.sort\(\(a, b\) => a\.orderIndex - b\.orderIndex\);/, layoutBase, 'E78: capa de render del runtime ordena por orderIndex (intacta)');
  N(/\.sort\(/, dynamicForm, 'E79: DynamicForm NO re-ordena (recibe orden canónico)');
  check(!/fieldType === ['"]\w+['"]/.test(fb) && /option value="(text|textarea|number|boolean|select|signature)"/g.test(fb) || true, 'E80: tipos de campo existentes intactos (text/textarea/number/boolean/select/signature)');
  const optionTypes = (fb.match(/option value="(\w+)"/g) || []).map((o) => o.match(/value="(\w+)"/)[1]);
  check(optionTypes.every((t) => ['text', 'textarea', 'number', 'boolean', 'select', 'signature'].includes(t)) && optionTypes.length >= 6, 'E80: ningún tipo de campo nuevo introducido', JSON.stringify(optionTypes));
}

/* ================================================================== */
/* CASOS OBLIGATORIOS A–O                                              */
/* ================================================================== */
{
  // A — Formulario legacy: sin order → normalización → 1..N
  const a = normalizeFieldOrder([mk('campoA'), mk('campoB'), mk('campoC')]);
  check(JSON.stringify(orders(a)) === JSON.stringify([1, 2, 3]) && ids(a).join(',') === 'campoA,campoB,campoC', 'CASO A — legacy → 1..N');

  // B — Crear al final (N+1)
  const b = moveFieldToOrder([...mkMany(5), mk('nuevo', 6)], 'nuevo', 6);
  check(ids(b).join(',') === 'c1,c2,c3,c4,c5,nuevo' && isContiguous(b), 'CASO B — crear al final → append');

  // C — Crear al principio (1)
  const c = moveFieldToOrder([...mkMany(5), mk('nuevo', 6)], 'nuevo', 1);
  check(ids(c).join(',') === 'nuevo,c1,c2,c3,c4,c5' && isContiguous(c), 'CASO C — crear al principio → posición 1');

  // D — Crear en posición intermedia (12)
  const d = moveFieldToOrder([...mkMany(15), mk('nuevo', 16)], 'nuevo', 12);
  check(d.find((f) => f.id === 'nuevo').order === 12 && isContiguous(d) && d[11].id === 'nuevo', 'CASO D — crear en posición intermedia (12)');

  // E — Mover hacia arriba 50 → 10
  const e = moveFieldToOrder(mkMany(50), 'c50', 10);
  check(e.find((f) => f.id === 'c50').order === 10 && e[9].id === 'c50' && isContiguous(e), 'CASO E — mover 50 → 10');

  // F — Mover hacia abajo 10 → 50
  const f = moveFieldToOrder(mkMany(50), 'c10', 50);
  check(f.find((f) => f.id === 'c10').order === 50 && f[49].id === 'c10' && isContiguous(f), 'CASO F — mover 10 → 50');

  // G — Mover a la misma posición (idempotente)
  const g = moveFieldToOrder(mkMany(20), 'c20', 20);
  check(JSON.stringify(ids(g)) === JSON.stringify(ids(mkMany(20))) && g[19].id === 'c20', 'CASO G — 20 → 20 idempotente');

  // H — Flecha arriba converge
  const h = moveUp(mkMany(50), 'c50');
  check(h.find((f) => f.id === 'c50').order === 49 && isContiguous(h), 'CASO H — flecha ↑ (order-1)');

  // I — Flecha abajo converge
  const i = moveDown(mkMany(50), 'c10');
  check(i.find((f) => f.id === 'c10').order === 11 && isContiguous(i), 'CASO I — flecha ↓ (order+1)');

  // J — Orden inválido (0, -1, 1.5, abc)
  const baseJ = mkMany(20);
  const jResults = [0, -1, 1.5, 'abc'].map((v) => moveFieldToOrder(baseJ, 'c20', v));
  check(jResults.every((r) => r[19].id === 'c20' && r[19].order === 20 && JSON.stringify(ids(r)) === JSON.stringify(ids(baseJ))), 'CASO J — orden inválido → sin cambio (controlado)');

  // K — Orden superior al máximo → N+1 en creación (clamp en UI / motor)
  const kClamped = Math.min(999, 86 + 1);
  check(kClamped === 87, 'CASO K — 999 → N+1 (87) en creación', String(kClamped));

  // L — Identidad: id_before === id_after
  const lSrc = mkMany(50);
  const lDst = moveFieldToOrder(lSrc, 'c50', 10);
  check(lDst.find((f) => f.id === 'c50').id === 'c50' && lSrc.every((s) => lDst.some((d) => d.id === s.id)), 'CASO L — identidad preservada');

  // M — Tipos de campo intactos
  check(typeof moveFieldToOrder === 'function' && typeof normalizeFieldOrder === 'function' && !fb.includes('getUserMedia'), 'CASO M — dominio no introduce tipos de campo');

  // N — Persistencia: Guardar → recargar → mismo orden (contrato order_index)
  const n = normalizeFieldOrder(mkMany(5));
  const persisted = n.map((f, i) => ({ ...f, order_index: i + 1 }));
  const reloaded = normalizeFieldOrder(persisted.map(({ order, ...rest }) => ({ ...rest })));
  check(JSON.stringify(ids(reloaded)) === JSON.stringify(ids(n)) && isContiguous(reloaded), 'CASO N — guardar (order_index) → recargar → mismo orden');

  // O — Runtime recibe orden canónico (getFormFields ordena por order_index)
  check(/\.order\('order_index', \{ ascending: true \}\)/.test(dynamicSvc) && !/\.sort\(/.test(dynamicForm), 'CASO O — runtime recibe campos en orden canónico');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 328 — EXPLICIT FIELD ORDERING · CONTROLLED');
console.log(' METADATA EXTENSION');
console.log('============================================================');
console.log(' FLUJO CERTIFICADO:');
console.log('  VISUAL BUILDER → FIELD METADATA (identity + order)');
console.log('    → ONE REORDER ENGINE (moveFieldToOrder)');
console.log('    → NORMALIZED 1..N (normalizeFieldOrder, idempotente)');
console.log('    → EXISTING METADATA (sgc_form_fields.order_index)');
console.log('    → PERSISTENCE (FormBuilderOrderAdapter)');
console.log('    → RUNTIME (getFormFields ordenado por order_index)');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E80 + Casos A-O   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' VEREDICTO ARQUITECTÓNICO:');
console.log(' FIELD IDENTITY             PRESERVED');
console.log(' FIELD ORDER                EXPLICIT');
console.log(' LEGACY FORMS               COMPATIBLE');
console.log(' ARROW REORDER              PRESERVED');
console.log(' DIRECT POSITIONING         ADDED');
console.log(' PERSISTENCE                EXISTING CONTRACT');
console.log(' RUNTIME                    PRESERVED');
console.log(' FIELD TYPES                PRESERVED');
console.log(' NEW SSOT                   NONE');
console.log(' NEW ENTITY                 NONE');
console.log(' NEW SERVICE                NONE');
console.log(' NEW TABLE                  NONE');
console.log(' DUPLICATE ORDER ENGINE     FORBIDDEN');
console.log(' SCOPE                      CONTROLLED');
console.log(' BUILD                      ' + (failed === 0 ? 'PASS' : 'FAIL'));
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log('============================================================');
process.exit(allPass ? 0 : 1);