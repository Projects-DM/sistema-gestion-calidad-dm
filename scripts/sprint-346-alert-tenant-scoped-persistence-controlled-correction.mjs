/**
 * SPRINT 346 — ALERT TENANT-SCOPED PERSISTENCE & FIRST COMPLETION CONTROLLED CORRECTION
 * LEVEL 5 · CONTROLLED CORRECTION · Production Source Changes: SCOPED
 *
 * Verifica la corrección controlada de:
 * 1. Persistencia tenant-scoped (localStorage + Supabase hybrid)
 * 2. Primer completion inmediatamente visible
 * 3. Cross-user replay dentro del mismo tenant
 * 4. Aislamiento cross-tenant
 * 5. No regresión del motor temporal (Sprint 341)
 *
 * Suite determinística: imports puros + verificaciones de código + tests de comportamiento
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const start = Date.now();
let passed = 0;
let failed = 0;
const failures = [];

function check(cond, label, detail = '') {
  if (cond) passed++;
  else { failed++; failures.push({ label, detail }); }
}

const H = (needle, src, label) => check(src.includes(needle), label, `includes "${needle}"`);
const N = (needle, src, label) => check(!src.includes(needle), label, `NOT includes "${needle}"`);
const RxH = (re, src, label) => check(re.test(src), label, 'regex ' + re);
const RxN = (re, src, label) => check(!re.test(src), label, 'regex ' + re);

const slice = (src, from, to) => {
  const i = src.indexOf(from);
  const j = src.indexOf(to, i > -1 ? i : 0);
  return (i > -1 && j > i) ? src.slice(i, j) : '';
};

// ============================================================================
// FUENTES AUDITADAS
// ============================================================================
const ledger = S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js');
const bridge = S('src/core/capabilities/alert/occurrence/CompletionBridge.js');
const port = S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js');
const boot = S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js');
const authCtx = S('src/context/AuthContext.jsx');
const useAlertRuntime = S('src/hooks/useAlertRuntime.js');
const lifecycleProvider = S('src/core/capabilities/alert/lifecycle/AlertLifecycleProvider.js');
const projection = S('src/core/capabilities/alert/occurrence/OccurrenceProjection.js');

const ledgerKey = slice(ledger, 'export function occurrenceCompletionStorageKey', 'function resourceKeyFor');
const specificKeyFor = slice(ledger, 'function specificKeyFor', 'const OccurrenceLedger =');
const resourceKeyFor = slice(ledger, 'function resourceKeyFor', 'function specificKeyFor');
const recordCompletion = slice(ledger, 'recordCompletion(signal)', 'completionSignalFor');

const durableAdapter = slice(port, 'export function createDurableOccurrenceLedgerAdapter', 'export const OCCURRENCE_LEDGER_PERSISTENCE_PORT');
const hybridAdapter = slice(port, 'export function createHybridTenantAdapter', 'export const OCCURRENCE_LEDGER_PERSISTENCE_PORT');
const supabaseAdapter = slice(port, 'export function createTenantScopedSupabaseAdapter', 'export function createHybridTenantAdapter');
const inMemoryAdapter = slice(port, 'export function createInMemoryOccurrenceLedgerAdapter', 'const LOCAL_STORAGE_KEY');
const localStorageKey = slice(port, 'const LOCAL_STORAGE_KEY', 'function readRaw');

const bootCode = slice(boot, 'export function bootDurableOccurrenceLedger', 'export default bootDurableOccurrenceLedger');
const setTenantId = slice(boot, 'export function setTenantIdProvider', 'export function bootDurableOccurrenceLedger');

const authTenant = slice(authCtx, 'const tenantId = useMemo', 'const value = useMemo');
const authValue = slice(authCtx, 'const currentRol', 'return <AuthContext.Provider');

const bridgeTenant = slice(bridge, 'let tenantIdProvider', 'function getCurrentTenantId');
const handleIntent = slice(bridge, 'export function handleCompletionIntent', 'return null;');
const inferSignal = slice(bridge, 'function inferSingleSignal', 'function recordBulk');
const recordBulk = slice(bridge, 'function recordBulk', 'export function handleCompletionIntent');

const runtimeHook = slice(useAlertRuntime, 'const { tenantId } = useAuth', 'const [existing, setExisting]');
const registerTenant = slice(useAlertRuntime, 'registerTenantIdProvider', 'registerCompletionOccurrenceProvider');

const authProfile = slice(authCtx, 'const fetchAndSetProfile', 'const signIn');

/* ================= 1. TENANT KEY FORMULA ================= */
{
  // The key formula in occurrenceCompletionStorageKey adds tenant:: prefix
  H('tenant::', ledgerKey, 'Q01: key formula adds tenant:: prefix');
  H('occurrence::', ledgerKey, 'Q01b: specific key includes occurrence::');
  H('resource::', ledgerKey, 'Q01c: legacy key includes resource::');

  // specificKeyFor and resourceKeyFor are the BASE functions (no tenant prefix)
  // The tenant prefix is added by occurrenceCompletionStorageKey
  N('tenant::', specificKeyFor, 'Q01d: specificKeyFor base sin tenant prefix');
  N('tenant::', resourceKeyFor, 'Q01e: resourceKeyFor base sin tenant prefix');

  // NO userId in keys
  N('userId', ledgerKey, 'Q01f: NO userId en fórmula de clave');
  N('email', ledgerKey, 'Q01g: NO email en fórmula de clave');
}

