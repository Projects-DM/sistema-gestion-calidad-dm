# FLUJO DE RENDERIZADO DINÁMICO - SGC EMPRESARIAL

**Documento:** Especificación del Ciclo de Vida del Renderizado Dinámico  
**Versión:** 1.0  
**Clasificación:** Documentación Técnica Estratégica  
**Sistema:** Sistema de Gestión de Calidad (SGC) DM Distribuciones

---

## 1. VISIÓN GENERAL DEL FLUJO

### 1.1 Mapa del Ciclo de Vida Completo

```
                    ┌─────────────────────────┐
                    │  CONFIGURACIÓN EN BD     │
                    │  (Panel Administrador)   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     NAVEGACIÓN SPA       │
                    │  (Dashboard → Módulo)   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   CARGA DE FORMULARIO    │
                    │  (DynamicForm.jsx)       │
                    └────────────┬────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
    ┌─────▼──────┐        ┌─────▼──────┐        ┌─────▼──────┐
    │ BaseCheck- │        │BaseMedicio-│        │  BaseGene- │
    │ list       │        │nes         │        │  ric       │
    └─────┬──────┘        └─────┬──────┘        └─────┬──────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ VALIDACIÓN CONDICIONAL   │
                    │ (Evidencias requeridas)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       SUBMIT + PERSIS-  │
                    │       TENCIA            │
                    │ (dynamicService.js)     │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   VISUALIZACIÓN + VERI- │
                    │   FICACIÓN              │
                    │ (DynamicRecordsView)    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    AUDITORÍA INMUTABLE   │
                    │  (sgc_audit_logs)       │
                    └─────────────────────────┘
```

### 1.2 Filosofía del Flujo

El flujo de renderizado dinámico sigue el principio de **separación de responsabilidades**:

| Capa | Responsabilidad | No Responsabilidad |
|------|----------------|-------------------|
| **DynamicForm** | Orquestar carga, validación, envío | Renderizar campos específicos |
| **Motores** | Renderizar UI según field_type | Gestionar estado, validar reglas de negocio |
| **dynamicService** | Persistencia, auditoría, consultas | Renderizado, lógica de UI |
| **DynamicRecordsView** | Visualización, filtros, verificación | Edición, creación de registros |

---

## 2. FASE 1: CONFIGURACIÓN EN BASE DE DATOS

### 2.1 Actor: Administrador del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  PANEL DE ADMINISTRACIÓN                                 │
│                                                                          │
│  PASO 1: Crear Módulo                                                    │
│  ├── INSERT INTO sgc_modules (name, slug, icon, description)            │
│  └── Resultado: "Operaciones" con slug "operaciones"                    │
│                                                                          │
│  PASO 2: Crear Formulario                                                │
│  ├── INSERT INTO sgc_forms (module_id, name, slug, engine_type,         │
│  │   roles_allowed)                                                     │
│  ├── engine_type determina el motor: 'BaseChecklist', 'BaseMediciones'  │
│  └── roles_allowed controla quién puede usarlo                          │
│                                                                          │
│  PASO 3: Definir Campos                                                  │
│  ├── INSERT INTO sgc_form_fields (form_id, name, label, field_type,     │
│  │   options, required, order_index)                                    │
│  ├── field_type determina el componente UI                              │
│  ├── options JSONB configura {min, max, unit, choices}                  │
│  └── order_index define el orden de renderizado                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Estructura de Datos Resultante

```json
{
  "module": { "name": "Operaciones", "slug": "operaciones" },
  "form": {
    "name": "Checklist de Limpieza",
    "slug": "limpieza-diaria",
    "engine_type": "BaseChecklist",
    "roles_allowed": ["administrador", "calidad", "operativo"]
  },
  "fields": [
    { "name": "area_recepcion", "label": "Área de Recepción limpia", "field_type": "boolean", "required": true, "order_index": 1 },
    { "name": "area_almacenamiento", "label": "Estanterías organizadas", "field_type": "boolean", "required": true, "order_index": 2 },
    { "name": "pasillos", "label": "Pasillos despejados", "field_type": "boolean", "required": true, "order_index": 3 },
    { "name": "observaciones", "label": "Observaciones", "field_type": "text", "required": false, "order_index": 4 }
  ]
}
```

