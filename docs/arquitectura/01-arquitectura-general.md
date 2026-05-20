# ARQUITECTURA GENERAL - SGC EMPRESARIAL

**Documento:** Visión Arquitectónica Enterprise  
**Versión:** 2.0  
**Clasificación:** Documentación Técnica Estratégica  
**Sistema:** Sistema de Gestión de Calidad (SGC) DM Distribuciones

---

## 1. VISIÓN ENTERPRISE DEL SISTEMA

### 1.1 Propósito Fundamental

El SGC de DM Distribuciones es una **plataforma empresarial de gestión de calidad** diseñada para digitalizar, automatizar y auditar todos los procesos operativos, de calidad, mantenimiento y documentales de una organización industrial. El sistema opera bajo el paradigma de **configuración dinámica**, donde los formularios, flujos y reglas de negocio se definen desde un panel administrador sin requerir modificaciones de código.

### 1.2 Filosofía Arquitectónica

```
FILOSOFÍA: EXTENDER, NO REEMPLAZAR
├── El núcleo EAV es inmutable y universal
├── Los motores son plugins extensibles
├── Las tablas satélite complementan, no duplican
├── La lógica de negocio se configura, no se hardcodea
└── El sistema crece por composición, no por reescritura
```

### 1.3 Niveles de Madurez

| Nivel | Estado | Descripción |
|-------|--------|-------------|
| **Nivel 1** MVP funcional | ✅ Superado | Formularios dinámicos básicos operativos |
| **Nivel 2** Arquitectura EAV madura | ✅ Actual | Motores dinámicos, auditoría, evidencias, firmas |
| **Nivel 3** Multi-tenant SaaS | 🎯 En progreso | Aislamiento por tenant, planes, billing |
| **Nivel 4** IA aumentada | 📋 Planificado | Detección de anomalías, RAG, predictivo |
| **Nivel 5** Ecosistema global | 🗺️ Visión | API pública, marketplace, integraciones ERP/IoT |

---

## 2. ARQUITECTURA MODULAR POR CAPAS

### 2.1 Diagrama de Capas

