# SPRINT_45_7 — STANDARD METADATA MODEL AUDIT (SSOT)

> Documento SSOT (Solo auditoría documental).
> No implementar código.
> No modificar componentes.
> No modificar runtime.
> No modificar base de datos.
> No refactorizar.
>
> Exclusión obligatoria: **Trazabilidad** NO se toma como referencia arquitectónica.

Este documento **NO audita componentes**. 
Este documento **NO audita runtime**. 
Este documento responde únicamente:

**¿Qué metadata existe realmente y cómo se relaciona?**

---

## 0) Objetivo (alcance estricto)
Demostrar documentalmente que el módulo estándar funciona **gobernado por metadata** (DB) y no por componentes específicos.

Evidencia tomada de:
- `src/services/dynamicService.js` (CRUD/submit/verify sobre `sgc_*`)
- `src/components/FormBuilder.jsx` y `src/pages/Configuration.jsx` (creación/configuración de metadata)
- `src/pages/DynamicForm.jsx` (uso de `engine_type`, `roles_allowed`, `field_type`, `required`, `options`)

---

## 1) Entidades de metadata (mínimo obligatorio)

> Nota: Las entidades listadas corresponden a tablas directamente usadas por el módulo estándar y por el pipeline submit/verify.

### 1.1 `sgc_modules`
**Campos utilizados (evidencia directa):**
- `slug` (lookup por `getModuleBySlug(slug)`) 
- `is_active` (filtro en `getModules()`)
- `id` (referenciado por `sgc_forms.module_id`)
- `name`, `description` (consumidos por UI en `DynamicModule`)

**Quién la consulta:**
- `dynamicService.getModules()`
- `dynamicService.getModuleBySlug(slug)`

**Quién la modifica:**
- No evidenciado en `dynamicService`.
- Existe manejo de configuración para crear formularios; para módulos se consulta, no se documenta escritura aquí.

**Relaciones:**
- `sgc_modules (id)` → `sgc_forms (module_id)`

**Parámetros críticos:**
- `is_active=true` para ser listado en `getModules()`
- `slug` debe coincidir con `moduleSlug` del router

**Consumidores esperados:**
- `Configuration`
- `DynamicModule`
- `dynamicService`

---

### 1.2 `sgc_forms`
**Campos documentados (evidencia directa):**
- `module_id` (filtro por módulo en `getFormsByModule(moduleId)`)
- `slug` (lookup por `getFormBySlug(slug)`) 
- `engine_type` (selección del engine en `DynamicForm`)
- `roles_allowed` (gating de acceso en `DynamicForm`)
- `is_active=true` (filtro en `getFormsByModule`)
- `id` (usado como `form_id` en `getFormFields` y en submit)

**Consumidores:**
- `Configuration` (lee y crea `sgc_forms` mediante Supabase client)
- `DynamicModule` (lista catálogo por módulo)
- `DynamicForm` (gating + render engine)
- `dynamicService` (get por slug y por module)

---

### 1.3 `sgc_form_fields`
**Documentación completa (evidencia directa):**
- `id`
- `form_id` (filtro en `getFormFields(formId)`)
- `label` (UI)
- `name` (slug interno generado por `FormBuilder`)
- `field_type` (p.ej. `text`, `textarea`, `number`, `boolean`, `select`, `date`, `time`, `signature`)
- `required` (validación en `DynamicForm`)
- `options` (persistidas como JSON; se setean por `FormBuilder`) 
- `order_index` (orden en `getFormFields` y reordenamiento)

**Quién consume:**
- `FormBuilder` (lee y lista)
- `DynamicForm` (render + validación requerida + reglas derivadas de options)
- Motores (BaseChecklist/BaseGeneric/BaseMediciones) por `field_type`
- `DynamicRecordsView` vía query de join (label, field_type, options)
- `dynamicService.getModuleResponses` (join para computar criticidad en UI)

