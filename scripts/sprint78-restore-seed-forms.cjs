const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://ruzomcnxsnhlfqlefsrc.supabase.co', 'sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti');

const MODULES = [
  {
    slug: 'operaciones',
    seedForm: {
      name: 'Checklist de Limpieza y Desinfección',
      slug: 'limpieza-diaria',
      engine: 'BaseChecklist',
      roles_allowed: ['administrador', 'calidad', 'operativo'],
      fields: [
        { label: 'Área de Recepción limpia, despejada y libre de plagas', field_type: 'boolean', required: true, order_index: 0 },
        { label: 'Observaciones adicionales', field_type: 'text', required: false, order_index: 1 },
        { label: 'Estanterías y pallets organizados sin productos en el suelo', field_type: 'boolean', required: true, order_index: 2 },
        { label: 'Pasillos de tránsito despejados y limpios', field_type: 'boolean', required: true, order_index: 3 }
      ]
    }
  },
  {
    slug: 'calidad',
    seedForm: {
      name: 'Inspección de Calidad',
      slug: 'inspeccion-calidad',
      engine: 'BaseChecklist',
      roles_allowed: ['administrador', 'calidad'],
      fields: [
        { label: 'Producto inspeccionado', field_type: 'text', required: true, order_index: 0 },
        { label: 'Cumple con especificaciones', field_type: 'boolean', required: true, order_index: 1 },
        { label: 'Observaciones', field_type: 'text', required: false, order_index: 2 },
        { label: 'Firma del inspector', field_type: 'signature', required: true, order_index: 3 }
      ]
    }
  },
  {
    slug: 'medicion-control',
    seedForm: {
      name: 'Control de Cloro y pH del Agua',
      slug: 'cloro-ph-agua',
      engine: 'BaseMediciones',
      roles_allowed: ['administrador', 'operativo', 'calidad'],
      fields: [
        { label: 'Nivel de pH', field_type: 'number', required: true, order_index: 0, options: { min: 0, max: 14 } },
        { label: 'Cloro Residual Libre (mg/L)', field_type: 'number', required: true, order_index: 1, options: { min: 0, max: 10 } },
        { label: 'Temperatura del agua (°C)', field_type: 'number', required: false, order_index: 2, options: { min: 0, max: 60 } },
        { label: 'Acciones correctivas', field_type: 'text', required: false, order_index: 3 },
        { label: 'Firma del Supervisor', field_type: 'signature', required: true, order_index: 4 }
      ]
    }
  },
  {
    slug: 'mantenimiento',
    seedForm: {
      name: 'Bitácora de Mantenimiento',
      slug: 'bitacora-mantenimiento',
      engine: 'BaseChecklist',
      roles_allowed: ['administrador', 'operativo'],
      fields: [
        { label: 'Equipo / Área', field_type: 'text', required: true, order_index: 0 },
        { label: 'Tipo de mantenimiento', field_type: 'select', required: true, order_index: 1, options: { items: ['Preventivo', 'Correctivo', 'Predictivo'] } },
        { label: 'Trabajo realizado', field_type: 'text', required: true, order_index: 2 },
        { label: 'Estado del equipo', field_type: 'boolean', required: true, order_index: 3 },
        { label: 'Observaciones', field_type: 'text', required: false, order_index: 4 },
        { label: 'Firma del técnico', field_type: 'signature', required: true, order_index: 5 }
      ]
    }
  }
];

async function main() {
  console.log('=== CREATING SEED FORMS FOR 5 MIGRATED MODULES ===');

  for (const def of MODULES) {
    console.log('');
    console.log('--- ' + def.slug.toUpperCase() + ' ---');

    const { data: mod } = await sb.from('sgc_modules').select('id, name, state').eq('slug', def.slug).single();
    if (!mod) { console.log('  MODULE NOT FOUND'); continue; }
    console.log('  Module: ' + mod.id + ' state=' + mod.state);

    if (mod.state !== 'operational') {
      console.log('  SKIP — not operational');
      continue;
    }

    // Check if forms already exist
    const { data: existingForms } = await sb.from('sgc_forms').select('id, name').eq('module_id', mod.id);
    if (existingForms && existingForms.length > 0) {
      console.log('  SKIP — forms already exist: ' + existingForms.map(f => f.name).join(', '));
      continue;
    }

    // Create form
    const { data: form, error: formErr } = await sb.from('sgc_forms').insert({
      name: def.seedForm.name,
      slug: def.seedForm.slug,
      module_id: mod.id,
      engine_type: def.seedForm.engine,
      roles_allowed: def.seedForm.roles_allowed
    }).select().single();

    if (formErr) { console.log('  ERROR form: ' + formErr.message); continue; }
    console.log('  Form created: ' + form.name + ' (' + form.id + ')');

    // Create fields
    for (const fd of def.seedForm.fields) {
      const { error } = await sb.from('sgc_form_fields').insert({
        form_id: form.id,
        name: fd.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        label: fd.label,
        field_type: fd.field_type,
        required: fd.required,
        order_index: fd.order_index,
        options: fd.options || {}
      });
      if (error) console.log('  ERROR field ' + fd.label + ': ' + error.message);
    }
    console.log('  ' + def.seedForm.fields.length + ' fields created');
  }

  // Verification
  console.log('');
  console.log('=== VERIFICATION ===');
  const SLUGS = ['operaciones', 'calidad', 'medicion-control', 'mantenimiento', 'gestion-documental'];
  for (const slug of SLUGS) {
    const { data: mod } = await sb.from('sgc_modules').select('id, name, state').eq('slug', slug).single();
    if (!mod) { console.log(slug + ': NOT FOUND'); continue; }
    const { data: forms } = await sb.from('sgc_forms').select('id, name, slug').eq('module_id', mod.id);
    let fieldCount = 0;
    for (const f of (forms || [])) {
      const { count } = await sb.from('sgc_form_fields').select('*', { count: 'exact', head: true }).eq('form_id', f.id);
      fieldCount += count || 0;
    }
    console.log('  [' + mod.state + '] ' + mod.name + ' — forms=' + (forms || []).length + ' fields=' + fieldCount);
    for (const f of (forms || [])) {
      console.log('    → ' + f.name + ' (' + f.slug + ')');
    }
  }
}

main();
