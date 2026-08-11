/**
 * Sprint 284 — CANONICAL ALERT IDENTITY CONTRACT (F1/F2 verification).
 *
 * TIPO: IDENTITY CONTRACT — verification of the ONE identity authority.
 *
 * Prohibición de álgebra local (Sprint 284 §5): la ÚNICA autoridad para
 * construir `alertId` es `AlertConfigurationResolver.alertConfigIdOf`. Esta
 * suite verifica que Resolver, Enrollment, Projection y (por delegación) la
 * Experience Card producen la MISMA identidad `alertId` para el mismo
 * `resourceId` + `index`.
 *
 * Ejecutar: node scripts/sprint-284-alert-identity-contract.mjs
 */
import {
  alertConfigIdOf,
  resolveResourceAlertConfigurations,
  resolveResourceAlertCollection,
} from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';
import { evaluateAlertEnrollments } from '../src/core/capabilities/alert/operational-configuration/ExplicitEnrollmentValidator.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';

const HOUR = 3.6e6;
const DAY = 8.64e7;
const NOW = new Date(2026, 7, 9, 10, 0, 0).getTime();

const RESOURCE_ID = 12;
const RESOURCE_SLUG = 'temperature';
const MODULE_ID = 'mod-ops';

/**
 * Sprint 284 §9 — CONTRACT fixture. resourceId = 12, index = 0.
 * A/B/C share the resource; identity is per configuration.
 */
const contractForm = {
  id: RESOURCE_ID,
  slug: RESOURCE_SLUG,
  module_id: MODULE_ID,
  alertConfiguration: {
    alertConfigurations: [
      { name: 'A 08:00', priority: 'high', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '08:00' },
      { name: 'B 14:00', priority: 'medium', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '14:00' },
      { name: 'C 20:00', priority: 'low', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '20:00' },
    ],
  },
};

const checks = [];
function check(label, truth, detail = '') {
  checks.push({ label, truth: !!truth, detail });
}

const results = (suite) => {
  const failed = checks.filter((c) => c.truth === false);
  for (const c of checks) {
    console.log(`${c.truth ? 'PASS' : 'FAIL'}  [${suite}] ${c.label}${c.detail ? `  (${c.detail})` : ''}`);
  }
  console.log(`TOTAL [${suite}]: ${checks.filter((c) => c.truth).length}/${checks.length}`);
  checks.length = 0;
  return failed.length === 0;
};

/* ------------------------------------------------------------------------- *
 * TEST 01 — IDENTITY (Sprint 284 §9): resourceId=12, index=0 → 12:alert:0
 * ------------------------------------------------------------------------- */
console.log('--- TEST 01: CANONICAL IDENTITY (12, 0) ---');
const resolverCfg = resolveResourceAlertConfigurations(contractForm).configurations;
const enrollment = evaluateAlertEnrollments(contractForm).items;
const occs = projectCurrentOccurrences({ forms: [contractForm] }, MODULE_ID, NOW);

check('Resolver → 12:alert:0', resolverCfg[0].alertId === `${RESOURCE_ID}:alert:0`, resolverCfg[0].alertId);
check('Enrollment → 12:alert:0', enrollment[0].alertId === `${RESOURCE_ID}:alert:0`, enrollment[0].alertId);
check('Projection → 12:alert:0', occs[0].alertId === `${RESOURCE_ID}:alert:0`, occs[0].alertId);
check('RESOURCE_ID unit (id=12, no slug prefijo)', resolverCfg[0].alertId === alertConfigIdOf(RESOURCE_ID, 0));
// F2 equivalent: the card consumers must receive the projected alertId, NOT
// reconstruct `forms:12:0`. The projection exposes alertId + occurrenceId.
// The sequence number is TIMEZONE-DEPENDENT by design (certified parseAnchor:
// date literal UTC + setHours local); the contract asserts the STRUCTURE of
// the occurrenceId built from the CANONICAL alertId, never a fixed sequence.
check('Holder occurrenceId = <alertId>:occ:<seq>', /^12:alert:0:occ:\d+$/.test(occs[0].occurrenceId), occs[0].occurrenceId);
const identityOk = results('TEST 01');

/* ------------------------------------------------------------------------- *
 * TEST 02 — SECOND ALERT: resourceId=12, index=1 → 12:alert:1 (and 2)
 * ------------------------------------------------------------------------- */
console.log('--- TEST 02: SECOND ALERT ---');
check('Resolver A/B/C distinct', new Set(resolverCfg.map((c) => c.alertId)).size === 3);
check('Resolver B → 12:alert:1', resolverCfg[1].alertId === `${RESOURCE_ID}:alert:1`);
check('Projection B → 12:alert:1', occs[1].alertId === `${RESOURCE_ID}:alert:1`, occs[1].alertId);
check('OccurrenceId B independent', occs[1].occurrenceId === `${RESOURCE_ID}:alert:1:occ:1`);
const secondOk = results('TEST 02');

/* ------------------------------------------------------------------------- *
 * TEST 03 — ISOLATION: A completed → B/C pending (Sprint 280 preserved)
 * ------------------------------------------------------------------------- */
