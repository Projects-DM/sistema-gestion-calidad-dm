/**
 * SPRINT 342 — DISPATCH BATCH LOT ASSIGNMENT ARCHITECTURE AUDIT
 * LEVEL 5 · AUDIT ONLY · Production Source Changes: 0
 *
 * Objetivo: certificar con evidencia cómo opera la arquitectura de Despachos
 * respecto a (a) el estado de selección batch, (b) las acciones bulk existentes,
 * (c) la ruta de asignación de lote (per-record/import) y (d) la ausencia de
 * una vía batch de asignación de lote.
 *
 * Clasificación esperada: la auditoría documenta el CONTRATO EXISTENTE. No
 * existe capacidad de asignación de lote en batch (gap arquitectónico
 * documentado); las operaciones bulk son SOLO estado/delete.
 *
 * SALIDA: BATCH LOT ASSIGNMENT — NOT IMPLEMENTED (documented gap)
 *         BATCH SCOPE — STATUS/DELETE ONLY
 *         AUDIT ONLY — 0 production source changes
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

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

// ---------------------------------------------------------------------------
// Fuentes auditadas (0 imports de runtime: auditoría estática determinística)
// ---------------------------------------------------------------------------
const runtime = S('src/modules/experiences/UniversalOperationalRuntime.jsx');
const orch = S('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js');
const service = S('src/services/operationalRecordsService.js');
const registry = S('src/core/capabilities/experiences/OperationalExperienceRegistry.js');
const completion = S('src/core/capabilities/experiences/OperationalDataCompletion.js');
const audit = S('src/services/operationalAuditService.js');
const adapter = S('src/shared/report/dispatchEvidenceAdapter.js');
const dispatchConfig = S('src/config/dispatchesConfig.js');

// Secciones recortadas (confinan las aserciones a su contexto real).
const slice = (src, from, to) => {
  const i = src.indexOf(from);
  const j = src.indexOf(to, i > -1 ? i : 0);
  return (i > -1 && j > i) ? src.slice(i, j) : '';
};
const runtimeBulk = slice(runtime, '{/* Bulk actions bar */}', '{/* Table */}');
const runtimeForm = slice(runtime, 'const handleSubmit', 'const handleDelete');
const orchImport = slice(orch, 'async importRecords', '// Export');
const orchDelete = slice(orch, 'async bulkDelete', 'destroy()');
const dispatchContract = slice(registry, "experienceKey: 'dispatches',", "experienceKey: 'inventarios',");
const registryCanonical = slice(dispatchContract, 'canonicalFields: [', 'synonyms: {');
const registryValidation = slice(dispatchContract, 'validationRules: {', 'businessRules: [');
const coreFiles = [runtime, orch, service, registry, completion, adapter].join('\n');