---

## 3. FASE 2: NAVEGACIÓN (SPA)

### 3.1 Flujo de Rutas

```
RUTA: /                                     → Dashboard.jsx
      ↓
RUTA: /operaciones                          → DynamicModule.jsx
      ↓                                        (Carga módulo + formularios)
RUTA: /modulo/operaciones/limpieza-diaria   → DynamicForm.jsx
                                                (Carga formulario + campos)
```

### 3.2 DynamicModule.jsx — Orquestador de Módulo

**Ubicación:** `src/pages/DynamicModule.jsx`

**Responsabilidades:**
1. Cargar metadatos del módulo (`getModuleBySlug`)
2. Cargar formularios del módulo (`getFormsByModule`)
3. Filtrar formularios por rol del usuario
4. Renderizar grid de tarjetas de formularios
5. Proveer pestañas: "Diligenciar Registros" / "Historial y Consultas"

**Flujo de carga:**
```javascript
useEffect(() => {
  async function loadData() {
    // 1. Caso especial: módulo legacy de trazabilidad redirige
    if (moduleSlug === 'trazabilidad') {
      navigate('/trazabilidad', { replace: true });
      return;
    }
    // 2. Cargar módulo
    const moduleData = await dynamicService.getModuleBySlug(moduleSlug);
    // 3. Cargar formularios
    const formsData = await dynamicService.getFormsByModule(moduleData.id);
    // 4. Filtrar por rol
    const filteredForms = formsData.filter(f =>
      !f.roles_allowed || f.roles_allowed.includes(rol)
    );
  }
  loadData();
}, [moduleSlug]);
```

**Estados UI:**
```
[LOADING] → [MÓDULO CARGADO] → [GRID DE FORMULARIOS] o [HISTORIAL]
    ↓
[ERROR] → "Módulo no encontrado"
```

---

## 4. FASE 3: CARGA DE FORMULARIO (DynamicForm.jsx)

### 4.1 DynamicForm.jsx — Orquestador Principal

**Ubicación:** `src/pages/DynamicForm.jsx`

**Responsabilidades:**
1. Obtener definición del formulario por slug
2. Validar permisos del usuario
3. Obtener campos del formulario
4. Inicializar estado del formulario
5. Seleccionar y cargar motor de renderizado
6. Ejecutar validaciones condicionales en tiempo real
7. Coordinar el envío con evidencias y firmas
8. Redirigir al módulo tras éxito

### 4.2 Ciclo de Vida Técnico

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CICLO DE VIDA DE DynamicForm.jsx                   │
│                                                                          │
│  MOUNTING                                                                │
│  ├── useState: formDef, fields, loading, saving, values, evidences,     │
│  │   evidenceRequired, success                                          │
│  ├── useParams: moduleSlug, formSlug                                    │
│  └── useAuth: user, rol                                                  │
│                                                                          │
│  EFFECT 1: Carga Inicial                                                 │
│  ├── getFormBySlug(formSlug) → formDef                                  │
│  ├── Validar: formDef.roles_allowed.includes(rol)                       │
│  ├── getFormFields(formDef.id) → fields[]                               │
│  └── Inicializar: values = { fieldId: false/'' }                       │
│                                                                          │
│  DEPENDENCIAS: [formSlug, rol] → Recarga si cambia                      │
│                                                                          │
│  EFFECT 2: Validación Condicional                                        │
│  ├── Iterar fields                                                      │
│  ├── Si boolean===false → evidenceRequired = true                       │
│  ├── Si number fuera de rango → evidenceRequired = true                 │
│  └── setEvidenceRequired(hasCriticals)                                  │
│                                                                          │
│  DEPENDENCIAS: [values, fields] → Recalcula en cada cambio              │
│                                                                          │
│  RENDER:                                                                 │
│  ├── [loading=true] → Spinner                                           │
│  ├── [!formDef] → "Formulario no encontrado"                            │
│  ├── [success=true] → Check + Redirección                               │
│  └── [default] → Form + Motor + EvidenceUploader + Botón Guardar        │
│                                                                          │
│  SUBMIT:                                                                 │
│  ├── Validar campos requeridos                                          │
│  ├── Validar evidencias (si evidenceRequired)                           │
│  ├── Validar observaciones (si evidenceRequired)                        │
│  ├── Procesar valores (parseFloat)                                      │
│  ├── submitFormResponse(formDef.id, user.id, values, evidences)        │
│  ├── setSuccess(true)                                                    │
│  └── setTimeout(() => navigate, 2000ms)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Resolución de Motor

