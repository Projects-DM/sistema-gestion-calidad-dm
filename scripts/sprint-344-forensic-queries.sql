-- ============================================================================
-- SPRINT 344 — QUERIES FORENSES PARA SUPABASE SQL EDITOR
-- Copiar cada bloque y ejecutar individualmente
-- ============================================================================

-- Q01_bucket
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'documentos-sgc';;

-- Q02_all_policies
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
ORDER BY cmd, policyname;;

-- Q03_insert_policies
SELECT
    policyname,
    roles,
    cmd,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND cmd = 'INSERT'
ORDER BY policyname;;

-- Q04_bucket_in_policies
SELECT
    policyname,
    cmd,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND with_check ILIKE '%documentos-sgc%';;

-- Q05_profiles
SELECT id, email, rol, activo
FROM public.profiles
WHERE activo = true
ORDER BY rol;;

-- Q06_foldername_test
SELECT
    storage.foldername(name) as folders,
    storage.foldername(name)[1] as first_folder,
    name
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
  AND name LIKE 'programs/%'
LIMIT 10;;

-- Q07_foldername_firmas
SELECT
    storage.foldername(name) as folders,
    storage.foldername(name)[1] as first_folder,
    name
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
  AND name LIKE 'firmas/%'
LIMIT 10;;

-- Q08_foldername_evidencias
SELECT
    storage.foldername(name) as folders,
    storage.foldername(name)[1] as first_folder,
    name
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
  AND name LIKE 'evidencias/%'
LIMIT 10;;

-- Q09_current_profile
SELECT id, email, rol, activo
FROM public.profiles
WHERE id = auth.uid();;

-- Q10_distinct_folders
SELECT DISTINCT storage.foldername(name)[1] as folder
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
ORDER BY folder;;

-- Q11_permissive_restrictive
SELECT
    cmd,
    permissive,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
GROUP BY cmd, permissive
ORDER BY cmd, permissive;;

-- Q12_policy_overlap
SELECT
    cmd,
    policyname,
    roles,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND cmd IN ('INSERT', 'SELECT', 'UPDATE', 'DELETE')
ORDER BY cmd, policyname;;

-- Q13_authenticated_role
SELECT
    policyname,
    cmd,
    roles,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (roles @> ARRAY['authenticated'] OR roles = '{}' OR roles IS NULL)
ORDER BY cmd;;

-- Q14_path_conditions
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
ORDER BY cmd, policyname;;

