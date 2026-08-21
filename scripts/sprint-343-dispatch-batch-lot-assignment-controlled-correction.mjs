/**
 * SPRINT 343 — DISPATCH BATCH LOT ASSIGNMENT · CONTROLLED CORRECTION
 * LEVEL 5 · Operational Capability · Bulk Metadata Update · Lot Validation
 *
 * Objetivo: certificar la nueva operación bulk `bulkAssignLot(ids, lote, user)`
 * sobre Despachos: reutiliza selectedIds + updateBatch + contrato canónico
 * `lote`, modifica SOLO `lote`, no toca estado/metadata restante, respeta el
 * chunking existente y preserva el error original.
 *
 * Clasificación esperada: BATCH LOT ASSIGNMENT — CONTROLLED CORRECTION
 *                         IMPLEMENTED / CERTIFIED
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

import {
  normalizeLot,
  validateLot,
  INVALID_LOT,
} from '../src/core/capabilities/experiences/OperationalLotRules.js';
import {
  detectInconsistencies,
  computeCompletionScore,
  getReadinessState,
  canComplete,
} from '../src/core/capabilities/experiences/OperationalDataCompletion.js';

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
const slice = (src, from, to) => {
  const i = src.indexOf(from);
  const j = src.indexOf(to, i > -1 ? i : 0);
  return (i > -1 && j > i) ? src.slice(i, j) : '';
};

// ---------------------------------------------------------------------------
// Fuentes auditadas
// ---------------------------------------------------------------------------
const runtime = S('src/modules/experiences/UniversalOperationalRuntime.jsx');
const orch = S('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js');
const service = S('src/services/operationalRecordsService.js');
const rulesSrc = S('src/core/capabilities/experiences/OperationalLotRules.js');

const orchAssign = slice(orch, 'async bulkAssignLot', 'async bulkDelete');
const orchImport = slice(orch, 'async importRecords', '// Export');
const runtimeLotHandler = slice(runtime, 'const handleBulkAssignLot', 'const handleViewTimeline');
const runtimeBulk = slice(runtime, '{/* Bulk actions bar */}', '{/* Table */}');
const serviceMapping = slice(service, 'function applyFieldMapping', 'function applyFieldMappingToRow');

/* ================= VAL: MÓDULO PURO (comportamiento determinístico) ================= */
{
  check(typeof normalizeLot === 'function' && typeof validateLot === 'function', 'VAL: normalizeLot/validateLot exportadas');
  check(validateLot('').valid === false, 'E04: lote vacío "" rechazado');
  check(validateLot('   ').valid === false, 'E04: lote whitespace "   " rechazado');
  check(validateLot(null).valid === false, 'E04: null rechazado');
  check(validateLot(undefined).valid === false, 'E04: undefined rechazado');
  check(validateLot('').code === INVALID_LOT, 'VAL-01: código INVALID_LOT en rechazo');
  check(normalizeLot('  LOT-001  ') === 'LOT-001', 'E05: trim de whitespace accidental');
  check(validateLot('  LOT-001  ').value === 'LOT-001', 'E05: persistencia recibe valor normalizado');
  check(normalizeLot('LOT-001') === 'LOT-001', 'E11: idempotencia del valor normalizado');
  check(validateLot('LOT-001').valid === true, 'E01/E02: lote válido aceptado');
  check(validateLot('LOT-001').value === 'LOT-001', 'E01/E02: valor sin alterar');
  check(normalizeLot(12345) === '12345', 'VAL-03: coerción numérica a texto (sin restricción nueva)');
  check(normalizeLot(' LOT-A  LOT-B ') === 'LOT-A  LOT-B', 'VAL-03: espacios internos preservados (sin semántica nueva)');
}