**Quién escribe (evidencia directa):**
- `FormBuilder`:
  - `insert` de `sgc_form_fields` con `form_id,name,label,field_type,required,options,order_index`
  - `delete` de `sgc_form_fields`
  - reordenamiento vía `reorderFormFieldsOrder` (actualiza `order_index`, sin auditar el SQL exacto)

---

### 1.4 `sgc_form_responses`
**Campos usados (evidencia directa en `dynamicService` y UI):**
- `id`
- `form_id` (insert/relación)
- `status` (inicial `pendiente_revision`; luego cambia en verify)
- `created_by` (escritura en create)
- `created_at` (lectura en listados)
- `verified_by` (escritura en verify)
- `verified_at` (escritura en verify)
- `verification_comment` (escritura en verify)

**Consumidores:**
- `DynamicRecordsView` (lectura)
- `dynamicService`:
  - crea insert (create)
  - actualiza (verify)

**Quién nunca debería modificarla (criterio documental):**
- No existe regla explícita en código para “nunca”.
- Evidencia sugiere que solo `dynamicService` controla estado (create/verify).

---

### 1.5 `sgc_response_values`
**Modelo EAV (evidencia directa en submit):**
- `response_id`
- `field_id`
- `value_text`
- `value_number`
- `value_boolean`
- `value_json`

**Mapeo EAV por tipo (evidencia directa):**
`submitFormResponse(formId, userId, values, ...)`:
- si `typeof val === 'number'` → `value_number`
- si `typeof val === 'boolean'` → `value_boolean`
- si `typeof val === 'object'` → `value_json`
- por defecto → `value_text`

**Quién escribe:**
- `dynamicService.submitFormResponse` inserta filas EAV

**Quién lee:**
- `dynamicService.getModuleResponses` consume EAV en join:
  - `sgc_response_values (field_id, value_text, value_number, value_boolean, sgc_form_fields(label, field_type, options))`
  - luego UI calcula criticidad (boolean false, number fuera de min/max)

**Parámetros críticos:**
- la correspondencia entre `values` (keys por `fieldId`) y `sgc_response_values.field_id`

---

### 1.6 `sgc_evidences`
**Campos usados (evidencia directa en submit + join):**
- `id`
- `response_id`
- `file_url`
- `storage_path`
- `file_type`

**Consumidores:**
- `dynamicService.submitFormResponse` inserta evidencias
- `dynamicService.getModuleResponses` consume evidencias por join (`sgc_evidences (id, file_url, file_type)`) 
- UI (DynamicRecordsView) muestra cantidad y links

**Quién escribe:**
- `dynamicService.submitFormResponse` (por evidences recibidos de EvidenceUploader)

---

### 1.7 `sgc_audit_logs`
**Campos usados (evidencia directa):**
- `response_id`
- `action_type` (valores evidenciados: `create`, `verify`)
- `modified_by`
- `reason`
- `old_data` / `new_data`:
  - en `submitFormResponse` se usa `new_data: values` (no se evidencia `old_data`)
  - en `verifyFormResponse` se usa `new_data: {status, verification_comment}`

**Consumidores:**
- `dynamicService.submitFormResponse` inserta audit con `action_type='create'`
- `dynamicService.verifyFormResponse` inserta audit con `action_type='verify'`
- `dynamicService.getAuditLogs` lee audit logs con join a `profiles:modified_by (nombre, rol)`
- UI: `DynamicRecordsView` muestra razón + action_type + perfil

**Quién modifica:**
- Solo `dynamicService` inserta (no se audita delete/update aquí)

---

### 1.8 `profiles`
**Campos a documentar (solo requerido):**
- `rol` (existe como `profiles.rol`)
- `nombre` y `email` (en el requerimiento; en la evidencia se usa `nombre`)

**Cómo participa:**
- `dynamicService.getAuditLogs` hace join:
  - `profiles:modified_by ( nombre, rol )`
- `DynamicRecordsView` lee `profiles:created_by` y `verifier:verified_by` como `nombre, rol`
- AuthContext/ProtectedRoute usa `profiles` para gating (auditoría de componentes fuera de alcance; solo se establece su rol en metadata-relación).