```
┌──────────────────────────────────────────────────────────────────────┐
│                     CAPA DE PRESENTACIÓN (SPA)                        │
│                          React 19 + Vite 8                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              ORQUESTADORES DE MÓDULOS                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │  Dashboard   │  │DynamicModule │  │  Configuration   │   │   │
│  │  │   (Portal)   │  │ (Orquestador)│  │ (Admin Panel)    │   │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────────┘   │   │
│  └─────────┼──────────────────┼──────────────────────────────────┘   │
│            │                  │                                       │
│  ┌─────────▼──────────────────▼──────────────────────────────────┐   │
│  │                    MOTORES DE RENDERIZADO                       │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │   │
│  │  │ BaseChecklist│  │BaseMediciones│  │    BaseGeneric       │ │   │
│  │  │  (Boolean)   │  │  (Numeric)   │  │    (Fallback)        │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │   │
│  │  │  BaseCRUD    │  │BaseAuditoria │  │  BaseMantenimiento   │ │   │
│  │  │  (Tablas)    │  │   (Check)    │  │   (Futuro)           │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │   │
│  └──────────────────────────┬─────────────────────────────────────┘   │
│                             │                                         │
│  ┌──────────────────────────▼──────────────────────────────────────┐  │
│  │               COMPONENTES TRANSVERSALES                          │  │
│  │                                                                   │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐   │  │
│  │  │ EvidenceUpload │  │  SignaturePad  │  │ DynamicRecords   │   │  │
│  │  │   (Storage)    │  │  (Canvas/PNG)  │  │   View (Tabla)   │   │  │
│  │  └────────────────┘  └────────────────┘  └──────────────────┘   │  │
│  └──────────────────────────┬──────────────────────────────────────┘  │
│                             │                                         │
├─────────────────────────────┼────────────────────────────────────────┤
│               CAPA DE SERVICIOS (API Layer)                          │
│  ┌──────────────────────────▼──────────────────────────────────────┐  │
│  │                     dynamicService.js                            │  │
│  │                                                                   │  │
│  │  getModules() │ getModuleBySlug() │ getFormsByModule()           │  │
│  │  getFormBySlug() │ getFormFields() │ submitFormResponse()        │  │
│  │  verifyFormResponse() │ verifyMultipleFormResponses()           │  │
│  │  getAuditLogs() │ getRecentResponses() │ getDashboardStats()    │  │
│  │  getModuleResponses()                                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                     CAPA DE BACKEND (BaaS)                            │
│                          Supabase                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Auth │ PostgreSQL │ Storage │ RLS │ Edge Functions             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Descripción de Capas

#### 2.2.1 Capa de Presentación (Frontend)

**Stack**: React 19 + Vite 8 + Tailwind CSS 4 + React Router DOM 7

**Responsabilidades:**
- Renderizar interfaces de usuario responsivas (mobile, tablet, desktop)
- Orquestar la navegación SPA entre módulos
- Ejecutar motores de renderizado dinámico
- Gestionar estado local de formularios
- Capturar evidencias (cámara, galería)
- Capturar firmas digitales (Canvas HTML5)
- Validar datos en cliente antes de envío

**Principios de UI:**
- Diseño mobile-first con breakpoints en sm/md/lg
- Glassmorphism y sombras para profundidad visual
- Animaciones sutiles (fade-in, slide-in) con Tailwind
- Estados de carga (skeleton, spinner) para toda operación async
- Feedback visual inmediato (alertas, badges de estado)

#### 2.2.2 Capa de Servicios (API Layer)

**Componente**: `dynamicService.js`

**Responsabilidades:**
- Abstraer todas las operaciones de base de datos
- Centralizar lógica de negocio (submit, verify, audit)
- Manejo de errores consistente (try/catch con throw)
- Transformación de datos (tipado de valores, procesamiento)
- Auditoría automática (cada operación registra en sgc_audit_logs)

**Patrón**: Service Object (Singlenton funcional)

#### 2.2.3 Capa de Backend (BaaS)

**Plataforma**: Supabase

**Componentes:**
- **PostgreSQL 15+**: Base de datos relacional con extensiones (pgcrypto)
- **PostgREST**: API REST automática desde el esquema SQL
- **GoTrue**: Autenticación con JWT y RLS
- **Storage**: Blob storage para evidencias, firmas, documentos
- **Row Level Security (RLS)**: Seguridad a nivel de fila

---

## 3. MODELO EAV (ENTITY-ATTRIBUTE-VALUE)

### 3.1 Fundamentos del Patrón

El patrón EAV es la columna vertebral del sistema. Permite que los formularios sean **configurables desde base de datos** sin necesidad de migraciones DDL.

```
┌────────────────────────────────────────────────────────────────┐
│                    ESQUEMA EAV                                  │
│                                                                │
│  ENTIDAD: sgc_form_responses                                   │
│  ├── Representa un documento diligenciado                      │
│  ├── Metadata: quién, cuándo, estado, verificación             │
│  └── Cardinalidad: 1 respuesta → N valores                     │
│                                                                │
│  ATRIBUTO: sgc_form_fields                                     │
│  ├── Define la pregunta/campo                                 │
│  ├── Metadata: field_type, options, required, order            │
│  └── Configurable desde BD (sin migraciones)                   │
│                                                                │
│  VALOR: sgc_response_values                                    │
│  ├── Contiene el dato real                                     │
│  ├── Columnas tipadas: value_text, value_number,               │
│  │   value_boolean, value_json                                 │
│  └── Cada campo genera exactamente un valor por respuesta      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Ventajas del Patrón EAV en SGC

| Ventaja | Impacto | Evidencia Técnica |
|---------|---------|-------------------|
| **Sin migraciones DDL** | Nuevos formularios en minutos | Solo INSERT en sgc_forms + sgc_form_fields |
| **Escalabilidad horizontal** | Crecimiento ilimitado de tipos de formularios | No hay límite de columnas por tabla |
| **Configuración desde UI** | Usuarios no-técnicos crean formularios | Panel administrador → BD → Frontend |
| **Versionamiento implícito** | Datos históricos no se rompen | Cambios en fields no afectan responses antiguas |
| **Reutilización de componentes** | Un solo DynamicForm sirve para todo | engine_type decide el motor |

### 3.3 Limitaciones del Modelo EAV (Mitigadas)

