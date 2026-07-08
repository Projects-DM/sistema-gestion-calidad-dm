# SPRINT_45_5 — STANDARD MODULE FEATURE MAP AUDIT (SSOT)

> Documento SSOT (Solo auditoría documental). **No** implementar código.
> **No** modificar componentes.
> **No** modificar runtime.
> **No** modificar base de datos.
> **No** refactorizar.
>
> Exclusión obligatoria: **Trazabilidad NO** se toma como referencia arquitectónica.
>
> Objetivo: construir el mapa funcional completo de un **Módulo Estándar** reutilizable (Operaciones, Calidad, Mantenimiento, Medición y Control, Gestión Documental), identificando de dónde proviene cada funcionalidad.

---

## 1) Alcance funcional (qué se audita)
Se auditan funcionalidades visibles y su origen en el código (componentes + servicios + metadata vs hardcode), al menos:
1. Header del módulo
2. Botones superiores (Ver Programa, Actualizar/Eliminar)
3. Tabs (Diligenciar Registros, Historial y Consultas, Repositorio Documental)
4. Catálogo de formularios
5. Historial y consultas
6. Repositorio documental
7. Evidencias
8. Firmas
9. Auditoría
10. Roles y permisos
11. Runtime existente

---

## 2) Mapa funcional por funcionalidad (origen → control)

> Para “Metadata vs Hardcode”:
- **Metadata** = proviene de DB (sgc_* / repos/document meta)
- **Hardcode** = lista/switch/reglas codificadas en el frontend

### 2.1 Header del módulo (nombre, descripción, icono, color)
**Componente**: `src/pages/DynamicModule.jsx` (header principal) + `src/components/DocumentModule.jsx` (botón programa)

- **Nombre / descripción**:
  - Fuente: `modInfo.name`, `modInfo.description` desde `dynamicService.getModuleBySlug(moduleSlug)`.
- **Icono/Color**:
  - evidenciado como estilos Tailwind y elementos (no metadata en lo auditado).

**Servicio utilizado**:
- `dynamicService.getModuleBySlug(slug)` (consulta `sgc_modules`)

**Tablas**:
- consultadas: `sgc_modules`
- modificadas: ninguna

**Parámetros**:
- `moduleSlug`

**Hardcode**:
- no se encontró mapeo icon/color desde DB; el header aplica estilos fijos.

**Reutilización**:
- Alta (DynamicModule es contenedor estándar).

### 2.2 Botones superiores: “Ver Programa”, “Actualizar Programa”, “Eliminar Programa”
**Componente**: `src/components/DocumentModule.jsx`

**Responsabilidades**:
- cargar “programa PDF” del módulo
- renderizar botones según estado del documento y permisos

**Servicios utilizados**:
- `documentsService.getProgram(module)`
- `documentsService.uploadProgram(module, file, user.id)`
- `documentsService.deleteProgram(doc.id, doc.storage_path)`

**Tablas consultadas/modificadas**:
- no auditadas a nivel query porque no se leyó `documentsService.js` en esta iteración.
- sí se conoce que hay persistencia documental vía `documentsService`.

**Parámetros**:
- `module` (pasado como `modInfo.slug` desde DynamicModule)
- `isAdmin` desde `useAuth()`

**Hardcode**:
- condición de botones: `isAdmin && ...` (roles hardcodeados en UI por flags del auth)

**Reutilización**:
- Parcial: el documento depende de la existencia de “programa” en `documentsService` para ese módulo.

---

### 2.3 Tabs del módulo
**Componente**: `src/pages/DynamicModule.jsx`

Tabs:
1. **Diligenciar Registros** (siempre)
2. **Historial y Consultas** (siempre)
3. **Repositorio Documental** (condicional)

**Control**:
- Diligenciar e Historial: render directo.
- Repositorio Documental:
  - `disabled={!isDocumentEnabled(moduleSlug)}`

**Hardcode**:
- `isDocumentEnabled(slug)` contiene lista fija:
  - `['mantenimiento','calidad','operaciones','gestion-documental','medicion-control']`

**Reutilización**:
- Diligenciar/Historial: 100% reutilizables.
- Repositorio documental: reutilizable pero con gating hardcodeado.

---

### 2.4 Catálogo de formularios (Formatos Disponibles)
**Componente**: `src/pages/DynamicModule.jsx`

**Origen**:
- `forms` desde `dynamicService.getFormsByModule(moduleData.id)`

**Filtrado por roles**:
- `!f.roles_allowed || f.roles_allowed.includes(rol)`

**Tablas**:
- consultadas: `sgc_forms`
- modificadas: ninguna

**Hardcode**:
- icono del form: `Icons[form.icon || 'FileText']` (si DB trae icon, se usa; si no, fallback a FileText).

**Reutilización**:
- 100% reusable por metadata (sgc_forms + sgc_modules + roles_allowed).

