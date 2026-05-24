# ANÁLISIS ARQUITECTÓNICO ENTERPRISE - SGC DM DISTRIBUCIONES

**Documento:** Análisis Técnico Profesional  
**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Autor:** Arquitecto de Software Senior  
**Clasificación:** Documentación Técnica Estratégica

---

## RESUMEN EJECUTIVO

El Sistema de Gestión de Calidad (SGC) de DM Distribuciones representa una **arquitectura empresarial madura** basada en el patrón **EAV (Entity-Attribute-Value)** con motores de renderizado dinámico. El sistema está diseñado para escalabilidad horizontal, cumplimiento normativo (INVIMA/ISO/BPM) y preparación para integración con IA.

**Estado Actual:** Sistema funcional en producción con arquitectura sólida y extensible.

**Nivel de Madurez Técnica:** 7.5/10 (Enterprise-Ready con oportunidades de optimización)

---

## RESTRICCIONES ARQUITECTÓNICAS OBLIGATORIAS

Este documento establece las **restricciones arquitectónicas vinculantes** que deben respetarse en toda modificación, extensión o mantenimiento del sistema. Estas reglas son de cumplimiento obligatorio para garantizar la integridad, escalabilidad y mantenibilidad del SGC.

### NO PERMITIDO

| # | Restricción | Justificación |
|---|-------------|---------------|
| 🚫 | **NO** crear lógica duplicada | Duplicar lógica incrementa la deuda técnica, dificulta el mantenimiento y multiplica los puntos de fallo. Toda lógica debe centralizarse en servicios reutilizables. |
| 🚫 | **NO** crear componentes aislados que rompan el flujo dinámico | Todos los componentes deben integrarse al ecosistema de motores dinámicos (`EngineRegistry`). Un componente aislado no puede beneficiarse de actualizaciones, auditoría ni validaciones centralizadas. |
| 🚫 | **NO** convertir formularios dinámicos en formularios hardcodeados | La esencia del sistema es su capacidad de configuración desde el panel administrador. Hardcodear un formulario destruye la flexibilidad EAV y obliga a migraciones innecesarias. |
| 🚫 | **NO** crear tablas innecesarias si el EAV actual puede resolverlo | Antes de crear una nueva tabla, evaluar si el modelo EAV existente (`sgc_form_responses` + `sgc_response_values`) puede cubrir el requerimiento. Solo crear tablas satélite cuando haya justificación de performance o modelo de datos complejo. |
| 🚫 | **NO** mover lógica crítica fuera de `dynamicService.js` sin justificación arquitectónica | `dynamicService.js` es el punto central de toda operación de datos. Sacar lógica de él sin una razón arquitectónica válida (ej: rendimiento comprobado, nuevo motor independiente) fragmenta la capa de servicios y crea SPOFs adicionales. |
| 🚫 | **NO** romper compatibilidad con: **Supabase, RLS, Storage, firmas, evidencias, auditoría, renderizado dinámico** | Cualquier cambio debe preservar la compatibilidad total con todos estos subsistemas. Romper cualquiera de ellos compromete la seguridad, trazabilidad o funcionalidad central del producto. |
| 🚫 | **NO** crear soluciones temporales no escalables | Toda solución implementada debe considerar escalabilidad horizontal desde el diseño inicial. Los "parches temporales" tienden a volverse permanentes y generan deuda técnica crítica. |

### PRINCIPIOS DE DISEÑO

Cada nueva funcionalidad debe cumplir obligatoriamente con los siguientes principios:

| # | Principio | Descripción | Criterio de Aceptación |
|---|-----------|-------------|------------------------|
| ✅ | **Reutilización máxima** | La funcionalidad debe aprovechar componentes, servicios y motores existentes antes de crear nuevo código | No más de 20% de código nuevo si existe funcionalidad análoga |
| ✅ | **Escalabilidad horizontal** | El diseño debe soportar crecimiento sin cambios arquitectónicos | Soportar 10x el volumen actual sin modificar estructura |
| ✅ | **Compatibilidad móvil/tablet** | Toda interfaz debe funcionar en dispositivos táctiles | Responsive design obligatorio, touch events soportados |
| ✅ | **IA-ready** | Los datos deben estar estructurados para consumo por modelos de IA | Metadatos completos, embeddings generables, datos semanticamente anotables |
| ✅ | **Auditabilidad completa** | Toda acción sobre datos debe ser trazable | Registro en `sgc_audit_logs` con quién, qué, cuándo y por qué |
| ✅ | **Bajo acoplamiento** | Los módulos deben depender de contratos (interfaces), no de implementaciones concretas | Cambios en un motor no deben afectar a otros motores ni al orquestador |
| ✅ | **Alta mantenibilidad** | El código debe ser autodocumentado, con naming consistente y estructura predecible | Cumplimiento de guía de estilo, tests unitarios obligatorios |
| ✅ | **Configuración desde panel administrador** | Todo comportamiento dinámico debe ser configurable desde UI administrativa | Sin valores hardcodeados para engine_type, roles, campos, opciones |
| ✅ | **Compatibilidad futura SaaS multiempresa** | El diseño debe contemplar aislamiento por tenant | `tenant_id` considerado en esquemas, RLS policies y particionamiento |
| ✅ | **Rendimiento sobre grandes volúmenes de registros** | Las queries deben optimizarse para conjuntos de datos masivos | Paginación obligatoria, índices compuestos, vistas materializadas disponibles |

### PRIORIDAD ACTUAL DEL PROYECTO

La prioridad **NO** es agregar módulos visuales rápidamente. La prioridad es:

```
🏗️ CONSOLIDACIÓN ARQUITECTÓNICA (Prioridad Actual)
├── 1. Consolidar arquitectura existente
│   ├── Refinar capa de servicios
│   ├── Estandarizar manejo de errores
│   └── Unificar patrones de estado
│
├── 2. Estandarizar motores dinámicos
│   ├── EngineRegistry formal
│   ├── Contratos de motor (propTypes/TypeScript)
│   └── Hooks compartidos entre motores
│
├── 3. Diseñar documentación técnica
│   ├── Este documento (Análisis Arquitectónico)
│   ├── Guía de contribución (CONTRIBUTING.md)
│   ├── Guía de estilo (STYLE_GUIDE.md)
│   └── Documentación de API
│
├── 4. Preparar tablas satélite escalables
│   ├── Evaluar qué tablas satélite crear
│   ├── Diseñar con tenant_id y particionamiento desde origen
│   └── Índices y constraints desde creación
│
├── 5. Crear estructura enterprise
│   ├── Multi-tenant readiness
│   ├── RLS policies por tenant
│   └── Aislamiento de datos
│
├── 6. Preparar compatibilidad IA
│   ├── Embeddings en respuestas
│   ├── Data Lake para analytics
│   └── APIs de predicción
│
└── 7. Garantizar mantenibilidad a largo plazo
    ├── Testing automatizado
    ├── Monitoreo (Sentry)
    ├── Backups automáticos
    └── Documentación viva
```

### ENFOQUE DE ANÁLISIS

Antes de proponer cambios en el sistema, se debe seguir este proceso de evaluación obligatorio:

```
┌─────────────────────────────────────────────────────────────┐
│ PROCESO DE ANÁLISIS PREVIO A CUALQUIER CAMBIO              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ PASO 1: ANALIZAR REUTILIZACIÓN EXISTENTE                    │
│ ├── ¿Existe un motor que ya resuelva este caso?             │
│ ├── ¿Existe un componente similar en el código?              │
│ ├── ¿dynamicService.js ya tiene un método para esto?        │
│ └── ¿Se puede extender en lugar de crear?                   │
│                                                              │
│ PASO 2: DETECTAR PATRONES REPETIDOS                         │
│ ├── ¿Este mismo patrón aparece en otros formularios?        │
│ ├── ¿Se puede abstraer a un hook o utilidad compartida?     │
│ └── ¿El EngineRegistry puede cubrirlo genéricamente?        │
│                                                              │
│ PASO 3: DETECTAR COMPONENTES REUTILIZABLES                  │
│ ├── ¿Partes de esta funcionalidad ya existen?               │
│ ├── ¿Se puede parametrizar un componente existente?         │
│ └── ¿EvidenceUploader, SignaturePad cubren necesidades?    │
│                                                              │
│ PASO 4: DETECTAR POSIBLES CUELLOS DE BOTELLA               │
│ ├── ¿La solución propuesta escala a 100K registros?        │
│ ├── ¿Hay queries sin índices en el nuevo flujo?             │
│ └── ¿El almacenamiento de evidencias está optimizado?       │
│                                                              │
│ PASO 5: DETECTAR RIESGOS DE ESCALABILIDAD                   │
│ ├── ¿La solución soporta multi-tenant?                      │
│ ├── ¿Las RLS policies cubren el nuevo caso de uso?         │
│ └── ¿Hay dependencias externas no controladas?              │
│                                                              │
│ PASO 6: DETECTAR FUTURAS LIMITACIONES DEL MODELO EAV       │
│ ├── ¿El modelo EAV actual soporta este requerimiento?       │
│ ├── ¿Se necesita una tabla satélite o vista materializada?  │
│ └── ¿La consulta de datos será eficiente a largo plazo?    │
│                                                              │
│ PASO 7: DETECTAR OPORTUNIDADES PARA MOTORES UNIVERSALES    │
│ ├── ¿Esto podría ser un nuevo motor reutilizable?           │
│ ├── ¿Otros módulos podrían beneficiarse de este motor?     │
│ └── ¿El motor se registra en EngineRegistry?               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### PLANTILLA DE JUSTIFICACIÓN OBLIGATORIA

Toda propuesta de cambio debe incluir esta justificación estructurada:

```markdown
## JUSTIFICACIÓN DE CAMBIO ARQUITECTÓNICO

