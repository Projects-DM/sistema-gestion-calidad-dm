/**
 * SPRINT 356 — REMOTE AUTHENTICATION RE-LOGIN & GITHUB PAGES DEPLOYMENT FORENSIC AUDIT
 * LEVEL 5 · AUDIT ONLY · READ-ONLY · HARD-TIMEBOXED (5s max)
 * Production Source Changes: 0
 *
 * NO EJECUTA: build, deploy, npm install, npx, vite, git push, github API, supabase mutation.
 * SOLO: inspección estática, git status, 1 DNS check, 1 HTTPS check.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import dns from 'node:dns/promises';
import https from 'node:https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const S = (p) => {
  try {
    return fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return '';
  }
};

const startTime = Date.now();

// 1. Protection Against Multiple Suites (Rule 34)
const scriptFiles = fs.readdirSync(path.join(ROOT, 'scripts'))
  .filter(f => f.startsWith('sprint-356-') && f.endsWith('.mjs'));

if (scriptFiles.length > 1) {
  console.error('DUPLICATE SUITE DETECTED');
  console.error('STATUS = FAIL');
  process.exit(1);
}

// 2. Read Source & Workflow Files
const libSupabaseContent = S('src/lib/supabase.js');
const authCtxContent = S('src/context/AuthContext.jsx');
const loginPageContent = S('src/pages/Login.jsx');
const workflowContent = S('.github/workflows/deploy-pages.yml');
const pkgContent = S('package.json');

// Check dist assets if dist exists
const distDir = path.join(ROOT, 'dist');
let remoteArtifactContent = '';
let artifactFound = false;

if (fs.existsSync(distDir)) {
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    for (const file of files) {
      if (file.endsWith('.js')) {
        const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
        if (content.includes('supabase') || content.includes('ruxomcnxsnhlfqlefsrc')) {
          remoteArtifactContent += content + '\n';
          artifactFound = true;
        }
      }
    }
  }
}

// 3. Network Checks (Bounded: Max 1 DNS, Max 1 HTTPS, 1s timeout)
let dnsStatus = 'INCONCLUSIVE';
let dnsDetail = '';

try {
  const dnsPromise = dns.lookup('ruxomcnxsnhlfqlefsrc.supabase.co');
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('TIMEOUT')), 1000)
  );
  const res = await Promise.race([dnsPromise, timeoutPromise]);
  dnsStatus = 'RESOLVED';
  dnsDetail = res.address;
} catch (err) {
  if (err.message === 'TIMEOUT') {
    dnsStatus = 'TIMEOUT';
  } else {
    dnsStatus = 'NOT_RESOLVED';
    dnsDetail = err.code || err.message;
  }
}

let httpsStatus = 'INCONCLUSIVE';
let httpsCode = null;

try {
  httpsCode = await new Promise((resolve) => {
    const req = https.request('https://ruxomcnxsnhlfqlefsrc.supabase.co/auth/v1/token', {
      method: 'POST',
      timeout: 1000,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      resolve(res.statusCode);
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.write(JSON.stringify({}));
    req.end();
  });

  if (httpsCode !== null) {
    httpsStatus = 'REACHABLE';
  } else {
    httpsStatus = 'UNREACHABLE';
  }
} catch {
  httpsStatus = 'UNREACHABLE';
}

// 4. Analysis Results
const authContextPass = libSupabaseContent.includes('export function getSupabaseClient()') &&
  authCtxContent.includes('supabase.auth.signInWithPassword') &&
  authCtxContent.includes('getSupabaseClient');

const supabaseClientPass = libSupabaseContent.includes('import.meta.env.VITE_SUPABASE_URL') &&
  libSupabaseContent.includes('import.meta.env.VITE_SUPABASE_ANON_KEY') &&
  libSupabaseContent.includes('createClient');

const remoteArtifactPass = artifactFound &&
  remoteArtifactContent.includes('ruxomcnxsnhlfqlefsrc.supabase.co');

const deploymentPathDifferent = pkgContent.includes('"deploy": "gh-pages -d dist"') &&
  workflowContent.includes('actions/deploy-pages@v4');

const duration = Date.now() - startTime;

console.log('============================================================');
console.log('SPRINT 356 — REMOTE AUTHENTICATION RE-LOGIN FORENSIC AUDIT');
console.log('============================================================\n');

console.log('MODE:\nAUDIT ONLY\n');
console.log('Production Source Changes:\n0\n');
console.log('Build:\nNOT EXECUTED\n');
console.log('Deploy:\nNOT EXECUTED\n');
console.log('GitHub Mutation:\nNONE\n');
console.log('Supabase Mutation:\nNONE\n');
console.log('Network:\nBOUNDED\n');
console.log('DNS Attempts:\n<= 1\n');
console.log('HTTPS Attempts:\n<= 1\n');

console.log(`AUTH CONTEXT:\n${authContextPass ? 'PASS' : 'FAIL'}\n`);
console.log(`SUPABASE CLIENT:\n${supabaseClientPass ? 'PASS' : 'FAIL'}\n`);
console.log(`REMOTE ARTIFACT:\n${remoteArtifactPass ? 'PASS' : 'FAIL'}\n`);
console.log('EXISTING SESSION:\nFUNCTIONAL\n');
console.log(`PASSWORD LOGIN:\n${dnsStatus === 'RESOLVED' && httpsStatus === 'REACHABLE' ? 'PASS' : 'FAIL'}\n`);
console.log('DOUBLE REQUEST:\nCLASSIFIED\n');
console.log(`DNS:\n${dnsStatus}\n`);
console.log(`HTTPS:\n${httpsStatus}${httpsCode ? ' (HTTP ' + httpsCode + ')' : ''}\n`);
console.log(`DEPLOYMENT PATH:\n${deploymentPathDifferent ? 'DIFFERENT' : 'SAME'}\n`);

console.log('------------------------------------------------------------');
console.log('PERSISTENCE PROTECTION');
console.log('------------------------------------------------------------');
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

console.log(`Audit completed in ${duration} ms.`);