```javascript
const renderEngine = () => {
  const props = { fields, values, onChange: handleChange };

  switch (formDef.engine_type) {
    case 'BaseChecklist':
      return <BaseChecklist {...props} />;
    case 'BaseMediciones':
      return <BaseMediciones {...props} />;
    // Futuros: BaseMantenimiento, BaseCalidad, BaseDocumental
    default:
      return <BaseGeneric {...props} />;
  }
};
```

**Arquitectura actual:** Switch directo con imports estáticos  
**Arquitectura futura:** EngineRegistry con lazy loading dinámico

### 4.4 Mecanismo de Validación Condicional

```javascript
useEffect(() => {
  if (!fields.length) return;
  let hasCriticals = false;

  fields.forEach(f => {
    // Regla 1: Booleano false → crítico
    if (f.field_type === 'boolean' && values[f.id] === false) {
      hasCriticals = true;
    }
    // Regla 2: Número fuera de rango → crítico
    if (f.field_type === 'number' && values[f.id] !== '' && values[f.id] !== null) {
      const val = parseFloat(values[f.id]);
      if ((f.options?.min !== undefined && val < f.options.min) ||
          (f.options?.max !== undefined && val > f.options.max)) {
        hasCriticals = true;
      }
    }
  });

  setEvidenceRequired(hasCriticals);
}, [values, fields]);
```

**Impacto en UI:** Cuando `evidenceRequired = true`:
- El botón de guardar no se activa hasta adjuntar evidencias
- Se mustra alerta: "Hallazgos críticos detectados — evidencia obligatoria"
- El campo de observaciones se vuelve obligatorio

### 4.5 Flujo de Submit

```
handleSubmit(e)
├── e.preventDefault()
│
├── VALIDACIÓN 1: Campos requeridos
│   └── Por cada field.required → values[field.id] no vacío
│       └── Si falla → alert("El campo X es obligatorio") + return
│
├── VALIDACIÓN 2: Evidencias (si evidenceRequired)
│   ├── evidences.length === 0 → alert("Evidencia obligatoria") + return
│   └── Buscar campo de observaciones → si está vacío → alert + return
│
├── PROCESAMIENTO: Convertir valores
│   └── field_type === 'number' → parseFloat(val)
│
├── PERSISTENCIA: submitFormResponse(formId, userId, processedValues, evidences)
│
├── ÉXITO: setSuccess(true)
│   └── setTimeout(() => navigate(`/${moduleSlug}`), 2000)
│
└── ERROR: alert(error.message)
```

---

## 5. FASE 4: PERSISTENCIA (dynamicService.submitFormResponse)

### 5.1 Flujo Transaccional

