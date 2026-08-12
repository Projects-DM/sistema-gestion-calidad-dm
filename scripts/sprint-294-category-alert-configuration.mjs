/**
 * Sprint 294 — CATEGORY ALERT CONFIGURATION ENABLEMENT.
 *
 * TIPO: CONTROLLED ALERT-MODEL EXTENSION.
 * Verifies that a document repository CATEGORY may now carry its OWN canonical
 * Alert Configuration metadata (`alert_config` column, same envelope, no new
 * table) while the alert/occurrence identity stays with the FORM:
 *   - Admin: per-category [Bell] → AlertConfigurationPanel (documentCategory).
 *   - Viewer: category projects OWN state when configured (override);
 *     otherwise inherits its owning repository state (fallback).
 *   - Domain: docReferenceAlertState ignores category config entirely.
 *   - STOP boundaries: 0 changes to AlertConfigurationPanel, domain ledger,
 *     identity algebra, runtime SQL routes.
 *
 * Ejecutar: node scripts/sprint-294-category-alert-configuration.mjs
 */
import projectCurrentOccurrences from '../src/core/capabilities/alert/occurrence/OccurrenceProjection.js';
import OccurrenceLedger from '../src/core/capabilities/alert/occurrence/OccurrenceLedger.js';
import projectResourceAlertState from '../src/utils/alertResourceState.js';
import { readFileSync } from 'node:fs';

