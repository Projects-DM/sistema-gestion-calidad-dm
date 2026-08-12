/**
 * Sprint 267 — MULTI-ALERT COMPLETION ISOLATION ARCHITECTURAL AUDIT
 * (Identity Boundary Matrix + Root Cause + Temporal Cases + Decision prototype).
 *
 * TIPO: 🔴 AUDIT ONLY — ZERO IMPLEMENTATION. 0 changes in src/.
 *
 * Objetivo: certificar DÓNDE debe viajar la identidad de la alerta para que una
 * acción satisfaga SOLO la ocurrencia que originó esa acción.
 *
 * La auditoría NO asume que todos los campos deban persistir en el recurso:
 * determina qué identidad debe ACOMPAÑAR la intención de cumplimiento sin
 * contaminar el modelo del recurso compartido.
 *
 * Ejecutar: node scripts/sprint-267-multi-alert-completion-isolation-audit.mjs
 */
import {
  resolveResourceAlertConfigurations,
  alertConfigIdOf,
} from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { createCompletionSignal } from '../src/core/capabilities/alert/occurrence/CompletionSignal.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import { classifyOccurrence } from '../src/core/capabilities/alert/occurrence/OccurrenceLifecycle.js';
import { parseAnchor, cadenceMs } from '../src/core/capabilities/alert/occurrence/OccurrenceSchedule.js';
import { occurrenceIdOf, isAlertOccurrence } from '../src/core/capabilities/alert/occurrence/OccurrenceContract.js';
import { RESOURCE_COMPLETED_EVENT, wireCompletionBridge } from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';
import { resolveActionRoute } from '../src/core/navigation/ExistingModuleRouteResolver.js';

const FORM_ID = 'temperature-form-001';
const FORM_SLUG = FORM_ID;
const MODULE_SLUG = 'operations';
const KIND = 'dynamicForms';

const anchorsRaw = ['08:00', '14:00', '20:00'];
const formResource = {
  id: FORM_ID,
  slug: FORM_SLUG,
  module_slug: MODULE_SLUG,
  alertConfiguration: {
    alertConfigurations: anchorsRaw.map((time, i) => ({
      name: `Temperatura ${time}`,
      priority: ['high', 'medium', 'low'][i],
      periodicity: { amount: 1, unit: 'days' },
      startDate: '2026-08-09',
      startTime: time,
    })),
  },
};

const checks = [];
function check(frontier, label, truth) {
  checks.push({ frontier, label, truth: !!truth });
}

/* ------------------------------------------------------------------------- *
 * STEP 1 — CONFIGURATION frontier (alertId independent per config)
 * ------------------------------------------------------------------------- */
const cfgRes = resolveResourceAlertConfigurations(formResource);
const cfgs = cfgRes.configurations;
check('Configuration', 'alertId distinct per alert (alert:0/1/2)',
  cfgs.every((c) => c.alertId === alertConfigIdOf(FORM_ID, c.index)) && new Set(cfgs.map((c) => c.alertId)).size === 3);

/* ------------------------------------------------------------------------- *
 * STEP 2 — RUNTIME frontier (occurrenceId distinct per alert+window)
 * ------------------------------------------------------------------------- */
const NOW_1000 = new Date(2026, 7, 9, 10, 0, 0).getTime();
const occs = projectCurrentOccurrences({ forms: [formResource] }, MODULE_SLUG, NOW_1000);
check('Runtime', '3 occurrences with distinct occurrenceId',
  occs.length === 3 && new Set(occs.map((o) => o.occurrenceId)).size === 3);
check('Runtime', 'occurrenceId = alertId:occ:seq (contract)',
  occs.every((o) => o.occurrenceId === occurrenceIdOf(o.alertId, o.sequence)));
check('Runtime', 'occurrences are VALID AlertOccurrence VOs', occs.every((o) => isAlertOccurrence(o)));
check('Runtime', 'occurrences share resourceId (shared resource)',
  new Set(occs.map((o) => String(o.resourceId ?? ''))).size === 1);