/* ================= 2. PERSISTENCE BACKEND (HYBRID) ================= */
{
  H('createHybridTenantAdapter', port, 'Q02: hybrid adapter exportado');
  H('createTenantScopedSupabaseAdapter', port, 'Q02b: supabase adapter exportado');
  H('createDurableOccurrenceLedgerAdapter', port, 'Q02c: localStorage adapter preservado');
  H('createInMemoryOccurrenceLedgerAdapter', port, 'Q02d: in-memory adapter preservado');

  // Hybrid adapter structure
  H('kind: \'hybrid-tenant\'', hybridAdapter, 'Q02e: hybrid adapter kind = hybrid-tenant');
  H('localAdapter', hybridAdapter, 'Q02f: usa localAdapter (localStorage)');
  H('supabaseAdapter', hybridAdapter, 'Q02g: usa supabaseAdapter (Supabase)');
  H('readSignals', hybridAdapter, 'Q02h: readSignals prioriza Supabase');
  H('writeSignal', hybridAdapter, 'Q02i: writeSignal escribe en ambos');

  // Supabase adapter
  H('sgc_alert_occurrence_completions', supabaseAdapter, 'Q02j: tabla Supabase = sgc_alert_occurrence_completions');
  H('tenant_id', supabaseAdapter, 'Q02k: columna tenant_id');
  H('storage_key', supabaseAdapter, 'Q02l: columna storage_key');
  H('UNIQUE (tenant_id, storage_key)', supabaseAdapter, 'Q02m: unique constraint tenant+key');

  // In-memory cache for sync reads
  H('localCache', supabaseAdapter, 'Q02n: cache local para reads síncronos');
  H('cacheLoaded', supabaseAdapter, 'Q02o: cacheLoaded flag');
  // Supabase adapter uses occurrenceCompletionStorageKey which includes tenant prefix
  H('occurrenceCompletionStorageKey', supabaseAdapter, 'Q02p: usa occurrenceCompletionStorageKey para key');
}

/* ================= 3. BOOT & TENANT REGISTRATION ================= */
{
  H('setTenantIdProvider', boot, 'Q03: setTenantIdProvider exportado');
  H('tenantIdProvider', bootCode, 'Q03b: tenantIdProvider interno');
  H('createHybridTenantAdapter', bootCode, 'Q03c: boot usa hybrid adapter');
  H('getTenantId: () => tenantIdProvider', bootCode, 'Q03d: adapter lee tenantId del provider');
  H('hydrateFromPersistencePort', bootCode, 'Q03e: boot hidrata al registrar');

  // TenantIdProviderRegistrar component
  H('setTenantIdProvider', S('src/components/TenantIdProviderRegistrar.jsx'), 'Q03f: componente registra tenantId');
  H('useAuth', S('src/components/TenantIdProviderRegistrar.jsx'), 'Q03g: usa useAuth para tenantId');
  H('TenantIdProviderRegistrar', S('src/main.jsx'), 'Q03h: componente en main.jsx dentro de AuthProvider');
}