---

## 2) Relaciones entre metadata

### Modelo relacional (lógico)
Relación esperada en el ciclo del módulo estándar:

```text
sgc_modules
      │
      ▼
sgc_forms
      │
      ▼
sgc_form_fields

sgc_forms
      │
      ▼
sgc_form_responses
      │
      ├─────────────┐
      ▼             ▼
sgc_response_values  sgc_evidences
      │
      ▼
sgc_audit_logs
```

### FK lógica / FK física / consumidor / escritura / lectura

**2.1 `sgc_modules` → `sgc_forms`**
- **FK lógica**: `sgc_forms.module_id` referencia `sgc_modules.id`
- **FK física**: no auditada como constraint, pero hay uso de `module_id` como filtro
- **Responsable escritura**: `Configuration` (crea `sgc_forms`)
- **Responsable lectura**: `DynamicModule`, `dynamicService`

**2.2 `sgc_forms` → `sgc_form_fields`**
- **FK lógica**: `sgc_form_fields.form_id` referencia `sgc_forms.id`
- **Responsable escritura**: `FormBuilder` (insert/delete), reordenamiento via motor/adapter
- **Responsable lectura**: `DynamicForm`, `dynamicService.getFormFields`, UI historial

**2.3 `sgc_form_responses` → `sgc_response_values`**
- **FK lógica**: `sgc_response_values.response_id` referencia `sgc_form_responses.id`
- **Responsable escritura**: `dynamicService.submitFormResponse`
- **Responsable lectura**: `dynamicService.getModuleResponses`

**2.4 `sgc_form_responses` → `sgc_evidences`**
- **FK lógica**: `sgc_evidences.response_id` referencia `sgc_form_responses.id`
- **Responsable escritura**: `dynamicService.submitFormResponse`
- **Responsable lectura**: `dynamicService.getModuleResponses`

**2.5 `sgc_form_responses` → `sgc_audit_logs`**
- **FK lógica**: `sgc_audit_logs.response_id`
- **Responsable escritura**: `dynamicService.submitFormResponse` (create) y `verify*` (verify)
- **Responsable lectura**: `dynamicService.getAuditLogs`

**2.6 `profiles` como “tabla de enriquecimiento”**
- No es parte del modelo de módulo; se usa para enriquecer auditoría/verificación.

---

## 3) Ciclo de vida de cada entidad

> “Quién nunca debería modificarla” se interpreta como **quién la mantiene por diseño** (evidencia de uso). No se proponen reglas nuevas.

### 3.1 `sgc_modules`
- **Creación**: no evidenciada en `Configuration` (solo se consulta)
- **Consulta**:
  - `dynamicService.getModules()`
  - `dynamicService.getModuleBySlug()`
- **Modificación**:
  - no auditada en este documento
- **Eliminación**:
  - no auditada

### 3.2 `sgc_forms`
- **Creación**: `Configuration` (Supabase insert)
- **Consulta**:
  - `Configuration` y `DynamicModule`
  - `dynamicService.getFormBySlug` y `getFormsByModule`
- **Modificación**: no auditada; se asume que solo se recrea vía formulario (evidencia: no hay update)
- **Eliminación**: `Configuration.handleDeleteForm` (Supabase delete)

### 3.3 `sgc_form_fields`
- **Creación**: `FormBuilder.handleAddField` (insert)
- **Consulta**: `FormBuilder.loadFields` y `dynamicService.getFormFields`
- **Modificación**:
  - reordenamiento (`reorderFormFieldsOrder`)
  - no se evidencian edits de label/type.
- **Eliminación**: `FormBuilder.handleDeleteField` (delete)

### 3.4 `sgc_form_responses`
- **Creación**: `dynamicService.submitFormResponse` (insert con `status='pendiente_revision'`)
- **Consulta**: `dynamicService.getModuleResponses` y `DynamicRecordsView`
- **Modificación**: `dynamicService.verifyFormResponse/verifyMultipleFormResponses` (update status + verified_*)
- **Eliminación**: no auditada

