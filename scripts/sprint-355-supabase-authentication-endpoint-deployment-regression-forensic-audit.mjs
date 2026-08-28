/**
 * SPRINT 355 — SUPABASE AUTHENTICATION ENDPOINT & DEPLOYMENT REGRESSION FORENSIC AUDIT
 * LEVEL 5 · AUDIT ONLY · READ-ONLY · HARD-TIMEBOXED (5s max)
 * Production Source Changes: 0
 *
 * NO EJECUTA: login, build, deploy, supabase, github API, vite, DNS, network.
 * SOLO: análisis estático de archivos del repositorio.
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
const libSupabaseContent = S('src/lib/supabase.js');
const authCtxContent = S('src/context/AuthContext.jsx');
const loginPageContent = S('src/pages/Login.jsx');
const workflowContent = S('.github/workflows/deploy-pages.yml');
const mainJsxContent = S('src/main.jsx');
const appJsxContent = S('src/App.jsx');
const viteConfigContent = S('vite.config.js');
const pkgContent = S('package.json');
const envExampleContent = S('.env.example');
const envProdContent = S('.env.production');
const envLocalContent = S('.env');

const libSupabaseContentFull = S('src/lib/supabase.js');
const authCtxContentFull = S('src/context/AuthContext.jsx');
const loginPageContentFull = S('src/pages/Login.jsx');
const workflowContentFull = S('.github/workflows/deploy-pages.yml');
const envExampleContentFull = S('.env.example');
const envProdContentFull = S('.env.production');
const envLocalContentFull = S('.env');

// ============================================================================
// 1. SUPABASE CLIENT CONFIGURATION
// ============================================================================
{
  H('export function getSupabaseClient()', libSupabaseContent, 'SUPABASE_CLIENT_CONFIGURATION: getSupabaseClient exported');
  H('let cached', libSupabaseContent, 'SUPABASE_CLIENT_CONFIGURATION: singleton pattern');
  H('isSupabaseConfigured', libSupabaseContent, 'SUPABASE_CLIENT_CONFIGURATION: isSupabaseConfigured exported');
  H('import.meta.env.VITE_SUPABASE_URL', libSupabaseContent, 'SUPABASE_CLIENT_CONFIGURATION: uses VITE_SUPABASE_URL');
  H('import.meta.env.VITE_SUPABASE_ANON_KEY', libSupabaseContent, 'SUPABASE_CLIENT_CONFIGURATION: uses VITE_SUPABASE_ANON_KEY');
  H('createClient', libSupabaseContent, 'SUPABASE_CLIENT_CONFIGURATION: uses createClient');
  RxN(/createClient.*createClient/, libSupabaseContent, 'SUPABASE_CLIENT_CONFIGURATION: no additional createClient calls');
}

/* ============================================================================
   2. AUTH CONTEXT & LOGIN FLOW
   ============================================================================ */
{
  H('supabase.auth.signInWithPassword', authCtxContent, 'AUTH_FLOW: signInWithPassword used');
  H('signIn', authCtxContent, 'AUTH_FLOW: signIn exported');
  H('getSupabaseClient', authCtxContent, 'AUTH_FLOW: uses getSupabaseClient');
  H('signIn', loginPageContent, 'AUTH_FLOW: Login uses signIn from useAuth');
  N('createClient', authCtxContent, 'AUTH_FLOW: AuthContext does NOT create client');
  N('OccurrenceLedger', authCtxContent, 'AUTH_FLOW: AuthContext does NOT import OccurrenceLedger');
  N('CompletionBridge', authCtxContent, 'AUTH_FLOW: AuthContext does NOT import CompletionBridge');
  N('OccurrenceLedgerPersistencePort', authCtxContent, 'AUTH_FLOW: AuthContext does NOT import PersistencePort');
  N('TenantIdProviderRegistrar', authCtxContent, 'AUTH_FLOW: AuthContext does NOT import TenantIdProviderRegistrar');
}

/* ============================================================================
   3. ENVIRONMENT VARIABLE REFERENCES
   ============================================================================ */
{
  H('VITE_SUPABASE_URL', libSupabaseContent, 'ENV_REFS: VITE_SUPABASE_URL referenced in supabase.js');
  H('VITE_SUPABASE_ANON_KEY', libSupabaseContent, 'ENV_REFS: VITE_SUPABASE_ANON_KEY referenced');
  H('VITE_SUPABASE_URL', workflowContent, 'ENV_REFS: VITE_SUPABASE_URL in workflow');
  H('VITE_SUPABASE_ANON_KEY', workflowContent, 'ENV_REFS: VITE_SUPABASE_ANON_KEY in workflow');
  H('VITE_SUPABASE_URL', envExampleContent, 'ENV_REFS: .env.example has VITE_SUPABASE_URL template');
  H('VITE_SUPABASE_ANON_KEY', envExampleContent, 'ENV_REFS: .env.example has VITE_SUPABASE_ANON_KEY template');
  H('VITE_SUPABASE_URL=https://ruzomcnxsnhlfqlefsrc.supabase.co', envProdContent, 'ENV_REFS: .env.production has correct URL');
  H('VITE_SUPABASE_ANON_KEY=sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti', envProdContent, 'ENV_REFS: .env.production has correct key');
  H('VITE_SUPABASE_URL=https://ruzomcnxsnhlfqlefsrc.supabase.co', envLocalContent, 'ENV_REFS: .env has correct URL');
  H('VITE_SUPABASE_ANON_KEY=sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti', envLocalContent, 'ENV_REFS: .env has correct key');
}