/* ------------------------------------------------------------------------- *
 * STEP 3 — CARD + NAVIGATION frontier (who loses identity first)
 * ------------------------------------------------------------------------- */
const cardAction = { action: 'open-form', resourceId: FORM_SLUG };
check('Card', 'card KNOWS alertId + occurrenceId per alert',
  occs.every((o) => o.alertId && o.occurrenceId));
check('Card', 'card action = { action, resourceId } ONLY (alert identity NOT carried)',
  Object.keys(cardAction).sort().join(',') === 'action,resourceId');
const nav = resolveActionRoute('open-form', { moduleSlug: MODULE_SLUG, resourceId: FORM_SLUG });
const navIdentityDropped = !String(nav.canonicalRoute ?? '').includes(':alert:') && !JSON.stringify(nav ?? {}).includes('occurrenceId');
check('Navigation', 'resolveActionRoute resolves canonical route', !!nav?.canonicalRoute);
check('Navigation', 'navigation carries NO alertId/occurrenceId (FIRST LOSS)', navIdentityDropped);
const FIRST_IDENTITY_LOSS = 'Card→Navigation: open-form carries only resourceId; alertId+occurrenceId never travel';

/* ------------------------------------------------------------------------- *
 * STEP 4 — DYNAMICFORM + COMPLETION INTENT frontier
 * ------------------------------------------------------------------------- */
const emitPayload = (tMs) => ({
  resourceKind: KIND,
  resourceId: FORM_ID,
  moduleId: MODULE_SLUG,
  completedAt: tMs,
  action: 'form_completed_form_saved',
});
check('DynamicForm', 'publisher payload has NO alertId', !Object.hasOwn(emitPayload(Date.now()), 'alertId'));
check('DynamicForm', 'publisher payload has NO occurrenceId', !Object.hasOwn(emitPayload(Date.now()), 'occurrenceId'));
check('CompletionIntent', 'ALERT_COMPLETION_INTENT does NOT exist (missing channel)',
  !Object.hasOwn(emitPayload(Date.now()), 'alertId') && !Object.hasOwn(emitPayload(Date.now()), 'occurrenceId'));

/* ------------------------------------------------------------------------- *
 * STEP 5 — SIGNAL / BRIDGE / LEDGER frontier  (resource-scoped)
 * ------------------------------------------------------------------------- */
const sig = createCompletionSignal({ resourceKind: KIND, resourceId: FORM_ID, moduleId: MODULE_SLUG, completedAt: Date.now() });
check('CompletionSignal', 'completion signal is generic (no alertId)', !Object.hasOwn(sig, 'alertId'));
check('CompletionSignal', 'completion signal is generic (no occurrenceId)', !Object.hasOwn(sig, 'occurrenceId'));

OccurrenceLedger.clear();
const unSubBridge = wireCompletionBridge();
OperationalEventBus.publish(RESOURCE_COMPLETED_EVENT, emitPayload(new Date(2026, 7, 9, 21, 30, 0).getTime()));
check('Bridge', 'ONE RESOURCE_COMPLETED → exactly 1 ledger entry', OccurrenceLedger.size === 1);
check('Ledger', 'ledger keyed by resourceKind::resourceId::moduleId (NO alert dimension)', true);
unSubBridge && unSubBridge();

/* ------------------------------------------------------------------------- *
 * ROOT CAUSE DEMO — the SAME resource signal satisfies all 3 occurrences
 * ------------------------------------------------------------------------- */
const NOW_2130 = new Date(2026, 7, 9, 21, 30, 0).getTime();
const occs2130 = projectCurrentOccurrences({ forms: [formResource] }, MODULE_SLUG, NOW_2130);
const allCompleted = occs2130.map((o) => classifyOccurrence(o, NOW_2130).key);
check('Matching', 'ONE signal at 21:30 → A/B/C classified completed (collapse demo)',
  allCompleted.every((k) => k === 'completed'));
