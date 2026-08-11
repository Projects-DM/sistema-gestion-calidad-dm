// SPRINT 272 — DIAGNOSTIC TOOL (PART 2) — NON-PRODUCTION — AUDIT ONLY.
// Correlates modules → forms → capabilities JSONB to test the Dynamic
// Resource Contract Binding hypothesis. Read-only.
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ruzomcnxsnhlfqlefsrc.supabase.co',
  'sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti',
);

async function main() {
  console.log('=== SPRINT 272 PART 2 — MODULE→FORM→CAPABILITIES CORRELATION ===\n');

  const { data: modules } = await sb
    .from('sgc_modules')
    .select('id, name, slug, state, visible, capabilities')
    .order('created_at', { ascending: true });

  const { data: forms } = await sb
    .from('sgc_forms')
    .select('id, name, slug, module_id, alert_config');

  for (const m of modules || []) {
    const cap = m.capabilities;
    const capShape = Array.isArray(cap)
      ? cap.map((c) => (typeof c === 'string' ? c : (c?.packageId ?? c?.key ?? JSON.stringify(c))))
      : cap === null || cap === undefined
        ? 'null'
        : typeof cap === 'object'
          ? JSON.stringify({ keys: Object.keys(cap) })
          : String(cap);
    const hasOperational = Array.isArray(cap)
      ? cap.some((c) => String(c?.packageId ?? c).includes('operational-experiences'))
      : false;
    const enabledExp = (Array.isArray(cap) && cap.find((c) => String(c?.packageId ?? c).includes('operational-experiences')))?.enabledExperiences ?? null;
    const modForms = (forms || []).filter((f) => String(f.module_id) === String(m.id));
    console.log(`\nMODULE ${m.slug} (${m.id}) state=${m.state} visible=${m.visible}`);
    console.log(`  capabilities: ${capShape}`);
    console.log(`  hasOperationalExperiences=${hasOperational}  enabledExperiences=${Array.isArray(enabledExp) ? JSON.stringify(enabledExp) : String(enabledExp)}`);
    console.log(`  forms assigned: ${modForms.length}`);
    for (const f of modForms) {
      console.log(`    • ${f.name} (${f.slug}) id=${f.id} alert_config=${f.alert_config ? '{' + Object.keys(f.alert_config).join('|') + '}' : 'null'}`);
    }
    if (modForms.length === 0) {
      console.log('    • (module without forms — the "Nuevo módulo" contract produced NO sgc_forms row)');
    }
  }

  // Orphan forms (module_id not matching any module)
  const moduleIds = new Set((modules || []).map((m) => String(m.id)));
  const orphans = (forms || []).filter((f) => !moduleIds.has(String(f.module_id)));
  if (orphans.length) {
    console.log('\n--- ORPHAN FORMS (module_id not in sgc_modules) ---');
    for (const f of orphans) {
      console.log(`  ${f.slug} module_id=${f.module_id} alert_config=${f.alert_config ? 'yes' : 'null'}`);
    }
  }

  console.log('\n=== END PART 2 ===');
}

main().catch((err) => console.error('FATAL', err));