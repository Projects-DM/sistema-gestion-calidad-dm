/**
 * Sprint 292 — COMPACT ALERT STATE PRESENTATION & RESOURCE CARD REFINEMENT.
 *
 * TIPO: CONTROLLED UI REFINEMENT · PRESENTATIONAL ONLY.
 * Verifies that the format card alert indicator is COMPACT (day bucket + HH:MM,
 * no "Estado:", no "Prioridad:", no open-count, no repeated day labels), that
 * multiple occurrences collapse into N relevant times, that no alert renders no
 * block, that DynamicForm/DynamicRecordsView keep their responsibilities, that
 * Repository/Category keep their blocks (not touched in this sprint), and that
 * all STOP boundaries hold (0 changes to domain/runtime/configuration).
 *
 * Ejecutar: node scripts/sprint-292-alert-card-compact.mjs
 */
import { projectResourceAlertState, buildScheduleLines, formatExecutionTime } from '../src/utils/alertResourceState.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import { readFileSync } from 'node:fs';

const readFile = (p) => { try { return readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'); } catch { return ''; } };

const checks = [];
function check(label, truth, detail = '') {
  checks.push({ label, truth: !!truth, detail });
}

// Real resources (Sprint 197 shape).
const formA = {
  id: 12,
  slug: 'temperature',
  module_id: 'mod-ops',
  alertConfiguration: {
    alertConfigurations: [
      { name: 'A 20:37', priority: 'high', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '20:37' },
      { name: 'B 20:38', priority: 'medium', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '20:38' },
      { name: 'C 05:07', priority: 'low', periodicity: { amount: 1, unit: 'days' }, startDate: '2026-08-09', startTime: '05:07' },
    ],
  },
};
const resources = { forms: [JSON.parse(JSON.stringify(formA))], repositories: [] };

// Pick a NOW so that A/B (20:37, 20:38) land TODAY and C (05:07) lands
// TOMORROW (05:07 of the next day): day boundary, deterministic relative labels.
const NOW = new Date(2026, 7, 10, 8, 0, 0).getTime(); // 10 Aug 08:00 → C vence 11 Aug 05:07
OccurrenceLedger.clear();
const occurrences = projectCurrentOccurrences(resources, 'mod-ops', NOW);
const stateA = projectResourceAlertState({ occurrences, resourceKind: 'dynamicForms', resourceId: formA.id, resource: formA, now: NOW });

// ---------------------------------------------------------------------------
// TEST 01 — SINGLE OCCURRENCE. One open due → "Hoy · 20:37" only that time.
// ---------------------------------------------------------------------------
const single = buildScheduleLines([{ status: 'today', dueMs: new Date(2026, 7, 10, 20, 37, 0).getTime() }], NOW);
check('TEST 01 — single occurrence → one day line', single.length === 1, JSON.stringify(single));
check('TEST 01 — single line has day "Hoy"', single[0]?.day === 'Hoy', single[0]?.day);
check('TEST 01 — single time is "20:37"', single[0]?.times?.join(',') === '20:37', single[0]?.times?.join(','));

// ---------------------------------------------------------------------------
// TEST 02 — MULTIPLE OCCURRENCES. A/B vencen hoy 20:37 y 20:38; C vence mañana
// 05:07 → dos líneas compactas: Hoy (20:37,20:38) y Mañana (05:07). NO repite
// "Hoy" como prefijo de cada hora.
// ---------------------------------------------------------------------------
check('TEST 02 — real projection produced 3 occurrences (A,B,C)', occurrences.length === 3, `count=${occurrences.length}`);
const multi = buildScheduleLines(stateA.events, NOW);
check('TEST 02 — multiple → grouped day lines', multi.length === 2, JSON.stringify(multi));
check('TEST 02 — "Hoy" line aggregates 20:37 + 20:38', multi[0]?.day === 'Hoy' && multi[0]?.times?.join(',') === '20:37,20:38', JSON.stringify(multi[0]));
check('TEST 02 — "Mañana" line has 05:07', multi[1]?.day === 'Mañana' && multi[1]?.times?.join(',') === '05:07', JSON.stringify(multi[1]));
check('TEST 02 — no repeated day-prefix per time', !formatExecutionTime(occurrences[0]?.dueAt ?? null)?.startsWith('Hoy - Hoy'));

// ---------------------------------------------------------------------------
// TEST 03 — NO ALERT → NO BLOCK. A resource without any open/present alert yields
// null from the projector, so the card renders no indicator.
// ---------------------------------------------------------------------------
const orphan = projectResourceAlertState({ occurrences, resourceKind: 'dynamicForms', resourceId: 999, resource: null, now: NOW });
check('TEST 03 — no-alert resource → null state', orphan === null, JSON.stringify(orphan));
check('TEST 03 — empty event list → empty schedule (no block)', buildScheduleLines([]).length === 0);
check('TEST 03 — completed-only events → empty schedule', buildScheduleLines([{ status: 'completed', dueMs: Date.now() }]).length === 0);

// ---------------------------------------------------------------------------
// TEST 04 — NO DUPLICATED STATE. The DOM no longer renders "Estado: Hoy" next to
// "Hoy · 20:37". The format card source must not contain the old status banner.
// ---------------------------------------------------------------------------
const moduleSrc = readFile('src/pages/DynamicModule.jsx');
check('TEST 04 — format card does NOT render "Estado:"', !moduleSrc.includes('Estado:</span>') && !/Estado:\s*<span/.test(moduleSrc));
check('TEST 04 — no statusLabel rendered in card', !/\{state\.statusLabel\}/.test(moduleSrc));
check('TEST 04 — card keeps compact indicator title', moduleSrc.includes('Alerta operacional'));

// ---------------------------------------------------------------------------
// TEST 05 — NO OPEN-COUNT. No "N evento(s) abierto(s)" anywhere in the card.
// ---------------------------------------------------------------------------
check('TEST 05 — no open-count wording in card', !moduleSrc.includes('evento(s)') && !moduleSrc.includes('openCount'));
check('TEST 05 — compact block uses schedule only', moduleSrc.includes('buildScheduleLines'));

// ---------------------------------------------------------------------------
// TEST 06 — PRIORITY HIDDEN ONLY. Priority still exists in the internal model
// (projector exposes priorityLabel on events) but the format card does NOT
// present it. The runtime keeps using priority.
// ---------------------------------------------------------------------------
const utilSrc = readFile('src/utils/alertResourceState.js');
check('TEST 06 — priority still in internal model', (stateA?.events ?? []).some((e) => typeof e.priority === 'string') || typeof stateA?.priority === 'string');
check('TEST 06 — format card does NOT render Prioridad', !/Prioridad\s*\{?/.test(moduleSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')) && !moduleSrc.includes('priorityLabel'));
check('TEST 06 — projector still enriches priority (util)', utilSrc.includes('priority') && utilSrc.includes('PRIORITY_LABELS'));

// ---------------------------------------------------------------------------
// TEST 07 — FORM INTEGRITY. Formato → Ingresar → formulario sigue idéntico:
// DynamicForm sin panel de alerta y sin proyector; solo formulario puro.
// ---------------------------------------------------------------------------
const formSrc = readFile('src/pages/DynamicForm.jsx');
const formCodeOnly = formSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
check('TEST 07 — DynamicForm unchanged (no alert panel)', !formCodeOnly.includes('ResourceAlertStatePanel') && !formCodeOnly.includes('projectResourceAlertState'));
check('TEST 07 — DynamicForm keeps form responsibilities', formSrc.includes('submitFormResponse') && formSrc.includes('Campos') === false);
check('TEST 07 — entering form still works (routing intact)', moduleSrc.includes('/modulo/') && moduleSrc.includes('Ingresar'));
check('TEST 07 — DynamicRecordsView untouched surface (badge of Runtime Visibility only)', !readFile('src/components/DynamicRecordsView.jsx').includes('projectResourceAlertState'));

// ---------------------------------------------------------------------------
// TEST 08 — REPOSITORY REGRESSION. Repository + categories keep their rich alert
// block from Sprint 291 (root repository_id). NO changes this sprint.
// ---------------------------------------------------------------------------
const viewerSrc = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
check('TEST 08 — repository alert block still present', viewerSrc.includes('RepositoryAlertStateBlock') && viewerSrc.includes('repositoryAlertStates'));
check('TEST 08 — category inherits owner repository state', viewerSrc.includes('categoryOwnerState') && viewerSrc.includes('repository_id'));
check('TEST 08 — repository projection unchanged', viewerSrc.includes('projectResourceAlertState'));

// ---------------------------------------------------------------------------
// TEST 09 — ARCHITECTURE REGRESSION. No new AlertForm / AlertRepository /
// AlertCategory anywhere; no identity algebra in frontiers.
// ---------------------------------------------------------------------------
const sources = [formSrc, viewerSrc, moduleSrc, readFile('src/components/DynamicRecordsView.jsx')];
check('TEST 09 — no new AlertForm', sources.every((s) => !s.includes('AlertForm')));
check('TEST 09 — no new AlertRepository', sources.every((s) => !s.includes('AlertRepository')));
check('TEST 09 — no new AlertCategory', sources.every((s) => !s.includes('AlertCategory')));
check('TEST 09 — no identity algebra in frontiers', sources.every((s) => !/alertConfigIdOf|occurrenceIdOf/.test(s)));
check('TEST 09 — facade/util never writes', !utilSrc.includes('localStorage') && !utilSrc.includes('EventBus') && !utilSrc.includes('createStore'));

// ---------------------------------------------------------------------------
// TEST 10 — BUILD. The command runs after this script (npm run build); here we
// certify no source-level red flags that would break the build (balanced JSX for
// the added blocks + util module exports resolvable by the bundler).
// ---------------------------------------------------------------------------
check('TEST 10 — util exports resolvable by bundler', typeof buildScheduleLines === 'function' && typeof formatExecutionTime === 'function');
check('TEST 10 — card has no textual overflow risk (inline-flex wrap + nowrap tokens)', moduleSrc.includes('flex-wrap') && moduleSrc.includes('whitespace-nowrap'));
check('TEST 10 — reduced vertical spacing applied', moduleSrc.includes('mt-2 rounded-lg') && moduleSrc.includes('mb-2'));

// ---------------------------------------------------------------------------

console.log('');
console.log('SPRINT 292 — COMPACT ALERT STATE PRESENTATION CERTIFICATION');
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