/**
 * Sprint 295 — UNIFIED ALERT RESOURCE PRESENTATION STANDARD.
 *
 * TIPO: CONTROLLED UI STANDARDIZATION · PRESENTATIONAL ONLY.
 * Verifica que existe UN ÚNICO estándar visual para la alerta operacional
 * consumido por las tres superficies (Formato / Repositorio / Categoría) a
 * través del mismo componente presentacional puro, que reutiliza
 * `projectResourceAlertState` + `buildScheduleLines` y NO re-deriva nada del
 * dominio. Características: header "Alerta operacional" consistente, horarios
 * agrupados por día (el día aparece una sola vez), sin Estado/Prioridad/
 * Próximo/eventos abiertos, eventos completed/cancelled excluidos, una alerta
 * visual por recurso, responsive sin overflow. STOP: sin tocar proyección/
 * lifecycle/completion/persistencia/configuración/identidad/runtime; sin crear
 * Alert* ni duplicar useAlertRuntime.
 *
 * Ejecutar: node scripts/sprint-295-unified-alert-resource-presentation.mjs
 */
import { buildScheduleLines, projectResourceAlertState } from '../src/utils/alertResourceState.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import { readFileSync } from 'node:fs';

const readFile = (p) => { try { return readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'); } catch { return ''; } };
const codeOnly = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const checks = [];
function check(label, truth, detail = '') {
  checks.push({ label, truth: !!truth, detail });
}

const moduleSrc = readFile('src/pages/DynamicModule.jsx');
const viewerSrc = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
const sharedSrc = readFile('src/shared/components/alert/UnifiedAlertResourcePresentation.jsx');
const utilSrc = readFile('src/utils/alertResourceState.js');
const adapterSrc = readFile('src/modules/experiences/AlertConfigurationPersistenceAdapter.js');

const NOW = new Date(2026, 7, 10, 8, 0, 0).getTime(); // 10 Aug 2026 08:00

// ---------------------------------------------------------------------------
// TEST 01 — FORMATO uses the unified presentation.
// ---------------------------------------------------------------------------
check('TEST 01 — Formato delegates to the unified component', moduleSrc.includes('UnifiedAlertResourcePresentation') &&
  moduleSrc.includes('<UnifiedAlertResourcePresentation state={state} />'), 'DynamicModule no delega al componente único');
check('TEST 01 — Formato keeps the compact card indicator', moduleSrc.includes('function FormatAlertState({ state })') ||
  moduleSrc.includes('FormatAlertState'));

// ---------------------------------------------------------------------------
// TEST 02 — REPOSITORY uses the unified presentation.
// ---------------------------------------------------------------------------
check('TEST 02 — Repository delegates to the unified component', viewerSrc.includes('UnifiedAlertResourcePresentation') &&
  viewerSrc.includes('<UnifiedAlertResourcePresentation state={state} />'), 'viewer no delega al componente único');
check('TEST 02 — rich repository block removed (no formatExecutionTime list)',
  !viewerSrc.includes('formatExecutionTime'), 'el bloque rico usa formatExecutionTime');

// ---------------------------------------------------------------------------
// TEST 03 — CATEGORY uses the unified presentation (same block as repository).
// ---------------------------------------------------------------------------
check('TEST 03 — Category renders through the SAME block', viewerSrc.includes('<RepositoryAlertStateBlock state={categoryOwnerState} />'));
check('TEST 03 — one presentation implementation shared across surfaces',
  sharedSrc.length > 0 && moduleSrc.includes('UnifiedAlertResourcePresentation') && viewerSrc.includes('UnifiedAlertResourcePresentation'));

// ---------------------------------------------------------------------------
// TEST 04 — SAME SCHEDULE FORMATTER for the three surfaces.
// ---------------------------------------------------------------------------
check('TEST 04 — shared component imports the certified formatter', /from '\.\.\/\.\.\/\.\.\/utils\/alertResourceState'/.test(sharedSrc) &&
  sharedSrc.includes('buildScheduleLines'));
check('TEST 04 — surfaces no longer own a private formatter', !codeOnly(moduleSrc).includes('buildScheduleLines(') &&
  !viewerSrc.includes('formatExecutionTime'));

// ---------------------------------------------------------------------------
// TEST 05/06/07 — NO metadata secundaria in the unified block (rendered code).
// ---------------------------------------------------------------------------
const presentationCode = codeOnly(sharedSrc) + codeOnly(viewerSrc) + codeOnly(moduleSrc);
check('TEST 05 — no «Estado:» label', !presentationCode.includes('Estado:'));
check('TEST 06 — no «Prioridad:» label', !/Prioridad\s*\{?/.test(presentationCode));
check('TEST 07 — no open-count', !presentationCode.includes('evento(s)') && !presentationCode.includes('openCount'));

// ---------------------------------------------------------------------------
// TEST 08 — MULTIPLE OCCURRENCES → grouped schedule (one visual state).
// ---------------------------------------------------------------------------
const formA = {
  id: 12, slug: 'temperature', module_id: 'mod-ops',
  alertConfiguration: {
    alertConfigurations: [
      { name: 'A 20:37', priority: 'high', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '20:37' },
      { name: 'B 20:38', priority: 'medium', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '20:38' },
      { name: 'C 05:07', priority: 'low', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '05:07' },
    ],
  },
};
OccurrenceLedger.clear();
const occurrences = projectCurrentOccurrences({ forms: [formA], repositories: [], categories: [] }, 'mod-ops', NOW);
const stateA = projectResourceAlertState({ occurrences, resourceKind: 'dynamicForms', resourceId: formA.id, resource: formA, now: NOW });
check('TEST 08 — one visual state for the resource', stateA?.present === true && stateA?.events?.length === 3, JSON.stringify(stateA?.events?.length));
const schedule = buildScheduleLines(stateA?.events, NOW);
check('TEST 08 — grouped by day (2 lines)', schedule.length === 2, JSON.stringify(schedule));
check('TEST 08 — «Hoy» aggregates 20:37 + 20:38', schedule[0]?.day === 'Hoy' && schedule[0].times.join(',') === '20:37,20:38', JSON.stringify(schedule[0]));
check('TEST 08 — «Mañana» has 05:07', schedule[1]?.day === 'Mañana' && schedule[1].times.join(',') === '05:07', JSON.stringify(schedule[1]));

// ---------------------------------------------------------------------------
// TEST 09/10 — COMPLETED / CANCELLED events excluded from the pending view.
// ---------------------------------------------------------------------------
const dueToday = new Date(2026, 7, 10, 20, 37, 0).getTime();
const dueTmrw = new Date(2026, 7, 11, 5, 11, 0).getTime();
const sCompleted = buildScheduleLines([
  { status: 'completed', dueMs: dueTmrw },
  { status: 'today', dueMs: dueToday },
], NOW);
check('TEST 09 — completed event excluded', sCompleted.length === 1 && sCompleted[0].times.join(',') === '20:37', JSON.stringify(sCompleted));
const sCancelled = buildScheduleLines([
  { status: 'cancelled', dueMs: dueTmrw },
  { status: 'today', dueMs: dueToday },
], NOW);
check('TEST 10 — cancelled event excluded', sCancelled.length === 1 && sCancelled[0].times.join(',') === '20:37', JSON.stringify(sCancelled));

// ---------------------------------------------------------------------------
// TEST 11 — NO duplicated day labels (day appears once per group).
// ---------------------------------------------------------------------------
const days = schedule.map((l) => l.day);
check('TEST 11 — each day appears once', new Set(days).size === days.length, JSON.stringify(days));
check('TEST 11 — times unique within a group',
  schedule.every((l) => new Set(l.times).size === l.times.length), JSON.stringify(schedule));

// ---------------------------------------------------------------------------
// TEST 12 — NO new alert domain / no per-resource visual states.
// ---------------------------------------------------------------------------
const allSurfaces = [moduleSrc, viewerSrc, sharedSrc];
check('TEST 12 — no AlertForm/AlertRepository/AlertCategory',
  allSurfaces.every((s) => !s.includes('AlertForm') && !s.includes('AlertRepository') && !s.includes('AlertCategory')));
const srcTree = codeOnly(utilSrc) + codeOnly(sharedSrc) + codeOnly(viewerSrc) + codeOnly(moduleSrc);
check('TEST 12 — no per-resource visual state (Repository/Category/FormAlertVisualState)',
  !/RepositoryAlertVisualState|CategoryAlertVisualState|FormAlertVisualState/.test(srcTree));

// ---------------------------------------------------------------------------
// TEST 13 — NO persistence changes.
// ---------------------------------------------------------------------------
check('TEST 13 — shared component touches no service/store',
  !sharedSrc.includes('documentRepositoriesService') && !sharedSrc.includes('dynamicService') &&
  !sharedSrc.includes('localStorage') && !sharedSrc.includes('EventBus'));
check('TEST 13 — persistence adapter untouched', adapterSrc.includes('CATEGORY_HANDLER') && adapterSrc.includes('alertConfigurations'));

// ---------------------------------------------------------------------------
// TEST 14 — NO runtime changes (no duplicated useAlertRuntime).
// ---------------------------------------------------------------------------
check('TEST 14 — module consumes the runtime once', (moduleSrc.match(/useAlertRuntime\(\{/g) || []).length === 1);
check('TEST 14 — viewer consumes the runtime once', (viewerSrc.match(/useAlertRuntime\(\{/g) || []).length === 1);
check('TEST 14 — shared component consumes no runtime', !sharedSrc.includes('useAlertRuntime'));

// ---------------------------------------------------------------------------
// TEST 15 — NO identity algebra in frontiers/shared.
// ---------------------------------------------------------------------------
check('TEST 15 — no functional identity algebra', [moduleSrc, viewerSrc, sharedSrc].every(
  (s) => !/alertConfigIdOf|occurrenceIdOf/.test(codeOnly(s))));

// ---------------------------------------------------------------------------
// TEST 16 — RESPONSIVE structure (wrap, no horizontal overflow).
// ---------------------------------------------------------------------------
check('TEST 16 — schedule row wraps', sharedSrc.includes('flex-wrap'));
check('TEST 16 — time tokens never split/overflow', sharedSrc.includes('whitespace-nowrap') && sharedSrc.includes('shrink-0'));

// ---------------------------------------------------------------------------
// TEST 17 — BUILD PASS (static certification of the unified paths).
// ---------------------------------------------------------------------------
check('TEST 17 — Hot-export resolvable', typeof buildScheduleLines === 'function' && typeof projectResourceAlertState === 'function');
check('TEST 17 — no leftover rich icon maps', !viewerSrc.includes('REPOSITORY_STATE_ICON_COMPONENTS') && !moduleSrc.includes('FORMAT_STATE_ICON_COMPONENTS'));
check('TEST 17 — shared component is a presentational default export', /export default function UnifiedAlertResourcePresentation/.test(sharedSrc));

// ---------------------------------------------------------------------------

console.log('');
console.log('SPRINT 295 — UNIFIED ALERT RESOURCE PRESENTATION CERTIFICATION');
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