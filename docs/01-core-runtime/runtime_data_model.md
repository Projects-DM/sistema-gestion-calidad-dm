# TABLAS Y MODELO EAV - SGC EMPRESARIAL

**Documento:** Especificación Técnica del Modelo de Datos  
**Versión:** 1.0  
**Clasificación:** Documentación Técnica Estratégica  
**Sistema:** Sistema de Gestión de Calidad (SGC) DM Distribuciones

---

## 1. MODELO ENTIDAD-RELACIÓN (EAV)

### 1.1 Diagrama Conceptual

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA DE DATOS SGC                         │
│                                                                      │
│  ┌────────────────┐       ┌────────────────┐       ┌─────────────┐  │
│  │  sgc_modules   │──1:N──│   sgc_forms    │──1:N──│sgc_form_    │  │
│  │  (Entity Type) │       │  (Form Def)    │       │fields       │  │
│  └────────────────┘       └───────┬────────┘       │(Attributes) │  │
│                                   │                └─────────────┘  │
│                                   │                                 │
│                                   │ 1:N                             │
│                                   │                                 │
│                          ┌────────▼────────┐                        │
│                          │ sgc_form_       │──1:N──┐               │
│                          │ responses       │       │               │
│                          │ (Response       │       │               │
│                          │  Entity)        │       │               │
│                          └────────┬────────┘       │               │
│                                   │                │               │
│                          ┌────────▼────────┐       │               │
│                          │ sgc_response_    │       │               │
│                          │ values           │       │               │
│                          │ (Values)         │       │               │
│                          └─────────────────┘       │               │
│                                                     │               │
│                          ┌───────────────────────┐  │               │
│                          │ sgc_evidences         │──┘               │
│                          │ (Evidences/Attach)    │                  │
│                          └───────────────────────┘                  │
│                                                                      │
│                          ┌───────────────────────┐                  │
│                          │ sgc_audit_logs        │──┘               │
│                          │ (Audit Trail)         │                  │
│                          └───────────────────────┘                  │
│                                                                      │
│  TABLAS LEGACY:                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │ despachos  │  │ documentos │  │ usuarios   │                    │
│  │(Trazabili- │  │(PDF Meta)  │  │(Perfiles)  │                    │
│  │ dad Legacy)│  │            │  │            │                    │
│  └────────────┘  └────────────┘  └────────────┘                    │
│                                                                      │
│  TABLAS SATÉLITE (Futuras):                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐           │
│  │sgc_equipos │  │ sgc_capa   │  │sgc_documentos_     │           │
│  │            │  │            │  │control             │           │
│  └────────────┘  └────────────┘  └────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Filosofía del Modelo EAV

El modelo EAV es la columna vertebral del sistema. Su propósito es permitir que **nuevos formularios se creen sin modificar el esquema de base de datos**. Esto se logra separando la definición del formulario (metadatos) de los datos reales (valores).

```
┌────────────────────────────────────────────────────────────────┐
│  ¿POR QUÉ EAV Y NO TABLAS TRADICIONALES?                       │
│                                                                │
│  Escenario: Agregar campo "temperatura" a un formulario       │
│                                                                │
│  Tablas tradicionales:                                         │
│  ALTER TABLE form_limpieza ADD COLUMN temperatura NUMERIC;    │
│  → Requiere migración DDL, downtime, actualización de ORM     │
│                                                                │
│  Modelo EAV:                                                   │
│  INSERT INTO sgc_form_fields (form_id, name, label,           │
│    field_type, options) VALUES (..., 'temperatura', ...,       │
│    'number', '{"unit":"°C","min":0,"max":100}');              │
│  → Sin migración, sin downtime, inmediato                     │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. TABLAS DEL NÚCLEO EAV

### 2.1 sgc_modules

**Propósito:** Agrupar formularios por área funcional (Operaciones, Calidad, Mantenimiento, etc.).

**DDL:**
```sql
CREATE TABLE public.sgc_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

**Datos semilla actuales:**

