# SPRINT_45_10 — STANDARD DEPENDENCY MAP AUDIT (SSOT)

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
> Objetivo:
> construir el Mapa Oficial de Dependencias del Módulo Estándar, identificando exactamente qué depende de qué, qué piezas pueden cambiar de forma independiente y cuáles constituyen dependencias estructurales.

---

## 0) Alcance
Este sprint **NO** documenta lógica.

Este sprint **NO** documenta metadata.

Este sprint **NO** documenta contratos.

Eso ya quedó documentado.

Aquí únicamente se responde:
- ¿Qué componente depende de cuál?
- ¿Qué dependencia es obligatoria, opcional o indirecta?

---

## 1) Dependencias de UI (componentes)

### 1.1 Configuration
**Dependencias directas (imports):**
- `useAuth()` (context/hook)
- `dynamicService` (métodos de lectura)
- `FormBuilder` (render condicional)
- `DocumentRepositoriesAdmin` (tab documental)

**Hooks usados:** `useState`, `useEffect`, `useAuth`

**Context usados:** Auth via `useAuth()`

**Servicios utilizados:** `dynamicService` (getModules/getFormsByModule)

**Motores utilizados:** N/A (solo selecciona engine_type para persistencia)

**Stores utilizados:** N/A

**Componentes hijos utilizados:**
- `FormBuilder` (si `selectedForm` existe)
- `DocumentRepositoriesAdmin` (si tab=\"documentos\")

**Dependencias indirectas:**
- Supabase client (vía import dinámico en Configuration para insert en `sgc_forms`)

**Dependencias opcionales (condición):**
- `FormBuilder` solo aparece cuando se selecciona/crea `selectedForm`.
- `DocumentRepositoriesAdmin` solo aparece en tab `documentos`.

---

### 1.2 FormBuilder
**Dependencias directas (imports):**
- `dynamicService` (getFormFields)
- `UniversalOrderMotor` helpers (`moveUp/moveDown/toOrderedIds`)
- `reorderFormFieldsOrder` adapter
- `supabase` client (insert/delete/reorder persiste)

**Hooks usados:** `useState`, `useEffect`

**Context:** N/A

**Servicios:** `dynamicService.getFormFields` + Supabase client (directo)

**Motores:** `UniversalOrderMotor` (para orden)

**Stores:** N/A

**Componentes hijos:** ninguno (solo UI)

**Dependencias indirectas:**
- `sgc_form_fields` persistencia vía Supabase

**Dependencias opcionales:** N/A

---

### 1.3 DynamicModule
**Dependencias directas (imports):**
- `useParams`, `useNavigate` (Router)
- `useAuth()`
- `dynamicService` (getModuleBySlug/getFormsByModule)
- `DocumentModule` (programa PDF en header)
- `DynamicRecordsView` (historial cuando tab!=repositorio)
- `ModuleDocumentViewer` (repositorio documental en tab repositorio)

**Hooks usados:** `useState`, `useEffect`, `useParams/useNavigate` (router hooks), `useAuth`

**Context:** Auth via `useAuth()`

**Servicios:** `dynamicService`

**Motores utilizados:** N/A

**Stores:** N/A

**Componentes hijos:**
- `DocumentModule`
- `DynamicRecordsView`
- `ModuleDocumentViewer`

**Dependencias indirectas:**
- habilitación de tab repositorio condicionada por lista hardcodeada `isDocumentEnabled(moduleSlug)`

**Dependencias opcionales (condición):**
- `ModuleDocumentViewer` solo cuando `activeTab='repositorio'`.
- repositorio documental `disabled` si `!isDocumentEnabled(moduleSlug)`.

---

### 1.4 DynamicForm
**Dependencias directas (imports):**
- Router params `useParams`, `useNavigate`
- `useAuth()`
- `dynamicService`
- `runtimeActivationLayer`
- Engines base: `BaseChecklist`, `BaseMediciones`, `BaseGeneric`
- `EvidenceUploader`

**Hooks usados:** `useState`, `useEffect`, `useParams`, `useNavigate`, `useAuth`

**Context:** Auth via `useAuth()`

**Servicios:** `dynamicService` (getFormBySlug/getFormFields/submitFormResponse)

**Motores:** `renderEngine()` selecciona engine según `formDef.engine_type`

**Stores:** N/A

**Componentes hijos:**
- Engine base (BaseChecklist/BaseMediciones/BaseGeneric)
- `EvidenceUploader`

**Dependencias indirectas:**
- Engines base usan `SignaturePad` en casos `field_type='signature'`

**Dependencias opcionales (condición):**
- La verificación de evidencia (`evidenceRequired`) depende de reglas derivadas de field_type/options.

---

### 1.5 DynamicRecordsView
**Dependencias directas (imports):**
- `useAuth()`
- `dynamicService` (getModuleResponses/getAuditLogs/verify*)
- `runtimeActivationLayer` (activate en verify)
- `exportService` (exportación UI)

**Hooks:** `useState`, `useEffect`

**Context:** Auth via `useAuth()`

**Servicios:** `dynamicService`, `exportService`

**Motores:** N/A

**Stores:** N/A

**Componentes hijos (inline):**
- Modal interno (no reuso)
- badges (funciones internas)

**Dependencias indirectas:**
- `sgc_response_values` y joins dependen del payload regresado por dynamicService

**Dependencias opcionales:**
- Modal se crea cuando existe `selectedRecord`.
- acciones de verificación dependen de `isVerificador`.

---

### 1.6 EvidenceUploader
**Dependencias directas (imports):**
- `getSupabaseClient` (storage)

**Hooks:** `useState`, `useRef`

**Context:** N/A

**Servicios:** Supabase storage

**Motores:** N/A

**Stores:** N/A

**Componentes hijos:** ninguno

**Dependencias indirectas:**
- Efecto de persistencia llega a `dynamicService.submitFormResponse` (vía props callback)

**Dependencias opcionales:**
- Render siempre desde DynamicForm; persistencia depende de que el usuario adjunte archivos.

---

### 1.7 SignaturePad
**Dependencias directas (imports):**
- `getSupabaseClient` (storage)

**Hooks:** `useState`, `useRef`, `useEffect`

**Context:** N/A

**Servicios:** Supabase storage

**Componentes hijos:** canvas UI

**Dependencias indirectas:**
- `SignaturePad` es utilizado por engines base cuando `field_type='signature'`.

**Dependencias opcionales:**
- Solo aparece en engines cuando existe field signature en `fields`.

---

### 1.8 ModuleDocumentViewer
**Dependencias directas (imports):**
- `useAuth()`
- `documentRepositoriesService`
- `documentsService`
- `usePdfViewerStore` + `PdfViewerModal`

**Hooks:** `useState`, `useEffect`, `useMemo`, `useAuth`

**Context:** Auth via `useAuth()`

**Servicios:** documentRepositoriesService, documentsService

**Motores:** N/A

**Stores:** `usePdfViewerStore`

**Componentes hijos:** `PdfViewerModal`

**Dependencias indirectas:**
- `documentsService.getRecords/uploadRecord/deleteRecord` ejecuta persistencia en `sgc_records` + storage bucket

**Dependencias opcionales (condición):**
- subidas/reemplazos/elim dependen de `canManage`.

---

### 1.9 DocumentModule
**Dependencias directas (imports):**
- `useAuth()`
- `documentsService`
- `usePdfViewerStore` + `PdfViewerModal`

**Hooks:** `useState`, `useRef`, `useEffect`

**Context:** Auth via `useAuth()`

**Servicios:** `documentsService.getProgram/uploadProgram/deleteProgram`

**Stores:** `usePdfViewerStore`

**Componentes hijos:** `PdfViewerModal`

**Dependencias indirectas:**
- acceso admin condiciona show de acciones

**Dependencias opcionales:**
- Botones upload/delete solo si `isAdmin`.

---

## 2) Dependencias de Servicios (dynamicService/documentsService/documentRepositoriesService)

> Nota: sin detallar lógica; solo se enumera de qué depende cada servicio.

### 2.1 dynamicService
**Depende de:**
- `getSupabaseClient()`

**Usa (depende de la existencia de DB):**
- `sgc_modules`, `sgc_forms`
- `sgc_form_fields`
- `sgc_form_responses`, `sgc_response_values`, `sgc_evidences`, `sgc_audit_logs`
- joins con `profiles`

**Dependencias runtime:**
- produce `__runtime_internal_event` (contrato hacia runtime)

**Dependencias opcionales:**
- evidencia puede ser vacía (evidences default=[])

---

### 2.2 documentsService
**Depende de:**
- `getSupabaseClient()`
- storage bucket: `documentos-sgc`

**Usa (tablas DB):**
- `sgc_programs`
- `sgc_records`

**Storage:**
- programas en `programs/*`
- registros en `records/${module}/${type}/*`

**Dependencias opcionales:**
- `getRecords(module,type)` admite type null/undefined (retorna todos del módulo).

---

### 2.3 documentRepositoriesService
**Depende de:**
- `getSupabaseClient()`

**Usa (tablas DB):**
- `sgc_document_repositories`
- `sgc_document_repository_categories`

**Dependencias runtime/storage:**
- no usa storage; solo metadata documental.

---

## 3) Dependencias de Metadata (requerida por cada pieza)

> Este sprint no re-documenta metadata; solo indica requerimientos como “qué se necesita sí/no”.

### Requerimiento por componente
- **DynamicModule** requiere: `sgc_modules`, `sgc_forms`.
- **DynamicForm** requiere: `sgc_forms`, `sgc_form_fields`.
- **DynamicRecordsView** requiere: `sgc_form_responses` + joins a `sgc_response_values`, `sgc_form_fields`, `sgc_evidences`, `sgc_audit_logs`, `profiles`.
- **FormBuilder** requiere: `sgc_form_fields`.
- **Configuration** requiere: `sgc_modules` (lectura) y `sgc_forms` (escritura/lectura).
- **ModuleDocumentViewer** requiere: `sgc_document_repositories`, `sgc_document_repository_categories` + `sgc_records` (vía documentsService) y storage documental.
- **DocumentModule** requiere: `sgc_programs` + storage documental.
- **EvidenceUploader** requiere: storage documental (bucket) pero no `sgc_*`.
- **SignaturePad** requiere: storage documental pero no `sgc_*`.

---

## 4) Dependencias Runtime (puente)

Solo el puente:
- **DynamicForm** → `dynamicService.submitFormResponse` → `__runtime_internal_event` → `runtimeActivationLayer.activate()`

- **DynamicRecordsView** → `dynamicService.verifyFormResponse/verifyMultiple...` → `__runtime_internal_event` → `runtimeActivationLayer.activate()`

Dependencia estructural: `event.type` debe ser `create` o `verify` (validación interna).

---

## 5) Dependencias de Persistencia (tablas por flujo)

### Submit
- `sgc_form_responses`
- `sgc_response_values`
- `sgc_evidences`
- `sgc_audit_logs`
- Evidencias/firmas persistidas previamente en storage (no DB).

### Verification
- `sgc_form_responses` (update)
- `sgc_audit_logs` (insert)

### History
- `sgc_form_responses` (select)
- join: `sgc_response_values`
- join: `sgc_form_fields`
- join: `sgc_evidences`
- join: `sgc_audit_logs`
- join: `profiles`

### Documental (no “sgc estándar” de módulo)
- programas: `sgc_programs` + bucket `documentos-sgc`
- documentos: `sgc_records` + bucket `documentos-sgc`
- repositorios/categorías documental: `sgc_document_repositories` + `sgc_document_repository_categories`

---

## 6) Dependencias por Engine (Base*)

> Este sprint solo lista qué depende y qué usa de forma estructural.

- **BaseGeneric**
  - depende de: engine props `{ fields, values, onChange }`
  - usa `SignaturePad` cuando `field_type='signature'`.

- **BaseChecklist**
  - depende de `{ fields, values, onChange }`
  - usa `SignaturePad` cuando `field_type='signature'`.

- **BaseMediciones**
  - depende de `{ fields, values, onChange }`
  - usa `SignaturePad` cuando `field_type='signature'`.

---

## 7) Dependencias por Tipo de Campo (field_type soportado)

> Persistencia/render/validación se considera “dependencia” de estructural UI.

- **text/textarea** → engine input + onChange → values → submit → dynamicService
- **number** → input number + onChange → values → submit → dynamicService
- **boolean** → input radio/checkbox → values boolean → submit (EAV boolean)
- **date/time** → inputs → values string → submit
- **select** → options.choices → values string → submit
- **signature** → `SignaturePad` → onChange(url:string) → values string → submit

---

## 8) Dependencias por Rol (gating)

> Este sprint describe dónde se aplica gating; no RLS.

- **Administrador**
  - Configuration accesible (hardcode `rol !== 'administrador'`)
  - DynamicRecordsView permite verificador (hardcode `rol==='administrador' || rol==='calidad'`)
  - DocumentModule botones admin (hardcode `isAdmin`)

- **Calidad**
  - DynamicRecordsView permite verificación (hardcode `rol==='administrador'||rol==='calidad'`)
  - ModuleDocumentViewer permite manejo (usa `isCalidad`)

- **Operativo / consulta**
  - DynamicForm accede si `form.roles_allowed` contiene su rol
  - DynamicRecordsView no muestra actions de verificación

---

## 9) Dependencias Externas reales

- React (render)
- React Router (params, rutas)
- Supabase JS (`getSupabaseClient`)
- Supabase Storage (storage bucket `documentos-sgc`)
- Lucide React (UI icons)
- PDF Viewer modal (`PdfViewerModal`) vía store
- Stores globales: `usePdfViewerStore`
- Context API: Auth via `useAuth()` (AuthContext)

---

## 10) Dependencias Hardcodeadas (fijas en código)

- `switch(formDef.engine_type)`
- `status: 'pendiente_revision'` en submit
- `action_type: 'create'` y `action_type: 'verify'` en audit
- `DynamicModule.isDocumentEnabled(slug)` lista fija
- `DynamicRecordsView.isVerificador = rol==='administrador'||rol==='calidad'`
- `ProtectedRoute` redirecciones por path: `/login`, `/dashboard`
- `runtimeActivationLayer.activate` valida `event.type` ∈ {create, verify}

---

## 11) Grafo global de dependencias (árbol)

```text
Configuration
  └─ depends on: dynamicService (getModules/getFormsByModule) + Supabase insert sgc_forms

FormBuilder
  └─ depends on: dynamicService.getFormFields + Supabase sgc_form_fields write

DynamicModule
  ├─ depends on: dynamicService.getModuleBySlug + getFormsByModule
  ├─ uses children: DocumentModule + DynamicRecordsView + ModuleDocumentViewer
  └─ hardcode gating: isDocumentEnabled(slug)

DynamicForm
  ├─ depends on: dynamicService.getFormBySlug/getFormFields + submitFormResponse
  ├─ uses children: Engines Base* + EvidenceUploader
  └─ bridge: runtimeActivationLayer.activate(result.__runtime_internal_event)

Engine Base*
  └─ depends on: props {fields,values,onChange} + SignaturePad when field_type='signature'

dynamicService
  └─ depends on: Supabase DB tables sgc_* + profiles joins

DynamicRecordsView
  ├─ depends on: dynamicService.getModuleResponses/getAuditLogs/verify*
  └─ bridge: runtimeActivationLayer.activate(internalEvent)

ModuleDocumentViewer
  └─ depends on: documentRepositoriesService + documentsService + PdfViewerModal store

DocumentModule
  └─ depends on: documentsService + PdfViewerModal store

EvidenceUploader
  └─ depends on: Supabase Storage (bucket documentos-sgc)

SignaturePad
  └─ depends on: Supabase Storage (bucket documentos-sgc)

```

---

## 12) Matriz de dependencias (estructural)

| Componente | UI | Metadata (lectura/escritura) | Servicio | Runtime | Storage | DB |
|---|---|---|---|---|---|---|
| Configuration | ✔ | ✔ | ✔ (dynamicService) | ✖ | ✖ | ✔ (sgc_modules/sgc_forms) |
| FormBuilder | ✔ | ✔ | ✔ (dynamicService) | ✖ | ✖ | ✔ (sgc_form_fields) |
| DynamicModule | ✔ | ✔ | ✔ | ✖ | ✖ | ✔ (sgc_modules/sgc_forms) |
| DynamicForm | ✔ | ✔ | ✔ (dynamicService) | ✔ | (indirect via EvidenceUploader/SignaturePad) | ✔ (sgc_form_responses/*) |
| DynamicRecordsView | ✔ | ✔ | ✔ | ✔ | ✖ | ✔ (sgc_form_responses/* + profiles) |
| EvidenceUploader | ✔ | ✖ | ✖ | ✖ | ✔ | ✖ |
| SignaturePad | ✔ | ✖ | ✖ | ✖ | ✔ | ✖ |
| ModuleDocumentViewer | ✔ | ✔ (doc repos) | ✔ | ✖ | ✔ (document storage via documentsService) | ✔ (sgc_document_* + sgc_records) |
| DocumentModule | ✔ | ✔ (program) | ✔ | ✖ | ✔ | ✔ (sgc_programs) |

---

## 13) Conclusión

**Dependencias estructurales (rompen el flujo si faltan):**
- Supabase DB/joins para `dynamicService` y `DynamicRecordsView`
- `dynamicService.submitFormResponse`/`verify*` y su retorno `__runtime_internal_event`
- `runtimeActivationLayer.activate()` para habilitar la ejecución del puente
- `EvidenceUploader` y `SignaturePad` (storage) cuando el form incluye evidencias/firmas

**Dependencias opcionales (condicionadas):**
- `ModuleDocumentViewer` depende de tab habilitada (`isDocumentEnabled`)
- `DocumentModule` botones admin dependen de `isAdmin`
- `SignaturePad` depende de la existencia de campos `field_type='signature'`
- Acciones de verificación dependen de `rol` (hardcode)

**Dependencias únicamente de UI:**
- badges, filtros, modal UI (sin afectar persistencia)

**Dependencias del Runtime Bridge (exclusivamente):**
- evento `__runtime_internal_event` retornado por dynamicService

**Núcleo mínimo para reutilizar completamente el Módulo Estándar con nuevos módulos basados en metadata:**
- `DynamicModule`
- `DynamicForm`
- `dynamicService`
- engines base (`BaseGeneric`, `BaseChecklist`, `BaseMediciones`)
- `DynamicRecordsView`
- `runtimeActivationLayer`

</content>
