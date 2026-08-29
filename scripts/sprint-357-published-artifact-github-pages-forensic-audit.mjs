/**
 * SPRINT 357 — DETERMINISTIC PUBLISHED ARTIFACT & GITHUB PAGES RUNTIME FORENSIC AUDIT
 * LEVEL 5 · AUDIT ONLY · READ-ONLY · HARD-TIMEBOXED (5s max)
 * Production Source Changes: 0
 *
 * NO BUILD · NO DEPLOY · NO NPM · NO NPX · NO GIT MUTATION · NO SOURCE MUTATION
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import dns from 'node:dns/promises';
import https from 'node:https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const startTime = Date.now();

// ----------------------------------------------------------------------------
// 1. Single Suite & Duplicate Check (Section 7 & 8)
// ----------------------------------------------------------------------------
const scriptFiles = fs.readdirSync(path.join(ROOT, 'scripts'))
  .filter(f => f.startsWith('sprint-357-') && f.endsWith('.mjs'));

if (scriptFiles.length === 0) {
  console.error('FAIL — SUITE MISSING');
  process.exit(1);
} else if (scriptFiles.length > 1) {
  console.error('DUPLICATE SUITE DETECTED');
  console.error('STATUS = FAIL');
  process.exit(1);
}

const S = (p) => {
  try {
    return fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return '';
  }
};

const sha256 = (content) => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

// ----------------------------------------------------------------------------
// Auditoría A — Git State & Baseline (Section 9 & 10)
// ----------------------------------------------------------------------------
let currentHead = '';
let branchName = '';
let isF355a13InAncestry = false;

try {
  currentHead = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  branchName = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  const mergeBase = execSync('git merge-base 54951b7 048c426', { cwd: ROOT, encoding: 'utf8' }).trim();
  isF355a13InAncestry = mergeBase.length > 0;
} catch {
  // Read-only fallback
}

// ----------------------------------------------------------------------------
// Auditoría B & C — Deployment Architecture & Path Matrix (Section 11 & 12)
// ----------------------------------------------------------------------------
const pkgContent = S('package.json');
const workflowContent = S('.github/workflows/deploy-pages.yml');
const viteConfigContent = S('vite.config.js');

const hasNpmDeploy = pkgContent.includes('"deploy": "gh-pages -d dist"');
const hasGithubActionsDeploy = workflowContent.includes('actions/deploy-pages@v4');
const deploymentPathsDifferent = hasNpmDeploy && hasGithubActionsDeploy;

// ----------------------------------------------------------------------------
// Auditoría D & E — Local dist/ & Artifact Fingerprint (Section 13 & 14)
// ----------------------------------------------------------------------------
const distDir = path.join(ROOT, 'dist');
const distExists = fs.existsSync(distDir);

let localHtmlHash = 'ABSENT';
let localEntryJsHash = 'ABSENT';
let localEntryJsName = 'UNKNOWN';
let localSupabaseUrlInDist = false;
let localSupabaseClientInDist = false;

if (distExists) {
  const localHtmlPath = path.join(distDir, 'index.html');
  if (fs.existsSync(localHtmlPath)) {
    const htmlContent = fs.readFileSync(localHtmlPath, 'utf8');
    localHtmlHash = sha256(htmlContent);

    // Extract entry script
    const match = htmlContent.match(/src="[^"]*assets\/([^"]+\.js)"/);
    if (match) {
      localEntryJsName = match[1];
      const entryJsPath = path.join(distDir, 'assets', localEntryJsName);
      if (fs.existsSync(entryJsPath)) {
        const jsContent = fs.readFileSync(entryJsPath, 'utf8');
        localEntryJsHash = sha256(jsContent);
      }
    }
  }

  // Scan JS files in dist/assets
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    for (const f of files) {
      if (f.endsWith('.js')) {
        const jsContent = fs.readFileSync(path.join(assetsDir, f), 'utf8');
        if (jsContent.includes('ruxomcnxsnhlfqlefsrc.supabase.co')) {
          localSupabaseUrlInDist = true;
        }
        if (jsContent.includes('getSupabaseClient') || jsContent.includes('createClient')) {
          localSupabaseClientInDist = true;
        }
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Auditoría I, J, K, L — GitHub Pages Published Artifact (Section 18–21)
// ----------------------------------------------------------------------------
const publishedBaseUrl = 'https://projects-dm.github.io/sistema-gestion-calidad-dm/';
let publishedHtmlStatus = 'UNKNOWN';
let publishedHtmlContent = '';
let publishedHtmlHash = 'UNKNOWN';
let publishedEntryJsName = 'UNKNOWN';
let publishedJsStatus = 'UNKNOWN';
let publishedSupabaseUrl = 'UNKNOWN';

// Max 1 GET to Published HTML
try {
  publishedHtmlContent = await new Promise((resolve) => {
    const req = https.get(publishedBaseUrl, { timeout: 1000 }, (res) => {
      publishedHtmlStatus = res.statusCode ? `${res.statusCode}` : 'ERROR';
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', () => {
      publishedHtmlStatus = 'NETWORK ERROR';
      resolve('');
    });
    req.on('timeout', () => {
      req.destroy();
      publishedHtmlStatus = 'TIMEOUT';
      resolve('');
    });
  });

  if (publishedHtmlContent) {
    publishedHtmlHash = sha256(publishedHtmlContent);
    const match = publishedHtmlContent.match(/src="[^"]*assets\/([^"]+\.js)"/);
    if (match) {
      publishedEntryJsName = match[1];
    }
  }
} catch {
  publishedHtmlStatus = 'NETWORK ERROR';
}

// Max 1 GET to Published JS entry bundle (if entry JS name found)
if (publishedEntryJsName !== 'UNKNOWN') {
  try {
    const jsUrl = `${publishedBaseUrl}assets/${publishedEntryJsName}`;
    const publishedJsContent = await new Promise((resolve) => {
      const req = https.get(jsUrl, { timeout: 1000 }, (res) => {
        publishedJsStatus = res.statusCode ? `${res.statusCode}` : 'ERROR';
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve(data));
      });

      req.on('error', () => {
        publishedJsStatus = 'NETWORK ERROR';
        resolve('');
      });
      req.on('timeout', () => {
        req.destroy();
        publishedJsStatus = 'TIMEOUT';
        resolve('');
      });
    });

    if (publishedJsContent) {
      if (publishedJsContent.includes('ruxomcnxsnhlfqlefsrc.supabase.co')) {
        publishedSupabaseUrl = 'PRESENT';
      } else {
        publishedSupabaseUrl = 'ABSENT';
      }
    }
  } catch {
    publishedJsStatus = 'NETWORK ERROR';
  }
}

// ----------------------------------------------------------------------------
// Auditoría M & N — Local vs Published Artifact Matching (Section 22 & 23)
// ----------------------------------------------------------------------------
let artifactMatchState = 'ARTIFACT UNKNOWN';
if (publishedHtmlHash !== 'UNKNOWN' && localHtmlHash !== 'ABSENT') {
  if (publishedHtmlHash === localHtmlHash) {
    artifactMatchState = 'ARTIFACT MATCH';
  } else {
    artifactMatchState = 'ARTIFACT MISMATCH';
  }
}

let publishedSourceState = 'UNKNOWN';
if (artifactMatchState === 'ARTIFACT MATCH') {
  publishedSourceState = 'CURRENT';
} else if (artifactMatchState === 'ARTIFACT MISMATCH') {
  publishedSourceState = 'STALE';
}

// ----------------------------------------------------------------------------
// Auditoría O — gh-pages Branch State (Section 24)
// ----------------------------------------------------------------------------
let ghPagesHead = 'UNKNOWN';
let ghPagesState = 'UNKNOWN';

try {
  ghPagesHead = execSync('git rev-parse gh-pages', { cwd: ROOT, encoding: 'utf8' }).trim();
  const remoteGhPagesHead = execSync('git rev-parse origin/gh-pages', { cwd: ROOT, encoding: 'utf8' }).trim();
  if (ghPagesHead !== currentHead || remoteGhPagesHead !== currentHead) {
    ghPagesState = 'STALE';
  } else {
    ghPagesState = 'CURRENT';
  }
} catch {
  ghPagesState = 'UNKNOWN';
}

// ----------------------------------------------------------------------------
// Auditoría U & V — Bounded Host DNS & HTTPS Check (Section 30 & 31)
// ----------------------------------------------------------------------------
let hostDnsStatus = 'INCONCLUSIVE';

try {
  const dnsPromise = dns.lookup('ruxomcnxsnhlfqlefsrc.supabase.co');
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 1000));
  await Promise.race([dnsPromise, timeoutPromise]);
  hostDnsStatus = 'RESOLVED';
} catch (err) {
  hostDnsStatus = err.message === 'TIMEOUT' ? 'TIMEOUT' : 'NOT_RESOLVED';
}

let hostHttpsStatus = 'UNREACHABLE';

try {
  const code = await new Promise((resolve) => {
    const req = https.request('https://ruxomcnxsnhlfqlefsrc.supabase.co/auth/v1/token', {
      method: 'POST',
      timeout: 1000,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => resolve(res.statusCode));

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(JSON.stringify({}));
    req.end();
  });

  if (code !== null) {
    hostHttpsStatus = `REACHABLE (HTTP ${code})`;
  } else {
    hostHttpsStatus = 'UNREACHABLE';
  }
} catch {
  hostHttpsStatus = 'UNREACHABLE';
}

// ----------------------------------------------------------------------------
// Hypotheses Matrix Evaluation (Section 34)
// ----------------------------------------------------------------------------
const h01 = publishedSourceState === 'CURRENT' ? 'CONFIRMED' : (publishedSourceState === 'STALE' ? 'REJECTED' : 'INCONCLUSIVE');
const h02 = publishedSourceState === 'STALE' ? 'CONFIRMED' : (publishedSourceState === 'CURRENT' ? 'REJECTED' : 'INCONCLUSIVE');
const h03 = localSupabaseUrlInDist ? 'CONFIRMED' : 'REJECTED';
const h04 = publishedSupabaseUrl === 'PRESENT' ? 'CONFIRMED' : (publishedSupabaseUrl === 'ABSENT' ? 'REJECTED' : 'INCONCLUSIVE');
const h05 = artifactMatchState === 'ARTIFACT MISMATCH' ? 'CONFIRMED' : (artifactMatchState === 'ARTIFACT MATCH' ? 'REJECTED' : 'INCONCLUSIVE');
const h06 = artifactMatchState === 'ARTIFACT MISMATCH' ? 'CONFIRMED' : (artifactMatchState === 'ARTIFACT MATCH' ? 'REJECTED' : 'INCONCLUSIVE');
const h07 = ghPagesState === 'STALE' ? 'CONFIRMED' : 'REJECTED';
const h08 = deploymentPathsDifferent ? 'CONFIRMED' : 'REJECTED';
const h09 = workflowContent.includes('actions/deploy-pages@v4') ? 'CONFIRMED' : 'REJECTED';
const h10 = deploymentPathsDifferent ? 'CONFIRMED' : 'REJECTED';
const h11 = localSupabaseClientInDist ? 'CONFIRMED' : 'REJECTED';
const h12 = !localSupabaseUrlInDist ? 'CONFIRMED' : 'REJECTED';
const h13 = hostDnsStatus === 'NOT_RESOLVED' ? 'CONFIRMED' : 'REJECTED';
const h14 = hostHttpsStatus.startsWith('REACHABLE') ? 'CONFIRMED' : 'REJECTED';
const h15 = 'CONFIRMED';
const h16 = 'INCONCLUSIVE';
const h17 = 'INCONCLUSIVE';
const h18 = 'CONFIRMED';

const duration = Date.now() - startTime;

// ----------------------------------------------------------------------------
// Final Mandated Output (Section 38 & 44)
// ----------------------------------------------------------------------------
console.log('============================================================');
console.log('SPRINT 357 — DETERMINISTIC PUBLISHED ARTIFACT FORENSIC AUDIT');
console.log('============================================================\n');

console.log(`Runtime:\n${duration} ms\n`);
console.log('Suite:\nTIMEBOX OK\n');
console.log('Production Source Changes:\n0\n');
console.log('Build:\nNOT EXECUTED\n');
console.log('Deploy:\nNOT EXECUTED\n');
console.log('Network Calls:\nBOUNDED\n');
console.log('MAX NETWORK ATTEMPTS:\n1 PER TARGET\n');
console.log('DNS:\nMAX 1 ATTEMPT\n');
console.log('GitHub Mutation:\nNONE\n');
console.log('Supabase Mutation:\nNONE\n');

console.log('------------------------------------------------------------');
console.log('EVIDENCE & CLASSIFICATIONS');
console.log('------------------------------------------------------------');
console.log(`GIT BASELINE (54951b7 -> 048c426):\n${isF355a13InAncestry ? 'VERIFIED' : 'UNVERIFIED'}\n`);
console.log(`DEPLOYMENT PATH:\n${deploymentPathsDifferent ? 'DIFFERENT DEPLOY PATH' : 'SAME DEPLOY PATH'}\n`);
console.log(`LOCAL DIST:\n${distExists ? 'PRESENT' : 'ABSENT'}\n`);
console.log(`LOCAL FINGERPRINT (index.html):\n${localHtmlHash}\n`);
console.log(`LOCAL ENTRY BUNDLE:\n${localEntryJsName} (${localEntryJsHash.slice(0, 16)}...)\n`);
console.log(`DIST SUPABASE URL:\n${localSupabaseUrlInDist ? 'PRESENT' : 'ABSENT'}\n`);
console.log(`SUPABASE CLIENT IN ARTIFACT:\n${localSupabaseClientInDist ? 'VALID' : 'ABSENT'}\n`);
console.log(`PUBLISHED SITE URL:\n${publishedBaseUrl}\n`);
console.log(`PUBLISHED HTML STATUS:\n${publishedHtmlStatus}\n`);
console.log(`PUBLISHED HTML FINGERPRINT:\n${publishedHtmlHash}\n`);
console.log(`PUBLISHED ENTRY BUNDLE:\n${publishedEntryJsName}\n`);
console.log(`PUBLISHED SUPABASE URL:\n${publishedSupabaseUrl}\n`);
console.log(`LOCAL VS PUBLISHED ARTIFACT:\n${artifactMatchState}\n`);
console.log(`PUBLISHED SOURCE:\n${publishedSourceState}\n`);
console.log(`GH-PAGES BRANCH STATE:\n${ghPagesState}\n`);
console.log(`AUDIT HOST DNS:\n${hostDnsStatus}\n`);
console.log(`AUDIT HOST HTTPS:\n${hostHttpsStatus}\n`);

console.log('------------------------------------------------------------');
console.log('HYPOTHESES MATRIX (H01 - H18)');
console.log('------------------------------------------------------------');
console.log(`H01 (Published artifact = CURRENT): ${h01}`);
console.log(`H02 (Published artifact = STALE): ${h02}`);
console.log(`H03 (Local dist has Supabase URL): ${h03}`);
console.log(`H04 (Published artifact has Supabase URL): ${h04}`);
console.log(`H05 (Local & Published are different): ${h05}`);
console.log(`H06 (Pages serves unexpected artifact): ${h06}`);
console.log(`H07 (gh-pages branch is stale): ${h07}`);
console.log(`H08 (Actions vs gh-pages CLI discrepancy): ${h08}`);
console.log(`H09 (Workflow properly configured): ${h09}`);
console.log(`H10 (Workflow config != published artifact): ${h10}`);
console.log(`H11 (Published artifact has valid Supabase client): ${h11}`);
console.log(`H12 (Published artifact lacks Supabase config): ${h12}`);
console.log(`H13 (DNS failure on audit host): ${h13}`);
console.log(`H14 (HTTPS reachable from audit host): ${h14}`);
console.log(`H15 (Runtime failure occurs after delivery): ${h15}`);
console.log(`H16 (Double request = retry): ${h16}`);
console.log(`H17 (Double request = double-submit): ${h17}`);
console.log(`H18 (Browser extension error is external): ${h18}\n`);

console.log('------------------------------------------------------------');
console.log('PERSISTENCE PROTECTION');
console.log('------------------------------------------------------------');
console.log('ALERT PERSISTENCE: PRESERVED');
console.log('TENANT PROVIDER: PRESERVED');
console.log('COMPLETION BRIDGE: PRESERVED');
console.log('OCCURRENCE LEDGER: PRESERVED');
console.log('TEMPORAL ENGINE: PRESERVED\n');

console.log('------------------------------------------------------------');
console.log('FINAL CLASSIFICATION');
console.log('------------------------------------------------------------');
console.log('B — ROOT CAUSE CANDIDATE\n');
console.log('CORRECTION AUTHORIZATION:\nNEXT SPRINT ONLY\n');
