# SPRINT_45_1A — CURRENT SYSTEM DECOMPOSITION (SSOT AUDIT)

## 0) Objetivo y reglas de trabajo
- **Solo auditoría** (lecturas). No se propone ni implementa motor nuevo.
- No se modifica el código existente.
- No se crean nuevos contratos, runtime, capas o refactors.
- **Trazabilidad NO define estándar** (solo se audita su funcionamiento).
- Módulos estándar de referencia:
  - Operaciones
  - Medición y Control
  - Mantenimiento
  - Calidad
  - Gestión Documental

---

## 1) Diagrama lógico del flujo real (estándar)

```text
Sidebar / UI (vista de módulo)
    ↓
pages/DynamicModule (catálogo por módulo)
    ↓
(1) Ruta: /modulo/:moduleSlug/:formSlug
    ↓
pages/DynamicForm (render + validación + persistencia)
    ↓
src/services/dynamicService.submitFormResponse
    ↓
Supabase (sgc_form_responses / sgc_response_values / sgc_evidences / sgc_audit_logs)
    ↓
runtimeActivationLayer.activate (bridge interno)

(2) Tab “Historial y Consultas”
    ↓
components/DynamicRecordsView
    ↓
dynamicService.getModuleResponses
    ↓
UI (cálculo de computedStatus) + verificación
    ↓
dynamicService.verifyFormResponse / verifyMultipleFormResponses

(3) Tab “Repositorio Documental”
    ↓
modules/documentViewer/ModuleDocumentViewer
    ↓
documentRepositoriesService + documentsService
    ↓
Storage + DB (según implementación documental)
```

---

## 2) Inventario técnico de componentes principales (estándar)

A continuación se descompone **solo** el sistema base reutilizable (sin usar Trazabilidad como estándar).

### 2.1 pages/DynamicModule.jsx
- **Archivo**: `src/pages/DynamicModule.jsx`
- **Responsabilidad**: Orquestar el “módulo estándar” por `moduleSlug`.
- **Entradas**:
  - `moduleSlug` (del router)
  - `rol`/estado auth (vía `useAuth`)
- **Salidas**:
  - `modInfo` (metadata módulo)
  - lista `forms` (formularios del módulo)
  - vistas (tabs) renderizadas:
    - “Diligenciar Registros” → catálogo de forms
    - “Historial y Consultas” → `DynamicRecordsView` con `moduleId`
    - “Repositorio Documental” → `ModuleDocumentViewer` (condicionado)
- **Dependencias**:
  - `dynamicService.getModuleBySlug(moduleSlug)`
  - `dynamicService.getFormsByModule(moduleData.id)`
  - `useAuth` (filtro por roles)
  - `components/DocumentModule.jsx` (programa PDF)
  - `components/DynamicRecordsView.jsx`
  - `modules/documentViewer/ModuleDocumentViewer.jsx`
- **Qué puede reutilizarse sin cambios**:
  - Su lógica base de “módulo por metadata” es reutilizable.
  - El patrón de navegación a formularios es estable.
- **Qué depende de hardcode actualmente**:
  1. `isDocumentEnabled(slug)` lista fija:
     - `['mantenimiento','calidad','operaciones','gestion-documental','medicion-control']`
  2. Comportamiento de repositorio condicionado por esa lista.
  3. Tabs siempre presentes (aunque uno se deshabilite/oculte).
- **Qué debería parametrizarse**:
  - Reemplazar habilitación documental por un **flag o existencia de repositorios activos** en DB.
  - Alternativamente: usar una columna `supports_document_repository` en `sgc_modules` (si existiera; si no, la parametrización mínima sería derivar desde repositorios/categorías).

---

### 2.2 pages/DynamicForm.jsx
- **Archivo**: `src/pages/DynamicForm.jsx`
- **Responsabilidad**: Resolver formulario, cargar campos, renderizar usando engines y persistir respuesta.
- **Entradas**:
  - `moduleSlug`, `formSlug` (router)
  - `rol/user` (vía `useAuth`)
- **Salidas**:
  - UI renderizada con engine (según `formDef.engine_type`)
  - persistencia:
    - `dynamicService.submitFormResponse(formDef.id, user.id, processedValues, evidences)`
  - side-effect runtime:
    - `runtimeActivationLayer.activate(result.__runtime_internal_event)`
- **Dependencias**:
  - `dynamicService.getFormBySlug(formSlug)`
  - `dynamicService.getFormFields(form.id)`
  - `EvidenceUploader` (carga adjuntos)
  - engines (switch):
    - `BaseChecklist`, `BaseMediciones`, `BaseGeneric`
- **Qué puede reutilizarse sin cambios**:
  - Flujo general: load form → load fields → render engine → validate → submit → runtime activate.
