# SPRINT_45_9 — STANDARD CONTRACT MAP AUDIT (SSOT)

> Documento SSOT (Solo auditoría documental).
>
> NO implementar código.
> NO modificar componentes.
> NO modificar runtime.
> NO modificar base de datos.
> NO refactorizar.
>
> Exclusión obligatoria:
> **Trazabilidad NO constituye referencia arquitectónica.**
>
> Objetivo: documentar exclusivamente los **contratos existentes** observados en el código.

---

## 0) Alcance
Contratos observables entre:
- UI (Configuration, FormBuilder, DynamicModule, DynamicForm, Engines, DynamicRecordsView, ModuleDocumentViewer, DocumentModule)
- Evidencias/firmas (EvidenceUploader, SignaturePad)
- Servicios (dynamicService, documentsService, documentRepositoriesService)
- Runtime bridge (runtimeActivationLayer)
- Autorización UI (AuthContext, ProtectedRoute)

No se documenta lógica interna ni se propone rediseño.

---

## 1) Contratos UI → Metadata

### 1.1 Configuration
**Archivo:** `src/pages/Configuration.jsx`

**Entradas esperadas:**
- `rol` desde `useAuth()`

**Props:**
- Ninguna.

**Context:**
- Supabase client se obtiene por import dinámico.

**Router Params:**
- N/A

**Estado:**
- `newFormDef` (module_id, name, slug, description, engine_type, roles_allowed)

**Metadata requerida:**
- `sgc_modules` (para poblar módulos)

**Tablas utilizadas:**
- Lectura: `sgc_modules`
- Lectura: `sgc_forms` (implícitamente en loadInitialData)
- Escritura (evidencia directa en código): `sgc_forms`

**Campos utilizados (escritura `sgc_forms`):**
- `module_id`
- `name`
- `slug`
- `description`
- `engine_type`
- `roles_allowed`

**Campos opcionales (según flujo de UI):**
- `description` puede ser vacío
- `slug` se genera si está vacío

**Salida producida:**
- Inserta/crea fila `sgc_forms` y luego activa `selectedForm` para ir a `FormBuilder`.

---

### 1.2 FormBuilder
**Archivo:** `src/components/FormBuilder.jsx`

**Entradas esperadas (props):**
- `formDef` con `id` (usado como `formDef.id`)

**Props:**
- `formDef: { id, ... }`

**Context:**
- none

**Router Params:**
- N/A

**Estado:**
- `fields` (lista de `sgc_form_fields`)

**Metadata requerida:**
- `sgc_form_fields` para `form_id=formDef.id`

**Tablas utilizadas:**
- Lectura: `sgc_form_fields`
- Escritura: `sgc_form_fields` (insert/delete)

**Campos utilizados (insert `sgc_form_fields`):**
- `form_id: formDef.id`
- `name: slugName`
- `label: newField.label`
- `field_type`
- `required`
- `options` (JSON según field_type)
- `order_index`

**Campos obligatorios:**
- `field_type`, `required`, `label`, `name/slugName`, `order_index`

**Salida producida:**
- Inserta campos en DB y refresca lista.

---

### 1.3 DynamicModule
**Archivo:** `src/pages/DynamicModule.jsx`

**Entradas esperadas:**
- `moduleSlug` desde router params `/:moduleSlug`

**Props:**
- none

**Context:**
- `rol` desde `useAuth()`

**Router Params:**
- `moduleSlug`

**Estado:**
- `modInfo` (sgc_modules fila)
- `forms` (lista sgc_forms)

**Metadata requerida:**
- `sgc_modules` por `slug = moduleSlug`
- `sgc_forms` por `module_id = modInfo.id` (y `is_active=true`)

**Tablas utilizadas:**
- Lectura: `sgc_modules`
- Lectura: `sgc_forms`