**Propósito:** [Descripción clara del cambio propuesto]

**Impacto:**
- ¿Qué componentes/servicios/tablas se modifican?
- ¿Qué motores se ven afectados?
- ¿Qué dependencias se agregan o modifican?

**Escalabilidad:**
- ¿Soporta 10x el volumen actual?
- ¿Requiere nuevas tablas o índices?
- ¿Es multi-tenant compatible?

**Compatibilidad:**
- ¿Respeta el flujo dinámico EAV?
- ¿Es compatible con RLS, Storage, auditoría?
- ¿Se integra con dynamicService.js?

**Mantenibilidad:**
- ¿El código sigue los principios de diseño establecidos?
- ¿Hay tests que cubren el cambio?
- ¿Está documentado?

**Riesgo Arquitectónico:**
- ¿Qué pasa si este cambio falla?
- ¿Es reversible?
- ¿Cuál es el plan de rollback?
```

---

## 1. MAPA ARQUITECTÓNICO GENERAL

### 1.1 Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN (SPA)                    │
│                         React 18 + Vite                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │ DynamicModule│  │ DynamicForm  │          │
│  │   (Portal)   │  │ (Orquestador)│  │(Renderizador)│          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                  │
│                            │                                      │
│                    ┌───────▼────────┐                           │
│                    │ dynamicService │                           │
│                    │  (API Layer)   │                           │
│                    └───────┬────────┘                           │
├────────────────────────────┼─────────────────────────────────────┤
│                    CAPA DE BACKEND (BaaS)                        │
│                         Supabase                                 │
├────────────────────────────┼─────────────────────────────────────┤
│                            │                                      │
│  ┌─────────────────────────▼──────────────────────────┐         │
│  │         ARQUITECTURA EAV (PostgreSQL)              │         │
│  │                                                     │         │
│  │  ┌──────────────┐  ┌──────────────┐              │         │
│  │  │ sgc_modules  │  │  sgc_forms   │              │         │
│  │  │  (Entities)  │  │  (Entities)  │              │         │
│  │  └──────┬───────┘  └──────┬───────┘              │         │
│  │         │                  │                       │         │
│  │  ┌──────▼──────────────────▼───────┐             │         │
│  │  │     sgc_form_fields              │             │         │
│  │  │      (Attributes)                │             │         │
│  │  └──────┬───────────────────────────┘             │         │
│  │         │                                          │         │
│  │  ┌──────▼──────────────────────────┐             │         │
│  │  │   sgc_form_responses             │             │         │
│  │  │   (Response Entities)            │             │         │
│  │  └──────┬───────────────────────────┘             │         │
│  │         │                                          │         │
│  │  ┌──────▼──────────────────────────┐             │         │
│  │  │   sgc_response_values            │             │         │
│  │  │        (Values)                  │             │         │
│  │  └──────────────────────────────────┘             │         │
│  │                                                     │         │
│  │  ┌─────────────────┐  ┌──────────────────┐       │         │
│  │  │ sgc_evidences   │  │ sgc_audit_logs   │       │         │
│  │  │   (Attachments) │  │  (Traceability)  │       │         │
│  │  └─────────────────┘  └──────────────────┘       │         │
│  └─────────────────────────────────────────────────────┘         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐         │
│  │         SUPABASE STORAGE (Blob Storage)             │         │
│  │  • Evidencias fotográficas                          │         │
│  │  • Firmas digitales                                 │         │
│  │  • Documentos PDF                                   │         │
│  └─────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Stack Tecnológico Completo

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Frontend Core** | React | 19.2.5 | UI Framework |
| **Build Tool** | Vite | 8.0.10 | Bundler & Dev Server |
| **Routing** | React Router DOM | 7.14.2 | SPA Navigation |
| **Styling** | Tailwind CSS | 4.2.4 | Utility-First CSS |
| **Icons** | Lucide React | 1.14.0 | Icon System |
| **Backend** | Supabase | 2.105.1 | BaaS Platform |
| **Database** | PostgreSQL | 15+ | Relational DB |
| **Auth** | Supabase Auth | - | JWT Authentication |
| **Storage** | Supabase Storage | - | Blob Storage |
| **PDF Generation** | jsPDF | 4.2.1 | Client-side PDF |
| **Excel** | XLSX | 0.18.5 | Import/Export |
| **Date Utils** | date-fns | 4.1.0 | Date Manipulation |

---

## 2. FLUJO COMPLETO DE RENDERIZADO DINÁMICO

### 2.1 Ciclo de Vida del Formulario Dinámico

```
FASE 1: CONFIGURACIÓN (Base de Datos)
┌─────────────────────────────────────────────────────────────┐
│ 1. Administrador crea módulo en sgc_modules                 │
│    - name: "Operaciones"                                     │
│    - slug: "operaciones"                                     │
│    - icon: "Sparkles"                                        │
│                                                              │
│ 2. Administrador crea formulario en sgc_forms               │
│    - module_id: [UUID del módulo]                           │
│    - name: "Checklist de Limpieza"                          │
│    - slug: "limpieza-diaria"                                │
│    - engine_type: "BaseChecklist"  ← CRÍTICO                │
│    - roles_allowed: ['administrador', 'operativo']          │
│                                                              │
│ 3. Administrador define campos en sgc_form_fields           │
│    - form_id: [UUID del formulario]                         │
│    - name: "area_recepcion"                                 │
│    - label: "Área de Recepción limpia"                      │
│    - field_type: "boolean"                                  │
│    - required: true                                         │
│    - order_index: 1                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
FASE 2: NAVEGACIÓN (Usuario Final)
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario accede a Dashboard                               │
│    Route: /                                                  │
│    Component: Dashboard.jsx                                  │
│                                                              │
│ 2. Usuario selecciona módulo "Operaciones"                  │
│    Route: /operaciones                                       │
│    Component: DynamicModule.jsx                              │
│    Action: dynamicService.getModuleBySlug('operaciones')    │
│                                                              │
│ 3. Sistema carga formularios del módulo                     │
│    Action: dynamicService.getFormsByModule(moduleId)        │
│    Filtro: roles_allowed.includes(user.rol)                 │
│                                                              │
│ 4. Usuario selecciona "Checklist de Limpieza"              │
│    Route: /modulo/operaciones/limpieza-diaria               │
│    Component: DynamicForm.jsx                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
FASE 3: RENDERIZADO DINÁMICO (Motor de Formularios)
┌─────────────────────────────────────────────────────────────┐
│ DynamicForm.jsx (Orquestador Principal)                     │
│                                                              │
│ 1. useEffect: Carga definición del formulario               │
│    const form = await dynamicService.getFormBySlug(slug)    │
│    const fields = await dynamicService.getFormFields(id)    │
│                                                              │
│ 2. Validación de permisos                                   │
│    if (!form.roles_allowed.includes(rol)) → redirect        │
│                                                              │
│ 3. Inicialización de estado                                 │
│    const [values, setValues] = useState({})                 │
│    const [evidences, setEvidences] = useState([])           │
│                                                              │
│ 4. Selección de motor según engine_type                     │
│    switch (formDef.engine_type) {                           │
│      case 'BaseChecklist': return <BaseChecklist />         │
│      case 'BaseMediciones': return <BaseMediciones />       │
│      default: return <BaseGeneric />                        │
│    }                                                         │
│                                                              │
│ 5. Motor renderiza campos dinámicamente                     │
│    fields.map(field => renderFieldInput(field))             │
│    - boolean → Radio buttons (Cumple/No Cumple)             │
│    - number → Input con validación de rangos                │
│    - text → Textarea                                        │
│    - signature → SignaturePad component                     │
│                                                              │
│ 6. Validaciones condicionales en tiempo real                │
│    useEffect(() => {                                        │
│      // Si boolean === false → evidenceRequired = true      │
│      // Si number fuera de rango → evidenceRequired = true  │
│    }, [values])                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
FASE 4: CAPTURA DE DATOS (Usuario Interactúa)
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario completa campos                                  │
│    onChange(fieldId, value) → setValues({...prev, ...})    │
│                                                              │
│ 2. Usuario adjunta evidencias (si requerido)                │
│    EvidenceUploader.jsx                                      │
│    - Upload a Supabase Storage                              │
│    - Retorna: { file_url, storage_path, file_type }        │
│                                                              │
│ 3. Usuario firma (si requerido)                             │
│    SignaturePad.jsx                                          │
│    - Canvas HTML5                                           │
│    - Convierte a PNG blob                                   │
│    - Upload a Supabase Storage                              │
│    - Retorna: URL pública                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
FASE 5: VALIDACIÓN Y ENVÍO
┌─────────────────────────────────────────────────────────────┐
│ handleSubmit(e)                                             │
│                                                              │
│ 1. Validación de campos requeridos                          │
│    for (field of fields) {                                  │
│      if (field.required && !values[field.id]) → alert()    │
│    }                                                         │
│                                                              │
│ 2. Validación condicional de evidencias                     │
│    if (evidenceRequired && evidences.length === 0)          │
│      → alert("Evidencia obligatoria")                       │
│                                                              │
│ 3. Validación de observaciones críticas                     │
│    if (hasCriticals && !observaciones)                      │
│      → alert("Observación obligatoria")                     │
│                                                              │
│ 4. Procesamiento de valores                                 │
│    - Conversión de strings a números                        │
│    - Normalización de tipos                                 │
│                                                              │
│ 5. Envío a backend                                          │
│    await dynamicService.submitFormResponse(                 │
│      formId, userId, values, evidences                      │
│    )                                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
FASE 6: PERSISTENCIA (Backend)
┌─────────────────────────────────────────────────────────────┐
│ dynamicService.submitFormResponse()                         │
│                                                              │
│ TRANSACCIÓN 1: Crear respuesta                              │
│   INSERT INTO sgc_form_responses                            │
│   VALUES (form_id, created_by, status='pendiente_revision') │
│   RETURNING id → response_id                                │
│                                                              │
│ TRANSACCIÓN 2: Guardar valores                              │
│   Para cada campo:                                          │
│   INSERT INTO sgc_response_values                           │
│   VALUES (response_id, field_id, value_*)                   │
│   - value_text para strings                                 │
│   - value_number para números                               │
│   - value_boolean para booleanos                            │
│   - value_json para objetos                                 │
│                                                              │
│ TRANSACCIÓN 3: Guardar evidencias                           │
│   Para cada evidencia:                                      │
│   INSERT INTO sgc_evidences                                 │
│   VALUES (response_id, file_url, storage_path, file_type)  │
│                                                              │
│ TRANSACCIÓN 4: Auditoría                                    │
│   INSERT INTO sgc_audit_logs                                │
│   VALUES (response_id, 'create', modified_by, new_data)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
FASE 7: VISUALIZACIÓN (Historial)
┌─────────────────────────────────────────────────────────────┐
│ DynamicRecordsView.jsx                                      │
│                                                              │
│ 1. Carga registros del módulo                               │
│    dynamicService.getModuleResponses(moduleId)              │
│    - JOIN con sgc_forms                                     │
│    - JOIN con profiles (usuario)                            │
│    - JOIN con sgc_response_values                           │
│    - JOIN con sgc_evidences                                 │
│                                                              │
│ 2. Procesamiento de estado computado                        │
│    - Analiza response_values                                │
│    - Si boolean === false → status = 'advertencia'          │
│    - Si number fuera de rango → status = 'critico'          │
│    - Genera array de criticalIssues                         │
│                                                              │
│ 3. Renderizado de tabla con filtros                         │
│    - Filtro por estado (pendientes, aprobados, críticos)    │
│    - Filtro por fecha (hoy, semana, mes)                    │
│    - Búsqueda por texto                                     │
│                                                              │
│ 4. Modal de detalles                                        │
│    - Tab 1: Respuestas y evidencias                         │
│    - Tab 2: Auditoría y trazabilidad                        │
│    - Verificación (si rol = calidad/admin)                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Flujo de Verificación y Auditoría