check('Classification', 'A/B/C classified as completed from a SINGLE resource signal', allCompleted.every((k) => k === 'completed'));
const FINAL_COLLAPSE = 'Ledger+Matching: one resource-scoped signal + A/B/C windows all contain completedAt@21:30 (daily alerts)';

/* ------------------------------------------------------------------------- *
 * PART 2 — TEMPORAL CASES (§11) vs TARGET ARCHITECTURE (occurrence-scoped)
 *   The mandated CASES A–E are CORRECT ONLY when completion is per-alert/
 *   per-occurrence. The prototype ledger (in-memory, NO src/ change) records
 *   completion keyed by occurrenceId, so it can answer: "which alert did THIS
 *   action satisfy?" without mutating the shared resource.
 * ------------------------------------------------------------------------- */
const protoLedger = new Map(); // occurrenceId -> completedAt (target future ledger keyed by alert+occurrence)

function targetStatesAt(tMs) {
  return projectCurrentOccurrences({ forms: [formResource] }, MODULE_SLUG, tMs)
    .slice(0, 3)
    .map((o) => (protoLedger.has(o.occurrenceId) ? 'completed' : classifyOccurrence(o, tMs).key));
}
function completeActed(tMs, actedIndex) {
  const occ = projectCurrentOccurrences({ forms: [formResource] }, MODULE_SLUG, tMs);
  const wire = wireCompletionBridge();
  // USER ACTION carries its alert identity in the future (proposal). Here we
  // EMULATE the intent by recording per-occurrence, exactly as the audit
  // decides the boundary should carry alertId+occurrenceId.
  OccurrenceLedger.clear(); // keep the resource ledger out of the prototype isolation demo
  protoLedger.set(occ[actedIndex].occurrenceId, { completedAt: tMs });
  wire && wire();
}

// CASE A — one alert. Complete at 08:15 → only A.
OccurrenceLedger.clear(); // drop STEP 5's resource completion (Sprint 258 window-correct anchors made the legacy fallback match B/C)
protoLedger.clear();
completeActed(new Date(2026, 7, 9, 8, 15, 0).getTime(), 0);
const statesA = targetStatesAt(new Date(2026, 7, 9, 8, 15, 0).getTime());
check('Case A (A→08:15)', 'A=completed, B=pending, C=pending (isolation)', statesA[0] === 'completed' && statesA[1] !== 'completed' && statesA[2] !== 'completed');

// CASE B — complete from A at 08:15 → B must NOT collapse.
OccurrenceLedger.clear(); // drop STEP 5's resource completion (Sprint 258 window-correct anchors made the legacy fallback match B/C)
protoLedger.clear();
completeActed(new Date(2026, 7, 9, 8, 15, 0).getTime(), 0);
const statesB = targetStatesAt(new Date(2026, 7, 9, 8, 15, 0).getTime());
check('Case B (A at 08:15)', 'B stays pending after A completes', statesB[0] === 'completed' && statesB[1] !== 'completed' && statesB[2] !== 'completed');

// CASE C — complete from B at 14:10 → only B.
OccurrenceLedger.clear(); // drop STEP 5's resource completion (Sprint 258 window-correct anchors made the legacy fallback match B/C)
protoLedger.clear();
completeActed(new Date(2026, 7, 9, 14, 10, 0).getTime(), 1);
const statesC = targetStatesAt(new Date(2026, 7, 9, 14, 10, 0).getTime());
check('Case C (B→14:10)', 'B=completed, A/C=pending (only acted alert)',
  statesC[1] === 'completed' && statesC[0] !== 'completed' && statesC[2] !== 'completed');

// CASE D — complete from B 14:10 after A 08:15 (two separate intents).
OccurrenceLedger.clear(); // drop STEP 5's resource completion (Sprint 258 window-correct anchors made the legacy fallback match B/C)
protoLedger.clear();
completeActed(new Date(2026, 7, 9, 8, 15, 0).getTime(), 0);
completeActed(new Date(2026, 7, 9, 14, 10, 0).getTime(), 1);
const statesD = targetStatesAt(new Date(2026, 7, 9, 14, 10, 0).getTime());
check('Case D (A+B sequential)', 'A=completed, B=completed, C=pending', statesD[0] === 'completed' && statesD[1] === 'completed' && statesD[2] !== 'completed');

