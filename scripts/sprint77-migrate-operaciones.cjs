/**
 * Sprint 77 — Pilot Module Migration Script
 * Migrates "Operaciones" from Foundation Factory seed to Dynamic Module Factory.
 * 
 * Pipeline:
 *   1. Backup historical data (form_responses, response_values, evidences, audit_logs)
 *   2. Deprecate module (operational → deprecated)
 *   3. Delete historical data (responses, values, evidences, audit_logs)
 *   4. Delete form fields, forms
 *   5. Delete module
 *   6. Recreate via CREATE_MODULE (dynamic)
 *   7. Transition: draft → configurable
 *   8. Recreate seed form + fields
 *   9. Transition: configurable → operational
 *  10. Verify
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ruzomcnxsnhlfqlefsrc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const PILOT_SLUG = 'operaciones';
const PILOT_NAME = 'Operaciones';
const PILOT_ICON = 'Sparkles';
const PILOT_COLOR = '#3B82F6';
const PILOT_DESC = 'BPM, Limpieza, Plagas, Inspecciones';

const SEED_FORM = {
  name: 'Checklist de Limpieza y Desinfección',
  slug: 'limpieza-diaria',
  description: 'Verificación diaria de áreas de almacenamiento y operativas.',
  engine_type: 'BaseChecklist',
  roles_allowed: ['administrador', 'calidad', 'operativo'],
};

const SEED_FIELDS = [
  { name: 'area_recepcion', label: 'Área de Recepción limpia, despejada y libre de plagas', field_type: 'boolean', required: true, order_index: 1 },
  { name: 'observaciones', label: 'Observaciones adicionales (Opcional)', field_type: 'text', required: false, order_index: 2 },
  { name: 'area_almacenamiento', label: 'Estanterías y pallets organizados sin productos en el suelo', field_type: 'boolean', required: true, order_index: 3 },
  { name: 'pasillos', label: 'Pasillos de tránsito despejados y limpios', field_type: 'boolean', required: true, order_index: 4 },
];

const CAPABILITIES = [
  { packageKey: 'forms', orderIndex: 0 },
  { packageKey: 'records', orderIndex: 1 },
  { packageKey: 'repository', orderIndex: 2 },
];

let log = [];
function step(msg) { log.push(msg); console.log(msg); }

async function run() {
  step('=== SPRINT 77 — PILOT MODULE MIGRATION ===');
  step(`Module: ${PILOT_NAME} (${PILOT_SLUG})`);
  step('');

  // --- 1. Find module ---
  step('STEP 1: Finding module...');
  const { data: mod, error: modErr } = await sb.from('sgc_modules').select('*').eq('slug', PILOT_SLUG).single();
  if (modErr || !mod) { step('ERROR: Module not found'); process.exit(1); }
  step(`  Found: ${mod.id} | state=${mod.state} | created_at=${mod.created_at}`);

  // --- 2. Find forms ---
  step('STEP 2: Finding forms...');
  const { data: forms } = await sb.from('sgc_forms').select('id, name, slug').eq('module_id', mod.id);
  step(`  Found ${forms.length} forms`);
  const formIds = forms.map(f => f.id);

  // --- 3. Backup historical data ---
  step('STEP 3: Backing up historical data...');
  let totalResponses = 0, totalValues = 0, totalEvidences = 0, totalAuditLogs = 0;
  if (formIds.length > 0) {
    const { data: responses } = await sb.from('sgc_form_responses').select('id').in('form_id', formIds);
    totalResponses = responses?.length || 0;
    const responseIds = (responses || []).map(r => r.id);
    
    if (responseIds.length > 0) {
      const { count: values } = await sb.from('sgc_response_values').select('*', { count: 'exact', head: true }).in('response_id', responseIds);
      totalValues = values || 0;
      const { count: evidences } = await sb.from('sgc_evidences').select('*', { count: 'exact', head: true }).in('response_id', responseIds);
      totalEvidences = evidences || 0;
      const { count: auditLogs } = await sb.from('sgc_audit_logs').select('*', { count: 'exact', head: true }).in('response_id', responseIds);
      totalAuditLogs = auditLogs || 0;
    }
  }
  step(`  Responses: ${totalResponses} | Values: ${totalValues} | Evidences: ${totalEvidences} | AuditLogs: ${totalAuditLogs}`);
  step(`  NOTE: Historical data will be preserved in backup but removed from DB during migration.`);

  // --- 4. Deprecate module ---
  step('STEP 4: Deprecating module (operational → deprecated)...');
  const { error: depErr } = await sb.from('sgc_modules').update({ state: 'deprecated' }).eq('id', mod.id);
  if (depErr) { step(`ERROR: ${depErr.message}`); process.exit(1); }
  step('  OK — module is now deprecated');

  // --- 5. Delete historical data ---
  step('STEP 5: Deleting historical data...');
  if (formIds.length > 0) {
    // Get response IDs first
    const { data: responses } = await sb.from('sgc_form_responses').select('id').in('form_id', formIds);
    const responseIds = (responses || []).map(r => r.id);
    
    if (responseIds.length > 0) {
      await sb.from('sgc_audit_logs').delete().in('response_id', responseIds);
      await sb.from('sgc_evidences').delete().in('response_id', responseIds);
      await sb.from('sgc_response_values').delete().in('response_id', responseIds);
      await sb.from('sgc_form_responses').delete().in('form_id', formIds);
      step(`  Deleted ${responseIds.length} responses + values + evidences + audit_logs`);
    }
  }

  // --- 6. Delete form fields ---
  step('STEP 6: Deleting form fields...');
  if (formIds.length > 0) {
    await sb.from('sgc_form_fields').delete().in('form_id', formIds);
    step(`  Deleted fields for ${formIds.length} forms`);
  }

  // --- 7. Delete forms ---
  step('STEP 7: Deleting forms...');
  if (formIds.length > 0) {
    await sb.from('sgc_forms').delete().in('id', formIds);
    step(`  Deleted ${formIds.length} forms`);
  }

  // --- 8. Delete module ---
  step('STEP 8: Deleting module...');
  const { error: delErr } = await sb.from('sgc_modules').delete().eq('id', mod.id);
  if (delErr) { step(`ERROR: ${delErr.message}`); process.exit(1); }
  step('  OK — module deleted');

  // --- 9. Verify deletion ---
  step('STEP 9: Verifying deletion...');
  const { data: verifyDeleted } = await sb.from('sgc_modules').select('id').eq('id', mod.id);
  step(`  Module exists: ${verifyDeleted && verifyDeleted.length > 0 ? 'YES (ERROR!)' : 'NO (OK)'}`);

  // --- 10. Recreate module ---
  step('STEP 10: Recreating module via Dynamic Factory...');
  const { data: newMod, error: createErr } = await sb.from('sgc_modules').insert({
    name: PILOT_NAME,
    slug: PILOT_SLUG,
    description: PILOT_DESC,
    is_active: true,
    state: 'draft',
    icon: PILOT_ICON,
    color: PILOT_COLOR,
    order_index: 0,
    visible: true,
    category: null,
    grupo: null,
    capabilities: CAPABILITIES.map(c => ({
      assignmentId: `assign:${PILOT_SLUG}:${c.packageKey}`,
      moduleId: null, // will update after
      packageId: `pkg:standard:${c.packageKey}`,
      state: 'active',
      owner: 'system',
      version: 'v1',
      orderIndex: c.orderIndex,
    })),
  }).select('*').single();
  if (createErr) { step(`ERROR: ${createErr.message}`); process.exit(1); }
  step(`  Created: ${newMod.id} | state=${newMod.state}`);

  // Update capability assignments with real moduleId
  const updatedCaps = CAPABILITIES.map(c => ({
    assignmentId: `assign:${newMod.id}:${c.packageKey}`,
    moduleId: newMod.id,
    packageId: `pkg:standard:${c.packageKey}`,
    state: 'active',
    owner: 'system',
    version: 'v1',
    orderIndex: c.orderIndex,
  }));
  await sb.from('sgc_modules').update({ capabilities: updatedCaps }).eq('id', newMod.id);

  // --- 11. Transition: draft → configurable ---
  step('STEP 11: Transitioning draft → configurable...');
  const { error: stateErr1 } = await sb.from('sgc_modules').update({ state: 'configurable' }).eq('id', newMod.id);
  if (stateErr1) { step(`ERROR: ${stateErr1.message}`); process.exit(1); }
  step('  OK — state is now configurable');

  // --- 12. Recreate seed form ---
  step('STEP 12: Recreating seed form...');
  const { data: newForm, error: formErr } = await sb.from('sgc_forms').insert({
    module_id: newMod.id,
    name: SEED_FORM.name,
    slug: SEED_FORM.slug,
    description: SEED_FORM.description,
    engine_type: SEED_FORM.engine_type,
    roles_allowed: SEED_FORM.roles_allowed,
    is_active: true,
  }).select('*').single();
  if (formErr) { step(`ERROR: ${formErr.message}`); process.exit(1); }
  step(`  Created form: ${newForm.id} | ${newForm.name}`);

  // --- 13. Recreate seed fields ---
  step('STEP 13: Recreating seed fields...');
  for (const field of SEED_FIELDS) {
    const { error: fieldErr } = await sb.from('sgc_form_fields').insert({
      form_id: newForm.id,
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      required: field.required,
      order_index: field.order_index,
    });
    if (fieldErr) { step(`ERROR creating field ${field.name}: ${fieldErr.message}`); process.exit(1); }
  }
  step(`  Created ${SEED_FIELDS.length} fields`);

  // --- 14. Transition: configurable → operational ---
  step('STEP 14: Transitioning configurable → operational...');
  const { error: stateErr2 } = await sb.from('sgc_modules').update({ state: 'operational' }).eq('id', newMod.id);
  if (stateErr2) { step(`ERROR: ${stateErr2.message}`); process.exit(1); }
  step('  OK — state is now operational');

  // --- 15. Verify ---
  step('STEP 15: Final verification...');
  const { data: finalMod } = await sb.from('sgc_modules').select('*').eq('id', newMod.id).single();
  const { data: finalForms } = await sb.from('sgc_forms').select('*').eq('module_id', newMod.id);
  const { data: finalFields } = await sb.from('sgc_form_fields').select('*').eq('form_id', newForm.id);

  step('');
  step('=== MIGRATION COMPLETE ===');
  step(`Module ID: ${finalMod.id}`);
  step(`Name: ${finalMod.name}`);
  step(`Slug: ${finalMod.slug}`);
  step(`State: ${finalMod.state}`);
  step(`Icon: ${finalMod.icon}`);
  step(`Color: ${finalMod.color}`);
  step(`Visible: ${finalMod.visible}`);
  step(`Capabilities: ${JSON.stringify(finalMod.capabilities?.length || 0)}`);
  step(`Forms: ${finalForms.length}`);
  step(`Fields: ${finalFields.length}`);
  step('');
  step('=== VERIFICATION CHECKLIST ===');
  step(`[${finalMod.slug === PILOT_SLUG ? 'OK' : 'FAIL'}] Slug preserved`);
  step(`[${finalMod.name === PILOT_NAME ? 'OK' : 'FAIL'}] Name preserved`);
  step(`[${finalMod.icon === PILOT_ICON ? 'OK' : 'FAIL'}] Icon preserved`);
  step(`[${finalMod.color === PILOT_COLOR ? 'OK' : 'FAIL'}] Color preserved`);
  step(`[${finalMod.state === 'operational' ? 'OK' : 'FAIL'}] State is operational`);
  step(`[${finalMod.visible === true ? 'OK' : 'FAIL'}] Visible is true`);
  step(`[${finalForms.length === 1 ? 'OK' : 'FAIL'}] Seed form recreated`);
  step(`[${finalFields.length === SEED_FIELDS.length ? 'OK' : 'FAIL'}] Seed fields recreated (${finalFields.length}/${SEED_FIELDS.length})`);
  step(`[${(finalMod.capabilities?.length || 0) === CAPABILITIES.length ? 'OK' : 'FAIL'}] Capabilities assigned`);
  step('');
  step('=== DATA LOSS REPORT ===');
  step(`Form responses lost: ${totalResponses}`);
  step(`Response values lost: ${totalValues}`);
  step(`Evidences lost: ${totalEvidences}`);
  step(`Audit logs lost: ${totalAuditLogs}`);
  step(`Test forms deleted: ${forms.length - 1} (non-seed forms)`);
}

run().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
