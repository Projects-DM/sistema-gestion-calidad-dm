/**
 * SPRINT 322 — OPERATIONAL STATUS LIFECYCLE · FORENSIC REDUNDANCY AUDIT
 * LEVEL 5 · AUDIT ONLY (0 cambios en src/)
 *
 * Determina si Aprobar / Cerrar / Reabrir son un ciclo de negocio requerido
 * o una segunda máquina de estados redundante respecto del ciclo operacional
 * Pendiente → En proceso → Completado (con Eliminar como operación destructiva).
 *
 * Método: STATIC ANALYSIS + TARGETED IMPORTS + GIT SCOPE + BUILD.
 * Timebox <60s (HARD LIMIT 120s). NO regresión histórica 296–321.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ui = S('src/modules/experiences/UniversalOperationalRuntime.jsx');
const orch = S('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js');
const completion = S('src/core/capabilities/experiences/OperationalDataCompletion.js');
const registry = S('src/core/capabilities/experiences/OperationalExperienceRegistry.js');
const service = S('src/services/operationalRecordsService.js');
const bridge = S('src/core/capabilities/alert/occurrence/CompletionBridge.js');
const alertRuntime = S('src/hooks/useAlertRuntime.js');
const dashboard = S('src/modules/experiences/UniversalOperationalDashboard.jsx');

// Listado de archivos fuente para el análisis de consumidores.
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const ALL_SRC = walk(path.join(ROOT, 'src'));

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
const grepAll = (token) => ALL_SRC.filter((p) => S(path.relative(ROOT, p).replace(/\\/g, '/')).includes(token));

/* ================================================================== */
/* E01–E05 — OWNERSHIP                                                 */
/* ================================================================== */
{
  const chains = [
    ['handleBulkStatus', 'bulkUpdateStatus', 'updateBatch', 'Cambiar estado'],
    ['handleBulkApprove', 'approveRecords', 'updateBatch', 'Aprobar'],
    ['handleBulkClose', 'closeRecords', 'updateBatch', 'Cerrar'],
    ['handleBulkReopen', 'reopenRecords', 'updateBatch', 'Reabrir'],
    ['handleBulkDelete', 'bulkDelete', 'deleteBatch', 'Eliminar'],
  ];
  for (const [h, m, svc, label] of chains) {
    check(has(new RegExp('const ' + h + ' = async'), ui), 'E01-E05: handler ' + h + ' (' + label + ')');
    check(has(new RegExp('async ' + m + '\\('), orch), 'E01-E05: orchestrator ' + m);
    check(has(new RegExp('async ' + svc + '\\('), service), 'E01-E05: service ' + svc);
  }
}

/* ================================================================== */
/* E06–E10 — LIFECYCLE                                                 */
/* ================================================================== */
{
  check(has(/const allowedStatuses = \['pendiente', 'en_proceso', 'completado'\]/, orch), 'E06/E07: dropdown cubre pendiente→en_proceso→completado');
  check(has(/\{ estado: newStatus \}/, orch), 'E06/E07: Cambiar estado persiste el estado operacional');
  check(has(/\{ estado: 'approved' \}/, orch), 'E08: Aprobar → approved');
  check(has(/canApprove/, orch), 'E08: approve validado por readiness');
  check(has(/\{ estado: 'cerrado' \}/, orch), 'E09: Cerrar → cerrado');
  check(has(/\{ estado: 'en_proceso' \}/, orch), 'E10: Reabrir → en_proceso');
  check(has(/record\.estado === 'cerrado' \|\| record\.estado === 'approved'/, completion), 'E10: canReopen solo cerrado/approved');
}

/* ================================================================== */
/* E11–E14 — REGLAS                                                    */
/* ================================================================== */
{
  check(has(/return state === 'ready' \|\| state === 'validated';/, completion), 'E11: Aprobar exige score 100 (validated/ready)');
  check(has(/return state === 'approved';/, completion), 'E12: Cerrar exige approved');
  check(has(/return record\.estado === 'cerrado' \|\| record\.estado === 'approved';/, completion), 'E13: Reabrir exige cerrado/approved');
  const dbOpts = 'pendiente, en_proceso, completado';
  check(has(/options: \['pendiente', 'en_proceso', 'completado'\]/, registry), 'E14: contrato Registry = 3 estados operacionales');
  check(has(/return \['pendiente', 'en_proceso', 'completado'\]/, ui), 'E14: dropdown conserva contrato operacional');
}

