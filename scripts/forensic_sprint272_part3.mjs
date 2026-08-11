// SPRINT 272 — DIAGNOSTIC TOOL (PART 3) — NON-PRODUCTION — AUDIT ONLY.
// Read-path certification on real rows: resolves collections + enrollments
// exactly as the Runtime / Panel consume them. Never writes.
import { createClient } from '@supabase/supabase-js';
import {
  extractResourceAlertCollection,
  resolveResourceAlertCollection,
  resolveResourceAlertEnvelope,
} from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';
import { evaluateAlertEnrollments } from '../src/core/capabilities/alert/operational-configuration/ExplicitEnrollmentValidator.js';

const sb = createClient(
  'https://ruzomcnxsnhlfqlefsrc.supabase.co',
  'sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti',
);

async function inspect(label, row) {
  console.log(`\n--- ${label} ---`);
  console.log('id:', row.id, '| slug:', row.slug);
  console.log('alert_config raw:', JSON.stringify(row.alert_config));
  const rawCol = extractResourceAlertCollection(row);
  console.log('extractResourceAlertCollection →', Array.isArray(rawCol) ? `array(${rawCol.length})` : String(rawCol));
  const res = resolveResourceAlertCollection(row);
  console.log('resolveResourceAlertCollection.source:', res.source, '| collection:', res.collection.length);
  const env = resolveResourceAlertEnvelope(row);
  console.log('resolveResourceAlertEnvelope.source:', env.source, '| items:', env.items.length);
  const enf = evaluateAlertEnrollments(row);
  console.log('enrollments.enrolled:', enf.enrolled, '| reasons:', JSON.stringify(enf.reasons));
}

async function main() {
  console.log('=== SPRINT 272 PART 3 — READ-PATH CERTIFICATION ===\n');

  const { data: modules } = await sb
    .from('sgc_modules')
    .select('id, name, slug, state, capabilities');
  const { data: forms } = await sb
    .from('sgc_forms')
    .select('id, name, slug, module_id, alert_config');

  const { data: columns, error: colErr } = await sb
    .from('information_schema.columns')
    .select('column_name, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', 'sgc_forms')
    .eq('column_name', 'alert_config');

  if (colErr) console.log('info_schema columns error (no permiso):', colErr.message);
  else if (columns && columns.length) console.log('COLUMN alert_config DEFAULT:', JSON.stringify(columns[0].column_default));

  for (const f of forms || []) await inspect(`FORM ${f.slug}`, f);

  const { data: repos } = await sb
    .from('sgc_document_repositories')
    .select('id, name, slug, module_slug, alert_config');
  for (const r of repos || []) await inspect(`REPO ${r.slug}`, r);

  console.log('\n=== END PART 3 ===');
}

main().catch((err) => console.error('FATAL', err));