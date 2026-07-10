# SPRINT_45_8 — STANDARD MODULE EXECUTION FLOW AUDIT (SSOT)

> Documento SSOT (Solo auditoría documental).
>
> No implementar código.
> No modificar componentes.
> No modificar runtime.
> No modificar base de datos.
> No refactorizar.
>
> Exclusión obligatoria: **Trazabilidad** NO es referencia arquitectónica.

Este sprint responde únicamente:

**¿Cómo fluye realmente la información dentro del módulo estándar?**

---

## 1) Alcance
Documenta el pipeline completo del **Módulo Estándar** (definición + ejecución) sin proponer cambios.

Pipeline general:

Configuration
↓
FormBuilder
↓
DynamicModule
↓
DynamicForm
↓
Engine
↓
Submit
↓
Persistence
↓
History
↓
Verification
↓
Audit
↓
Runtime Bridge

Fuentes de evidencia en repositorio:
- `src/pages/Configuration.jsx`
- `src/components/FormBuilder.jsx`
- `src/pages/DynamicModule.jsx`
- `src/pages/DynamicForm.jsx`
- `src/components/EvidenceUploader.jsx`
- `src/components/SignaturePad.jsx`
- `src/components/DynamicRecordsView.jsx`
- `src/services/dynamicService.js`
- `src/runtime/integration/RuntimeActivationLayer.ts`

> Nota: este documento describe el flujo por componentes/servicios observados; no “explica” runtime.

---

## 2) Flujo 1 — Creación de un formulario

### 2.1 Quién inicia
**Administrador** (gating hardcodeado en UI): `Configuration.jsx` valida `rol !== 'administrador'`.

### 2.2 Componente
- `Configuration`

### 2.3 Servicio
- Supabase client (vía import dinámico en `Configuration.jsx`) para insertar `sgc_forms`
- (Posteriormente) `FormBuilder` para construir `sgc_form_fields`

### 2.4 Metadata creada
1) `sgc_forms`
- creado al ejecutar `supabase.from('sgc_forms').insert({ module_id, name, slug, description, engine_type, roles_allowed })`

2) `sgc_form_fields`
- creado desde `FormBuilder` con insert en `sgc_form_fields`.

### 2.5 Parámetros utilizados
- `newFormDef.module_id`
- `newFormDef.name`
- `newFormDef.slug` (si está vacío, se genera con regex `replace(/[^a-z0-9]+/g,'-')`)
- `newFormDef.engine_type` (por UI: `BaseGeneric/BaseChecklist/BaseMediciones`)
- `newFormDef.roles_allowed` (por UI)

### 2.6 Resultado producido
- `sgc_forms` persistido.
- Se selecciona formulario (`selectedForm`) y se renderiza `FormBuilder`.
- `sgc_form_fields` persistido para ese `form_id`.

### 2.7 Secuencia documental (exacta)
Administrador
↓
Configuration
↓
Crear Formulario
↓
`sgc_forms`
↓
FormBuilder
↓
Crear Campos
↓
`sgc_form_fields`

---

## 3) Flujo 2 — Descubrimiento del módulo

### 3.1 Entrada
- URL del router: `/:moduleSlug`

### 3.2 Router
- `src/App.jsx`: `Route path=":moduleSlug" element={<DynamicModule />}`

### 3.3 Componente
- `DynamicModule`

### 3.4 Parámetros críticos
- `moduleSlug` desde `useParams()`
- `rol` desde `useAuth()`

### 3.5 Servicio
- `dynamicService.getModuleBySlug(moduleSlug)` → `sgc_modules`
- `dynamicService.getFormsByModule(moduleData.id)` → `sgc_forms`

### 3.6 Metadata usada
- `sgc_modules` (filtro por `slug` / `single()`)
- `sgc_forms` (filtro `module_id` + `is_active=true` + orden)

