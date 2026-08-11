// SPRINT 273 — FORENSIC DIAGNOSTIC (PART 3) — NON-PRODUCTION — AUDIT ONLY.
// Resource-identity + handler-resolution audit against the REAL database.
// Uses the OFFICIAL adapter's resolveResourceHandler to prove which backend
// owns the reference the Panel receives, and verifies the DB row(id) matches
// the reference delivered to the Port. Read-only (no writes).
import { createClient } from '@supabase/supabase-js';
import { resolveResourceHandler } from '../src/modules/experiences/AlertConfigurationPersistenceAdapter.js';

const sb = createClient(
  'https://ruzomcnxsnhlfqlefsrc.supabase.co',
  'sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti',
);

async function main() {
  console.log('=== SPRINT 273 PART 3 — RESOURCE IDENTITY + HANDLER RESOLUTION (REAL DB) ===\n');

  // Reproduce exactly what Configuration.jsx delivers to the Panel:
  // dynamicService.getFormsByModule(m.id) returns rows with id + module_id.
  const { data: forms } = await sb
    .from('sgc_forms')
    .select('id, name, slug, module_id, alert_config')
    .order('created_at', { ascending: true });

  for (const f of forms || []) {
    // The resource object the UI hands saveCollection (same shape: full row).
    const resource = { ...f };
    const handler = resolveResourceHandler(resource);
    console.log(`FORM ${f.slug}`);
    console.log('  resource.id   :', resource.id);
    console.log('  resource.module_id:', resource.module_id);
    console.log('  handler resuelto por el Adapter:', handler ? `key=${handler.key}` : 'null');
    console.log('  handler.write referencia id =', handler ? handler.key + ' :: update(id, alert_config)' : '-');
    console.log('  DB row id existe:', !!f.id);
    console.log('');
  }

  // Reproduce the REPOSITORY reference shape that DocumentRepositoriesAdmin
  // hands the Panel (mapRepositoryRow → id + module_slug, NO module_id).
  const { data: repos } = await sb
    .from('sgc_document_repositories')
    .select('id, slug, name, module_slug, alert_config');
  if (!repos || repos.length === 0) {
    console.log('REPOSITORIOS: 0 — fixture no disponible (ver AC / SKIP repo test).');
  } else {
    for (const r of repos || []) {
      const resource = { ...r, module_id: undefined };
      const handler = resolveResourceHandler(resource);
      console.log(`REPO ${r.slug} → handler=${handler ? handler.key : 'null'}, id=${r.id}, module_slug=${r.module_slug}`);
    }
  }

  console.log('\n=== END PART 3 ===');
}

main().catch((err) => { console.error('FATAL', err); process.exitCode = 1; });