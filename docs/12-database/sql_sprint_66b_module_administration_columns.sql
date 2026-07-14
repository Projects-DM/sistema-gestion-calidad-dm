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
-- Nota: Las políticas RLS ya existen (Lectura sgc_modules).
-- Si se requieren políticas de escritura, agregarlas en un migration separado.
-- =========================================================================