### 3.7 Filtros y roles
- `DynamicModule` filtra `forms` por `roles_allowed`:
  - `!f.roles_allowed || f.roles_allowed.includes(rol)`

### 3.8 Salida
- Catálogo visible (tarjetas de formularios) y navegación a `DynamicForm` por `form.slug`.

---

## 4) Flujo 3 — Apertura de un formulario

### 4.1 Entrada
- Click sobre formulario en `DynamicModule`:
  - navega a `/modulo/${moduleSlug}/${form.slug}`

### 4.2 Componente
- `DynamicForm`

### 4.3 Parámetros
- `moduleSlug`
- `formSlug`
- `rol`

### 4.4 Servicios
- `dynamicService.getFormBySlug(formSlug)` → `sgc_forms`
- `dynamicService.getFormFields(form.id)` → `sgc_form_fields`

### 4.5 Metadata
- `sgc_forms`: engine (`engine_type`), `roles_allowed`, `name/description`
- `sgc_form_fields`: `field_type`, `required`, `options`, `label`, `id`

### 4.6 Decisiones
- Si `form.roles_allowed` no incluye `rol`:
  - se alerta y se redirige al módulo.

### 4.7 Secuencia documental
Click formulario
↓
DynamicForm
↓
formSlug
↓
getFormBySlug
↓
`sgc_forms`
↓
getFormFields
↓
`sgc_form_fields`
↓
Engine
↓
Render UI

---

## 5) Flujo 4 — Render dinámico

### 5.1 Motor (engine_type)
En `DynamicForm.renderEngine()`:
- `formDef.engine_type === 'BaseChecklist'` → `<BaseChecklist ... />`
- `formDef.engine_type === 'BaseMediciones'` → `<BaseMediciones ... />`
- default → `<BaseGeneric ... />`

### 5.2 Campo (field_type)
Los engines reciben:
- `fields` (lista desde `sgc_form_fields`)
- `values` (estado interno inicial)
- `onChange` (callback)

Los rules/validaciones mostradas en `DynamicForm` se basan en:
- `field.field_type === 'boolean'` → `values[f.id] === false` marca criticidad
- `field.field_type === 'number'` + `f.options.min/max` marca criticidad

### 5.3 Validaciones explícitas en `DynamicForm`
- Campos requeridos (`field.required`) se validan en `handleSubmit`.
- Criticidad deriva de `field_type` + `options.min/max` (number) y boolean false.
- Si hay hallazgos críticos:
  - se requiere evidencia (`EvidenceUploader` debe retornar evidences)
  - se valida existencia de un campo “observación” por heurística en `field.name` que contenga:
    - `observacion` o `observación`

### 5.4 Componente renderizado
- El engine renderiza la UI según `field_type` (detalle por engines no auditado en este sprint, solo el contrato de render).

---

## 6) Flujo 5 — Captura de datos

### 6.1 Entrada
- Usuario diligencia UI del engine.

### 6.2 Estado interno producido
- `values`: objeto `{ [fieldId]: value }`.

### 6.3 Evidencias
Siempre se renderiza `EvidenceUploader` desde `DynamicForm`.

Evidencia capturada se compone en estado `evidences` y se envía al submit.

### 6.4 Firmas (si el engine lo soporta)
Si existe `field_type='signature'`, típicamente renderiza `SignaturePad` (contrato `onChange`).

`SignaturePad` persiste en Supabase storage y entrega URL pública por `onChange(url)`.

### 6.5 Cómo llega al submit
- `handleSubmit` llama:
  - `dynamicService.submitFormResponse(formDef.id, user.id, processedValues, evidences)`

---

## 7) Flujo 6 — Submit (persistencia)

### 7.1 Componente
- `DynamicForm` (submit)

### 7.2 Servicio
- `dynamicService.submitFormResponse(formId, userId, values, evidences)`

### 7.3 Orden de inserción y tablas
**Orden documental (según `submitFormResponse`)**:

