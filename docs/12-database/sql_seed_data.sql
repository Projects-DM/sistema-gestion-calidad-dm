-- SEMILLA DE DATOS INICIALES (SGC DINÁMICO)

-- 1. Insertar Módulos Principales
INSERT INTO public.sgc_modules (name, slug, icon, description) VALUES 
('Operaciones', 'operaciones', 'Sparkles', 'BPM, Limpieza, Plagas, Inspecciones'),
('Trazabilidad', 'trazabilidad', 'RouteIcon', 'Despachos, Lotes, Entradas y Salidas'),
('Medición y Control', 'medicion-control', 'Droplets', 'Temperatura, pH, Cloro Residual, Peso'),
('Mantenimiento', 'mantenimiento', 'Wrench', 'Equipos, Mantenimientos e Inventario'),
('Calidad', 'calidad', 'AlertTriangle', 'PQRS, Recall, Auditorías y Evaluaciones'),
('Gestión Documental', 'gestion-documental', 'FileText', 'Programas PDF, Procedimientos y Registros'),
('Configuración', 'configuracion', 'Settings', 'Usuarios, Permisos y Parámetros')
ON CONFLICT (slug) DO NOTHING;

-- 2. Insertar Formularios y Campos Reales
DO $$ 
DECLARE 
    mod_operaciones_id UUID;
    form_limpieza_id UUID;
    mod_medicion_id UUID;
    form_cloro_id UUID;
BEGIN
    -- Obtener IDs de los módulos recién creados
    SELECT id INTO mod_operaciones_id FROM public.sgc_modules WHERE slug = 'operaciones';
    SELECT id INTO mod_medicion_id FROM public.sgc_modules WHERE slug = 'medicion-control';

    -- A. FORMATO DE OPERACIONES (Limpieza Diaria usando BaseChecklist)
    IF NOT EXISTS (SELECT 1 FROM public.sgc_forms WHERE slug = 'limpieza-diaria') THEN
        INSERT INTO public.sgc_forms (module_id, name, slug, description, engine_type, roles_allowed) 
        VALUES (mod_operaciones_id, 'Checklist de Limpieza y Desinfección', 'limpieza-diaria', 'Verificación diaria de áreas de almacenamiento y operativas.', 'BaseChecklist', ARRAY['administrador', 'calidad', 'operativo'])
        RETURNING id INTO form_limpieza_id;

        -- Campos del Checklist
        INSERT INTO public.sgc_form_fields (form_id, name, label, field_type, required, order_index) VALUES 
        (form_limpieza_id, 'area_recepcion', 'Área de Recepción limpia, despejada y libre de plagas', 'boolean', true, 1),
        (form_limpieza_id, 'area_almacenamiento', 'Estanterías y pallets organizados sin productos en el suelo', 'boolean', true, 2),
        (form_limpieza_id, 'pasillos', 'Pasillos de tránsito despejados y limpios', 'boolean', true, 3),
        (form_limpieza_id, 'observaciones', 'Observaciones adicionales (Opcional)', 'text', false, 4);
    END IF;

    -- B. FORMATO DE MEDICIÓN (Control de Cloro y pH usando BaseMediciones)
    IF NOT EXISTS (SELECT 1 FROM public.sgc_forms WHERE slug = 'cloro-ph-agua') THEN
        INSERT INTO public.sgc_forms (module_id, name, slug, description, engine_type, roles_allowed) 
        VALUES (mod_medicion_id, 'Control de Cloro y pH del Agua', 'cloro-ph-agua', 'Registro de los parámetros fisicoquímicos del agua potable.', 'BaseMediciones', ARRAY['administrador', 'calidad', 'operativo'])
        RETURNING id INTO form_cloro_id;

        -- Campos Cuantitativos
        INSERT INTO public.sgc_form_fields (form_id, name, label, field_type, options, required, order_index) VALUES 
        (form_cloro_id, 'cloro_residual', 'Cloro Residual Libre', 'number', '{"unit": "ppm", "min": 0.3, "max": 2.0}'::jsonb, true, 1),
        (form_cloro_id, 'ph', 'Nivel de pH', 'number', '{"unit": "pH", "min": 6.5, "max": 9.0}'::jsonb, true, 2),
        (form_cloro_id, 'observaciones', 'Acciones correctivas (Opcional)', 'text', '{}'::jsonb, false, 3);
    END IF;
END $$;
