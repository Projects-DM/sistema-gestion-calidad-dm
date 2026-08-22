======================================================================
SPRINT 344 — DOCUMENT STORAGE ROLE & PATH RLS FORENSIC AUDIT
======================================================================

## 1. QUERIES EJECUTADAS Y RESULTADOS

### Q01_bucket
```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'documentos-sgc';
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q02_all_policies
```sql
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
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q03_insert_policies
```sql
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
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q04_bucket_in_policies
```sql
SELECT
    policyname,
    cmd,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND with_check ILIKE '%documentos-sgc%';
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q05_profiles
```sql
SELECT id, email, rol, activo
FROM public.profiles
WHERE activo = true
ORDER BY rol;
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q06_foldername_test
```sql
SELECT
    storage.foldername(name) as folders,
    storage.foldername(name)[1] as first_folder,
    name
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
  AND name LIKE 'programs/%'
LIMIT 10;
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q07_foldername_firmas
```sql
SELECT
    storage.foldername(name) as folders,
    storage.foldername(name)[1] as first_folder,
    name
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
  AND name LIKE 'firmas/%'
LIMIT 10;
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q08_foldername_evidencias
```sql
SELECT
    storage.foldername(name) as folders,
    storage.foldername(name)[1] as first_folder,
    name
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
  AND name LIKE 'evidencias/%'
LIMIT 10;
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q09_current_profile
```sql
SELECT id, email, rol, activo
FROM public.profiles
WHERE id = auth.uid();
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q10_distinct_folders
```sql
SELECT DISTINCT storage.foldername(name)[1] as folder
FROM storage.objects
WHERE bucket_id = 'documentos-sgc'
ORDER BY folder;
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q11_permissive_restrictive
```sql
SELECT
    cmd,
    permissive,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
GROUP BY cmd, permissive
ORDER BY cmd, permissive;
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q12_policy_overlap
```sql
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
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q13_authenticated_role
```sql
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
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

### Q14_path_conditions
```sql
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
```

**Resultado:** *Pendiente — ejecutar en Supabase SQL Editor*

## 2. MATRIZ DE RUTAS (Rellenar con evidencia)

| Ruta | Administrador | Calidad | Operativo | Fuente |
|------|---------------|---------|-----------|--------|
| programs/ | ? | ? | ? | Storage RLS |
| firmas/ | ? | ? | ? | Storage RLS |
| evidencias/ | ? | ? | ? | Storage RLS |
| otras | ? | ? | ? | Storage RLS |

## 3. CLASIFICACIÓN DE HIPÓTESIS

### H01 — Política INSERT eliminada o modificada
La política que permitía "Admin upload documents" ya no existe o cambió.
**Veredicto:** *Pendiente — analizar resultados*

### H02 — Política existe pero no incluye administrador
La política autoriza profiles.rol = ANY(...) pero falta "administrador".
**Veredicto:** *Pendiente — analizar resultados*

### H03 — Política correcta pero restringida por carpeta
La política autoriza firmas/ y evidencias/ pero NO programs/.
**Veredicto:** *Pendiente — analizar resultados*

### H04 — Conflicto entre políticas
Existe combinación inesperada de políticas PERMISSIVE/RESTRICTIVE.
**Veredicto:** *Pendiente — analizar resultados*

### H05 — Bucket incorrecto
Frontend apunta a documentos-sgc pero la política corresponde a otro bucket.
**Veredicto:** *Pendiente — analizar resultados*

### H06 — Sesión/rol inconsistente
Usuario aparentemente administrador no resuelve como profiles.rol = administrador.
**Veredicto:** *Pendiente — analizar resultados*

### H07 — Cambio introducido durante corrección anterior
Modificación para permitir uploads del operativo alteró accidentalmente programs/.
**Veredicto:** *Pendiente — analizar resultados*

### H08 — Problema fuera de RLS
Si políticas son correctas, revisar storage path, auth session, bucket, request, mime, service.
**Veredicto:** *Pendiente — analizar resultados*

## 4. HALLAZGOS CLAVE (INV-01..20 / E01..20)

*Rellenar tras análisis:*

## 5. CLASIFICACIÓN FINAL

> **CLASIFICACIÓN PENDIENTE** — Ejecutar queries y analizar resultados

Posibles clasificaciones:
- RLS PATH GAP → programs/ no autorizado
- RLS ROLE GAP → administrador no incluido
- RLS REGRESSION → política anterior alterada
- RLS POLICY CONFLICT → múltiples policies incompatibles
- RLS AUTHORIZATION CORRECT → problema fuera de policy (session/mime/bucket)

======================================================================