1) `sgc_form_responses`
- insert con:
  - `form_id` = formId
  - `created_by` = userId
  - `status` = `'pendiente_revision'`

2) `sgc_response_values`
- inserta EAV mapeando keys(fieldId) → `response_id` y un value_* según tipo:
  - `value_text`, `value_number`, `value_boolean`, `value_json`

3) `sgc_evidences`
- si `evidences.length > 0`:
  - inserta `response_id`, `file_url`, `storage_path`, `file_type`

4) `sgc_audit_logs`
- inserta audit con:
  - `response_id`
  - `action_type: 'create'`
  - `modified_by: userId`
  - `new_data: values`
  - `reason: 'Creación inicial del registro'`

### 7.4 internal_event producido
- `dynamicService` retorna:
  - `...response` + `__runtime_internal_event` con:
    - `type:'create'`
    - `formId`
    - `responseId`
    - `actorId`
    - `timestamp`
    - `correlationId`
    - `auditEventId`

### 7.5 Secuencia documental
Submit
↓
dynamicService.submitFormResponse()
↓
`sgc_form_responses`
↓
`sgc_response_values`
↓
`sgc_evidences`
↓
`sgc_audit_logs`
↓
internal_event

---

## 8) Flujo 7 — Historial

### 8.1 Componente
- `DynamicRecordsView`

### 8.2 Servicio
- `dynamicService.getModuleResponses(moduleId)`
- `dynamicService.getAuditLogs(recordId)` al abrir modal

### 8.3 Metadata consumida y joins
`getModuleResponses` realiza join de:
- `sgc_forms!inner ( id, name, module_id )`
- `profiles:created_by ( nombre, rol )`
- `verifier:verified_by ( nombre, rol )`
- `sgc_response_values ( field_id, value_text, value_number, value_boolean, sgc_form_fields ( label, field_type, options ) )`
- `sgc_evidences ( id, file_url, file_type )`

### 8.4 Enriquecimiento (criticidad)
UI calcula `computedStatus` en base a:
- boolean false
- number fuera de `options.min/max`

### 8.5 Modal detalle
- muestra respuestas + evidencias
- muestra auditoría (auditLogs)

---

## 9) Flujo 8 — Verificación

### 9.1 Verificador
- habilitado si `rol === 'administrador' || rol === 'calidad'`

### 9.2 Servicio
- `dynamicService.verifyFormResponse(selectedRecord.id, user.id, verifyStatus, verifyComment)`
- o `verifyMultipleFormResponses(selectedIds, ...)`

### 9.3 Cambios de metadata (según service)
`verifyFormResponse` ejecuta:
- Update sobre `sgc_form_responses`:
  - `status`
  - `verified_by`
  - `verified_at` = ahora
  - `verification_comment` = comment

- Inserta en `sgc_audit_logs`:
  - `action_type:'verify'`
  - `modified_by`
  - `new_data:{status, verification_comment}`
  - `reason: Verificación operativa: ${status}`

### 9.4 internal_event
- Retorna `internalEvent` con:
  - `type:'verify'`
  - `responseId`
  - `actorId`
  - `correlationId`
  - `auditEventId`

### 9.5 Secuencia documental
Verificador
↓
verifyFormResponse()
↓
update response
↓
aud it
↓
internal event

---

## 10) Flujo 9 — Runtime Bridge (solo puente)

### 10.1 Servicio
- `dynamicService` retorna `__runtime_internal_event`

### 10.2 Componente/Orquestación
- `runtimeActivationLayer.activate(internalEvent)` desde UI

### 10.3 Bridge interno (contrato)
- `RuntimeActivationLayer` consume el `internalEvent` y lo traduce/inyecta hacia router interno.

> Este sprint **no** documenta runtime: solo que el puente existe y usa el contrato internalEvent.

---

## 11) Flujo documental (reporte de programa y repositorio)