| id (UUID) | name | slug | icon | description |
|-----------|------|------|------|-------------|
| [auto] | Operaciones | operaciones | Sparkles | BPM, Limpieza, Plagas, Inspecciones |
| [auto] | Trazabilidad | trazabilidad | RouteIcon | Despachos, Lotes, Entradas y Salidas |
| [auto] | Medición y Control | medicion-control | Droplets | Temperatura, pH, Cloro Residual, Peso |
| [auto] | Mantenimiento | mantenimiento | Wrench | Equipos, Mantenimientos e Inventario |
| [auto] | Calidad | calidad | AlertTriangle | PQRS, Recall, Auditorías y Evaluaciones |
| [auto] | Gestión Documental | gestion-documental | FileText | Programas PDF, Procedimientos y Registros |
| [auto] | Configuración | configuracion | Settings | Usuarios, Permisos y Parámetros |

**Cardinalidad:** 1 → N (sgc_forms)

**Índices:**
```sql
-- Actuales: slug (UNIQUE), id (PK)
-- Futuros recomendados:
CREATE INDEX idx_modules_active ON sgc_modules(is_active) WHERE is_active = true;
```

**Preparación multi-tenant:**
```sql
ALTER TABLE sgc_modules ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_modules_tenant ON sgc_modules(tenant_id);
```

---

### 2.2 sgc_forms

**Propósito:** Definir la configuración de cada formulario dinámico.

**DDL:**
```sql
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
```

**Campos críticos:**
- `engine_type` (TEXT): Determina qué motor de renderizado se usa (`BaseChecklist`, `BaseMediciones`, `BaseGeneric`, etc.)
- `roles_allowed` (TEXT[]): Array de roles que pueden ver y usar este formulario

**Cardinalidad:** N → 1 (sgc_modules), 1 → N (sgc_form_fields, sgc_form_responses)

**Datos semilla actuales:**

| name | slug | engine_type | roles_allowed |
|------|------|-------------|---------------|
| Checklist de Limpieza y Desinfección | limpieza-diaria | BaseChecklist | admin, calidad, operativo |
| Control de Cloro y pH del Agua | cloro-ph-agua | BaseMediciones | admin, calidad, operativo |

**Índices:**
```sql
-- Actuales: slug (UNIQUE), module_id (FK)
-- Futuros recomendados:
CREATE INDEX idx_forms_module ON sgc_forms(module_id, is_active);
CREATE INDEX idx_forms_engine ON sgc_forms(engine_type);
```

---

### 2.3 sgc_form_fields

**Propósito:** Definir cada campo/pregunta de un formulario.

**DDL:**
```sql
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
```

**Campos críticos:**
- `field_type` (TEXT): Tipo de dato (`boolean`, `number`, `text`, `textarea`, `select`, `date`, `time`, `signature`)
- `options` (JSONB): Configuración adicional del campo (min, max, unit, choices, etc.)

**Tipos de campo soportados:**

| field_type | UI Component | value_* column | options típicos |
|------------|-------------|----------------|-----------------|
| `boolean` | Radio buttons / Checkbox | value_boolean | — |
| `number` | Input number | value_number | min, max, unit, step |
| `text` | Input text | value_text | maxLength, placeholder |
| `textarea` | Textarea | value_text | rows, placeholder |
| `select` | Dropdown | value_text | choices: string[] |
| `date` | Date picker | value_text | minDate, maxDate |
| `time` | Time picker | value_text | format: 'HH:mm' |
| `signature` | SignaturePad (Canvas) | value_text (URL) | — |

**Ejemplo de options JSONB:**
```json
// Campo numérico con rango
{ "unit": "ppm", "min": 0.3, "max": 2.0 }

// Select con opciones
{ "choices": ["Rutinaria", "Semanal", "Mensual"] }

// Texto con validación
{ "maxLength": 500, "placeholder": "Ingrese observaciones..." }
```

**Cardinalidad:** N → 1 (sgc_forms), 1 → N (sgc_response_values)

**Índices:**
```sql
-- Actuales: form_id (FK), order_index
-- Futuros recomendados:
CREATE INDEX idx_fields_form_order ON sgc_form_fields(form_id, order_index);
CREATE INDEX idx_fields_type ON sgc_form_fields(field_type);
```

