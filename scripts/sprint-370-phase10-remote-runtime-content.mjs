// Sprint 370 — Phase 10: Fetch ACTUAL remote entry JS to inspect getSupabaseClient compiled output
import https from 'node:https';

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

const base = 'https://projects-dm.github.io/sistema-gestion-calidad-dm';

console.log('============================================================');
console.log('SPRINT 370 — PHASE 10: REMOTE RUNTIME CONTENT ANALYSIS');
console.log('============================================================\n');

// Fetch the ACTUAL remote entry JS
const entryUrl = base + '/assets/index-OjBnhkNp.js';
const entryRes = await httpsGet(entryUrl);
console.log('REMOTE ENTRY JS (index-OjBnhkNp.js):');
console.log('  HTTP STATUS:', entryRes.status);
console.log('  SIZE:', entryRes.body.length, 'bytes');
console.log('  IS HTML (404 page):', entryRes.body.includes('<!DOCTYPE') || entryRes.body.includes('<html'));
console.log('  CONTAINS supabase.co:', entryRes.body.includes('supabase.co'));
console.log('  CONTAINS getSupabaseClient:', entryRes.body.includes('getSupabaseClient'));
console.log('  CONTAINS signInWithPassword:', entryRes.body.includes('signInWithPassword'));

// Fetch the ACTUAL remote supabase chunk
const supabaseUrl = base + '/assets/supabase-RBls0YNa.js';
const supabaseRes = await httpsGet(supabaseUrl);
console.log('\nREMOTE SUPABASE CHUNK (supabase-RBls0YNa.js):');
console.log('  HTTP STATUS:', supabaseRes.status);
console.log('  SIZE:', supabaseRes.body.length, 'bytes');
console.log('  IS HTML (404 page):', supabaseRes.body.includes('<!DOCTYPE') || supabaseRes.body.includes('<html'));
console.log('  CONTAINS supabase.co:', supabaseRes.body.includes('supabase.co'));

// Try the OLD supabase chunk name too - maybe it's cached from an older deploy
const oldSupabaseUrl = base + '/assets/supabase-BSsRzCe5.js';
const oldSupabaseRes = await httpsGet(oldSupabaseUrl);
console.log('\nLOCAL-BUILD SUPABASE CHUNK (supabase-BSsRzCe5.js):');
console.log('  HTTP STATUS:', oldSupabaseRes.status);
console.log('  SIZE:', oldSupabaseRes.body.length, 'bytes');

// List what files actually exist on the remote by checking common patterns
console.log('\n------------------------------------------------------------');
console.log('REMOTE ASSET EXISTENCE CHECK');
console.log('------------------------------------------------------------');

const filesToCheck = [
  '/index.html',
  '/assets/index-OjBnhkNp.js',
  '/assets/index-AU2GEjaQ.js',
  '/assets/supabase-RBls0YNa.js',
  '/assets/supabase-BSsRzCe5.js',
  '/assets/index-DmN2BT2u.css',
];

for (const file of filesToCheck) {
  const res = await httpsGet(base + file);
  const isReal = res.status === 200 && !res.body.includes('<!DOCTYPE html>');
  console.log(`  ${file}: HTTP ${res.status} ${isReal ? '(REAL JS/CSS)' : res.status === 200 ? '(HTML/404-page)' : '(NOT FOUND)'}`);
}

// If the remote entry JS is real JavaScript, search for the compiled factory
if (entryRes.status === 200 && !entryRes.body.includes('<!DOCTYPE')) {
  // Look for the compiled Supabase factory in the entry bundle  
  const factoryRegion = entryRes.body.match(/getSupabaseClient[^;]{0,500}/);
  if (factoryRegion) {
    console.log('\n------------------------------------------------------------');
    console.log('COMPILED getSupabaseClient REGION (from entry JS)');
    console.log('------------------------------------------------------------');
    const safe = factoryRegion[0]
      .replace(/eyJ[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
      .replace(/sb_publishable_[A-Za-z0-9_-]+/g, '[REDACTED]');
    console.log(safe.substring(0, 300));
  }
  
  // Check for void 0 or empty string patterns (missing env vars)
  const hasVoid0 = entryRes.body.includes('void 0') || entryRes.body.includes('void(0)');
  console.log('\nCONTAINS void 0:', hasVoid0);
}