```javascript
async submitFormResponse(formId, userId, values, evidences = []) {
  const supabase = getSupabaseClient();

  // PASO 1: Crear respuesta
  const { data: response, error: resError } = await supabase
    .from('sgc_form_responses')
    .insert({ form_id: formId, created_by: userId, status: 'pendiente_revision' })
    .select()
    .single();
  if (resError) throw resError;

  // PASO 2: Insertar valores (batch)
  const responseValues = Object.keys(values).map(fieldId => {
    const val = values[fieldId];
    let valueField = 'value_text';
    if (typeof val === 'number') valueField = 'value_number';
    else if (typeof val === 'boolean') valueField = 'value_boolean';
    else if (typeof val === 'object') valueField = 'value_json';
    return { response_id: response.id, field_id: fieldId, [valueField]: val };
  });
  if (responseValues.length > 0) {
    await supabase.from('sgc_response_values').insert(responseValues);
  }

  // PASO 3: Insertar evidencias (batch)
  if (evidences.length > 0) {
    const evsToInsert = evidences.map(ev => ({
      response_id: response.id,
      file_url: ev.file_url,
      storage_path: ev.storage_path,
      file_type: ev.file_type || 'image/jpeg'
    }));
    await supabase.from('sgc_evidences').insert(evsToInsert);
  }

  // PASO 4: Auditoría
  await supabase.from('sgc_audit_logs').insert({
    response_id: response.id,
    action_type: 'create',
    modified_by: userId,
    new_data: values,
    reason: 'Creación inicial del registro'
  });

  return response;
}
```

### 5.2 Diagrama de Persistencia

```
                    ┌─────────────────────┐
                    │   PARÁMETROS        │
                    │ formId, userId,     │
                    │ values{}, evidences │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  PASO 1: sgc_form_  │
                    │  responses           │
                    │  INSERT + RETURNING  │
                    │  → response.id      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  PASO 2: sgc_       │
                    │  response_values    │
                    │  INSERT BATCH       │
                    │  [response_id,      │
                    │   field_id,         │
                    │   value_*]          │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  PASO 3: sgc_       │
                    │  evidences          │
                    │  INSERT BATCH       │
                    │  [response_id,      │
                    │   file_url,         │
                    │   storage_path,     │
                    │   file_type]        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  PASO 4: sgc_audit_ │
                    │  logs               │
                    │  INSERT             │
                    │  [response_id,      │
                    │   'create',         │
                    │   userId,           │
                    │   values,           │
                    │   'Creación inicial']│
                    └─────────────────────┘

          ⚠️ NOTA: Cada INSERT es independiente
             No hay transaccionalidad real (BEGIN/COMMIT)
             Riesgo: Si paso 3 falla, pasos 1 y 2 ya persistieron
```

### 5.3 Riesgo Identificado: Falta de Transaccionalidad

| Problema | Consecuencia | Mitigación Planeada |
|----------|-------------|-------------------|
| Paso 1 y 2 exitosos, paso 3 falla | Response sin evidencias, datos huérfanos parciales | Edge Function de Supabase con transacción real |
| Paso 3 exitoso, paso 4 falla | Response sin auditoría, pérdida de trazabilidad | Retry logic en frontend, tabla de eventos fallidos |
| Sin rollback automático | Inconsistencia de datos | Implementar función RPC con BEGIN/COMMIT/ROLLBACK |

---

## 6. FASE 5: CAPTURA DE EVIDENCIAS (EvidenceUploader.jsx)

### 6.1 EvidenceUploader.jsx

**Ubicación:** `src/components/EvidenceUploader.jsx`

**Propósito:** Componente universal para adjuntar evidencias fotográficas o documentos a un registro.

### 6.2 Flujo de Subida

```
USUARIO
  │
  ├── Opción 1: "Subir Archivo"
  │   └── input type="file" accept="image/*,application/pdf"
  │
  ├── Opción 2: "Tomar Foto"
  │   └── input type="file" accept="image/*" capture="environment"
  │
  └── handleFileChange(e)
        │
        └── Por cada archivo seleccionado:
              │
              ├── Generar fileName único: random(15)_timestamp.ext
              │
              ├── Upload a Supabase Storage
              │   └── bucket: "documentos-sgc"
              │   └── path: "evidencias/{fileName}"
              │
              ├── Obtener Public URL
              │   └── getPublicUrl(filePath)
              │
              ├── Construir objeto evidence:
              │   { file_url, storage_path, file_type, name }
              │
              └── Agregar al estado + callback onEvidencesChange
```

### 6.3 Características Técnicas

