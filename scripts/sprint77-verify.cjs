const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://ruzomcnxsnhlfqlefsrc.supabase.co', 'sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti');

async function verify() {
  const { data: runtimeMods } = await sb.from('sgc_modules')
    .select('*')
    .eq('is_active', true)
    .eq('visible', true)
    .order('order_index', { ascending: true });
  
  console.log('=== RUNTIME MODULES (Sidebar) ===');
  for (const m of runtimeMods) {
    console.log('  [' + m.state + '] ' + m.name + ' (' + m.slug + ') — icon: ' + m.icon);
  }

  const ops = runtimeMods.find(m => m.slug === 'operaciones');
  console.log('');
  console.log('=== OPERACIONES ===');
  console.log('  ID: ' + ops.id);
  console.log('  Name: ' + ops.name);
  console.log('  Slug: ' + ops.slug);
  console.log('  State: ' + ops.state);
  console.log('  Icon: ' + ops.icon);
  console.log('  Color: ' + ops.color);
  console.log('  Visible: ' + ops.visible);
  console.log('  Capabilities: ' + (ops.capabilities ? ops.capabilities.length : 0));

  const { data: forms } = await sb.from('sgc_forms').select('*').eq('module_id', ops.id);
  console.log('');
  console.log('=== FORMS ===');
  for (const f of forms) {
    console.log('  ' + f.name + ' (' + f.slug + ') — engine: ' + f.engine_type);
  }

  if (forms.length > 0) {
    const { data: fields } = await sb.from('sgc_form_fields').select('*').eq('form_id', forms[0].id).order('order_index');
    console.log('');
    console.log('=== FIELDS ===');
    for (const f of fields) {
      console.log('  [' + f.order_index + '] ' + f.label + ' (' + f.field_type + ')');
    }
  }
}
verify();
