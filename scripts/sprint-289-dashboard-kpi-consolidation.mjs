/**
 * Sprint 289 — DASHBOARD KPI CONSOLIDATION (TEST 04/05/06).
 *
 * TIPO: KPI SOURCE AUTHORITY — verifies that `activeAlerts` ("Alertas
 * Activas") is a summary projection of the SAME certified occurrence state
 * the monitor consumes (OccurrenceProjection + OccurrenceLifecycle +
 * OccurrenceLedger). A COMPLETED occurrence is NEVER counted as active.
 *
 * Ejecutar: node scripts/sprint-289-dashboard-kpi-consolidation.mjs
 */
import { countActiveOccurrences } from '../src/core/capabilities/alert/runtime-consumption/AlertDashboardDataProvider.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { createCompletionSignal } from '../src/core/capabilities/alert/occurrence/CompletionSignal.js';

const DAY = 8.64e7;

const checks = [];
function check(label, truth, detail = '') {
  checks.push({ label, truth: !!truth, detail });
}

const contractForm = {
  id: 12,
  slug: 'temperature',
  module_id: 'mod-ops',
  alertConfiguration: {
    alertConfigurations: [
      { name: 'A 08:00', priority: 'high', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '08:00' },
      { name: 'B 14:00', priority: 'medium', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '14:00' },
      { name: 'C 20:00', priority: 'low', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '20:00' },
    ],
  },
};

const NOW = new Date(2026, 7, 9, 10, 0, 0).getTime();
const resources = { forms: [JSON.parse(JSON.stringify(contractForm))], repositories: [] };

// TEST 04 — COMPLETION CONSISTENCY. Complete A (config 0) for its window.
OccurrenceLedger.clear();
const before = projectCurrentOccurrences(resources, 'mod-ops', NOW);
check('TEST 04 — A/B/C projected', before.length === 3, `count=${before.length}`);

const a = before.find((o) => o.alertId === '12:alert:0');
OccurrenceLedger.recordCompletion(createCompletionSignal({
  resourceKind: a?.resourceKind ?? 'dynamicForms',
  resourceId: a?.resourceId ?? 12,
  moduleId: 'mod-ops',
  completedAt: NOW,
  status: 'COMPLETED',
  origin: 'resource',
  alertId: a?.alertId ?? '12:alert:0',
  occurrenceId: a?.occurrenceId,
}));

const after = projectCurrentOccurrences(resources, 'mod-ops', NOW);
const active = countActiveOccurrences(after);
check('TEST 04 — no local completion algebra (ledger read-only)', after[0]?.completion?.status === 'COMPLETED', JSON.stringify(after[0]?.completion));
check('TEST 04 — A completed NOT active', active === 2, `active=${active} (A completed → 2)`);
check('TEST 04 — B/C remain pending', after.filter((o) => o.completion).length === 1, 'only A completed');

// TEST 05 — RECURRENCE CONSISTENCY. Day 2 (now = Aug 10 10:00) advances the
// sequence of the occurrence whose FIRST window has already elapsed (A 08:00 →
// occ:2 on day 2, seq1 = [Aug 9 08:00, Aug 10 08:00)); occurrences whose FIRST
// window still spans into day 2 (B 14:00, C 20:00) keep occ:1. Sprint 298:
// window-correct anchors (CAL383) — the first window ALWAYS starts on the
// configured startDate (§7). The KPI MUST NOT collapse occurrence(N) and
// occurrence(N+1) into a single count.
const NOW_DAY2 = new Date(2026, 7, 10, 10, 0, 0).getTime();
OccurrenceLedger.clear();
const day2 = projectCurrentOccurrences(resources, 'mod-ops', NOW_DAY2);
const activeDay2 = countActiveOccurrences(day2);
const seqById = Object.fromEntries(day2.map((o) => [o.alertId, o.sequence]));
check('TEST 05 — recurrence advances (A occ:1 → occ:2 on day 2)',
  seqById['12:alert:0'] === 2, `A seq=${seqById['12:alert:0']}`);
check('TEST 05 — first windows spanning day 2 keep seq 1 (B/C occ:1)',
  seqById['12:alert:1'] === 1 && seqById['12:alert:2'] === 1,
  `B seq=${seqById['12:alert:1']} C seq=${seqById['12:alert:2']}`);
check('TEST 05 — occurrence(N) and occurrence(N+1) never collapsed by the KPI',
  activeDay2 === day2.length && day2.length === 3,
  `activeDay2=${activeDay2} occurrences=${day2.length}`);

// TEST 06 — NO ALERTS. Resource without alert configuration → occurrences = [].
OccurrenceLedger.clear();
const plainForm = { id: 99, slug: 'plain', forms: [], repositories: [] };
const none = projectCurrentOccurrences({ forms: [plainForm], repositories: [] }, 'mod-ops', NOW);
check('TEST 06 — no occurrences projected', none.length === 0, `count=${none.length}`);
check('TEST 06 — Alertas Activas = 0 without creating completion',
  countActiveOccurrences(none) === 0 && OccurrenceLedger.size === 0, `ledger size=${OccurrenceLedger.size}`);

// TEST 04bis — IDENTITY ISOLATION (Sprint 280). Completing A never satisfies B/C.
check('TEST 04bis — specific identity isolated', (() => {
  const b = before.find((o) => o.alertId === '12:alert:1');
  const c = before.find((o) => o.alertId === '12:alert:2');
  return b?.completion === null && c?.completion === null;
})(), 'B/C have no completion after A completed');

const failed = checks.filter((c) => c.truth === false);
for (const c of checks) console.log(`${c.truth ? 'PASS' : 'FAIL'}  ${c.label}${c.detail ? `  (${c.detail})` : ''}`);
console.log(`TOTAL: ${checks.filter((c) => c.truth).length}/${checks.length}`);
process.exit(failed.length === 0 ? 0 : 1);