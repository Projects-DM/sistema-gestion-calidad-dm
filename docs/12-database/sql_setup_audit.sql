-- =========================================================================
-- FASE 4.2: ACTUALIZACIÓN DE AUDITORÍA Y VERIFICACIÓN (NO DESTRUCTIVO)
-- =========================================================================

-- 1. Añadir campos de verificación a sgc_form_responses
ALTER TABLE public.sgc_form_responses
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_comment TEXT;

-- Cambiar el estado por defecto a pendiente_revision para nuevos registros
ALTER TABLE public.sgc_form_responses 
ALTER COLUMN status SET DEFAULT 'pendiente_revision';

-- Actualizar registros existentes que decían 'completado' a 'aprobado' para no perder historial
UPDATE public.sgc_form_responses SET status = 'aprobado' WHERE status = 'completado';

-- 2. Crear tabla de auditoría
CREATE TABLE IF NOT EXISTS public.sgc_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.sgc_form_responses(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'create', 'update', 'verify'
    modified_by UUID REFERENCES public.profiles(id) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Políticas de seguridad para la tabla de auditoría
ALTER TABLE public.sgc_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura sgc_audit_logs" ON public.sgc_audit_logs FOR SELECT USING (true);
CREATE POLICY "Escritura sgc_audit_logs" ON public.sgc_audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