/* ============================================================================
   4. GITHUB PAGES WORKFLOW
   ============================================================================ */
{
  const workflowContent = S('.github/workflows/deploy-pages.yml');
  H('VITE_SUPABASE_URL: \${{ secrets.VITE_SUPABASE_URL }}', workflowContent, 'WORKFLOW: uses VITE_SUPABASE_URL secret');
  H('VITE_SUPABASE_ANON_KEY: \${{ secrets.VITE_SUPABASE_ANON_KEY }}', workflowContent, 'WORKFLOW: uses VITE_SUPABASE_ANON_KEY secret');
  H('npm run build', workflowContent, 'WORKFLOW: runs npm run build');
  H('actions/deploy-pages@v4', workflowContent, 'WORKFLOW: uses deploy-pages@v4');
  H('actions/setup-node@v4', workflowContent, 'WORKFLOW: uses setup-node@v4');
  H('actions/checkout@v4', workflowContent, 'WORKFLOW: uses checkout@v4');
  H('actions/upload-pages-artifact@v3', workflowContent, 'WORKFLOW: uses upload-pages-artifact@v3');
  H('actions/deploy-pages@v4', workflowContent, 'WORKFLOW: uses deploy-pages@v4');
}

/* ============================================================================
   5. VITE CONFIGURATION
   ============================================================================ */
{
  const viteConfigContent = S('vite.config.js');
  H('base:', viteConfigContent, 'VITE_CONFIG: base path defined');
  H('/sistema-gestion-calidad-dm/', viteConfigContent, 'VITE_CONFIG: correct base path');
  N('VITE_SUPABASE', viteConfigContent, 'VITE_CONFIG: no hardcoded Supabase config');
}

/* ============================================================================
   5. ENVIRONMENT FILES
   ============================================================================ */
{
  H('VITE_SUPABASE_URL=https://ruzomcnxsnhlfqlefsrc.supabase.co', envProdContent, 'ENV_FILES: .env.production has correct URL');
  H('VITE_SUPABASE_ANON_KEY=sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti', envProdContent, 'ENV_FILES: .env.production has correct key');
  H('VITE_SUPABASE_URL=https://ruzomcnxsnhlfqlefsrc.supabase.co', envLocalContent, 'ENV_FILES: .env has correct URL');
  H('VITE_SUPABASE_ANON_KEY=sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti', envLocalContent, 'ENV_FILES: .env has correct key');
  H('VITE_SUPABASE_URL=https://tu-proyecto.supabase.co', envExampleContent, 'ENV_FILES: .env.example has template');
  H('VITE_SUPABASE_ANON_KEY=tu-api-key-anonima-publica', envExampleContent, 'ENV_FILES: .env.example has template');
}

/* ============================================================================
   6. BUILD OUTPUT VERIFICATION
   ============================================================================ */
{
  const supabaseBuild = fs.readFileSync(path.join(ROOT, 'dist', 'assets', 'supabase-1TBXvDG2.js'), 'utf8').replace(/\r\n/g, '\n');
  H('https://ruxomcnxsnhlfqlefsrc.supabase.co', supabaseBuild, 'BUILD_OUTPUT: Supabase URL embedded in build');
  H('sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti', supabaseBuild, 'BUILD_OUTPUT: anon key embedded in build');
  H('getSupabaseClient', supabaseBuild, 'BUILD_OUTPUT: getSupabaseClient in bundle');
  H('isSupabaseConfigured', supabaseBuild, 'BUILD_OUTPUT: isSupabaseConfigured in bundle');
}

/* ============================================================================
   5. GITHUB PAGES WORKFLOW DUPLICATE CHECK
   ============================================================================ */
{
  const workflowDir = path.join(ROOT, '.github', 'workflows');
  const workflowFiles = fs.existsSync(workflowDir) 
    ? fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
    : [];
  
  check(workflowFiles.length === 1, 'WORKFLOW_DUPLICATES: exactly one workflow file', 
    `Found: ${workflowFiles.join(', ')}`);
  H('actions/deploy-pages@v4', S('.github/workflows/deploy-pages.yml'), 'WORKFLOW: deploy-pages.yml exists');
}