### 3.5 `sgc_response_values`
- **Creación**: `dynamicService.submitFormResponse` (inserta EAV)
- **Consulta**: `dynamicService.getModuleResponses` (join por response)
- **Modificación/Eliminación**: no auditada

### 3.6 `sgc_evidences`
- **Creación**: `dynamicService.submitFormResponse`
- **Consulta**: `dynamicService.getModuleResponses`
- **Modificación/Eliminación**: no auditada en este documento (solo se audita el flujo create/read)

### 3.7 `sgc_audit_logs`
- **Creación**: `dynamicService.submitFormResponse` (action_type create) y verify* (action_type verify)
- **Consulta**: `dynamicService.getAuditLogs`
- **Modificación/Eliminación**: no auditada

### 3.8 `profiles`
- **Creación**: no auditada
- **Consulta**:
  - auth + joins en `getAuditLogs` y `getModuleResponses`
- **Modificación**: no auditada

---

## 4) Metadata utilizada por cada componente (matriz)

> **Sin documentar lógica**. Solo metadata consumida.

| Componente | Metadata consumida |
|---|---|
| `Configuration` | `sgc_modules`, `sgc_forms` (creación `sgc_forms`) |
| `FormBuilder` | `sgc_form_fields` (CRUD create/delete + options/order_index) |
| `DynamicModule` | `sgc_modules`, `sgc_forms` |
| `DynamicForm` | `sgc_forms` (engine_type, roles_allowed, name/description), `sgc_form_fields` (field_type, required, options) |
| `DynamicRecordsView` | `sgc_form_responses` + `sgc_response_values` + `sgc_form_fields` (label/type/options) + `sgc_evidences` + `sgc_audit_logs` + `profiles` |
| `ModuleDocumentViewer` | (fuera del scope estricto de `sgc_*` estándar del módulo, ver nota) |
| `DocumentModule` | (documentos/programas, no parte de `sgc_*` estándar del modelo de módulo) |
| `dynamicService` | escribe/lee `sgc_modules?` (solo get), `sgc_forms`, `sgc_form_fields`, `sgc_form_responses`, `sgc_response_values`, `sgc_evidences`, `sgc_audit_logs` |

**Nota de alcance:** `sgc_document_repositories*` y `sgc_documento*` existen, pero el objetivo pide el “Modelo Unificado” del módulo estándar. En el modelo unificado anterior (1.x) están las tablas `sgc_*` del ciclo de formulario.

---

## 5) Metadata requerida para crear un módulo estándar

> “Módulo estándar” en este sistema está representado por:
- `sgc_modules` (instancia)
- `sgc_forms` (catálogo de formularios del módulo)
- `sgc_form_fields` (esquema de campos del formulario)

### 5.1 Obligatoria (debe existir)
1. `sgc_modules`
   - fila con `slug` que coincide con `moduleSlug`
   - `is_active=true`
2. `sgc_forms`
   - al menos 1 form por `module_id`
   - `slug` de form (para ruta `modulo/:moduleSlug/:formSlug`)
   - `engine_type` con valores soportados por UI
   - `roles_allowed` (para acceso)
   - `is_active=true`
3. `sgc_form_fields`
   - campos con `form_id` correcto
   - `field_type` soportado
   - `required` (para validación)
   - `options` cuando aplique (number/select, y resto según field_type)
   - `order_index`

### 5.2 Opcional
- `description` (en UI existe fallback si no hay `description`)
- `options` no siempre aplica (solo según `field_type`)

### 5.3 Derivada (la genera el sistema automáticamente)
En ejecución:
- `sgc_form_responses.id` al crear registro
- `sgc_response_values` filas EAV a partir de values
- `sgc_evidences` filas a partir de evidences cargadas
- `sgc_audit_logs` por acciones create/verify

---

## 6) Metadata creada automáticamente por el sistema
Identificación (evidencia directa):