- **Subida secuencial**: Los archivos se suben uno por uno (no batch)
- **Sin compresión**: Las imágenes se suben en tamaño original (5-10 MB típico)
- **Preview**: Grid de thumbnails con hover para eliminar
- **Eliminación**: Remove del storage + remove del estado local
- **Sin límite de tamaño**: No hay validación actual de tamaño máximo

### 6.4 Oportunidades de Optimización

| Mejora | Impacto | Prioridad |
|--------|---------|-----------|
| Compresión de imágenes (browser-image-compression) | Reducción 80% tamaño | 🔴 Alta |
| Thumbnails para preview rápido | UX en listados | 🟡 Media |
| Validación de tamaño máximo (10MB) | Protección storage | 🟡 Media |
| Validación MIME type (magic bytes) | Seguridad | 🟡 Media |
| Subida paralela con Promise.all | Performance | 🟢 Baja |

---

## 7. FASE 6: CAPTURA DE FIRMAS (SignaturePad.jsx)

### 7.1 SignaturePad.jsx

**Ubicación:** `src/components/SignaturePad.jsx`

**Propósito:** Capturar firmas digitales mediante Canvas HTML5.

### 7.2 Flujo de Firma

```
USUARIO
  │
  ├── Renderiza Canvas HTML5 (300x150px por defecto)
  │
  ├── Usuario dibuja firma con mouse/touch
  │   └── Eventos: onMouseDown, onMouseMove, onMouseUp
  │   └── Eventos: onTouchStart, onTouchMove, onTouchEnd
  │
  ├── Botón "Limpiar" → clearRect()
  │
  └── Botón "Confirmar" (o al onChange)
        │
        └── canvas.toDataURL('image/png')
              │
              ├── Convertir base64 a Blob
              │
              ├── Upload a Supabase Storage
              │   └── bucket: "documentos-sgc"
              │   └── path: "firmas/{fileName}.png"
              │
              ├── Obtener Public URL
              │
              └── onChange(url) → se almacena en values[fieldId] = url
```

### 7.3 Características Técnicas

- **Canvas nativo**: Sin librerías externas de firma
- **Touch soportado**: Eventos touch para tablets
- **Formato PNG**: toDataURL con fondo transparente
- **Almacenamiento**: La URL de la firma se guarda en sgc_response_values.value_text
- **Visualización**: En DynamicRecordsView se muestra como imagen con filter contrast-125%

---

## 8. FASE 7: VISUALIZACIÓN Y VERIFICACIÓN (DynamicRecordsView.jsx)

### 8.1 DynamicRecordsView.jsx

**Ubicación:** `src/components/DynamicRecordsView.jsx`

**Propósito:** Visualizar historial de registros de un módulo, con filtros, verificación individual/masiva y trazabilidad.

### 8.2 Flujo de Carga

```javascript
useEffect(() => {
  if (moduleId) loadRecords();
}, [moduleId]);

const loadRecords = async () => {
  // 1. Obtener registros con JOINs
  const data = await dynamicService.getModuleResponses(moduleId);

  // 2. Computar estado dinámico
  const processed = data.map(record => {
    let status = 'cumple';
    let criticalIssues = [];

    record.sgc_response_values?.forEach(val => {
      const field = val.sgc_form_fields;
      if (!field) return;

      // Booleano false → advertencia o crítico
      if (field.field_type === 'boolean' && val.value_boolean === false) {
        status = status === 'critico' ? 'critico' : 'advertencia';
        criticalIssues.push(`${field.label} (No Cumple)`);
      }

      // Número fuera de rango → crítico
      if (field.field_type === 'number' && val.value_number !== null) {
        if (val.value_number < field.options?.min || val.value_number > field.options?.max) {
          status = 'critico';
          criticalIssues.push(`${field.label} (${val.value_number} fuera de rango)`);
        }
      }
    });

    return { ...record, computedStatus: status, criticalIssues };
  });

  setRecords(processed);
};
```

### 8.3 Sistema de Estados Computados