> Aunque no forma parte del modelo `sgc_*` unificado del pipeline de módulo estándar, el flujo documental visible está auditado a nivel de circulación:

### 11.1 ModuleDocumentViewer
- `ModuleDocumentViewer` carga repositorios y categorías:
  - `documentRepositoriesService.getRepositories({ moduleSlug })`
  - `documentRepositoriesService.getCategories(repositoryId)`
- carga documentos:
  - `documentsService.getRecords(moduleSlug, categoryKey)`
- abre visor:
  - `PdfViewerModal` (store global)

### 11.2 DocumentModule (Programa PDF)
- `DocumentModule` carga programa:
  - `documentsService.getProgram(module)`
- acciones:
  - upload: `documentsService.uploadProgram(module, file, user.id)`
  - delete: `documentsService.deleteProgram(doc.id, doc.storage_path)`
- muestra: botón `Ver Programa` que abre visor PDF.

---

## 12) Matriz Entrada → Salida

| Etapa | Entrada | Proceso | Salida |
|---|---|---|---|
| Configuration | módulo | crea formulario | `sgc_forms` |
| FormBuilder | formulario | crea campos | `sgc_form_fields` |
| DynamicModule | moduleSlug | obtiene metadata | catálogo visibles de forms |
| DynamicForm | formSlug | obtiene form y fields | UI + `values` |
| Engine | metadata field_type/options | render UI | `values` |
| Submit | values + evidences | persistencia | `sgc_form_responses`, `sgc_response_values`, `sgc_evidences`, `sgc_audit_logs` |
| History | moduleId | joins + enriquecimiento | registros + modal |
| Verify | responseId + status/comment | update + audit | `sgc_form_responses.status`, `verified_*`, `sgc_audit_logs` |
| Runtime | `__runtime_internal_event` | bridge | activación interna |

---

## 13) Pipeline completo (diagrama ASCII)

```text
Configuration
      │
      ▼
sgc_forms
      │
      ▼
FormBuilder
      │
      ▼
sgc_form_fields
      │
      ▼
DynamicModule
      │
      ▼
DynamicForm
      │
      ▼
Engine
      │
      ▼
values
      │
      ├─────────────┐
      ▼             ▼
Evidence        Signature
      │             │
      └──────┬──────┘
             ▼
submitFormResponse
             │
             ▼
sgc_form_responses
             │
     ┌───────┼────────┐
     ▼       ▼        ▼
values   evidences   audit
             │
             ▼
DynamicRecordsView
             │
             ▼
Verification
             │
             ▼
Runtime Bridge
```

---

## 14) Conclusión

**Pipeline oficial del módulo estándar (end-to-end):**
- Empieza con **Configuration/FormBuilder** para crear metadata (`sgc_forms`, `sgc_form_fields`).
- Termina con **verificación + auditoría** y el **bridge** `__runtime_internal_event`.

**Pasos completamente metadata-driven (según evidencia):**
- Descubrimiento de módulo/forms: `sgc_modules`/`sgc_forms`.
- Render dinámico: `engine_type` y la estructura de `sgc_form_fields`.
- Persistencia y lectura: `submitFormResponse` escribe `sgc_form_responses`/`sgc_response_values`/`sgc_evidences`/`sgc_audit_logs`.

**Pasos con reglas hardcodeadas identificadas:**
- Estado inicial: `status='pendiente_revision'`.
- Audit: `action_type` (`create`/`verify`) y `reason` con literales.
- Criticidad y exigencia de evidencia: derivada de `field_type` y `options.min/max`, y heurística de campo “observación” por `field.name`.

**Pasos que reutilizan exactamente la misma infraestructura:**
- `dynamicService.submitFormResponse` + `dynamicService.getModuleResponses` + `dynamicService.getAuditLogs` + `dynamicService.verify*`.
- `runtimeActivationLayer.activate` reutiliza el contrato `__runtime_internal_event`.

