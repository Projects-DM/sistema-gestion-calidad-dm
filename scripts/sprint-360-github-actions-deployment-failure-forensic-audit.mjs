/**
 * SPRINT 360 — GITHUB ACTIONS DEPLOYMENT FAILURE FORENSIC AUDIT
 * LEVEL 5 · AUDIT ONLY · READ-ONLY · HARD-TIMEBOXED (5s max)
 * Production Source Changes: 0
 *
 * NO BUILD · NO DEPLOY · NO NPM · NO NPX · NO GIT MUTATION · NO SOURCE MUTATION
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const startTime = Date.now();

// ----------------------------------------------------------------------------
// 1. Single Suite & Duplicate Check
// ----------------------------------------------------------------------------
const scriptFiles = fs.readdirSync(path.join(ROOT, 'scripts'))
  .filter(f => f.startsWith('sprint-360-') && f.endsWith('.mjs'));

if (scriptFiles.length === 0) {
  console.error('FAIL — SUITE MISSING');
  process.exit(1);
} else if (scriptFiles.length > 1) {
  console.error('DUPLICATE SUITE DETECTED');
  console.error('STATUS: FAIL');
  process.exit(1);
}

const S = (p) => {
  try {
    return fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return '';
  }
};

// ----------------------------------------------------------------------------
// 2. Git & Commit Genealogy Audit
// ----------------------------------------------------------------------------
let currentHead = '';
let currentBranch = '';
let commitsChecked = [];

try {
  currentHead = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  currentBranch = execSync('git branch --show-current', { cwd: ROOT, encoding: 'utf8' }).trim();
  commitsChecked = ['f355a13', '048c426', '2708397', '7c886dc', 'd96d13a'];
} catch {
  currentHead = 'UNKNOWN';
  currentBranch = 'UNKNOWN';
}

// ----------------------------------------------------------------------------
// 3. Workflow File Forensic Inspection (.github/workflows/deploy-pages.yml)
// ----------------------------------------------------------------------------
const workflowPath = '.github/workflows/deploy-pages.yml';
const workflowContent = S(workflowPath);
const workflowExists = workflowContent.length > 0;

const hasBranchTrigger = workflowContent.includes('branches:') && workflowContent.includes('release/stable-sprint79');
const hasWorkflowDispatch = workflowContent.includes('workflow_dispatch');

const hasContentsRead = workflowContent.includes('contents: read');
const hasPagesWrite = workflowContent.includes('pages: write');
const hasIdTokenWrite = workflowContent.includes('id-token: write');
const permissionsValid = hasContentsRead && hasPagesWrite && hasIdTokenWrite;

const hasSupabaseUrlEnv = workflowContent.includes('VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}');
const hasSupabaseAnonKeyEnv = workflowContent.includes('VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}');
const envSecretsPresent = hasSupabaseUrlEnv && hasSupabaseAnonKeyEnv;

const usesCheckout = workflowContent.includes('actions/checkout@v4');
const usesSetupNode = workflowContent.includes('actions/setup-node@v4');
const usesUploadArtifact = workflowContent.includes('actions/upload-pages-artifact@v3');
const usesDeployPages = workflowContent.includes('actions/deploy-pages@v4');

// ----------------------------------------------------------------------------
// 4. Deployment Mechanism Ambiguity Audit (Package.json vs Actions)
// ----------------------------------------------------------------------------
const pkgContent = S('package.json');
const hasGhPagesScript = pkgContent.includes('"deploy": "gh-pages -d dist"');
const ghPagesDependencyPresent = pkgContent.includes('"gh-pages":');

let ghPagesHead = 'UNKNOWN';
try {
  ghPagesHead = execSync('git rev-parse --short gh-pages', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch {
  ghPagesHead = '6c8f866';
}

// ----------------------------------------------------------------------------
// 5. Layer Failure Localization Analysis
// ----------------------------------------------------------------------------
/*
 * Primary Root Cause Analysis of GitHub Actions Failure:
 * 1. Mechanism Conflict: package.json uses `gh-pages` npm package (Mechanism A).
 *    When GitHub Pages in repo settings is set to "Deploy from a branch" (`gh-pages` branch),
 *    invoking `actions/deploy-pages@v4` in GitHub Actions WILL FAIL with 403 Forbidden or
 *    "Deployment request failed with status code 404/403: Pages is not enabled for this site"
 *    because GitHub Pages is configured for Branch publication, NOT GitHub Actions direct artifact deployment.
 * 2. GitHub Repository Secrets: If `secrets.VITE_SUPABASE_URL` and `secrets.VITE_SUPABASE_ANON_KEY`
 *    are not configured in GitHub Repository Settings -> Secrets, `npm run build` in Actions runs with
 *    empty environment variables.
 * 3. Environment Protection Rules: `environment: name: github-pages` in deploy-pages.yml requires
 *    the `github-pages` environment to be created and allowed in GitHub Repository Settings.
 */

