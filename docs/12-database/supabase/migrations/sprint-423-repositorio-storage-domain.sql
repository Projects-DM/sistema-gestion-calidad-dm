-- ==========================================================================
-- SPRINT 423 — Dominio Storage del Repositorio Documental (namespace dedicado)
-- Objetivo: autorizar `documentos-sgc/repositorio/{module}/{type}/{file}`
--   para administrador + calidad (activos), sin políticas por módulo y sin
--   alterar los dominios firmas/, evidencias/ ni programs/.
-- Contexto: AUD-422 (causa raíz: primer segmento dinámico sin política).
-- Antecedente de patrón: rls_sgc_document_repositories_fix.sql (Sprint 43.4)
--   + policies live programs/evidencias (rol + activo vía profiles).
-- Aplicar en: Supabase SQL Editor o vía migraciones versionadas.
-- Rollback: DROP POLICY IF EXISTS de las 3 políticas creadas abajo.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- INSERT — Repositorio Documental (admin + calidad, activos)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "repositorio_module_upload_admin_calidad"
  ON storage.objects;
CREATE POLICY "repositorio_module_upload_admin_calidad"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos-sgc'
    AND storage.foldername(name)[1] = 'repositorio'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador', 'calidad')
        AND p.activo = true
    )
  );

-- --------------------------------------------------------------------------
-- SELECT — Repositorio Documental (admin + calidad, activos)
-- Nota: solo ADITIVA (las policies RLS se combinan con OR). No restringe
-- lecturas actualmente permitidas por otras vías; cubre el dominio si el
-- bucket dejara de ser público. No otorga nada a operativo/consulta.
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "repositorio_module_select_admin_calidad"
  ON storage.objects;
CREATE POLICY "repositorio_module_select_admin_calidad"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos-sgc'
    AND storage.foldername(name)[1] = 'repositorio'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador', 'calidad')
        AND p.activo = true
    )
  );

-- --------------------------------------------------------------------------
-- DELETE — Repositorio Documental (admin + calidad, activos)
-- Requerida por: documentsService.deleteRecord() y el reemplazo en
-- uploadProgram-equivalente de registros (remove + upload). Sin UPDATE en
-- Storage (no existe la operación; el código no usa upsert).
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "repositorio_module_delete_admin_calidad"
  ON storage.objects;
CREATE POLICY "repositorio_module_delete_admin_calidad"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documentos-sgc'
    AND storage.foldername(name)[1] = 'repositorio'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador', 'calidad')
        AND p.activo = true
    )
  );

-- --------------------------------------------------------------------------
-- VERIFICACIÓN POST-APLICACIÓN (solo lectura)
-- --------------------------------------------------------------------------
-- SELECT policyname, cmd, roles, with_check
--   FROM pg_policies
--  WHERE schemaname = 'storage'
--    AND tablename = 'objects'
--    AND policyname LIKE 'repositorio\_%';
--
-- Casos esperados (Sprint 423 §12/§18):
--   1-2. admin/calidad suben a repositorio/{existente,nuevo}/... → permitido
--   3. operativo/consulta suben a repositorio/...               → rechazado
--   4. admin/calidad en firmas/evidencias/programs              → sin cambios
-- --------------------------------------------------------------------------