```
┌─────────────────────────────────────────────────────────────┐
│ VERIFICACIÓN DE REGISTROS (Segregación de Funciones)       │
│                                                              │
│ 1. Usuario Operativo crea registro                          │
│    status = 'pendiente_revision'                            │
│                                                              │
│ 2. Usuario Calidad/Admin abre registro                      │
│    - Validación: created_by !== current_user                │
│    - Si es propio → "No puedes verificar tus registros"     │
│                                                              │
│ 3. Verificador revisa y decide                              │
│    - Opción 1: Aprobar → status = 'aprobado'                │
│    - Opción 2: Rechazar → status = 'rechazado'              │
│    - Opción 3: Corregir → status = 'corregido'              │
│    - Comentario obligatorio                                 │
│                                                              │
│ 4. Sistema actualiza registro                               │
│    UPDATE sgc_form_responses SET                            │
│      status = [nuevo_estado],                               │
│      verified_by = [verificador_id],                        │
│      verified_at = NOW(),                                   │
│      verification_comment = [comentario]                    │
│                                                              │
│ 5. Sistema registra auditoría                               │
│    INSERT INTO sgc_audit_logs                               │
│      action_type = 'verify',                                │
│      modified_by = [verificador_id],                        │
│      reason = "Verificación operativa: [estado]"            │
│                                                              │
│ 6. Verificación masiva (opcional)                           │
│    - Selección múltiple de registros                        │
│    - Validación de registros críticos                       │
│    - Confirmación explícita                                 │
│    - Actualización en batch                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. RELACIÓN ENTRE TABLAS EAV

### 3.1 Diagrama Entidad-Relación

```
┌─────────────────────┐
│   sgc_modules       │
│─────────────────────│
│ id (PK)             │
│ name                │
│ slug (UNIQUE)       │
│ icon                │
│ description         │
│ is_active           │
│ created_at          │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────▼──────────┐
│   sgc_forms         │
│─────────────────────│
│ id (PK)             │
│ module_id (FK)      │
│ name                │
│ slug (UNIQUE)       │
│ description         │
│ engine_type ★       │  ← CRÍTICO: Define motor de renderizado
│ roles_allowed[]     │
│ is_active           │
│ created_at          │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────▼──────────────────┐
│   sgc_form_fields           │
│─────────────────────────────│
│ id (PK)                     │
│ form_id (FK)                │
│ name                        │
│ label                       │
│ field_type ★                │  ← text, number, boolean, signature, etc.
│ options (JSONB) ★           │  ← { min, max, unit, choices, etc. }
│ required                    │
│ order_index                 │
│ created_at                  │
└──────────┬──────────────────┘
           │ N                  
           │                    
           │ 1                  
┌──────────▼──────────────────┐       ┌─────────────────────┐
│   sgc_form_responses        │       │   profiles          │
│─────────────────────────────│       │─────────────────────│
│ id (PK)                     │       │ id (PK)             │
│ form_id (FK)                │◄──────┤ user_id (FK)        │
│ created_by (FK) ────────────┼───────┤ nombre              │
│ status ★                    │       │ rol                 │
│ verified_by (FK) ───────────┼───┐   │ email               │
│ verified_at                 │   │   └─────────────────────┘
│ verification_comment        │   │
│ created_at                  │   │
│ updated_at                  │   │
└──────────┬──────────────────┘   │
           │ 1                     │
           │                       │
           ├───────────────────────┘
           │ N
┌──────────▼──────────────────┐
│   sgc_response_values       │
│─────────────────────────────│
│ id (PK)                     │
│ response_id (FK)            │
│ field_id (FK)               │
│ value_text                  │  ← Columnas tipadas para performance
│ value_number                │
│ value_boolean               │
│ value_json (JSONB)          │
│ created_at                  │
└─────────────────────────────┘

┌─────────────────────────────┐
│   sgc_evidences             │
│─────────────────────────────│
│ id (PK)                     │
│ response_id (FK) ───────────┼──► sgc_form_responses.id
│ file_url                    │
│ storage_path                │
│ file_type                   │
│ created_at                  │
└─────────────────────────────┘

┌─────────────────────────────┐
│   sgc_audit_logs            │
│─────────────────────────────│
│ id (PK)                     │
│ response_id (FK) ───────────┼──► sgc_form_responses.id
│ action_type                 │  ← 'create', 'update', 'verify'
│ modified_by (FK) ───────────┼──► profiles.id
│ old_data (JSONB)            │
│ new_data (JSONB)            │
│ reason                      │
│ created_at                  │
└─────────────────────────────┘
```

### 3.2 Cardinalidades y Relaciones

| Relación | Tipo | Descripción |
|----------|------|-------------|
| **modules → forms** | 1:N | Un módulo contiene múltiples formularios |
| **forms → fields** | 1:N | Un formulario tiene múltiples campos |
| **forms → responses** | 1:N | Un formulario puede tener múltiples respuestas |
| **responses → values** | 1:N | Una respuesta tiene múltiples valores (uno por campo) |
| **responses → evidences** | 1:N | Una respuesta puede tener múltiples evidencias |
| **responses → audit_logs** | 1:N | Una respuesta tiene múltiples entradas de auditoría |
| **profiles → responses** | 1:N | Un usuario crea múltiples respuestas |
| **profiles → audit_logs** | 1:N | Un usuario genera múltiples logs de auditoría |

### 3.3 Ventajas del Modelo EAV en este Contexto

✅ **Flexibilidad Extrema**
- Nuevos formularios sin migraciones DDL
- Campos dinámicos configurables desde UI
- Adaptación rápida a cambios normativos

✅ **Escalabilidad Horizontal**
- Crecimiento ilimitado de tipos de formularios
- No hay límite de columnas por tabla
- Soporte para múltiples industrias/clientes (SaaS-ready)

✅ **Versionamiento Implícito**
- Cambios en fields no afectan responses históricas
- Trazabilidad completa de configuraciones
- Auditoría de cambios estructurales

✅ **Reutilización de Componentes**
- Motores de renderizado reutilizables
- Lógica de validación centralizada
- Servicios genéricos para todos los formularios

⚠️ **Desventajas Mitigadas**
- **Performance:** Mitigado con índices y columnas tipadas (value_text, value_number, etc.)
- **Complejidad de Queries:** Mitigado con vistas materializadas (futuro)
- **Validación:** Mitigado con validaciones en frontend y backend

---

## 4. DEPENDENCIAS CRÍTICAS

### 4.1 Dependencias Técnicas

```
NIVEL 1: INFRAESTRUCTURA BASE
├── Supabase (BaaS)
│   ├── PostgreSQL 15+
│   ├── PostgREST (API automática)
│   ├── GoTrue (Auth)
│   └── Storage (S3-compatible)
│
├── Node.js 18+ (Runtime de desarrollo)
└── Navegadores modernos (Chrome 90+, Firefox 88+, Safari 14+)