- **Qué depende de hardcode actualmente**:
  1. `switch (formDef.engine_type)` con casos fijos.
  2. Validación extra “críticos” está implementada con lógica específica del tipo `boolean=false` y límites de `number` usando `options.min/max`.
  3. Regla de observación basada en heurística por nombre del campo (`includes('observacion/observación')`).
- **Qué debería parametrizarse**:
  - Permitir engines adicionales sin tocar el `switch`.
  - Parametrizar reglas de “crítico” por metadata de campo (por ejemplo flags en `options` o atributos en `sgc_form_fields`).
  - Reemplazar heurística “observación por nombre” por una relación/atributo explícito (por metadata).

---

### 2.3 components/DynamicRecordsView.jsx
- **Archivo**: `src/components/DynamicRecordsView.jsx`
- **Responsabilidad**: Presentar historial de respuestas por módulo y permitir verificación.
- **Entradas**:
  - `moduleId` (prop desde `DynamicModule`)
  - `rol/user` (vía `useAuth`)
  - selección local (selectedRecord, filtros)
- **Salidas**:
  - Lista/table con responses
  - Modal con detalle (respuestas y auditoría)
  - verificación:
    - `dynamicService.verifyFormResponse`
    - `dynamicService.verifyMultipleFormResponses`
  - exportación vía `exportService`
- **Dependencias**:
  - `dynamicService.getModuleResponses(moduleId)`
  - `dynamicService.getAuditLogs(recordId)`
  - `runtimeActivationLayer.activate(internalEvent)` (si aplica al verificar)
  - `exportService` + utilidades de nombre de archivo
- **Qué puede reutilizarse sin cambios**:
  - El enfoque general (fetch responses + computedStatus + modal + verificación).
- **Qué depende de hardcode actualmente**:
  1. Reglas de `computedStatus` en cliente (derivadas de tipos y rangos):
     - boolean false → crítico/advertencia
     - number fuera de min/max → crítico
  2. Estados/etiquetas (aprobado/rechazado/corregido/pendiente) están codificados.
  3. “canVerifyRecord” y selección está acoplada a rol (`rol === 'administrador' || rol === 'calidad'`) y a `rec.status`.
- **Qué debería parametrizarse**:
  - Mapeo de etiquetas/estados a un diccionario/config.
  - Regla de computedStatus (crítico vs advertencia) por metadata.
  - Habilitación de verificación por roles según metadata (si ya existe `roles_allowed` para verificación en DB, debería usarse).

---

### 2.4 modules/documentViewer/ModuleDocumentViewer.jsx
- **Archivo**: `src/modules/documentViewer/ModuleDocumentViewer.jsx`
- **Responsabilidad**: Gestionar el repositorio documental por `moduleSlug` (repositorios, categorías, upload/replace/delete, visor PDF).
- **Entradas**:
  - `moduleSlug` (prop)
  - `user`/roles (vía `useAuth`)
- **Salidas**:
  - listados: repositorios → categorías → documentos
  - upload/replace/delete (si `canManage`)
  - render de PDFs vía `PdfViewerModal` (global store)
- **Dependencias**:
  - `documentRepositoriesService.getRepositories({ moduleSlug })`
  - `documentRepositoriesService.getCategories(activeRepositoryId)`
  - `documentsService.getRecords(moduleSlug, categoryKey)`
  - `documentsService.uploadRecord`, `deleteRecord`
  - store: `usePdfViewerStore`
- **Qué puede reutilizarse sin cambios**:
  - El flujo general por repositorios/categorías (DB-driven) es reutilizable.
- **Qué depende de hardcode actualmente**:
  1. `moduleTitle` `switch (moduleSlug)` (título UX).
  2. `safeFileType`/validación de PDF (no impide módulos, pero es hardcode de UI).
  3. gating `canManage` = `isAdmin || isCalidad` (hardcode de roles).
- **Qué debería parametrizarse**:
  - Roles permitidos de gestión documental por metadata (idealmente desde DB).
  - Títulos por `modInfo.name` o desde metadata del módulo.

---

### 2.5 pages/Configuration.jsx
- **Archivo**: `src/pages/Configuration.jsx`
- **Responsabilidad**: Configurar formularios, asignar engines, y gestionar repositorios documentales.
- **Entradas**:
  - `rol` (vía `useAuth`), restringido a administrador
- **Salidas**:
  - listados de módulos y forms
  - creación de `sgc_forms` (insert directo a DB vía Supabase import dinámico)
  - navegación a `FormBuilder` para campos
  - acceso a `DocumentRepositoriesAdmin`
- **Dependencias**:
  - `dynamicService.getModules()`, `getFormsByModule()`
  - `FormBuilder` (edición de `sgc_form_fields`)
  - `DocumentRepositoriesAdmin`
  - Supabase client (creación/eliminación de `sgc_forms`)
