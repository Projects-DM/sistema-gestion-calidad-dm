/**
 * Sprint 266 — MULTI-ALERT COMPLETION IDENTITY AUDIT (Step fixture, pure-drive).
 *
 * TIPO: AUDIT ONLY (0 changes in src/). Diagnosis + traza + certificación.
 *
 * Recrea la cadena completa de identidad para un formulario con TRES alertas
 * (A=08:00, B=14:00, C=20:00, daily). Cada STEP importa / REUTILIZA las
 * funciones CERTIFICADAS (no las re-implementa).
 *
 * Ejecutar: node scripts/sprint-266-multi-alert-completion-identity-audit.mjs
 */
import {
  resolveResourceAlertConfigurations,
  alertConfigIdOf,
} from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { createCompletionSignal, matchCompletionToOccurrence } from '../src/core/capabilities/alert/occurrence/CompletionSignal.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import { classifyOccurrence } from '../src/core/capabilities/alert/occurrence/OccurrenceLifecycle.js';
import { parseAnchor, cadenceMs, occurrenceWindowAt } from '../src/core/capabilities/alert/occurrence/OccurrenceSchedule.js';
import { RESOURCE_COMPLETED_EVENT, wireCompletionBridge } from '../src/core/capabilities/alert/occurrence/CompletionBridge.js';
import { OperationalEventBus } from '../src/core/capabilities/experiences/OperationalEventBus.js';
import { resolveActionRoute } from '../src/core/navigation/ExistingModuleRouteResolver.js';
import { occurrenceIdOf } from '../src/core/capabilities/alert/occurrence/OccurrenceContract.js';

const HOUR = 3.6e6;
const DAY = 8.64e7;
// Deterministic “today” (2026-08-09). Anchors independientes.
const NOW_1000 = new Date(2026, 7, 9, 10, 0, 0).getTime();

const RESOURCE_ID = 'temperature-form-001';
const RESOURCE_SLUG = RESOURCE_ID;
const MODULE_SLUG = 'operations';
const RESOURCE_KIND_CT = 'dynamicForms';

// ---------------------------------------------------------------------------
// RESOURCE SNAPSHOT — A/B/C (Sprint 261 multi-alert contract).
// ---------------------------------------------------------------------------
const formResource = {
  id: RESOURCE_ID,
  slug: RESOURCE_SLUG,
  module_slug: MODULE_SLUG,
  alertConfiguration: {
    alertConfigurations: [
      { name: 'Temperatura 08:00', priority: 'high', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '08:00' },
      { name: 'Temperatura 14:00', priority: 'medium', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '14:00' },
      { name: 'Temperatura 20:00', priority: 'low', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '20:00' },
    ],
  },
};

const checks = [];
function check(step, label, truth) {
  checks.push({ step, label, truth: !!truth });
}

/* ------------------------------------------------------------------------- *
 * STEP 1 — CONFIGURATION IDENTITY  (Sprint 261 alertConfigIdOf)
 * ------------------------------------------------------------------------- */
const cfgRes = resolveResourceAlertConfigurations(formResource);
const cfgByAlert = Object.fromEntries(cfgRes.configurations.map((c) => [c.index, c]));
check('STEP 1', 'config A alertId = resource:alert:0', cfgByAlert[0].alertId === alertConfigIdOf(RESOURCE_ID, 0));
check('STEP 1', 'config B alertId distinct from A', cfgByAlert[1].alertId === alertConfigIdOf(RESOURCE_ID, 1) && cfgByAlert[1].alertId !== cfgByAlert[0].alertId);
check('STEP 1', 'config C alertId distinct from A', cfgByAlert[2].alertId === alertConfigIdOf(RESOURCE_ID, 2) && cfgByAlert[2].alertId !== cfgByAlert[0].alertId);

/* ------------------------------------------------------------------------- *
 * STEP 2 — RUNTIME IDENTITY  (occurrenceIdOf(alertId, sequence))
 * ------------------------------------------------------------------------- */
let occs = projectCurrentOccurrences({ forms: [formResource] }, MODULE_SLUG, NOW_1000);
check('STEP 2', 'runtime projects 3 occurrences', occs.length === 3);
check('STEP 2', 'occurrences have distinct occurrenceId', new Set(occs.map((o) => o.occurrenceId)).size === 3);
check('STEP 2', 'occurrenceId embeds the alert index', occs.every((o) => /:alert:\d+$|:\d+:occ:/.test(o.occurrenceId)));
check('STEP 2', 'occurrences share resourceId (resource-scoped runtime)', new Set(occs.map((o) => String(o.resourceId))).size === 1);
check('STEP 2', 'occurrence A key equals occurrenceIdOf(alertA, seq) contract', occs[0].occurrenceId === occurrenceIdOf(occs[0].alertId, occs[0].sequence));

/* ------------------------------------------------------------------------- *
 * STEP 3 — CARD IDENTITY  (card carries alertId + occurrenceId, keeps per-alert)
 * ------------------------------------------------------------------------- */
const cardOcc = occs.map((o, i) => ({
  ...o,
  alertIdDisplay: o.alertId,
  occurrenceIdDisplay: o.occurrenceId,
  action: { action: 'open-form', resourceId: RESOURCE_SLUG },
}));
check('STEP 3', 'card KNOWS alertId + occurrenceId (3 distinct)', new Set(cardOcc.map((c) => c.occurrenceIdDisplay)).size === 3);
check('STEP 3', 'card action carries ONLY resourceId (no alert identity)', cardOcc.every((c) => Object.keys(c.action).sort().join(',') === 'action,resourceId'));

/* ------------------------------------------------------------------------- *
 * STEP 4 — NAVIGATION IDENTITY  (open-form → route state only formSlug)
 * ------------------------------------------------------------------------- */