- `sgc_form_responses.created_at` (insert DB, usado en UI)
- `sgc_form_responses.status` inicial = **hardcoded** a `pendiente_revision` en `submitFormResponse`
- `sgc_response_values`:
  - se crean filas en insert con `value_text/value_number/value_boolean/value_json` según runtime
- `sgc_evidences`:
  - se insertan desde `evidences` (subidos previamente a storage)
- `sgc_audit_logs`:
  - `action_type='create'` y `reason` de create
  - `action_type='verify'` y `reason` de verify
- `sgc_form_responses.verified_at`, `sgc_form_responses.verified_by`, `verification_comment` al verificar
- `__runtime_internal_event` (no es metadata DB; es un evento generado por `dynamicService` para bridge)

---

## 7) Hardcodes que reemplazan metadata (documentar, no proponer cambios)

Este apartado documenta **dónde el sistema todavía usa reglas hardcodeadas** en lugar de metadata.

**Evidencia directa de hardcode en metadata-governed flujo:**
- `dynamicService.submitFormResponse`:
  - status inicial fija: `status: 'pendiente_revision'`
  - `sgc_audit_logs.action_type`: literal `'create'`
  - `sgc_audit_logs.reason`: literal `'Creación inicial del registro'`
- `dynamicService.verifyFormResponse/verifyMultipleFormResponses`:
  - `sgc_audit_logs.action_type`: literal `'verify'`
  - `verified_at` siempre `new Date().toISOString()`
  - `reason`: template hardcodeado con `Verificación operativa:` o `Verificación masiva:`
- `DynamicForm`:
  - `engine_type` selecciona engine vía `switch(formDef.engine_type)`
  - reglas de criticidad usan heurística en base a `field_type` y `options.min/max` (por ejemplo out-of-bounds marca criticidad)
  - check para observación usa heurística por `field.name` que contiene `observacion/observación`

**Conclusión parcial:** el comportamiento principal depende de metadata (`engine_type`, `roles_allowed`, `field_type`, `required`, `options`, EAV), pero existen excepciones hardcodeadas para estado inicial y semántica de criticidad/verificación.

---

## 8) Diagrama global de metadata

```text
sgc_modules
   |
   v
sgc_forms  --(engine_type, roles_allowed)--> DynamicForm (render + gating)
   |
   v
sgc_form_fields --(field_type, required, options)--> DynamicForm (validación + rules)
   |
   v
sgc_form_responses --(status, created_by, verified_*)--> DynamicRecordsView
   |
   +--> sgc_response_values (EAV: field_id -> value_*)
   |
   +--> sgc_evidences (response_id -> file_url/storage_path)
   |
   +--> sgc_audit_logs (response_id, action_type, modified_by, reason, new_data)
   |
   v
profiles (join para mostrar nombre/rol en auditoría/verification)
```

---

## 9) Conclusión

- El sistema utiliza un **modelo unificado de metadata** dominado por:
  - `sgc_modules` → `sgc_forms` → `sgc_form_fields` (definición)
  - `sgc_form_responses` → `sgc_response_values`/`sgc_evidences` → `sgc_audit_logs` (instancias y trazabilidad operacional)
- Las entidades núcleo del módulo estándar (para que funcione end-to-end) son:
  1) `sgc_modules`
  2) `sgc_forms`
  3) `sgc_form_fields`
  4) `sgc_form_responses`
  5) `sgc_response_values`
  6) `sgc_audit_logs`
- El comportamiento del módulo estándar está **principalmente gobernado por metadata**, especialmente:
  - `engine_type` (elección de motor de render)
  - `roles_allowed` (acceso)
  - `field_type/required/options` (validación y reglas derivadas)
  - `EAV` para lectura dinámica por campo
- Excepciones hardcodeadas documentadas (no se cambian):
  - `status` inicial fijo a `'pendiente_revision'`
  - `action_type` y `reason` de audit con literales
  - selección de engine por `switch(engine_type)`
  - criticidad/observación por heurísticas hardcodeadas (según campo/type/name)

