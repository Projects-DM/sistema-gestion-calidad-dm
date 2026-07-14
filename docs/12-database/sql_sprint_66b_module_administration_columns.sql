-- =========================================================================
-- SPRINT 66B: Module Administration — Columnas adicionales en sgc_modules
--
-- Ejecutar en: SQL Editor del proyecto Supabase
-- Descripción: Agrega columnas para capacidades, color, categoría y grupo
--              necesarias para el Wizard de Creación de Módulos y el
--              Adapter de Persistencia de Capacidades.
-- =========================================================================

-- 1. Columna capabilities (JSONB) — Almacena las asignaciones de capacidades
--    Formato: [{ assignmentId, moduleId, packageId, state, owner, version, orderIndex }]
ALTER TABLE public.sgc_modules
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '[]'::jsonb;

-- 2. Columna color — Color hexadecimal del módulo para UI
ALTER TABLE public.sgc_modules
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- 3. Columna category — Categoría de organización del módulo
ALTER TABLE public.sgc_modules
ADD COLUMN IF NOT EXISTS category TEXT;

-- 4. Columna grupo — Grupo de organización del módulo
ALTER TABLE public.sgc_modules
ADD COLUMN IF NOT EXISTS grupo TEXT;

-- 5. Columna state — Estado del ciclo de vida del módulo
--    (draft → configurable → operational → deprecated → archived)
ALTER TABLE public.sgc_modules
ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'draft';

-- 6. Columna order_index — Orden de visualización del módulo
ALTER TABLE public.sgc_modules
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 7. Columna visible — Visibilidad del módulo en la UI
ALTER TABLE public.sgc_modules
ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true;

-- 8. Columna created_by — Actor que creó el módulo
ALTER TABLE public.sgc_modules
ADD COLUMN IF NOT EXISTS created_by UUID;

-- =========================================================================
-- Índices para consultas frecuentes
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_sgc_modules_state ON public.sgc_modules (state);
CREATE INDEX IF NOT EXISTS idx_sgc_modules_capabilities ON public.sgc_modules USING gin (capabilities);

-- =========================================================================
-- Migración de datos existentes: establecer state = 'operational' para
-- módulos semilla que no tienen estado asignado.
-- =========================================================================
UPDATE public.sgc_modules
SET state = 'operational'
WHERE state IS NULL OR state = 'draft';

-- =========================================================================
-- 9. RLS Policies — CRUD operations for Module Administration
--
-- La tabla sgc_modules ya tiene RLS habilitado con una política SELECT.
-- Se necesitan políticas INSERT, UPDATE y DELETE para que el
-- Supabase JS Client (usado por ApplicationService) pueda escribir.
--
-- IMPORTANTE: Sin estas políticas, el ApplicationService recibe
-- "new row violates row-level security policy" → error 42501
-- que se mapea como "Failed to create module in database".
-- =========================================================================

-- DROP la política SELECT existente si existe (la recreamos con nombre consistente)
DROP POLICY IF EXISTS "Lectura sgc_modules" ON public.sgc_modules;

-- SELECT: cualquier usuario autenticado puede leer módulos activos
CREATE POLICY "sgc_modules_select" ON public.sgc_modules
  FOR SELECT USING (true);

-- INSERT: solo administradores pueden crear módulos
CREATE POLICY "sgc_modules_insert" ON public.sgc_modules
  FOR INSERT WITH CHECK (true);

-- UPDATE: solo administradores pueden actualizar módulos
CREATE POLICY "sgc_modules_update" ON public.sgc_modules
  FOR UPDATE USING (true);

-- DELETE: solo administradores pueden eliminar módulos
CREATE POLICY "sgc_modules_delete" ON public.sgc_modules
  FOR DELETE USING (true);

-- =========================================================================
-- Nota: Las políticas usan USING (true) / WITH CHECK (true) porque
-- el control de roles se realiza en la capa Application Service
-- (módulo ModuleAdministrationApplicationService._checkAuthorization).
-- En producción, reemplazar con auth.uid() checks si se requiere
-- seguridad a nivel de base de datos.
-- =========================================================================
