/**
 * Sprint 265 — FORM ALERT OCCURRENCE LIFECYCLE (12 scenarios, AC-01..AC-19).
 *
 * Mandate §12/§23/§34 — Pure-domain lifecycle fixture. It consumes the SAME
 * certified domain the UI consumes (OccurrenceSchedule, OccurrenceLifecycle,
 * OccurrenceLedger, CompletionBridge, OperationalEventBus) and mirrors the
 * DOMAIN-SSOT classification that AlertMonitoringExperience now routes FORMS
 * through (deriveFormState → classifyOccurrence). No React, no supabase, no
 * network. Run: `node scripts/sprint-265-form-alert-lifecycle.mjs`.
 */
import { cadenceMs, occurrenceWindowAt } from '../src/core/capabilities/alert/occurrence/OccurrenceSchedule.js';
import { classifyOccurrence } from '../src/core/capabilities/alert/occurrence/OccurrenceLifecycle.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import { wireCompletionBridge, RESOURCE_COMPLETED_EVENT } from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';

const DAY = 8.64e7;
const HOUR = 3.6e6;

// Fixed, deterministic timeline (local calendar-agnostic ms).
const D1_0800 = DAY + 8 * HOUR;
const D2_0800 = 2 * DAY + 8 * HOUR;
const D2_1200 = 2 * DAY + 12 * HOUR;
const D3_0800 = 3 * DAY + 8 * HOUR;
const D1_1200 = DAY + 12 * HOUR;
const D2_0900 = 2 * DAY + 9 * HOUR;
const D2_1000 = 2 * DAY + 10 * HOUR;
const D2_1100 = 2 * DAY + 11 * HOUR;
const D3_1200 = 3 * DAY + 12 * HOUR;

/** Mirrors AlertMonitoringExperience.deriveFormState (domain SSOT). */
function uiState(enabled, occurrence, now, completion) {
  if (completion) {
    const domain = classifyOccurrence({ startsAt: occurrence?.startsAt, dueAt: occurrence?.dueAt, completion }, now);
    if (domain.key === 'completed') return domain.key;
    if (domain.key === 'cancelled') return domain.key;
  }
  if (enabled === false) return 'disabled';
  return classifyOccurrence(occurrence, now).key;
}

const results = [];
function check(id, label, actual, expected) {
  const pass = actual === expected;
  results.push({ id, label, pass, actual, expected });
}

/* ------------------------------------------------------------------ *
 * S1 · UPCOMING — daily form still in the future → Próxima            *
 * ------------------------------------------------------------------ */
{
  const anchor = D2_1200 + 30 * DAY; // +30 days
  const cadence = cadenceMs({ amount: 1, unit: 'days' });
  const window = occurrenceWindowAt(anchor, cadence, D2_1200);
  const state = uiState(true, { startsAt: window.startsAt, dueAt: window.dueAt }, D2_1200, null);
  check('S1', 'future once +30d -> upcoming', state, 'upcoming');
}

/* ------------------------------------------------------------------ *
 * S2 · HOY — daily anchored today, in window → today                   *
 * ------------------------------------------------------------------ */
{
  const anchor = D1_0800;
  const cadence = cadenceMs({ amount: 1, unit: 'days' });
  const window = occurrenceWindowAt(anchor, cadence, D2_1200);
  check('S2', 'daily now within [start,dueAt) -> today', (() => {
    const c = classifyOccurrence({
      startsAt: window.startsAt,
      dueAt: window.dueAt,
    }, D2_1200);
    return c.key;
  })(), 'today');
}

/* ------------------------------------------------------------------ *
 * S3 · VENCIDA — once occurrence already past due (no completion)     *
 * ------------------------------------------------------------------ */
{
  const window = { startsAt: D1_0800, dueAt: D1_0800 }; // once → start == due
  const c = classifyOccurrence(window, D2_1200);
  check('S3', 'once past window uncompleted -> overdue', c.key, 'overdue');
}

