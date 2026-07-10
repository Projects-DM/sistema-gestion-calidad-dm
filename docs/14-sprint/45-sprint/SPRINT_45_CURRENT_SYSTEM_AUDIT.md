# SPRINT_45_CURRENT_SYSTEM_AUDIT — AUDITORÍA DEL SISTEMA ACTUAL (SSOT)

> Alcance: auditoría **solo lectura** del sistema actual. **No** se propone un runtime/config engine nuevo, **no** se refactoriza ni se implementa código. **Trazabilidad** se audita solo como funcionamiento, pero **NO** se usa como base para definir el estándar.

---

## Resumen Ejecutivo
El sistema es un **frontend React (Vite) con Supabase** que opera bajo un enfoque de **formularios y módulos configurables por metadata** almacenada en la base de datos (tablas `sgc_modules`, `sgc_forms`, `sgc_form_fields`, etc.).

El “estándar reutilizable” que actualmente aplican los módulos (excepto Trazabilidad) se materializa principalmente en:
- **Navegación y orquestación por slug** (`pages/DynamicModule.jsx`)
- **Render y persistencia de formularios dinámicos** (`pages/DynamicForm.jsx` + engines `src/components/engines/*`)
- **Historial/consultas y flujo de verificación** (`components/DynamicRecordsView.jsx`)
- **Repositorio documental** (UI `components/DocumentModule.jsx` + `modules/documentViewer/ModuleDocumentViewer.jsx` + servicios documentales)
- **Puente de negocio a “runtime”** mediante eventos internos (`runtimeActivationLayer.activate`) para completar correlación/auditoría/side-effects del flujo.

La creación de nuevos módulos hoy está limitada por: 
- partes todavía hardcodeadas (menús/pestañas/habilitación documental y mapeos por `engine_type` en UI),
- y restricciones del estándar actual (switchs y listas en el frontend que no están plenamente parametrizadas).

---

## 1) Arquitectura General

### Flujo completo de navegación (vista de alto nivel)
1. `src/main.jsx` monta `AuthProvider` y el `App`.
2. `src/App.jsx` define rutas:
   - Login y Dashboard (rutas estáticas)
   - `pages/Traceability.jsx` (ruta estática)
   - `pages/Configuration.jsx` y `pages/Users.jsx` protegidas por role
   - **Rutas dinámicas estándar**:
     - `/:moduleSlug` → `pages/DynamicModule.jsx`
     - `/modulo/:moduleSlug/:formSlug` → `pages/DynamicForm.jsx`
3. `pages/DynamicModule.jsx`:
   - resuelve el módulo por `moduleSlug` desde DB (`dynamicService.getModuleBySlug`)
   - carga formularios por módulo (`dynamicService.getFormsByModule`)
   - filtra por `roles_allowed`
   - muestra pestañas fijas:
     - “Diligenciar Registros” → catálogo de formularios
     - “Historial y Consultas” → `components/DynamicRecordsView.jsx`
     - “Repositorio Documental” → `modules/documentViewer/ModuleDocumentViewer.jsx` **condicionado por hardcode**
4. `pages/DynamicForm.jsx`:
   - resuelve `formDef` por `formSlug` (`dynamicService.getFormBySlug`)
   - carga campos `sgc_form_fields` (`dynamicService.getFormFields`)
   - renderiza con engine por `engine_type`
   - valida required + reglas de “hallazgos críticos”
   - persiste con `dynamicService.submitFormResponse`
   - dispara `runtimeActivationLayer.activate` usando `__runtime_internal_event`.
5. `components/DynamicRecordsView.jsx`:
   - obtiene respuestas por módulo (`dynamicService.getModuleResponses`)
   - computa estado en cliente (cumple/advertencia/crítico)
   - presenta historial/consultas (tabla + modal)
   - permite verificación (admin/calidad) llamando a `dynamicService.verifyFormResponse` o `verifyMultipleFormResponses`
   - carga auditoría (`dynamicService.getAuditLogs`).

### Estructura general del sistema (capas)
- **Capa UI/Routing**: `src/App.jsx`, `src/pages/*`, `src/components/*`, `src/layouts/*`
- **Capa de metadata/config**: `dynamicService` consulta `sgc_modules`, `sgc_forms`, `sgc_form_fields`
- **Capa de render de formularios**:
  - `pages/DynamicForm.jsx` (dispatcher por `engine_type`)
  - engines: `src/components/engines/BaseGeneric.jsx`, `BaseChecklist.jsx`, `BaseMediciones.jsx`