**Datos semilla actuales (Checklist de Limpieza):**

| name | label | field_type | required | order_index |
|------|-------|------------|----------|-------------|
| area_recepcion | Área de Recepción limpia, despejada y libre de plagas | boolean | true | 1 |
| area_almacenamiento | Estanterías y pallets organizados sin productos en el suelo | boolean | true | 2 |
| pasillos | Pasillos de tránsito despejados y limpios | boolean | true | 3 |
| observaciones | Observaciones adicionales (Opcional) | text | false | 4 |

**Datos semilla actuales (Control de Cloro y pH):**

| name | label | field_type | options | required | order_index |
|------|-------|------------|---------|----------|-------------|
| cloro_residual | Cloro Residual Libre | number | {"unit":"ppm","min":0.3,"max":2.0} | true | 1 |
| ph | Nivel de pH | number | {"unit":"pH","min":6.5,"max":9.0} | true | 2 |
| observaciones | Acciones correctivas (Opcional) | text | {} | false | 3 |

---

### 2.4 sgc_form_responses

**Propósito:** Representar una instancia de formulario completado (el "documento" lleno).

**DDL:**
```sql
CREATE TABLE public.sgc_form_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID REFERENCES public.sgc_forms(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pendiente_revision',
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    verification_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

**Estados posibles:**

| status | Descripción | Color UI |
|--------|-------------|----------|
| `pendiente_revision` | Registro creado, esperando verificación | 🟡 Ámbar |
| `aprobado` | Verificado y aprobado | 🟢 Verde |
| `rechazado` | Verificado y rechazado | 🔴 Rojo |
| `corregido` | Verificado con correcciones | 🔵 Azul |

**Flujo de estados:**
```
CREACIÓN → pendiente_revision → aprobado
                              → rechazado
                              → corregido
```

**Campos de verificación (agregados en sql_setup_audit.sql):**
- `verified_by` (UUID FK → profiles.id): Quién verificó
- `verified_at` (TIMESTAMPTZ): Cuándo se verificó
- `verification_comment` (TEXT): Comentario del verificador

**Cardinalidad:** N → 1 (sgc_forms), N → 1 (profiles vía created_by), 1 → N (sgc_response_values, sgc_evidences, sgc_audit_logs)

**Índices (actuales + recomendados):**
```sql
-- Actuales: id (PK), form_id (FK), created_by (FK)
-- Recomendados (CRÍTICOS para performance):
CREATE INDEX idx_responses_form_date ON sgc_form_responses(form_id, created_at DESC);
CREATE INDEX idx_responses_status ON sgc_form_responses(status);
CREATE INDEX idx_responses_created_by ON sgc_form_responses(created_by);
CREATE INDEX idx_responses_verified ON sgc_form_responses(verified_by) WHERE verified_by IS NOT NULL;

-- Para dashboard:
CREATE INDEX idx_responses_today ON sgc_form_responses(created_at)
  WHERE created_at >= CURRENT_DATE;
