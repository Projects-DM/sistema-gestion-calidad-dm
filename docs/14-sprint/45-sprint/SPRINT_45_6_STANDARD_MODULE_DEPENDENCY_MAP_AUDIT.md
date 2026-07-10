# SPRINT_45_6 — STANDARD MODULE DEPENDENCY MAP (SSOT)

> Documento SSOT (Solo auditoría documental).
> No implementar código.
> No modificar componentes.
> No modificar runtime.
> No modificar base de datos.
> No refactorizar.
>
> Exclusión obligatoria: **Trazabilidad** no se toma como referencia arquitectónica.

---

## 0) Objetivo
Construir el **mapa completo de dependencias** del **Módulo Estándar reutilizable**, demostrando documentalmente que:
- la arquitectura reutilizable **ya existe**;
- la creación de nuevos módulos debe limitarse a **metadata** y configuración;
- sin diseñar/implementar infraestructura adicional.

---

## 1) Componentes incluidos (mínimo requerido)
- Configuration
- FormBuilder
- DynamicModule
- DynamicForm
- DynamicRecordsView
- ModuleDocumentViewer
- DocumentModule
- EvidenceUploader
- SignaturePad
- dynamicService
- runtimeActivationLayer
- documentRepositoriesService
- documentsService
- AuthContext
- ProtectedRoute

---

## 2) Dependencias por componente (qué consume / qué produce)

> Leyenda de tipo de dependencia:
- **metadata**: proviene de DB `sgc_*` u otras tablas de repositorio
- **servicio**: invoca un servicio JS
- **hardcode**: reglas/listas/switch en frontend
- **contrato**: dependencia a estructura de objeto retornado

### 2.1 Configuration
**Archivo**: `src/pages/Configuration.jsx`

- **Depende de**:
  - `dynamicService.getModules()` → carga lista de módulos (metadata)
  - `dynamicService.getFormsByModule()` → carga forms (metadata)
  - inserciones directas a `sgc_forms` vía Supabase client
  - `FormBuilder` (render para configurar campos)
  - `DocumentRepositoriesAdmin` (no auditado en detalle, pero invocado)
- **Tablas consultadas**:
  - `sgc_modules`
  - `sgc_forms`
- **Tablas modificadas** (evidencia directa):
  - `sgc_forms` (insert/delete)
- **Parámetros**:
  - `rol === 'administrador'` (hardcode de acceso)
- **Hardcodes**:
  - lista de motores en select (BaseGeneric/BaseChecklist/BaseMediciones)

### 2.2 FormBuilder
**Archivo**: `src/components/FormBuilder.jsx`

- **Depende de**:
  - `dynamicService.getFormFields(formDef.id)`
  - Supabase client para insert/delete en `sgc_form_fields`
  - `UniversalOrderMotor` + `reorderFormFieldsOrder(...)` para reordenar
  - `formDef.id`
- **Tablas consultadas**:
  - `sgc_form_fields`
- **Tablas modificadas (evidencia directa)**:
  - `sgc_form_fields` insert/delete
  - `sgc_form_fields.order_index` (vía adapter; detalle de tabla no auditado pero objetivo es persistir orden)
- **Hardcodes**:
  - generación `slugName` via regex
  - `options` persistidos solo para `number.unit` y `select.choices`
  - `order_index` = max + 1

### 2.3 DynamicModule
**Archivo**: `src/pages/DynamicModule.jsx`

- **Depende de**:
  - `useParams().moduleSlug`
  - `useAuth().rol`
  - `dynamicService.getModuleBySlug(moduleSlug)`
  - `dynamicService.getFormsByModule(moduleData.id)`
  - `DynamicForm` (navegación)
  - `DynamicRecordsView` (historial)
  - `ModuleDocumentViewer` (repositorio documental)
  - `DocumentModule` (programa PDF)
- **Tablas consultadas**:
  - `sgc_modules`
  - `sgc_forms`
- **Tablas modificadas**:
  - ninguna
- **Hardcodes**:
  - `isDocumentEnabled(slug)` lista fija de slugs para habilitar repositorio documental

### 2.4 DynamicForm
**Archivo**: `src/pages/DynamicForm.jsx`

- **Depende de**:
  - `useParams().formSlug` y `useParams().moduleSlug`
  - `useAuth()` para `user.id` y `rol` (gating por `roles_allowed`)
  - `dynamicService.getFormBySlug(formSlug)`
  - `dynamicService.getFormFields(formDef.id)`
  - motores:
    - `BaseChecklist` (engine_type)
    - `BaseMediciones`
    - `BaseGeneric` (default)
  - `EvidenceUploader` (adjuntos) siempre
  - `dynamicService.submitFormResponse`
  - `runtimeActivationLayer.activate` si existe internal event
- **Tablas consultadas**:
  - `sgc_forms`
  - `sgc_form_fields`
- **Tablas modificadas (vía dynamicService.submit)**:
  - `sgc_form_responses`
  - `sgc_response_values`
  - `sgc_evidences`
  - `sgc_audit_logs`