/* ================= Q01–Q12: PREGUNTAS DE AUDITORÍA ================= */
{
  // Q01 — estado de selección batch.
  H(/const \[selectedIds, setSelectedIds\] = useState\(new Set\(\)\)/, runtime, 'Q01: selección = Set React (selectedIds)');
  // Q02 — toggles individual y total.
  H(/const toggleSelect = \(id\) => \{/, runtime, 'Q02: toggle individual por fila');
  H(/const toggleSelectAll = \(\) => \{/, runtime, 'Q02b: toggle total');
  // Q03 — acciones batch expuestas en el UI.
  H(/Cambiar estado\.\.\./, runtimeBulk, 'Q03: select "Cambiar estado..." en bulk bar');
  H(/handleBulkDelete/, runtimeBulk, 'Q03b: botón "Eliminar" en bulk bar');
  N(/lote/i, runtimeBulk, 'Q03c: sin ninguna acción de lote en la bulk bar');
  // Q04 — conjunto de operación (selectedIds exacto; evidencia = intersección).
  H(/Array\.from\(selectedIds\)/, runtime, 'Q04: operaciones batch sobre Array.from(selectedIds)');
  H(/filteredRecords\.filter\(\(record\) => selectedIds\.has\(record\.id\)\)/, runtime, 'Q04b: Informe de Evidencia = filteredRecords ∩ selectedIds');
  // Q05 — autoridad del lifecycle para bulk.
  H(/async bulkUpdateStatus\(ids, newStatus, user, recordsMap = \{\}\)/, orch, 'Q05: autoridad bulk status = Orchestrator.bulkUpdateStatus');
  H(/async bulkDelete\(ids, user\)/, orch, 'Q05b: autoridad bulk delete = Orchestrator.bulkDelete');
  // Q06 — whitelist de estados y gate de finalización.
  H(/allowedStatuses = \['pendiente', 'en_proceso', 'completado'\]/, orch, 'Q06: whitelist estados bulk = pendiente/en_proceso/completado');
  H(/canComplete\(record, this\.contract\)/, orch, 'Q06b: completado gated por canComplete (readiness validated/ready)');
  // Q07 — persistencia batch (chunking + mapeo).
  H(/BATCH_CHUNK_SIZE = 200/, service, 'Q07: chunking batch = 200');
  H(/async updateBatch\(ids, record\)/, service, 'Q07b: service.updateBatch');
  H(/\.update\(payload\)\.in\('id', chunk\)/, service, 'Q07c: UPDATE .in(id) por chunk');
  // Q08 — capacidad de asignación de lote en batch.
  N(/assignLot|assign_lote|bulkLote|asignarLote|batchLote|loteBatch/i, coreFiles, 'Q08: 0 símbolos de asignación batch de lote en el pipeline');
  N(/lote/i, runtimeBulk, 'Q08b: 0 referencia a lote en bulk bar');
  // Q09 — rutas EXISTENTES de asignación de lote.
  H(/const handleSubmit = async \(e\) => \{/, runtime, 'Q09: ruta formulario (create/edit)');
  H(/createRecord\(formData, auditUser\)/, runtime, 'Q09b: createRecord vía Orchestrator');
  H(/importRecords\(rows, auditUser\)/, runtime, 'Q09c: ruta importación (UniversalImportWorkflow → Orchestrator)');
  // Q10 — participación de lote en el contrato y detección de duplicados.
  H(/tableFields: \['fecha', 'hora', 'cliente', 'producto', 'lote'/, registry, 'Q10: lote es tableField del contrato despachos');
  H(/\{ field: 'producto', requires: \['lote'\] \}/, registry, 'Q10b: businessRule producto → requires lote');
  H(/groupFields = \['cliente', 'producto', 'lote'\]/, runtime, 'Q10c: duplicados agrupados por cliente+producto+lote');
  // Q11 — proyección de lote en el Informe de Evidencia.
  H(/\{ field: 'lote', label: 'Lote', type: 'text' \}/, adapter, 'Q11: lote en DISPATCH_FIELD_DEFS del evidence adapter');
  // Q12 — autoridad de completitud/finalización.
  H(/export function canComplete\(record, contract\)/, completion, 'Q12: canComplete = autoridad de finalización');
  H(/state === 'validated' \|\| state === 'ready'/, completion, 'Q12b: readiness validated/ready requerido para completar');
}

/* ================= INV-01–20: INVENTARIO DE HALLAZGOS ================= */
{
  H(/const \[selectedIds, setSelectedIds\] = useState\(new Set\(\)\)/, runtime, 'INV-01: selectedIds Set (estado local, no persistente)');
  H(/setActiveView\(e\.target\.value\); setFilters\(\{\}\); setSelectedIds\(new Set\(\)\)/, runtime, 'INV-02: selección limpiada al cambiar vista operacional');
  H(/setFilters\(\{\}\);\n    setSelectedIds\(new Set\(\)\)/, runtime, 'INV-02b: selección limpiada en métricas (handleMetricView)');
  H(/for \(const r of filteredRecords\) next\.add\(r\.id\)/, runtime, 'INV-03: toggleSelectAll sobre filteredRecords (filtros, no página)');
  H(/filteredRecords\.every\(r => selectedIds\.has\(r\.id\)\)/, runtime, 'INV-04: allFilteredSelected = every(filteredRecords)');
  H(/selectedIds\.size > 0/, runtime, 'INV-05: bulk bar condicionada a selección > 0');
  H(/Cambiar estado\.\.\./, runtimeBulk, 'INV-06: única acción de escritura = cambio de estado');
  H(/Eliminar/, runtimeBulk, 'INV-06b: única otra acción = delete');
  N(/lote/i, runtimeBulk, 'INV-07: 0 acción batch de lote (GAP documentado)');
  H(/allowedStatuses = \['pendiente', 'en_proceso', 'completado'\]/, orch, 'INV-08: whitelist cerrada de 3 estados');
  H(/invalidIds: invalid/, orch, 'INV-09: bloqueo parcial devuelve invalidIds');
  H(/updateBatch\(ids, \{ estado: newStatus \}\)/, orch, 'INV-10: payload de estado = { estado } exclusivo');
  H(/updated_at: new Date\(\)\.toISOString\(\)/, service, 'INV-10b: service añade updated_at al payload batch');
  H(/BATCH_CHUNK_SIZE = 200/, service, 'INV-11: chunking 200 en updateBatch/deleteBatch/insertBatch');
  H(/cantidad: 'cantidad_bolsas'/, registry, 'INV-12: fieldMapping = cantidad→cantidad_bolsas (único mapeo)');
  N(/canComplete/, orchDelete, 'INV-13: bulkDelete sin gate de readiness (borra cualquier selección)');
  H(/lote/, registryCanonical, 'INV-14: lote presente como canonicalField (documentContract despachos)');
  N(/lote: \{ required: true \}/, registryValidation, 'INV-15: lote NO es required en validationRules');
  H(/if \(record\.producto && !record\.lote\)/, completion, 'INV-16: producto sin lote = inconsistent (bloquea completado vía readiness)');
  H(/groupFields = \['cliente', 'producto', 'lote'\]/, runtime, 'INV-17: duplicados dependen de lote');
  H(/tableFields\.filter\(f => f !== 'id'\)/, runtime, 'INV-18: lote es campo de filtro del panel dinámico');
  H(/value_text: raw === null \|\| raw === undefined \? '' : String\(raw\)/, adapter, 'INV-19: lote proyectado como value_text (String)');
  N(/evaluateRecord/, orchImport, 'INV-20: importación inserta sin evaluar (bypass de validación/readiness)');
}

/* ================= E01–E20: EVIDENCIA (file:line) ================= */
{
  H(/const \[selectedIds, setSelectedIds\] = useState\(new Set\(\)\)/, runtime, 'E01 · UniversalOperationalRuntime.jsx:83');
  H(/const toggleSelect = \(id\) => \{/, runtime, 'E02 · UniversalOperationalRuntime.jsx:459');
  H(/const toggleSelectAll = \(\) => \{/, runtime, 'E03 · UniversalOperationalRuntime.jsx:443');
  H(/Bulk actions bar/, runtime, 'E04 · UniversalOperationalRuntime.jsx:715');
  H(/const handleBulkStatus = async \(newStatus\) => \{/, runtime, 'E05 · UniversalOperationalRuntime.jsx:275');
  H(/const handleBulkDelete = async \(\) => \{/, runtime, 'E06 · UniversalOperationalRuntime.jsx:262');
  H(/async bulkUpdateStatus\(ids, newStatus, user, recordsMap = \{\}\)/, orch, 'E07 · OperationalExperienceLifecycleOrchestrator.js:191');
  H(/async bulkDelete\(ids, user\)/, orch, 'E08 · OperationalExperienceLifecycleOrchestrator.js:228');
  H(/allowedStatuses = \['pendiente', 'en_proceso', 'completado'\]/, orch, 'E09 · OperationalExperienceLifecycleOrchestrator.js:193');
  H(/!canComplete\(record, this\.contract\)/, orch, 'E10 · OperationalExperienceLifecycleOrchestrator.js:203');
  H(/async updateBatch\(ids, record\)/, service, 'E11 · operationalRecordsService.js:120');
  H(/async deleteBatch\(ids\)/, service, 'E12 · operationalRecordsService.js:106');
  H(/cantidad: 'cantidad_bolsas'/, registry, 'E13 · OperationalExperienceRegistry.js:201');
  H(/tableFields: \['fecha', 'hora', 'cliente', 'producto', 'lote'/, registry, 'E14 · OperationalExperienceRegistry.js:176');
  H(/\{ field: 'producto', requires: \['lote'\] \}/, registry, 'E14b · OperationalExperienceRegistry.js:240');
  H(/record\.producto && !record\.lote/, completion, 'E15 · OperationalDataCompletion.js:92');
  H(/groupFields = \['cliente', 'producto', 'lote'\]/, runtime, 'E16 · UniversalOperationalRuntime.jsx:349');
  H(/\{ field: 'lote', label: 'Lote', type: 'text' \}/, adapter, 'E17 · dispatchEvidenceAdapter.js:32');
  N(/evaluateRecord/, orchImport, 'E18 · OperationalExperienceLifecycleOrchestrator.js:136-142 (import sin evaluación)');
  H(/const handleSubmit = async \(e\) => \{/, runtime, 'E19 · UniversalOperationalRuntime.jsx:149 (form = única vía manual de lote)');
  H(/export function canComplete\(record, contract\)/, completion, 'E20 · OperationalDataCompletion.js:130');
  // Config de despachos: no contiene lógica de lote (solo defaults placa/conductor).
  N(/lote/i, dispatchConfig, 'E20b · dispatchesConfig.js: sin lógica de lote');
  // Audit service: tipos de evento batch registrados.
  H(/auditBatchUpdate/, audit, 'E20c · operationalAuditService.js:70 (bulk_update)');
  H(/auditBatchDelete/, audit, 'E20d · operationalAuditService.js:69 (bulk_delete)');
}

/* ================= INTEGRIDAD GIT: 0 cambios de producción ================= */
{
  const files = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' })
    .stdout.split('\n').filter(Boolean)
    .map((l) => l.slice(3).trim());
  const prodChanges = files.filter((f) => f.startsWith('src/') || f.startsWith('public/'));
  check(prodChanges.length === 0, 'GIT: 0 production source changes (src/ public/ intactos)', prodChanges.join(', '));
  check(!files.includes('docs/Sprint-341.md'), 'GIT: Sprint-341.md sin alterar');
}

/* ================= REPORTE ================= */
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log('\n' + '='.repeat(70));
console.log('SPRINT 342 — DISPATCH BATCH LOT ASSIGNMENT ARCHITECTURE AUDIT');
console.log('='.repeat(70));
console.log(`PASS  ${passed}`);
console.log(`FAIL  ${failed}`);
console.log(`TIME  ${elapsed}s`);
if (failures.length) {
  console.log('\nFALLOS:');
  for (const f of failures) console.log(`  ✗ ${f.label}${f.detail ? ' — ' + f.detail : ''}`);
}
console.log('\nFINAL CLASSIFICATION:');
if (failed > 0) {
  console.log('  STATUS:  FAIL');
  console.log('  CLASS:   REVIEW REQUIRED');
} else {
  console.log('  STATUS:  CERTIFIED · AUDIT ONLY');
  console.log('  CLASS:   BATCH LOT ASSIGNMENT — NOT IMPLEMENTED (documented gap)');
  console.log('  SCOPE:   BATCH OPERATIONS = STATUS/DELETE ONLY · LOT ASSIGNMENT = PER-RECORD/IMPORT ONLY');
  console.log('  PROD CHANGES: 0');
}
console.log('='.repeat(70));
process.exit(failed > 0 ? 1 : 0);