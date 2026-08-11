// SPRINT 272 — DIAGNOSTIC TOOL — NON-PRODUCTION — AUDIT ONLY.
// Inspects the real database state for the forensic audit. Does NOT write.
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ruzomcnxsnhlfqlefsrc.supabase.co',
  'sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti',
);

async function main() {
  console.log('=== SPRINT 272 FORENSIC DIAGNOSTIC (READ-ONLY) ===\n');

  const { data: modules, error: mErr } = await sb
    .from('sgc_modules')
    .select('id, name, slug, state, visible, is_active')
    .order('created_at', { ascending: true });
  if (mErr) console.error('modules error:', mErr.message);
  console.log(`\n--- MODULES (${modules?.length ?? 0}) ---`);
  for (const m of modules || []) {
    console.log(`  ${m.slug}  state=${m.state}  visible=${m.visible}  active=${m.is_active}`);
  }

  const { data: forms, error: fErr } = await sb
    .from('sgc_forms')
    .select('id, name, slug, module_id, is_active, alert_config')
    .order('created_at', { ascending: true });
  if (fErr) console.error('forms error:', fErr.message);
  console.log(`\n--- FORMS (${forms?.length ?? 0}) ---`);
  let formsWithConfig = 0;
  for (const f of forms || []) {
    const has = !!(f.alert_config && (f.alert_config?.alertConfigurations?.length || f.alert_config?.enabled !== undefined));
    if (has) formsWithConfig += 1;
    const cfgShape = f.alert_config
      ? Object.keys(f.alert_config)
      : null;
    console.log(
      `  [${has ? 'CONFIG' : 'noconfig'}] ${f.name} (${f.slug}) module_id=${String(f.module_id)} active=${f.is_active} alert_config=${cfgShape ? '{' + cfgShape.join('|') + '}' : 'null'}`,
    );
  }
  console.log(`  → forms WITH alert config: ${formsWithConfig}/${forms?.length ?? 0}`);

  const { data: repos, error: rErr } = await sb
    .from('sgc_document_repositories')
    .select('id, name, slug, module_slug, is_active, alert_config')
    .order('created_at', { ascending: true });
  if (rErr) console.error('repos error:', rErr.message);
  console.log(`\n--- REPOSITORIES (${repos?.length ?? 0}) ---`);
  let reposWithConfig = 0;
  for (const r of repos || []) {
    const has = !!(r.alert_config && (r.alert_config?.alertConfigurations?.length || r.alert_config?.enabled !== undefined));
    if (has) reposWithConfig += 1;
    console.log(
      `  [${has ? 'CONFIG' : 'noconfig'}] ${r.name} (${r.slug}) module_slug=${String(r.module_slug)} active=${r.is_active} alert_config=${r.alert_config ? 'yes' : 'null'}`,
    );
  }
  console.log(`  → repos WITH alert config: ${reposWithConfig}/${repos?.length ?? 0}`);

  console.log('\n=== END DIAGNOSTIC ===');
}

main().catch((err) => console.error('FATAL', err));