/* ================================================================== */
/* E15–E18 — CONSUMIDORES                                              */
/* ================================================================== */
{
  // approved
  check(has(/approved: r => r\.estado === 'approved'/, ui), 'E15: view approved (UI)');
  check(has(/\{ key: 'approved', label: 'Aprobados'/, ui), 'E15: vista Aprobados (selector)');
  check(has(/val === 'approved' \? 'bg-emerald-100/, ui), 'E15: badge approved (UI)');
  check(has(/RECORDS_APPROVED_EVENT, RECORDS_CLOSED_EVENT/, bridge), 'E15/E16: approved/cerrado son señales FINALES del bridge de ocurrencias');
  check(has(/RECORDS_APPROVED/, orch) && has(/RECORDS_APPROVED_EVENT/, bridge), 'E15: evento RECORDS_APPROVED → CompletionBridge');
  // cerrado
  check(has(/closed: r => r\.estado === 'cerrado'/, ui), 'E16: view closed (UI)');
  check(has(/\{ key: 'closed', label: 'Cerrados'/, ui), 'E16: vista Cerrados (selector)');
  check(has(/estado === 'completado' \|\| r\.estado === 'cerrado'/, ui), 'E16: cerrado cuenta como Completados (métrica)');
  check(has(/val === 'cerrado' \? 'bg-gray-200/, ui), 'E16: badge cerrado (UI)');
  // Reabrir
  check(has(/async reopenRecords\(/, orch), 'E17: reopenRecords (única ruta guardada cerrado/approved → en_proceso)');
  check(has(/RECORDS_REOPENED/, orch), 'E17: evento RECORDS_REOPENED publicado');
  check(!bridge.includes('RECORDS_REOPENED'), 'E17 (hallazgo): RECORDS_REOPENED NO es señal FINAL (solo auditoría)');
  // completado
  check(has(/state === 'completado' \|\| r\.estado === 'cerrado'/, ui) || has(/r\.estado === 'completado'/, ui), 'E18: completado en métrica/vistas');
  check(has(/RESOURCE_COMPLETED/, orch), 'E18: RESOURCE_COMPLETED emitido en completado (Sprint 257)');
  check(has(/newStatus !== 'completado'\) return;/, bridge), 'E18: bridge registra completion solo en completado (vía RECORDS_STATUS_UPDATED)');
}

/* ================================================================== */
/* E19–E20 — DEPENDENCIA DASHBOARD / VIEWS-FILTERS                     */
/* ================================================================== */
{
  check(!dashboard.includes('estado'), 'E19: Dashboard NO depende de estado (métricas independientes)');
  check(has(/getExperienceTimeline/, dashboard), 'E19: Dashboard lee auditoría (trail genérico)');
  check(has(/approved: r =>/, ui) && has(/closed: r =>/, ui), 'E20: views dependen de approved/cerrado');
  check(has(/getUniqueValues\(records, f\)/, ui), 'E20: filtros avanzados data-driven (approved/cerrado aparecen si existen)');
}

/* ================================================================== */
/* E21–E24 — AUDIT / EVENT                                             */
/* ================================================================== */
{
  check(has(/auditBatchUpdate\(\{[\s\S]{0,120}action: 'approved'/, orch), 'E21: auditoría Aprobar');
  check(has(/RECORDS_APPROVED/, orch), 'E21: evento Aprobar');
  check(has(/auditBatchUpdate\(\{[\s\S]{0,120}action: 'closed'/, orch), 'E22: auditoría Cerrar');
  check(has(/RECORDS_CLOSED/, orch), 'E22: evento Cerrar');
  check(has(/auditBatchUpdate\(\{[\s\S]{0,120}action: 'reopened'/, orch), 'E23: auditoría Reabrir');
  check(has(/RECORDS_REOPENED/, orch), 'E23: evento Reabrir');
  check(has(/auditBatchUpdate/, orch), 'E24: auditoría Completado (bulk_status_updated)');
  check(has(/RESOURCE_COMPLETED/, orch), 'E24: evento Completado (RESOURCE_COMPLETED)');
  check(has(/wireCompletionBridge\(\)/, alertRuntime), 'E21-E24: bridge de ocurrencias ACTIVO (consumidor real)');
}

/* ================================================================== */
/* E25–E28 — INTEGRIDAD ARQUITECTÓNICA                                 */
/* ================================================================== */
{
  check((ui.match(/const filteredRecords = useMemo/g) || []).length === 1, 'E25: single source pipeline (filteredRecords)');
  check((ui.match(/const viewFilters = useMemo/g) || []).length === 1, 'E25: single viewFilters');
  check(has(/const \[selectedIds, setSelectedIds\] = useState\(new Set\(\)\)/, ui), 'E26: single selection');
  N(/selectedOperationalIds|selectedExportIds|selectedReportIds/, ui, 'E26: sin selecciones adicionales');
  const exp = ui.slice(ui.indexOf('const handleExportCsv'), ui.indexOf('const handleEvidenceReport'));
  N(/bulkUpdateStatus|approveRecords|closeRecords|reopenRecords|bulkDelete/, exp, 'E27: Exportar desacoplado del lifecycle');
  const inf = ui.slice(ui.indexOf('const handleEvidenceReport'), ui.indexOf('const handleBulkDelete'));
  N(/bulkUpdateStatus|approveRecords|closeRecords|reopenRecords|bulkDelete/, inf, 'E28: Informe desacoplado del lifecycle');
  check(has(/buildDispatchEvidenceRecords\(selectedRecords\)/, inf), 'E28: Informe → adapter 319 (intacto)');
  check(has(/renderEvidenceReport\(\{ model \}\)/, inf), 'E28: Informe → renderer 315 (intacto)');
  check(grepAll('approved_at').length === 0 && grepAll('closed_at').length === 0 && grepAll('reopened_at').length === 0, 'E25: sin timestamps dedicados (persistencia no acoplada)');
}

/* ================================================================== */
/* E29 — GIT SCOPE                                                     */
/* ================================================================== */
{
  const git = spawnSync('git', ['status', '--short', '--', 'src/'], { cwd: ROOT, encoding: 'utf8' });
  check(!(git.stdout || '').trim(), 'E29: src/ sin modificaciones (AUDIT ONLY)', (git.stdout || '').trim());
}

/* ================================================================== */
/* E30 — BUILD                                                         */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E30: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E30: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : failed === 0 ? 'BLOCKED (timebox)' : 'BLOCKED';

const lifecycleVerdict = 'PARTIAL';

console.log('============================================================');
console.log(' SPRINT 322 — FORENSIC REDUNDANCY AUDIT');
console.log(' OPERATIONAL STATUS LIFECYCLE');
console.log(' MODE: AUDIT ONLY (0 cambios fuente)');
console.log('============================================================');
console.log(' EVIDENCIA CLAVE:');
console.log(' - RECORDS_APPROVED / RECORDS_CLOSED = señales FINALES del');
console.log('   CompletionBridge (useAlertRuntime activo) → OccurrenceLedger.');
console.log(' - Solo Aprobar/Cerrar producen approved/cerrado (dropdown no).');
console.log(' - Cerrar requiere approved (score 100 gate) — regla que el');
console.log('   dropdown operacional NO cubre.');
console.log(' - cerrado se pliega en Completados (completado||cerrado):');
console.log('   superposición de máquinas.');
console.log(' - RECORDS_REOPENED: sin consumidor FINAL (solo auditoría).');
console.log(' - Reabrir → en_proceso es también alcanzable vía dropdown.');
console.log(' - Dashboard independiente (0 referencias a estado).');
console.log(' - Sin approved_at/closed_at: persistencia no acoplada.');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E30   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' DECISION FORENSE (lifecycle):');
console.log('   Aprobar/Cerrar/Reabrir tienen CONSUMIDORES REALES actuales:');
console.log('     + señales FINALES del bridge de ocurrencias (approved/cerrado)');
console.log('     + vistas/badges/métrica (approved, closed, Completados=||cerrado)');
console.log('     + gate de calidad (score 100) no cubierto por el dropdown');
console.log('   PERO el dominio de COMPLETION se cubre vía RESOURCE_COMPLETED,');
console.log('   cerrar≈completado (métrica), reabrir≈dropdown, sin timestamps:');
console.log('   => simplificación posible mediante MIGRACIÓN CONTROLADA.');
console.log('------------------------------------------------------------');
console.log(' CLASIFICACIÓN DEL LIFECYCLE: ' + lifecycleVerdict);
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(' Regresion historica 296-321: NO ejecutada (audit dirigido).');
console.log('============================================================');
process.exit(allPass ? 0 : 1);