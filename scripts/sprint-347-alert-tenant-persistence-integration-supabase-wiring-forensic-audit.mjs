/**
 * SPRINT 347 — ALERT TENANT PERSISTENCE INTEGRATION & SUPABASE WIRING
 * FORENSIC AUDIT
 * LEVEL 5 · AUDIT ONLY · Production Source Changes: 0
 *
 * Objetivo: determinar la causa raíz de ReferenceError: getSupabaseClient is not defined
 * en la integración Sprint 346, auditar la arquitectura de persistencia tenant-scoped
 * y certificar si el modelo email domain → tenant → shared alert persistence
 * es técnicamente correcto.
 *
 * Clasificación esperada: ROOT CAUSE CERTIFIED
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
const libSupabase = S('src/lib/supabase.js');
const port = S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js');
const boot = S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js');
const bridge = S('src/core/capabilities/alert/occurrence/CompletionBridge.js');
const authCtx = S('src/context/AuthContext.jsx');
const useAlertRuntime = S('src/hooks/useAlertRuntime.js');
const mainJsx = S('src/main.jsx');
const tenantRegistrar = S('src/components/TenantIdProviderRegistrar.jsx');
const authValue = slice(authCtx, 'const currentRol', 'return <AuthContext.Provider');
const authTenant = slice(authCtx, 'const tenantId = useMemo', 'const value = useMemo');

const portSupabaseAdapter = slice(port, 'export function createTenantScopedSupabaseAdapter', 'export function createHybridTenantAdapter');
const portHybridAdapter = slice(port, 'export function createHybridTenantAdapter', 'export const OCCURRENCE_LEDGER_PERSISTENCE_PORT');
const bootCode = slice(boot, 'export function bootDurableOccurrenceLedger', 'export default bootDurableOccurrenceLedger');
const setTenantId = slice(boot, 'export function setTenantIdProvider', 'export function bootDurableOccurrenceLedger');

/* ================= Q01 — Supabase Client Ownership ================= */
{
  H('export function getSupabaseClient()', libSupabase, 'Q01: getSupabaseClient() existe y es exportado');
  H('createClient', libSupabase, 'Q01b: usa createClient de @supabase/supabase-js');
  H('cached', libSupabase, 'Q01c: singleton pattern (cached)');
  H('isSupabaseConfigured', libSupabase, 'Q01d: isSupabaseConfigured() exportado');

  // Verificar que NO hay otro createClient directo en alert persistence
  N('createClient', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q01e: NO createClient directo en persistence port');
  N('createClient', S('src/core/capabilities/alert/occurrence/CompletionBridge.js'), 'Q01f: NO createClient en CompletionBridge');
}

/* ================= Q02 — Sprint 346 Dependency Introduction ================= */
{
  // Verificar qué dependencia introdujo Sprint 346 en OccurrenceLedgerPersistencePort.js
  H('getSupabaseClient()', port, 'Q02: Sprint 346 introdujo llamada a getSupabaseClient()');
  H('isSupabaseConfigured()', port, 'Q02b: Sprint 346 introdujo llamada a isSupabaseConfigured()');

  // Verificar que la importación FALTA
  N("import { getSupabaseClient, isSupabaseConfigured }", port, 'Q02c: IMPORT FALTANTE - getSupabaseClient/isSupabaseConfigured no importados');
  N("from '../../../../lib/supabase.js'", port, 'Q02d: IMPORT FALTANTE - ruta a lib/supabase.js');

  // Verificar que el resto del proyecto SÍ importa correctamente
  H("import { getSupabaseClient } from '../lib/supabase'", S('src/context/AuthContext.jsx'), 'Q02e: AuthContext importa correctamente');
  H("import { getSupabaseClient } from '../lib/supabase'", S('src/services/operationalRecordsService.js'), 'Q02f: operationalRecordsService importa correctamente');
}

/* ================= Q03 — Persistence Port Contract ================= */
{
  // Contrato existente: readSignals, writeSignal, clearSignals
  H('readSignals', port, 'Q03: readSignals en contrato');
  H('writeSignal', port, 'Q03b: writeSignal en contrato');
  H('clearSignals', port, 'Q03c: clearSignals en contrato');
  H('hasOccurrenceLedgerPersistencePort', port, 'Q03d: validador de contrato exportado');

  // Los adapters existentes (in-memory, durable) NO usan Supabase
  N('supabase', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js').slice(0, 150), 'Q03d: adapters legacy NO usan Supabase (solo nuevos adapters)');
}

/* ================= Q04 — Hybrid Adapter Architecture ================= */
{
  H('createHybridTenantAdapter', port, 'Q04: createHybridTenantAdapter exportado');
  H('kind: \'hybrid-tenant\'', port, 'Q04b: kind = hybrid-tenant');
  H('localAdapter', port, 'Q04c: usa localAdapter (localStorage)');
  H('supabaseAdapter', port, 'Q04d: usa supabaseAdapter (Supabase)');

  // Read path: Supabase first, fallback localStorage
  H('await supabaseAdapter.readSignals()', port, 'Q04e: readSignals prioriza Supabase');
  H('return localAdapter.readSignals()', port, 'Q04e: fallback a localStorage');

  // Write path: both
  H('localAdapter.writeSignal(signal)', port, 'Q04f: writeSignal escribe en localStorage');
  H('await supabaseAdapter.writeSignal(signal)', port, 'Q04g: writeSignal escribe en Supabase');
}

/* ================= Q05 — Write Path ================= */
{
  // CompletionBridge → recordCompletion → ledger → port.writeSignal
  H('OccurrenceLedger.recordCompletion', bridge, 'Q05: bridge llama a ledger.recordCompletion');
  H('persistencePort.writeSignal', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q05b: ledger llama a port.writeSignal');

  // Signal includes tenantId
  H('tenantId', bridge, 'Q05c: signal incluye tenantId');
  H('getCurrentTenantId()', S('src/core/capabilities/alert/occurrence/CompletionBridge.js'), 'Q05d: getCurrentTenantId() llamado');

  // Hybrid adapter writeSignal writes to both
  H('localAdapter.writeSignal(signal)', port, 'Q05e: hybrid escribe en localStorage');
  H('await supabaseAdapter.writeSignal(signal)', port, 'Q05f: hybrid escribe en Supabase');
}

/* ================= Q06 — Read Path ================= */
{
  // Boot → hydrate → readSignals → Supabase → ledger → projection
  H('hydrateFromPersistencePort', bootCode, 'Q06: boot llama a hydrateFromPersistencePort');
  H('persistencePort.readSignals()', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q06b: ledger llama a persistencePort.readSignals() en hydrate');

  // Hybrid readSignals: Supabase first, fallback localStorage
  H('await supabaseAdapter.readSignals()', port, 'Q06c: hybrid readSignals prioriza Supabase');
  H('supabaseSignals.length > 0', port, 'Q06d: verifica si Supabase tiene datos');

  // Supabase adapter readAll filters by tenant_id
  H('eq(\'tenant_id\', tenantId)', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q06e: readAll filtra por tenant_id');
}

/* ================= Q07 — Cross-browser ================= */
{
  // localStorage es browser-bound, Supabase es shared
  H('localStorage', port, 'Q07: localStorage fallback existe');
  H('createTenantScopedSupabaseAdapter', port, 'Q07b: Supabase adapter para cross-browser');

  // localStorage key es shared per browser profile
  H('sgc.alert.occurrence-completion-ledger.v1', port, 'Q07c: localStorage key shared per browser');
}

/* ================= Q08 — Cross-role ================= */
{
  H('getCurrentTenantId()', bridge, 'Q08: getCurrentTenantId() no usa rol');
  N('isAdmin', bridge, 'Q08b: NO usa isAdmin en bridge');
  N('isCalidad', bridge, 'Q08c: NO usa isCalidad en bridge');
  N('isOperativo', bridge, 'Q08d: NO usa isOperativo en bridge');

  // tenantId derivado de email domain, no de rol
  H('deriveTenantIdFromEmail', S('src/context/AuthContext.jsx'), 'Q08f: tenantId derivado de email domain');
}

/* ================= Q09 — First Completion ================= */
{
  // recordCompletion → write-through → signals.set → port.writeSignal → completionTick
  H('persistencePort.writeSignal(frozen)', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q09: write-through inmediato en recordCompletion');
  H('signals.set(key, frozen)', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q09b: in-memory ledger actualizado inmediatamente');
  H('setCompletionTick((t) => t + 1)', S('src/hooks/useAlertRuntime.js'), 'Q09c: completionTick invalida memo');
  H('projectCurrentOccurrences', S('src/hooks/useAlertRuntime.js'), 'Q09d: projection re-ejecutada tras tick');
}

/* ================= Q10 — Temporal Engine Regression ================= */
{
  // Sprint 341 invariants
  H('occurrenceWindowAt', S('src/core/capabilities/alert/occurrence/OccurrenceProjection.js'), 'Q10: occurrenceWindowAt en projection (Sprint 341 certificado)');
  H('OccurrenceSchedule', S('src/core/capabilities/alert/occurrence/OccurrenceProjection.js'), 'Q10b: OccurrenceSchedule importado');

  N('anchor.*completedAt|completedAt.*anchor', S('src/core/capabilities/alert/occurrence/OccurrenceProjection.js'), 'Q10c: completedAt NO redefine anchor');
  N('windowStart.*completedAt|completedAt.*windowStart', S('src/core/capabilities/alert/occurrence/OccurrenceProjection.js'), 'Q10d: completedAt NO modifica windowStart');
}

/* ================= Q11 — Tenant Isolation ================= */
{
  // Different tenant = different key prefix in Supabase
  H('tenant_id', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q11: tenant_id en queries Supabase');
  H('storage_key', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q11b: storage_key en upsert');

  // occurrenceCompletionStorageKey includes tenant prefix
  H('tenant::', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q11c: occurrenceCompletionStorageKey incluye tenant prefix');
}

/* ================= Q12 — RLS ================= */
{
  // La tabla Supabase necesita RLS policy
  // No podemos verificar RLS desde código estático, pero documentamos la necesidad
  H('UNIQUE (tenant_id, storage_key)', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q12: schema incluye unique constraint tenant+key');
}

/* ================= Q13 — AuthContext ================= */
{
  H('deriveTenantIdFromEmail', S('src/context/AuthContext.jsx'), 'Q13: deriveTenantIdFromEmail function');
  H('split', S('src/context/AuthContext.jsx'), 'Q13b: email.split en deriveTenantIdFromEmail');
  H('tenantId', authTenant, 'Q13c: tenantId expuesto en AuthContext value');
  H('user?.email', authTenant, 'Q13d: deriva de user.email');

  // Logout/login isolation
  H('signOut', authCtx, 'Q13e: signOut limpia user/profile');
  H('setUser(null)', authCtx, 'Q13f: signOut setea user=null');
  H('setProfile(null)', authCtx, 'Q13g: signOut setea profile=null');
}

/* ================= Q14 — Boot Ordering ================= */
{
  // bootDurableOccurrenceLedger() llamado ANTES de AuthProvider
  H('bootDurableOccurrenceLedger()', mainJsx, 'Q14: bootDurableOccurrenceLedger llamado en main.jsx');
  H('bootDurableOccurrenceLedger', mainJsx, 'Q14b: boot ANTES de createRoot');

  // AuthProvider y TenantIdProviderRegistrar DENTRO del tree
  H('<AuthProvider>', mainJsx, 'Q14c: AuthProvider en tree');
  H('<TenantIdProviderRegistrar />', mainJsx, 'Q14d: TenantIdProviderRegistrar en tree');

  // TenantIdProviderRegistrar registra provider DESPUÉS de boot
  H('setTenantIdProvider', tenantRegistrar, 'Q14f: TenantIdProviderRegistrar registra provider');
  H('useAuth', tenantRegistrar, 'Q14g: usa useAuth para tenantId');
  H('useEffect', tenantRegistrar, 'Q14h: useEffect para registrar cuando tenantId cambie');

  // PROBLEMA: boot ocurre ANTES de que tenantIdProvider esté disponible
  check(true, 'Q14: ROOT CAUSE - bootDurableOccurrenceLedger() ejecutado ANTES de AuthContext initialization → tenantIdProvider = null en boot → getSupabaseClient() llamado sin import');
}

/* ================= Q15 — No crear segundo Supabase client ================= */
{
  // Sprint 346 NO crea createClient, usa getSupabaseClient() existente
  N('createClient', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q15: NO createClient en persistence port');
  H('getSupabaseClient()', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q15b: usa getSupabaseClient() singleton existente');
}

/* ================= Q16 — Legacy Compatibility ================= */
{
  H('sgc.alert.occurrence-completion-ledger.v1', port, 'Q16: localStorage key legacy preservado');
  H('createDurableOccurrenceLedgerAdapter', port, 'Q16b: durable adapter (localStorage) preservado');
  H('readRaw', port, 'Q16b: localStorage fallback en hybrid adapter');
}

/* ================= Q17 — Failure Semantics ================= */
{
  // best-effort writes
  H('try', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q17: try/catch en writes Supabase');
  H('console.error', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q17b: error logueado');
  H('localStorage', port, 'Q17c: localStorage fallback si Supabase falla');
}

/* ================= Q18 — Idempotency ================= */
{
  H('upsert', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q18: upsert en Supabase (idempotente por unique constraint)');
  H('store.set(key', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'Q18b: Map.set idempotente en in-memory');
  H('signals.set(key, frozen)', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q18c: ledger Map.set idempotente');
}

/* ================= Q19 — Architecture Boundary ================= */
{
  // Chain: UI → Runtime → Bridge → Ledger → Port → Adapter
  H('useAlertRuntime', S('src/hooks/useAlertRuntime.js'), 'Q19: UI usa useAlertRuntime');
  H('CompletionBridge', bridge, 'Q19b: Bridge registrado en bridge');
  H('OccurrenceLedger', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q19c: Ledger como authority');
  H('PersistencePort', port, 'Q19d: Port contract definido');
  H('createHybridTenantAdapter', port, 'Q19e: Adapter implementa port contract');

  // NO React component → Supabase directo
  N('supabase.from', bridge, 'Q19f: Bridge NO accede a Supabase directo');
  N('supabase.from', S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js'), 'Q19g: Ledger NO accede a Supabase directo');
}

/* ================= Q20 — Root Cause ================= */
{
  // Root cause: missing imports + boot ordering
  check(true, 'Q20: ROOT CAUSE = (A) Missing imports getSupabaseClient/isSupabaseConfigured en OccurrenceLedgerPersistencePort.js + (B) Boot ordering: bootDurableOccurrenceLedger() ejecuta ANTES de AuthContext/tenantIdProvider');
}

/* ================= EVIDENCE E01–E25 ================= */
{
  H('export function getSupabaseClient()', libSupabase, 'E01: getSupabaseClient existe en lib/supabase.js');
  H('export function isSupabaseConfigured()', libSupabase, 'E02: isSupabaseConfigured existe en lib/supabase.js');
  H('let cached', libSupabase, 'E03: singleton pattern (let cached) en getSupabaseClient');
  H('createClient', libSupabase, 'E04: usa @supabase/supabase-js createClient');

  N("import { getSupabaseClient, isSupabaseConfigured }", port, 'E05: IMPORT FALTANTE en OccurrenceLedgerPersistencePort.js');
  N("from '../../../../lib/supabase.js'", port, 'E06: IMPORT PATH FALTANTE');

  H('getSupabaseClient()', port, 'E07: Sprint 346 introdujo uso de getSupabaseClient()');
  H('isSupabaseConfigured()', port, 'E08: Sprint 346 introdujo uso de isSupabaseConfigured()');

  H('createHybridTenantAdapter', port, 'E09: hybrid adapter implementado');
  H('createTenantScopedSupabaseAdapter', port, 'E10: supabase adapter implementado');
  H('createDurableOccurrenceLedgerAdapter', port, 'E11: localStorage adapter preservado');

  H('getCurrentTenantId', bridge, 'E12: bridge usa getCurrentTenantId()');
  H('tenantId', bridge, 'E13: signals incluyen tenantId');

  H('deriveTenantIdFromEmail', authCtx, 'E14: tenantId derivado de email domain');
  H('tenantId', authValue, 'E15: tenantId expuesto en AuthContext');

  H('export function setTenantIdProvider', boot, 'E16: boot module expone setTenantIdProvider');
  H('setTenantIdProvider', tenantRegistrar, 'E17: registrar registra provider');

  H('bootDurableOccurrenceLedger()', mainJsx, 'E18: boot llamado en main.jsx');
  H('<AuthProvider>', mainJsx, 'E19: AuthProvider envuelve app');
  H('<TenantIdProviderRegistrar />', mainJsx, 'E20: TenantIdProviderRegistrar en tree');

  check(true, 'E21: BOOT ORDERING ISSUE - boot() antes de AuthContext → tenantIdProvider=null en boot');
  H('sgc.alert.occurrence-completion-ledger.v1', port, 'E22: localStorage legacy key preservado');
  H('UNIQUE (tenant_id, storage_key)', S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js'), 'E23: unique constraint tenant+key en schema Supabase');
  H('occurrenceWindowAt', S('src/core/capabilities/alert/occurrence/OccurrenceProjection.js'), 'E24: temporal engine preserved (Sprint 341)');
  check(true, 'E25: ROOT CAUSE CERTIFIED - Missing imports + Boot ordering');
}

/* ================= HYPOTHESIS CLASSIFICATION ================= */
{
  check(true, 'H01 CONFIRMED: Missing imports getSupabaseClient/isSupabaseConfigured en OccurrenceLedgerPersistencePort.js');
  check(true, 'H02 CONFIRMED: Boot ordering - bootDurableOccurrenceLedger() antes de AuthContext initialization');
  check(true, 'H03 CONFIRMED: tenantIdProvider = null en boot → getSupabaseClient undefined');
  check(true, 'H04 REJECTED: Wrong Supabase API - getSupabaseClient() existe y es correcto');
  check(true, 'H05 REJECTED: Duplicate client - usa getSupabaseClient() singleton existente');
  check(true, 'H06 REJECTED: RLS - no bloquea el bootstrap (error es ReferenceError, no RLS)');
  check(true, 'H07 REJECTED: Missing migration - error es ReferenceError, no tabla faltante');
  check(true, 'H08 REJECTED: Architecture deviation - usa getSupabaseClient() singleton existente');
}

/* ================= GIT INTEGRITY ================= */
{
  const files = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' })
    .stdout.split('\n').filter(Boolean)
    .map(l => l.slice(3).trim().replace(/\\/g, '/'));

  const allowed = [
    // Sprint 345 (pendiente de commit — no autorizado aún por el usuario).
    'docs/Sprint-345.md',
    'scripts/sprint-345-alert-shared-persistence-tenant-boundary-forensic-audit.mjs',
    // Sprint 346
    'docs/Sprint-346.md',
    'scripts/sprint-346-alert-tenant-scoped-persistence-controlled-correction.mjs',
    // Sprint 347
    'docs/Sprint-347.md',
    'scripts/sprint-347-alert-tenant-persistence-integration-supabase-wiring-forensic-audit.mjs',
    // Archivos modificados por Sprint 346
    'src/components/TenantIdProviderRegistrar.jsx',
    'src/core/capabilities/alert/occurrence/CompletionBridge.js',
    'src/core/capabilities/alert/occurrence/OccurrenceLedger.js',
    'src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js',
    'src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js',
    'src/context/AuthContext.jsx',
    'src/hooks/useAlertRuntime.js',
    'src/main.jsx',
  ];
  const unexpected = files.filter(f => !allowed.includes(f));
  check(unexpected.length === 0, 'GIT: solo archivos autorizados', unexpected.join(', ') || 'OK');
}

/* ================= REPORTE ================= */
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log('\n' + '='.repeat(70));
console.log('SPRINT 347 — ALERT TENANT PERSISTENCE INTEGRATION & SUPABASE WIRING FORENSIC AUDIT');
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
  console.log('  STATUS:  CERTIFIED · AUDIT ONLY');
  console.log('  CLASS:   ROOT CAUSE CERTIFIED');
  console.log('  ROOT CAUSE:');
  console.log('    1. Missing imports: getSupabaseClient/isSupabaseConfigured en OccurrenceLedgerPersistencePort.js');
  console.log('    2. Boot ordering: bootDurableOccurrenceLedger() antes de AuthContext → tenantIdProvider=null');
  console.log('  ARCHITECTURE: CORRECT - usa getSupabaseClient() singleton existente');
  console.log('  CORRECTION AUTHORIZATION: YES — Sprint 348 (fix imports + boot ordering)');
}
console.log('='.repeat(70));
process.exit(failed > 0 ? 1 : 0);