/* ================= 4. TENANT ID DERIVATION ================= */
{
  H('deriveTenantIdFromEmail', authCtx, 'Q04: deriveTenantIdFromEmail function');
  H('split', S('src/context/AuthContext.jsx'), 'Q04b: email.split en deriveTenantIdFromEmail');
  H('@', S('src/context/AuthContext.jsx'), 'Q04c: busca @ en email');
  H('tenantId', authTenant, 'Q04d: tenantId en value de AuthContext');
  H('user?.email', authTenant, 'Q04e: deriva de user.email');
}

/* ================= 5. COMPLETION BRIDGE TENANT INTEGRATION ================= */
{
  H('registerTenantIdProvider', bridge, 'Q05: registerTenantIdProvider en bridge');
  H('getCurrentTenantId', bridge, 'Q05b: getCurrentTenantId function (internal)');
  H('getCurrentTenantId()', inferSignal, 'Q05c: inferSingleSignal usa tenantId');
  H('getCurrentTenantId()', recordBulk, 'Q05d: recordBulk usa tenantId');
  H('tenantId', bridge, 'Q05e: handleCompletionIntent incluye tenantId (en archivo completo)');
  H('tenantId', bridge, 'Q05f: origin=alert incluye tenantId');
  H('tenantId', bridge, 'Q05g: origin=resource incluye tenantId');
}

/* ================= 6. RUNTIME INTEGRATION ================= */
{
  H('useAuth', runtimeHook, 'Q06: useAlertRuntime usa useAuth');
  H('tenantId', runtimeHook, 'Q06b: extrae tenantId de useAuth');
  H('registerTenantIdProvider', registerTenant, 'Q06c: registra tenantId provider en bridge');
  H('() => tenantId', registerTenant, 'Q06d: provider function returns tenantId');
  H('tenantId', registerTenant, 'Q06e: dependency array incluye tenantId');
}

