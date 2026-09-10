const fs = require('fs');

const paths = [
  ['src/runtime/schema/parser/RuntimeSchemaParser.ts', 'RuntimeSchemaParser'],
  ['src/runtime/schema/normalization/SchemaNormalizer.ts', 'SchemaNormalizer'],
  ['src/runtime/context/RuntimeContext.tsx', 'RuntimeContext'],
  ['src/runtime/schema/factories/RuntimeFormFactory.ts', 'RuntimeFormFactory'],
  ['src/runtime/layout/engine/LayoutEngine.tsx', 'LayoutEngine'],
  ['src/runtime/rendering/DynamicFieldRenderer.tsx', 'DynamicFieldRenderer'],
  ['src/runtime/rendering/registry/ComponentRegistry.ts', 'ComponentRegistry'],
  ['src/runtime/form/engine/FormRendererEngine.tsx', 'FormRendererEngine']
];

paths.forEach(([p, name]) => {
  if (require('fs').existsSync(p)) {
    const c = require('fs').readFileSync(p, 'utf8');
    console.log('=== ' + name + ' ===');
    const imports = c.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
    console.log('Imports:', imports.slice(0,5).join(', ') + (imports.length > 5 ? '...' : ''));
    
    if (c.includes('Date.now()')) console.log(name + ': Date.now()');
    else if (c.includes('new Date()')) console.log(name + ': new Date()');
    else if (c.includes('Math.random()')) console.log(name + ': Math.random()');
    else if (c.includes('crypto.randomUUID')) console.log(name + ': crypto.randomUUID');
    else if (c.includes('window.')) console.log(name + ': window');
    else if (c.includes('document.')) console.log(name + ': document');
    else if (c.includes('localStorage')) console.log(name + ': localStorage');
    else if (c.includes('sessionStorage')) console.log(name + ': sessionStorage');
    else if (c.includes('navigator.')) console.log(name + ': navigator');
    else if (c.includes('Supabase.')) console.log(name + ': Supabase');
    else if (c.includes('supabase.')) console.log(name + ': supabase');
    else if (c.includes('network') && !c.includes('network.status')) console.log(name + ': network');
    if (c.includes('fetch(')) console.log(name + ': fetch');
    if (c.includes('supabase.')) console.log(name + ': supabase');
    if (c.includes('supabase.from')) console.log(name + ': supabase query');
    if (c.includes('supabase.auth')) console.log(name + ': supabase auth');
    if (c.includes('supabase.storage')) console.log(name + ': supabase storage');
    if (c.includes('global.')) console.log(name + ': global');
    else if (c.includes('window.')) console.log(name + ': window');
    else if (c.includes('document.')) console.log(name + ': document');
    if (c.includes('Math.random')) console.log(name + ': Math.random');
    if (c.includes('Date.now')) console.log(name + ': Date.now');
    if (c.includes('new Date()')) console.log(name + ': new Date()');
    if (c.includes('crypto.randomUUID')) console.log(name + ': crypto.randomUUID');
    else console.log(name + ': DETERMINISTIC');
  }
});