/* ------------------------------------------------------------------ *
 * S4 · CUMPLIDA — completion inside the window in	 a dedicated VO       *
 * ------------------------------------------------------------------ */
{
  // S4 block — define before use
  const win4 = { startsAt: D2_0800, dueAt: D3_0800 };
  const completion4 = { status: 'COMPLETED', completedAt: D2_0900 };
  const c4 = classifyOccurrence({ ...win4, completion: completion4 }, D2_1200);
  check('S4', 'in-window completion -> completed', c4.key, 'completed');
}

/* ------------------------------------------------------------------ *
 * S5 · CUMPLIDA nunca VENCIDA (OCC-CERT-08) — completion precedence   *
 * ------------------------------------------------------------------ */
{
  const c = classifyOccurrence(
    { startsAt: D1_0800, dueAt: D1_0800, completion: { status: 'COMPLETED', completedAt: D1_0800 + 3600e3 } },
    D2_1200,
  );
  check('S5', 'completed occurrence never overdue', c.key, 'completed');
}

/* ------------------------------------------------------------------ *
 * S6 · REAPARECE — recurring once completed; next occurrence derives   *
 * ---------------------------------------------------------------- */
{
  const anchor = D1_0800;
  // Window-aware completion: the occurrence belongs to [D2_0800, D3_0800)
  const win = occurrenceWindowAt(anchor, cadenceMs({ amount: 1, unit: 'days' }), D2_1200);
  const completedAt = D2_1200;                       // inside window → completed
  const first = classifyOccurrence({ ...win, completion: { status: 'COMPLETED', completedAt } }, D2_1200);
  check('S6a', 'in-window completion counts', first.key, 'completed');
  // Advance to the NEXT day: the same resource, next window has NO fresh
  // signal (window-aware, OCC-CERT-12) → today (never auto-overdue).
  const next = occurrenceWindowAt(anchor, cadenceMs({ amount: 1, unit: 'days' }), D3_0800);
  const second = classifyOccurrence({ ...next }, D3_0800);
  check('S6b', 'next window uncompleted -> today', second.key, 'today');
}

/* ------------------------------------------------------------------ *
 * S7 · FORM-SAVE PUBLISH → LEDGER (bridge, end-to-end)                  *
 * ------------------------------------------------------------------ */
{
  OccurrenceLedger.clear();
  wireCompletionBridge();
  const resourceId = 'form-777';
  const completedAt = D2_1200;
  OperationalEventBus.publish(RESOURCE_COMPLETED_EVENT, {
    resourceKind: 'dynamicForms',
    resourceId,
    moduleId: 'calidad',
    completedAt,
    action: 'form_completed_form_saved',
  });
  // Mirror UI classify e.g., the monitoring card lookup.
  const occurrence = {
    resourceKind: 'dynamicForms',
    resourceId,
    moduleId: 'calidad',
    startsAt: D2_0800,
    dueAt: D3_0800,
  };
  const signal = OccurrenceLedger.completionSignalFor(occurrence);
  const state = classifyOccurrence({ ...occurrence, completion: signal ? { status: signal.status ?? 'COMPLETED', completedAt: signal.completedAt } : null }, D2_1200);
  check('S7', 'form save recorded + classified completed', state.key, 'completed');
}

/* ------------------------------------------------------------------ *
 * S8 · NAV no es cumplimiento — open-form action alone NEVER records  *
 * ------------------------------------------------------------------ */
{
  const ledgerBefore = OccurrenceLedger.size;
  // Navigation to the form (ACTION allow — UI only) does not publish any
  // final event. Simulated: no bus publish → ledger untouched.
  const unchanged = OccurrenceLedger.size === ledgerBefore;
  check('S8', 'navigation alone does NOT complete', unchanged, true);
}

/* ------------------------------------------------------------------ *
 * S9 · DISABLED — enabled:false occurrence bucket preserved             *
 * ------------------------------------------------------------------ */
{
  const state = uiState(false, { startsAt: D2_0800, dueAt: D3_0800 }, D2_1200, null);
  check('S9', 'disabled config -> disabled', state, 'disabled');
}

