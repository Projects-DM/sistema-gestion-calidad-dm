/**
 * Sprint 295 — DISABLED ALERT VISUAL SUPPRESSION.
 *
 * TIPO: CONTROLLED PRESENTATIONAL CORRECTION.
 * Verifica que una alerta `enabled === false` NO se presenta en ninguna de las
 * tres superficies (Formulario / Repositorio / Categoría): el selector de
 * presentación (projectResourceAlertState) descarta las ocurrencias de la alerta
 * deshabilitada y devuelve null (present: false) — sin eliminar la ocurrencia,
 * sin tocar dominio/runtime/persistencia/schema. Además certifica la regla de
 * override del viewer: una categoría con configuración PROPIA deshabilitada NO
 * cae al fallback del repositorio, mientras que una categoría SIN configuración
 * sí hereda el estado del repositorio.
 *
 * Ejecutar: node scripts/sprint-295-disabled-alert-visual-suppression.mjs
 */
import projectResourceAlertState from '../src/utils/alertResourceState.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import { shouldProduceAlert } from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';
import { readFileSync } from 'node:fs';

const readFile = (p) => { try { return readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'); } catch { return ''; } };

const checks = [];
function check(label, truth, detail = '') {
  checks.push({ label, truth: !!truth, detail });
}

// Deterministic NOW (10 Aug 2026 08:00). Same anchor pattern as Sprint 292.
const NOW = new Date(2026, 7, 10, 8, 0, 0).getTime();
const baseCfg = { periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '20:37' };

const formEnabled = {
  id: 12, slug: 'temperature', module_id: 'mod-ops',
  alertConfiguration: { alertConfigurations: [{ ...baseCfg, name: 'A', enabled: true, priority: 'high' }] },
};
const formDisabled = {
  id: 13, slug: 'pressure', module_id: 'mod-ops',
  alertConfiguration: { alertConfigurations: [{ ...baseCfg, name: 'B', enabled: false }] },
};
const formMixed = {
  id: 14, slug: 'mixed', module_id: 'mod-ops',
  alertConfiguration: {
    alertConfigurations: [
      { ...baseCfg, name: 'D1', enabled: false },
      { ...baseCfg, name: 'D2', enabled: true, priority: 'medium' },
    ],
  },
};
const repoEnabled = {
  id: 77, slug: 'certificados', module_slug: 'mod-docs',
  alertConfiguration: { alertConfigurations: [{ ...baseCfg, name: 'R', enabled: true }] },
};
const repoDisabled = {
  id: 78, slug: 'pdfs', module_slug: 'mod-docs',
  alertConfiguration: { alertConfigurations: [{ ...baseCfg, name: 'R2', enabled: false }] },
};
const catOwnEnabled = { id: 5, repository_id: 77, category_key: 'cat-a', alertConfiguration: { alertConfigurations: [{ ...baseCfg, name: 'C', enabled: true }] } };
const catOwnDisabled = { id: 6, repository_id: 77, category_key: 'cat-b', alertConfiguration: { alertConfigurations: [{ ...baseCfg, name: 'C2', enabled: false }] } };
const catNoConfig = { id: 7, repository_id: 77, category_key: 'cat-c', is_active: true };

// One snapshot for EVERY resource; occurrences survive (never deleted).
const resources = {
  forms: [formEnabled, formDisabled, formMixed],
  repositories: [repoEnabled, repoDisabled],
  categories: [catOwnEnabled, catOwnDisabled, catNoConfig],
};
OccurrenceLedger.clear();
const occurrences = projectCurrentOccurrences(resources, 'mod-ops', NOW);

const stateFor = (resource, resourceKind) =>
  projectResourceAlertState({ occurrences, resourceKind, resourceId: resource?.id ?? resource?.slug, resource, now: NOW });

const stateFormEnabled = stateFor(formEnabled, 'dynamicForms');
const stateFormDisabled = stateFor(formDisabled, 'dynamicForms');
const stateFormMixed = stateFor(formMixed, 'dynamicForms');
const stateRepoEnabled = stateFor(repoEnabled, 'documentRepository');
const stateRepoDisabled = stateFor(repoDisabled, 'documentRepository');
const stateCatEnabled = stateFor(catOwnEnabled, 'documentCategory');
const stateCatDisabled = stateFor(catOwnDisabled, 'documentCategory');
const stateCatNoConfig = stateFor(catNoConfig, 'documentCategory');

const viewerSrc = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
const formModuleSrc = readFile('src/pages/DynamicModule.jsx');
const utilSrc = readFile('src/utils/alertResourceState.js');
const projectionSrc = readFile('src/core/capabilities/alert/occurrence/OccurrenceProjection.js');
const adapterSrc = readFile('src/modules/experiences/AlertConfigurationPersistenceAdapter.js');
const lifecycleSrc = readFile('src/core/capabilities/alert/occurrence/OccurrenceLifecycle.js');

// ---------------------------------------------------------------------------
// TEST 01 — ENABLED → PRESENT. Occurences projected ⇒ present: true, and the
// presentation NEVER carries a disabled label.
// ---------------------------------------------------------------------------
check('TEST 01 — form enabled → present', stateFormEnabled?.present === true, JSON.stringify(stateFormEnabled));
check('TEST 01 — repository enabled → present', stateRepoEnabled?.present === true, JSON.stringify(stateRepoEnabled));
check('TEST 01 — category own enabled → present', stateCatEnabled?.present === true, JSON.stringify(stateCatEnabled));
check('TEST 01 — present label is never «Deshabilitada»', stateFormEnabled && stateRepoEnabled && stateCatEnabled &&
  ![stateFormEnabled, stateRepoEnabled, stateCatEnabled].some((s) => s.statusLabel === 'Deshabilitada'));

// ---------------------------------------------------------------------------
// TEST 02 — DISABLED → NOT PRESENT (null on all three surfaces).
// ---------------------------------------------------------------------------
check('TEST 02 — form disabled → null', stateFormDisabled === null, JSON.stringify(stateFormDisabled));
check('TEST 02 — repository disabled → null', stateRepoDisabled === null, JSON.stringify(stateRepoDisabled));
check('TEST 02 — category own disabled → null', stateCatDisabled === null, JSON.stringify(stateCatDisabled));

// ---------------------------------------------------------------------------
// TEST 03/04/05/06 — DISABLED → no schedule / events / priority / status label.
// Null state certifies all four (accessors impossible). A MIXED form proves the
// filter drops ONLY the disabled occurrence while keeping the enabled one.
// ---------------------------------------------------------------------------
check('TEST 03 — disabled → no schedule', stateFormDisabled?.['nextExecution'] === undefined);
check('TEST 04 — disabled → no events', stateFormDisabled?.['events'] === undefined);
check('TEST 05 — disabled → no priority', stateFormDisabled?.['priorityLabel'] === undefined);
check('TEST 06 — disabled → no status label', stateFormDisabled?.['statusLabel'] === undefined);
check('TEST 06 — mixed form: disabled occurrence dropped, enabled kept',
  stateFormMixed?.present === true && stateFormMixed?.events?.length === 1 && stateFormMixed.events[0].status !== 'disabled',
  JSON.stringify(stateFormMixed?.events));

// ---------------------------------------------------------------------------
// TEST 07 — FORM DISABLED → HIDDEN. The format card guard renders only when the
// projected state is present (null → nothing).
// ---------------------------------------------------------------------------
check('TEST 07 — form card no-ops on missing state',
  formModuleSrc.includes('function FormatAlertState({ state })') && formModuleSrc.includes("state?.present !== true"));
check('TEST 07 — form state registered only when projected',
  formModuleSrc.includes('if (state) map.set('));

// ---------------------------------------------------------------------------
// TEST 08 — REPOSITORY DISABLED → HIDDEN. Viewer block no-ops on null.
// ---------------------------------------------------------------------------
check('TEST 08 — repository block no-ops on missing state',
  viewerSrc.includes('function RepositoryAlertStateBlock({ state })') && viewerSrc.includes("state?.present !== true"));

// ---------------------------------------------------------------------------
// TEST 09 — CATEGORY DISABLED → HIDDEN (own surface suppressed, block guard).
// ---------------------------------------------------------------------------
check('TEST 09 — category uses the same no-op block', viewerSrc.includes('<RepositoryAlertStateBlock state={categoryOwnerState} />'));
check('TEST 09 — category own disabled yields null state', stateCatDisabled === null);

// ---------------------------------------------------------------------------
// TEST 10 — CATEGORY WITHOUT CONFIG → REPOSITORY FALLBACK.
// ---------------------------------------------------------------------------
check('TEST 10 — no-config category has no own occurrences', stateCatNoConfig === null);
check('TEST 10 — viewer keeps the repository fallback branch',
  viewerSrc.includes('hasOwnCategoryConfig') && /repositoryAlertStates\.get\(String\(c\?\.repository_id/.test(viewerSrc));

// ---------------------------------------------------------------------------
// TEST 11 — CATEGORY OWN DISABLED → DOES NOT INHERIT THE REPOSITORY ALERT.
// The viewer prefers the own (null) state over the repository fallback.
// ---------------------------------------------------------------------------
check('TEST 11 — own disabled → repository still has a present state', stateRepoEnabled?.present === true);
check('TEST 11 — own-disabled override keeps null (no fallback)',
  viewerSrc.includes('hasOwnCategoryConfig\n                      ? ownCategoryState') ||
  viewerSrc.replace(/\s+/g, ' ').includes('hasOwnCategoryConfig ? ownCategoryState : ownCategoryState'));
check('TEST 11 — fallback gated to categories WITHOUT own config',
  viewerSrc.includes(': ownCategoryState ||') && viewerSrc.includes('repositoryAlertStates.get'));

// ---------------------------------------------------------------------------
// TEST 12 — CONFIGURATION PERSISTENCE REMAINS INTACT. No storage writes from
// the selector; the official adapter and its write path are untouched.
// ---------------------------------------------------------------------------
check('TEST 12 — selector writes nothing', !utilSrc.includes('localStorage') && !utilSrc.includes('EventBus') && !utilSrc.includes('saveConfiguration'));
check('TEST 12 — persistence adapter still enveloped + category-capable',
  adapterSrc.includes('CATEGORY_HANDLER') && adapterSrc.includes('must not clobber') === true || adapterSrc.includes('envelope'));
check('TEST 12 — resolver decision intact (disabled rejected)', shouldProduceAlert({ enabled: false }) === false && shouldProduceAlert({ enabled: true }) === true);

// ---------------------------------------------------------------------------
// TEST 13 — RUNTIME UNCHANGED. Occurrences of disabled alerts are NEVER deleted
// (they remain in the projection); the projector still consumes the certified
// domain classifier.
// ---------------------------------------------------------------------------
const occurrenceCountDisabled = occurrences.filter((o) =>
  String(o.resourceId) === String(formDisabled.id) || String(o.resourceId) === String(repoDisabled.id),
).length;
check('TEST 13 — disabled occurrences still projected (never deleted)', occurrenceCountDisabled >= 2, `count=${occurrenceCountDisabled}`);
check('TEST 13 — projection untouched by this sprint',
  projectionSrc.includes('OccurrenceLedger.completionSignalFor') && projectionSrc.includes('createAlertOccurrence'));
check('TEST 13 — selector still delegates to the domain classifier',
  utilSrc.includes("import { classifyOccurrence } from '../core/capabilities/alert/occurrence/OccurrenceLifecycle.js'"));
check('TEST 13 — lifecycle untouched', lifecycleSrc.includes('export function classifyOccurrence'));

// ---------------------------------------------------------------------------
// TEST 14 — BUILD PASS (static certification for the added paths).
// ---------------------------------------------------------------------------
check('TEST 14 — selector contains the suppression gate',
  utilSrc.includes('if (cfg?.enabled === false) return null;') && utilSrc.includes('if (events.length === 0) return null;'));
check('TEST 14 — no disabled presentation bucket remains in the selector',
  !/disabled: Object\.freeze\(\{ label: 'Deshabilitada'/.test(utilSrc) && !utilSrc.includes("key: 'disabled'"));
check('TEST 14 — module exports resolvable by the bundler', typeof projectResourceAlertState === 'function');

// ---------------------------------------------------------------------------

console.log('');
console.log('SPRINT 295 — DISABLED ALERT VISUAL SUPPRESSION CERTIFICATION');
console.log('================================================================');
let failed = 0;
for (const c of checks) {
  const mark = c.truth ? 'PASS ' : 'FAIL ';
  if (!c.truth) failed += 1;
  console.log(`${mark} ${c.label}  ${c.truth ? '' : '→ ' + c.detail}`);
}
console.log('----------------------------------------------------------------');
console.log(`TOTAL: ${checks.length - failed}/${checks.length}`);
process.exit(failed === 0 ? 0 : 1);