NIVEL 2: FRAMEWORK Y BUILD
├── React 19.2.5
│   ├── React DOM
│   └── React Hooks (useState, useEffect, useRef, useContext)
│
├── Vite 8.0.10
│   ├── ESBuild (transpilación)
│   └── Rollup (bundling)
│
└── React Router DOM 7.14.2
    ├── BrowserRouter
    ├── Routes/Route
    └── useParams, useNavigate

NIVEL 3: UI Y ESTILOS
├── Tailwind CSS 4.2.4
│   ├── PostCSS
│   └── Autoprefixer
│
└── Lucide React 1.14.0 (Iconografía)

NIVEL 4: UTILIDADES
├── date-fns 4.1.0 (Manipulación de fechas)
├── jsPDF 4.2.1 + jspdf-autotable 5.0.7 (Generación PDF)
└── XLSX 0.18.5 (Import/Export Excel)

NIVEL 5: SEGURIDAD
├── Supabase RLS (Row Level Security)
├── JWT Tokens (Supabase Auth)
└── HTTPS (Obligatorio en producción)
```

### 4.2 Dependencias Funcionales

```
COMPONENTE: DynamicForm.jsx
├── DEPENDE DE:
│   ├── dynamicService.js (Carga de formularios)
│   ├── BaseChecklist.jsx (Motor de checklists)
│   ├── BaseMediciones.jsx (Motor de mediciones)
│   ├── BaseGeneric.jsx (Motor genérico)
│   ├── EvidenceUploader.jsx (Carga de archivos)
│   ├── SignaturePad.jsx (Firmas digitales)
│   └── useAuth hook (Autenticación)
│
└── ES REQUERIDO POR:
    └── Rutas dinámicas (/modulo/:moduleSlug/:formSlug)

COMPONENTE: DynamicRecordsView.jsx
├── DEPENDE DE:
│   ├── dynamicService.js (Carga de registros)
│   └── useAuth hook (Permisos de verificación)
│
└── ES REQUERIDO POR:
    └── DynamicModule.jsx (Tab de historial)

SERVICIO: dynamicService.js
├── DEPENDE DE:
│   └── supabase client (Conexión a DB)
│
└── ES REQUERIDO POR:
    ├── DynamicForm.jsx
    ├── DynamicRecordsView.jsx
    ├── DynamicModule.jsx
    └── Dashboard.jsx

MOTOR: BaseChecklist.jsx
├── DEPENDE DE:
│   └── SignaturePad.jsx
│
└── ES REQUERIDO POR:
    └── DynamicForm.jsx (cuando engine_type = 'BaseChecklist')

MOTOR: BaseMediciones.jsx
├── DEPENDE DE:
│   └── SignaturePad.jsx
│
└── ES REQUERIDO POR:
    └── DynamicForm.jsx (cuando engine_type = 'BaseMediciones')
```

### 4.3 Puntos Únicos de Fallo (SPOF)

🔴 **CRÍTICO - SPOF Identificados:**

1. **Supabase (BaaS)**
   - **Riesgo:** Si Supabase cae, todo el sistema se detiene
   - **Mitigación Actual:** Ninguna
   - **Mitigación Recomendada:** 
     - Implementar caché local (IndexedDB)
     - Modo offline con sincronización
     - Plan de contingencia con backup de DB

2. **dynamicService.js**
   - **Riesgo:** Punto central de todas las operaciones de datos
   - **Mitigación Actual:** Manejo de errores con try/catch
   - **Mitigación Recomendada:**
     - Implementar retry logic
     - Circuit breaker pattern
     - Fallback a datos cacheados

3. **Supabase Storage**
   - **Riesgo:** Evidencias y firmas no accesibles si Storage falla
   - **Mitigación Actual:** Ninguna
   - **Mitigación Recomendada:**
     - CDN con múltiples regiones
     - Backup automático a S3
     - Compresión y optimización de imágenes

---

## 5. MOTORES REUTILIZABLES

### 5.1 Motores Actuales (Implementados)

#### 5.1.1 BaseChecklist.jsx

**Propósito:** Formularios de verificación punto a punto (Cumple/No Cumple)

**Características:**
- Radio buttons para boolean (Cumple/No Cumple)
- Resaltado visual de incumplimientos (border-red)
- Soporte para campos de texto (observaciones)
- Integración con SignaturePad
- Diseño optimizado para tablets

**Casos de Uso:**
- Checklists de limpieza
- Inspecciones de BPM
- Verificaciones de plagas
- Auditorías internas
- Controles de calidad

**Código Clave:**
```javascript
// Renderizado condicional según field_type
if (field.field_type === 'boolean') {
  return (
    <div className="flex gap-4">
      <label>
        <input type="radio" value={true} /> Cumple
      </label>
      <label>
        <input type="radio" value={false} /> No Cumple
      </label>
    </div>
  );
}
```

#### 5.1.2 BaseMediciones.jsx

**Propósito:** Registro de parámetros cuantitativos con validación de rangos

**Características:**
- Inputs numéricos con step decimal
- Validación en tiempo real de rangos (min/max)
- Indicadores visuales de estado (verde/rojo)
- Unidades de medida dinámicas (ppm, pH, °C, kg)
- Alertas críticas automáticas
- Grid responsive (2 columnas en desktop)

**Casos de Uso:**
- Control de cloro y pH
- Mediciones de temperatura
- Registro de pesos
- Parámetros fisicoquímicos
- Calibraciones

**Código Clave:**
```javascript
const getValidationState = (field, val) => {
  const min = field.options?.min;
  const max = field.options?.max;
  
  if (min !== undefined && val < min) return 'critical';
  if (max !== undefined && val > max) return 'critical';
  return 'ok';
};
```

#### 5.1.3 BaseGeneric.jsx

**Propósito:** Motor fallback para formularios sin motor especializado

**Características:**
- Soporte para todos los field_types básicos
- text, number, boolean, select, textarea, date, time, signature
- Grid de 2 columnas
- Validaciones HTML5 nativas
- Extensible para nuevos tipos

**Casos de Uso:**
- Formularios simples
- Prototipos rápidos
- Formularios administrativos
- Encuestas

### 5.2 Motores Futuros (Recomendados)

#### 5.2.1 BaseMantenimiento.jsx

**Propósito:** Gestión de mantenimientos preventivos y correctivos

**Características Propuestas:**
- Selector de equipo (dropdown con búsqueda)
- Tipo de mantenimiento (preventivo/correctivo/calibración)
- Checklist de actividades realizadas
- Registro de repuestos utilizados
- Próxima fecha de mantenimiento (cálculo automático)
- Firma de técnico y supervisor
- Evidencias fotográficas obligatorias

**Tablas Satélite Necesarias:**
```sql
CREATE TABLE sgc_equipos (
  id UUID PRIMARY KEY,
  codigo TEXT UNIQUE,
  nombre TEXT,
  ubicacion TEXT,
  frecuencia_mantenimiento INTEGER, -- días
  ultimo_mantenimiento DATE,
  proximo_mantenimiento DATE
);

CREATE TABLE sgc_mantenimiento_repuestos (
  id UUID PRIMARY KEY,
  response_id UUID REFERENCES sgc_form_responses(id),
  repuesto TEXT,
  cantidad INTEGER,
  costo NUMERIC
);
```

#### 5.2.2 BaseCalidad.jsx

**Propósito:** Gestión de PQRS, No Conformidades y CAPA

**Características Propuestas:**
- Clasificación de hallazgo (PQR/NC/Observación)
- Severidad (Menor/Mayor/Crítica)
- Análisis de causa raíz (5 Whys, Ishikawa)
- Plan de acción correctiva (CAPA)
- Responsables y fechas de cierre
- Seguimiento de eficacia
- Workflow de aprobación

**Tablas Satélite Necesarias:**
```sql
CREATE TABLE sgc_capa (
  id UUID PRIMARY KEY,
  response_id UUID REFERENCES sgc_form_responses(id),
  causa_raiz TEXT,
  accion_correctiva TEXT,
  accion_preventiva TEXT,
  responsable UUID REFERENCES profiles(id),
  fecha_compromiso DATE,
  fecha_cierre DATE,
  eficacia_verificada BOOLEAN
);
```

#### 5.2.3 BaseDocumental.jsx

**Propósito:** Control de documentos y registros

**Características Propuestas:**
- Metadatos de documento (código, versión, fecha)
- Control de cambios
- Distribución y aprobación
- Versionamiento automático
- Obsolescencia controlada
- Firma electrónica de aprobadores

**Tablas Satélite Necesarias:**
```sql
CREATE TABLE sgc_documentos_control (
  id UUID PRIMARY KEY,
  codigo TEXT UNIQUE,
  titulo TEXT,
  version TEXT,
  fecha_emision DATE,
  fecha_revision DATE,
  estado TEXT, -- vigente, obsoleto, en_revision
  aprobado_por UUID REFERENCES profiles(id),
  file_url TEXT
);
```

#### 5.2.4 BaseAuditoria.jsx

**Propósito:** Auditorías internas y externas

**Características Propuestas:**
- Plan de auditoría
- Checklist de requisitos normativos
- Hallazgos por requisito
- Clasificación de hallazgos
- Evidencias por hallazgo
- Informe automático
- Seguimiento de acciones

### 5.3 Patrón de Extensión de Motores

**Arquitectura Plugin-Based:**

```javascript
// src/components/engines/EngineRegistry.js
const ENGINE_REGISTRY = {
  'BaseChecklist': () => import('./BaseChecklist'),
  'BaseMediciones': () => import('./BaseMediciones'),
  'BaseMantenimiento': () => import('./BaseMantenimiento'),
  'BaseCalidad': () => import('./BaseCalidad'),
  'BaseDocumental': () => import('./BaseDocumental'),
  'BaseAuditoria': () => import('./BaseAuditoria'),
  'BaseGeneric': () => import('./BaseGeneric')
};

