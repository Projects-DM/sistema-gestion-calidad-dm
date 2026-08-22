/**
 * SPRINT 344 — DOCUMENT STORAGE ROLE & PATH RLS FORENSIC AUDIT
 * LEVEL 5 · AUDIT ONLY · Production Source Changes: 0
 *
 * Objetivo: diagnosticar por qué el administrador recibe
 * "new row violates row-level security policy" al subir PDF a
 * documentos-sgc/programs/... sin alterar ninguna política.
 *
 * Evidencia requerida desde Supabase (ejecutar en SQL Editor):
 *  - Inventario completo de pg_policies sobre storage.objects
 *  - Políticas INSERT específicas
 *  - Configuración del bucket documentos-sgc
 *  - Contrato de profiles (rol → auth.uid())
 *  - Análisis de storage.foldername(name)[1] vs paths programs/firmas/evidencias
 *
 * Clasificación esperada: RLS PATH GAP / RLS ROLE GAP / RLS REGRESSION / RLS POLICY CONFLICT / RLS AUTHORIZATION CORRECT
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const start = Date.now();

// ============================================================================
// QUERIES FORENSES — Copiar y ejecutar en Supabase SQL Editor
// ============================================================================
const FORENSIC_QUERIES = {
  // Q01 — Bucket identificado
  Q01_bucket: `
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'documentos-sgc';
`,

  // Q02 — Inventario completo de políticas en storage.objects
  Q02_all_policies: `
SELECT
    policyname,
    schemaname,
    tablename,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd, policyname;
`,

  // Q03 — Políticas INSERT específicas
  Q03_insert_policies: `
SELECT
    policyname,
    roles,
    cmd,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND cmd = 'INSERT'
ORDER BY policyname;
`,

  // Q04 — Verificar bucket en policies (bucket_id)
  Q04_bucket_in_policies: `
SELECT
    policyname,
    cmd,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND with_check ILIKE '%documentos-sgc%';
`,

  // Q05 — Profiles contract (rol mapping)
  Q05_profiles: `
SELECT id, email, rol, activo
FROM public.profiles
WHERE activo = true
ORDER BY rol;
`,

  // Q06 — Test storage.foldername() behavior for programs/
  Q06_foldername_test: `
SELECT
    storage.foldername(name) as folders,
    storage.foldername(name)[1] as first_folder,
    name
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
  AND name LIKE 'programs/%'
LIMIT 10;
`,

  // Q07 — Test storage.foldername() for firmas/
  Q07_foldername_firmas: `
SELECT
    storage.foldername(name) as folders,
    storage.foldername(name)[1] as first_folder,
    name
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
  AND name LIKE 'firmas/%'
LIMIT 10;
`,

  // Q08 — Test storage.foldername() for evidencias/
  Q08_foldername_evidencias: `
SELECT
    storage.foldername(name) as folders,
    storage.foldername(name)[1] as first_folder,
    name
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
  AND name LIKE 'evidencias/%'
LIMIT 10;
`,

  // Q09 — Current user profile (run as authenticated user)
  Q09_current_profile: `
SELECT id, email, rol, activo
FROM public.profiles
WHERE id = auth.uid();
`,

  // Q10 — Distinct first folders in bucket
  Q10_distinct_folders: `
SELECT DISTINCT storage.foldername(name)[1] as folder
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
ORDER BY folder;
`,

  // Q11 — Permissive vs Restrictive policy count
  Q11_permissive_restrictive: `
SELECT
    cmd,
    permissive,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
GROUP BY cmd, permissive
ORDER BY cmd, permissive;
`,

  // Q12 — Policy overlap analysis (same cmd, different roles)
  Q12_policy_overlap: `
SELECT
    cmd,
    policyname,
    roles,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND cmd IN ('INSERT', 'SELECT', 'UPDATE', 'DELETE')
ORDER BY cmd, policyname;
`,

  // Q13 — Check for 'authenticated' role in policies (dangerous)
  Q13_authenticated_role: `
SELECT
    policyname,
    cmd,
    roles,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (roles @> ARRAY['authenticated'] OR roles = '{}' OR roles IS NULL)
ORDER BY cmd;
`,

  // Q14 — Path-specific conditions in WITH CHECK
  Q14_path_conditions: `
SELECT
    policyname,
    cmd,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND with_check ILIKE '%foldername%'
     OR with_check ILIKE '%name%'
     OR with_check ILIKE '%programs%'
     OR with_check ILIKE '%firmas%'
     OR with_check ILIKE '%evidencias%'
ORDER BY cmd, policyname;
`,
};

// ============================================================================
// ANÁLISIS AUTOMÁTICO DE RESULTADOS (llenar RESULTS después de ejecutar en SQL Editor)
// ============================================================================
const RESULTS_TEMPLATE = {
  Q01_bucket: null,
  Q02_all_policies: null,
  Q03_insert_policies: null,
  Q04_bucket_in_policies: null,
  Q05_profiles: null,
  Q06_foldername_test: null,
  Q07_foldername_firmas: null,
  Q08_foldername_evidencias: null,
  Q09_current_profile: null,
  Q10_distinct_folders: null,
  Q11_permissive_restrictive: null,
  Q12_policy_overlap: null,
  Q13_authenticated_role: null,
  Q14_path_conditions: null,
};

// ============================================================================
// HIPÓTESIS FORENSES A CLASIFICAR
// ============================================================================
const HYPOTHESES = [
  {
    id: 'H01',
    label: 'Política INSERT eliminada o modificada',
    description: 'La política que permitía "Admin upload documents" ya no existe o cambió.',
  },
  {
    id: 'H02',
    label: 'Política existe pero no incluye administrador',
    description: 'La política autoriza profiles.rol = ANY(...) pero falta "administrador".',
  },
  {
    id: 'H03',
    label: 'Política correcta pero restringida por carpeta',
    description: 'La política autoriza firmas/ y evidencias/ pero NO programs/.',
  },
  {
    id: 'H04',
    label: 'Conflicto entre políticas',
    description: 'Existe combinación inesperada de políticas PERMISSIVE/RESTRICTIVE.',
  },
  {
    id: 'H05',
    label: 'Bucket incorrecto',
    description: 'Frontend apunta a documentos-sgc pero la política corresponde a otro bucket.',
  },
  {
    id: 'H06',
    label: 'Sesión/rol inconsistente',
    description: 'Usuario aparentemente administrador no resuelve como profiles.rol = administrador.',
  },
  {
    id: 'H07',
    label: 'Cambio introducido durante corrección anterior',
    description: 'Modificación para permitir uploads del operativo alteró accidentalmente programs/.',
  },
  {
    id: 'H08',
    label: 'Problema fuera de RLS',
    description: 'Si políticas son correctas, revisar storage path, auth session, bucket, request, mime, service.',
  },
];

// ============================================================================
// MATRIZ DE RUTAS REQUERIDA (Rellena tras ejecutar queries)
// ============================================================================
const PATH_MATRIX = {
  'programs/': { administrador: null, calidad: null, operativo: null, source: 'Storage RLS' },
  'firmas/':   { administrador: null, calidad: null, operativo: null, source: 'Storage RLS' },
  'evidencias/': { administrador: null, calidad: null, operativo: null, source: 'Storage RLS' },
  'otras':     { administrador: null, calidad: null, operativo: null, source: 'Storage RLS' },
};

// ============================================================================
// GENERADOR DE REPORTE
// ============================================================================
function generateReport(results) {
  const lines = [];
  lines.push('='.repeat(70));
  lines.push('SPRINT 344 — DOCUMENT STORAGE ROLE & PATH RLS FORENSIC AUDIT');
  lines.push('='.repeat(70));
  lines.push('');
  lines.push('## 1. QUERIES EJECUTADAS Y RESULTADOS');
  lines.push('');

  for (const [key, query] of Object.entries(FORENSIC_QUERIES)) {
    lines.push(`### ${key}`);
    lines.push('```sql');
    lines.push(query.trim());
    lines.push('```');
    lines.push('');
    if (results[key]) {
      lines.push('**Resultado:**');
      lines.push('```');
      lines.push(JSON.stringify(results[key], null, 2));
      lines.push('```');
    } else {
      lines.push('**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*');
    }
    lines.push('');
  }

  lines.push('## 2. MATRIZ DE RUTAS (Rellenar con evidencia)');
  lines.push('');
  lines.push('| Ruta | Administrador | Calidad | Operativo | Fuente |');
  lines.push('|------|---------------|---------|-----------|--------|');
  for (const [path, perms] of Object.entries(PATH_MATRIX)) {
    lines.push(`| ${path} | ${perms.administrador ?? '?'} | ${perms.calidad ?? '?'} | ${perms.operativo ?? '?'} | ${perms.source} |`);
  }
  lines.push('');

  lines.push('## 3. CLASIFICACIÓN DE HIPÓTESIS');
  lines.push('');
  for (const h of HYPOTHESES) {
    lines.push(`### ${h.id} — ${h.label}`);
    lines.push(h.description);
    lines.push('**Veredicto:** *Pendiente — analizar resultados*');
    lines.push('');
  }

  lines.push('## 4. HALLAZGOS CLAVE (INV-01..20 / E01..20)');
  lines.push('');
  lines.push('*Rellenar tras análisis:*');
  lines.push('');

  lines.push('## 5. CLASIFICACIÓN FINAL');
  lines.push('');
  lines.push('> **CLASIFICACIÓN PENDIENTE** — Ejecutar queries y analizar resultados');
  lines.push('');
  lines.push('Posibles clasificaciones:');
  lines.push('- RLS PATH GAP → programs/ no autorizado');
  lines.push('- RLS ROLE GAP → administrador no incluido');
  lines.push('- RLS REGRESSION → política anterior alterada');
  lines.push('- RLS POLICY CONFLICT → múltiples policies incompatibles');
  lines.push('- RLS AUTHORIZATION CORRECT → problema fuera de policy (session/mime/bucket)');
  lines.push('');

  lines.push('='.repeat(70));
  return lines.join('\n');
}

// ============================================================================
// OUTPUT PARA COPIAR A SUPABASE SQL EDITOR
// ============================================================================
function generateSQLFile() {
  let sql = '-- ============================================================================\n';
  sql += '-- SPRINT 344 — QUERIES FORENSES PARA SUPABASE SQL EDITOR\n';
  sql += '-- Copiar cada bloque y ejecutar individualmente\n';
  sql += '-- ============================================================================\n\n';

  for (const [key, query] of Object.entries(FORENSIC_QUERIES)) {
    sql += `-- ${key}\n`;
    sql += query.trim() + ';\n\n';
  }
  return sql;
}

// ============================================================================
// MAIN
// ============================================================================
function main() {
  console.log('='.repeat(70));
  console.log('SPRINT 344 — DOCUMENT STORAGE ROLE & PATH RLS FORENSIC AUDIT');
  console.log('='.repeat(70));
  console.log('');
  console.log('MODO: AUDIT ONLY (0 production source changes)');
  console.log('');

  // 1. Generar archivo SQL para Supabase
  const sqlContent = generateSQLFile();
  const sqlPath = path.join(ROOT, 'scripts', 'sprint-344-forensic-queries.sql');
  fs.writeFileSync(sqlPath, sqlContent);
  console.log(`✓ Archivo SQL generado: ${sqlPath}`);
  console.log('  → Copiar y ejecutar cada query en Supabase SQL Editor');
  console.log('');

  // 2. Generar plantilla de resultados
  const resultsPath = path.join(ROOT, 'scripts', 'sprint-344-results-template.json');
  fs.writeFileSync(resultsPath, JSON.stringify(RESULTS_TEMPLATE, null, 2));
  console.log(`✓ Plantilla de resultados: ${resultsPath}`);
  console.log('  → Rellenar con resultados de SQL Editor');
  console.log('');

  // 3. Generar reporte base
  const report = generateReport({});
  const reportPath = path.join(ROOT, 'docs', 'Sprint-344.md');
  fs.writeFileSync(reportPath, report);
  console.log(`✓ Reporte base: ${reportPath}`);
  console.log('');

  // 4. Instrucciones
  console.log('PRÓXIMOS PASOS:');
  console.log('  1. Abrir Supabase Dashboard → SQL Editor');
  console.log('  2. Ejecutar queries de sprint-344-forensic-queries.sql');
  console.log('  3. Rellenar sprint-344-results-template.json con resultados');
  console.log('  4. Ejecutar: node scripts/sprint-344-document-storage-role-path-rls-forensic-audit.mjs --analyze');
  console.log('  5. Leer docs/Sprint-344.md actualizado');
  console.log('');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`TIME: ${elapsed}s`);
  console.log('='.repeat(70));
}

main();