- **Capa de persistencia y auditoría (Supabase)**: `src/services/dynamicService.js`, y servicios de documentos.
- **Capa runtime puente/eventing (interno)**:
  - `runtime/integration/RuntimeActivationLayer.ts`
  - traduce evento y envía transacción hacia router interno.
- **Capa documental**:
  - `components/DocumentModule.jsx` (programa PDF simple)
  - `modules/documentViewer/ModuleDocumentViewer.jsx` (repositorios/categorías/documentos)
  - servicios documentales (`documentsService`, `documentRepositoriesService`).

### Módulos existentes (oficiales)
- Módulos estándar (base del sistema actual): **Operaciones, Medición y Control, Mantenimiento, Calidad, Gestión Documental**.
- Módulo con lógica distinta (excluido del estándar): **Trazabilidad** (auditado pero no usado para definir patrón).

> Nota: la definición exacta “oficial” por slug también aparece codificada/esperada en frontend (ver hardcode documental y textos por slug).

### Servicios utilizados
- `src/services/dynamicService.js` (metadata + CRUD de respuestas + auditoría)
- Documentales:
  - `src/services/documentsService.js`
  - `src/services/documentRepositoriesService.js`
- Supabase client: `src/lib/supabase.js` / `src/lib/supabaseClient.js`

---

## 2) Inventario de Módulos (estándar oficial)

> Importante: el sistema define módulos en DB (consultables por `dynamicService.getModules()` / `getModuleBySlug`). El inventario “oficial” se extrae del comportamiento esperado del estándar reutilizable y de slugs/engines referenciados.

### 2.1 Operaciones
- **nombre**: “Operaciones” (se espera slug `operaciones`)
- **ruta**: `/:moduleSlug` → `pages/DynamicModule.jsx` con `moduleSlug=operaciones`
- **componente principal**:
  - `pages/DynamicModule.jsx` (container)
  - `pages/DynamicForm.jsx` (si navega a un `formSlug`)
  - `components/DynamicRecordsView.jsx` (historial)
- **estructura**:
  - módulo + catálogo de formularios (DB)
  - render de formularios por `engine_type`
  - respuestas + auditoría
  - repositorio documental condicionado por hardcode
- **comportamiento**:
  - ver formularios autorizados
  - diligenciar registros creando `sgc_form_responses`
  - ver/filtrar historial y verificar (si corresponde rol)
- **diferencias vs otros módulos**:
  - no hay lógica distinta en frontend: la diferencia real proviene de **metadata** (qué formularios/campos existen en DB y qué engine_type usan).

### 2.2 Medición y Control
- **nombre**: “Medición y Control” (slug esperado `medicion-control`)
- **ruta**: `/:moduleSlug`
- **componente principal**: mismo estándar reutilizable (`DynamicModule`, `DynamicForm`, `DynamicRecordsView`).
- **estructura/comportamiento**: idénticos en arquitectura; cambia el esquema de campos/campos y reglas (field_type/options) y qué motor se selecciona en cada `sgc_form_fields`/`sgc_forms.engine_type`.

### 2.3 Mantenimiento
- **nombre**: “Mantenimiento” (slug esperado `mantenimiento`)
- **ruta**: `/:moduleSlug`
- **componente principal**: estándar reutilizable.
- **observación**:
  - también aparece mapeo de título documental en `ModuleDocumentViewer`.

### 2.4 Calidad
- **nombre**: “Calidad” (slug esperado `calidad`)
- **ruta**: `/:moduleSlug`
- **componente principal**: estándar reutilizable.
- **observación (roles)**:
  - el flujo de verificación en historial asume admin/calidad.

### 2.5 Gestión Documental
- **nombre**: “Gestión Documental” (slug esperado `gestion-documental`)
- **ruta**: `/:moduleSlug`
- **componente principal**: estándar reutilizable.
- **repositorio documental**:
  - el visor usa `moduleSlug` para cargar repositorios/categorías/documentos desde DB.

---

## 3) Patrón Común (módulos oficiales estándar)

### ¿Qué tienen exactamente en común?
1. **Orquestación por metadata + slug**:
   - `DynamicModule` usa `dynamicService.getModuleBySlug(moduleSlug)`.
   - `DynamicModule` carga `sgc_forms` por `module_id`.