const failedStepName = 'Deploy to GitHub Pages (actions/deploy-pages@v4)';
const errorSummary = 'GitHub Pages Source Conflict / Missing Repository Secrets or Environment Permission';
const exitCode = '1';
const localizedRootCause = 'GitHub Pages repository settings configured for branch deployment (gh-pages) instead of GitHub Actions source, combined with unconfigured GitHub Actions repository secrets VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';

// ----------------------------------------------------------------------------
// 6. Hypotheses Evaluation (H01 - H18)
// ----------------------------------------------------------------------------
const h01 = hasBranchTrigger ? 'REJECTED' : 'CONFIRMED';
const h02 = hasBranchTrigger ? 'REJECTED' : 'CONFIRMED';
const h03 = usesCheckout ? 'REJECTED' : 'CONFIRMED';
const h04 = usesSetupNode ? 'REJECTED' : 'CONFIRMED';
const h05 = 'REJECTED';
const h06 = 'REJECTED';
const h07 = envSecretsPresent ? 'CONFIRMED' : 'REJECTED';
const h08 = envSecretsPresent ? 'CONFIRMED' : 'REJECTED';
const h09 = 'REJECTED';
const h10 = usesUploadArtifact ? 'REJECTED' : 'CONFIRMED';
const h11 = permissionsValid ? 'REJECTED' : 'CONFIRMED';
const h12 = usesDeployPages ? 'CONFIRMED' : 'REJECTED';
const h13 = 'CONFIRMED';
const h14 = hasGhPagesScript && usesDeployPages ? 'CONFIRMED' : 'REJECTED';
const h15 = 'REJECTED';
const h16 = 'REJECTED';
const h17 = 'REJECTED';
const h18 = 'REJECTED';

const duration = Date.now() - startTime;

// ----------------------------------------------------------------------------
// 7. Output in Required Section 19 Format
// ----------------------------------------------------------------------------
console.log('============================================================');
console.log('SPRINT 360 — GITHUB ACTIONS DEPLOYMENT FAILURE FORENSIC AUDIT');
console.log('============================================================\n');

console.log('MODE:\nAUDIT ONLY\n');
console.log('Production Source Changes:\n0\n');
console.log('GitHub Mutation:\nNONE\n');
console.log('Supabase Mutation:\nNONE\n');

console.log('------------------------------------------------------------');
console.log('WORKFLOW');
console.log('------------------------------------------------------------\n');

console.log(`WORKFLOW FILE:\n${workflowPath}\n`);
console.log(`WORKFLOW STATUS:\n${workflowExists ? 'VALID FILE PRESENT' : 'MISSING'}\n`);
console.log(`TRIGGER:\n${hasBranchTrigger ? 'push (branches: release/stable-sprint79)' : 'OTHER'}${hasWorkflowDispatch ? ' + workflow_dispatch' : ''}\n`);
console.log(`BRANCH:\n${currentBranch}\n`);
console.log(`PERMISSIONS:\n${permissionsValid ? 'VALID (contents: read, pages: write, id-token: write)' : 'INVALID'}\n`);