**Campos utilizados:**
- `modInfo.name`, `modInfo.description`, `modInfo.slug`
- `form.name`, `form.slug`, `form.description`, `form.icon` (si existe), `form.roles_allowed`

**Campos opcionales:**
- `form.roles_allowed`
- `form.icon`

**Hardcode/documental:**
- habilitación de tab repositorio por lista fija `isDocumentEnabled(slug)`.

**Salida producida:**
- Catálogo de formularios (links) y navegación a `DynamicForm`.

---

### 1.4 DynamicForm
**Archivo:** `src/pages/DynamicForm.jsx`

**Entradas esperadas:**
- `moduleSlug` y `formSlug` desde router params
- `rol` y `user.id` desde `useAuth()`

**Props:**
- none

**Router Params:**
- `moduleSlug`, `formSlug`

**Estado:**
- `formDef` (sgc_forms)
- `fields` (sgc_form_fields)
- `values` (valores por campo)
- `evidences` (EvidenceUploader)

**Metadata requerida:**
- `sgc_forms`: `id`, `engine_type`, `roles_allowed`, `name`, `description`
- `sgc_form_fields`: `id`, `field_type`, `required`, `options`, `label`, `name`

**Campos opcionales:**
- `form.description` (puede estar vacío)
- `field.options` según field_type

**Campos obligatorios (por validación UI):**
- `field.required` + presencia no vacía en `values`

**Salida producida:**
- Llama a `dynamicService.submitFormResponse(formDef.id, user.id, processedValues, evidences)`.

**Evento disparado:**
- Submit HTML (`onSubmit`) del formulario.

---

## 2) Contratos Metadata → Servicios

### 2.1 dynamicService (contratos de métodos)
**Archivo:** `src/services/dynamicService.js`

#### getModules()
**Entrada:**
- none

**Parámetros:**
- ninguno

**Tablas:**
- `sgc_modules`

**Campos devueltos:**
- `*` (select '*') filtrado por `is_active=true`

**Errores observados:**
- `throw error` si `error`

---

#### getModuleBySlug(slug)
**Entrada:**
- `slug: string`

**Parámetros:**
- `slug`

**Tablas:**
- `sgc_modules`

**Salida (objeto devuelto):**
- fila única (`single()`) con `*`

**Contrato esperado por consumidores:**
- `id`, `slug`, `name`, `description`

---