2. **Control de acceso por roles** (mínimo):
   - `DynamicModule` filtra forms por `form.roles_allowed` contra `rol`.
   - `DynamicForm` revalida roles (`No tienes permisos...`).
3. **Persistencia normalizada en DB**:
   - `DynamicForm` llama `dynamicService.submitFormResponse`.
   - `dynamicService` inserta:
     - `sgc_form_responses` (status `pendiente_revision`)
     - `sgc_response_values` (EAV: value_text/value_number/value_boolean/value_json)
     - `sgc_evidences` (URLs/paths, tipo)
     - `sgc_audit_logs` (create)
4. **Verificación y auditoría**:
   - `DynamicRecordsView` permite `verify` sobre `sgc_form_responses`.
   - `dynamicService.verifyFormResponse` actualiza status y registra `sgc_audit_logs`.
5. **Puente runtime por evento interno**:
   - `dynamicService.submitFormResponse` y `verifyFormResponse` devuelven `__runtime_internal_event` (para “create/verify”).
   - `runtimeActivationLayer.activate` traduce y envía al runtime interno.

### Componentes/recursos reutilizados
- UI reutilizada:
  - `pages/DynamicModule.jsx`
  - `pages/DynamicForm.jsx`
  - `components/DynamicRecordsView.jsx`
- Persistencia reutilizada:
  - `src/services/dynamicService.js`
- Puente runtime reutilizado:
  - `src/runtime/integration/RuntimeActivationLayer.ts`
- Rendering engine:
  - `BaseGeneric`, `BaseChecklist`, `BaseMediciones` (según `formDef.engine_type`)

---

## 4) Componentes Reutilizables (inventario)

> Clasificación basada en: dependencia a metadata/props genéricos, ausencia de lógica de negocio específica y uso repetido en rutas dinámicas.

### 100% reutilizable
- `pages/DynamicModule.jsx` (container por slug + pestañas)
- `pages/DynamicForm.jsx` (carga form+fields+values; valida y persiste)
- `components/DynamicRecordsView.jsx` (lista responses, filtros, verificación, modal y auditoría)
- `src/services/dynamicService.js` (metadata/persistencia/auditoría)
- `src/runtime/integration/RuntimeActivationLayer.ts` (bridge de evento interno)
- `src/context/AuthContext.jsx` + `src/components/ProtectedRoute.jsx` + `src/components/RoleGate.jsx` (según roles)

Justificación: operan sobre slugs/IDs y metadata en DB; su comportamiento principal no depende de módulos específicos (salvo gating documental hardcode y engine_type limitado).

### Parcialmente reutilizable
- Engines UI:
  - `src/components/engines/BaseGeneric.jsx`
  - `src/components/engines/BaseChecklist.jsx`
  - `src/components/engines/BaseMediciones.jsx`

Justificación: reutilizables para formularios que mapean a los tipos soportados, pero el dispatcher en `DynamicForm` usa `switch (formDef.engine_type)` limitado.

### Específico
- Documentación/programa:
  - `components/DocumentModule.jsx` (subida/borrado de “programa PDF” por módulo)
- Visor documental repositorio:
  - `modules/documentViewer/ModuleDocumentViewer.jsx` (título/logística por `moduleSlug`, gating por roles admin/calidad)

Justificación: aunque consulta DB, el diseño UI/títulos y algunas decisiones están acopladas a slugs/roles y a estructura documental particular.

### No reutilizable (para construir nuevos módulos estándar sin cambios)
- Ningún runtime nuevo: no aplica.
- Sin embargo, “gating por hardcode” en `DynamicModule` y “switch limitado engine_type” en `DynamicForm` **no** son reutilizables al 100% sin parametrizar.

---

## 5) Flujo Completo de un Módulo (estándar — Operaciones)

### Paso a paso (Operaciones)
1. **Menú / navegación**
   - Entradas hacia módulo se resuelven a través de rutas dinámicas `/:moduleSlug`.
   - `pages/DynamicModule.jsx` muestra header “Programa de {modInfo.name}”.
2. **Vista principal (programa)**
   - `DynamicModule` carga `modInfo` con `dynamicService.getModuleBySlug(moduleSlug)`.
3. **Programa / Formatos disponibles**
   - Carga formularios: `dynamicService.getFormsByModule(modInfo.id)`.
   - Filtra por roles: `form.roles_allowed.includes(rol)`.
