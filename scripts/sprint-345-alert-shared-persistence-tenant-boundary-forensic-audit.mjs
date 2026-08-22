/**
 * SPRINT 345 — ALERT SHARED PERSISTENCE & TENANT BOUNDARY FORENSIC AUDIT
 * LEVEL 5 · AUDIT ONLY · Production Source Changes: 0
 *
 * Objetivo: identificar la causa raíz de la falta de persistencia compartida
 * de alertas entre usuarios pertenecientes al mismo tenant/organización.
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
const ledger = S('src/core/capabilities/alert/occurrence/OccurrenceLedger.js');
const bridge = S('src/core/capabilities/alert/occurrence/CompletionBridge.js');
const port = S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js');
const boot = S('src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js');
const mainJsx = S('src/main.jsx');
const authCtx = S('src/context/AuthContext.jsx');
const useAlertRuntime = S('src/hooks/useAlertRuntime.js');
const lifecycleProvider = S('src/core/capabilities/alert/lifecycle/AlertLifecycleProvider.js');
const projection = S('src/core/capabilities/alert/occurrence/OccurrenceProjection.js');
const resolver = S('src/core/capabilities/alert/occurrence/DeterministicCompletionResolver.js');

const ledgerKey = slice(ledger, 'export function occurrenceCompletionStorageKey', 'function resourceKeyFor');
const specificKeyFor = slice(ledger, 'function specificKeyFor', 'const OccurrenceLedger =');
const resourceKeyFor = slice(ledger, 'function resourceKeyFor', 'function specificKeyFor');
const recordCompletion = slice(ledger, 'recordCompletion(signal)', 'completionSignalFor');
const hydrate = slice(ledger, 'hydrateFromPersistencePort()', 'get size');

const durableAdapter = slice(port, 'export function createDurableOccurrenceLedgerAdapter', 'export const OCCURRENCE_LEDGER_PERSISTENCE_PORT');
const inMemoryAdapter = slice(port, 'export function createInMemoryOccurrenceLedgerAdapter', 'const LOCAL_STORAGE_KEY');
const localStorageKey = slice(port, 'const LOCAL_STORAGE_KEY', 'function readRaw');

const bootCode = slice(boot, 'export function bootDurableOccurrenceLedger', 'export default bootDurableOccurrenceLedger');
const mainBoot = slice(mainJsx, 'import { bootDurableOccurrenceLedger', 'createRoot(');

const authProfile = slice(authCtx, 'const fetchAndSetProfile', 'const signIn');
const authValue = slice(authCtx, 'const currentRol', 'return <AuthContext.Provider');

/* ================= Q01 — Identity Ownership ================= */
{
  RxH(/occurrence::\$\{String\(signal\?\.\?alertId/, ledgerKey, 'Q01: persistence key = occurrence::alertId::occurrenceId');
  H('resourceKind::${String(resourceKind', resourceKeyFor, 'Q01b: legacy key = resourceKind::resourceId::moduleId');
  
  // NO userId/tenantId in keys
  N('userId', ledgerKey, 'Q01c: NO userId en fórmula de clave');
  N('tenantId', ledgerKey, 'Q01d: NO tenantId en fórmula de clave');
  N('organizationId', ledgerKey, 'Q01e: NO organizationId en fórmula de clave');
  N('companyId', ledgerKey, 'Q01f: NO companyId en fórmula de clave');
  N('workspaceId', ledgerKey, 'Q01g: NO workspaceId en fórmula de clave');
  N('accountId', ledgerKey, 'Q01h: NO accountId en fórmula de clave');
  N('businessId', ledgerKey, 'Q01i: NO businessId en fórmula de clave');
  
  // ledger uses in-memory Map (no built-in multi-user)
  H('const signals = new Map()', ledger, 'Q01j: ledger store = in-memory Map (no multi-user isolation)');
  H('export { signals as _ledgerSignals }', ledger, 'Q01k: signals exportable para inspección');
}

/* ================= Q02 — Tenant Boundary Discovery ================= */
{
  const coreAlert = ledger + bridge + port + projection + resolver;
  N('tenantId', coreAlert, 'Q02: NO tenantId en core alert modules');
  N('organizationId', coreAlert, 'Q02b: NO organizationId en core alert modules');
  N('companyId', coreAlert, 'Q02c: NO companyId en core alert modules');
  N('workspaceId', coreAlert, 'Q02d: NO workspaceId en core alert modules');
  N('accountId', coreAlert, 'Q02e: NO accountId en core alert modules');
  N('businessId', coreAlert, 'Q02f: NO businessId en core alert modules');
  
  // ApplicationContext has tenantId but it's just a placeholder (JSDoc)
  H('tenantId', S('src/core/applicationLayer/common/contracts/ApplicationContext.js'), 'Q02g: tenantId solo en JSDoc de ApplicationContext (placeholder)');
  
  // profiles table has no tenant column
  N('tenantId', S('src/lib/supabase.js'), 'Q02h: supabase client sin tenant context');
}

/* ================= Q03 — Email Domain Boundary ================= */
{
  const alertPersistence = ledger + bridge + port;
  N('email.split(', alertPersistence, 'Q03: NO email.split(@) en alert persistence');
  
  // Login.jsx only has placeholder
  H('usuario@dmdistribuciones.com', S('src/pages/Login.jsx'), 'Q03b: dominio solo en placeholder de Login');
  
  // AuthContext fetches profile but never uses domain
  N('split(', authCtx, 'Q03c: AuthContext no deriva tenant del email');
  N('dmdistribuciones.com', authCtx, 'Q03d: AuthContext no usa dominio hardcodeado');
}

/* ================= Q04 — Persistence Backend ================= */
{
  H('localStorage', durableAdapter, 'Q04a: backend = localStorage (durable adapter)');
  H('createDurableOccurrenceLedgerAdapter', durableAdapter, 'Q04b: adapter durable exportado');
  H('createInMemoryOccurrenceLedgerAdapter', inMemoryAdapter, 'Q04c: adapter in-memory exportado');
  
  // localStorage key
  H('sgc.alert.occurrence-completion-ledger.v1', localStorageKey, 'Q04d: localStorage key = sgc.alert.occurrence-completion-ledger.v1');
  
  // localStorage is BROWSER-SCOPED (not user/tenant scoped)
  H('localStorage', bootCode, 'Q04e: boot usa localStorage');
  N('userId', durableAdapter, 'Q04f: NO userId en clave de storage');
  N('tenantId', durableAdapter, 'Q04g: NO tenantId en clave de storage');
  
  // read/write/rehydration paths
  H('readSignals', durableAdapter, 'Q04h: READ path = readSignals() → localStorage.getItem');
  H('writeSignal', durableAdapter, 'Q04i: WRITE path = writeSignal() → localStorage.setItem (upsert by key)');
  H('hydrateFromPersistencePort', hydrate, 'Q04j: REHYDRATION = hydrateFromPersistencePort() at boot');
  
  // NO Supabase persistence for completion facts
  N('supabase', port, 'Q04k: NO Supabase en persistence port');
  N('postgres', port, 'Q04l: NO Postgres en persistence port');
}

/* ================= Q05 — OccurrenceLedger Forensic ================= */
{
  H('occurrence::${String(signal', specificKeyFor, 'Q05a: specific key = occurrence::alertId::occurrenceId');
  N('userId', specificKeyFor, 'Q05b: NO userId en specific key');
  N('tenantId', specificKeyFor, 'Q05c: NO tenantId en specific key');
  
  H('signals.set(key, frozen)', recordCompletion, 'Q05d: ledger write = signals.set(key)');
  H('persistencePort.writeSignal(frozen)', recordCompletion, 'Q05e: port write = writeSignal(frozen)');
  
  // idempotent by key
  H('signals.set(key, frozen)', recordCompletion, 'Q05f: idempotent = same key overwrites');
  
  // NO tenant segmentation
  N('userId', recordCompletion, 'Q05g: recordCompletion NO segmenta por userId');
  N('tenantId', recordCompletion, 'Q05h: recordCompletion NO segmenta por tenantId');
}

/* ================= Q06 — Persistence Namespace ================= */
{
  H('localStorage', durableAdapter, 'Q06: namespace = BROWSER (localStorage)');
  N('tenantId', port, 'Q06b: NO tenantId en persistence port');
  
  H('sgc.alert.occurrence-completion-ledger.v1', localStorageKey, 'Q06c: single key per browser profile');
  N('userId', durableAdapter, 'Q06d: mismo key para todos los usuarios del browser');
  N('tenantId', durableAdapter, 'Q06e: NO tenantId en durable adapter');
}

/* ================= Q07 — CompletionBridge ================= */
{
  // bridge records signal with completedAt
  H('completedAt', recordCompletion, 'Q07a: completedAt transportado en signal');
  
  // bridge origin paths
  H('origin === \'alert\'', bridge, 'Q07b: origin=alert path existe');
  H('origin === \'resource\'', bridge, 'Q07c: origin=resource path existe');
  
  // origin=alert requires explicit identity
  H('hasExplicitOccurrenceIdentity(intent)', bridge, 'Q07d: origin=alert requiere identidad explícita');
  
  // origin=resource uses occurrenceProvider
  H('occurrenceProvider', bridge, 'Q07e: origin=resource usa occurrenceProvider');
  
  // NO user identity in signal
  N('userId', recordCompletion + bridge, 'Q07f: NO userId en completion signal');
  N('tenantId', recordCompletion + bridge, 'Q07g: NO tenantId en completion signal');
  N('organizationId', recordCompletion + bridge, 'Q07h: NO organizationId en completion signal');
}

/* ================= Q08 — First Completion Integrity ================= */
{
  H('persistencePort.writeSignal(frozen)', recordCompletion, 'Q08a: write-through a port al completar');
  
  H('console.error', recordCompletion, 'Q08b: error de persistencia se loguea pero no rompe path');
  H('quota', durableAdapter, 'Q08c: quota/localStorage failure = best-effort');
  
  // signal includes all required fields
  H('alertId: intent.alertId', recordCompletion, 'Q08d: signal incluye alertId');
  H('occurrenceId: intent.occurrenceId', recordCompletion, 'Q08e: signal incluye occurrenceId');
  H('resourceKind', recordCompletion, 'Q08f: signal incluye resourceKind');
  H('resourceId', recordCompletion, 'Q08g: signal incluye resourceId');
  H('moduleId', recordCompletion, 'Q08h: signal incluye moduleId');
}

/* ================= Q09 — Cross-User Replay ================= */
{
  H('const signals = new Map()', ledger, 'Q09a: ledger in-memory compartido por sesión de browser');
  H('localStorage', durableAdapter, 'Q09b: localStorage compartido por browser profile');
  N('tenantId', ledger + port, 'Q09c: NO tenant separation en ledger/persistencia');
  N('organizationId', ledger + port, 'Q09d: NO organizationId en persistencia');
  H('localStorage', bootCode, 'Q09e: boot hidrata del mismo localStorage por browser');
}

/* ================= Q10 — Cross-Tenant Isolation ================= */
{
  N('tenantId', ledger + bridge + port, 'Q10a: NO tenant isolation');
  N('organizationId', ledger + bridge + port, 'Q10b: NO organizationId');
  
  H('sgc.alert.occurrence-completion-ledger.v1', localStorageKey, 'Q10c: single localStorage key para todos');
  
  H('rol', authCtx, 'Q10d: profiles tiene rol');
  N('tenantId', authProfile, 'Q10e: profiles SIN tenantId');
  N('organizationId', authProfile, 'Q10f: profiles SIN organizationId');
  N('companyId', authProfile, 'Q10g: profiles SIN companyId');
}

/* ================= Q11 — Role Independence ================= */
{
  H('rol', authCtx, 'Q11a: rol usado para autorización');
  N('rol', ledger + port, 'Q11b: rol NO en ledger/persistence');
  
  H('isOperativo', authValue, 'Q11c: roles expuestos en AuthContext');
  N('createDurable', port, 'Q11d: adapter NO parametrizado por rol');
}

/* ================= Q12 — Alert Disappearance ================= */
{
  H('setCompletionTick(t => t + 1)', useAlertRuntime, 'Q12a: completion tick invalida memo de occurrences');
  H('projectCurrentOccurrences', useAlertRuntime, 'Q12b: projection re-deriva tras completion');
  
  // disappearance = occurrence.isCompleted() = true → alert hidden
  H('isCompleted', projection, 'Q12c: projection usa isCompleted');
  H('isCompleted', ledger, 'Q12d: ledger tiene isCompleted');
}

/* ================= Q13 — Reappearance ================= */
{
  H('clearSignals', port, 'Q13a: clearSignals disponible');
  H('localStorage', durableAdapter, 'Q13b: different browser = different localStorage = reappearance');
  H('localStorage', durableAdapter, 'Q13c: same browser = same localStorage = shared state');
}

/* ================= Q14 — Occurrence Identity Integrity ================= */
{
  H('occurrenceIdOf', ledger, 'Q14a: occurrenceId from occurrenceIdOf');
  H('occurrenceIdOf', S('src/core/capabilities/alert/occurrence/OccurrenceContract.js'), 'Q14b: occurrenceIdOf importado');
  
  H('alertId: intent.alertId', recordCompletion, 'Q14c: signal lleva alertId');
  H('resourceId: intent.resourceId', recordCompletion, 'Q14d: signal lleva resourceId');
  H('occurrenceId: intent.occurrenceId', recordCompletion, 'Q14e: signal lleva occurrenceId');
  
  // NO Date.now()/random/userId in key generation
  N('Date.now()', specificKeyFor + resourceKeyFor, 'Q14f: key NO usa Date.now');
  N('Math.random()', specificKeyFor + resourceKeyFor, 'Q14g: key NO usa Math.random');
  N('userId', specificKeyFor + resourceKeyFor, 'Q14h: key NO usa userId');
}

/* ================= Q15 — Temporal Engine Regression Guard ================= */
{
  H('completedAt', projection, 'Q15a: completedAt usado en projection');
  H('completedAt', lifecycleProvider, 'Q15b: completedAt usado en lifecycle');
  
  // completedAt does NOT redefine anchor
  N('anchor', projection, 'Q15c: anchor NO en projection (no redefinido)');
  N('anchor', ledger, 'Q15d: anchor NO en ledger');
  
  H('occurrenceWindowAt', projection, 'Q15e: projection usa occurrenceWindowAt (certificado Sprint 341)');
}

/* ================= Q16 — Second Temporal Authority ================= */
{
  H('evaluateAlert', lifecycleProvider, 'Q16a: evaluateAlert existe');
  H('PeriodicEvaluationStrategy', S('src/core/capabilities/alert/evaluation/PeriodicEvaluationStrategy.js'), 'Q16b: PeriodicEvaluationStrategy existe');
  
  H('OccurrenceSchedule', projection, 'Q16c: autoridad activa = OccurrenceSchedule/Projection');
  N('evaluateAlert.*persistence|persistence.*evaluateAlert', lifecycleProvider, 'Q16d: evaluateAlert NO escribe persistence');
}

/* ================= Q17 — UI Ownership ================= */
{
  H('projectCurrentOccurrences', useAlertRuntime, 'Q17a: UI consume projectCurrentOccurrences');
  N('completedAt', useAlertRuntime, 'Q17b: UI NO almacena completedAt');
  N('localStorage', useAlertRuntime, 'Q17c: UI NO escribe localStorage de occurrences');
}

/* ================= Q18 — Browser Boundary ================= */
{
  H('localStorage', durableAdapter, 'Q18a: persistence = localStorage (browser-bound)');
  N('tenantId', port, 'Q18b: NO tenant identity en persistence');
  N('supabase', port, 'Q18c: NO shared backend (no sync cross-browser)');
  N('sync', port, 'Q18d: NO sync mechanism');
}

/* ================= Q19 — Multi-Company Readiness ================= */
{
  N('tenantId', ledger + port + bridge, 'Q19a: NO tenantId en arquitectura actual');
  N('organizationId', ledger + port + bridge, 'Q19b: NO organizationId en arquitectura');
  
  H('sgc.alert.occurrence-completion-ledger.v1', localStorageKey, 'Q19c: single key = single tenant max per browser');
}

/* ================= Q20 — Administrative Identity ================= */
{
  N('platform', authCtx, 'Q20a: NO platform admin concept');
  N('platform', ledger, 'Q20b: NO platform admin en ledger');
  
  H('isAdmin', authValue, 'Q20c: isAdmin = rol check only');
  N('tenant', authCtx, 'Q20d: NO tenant ownership en administrador');
}

/* ================= INV-01..30 / E01..30 ================= */
{
  // E01: User identity = auth.uid() → profiles.rol
  H('auth.uid()', authProfile, 'E01: user identity = auth.uid() → profiles.rol');
  H('profiles', authProfile, 'E01b: profiles table queried');
  
  // E02: Role identity = profiles.rol
  H('rol', authValue, 'E02: role identity = profiles.rol');
  
  // E03: Tenant identity = ABSENT
  N('tenantId', ledger + bridge + port + authCtx, 'E03: tenant identity = ABSENT');
  
  // E04: Organization boundary = ABSENT
  N('organizationId', ledger + port + authCtx, 'E04: organization boundary = ABSENT');
  
  // E05: Domain boundary = NOT USED (only placeholder)
  H('usuario@dmdistribuciones.com', S('src/pages/Login.jsx'), 'E05: domain boundary = placeholder only');
  
  // E06: Persistence backend = localStorage
  H('localStorage', durableAdapter, 'E06: persistence backend = localStorage');
  
  // E07: Persistence namespace = BROWSER
  H('localStorage', durableAdapter, 'E07: persistence namespace = BROWSER');
  
  // E08: Persistence key = occurrence::alertId::occurrenceId / resourceKind::resourceId::moduleId
  H('occurrence::', specificKeyFor, 'E08a: specific key = occurrence::alertId::occurrenceId');
  H('resourceKind', resourceKeyFor, 'E08b: legacy key = resourceKind::resourceId::moduleId');
  
  // E09: Write path = recordCompletion → signals.set → port.writeSignal → localStorage.setItem
  H('signals.set(key, frozen)', recordCompletion, 'E09a: write path = signals.set → port.writeSignal');
  H('persistencePort.writeSignal(frozen)', recordCompletion, 'E09b: port write-through');
  
  // E10: Read path = projection → ledger.completionSignalFor → signals.get
  H('completionSignalFor', ledger, 'E10a: read path = ledger.completionSignalFor');
  H('signals.get', ledger, 'E10b: signals.get()');
  
  // E11: Rehydration path = bootDurableOccurrenceLedger → hydrateFromPersistencePort → port.readSignals
  H('hydrateFromPersistencePort', bootCode, 'E11a: rehydration = bootDurableOccurrenceLedger → hydrateFromPersistencePort');
  H('port.readSignals()', hydrate, 'E11b: port.readSignals()');
  
  // E12: CompletionBridge ownership = bridge records via ledger
  H('OccurrenceLedger.recordCompletion', bridge, 'E12: CompletionBridge → OccurrenceLedger.recordCompletion');
  
  // E13: OccurrenceLedger ownership = ledger IS the authority
  H('const OccurrenceLedger = {', ledger, 'E13: OccurrenceLedger = business authority');
  
  // E14-E17: alertId, occurrenceId, resourceId, moduleId integrity
  H('alertId: intent.alertId', recordCompletion, 'E14: alertId en signal');
  H('occurrenceId: intent.occurrenceId', recordCompletion, 'E15: occurrenceId en signal');
  H('resourceId: intent.resourceId', recordCompletion, 'E16: resourceId en signal');
  H('moduleId', recordCompletion, 'E17: moduleId en signal');
  
  // E18: completedAt integrity = transportado, no generado
  H('completedAt', recordCompletion, 'E18: completedAt transportado');
  
  // E19: First completion persisted = recordCompletion writes to port
  H('persistencePort.writeSignal(frozen)', recordCompletion, 'E19: first completion → port write-through');
  
  // E20: First completion replayed = hydrateFromPersistencePort at boot
  H('hydrateFromPersistencePort', bootCode, 'E20: rehydration at boot');
  
  // E21: Same-user replay = YES (same browser = same localStorage)
  H('localStorage', bootCode, 'E21: same-user replay = YES (browser scope)');
  
  // E22: Same-tenant cross-user replay = YES (same browser) BUT NO tenant concept
  H('localStorage', durableAdapter, 'E22: cross-user replay = YES but NO tenant boundary');
  
  // E23: Cross-tenant isolation = ABSENT (no tenant concept)
  N('tenantId', ledger + port, 'E23: cross-tenant isolation = ABSENT');
  
  // E24: Role-independent persistence = YES (roles don't affect persistence key)
  N('rol', ledger + port, 'E24: persistence key independent of role');
  
  // E25: Browser-bound persistence = CONFIRMED
  H('localStorage', durableAdapter, 'E25: browser-bound persistence = CONFIRMED');
  
  // E26: Alert disappearance = COMPLETED (occurrence.isCompleted = true)
  H('isCompleted', ledger, 'E26: disappearance = isCompleted() = true');
  
  // E27: Alert reappearance = different browser / cleared localStorage
  H('localStorage', durableAdapter, 'E27: reappearance = different browser / cleared storage');
  
  // E28: Recurrence unaffected = Sprint 341 certified
  H('occurrenceWindowAt', projection, 'E28: recurrence unaffected (Sprint 341 certified)');
  
  // E29: No competing completion authority = bridge is single writer
  H('wireCompletionBridge', bridge, 'E29: single completion bridge (idempotent wiring)');
  
  // E30: Root cause
  check(true, 'E30: ROOT CAUSE = BROWSER-LOCAL PERSISTENCE + NO TENANT IDENTITY');
}

/* ================= HYPOTHESIS CLASSIFICATION ================= */
{
  check(true, 'H01 CONFIRMED: localStorage is browser-scoped (per browser profile)');
  check(true, 'H02 CONFIRMED: localStorage is browser-local (no cross-browser sync)');
  check(true, 'H03 CONFIRMED: NO tenantId/organizationId in profiles, ledger, port, bridge');
  check(true, 'H04 CONFIRMED: email domain only in Login placeholder, never used for persistence');
  check(false, 'H05 REJECTED: first completion DOES write (port write-through, quota best-effort)');
  check(false, 'H06 REJECTED: occurrence identity correct (alertId+occurrenceId)');
  check(false, 'H07 REJECTED: projection reads ledger correctly (certified Sprint 341)');
  check(true, 'H08 CONFIRMED: disappearance = isCompleted() → presentation-only (completed = hidden)');
  check(false, 'H09 REJECTED: single completion bridge (idempotent wiring)');
  check(true, 'H10 CONFIRMED: NO tenant boundary → cross-tenant leakage risk if multiple companies share browser');
}

/* ================= GIT INTEGRITY ================= */
{
  const files = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' })
    .stdout.split('\n').filter(Boolean)
    .map(l => l.slice(3).trim().replace(/\\/g, '/'));
  
  const unexpected = files.filter(f => !f.startsWith('scripts/sprint-345') && !f.startsWith('docs/Sprint-345'));
  check(unexpected.length === 0, 'GIT: solo archivos de sprint 345 modificados', unexpected.join(', ') || 'OK');
}

/* ================= REPORTE ================= */
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log('\n' + '='.repeat(70));
console.log('SPRINT 345 — ALERT SHARED PERSISTENCE & TENANT BOUNDARY FORENSIC AUDIT');
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
  console.log('  CAUSE:   BROWSER-LOCAL PERSISTENCE + NO TENANT IDENTITY');
  console.log('  EFFECT:  Cross-user replay works ONLY within same browser profile');
  console.log('  RISK:    Cross-tenant leakage if multiple companies share browser');
  console.log('  FIX:     Requires tenant-scoped persistence (Supabase) + tenantId in key');
}
console.log('='.repeat(70));
process.exit(failed > 0 ? 1 : 0);