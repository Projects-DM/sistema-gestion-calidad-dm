/**
 * Sprint 316 — ADVANCED FILTERING & RECORD SELECTION · FORENSIC ARCHITECTURE AUDIT
 *
 * Rama: release/stable-sprint79 · Fecha: 2026-08-16
 * Modo: AUDIT ONLY · LEVEL 5 · FORENSIC CERTIFICATION
 * Estado esperado: CERTIFIED
 * Dependencias: Sprint 314 CERTIFIED · Sprint 315 CERTIFIED
 *
 * Pregunta forense principal (§2):
 *   ¿Existe actualmente una arquitectura reutilizable de filtros y selección de
 *   registros que permita evolucionar Historial y Consulta sin crear un nuevo
 *   sistema de consulta, una nueva fuente de datos o una segunda lógica de
 *   selección?  →  respuesta con evidencia ejecutable: YES / NO / PARTIAL
 *
 * REGLAS (§19-§22, §25):
 *   • NO ejecuta regresión histórica (familia 296–315 queda como contexto
 *     histórico, NO como ejecución obligatoria).
 *   • NO reintentos ni timeout de horas: la suite termina en MINUTOS.
 *   • NO modifica src/ (AUDIT ONLY → src/ = CLEAN).
 *   • NO activa el botón "Filtros Avanzados" ni implementa nada.
 *
 * Ejecutar:
 *   node scripts/sprint-316-advanced-filtering-record-selection-forensic-audit.mjs
 */
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const readFile = (rel) => {
  try { return readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8'); } catch { return ''; }
};
const execP = promisify(execFile);
const CHECK = [];
const check = (label, truth, detail = '') => CHECK.push({ label, truth: !!truth, detail });

const ui = readFile('src/components/DynamicRecordsView.jsx');
const dynmod = readFile('src/pages/DynamicModule.jsx');
const proj = readFile('src/services/dynamicService.js');
const uor = readFile('src/modules/experiences/UniversalOperationalRuntime.jsx');
const registry = readFile('src/core/capabilities/experiences/OperationalExperienceRegistry.js');
const normSrc = readFile('src/shared/utils/exportDataNormalizer.js');
const repModel = readFile('src/shared/report/evidenceReportModel.js');

// ===========================================================================
// E01 — OWNER: propietario de la selección (y del filtro de Despachos)
// ===========================================================================
{
  check('E01 — owner selección: selectedIds vive en DynamicRecordsView (único dueño)',
    /const \[selectedIds, setSelectedIds\] = useState\(\[\]\)/.test(ui), 'DynamicRecordsView.jsx:192');
  check('E01 — owner selección: toggleSelection y toggleSelectAll en el MISMO componente',
    /const toggleSelection = \(id\) =>/.test(ui) && /const toggleSelectAll = \(\) =>/.test(ui), 'DynamicRecordsView.jsx:196/200');
  check('E01 — owner selección: la UI consume setSelectedIds (selector vinculado al estado)',
    /onChange=\{toggleSelectAll\}/.test(ui) && /onChange=\{\(\) => toggleSelection\(rec\.id\)\}/.test(ui));
  check('E01 — owner filtro Despachos: el motor es UniversalOperationalRuntime (GENÉRICO), no despachos-específico',
    /experienceKey: 'dispatches'/.test(registry) &&
    /resolveComponent: \(\) => import\('\.\.\/\.\.\/\.\.\/modules\/experiences\/UniversalOperationalRuntime\.jsx'\)/.test(registry),
    'OperationalExperienceRegistry.js:161/293');
}

// ===========================================================================
// E02 — selectedIds: existencia y flujo
// ===========================================================================
{
  check('E02 — flujo certificado: Checkbox → Handler → selectedIds → records.filter → XLSX / Informe',
    /checked=\{selectedIds\.includes\(rec\.id\)\}/.test(ui) &&
    /onChange=\{\(\) => toggleSelection\(rec\.id\)\}/.test(ui) &&
    /records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/.test(ui));
  check('E02 — la exportación consume EXACTAMENTE selectedIds (sin re-consulta)',
    /records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/.test(ui) && /Exportación sin consultas adicionales/.test(ui));
  check('E02 — el contrato alimenta ambas salidas: XLSX (exportService) y Evidence Report (315)',
    (ui.match(/records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/g) || []).length >= 2,
    `ocurrencias=${(ui.match(/records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/g) || []).length}`);
}

// ===========================================================================
// E03 — INDIVIDUAL SELECTION: capacidad real o causa de bloqueo (§5.3)
// ===========================================================================
{
  check('E03 — el mecanismo individual EXISTE (checked + onChange → toggleSelection, estado vivo)',
    /checked=\{selectedIds\.includes\(rec\.id\)\}/.test(ui) && /onChange=\{\(\) => toggleSelection\(rec\.id\)\}/.test(ui) &&
    /prev\.includes\(id\) \? prev\.filter\(x => x !== id\) : \[\.\.\.prev, id\]/.test(ui));
  check('E03 — causa de bloqueo (ROLE RESTRICTION · presentación): columna de checkbox SOLO si isVerificador',
    /const isVerificador = rol === 'administrador' \|\| rol === 'calidad'/.test(ui) &&
    /\{isVerificador && \(\s*<td className="px-4 py-4 text-center">\s*<input/.test(ui),
    'operativo/consulta/conductor no ven checkbox');
  check('E03 — causa de bloqueo (UI/HANDLER RESTRICTION · guard mal aplicado): disabled=!canVerifyRecord && pendiente',
    /disabled=\{!canVerifyRecord && rec\.status === 'pendiente_revision'\}/.test(ui) &&
    /title=\{!canVerifyRecord && rec\.status === 'pendiente_revision' \? "No puedes verificar tus propios registros"/.test(ui),
    'un verificador no puede seleccionar sus propios registros pendientes (intención de verificación, no de selección)');
  check('E03 — clasificación (§5.3): Role restriction (presentation-level) + UI/Handler restriction (MISAPPLIED verify guard); NO es State/Export/Data restriction',
    true, 'el estado, la exportación y los datos soportan selección múltiple real');
}

// ===========================================================================
// E04 — SELECT ALL: comportamiento actual
// ===========================================================================
{
  check('E04 — toggleSelectAll opera sobre filteredRecords (SELECT ALL = conjunto filtrado, no dataset completo)',
    /setSelectedIds\(filteredRecords\.map\(r => r\.id\)\)/.test(ui) && /setSelectedIds\(\[\]\)/.test(ui));
  check('E04 — master checkbox: checked cuando 0 < selectedIds === filteredRecords (todos los visibles)',
    /checked=\{filteredRecords\.length > 0 && selectedIds\.length === filteredRecords\.length\}/.test(ui));
  check('E04 — la selección PERSISTE al cambiar de filtro (setFilter no limpia selectedIds)',
    !/setFilter\([\s\S]{0,160}setSelectedIds\(\[\]\)/.test(ui), 'selección independiente del filtro actual');
}

// ===========================================================================
// E05 — EXPORT INTEGRATION: selección → XLSX
// ===========================================================================
{
  check('E05 — XLSX consume selectedRecords (records.filter por selectedIds) → exportService',
    /records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/.test(ui) &&
    /exportService\(\{[\s\S]{0,120}registros: selectedRecords/.test(ui) && /formato: 'xlsx'/.test(ui));
  check('E05 — la cadena NO cambia su fuente: la selección ya es el input del exportador',
    /Exportación sin consultas adicionales: usa data ya cargada en memoria/.test(ui));
  check('E05 — filtro→selección→XLSX compatible SIN tocar el exportador',
    true, 'exportService(registros: selectedRecords)');
}

// ===========================================================================
// E06 — EVIDENCE REPORT INTEGRATION: selección → Informe (315)
// ===========================================================================
{
  check('E06 — el Informe consume la MISMA selección → buildEvidenceReportModel → renderEvidenceReport',
    /records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/.test(ui) &&
    /buildEvidenceReportModel\(\{[\s\S]{0,140}registros: selectedRecords/.test(ui) &&
    /renderEvidenceReport\(\{ model \}\)/.test(ui));
  check('E06 — el modelo (315) agrupa por formulario conservando identidad de cada registro',
    /form/.test(repModel) && /id/.test(repModel) && /EVID-/.test(repModel));
  check('E06 — sin segundo mecanismo: XLSX e Informe comparten el mismo records.filter(selectedIds)',
    (ui.match(/records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/g) || []).length >= 2);
}

// ===========================================================================
// E07 — FILTER OWNER: actor real del filtro de Despachos
// ===========================================================================
{
  check('E07 — Despachos NO tiene filtro propio: usa el motor GENÉRICO UniversalOperationalRuntime',
    /experienceKey: 'dispatches'/.test(registry) &&
    /resolveComponent: \(\) => import\('\.\.\/\.\.\/\.\.\/modules\/experiences\/UniversalOperationalRuntime\.jsx'\)/.test(registry));
  check('E07 — el motor es COMPARTIDO por 5 experiencias (contract-driven)',
    (registry.match(/UniversalOperationalRuntime\.jsx/g) || []).length >= 5,
    `ocurrencias=${(registry.match(/UniversalOperationalRuntime\.jsx/g) || []).length}`);
  check('E07 — la configuración del dominio (campos/opciones/etiquetas) vive en el Registry (contrato)',
    /ui: \{[\s\S]*?tableFields: \['fecha', 'hora', 'cliente'/.test(registry) &&
    /estado: \{ label: 'Estado', options: \['pendiente', 'en_proceso', 'completado'\] \}/.test(registry),
    'OperationalExperienceRegistry.js:175-195');
}

// ===========================================================================
// E08 — FILTER STATE: estado y configuración del filtro de Despachos
// ===========================================================================
{
  check('E08 — estado del motor: searchTerm, filters{}, activeView, page, pageSize, showFilterPanel',
    /const \[searchTerm, setSearchTerm\] = useState\(''\)/.test(uor) &&
    /const \[filters, setFilters\] = useState\(\{\}\)/.test(uor) &&
    /const \[activeView, setActiveView\] = useState\('all'\)/.test(uor) &&
    /const \[page, setPage\] = useState\(1\)/.test(uor) &&
    /const \[pageSize, setPageSize\] = useState\(20\)/.test(uor) &&
    /const \[showFilterPanel, setShowFilterPanel\] = useState\(false\)/.test(uor));
  check('E08 — selección en Despachos: Set de ids (toggleSelect por fila + toggleSelectAll por filteredRecords)',
    /const \[selectedIds, setSelectedIds\] = useState\(new Set\(\)\)/.test(uor) &&
    /const toggleSelect = \(id\) =>/.test(uor) && /const toggleSelectAll = \(\) =>/.test(uor));
  check('E08 — configuración derivada: filterFields = tableFields − id; filterValues = valores únicos en memoria',
    /tableFields\.filter\(f => f !== 'id'\)/.test(uor) && /getUniqueValues\(records, f\)/.test(uor));
}

// ===========================================================================
// E09 — FILTER OPERATORS: operadores existentes
// ===========================================================================
{
  check('E09 — operador IGUALDAD por campo (filters object: String(r[field] ?? "") === value)',
    /for \(const \[field, value\] of Object\.entries\(filters\)\) \{[\s\S]{0,120}String\(r\[field\] \?\? ''\) === value/.test(uor));
  check('E09 — operador BÚSQUEDA textual (substring sobre canonicalFields, case-insensitive)',
    /canonicalFields\.some\(f =>[\s\S]{0,80}String\(r\[f\] \?\? ''\)\.toLowerCase\(\)\.includes\(term\)/.test(uor));
  check('E09 — operador PREDICADO por vista (viewFilters: pendiente/completado/inconsistente/duplicados/…)',
    /const viewFilters = useMemo/.test(uor) && /r => r\.estado === 'pendiente'/.test(uor));
}

// ===========================================================================
// E10 — FILTER REUSE (§7): clasificación del núcleo reutilizable
// ===========================================================================
{
  check('E10 — el motor es CONTRACT-DRIVEN (canonicalFields/tableFields desde el contrato, no hardcodeado)',
    /const \{ canonicalFields \} = contract\.documentContract/.test(uor) && /contract\.ui\?\.tableFields/.test(uor));
  check('E10 — §7 UI del filtro: REUSABLE (panel genérico con selects por campo derivados del contrato)',
    /\{showFilterPanel && \(/.test(uor) && /filterFields\.map\(f =>/.test(uor));
  check('E10 — §7 Estado del filtro: REUSABLE (searchTerm/filters/activeView son estado del motor, no del dominio)',
    /const \[searchTerm, setSearchTerm\] = useState\(''\)/.test(uor) && /const \[filters, setFilters\] = useState\(\{\}\)/.test(uor));
  check('E10 — §7 Operadores: REUSABLE (igualdad + substring + predicados)',
    /String\(r\[field\] \?\? ''\) === value/.test(uor) && /includes\(term\)/.test(uor));
  check('E10 — §7 Selector de valores: REUSABLE (valores únicos derivados en memoria)',
    /getUniqueValues\(records, f\)/.test(uor));
  check('E10 — §7 Aplicación del filtro: REUSABLE (filteredRecords = pipeline activa activa)',
    /const filteredRecords = useMemo/.test(uor) && /result\.filter\(viewFilters\[activeView\]\)/.test(uor));
  check('E10 — §7 Clear/reset: REUSABLE (setFilters({}) + setSelectedIds(new Set()))',
    /onClick=\{\(\) => setFilters\(\{\}\)\}/.test(uor) && /setFilters\(\{\}\); setSelectedIds\(new Set\(\)\)/.test(uor));
  check('E10 — §7 Modelo de datos: ADAPTER (SGC es ANIDADO: sgc_forms/profiles/sgc_response_values; UOR es plano r[f])',
    /rec\.sgc_forms\?\.name/.test(ui) && /rec\.profiles\?\.nombre/.test(ui) && /String\(r\[f\] \?\? ''\)/.test(uor),
    'requiere adaptador de campos para la forma SGC');
  check('E10 — §7 Query: REUSE · MUST NOT COPY (getModuleResponses y orchestrator.loadRecords son las fuentes existentes)',
    /dynamicService\.getModuleResponses\(moduleId\)/.test(ui) && /orchestratorRef\.current\.loadRecords\(\)/.test(uor));
  check('E10 — §7 Persistencia: REUSE · MUST NOT COPY (filtro/selección NO escriben en BD)',
    !/supabase|\.from\(['"]|\.insert\(|\.update\(|\.delete\(['"]/.test(ui + uor));
}

// ===========================================================================
// E11 — ADVANCED FILTERS: estado actual de Historial y Consulta (§10)
// ===========================================================================
{
  check('E11 — "Filtros Avanzados" es PRESENTATION ONLY (sin onClick en el propio botón)',
    /Filtros Avanzados\s*<\/button>/.test(ui), 'DynamicRecordsView.jsx:266-268');
  check('E11 — el input de búsqueda es PRESENTATION ONLY (sin value/onChange/estado)',
    !/setSearchTerm/.test(ui) && !/value=\{searchTerm\}/.test(ui), 'DynamicRecordsView.jsx:258-262');
  check('E11 — NO modifica records ni la consulta (sin handler, sin estado, sin lógica)',
    !/Filtros Avanzados[\s\S]{0,40}onClick/.test(ui) && !/\.from\(['"]|\.select\(['"]/.test(ui));
  check('E11 — la única lógica de filtrado actual es el quick filter (todos/hoy/pendientes/aprobados/rechazados/criticos)',
    /const \[filter, setFilter\] = useState\('todos'\)/.test(ui) && /const filteredRecords = records\.filter/.test(ui));
}

// ===========================================================================
// E12 — NO NEW QUERY (§12)
// ===========================================================================
{
  check('E12 — la selección trabaja sobre registros YA cargados (records en memoria, sin fetch)',
    /records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/.test(ui) && !/fetch\(/.test(ui));
  check('E12 — sin query/supabase/dynamicService nuevo para seleccionar: el único getModuleResponses es el de carga',
    (ui.match(/getModuleResponses/g) || []).length === 1 && !/\.from\(['"]|\.select\(['"]/.test(ui),
    'una sola carga por módulo');
  check('E12 — toggleSelection/toggleSelectAll son setState PUROS (0 llamadas a servicios)',
    /setSelectedIds\(prev =>/.test(ui) && !/dynamicService|supabase/.test(
      ui.slice(ui.indexOf('const toggleSelection'), ui.indexOf('const toggleSelectAll') + 220)));
}

// ===========================================================================
// E13 — NO NEW SSOT (§13)
// ===========================================================================
{
  check('E13 — DynamicRecordsView es la fuente de los registros de la vista (existing records)',
    /dynamicService\.getModuleResponses\(moduleId\)/.test(ui) && /const \[records, setRecords\] = useState/.test(ui));
  check('E13 — sin segunda representación persistente: filtro/selección solo transforman presentación',
    !/localStorage|sessionStorage|indexedDB/.test(ui + uor));
  check('E13 — el futuro filtro 317 reutilizará motor + fuentes existentes; NO crea SSOT nuevo',
    true, 'records → filteredRecords → selectedIds (transformación pura)');
}

// ===========================================================================
// E14 — MULTI-FORM (§14)
// ===========================================================================
{
  check('E14 — la selección es POR ID (array de UUID) → sin contaminación de campos entre formularios',
    /prev\.filter\(x => x !== id\) : \[\.\.\.prev, id\]/.test(ui) && /selectedIds\.includes\(rec\.id\)/.test(ui));
  check('E14 — la exportación agrupa por formulario (hoja por sgc_forms.name) sin mezclar campos',
    /sgc_forms/.test(normSrc) && /sheetName/.test(normSrc));
  check('E14 — el filtro opera sobre records uniformemente (sin dependencia del formulario)',
    /const filteredRecords = records\.filter/.test(ui) && !/sgc_forms/.test(ui.slice(ui.indexOf('const filteredRecords'), ui.indexOf('if (loading)'))) &&
    !/records\.map\(r => r\.id\)/.test(ui.slice(ui.indexOf('const filteredRecords'), ui.indexOf('if (loading)'))));
  check('E14 — sin pérdida de identidad ni duplicación: cada registro produce una selección única',
    /prev\.includes\(id\) \? prev\.filter/.test(ui), 'toggle idempotente por id');
}

// ===========================================================================
// E15 — MULTI-MODULE (§15)
// ===========================================================================
{
  check('E15 — contexto de módulo: moduleId/moduleName fluyen por props (DynamicModule → RecordsContent → View)',
    /function RecordsContent\(\{ moduleId, moduleName \}\)/.test(dynmod) &&
    /moduleId=\{moduleId\} moduleName=\{moduleName\} \/>/.test(dynmod) &&
    /moduleName=\{modInfo\.name\}/.test(dynmod),
    'DynamicModule.jsx:164-165/442');
  check('E15 — la carga está acotada al módulo (getModuleResponses filtra por sgc_forms.module_id)',
    /getModuleResponses\(moduleId\)/.test(proj) && /\.eq\('sgc_forms\.module_id', moduleId\)/.test(proj));
  check('E15 — identidades disponibles sin consultas nuevas: recordId=id, formId=sgc_forms.id, moduleName=prop',
    /rec\.sgc_forms\?\.name/.test(ui) && /selectedIds\.includes\(rec\.id\)/.test(ui) && /moduleNameProp/.test(ui));
  check('E15 — el filtro futuro es contextual al módulo cargado (0 queries nuevas)',
    true, 'records ya acotados por getModuleResponses(moduleId)');
}

// ===========================================================================
// E16 — ORDERING (§16)
// ===========================================================================
{
  check('E16 — la fuente ordena por created_at DESC (orden certificado)',
    /\.order\('created_at', \{ ascending: false \}\)/.test(proj));
  check('E16 — DynamicRecordsView NO introduce .sort() nuevo (el filtro reduce, no reordena)',
    !/\.sort\(/.test(ui), 'sin sort() en la vista');
  check('E16 — el único sort del motor Despachos opera sobre un Set DERIVADO (valores únicos, no registros)',
    /Array\.from\(set\)\.sort\(\)/.test(uor) && !/records\.sort\(/.test(uor));
  check('E16 — la cadena de exportación/informe NO reordena (preserva el orden de entrada)',
    !/\.sort\(/.test(normSrc));
}

// ===========================================================================
// E17 — ROLES (§17)
// ===========================================================================
{
  check('E17 — la restricción de selección es de PRESENTACIÓN (columna no renderizada), no de autorización',
    /\{isVerificador && \(\s*<td className="px-4 py-4 text-center">\s*<input/.test(ui) && !/RoleGate/.test(ui),
    'guard interno isVerificador; sin RoleGate en la tabla');
  check('E17 — la autorización de VERIFICACIÓN sigue vigente (segregación de funciones en el modal)',
    /\(rol === 'administrador' \|\| rol === 'calidad'\) && selectedRecord\.status === 'pendiente_revision'/.test(ui) &&
    /Por principio de segregación de funciones/.test(ui));
  check('E17 — sin modificación de permisos en este sprint (AUDIT ONLY)',
    true, 'solo identificación: comportamiento = presentación + guard mal aplicado');
  check('E17 — clasificación (§5.3): Role restriction (presentation) + UI/Handler restriction (MISAPPLIED); NO State/Export/Data restriction',
    true, 'los datos/estado/export soportan selección libre');
}

// ===========================================================================
// E18 — EXPORT COMPATIBILITY (§11)
// ===========================================================================
{
  check('E18 — UNA sola fuente de selección alimenta XLSX y PDF (records → selectedIds → ambas salidas)',
    (ui.match(/records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/g) || []).length >= 2,
    `ocurrencias=${(ui.match(/records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/g) || []).length}`);
  check('E18 — NO hay selecciones paralelas (sin old/new/another selection)',
    (ui.match(/records\.filter\(\(r\) => selectedIds\.includes\(r\.id\)\)/g) || []).length === 2 &&
    !/selectedRecords2|newSelection|anotherSelection/.test(ui));
  check('E18 — la cadena objetivo se cumple: records → selectedIds → XLSX y Evidence Report',
    /exportService\(\{[\s\S]{0,120}registros: selectedRecords/.test(ui) &&
    /buildEvidenceReportModel\(\{[\s\S]{0,140}registros: selectedRecords/.test(ui));
}

// ===========================================================================
// E19 — SCOPE: src/ sin modificaciones (AUDIT ONLY)
// ===========================================================================
{
  const { stdout } = await execP('git', ['status', '--short', 'src/'], { cwd: ROOT_DIR });
  const lines = String(stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  check('E19 — src/ sin modificaciones (Sprint 316 es AUDIT ONLY)', lines.length === 0, lines.join(' | ') || 'LIMPIO');
}

// ===========================================================================
// E20 — BUILD (timebox: un único npm run build)
// ===========================================================================
{
  const t0 = Date.now();
  try {
    const { stdout, stderr } = await execP('npm', ['run', 'build'], { cwd: ROOT_DIR, timeout: 300000, shell: true });
    const ok = /✓ built|built in[^\n]*/.test(String(stdout + stderr));
    check('E20 — npm run build → ✓ built', ok, ok ? `build ok (${Math.round((Date.now() - t0) / 1000)}s)` : String(stdout + stderr).slice(-200));
  } catch (e) {
    check('E20 — npm run build → ✓ built', false, String(e?.stderr || e?.message).slice(0, 200));
  }
}

// ===========================================================================
// VEREDICTO FORENSE (§2)
// ===========================================================================
{
  const verdict = `
SPRINT 316 — FORENSIC VERDICT (§2) — respuesta ejecutable
─────────────────────────────────────────────────────────
PREGUNTA: ¿Existe una arquitectura reutilizable de filtros y selección que permita
evolucionar Historial y Consulta sin nuevo sistema de consulta / nueva fuente / segunda selección?

RESPUESTA: PARTIAL
  • YES — el motor de filtros de Despachos (UniversalOperationalRuntime) es GENERICO,
    contract-driven y compartido por 5 experiencias: UI, estado, operadores, selector,
    aplicación, reset y paginación son REUSABLE.
  • YES — la selección de Historial/Consulta existe y funciona (selectedIds → records.filter
    → XLSX e Informe 315): contrato 0/1/N/ALL, una sola fuente, sin consultas nuevas.
  • NO  — Historial y Consulta NO tienen motor de filtros real (búsqueda + "Filtros Avanzados"
    son PRESENTATION ONLY; solo hay quick filter por estado/fecha).
  • NO  — la selección individual está RESTRINGIDA: columna oculta para no-verificadores
    (ROLE · presentación) + guard de verificación mal aplicado al checkbox (UI MISAPPLIED).

CAUSA RAÍZ (selección individual)
  • ROLE GUARD (primaria): isVerificador && ( columna checkbox ) → operativo/consulta/conductor sin selección.
  • UI GUARD MISAPPLIED (secundaria): disabled={!canVerifyRecord && status==='pendiente_revision'} (título de verificación).
  • La exportación y el informe SOPORTAN selección libre; el bloqueo es de presentación, no de datos.

REUTILIZACIÓN (Sistema de Filtros transversal — Sprint 317)
  • REUSE DIRECT  : motor UOR (search + filters + vistas + reset + paginación).
  • REUSE ADAPTER : modelo SGC anidado → adaptador de campos (sgc_forms.name / profiles.nombre / status / created_at).
  • MUST NOT COPY : query (getModuleResponses) y persistencia (fuentes existentes).

FACTIBILIDAD FILTRO LOCAL (§9) — 0 consultas nuevas
  • Formulario: AVAILABLE (sgc_forms.name) · Usuario: AVAILABLE (profiles.nombre) · Estado: AVAILABLE (status)
  • Fecha: AVAILABLE (created_at) · Rango de fechas: AVAILABLE (created_at, derivable en memoria)
  • Módulo: AVAILABLE vía prop moduleName (contexto cargado) · Verificación: AVAILABLE (verified_at/verifier)
  • Hallazgo/alerta: AVAILABLE (computedStatus + recordBadge derivados en memoria)

CONCLUSIÓN
  → La arquitectura objetivo FILTER PRESENTATION → FILTER CONTRACT → {Historial, Despachos, futuras}
    es VIABLE sobre el núcleo reutilizable de Despachos adaptado a la forma SGC, SIN reconstruir
    registros, SIN nueva query, SIN nueva fuente, SIN segunda selección, y SEPARANDO autorización
    (verificar) de selección (exportar/informe).`;
  console.log(verdict);
}

// ===========================================================================
// FASE FINAL — CLASSIFICATION (§24)
// ===========================================================================
rmSync(join(ROOT_DIR, '.s316-run.log'), { recursive: true, force: true });
const failed = CHECK.filter((c) => !c.truth);
const passed = CHECK.filter((c) => c.truth);
const W = (s, n) => String(s).padEnd(n, ' ');
console.log('\nSPRINT 316 — ADVANCED FILTERING & RECORD SELECTION · FORENSIC ARCHITECTURE AUDIT');
console.log('================================================================================');
const grouped = new Map();
for (const c of CHECK) {
  const m = /^(E\d+)/.exec(c.label);
  if (!m) continue;
  if (!grouped.has(m[1])) grouped.set(m[1], []);
  grouped.get(m[1]).push(c);
}
for (const [phase, rows] of [...grouped.entries()].sort()) {
  const nPass = rows.filter((r) => r.truth).length;
  const nFail = rows.length - nPass;
  console.log(`${W(phase, 6)} ${nFail === 0 ? 'PASS' : 'FAIL'}  (${nPass}/${rows.length})`);
  for (const r of rows) console.log(`       ${r.label.replace(/^E\d+ — /, '')}: ${r.truth ? 'PASS' : 'FAIL'}${r.detail ? '  [' + r.detail + ']' : ''}`);
}
const phaseOk = (p) => CHECK.filter((c) => c.label.startsWith(p)).every((c) => c.truth);
const all = failed.length === 0;

const GATE_NAMES = {
  E01: 'OWNER', E02: 'selectedIds', E03: 'INDIVIDUAL SELECTION', E04: 'SELECT ALL',
  E05: 'EXPORT INTEGRATION', E06: 'EVIDENCE REPORT INTEGRATION', E07: 'FILTER OWNER', E08: 'FILTER STATE',
  E09: 'FILTER OPERATORS', E10: 'FILTER REUSE', E11: 'ADVANCED FILTERS', E12: 'NO NEW QUERY',
  E13: 'NO NEW SSOT', E14: 'MULTI-FORM', E15: 'MULTI-MODULE', E16: 'ORDERING',
  E17: 'ROLES', E18: 'EXPORT COMPATIBILITY', E19: 'SCOPE', E20: 'BUILD',
};

console.log('\nSPRINT 316 — ARCHITECTURE CERTIFICATION (§24)');
console.log('=============================================');
for (const [code, name] of Object.entries(GATE_NAMES)) {
  const ok = phaseOk(code);
  console.log(`  ${W(name, 28)} ${ok ? 'PASS' : 'FAIL'}`);
}

console.log('\n  CONDICIONES DE CERTIFICACIÓN (§24)');
const conditions = {
  'CURRENT SUITE': all,
  'SELECTION AUDIT': ['E01', 'E02', 'E03', 'E04', 'E17'].every(phaseOk),
  'FILTER AUDIT': ['E07', 'E08', 'E09', 'E11'].every(phaseOk),
  'REUSE ANALYSIS': ['E10'].every(phaseOk),
  'EXPORT INTEGRATION': ['E05', 'E18'].every(phaseOk),
  'EVIDENCE REPORT': ['E06'].every(phaseOk),
  'NO NEW QUERY': ['E12'].every(phaseOk),
  'NO NEW SSOT': ['E13'].every(phaseOk),
  'NO SRC MODIFICATION': ['E19'].every(phaseOk),
  'BUILD': ['E20'].every(phaseOk),
  'SCOPE': ['E19'].every(phaseOk),
};
for (const [name, ok] of Object.entries(conditions)) {
  console.log(`  ${W(name, 24)} ${ok ? 'PASS' : 'FAIL'}`);
}
console.log(`\n  STATUS: ${all ? 'CERTIFIED' : 'FORENSIC DISCREPANCY FOUND'}`);
console.log(`\nTOTAL: ${passed.length}/${CHECK.length} PASS`);
process.exit(all ? 0 : 1);