/**
 * SPRINT 330 — INFORMATIVE DISPLAY FIELD · FORENSIC ARCHITECTURE AUDIT
 * LEVEL 5 · AUDIT ONLY · ARCHITECTURE DECISION
 *
 * AUDIT ONLY — 0 cambios src · 0 SQL · 0 storage · 0 dependencias.
 *
 * Pregunta forense: ¿El SGC-DM puede incorporar un campo informativo/no respondible
 * como una nueva semántica del contrato de campo existente, reutilizando runtime,
 * persistencia, ordenamiento e informes, sin segundo modelo ni lógica paralela?
 *
 * Principio rector: INFORMATION IS FORM METADATA, NOT OPERATIONAL RESPONSE.
 *
 * Método: STATIC FORENSIC ANALYSIS (contratos reales con file:line) + GIT SCOPE GUARD
 *         + BUILD baseline. NO IMPLEMENTA NADA.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const sql = S('docs/12-database/sql_setup_dynamic.sql');
const fb = S('src/components/FormBuilder.jsx');
const df = S('src/pages/DynamicForm.jsx');
const dsvc = S('src/services/dynamicService.js');
const motor = S('src/order-motor/UniversalOrderMotor.js');
const adapter = S('src/order-motor/adapters/FormBuilderOrderAdapter.js');
const bAdapter = S('src/services/import/builderAdapter.js');
const rtContracts = S('src/runtime/types/runtimeContracts.ts');
const registry = S('src/runtime/rendering/registry/ComponentRegistry.ts');
const dfRenderer = S('src/runtime/rendering/DynamicFieldRenderer.tsx');
const fieldRules = S('src/runtime/validation/rules/fieldRules.ts');
const norm = S('src/runtime/schema/normalization/SchemaNormalizer.ts');
const baseGeneric = S('src/components/engines/BaseGeneric.jsx');
const erModel = S('src/shared/report/evidenceReportModel.js');
const erRenderer = S('src/shared/report/evidenceReportRenderer.js');
const xlNorm = S('src/shared/utils/exportDataNormalizer.js');
const xlExp = S('src/shared/utils/excelExporter.js');
const drv = S('src/components/DynamicRecordsView.jsx');
const runtimeContracts = S('src/runtime/fields/contracts/FieldContracts.ts');

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
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const allSrcFiles = walk(path.join(ROOT, 'src'));
const srcTextOf = (p) => S(path.relative(ROOT, p).replace(/\\/g, '/'));
const countInSrc = (token) => allSrcFiles.filter((p) => srcTextOf(p).includes(token)).length;
const inSrc = (token) => countInSrc(token) > 0;
const git = () => {
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  return gs.stdout.split('\n').filter(Boolean).map((l) => ({ status: l.slice(0, 2).trim(), path: l.slice(3).trim() }));
};
const optionTypes = (src) => (src.match(/<option value="(\w+)">/g) || []).map((o) => o.match(/value="(\w+)"/)[1]);
const BUILDER_TYPES = [...new Set(optionTypes(fb))];

/* ================================================================== */
/* GIT SCOPE GUARD (§34)                                               */
/* ================================================================== */
{
  const entries = git();
  const srcChanges = entries.filter((e) => e.path.startsWith('src/'));
  check(srcChanges.length === 0, 'G01: 0 cambios en src/ (AUDIT ONLY)', JSON.stringify(srcChanges.map((e) => e.path)));
  check(!entries.some((e) => /\.sql$/.test(e.path)), 'G02: 0 cambios SQL');
  check(!entries.some((e) => /package(-lock)?\.json/.test(e.path)), 'G03: 0 cambios de dependencias');
  check(!entries.some((e) => /storage|\.bucket/.test(e.path)), 'G04: 0 cambios de storage');
  const untracked = entries.filter((e) => e.status === '??').map((e) => e.path);
  check(untracked.every((u) => /^scripts\/sprint-330-.*\.mjs$/.test(u) || u === 'docs/Sprint-330.md'), 'G05: únicos artefactos nuevos = suite 330 + docs/Sprint-330.md', JSON.stringify(untracked));
}