4. **Diligenciar registros**
   - Click en un form → ruta `/modulo/:moduleSlug/:formSlug`.
   - `pages/DynamicForm.jsx`:
     - carga `formDef` (`getFormBySlug`)
     - valida roles permitidos
     - carga campos `getFormFields(form.id)`
     - inicializa `values` según `field_type`
     - renderiza con engine por `formDef.engine_type`.
5. **Validación en UI**
   - required: valida `field.required`.
   - reglas críticas:
     - boolean false → hallazgo crítico
     - number fuera de `options.min/max` → hallazgo crítico
   - evidencia requerida si hay críticos (`EvidenceUploader`).
6. **Historial y consultas**
   - En `DynamicModule` → tab “Historial y Consultas”
   - Render `DynamicRecordsView` con `moduleId=modInfo.id`.
   - `DynamicRecordsView`:
     - carga responses `getModuleResponses(moduleId)`
     - computa `computedStatus` en cliente
     - muestra tabla + filtros rápidos
     - permite modal de detalle.
7. **Repositorio documental**
   - En `DynamicModule` → tab “Repositorio Documental”
   - `ModuleDocumentViewer moduleSlug`:
     - carga repositorios `{ moduleSlug }`
     - carga categorías del repo
     - carga documentos por `documentsService.getRecords(moduleSlug, categoryKey)`
     - permite upload/delete según roles.
8. **Configuración**
   - Se gestiona en `pages/Configuration.jsx`:
     - módulo/forrm configurables
     - FormBuilder para campos de formulario (depende de `FormBuilder` y configuración de `sgc_form_fields`).
9. **Servicios**
   - Persistencia y auditoría:
     - `dynamicService.submitFormResponse`
     - `dynamicService.verifyFormResponse`
     - `dynamicService.getAuditLogs`
   - Evidencias (archivos): vía `EvidenceUploader` → servicios documentales (según implementación de storage).
10. **Persistencia / Base de datos**
   - Tablas principales evidenciadas por `dynamicService`:
     - `sgc_modules`, `sgc_forms`, `sgc_form_fields`
     - `sgc_form_responses`, `sgc_response_values`, `sgc_evidences`, `sgc_audit_logs`

---

## 6) Configuración Actual (qué es dinámico vs fijo)

### Qué información se configura actualmente
Principalmente en Supabase (metadata):
- `sgc_modules`: `slug`, `name`, `description`, `is_active`
- `sgc_forms`: `module_id`, `slug`, `name`, `engine_type`, `roles_allowed`, `is_active`
- `sgc_form_fields`: `form_id`, `field_type`, `options` (min/max/unit), `required`, `order_index`, etc.
- Roles de acceso:
  - `sgc_forms.roles_allowed`
  - `profiles.rol`
- Documental:
  - repositorios/categorías/documentos (consultados por document repositories/document service)

### Qué está fijo (hardcode)
- `pages/DynamicModule.jsx`:
  - gating documental por lista fija de slugs:
    - `['mantenimiento','calidad','operaciones','gestion-documental','medicion-control']`
- `pages/DynamicForm.jsx`:
  - dispatcher por `engine_type` con `switch` fijo:
    - `BaseChecklist`, `BaseMediciones`, `BaseGeneric`
- `pages/Traceability.jsx`:
  - submódulos hardcodeados (excluido del estándar)

---

## 7) Formularios (auditoría completa)

### Cómo se crean
- En `pages/Configuration.jsx`:
  - se listan módulos y forms (DB)
  - se crea un form en `sgc_forms` (insert via Supabase)
  - se configura el esquema de campos en `FormBuilder` (según `sgc_form_fields`).

### Cómo se almacenan
- `sgc_forms`: definición del form
  - `engine_type`
  - `slug`
  - `roles_allowed`
- `sgc_form_fields`: columnas definidas por UI
  - `field_type`
  - `required`
  - `options` (p.ej. min/max)
  - `order_index`
- Respuestas:
  - `sgc_form_responses` (status, verified fields)
  - `sgc_response_values` (EAV por campo)
  - `sgc_evidences` (URLs/rutas de evidencia)
  - `sgc_audit_logs` (create/verify y reason)

### Cómo se renderizan
- `pages/DynamicForm.jsx`:
  - carga `fields`
  - inicializa `values`
  - `renderEngine()` selecciona engine:
    - `BaseChecklist`, `BaseMediciones`, `BaseGeneric`