- **Qué puede reutilizarse sin cambios**:
  - La lógica de configuración de engine_type y roles_allowed (alta por metadata).
- **Qué depende de hardcode actualmente**:
  1. Valor inicial de `newFormDef.engine_type` y opciones de engines en el select.
  2. Restricción `rol !== 'administrador'`.
- **Qué debería parametrizarse**:
  - Engines disponibles (lista select) para evitar hardcode a 3 motores.
  - Permiso de acceso a configuración por rol/metadata.

---

### 2.6 src/services/dynamicService.js
- **Archivo**: `src/services/dynamicService.js`
- **Responsabilidad**: Fuente de verdad funcional para metadata + persistencia de respuestas + auditoría.
- **Entradas**:
  - slugs/ids: `moduleSlug`, `moduleId`, `formId`, `responseId`
  - `userId`, `values`, `evidences`
- **Salidas**:
  - `getModules`, `getModuleBySlug`
  - `getFormsByModule`, `getFormBySlug`, `getFormFields`
  - `submitFormResponse` → inserta en DB y crea `internalEvent`
  - `verifyFormResponse` / `verifyMultipleFormResponses` → actualiza status + auditoría
  - `getModuleResponses` → retorna join EAV completo para UI
  - `getAuditLogs` → auditoría + join profiles
- **Dependencias**:
  - `getSupabaseClient()`
  - esquema DB: tablas `sgc_*`
- **Qué puede reutilizarse sin cambios**:
  - La interfaz del “contrato” de metadata/persistencia.
- **Qué depende de hardcode actualmente**:
  - Estructura de `internalEvent.type` (create/verify) está fija.
  - `submitFormResponse` fija status inicial `pendiente_revision`.
- **Qué debería parametrizarse**:
  - Diccionario de estados iniciales y/o reglas de “status workflow” por metadata.

---

### 2.7 src/runtime/integration/RuntimeActivationLayer.ts
- **Archivo**: `src/runtime/integration/RuntimeActivationLayer.ts`
- **Responsabilidad**: Puente para activar el motor runtime interno ante eventos `create/verify`.
- **Entradas**:
  - `event` con `type`, `responseId`, `actorId`, `correlationId` (y opcional `formId`, `auditEventId`)
- **Salidas**:
  - resultado de router submission hacia runtime interno
- **Dependencias**:
  - import dinámico del bootstrap (no se rediseña)
  - `BusinessEventTranslationLayer`
- **Qué puede reutilizarse sin cambios**:
  - Su función de puente es estable para el estándar actual.
- **Qué depende de hardcode actualmente**:
  - Valida `event.type` permitido: `create` o `verify`.
- **Qué debería parametrizarse**:
  - (Fuera de alcance de esta auditoría) si existieran nuevos tipos de eventos; hoy no aplica para crear nuevos módulos.

---

## 3) Tabla de hardcodes (inventario)

> Basado en lecturas de los archivos mínimos indicados. El “inventario completo” en términos estrictos implicaría búsqueda adicional por todo el repo; este documento se concentra en el set mínimo requerido.

| Archivo | Hardcode encontrado | Motivo | Impacto | Propuesta de parametrización |
|---|---|---|---|---|
| `src/pages/DynamicModule.jsx` | `isDocumentEnabled(slug)` lista fija | Evitar mostrar repositorio a slugs no estándar | Bloquea repositorio documental para módulos nuevos | Habilitar por existencia de repositorios activos o flag en DB (`sgc_modules`) |
| `src/pages/DynamicForm.jsx` | `switch (formDef.engine_type)` | Selección de engine desde UI | Impide render de engines no mapeados | Mapeo/registry dinámico existente o extensión vía metadata (sin new runtime) |
| `src/pages/DynamicForm.jsx` | heurística “observación” por nombre | Regla de hallazgo crítico | Depende de convención de nombres de campos | Atributo explícito por metadata en `sgc_form_fields` |
| `src/components/DynamicRecordsView.jsx` | `computedStatus` derivado en cliente | UI decide criticidad | Inconsistencia si rules cambian sin tocar UI | Reglas por metadata/contrato o diccionario parametrizable |
| `src/components/DynamicRecordsView.jsx` | roles verificación hardcode (`administrador`/`calidad`) | Segregación de funciones en UI | Permisos no parametrizables | Regla de roles por metadata/estado |
| `src/modules/documentViewer/ModuleDocumentViewer.jsx` | `moduleTitle switch` | UX título | No bloquea, pero no escala | Título desde `modInfo.name` o DB |
| `src/modules/documentViewer/ModuleDocumentViewer.jsx` | `canManage = isAdmin || isCalidad` | Roles de gestión documental | Bloquea gestión documental con otros roles | Parametrizar roles de gestión desde metadata |
| `src/pages/Configuration.jsx` | select engines con 3 opciones | UI lista limitada | Impide creación de forms con engines no listados | Generar lista desde metadata/registry |

