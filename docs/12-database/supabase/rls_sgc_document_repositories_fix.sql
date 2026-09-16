-- ==========================================================================
-- SPRINT 43.4 — RLS FIX (SGC Repositorios Documentales)
-- Tablas:
--   public.sgc_document_repositories
--   public.sgc_document_repository_categories
--
-- Modelo estándar SGC (CONFIRMADO):
--   public.profiles.id = auth.uid()
--   public.profiles.rol IN ('administrador','calidad', ...)
--
-- Reglas requeridas:
--   sgc_document_repositories
--     SELECT  -> authenticated (profiles check)
--     INSERT  -> administrador / calidad
--     UPDATE  -> administrador / calidad
--     DELETE  -> administrador
--   sgc_document_repository_categories
--     Mismas reglas que repositories
--     (no se define ownership adicional porque el módulo admin trabaja por repository_id)
-- ==========================================================================

-- Seguridad adicional: asegurar que RLS está habilitado
ALTER TABLE public.sgc_document_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_document_repository_categories ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- Helper expression (no create function para evitar cambios de modelo)
-- --------------------------------------------------------------------------
-- EXISTS (
--   SELECT 1 FROM public.profiles p
--   WHERE p.id = auth.uid()
--     AND p.rol IN (...)
-- )

-- =========================
-- sgc_document_repositories
-- =========================

-- SELECT: autenticados (según perfiles)
DROP POLICY IF EXISTS "sgc_document_repositories_select_authenticated" ON public.sgc_document_repositories;
CREATE POLICY "sgc_document_repositories_select_authenticated"
  ON public.sgc_document_repositories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador','calidad')
    )
  );

-- INSERT: administrador / calidad
DROP POLICY IF EXISTS "sgc_document_repositories_insert_admin_calidad" ON public.sgc_document_repositories;
CREATE POLICY "sgc_document_repositories_insert_admin_calidad"
  ON public.sgc_document_repositories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador','calidad')
    )
  );

-- UPDATE: administrador / calidad
DROP POLICY IF EXISTS "sgc_document_repositories_update_admin_calidad" ON public.sgc_document_repositories;
CREATE POLICY "sgc_document_repositories_update_admin_calidad"
  ON public.sgc_document_repositories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador','calidad')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador','calidad')
    )
  );

-- DELETE: administrador
DROP POLICY IF EXISTS "sgc_document_repositories_delete_administrador" ON public.sgc_document_repositories;
CREATE POLICY "sgc_document_repositories_delete_administrador"
  ON public.sgc_document_repositories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador')
    )
  );

-- ===============================
-- sgc_document_repository_categories
-- ===============================

-- SELECT: autenticados (según perfiles)
DROP POLICY IF EXISTS "sgc_document_repository_categories_select_authenticated" ON public.sgc_document_repository_categories;
CREATE POLICY "sgc_document_repository_categories_select_authenticated"
  ON public.sgc_document_repository_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador','calidad')
    )
  );

-- INSERT: administrador / calidad
DROP POLICY IF EXISTS "sgc_document_repository_categories_insert_admin_calidad" ON public.sgc_document_repository_categories;
CREATE POLICY "sgc_document_repository_categories_insert_admin_calidad"
  ON public.sgc_document_repository_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador','calidad')
    )
  );

-- UPDATE: administrador / calidad
DROP POLICY IF EXISTS "sgc_document_repository_categories_update_admin_calidad" ON public.sgc_document_repository_categories;
CREATE POLICY "sgc_document_repository_categories_update_admin_calidad"
  ON public.sgc_document_repository_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador','calidad')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador','calidad')
    )
  );

-- DELETE: administrador
DROP POLICY IF EXISTS "sgc_document_repository_categories_delete_administrador" ON public.sgc_document_repository_categories;
CREATE POLICY "sgc_document_repository_categories_delete_administrador"
  ON public.sgc_document_repository_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('administrador')
    )
  );

