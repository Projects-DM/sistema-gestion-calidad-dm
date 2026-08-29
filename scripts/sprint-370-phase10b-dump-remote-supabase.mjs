// Sprint 370 — Phase 10b: Dump the actual remote supabase chunk content (224 bytes)
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

const url = 'https://projects-dm.github.io/sistema-gestion-calidad-dm/assets/supabase-RBls0YNa.js';
const res = await httpsGet(url);

console.log('HTTP STATUS:', res.status);
console.log('CONTENT-LENGTH:', res.body.length, 'bytes');
console.log('');
console.log('=== COMPLETE FILE CONTENT (safety-redacted) ===');
// Redact any potential keys
const safe = res.body
  .replace(/eyJ[A-Za-z0-9_-]{20,}/g, '[REDACTED_JWT]')
  .replace(/sb_publishable_[A-Za-z0-9_-]+/g, '[REDACTED_KEY]');
console.log(safe);
console.log('=== END ===');

// Also check: does this file contain the null-returning factory?
console.log('\nCONTAINS "return null":', res.body.includes('return null'));
console.log('CONTAINS "void 0":', res.body.includes('void 0'));
console.log('CONTAINS "return!1":', res.body.includes('return!1'));
console.log('CONTAINS "return!0":', res.body.includes('return!0'));
console.log('CONTAINS "createClient":', res.body.includes('createClient'));
console.log('CONTAINS "cached":', res.body.includes('cached'));
