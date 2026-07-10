# SPRINT_45_10A — STANDARD DEPENDENCY MAP REFINEMENT (SSOT)

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
> Refined en base a SPRINT_45_10 incorporando **únicamente** información documental adicional sobre las dependencias existentes.

---

## 0) Fuentes de evidencia utilizadas (documentales)
- `src/components/*.jsx` (Configuration, FormBuilder, DynamicModule, DynamicForm, DynamicRecordsView, EvidenceUploader, SignaturePad, ModuleDocumentViewer, DocumentModule)
- `src/pages/*.jsx` (DynamicModule, DynamicForm, Configuration)
- `src/services/*.js` (dynamicService, documentsService, documentRepositoriesService)
- `src/runtime/integration/RuntimeActivationLayer.ts`
- `src/context/AuthContext.jsx` (vía `useAuth()` para rol/perfil; no se re-audita lógica)

---

## 1) Validación documental (control de SPRINT_45_10)
No se incorpora información nueva funcional. Se refina:
- dependencias transitivas (directas vs indirectas)
- lista explícita de hooks/stores/contexts
- consumidores por servicio/bridge
- clasificación (crítica/estructural/secundaria/opcional/cosmética)
- nivel de acoplamiento (Alto/Medio/Bajo)
- dependencias temporales e inicialización (orden de disponibilidad)
- circularidad (si existe)

---

## 2) Separación de dependencias por componente (directas vs transitivas)

> Criterio:
> - **Directas** = imports directos en el archivo.
> - **Transitivas** = componentes/servicios alcanzados indirectamente (por renders/llamadas).

### 2.1 Configuration (`src/pages/Configuration.jsx`)
**Dependencias directas (imports):**
- `useAuth` (hook)
- `dynamicService`
- `FormBuilder`
- `DocumentRepositoriesAdmin`
- `lucide-react` (icons)

**Dependencias transitivas:**
- Supabase client (import dinámico `../lib/supabase` para `sgc_forms`)
- `FormBuilder` → usa `dynamicService.getFormFields` + Supabase `sgc_form_fields`

**Context/Router Params:**
- Context: Auth vía `useAuth()`.
- Router Params: N/A.

**Servicios:** dynamicService.

---

### 2.2 FormBuilder (`src/components/FormBuilder.jsx`)
**Dependencias directas (imports):**
- `dynamicService`
- `UniversalOrderMotor` + `reorderFormFieldsOrder`
- `supabase` client (import dinámico dentro de handler)

**Transitivas:**
- `reorderFormFieldsOrder` → persistencia de orden (`sgc_form_fields.order_index`).

**Hooks:** `useState`, `useEffect`.

---

### 2.3 DynamicModule (`src/pages/DynamicModule.jsx`)
**Dependencias directas:**
- `useParams`, `useNavigate`, `Link`
- `useAuth`
- `dynamicService`
- `DocumentModule`
- `DynamicRecordsView`
- `ModuleDocumentViewer`

**Transitivas:**
- `ModuleDocumentViewer` → `documentRepositoriesService` + `documentsService`
- `DocumentModule` → `documentsService` + `usePdfViewerStore`

**Hooks:** `useState`, `useEffect`.

---

### 2.4 DynamicForm (`src/pages/DynamicForm.jsx`)
**Dependencias directas:**
- `useParams`, `Link`, `useNavigate`
- `useAuth`
- `dynamicService`
- `runtimeActivationLayer`
- Engines: `BaseChecklist`, `BaseMediciones`, `BaseGeneric`
- `EvidenceUploader`

**Transitivas:**
- Engines base → `SignaturePad` (cuando existe campo signature)
- `EvidenceUploader` → Supabase storage + produce Evidence[]
- `SignaturePad` → Supabase storage + produce URL string

**Hooks:** `useState`, `useEffect`.

---

### 2.5 DynamicRecordsView (`src/components/DynamicRecordsView.jsx`)
**Dependencias directas:**
- `dynamicService`
- `useAuth`
- `runtimeActivationLayer`
- `exportService`

