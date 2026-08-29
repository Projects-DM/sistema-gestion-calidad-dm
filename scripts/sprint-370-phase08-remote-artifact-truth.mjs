// Sprint 370 — Phase 08 & 09: Remote Artifact Truth & Comparison
// AUDIT ONLY — NO MODIFICATIONS

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Sprint370-Audit' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

const baseUrl = 'https://projects-dm.github.io/sistema-gestion-calidad-dm';

console.log('============================================================');
console.log('SPRINT 370 — PHASE 08: PUBLISHED ARTIFACT TRUTH');
console.log('============================================================\n');

// 1. Fetch remote index.html
const indexRes = await httpsGet(baseUrl + '/');
console.log('REMOTE INDEX HTTP STATUS:', indexRes.status);

// 2. Extract JS and CSS references
const jsRefs = [...indexRes.body.matchAll(/(?:src|href)="([^"]*\.js)"/g)].map(m => m[1]);
const cssRefs = [...indexRes.body.matchAll(/href="([^"]*\.css)"/g)].map(m => m[1]);

console.log('\nREMOTE JS REFERENCES:');
jsRefs.forEach(ref => console.log('  ' + ref));

console.log('\nREMOTE CSS REFERENCES:');
cssRefs.forEach(ref => console.log('  ' + ref));

// 3. Identify entry and supabase chunk
const entryJs = jsRefs.find(r => r.includes('index-') && r.endsWith('.js'));
const supabaseJs = jsRefs.find(r => r.includes('supabase-') && r.endsWith('.js'));

console.log('\nENTRY JS:', entryJs || 'NOT FOUND');
console.log('SUPABASE CHUNK:', supabaseJs || 'NOT FOUND');

// 4. Fetch the remote supabase chunk and inspect for URL
if (supabaseJs) {
  const supabaseUrl = supabaseJs.startsWith('http') ? supabaseJs : baseUrl + '/' + supabaseJs.replace(/^\.\//, '');
  const supabaseRes = await httpsGet(supabaseUrl);
  console.log('\nREMOTE SUPABASE CHUNK HTTP STATUS:', supabaseRes.status);
  console.log('REMOTE SUPABASE CHUNK SIZE:', supabaseRes.body.length, 'bytes');
  
  // Search for Supabase URL domain
  const containsSupabaseUrl = supabaseRes.body.includes('supabase.co');
  const containsCreateClient = supabaseRes.body.includes('createClient');
  const containsGetSupabaseClient = supabaseRes.body.includes('getSupabaseClient');
  
  // CRITICAL: Search for the specific factory function pattern
  // In the LOCAL build with .env, Vite hardcodes: mi(`https://xxx.supabase.co`, `key`)
  // In a build WITHOUT env vars, Vite would produce: void 0 or "" for the env references
  
  // Look for the getSupabaseClient compiled function
  const factoryMatch = supabaseRes.body.match(/function\s+\w+\(\)\{[^}]*supabase\.co[^}]*\}/);
  const voidMatch = supabaseRes.body.match(/function\s+\w+\(\)\{[^}]*void\s+0[^}]*return\s+null/);
  const emptyStringMatch = supabaseRes.body.match(/function\s+\w+\(\)\{[^}]*""[^}]*return\s+null/);
  
  // Look for the actual compiled getSupabaseClient 
  // The compiled pattern should be near: isSupabaseConfigured / getSupabaseClient exports
  const lastLines = supabaseRes.body.slice(-2000);
  
  console.log('\n------------------------------------------------------------');
  console.log('REMOTE SUPABASE CHUNK CONTENT ANALYSIS');
  console.log('------------------------------------------------------------');
  console.log('CONTAINS supabase.co:', containsSupabaseUrl ? 'PRESENT' : 'ABSENT');
  console.log('CONTAINS createClient:', containsCreateClient ? 'PRESENT' : 'ABSENT');
  console.log('CONTAINS getSupabaseClient:', containsGetSupabaseClient ? 'PRESENT' : 'ABSENT');
  
  // SHA256 of remote chunk
  const remoteSha = crypto.createHash('sha256').update(supabaseRes.body).digest('hex');
  console.log('REMOTE SUPABASE CHUNK SHA256:', remoteSha);
  
  // Compare with local
  const localSupabasePath = path.join(ROOT, 'dist', 'assets', 'supabase-BSsRzCe5.js');
  if (fs.existsSync(localSupabasePath)) {
    const localContent = fs.readFileSync(localSupabasePath, 'utf8');
    const localSha = crypto.createHash('sha256').update(localContent).digest('hex');
    console.log('LOCAL  SUPABASE CHUNK SHA256:', localSha);
    console.log('\nLOCAL = REMOTE:', localSha === remoteSha ? 'YES (EXACT MATCH)' : 'NO (DIFFERENT ARTIFACT)');
    console.log('LOCAL  FILENAME: supabase-BSsRzCe5.js');
    console.log('REMOTE FILENAME:', supabaseJs);
  }
  
  // CRITICAL: Extract the exact compiled factory function from REMOTE
  // Search for the pattern that corresponds to getSupabaseClient
  // The compiled output should have: export{... as getSupabaseClient} or similar
  const tail = supabaseRes.body.slice(-500);
  console.log('\n------------------------------------------------------------');
  console.log('REMOTE SUPABASE CHUNK TAIL (last 500 chars - FACTORY REGION)');
  console.log('------------------------------------------------------------');
  // Safety: redact any potential anon key before printing
  const safeOutput = tail.replace(/eyJ[A-Za-z0-9_-]{20,}/g, '[REDACTED_KEY]')
                         .replace(/sb_publishable_[A-Za-z0-9_-]+/g, '[REDACTED_KEY]');
  console.log(safeOutput);
}

// 5. Compare local vs remote index.html
console.log('\n------------------------------------------------------------');
console.log('PHASE 09: LOCAL vs REMOTE INDEX.HTML COMPARISON');
console.log('------------------------------------------------------------');
const localIndexPath = path.join(ROOT, 'dist', 'index.html');
if (fs.existsSync(localIndexPath)) {
  const localIndex = fs.readFileSync(localIndexPath, 'utf8');
  const localIndexSha = crypto.createHash('sha256').update(localIndex).digest('hex');
  const remoteIndexSha = crypto.createHash('sha256').update(indexRes.body).digest('hex');
  console.log('LOCAL  INDEX SHA256:', localIndexSha);
  console.log('REMOTE INDEX SHA256:', remoteIndexSha);
  console.log('LOCAL = REMOTE:', localIndexSha === remoteIndexSha ? 'YES' : 'NO');
  
  // Extract JS refs from local
  const localJsRefs = [...localIndex.matchAll(/(?:src|href)="([^"]*\.js)"/g)].map(m => m[1]);
  console.log('\nLOCAL JS REFERENCES:');
  localJsRefs.forEach(ref => console.log('  ' + ref));
}