export async function loadEngine(engineType) {
  const loader = ENGINE_REGISTRY[engineType] || ENGINE_REGISTRY['BaseGeneric'];
  const module = await loader();
  return module.default;
}
```

**Uso en DynamicForm.jsx:**
```javascript
const [EngineComponent, setEngineComponent] = useState(null);

useEffect(() => {
  async function loadEngineComponent() {
    const Engine = await loadEngine(formDef.engine_type);
    setEngineComponent(() => Engine);
  }
  loadEngineComponent();
}, [formDef]);

return EngineComponent ? 
  <EngineComponent fields={fields} values={values} onChange={handleChange} /> 
  : <Loader />;
```

---

## 6. RIESGOS ACTUALES

### 6.1 Riesgos Técnicos

| ID | Riesgo | Severidad | Probabilidad | Impacto | Mitigación |
|----|--------|-----------|--------------|---------|------------|
| **RT-01** | Dependencia total de Supabase (Vendor Lock-in) | 🔴 Alta | Media | Crítico | Implementar capa de abstracción de datos |
| **RT-02** | Sin caché local (Performance en redes lentas) | 🟡 Media | Alta | Alto | Implementar Service Workers + IndexedDB |
| **RT-03** | Sin modo offline | 🟡 Media | Media | Alto | Progressive Web App (PWA) |
| **RT-04** | Queries N+1 en getModuleResponses | 🟡 Media | Alta | Medio | Optimizar JOINs, implementar paginación |
| **RT-05** | Sin límite de tamaño de evidencias | 🟡 Media | Media | Medio | Validación de tamaño, compresión automática |
| **RT-06** | Sin versionamiento de formularios | 🟡 Media | Baja | Alto | Implementar sgc_form_versions |
| **RT-07** | Sin backup automático | 🔴 Alta | Baja | Crítico | Configurar backups diarios en Supabase |
| **RT-08** | Sin monitoreo de errores | 🟡 Media | Alta | Medio | Integrar Sentry o similar |
| **RT-09** | Sin rate limiting | 🟢 Baja | Baja | Bajo | Implementar en Supabase Edge Functions |
| **RT-10** | Sin validación de integridad referencial en cascada | 🟡 Media | Media | Medio | Revisar políticas ON DELETE CASCADE |

### 6.2 Riesgos de Seguridad

| ID | Riesgo | Severidad | Mitigación Actual | Mitigación Recomendada |
|----|--------|-----------|-------------------|------------------------|
| **RS-01** | RLS policies muy permisivas | 🔴 Alta | Políticas básicas | Refinar políticas por rol y ownership |
| **RS-02** | Sin encriptación de datos sensibles | 🟡 Media | HTTPS en tránsito | Encriptar campos sensibles en DB |
| **RS-03** | Sin auditoría de accesos | 🟡 Media | Auditoría de cambios | Implementar log de accesos (quién vio qué) |
| **RS-04** | Sin 2FA | 🟡 Media | Ninguna | Implementar Supabase MFA |
| **RS-05** | Tokens JWT sin rotación | 🟡 Media | Tokens de Supabase | Implementar refresh token rotation |
| **RS-06** | Sin validación de MIME types en uploads | 🟡 Media | Ninguna | Validar tipo real de archivo (magic bytes) |
| **RS-07** | Sin sanitización de inputs | 🟢 Baja | Supabase previene SQL injection | Implementar DOMPurify para XSS |
| **RS-08** | Sin CORS configurado correctamente | 🟢 Baja | Supabase maneja CORS | Revisar configuración en producción |

### 6.3 Riesgos de Negocio

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|------------|
| **RN-01** | Pérdida de datos por error humano | Crítico | Soft deletes, papelera de reciclaje |
| **RN-02** | Incumplimiento normativo INVIMA | Crítico | Auditoría completa, trazabilidad inmutable |
| **RN-03** | Falta de capacitación de usuarios | Alto | Documentación, videos tutoriales, onboarding |
| **RN-04** | Resistencia al cambio (papel → digital) | Medio | Change management, beneficios tangibles |
| **RN-05** | Escalabilidad de costos de Supabase | Medio | Monitorear uso, optimizar queries |

---

## 7. CUELLOS DE BOTELLA FUTUROS

### 7.1 Performance y Escalabilidad

#### 7.1.1 Base de Datos

**Cuello de Botella Identificado:**
```sql
-- Query actual en getModuleResponses (línea 234-252 de dynamicService.js)
SELECT 
  sgc_form_responses.*,
  sgc_forms.*,
  profiles.*,
  sgc_response_values.*,
  sgc_form_fields.*,
  sgc_evidences.*
FROM sgc_form_responses
INNER JOIN sgc_forms ON ...
LEFT JOIN profiles ON ...
LEFT JOIN sgc_response_values ON ...
LEFT JOIN sgc_form_fields ON ...
LEFT JOIN sgc_evidences ON ...
WHERE sgc_forms.module_id = $1
ORDER BY created_at DESC;
```

**Problema:**
- Sin paginación → Carga todos los registros históricos
- Múltiples JOINs → O(n²) en peor caso
- Sin índices compuestos → Full table scans
- Sin caché → Cada vista recarga todo

**Impacto Proyectado:**
- Con 1,000 registros: ~500ms ✅
- Con 10,000 registros: ~3s ⚠️
- Con 100,000 registros: ~30s 🔴
- Con 1,000,000 registros: Timeout ❌

**Solución Recomendada:**

```sql
-- 1. Crear índices compuestos
CREATE INDEX idx_responses_module_date 
ON sgc_form_responses(form_id, created_at DESC);

CREATE INDEX idx_values_response 
ON sgc_response_values(response_id);

CREATE INDEX idx_evidences_response 
ON sgc_evidences(response_id);

-- 2. Implementar vista materializada
CREATE MATERIALIZED VIEW mv_module_responses AS
SELECT 
  r.id,
  r.status,
  r.created_at,
  f.name as form_name,
  f.module_id,
  p.nombre as user_name,
  COUNT(DISTINCT rv.id) as values_count,
  COUNT(DISTINCT e.id) as evidences_count,
  -- Campos computados
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM sgc_response_values rv2
      JOIN sgc_form_fields ff ON rv2.field_id = ff.id
      WHERE rv2.response_id = r.id 
        AND ff.field_type = 'boolean' 
        AND rv2.value_boolean = false
    ) THEN 'critico'
    ELSE 'cumple'
  END as computed_status
FROM sgc_form_responses r
JOIN sgc_forms f ON r.form_id = f.id
JOIN profiles p ON r.created_by = p.id
LEFT JOIN sgc_response_values rv ON r.id = rv.response_id
LEFT JOIN sgc_evidences e ON r.id = e.response_id
GROUP BY r.id, f.name, f.module_id, p.nombre;

-- Refrescar cada hora
CREATE INDEX ON mv_module_responses(module_id, created_at DESC);
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_module_responses;
```

```javascript
// 3. Implementar paginación en frontend
async getModuleResponses(moduleId, page = 1, pageSize = 50) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error, count } = await supabase
    .from('mv_module_responses')
    .select('*', { count: 'exact' })
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false })
    .range(from, to);
    
  return { data, totalPages: Math.ceil(count / pageSize), currentPage: page };
}
```

#### 7.1.2 Storage de Evidencias

**Cuello de Botella Identificado:**
- Imágenes sin compresión (5-10 MB por foto)
- Sin CDN configurado
- Sin lazy loading de imágenes
- Sin thumbnails

**Impacto Proyectado:**
- 100 registros/día × 3 fotos × 7 MB = 2.1 GB/día
- 1 mes = 63 GB
- 1 año = 756 GB
- Costo Supabase: ~$20/mes por cada 100 GB

**Solución Recomendada:**

```javascript
// 1. Compresión automática en cliente
import imageCompression from 'browser-image-compression';

async function compressImage(file) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg'
  };
  return await imageCompression(file, options);
}

// 2. Generar thumbnails
async function generateThumbnail(file) {
  const options = {
    maxSizeMB: 0.1,
    maxWidthOrHeight: 400,
    useWebWorker: true
  };
  return await imageCompression(file, options);
}