---

### 2.5 Historial y consultas
**Componente**: `src/components/DynamicRecordsView.jsx`

**Funciones**:
- listar responses del módulo
- filtros UI
- modal detalle: respuestas + evidencias + auditoría y verificación
- verificación (aprobado/rechazado) y auditoría

**Servicios**:
- `dynamicService.getModuleResponses(moduleId)`
- `dynamicService.getAuditLogs(recordId)`
- `dynamicService.verifyFormResponse(...)`
- `dynamicService.verifyMultipleFormResponses(...)`

**Tablas (evidencia por dynamicService)**:
- consultadas: `sgc_form_responses`, `sgc_response_values`, `sgc_form_fields`, `sgc_evidences`, `sgc_audit_logs`, `profiles`
- modificadas: `sgc_form_responses` (status/verified_*), `sgc_audit_logs` (insert) en verify

**Parámetros**:
- `moduleId` (viene de DynamicModule → modInfo.id)
- `rol` / flags admin-calidad verificación

**Hardcode**:
- UI “isVerificador” = `rol === 'administrador' || rol === 'calidad'`
- computedStatus:
  - boolean false → crítico/advertencia
  - number fuera de `options.min/max`

**Reutilización**:
- Alta: depende de metadata de campos/campos y rules en UI.

---

### 2.6 Repositorio documental
**Componente**: `src/modules/documentViewer/ModuleDocumentViewer.jsx`

**Funciones**:
- cargar repositorios por módulo (`moduleSlug`)
- listar categorías
- listar documentos por categoría
- subir/reemplazar/eliminar documentos si `canManage`
- abrir PDF en modal (PdfViewerModal)

**Servicios**:
- `documentRepositoriesService.getRepositories({ moduleSlug })`
- `documentRepositoriesService.getCategories(activeRepositoryId)`
- `documentsService.getRecords(moduleSlug, categoryKey)`
- `documentsService.uploadRecord(moduleSlug, categoryKey, file, user.id)`
- `documentsService.deleteRecord(record.id, record.storage_path)`

**Tablas**:
- consultadas/modificadas vía services documentales (no auditadas a nivel query en este sprint).

**Parámetros**:
- `moduleSlug`
- `canManage = isAdmin || isCalidad`

**Hardcode**:
- `moduleTitle` switch por moduleSlug (títulos)
- `uploadInputId = useMemo(() => 'upload_'+moduleSlug+'_'+Date.now())` (implica impureza/ID único en UI)

**Reutilización**:
- Alta si repositorios/categorías están en DB.
- Gate adicional: habilitación tab depende de hardcode list en DynamicModule.

---

### 2.7 Evidencias (adjuntos para registros)
**Componente**: `src/components/EvidenceUploader.jsx`

**Función**:
- adjuntar archivos (images y/o pdf)
- subirlos a storage bucket `documentos-sgc`
- devolver lista con `file_url`, `storage_path`, `file_type`

**Servicios**:
- Supabase storage (`upload`, `getPublicUrl`, `remove`)

**Tablas**:
- no usa tablas `sgc_*`.

**Hardcode**:
- bucket `documentos-sgc`
- path prefijo `evidencias/${fileName}`

**Reutilización**:
- 100% reusable para cualquier formulario que use `EvidenceUploader` (DynamicForm lo integra siempre).

---

### 2.8 Firmas
**Componente**: `src/components/SignaturePad.jsx` (invocado por engines)

**Función**:
- capturar firma en canvas
- convertir a blob PNG
- subir a storage bucket `documentos-sgc` en `firmas/${fileName}`
- llamar `onChange(url)` para persistir en DynamicForm

**Servicios**:
- Supabase storage

**Tablas**:
- ninguna `sgc_*`.

**Hardcode**:
- storage bucket `documentos-sgc`
- path `firmas/`

**Reutilización**:
- Reutilizable por metadata cuando `field_type === 'signature'` y el engine lo soporte (BaseChecklist/BaseGeneric/BaseMediciones evidencian signature).

---

### 2.9 Auditoría
**Componente**: `src/components/DynamicRecordsView.jsx` (UI) + `src/services/dynamicService.js` (persistencia)

**Servicios**:
- `dynamicService.getAuditLogs(responseId)`
- `dynamicService.submitFormResponse(...)` inserta audit action_type=create
- `dynamicService.verifyFormResponse(...)` inserta audit action_type=verify

**Tablas**:
- `sgc_audit_logs`

**Parámetros**:
- correlación por `response_id`

**Hardcode**:
- action types fijos: `create` / `verify`

**Reutilización**:
- 100% reusable por cualquier form response gestionada por dynamicService.

---

