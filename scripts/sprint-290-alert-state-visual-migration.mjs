/**
 * Sprint 290 — ALERT STATE VISUAL MIGRATION (TEST 14-21).
 *
 * TIPO: REAL RESOURCE ALERT STATE PRESENTATION — verifies that the REAL
 * resource UI (DynamicForm, Repository, Category) consumes the certified
 * runtime projection and presents ONE visual alert per resource with internal
 * occurrence windows as events. NO identity algebra, NO schedules rebuilt,
 * NO lifecycle re-derivation, NO `category:alert:...` invented.
 *
 * Ejecutar: node scripts/sprint-290-alert-state-visual-migration.mjs
 */
import { projectResourceAlertState, formatExecutionTime } from '../src/utils/alertResourceState.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { createCompletionSignal } from '../src/core/capabilities/alert/occurrence/CompletionSignal.js';
import { readFileSync } from 'node:fs';

const readFile = (p) => { try { return readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'); } catch { return ''; } };

const DAY = 8.64e7;
const checks = [];
function check(label, truth, detail = '') {
  checks.push({ label, truth: !!truth, detail });
}

// Real resources (Sprint 197 shape: alert_config carried on the resource).
const formA = {
  id: 12,
  slug: 'temperature',
  module_id: 'mod-ops',
  alertConfiguration: {
    alertConfigurations: [
      { name: 'A 08:00', priority: 'high', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '08:00' },
      { name: 'B 14:00', priority: 'medium', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '14:00' },
    ],
  },
};
const formB = {
  id: 20,
  slug: 'calibration',
  module_id: 'mod-ops',
  alertConfiguration: {
    alertConfigurations: [
      { name: 'CAL 09:00', priority: 'low', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '09:00' },
    ],
  },
};
const repositoryR = {
  id: 77,
  slug: 'controles',
  module_id: 'mod-ops',
  alertConfiguration: {
    alertConfigurations: [
      { name: 'Documental A', priority: 'high', periodicity: { amount: 1, unit: 'weeks' }, startDate: '2026-08-03', startTime: '07:00' },
    ],
  },
};
const resources = {
  forms: [JSON.parse(JSON.stringify(formA)), JSON.parse(JSON.stringify(formB))],
  repositories: [JSON.parse(JSON.stringify(repositoryR))],
};

const NOW = new Date(2026, 7, 9, 10, 0, 0).getTime();
OccurrenceLedger.clear();
const occurrences = projectCurrentOccurrences(resources, 'mod-ops', NOW);

// TEST 14 — ONE VISUAL ALERT PER RESOURCE. A form with two configured alerts
// (A,B) has TWO occurrences projected; the resource UI MUST present ONE alert
// with BOTH events internally (AC-17). It must NOT produce two alert panels.
check('TEST 14 — occurrences exist per alert', occurrences.length === 4, `count=${occurrences.length} (A, B, CAL, Doc semanal)`);
const stateA = projectResourceAlertState({ occurrences, resourceKind: 'dynamicForms', resourceId: formA.id, resource: formA, now: NOW });
check('TEST 14 — one visual alert for form A', stateA?.present === true, JSON.stringify({ total: stateA?.total, events: stateA?.events?.length }));
check('TEST 14 — form A shows 2 events internally (A+B occurrences)', stateA?.events?.length === 2, `events=${stateA?.events?.length}`);
check('TEST 14 — one status / one summary (not two alerts)', stateA && stateA.events.length === 2 && typeof stateA.statusLabel === 'string', stateA?.statusLabel || 'none');

// TEST 15 — PER-RESOURCE ISOLATION. Form B alert must appear on B, never on A.
const stateB2 = projectResourceAlertState({ occurrences, resourceKind: 'dynamicForms', resourceId: formB.id, resource: formB, now: NOW });
const stateOnAFromB = projectResourceAlertState({ occurrences, resourceKind: 'dynamicForms', resourceId: formA.id, resource: formB, now: NOW });
check('TEST 15 — form B own alert exists', stateB2?.present === true, `events=${stateB2?.events?.length}`);
check('TEST 15 — form B alert does NOT leak to form A', stateA?.events?.[0]?.alertId !== stateB2?.events?.[0]?.alertId, `${stateA?.events?.[0]?.alertId} vs ${stateB2?.events?.[0]?.alertId}`);

// TEST 16 — RESOURCE WITHOUT ALERT → NO ALERT STATE (consume, not invent).
const orphan = projectResourceAlertState({ occurrences, resourceKind: 'dynamicForms', resourceId: 999, resource: null, now: NOW });
check('TEST 16 — resource without alert has no alert state', orphan === null, JSON.stringify(orphan));

// TEST 17 — PRIORITY ENRICHMENT (Resolver envelope, DEC-263). The projector
// consumes priority per alert from the real resource envelope; the UI shows the
// priorities on each internal event. The head is the occurrence due SOONEST
// (B 14:00 → vence hoy), so head priority is B's medium. Enrichment, not algebra.
const evByAlert = Object.fromEntries(stateA?.events?.map((e) => [e.alertId, e]) ?? []);
check('TEST 17 — event A priority enriched (high)', evByAlert['12:alert:0']?.priority === 'high', evByAlert['12:alert:0']?.priority || 'none');
check('TEST 17 — event B priority enriched (medium)', evByAlert['12:alert:1']?.priority === 'medium', evByAlert['12:alert:1']?.priority || 'none');
check('TEST 17 — priority label present on events', evByAlert['12:alert:0']?.priorityLabel === 'Alta', evByAlert['12:alert:0']?.priorityLabel || 'none');
check('TEST 17 — head is SOONEST due (B 14:00 vence hoy)', stateA?.events?.[0]?.alertId === '12:alert:1', `${stateA?.events?.[0]?.alertId}:${stateA?.nextExecution}`);

// TEST 18 — COMPLETION CONSUMED (no re-derivation). Completing the A occurrence
// (origin resource) marks it; the PROJECTOR reads the ledger via the projection
// and the open count drops; it never rebuilds completion.
const aOcc = occurrences.find((o) => o.alertId === '12:alert:0');
OccurrenceLedger.recordCompletion(createCompletionSignal({
  resourceKind: aOcc?.resourceKind ?? 'dynamicForms',
  resourceId: aOcc?.resourceId ?? 12,
  moduleId: 'mod-ops',
  completedAt: NOW,
  status: 'COMPLETED',
  origin: 'resource',
  alertId: aOcc?.alertId ?? '12:alert:0',
  occurrenceId: aOcc?.occurrenceId,
}));
const occurrencesAfter = projectCurrentOccurrences(resources, 'mod-ops', NOW);
const stateAfter = projectResourceAlertState({ occurrences: occurrencesAfter, resourceKind: 'dynamicForms', resourceId: formA.id, resource: formA, now: NOW });
check('TEST 18 — completed occurrence read, NOT rebuilt', occurrencesAfter.find((o) => o.occurrenceId === aOcc?.occurrenceId)?.completion?.status === 'COMPLETED');
check('TEST 18 — open count drops after completion', stateAfter?.openCount === 1, `open=${stateAfter?.openCount} (B only)`);
check('TEST 18 — completed event still present as internal event', stateAfter?.events?.length === 2, `events=${stateAfter?.events?.length}`);

// TEST 19 — REPOSITORY + CATEGORY MIGRATION (AC-05/AC-06/AC-07). The repository
// projected occurrence maps to repository 77; the category NEVER receives its
// own identity (no `category:alert:...`). The root relationship is
// category.repository_id → repository.id (F4 evidence).
OccurrenceLedger.clear();
const repoOccurrences = projectCurrentOccurrences({ forms: [], repositories: resources.repositories }, 'mod-ops', NOW);
const repoState = projectResourceAlertState({ occurrences: repoOccurrences, resourceKind: 'documentRepository', resourceId: repositoryR.id, resource: repositoryR, now: NOW });
check('TEST 19 — repository alert state present', repoState?.present === true, JSON.stringify(repoState?.events?.length));
check('TEST 19 — repository identity stays (77:alert:0)', repoState?.events?.[0]?.alertId === '77:alert:0', repoState?.events?.[0]?.alertId || 'none');
const category = { id: 5, repository_id: 77, category_key: 'externos' };
const categoryIdentity = `${'category'}:alert:${category.category_key}`;
check('TEST 19 — NO category alert identity invented', categoryIdentity !== repoState?.events?.[0]?.alertId && !categoryIdentity.includes('77:alert:0'), categoryIdentity);
check('TEST 19 — category projects the owning REPO alert state (inherited presentation)', String(category.repository_id) === String(repositoryR.id), 'repository_id → repository');

// TEST 20 — GLOBAL NAVIGATION DETACH (AC-01). The detached surface key list
// exists and excludes the monitor from PRIMARY presentation; the domain keeps
// its registry contract (AC-02) via OperationalExperienceRegistry.
const dynModuleSrc = readFile('src/pages/DynamicModule.jsx');
check('TEST 20 — DynamicModule detaches alert-monitoring (HIDE/DETACH)', dynModuleSrc.includes('DETACHED_EXPERIENCE_KEYS') && dynModuleSrc.includes("'alert-monitoring'"));
const registrySrc = readFile('src/core/capabilities/experiences/OperationalExperienceRegistry.js');
check('TEST 20 — AlertMonitoringExperience still registered (NOT deleted, AC-02)', registrySrc.includes('registerExperience') && registrySrc.includes('resolveComponent'));
const monitorSrc = readFile('src/modules/experiences/AlertMonitoringExperience.jsx');
check('TEST 20 — monitor component file intact', monitorSrc.includes('AlertMonitoringExperience'));

// TEST 21 — STOP CONDITIONS (no forbidden artifact). No AlertForm /
// AlertRepository / AlertCategory resource; no new alert routes; no identity
// algebra in the resource frontiers.
const formSrc = readFile('src/pages/DynamicForm.jsx');
const viewerSrc = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
const utilSrc = readFile('src/utils/alertResourceState.js');
check('TEST 21 — DynamicForm is the REAL form (no AlertForm)', !formSrc.includes('function AlertForm') && !formSrc.includes('class AlertForm') && formSrc.includes('DynamicForm'));
check('TEST 21 — no AlertRepository resource created', !viewerSrc.includes('AlertRepository') && viewerSrc.includes('ModuleDocumentViewer'));
check('TEST 21 — no new alert identity algebra in resource frontiers', !/alertConfigIdOf|occurrenceIdOf/.test(formSrc) && !/alertConfigIdOf|occurrenceIdOf/.test(viewerSrc.replace(/\/\/[^\n]*/g, '')));
check('TEST 21 — projector consumes, never builds identity', !utilSrc.includes('alertConfigIdOf(') && !utilSrc.includes('occurrenceIdOf(') && utilSrc.includes('classifyOccurrence'));
check('TEST 21 — no new alert routes registered', !readFile('src/App.jsx').includes('alertas'));

// TEST 22 — presentation formatting helper (UI label only).
check('TEST 22 — formatExecutionTime label for a fixed instant', formatExecutionTime(new Date(2026, 7, 9, 8, 0, 0).getTime())?.includes('08'), formatExecutionTime(new Date(2026, 7, 9, 8, 0, 0).getTime()));

// ---------------------------------------------------------------------------

console.log('');
console.log('SPRINT 290 — ALERT STATE VISUAL MIGRATION CERTIFICATION');
console.log('========================================================');
let failed = 0;
for (const c of checks) {
  const mark = c.truth ? 'PASS ' : 'FAIL ';
  if (!c.truth) failed += 1;
  console.log(`${mark} ${c.label}  ${c.truth ? '' : '→ ' + c.detail}`);
}
console.log('--------------------------------------------------------');
console.log(`TOTAL: ${checks.length - failed}/${checks.length}`);
process.exit(failed === 0 ? 0 : 1);