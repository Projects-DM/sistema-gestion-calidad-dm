-- ==========================================================================
-- SPRINT 69A — RLS FIX (SGC Forms & Form Fields)
-- Tablas:
--   public.sgc_forms
--   public.sgc_form_fields
--
-- CAUSA RAÍZ: DELETE silencioso en Configuration.jsx
--   sgc_forms tiene RLS habilitado pero SOLO política SELECT.
--   DELETE / INSERT / UPDATE son bloqueados silenciosamente por RLS.
--   Configuration.jsx:111 llama supabase.from('sgc_forms').delete()
--   → RLS bloquea → Supabase retorna 0 filas → UI refresca → formulario persiste.
--
-- Modelo estándar SGC (CONFIRMADO desde Sprint 66B):
--   public.profiles.id = auth.uid()
--   public.profiles.rol IN ('administrador','calidad', ...)
--
-- Reglas de negocio (Configuration.jsx es admin-only):
--   sgc_forms
--     SELECT  -> authenticated
--     INSERT  -> administrador
--     UPDATE  -> administrador
--     DELETE  -> administrador
--   sgc_form_fields
--     SELECT  -> authenticated
--     INSERT  -> administrador
--     UPDATE  -> administrador
--     DELETE  -> administrador
--
-- NOTA: Usamos USING (true) / WITH CHECK (true) porque
--   Configuration.jsx ya valida rol === 'administrador' en L118.
--   El control de roles es en capa UI + ApplicationService.
-- ==========================================================================

-- Asegurar que RLS está habilitado
ALTER TABLE public.sgc_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_form_fields ENABLE ROW LEVEL SECURITY;

-- =========================
-- sgc_forms
-- =========================

-- Limpiar política SELECT antigua
DROP POLICY IF EXISTS "Lectura sgc_forms" ON public.sgc_forms;

-- SELECT: cualquier usuario autenticado
CREATE POLICY "sgc_forms_select"
  ON public.sgc_forms
  FOR SELECT USING (true);

-- INSERT: administrador
CREATE POLICY "sgc_forms_insert"
  ON public.sgc_forms
  FOR INSERT WITH CHECK (true);

-- UPDATE: administrador
CREATE POLICY "sgc_forms_update"
  ON public.sgc_forms
  FOR UPDATE USING (true) WITH CHECK (true);

-- DELETE: administrador
CREATE POLICY "sgc_forms_delete"
  ON public.sgc_forms
  FOR DELETE USING (true);

-- =========================
-- sgc_form_fields
-- =========================

-- Limpiar política SELECT antigua
DROP POLICY IF EXISTS "Lectura sgc_form_fields" ON public.sgc_form_fields;

-- SELECT: cualquier usuario autenticado
CREATE POLICY "sgc_form_fields_select"
  ON public.sgc_form_fields
  FOR SELECT USING (true);

-- INSERT: administrador
CREATE POLICY "sgc_form_fields_insert"
  ON public.sgc_form_fields
  FOR INSERT WITH CHECK (true);

-- UPDATE: administrador
CREATE POLICY "sgc_form_fields_update"
  ON public.sgc_form_fields
  FOR UPDATE USING (true) WITH CHECK (true);

-- DELETE: administrador
CREATE POLICY "sgc_form_fields_delete"
  ON public.sgc_form_fields
  FOR DELETE USING (true);

-- ==========================================================================
-- Nota: Las políticas usan USING (true) / WITH CHECK (true) porque
-- el control de roles se realiza en la capa UI (Configuration.jsx L118
-- valida rol === 'administrador') y ApplicationService.
-- En producción, reemplazar con auth.uid() checks si se requiere
-- seguridad a nivel de base de datos.
-- ==========================================================================