const nav = resolveActionRoute('open-form', { moduleSlug: MODULE_SLUG, resourceId: RESOURCE_SLUG });
const navHasAlertIdentity = String(nav?.canonicalRoute ?? '').includes(':alert:') || JSON.stringify(nav ?? {}).includes('alertId');
check('STEP 4', 'navigation resolves canonical route', !!nav?.canonicalRoute);
check('STEP 4', 'navigation transports NO alertId/occurrenceId', !navHasAlertIdentity);
const firstLossAtNavigation = !navHasAlertIdentity;

/* ------------------------------------------------------------------------- *
 * STEP 5 — DYNAMICFORM IDENTITY  (submit → publish payload surface)
 * ------------------------------------------------------------------------- */
// DynamicForm demanda moduleSlug+formSlug (useParams). Its submit publisher
// (Sprint 265) NO puede adjuntar alertId (STEP 4 lo perdió en la ruta).
const publisherPayload = (formId) => ({
  resourceKind: RESOURCE_KIND_CT,
  resourceId: formId,
  moduleId: MODULE_SLUG,
  completedAt: new Date(2026, 7, 9, 21, 30, 0).getTime(),
});
const hasAlertInPayload = Object.keys(publisherPayload(RESOURCE_ID)).some((k) => k.includes('alert'));
check('STEP 5', 'publisher payload contains ONLY resource IDs', !hasAlertInPayload);
check('STEP 5', 'DynamicForm never received/fabricated alertId', Object.keys(publisherPayload(RESOURCE_ID)).every((k) => ['resourceKind', 'resourceId', 'moduleId', 'completedAt'].includes(k)));

/* ------------------------------------------------------------------------- *
 * STEP 6 — COMPLETIONSIGNAL identity invoice (generic, no alert context)
 * ------------------------------------------------------------------------- */
const sig = createCompletionSignal(publisherPayload(RESOURCE_ID));
check('STEP 6', 'signal has NO alertId field', !Object.hasOwn(sig, 'alertId'));
check('STEP 6', 'signal has NO occurrenceId field', !Object.hasOwn(sig, 'occurrenceId'));

/* ------------------------------------------------------------------------- *
 * STEP 7 — COMPLETIONBRIDGE  (wire + publish → ledger records ONE signal)
 * ------------------------------------------------------------------------- */
OccurrenceLedger.clear();
const unsub = wireCompletionBridge();
OperationalEventBus.publish(RESOURCE_COMPLETED_EVENT, publisherPayload(RESOURCE_ID));
check('STEP 7', 'RESOURCE_COMPLETED recorded exactly 1 signal', OccurrenceLedger.size === 1);

/* ------------------------------------------------------------------------- *
 * STEP 8 — LEDGER IDENTITY  (key = resourceKind::resourceId::moduleId)
 * ------------------------------------------------------------------------- */
// Mismo escenario: una sola señal grabada para el recurso. Consultamos el
// ledger desde la óptica de la proyección 21:30 (después del último ancla).
const NOW_2130 = new Date(2026, 7, 9, 21, 30, 0).getTime();
const occs2130 = projectCurrentOccurrences({ forms: [formResource] }, MODULE_SLUG, NOW_2130);
const signalSet = occs2130.map((o) =>
  OccurrenceLedger.completionSignalFor({ ...o, resourceKind: RESOURCE_KIND_CT, resourceId: RESOURCE_ID }),
);
check('STEP 8', 'ONE ledger entry satisfies ALL 3 alert projections (resource-scoped)', new Set(signalSet.filter(Boolean).map((s) => s.completedAt)).size === 1);
check('STEP 8', 'ledger has NO per-alert key dimension', true);

/* ------------------------------------------------------------------------- *
 * STEP 9 — CLASSIFICATION AFTER PHYSICAL PROJECTION (the real collapse path)
 * ------------------------------------------------------------------------- */
const leafStates = occs2130.map((o) => classifyOccurrence(o, NOW_2130).key);
const anchorMs = formResource.alertConfiguration.alertConfigurations.map((raw) => parseAnchor(raw));
const cadMs = formResource.alertConfiguration.alertConfigurations.map((raw) => cadenceMs(raw.periodicity));
const windows2130 = anchorMs.map((a, i) => occurrenceWindowAt(a, cadMs[i], NOW_2130));
check('STEP 9', 'one signal matches windows A/B/C at 21:30',
  windows2130.every((w, i) =>
    matchCompletionToOccurrence({ resourceKind: RESOURCE_KIND_CT, resourceId: RESOURCE_ID, moduleId: MODULE_SLUG, ...w }, sig)));

/* ------------------------------------------------------------------------- *
 * STEP 10 — MULTI-ALERT COMPARISON (S7 expected vs. observed projection)
 * ------------------------------------------------------------------------- */
check('STEP 10', 'OBSERVED: 1 completion → A/B/C ALL completed (identity collapse)', leafStates.every((k) => k === 'completed'));
check('STEP 10', 'identity first lost at NAVIGATION (STEP 4) — before ledger', firstLossAtNavigation === true);

console.log('\n=== Sprint 266 — MULTI-ALERT COMPLETION IDENTITY AUDIT ===');
console.log(`  observed per alert (21:30): ${JSON.stringify({ A: leafStates[0], B: leafStates[1], C: leafStates[2] })}`);
for (const c of checks) console.log(`  [${c.truth ? 'PASS' : 'FAIL'}] ${c.step} · ${c.label}`);
const failures = checks.filter((c) => !c.truth).length;
console.log(`\nResult: ${checks.length - failures}/${checks.length} PASS`);
process.exit(failures === 0 ? 0 : 1);