| Limitación | Riesgo | Mitigación Implementada |
|------------|--------|-------------------------|
| **Performance en queries** | JOINs múltiples lentos con millones de registros | Columnas tipadas (value_text, value_number, value_boolean) + índices compuestos planeados |
| **Validación de tipos** | Datos inconsistentes si no se controla | Tipado en frontend + validación en dynamicService.submitFormResponse() |
| **Complejidad de reports** | Consultas complejas para analytics | Vistas materializadas planeadas (mv_module_responses) |
| **Integridad referencial** | Huérfanos si se eliminan campos | ON DELETE CASCADE en todas las FK |

---

## 4. SUPABASE COMO BACKEND

### 4.1 Rol de Supabase en la Arquitectura

Supabase actúa como **Backend as a Service (BaaS)** completo, eliminando la necesidad de un backend tradicional:

```
┌────────────────────────────────────────────────────┐
│                  SUPABASE                          │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  PostgreSQL 15+ (Base de Datos)             │   │
│  │  ├── Tablas EAV (sgc_*)                    │   │
│  │  ├── Tablas de negocio (despachos, docs)   │   │
│  │  ├── Índices y constraints                 │   │
│  │  ├── Row Level Security (RLS)              │   │
│  │  └── Extensiones (pgcrypto)                │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  Authentication (GoTrue)                    │   │
│  │  ├── JWT Tokens                            │   │
│  │  ├── Manejo de sesiones                    │   │
│  │  └── Integración con RLS                   │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  Storage (S3-compatible)                   │   │
│  │  ├── Evidencias fotográficas               │   │
│  │  ├── Firmas digitales (PNG)                │   │
│  │  ├── Documentos PDF                        │   │
│  │  └── Bucket: documentos-sgc               │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  PostgREST (API Automática)                │   │
│  │  ├── Endpoints REST desde tablas           │   │
│  │  ├── Filtros, paginación, joins           │   │
│  │  └── Cliente JavaScript (@supabase/supabase-js) │
│  └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

### 4.2 Row Level Security (RLS)

RLS es el mecanismo de seguridad a nivel de base de datos que garantiza que cada usuario solo vea/modifique los datos que le corresponden.

**Políticas actuales:**
```sql
-- Políticas de lectura abiertas para todos los usuarios autenticados
CREATE POLICY "Lectura sgc_modules" ON public.sgc_modules FOR SELECT USING (true);
CREATE POLICY "Lectura sgc_forms" ON public.sgc_forms FOR SELECT USING (true);
CREATE POLICY "Lectura sgc_form_fields" ON public.sgc_form_fields FOR SELECT USING (true);

-- Escritura protegida por autenticación
CREATE POLICY "Escritura sgc_audit_logs" ON public.sgc_audit_logs 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

**Mejoras planificadas:**
- Políticas por rol (`administrador`, `calidad`, `operativo`)
- Aislamiento por tenant para arquitectura multiempresa
- Restricción de auto-verificación (no verificar propios registros)

### 4.3 Supabase Storage

**Bucket**: `documentos-sgc`

