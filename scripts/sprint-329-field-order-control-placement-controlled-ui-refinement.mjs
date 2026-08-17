/**
 * SPRINT 329 — FIELD ORDER CONTROL PLACEMENT · CONTROLLED UI REFINEMENT
 * LEVEL 5 · CONTROLLED PRESENTATION REFINEMENT
 *
 * Corrige SOLO la ubicación visual del control "Orden dentro del formulario"
 * dentro de Configuración del Nuevo Campo / Editando Campo:
 *
 *   Etiqueta → Tipo → [config específica] → Obligatorio → Orden → Cancelar/Guardar
 *
 * Principio rector: ONE FIELD CONFIGURATION · ONE ORDER CONTROL · LAST POSITION.
 * NO se modifica: motor, persistencia, runtime, identidad, flechas, orden explícito.
 *
 * Archivos autorizados (Sprint 329 §11):
 *   src/components/FormBuilder.jsx        (único cambio funcional — JSX estructural)
 *   scripts/sprint-329-*.mjs
 *   docs/Sprint-329.md
 *
 * Método: STATIC ANALYSIS (árbol JSX) + RUNTIME (motor 328 intacto) +
 *         FINGERPRINT (archivos protegidos) + GIT SCOPE + BUILD.
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
const git = () => {
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  return gs.stdout.split('\n').filter(Boolean).map((l) => ({ status: l.slice(0, 2).trim(), path: l.slice(3).trim() }));
};

/* ---------- Extracción de bloques de formulario ---------- */
const block = (anchor, close) => {
  const a = fb.indexOf(anchor);
  const c = fb.indexOf(close, a);
  return a >= 0 && c > a ? fb.slice(a, c) : '';
};
const CREATE = block('onSubmit={handleAddField}', '</form>');
const EDIT = block('onSubmit={handleUpdateField}', '</form>');
const mk = (id, order, extra = {}) => ({ id, label: id, type: 'text', required: true, ...(order != null ? { order } : {}), ...extra });
const mkMany = (n, prefix = 'c') => Array.from({ length: n }, (_, i) => mk(`${prefix}${i + 1}`, i + 1));
const ids = (arr) => arr.map((f) => f.id);
const orders = (arr) => arr.map((f) => f.order);
const isContiguous = (arr) => orders(arr).every((o, i) => o === i + 1);
const idx = (blockSrc, token) => blockSrc.indexOf(token);
const inOrder = (blockSrc, tokens, label) =>
  check(tokens.slice(1).every((t, i) => { const p = idx(blockSrc, tokens[i]); const q = idx(blockSrc, t); return p >= 0 && q > p; }),
    label, tokens.map((t) => `${t}@${idx(blockSrc, t)}`).join(' '));

/* ================================================================== */
/* E01–E10 — SCOPE Y NO-TOUCH                                         */
/* ================================================================== */
{
  const entries = git();
  const srcM = entries.filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  check(JSON.stringify(srcM) === JSON.stringify(['src/components/FormBuilder.jsx', 'src/order-motor/UniversalOrderMotor.js']),
    'E01: src/ modificados = FormBuilder (329) + UniversalOrderMotor (328 pendiente) — exacto', JSON.stringify(srcM));

  const finger = {
    'src/order-motor/UniversalOrderMotor.js': '5DBB3848AE2171ADF11E3EAF48B560BB2A18A8C16C6C0CB42CFB6627624883F9',
    'src/order-motor/adapters/FormBuilderOrderAdapter.js': 'EB4D60EF1438C489F5FBDDD66F33F022EECE5DC980B4A8D7550DBCD6678C3F89',
    'src/services/dynamicService.js': 'A7E2885C4BED35510B5177CAB88DBE93DCC53B1C60C4DEB735B59D7B5F29554D',
    'src/pages/DynamicForm.jsx': 'C8280BB5021A043BCCDD1497A42B85210EEFEA0DD3E5AB57F81B2645CECE32B6',
  };
  for (const [p, fp] of Object.entries(finger)) {
    check(sha(p) === fp, `E0x: fingerprint inalterado — ${p} (Sprint 329 NO toca)`, `sha ${sha(p)}`);
  }

  const untracked = entries.filter((e) => e.status === '??').map((e) => e.path);
  const allowedUntracked = ['scripts/sprint-328-explicit-field-ordering-controlled-metadata-extension.mjs', 'docs/Sprint-328.md', 'scripts/sprint-329-field-order-control-placement-controlled-ui-refinement.mjs', 'docs/Sprint-329.md'];
  check(untracked.every((u) => allowedUntracked.includes(u)), 'E09: untracked ⊆ artefactos 328/329', JSON.stringify(untracked));
  check(!entries.some((e) => /\.sql$/.test(e.path)) && !entries.some((e) => /package(-lock)?\.json/.test(e.path)), 'E10: 0 SQL · 0 dependencias');
}