// 3. Upload optimizado
async uploadEvidence(file) {
  const compressed = await compressImage(file);
  const thumbnail = await generateThumbnail(file);
  
  // Upload imagen completa
  const fullPath = `evidencias/full/${fileName}`;
  await supabase.storage.from('documentos-sgc').upload(fullPath, compressed);
  
  // Upload thumbnail
  const thumbPath = `evidencias/thumbs/${fileName}`;
  await supabase.storage.from('documentos-sgc').upload(thumbPath, thumbnail);
  
  return { fullPath, thumbPath };
}
```

#### 7.1.3 Frontend Bundle Size

**Cuello de Botella Identificado:**
- Bundle actual: ~800 KB (estimado)
- Sin code splitting
- Sin lazy loading de rutas
- Todas las dependencias en bundle principal

**Solución Recomendada:**

```javascript
// 1. Lazy loading de rutas
const DynamicForm = lazy(() => import('./pages/DynamicForm'));
const DynamicModule = lazy(() => import('./pages/DynamicModule'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

// 2. Code splitting por motor
const BaseChecklist = lazy(() => import('./components/engines/BaseChecklist'));
const BaseMediciones = lazy(() => import('./components/engines/BaseMediciones'));

// 3. Suspense boundaries
<Suspense fallback={<Loader />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/modulo/:slug/:form" element={<DynamicForm />} />
  </Routes>
</Suspense>
```

### 7.2 Concurrencia y Conflictos

**Escenario Problemático:**
- Usuario A abre formulario para edición
- Usuario B abre mismo formulario
- Ambos guardan → Último gana (Last Write Wins)
- Se pierden cambios de Usuario A

**Solución Recomendada:**

```sql
-- 1. Agregar control de versión optimista
ALTER TABLE sgc_form_responses 
ADD COLUMN version INTEGER DEFAULT 1;

-- 2. Trigger de incremento automático
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_version
BEFORE UPDATE ON sgc_form_responses
FOR EACH ROW
EXECUTE FUNCTION increment_version();
```

```javascript
// 3. Validación en frontend
async function updateResponse(id, data, expectedVersion) {
  const { data: result, error } = await supabase
    .from('sgc_form_responses')
    .update(data)
    .eq('id', id)
    .eq('version', expectedVersion)
    .select();
    
  if (!result || result.length === 0) {
    throw new Error('Conflicto de versión. El registro fue modificado por otro usuario.');
  }
  
  return result[0];
}
```

---

## 8. ESTRATEGIA DE ESCALABILIDAD

### 8.1 Escalabilidad Técnica

#### 8.1.1 Arquitectura Multi-Tenant (SaaS)

**Objetivo:** Soportar múltiples empresas en la misma instancia

**Estrategia:**

```sql
-- 1. Agregar tenant_id a todas las tablas
ALTER TABLE sgc_modules ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE sgc_forms ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE sgc_form_responses ADD COLUMN tenant_id UUID REFERENCES tenants(id);
-- ... etc

-- 2. Crear tabla de tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL, -- free, pro, enterprise
  max_users INTEGER,
  max_storage_gb INTEGER,
  features JSONB, -- { "ai_analysis": true, "api_access": true }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 3. Actualizar RLS policies
CREATE POLICY "tenant_isolation" ON sgc_form_responses
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- 4. Índices por tenant
CREATE INDEX idx_responses_tenant ON sgc_form_responses(tenant_id, created_at DESC);
```

**Beneficios:**
- Escalabilidad horizontal ilimitada
- Aislamiento de datos por empresa
- Monetización por planes (freemium)
- Métricas por tenant

#### 8.1.2 Caché Distribuido

**Objetivo:** Reducir carga en base de datos

**Estrategia:**

```javascript
// 1. Implementar Redis/Upstash para caché
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});

// 2. Caché de módulos y formularios (raramente cambian)
async function getModulesWithCache() {
  const cacheKey = 'modules:all';
  const cached = await redis.get(cacheKey);
  
  if (cached) return cached;
  
  const modules = await supabase.from('sgc_modules').select('*');
  await redis.set(cacheKey, modules, { ex: 3600 }); // 1 hora
  
  return modules;
}

// 3. Invalidación de caché en cambios
async function updateModule(id, data) {
  await supabase.from('sgc_modules').update(data).eq('id', id);
  await redis.del('modules:all'); // Invalidar caché
}
```

#### 8.1.3 CDN para Assets Estáticos

**Objetivo:** Mejorar velocidad de carga global

**Estrategia:**
- Configurar Cloudflare CDN
- Servir evidencias desde CDN
- Caché de 1 año para imágenes
- Compresión Brotli/Gzip automática

```javascript
// Configuración en vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['lucide-react']
        }
      }
    }
  }
};
```

### 8.2 Escalabilidad de Datos

#### 8.2.1 Particionamiento de Tablas

**Objetivo:** Mejorar performance en tablas masivas

**Estrategia:**

```sql
-- Particionar sgc_form_responses por fecha
CREATE TABLE sgc_form_responses_2026_q1 
PARTITION OF sgc_form_responses
FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE TABLE sgc_form_responses_2026_q2 
PARTITION OF sgc_form_responses
FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- Automatizar creación de particiones
CREATE OR REPLACE FUNCTION create_quarterly_partition()
RETURNS void AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  start_date := date_trunc('quarter', CURRENT_DATE + interval '3 months');
  end_date := start_date + interval '3 months';
  partition_name := 'sgc_form_responses_' || to_char(start_date, 'YYYY_Q"Q"');
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF sgc_form_responses
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Ejecutar mensualmente
SELECT cron.schedule('create-partition', '0 0 1 * *', 'SELECT create_quarterly_partition()');
```

#### 8.2.2 Archivado de Datos Históricos

**Objetivo:** Mantener DB ágil, preservar historial

**Estrategia:**

```sql
-- 1. Tabla de archivo (cold storage)
CREATE TABLE sgc_form_responses_archive (
  LIKE sgc_form_responses INCLUDING ALL
);

-- 2. Mover registros antiguos (> 2 años)
INSERT INTO sgc_form_responses_archive
SELECT * FROM sgc_form_responses
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM sgc_form_responses
WHERE created_at < NOW() - INTERVAL '2 years';

-- 3. Vista unificada para consultas históricas
CREATE VIEW sgc_form_responses_all AS
SELECT *, false as is_archived FROM sgc_form_responses
UNION ALL
SELECT *, true as is_archived FROM sgc_form_responses_archive;
```

### 8.3 Escalabilidad de Equipo

#### 8.3.1 Documentación Técnica

**Objetivo:** Onboarding rápido de nuevos desarrolladores

**Entregables:**
- ✅ Este documento (Análisis Arquitectónico)
- 📝 Guía de Contribución (CONTRIBUTING.md)
- 📝 Guía de Estilo de Código (STYLE_GUIDE.md)
- 📝 Documentación de API (Swagger/OpenAPI)
- 📝 Diagramas de Flujo (Mermaid)
- 📝 Videos de Arquitectura (Loom)

#### 8.3.2 Testing Strategy

**Objetivo:** Garantizar calidad en cambios

**Estrategia:**

```javascript
// 1. Unit Tests (Vitest)
describe('dynamicService', () => {
  it('should load modules correctly', async () => {
    const modules = await dynamicService.getModules();
    expect(modules).toBeInstanceOf(Array);
    expect(modules[0]).toHaveProperty('slug');
  });
});

// 2. Integration Tests (Playwright)
test('should submit form successfully', async ({ page }) => {
  await page.goto('/modulo/operaciones/limpieza-diaria');
  await page.click('[data-testid="cumple-area-recepcion"]');
  await page.click('[data-testid="submit-button"]');
  await expect(page).toHaveURL('/operaciones');
});

// 3. E2E Tests (Cypress)
describe('Complete Form Flow', () => {
  it('should create, verify and view record', () => {
    cy.login('operativo@dm.com');
    cy.visit('/operaciones');
    cy.get('[data-form="limpieza-diaria"]').click();
    cy.fillForm({ area_recepcion: true });
    cy.submit();
    
    cy.login('calidad@dm.com');
    cy.visit('/operaciones');
    cy.get('[data-tab="records"]').click();
    cy.get('[data-record]:first').click();
    cy.verify('aprobado', 'Todo correcto');
  });
});
```

---

## 9. ESTRATEGIA IA-READY

### 9.1 Preparación de Datos para IA

#### 9.1.1 Estructura de Datos Semántica

**Objetivo:** Datos listos para entrenamiento de modelos

**Estrategia Actual (✅ Ya implementado):**
- ✅ Datos estructurados en formato EAV
- ✅ Metadatos ricos (field_type, options, labels)
- ✅ Trazabilidad completa (audit_logs)
- ✅ Relaciones explícitas (FK constraints)

**Mejoras Recomendadas:**

```sql
-- 1. Agregar embeddings para búsqueda semántica
ALTER TABLE sgc_form_responses 
ADD COLUMN embedding vector(1536); -- OpenAI ada-002

-- 2. Función para generar embeddings
CREATE OR REPLACE FUNCTION generate_response_embedding(response_id UUID)
RETURNS void AS $$
DECLARE
  response_text TEXT;
  embedding_result vector(1536);
BEGIN
  -- Concatenar todos los valores de texto
  SELECT string_agg(
    COALESCE(rv.value_text, rv.value_number::text, rv.value_boolean::text),
    ' '
  ) INTO response_text
  FROM sgc_response_values rv
  WHERE rv.response_id = response_id;
  
  -- Llamar a API de OpenAI (via Edge Function)
  SELECT openai_embedding(response_text) INTO embedding_result;
  
  -- Guardar embedding
  UPDATE sgc_form_responses 
  SET embedding = embedding_result
  WHERE id = response_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Índice para búsqueda vectorial
CREATE INDEX ON sgc_form_responses 
USING ivfflat (embedding vector_cosine_ops);
```

#### 9.1.2 Data Lake para Analytics

**Objetivo:** Centralizar datos para análisis avanzado

**Estrategia:**

```javascript
// 1. Export diario a formato Parquet
async function exportToDataLake() {
  const responses = await supabase
    .from('sgc_form_responses')
    .select(`
      *,
      sgc_forms(*),
      sgc_response_values(*),
      profiles(*)
    `)
    .gte('created_at', new Date(Date.now() - 24*60*60*1000));
  
  // Convertir a Parquet
  const parquet = convertToParquet(responses);
  
  // Upload a S3/GCS
  await uploadToDataLake(parquet, `responses_${today}.parquet`);
}