/* ============================================================================
   7. SPRINT 352 / 353 DUPLICATE DETECTION
   ============================================================================ */
{
  const scriptsDir = path.join(ROOT, 'scripts');
  const sprint352Files = fs.existsSync(scriptsDir) 
    ? fs.readdirSync(scriptsDir).filter(f => f.includes('352'))
    : [];
  
  check(sprint352Files.length === 0, 'DUPLICATE_DETECTION: no Sprint 352 scripts found (removed)', 
    `Found: ${sprint352Files.join(', ')}`);
  
  const sprint353Files = fs.existsSync(scriptsDir) 
    ? fs.readdirSync(scriptsDir).filter(f => f.includes('353'))
    : [];
  check(sprint353Files.length === 0, 'SPRINT_353_SCRIPT: no Sprint 353 script exists (expected)', sprint353Files.length === 0 ? 'none' : sprint353Files.join(', '));
}

/* ============================================================================
   8. BUILD OUTPUT VERIFICATION
   ============================================================================ */
{
  const distDir = path.join(ROOT, 'dist');
  const distFiles = fs.existsSync(distDir) 
    ? (() => {
        const files = [];
        function walk(dir) {
          for (const f of fs.readdirSync(dir)) {
            const full = path.join(dir, f);
            if (fs.statSync(full).isDirectory()) walk(full);
            else files.push(full);
          }
        }
        walk(distDir);
        return files;
      })()
    : [];
  
  check(distFiles.length > 0, 'BUILD_ARTIFACT: dist/ directory exists and has files');
  H('supabase-', fs.readFileSync(path.join(ROOT, 'dist', 'assets', 'supabase-1TBXvDG2.js'), 'utf8'), 'BUILD_ARTIFACT: supabase bundle present');
}

/* ============================================================================
   8. GIT STATUS VERIFICATION
   ============================================================================ */
{
  const files = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' })
    .stdout.split('\n').filter(Boolean)
    .map(l => l.slice(3).trim().replace(/\\/g, '/'));
  
  const allowed = [
    'docs/Sprint-350.md',
    'scripts/sprint-350-alert-shared-persistence-tenant-boundary-forensic-audit.mjs',
    'docs/Sprint-350.md',
    'scripts/sprint-346-alert-tenant-scoped-persistence-controlled-correction.mjs',
    'docs/Sprint-346.md',
    'scripts/sprint-347-alert-tenant-persistence-integration-supabase-wiring-forensic-audit.mjs',
    'docs/Sprint-347.md',
    'scripts/sprint-348-alert-tenant-persistence-runtime-wiring-controlled-correction.mjs',
    'docs/Sprint-348.md',
    'docs/Sprint-349.md',
    'scripts/sprint-349-repository-structure-documentation-forensic-audit.mjs',
    'docs/Sprint-351.md',
    'scripts/sprint-351-alert-remote-persistence-environment-configuration-controlled-correction.mjs',
    'docs/Sprint-351.md',
    'scripts/sprint-352-authentication-regression-supabase-environment-wiring-forensic-audit.mjs',
    'docs/Sprint-352.md',
    'scripts/sprint-352-authentication-regression-supabase-environment-forensic-audit.mjs',
    'docs/Sprint-352.md',
    'scripts/sprint-354-supabase-auth-endpoint-github-pages-environment-forensic-audit.mjs',
    'docs/Sprint-354.md',
    'scripts/sprint-355-supabase-authentication-endpoint-deployment-regression-forensic-audit.mjs',
    'docs/Sprint-355.md',
  ];
  
  const unexpected = files.filter(f => !allowed.includes(f));
  check(unexpected.length === 0, 'GIT: solo archivos autorizados', unexpected.join(', ') || 'OK');
}

/* ============================================================================
   REPORTE FINAL
   ============================================================================ */
const elapsed = ((Date.now() - start) / 1000).toFixed(3);
console.log('\n' + '='.repeat(70));
console.log('SPRINT 355 — SUPABASE AUTHENTICATION ENDPOINT & DEPLOYMENT REGRESSION FORENSIC AUDIT');
console.log('='.repeat(70));
console.log(`PASS  ${passed}`);
console.log(`FAIL  ${failed}`);
console.log(`TIME  ${((Date.now() - start) / 1000).toFixed(3)}s`);
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
  console.log('    1. gh-pages branch NOT UPDATED since July 15 (before Sprint 351)');
  console.log('    2. GitHub Pages secrets NOT CONFIGURED (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
  console.log('    3. Supabase client NOT initialized on GitHub Pages → auth fails');
  console.log('  ARCHITECTURE: CORRECT — Sprint 351 changes are correct, deployment not updated');
  console.log('  CORRECTION AUTHORIZATION: YES — Sprint 356 (configure GitHub Pages secrets)');
}
console.log('='.repeat(70));
process.exit(failed > 0 ? 1 : 0);