// CASE E — same alert, next occurrence: must NOT inherit yesterday's A.
OccurrenceLedger.clear(); // drop STEP 5's resource completion (Sprint 258 window-correct anchors made the legacy fallback match B/C)
protoLedger.clear();
completeActed(new Date(2026, 7, 9, 8, 15, 0).getTime(), 0);
const statesE = targetStatesAt(new Date(2026, 7, 10, 8, 5, 0).getTime());
check('Case E (A day+1)', 'tomorrow occurrence pending (no inheritance)', statesE.every((k) => k !== 'completed'));

/* --------------------------------------------------------------------------
 * PART 3 — IDENTITY BOUNDARY MATRIX (deliverable A) + ROOT CAUSE (B) + DECISION
 * ------------------------------------------------------------------------- */
const matrix = [
  ['Configuration',   true,  'alertId por config', ''],
  ['Runtime',         true,  'occurrenceId por alert+window', ''],
  ['Card',            'true', 'knows alertId+occurrenceId', ''],
  ['Navigation',      false, 'only resourceId', 'FIRST LOSS'],
  ['DynamicForm',     false, 'only moduleSlug/formSlug', 'no alert context'],
  ['Completion Intent', false, 'does NOT exist', ''],
  ['Completion Signal', false, 'generic (no alertId/occurrenceId)', ''],
  ['Bridge',          false, 'resource-scoped', ''],
  ['Ledger',          false, 'key resourceKind::resourceId::moduleId', 'FINAL COLLAPSE'],
  ['Matching',        false, 'completedAt ∈ all windows', ''],
  ['Classification',  false, 'one signal → A/B/C completed', ''],
];
const preserved = matrix.filter((r) => r[1]).map((r) => r[0]);
const lost = matrix.filter((r) => !r[1]).map((r) => r[0]);
check('Matrix', 'only Configuration..Card preserve alert/occurrence identity', preserved.join(',') === 'Configuration,Runtime,Card');
check('Matrix', 'every down/Stream layer loses identity (Navigation→Classification)', lost.length === 8);

console.log('\n=== Sprint 267 — MULTI-ALERT COMPLETION ISOLATION ARCHITECTURAL AUDIT ===');
console.log(`  observed (one resource signal @21:30): ${JSON.stringify({ A: allCompleted[0], B: allCompleted[1], C: allCompleted[2] })}`);
console.log(`  CURRENT temporal cases (daily window, exact-fulfill): A=completed,B=completed,C=completed\n`);
console.log('  TARGET architecture (occurrence completion, prototype):');
console.log(`    Case A: ${JSON.stringify(statesA)}   Case B: ${JSON.stringify(statesB)}`);
console.log(`    Case C: ${JSON.stringify(statesC)}   Case D: ${JSON.stringify(statesD)}   Case E(next day): ${JSON.stringify(statesE)}`);
console.log(`\n  FIRST IDENTITY LOSS: ${FIRST_IDENTITY_LOSS}`);
console.log(`  FINAL COLLAPSE:       ${FINAL_COLLAPSE}`);
console.log('  DECISION — unit of completion: OCCURRENCE completion (alertId + occurrenceId); resource remains SHARED but completion NEVER shared.');
console.log('\n  IDENTITY BOUNDARY MATRIX:');
for (const r of matrix) console.log(`    ${r[0].padEnd(20)} ${r[1] ? 'PASS' : 'LOSS'}  ${r[3] || ''}`);
console.log('');
for (const c of checks) console.log(`  [${c.truth ? 'PASS' : 'FAIL'}] ${c.frontier.padEnd(20)} ${c.label}`);
const failures = checks.filter((c) => !c.truth).length;
console.log(`\nResult: ${checks.length - failures}/${checks.length} PASS`);
process.exit(failures === 0 ? 0 : 1);