#### getFormsByModule(moduleId)
**Entrada:**
- `moduleId: number/string (id)

**Parámetros:**
- `module_id = moduleId`
- `is_active=true`

**Tablas:**
- `sgc_forms`

**Salida:**
- array de `sgc_forms`

**Campos críticos para UI:**
- `id`, `name`, `slug`, `description`, `engine_type`, `roles_allowed`, `icon?`

---

#### getFormBySlug(slug)
**Entrada:**
- `slug: string`

**Tablas:**
- `sgc_forms`

**Salida:**
- fila única (`single()`)

---

#### getFormFields(formId)
**Entrada:**
- `formId`

**Parámetros:**
- `form_id = formId`

**Tablas:**
- `sgc_form_fields`

**Orden observado:**
- `order_index asc`

**Salida:**
- array de campos (incluye `options`)

---

#### submitFormResponse(formId, userId, values, evidences=[])
**Entrada: (contrato exacto)**
- `formId`
- `userId`
- `values: Record<fieldId, any>`
- `evidences: Evidence[]` (opcional; default `[]`)

**Tipos inferidos:**
- `values[fieldId]` puede ser `number`, `boolean`, `object`, o string (default a text)
- `evidences[]` elementos con `file_url`, `storage_path`, `file_type?`

**Restricciones observadas:**
- inserta `sgc_form_responses` con status fijo `'pendiente_revision'`

**Escrituras y orden observado:**
1) `sgc_form_responses`: insert, status fijo
2) `sgc_response_values`: insert (si responseValues.length > 0)
3) `sgc_evidences`: insert (si evidences.length > 0)
4) `sgc_audit_logs`: insert (action_type='create', reason literal)

**Tablas:**
- `sgc_form_responses`
- `sgc_response_values`
- `sgc_evidences`
- `sgc_audit_logs`

**Salida (contrato):**
- `{ ...response, __runtime_internal_event: internalEvent }`

**internalEvent campos observados:**
- `type: 'create'`
- `formId`
- `responseId`
- `actorId`
- `timestamp`
- `correlationId`
- `auditEventId`

**Errores:**
- `throw resError/valError/evError/auditError`

---

#### getModuleResponses(moduleId)
**Entrada:**
- `moduleId`

**Parámetros:**
- `sgc_forms.module_id = moduleId`

**Tablas/joins observadas (select):**
- `sgc_form_responses` base
- join inner: `sgc_forms` (name, module_id, id)
- join: `profiles:created_by (nombre, rol)`
- join: `verifier:verified_by (nombre, rol)`
- join: `sgc_response_values` (field_id, value_text/value_number/value_boolean) + `sgc_form_fields (label, field_type, options)`
- join: `sgc_evidences (id,file_url,file_type)`

**Salida:**
- array con estructura enriquecida.

---

#### getAuditLogs(responseId)
**Entrada:**
- `responseId`

**Tablas:**
- `sgc_audit_logs`
- join `profiles:modified_by (nombre, rol)`

**Salida:**
- array (orden desc `created_at`)

**Errores:**
- retorna [] si error (no throw).

---

#### verifyFormResponse(responseId, userId, status, comment)
**Entrada:**
- `responseId`
- `userId`
- `status`
- `comment`

**Escrituras y orden observado:**
1) update `sgc_form_responses` (status, verified_by, verified_at, verification_comment)
2) insert `sgc_audit_logs` (action_type='verify', new_data incluiye status+verification_comment)

**Salida (contrato):**
- `internalEvent` con:
  - `type:'verify'`
  - `formId: null`
  - `responseId`
  - `actorId` (userId)
  - `timestamp`
  - `correlationId: responseId`
  - `auditEventId`

---

#### verifyMultipleFormResponses(responseIds, userId, status, comment)
**Entrada:**
- `responseIds: array`
- `userId`
- `status`
- `comment`

**Escrituras:**
- update batch `sgc_form_responses` con verificación
- insert batch `sgc_audit_logs` (sin retorno documentado)

**Salida:**
- no se usa en UI (la UI solo asume éxito o catch)

---

### 2.2 documentsService
**Archivo:** `src/services/documentsService.js`

#### getProgram(module)
- **Entrada:** `module` (string)
- **Tabla:** `sgc_programs`
- **Salida:** fila única `maybeSingle()`

#### uploadProgram(module, file, userId)
- **Entrada:** `module`, `file: File`, `userId`
- **Storage:** bucket `documentos-sgc` en `programs/${module}_${Date.now()}.pdf`
- **Tablas:** `sgc_programs` (insert o update con replace por `getProgram`)
- **Salida:** devuelve fila actualizada/insertada

#### deleteProgram(id, storagePath)
- **Entrada:** `id`, `storagePath`
- **Storage:** remove por `storagePath`
- **Tabla:** `sgc_programs` delete by id
- **Salida:** void/true no documentado (no retorna)

#### getRecords(module, type)
- **Entrada:** `module`, `type` (category_key/type; si null/undefined devuelve todos)
- **Tabla:** `sgc_records`
- **Salida:** array orden desc `created_at`

#### uploadRecord(module, type, file, userId)
- **Entrada:** `module`, `type`, `file`, `userId`
- **Storage:** `records/${module}/${type}/${Date.now()}_${file.name}`
- **Tabla:** `sgc_records` insert
- **Salida:** devuelve fila insertada (single)

#### deleteRecord(id, storagePath)
- **Entrada:** `id`, `storagePath`
- **Storage:** remove
- **Tabla:** `sgc_records` delete by id

---

### 2.3 documentRepositoriesService
**Archivo:** `src/services/documentRepositoriesService.js`

#### getRepositories({ moduleSlug })
- **Entrada:** objeto opcional `{ moduleSlug? }`
- **Tabla:** `sgc_document_repositories`
- **Salida:** array mappeado (id, slug, name, module_slug, icon_key, is_active, created_at/updated_at)

#### getCategories(repositoryId)
- **Entrada:** `repositoryId`
- **Tabla:** `sgc_document_repository_categories`
- **Salida:** array mappeado (id, repository_id, category_key, name, icon_key, sort_order, is_active, created_at/updated_at)

---

## 3) Contratos Metadata → Engines (BaseChecklist/BaseGeneric/BaseMediciones)

> **Contrato compartido de engine observado en DynamicForm:**
- Todos reciben `{ fields, values, onChange }`.

### BaseChecklist
**Archivo:** `src/components/engines/BaseChecklist.jsx`

**Entrada del engine:**
- `fields: Field[]`
- `values: Record<fieldId, any>`
- `onChange(fieldId, val)`

**Metadata usada por engine:**
- `field.field_type`
- `field.required`
- `field.label`

**Casos observados:**
- `boolean`: render radio Cumple/No Cumple; `onChange(field.id, true|false)`
- `signature`: render `SignaturePad`:
  - `onChange(url) => onChange(field.id, url)`

**Salida:**
- produce cambios vía `onChange` que actualiza `DynamicForm.values`

### BaseGeneric
**Archivo:** `src/components/engines/BaseGeneric.jsx`

**Entrada del engine:**
- `{ fields, values, onChange }`

**Metadata usada:**
- `field_type`, `required`, `label`, `options.choices` para select

**Contratos por field_type (observados):**
- `text/textarea/date/time`: `onChange(field.id, string)`
- `number`: `onChange(field.id, parseFloat(e.target.value))`
- `boolean`: `onChange(field.id, e.target.checked)`
- `select`: `onChange(field.id, stringChoice)`
- `signature`: `onChange(field.id, url)`

### BaseMediciones
**Archivo:** `src/components/engines/BaseMediciones.jsx`

**Entrada del engine:**
- `{ fields, values, onChange }`

**Metadata usada:**
- `field.options.min/max` (validación y criticidad UI)
- `field.options.unit` (render unit suffix)
- `field_type` (especial: signature)

**Contrato de cambios:**
- `signature`: `onChange(field.id, url)`
- `number`: `onChange(field.id, newVal)` (string numérica; DynamicForm luego parseFloat al submit)
- `text/textarea`: `onChange(field.id, string)`

---

## 4) Contratos de Persistencia (dynamicService)

### 4.1 submitFormResponse()
**Contrato (ya definido en 2.1):**
- Input: `(formId, userId, values, evidences=[])`
- Escritura: 4 tablas (`sgc_form_responses`, `sgc_response_values`, `sgc_evidences`, `sgc_audit_logs`) en orden
- Output: `{ ...response, __runtime_internal_event }`

### 4.2 verifyFormResponse()
- Input: `(responseId, userId, status, comment)`
- Escritura: update `sgc_form_responses` + insert `sgc_audit_logs`
- Output: `internalEvent` `{ type:'verify', responseId, actorId, correlationId, ... }`

---

## 5) Contrato Runtime Bridge

**Archivo:** `src/runtime/integration/RuntimeActivationLayer.ts`

### 5.1 Entrada a activate
- `activate(event: any)` donde event cumple contrato mínimo:
  - `event.type` ∈ `{'create','verify'}`
  - `event.responseId` (required)
  - `event.actorId` (required)
  - `event.correlationId` (required)
  - `event.formId` opcional (usa default '')
  - `event.timestamp` opcional
  - `event.auditEventId` opcional (se castea a string)

### 5.2 Salida observable
- Puede lanzar error en fallos de contrato o traducción
- Si runtime no inicializa: retorna objeto de failure:
  - `{ success:false, retryable:true, transactionId: event.responseId, error:{ code:'RUNTIME_UNAVAILABLE', message, retryable:true } }`

> Este contrato es usado indirectamente desde UI (DynamicForm) con `await runtimeActivationLayer.activate(...)`.

---

## 6) Contratos de Evidencias

### EvidenceUploader → DynamicForm
**Archivo:** `src/components/EvidenceUploader.jsx`

**Prop esperada:**
- `onEvidencesChange(updatedFiles)`

**Objeto Evidence esperado (estructura):**
Cada item empuja a `newEvidences`:
- `file_url: string`
- `storage_path: string`
- `file_type: string` (file.type)
- `name: string` (nombre original)

**Destino:**
- DynamicForm guarda evidences en estado `evidences` y luego pasa al submit.

### EvidenceUploader → dynamicService
**dynamicService.submitFormResponse(..., evidences)**
- dynamicService usa solo:
  - `ev.file_url`
  - `ev.storage_path`
  - `ev.file_type` (default 'image/jpeg' si no existe)

---

## 7) Contratos de Firma

### SignaturePad → DynamicForm
**Archivo:** `src/components/SignaturePad.jsx`

**Prop esperada:**
- `onChange(url: string)`

**Tipo de dato generado (contrato):**
- `url` (Public URL) de Supabase Storage

**Cómo llega a values:**
- Engines: `onChange(field.id, url)`
- DynamicForm guarda en `values[field.id] = url`

**Cómo se persiste:**
- `dynamicService.submitFormResponse` detecta tipo:
  - si `val` es `object` → `value_json`
  - si `val` es string → `value_text`

> Nota documental: el URL público es string → se persistirá como `value_text` (por defecto).

---

## 8) Contratos de Roles

### roles_allowed
**Fuente metadata:**
- `sgc_forms.roles_allowed`

**Consumidores:**
1) **DynamicModule**:
   - filtra visible catálogo: `!f.roles_allowed || f.roles_allowed.includes(rol)`
2) **DynamicForm**:
   - gating duro: si `form.roles_allowed && !includes(rol)` → `alert` y redirige.

### ProtectedRoute
**Archivo:** `src/components/ProtectedRoute.jsx`

**Contrato de props:**
- `allowedRoles?: string[]`
- `children`

**Expectativa sobre metadata:**
- `useAuth().profile.rol` (derivado de `profiles.rol`)

**Salida:**
- si no autorizado redirige a `/dashboard` o `/login`.

---

## 9) Matriz Global de Contratos (completa)

| Productor | Contrato | Consumidor |
|---|---|---|
| Configuration | Form Definition (`sgc_forms` row) | FormBuilder (via props `formDef`), DynamicModule/DynamicForm (vía lectura) |
| FormBuilder | Field Definition (`sgc_form_fields`) | DynamicForm engines, DynamicRecordsView enrichment |
| DynamicModule | Form Metadata (`sgc_forms` list filtered) | DynamicForm (por navegación a `formSlug`) |
| DynamicForm | Values (`values: Record<fieldId, any>`) | dynamicService.submitFormResponse |
| EvidenceUploader | Evidence Object (`file_url, storage_path, file_type, name`) | DynamicForm state → dynamicService |
| SignaturePad | Signature URL (`url: string`) | Engine `onChange` → DynamicForm values |
| dynamicService | Response (`sgc_form_responses` row + join payload) | DynamicRecordsView |
| dynamicService | Audit (`sgc_audit_logs` rows joined) | DynamicRecordsView modal |
| dynamicService | internal_event (`__runtime_internal_event`) | runtimeActivationLayer.activate |
| runtimeActivationLayer | Activation execution result | UI (DynamicForm) (no se documenta uso posterior) |
| ModuleDocumentViewer | Repository Document (`PdfViewerModal doc`) | PdfViewerModal |
| DocumentModule | Program Document (`documentsService.getProgram`) | PdfViewerModal |

---

## 10) Diagrama general de contratos (ASCII, solo contratos)

```text
Configuration
  └─ creates/sets:
      sgc_forms

