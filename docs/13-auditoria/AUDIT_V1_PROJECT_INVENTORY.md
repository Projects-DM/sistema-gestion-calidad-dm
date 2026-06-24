# AUDIT_V1_PROJECT_INVENTORY

## 1) Árbol de carpetas (src/ , profundidad máx. 4)
```text
src/
├── components/
│   ├── engines/
│   │   ├── BaseChecklist.jsx
│   │   ├── BaseGeneric.jsx
│   │   └── BaseMediciones.jsx
│   ├── DocumentManager.jsx
│   ├── DocumentModule.jsx
│   ├── DynamicRecordsView.jsx
│   ├── EvidenceUploader.jsx
│   ├── ExcelUploadModal.jsx
│   ├── FormBuilder.jsx
│   ├── ProtectedRoute.jsx
│   ├── RoleGate.jsx
│   └── SignaturePad.jsx
├── config/
│   └── dispatchesConfig.js
├── context/
│   └── AuthContext.jsx
├── hooks/
│   └── useAuth.js
├── layouts/
│   └── DashboardLayout.jsx
├── lib/
│   ├── supabase.js
│   └── supabaseClient.js
├── pages/
│   ├── Certificates.jsx
│   ├── Configuration.jsx
│   ├── Dashboard.jsx
│   ├── Dispatches.jsx
│   ├── DynamicForm.jsx
│   ├── DynamicModule.jsx
│   ├── Login.jsx
│   ├── TechnicalSheets.jsx
│   ├── Traceability.jsx
│   ├── Users.jsx
│   └── (resto: ver src/pages/*)
├── runtime/
│   ├── builder/
│   │   ├── contracts/
│   │   │   └── RuntimeBuilderContracts.ts
│   │   └── engine/
│   │       └── RuntimeBuilder.ts
│   │   └── provider/
│   │       └── RuntimeBuilderProvider.ts
│   ├── context/
│   │   ├── index.ts
│   │   └── RuntimeContext.tsx
│   ├── eventing/
│   │   └── SaveLifecycleEventDispatcher.ts
│   ├── fields/
│   │   ├── contracts/
│   │   │   └── FieldContracts.ts
│   │   └── registry/
│   │       ├── FieldRegistry.ts
│   │       └── FieldRegistryProvider.ts
│   ├── form/
│   │   └── engine/
│   │       └── FormRendererEngine.tsx
│   ├── forms/
│   │   ├── contracts/
│   │   │   └── FormContracts.ts
│   │   ├── registry/
│   │   │   ├── FormRegistry.ts
│   │   │   └── FormRegistryProvider.ts
│   │   └── runtime/
│   │       ├── FormRuntimeContracts.ts
│   │       ├── FormRuntimeProvider.ts
│   │       └── FormRuntimeResolver.ts
│   ├── hooks/
│   │   └── useRuntimeField.ts
│   ├── integration/
│   │   ├── BusinessEventTranslationLayer.ts
│   │   └── RuntimeActivationLayer.ts
│   ├── layout/
│   │   ├── contracts/
│   │   │   └── LayoutContracts.ts
│   │   ├── engine/
│   │   │   └── LayoutEngine.tsx
│   │   └── registry/
│   │       ├── LayoutRegistry.ts
│   │       └── LayoutRegistryProvider.ts
│   ├── persistence/
│   │   ├── adapters/
│   │   │   └── SupabaseRuntimeAdapter.ts
│   │   └── draft/
│   │       └── DraftPersistenceLayer.ts
│   ├── playground/
│   │   ├── index.ts
│   │   └── RuntimePlaygroundSandbox.tsx
│   ├── provider/
│   │   └── RuntimeProviderRoot.tsx
│   ├── recovery/
│   │   ├── InMemoryRuntimeRecoveryStorage.ts
│   │   ├── RuntimeDraftRecoveryManager.ts
│   │   └── RuntimeRecoveryOrchestrator.ts
│   ├── registry/
│   │   └── ComponentRegistryBase.tsx
│   ├── renderer/
│   │   ├── fields/
│   │   │   ├── FieldCalculated.tsx
│   │   │   ├── FieldCheckbox.tsx
│   │   │   ├── FieldDate.tsx
│   │   │   ├── FieldDateTime.tsx
│   │   │   ├── FieldFileUpload.tsx
│   │   │   ├── FieldMultiSelect.tsx
│   │   │   ├── FieldNumber.tsx
│   │   │   ├── FieldRadio.tsx
│   │   │   ├── FieldSelect.tsx
│   │   │   ├── FieldSignature.tsx
│   │   │   ├── FieldTable.tsx
│   │   │   ├── FieldText.tsx
│   │   │   └── FieldTextarea.tsx
│   │   ├── index.ts
│   │   ├── LayoutRendererBase.tsx
│   │   └── RuntimeRendererBase.tsx
│   ├── rendering/
│   │   ├── DynamicFieldRenderer.tsx
│   │   └── registry/ (carpeta)
│   ├── rules/
│   └── (resto de submódulos runtime/*: ver árbol completo)
├── services/
│   ├── despachosService.js
│   ├── documentosService.js
│   └── dynamicService.js
├── utils/
│   ├── dispatchesExcel.js
│   ├── dispatchesPdf.js
│   └── Untitled
└── assets/ (imagen/íconos)
```