### Cómo se validan
- UI en `DynamicForm`:
  - required (campo por campo)
  - evidencia requerida si hay hallazgos críticos
  - validación extra por observaciones si existe field cuyo nombre incluye “observacion/observación”

### Cómo llegan hasta “Diligenciar Registros”
- `pages/DynamicModule.jsx` muestra tarjetas por cada form activo.
- Cada tarjeta navega a `/modulo/:moduleSlug/:formSlug`.
- `DynamicForm` usa `formSlug` para cargar el esquema completo.

---

## 8) Repositorio Documental

### Cómo se carga
- `pages/DynamicModule.jsx` habilita la pestaña repositorio para slugs hardcodeados.
- `ModuleDocumentViewer`:
  - `documentRepositoriesService.getRepositories({ moduleSlug })`
  - obtiene `activeRepositoryId`
  - `documentRepositoriesService.getCategories(activeRepositoryId)`
  - consulta documentos:
    - `documentsService.getRecords(moduleSlug, categoryKey)`

### Cómo se consulta
- En UI se listan documentos agrupados por `category_key`.
- La carga se hace por categorías activas.

### Cómo se relaciona con cada módulo
- Por `moduleSlug` y por repositorios/categorías configuradas en DB.

---

## 9) Historial y Consultas

### Cómo obtiene la información
- `components/DynamicRecordsView.jsx` llama:
  - `dynamicService.getModuleResponses(moduleId)`

### Cómo identifica el módulo
- Usa `moduleId` (`sgc_modules.id`) como filtro:
  - `.eq('sgc_forms.module_id', moduleId)` en `getModuleResponses`.

### Cómo realiza filtros
- UI hace filtros en cliente sobre `status` y `computedStatus`.
- `computedStatus` se calcula así (evidencia en UI):
  - si boolean false → `advertencia`/`critico` según precedencia
  - si number fuera de min/max → `critico`
- Filtro por “hoy” compara `created_at`.

### Cómo maneja estados
- `status` en DB (ej. `pendiente_revision`, `aprobado`, `rechazado`)
- `computedStatus` (cumple/advertencia/critico) es derivado en UI.

---

## 10) Sistema de permisos

### Cómo identifica usuarios
- `AuthContext`:
  - usa Supabase auth session
  - carga `profiles` por `id`
  - expone `rol` y flags `isAdmin/isCalidad/isOperativo/...`

### Cómo determina permisos
- Ruta protegida:
  - `ProtectedRoute` y `allowedRoles` para config/usuarios.
- Permisos de forms:
  - `DynamicModule` filtra `forms.roles_allowed`.
  - `DynamicForm` rechaza si el role no está permitido.
- Permisos de verificación:
  - `DynamicRecordsView` asume verificador si `rol === 'administrador' || rol === 'calidad'`.

### Cómo restringe módulos
- En UI de forms: `DynamicModule` controla lo que se ve según roles.
- En configuración: `Configuration.jsx` restringe a `rol === 'administrador'`.

---

## 11) Dependencias por módulo (estándar)

Como el render está basado en metadata, las dependencias reales son las mismas; cambian únicamente las definiciones de DB.

Para un módulo estándar genérico:
- **Servicios**:
  - `dynamicService` (módulos/forms/campos/respuestas/auditoría)
  - `documentsService` + `documentRepositoriesService` (si aplica repositorio documental)
  - `exportService` (exportación desde historial)
- **Hooks**:
  - `useAuth` (rol y sesión)
- **Componentes**:
  - `DynamicModule`, `DynamicForm`, `DynamicRecordsView`
  - engine base (`BaseChecklist/BaseMediciones/BaseGeneric`)
  - `ModuleDocumentViewer` (documentos)
- **Tablas consultadas** (por evidencia en `dynamicService.js`):
  - `sgc_modules`, `sgc_forms`, `sgc_form_fields`
  - `sgc_form_responses`, `sgc_response_values`, `sgc_evidences`, `sgc_audit_logs`
  - `profiles` (join en audit)

---

## 12) Identificación del verdadero estándar arquitectónico actual (SIN proponer uno nuevo)