**Transitivas:**
- `dynamicService.getModuleResponses` → depende de join `sgc_*` y `profiles`
- Modal consume `selectedRecord.sgc_response_values`, `sgc_evidences`, `sgc_audit_logs`

---

### 2.6 EvidenceUploader (`src/components/EvidenceUploader.jsx`)
**Dependencias directas:**
- `getSupabaseClient`

**Transitivas:**
- Produce Evidence[] y lo entrega al callback `onEvidencesChange`

---

### 2.7 SignaturePad (`src/components/SignaturePad.jsx`)
**Dependencias directas:**
- `getSupabaseClient`

**Transitivas:**
- Produce URL string vía `onChange(url)`

---

### 2.8 ModuleDocumentViewer (`src/modules/documentViewer/ModuleDocumentViewer.jsx`)
**Dependencias directas:**
- `useAuth`
- `documentRepositoriesService`
- `documentsService`
- `usePdfViewerStore`, `PdfViewerModal`

**Transitivas:**
- `documentsService.getRecords` / uploadRecord / deleteRecord

---

### 2.9 DocumentModule (`src/components/DocumentModule.jsx`)
**Dependencias directas:**
- `useAuth`
- `documentsService`
- `usePdfViewerStore`, `PdfViewerModal`

---

## 3) Consumidores de cada servicio (quién llama a quién)

### 3.1 dynamicService (`src/services/dynamicService.js`)
**Consumidores:]
- `Configuration` (solo lectura de módulos/forms; y escritura manual en `sgc_forms`)
- `FormBuilder` (getFormFields)
- `DynamicModule` (getModuleBySlug, getFormsByModule)
- `DynamicForm` (getFormBySlug, getFormFields, submitFormResponse)
- `DynamicRecordsView` (getModuleResponses, getAuditLogs, verifyFormResponse, verifyMultipleFormResponses)

### 3.2 documentsService (`src/services/documentsService.js`)
**Consumidores:**
- `DocumentModule`: getProgram/uploadProgram/deleteProgram
- `ModuleDocumentViewer`: getRecords/uploadRecord/deleteRecord

### 3.3 documentRepositoriesService (`src/services/documentRepositoriesService.js`)
**Consumidores:**
- `ModuleDocumentViewer`: getRepositories, getCategories

### 3.4 runtimeActivationLayer (`RuntimeActivationLayer.ts`)
**Consumidores:**
- `DynamicForm`: activa en submit (si `__runtime_internal_event` existe)
- `DynamicRecordsView`: activa en verify

### 3.5 usePdfViewerStore
**Consumidores:**
- `DocumentModule`
- `ModuleDocumentViewer`

---

## 4) Clasificación de criticidad + nivel de acoplamiento

> Criterio:
- **Críticas/estructurales**: si se quitan, el módulo estándar no funciona.
- **Secundarias**: afectan UI o documental pero no bloquean core submit/verify.
- **Opcionales**: dependen de campos o rutas/tab.
- **Cosméticas**: solo UI.

### 4.1 dynamicService
- **Criticidad:** estructural/crítica.
- **Acoplamiento:** Alto (centraliza persistencia y puente contract internal_event).

### 4.2 runtimeActivationLayer
- **Criticidad:** estructural (solo para bridge; la persistencia DB ocurre antes).
- **Acoplamiento:** Medio-Alto (depende del contrato internalEvent).

### 4.3 EvidenceUploader / SignaturePad
- **Criticidad:** opcional (depende de campos/inputs), pero para formularios con evidencia/signature es **crítica**.
- **Acoplamiento:** Medio.

### 4.4 ModuleDocumentViewer / DocumentModule
- **Criticidad:** opcional (tab repo documental + programa pdf).
- **Acoplamiento:** Bajo-Medio (capa documental separada).

### 4.5 exportService
- **Criticidad:** cosmética/secundaria.
- **Acoplamiento:** Bajo (solo export UI).

---

## 5) Dependencias temporales (orden documental)

- Router debe resolver params antes de:
  - `DynamicModule` (moduleSlug)
  - `DynamicForm` (moduleSlug/formSlug)