## 2) Runtime (existencia, rutas, dependencias principales)

### 2.1 RuntimeBuilder ✅
- **Ruta:** `src/runtime/builder/engine/RuntimeBuilder.ts`
- **Estado:** existe y exporta `RuntimeBuilder` con métodos `resolve(formId)` y `has(formId)`.
- **Dependencias principales (según imports):**
  - `FieldRegistry` (`src/runtime/fields/registry/FieldRegistry.ts`)
  - `FormRuntimeResolver` (`src/runtime/forms/runtime/FormRuntimeResolver.ts`)
  - `LayoutResolver` (`src/runtime/layout/runtime/LayoutRuntimeResolver.ts`)
  - `getRuleRuntimeResolver()` (`src/runtime/rules/runtime/RuleRuntimeProvider`)

### 2.2 FormRuntimeHost ❌ (por nombre)
- No se encontró un símbolo/archivo con nombre **exacto** `FormRuntimeHost` en los artefactos inspeccionados.
- **Equivalente funcional observado:** `FormRuntimeResolver` / `RuntimeProviderRoot` (ver 2.3 y 2.4).

### 2.3 FormRendererEngine ✅
- **Ruta:** `src/runtime/form/engine/FormRendererEngine.tsx`
- **Estado:** existe; orquestador “stateless” que delega a `LayoutEngine`.
- **Dependencias:**
  - `LayoutEngine` (`src/runtime/layout/engine/LayoutEngine.tsx`)

### 2.4 LayoutEngine ✅
- **Ruta:** `src/runtime/layout/engine/LayoutEngine.tsx`
- **Estado:** existe; renderiza estructura `layout.sections -> columns -> fields`.
- **Dependencias principales:**
  - `DynamicFieldRenderer` (`src/runtime/rendering/DynamicFieldRenderer.tsx`)
- **Cómo conecta field definitions:**
  - Lee `layout` por referencias y **busca la definición concreta** desde `formData.__fieldDefs?.[fieldId]`.

### 2.5 DynamicFieldRenderer ✅
- **Ruta:** `src/runtime/rendering/DynamicFieldRenderer.tsx`
- **Estado:** existe; resuelve componente UI por `fieldDef.fieldType` via `ComponentRegistry`.
- **Dependencias principales:**
  - `ComponentRegistry` / `ComponentRegistryBase` (`src/runtime/registry/ComponentRegistry*.tsx`)

## 3) Motores (CRUD / Checklist / Mediciones)

### 3.1 Motor “Checklist” ✅ (BaseChecklist)
- **Ruta componente principal:** `src/components/engines/BaseChecklist.jsx`
- **Estado:** render actual de modo checklist en UI dinámica.
- **Renderización actual (cómo se usa):**
  - `src/pages/DynamicForm.jsx` hace switch por `formDef.engine_type`.
  - Cuando `engine_type === 'BaseChecklist'` usa `<BaseChecklist {...props} />`.