```
┌───────────────────────────────────────────────┐
│              ESTADOS DEL REGISTRO              │
├───────────────────────────────────────────────┤
│                                                 │
│  COMPUTED STATUS (Basado en datos)              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │  cumple    │ │ advertencia│ │  crítico   │ │
│  │  🟢 Verde  │ │  🟡 Ámbar  │ │  🔴 Rojo   │ │
│  │ (Todos ok) │ │(Algún No   │ │(Valor fuera│ │
│  │             │ │ Cumple)   │ │ de rango)  │ │
│  └────────────┘ └────────────┘ └────────────┘ │
│                                                 │
│  VERIFICATION STATUS (Basado en workflow)       │
│  ┌────────────────┐ ┌──────────┐ ┌──────────┐ │
│  │ pendiente_     │ │ aprobado │ │rechazado │ │
│  │ revision        │ │ 🟢       │ │ 🔴       │ │
│  │ 🟡             │ │          │ │          │ │
│  └────────────────┘ └──────────┘ └──────────┘ │
└───────────────────────────────────────────────┘
```

### 8.4 Sistema de Filtros

```javascript
const filteredRecords = records.filter(rec => {
  if (filter === 'todos') return true;
  if (filter === 'pendientes') return rec.status === 'pendiente_revision';
  if (filter === 'aprobados') return rec.status === 'aprobado';
  if (filter === 'rechazados') return rec.status === 'rechazado';
  if (filter === 'criticos') return rec.computedStatus === 'critico';
  if (filter === 'hoy') {
    const today = new Date().setHours(0,0,0,0);
    const recDate = new Date(rec.created_at).setHours(0,0,0,0);
    return today === recDate;
  }
  return true;
});
```

### 8.5 Modal de Detalles

```
┌────────────────────────────────────────────────────────────────┐
│  MODAL DE DETALLE DE REGISTRO                                  │
├────────────────────────────────────────────────────────────────┤
│  [Badge Estado] [Nombre Formulario]             [✕ Cerrar]    │
│  ID: a1b2c3d4                                                  │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐│
│  │  Fecha       │  Hora        │  Autor       │  Resultado   ││
│  │  18/05/2026  │  14:30       │  Juan Pérez  │  Crítico 🔴  ││
│  └──────────────┴──────────────┴──────────────┴──────────────┘│
├────────────────────────────────────────────────────────────────┤
│  [Pestaña 1: Respuestas y Evidencias]                          │
│  [Pestaña 2: Auditoría y Trazabilidad]                         │
├────────────────────────────────────────────────────────────────┤
│                                                               │
│  TAB 1:                                                        │
│  ┌─ Hallazgos Críticos ──────────────────────────────────────┐│
│  │  ⚠️ Área de Recepción (No Cumple)                        ││
│  │  ⚠️ Temperatura (35°C fuera de rango)                    ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─ Respuestas ─────────────────────────────────────────────┐│
│  │  Área de Recepción:           No / No Cumple      🔴    ││
│  │  Pasillos:                    Sí / Cumple          🟢   ││
│  │  Temperatura:                 35.2 °C              🔴   ││
│  │  Firma:                       [Signature Image]         ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─ Evidencias ────────────────────────────────────────────┐│
│  │  [IMG] [IMG] [IMG]                                      ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  ┌─ Verificación ───────────────────────────────────────────┐│
│  │  Comentario: [_____________________________]              ││
│  │  [Aprobar] [Rechazar]                                    ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  TAB 2:                                                       │
│  ┌─ Timeline de Auditoría ──────────────────────────────────┐│
│  │  ● Juan Pérez — create — 18/05 14:30                    ││
│  │  │  "Creación inicial del registro"                     ││
│  │                                                          ││
│  │  ● María García — verify — 18/05 15:00                  ││
│  │    "Verificación operativa: aprobado"                    ││
│  └──────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

### 8.6 Verificación (Individual y Masiva)

**Reglas de verificación:**
```javascript
// Solo administradores y calidad pueden verificar
const isVerificador = rol === 'administrador' || rol === 'calidad';