---

## 4) Árbol de dependencias (lógico)

### 4.1 Standard module (catálogo → diligenciar → persistir)
```text
App.jsx
  └─ routes /:moduleSlug → DynamicModule
       ├─ dynamicService.getModuleBySlug → sgc_modules
       ├─ dynamicService.getFormsByModule → sgc_forms
       ├─ Link → /modulo/:moduleSlug/:formSlug → DynamicForm
       │    ├─ dynamicService.getFormBySlug → sgc_forms
       │    ├─ dynamicService.getFormFields → sgc_form_fields
       │    ├─ engine_type → BaseGeneric/BaseChecklist/BaseMediciones
       │    ├─ EvidenceUploader → (upload evidences vía dynamic/doc services)
       │    └─ dynamicService.submitFormResponse
       │         ├─ insert sgc_form_responses
       │         ├─ insert sgc_response_values (EAV)
       │         ├─ insert sgc_evidences
       │         └─ insert sgc_audit_logs
       └─ runtimeActivationLayer.activate(__runtime_internal_event)
            └─ RuntimeActivationLayer.initialize() (bootstrap)
            └─ BusinessEventTranslationLayer.translate
            └─ persistence router submit
```

### 4.2 Historial y verificación
```text
DynamicModule (tab)
  └─ DynamicRecordsView
       ├─ dynamicService.getModuleResponses → join EAV + evidences + profiles
       ├─ UI computedStatus (derivado)
       ├─ dynamicService.verifyFormResponse / verifyMultipleFormResponses
       │    ├─ update sgc_form_responses.status
       │    └─ insert sgc_audit_logs(action_type=verify)
       └─ runtimeActivationLayer.activate (si devuelve internalEvent)
```

### 4.3 Repositorio documental
```text
DynamicModule (tab repositorio; hoy hardcode)
  └─ ModuleDocumentViewer (moduleSlug)
       ├─ documentRepositoriesService.getRepositories({moduleSlug})
       ├─ getCategories(activeRepositoryId)
       ├─ documentsService.getRecords(moduleSlug, categoryKey)
       ├─ uploadRecord / deleteRecord (según canManage)
       └─ PdfViewerModal (viewer global store)
```

---

## 5) Caminos mínimos para parametrizar (sin implementar)

> Resumen ultra-concreto (para el sprint siguiente de implementación, no en este).

1. **Parametrizar habilitación del tab Repositorio Documental**
   - Entrada: `moduleSlug`.
   - Regla: habilitar si DB indica repositorios/categorías activos.
   - Reemplaza: lista hardcodeada en `DynamicModule.jsx`.

2. **Parametrizar/externar la selección de engine**
   - Entrada: `formDef.engine_type`.
   - Regla: usar mapeo/registry (si existe en repo; si no, parametrizar el mapping) para evitar `switch`.

3. **Parametrizar “crítico” y “observación”**
   - Entrada: metadata por campo.
   - Regla: no heurísticas por nombre; usar atributos en `options` o flags en `sgc_form_fields`.

4. **Parametrizar roles de verificación y gestión documental**
   - Entrada: roles permitidos desde DB.
   - Regla: no hardcode `administrador/calidad`.

---

## 6) Qué NO debe tocarse (según restricciones)
- No crear runtime/config engine nuevos.
- No cambiar el esquema `sgc_*` (solo se documenta).
- No eliminar archivos.
- No refactorizar.
- No redefinir el estándar con Trazabilidad.

---

## 7) Estado actual de “SSOT” documental
- Este documento complementa al SSOT previo (`SPRINT_45_CURRENT_SYSTEM_AUDIT.md`).
- El SSOT real para el sprint siguiente debe cubrir:
  - “qué puede reutilizarse sin cambios”
  - “qué está hardcodeado”
  - “qué parametrizar mínimo para crear módulos nuevos”

---

## 8) Conclusión (precisa)
El sistema estándar reutilizable hoy ya existe como **pipeline UI → metadata (DB) → engines → persistencia/auditoría → runtime puente**.

La extensión hacia “nuevos módulos creados desde Configuración” depende en la práctica de remover **hardcodes** en:
- habilitación documental por lista fija de slugs,
- dispatcher de engines por `switch`,
- reglas de criticidad/observación en heurísticas en UI,
- gating por roles codificados en UI.

Este set identifica con precisión el conjunto mínimo de parametrización requerido sin diseñar arquitectura nueva.