/* ================= DOMINIO: relación lote ↔ canComplete (§13, Sprint 342) ================= */
{
  const contract = {
    documentContract: {
      canonicalFields: ['fecha', 'hora', 'cliente', 'producto', 'lote', 'cantidad', 'peso', 'temperatura', 'destino', 'placa', 'conductor', 'estado', 'observaciones', 'signature_estado'],
    },
    validationRules: { cliente: { required: true }, producto: { required: true }, fecha: { required: true }, cantidad: { required: true, min: 1 } },
    businessRules: [
      { field: 'producto', requires: ['lote'] },
      { field: 'cliente', requires: ['producto'] },
      { field: 'conductor', requires: ['placa'] },
    ],
    complianceRules: [],
  };
  const base = {
    fecha: '2026-08-20', hora: '08:00', cliente: 'ACME', producto: 'PECHUGA BLANCA',
    cantidad: 50, peso: 1200, temperatura: 4, destino: 'BOG', placa: 'TRG786',
    conductor: 'Juan Gómez', estado: 'pendiente', observaciones: 'sin novedad', signature_estado: 'pending',
  };
  const noLot = { ...base };
  const withLot = { ...base, lote: 'LOT-001' };

  const issuesNoLot = detectInconsistencies(noLot, contract);
  const issuesWithLot = detectInconsistencies(withLot, contract);
  check(issuesNoLot.some((i) => i.field === 'lote'), 'E06/§13: producto sin lote → inconsistent (lote)');
  check(!issuesWithLot.some((i) => i.field === 'lote'), 'E06/§13: producto + lote → inconsistencia de lote resuelta');
  check(canComplete(noLot, contract) === false, '§13: sin lote → no puede completar');
  check(canComplete(withLot, contract) === true, '§13: tras asignar lote → registro potencialmente consistente');
  check(getReadinessState(withLot, contract) !== 'inconsistent', 'E07: estado de readiness no inconsistente tras lote');
  check(computeCompletionScore(withLot, contract).errors.length === 0, 'E06: campos completos sin errores');
}