FormBuilder
  └─ creates/sets:
      sgc_form_fields

DynamicModule
  └─ reads catalogs:
      sgc_modules + sgc_forms
  └─ navigates:
      moduleSlug/formSlug

DynamicForm
  └─ reads:
      sgc_forms (engine_type, roles_allowed)
      sgc_form_fields (field_type, required, options)
  └─ produces:
      values (EAV values)
      evidences (Evidence[])

Engines (Base*)
  └─ produce via onChange:
      values[fieldId] (typed)

dynamicService
  └─ submitFormResponse(values, evidences)
      └─ writes:
          sgc_form_responses
          sgc_response_values
          sgc_evidences
          sgc_audit_logs
      └─ returns:
          Response + __runtime_internal_event

DynamicRecordsView
  └─ reads:
      module responses with joins
      sgc_audit_logs

dynamicService.verifyFormResponse
  └─ writes:
      sgc_form_responses verified_*
      sgc_audit_logs (verify)
  └─ returns:
      internal_event (type=verify)

runtimeActivationLayer.activate(internal_event)
  └─ contract:
      create/verify + required ids
```

---

## 11) Contratos Hardcodeados (contratos fijos NO metadata)

Hardcodes observados en código (contratos):
- `dynamicService.submitFormResponse`:
  - `status` inicial fijo `'pendiente_revision'`
  - `sgc_audit_logs.action_type='create'`
  - `reason` literal `'Creación inicial del registro'`
- `dynamicService.verifyFormResponse/verifyMultipleFormResponses`:
  - `sgc_audit_logs.action_type='verify'`
  - `new_data` fija a `{ status, verification_comment: comment }`
- `DynamicForm`:
  - engine selection fijo por `switch(formDef.engine_type)` para `BaseChecklist/BaseMediciones/default BaseGeneric`
- `RuntimeActivationLayer.activate`:
  - valida `event.type` únicamente `create|verify`

Hardcode adicional de UI (no parte de metadata contract puro):
- `DynamicModule.isDocumentEnabled` usa lista fija de slugs habilitados para tab repositorio documental.

---

## 12) Conclusión

**Contratos fundamentales del Módulo Estándar (reutilizables):**
- `sgc_forms` (engine_type, roles_allowed, id)
- `sgc_form_fields` (field_type, required, options)
- `dynamicService.submitFormResponse()` contract (escrituras + `__runtime_internal_event`)
- `dynamicService.getModuleResponses()` contract (join payload consumido por `DynamicRecordsView`)
- `dynamicService.verifyFormResponse/verifyMultipleFormResponses()` contract (update + audit + internal_event)
- `runtimeActivationLayer.activate()` contract (event.required fields + type)

**Gobernados por metadata:**
- engine_type, roles_allowed, required, field_type/options, EAV mapping por field type.

**Dependientes de servicios:**
- dynamicService (persistencia + internal_event + auditoría)
- documentsService y documentRepositoriesService (documental)

**Dependientes de componentes:**
- engines Base* (render/producción de `values` vía `onChange`)
- EvidenceUploader (produce Evidence[])
- SignaturePad (produce URL)

**Contratos hardcodeados restantes:**
- status inicial, action_type/reason en audit, validación de event.type en runtimeActivationLayer.

**¿Un nuevo módulo reutiliza completamente estos contratos sin crear nuevos componentes?**
- Sí, mientras el nuevo módulo se represente mediante metadata en `sgc_modules/sgc_forms/sgc_form_fields` compatible con `engine_type` soportado y `field_type` soportado por engines base.

---

</content>