// 2. Estructura de Data Lake
// s3://dm-datalake/
//   ├── raw/
//   │   ├── responses/
//   │   │   ├── year=2026/
//   │   │   │   ├── month=05/
//   │   │   │   │   ├── day=18/
//   │   │   │   │   │   └── responses.parquet
//   ├── processed/
//   │   ├── analytics/
//   │   │   └── daily_stats.parquet
//   └── ml/
//       ├── training/
//       └── predictions/
```

### 9.2 Casos de Uso de IA

#### 9.2.1 Detección de Anomalías

**Objetivo:** Identificar patrones inusuales automáticamente

**Implementación:**

```python
# 1. Modelo de detección de anomalías (Isolation Forest)
from sklearn.ensemble import IsolationForest
import pandas as pd

# Cargar datos históricos
df = load_responses_from_datalake()

# Features engineering
features = df[[
  'cloro_residual',
  'ph',
  'temperatura',
  'hora_del_dia',
  'dia_semana'
]]

# Entrenar modelo
model = IsolationForest(contamination=0.05)
model.fit(features)

# Predecir anomalías
df['is_anomaly'] = model.predict(features)
df['anomaly_score'] = model.score_samples(features)

# Guardar modelo
joblib.dump(model, 'anomaly_detector.pkl')
```

```javascript
// 2. Integración en frontend
async function checkAnomaly(values) {
  const response = await fetch('/api/ml/check-anomaly', {
    method: 'POST',
    body: JSON.stringify(values)
  });
  
  const { is_anomaly, score, explanation } = await response.json();
  
  if (is_anomaly) {
    showWarning(`⚠️ Valor inusual detectado: ${explanation}`);
  }
}
```

#### 9.2.2 Análisis Predictivo

**Objetivo:** Predecir incumplimientos antes de que ocurran

**Casos de Uso:**
- Predecir probabilidad de fallo de equipo
- Anticipar desviaciones de parámetros
- Recomendar mantenimientos preventivos
- Optimizar frecuencia de inspecciones

**Implementación:**

```python
# Modelo de predicción de fallos
from sklearn.ensemble import RandomForestClassifier

# Features
X = df[[
  'dias_desde_ultimo_mantenimiento',
  'horas_operacion',
  'temperatura_promedio',
  'vibracion',
  'edad_equipo_meses'
]]

# Target
y = df['fallo_en_30_dias']

# Entrenar
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Predecir
probabilidad_fallo = model.predict_proba(X_new)[:, 1]

# Feature importance
importances = model.feature_importances_
```

#### 9.2.3 OCR para Digitalización

**Objetivo:** Extraer datos de documentos físicos

**Implementación:**

```javascript
// 1. Captura de imagen
async function scanDocument(imageFile) {
  // Upload a Supabase Storage
  const { data: upload } = await supabase.storage
    .from('documentos-sgc')
    .upload(`scans/${fileName}`, imageFile);
  
  // Llamar a OCR (Google Vision API / Tesseract)
  const response = await fetch('/api/ocr/extract', {
    method: 'POST',
    body: JSON.stringify({ imageUrl: upload.publicUrl })
  });
  
  const { text, confidence, fields } = await response.json();
  
  // Auto-completar formulario
  fields.forEach(field => {
    setValue(field.name, field.value);
  });
}
```

#### 9.2.4 Chatbot de Consultas (RAG)

**Objetivo:** Consultar historial en lenguaje natural

**Implementación:**

```javascript
// 1. Sistema RAG (Retrieval Augmented Generation)
async function askQuestion(question) {
  // Generar embedding de la pregunta
  const questionEmbedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: question
  });
  
  // Búsqueda vectorial en registros
  const { data: relevantRecords } = await supabase.rpc('match_responses', {
    query_embedding: questionEmbedding.data[0].embedding,
    match_threshold: 0.8,
    match_count: 5
  });
  
  // Generar respuesta con contexto
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Eres un asistente experto en gestión de calidad. Responde basándote en los registros históricos.'
      },
      {
        role: 'user',
        content: `Pregunta: ${question}\n\nContexto:\n${JSON.stringify(relevantRecords)}`
      }
    ]
  });
  
  return completion.choices[0].message.content;
}

// 2. Ejemplos de preguntas
// - "¿Cuántos incumplimientos de limpieza hubo en mayo?"
// - "¿Cuál es el promedio de cloro residual de la última semana?"
// - "¿Qué equipos requieren mantenimiento pronto?"
// - "Muéstrame registros con temperatura fuera de rango"
```

#### 9.2.5 Generación Automática de Informes

**Objetivo:** Crear informes ejecutivos con IA

**Implementación:**

```javascript
async function generateExecutiveReport(moduleId, period) {
  // 1. Obtener datos del período
  const stats = await getModuleStats(moduleId, period);
  
  // 2. Generar narrativa con GPT-4
  const prompt = `
    Genera un informe ejecutivo profesional basado en estos datos:
    
    Módulo: ${stats.moduleName}
    Período: ${period}
    Total de registros: ${stats.totalRecords}
    Incumplimientos: ${stats.nonCompliances}
    Tendencia: ${stats.trend}
    Hallazgos críticos: ${JSON.stringify(stats.criticalIssues)}
    
    El informe debe incluir:
    1. Resumen ejecutivo
    2. Análisis de tendencias
    3. Hallazgos principales
    4. Recomendaciones
    5. Conclusiones
  `;
  
  const report = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  });
  
  // 3. Generar PDF con gráficos
  const pdf = await generatePDFReport({
    narrative: report.choices[0].message.content,
    charts: stats.charts,
    data: stats.rawData
  });
  
  return pdf;
}
```

### 9.3 Infraestructura para IA

#### 9.3.1 Supabase Edge Functions

**Objetivo:** Ejecutar modelos de IA serverless

```typescript
// supabase/functions/ml-predict/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as tf from '@tensorflow/tfjs';