```

---

### 2.5 sgc_response_values

**Propósito:** Almacenar el valor de cada campo en una respuesta específica.

**DDL:**
```sql
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
```

**Columnas tipadas (por performance):**
| Columna | Tipo | field_type que usa |
|---------|------|-------------------|
| `value_text` | TEXT | text, textarea, select, date, time, signature (URL) |
| `value_number` | NUMERIC | number |
| `value_boolean` | BOOLEAN | boolean |
| `value_json` | JSONB | Para tipos complejos futuros |

**Cardinalidad:** N → 1 (sgc_form_responses), N → 1 (sgc_form_fields)

**Índices:**
```sql
-- Actuales: response_id (FK), field_id (FK)
-- Recomendados:
CREATE INDEX idx_values_response ON sgc_response_values(response_id);
CREATE INDEX idx_values_field ON sgc_response_values(field_id);
CREATE INDEX idx_values_boolean ON sgc_response_values(value_boolean) WHERE value_boolean IS NOT NULL;
CREATE INDEX idx_values_number ON sgc_response_values(value_number) WHERE value_number IS NOT NULL;
```

---

### 2.6 sgc_evidences

**Propósito:** Almacenar metadatos de evidencias adjuntas a una respuesta (fotos, PDFs).

**DDL:**
```sql
CREATE TABLE public.sgc_evidences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.sgc_form_responses(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

**Campos:**
- `file_url` (TEXT NOT NULL): URL pública del archivo en Supabase Storage
- `storage_path` (TEXT NOT NULL): Ruta interna en el bucket (para operaciones de storage)
- `file_type` (TEXT): MIME type (image/jpeg, image/png, application/pdf)

**Flujo de almacenamiento:**
```
1. EvidenceUploader.jsx → Upload a bucket "documentos-sgc"/evidencias/{fileName}
2. Se obtiene publicUrl → { file_url, storage_path, file_type }
3. Se asocia a sgc_form_responses vía response_id
4. Visualización en DynamicRecordsView.jsx (galería de imágenes)
```

**Cardinalidad:** N → 1 (sgc_form_responses)

**Índices:**
```sql
-- Actuales: response_id (FK)
-- Recomendados:
CREATE INDEX idx_evidences_response ON sgc_evidences(response_id);
```

---

### 2.7 sgc_audit_logs

**Propósito:** Registrar toda acción sobre los datos para trazabilidad y cumplimiento normativo.

**DDL:**
```sql
CREATE TABLE public.sgc_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.sgc_form_responses(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    modified_by UUID REFERENCES public.profiles(id) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

**Tipos de acción:**
| action_type | Cuándo se genera | Datos registrados |
|-------------|------------------|-------------------|
| `create` | submitFormResponse() | new_data: valores del formulario |
| `update` | (Futuro) Edición de registro | old_data, new_data |
| `verify` | verifyFormResponse() | new_data: { status, comment } |

**Cardinalidad:** N → 1 (sgc_form_responses), N → 1 (profiles vía modified_by)

**Importancia normativa:**
- Cumplimiento INVIMA: Trazabilidad completa de quién creó, modificó y verificó cada registro
- ISO 9001: Evidencia de control de cambios y auditoría
- BPM: Registro de acciones correctivas y verificaciones

**Índices:**
```sql
-- Actuales: response_id (FK), modified_by (FK)
-- Recomendados:
CREATE INDEX idx_audit_response ON sgc_audit_logs(response_id, created_at DESC);
CREATE INDEX idx_audit_action ON sgc_audit_logs(action_type);
CREATE INDEX idx_audit_date ON sgc_audit_logs(created_at DESC);
```

---

## 3. TABLAS LEGACY (COEXISTENTES)

### 3.1 profiles (Usuarios)

**Propósito:** Perfiles de usuario con roles para el sistema SGC.

**DDL (creada externamente, referenciada por FK):**
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    user_id UUID,
    nombre TEXT,
    rol TEXT,           -- 'administrador' | 'calidad' | 'operativo'
    email TEXT
);
```

**Roles del sistema:**

| Rol | Permisos | Puede verificar |
|-----|----------|-----------------|
| `administrador` | Acceso total, configuración, verificación | ✅ Sí |
| `calidad` | Verificación, reportes, auditoría | ✅ Sí |
| `operativo` | Crear registros, ver historial | ❌ No |

**Regla de negocio (segregación de funciones):**
> Un usuario NO puede verificar sus propios registros.  
> Esto se valida en DynamicRecordsView.jsx:
> ```javascript
> const isOwnRecord = rec.created_by === user.id;
> const canVerifyRecord = isVerificador && !isOwnRecord;
> ```

### 3.2 despachos (Trazabilidad Legacy)

**Propósito:** Registro de despachos y trazabilidad logística.

**DDL:**
```sql
CREATE TABLE public.despachos (
    id UUID PRIMARY KEY,
    fecha DATE, hora TEXT, cliente TEXT,
    producto TEXT, lote TEXT, cantidad_bolsas NUMERIC,
    peso NUMERIC, destino TEXT, placa TEXT,
    conductor TEXT, observaciones TEXT, estado TEXT
);
```

**Estrategia:** Este módulo NO se ha migrado al modelo EAV. Coexiste como tabla independiente y se maneja con lógica propia fuera de DynamicForm.

### 3.3 documentos

**Propósito:** Metadatos de documentos PDF asociados a módulos.

**DDL:**
```sql
CREATE TABLE public.documentos (
    id UUID PRIMARY KEY,
    modulo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    url TEXT NOT NULL,
    tipo TEXT NOT NULL,
    fecha DATE NOT NULL
);
```

---

## 4. FLUJO DE DATOS ENTRE TABLAS

### 4.1 Flujo de Creación de Registro

```
1. Usuario completa formulario en DynamicForm.jsx
2. Se ejecuta dynamicService.submitFormResponse()
3. PASO 1: INSERT en sgc_form_responses
     VALUES (form_id, created_by, status='pendiente_revision')
     → RETURNS response.id
4. PASO 2: INSERT batch en sgc_response_values
     [{ response_id, field_id, value_* }]
5. PASO 3: INSERT batch en sgc_evidences (si hay)
     [{ response_id, file_url, storage_path, file_type }]
6. PASO 4: INSERT en sgc_audit_logs
     VALUES (response_id, 'create', user_id, new_data, 'Creación inicial')
```

### 4.2 Flujo de Verificación

```
1. Usuario calidad/admin abre modal en DynamicRecordsView.jsx
2. Escribe comentario y selecciona estado (aprobado/rechazado)
3. Se ejecuta dynamicService.verifyFormResponse()
4. PASO 1: UPDATE sgc_form_responses
     SET status, verified_by, verified_at, verification_comment
5. PASO 2: INSERT en sgc_audit_logs
     VALUES (response_id, 'verify', user_id, new_data, 'Verificación operativa')
```

### 4.3 Flujo de Consulta (getModuleResponses)

```sql
-- Query equivalente (el cliente Supabase genera el SQL)
SELECT
  r.id, r.status, r.created_at, r.created_by,
  r.verified_at, r.verification_comment,
  f.id as form_id, f.name as form_name,
  p.nombre as user_name, p.rol as user_rol,
  v.nombre as verifier_name,
  rv.*, ff.label, ff.field_type, ff.options,
  e.id as evidence_id, e.file_url, e.file_type
FROM sgc_form_responses r
INNER JOIN sgc_forms f ON r.form_id = f.id
LEFT JOIN profiles p ON r.created_by = p.id
LEFT JOIN profiles v ON r.verified_by = v.id
LEFT JOIN sgc_response_values rv ON r.id = rv.response_id
LEFT JOIN sgc_form_fields ff ON rv.field_id = ff.id
LEFT JOIN sgc_evidences e ON r.id = e.response_id
WHERE f.module_id = $1
ORDER BY r.created_at DESC;
```

**Problema identificado:** Esta query carga TODOS los registros sin paginación. Con >100K registros, se vuelve inmanejable.

---

## 5. PROYECCIÓN DE CRECIMIENTO

### 5.1 Estimación de Volumen de Datos

| Tabla | Registros/día | Mes | 6 meses | 1 año | 3 años |
|-------|:---:|:---:|:---:|:---:|:---:|
| sgc_form_responses | 50 | 1,500 | 9,000 | 18,250 | 54,750 |
| sgc_response_values | 200 | 6,000 | 36,000 | 73,000 | 219,000 |
| sgc_evidences | 100 | 3,000 | 18,000 | 36,500 | 109,500 |
| sgc_audit_logs | 100 | 3,000 | 18,000 | 36,500 | 109,500 |

**Escenario con 50 empresas (SaaS):**
| Tabla | 1 año (50 tenants) |
|-------|:------------------:|
| sgc_form_responses | 912,500 |
| sgc_response_values | 3,650,000 |
| sgc_evidences | 1,825,000 |
| sgc_audit_logs | 1,825,000 |

### 5.2 Impacto en Performance

```
Volumen actual (~1,000 registros):   ~500ms   ✅
Volumen 1 año (~18,000 registros):   ~3-5s    ⚠️  (SIN paginación)
Volumen SaaS (~1M registros):        Timeout  ❌  (SIN índices + paginación)
```

### 5.3 Estrategia de Crecimiento

```
FASE 1 (Ahora): Paginación + Índices
├── Implementar range() en getModuleResponses
├── Crear índices compuestos
└── Límite de 50 registros por página

FASE 2 (Próximo): Vistas Materializadas
├── mv_module_responses con datos precomputados
├── Refresh periódico (cron cada hora)
└── Índice en (module_id, created_at DESC)

FASE 3 (Futuro): Particionamiento + Archivado
├── Particionar sgc_form_responses por trimestre
├── Archivar registros > 2 años en tabla cold storage
└── Vista unificada para consultas históricas
```

---

## 6. ÍNDICES RECOMENDADOS (RESUMEN)

### 6.1 Índices CRÍTICOS (Implementar YA)

```sql
-- sgc_form_responses
CREATE INDEX idx_responses_form_date ON sgc_form_responses(form_id, created_at DESC);
CREATE INDEX idx_responses_status ON sgc_form_responses(status);
CREATE INDEX idx_responses_created_date ON sgc_form_responses(created_at DESC);

-- sgc_response_values
CREATE INDEX idx_values_response ON sgc_response_values(response_id);
CREATE INDEX idx_values_field ON sgc_response_values(field_id);

-- sgc_evidences
CREATE INDEX idx_evidences_response ON sgc_evidences(response_id);

-- sgc_audit_logs
CREATE INDEX idx_audit_response_date ON sgc_audit_logs(response_id, created_at DESC);

-- sgc_forms
CREATE INDEX idx_forms_module_active ON sgc_forms(module_id, is_active);
```

### 6.2 Índices para Dashboard

```sql
-- Estadísticas del día actual
CREATE INDEX idx_responses_today ON sgc_form_responses(created_at)
  WHERE created_at >= CURRENT_DATE;

-- Conteo por estado
CREATE INDEX idx_responses_status_count ON sgc_form_responses(status)
  WHERE status IN ('pendiente_revision', 'aprobado', 'rechazado', 'corregido');
```

### 6.3 Índices para Multi-Tenant (Futuro)

```sql
CREATE INDEX idx_modules_tenant ON sgc_modules(tenant_id);
CREATE INDEX idx_forms_tenant ON sgc_forms(tenant_id);
CREATE INDEX idx_responses_tenant_date ON sgc_form_responses(tenant_id, created_at DESC);
```

---

## 7. TABLAS SATÉLITE (FUTURAS)

### 7.1 sgc_equipos (BaseMantenimiento)

```sql
CREATE TABLE sgc_equipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    ubicacion TEXT,
    frecuencia_mantenimiento INTEGER, -- días entre mantenimientos
    ultimo_mantenimiento DATE,
    proximo_mantenimiento DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 sgc_mantenimiento_repuestos (BaseMantenimiento)

```sql
CREATE TABLE sgc_mantenimiento_repuestos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES sgc_form_responses(id) ON DELETE CASCADE,
    repuesto TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    costo NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 sgc_capa (BaseCalidad)

```sql
CREATE TABLE sgc_capa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES sgc_form_responses(id) ON DELETE CASCADE,
    clasificacion TEXT NOT NULL, -- 'pqr', 'nc', 'observacion', 'recall'
    severidad TEXT NOT NULL,     -- 'menor', 'mayor', 'critica'
    causa_raiz TEXT,
    accion_correctiva TEXT,
    accion_preventiva TEXT,
    responsable UUID REFERENCES profiles(id),
    fecha_compromiso DATE,
    fecha_cierre DATE,
    eficacia_verificada BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.4 sgc_documentos_control (BaseDocumental)

```sql
CREATE TABLE sgc_documentos_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    fecha_emision DATE NOT NULL,
    fecha_revision DATE,
    estado TEXT NOT NULL DEFAULT 'vigente', -- 'vigente', 'obsoleto', 'en_revision'
    aprobado_por UUID REFERENCES profiles(id),
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. VISTA MATERIALIZADA RECOMENDADA

Para consultas de historial de módulos con alto volumen de datos:

```sql
CREATE MATERIALIZED VIEW mv_module_responses AS
SELECT
  r.id,
  r.status,
  r.created_at,
  r.verified_at,
  f.id as form_id,
  f.name as form_name,
  f.module_id,
  p.id as user_id,
  p.nombre as user_name,
  p.rol as user_rol,
  COUNT(DISTINCT rv.id) as values_count,
  COUNT(DISTINCT e.id) as evidences_count,
  -- Estado computado
  CASE
    WHEN EXISTS (
      SELECT 1 FROM sgc_response_values rv2
      JOIN sgc_form_fields ff ON rv2.field_id = ff.id
      WHERE rv2.response_id = r.id
        AND ff.field_type = 'boolean' AND rv2.value_boolean = false
    ) THEN 'advertencia'
    ELSE 'cumple'
  END as computed_status
FROM sgc_form_responses r
JOIN sgc_forms f ON r.form_id = f.id
JOIN profiles p ON r.created_by = p.id
LEFT JOIN sgc_response_values rv ON r.id = rv.response_id
LEFT JOIN sgc_evidences e ON r.id = e.response_id
GROUP BY r.id, f.id, f.name, f.module_id, p.id, p.nombre, p.rol;

-- Índices para la vista
CREATE UNIQUE INDEX ON mv_module_responses(id);
CREATE INDEX ON mv_module_responses(module_id, created_at DESC);
CREATE INDEX ON mv_module_responses(status);

-- Refresh programado (cada hora)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_module_responses;
```

---

## 9. POLÍTICAS RLS (SEGURIDAD)

### 9.1 Políticas Actuales

```sql
-- Lectura pública para catálogos
CREATE POLICY "Lectura sgc_modules" ON public.sgc_modules FOR SELECT USING (true);
CREATE POLICY "Lectura sgc_forms" ON public.sgc_forms FOR SELECT USING (true);
CREATE POLICY "Lectura sgc_form_fields" ON public.sgc_form_fields FOR SELECT USING (true);

-- Escritura protegida
CREATE POLICY "Escritura sgc_audit_logs" ON public.sgc_audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

### 9.2 Políticas Recomendadas (Por Rol)

```sql
-- Solo lectura para todos los autenticados
CREATE POLICY "Lectura autenticada" ON sgc_form_responses
  FOR SELECT USING (auth.rol() IS NOT NULL);

-- Inserción para todos los roles operativos
CREATE POLICY "Inserción operativa" ON sgc_form_responses
  FOR INSERT WITH CHECK (auth.rol() IN ('administrador', 'calidad', 'operativo'));

-- Verificación solo para calidad y admin
CREATE POLICY "Verificación" ON sgc_form_responses
  FOR UPDATE USING (auth.rol() IN ('administrador', 'calidad'));

-- Auto-verificación prohibida (validación en frontend + RLS)
CREATE POLICY "No auto-verificación" ON sgc_form_responses
  FOR UPDATE WITH CHECK (
    auth.rol() IN ('administrador', 'calidad') AND
    created_by <> auth.uid()
  );
```

---

## 10. DIAGRAMA DE DEPENDENCIAS ENTRE TABLAS

```
sgc_modules
  └── sgc_forms (module_id FK)
        ├── sgc_form_fields (form_id FK)
        └── sgc_form_responses (form_id FK)
              ├── sgc_response_values (response_id FK)
              │     └── sgc_form_fields (field_id FK)
              ├── sgc_evidences (response_id FK)
              └── sgc_audit_logs (response_id FK)
                    └── profiles (modified_by FK)

TABLAS EXTERNAS:
profiles (id → sgc_form_responses.created_by)
profiles (id → sgc_form_responses.verified_by)
auth.users (id → profiles.id)

TABLAS LEGACY (sin FK al modelo EAV):
despachos
documentos
usuarios
```

---

**Documento mantenido por:** Arquitectura de Software  
**Última actualización:** Mayo 2026  
**Próxima revisión:** Julio 2026