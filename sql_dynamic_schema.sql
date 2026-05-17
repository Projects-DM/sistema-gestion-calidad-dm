-- 1. Tabla sgc_modules (Grupos funcionales)
CREATE TABLE IF NOT EXISTS public.sgc_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla sgc_forms (Definición de cada formulario dinámico)
CREATE TABLE IF NOT EXISTS public.sgc_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.sgc_modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    engine_type TEXT NOT NULL, -- ej: BaseChecklist, BaseTrazabilidad, BaseMediciones, BaseMantenimiento, BaseCRUD
    roles_allowed TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla sgc_form_fields (Campos de cada formulario)
CREATE TABLE IF NOT EXISTS public.sgc_form_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID REFERENCES public.sgc_forms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL, -- text, number, select, boolean, date, time
    options JSONB, -- para select u otras configuraciones
    required BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla sgc_form_responses (Cada registro diligenciado)
CREATE TABLE IF NOT EXISTS public.sgc_form_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID REFERENCES public.sgc_forms(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'completado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla sgc_response_values (Valores de los campos para una respuesta)
CREATE TABLE IF NOT EXISTS public.sgc_response_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.sgc_form_responses(id) ON DELETE CASCADE,
    field_id UUID REFERENCES public.sgc_form_fields(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number NUMERIC,
    value_boolean BOOLEAN,
    value_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabla sgc_evidences (Evidencias fotográficas u otros archivos por respuesta)
CREATE TABLE IF NOT EXISTS public.sgc_evidences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.sgc_form_responses(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.sgc_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_response_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_evidences ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de lectura pública para estructura
CREATE POLICY "Lectura sgc_modules" ON public.sgc_modules FOR SELECT USING (true);
CREATE POLICY "Lectura sgc_forms" ON public.sgc_forms FOR SELECT USING (true);
CREATE POLICY "Lectura sgc_form_fields" ON public.sgc_form_fields FOR SELECT USING (true);

-- Políticas de escritura para administradores (Estructura)
CREATE POLICY "Escritura sgc_modules admin" ON public.sgc_modules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.rol = 'administrador'));
CREATE POLICY "Escritura sgc_forms admin" ON public.sgc_forms FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.rol = 'administrador'));
CREATE POLICY "Escritura sgc_form_fields admin" ON public.sgc_form_fields FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.rol = 'administrador'));

-- Políticas para respuestas (Operativo y superiores)
CREATE POLICY "Lectura responses" ON public.sgc_form_responses FOR SELECT USING (true);
CREATE POLICY "Escritura responses" ON public.sgc_form_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizacion responses" ON public.sgc_form_responses FOR UPDATE USING (true);

CREATE POLICY "Lectura response_values" ON public.sgc_response_values FOR SELECT USING (true);
CREATE POLICY "Escritura response_values" ON public.sgc_response_values FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualizacion response_values" ON public.sgc_response_values FOR UPDATE USING (true);

CREATE POLICY "Lectura evidences" ON public.sgc_evidences FOR SELECT USING (true);
CREATE POLICY "Escritura evidences" ON public.sgc_evidences FOR INSERT WITH CHECK (true);
CREATE POLICY "Eliminacion evidences" ON public.sgc_evidences FOR DELETE USING (true);