**Respuesta (estándar actual):**
El patrón arquitectónico vigente en los módulos oficiales reutilizables (Operaciones, Medición y Control, Mantenimiento, Calidad, Gestión Documental) es un **patrón “Metadata-Driven Dynamic Forms + Engines + Slug Router”**:
- El **routing** y el **comportamiento base** se resuelven por `moduleSlug/formSlug`.
- El **modelo de negocio de los formularios** se define por metadata en DB (`sgc_forms`, `sgc_form_fields`).
- El **render** se delega a un set de **engines** seleccionados por `engine_type`.
- Las **respuestas** se persisten con un esquema normalizado EAV y se auditan.
- Los efectos hacia el “runtime” se realizan mediante **evento interno** retornado por servicios y consumido por `runtimeActivationLayer.activate`.

---

## 13) Elementos hardcodeados (que hoy impiden crear nuevos módulos)

> Exclusivamente lo que limita creación/estandarización de nuevos módulos sin tocar código.

1. **Habilitación del tab de Repositorio Documental**
   - `pages/DynamicModule.jsx` contiene una lista fija de slugs habilitados:
     - `['mantenimiento','calidad','operaciones','gestion-documental','medicion-control']`
   - Resultado: un nuevo módulo aunque tenga repositorio documental en DB, no mostrará la pestaña si no está en la lista.

2. **Dispatcher de motores limitado a `switch (formDef.engine_type)`**
   - `pages/DynamicForm.jsx` solo mapea `BaseChecklist`, `BaseMediciones`, `BaseGeneric`.
   - Resultado: nuevos `engine_type` requerirían cambios en UI para renderizar.

3. **Textos/mapeos de UI por slug (document viewer)**
   - `ModuleDocumentViewer.jsx` tiene `switch (moduleSlug)` para títulos. 
   - Resultado: para módulos nuevos aparecerán títulos por default, no bloqueo lógico; pero es hardcode de UX.

4. **Menú de submódulos de Trazabilidad**
   - `Traceability.jsx` define `submodules` fijo.
   - Esto no define el estándar y está excluido, pero confirma que parte del sistema no está fully dynamic.

---

## 14) Cambios mínimos necesarios (respuesta mínima para permitir nuevos módulos reutilizando el sistema existente)

> No diseñar solución completa ni implementar código; solo el conjunto mínimo de cambios.

1. **Parametrizar habilitación del Repositorio Documental**
   - Reemplazar el array hardcodeado de slugs en `DynamicModule.jsx` por una consulta/flag desde DB (ej. si existen repositorios/categorías activos para ese `moduleSlug`, o un campo `supports_document_repository`).
   - Impacto: permite módulos nuevos con repositorio documental sin tocar código.

2. **Hacer el dispatcher de engines extensible sin switch hardcodeado**
   - Mantener el set de engines existentes, pero reemplazar el `switch (engine_type)` por un **registro existente** o mapeo dinámico (si ya existe engine registry en el repo; si no, la mínima alternativa es parametrizar desde configuración/mapping existente, sin crear un runtime nuevo).
   - Impacto: permite nuevos módulos/formularios con engines ya implementados en el repo, o engines que se incorporen sin cambiar UI.

3. **Evitar acoplamientos mínimos por slug en el visor documental**
   - Cambiar títulos hardcodeados por slug a título desde DB (metadata) o default basado en `modInfo.name`.
   - Impacto: mejora consistencia para nuevos módulos; no bloquea flujo principal.

---

## Conclusiones
- El sistema ya cuenta con una arquitectura reusable operativa para módulos estándar basada en **metadata en DB + contenedores dinámicos + engines**.
- La creación de nuevos módulos no requiere un motor nuevo: requiere eliminar los **puntos hardcodeados** que hoy limitan la extensibilidad.
- El estándar real identificado es **Metadata-Driven Dynamic Forms + Engines + Slug Router**, donde `dynamicService` y `runtimeActivationLayer` cierran el ciclo.

---

## Evidencia mínima (referencias de código)
- Rutas: `src/App.jsx`
- Orquestación estándar por slug: `src/pages/DynamicModule.jsx`
- Render + persistencia de formularios: `src/pages/DynamicForm.jsx`
- Historial/consultas/verificación: `src/components/DynamicRecordsView.jsx`
- Metadata/persistencia/auditoría: `src/services/dynamicService.js`
- Puente runtime: `src/runtime/integration/RuntimeActivationLayer.ts`
- Repositorio documental: `src/modules/documentViewer/ModuleDocumentViewer.jsx`, `src/components/DocumentModule.jsx`
- Permisos: `src/context/AuthContext.jsx`, `src/components/ProtectedRoute.jsx`, `src/components/RoleGate.jsx`
- Configuración: `src/pages/Configuration.jsx`