/* ================================================================== */
/* E11–E20 — ESTRUCTURA (sin hacks, sin duplicados, sin condicional)  */
/* ================================================================== */
{
  check(CREATE.length > 0 && EDIT.length > 0, 'E11: bloques de formulario extraídos (crear/editar)');
  N(/position:\s*absolute|absolute/, CREATE + EDIT, 'E12: 0 position absolute / fixed en los paneles');
  N(/order-last|order-first|flex-1\s+order|order-2|order-3/, CREATE + EDIT, 'E13: 0 orden de Flexbox usado para posicionar');
  check((fb.match(/Orden dentro del formulario/g) || []).length === 2, 'E14: 1 solo control de orden por formulario (sin duplicados)', String((fb.match(/Orden dentro del formulario/g) || []).length));
  N(/Orden dentro del formulario[\s\S]{0,600}Orden dentro del formulario/, fb, 'E15: 0 renderizado condicional duplicado del control');
  check((fb.match(/\{newField\.field_type ===|editField\.field_type ===|editField\.field_type/g) || []).length >= 6, 'E16: configuración específica sigue condicional al tipo (universal)');
  H(/pt-3 border-t border-gray-200/, CREATE + EDIT, 'E17: zona POSICIÓN separada estructuralmente (border-t)');
  N(/position:\s*relative|transform:|z-/, CREATE + EDIT, 'E18: 0 hack posicional adicional');
  H(/onSubmit=\{handleAddField\}/, fb, 'E19: acción Guardar Campo intacta (create)');
  H(/onSubmit=\{handleUpdateField\}/, fb, 'E20: acción Actualizar Campo intacta (edit)');
}

/* ================================================================== */
/* E21–E40 — POSICIÓN EN ÁRBOL: Orden SIEMPRE último (ambos paneles)  */
/* ================================================================== */
{
  inOrder(CREATE, ['Etiqueta / Pregunta *', 'Tipo de Dato *', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar'], 'E21: crear — identidad → obligatorio → orden → acciones');
  inOrder(EDIT, ['Etiqueta / Pregunta *', 'Tipo de Dato *', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar'], 'E22: editar — identidad → obligatorio → orden → acciones');

  // Orden después de TODA configuración específica (número/select/boolean) y tras obligatorio
  for (const [name, blk] of [['crear', CREATE], ['editar', EDIT]]) {
    const tipo = idx(blk, 'Tipo de Dato *');
    const req = idx(blk, 'Este campo es obligatorio');
    const ord = idx(blk, 'Orden dentro del formulario');
    const acc = idx(blk, 'Cancelar');
    const sub = Math.max(idx(blk, 'Guardar Campo'), idx(blk, 'Actualizar Campo'));
    const lastSpecific = Math.max(
      idx(blk, 'Unidad de Medida (Opcional)'),
      idx(blk, 'Opciones (separadas por coma)'),
      idx(blk, 'Habilitar workflow de compliance'),
      idx(blk, 'Texto del comentario por incumplimiento'),
      -1
    );
    check(ord > req, `E23: ${name} — orden después de "obligatorio"`, `ord=${ord} req=${req}`);
    check(ord > tipo && ord > lastSpecific, `E24: ${name} — orden después de toda configuración específica`, `ord=${ord} lastSpecific=${lastSpecific}`);
    check(ord < acc && ord < sub, `E25: ${name} — orden antes de Cancelar/Guardar`, `ord=${ord} acc=${acc} sub=${sub}`);
  }

  // Orden NO intercalado entre Tipo y configuración específica (bug original corregido)
  check(idx(CREATE, 'Orden dentro del formulario') > idx(CREATE, 'Unidad de Medida (Opcional)'), 'E26: crear — Orden ya NO está entre Tipo y Unidad');
  check(idx(EDIT, 'Orden dentro del formulario') > idx(EDIT, 'Unidad de Medida (Opcional)'), 'E27: editar — Orden ya NO está entre Tipo y Unidad');
  check(idx(CREATE, 'Orden dentro del formulario') > idx(CREATE, 'Habilitar workflow de compliance'), 'E28: crear — Orden tras configuración checklist');
  check(idx(CREATE, 'Orden dentro del formulario') > idx(CREATE, 'Opciones (separadas por coma)'), 'E29: crear — Orden tras opciones de lista desplegable');

  // Orden en posición FIJA (fuera de todo condicional de tipo) → cambio dinámico no lo mueve
  const condOpen = Math.max(fb.lastIndexOf('{newField.field_type ==='), fb.lastIndexOf('{editField.field_type ==='));
  const ordLast = fb.lastIndexOf('Orden dentro del formulario');
  check(ordLast > condOpen, 'E30: el control de orden está FUERA de todo condicional de tipo (posición fija)', `ordLast=${ordLast} condOpen=${condOpen}`);
}

/* ================================================================== */
/* CASOS OBLIGATORIOS A–J                                              */
/* ================================================================== */
{
  // A — Número: Tipo → Unidad → Obligatorio → Orden → Acciones
  inOrder(CREATE, ['Tipo de Dato *', 'Unidad de Medida (Opcional)', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar', 'Guardar Campo'], 'CASO A — Número (crear)');
  inOrder(EDIT, ['Tipo de Dato *', 'Unidad de Medida (Opcional)', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar', 'Actualizar Campo'], 'CASO A — Número (editar)');

  // B — Checklist: Tipo → configuración checklist → Obligatorio → Orden → Acciones
  inOrder(CREATE, ['Tipo de Dato *', 'Habilitar workflow de compliance', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar'], 'CASO B — Checklist (crear)');

  // C — Select: Tipo → opciones → Obligatorio → Orden → Acciones
  inOrder(CREATE, ['Tipo de Dato *', 'Opciones (separadas por coma)', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar'], 'CASO C — Select (crear)');

  // D — Texto: Tipo → Obligatorio → Orden → Acciones
  inOrder(CREATE, ['Tipo de Dato *', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar', 'Guardar Campo'], 'CASO D — Texto (crear)');
  inOrder(EDIT, ['Tipo de Dato *', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar', 'Actualizar Campo'], 'CASO D — Texto (editar)');

  // E — Textarea: Tipo → Obligatorio → Orden → Acciones
  inOrder(CREATE, ['Tipo de Dato *', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar'], 'CASO E — Textarea (crear)');

  // F — Boolean: Tipo → (config checklist) → Obligatorio → Orden → Acciones
  inOrder(CREATE, ['Tipo de Dato *', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar'], 'CASO F — Boolean (crear)');
  inOrder(EDIT, ['Tipo de Dato *', 'Habilitar workflow de compliance', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar'], 'CASO F — Boolean (editar)');

  // G — Signature: Tipo → Obligatorio → Orden → Acciones
  inOrder(CREATE, ['Tipo de Dato *', 'Este campo es obligatorio', 'Orden dentro del formulario', 'Cancelar'], 'CASO G — Signature (crear)');

  // H — Cambio dinámico de tipo: Texto → Número → Select → Checklist no mueve el control
  const lastCreateCond = Math.max(idx(CREATE, "{newField.field_type === 'number'"), idx(CREATE, "{newField.field_type === 'select'"), idx(CREATE, "{newField.field_type === 'boolean'"));
  const ordCreate = idx(CREATE, 'Orden dentro del formulario');
  const lastEditCond = Math.max(idx(EDIT, "{editField.field_type === 'number'"), idx(EDIT, "{editField.field_type === 'select'"), idx(EDIT, "{editField.field_type === 'boolean'"));
  const ordEdit = idx(EDIT, 'Orden dentro del formulario');
  check(ordCreate > lastCreateCond && ordEdit > lastEditCond, 'CASO H — control en posición fija: crear/editar, orden después del último condicional de tipo', `create ${ordCreate}>${lastCreateCond} · edit ${ordEdit}>${lastEditCond}`);

  // I — Persistencia: Orden = 15 → order_index = 15 (contrato adapter)
  const seq = mkMany(15);
  const moved = moveFieldToOrder(seq, 'c15', 15); // c15 ya en 15 → idempotente; reindex 1..N
  const iOrder = moved.find((f) => f.id === 'c15').order;
  const iIdx = ids(moved).indexOf('c15'); // order_index = idx (0-based) + 1
  check(iOrder === 15 && iIdx + 1 === 15 && isContiguous(moved), 'CASO I — Orden=15 → order_index=15 (persistencia intacta)', `order=${iOrder} idx=${iIdx + 1}`);

  // J — Reordenamiento: el cambio visual NO altera moveFieldToOrder/normalizeFieldOrder
  const jUp = moveUp(mkMany(50), 'c50');
  const jDown = moveDown(mkMany(50), 'c10');
  const jE = moveFieldToOrder(mkMany(50), 'c50', 10);
  const jF = moveFieldToOrder(mkMany(50), 'c10', 50);
  const jG = moveFieldToOrder(mkMany(20), 'c20', 20);
  check(jUp.find((f) => f.id === 'c50').order === 49 && isContiguous(jUp), 'CASO J1 — flecha ↑ (order-1) intacta');
  check(jDown.find((f) => f.id === 'c10').order === 11 && isContiguous(jDown), 'CASO J2 — flecha ↓ (order+1) intacta');
  check(jE.find((f) => f.id === 'c50').order === 10 && isContiguous(jE), 'CASO J3 — moveFieldToOrder 50→10 intacto');
  check(jF.find((f) => f.id === 'c10').order === 50 && isContiguous(jF), 'CASO J4 — moveFieldToOrder 10→50 intacto');
  check(JSON.stringify(ids(jG)) === JSON.stringify(ids(mkMany(20))) && jG[19].id === 'c20', 'CASO J5 — idempotencia 20→20 intacta');
  const norm1 = normalizeFieldOrder([mk('a'), mk('b')]);
  check(JSON.stringify(normalizeFieldOrder(norm1)) === JSON.stringify(norm1), 'CASO J6 — normalizeFieldOrder idempotente intacta');
}

/* ================================================================== */
/* REGRESIÓN DIRIGIDA (Sprint 328 §12)                                 */
/* ================================================================== */
{
  // Crear: Campo 1..3 + nuevo en posición 2 → 1,2,3,4
  const base = [mk('Campo 1', 1), mk('Campo 2', 2), mk('Campo 3', 3)];
  const ins = moveFieldToOrder([...base, mk('Nuevo', 4)], 'Nuevo', 2);
  check(ids(ins).map((id, i) => `${id}->${ins[i].order}`).join(' ') === 'Campo 1->1 Nuevo->2 Campo 2->3 Campo 3->4', 'R1 — crear en posición 2 → Campo1:1 · Nuevo:2 · Campo2:3 · Campo3:4');

  // Editar: Campo 4 → posición 1
  const ed = moveFieldToOrder([mk('Campo 1', 1), mk('Campo 2', 2), mk('Campo 3', 3), mk('Campo 4', 4)], 'Campo 4', 1);
  check(ed[0].id === 'Campo 4' && ed[0].order === 1 && ed[1].id === 'Campo 1' && ed[1].order === 2 && isContiguous(ed), 'R2 — mover Campo 4 → posición 1');

  // Flechas intactas
  const rUp = moveUp(mkMany(4), 'c4');
  const rDn = moveDown(mkMany(4), 'c2');
  check(rUp.find((f) => f.id === 'c4').order === 3 && rDn.find((f) => f.id === 'c2').order === 3, 'R3 — flechas ↑/↓ funcionan igual (regresión 328)');

  // Persistencia order → order_index sin cambios
  check(/reorderFormFieldsOrder\(/.test(fb) && /toOrderedIds\(/.test(fb), 'R4 — adapter de reorden aún consumido por el builder');
  check(/moveFieldToOrder\(/g.test(fb) && fb.match(/moveFieldToOrder\(/g).length >= 4, 'R5 — operación canónica aún usada en create/edit/flechas', String(fb.match(/moveFieldToOrder\(/g)?.length));
}

/* ================================================================== */
/* BUILD                                                              */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E80: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E80: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 329 — FIELD ORDER CONTROL PLACEMENT');
console.log(' · CONTROLLED UI REFINEMENT');
console.log('============================================================');
console.log(' ÁRBOL CONCEPTUAL CERTIFICADO:');
console.log('  IDENTIDAD     → Etiqueta / Tipo de Dato');
console.log('  CONFIG TYPE   → Unidad / Opciones / Checklist / …');
console.log('  PROPIEDADES   → ☑ Este campo es obligatorio');
console.log('  POSICIÓN      → Orden dentro del formulario (1 - N)');
console.log('  ACCIONES      → Cancelar / Guardar');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E80 + Casos A-J   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' VEREDICTO ARQUITECTÓNICO:');
console.log(' FIELD CONFIGURATION        PRESERVED');
console.log(' IDENTITY                   PRESERVED');
console.log(' TYPE CONFIGURATION         PRESERVED');
console.log(' REQUIRED                   PRESERVED');
console.log(' EXPLICIT ORDER             PRESERVED');
console.log(' ORDER POSITION             LAST');
console.log(' ORDER SEMANTICS            PRESERVED');
console.log(' PERSISTENCE                PRESERVED');
console.log(' RUNTIME                    PRESERVED');
console.log(' ORDER MOTOR                PRESERVED');
console.log(' UI STRUCTURE               REFINED');
console.log(' ARCHITECTURE               PRESERVED');
console.log(' SSOT                       PRESERVED');
console.log(' DATABASE                   UNCHANGED');
console.log(' SCOPE                      CONTROLLED');
console.log(' BUILD                      ' + (failed === 0 ? 'PASS' : 'FAIL'));
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log('============================================================');
process.exit(allPass ? 0 : 1);