// Ningún usuario puede verificar sus propios registros
const isOwnRecord = rec.created_by === user.id;
const canVerifyRecord = isVerificador && !isOwnRecord;
```

**Verificación individual:**
```javascript
await dynamicService.verifyFormResponse(selectedRecord.id, user.id, verifyStatus, verifyComment);
```

**Verificación masiva:**
```javascript
// Selección múltiple + comentario global + actualización en batch
await dynamicService.verifyMultipleFormResponses(selectedIds, user.id, status, comment);
```

---

## 9. MAPA DE DEPENDENCIAS DEL FLUJO

```
                    ┌──────────────────────┐
                    │   React Router DOM   │
                    │  (Rutas dinámicas)   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │      Dashboard       │
                    │    (Portal Home)     │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   DynamicModule      │
                    │ (Orquestador Módulo) │
                    └──────┬──────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
    ┌─────────▼─────┐ ┌───▼──────┐ ┌───▼──────────┐
    │  DynamicForm  │ │Document- │ │DynamicRecords │
    │  (Creación)   │ │Module    │ │View (Historial│
    └───────┬───────┘ │(PDF)     │ │ + Verificación│
            │         └──────────┘ └───────┬───────┘
     ┌──────┼──────┐                       │
     │      │      │                       │
  ┌──▼─┐ ┌──▼──┐ ┌─▼───┐                 │
  │Base│ │Base │ │Base │                 │
  │Che-│ │Medi-│ │Gene-│                 │
  │ck- │ │cio- │ │ric  │                 │
  │list│ │nes  │ │     │                 │
  └──┬─┘ └──┬──┘ └──┬──┘                 │
     │      │       │                    │
     └──────┼───────┘                    │
            │                            │
      ┌─────▼────────────────────────────▼──┐
      │          dynamicService.js          │
      │     (API Layer - Punto Central)     │
      └────────────────┬────────────────────┘
                       │
      ┌────────────────▼────────────────────┐
      │            Supabase Client           │
      │  Auth │ DB │ Storage │ RLS          │
      └─────────────────────────────────────┘
```

---

## 10. PUNTOS CRÍTICOS DEL FLUJO

### 10.1 Riesgos Identificados

| ID | Punto Crítico | Riesgo | Impacto | Mitigación |
|----|--------------|--------|---------|------------|
| **FLUJO-01** | Carga sin paginación en getModuleResponses | Timeout con >100K registros | Alto | Paginación con range() |
| **FLUJO-02** | Sin transaccionalidad en submit | Datos huérfanos parciales | Medio | Edge Function transaccional |
| **FLUJO-03** | Sin compresión de evidencias | Costos de storage, lentitud | Medio | browser-image-compression |
| **FLUJO-04** | Estados de carga parciales (saving sin bloqueo total) | Doble submit | Medio | Deshabilitar botón durante saving |
| **FLUJO-05** | Validación solo en frontend | Bypass de validación | Medio | RLS policies + validación en backend |
| **FLUJO-06** | Sin control de concurrencia | Last Write Wins | Medio | Optimistic locking con version |
| **FLUJO-07** | Sin caché de módulos/formularios | Carga repetitiva | Bajo | In-memory cache en dynamicService |

### 10.2 Oportunidades de Optimización

| # | Oportunidad | Componente | Beneficio |
|---|-------------|-----------|-----------|
| 1 | Lazy loading de motores (EngineRegistry) | DynamicForm | Reducción bundle inicial |
| 2 | Memoización de campos estáticos | Motores | Menos re-renders |
| 3 | Virtualización de tabla con react-window | DynamicRecordsView | Performance con >1000 registros |
| 4 | Debounce en validación condicional | DynamicForm | Menos ciclos de render |
| 5 | Caché de consultas frecuentes | dynamicService | Menos llamadas a Supabase |
| 6 | Subida paralela de evidencias | EvidenceUploader | Velocidad de subida |

---

## 11. FLUJO COMPLETO — DIAGRAMA DE SECUENCIA

```
ADMIN               FRONTEND                    dynamicService          SUPABASE
  │                     │                            │                    │
  │─── Crear módulo ───→│                            │                    │
  │                     │─── INSERT sgc_modules ────→│──── INSERT ──────→│
  │                     │                            │                    │
  │─── Crear form ─────→│                            │                    │
  │                     │─── INSERT sgc_forms ──────→│──── INSERT ──────→│
  │                     │                            │                    │
  │─── Crear campos ───→│                            │                    │
  │                     │─── INSERT sgc_form_fields →│──── INSERT ──────→│
  │                     │                            │                    │
  │                     │                            │                    │
OPERARIO                │                            │                    │
  │                     │                            │                    │
  │─── Navega a módulo →│                            │                    │
  │                     │─── getModuleBySlug() ─────→│──── SELECT ──────→│
  │                     │←── moduleData ─────────────│←── data ──────────│
  │                     │                            │                    │
  │                     │─── getFormsByModule() ────→│──── SELECT ──────→│
  │                     │←── formsData ──────────────│←── data ──────────│
  │                     │                            │                    │
  │─── Selecciona form →│                            │                    │
  │                     │─── getFormBySlug() ───────→│──── SELECT ──────→│
  │                     │←── formDef ────────────────│←── data ──────────│
  │                     │                            │                    │
  │                     │─── getFormFields() ───────→│──── SELECT ──────→│
  │                     │←── fields[] ───────────────│←── data ──────────│
  │                     │                            │                    │
  │                     │ Renderiza Motor            │                    │
  │                     │ (BaseChecklist/Mediciones) │                    │
  │                     │                            │                    │
  │─── Completa campos →│                            │                    │
  │─── Adjunta evidencia│─── Upload Storage ────────→│──── upload ──────→│
  │─── Firma           │─── Upload Storage ────────→│──── upload ──────→│
  │                     │                            │                    │
  │─── Guardar ────────→│                            │                    │
  │                     │─── submitFormResponse() ──→│                    │
  │                     │                            │─── INSERT ───────→│
  │                     │                            │─── INSERT batch ─→│
  │                     │                            │─── INSERT batch ─→│
  │                     │                            │─── INSERT ───────→│
  │                     │←── success ────────────────│←── response ──────│
  │                     │                            │                    │
  │                     │ Redirige a módulo          │                    │
  │                     │                            │                    │
  │                     │                            │                    │
CALIDAD/ADMIN            │                            │                    │
  │                     │                            │                    │
  │─── Abre historial ─→│                            │                    │
  │                     │─── getModuleResponses() ──→│──── SELECT ──────→│
  │                     │←── records[] ──────────────│←── data ──────────│
  │                     │                            │                    │
  │─── Filtra y revisa →│                            │                    │
  │                     │                            │                    │
  │─── Verifica ───────→│                            │                    │
  │                     │─── verifyFormResponse() ──→│                    │
  │                     │                            │─── UPDATE ───────→│
  │                     │                            │─── INSERT audit ─→│
  │                     │←── success ────────────────│←── done ──────────│
```

---

## 12. MÉTRICAS DEL FLUJO

| Etapa | Tiempo Estimado | Dependencia | Cuello de Botella |
|-------|:---------------:|-------------|-------------------|
| Carga de módulo | ~200ms | Supabase query | Sin caché |
| Carga de formulario | ~150ms | Supabase query | Sin caché |
| Carga de campos | ~100ms | Supabase query | Sin caché |
| Renderizado de motor | ~50ms | React render | Complejidad del motor |
| Validación condicional | ~10ms | JavaScript | Cantidad de campos |
| Subida de evidencia | ~2-5s | Supabase Storage | Sin compresión |
| Submit | ~500ms | 4 INSERTs secuenciales | Sin transaccionalidad |
| Carga de historial | ~1-3s | 5 JOINs sin paginación | ⚠️ CRÍTICO |
| Verificación | ~300ms | UPDATE + INSERT audit | — |

---

**Documento mantenido por:** Arquitectura de Software  
**Última actualización:** Mayo 2026  
**Próxima revisión:** Julio 2026