serve(async (req) => {
  const { values, modelType } = await req.json();
  
  // Cargar modelo pre-entrenado
  const model = await tf.loadLayersModel(`file://./models/${modelType}.json`);
  
  // Preparar input
  const input = tf.tensor2d([values]);
  
  // Predecir
  const prediction = model.predict(input);
  const result = await prediction.data();
  
  return new Response(
    JSON.stringify({ prediction: result[0] }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

#### 9.3.2 Pipeline de ML

```yaml
# .github/workflows/ml-pipeline.yml
name: ML Pipeline

on:
  schedule:
    - cron: '0 2 * * *' # Diario a las 2 AM

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - name: Export data from Supabase
        run: python scripts/export_data.py
      
      - name: Train models
        run: python scripts/train_models.py
      
      - name: Evaluate models
        run: python scripts/evaluate_models.py
      
      - name: Deploy to production
        if: success()
        run: python scripts/deploy_models.py
```

---

## 10. ROADMAP TÉCNICO PROFESIONAL

### FASE 1: CONSOLIDACIÓN Y OPTIMIZACIÓN (Q2 2026 - 2 meses)

**Objetivo:** Estabilizar sistema actual y optimizar performance

#### Sprint 1-2: Performance y Seguridad
- [ ] Implementar paginación en DynamicRecordsView
- [ ] Crear índices compuestos en DB
- [ ] Implementar compresión de imágenes
- [ ] Refinar políticas RLS por rol
- [ ] Configurar backups automáticos diarios
- [ ] Implementar Sentry para monitoreo de errores
- [ ] Agregar validación de tamaño de archivos
- [ ] Implementar rate limiting básico

#### Sprint 3-4: Testing y Documentación
- [ ] Configurar Vitest para unit tests
- [ ] Escribir tests para dynamicService
- [ ] Configurar Playwright para E2E tests
- [ ] Documentar API con JSDoc
- [ ] Crear guía de contribución
- [ ] Grabar videos de arquitectura
- [ ] Documentar proceso de deployment

**Entregables:**
- ✅ Sistema optimizado (50% más rápido)
- ✅ Cobertura de tests >70%
- ✅ Documentación completa
- ✅ Monitoreo activo

---

### FASE 2: MOTORES ESPECIALIZADOS (Q3 2026 - 3 meses)

**Objetivo:** Implementar motores para Mantenimiento, Calidad y Documental

#### Sprint 5-6: BaseMantenimiento
- [ ] Crear tabla sgc_equipos
- [ ] Crear tabla sgc_mantenimiento_repuestos
- [ ] Implementar BaseMantenimiento.jsx
- [ ] Agregar selector de equipos con búsqueda
- [ ] Implementar cálculo de próximo mantenimiento
- [ ] Crear dashboard de equipos
- [ ] Implementar alertas de mantenimiento vencido

#### Sprint 7-8: BaseCalidad (CAPA)
- [ ] Crear tabla sgc_capa
- [ ] Implementar BaseCalidad.jsx
- [ ] Agregar análisis de causa raíz (5 Whys)
- [ ] Implementar workflow de aprobación
- [ ] Crear dashboard de CAPA
- [ ] Implementar seguimiento de eficacia
- [ ] Generar informes de CAPA automáticos

#### Sprint 9-10: BaseDocumental
- [ ] Crear tabla sgc_documentos_control
- [ ] Implementar BaseDocumental.jsx
- [ ] Agregar control de versiones
- [ ] Implementar firma electrónica de aprobadores
- [ ] Crear matriz de documentos
- [ ] Implementar alertas de revisión
- [ ] Generar lista maestra de documentos

**Entregables:**
- ✅ 3 motores nuevos operativos
- ✅ Cobertura completa de procesos SGC
- ✅ Dashboards especializados

---

### FASE 3: MULTI-TENANT Y SAAS (Q4 2026 - 3 meses)

**Objetivo:** Preparar sistema para múltiples empresas

#### Sprint 11-12: Arquitectura Multi-Tenant
- [ ] Crear tabla tenants
- [ ] Agregar tenant_id a todas las tablas
- [ ] Actualizar RLS policies con tenant isolation
- [ ] Implementar subdominios por tenant
- [ ] Crear panel de administración de tenants
- [ ] Implementar límites por plan (usuarios, storage)
- [ ] Configurar billing con Stripe

#### Sprint 13-14: Onboarding y Personalización
- [ ] Crear wizard de onboarding
- [ ] Implementar personalización de marca (logo, colores)
- [ ] Agregar configuración de módulos por tenant
- [ ] Crear templates de formularios
- [ ] Implementar importación de datos
- [ ] Crear tour guiado para nuevos usuarios

#### Sprint 15-16: API Pública
- [ ] Diseñar API REST
- [ ] Implementar autenticación con API keys
- [ ] Documentar con Swagger/OpenAPI
- [ ] Crear SDK de JavaScript
- [ ] Implementar webhooks
- [ ] Crear marketplace de integraciones

**Entregables:**
- ✅ Sistema multi-tenant operativo
- ✅ API pública documentada
- ✅ Primeros 5 clientes piloto

---

### FASE 4: INTELIGENCIA ARTIFICIAL (Q1 2027 - 4 meses)

**Objetivo:** Integrar capacidades de IA

#### Sprint 17-18: Infraestructura de IA
- [ ] Configurar Data Lake (S3/GCS)
- [ ] Implementar pipeline de ETL diario
- [ ] Configurar Supabase Edge Functions para ML
- [ ] Implementar generación de embeddings
- [ ] Crear índice vectorial para búsqueda semántica
- [ ] Configurar ambiente de entrenamiento (GPU)

#### Sprint 19-20: Detección de Anomalías
- [ ] Entrenar modelo Isolation Forest
- [ ] Implementar API de predicción
- [ ] Integrar alertas en tiempo real
- [ ] Crear dashboard de anomalías
- [ ] Implementar explicabilidad (SHAP)
- [ ] Configurar reentrenamiento automático

#### Sprint 21-22: Análisis Predictivo
- [ ] Entrenar modelo de predicción de fallos
- [ ] Implementar recomendaciones de mantenimiento
- [ ] Crear dashboard predictivo
- [ ] Implementar optimización de frecuencias
- [ ] Agregar simulaciones de escenarios

#### Sprint 23-24: Chatbot RAG
- [ ] Implementar sistema RAG
- [ ] Integrar GPT-4 para respuestas
- [ ] Crear interfaz de chat
- [ ] Implementar búsqueda semántica
- [ ] Agregar generación de informes con IA
- [ ] Implementar OCR para digitalización

**Entregables:**
- ✅ 4 capacidades de IA operativas
- ✅ Reducción 30% en incidentes
- ✅ Ahorro 20% en costos operativos

---

### FASE 5: CUMPLIMIENTO Y CERTIFICACIÓN (Q2 2027 - 2 meses)

**Objetivo:** Certificar cumplimiento normativo

#### Sprint 25-26: Auditoría INVIMA
- [ ] Implementar BaseAuditoria.jsx
- [ ] Crear checklist de requisitos INVIMA
- [ ] Implementar trazabilidad inmutable (blockchain)
- [ ] Generar informes de cumplimiento
- [ ] Crear evidencias de validación
- [ ] Preparar documentación para auditoría

#### Sprint 27-28: Certificación ISO 9001
- [ ] Mapear procesos a requisitos ISO
- [ ] Implementar control de documentos ISO
- [ ] Crear matriz de riesgos
- [ ] Implementar mejora continua (PDCA)
- [ ] Generar manual de calidad
- [ ] Preparar auditoría de certificación

**Entregables:**
- ✅ Sistema certificable INVIMA
- ✅ Sistema certificable ISO 9001
- ✅ Documentación completa de cumplimiento

---

### FASE 6: ESCALABILIDAD GLOBAL (Q3-Q4 2027 - 6 meses)

**Objetivo:** Escalar a nivel internacional

#### Sprint 29-32: Internacionalización
- [ ] Implementar i18n (react-i18next)
- [ ] Traducir a inglés, portugués
- [ ] Adaptar formatos de fecha/hora por región
- [ ] Implementar multi-moneda
- [ ] Configurar CDN global (Cloudflare)
- [ ] Optimizar para latencias internacionales

#### Sprint 33-36: Performance Extrema
- [ ] Implementar particionamiento de tablas
- [ ] Configurar réplicas de lectura
- [ ] Implementar caché distribuido (Redis)
- [ ] Optimizar queries con vistas materializadas
- [ ] Implementar archivado automático
- [ ] Configurar auto-scaling

#### Sprint 37-40: Ecosistema de Integraciones
- [ ] Integración con ERP (SAP, Odoo)
- [ ] Integración con CMMS
- [ ] Integración con IoT (sensores)
- [ ] Integración con BI (Power BI, Tableau)
- [ ] Marketplace de plugins
- [ ] Programa de partners

**Entregables:**
- ✅ Sistema global multi-región
- ✅ 100+ clientes activos
- ✅ Ecosistema de integraciones

---

## MÉTRICAS DE ÉXITO

### KPIs Técnicos

| Métrica | Actual | Meta Q2 2026 | Meta Q4 2026 | Meta Q4 2027 |
|---------|--------|--------------|--------------|--------------|
| **Performance** |
| Tiempo de carga inicial | ~2s | <1s | <500ms | <300ms |
| Tiempo de renderizado de formulario | ~500ms | <200ms | <100ms | <50ms |
| Tiempo de consulta de registros | ~1s | <300ms | <100ms | <50ms |
| **Escalabilidad** |
| Registros soportados | 10K | 100K | 1M | 10M |
| Usuarios concurrentes | 50 | 500 | 5K | 50K |
| Tenants soportados | 1 | 1 | 50 | 500 |
| **Calidad** |
| Cobertura de tests | 0% | 70% | 85% | 95% |
| Bugs en producción/mes | 10 | 3 | 1 | 0 |
| Uptime | 95% | 99% | 99.9% | 99.99% |
| **IA** |
| Precisión de anomalías | - | - | 85% | 95% |
| Precisión de predicciones | - | - | 80% | 90% |
| Tiempo de respuesta chatbot | - | - | <2s | <1s |

### KPIs de Negocio

| Métrica | Meta Q2 2026 | Meta Q4 2026 | Meta Q4 2027 |
|---------|--------------|--------------|--------------|
| Clientes activos | 1 | 10 | 100 |
| MRR (Monthly Recurring Revenue) | $0 | $5K | $50K |
| Churn rate | - | <5% | <3% |
| NPS (Net Promoter Score) | - | >50 | >70 |
| Tiempo de onboarding | - | <1 día | <1 hora |

---

## CONCLUSIONES Y RECOMENDACIONES

### Fortalezas del Sistema Actual

✅ **Arquitectura Sólida**
- Patrón EAV bien implementado
- Separación clara de responsabilidades
- Código limpio y mantenible

✅ **Escalabilidad Inherente**
- Diseño preparado para crecimiento
- Sin hardcoding de lógica de negocio
- Motores reutilizables

✅ **Cumplimiento Normativo**
- Auditoría completa
- Trazabilidad inmutable
- Segregación de funciones

✅ **UX Profesional**
- Interfaz moderna y responsive
- Optimizado para tablets
- Flujos intuitivos

### Áreas de Mejora Prioritarias

🔴 **CRÍTICO - Implementar YA**
1. Backups automáticos diarios
2. Monitoreo de errores (Sentry)
3. Paginación en historial de registros
4. Compresión de imágenes

🟡 **IMPORTANTE - Implementar en Q2 2026**
1. Testing automatizado
2. Caché de consultas frecuentes
3. Optimización de queries
4. Documentación técnica completa

🟢 **DESEABLE - Implementar en Q3-Q4 2026**
1. Motores especializados
2. Multi-tenant
3. API pública
4. Integraciones



### Recomendación Final

El sistema SGC de DM Distribuciones tiene una **base arquitectónica excepcional** que lo posiciona como un producto enterprise-ready. La estrategia de "extender, no reemplazar" es correcta y debe mantenerse.

**Próximos Pasos Inmediatos:**

1. **Semana 1-2:** Implementar backups y monitoreo
2. **Semana 3-4:** Optimizar performance (paginación, índices)
3. **Mes 2:** Implementar testing automatizado
4. **Mes 3:** Completar documentación técnica

Con estas mejoras, el sistema estará listo para:
- ✅ Certificación INVIMA/ISO
- ✅ Escalamiento a múltiples empresas
- ✅ Integración con IA
- ✅ Crecimiento exponencial

---

**Documento preparado por:** Arquitecto de Software Senior  
**Fecha:** Mayo 18, 2026  
**Versión:** 1.0  
**Clasificación:** Confidencial - Uso Interno

---

*Este documento es un análisis técnico profesional y debe ser revisado periódicamente para mantener su vigencia.*