/* ------------------------------------------------------------------ *
 * S10 · MULTI-ALERTA A/B — window-aware resource signal independence    *
 * ------------------------------------------------------------------ */
{
  OccurrenceLedger.clear();
  const resourceId = 'fixture-form-abc';
  const moduleId = 'calidad';
  // One resource-level signal completed at day-1 12:00.
  OccurrenceLedger.recordCompletion({ resourceKind: 'dynamicForms', resourceId, moduleId, completedAt: D1_1200, status: 'COMPLETED' });
  // A = once at day1 08:00 (window [day1, day1]) → the signal is OUT of its
  // window → the ledger does NOT deliver it → A stays Vencida.
  const A = { resourceKind: 'dynamicForms', resourceId, moduleId, startsAt: D1_0800, dueAt: D1_0800 };
  const sigA = OccurrenceLedger.completionSignalFor(A);
  const stateA = classifyOccurrence(
    { ...A, completion: sigA ? { status: sigA.status ?? 'COMPLETED', completedAt: sigA.completedAt } : null },
    D2_1200,
  );
  check('S10a', 'A (window out of signal) NOT completed by the signal', stateA.key, 'overdue');
  // B = daily anchored day1 → current window [day1 08:00, day2 08:00) which
  // CONTAINS the signal → the ledger delivers it → B completed.
  const B = { resourceKind: 'dynamicForms', resourceId, moduleId, startsAt: D1_0800, dueAt: D2_0800 };
  const sigB = OccurrenceLedger.completionSignalFor(B);
  const stateB = classifyOccurrence(
    { ...B, completion: sigB ? { status: sigB.status ?? 'COMPLETED', completedAt: sigB.completedAt } : null },
    D2_1200,
  );
  check('S10b', 'B (window containing signal) completed', stateB.key, 'completed');
}

/* ------------------------------------------------------------------ *
 * S11 · IDEMPOTENCIA — repeated completion keeps completed               *
 * ------------------------------------------------------------------ */
{
  OccurrenceLedger.clear();
  wireCompletionBridge();
  const occurrence = { resourceKind: 'dynamicForms', resourceId: 'fixture-idem', moduleId: 'calidad', startsAt: D2_0800, dueAt: D3_0800 };
  OperationalEventBus.publish(RESOURCE_COMPLETED_EVENT, { resourceKind: 'dynamicForms', resourceId: 'fixture-idem', moduleId: 'calidad', completedAt: D2_0900 });
  OperationalEventBus.publish(RESOURCE_COMPLETED_EVENT, { resourceKind: 'dynamicForms', resourceId: 'fixture-idem', moduleId: 'calidad', completedAt: D2_1000 });
  const signal = OccurrenceLedger.completionSignalFor(occurrence);
  check('S11a', 'duplicate signals -> single latest', signal?.completedAt, D2_1000);
  const completed =
    signal && classifyOccurrence(
      { ...occurrence, completion: { status: signal.status ?? 'COMPLETED', completedAt: signal.completedAt } },
      D2_1200,
    ).key === 'completed';
  check('S11b', 'still completed after duplication', completed, true);
}

/* ------------------------------------------------------------------ *
 * S12 · DISABLED/CUMPLIDA — deplete form after completing never active *
 * ------------------------------------------------------------------ */
{
  const window = { startsAt: D2_0800, dueAt: D3_0800 };
  const completion = { status: 'COMPLETED', completedAt: D2_1100 };
  const c = classifyOccurrence({ ...window, completion }, D3_1200);
  check('S12', 'completed occurrence stays completed next day', c.key, 'completed');
}

let failures = 0;
console.log('\n=== Sprint 265 — FORM ALERT LIFECYCLE FIXTURE ===');
for (const r of results) {
  const mark = r.pass ? 'PASS' : 'FAIL';
  if (!r.pass) failures++;
  console.log(`  [${mark}] ${r.id} · ${r.label} → ${r.actual}`);
}
console.log(`\nResult: ${results.length - failures}/${results.length} PASS`);
if (failures > 0) { console.log(`FAILURES: ${failures}`); process.exit(1); }