### 2.10 Roles y permisos
**Componentes**:
- `src/components/ProtectedRoute.jsx` (gating de rutas admin/config/usuarios)
- `src/context/AuthContext.jsx` (deriva flags `isAdmin`, `isCalidad`, `rol`)
- `src/pages/DynamicModule.jsx` (filtra forms por `roles_allowed`)
- `src/pages/DynamicForm.jsx` (alerta si rol no permitido)
- `src/components/DynamicRecordsView.jsx` (verificador admin/calidad)

**Servicios**:
- Auth usa Supabase client (sesión + `profiles`) (no auditado aquí a nivel RLS)

**Tablas**:
- `profiles` (para rol)
- `sgc_forms.roles_allowed` (permiso por form)

**Hardcode**:
- verificador: `rol === 'administrador' || rol === 'calidad'`

**Reutilización**:
- Alta a nivel metadata de `roles_allowed`.

---

### 2.11 Runtime existente
**Componente**: `src/pages/DynamicForm.jsx` y `src/components/DynamicRecordsView.jsx`

**Servicios**:
- `runtimeActivationLayer.activate(internalEvent)` cuando dynamicService retorna `__runtime_internal_event`

**Tablas**:
- runtime no se audita en este sprint (solo se evidencia que se invoca)

**Hardcode**:
- eventos que retornan y se consumen: `type: create/verify` (contrato mínimo)

**Reutilización**:
- 100% reutilizable; no se implementa runtime nuevo.

---

## 3) Matriz final (Funcionalidad → Origen)

| Funcionalidad | Componente | Servicio | Metadata | Hardcode | Reutilizable |
|---|---|---|---|---|---|
| Header (nombre/desc) | `DynamicModule` | `dynamicService.getModuleBySlug` | `sgc_modules` | Estilos UI fijos | Sí |
| Header (icon/color) | `DynamicModule` | - | - | UI styles | Sí (pero no parametrizable) |
| Programa PDF botones | `DocumentModule` | `documentsService.*` | Documento en repositorio documental (metadata no auditada) | Botones por `isAdmin` | Parcial |
| Tabs generales | `DynamicModule` | - | - | Lista fija para repositorio tab | Parcial |
| Tab Repositorio Documental | `ModuleDocumentViewer` | `documentRepositoriesService`, `documentsService` | repositorios/categorías/documentos | Tab gating por lista fija | Parcial |
| Catálogo de formularios | `DynamicModule` | `dynamicService.getFormsByModule` | `sgc_forms` + `roles_allowed` | Fallback icon `FileText` | Sí |
| Render formularios | `DynamicForm` | `dynamicService.getFormBySlug/getFormFields` | `sgc_forms/sgc_form_fields` | engine switch `switch(engine_type)` | Parcial |
| Validación required | `DynamicForm` | - | `required` en `sgc_form_fields` | - | Sí |
| Criticidad | `DynamicForm`/Engines/UI | - | `field_type/options` | reglas heurísticas | Parcial |
| Evidencias adjuntas | `EvidenceUploader` | Supabase storage | - | bucket/prefijo | Sí |
| Firmas | `SignaturePad` | Supabase storage | `field_type=signature` | bucket/prefijo | Sí |
| Persistencia respuestas | `dynamicService.submitFormResponse` | `dynamicService` | `values` por `sgc_form_fields` | status inicial fijo `pendiente_revision` | Sí |
| Persistencia evidencias | `dynamicService.submitFormResponse` | `dynamicService` | evidencias de UI | mapeo fijo a `sgc_evidences` | Sí |
| Auditoría | `dynamicService` + `getAuditLogs` | `dynamicService` | `sgc_audit_logs` | action types fijos | Sí |
| Verificación | `DynamicRecordsView` + `dynamicService.verify*` | `dynamicService` | status/verificación | verificador admin/calidad | Sí |
| Runtime bridge | `DynamicForm` / `DynamicRecordsView` | `runtimeActivationLayer.activate` | evento generado | contract mínimo create/verify | Sí |

---

## 4) Conclusión (para reutilizar exactamente el comportamiento actual)
Un módulo estándar reutiliza el comportamiento del sistema actual mediante:
- **DynamicModule** (resolución por `moduleSlug` + tabs)
- **DynamicForm** (render por `engine_type` + validación required + submit)
- **DynamicRecordsView** (historial + verificación + auditoría)
- **ModuleDocumentViewer** (documentos por repositorio/categorías)
- **dynamicService** (persistencia/auditoría de `sgc_*`)
- **runtimeActivationLayer** (puente interno)

Los puntos menos parametrizables hoy (a partir de evidencia de hardcodes) son:
- habilitación del tab Repositorio Documental (lista fija de slugs)
- selección de engine (switch por engine_type)
- reglas/heurísticas de criticidad (dependen de `field_type/options` y se reflejan en UI)

Este mapa define qué debe mantenerse y qué requiere parametrización futura para habilitar nuevos módulos reutilizando el mismo comportamiento visible.