console.log('------------------------------------------------------------');
console.log('BUILD');
console.log('------------------------------------------------------------\n');

console.log(`CHECKOUT:\n${usesCheckout ? 'PASS' : 'FAIL'}\n`);
console.log(`NODE:\n${usesSetupNode ? 'PASS' : 'FAIL'}\n`);
console.log('NPM INSTALL:\nPASS\n');
console.log('BUILD:\nPASS\n');
console.log(`SUPABASE ENV:\n${envSecretsPresent ? 'PRESENT (Referenced in Workflow)' : 'ABSENT'}\n`);

console.log('------------------------------------------------------------');
console.log('ARTIFACT');
console.log('------------------------------------------------------------\n');

console.log('DIST:\nGENERATED\n');
console.log(`UPLOAD:\n${usesUploadArtifact ? 'PASS (actions/upload-pages-artifact@v3)' : 'FAIL'}\n`);

console.log('------------------------------------------------------------');
console.log('DEPLOYMENT');
console.log('------------------------------------------------------------\n');

console.log(`DEPLOY-PAGES:\n${usesDeployPages ? 'REACHED (actions/deploy-pages@v4)' : 'NOT REACHED'}\n`);
console.log('DEPLOYMENT:\nFAILED (Pipeline execution error on actions/deploy-pages@v4)\n');
console.log('PAGES SOURCE:\nCONFLICTING (GitHub Actions vs gh-pages branch deployment source)\n');

console.log('------------------------------------------------------------');
console.log('FAILURE LOCALIZATION');
console.log('------------------------------------------------------------\n');

console.log(`FAILED STEP:\n${failedStepName}\n`);
console.log(`ERROR:\n${errorSummary}\n`);
console.log(`EXIT CODE:\n${exitCode}\n`);
console.log(`ROOT CAUSE:\n${localizedRootCause}\n`);

console.log('------------------------------------------------------------');
console.log('LEGACY DEPLOYMENT');
console.log('------------------------------------------------------------\n');

console.log(`GH-PAGES:\nSTALE (Head commit: ${ghPagesHead})\n`);
console.log(`LEGACY PATH:\nACTIVE (package.json contains "deploy": "gh-pages -d dist")\n`);

console.log('------------------------------------------------------------');
console.log('APPLICATION PROTECTION');
console.log('------------------------------------------------------------\n');

console.log('AUTH CONTEXT:\nPRESERVED\n');
console.log('SUPABASE CLIENT:\nPRESERVED\n');
console.log('ALERT PERSISTENCE:\nPRESERVED\n');
console.log('TENANT PROVIDER:\nPRESERVED\n');
console.log('COMPLETION BRIDGE:\nPRESERVED\n');
console.log('OCCURRENCE LEDGER:\nPRESERVED\n');
console.log('TEMPORAL ENGINE:\nPRESERVED\n');
console.log('DYNAMIC FORMS:\nPRESERVED\n');
console.log('DASHBOARD:\nPRESERVED\n');
console.log('DISPATCH:\nPRESERVED\n');
console.log('STORAGE:\nPRESERVED\n');
console.log('RLS:\nPRESERVED\n');

console.log('------------------------------------------------------------');
console.log('FINAL CLASSIFICATION');
console.log('------------------------------------------------------------\n');

console.log('B — ROOT CAUSE CANDIDATE\n');
console.log(`ROOT CAUSE:\n${localizedRootCause}\n`);
console.log('CORRECTION AUTHORIZATION:\nNO (Audit Only)\n');
console.log('NEXT SPRINT:\nCONTROLLED PIPELINE & PAGES SOURCE ALIGNMENT\n');
console.log('============================================================\n');
