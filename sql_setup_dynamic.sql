-- =========================================================================
-- INSTALADOR UNIFICADO DE LA ARQUITECTURA DINÁMICA SGC
-- Este script limpia, crea y siembra los datos automáticamente.
-- NO borra tus tablas de usuarios, PDFs o trazabilidad antigua.
-- =========================================================================

-- 1. LIMPIEZA DE TABLAS DINÁMICAS (Por si quedaron mal creadas)
DROP TABLE IF EXISTS public.sgc_evidences CASCADE;
DROP TABLE IF EXISTS public.sgc_response_values CASCADE;
DROP TABLE IF EXISTS public.sgc_form_responses CASCADE;
DROP TABLE IF EXISTS public.sgc_form_fields CASCADE;
DROP TABLE IF EXISTS public.sgc_forms CASCADE;
DROP TABLE IF EXISTS public.sgc_modules CASCADE;

-- 2. CREACIÓN DE LA ESTRUCTURA CORRECTA
CREATE TABLE public.sgc_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.sgc_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.sgc_modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    engine_type TEXT NOT NULL,
    roles_allowed TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.sgc_form_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID REFERENCES public.sgc_forms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    options JSONB,
    required BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.sgc_form_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID REFERENCES public.sgc_forms(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'completado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.sgc_response_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.sgc_form_responses(id) ON DELETE CASCADE,
    field_id UUID REFERENCES public.sgc_form_fields(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number NUMERIC,
    value_boolean BOOLEAN,
    value_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.sgc_evidences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.sgc_form_responses(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE public.sgc_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_response_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura sgc_modules" ON public.sgc_modules FOR SELECT USING (true);
CREATE POLICY "Lectura sgc_forms" ON public.sgc_forms FOR SELECT USING (true);
CREATE POLICY "Lectura sgc_form_fields" ON public.sgc_form_fields FOR SELECT USING (true);

-- 4. INSERTAR LOS DATOS SEMILLA
INSERT INTO public.sgc_modules (name, slug, icon, description) VALUES 
('Operaciones', 'operaciones', 'Sparkles', 'BPM, Limpieza, Plagas, Inspecciones'),
('Trazabilidad', 'trazabilidad', 'RouteIcon', 'Despachos, Lotes, Entradas y Salidas'),
('Medición y Control', 'medicion-control', 'Droplets', 'Temperatura, pH, Cloro Residual, Peso'),
('Mantenimiento', 'mantenimiento', 'Wrench', 'Equipos, Mantenimientos e Inventario'),
('Calidad', 'calidad', 'AlertTriangle', 'PQRS, Recall, Auditorías y Evaluaciones'),
('Gestión Documental', 'gestion-documental', 'FileText', 'Programas PDF, Procedimientos y Registros'),
('Configuración', 'configuracion', 'Settings', 'Usuarios, Permisos y Parámetros');

DO $$ 
DECLARE 
    mod_operaciones_id UUID;
    form_limpieza_id UUID;
    mod_medicion_id UUID;
    form_cloro_id UUID;
BEGIN
    SELECT id INTO mod_operaciones_id FROM public.sgc_modules WHERE slug = 'operaciones';
    SELECT id INTO mod_medicion_id FROM public.sgc_modules WHERE slug = 'medicion-control';

    INSERT INTO public.sgc_forms (module_id, name, slug, description, engine_type, roles_allowed) 
    VALUES (mod_operaciones_id, 'Checklist de Limpieza y Desinfección', 'limpieza-diaria', 'Verificación diaria de áreas de almacenamiento y operativas.', 'BaseChecklist', ARRAY['administrador', 'calidad', 'operativo'])
    RETURNING id INTO form_limpieza_id;

    INSERT INTO public.sgc_form_fields (form_id, name, label, field_type, required, order_index) VALUES 
    (form_limpieza_id, 'area_recepcion', 'Área de Recepción limpia, despejada y libre de plagas', 'boolean', true, 1),
    (form_limpieza_id, 'area_almacenamiento', 'Estanterías y pallets organizados sin productos en el suelo', 'boolean', true, 2),
    (form_limpieza_id, 'pasillos', 'Pasillos de tránsito despejados y limpios', 'boolean', true, 3),
    (form_limpieza_id, 'observaciones', 'Observaciones adicionales (Opcional)', 'text', false, 4);

    INSERT INTO public.sgc_forms (module_id, name, slug, description, engine_type, roles_allowed) 
    VALUES (mod_medicion_id, 'Control de Cloro y pH del Agua', 'cloro-ph-agua', 'Registro de los parámetros fisicoquímicos del agua potable.', 'BaseMediciones', ARRAY['administrador', 'calidad', 'operativo'])
    RETURNING id INTO form_cloro_id;

    INSERT INTO public.sgc_form_fields (form_id, name, label, field_type, options, required, order_index) VALUES 
    (form_cloro_id, 'cloro_residual', 'Cloro Residual Libre', 'number', '{"unit": "ppm", "min": 0.3, "max": 2.0}'::jsonb, true, 1),
    (form_cloro_id, 'ph', 'Nivel de pH', 'number', '{"unit": "pH", "min": 6.5, "max": 9.0}'::jsonb, true, 2),
    (form_cloro_id, 'observaciones', 'Acciones correctivas (Opcional)', 'text', '{}'::jsonb, false, 3);
END $$;