- Auth (useAuth) debe estar disponible para:
  - gating `rol` y `allowedRoles`
  - `user.id` para submit/verify

- Metadata debe existir antes de render de:
  - `DynamicModule` forms (sgc_modules+sgc_forms)
  - `DynamicForm` fields (sgc_forms+sgc_form_fields)

- Runtime bridge:
  - `runtimeActivationLayer.activate(event)` depende de:
    - `__runtime_internal_event` retornado desde dynamicService
    - inicialización interna (lazy bootstrap) antes del submit del router interno

---

## 6) Dependencias de inicialización

- `DynamicForm` requiere antes de `handleSubmit`:
  - metadata cargada (`formDef`, `fields`)
  - values inicializados
  - runtime bridge puede fallar; se observa manejo de runtime no disponible en RuntimeActivationLayer.

- `DynamicRecordsView` requiere antes de acciones verify:
  - moduleId y carga de records
  - `selectedRecord` para `verifyFormResponse`.

- `ModuleDocumentViewer` requiere antes de mostrar categorías:
  - activeRepositoryId cargado

---

## 7) Dependencias circulares
No se observa ciclo explícito de dependencias mutuas entre módulos/servicios (flujo UI → services → metadata/persistencia → retorno UI). La única “circularidad” potencial es el uso de runtimeActivationLayer que inicializa bootstrap, pero es interno al runtime y no forma ciclo de dependencias UI→runtime→UI.

---

## 8) Clasificación funcional (por categorías)
- Presentación: Configuration UI, FormBuilder UI, DynamicModule UI, DynamicForm UI, Engines base, DynamicRecordsView UI, DocumentModule/ModuleDocumentViewer UI.
- Persistencia: dynamicService (sgc_*), documentsService/documentRepositoriesService (sgc_programs/sgc_records y sgc_document_*), Evidence/Signature storage.
- Runtime: runtimeActivationLayer (bridge internalEvent).
- Infraestructura: Supabase client/storage, PDF viewer store.
- Metadata: sgc_modules/sgc_forms/sgc_form_fields/sgc_form_responses/joins.
- Servicios: dynamicService, documentsService, documentRepositoriesService, exportService.
- Storage: documentos-sgc bucket.
- DB: tablas sgc_* mencionadas.

---

## 9) Árbol maestro global (desde Configuration hasta Runtime bridge)

```text
Configuration
  └─ dynamicService.getModules/getFormsByModule (metadata)
  └─ (create) sgc_forms (Supabase insert)
      
FormBuilder
  └─ dynamicService.getFormFields
  └─ (create/delete/reorder) sgc_form_fields (Supabase)

DynamicModule
  └─ dynamicService.getModuleBySlug (sgc_modules)
  └─ dynamicService.getFormsByModule (sgc_forms)
      
DynamicForm
  └─ dynamicService.getFormBySlug + getFormFields
  └─ Engines Base render + onChange → values
  └─ EvidenceUploader (Evidence[]) → submit evidences
  └─ (optional) SignaturePad → onChange(url)
  
  └─ dynamicService.submitFormResponse()
      ├─ sgc_form_responses (insert)
      ├─ sgc_response_values (insert EAV)
      ├─ sgc_evidences (insert)
      └─ sgc_audit_logs (insert create)

runtimeActivationLayer.activate(__runtime_internal_event)
  └─ valida contract + traducción
  └─ runtime router submit
```

---

## 10) Conclusión

- **Estructurales:** `dynamicService` + su retorno `__runtime_internal_event` + `runtimeActivationLayer.activate()`.
- **Reemplazables (parciales):** engines base (manteniendo contract props `fields/values/onChange` y field_type soportados) y UI (cosmética).
- **Opcionales:** documental (ModuleDocumentViewer/DocumentModule) y evidence/signature dependiendo de campo.
- **Críticas para reutilizar completamente el Módulo Estándar:**
  - dynamicService CRUD/submit/verify
  - motores base + compatibilidad de campo `field_type`
  - storage Evidence/Signature (si campo lo requiere)
  - runtimeActivationLayer contract `type=create|verify` y `responseId/actorId/correlationId`.

</content>