- **Hardcodes**:
  - engine selection vía `switch(engine_type)`
  - reglas de criticidad en UI basadas en `field_type` y `options.min/max`
  - heurística de campo “observación” por nombre

### 2.5 DynamicRecordsView
**Archivo**: `src/components/DynamicRecordsView.jsx`

- **Depende de**:
  - `dynamicService.getModuleResponses(moduleId)`
  - `dynamicService.getAuditLogs(recordId)`
  - `dynamicService.verifyFormResponse` / `verifyMultipleFormResponses`
  - `runtimeActivationLayer.activate` para verification
  - `exportService` para exportar (no auditado aquí)
- **Tablas consultadas**:
  - `sgc_form_responses`
  - `sgc_response_values`
  - `sgc_form_fields` (join)
  - `sgc_evidences`
  - `sgc_audit_logs`
  - `profiles`
- **Tablas modificadas (vía verify)**:
  - `sgc_form_responses` (status + verified_*)
  - `sgc_audit_logs` (insert verify)
- **Hardcodes**:
  - `isVerificador = rol === 'administrador' || rol === 'calidad'`
  - computedStatus/etiquetas hardcodeadas

### 2.6 ModuleDocumentViewer
**Archivo**: `src/modules/documentViewer/ModuleDocumentViewer.jsx`

- **Depende de**:
  - `documentRepositoriesService.getRepositories({ moduleSlug })`
  - `documentRepositoriesService.getCategories(activeRepositoryId)`
  - `documentsService.getRecords(moduleSlug, categoryKey)`
  - `documentsService.uploadRecord`, `deleteRecord`
  - `useAuth()` para `isAdmin||isCalidad`
  - `PdfViewerModal` (store global)
- **Tablas**:
  - consultadas/modificadas indirectamente vía services (no auditado query aquí)
- **Hardcodes**:
  - `moduleTitle` switch por `moduleSlug`

### 2.7 DocumentModule
**Archivo**: `src/components/DocumentModule.jsx`

- **Depende de**:
  - `documentsService.getProgram(module)`
  - `documentsService.uploadProgram(module, file, user.id)`
  - `documentsService.deleteProgram(doc.id, doc.storage_path)`
  - `useAuth().isAdmin` para botones de reemplazar/eliminar
  - `PdfViewerModal` y `usePdfViewerStore`
- **Tablas**:
  - consultadas/modificadas indirectamente vía services.

### 2.8 EvidenceUploader
**Archivo**: `src/components/EvidenceUploader.jsx`

- **Depende de**:
  - Supabase storage bucket `documentos-sgc`
  - llama `onEvidencesChange(newEvidences)`
- **Tablas**:
  - no usa tablas `sgc_*` (solo storage)
- **Hardcodes**:
  - bucket, path `evidencias/`

### 2.9 SignaturePad
**Archivo**: `src/components/SignaturePad.jsx`

- **Depende de**:
  - Supabase storage bucket `documentos-sgc`
  - `onChange(url)` con la URL pública
- **Tablas**:
  - no usa tablas `sgc_*`
- **Hardcodes**:
  - bucket, path `firmas/`

### 2.10 dynamicService
**Archivo**: `src/services/dynamicService.js`

- **Depende de**:
  - `getSupabaseClient()`
- **Tablas consultadas**:
  - `sgc_modules`, `sgc_forms`, `sgc_form_fields`
  - y joins para responses/auditoría
- **Tablas modificadas (create/verify)**:
  - `sgc_form_responses`, `sgc_response_values`, `sgc_evidences`, `sgc_audit_logs`
- **Contratos**:
  - devuelve `__runtime_internal_event` para `runtimeActivationLayer`

### 2.11 runtimeActivationLayer
**Archivo**: `src/runtime/integration/RuntimeActivationLayer.ts`

- **Depende de**:
  - `BusinessEventTranslationLayer.translate`
  - runtime interno bootstrap (no se rediseña)
  - router interno `this.router.submit(payload)`
- **Tipo de dependencia**:
  - contrato de evento (create/verify + responseId/actorId/correlationId)

### 2.12 documentRepositoriesService
**Archivo**: `src/services/documentRepositoriesService.js`

- **Depende de**:
  - DB/metadata de repositorios/categorías (no auditado query aquí)
- **Consumido por**:
  - ModuleDocumentViewer

### 2.13 documentsService
**Archivo**: `src/services/documentsService.js`

- **Depende de**:
  - DB + storage para programas y registros documentales (no auditado query aquí)
- **Consumido por**:
  - DocumentModule
  - ModuleDocumentViewer

### 2.14 AuthContext
**Archivo**: `src/context/AuthContext.jsx`

- **Dependencias**:
  - Supabase auth + query de `profiles`
- **Tablas consultadas**:
  - `profiles`

### 2.15 ProtectedRoute
**Archivo**: `src/components/ProtectedRoute.jsx`

- **Dependencias**:
  - useAuth
  - `allowedRoles` en rutas administrativas
- **Tablas**:
  - indirectas: `profiles` via AuthContext

---

## 3) Diagrama de dependencias (ASCII)