- **Cómo renderiza:**
  - Para `field_type === 'boolean'`: radios “Cumple / No Cumple”.
  - Para `field_type === 'signature'`: `SignaturePad`.
  - Para fallback: `textarea`.

### 3.2 Motor “Mediciones” ✅ (BaseMediciones)
- **Ruta componente principal:** `src/components/engines/BaseMediciones.jsx`
- **Estado:** render actual de mediciones.
- **Renderización actual:**
  - Usado desde `src/pages/DynamicForm.jsx` cuando `engine_type === 'BaseMediciones'`.
- **Cómo renderiza:**
  - `number` con rangos vía `field.options.min/max` y alerta “critical” si está fuera.
  - `signature` con `SignaturePad`.
  - `text/textarea` con textarea.

### 3.3 Motor “CRUD” (Genérico) ✅/equivalente a BaseGeneric
- **Ruta componente principal:** `src/components/engines/BaseGeneric.jsx`
- **Estado:** el sistema no usa un motor CRUD “tipo tabla” sino un motor genérico de inputs.
- **Renderización actual:**
  - `src/pages/DynamicForm.jsx` cuando `engine_type` no coincide con checklist/mediciones: `default` → `<BaseGeneric {...props} />`.
- **Cómo renderiza (tipos soportados):** `text`, `number`, `boolean` (checkbox), `select`, `textarea`, `date`, `time`, `signature` (SignaturePad).

## 4) Configuración (pantallas Crear Formulario / Editar Formulario / Gestión de Formularios)

### 4.1 Gestión de Formularios + Crear + Editar (todo en un solo lugar)
- **Ruta exacta:** `src/pages/Configuration.jsx`
- **Hallazgos dentro del archivo:**
  - Tab: `activeTab === 'formularios'`.
  - **Gestión:** tabla con lista de formularios existentes y botones de acciones.
  - **Crear Formulario:** sección “Crear Nuevo Formulario” (botón “Nuevo Formulario”).
    - `handleSaveFormDef()` inserta en `sgc_forms`.
  - **Editar Formulario:** selección de un formulario lista (`setSelectedForm(form)`) que abre el “Constructor Visual”.
    - Se renderiza `<FormBuilder formDef={selectedForm} />`.

### 4.2 Constructor de campos (parte de “Editar/Configurar”)
- **Ruta componente:** `src/components/FormBuilder.jsx`
- **Nota:** No fue leído en esta iteración (solo detectado por árbol). Sin embargo, `Configuration.jsx` lo usa explícitamente como pantalla de edición/configuración de campos.

## 5) Supabase (Auth / Storage / Database) + tablas encontradas

### 5.1 Cliente Supabase (conexión)
- **Ruta:** `src/lib/supabaseClient.js`
  - Exporta: `getSupabaseClient()` y `isSupabaseConfigured()`.
- **Ruta adicional (alternativa/duplicado):** `src/lib/supabase.js`

### 5.2 Database (tablas encontradas en código)
- **Ruta:** `src/services/dynamicService.js`
- **Tablas encontradas por queries `from('...')`:**
  - `sgc_modules`
  - `sgc_forms`
  - `sgc_form_fields`
  - `sgc_form_responses`
  - `sgc_response_values`
  - `sgc_evidences`
  - `sgc_audit_logs`
  - `profiles` (join/selección por relación `profiles:modified_by` / `profiles:created_by`)

### 5.3 Storage
- **Evidencias / archivos**: se observa en `dynamicService.submitFormResponse()` que se insertan registros de evidencias con `file_url`, `storage_path`, `file_type`.
- **Ruta relacionada:** `src/components/EvidenceUploader.jsx` (detectada en árbol; no leída en esta iteración).
- **Nota:** No se identificó explícitamente un `supabase.storage` en los archivos leídos directamente, pero existe un modelo de “storage_path” en BD y un uploader.