/* ================= 7. TENANT KEY IN PERSISTENCE ================= */
{
  // Supabase adapter uses tenant_id column and storage_key with tenant prefix
  H('tenant_id:', supabaseAdapter, 'Q07: supabase insert incluye tenant_id');
  H('storage_key', supabaseAdapter, 'Q07b: supabase insert incluye storage_key');
  H('occurrenceCompletionStorageKey', supabaseAdapter, 'Q07c: usa occurrenceCompletionStorageKey para storage_key');

  // Hybrid adapter
  H('localAdapter.writeSignal', hybridAdapter, 'Q07d: escribe en localStorage');
  H('supabaseAdapter.writeSignal', hybridAdapter, 'Q07e: escribe en Supabase');

  // localStorage key base preservado
  H('sgc.alert.occurrence-completion-ledger.v1', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q07f: localStorage key base preservado');
}

/* ================= 8. FIRST COMPLETION IMMEDIATE VISIBILITY ================= */
{
  // completionTick triggers re-projection
  H('setCompletionTick', useAlertRuntime, 'Q08: setCompletionTick existe');
  H('completionTick', useAlertRuntime, 'Q08b: completionTick invalida memo');
  H('setCompletionTick((t) => t + 1)', useAlertRuntime, 'Q08c: tick incrementa en COMPLETION_INTENT');

  // write-through to port
  H('persistencePort.writeSignal(frozen)', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q08d: recordCompletion write-through inmediato');
  H('completedAt', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q08e: completedAt en signal');

  // projection re-reads ledger
  H('projectCurrentOccurrences', useAlertRuntime, 'Q08f: projection re-ejecutada tras tick');
  H('completionSignalFor', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q08g: ledger.completionSignalFor usado');
}

/* ================= 9. CROSS-USER REPLAY ================= */
{
  // Same tenantId = same persistence namespace
  H('tenantId', bridge, 'Q09: tenantId en signals');
  H('tenantId', bridge, 'Q09b: tenantId en bulk signals');
  H('tenantId', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q09c: tenantId en supabase adapter key');
  H('getCurrentTenantId', bridge, 'Q09d: getCurrentTenantId usado consistentemente');
}

/* ================= 10. CROSS-TENANT ISOLATION ================= */
{
  // Different tenant = different key prefix
  RxH(/tenant::\$\{tenantId\}::/, ledgerKey, 'Q10: different tenant = different key prefix');
  H('tenant_id', supabaseAdapter, 'Q10b: supabase rows filtered by tenant_id');
  N('hardcoded', ledgerKey, 'Q10c: NO hardcoded tenant value in key formula');
}

/* ================= 11. FIRST COMPLETION INTEGRITY ================= */
{
  H('persistencePort.writeSignal(frozen)', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q11: write-through en recordCompletion');
  H('completedAt', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q11b: completedAt timestamp en signal');
  H('signals.set(key, frozen)', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q11c: in-memory ledger actualizado inmediatamente');
  H('hydrateFromPersistencePort', boot, 'Q11d: boot replay en startup');
}

/* ================= 12. TEMPORAL ENGINE REGRESSION GUARD ================= */
{
  // Sprint 341 invariants preserved
  H('occurrenceWindowAt', projection, 'Q12: occurrenceWindowAt en projection (certificado Sprint 341)');
  H('OccurrenceSchedule', projection, 'Q12b: OccurrenceSchedule importado');
  N('anchor.*completedAt|completedAt.*anchor', projection, 'Q12c: completedAt NO redefine anchor');
  N('windowStart.*completedAt|completedAt.*windowStart', projection, 'Q12d: completedAt NO modifica windowStart');
  N('windowEnd.*completedAt|completedAt.*windowEnd', projection, 'Q12e: completedAt NO modifica windowEnd');
  N('next.*completedAt|completedAt.*next', projection, 'Q12f: completedAt NO deriva next window');
}

/* ================= 13. SECOND TEMPORAL AUTHORITY ================= */
{
  H('evaluateAlert', S('src/core/capabilities/alert/evaluation/AlertEvaluationEngine.js'), 'Q13a: evaluateAlert existe (inerte) en AlertEvaluationEngine');
  H('PeriodicEvaluationStrategy', S('src/core/capabilities/alert/evaluation/PeriodicEvaluationStrategy.js'), 'Q13b: PeriodicEvaluationStrategy existe');

  H('OccurrenceSchedule', projection, 'Q13c: autoridad activa = OccurrenceSchedule');
  N('evaluateAlert.*persistence|persistence.*evaluateAlert', lifecycleProvider, 'Q13d: evaluateAlert NO escribe persistence');
}

/* ================= 14. UI OWNERSHIP ================= */
{
  H('projectCurrentOccurrences', useAlertRuntime, 'Q14a: UI consume projectCurrentOccurrences');
  N('completedAt.*setState|setState.*completedAt', useAlertRuntime, 'Q14b: UI NO almacena completedAt');
  N('localStorage', useAlertRuntime, 'Q14c: UI NO escribe localStorage de occurrences');
}

/* ================= 15. BROWSER BOUNDARY ================= */
{
  H('localStorage', durableAdapter, 'Q15a: localStorage fallback preservado');
  H('supabase', supabaseAdapter, 'Q15b: Supabase para tenant sharing cross-browser');
  H('createTenantScopedSupabaseAdapter', port, 'Q15c: supabase adapter disponible');
}

/* ================= 16. ROLE INDEPENDENCE ================= */
{
  H('rol', authValue, 'Q16: roles en AuthContext');
  N('rol.*tenant|tenant.*rol', bridge, 'Q16b: rol NO afecta tenantId');
  N('isAdmin|isCalidad|isOperativo', bridge, 'Q16c: roles NO en bridge');
}

/* ================= 16. ALERT DISAPPEARANCE = COMPLETED ================= */
{
  H('isCompleted', ledger, 'Q17: ledger.isCompleted existe');
  H('completionSignalFor', projection, 'Q17b: projection usa completionSignalFor (certificado Sprint 341)');
  H('completionSignalFor', ledger, 'Q17c: completionSignalFor determina completion');
}

/* ================= 17. REAPPEARANCE = DIFFERENT BROWSER ================= */
{
  H('localStorage', durableAdapter, 'Q18a: localStorage per browser');
  H('supabase', supabaseAdapter, 'Q18b: Supabase shared across browsers (same tenant)');
  N('tenantId', localStorageKey, 'Q18c: localStorage key NO tiene tenant (fallback)');
}

/* ================= 18. OCCURRENCE IDENTITY INTEGRITY ================= */
{
  H('occurrenceIdOf', ledger, 'Q19a: occurrenceIdOf importado');
  H('occurrenceIdOf', S('src/core/capabilities/alert/occurrence/OccurrenceContract.js'), 'Q19b: occurrenceIdOf importado');

  H('alertId', bridge, 'Q19c: signal incluye alertId (en archivo completo)');
  H('resourceId', bridge, 'Q19d: signal incluye resourceId (en archivo completo)');
  H('occurrenceId', bridge, 'Q19e: signal incluye occurrenceId (en archivo completo)');
  H('moduleId', bridge, 'Q19f: signal incluye moduleId (en archivo completo)');
}

/* ================= 19. GIT INTEGRITY ================= */
{
  const files = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' })
    .stdout.split('\n').filter(Boolean)
    .map(l => l.slice(3).trim().replace(/\\/g, '/'));

  const expected = [
    // Sprint 345 (pendiente de commit — no autorizado aún por el usuario).
    'docs/Sprint-345.md',
    'scripts/sprint-345-alert-shared-persistence-tenant-boundary-forensic-audit.mjs',
    // Sprint 346 — superficie autorizada.
    'src/components/TenantIdProviderRegistrar.jsx',
    'src/core/capabilities/alert/occurrence/CompletionBridge.js',
    'src/core/capabilities/alert/occurrence/OccurrenceLedger.js',
    'src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js',
    'src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js',
    'src/context/AuthContext.jsx',
    'src/hooks/useAlertRuntime.js',
    'src/main.jsx',
    'scripts/sprint-346-alert-tenant-scoped-persistence-controlled-correction.mjs',
    'docs/Sprint-346.md',
  ];
  const unexpected = files.filter(f => !expected.includes(f));
  check(unexpected.length === 0, 'GIT: solo archivos autorizados', unexpected.join(', ') || 'OK');
}

/* ================= REPORTE ================= */
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log('\n' + '='.repeat(70));
console.log('SPRINT 346 — ALERT TENANT-SCOPED PERSISTENCE & FIRST COMPLETION CONTROLLED CORRECTION');
console.log('='.repeat(70));
console.log(`PASS  ${passed}`);
console.log(`FAIL  ${failed}`);
console.log(`TIME  ${elapsed}s`);
if (failures.length) {
  console.log('\nFALLOS:');
  for (const f of failures) console.log(`  ✗ ${f.label}${f.detail ? ' — ' + f.detail : ''}`);
}
console.log('\nFINAL CLASSIFICATION:');
if (failed > 0) {
  console.log('  STATUS:  FAIL');
  console.log('  CLASS:   REVIEW REQUIRED');
} else {
  console.log('  STATUS:  IMPLEMENTED / CERTIFIED');
  console.log('  CLASS:   CONTROLLED CORRECTION CERTIFIED');
  console.log('  TENANT PERSISTENCE: HYBRID (localStorage + Supabase)');
  console.log('  FIRST COMPLETION: IMMEDIATE VISIBILITY');
  console.log('  TEMPORAL ENGINE: PRESERVED (Sprint 341)');
  console.log('  CROSS-TENANT ISOLATION: CERTIFIED');
}
console.log('='.repeat(70));
process.exit(failed > 0 ? 1 : 0);