```text
Configuration
  ├─ dynamicService.getModules/getFormsByModule
  ├─ Supabase: sgc_forms insert/delete
  └─ FormBuilder
        ├─ dynamicService.getFormFields (sgc_form_fields)
        ├─ Supabase: sgc_form_fields insert/delete
        └─ reorderFormFieldsOrder (persist order_index)

DynamicModule
  ├─ dynamicService.getModuleBySlug (sgc_modules)
  ├─ dynamicService.getFormsByModule (sgc_forms)
  ├─ DynamicForm (navigation /modulo/:moduleSlug/:formSlug)
  ├─ DynamicRecordsView (moduleId)
  ├─ ModuleDocumentViewer (moduleSlug)
  └─ DocumentModule (program PDF)

DynamicForm
  ├─ dynamicService.getFormBySlug (sgc_forms)
  ├─ dynamicService.getFormFields (sgc_form_fields)
  ├─ Engine: BaseChecklist/BaseGeneric/BaseMediciones
  ├─ EvidenceUploader (Supabase storage)
  └─ dynamicService.submitFormResponse
        ├─ sgc_form_responses
        ├─ sgc_response_values
        ├─ sgc_evidences
        ├─ sgc_audit_logs
        └─ runtimeActivationLayer.activate(__runtime_internal_event)

DynamicRecordsView
  ├─ dynamicService.getModuleResponses (responses + EAV + evidences)
  ├─ dynamicService.getAuditLogs
  ├─ verifyFormResponse / verifyMultiple...
  └─ runtimeActivationLayer.activate(internalEvent)

ModuleDocumentViewer
  ├─ documentRepositoriesService.getRepositories/getCategories
  ├─ documentsService.getRecords/upload/delete
  └─ PdfViewerModal

DocumentModule
  └─ documentsService.getProgram/uploadProgram/deleteProgram
```

---

## 4) Matriz de dependencias cruzadas (resumen)

| Dependiente | Depende de | Tipo | Consumido por |
|---|---|---|---|
| DynamicModule | dynamicService | servicio | para módulo/forms |
| DynamicForm | dynamicService | servicio | para form/fields y submit |
| DynamicForm | EvidenceUploader | componente | evidencias (storage) |
| DynamicForm | Engine Base* | componente | render por engine_type |
| dynamicService | Supabase | dependencia DB | persistencia sgc_* |
| dynamicService | runtimeActivationLayer | contrato | internalEvent create/verify |
| DynamicRecordsView | dynamicService | servicio | getModuleResponses/audit/verify |
| ModuleDocumentViewer | documentRepositoriesService | servicio | repos/categorías |
| ModuleDocumentViewer | documentsService | servicio | records/doc upload/delete |
| DocumentModule | documentsService | servicio | programa PDF upload/delete |
| AuthContext | Supabase auth + profiles | metadata/DB | rol gating |
| ProtectedRoute | AuthContext | contrato | rutas admin |

---

## 5) Componentes núcleo (para crear nuevos módulos sin desarrollar componentes)
**Núcleo reutilizable** (no requiere nuevos componentes para un nuevo módulo estándar):
- `DynamicModule`
- `DynamicForm`
- `DynamicRecordsView`
- `ModuleDocumentViewer`
- `DocumentModule`
- `dynamicService`
- `runtimeActivationLayer`
- engines base: `BaseChecklist`, `BaseGeneric`, `BaseMediciones`
- `EvidenceUploader`, `SignaturePad`

Los nuevos módulos “solo” conectan metadata en DB (sgc_modules/sgc_forms/sgc_form_fields) y la lógica ya existente se encarga del ciclo.

---

## 6) Conjunto mínimo de metadata para que funcione toda la red
Con base en evidencia de `DynamicModule`, `DynamicForm`, `DynamicRecordsView`, y `dynamicService`:

1) `sgc_modules`
- `slug` (moduleSlug)
- `name/description` (opcional por fallback)
- `is_active=true`

2) `sgc_forms`
- `module_id` referenciando `sgc_modules`
- `slug` (formSlug)
- `is_active=true`
- `engine_type` en el conjunto soportado por `DynamicForm`:
  - BaseChecklist, BaseMediciones, BaseGeneric (default)
- `roles_allowed` (para gating en UI)

3) `sgc_form_fields`
- `form_id` referenciando `sgc_forms`
- `id` (proporcionado por DB)
- `field_type` soportado por engines
- `required`
- `label`, `name`
- `options` por tipo (evidenciado):
  - `number.options.unit`
  - `select.options.choices`
  - y consumo opcional de `options.min/max` por criticidad (consumo se evidencia, persistencia min/max se revisa en FormBuilder)
- `order_index`

4) Para Repositorio Documental:
- existencia de repositorios/categorías y documentos (vía services documentales)
- además, **habilitación tab** depende de hardcode por `moduleSlug` en `DynamicModule` (lista fija).

---

## Conclusión
El módulo estándar reutiliza una red ya probada, donde el “motor” de módulos es el propio pipeline UI→metadata→engines→persistencia→auditoría→runtime bridge.

Este mapa demuestra documentalmente qué es núcleo y qué debe parametrizarse únicamente vía metadata (sin crear nuevas piezas de arquitectura).

