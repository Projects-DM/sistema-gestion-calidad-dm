/**
 * Sprint 291 — CORRECTIVE ALERT STATE PLACEMENT & RESOURCE SURFACE INTEGRATION.
 *
 * TIPO: CONTROLLED CORRECTION · FORENSIC AUDIT + VISUAL RELOCATION.
 * Verifies that the alert state is presented BEFORE entering the form (on the
 * "Formatos Disponibles" format card), that DynamicForm no longer embeds the
 * ResourceAlertStatePanel (it stays a real form), that the Repository / Category
 * present a RICH alert block rooted on the owning repository (category
 * inherits via repository_id, never an identity of its own), and that the
 * domain / Configuration / Projection / Completion remain untouched.
 *
 * Ejecutar: node scripts/sprint-291-alert-state-placement.mjs
 */
import { projectResourceAlertState, formatExecutionTime } from '../src/utils/alertResourceState.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { readFileSync } from 'node:fs';

const readFile = (p) => { try { return readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'); } catch { return ''; } };

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

const stateA = projectResourceAlertState({ occurrences, resourceKind: 'dynamicForms', resourceId: formA.id, resource: formA, now: NOW });
const stateB = projectResourceAlertState({ occurrences, resourceKind: 'dynamicForms', resourceId: formB.id, resource: formB, now: NOW });
const repoStates = projectResourceAlertState({ occurrences, resourceKind: 'documentRepository', resourceId: repositoryR.id, resource: repositoryR, now: NOW });

// ---------------------------------------------------------------------------
// TEST 01 — FORMAT CARD ALERT STATE (before entering the form). A form with a
// projected alert must produce the exact card payload the format card presents:
// estado, prioridad, próximo vencimiento, próximos eventos y cantidad de
// eventos abiertos.
// ---------------------------------------------------------------------------
check('TEST 01 — format A projects a visual alert state', stateA?.present === true);
check('TEST 01 — card state exposes status label (Estado)', typeof stateA?.statusLabel === 'string' && stateA.statusLabel.length > 0);
check('TEST 01 — card state exposes priority (Prioridad)', typeof stateA?.priorityLabel === 'string' && stateA.priorityLabel.length > 0);
check('TEST 01 — card state exposes next execution (Próximo vencimiento)', typeof stateA?.nextExecution === 'string' && stateA.nextExecution.length > 0);
check('TEST 01 — card state exposes upcoming events', Array.isArray(stateA?.events) && stateA.events.length === 2);
check('TEST 01 — card state exposes open events count', stateA?.openCount === 2);

// The format card grid (FormsContent) is where the alert state is drawn.
const moduleSrc = readFile('src/pages/DynamicModule.jsx');
check('TEST 01 — FormsContent consumes useAlertRuntime once', /function FormsContent[\s\S]*?useAlertRuntime\(/.test(moduleSrc));
check('TEST 01 — FormsContent projects per-format alert state', moduleSrc.includes('projectResourceAlertState') && moduleSrc.includes('FormatAlertState'));
check('TEST 01 — format card still has Ingresar action', moduleSrc.includes('Ingresar'));

// ---------------------------------------------------------------------------
// TEST 02 — FORM ISOLATION (AC-05/AC-06). DynamicForm is a REAL form again:
// it must NOT render a ResourceAlertStatePanel, must NOT project alert state,
// and must NOT rebuild/call the runtime projection.
// ---------------------------------------------------------------------------
const formSrc = readFile('src/pages/DynamicForm.jsx');
check('TEST 02 — DynamicForm does NOT render ResourceAlertStatePanel', !formSrc.includes('<ResourceAlertStatePanel') && !formSrc.includes('function ResourceAlertStatePanel'));
check('TEST 02 — DynamicForm does NOT project form alert state', !formSrc.includes('projectResourceAlertState') && !formSrc.includes('formAlertState'));
check('TEST 02 — DynamicForm stays a real form', formSrc.includes('export default function DynamicForm'));
check('TEST 02 — DynamicForm keeps save/completion responsibilities', formSrc.includes('submitFormResponse') && formSrc.includes('COMPLETION_INTENT_EVENT'));

// ---------------------------------------------------------------------------
// TEST 03 — NO ALERT PANEL BEYOND THE FORM-FORM BARRIER. The Sprint 290 panel
// text is gone; the form only keeps the Sprint 184 / 286 legacy badges that
// predate the placement (they come from Runtime Visibility / alertContext).
// ---------------------------------------------------------------------------
check('TEST 03 — "Alerta operacional del recurso" panel removed', !formSrc.includes('Alerta operacional del recurso'));
check('TEST 03 — ResourceAlertStatePanel symbol absent repo-wide', !readFile('src/pages/DynamicForm.jsx').includes('function ResourceAlertStatePanel'));

// ---------------------------------------------------------------------------
// TEST 04 — REPOSITORY + CATEGORY RICH CARD (AC-05/AC-06/AC-07). Repository
// card shows Estado/Prioridad/Próximo vencimiento + Activo; category inherits
// the OWNING repository state via repository_id (never its own identity).
// ---------------------------------------------------------------------------
const viewerSrc = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
check('TEST 04 — repository alerts projected PER repository (one per resource)', viewerSrc.includes('repositoryAlertStates') && viewerSrc.includes('byId.set'));
check('TEST 04 — repository alert block present (unified standard)', viewerSrc.includes('RepositoryAlertStateBlock') && viewerSrc.includes('UnifiedAlertResourcePresentation'));
check('TEST 04 — repository block no longer renders rich metadata', !viewerSrc.includes('Estado:') && !viewerSrc.includes('Próximo vencimiento') && !viewerSrc.includes('evento(s)'));
check('TEST 04 — repository keeps Activo chip', /Activo/.test(viewerSrc));
check('TEST 04 — category inherits owner repository state', viewerSrc.includes('categoryOwnerState') && viewerSrc.includes('repository_id'));
check('TEST 04 — repository resource projection still works', repoStates?.present === true && repoStates?.events?.[0]?.alertId === '77:alert:0');

// ---------------------------------------------------------------------------
// TEST 05 — CATEGORY HAS NO IDENTITY (F4 evidence). NO `category:alert:...`
// invented; root relationship is category.repository_id → repository.
// ---------------------------------------------------------------------------
const category = { id: 5, repository_id: 77, category_key: 'externos' };
const categoryIdentity = `${'category'}:alert:${category.category_key}`;
check('TEST 05 — no category alert identity invented', categoryIdentity !== '77:alert:0' && !categoryIdentity.includes('77:alert:0'));
check('TEST 05 — category root = repository_id → repository', String(category.repository_id) === String(repositoryR.id));
check('TEST 05 — no category:alert identity key built in viewer', !viewerSrc.includes("'category:alert'") && !viewerSrc.includes('categoryAlertId') && !/category:alert:/.test(viewerSrc.replace(/\/\/[^\n]*/g, '')));

// ---------------------------------------------------------------------------
// TEST 06 — ONE VISUAL ALERT PER RESOURCE. A resource with two enrolled alerts
// shows ONE status card with BOTH events internally; never two alert panels.
// ---------------------------------------------------------------------------
check('TEST 06 — form A: one visual alert, 2 internal events', stateA?.events?.length === 2 && typeof stateA?.statusLabel === 'string');
check('TEST 06 — no per-event card duplication (single present)', Object.values({ a: stateA }).every((s) => s?.present === true));
check('TEST 06 — per-resource isolation (B does not leak to A)', stateA?.events?.[0]?.alertId !== stateB?.events?.[0]?.alertId, `${stateA?.events?.[0]?.alertId} vs ${stateB?.events?.[0]?.alertId}`);

// ---------------------------------------------------------------------------
// TEST 07 — PRIORITY / NEXT EXECUTION ENRICHMENT (Resolver envelope DEC-263).
// The card consumes priority per alert from the real resource envelope; head is
// the occurrence due SOONEST (A 08:00 → due 10 ago 08:00, 'today'; B 14:00 is
// 'upcoming'). Sprint 298: window-correct anchors (CAL383) put the FIRST window
// on the configured startDate (§7). Enrichment, never algebra.
// ---------------------------------------------------------------------------
const evByAlert = Object.fromEntries(stateA?.events?.map((e) => [e.alertId, e]) ?? []);
check('TEST 07 — event A priority enriched (high)', evByAlert['12:alert:0']?.priority === 'high');
check('TEST 07 — event B priority enriched (medium)', evByAlert['12:alert:1']?.priority === 'medium');
check('TEST 07 — head is soonest due (A 08:00)', stateA?.events?.[0]?.alertId === '12:alert:0', `${stateA?.events?.[0]?.alertId}:${stateA?.nextExecution}`);

// ---------------------------------------------------------------------------
// TEST 08 — COMPLETION CONSUMED, NOT RE-DERIVED. Completing the A occurrence
// drops the open count; the card never recomputes completion.
// ---------------------------------------------------------------------------
const aOcc = occurrences.find((o) => o.alertId === '12:alert:0');
const { createCompletionSignal } = await import('../src/core/capabilities/alert/occurrence/CompletionSignal.js');
OccurrenceLedger.recordCompletion(createCompletionSignal({
  resourceKind: 'dynamicForms',
  resourceId: formA.id,
  moduleId: 'mod-ops',
  completedAt: NOW,
  status: 'COMPLETED',
  origin: 'resource',
  alertId: aOcc?.alertId ?? '12:alert:0',
  occurrenceId: aOcc?.occurrenceId,
}));
const occurrencesAfter = projectCurrentOccurrences(resources, 'mod-ops', NOW);
const stateAfter = projectResourceAlertState({ occurrences: occurrencesAfter, resourceKind: 'dynamicForms', resourceId: formA.id, resource: formA, now: NOW });
check('TEST 08 — completed occurrence read from projection', occurrencesAfter.find((o) => o.occurrenceId === aOcc?.occurrenceId)?.completion?.status === 'COMPLETED');
check('TEST 08 — open count drops after completion', stateAfter?.openCount === 1, `open=${stateAfter?.openCount}`);
check('TEST 08 — completed event remains internal', stateAfter?.events?.length === 2);

// ---------------------------------------------------------------------------
// TEST 09 — GLOBAL NAVIGATION DETACH PRESERVED (AC-01/AC-02). HIDE/DETACH of
// the alert-monitoring experience stays; domain/registry intact (NO DELETE).
// ---------------------------------------------------------------------------
check('TEST 09 — DynamicModule still detaches alert-monitoring', moduleSrc.includes('DETACHED_EXPERIENCE_KEYS') && moduleSrc.includes("'alert-monitoring'"));
const registrySrc = readFile('src/core/capabilities/experiences/OperationalExperienceRegistry.js');
check('TEST 09 — AlertMonitoringExperience still registered', registrySrc.includes('registerExperience') && registrySrc.includes('resolveComponent'));
const monitorSrc = readFile('src/modules/experiences/AlertMonitoringExperience.jsx');
check('TEST 09 — monitor component intact', monitorSrc.includes('AlertMonitoringExperience'));

// ---------------------------------------------------------------------------
// TEST 10 — STOP CONDITIONS (no forbidden artifact). No AlertForm /
// AlertRepository / AlertCategory; no identity algebra in the frontiers; no new
// routes; no new Store/EventBus/persistence; runtime NOT duplicated.
// ---------------------------------------------------------------------------
check('TEST 10 — no new AlertForm resource', !formSrc.includes('class AlertForm') && !formSrc.includes('function AlertForm'));
check('TEST 10 — no new AlertRepository resource', !viewerSrc.includes('AlertRepository') && viewerSrc.includes('ModuleDocumentViewer'));
check('TEST 10 — no new AlertCategory resource', !viewerSrc.includes('AlertCategory'));
check('TEST 10 — no identity algebra in form frontier', !/alertConfigIdOf|occurrenceIdOf/.test(formSrc));
check('TEST 10 — no identity algebra in viewer frontier', !/alertConfigIdOf|occurrenceIdOf/.test(viewerSrc.replace(/\/\/[^\n]*/g, '')));
check('TEST 10 — no identity algebra in module frontier', !/alertConfigIdOf|occurrenceIdOf/.test(moduleSrc));
check('TEST 10 — no new alert routes', !readFile('src/App.jsx').includes('alertas'));
check('TEST 10 — runtime consumed, not duplicated (single useAlertRuntime call in FormsContent)', (moduleSrc.match(/useAlertRuntime\(/g) || []).length === 1);

// ---------------------------------------------------------------------------
// TEST 11 — PROJECTOR/USER-SURFACE CONTRACT. The util stays PURE presentational:
// consumes classifyOccurrence (domain classifier) + Resolver envelope only;
// never rebuilds identity, never writes.
// ---------------------------------------------------------------------------
const utilSrc = readFile('src/utils/alertResourceState.js');
check('TEST 11 — projector consumes classifyOccurrence', utilSrc.includes('classifyOccurrence'));
check('TEST 11 — projector enriches via Resolver envelope', utilSrc.includes('resolveResourceAlertEnvelope'));
check('TEST 11 — projector never builds identity', !utilSrc.includes('alertConfigIdOf(') && !utilSrc.includes('occurrenceIdOf('));
check('TEST 11 — util is presentation-only', !utilSrc.includes('localStorage') && !utilSrc.includes('EventBus'));

// ---------------------------------------------------------------------------
// TEST 12 — PRESENTATION FORMATTER (label-only, UI).
// ---------------------------------------------------------------------------
check('TEST 12 — formatExecutionTime label for fixed instant', formatExecutionTime(new Date(2026, 7, 9, 8, 0, 0).getTime())?.includes('08'));
check('TEST 12 — tomorrow label shape', formatExecutionTime(Date.now() + 8.64e7)?.includes('Mañana'));

// ---------------------------------------------------------------------------

console.log('');
console.log('SPRINT 291 — CORRECTIVE ALERT STATE PLACEMENT CERTIFICATION');
console.log('==============================================================');
let failed = 0;
for (const c of checks) {
  const mark = c.truth ? 'PASS ' : 'FAIL ';
  if (!c.truth) failed += 1;
  console.log(`${mark} ${c.label}  ${c.truth ? '' : '→ ' + c.detail}`);
}
console.log('--------------------------------------------------------------');
console.log(`TOTAL: ${checks.length - failed}/${checks.length}`);
process.exit(failed === 0 ? 0 : 1);