### 5.4 Auth
- **Ruta detectada/relacionada:** `src/context/AuthContext.jsx` y `src/hooks/useAuth.js` (detectados en árbol; no leídos en esta iteración).
- **En código leído:** `DynamicForm.jsx` usa `useAuth()` y requiere `user.id` al enviar.

### 5.5 Tablas encontradas en SQL de setup/seed
- **Ruta:** `sql_setup_dynamic.sql` / `sql_seed_data.sql`
- **Tablas creadas/sembradas:**
  - `public.sgc_modules`
  - `public.sgc_forms`
  - `public.sgc_form_fields`
  - `public.sgc_form_responses`
  - `public.sgc_response_values`
  - `public.sgc_evidences`
  - (además hay seeds de formularios/campos; ver slugs y engine_type en la sección “Formularios”).

## 6) Formularios (funcionales, si Hardcodeados/Metadata Driven/Mixtos)

### 6.1 Fuentes de verdad observadas
- **UI dinámica por slugs**: `src/pages/DynamicForm.jsx`
  - Carga form por `dynamicService.getFormBySlug(formSlug)`.
  - Carga campos por `dynamicService.getFormFields(form.id)`.
  - Renderiza motor por `formDef.engine_type`.

- **Seeds SQL**: `sql_seed_data.sql` y/o `sql_setup_dynamic.sql`
  - Insertan módulos/formularios “limpieza-diaria”, “cloro-ph-agua”, etc.

=> Esto indica **principalmente Metadata Driven (por DB)**, con UI que actúa como renderer por engine_type.

### 6.2 Formularios funcionales identificados (por seed SQL)
En `sql_setup_dynamic.sql` + `sql_seed_data.sql` aparecen explícitamente:

1) **Limpieza y Desinfección**
- **Nombre (seed):** `Checklist de Limpieza y Desinfección`
- **Slug:** `limpieza-diaria`
- **Module:** `operaciones`
- **Engine:** `BaseChecklist`
- **Campos sembrados (ejemplo):** `area_recepcion`, `area_almacenamiento`, `pasillos`, `observaciones`.

2) **Control de Cloro**
- **Nombre (seed):** `Control de Cloro y pH del Agua`
- **Slug:** `cloro-ph-agua`
- **Module:** `medicion-control`
- **Engine:** `BaseMediciones`
- **Campos sembrados (ejemplo):** `cloro_residual` (number con min/max), `ph`, `observaciones`.

3) **Despachos**
- El módulo **Trazabilidad** (slug `trazabilidad`) existe.
- En el seed leído en esta iteración no se ve un formulario con nombre/slug exacto “Despachos”.
- **Sin embargo:** `dynamicService` soporta `getModules/getFormsByModule` y el módulo `trazabilidad` está sembrado; los formularios “despachos” deberían venir por `sgc_forms` en BD (posiblemente en otro seed no leído aquí).

### 6.3 Clasificación A) Hardcodeados / B) Metadata Driven / C) Mixtos
- **Para “Limpieza y Desinfección”**: **B) Metadata Driven**
  - Motor y campos vienen de tablas `sgc_forms` / `sgc_form_fields` (seed SQL + runtime por slug).
- **Para “Control de Cloro”**: **B) Metadata Driven**
  - Igual esquema: `engine_type` + campos desde BD.
- **Para “Despachos”**: **B) Metadata Driven (probable)**
  - El módulo `trazabilidad` es metadata; los forms “de despacho” deberían ser registros `sgc_forms`.
  - En esta iteración no se localizó el slug exacto “despachos” en el SQL leído, por lo que se marca como “probable” basado en arquitectura.

---

## Resumen ejecutivo
- Existe un **core Runtime** (builder/resolver/renderer/layout/dynamic field renderer) en `src/runtime/*`, con conexión por `ComponentRegistry`.
- El flujo “operario” actual de formularios dinámicos **renderiza motores UI hardcodificados** (`BaseChecklist`, `BaseMediciones`, `BaseGeneric`) pero **selecciona engine_type desde metadata en Supabase**.
- La configuración de formularios (crear/editar y construir campos) está centralizada en `src/pages/Configuration.jsx` usando `src/components/FormBuilder.jsx`.