const readFile = (p) => { try { return readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'); } catch { return ''; } };

const checks = [];
function check(label, truth, detail = '') {
  checks.push({ label, truth: !!truth, detail });
}

const adminSrc = readFile('src/components/documentRepositories/DocumentRepositoriesAdmin.jsx');
const viewerSrc = readFile('src/modules/documentViewer/ModuleDocumentViewer.jsx');
const repoAdminSrc = readFile('src/components/documentRepositories/DocumentRepositoriesAdmin.jsx');
const domainStateSrc = readFile('src/core/capabilities/alert/state/projectResourceAlertState.js');
const formReferenceSrc = readFile('src/features/documentManagement/domain/projections/formReferenceAlertState.js') +
  readFile('src/features/documentManagement/domain/projections/documentReferenceAlertState.js');
const serviceSrc = readFile('src/services/documentRepositoriesService.js');
const migrationSql = readFile('supabase/migrations/sprint-294-category-alert-config.sql');

// ---------------------------------------------------------------------------
// TEST 01 — MIGRATION. The additive column exists (envelope, no new table).
// ---------------------------------------------------------------------------
check('TEST 01 — migration adds sgc_document_repository_categories.alert_config',
  migrationSql.includes('ADD COLUMN IF NOT EXISTS alert_config jsonb'),
  'missing ADD COLUMN IF NOT EXISTS alert_config jsonb');
check('TEST 01 — schema-only: no new alert_config table', !/CREATE TABLE[^;]*alert_config/i.test(migrationSql));

// ---------------------------------------------------------------------------
// TEST 02 — ADMIN. Per-category [Bell] button opens the panel as documentCategory.
// ---------------------------------------------------------------------------
check('TEST 02 — category card Bell button present',
  adminSrc.includes('setCategoryAlertConfigTarget(c)') && adminSrc.includes('Configurar alertas de la categoría'),
  'missing category Bell button');
check('TEST 02 — category panel uses resourceKind documentCategory',
  adminSrc.includes('resourceKind="documentCategory"'),
  'panel does not render as documentCategory');

// ---------------------------------------------------------------------------
// TEST 03 — ADMIN. Saving a category config reloads that category row.
// ---------------------------------------------------------------------------
check('TEST 03 — onSaved refetches the category by id',
  repoAdminSrc.includes('documentRepositoriesService') && repoAdminSrc.includes('.getCategoryById('),
  'missing getCategoryById refetch in onSaved');

// ---------------------------------------------------------------------------
// TEST 04 — VIEWER. Category with OWN config projects its own state (override).
// ---------------------------------------------------------------------------
check('TEST 04 — category own state consumed before repository fallback',
  viewerSrc.includes('ownCategoryState || repositoryAlertStates') && viewerSrc.includes('categoryAlertStates'),
  'override/fallback chain missing');

// ---------------------------------------------------------------------------
// TEST 05 — VIEWER. Category without own config falls back to repository state.
// ---------------------------------------------------------------------------
check('TEST 05 — repository fallback retained for non-configured categories',
  viewerSrc.includes('repositoryAlertStates.get') && viewerSrc.includes('categoryOwnerState'),
  'fallback path missing');

// ---------------------------------------------------------------------------
// TEST 06 — DOMAIN. documentReferenceAlertState does NOT consult category config.
// ---------------------------------------------------------------------------
check('TEST 06 — domain identity stays form-bound',
  !formReferenceSrc.includes('alertConfig') || !/category/i.test(formReferenceSrc),
  'domain projection references category config');

// ---------------------------------------------------------------------------
// TEST 07 — DOMAIN. Runtime projection still driven by occurrences (no change).
// ---------------------------------------------------------------------------
check('TEST 07 — runtime projection import resolvable',
  typeof projectResourceAlertState === 'function' && typeof projectCurrentOccurrences === 'function',
  'projection modules not resolvable');

// ---------------------------------------------------------------------------
// TEST 08 — STOP BOUNDARY. No edits to the shared AlertConfigurationPanel.
// ---------------------------------------------------------------------------
const panelSrc = readFile('src/modules/experiences/AlertConfigurationPanel.jsx');
check('TEST 08 — panel untouched by this sprint (no category branch added)',
  panelSrc.length > 0 && !panelSrc.includes('documentCategory'),
  'panel references documentCategory (unexpected edit)');
const codeWithoutComments = (s) => s.replace(/\/\/[^\n]*/g, '');
check('TEST 08 — no identity algebra leaked into frontiers',
  [adminSrc, viewerSrc].every((s) => !/alertConfigIdOf|occurrenceIdOf/.test(codeWithoutComments(s))));

// ---------------------------------------------------------------------------
// TEST 09 — STOP BOUNDARY. No new AlertCategory component anywhere.
// ---------------------------------------------------------------------------
const allSources = [adminSrc, viewerSrc, panelSrc, readFile('src/modules/moduleRoutes.js'), serviceSrc];
check('TEST 09 — no new AlertCategory component', allSources.every((s) => !s.includes('AlertCategory')));
check('TEST 09 — service still exposes category CRUD (no new category-alert route)',
  serviceSrc.includes('getCategoryById') && !serviceSrc.includes('categoryAlertConfiguration'));

// ---------------------------------------------------------------------------
// TEST 10 — BUILD RESILIENCE. Bundler-resolvable references for new code.
// ---------------------------------------------------------------------------
check('TEST 10 — Bell import present where used', adminSrc.includes('Bell,') || adminSrc.includes('Bell,'), 'Bell not imported');
check('TEST 10 — category modal shell closed before root div',
  adminSrc.indexOf('Modal: Alert Configuration (Category)') < adminSrc.lastIndexOf('</div>'),
  'modal placement suspicious');
check('TEST 10 — viewer category state map declared (categoryAlertStates)',
  viewerSrc.includes('categoryAlertStates'), 'categoryAlertStates missing');

// ---------------------------------------------------------------------------

console.log('');
console.log('SPRINT 294 — CATEGORY ALERT CONFIGURATION CERTIFICATION');
console.log('=========================================================');
let failed = 0;
for (const c of checks) {
  const mark = c.truth ? 'PASS ' : 'FAIL ';
  if (!c.truth) failed += 1;
  console.log(`${mark} ${c.label}  ${c.truth ? '' : '→ ' + c.detail}`);
}
console.log('--------------------------------------------------------------');
console.log(`TOTAL: ${checks.length - failed}/${checks.length}`);
process.exit(failed === 0 ? 0 : 1);