**Almacena:**
- Evidencias fotográficas (evidencias/*)
- Firmas digitales (firmas/*)
- Documentos PDF (documentos/*)

**Flujo de subida:**
```
1. Usuario selecciona archivo (input file / cámara)
2. EvidenceUploader.jsx genera fileName único (random + timestamp)
3. Upload a Supabase Storage → documentos-sgc/evidencias/fileName
4. getPublicUrl() genera URL pública
5. Se almacena { file_url, storage_path, file_type } en sgc_evidences
```

**Optimizaciones pendientes:**
- Compresión de imágenes en cliente (browser-image-compression)
- Thumbnails para vista previa rápida
- Validación de MIME type (magic bytes)
- Límite de tamaño de archivo

---

## 5. RENDERIZADO DINÁMICO

### 5.1 Ciclo Completo de Renderizado

```
FASE 1: CONFIGURACIÓN (Panel Administrador)
├── Admin crea módulo → sgc_modules
├── Admin crea formulario → sgc_forms (engine_type, roles_allowed)
└── Admin define campos → sgc_form_fields (field_type, options, required)

FASE 2: NAVEGACIÓN (Usuario)
├── Dashboard carga módulos → getModules()
├── Usuario selecciona módulo → DynamicModule.jsx
├── Carga formularios del módulo → getFormsByModule()
└── Usuario selecciona formulario → navega a /modulo/:slug/:formSlug

FASE 3: CARGA DE FORMULARIO (DynamicForm.jsx)
├── getFormBySlug(slug) → formDef
├── Validación de roles → formDef.roles_allowed.includes(rol)
├── getFormFields(formId) → fields[]
├── Inicialización de estado → values, evidences
└── Selección de motor → switch(engine_type)

FASE 4: RENDERIZADO (Motor)
├── Motor recibe: { fields, values, onChange }
├── Renderiza cada campo según field_type
├── Boolean → Radio buttons (Cumple/No Cumple)
├── Number → Input con validación de rango
├── Signature → SignaturePad (Canvas → PNG)
├── Text → Textarea
└── Conditional validation → useEffect detecta críticos

FASE 5: VALIDACIÓN Y ENVÍO
├── Validar campos requeridos
├── Validar evidencias obligatorias (si hay críticos)
├── Validar observaciones obligatorias (si hay críticos)
├── Procesar valores (parseFloat para numbers)
├── submitFormResponse(formId, userId, values, evidences)
└── Auditoría automática → sgc_audit_logs (action_type='create')

FASE 6: VISUALIZACIÓN (DynamicRecordsView.jsx)
├── getModuleResponses(moduleId) → registros con JOINs
├── Procesamiento de estado computado (computedStatus)
├── Filtros por estado, fecha, texto
├── Modal de detalles con pestañas (Respuestas / Auditoría)
└── Verificación (si rol = admin/calidad y no es propio)
```

### 5.2 Orquestador Principal: DynamicForm.jsx

**Ubicación**: `src/pages/DynamicForm.jsx`

**Responsabilidades:**
1. Cargar definición del formulario desde BD
2. Validar permisos del usuario contra roles_allowed
3. Inicializar estado del formulario
4. Seleccionar motor según engine_type
5. Ejecutar validaciones condicionales en tiempo real
6. Coordinar el flujo de envío con evidencias
7. Redirigir al módulo tras éxito

**Flujo de estados:**
```
[LOADING] → [FORM] → [SAVING] → [SUCCESS] → REDIRECT
    ↓                      ↓
[ERROR]                [ERROR]
```

**Mecanismo de Validación Condicional:**
```javascript
useEffect(() => {
  let hasCriticals = false;
  fields.forEach(f => {
    // Boolean false → crítico
    if (f.field_type === 'boolean' && values[f.id] === false) hasCriticals = true;
    // Number fuera de rango → crítico
    if (f.field_type === 'number' && values[f.id] !== '') {
      const val = parseFloat(values[f.id]);
      if (val < f.options?.min || val > f.options?.max) hasCriticals = true;
    }
  });
  setEvidenceRequired(hasCriticals);
}, [values, fields]);
```

### 5.3 Servicio Central: dynamicService.js

**Ubicación**: `src/services/dynamicService.js`

**Métodos y responsabilidades:**

| Método | Propósito | Tablas Involucradas |
|--------|-----------|---------------------|
| `getModules()` | Cargar módulos activos | sgc_modules |
| `getModuleBySlug(slug)` | Obtener módulo por ruta | sgc_modules |
| `getFormsByModule(moduleId)` | Formularios de un módulo | sgc_forms |
| `getFormBySlug(slug)` | Obtener formulario por ruta | sgc_forms |
| `getFormFields(formId)` | Campos de un formulario | sgc_form_fields |
| `submitFormResponse(formId, userId, values, evidences)` | Guardar respuesta + valores + evidencias + auditoría | sgc_form_responses, sgc_response_values, sgc_evidences, sgc_audit_logs |
| `verifyFormResponse(responseId, userId, status, comment)` | Verificar un registro | sgc_form_responses, sgc_audit_logs |
| `verifyMultipleFormResponses(responseIds, userId, status, comment)` | Verificación masiva | sgc_form_responses, sgc_audit_logs |
| `getAuditLogs(responseId)` | Historial de auditoría | sgc_audit_logs, profiles |
| `getRecentResponses(limit)` | Últimos registros (Dashboard) | sgc_form_responses, sgc_forms |
| `getDashboardStats()` | Estadísticas del dashboard | sgc_form_responses |
| `getModuleResponses(moduleId)` | Todos los registros de un módulo | sgc_form_responses + 5 JOINs |

**Patrón de cada método:**
```javascript
async methodName(params) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('filter', value);
  if (error) throw error;
  return data;
}
```

**Transaccionalidad en submitFormResponse:**
```
1. INSERT sgc_form_responses → response.id
2. INSERT sgc_response_values (batch)
3. INSERT sgc_evidences (batch)
4. INSERT sgc_audit_logs (auditoría)
```

**Nota importante**: No hay transaccionalidad real (PostgreSQL BEGIN/COMMIT). Cada INSERT es independiente. Si falla el paso 3, los pasos 1 y 2 ya se ejecutaron. Esto es un riesgo conocido con mitigación planificada (Edge Functions con transacciones).

### 5.4 Visualizador: DynamicRecordsView.jsx

**Ubicación**: `src/components/DynamicRecordsView.jsx`

**Responsabilidades:**
1. Cargar todos los registros de un módulo con JOINs
2. Computar estado dinámico (cumple/advertencia/crítico)
3. Renderizar tabla con filtros (todos, hoy, pendientes, aprobados, rechazados, críticos)
4. Modal de detalle con pestañas (Respuestas / Auditoría)
5. Verificación individual y masiva
6. Segregación de funciones (no auto-verificación)

**Estado Computado:**
```javascript
const processed = data.map(record => {
  let status = 'cumple';
  let criticalIssues = [];
  record.sgc_response_values?.forEach(val => {
    const field = val.sgc_form_fields;
    if (field.field_type === 'boolean' && val.value_boolean === false) {
      status = status === 'critico' ? 'critico' : 'advertencia';
      criticalIssues.push(`${field.label} (No Cumple)`);
    }
    if (field.field_type === 'number' && val.value_number !== null) {
      if (val.value_number < field.options?.min || val.value_number > field.options?.max) {
        status = 'critico';
        criticalIssues.push(`${field.label} fuera de rango`);
      }
    }
  });
  return { ...record, computedStatus: status, criticalIssues };
});
```

---

## 6. FILOSOFÍA DE EXTENSIBILIDAD

### 6.1 Principio OCP (Open/Closed Principle)

El sistema está diseñado para estar **abierto a extensiones pero cerrado a modificaciones**.

**Cómo se aplica:**
```
┌────────────────────────────────────────────────────┐
│ EXTENSIÓN: Nuevo Motor                             │
│                                                    │
│ 1. Crear componente: src/components/engines/       │
│    └── BaseMantenimiento.jsx                       │
│                                                    │
│ 2. Registrar en DynamicForm.jsx:                   │
│    └── case 'BaseMantenimiento':                   │
│          return <BaseMantenimiento {...props} />    │
│                                                    │
│ 3. Configurar en BD:                               │
│    └── sgc_forms.engine_type = 'BaseMantenimiento' │
│                                                    │
│ 4. SIN MODIFICAR:                                  │
│    ├── DynamicForm.jsx (solo agregar case)         │
│    ├── dynamicService.js                           │
│    ├── Tablas EAV existentes                       │
│    └── Flujo de validación/envío                   │
└────────────────────────────────────────────────────┘
```

### 6.2 Tablas Satélite

Cuando un motor requiere datos especializados que el modelo EAV genérico no cubre eficientemente, se crean **tablas satélite** relacionadas por `response_id`.

**Principios:**
- La tabla satélite se relaciona 1:1 o 1:N con `sgc_form_responses`
- Nunca reemplazan el modelo EAV, lo complementan
- Se crean solo cuando hay justificación de performance o modelo de datos complejo
- El motor correspondiente gestiona la lectura/escritura

**Ejemplos:**
```sql
-- Mantenimiento: equipos y repuestos
sgc_equipos → sgc_mantenimiento_repuestos → sgc_form_responses

-- Calidad: CAPA (Corrective and Preventive Actions)
sgc_capa → sgc_form_responses

-- Documental: control de versiones
sgc_documentos_control → sgc_form_responses
```

### 6.3 EngineRegistry (Futuro)

Se planea implementar un registro formal de motores:

```javascript
// src/components/engines/EngineRegistry.js
const ENGINE_REGISTRY = {
  'BaseChecklist': () => import('./BaseChecklist'),
  'BaseMediciones': () => import('./BaseMediciones'),
  'BaseCRUD': () => import('./BaseCRUD'),
  'BaseAuditoria': () => import('./BaseAuditoria'),
  'BaseMantenimiento': () => import('./BaseMantenimiento'),
  'BaseCalidad': () => import('./BaseCalidad'),
  'BaseDocumental': () => import('./BaseDocumental'),
  'BaseGeneric': () => import('./BaseGeneric')
};

export async function loadEngine(engineType) {
  const loader = ENGINE_REGISTRY[engineType] || ENGINE_REGISTRY['BaseGeneric'];
  const module = await loader();
  return module.default;
}
```

---

## 7. COMPATIBILIDAD FUTURA SAAS

### 7.1 Arquitectura Multi-Tenant

El sistema está diseñado para evolucionar a SaaS multiempresa. La preparación incluye:

```
ESTRATEGIA DE MULTI-TENANCY
├── Aislamiento por tenant_id (fila)
│   └── Todas las tablas tendrán tenant_id UUID
│
├── RLS policies por tenant
│   └── CREATE POLICY "tenant_isolation" ON sgc_*
│       FOR ALL USING (tenant_id = get_current_tenant())
│
├── Gestión de tenants
│   └── Tabla tenants con plan, límites, features
│
├── Subdominios o rutas por tenant
│   └── empresa1.dmcalidad.com / empresa2.dmcalidad.com
│
└── Facturación por plan
    └── Stripe integration + límites de uso
```

### 7.2 Consideraciones Actuales para SaaS

| Aspecto | Estado Actual | Acción Necesaria |
|---------|---------------|------------------|
| Aislamiento de datos | Sin tenant_id | Agregar tenant_id a todas las tablas |
| RLS por tenant | Políticas globales | Refinar políticas con tenant_isolation |
| Límites por plan | No implementado | Crear tabla de planes y validaciones |
| Onboarding | Manual | Crear wizard de onboarding multiempresa |
| Personalización | Sin soporte | Logo, colores, módulos por tenant |

---

## 8. LEGACY Y CONVIVENCIA

### 8.1 Módulo de Trazabilidad (Legacy)

El módulo de **Trazabilidad (despachos)** se construyó previamente con arquitectura estática y tablas dedicadas (`despachos`). Por decisión arquitectónica:

- **NO se ha migrado** al modelo EAV
- **Coexiste** en la misma SPA sin conflicto
- **No comparte** lógica dinámica con DynamicForm

**Ruta**: `/trazabilidad` (manejada aparte en el Router)
**Excepción en DynamicModule**: Si `moduleSlug === 'trazabilidad'`, redirige a la ruta legacy.

### 8.2 Tablas Legacy

```sql
-- Tabla despachos (trazabilidad legacy)
CREATE TABLE public.despachos (
  id UUID PRIMARY KEY,
  fecha DATE, hora TEXT, cliente TEXT,
  producto TEXT, lote TEXT, cantidad_bolsas NUMERIC,
  peso NUMERIC, destino TEXT, placa TEXT,
  conductor TEXT, observaciones TEXT, estado TEXT
);

-- Tabla documentos (metadatos de PDF)
CREATE TABLE public.documentos (
  id UUID PRIMARY KEY,
  modulo TEXT, nombre TEXT, url TEXT, tipo TEXT, fecha DATE
);

-- Tabla usuarios (perfiles precargados)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY,
  nombre TEXT, email TEXT UNIQUE, rol TEXT
);
```

**Estrategia**: Estas tablas permanecen sin modificar hasta que se decida su migración al modelo EAV o su reemplazo por tablas satélite.

---

## 9. MAPA DE DEPENDENCIAS ENTRE COMPONENTES

```
                        ┌──────────────────┐
                        │   Dashboard      │
                        │   (Portal)       │
                        └────────┬─────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    DynamicModule        │
                    │   (Orquestador Módulo)  │
                    └────┬────────────┬───────┘
                         │            │
              ┌──────────▼──┐  ┌──────▼─────────┐
              │ DynamicForm │  │DynamicRecords   │
              │ (Orquestador│  │View (Historial) │
              │ Motor)      │  └──────┬──────────┘
              └──────┬──────┘         │
                     │                │
          ┌──────────┼──────────┐     │
          │          │          │     │
    ┌─────▼──┐ ┌────▼───┐ ┌───▼──┐  │
    │Base    │ │Base    │ │Base  │  │
    │Checklist│ │Medicion│ │Generic│  │
    └────┬───┘ └────┬───┘ └───┬──┘  │
         │          │         │      │
         └──────────┼─────────┘      │
                    │                │
          ┌─────────▼────────────────▼──┐
          │      dynamicService.js      │
          │     (API Layer Central)     │
          └─────────────┬───────────────┘
                        │
          ┌─────────────▼───────────────┐
          │       Supabase Client       │
          │    (@supabase/supabase-js)  │
          └─────────────────────────────┘

COMPONENTES TRANSVERSALES:
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ EvidenceUpload │  │  SignaturePad  │  │   useAuth      │
│   (Storage)    │  │  (Canvas/PNG)  │  │   (Hook)       │
└────────────────┘  └────────────────┘  └────────────────┘
```

---

## 10. RIESGOS ARQUITECTÓNICOS IDENTIFICADOS

| ID | Riesgo | Severidad | Impacto | Mitigación |
|----|--------|-----------|---------|------------|
| **ARQ-01** | Dependencia total de Supabase (Vendor Lock-in) | 🔴 Alta | Caída total del sistema si Supabase falla | Capa de abstracción, caché local IndexedDB, modo offline |
| **ARQ-02** | dynamicService.js como SPOF | 🔴 Alta | Toda operación de datos depende de un solo archivo | Retry logic, circuit breaker, fallback a caché |
| **ARQ-03** | Sin transaccionalidad real en submit | 🟡 Media | Datos huérfanos si falla un paso intermedio | Edge Functions con transacciones PostgreSQL |
| **ARQ-04** | Sin paginación en getModuleResponses | 🟡 Media | Timeout con >100K registros | Paginación con range(), vistas materializadas |
| **ARQ-05** | Sin compresión de evidencias | 🟡 Media | Costos elevados de storage, lentitud en carga | browser-image-compression, thumbnails |
| **ARQ-06** | Queries N+1 en getModuleResponses | 🟡 Media | Degradación de performance con JOINs múltiples | Índices compuestos, vistas materializadas |
| **ARQ-07** | Sin control de concurrencia | 🟡 Media | Last Write Wins en ediciones simultáneas | Optimistic locking con version column |
| **ARQ-08** | Sin tenant_id en esquema actual | 🟡 Media | Migración compleja a multi-tenant | Planificar migración con defaults |
| **ARQ-09** | Sin pruebas automatizadas | 🟡 Alta | Riesgo de regresiones en cada cambio | Vitest + Playwright planificados |
| **ARQ-10** | RLS policies muy permisivas | 🟡 Media | Exposición de datos entre usuarios | Refinar políticas por rol y tenant |

---

## 11. PRÓXIMOS PASOS ARQUITECTÓNICOS

### Prioridad Inmediata (Q2 2026)

1. **Paginación en DynamicRecordsView** — Implementar range() en getModuleResponses
2. **Índices compuestos** — Crear índices en sgc_form_responses(form_id, created_at DESC)
3. **Compresión de imágenes** — Integrar browser-image-compression en EvidenceUploader
4. **Refinar RLS** — Políticas por rol (admin, calidad, operativo)

### Corto Plazo (Q3 2026)

5. **EngineRegistry** — Implementar registro formal de motores con lazy loading
6. **Tablas satélite** — Crear sgc_equipos, sgc_mantenimiento_repuestos
7. **Testing** — Vitest para dynamicService, Playwright para flujos E2E
8. **Monitoreo** — Integrar Sentry para captura de errores

### Mediano Plazo (Q4 2026)

9. **Multi-tenant** — Agregar tenant_id, tabla tenants, RLS policies
10. **Concurrencia** — Optimistic locking con version column
11. **Caché** — Redis/Upstash para módulos y formularios
12. **Vistas materializadas** — mv_module_responses para reports

---

**Documento mantenido por:** Arquitectura de Software  
**Última actualización:** Mayo 2026  
**Próxima revisión:** Julio 2026