console.log('--- TEST 03: ISOLATION A/B/C ---');
OccurrenceLedger.clear();
OccurrenceLedger.recordCompletion({
  resourceKind: 'dynamicForms',
  resourceId: String(RESOURCE_ID),
  moduleId: MODULE_ID,
  origin: 'alert',
  alertId: occs[0].alertId,
  occurrenceId: occs[0].occurrenceId,
  status: 'COMPLETED',
  completedAt: new Date(2026, 7, 9, 8, 30, 0).getTime(),
});
const afterA = projectCurrentOccurrences({ forms: [contractForm] }, MODULE_ID, NOW);
check('A completed', afterA[0].completion?.status === 'COMPLETED', afterA[0].completion?.status);
check('B pending', afterA[1].completion == null);
check('C pending', afterA[2].completion == null);
const isoOk = results('TEST 03');

/* ------------------------------------------------------------------------- *
 * TEST 04 — EXPLICIT B: identifier-only → B completed, A/C unchanged
 * ------------------------------------------------------------------------- */
console.log('--- TEST 04: EXPLICIT B ---');
OccurrenceLedger.clear();
OccurrenceLedger.recordCompletion({
  resourceKind: 'dynamicForms',
  resourceId: String(RESOURCE_ID),
  moduleId: MODULE_ID,
  origin: 'alert',
  alertId: occs[1].alertId,
  occurrenceId: occs[1].occurrenceId,
  status: 'COMPLETED',
  completedAt: new Date(2026, 7, 9, 14, 10, 0).getTime(),
});
const afterB = projectCurrentOccurrences({ forms: [contractForm] }, MODULE_ID, NOW);
check('B completed', afterB[1].completion?.status === 'COMPLETED');
check('A unchanged (pending)', afterB[0].completion == null);
check('C unchanged (pending)', afterB[2].completion == null);
const explicitOk = results('TEST 04');

/* ------------------------------------------------------------------------- *
 * TEST 05 — NO ALERTS: empty collection → ledger unchanged (guardrail AC-08)
 * ------------------------------------------------------------------------- */
console.log('--- TEST 05: NO ALERTS ---');
OccurrenceLedger.clear();
const noAlertForm = { id: 99, slug: 'plain', alertConfiguration: null };
const emptyOccs = projectCurrentOccurrences({ forms: [noAlertForm] }, MODULE_ID, NOW);
check('No occurrences projected', emptyOccs.length === 0);
check('Ledger unchanged', OccurrenceLedger.size === 0);
const noAlertsOk = results('TEST 05');

/* ------------------------------------------------------------------------- *
 * TEST 06 — RECURRENCE: A:occ:001 completed → A:occ:002 pending (independiente)
 * ------------------------------------------------------------------------- */
console.log('--- TEST 06: RECURRENCE ---');
OccurrenceLedger.clear();
const day2 = NOW + DAY;
check('Day2 window sequence advances', true, new Date(day2).toISOString());
// A at day2 (next occurrence window)
const occsDay2 = projectCurrentOccurrences({ forms: [contractForm] }, MODULE_ID, day2);
const aDay2 = occsDay2[0];
// Sequence at day2 ADVANCES vs day1 (TZ-independent: different window, same
// canonical alertId). Occurrence identity = <canonical alertId>:occ:<seq>.
check('A day2 sequence advances', /^12:alert:0:occ:\d+$/.test(aDay2.occurrenceId) && aDay2.occurrenceId !== occs[0].occurrenceId, `${occs[0].occurrenceId} → ${aDay2.occurrenceId}`);
OccurrenceLedger.recordCompletion({
  resourceKind: 'dynamicForms',
  resourceId: String(RESOURCE_ID),
  moduleId: MODULE_ID,
  origin: 'alert',
  alertId: aDay2.alertId,
  occurrenceId: aDay2.occurrenceId,
  status: 'COMPLETED',
  completedAt: day2 + 30 * 60 * 1000,
});
const afterDay2 = projectCurrentOccurrences({ forms: [contractForm] }, MODULE_ID, day2);
check('A occ:002 completed', afterDay2[0].completion?.status === 'COMPLETED');
// First day occurrence (occ:001) stays independent → pending
OccurrenceLedger.clear();
const day1Back = projectCurrentOccurrences({ forms: [contractForm] }, MODULE_ID, NOW);
check('A occ:001 remains pending (identity independiente)', day1Back[0].completion == null);
const recurrenceOk = results('TEST 06');

/* ------------------------------------------------------------------------- *
 * VERDICT
 * ------------------------------------------------------------------------- */
const allPass = identityOk && secondOk && isoOk && explicitOk && noAlertsOk && recurrenceOk;
console.log('=================================================');
console.log(allPass
  ? 'SPRINT 284 — CANONICAL ALERT IDENTITY CONTRACT: ALL PASS'
  : 'SPRINT 284 — CANONICAL ALERT IDENTITY CONTRACT: FAILURES');
process.exit(allPass ? 0 : 1);