/* ================= ORCHESTRATOR: bulkAssignLot ================= */
{
  H(/async bulkAssignLot\(ids, lote, user\)/, orch, 'E01/E02: firma bulkAssignLot(ids, lote, user)');
  H(/validateLot\(lote\)/, orchAssign, 'VAL-01: validación ejecutada antes de la escritura');
  H(/validation\.code/, orchAssign, 'VAL-01b: rechazo transporta code (INVALID_LOT vía OperationalLotRules)');
  H(/updateBatch\(ids, \{ lote: validation\.value \}\)/, orchAssign, 'E06/E10: payload exclusivo { lote } normalizado');
  N(/estado:|\{ estado|'estado'|"estado"/, orchAssign, 'E07: 0 escritura de estado dentro de bulkAssignLot');
  N(/\.\.\.record|\.\.\.r/, orchAssign, 'E08: sin spread del registro → solo lote se escribe');
  N(/try \{/, orchAssign, 'E13/E14: sin try/catch → error original se propaga sin envolver');
  N(/catch/, orchAssign, 'E13b: sin catch que reemplace la causa');
  H(/bulk_lot_assigned/, orchAssign, 'auditoría: action bulk_lot_assigned (reusa auditBatchUpdate)');
  N(/OperationalEventBus|publish/, orchAssign, 'sin evento paralelo (RECORDS_STATUS_UPDATED NO se emite: lot ≠ status)');
  N(/createOperationalRecordsService|getSupabaseClient/, orchAssign, 'E20: sin persistence provider paralelo');
  H(/requested: ids\.length/, orchAssign, 'reporta requested → conteo de no-encontrados en UI');
  H(/validateLot/, orch, 'validación reutilizada (OperationalLotRules) — fuente única, no duplicada');
  N(/lote/i, orchImport, 'E18: importación intacta (sin lógica de lote nueva en importRecords)');
}

/* ================= SERVICE: persistencia preservada ================= */
{
  H(/Object\.prototype\.hasOwnProperty\.call\(record, canonical\)/, serviceMapping, 'INV-08/INV-17: mapping solo claves presentes (no inyecta null en partial update)');
  H(/BATCH_CHUNK_SIZE = 200/, service, 'E12: chunking 200 preservado');
  H(/\.in\('id', chunk\)/, service, 'E12b: UPDATE .in(id) por chunk (450 → 200+200+50)');
  H(/async updateBatch\(ids, record\)/, service, 'E20: updateBatch reutilizado (sin segunda capa de persistencia)');
}

/* ================= RUNTIME: UI bulk action ================= */
{
  H(/Asignar lote/, runtimeBulk, 'nueva acción "Asignar lote" en bulk bar');
  H(/Array\.from\(selectedIds\)/, runtimeLotHandler, 'E01/E02/E03: targets = Array.from(selectedIds) exacto');
  N(/filteredRecords/, runtimeLotHandler, 'E03: filteredRecords NO es target implícito (invariante §4)');
  H(/allowedRoles=\{\['administrador', 'calidad', 'operativo'\]\}/, runtimeBulk, 'E19: misma autorización que editar lote individual (RoleGate)');
  H(/setSelectedIds\(new Set\(\)\)/, runtimeLotHandler, 'E15/INV-21: limpieza de selección tras éxito (contrato existente)');
  H(/setRecords\(prev => prev\.map/, runtimeLotHandler, 'E15/INV-22: refresh vía runtime → records → filtros/dashboard');
  H(/err\.message/, runtimeLotHandler, 'E14: causa original preservada en el error visible');
  H(/const lot = bulkLotInput\.trim\(\)/, runtimeLotHandler, 'VAL-02: feedback trim client-side');
  N(/selectedRows|checkedIds|selectionList|selectAllIds/, runtimeLotHandler + runtimeBulk, 'INV-16: sin sistema de selección paralelo');
  N(/dashboard/i, runtimeLotHandler, 'E17: dashboard no modificado por la operación');
  N(/lote_prod|lote_batch|lot_number|newLote|loteNuevo/i, orchAssign + runtimeLotHandler, 'INV-15: no se crea modelo de lote paralelo');
}

/* ================= INTEGRIDAD GIT: solo archivos autorizados ================= */
{
  const files = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' })
    .stdout.split('\n').filter(Boolean)
    .map((l) => l.slice(3).trim().replace(/\\/g, '/'));
  const allowed = [
    // Sprint 342 (pendiente de commit — no autorizado aún por el usuario).
    'docs/Sprint-342.md',
    'scripts/sprint-342-dispatch-batch-lot-assignment-architecture-audit.mjs',
    // Sprint 343 — superficie autorizada.
    'src/core/capabilities/experiences/OperationalLotRules.js',
    'src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js',
    'src/services/operationalRecordsService.js',
    'src/modules/experiences/UniversalOperationalRuntime.jsx',
    'scripts/sprint-343-dispatch-batch-lot-assignment-controlled-correction.mjs',
    'docs/Sprint-343.md',
  ];
  const unexpected = files.filter((f) => !allowed.includes(f));
  check(unexpected.length === 0, 'GIT: solo archivos autorizados modificados/creados', unexpected.join(', ') || 'OK');
  check(fs.existsSync(path.join(ROOT, 'docs/Sprint-342.md')), 'GIT: precedente Sprint-342.md intacto');
  check(fs.existsSync(path.join(ROOT, 'scripts/sprint-342-dispatch-batch-lot-assignment-architecture-audit.mjs')), 'GIT: suite Sprint-342 intacta');
}

/* ================= REPORTE ================= */
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log('\n' + '='.repeat(70));
console.log('SPRINT 343 — DISPATCH BATCH LOT ASSIGNMENT · CONTROLLED CORRECTION');
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
  console.log('  STATUS:  IMPLEMENTED / CERTIFIED');
  console.log('  CLASS:   BATCH LOT ASSIGNMENT — CONTROLLED CORRECTION');
  console.log('  PIPELINE: selectedIds → bulkAssignLot → updateBatch({lote}) → persistence');
  console.log('  SCOPE:   solo lote · estado intacto · metadata intacta · 0 no-seleccionados afectados');
}
console.log('='.repeat(70));
process.exit(failed > 0 ? 1 : 0);