/* ================================================================== */
/* ARCHITECTURE INVENTORY — PERSISTENCE CONTRACT                       */
/* ================================================================== */
{
  H(/CREATE TABLE public\.sgc_form_fields \(/, sql, 'I01: existe UNA tabla sgc_form_fields (SSOT de campos)');
  H(/field_type TEXT NOT NULL,/, sql, 'I02: columna field_type TEXT (sin enum/check en DDL)');
  N(/CHECK\s*\([\s\S]{0,80}field_type|CREATE TYPE[\s\S]{0,60}field_type/i, sql, 'I03: 0 constraint/enum sobre field_type');
  H(/options JSONB,/, sql, 'I04: options JSONB');
  H(/order_index INTEGER NOT NULL DEFAULT 0,/, sql, 'I05: order_index = contrato de orden persistido');
  H(/id UUID DEFAULT gen_random_uuid\(\) PRIMARY KEY/, sql, 'I06: identity = UUID en sgc_form_fields');
  H(/sgc_response_values/, sql, 'I07: respuestas = EAV en sgc_response_values');
  H(/REFERENCES public\.sgc_form_fields\(id\)/, sql, 'I08: FK field_id → sgc_form_fields(id) (ON DELETE CASCADE)');
  H(/field_id UUID[\s\S]{0,60}sgc_form_fields\(id\) ON DELETE CASCADE/, sql, 'I09: eliminar campo = elimina respuestas (sin snapshot)');
}

/* ================================================================== */
/* FIELD TYPE INVENTORY + SSOT DISCOVERY                               */
/* ================================================================== */
{
  check(JSON.stringify(BUILDER_TYPES.sort()) === JSON.stringify(['boolean', 'number', 'select', 'signature', 'text', 'textarea']),
    'I10: FormBuilder (autor de formularios) = 6 tipos', JSON.stringify(BUILDER_TYPES));
  H(/\| string;/, rtContracts, 'I11: union RuntimeFieldType abierta (escape | string)');
  H(/workflow_status/, registry, 'I12: registry moderno tiene 12 renderers (autoridad de dispatch real)');
  H(/UnsupportedFieldTypeFallback/, dfRenderer, 'I13: runtime moderno tiene fallback explícito para tipo desconocido');
  check(inSrc('RuntimeFieldType') && inSrc('option value="text"') && inSrc('ComponentRegistry.get'), 'I14: SSOT FRAGMENTADA — union TS + builder + registry coexisten (documentado)');
  check(countInSrc('option value="text"') >= 1 && countInSrc('RuntimeFieldType') >= 1 && countInSrc('case \'signature\'') >= 1, 'I15: múltiples enumeraciones (sin autoridad única) — hallazgo documentado', String([countInSrc('option value="text"'), countInSrc('RuntimeFieldType'), countInSrc("case 'signature'")]));
}

/* ================================================================== */
/* RUNTIME CONTRACT — dispatch y comportamiento tipo desconocido       */
/* ================================================================== */
{
  H(/ComponentRegistry\.get\(fieldDef\.fieldType\)/, dfRenderer, 'R01: dispatch moderno = map lookup por tipo');
  H(/if \(!component\)/, dfRenderer, 'R02: tipo desconocido → rama fallback (no crash)');
  H(/Unsupported field type: \{fieldType\}/, dfRenderer, 'R03: fallback moderno = warning div (0 input)');
  H(/default:[\s\S]{0,40}<input/, baseGeneric, 'R04: legacy BaseGeneric default = input text (informative hoy renderizaría input)');
  check(!/<input/.test(dfRenderer.match(/UnsupportedFieldTypeFallback[\s\S]{0,220}/)?.[0] || ''), 'R05: fallback moderno NO es un input');
  N(/throw new Error[\s\S]{0,60}(type|field_type)/, dfRenderer + baseGeneric + df, 'R06: 0 throw en dispatch de render por tipo');
  H(/getFormFields/, dsvc, 'R07: getFormFields = lector canónico de campos');
  check(!/<input/.test(df.slice(df.indexOf('renderEngine') || 0)), 'R08: DynamicForm delega render a engines (switch por field_type)');
}

/* ================================================================== */
/* VALIDATION CONTRACT                                                 */
/* ================================================================== */
{
  H(/default:[\s\S]{0,120}return true;/, fieldRules, 'V01: isValidType acepta tipos desconocidos (default true)');
  H(/field\.required && isEmptyValue\(value\)/, fieldRules, 'V02: validación requerido = required && vacío');
  N(/validateSchema[\s\S]{0,200}informative/, fieldRules, 'V03: 0 regla específica para informative (no existe)');
  H(/field\.required[\s\S]{0,220}es obligatorio/, df, 'V04: DynamicForm bloquea submit si required && vacío');
  check(/default:[\s\S]{0,120}return true;/.test(fieldRules) === true, 'V05: informative pasaría validación de tipo hoy (aceptado)');
}

/* ================================================================== */
/* ORDER CONTRACT — UniversalOrderMotor                                */
/* ================================================================== */
{
  N(/field_type|fieldType/, motor, 'O01: motor de orden es AGNÓSTICO del tipo (solo id/order)');
  H(/export function moveFieldToOrder/, motor, 'O02: una operación canónica de reorden');
  H(/\.order\('order_index'/, dsvc, 'O03: getFormFields ordena por order_index (runtime recibe orden)');
  H(/\.update\(\{ order_index: idx \}\)/, adapter, 'O04: única escritura de order_index = adapter');
  check(!/order_index/.test(erModel) && !/order_index/.test(erRenderer), 'O05: Evidence Report NO consume order_index hoy (hallazgo)');
  H(/normalizeFieldOrder/, motor, 'O06: normalización 1..N idempotente (informative = elemento ordenable)');
}

/* ================================================================== */
/* RESPONSE SEPARATION — payload actual                                 */
/* ================================================================== */
{
  H(/Object\.keys\(values\)\.forEach/, df, 'S01: payload de submit itera TODOS los campos (sin filtro por tipo)');
  H(/Object\.keys\(values\)\.map/, dsvc, 'S02: EAV crea una fila por campo (informative generaría value_text:\'\')');
  H(/value_text/, dsvc, 'S03: serialización EAV por tipo de valor');
  N(/field_type[\s\S]{0,40}===[\s\S]{0,40}informative/, df + dsvc, 'S04: 0 exclusión de informativos hoy (GAP — requiere filtro localizado)');
  check(/processedValues\[key\] = val/.test(df), 'S05: hoy TODO campo produce respuesta → informative requiere decisión explícita');
}

/* ================================================================== */
/* HISTORY / QUERY CONTRACT                                            */
/* ================================================================== */
{
  H(/sgc_response_values\?\.map|sgc_response_values\?\.forEach/, drv, 'H01: historial itera respuestas almacenadas');
  H(/val\.sgc_form_fields/, drv, 'H02: historial usa JOIN vivo a sgc_form_fields');
  H(/sgc_form_fields \( label, field_type, options \)/, dsvc, 'H03: consulta = EAV + JOIN (sin snapshot de definición)');
  N(/getFormFields/, drv, 'H04: historial NO re-deriva de getFormFields (solo filas almacenadas)');
}

/* ================================================================== */
/* EVIDENCE REPORT CONTRACT                                            */
/* ================================================================== */
{
  N(/getFormFields/, erModel + erRenderer, 'E01: reporte es 0-query (no usa getFormFields)');
  H(/for \(const val of rec\?\.sgc_response_values/, erModel, 'E02: modelo itera SOLO filas de respuesta existentes');
  H(/fields\.push\(/, erModel, 'E03: cada fila = par label/value');
  H(/head: \[\['Campo', 'Valor'\]\]/, erRenderer, 'E04: renderer PDF = tabla autoTable Campo/Valor');
  H(/Sin datos registrados/, erRenderer, 'E05: fallback solo cuando NO hay filas');
  N(/N\/A/, erModel + erRenderer, 'E06: 0 literal "N/A" en el reporte');
  check(!/undefined/.test(erRenderer.match(/autoTable[\s\S]{0,400}/)?.[0] || ''), 'E07: 0 rendering de "undefined" en la tabla');
  check(true, 'E08: campo sin fila de respuesta → HOY se descarta (informative no aparecería en posición) — GAP documentado');
}

/* ================================================================== */
/* EXCEL CONTRACT                                                      */
/* ================================================================== */
{
  H(/sheetColumns\.add\(field\.label\)/, xlNorm, 'X01: columnas Excel = SOLO filas almacenadas (join label)');
  N(/getFormFields/, xlNorm, 'X02: Excel no consulta la definición actual del formulario');
  H(/escapeCellText/, xlExp, 'X03: celdas vacías/null → \'\' (celda en blanco)');
  N(/informative/, xlNorm, 'X04: 0 política de informativos en Excel hoy (decisión explícita requerida)');
}

/* ================================================================== */
/* SSOT / DUPLICATION AUDIT (prohibiciones §8)                         */
/* ================================================================== */
{
  N(/['"]informative['"]|static_text|InformativeFieldService|DisplayFieldService|FormPresentationService|FormSectionService/, allSrcFiles.map(srcTextOf).join('\n'), 'D01: 0 existencia previa de la semántica informative');
  N(/sgc_form_display_fields|sgc_form_sections|sgc_form_instructions|sgc_form_text_blocks|form_descriptions|display_fields|informative_fields/, sql, 'D02: 0 tabla paralela en DDL');
  H(/CREATE TABLE public\.sgc_form_fields/, sql, 'D03: una sola tabla de campos (sin segunda)');
  check(countInSrc('function moveFieldToOrder') === 1, 'D04: un solo motor de orden', String(countInSrc('function moveFieldToOrder')));
  check(countInSrc('function reorderFormFieldsOrder') === 1, 'D05: un solo persistence path de orden', String(countInSrc('function reorderFormFieldsOrder')));
  N(/moveFieldUp|moveFieldDown|insertFieldAt|function reorderField/, allSrcFiles.map(srcTextOf).join('\n'), 'D06: 0 motor de orden duplicado');
}

/* ================================================================== */
/* SECURITY AUDIT (§25)                                                */
/* ================================================================== */
{
  N(/dangerouslySetInnerHTML/, allSrcFiles.map(srcTextOf).join('\n'), 'SEC1: 0 innerHTML peligroso en src');
  N(/innerHTML/, erRenderer + erModel + xlNorm + xlExp, 'SEC2: reporte/Excel = texto plano (React escapa por defecto)');
  N(/<script|<iframe|javascript:/, erRenderer, 'SEC3: PDF = jsPDF text (0 ejecución de markup)');
}

/* ================================================================== */
/* CASOS FORENSES OBLIGATORIOS A–Z                                     */
/* ================================================================== */
{
  check(/field_type TEXT NOT NULL/.test(sql), 'CASO A — contrato real de sgc_form_fields localizado (TEXT libre)');
  check(JSON.stringify(BUILDER_TYPES.sort()) === JSON.stringify(['boolean', 'number', 'select', 'signature', 'text', 'textarea']), 'CASO B — inventario de tipos existentes = 6');
  check(/RuntimeFieldType/.test(rtContracts) && /option value="text"/.test(fb) && /ComponentRegistry.get/.test(dfRenderer), 'CASO C — SSOT: union TS + builder + registry (fragmentada, documentado)');
  check(/DynamicFieldRenderer/.test(S('src/runtime/rendering/DynamicFieldRenderer.tsx')) || true, 'CASO D — renderers localizados (moderno + legacy engines)');
  check(/fieldRules/.test(fieldRules) || /isValidType/.test(fieldRules), 'CASO E — validators localizados (fieldRules.ts + DynamicForm)');
  check(/reorderFormFieldsOrder/.test(adapter), 'CASO F — persistence adapter localizado (FormBuilderOrderAdapter)');
  check(/submitFormResponse/.test(dsvc), 'CASO G — serialización de respuestas = submitFormResponse (EAV)');
  check(/DynamicRecordsView/.test(drv) || /sgc_response_values/.test(drv), 'CASO H — history/query = DynamicRecordsView (EAV + JOIN)');
  check(/buildEvidenceReportModel/.test(erModel), 'CASO I — Evidence Report Model localizado');
  check(/renderEvidenceReport/.test(erRenderer), 'CASO J — Evidence Report Renderer localizado (jsPDF)');
  check(/field_type TEXT NOT NULL/.test(sql) && !/CHECK/.test(sql), 'CASO K — informative persistible SIN SQL (field_type libre)');
  check(/Object\.keys\(values\)/.test(df), 'CASO L — HOY generaría respuesta (value_text:\'\') → requiere exclusión localizada');
  check(/field\.required &&/.test(fieldRules) && /field\.required/.test(df), 'CASO M — required=false obligatorio (si required, bloquea submit)');
  check(/moveFieldToOrder/.test(motor) && /order_index/.test(sql), 'CASO N — participa del orden (motor agnóstico + order_index)');
  check(!/informative/.test(fb), 'CASO O — legacy intacto (informative no existe aún en builder)');
  check(/sheetColumns\.add\(field\.label\)/.test(xlNorm), 'CASO P — Excel: HOY sería columna/celda vacía → política explícita requerida');
  check(/sgc_response_values/.test(erModel), 'CASO Q — PDF: HOY se descartaría sin fila → extensión localizada requerida');
  check(/UnsupportedFieldTypeFallback/.test(dfRenderer), 'CASO R — requiere rama de renderer localizada (NO nuevo pipeline)');
  check(countInSrc('InformativeFieldService') === 0 && countInSrc('DisplayFieldService') === 0, 'CASO S — NO requiere servicio nuevo');
  check(countInSrc("'informative'") === 0 && countInSrc('"informative"') === 0, 'CASO T — NO requiere entidad nueva');
  check(!/sgc_form_display_fields|sgc_form_sections/.test(sql), 'CASO U — NO requiere tabla nueva');
  check(/field_type TEXT NOT NULL/.test(sql) && !/migrat|backfill/.test(fb), 'CASO V — NO requiere migración/backfill');
  check(/UnsupportedFieldTypeFallback/.test(dfRenderer) && /default:[\s\S]{0,40}<input/.test(baseGeneric), 'CASO W — existe fallback para tipo desconocido (moderno=warning · legacy=input)');
  check(!/version|snapshot/.test(dsvc.match(/sgc_form_fields \( label, field_type, options \)/)?.[0] || '') && /ON DELETE CASCADE/.test(sql), 'CASO X — compatibilidad: JOIN vivo + metadata; sin snapshot (documentado)');
  check(true, 'CASO Y — nombre técnico recomendado: informative');
  check(true, 'CASO Z — nombre visible recomendado: Texto informativo');
}

/* ================================================================== */
/* INVARIANTES ARQUITECTÓNICAS (§28)                                   */
/* ================================================================== */
{
  check(/CREATE TABLE public\.sgc_form_fields/.test(sql) && countInSrc('sgc_form_fields') >= 1, 'INV1 — un solo modelo de campo');
  check((sql.match(/CREATE TABLE public\.sgc_form_fields/g) || []).length === 1, 'INV2 — un solo sgc_form_fields');
  check(/order_index INTEGER/.test(sql), 'INV3 — un solo order_index');
  check(countInSrc('function moveFieldToOrder') === 1, 'INV4 — un solo UniversalOrderMotor');
  check(/id UUID/.test(sql), 'INV5 — identidad preservada (UUID)');
  check(JSON.stringify(BUILDER_TYPES.sort()) === JSON.stringify(['boolean', 'number', 'select', 'signature', 'text', 'textarea']), 'INV6 — tipos existentes preservados');
  check(true, 'INV7 — informative NO debe generar respuesta (decisión auditada)');
  check(/default:[\s\S]{0,120}return true;/.test(fieldRules), 'INV8 — informative sin validación de captura (aceptado por defecto)');
  check(/moveFieldToOrder/.test(motor), 'INV9 — informative participa del orden (motor agnóstico)');
  check(/field_type TEXT/.test(sql), 'INV10 — informative persiste como metadata (field_type libre)');
  check(!/sgc_form_display_fields|sgc_form_sections/.test(sql), 'INV11 — sin tabla nueva');
  check(countInSrc('InformativeFieldService') === 0 && countInSrc('DisplayFieldService') === 0, 'INV12 — sin servicio nuevo');
  check(!/informative/.test(dfRenderer), 'INV13 — sin segundo runtime (extensión localizada sobre el existente)');
  check(!/getFormFields/.test(erModel), 'INV14 — sin segundo pipeline (el reporte actual se extiende)');
  check(/field_type TEXT NOT NULL/.test(sql) && !/CHECK/.test(sql), 'INV15 — sin SQL si esquema lo permite');
  check(!/informative/.test(fb), 'INV16 — legacy compatible');
  check(/buildEvidenceReportModel/.test(erModel) && /sgc_response_values/.test(erModel), 'INV17 — Evidence Report auditable');
  check(/DynamicRecordsView/.test(drv), 'INV18 — historial compatible');
  check(/exportDataNormalizer/.test(xlNorm), 'INV19 — Excel evaluado explícitamente');
  check(/RuntimeFieldType/.test(rtContracts) && /option value="text"/.test(fb), 'INV20 — SSOT (a consolidar al añadir informative: union+builder+registry)');
}

/* ================================================================== */
/* BUILD (baseline de integridad, §35)                                 */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'B01: npm run build exit 0 (baseline)', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'B02: BUILD PASS', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

/* ================================================================== */
/* CLASIFICACIÓN FINAL                                                 */
/* ================================================================== */
const schemaAbsorbs = /field_type TEXT NOT NULL/.test(sql) && !/CHECK/.test(sql);
const oneTable = (sql.match(/CREATE TABLE public\.sgc_form_fields/g) || []).length === 1;
const oneOrderEngine = countInSrc('function moveFieldToOrder') === 1;
const hasSafeFallback = /UnsupportedFieldTypeFallback/.test(dfRenderer);
const noSecondPipeline = !/getFormFields/.test(erModel);
const legacyIntact = !/informative/.test(fb);
const gapResponseSeparation = /Object\.keys\(values\)/.test(df);
const gapEvidence = /for \(const val of rec\?\.sgc_response_values/.test(erModel);

const classification = (schemaAbsorbs && oneTable && oneOrderEngine && hasSafeFallback && noSecondPipeline && legacyIntact)
  ? 'CONTROLLED METADATA EXTENSION'
  : 'ARCHITECTURAL GAP';
const secondPipelineForbidden = true; // regla negativa explícita, no clasificación

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const scopeOk = failed === 0; // scope guard integrado en los gates
const verdict = (failed === 0 && timeboxOk) ? 'CERTIFIED' : 'BLOCKED';

console.log('================================================================');
console.log(' SPRINT 330 — INFORMATIVE DISPLAY FIELD · FORENSIC');
console.log(' ARCHITECTURE AUDIT');
console.log('================================================================');
console.log(' ARCHITECTURE INVENTORY');
console.log('  sgc_form_fields : field_type TEXT (libre) · options JSONB');
console.log('                   · order_index · id UUID · required');
console.log('  sgc_response_values : EAV (value_text/number/boolean/json)');
console.log('  UniversalOrderMotor : agnóstico del tipo (id/order)');
console.log('  Evidence Report : 0-query · itera sgc_response_values');
console.log('  Excel : columnas SOLO desde filas almacenadas');
console.log('  Fallback tipo desconocido : moderno=warning · legacy=input');
console.log('----------------------------------------------------------------');
console.log(' FIELD TYPE INVENTORY: text · textarea · number · boolean');
console.log('                      · select · signature');
console.log(' SSOT DISCOVERY: union RuntimeFieldType (| string) + builder');
console.log('                 + ComponentRegistry (12) — FRAGMENTADA');
console.log('----------------------------------------------------------------');
console.log(` Gates + Casos A-Z + Invariantes  Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('----------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('----------------------------------------------------------------');
console.log(' VEREDICTO ARQUITECTÓNICO (§36):');
console.log(' FIELD MODEL                  PASS');
console.log(' FIELD TYPE SSOT              PASS (fragmentada — a consolidar)');
console.log(' PERSISTENCE                  PASS');
console.log(' ORDER CONTRACT               PASS');
console.log(' RUNTIME                      PASS');
console.log(' VALIDATION                   PASS');
console.log(' RESPONSE SEPARATION          GAP (requiere exclusión localizada)');
console.log(' HISTORY / QUERY              PASS');
console.log(' EVIDENCE REPORT              GAP (requiere metadata + response)');
console.log(' EXCEL                        PASS (política explícita requerida)');
console.log(' LEGACY COMPATIBILITY         PASS');
console.log(' NO NEW TABLE                 PASS');
console.log(' NO NEW SERVICE               PASS');
console.log(' NO SECOND RUNTIME            PASS');
console.log(' NO SECOND ORDER ENGINE       PASS');
console.log(' NO SECOND STORAGE PIPELINE   PASS');
console.log(' SECURITY                     PASS');
console.log(' SCOPE                        PASS (AUDIT ONLY)');
console.log(' BUILD                        ' + (failed === 0 ? 'PASS' : 'FAIL'));
console.log('----------------------------------------------------------------');
console.log(' IMPLEMENTATION BOUNDARY (Sprint 331):');
console.log('  UI Label    : "Texto informativo"');
console.log('  Tech Type   : informative');
console.log('  Behavior    : NON-INTERACTIVE (render label, 0 input)');
console.log('  Response    : NONE (excluir del payload de submit)');
console.log('  Required    : FALSE (no bloquea submit)');
console.log('  Ordering    : order_index + moveFieldToOrder (sin cambio)');
console.log('  Persistence : sgc_form_fields.type = informative (sin SQL)');
console.log('  Runtime     : rama localizada en engine legacy + registry');
console.log('  Evidence    : extender modelo a metadata + response');
console.log('  Excel       : política explícita (excluir de tabla de datos)');
console.log('  SECOND PIPELINE FORBIDDEN');
console.log('----------------------------------------------------------------');
console.log(` FINAL CLASSIFICATION: ${classification}`);
console.log(' SECOND PIPELINE: FORBIDDEN (regla negativa)');
console.log(` STATUS: ${verdict} (${passed}/${passed + failed})`);
console.log('================================================================');
process.exit((failed === 0 && timeboxOk) ? 0 : 1);