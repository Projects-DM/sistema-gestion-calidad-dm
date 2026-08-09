# SPRINT 269 — Operational Experience & Capability Assignment Integrity Audit

> **Tipo:** Architecture Audit / Runtime & Write-Path Integrity  
> **Nivel:** LEVEL 5 — ARCHITECTURE AUDIT  
> **Estado:** AUDIT COMPLETE — DIAGNÓSTICO FINALIZADO (NO CODE CHANGES)  
> **Branch:** `release/stable-sprint79`  
> **Dependencias:** Module Administration / Capability Assignment / Operational Experiences / Runtime / Dashboard / Navigation

---

## 1. RESUMEN EJECUTIVO

El presente informe consolida la auditoría técnica integral realizada al pipeline de **creación de módulos, asignación de capacidades y resolución de Experiencias Operacionales**, con el propósito de determinar la causa raíz de las inconsistencias del sistema sin realizar modificaciones de código ni refactorizaciones en este sprint.

### Hallazgos Principales:
1. **Confirmación de PARTIAL WRITE (CRÍTICO):** La creación de módulos en el asistente UI (`CreateModuleWizard.jsx`) ejecuta tres operaciones asíncronas secuenciales (`CREATE_MODULE`, `ASSIGN_CAPABILITIES`, `CHANGE_MODULE_STATE`) sin un límite transaccional (*transaction boundary*) ni mecanismo de compensación/rollback. Si `ASSIGN_CAPABILITIES` falla, el módulo queda persistido permanentemente en la base de datos en estado `draft` y sin capacidades asignadas.
2. **Doble Encapsulamiento del Error Técnico (ALTO):** El error devuelto al usuario (`Unexpected error during ASSIGN_CAPABILITIES`) es el resultado de un doble envoltorio (*wrapping*) en la capa de aplicación. La excepción original de Supabase/SQL (ausencia de columna `capabilities` JSONB o rechazo RLS) es ocultada en `error.cause.cause` y no se muestra en la UI ni en los logs visibles.
3. **Mecanismo de Fallback Permisivo en Runtime (ALTO):** Cuando `capabilities` en la base de datos es `null` o vacío (producto de la falla en `ASSIGN_CAPABILITIES`), el adaptador de resolución (`CapabilityPublicSetAdapter.js`) recurre a un camino de *fallback* que concede al módulo todas las capacidades por defecto (formularios, historial y **todas** las experiencias operacionales registradas), ignorando la selección realizada por el administrador.
4. **Desvinculación de Dominio en Despachos (ALTO):** La tabla `despachos` es una tabla global sin columna de pertenencia de módulo (`module_id` o `module_slug`). El servicio `operationalRecordsService` ejecuta `SELECT * FROM despachos` sin filtrar por módulo, ocasionando que la información no esté acotada al contexto del módulo activo.
5. **Confusión entre Configuración y Registro de Alertas (ALTO):** Las "Alertas" no están modeladas como una Experiencia Operacional ni como registros individuales en una tabla `sgc_alerts`. Son metadatos de configuración (`alert_config` JSONB) asociados a formularios o repositorios (`sgc_forms`, `sgc_document_repositories`). El formulario de "Crear alerta" en la UI realiza una actualización de configuración sobre un recurso existente; si el módulo no tiene formularios creados, la actualización afecta 0 filas de forma silenciosa.

---

## 2. FLUJO DE ARQUITECTURA ACTUAL

```text
UI (CreateModuleWizard.jsx)
   │
   ├─ Paso 1: CREATE_MODULE
   │     └─► ModuleAdministrationApplicationService._handleCreateModule()
   │              └─► supabase.from('sgc_modules').insert(...)
   │                   └─► PERSISTENCIA EN BD (state='draft')
   │
   ├─ Paso 2: ASSIGN_CAPABILITIES
   │     └─► ModuleAdministrationApplicationService._handleAssignCapabilities()
   │              └─► CapabilityAssignmentService.replaceModuleCapabilityAssignments()
   │                   └─► runOperationalPipeline()
   │                        ├─► AssignmentValidationEngine.validate()
   │                        │    └─► validateModuleCapabilityAssignment() [por ítem]
   │                        └─► AssignmentTransactionManager.execute()
   │                             └─► ModuleCapabilityPersistenceAdapter.replaceAssignmentsForModule()
   │                                  └─► supabase.from('sgc_modules').update({ capabilities: [...] })
   │
   └─ Paso 3: CHANGE_MODULE_STATE → 'configurable'
         └─► supabase.from('sgc_modules').update({ state: 'configurable' })

Runtime (DynamicModule.jsx)
   │
   ├─ useCapabilityPublicSet({ moduleSlug, moduleId })
   │     └─► CapabilityPublicSetAdapter.listAssignmentsByModuleId()
   │              └─► supabase.from('sgc_modules').select('capabilities').eq('id', moduleId)
   │                   ├─ CAMINO PRIMARIO: lee array JSONB `capabilities` desde BD
   │                   └─ CAMINO FALLBACK: si es null/vacío, asigna formularios + historial + todas las experiencias
   │
   └─► ModuleCapabilityResolver.resolveCapabilitySet()
         ├─► listAssignmentsByModuleId() → assignments[]
         └─► getPackageById() → definición interna del paquete
              └─► buildCapabilitySet() → CapabilityPublicSet
```

---

## 3. TRAZABILIDAD DE OPERACIONES Y AUDITORÍA

### 3.1. Auditoría A — `CREATE_MODULE`
* **Iniciador:** `CreateModuleWizard.jsx` (`handleCreate`).
* **Service:** `ModuleAdministrationApplicationService._handleCreateModule()`.
* **Payload:** `{ name, slug, description, icon, color, order_index, visible, category, grupo }`.
* **Persistencia:** `supabase.from('sgc_modules').insert({...}).select('*').single()`.
* **ID & Estado Inicial:** UUID generado por el servidor PostgreSQL. Estado inicial: `draft`.
* **Límite Transaccional:** **NO EXISTE**. Operación aislada en Supabase.
* **Comportamiento ante falla aguas abajo:** El módulo queda persistido en BD en estado `draft`. No hay rollback ni compensación.

### 3.2. Auditoría B — `ASSIGN_CAPABILITIES`
* **Iniciador:** `CreateModuleWizard.jsx` inmediatamente tras `CREATE_MODULE`.
* **Service:** `CapabilityAssignmentService.replaceModuleCapabilityAssignments()`.
* **Payload:** Array de objetos `{ assignmentId: "assign:<moduleId>:<key>", moduleId, packageId: "pkg:standard:<key>", state: "active", owner: "system", version: "v1", orderIndex, [enabledExperiences] }`.
* **Validación:** `AssignmentValidationEngine.js` valida que existan `moduleId`, `assignments` como array, y de forma estructural comprueba que existan `assignmentId`, `moduleId`, `packageId` por ítem.
* **Orquestación:** `runOperationalPipeline.js` invoca a `AssignmentTransactionManager.js` que delega en `ModuleCapabilityPersistenceAdapter.js`.
* **Persistencia:** `supabase.from('sgc_modules').update({ capabilities: normalized }).eq('id', moduleId)`.
* **Propagación del Error:** Si Supabase rechaza el `UPDATE` (por ausencia de columna `capabilities` o RLS), `AssignmentTransactionManager` lo envuelve en `Error('Assignment transaction failed')`, y `ModuleAdministrationApplicationService` lo envuelve nuevamente en `ApplicationError('Unexpected error during ASSIGN_CAPABILITIES')`. El mensaje técnico real queda atrapado en `error.cause.cause`.

---

## 4. MATRIZ DE CAPACIDADES Y EXPERIENCIAS

### 4.1. Matriz de Capacidades Estándar (`CapabilityPackageRegistry.js`)

| packageKey | packageId | Nombre Público | Categoría | Ícono | Orden | Estado Auditado |
|---|---|---|---|---|---|---|
| `forms` | `pkg:standard:forms` | Diligenciar Registros | forms | ListChecks | 1 | Operativo (vía Fallback & sgc_forms) |
| `records` | `pkg:standard:records` | Historial y Consultas | records | History | 2 | Operativo (vía Fallback & sgc_form_responses) |
| `repository` | `pkg:standard:repository` | Repositorio Documental | repository | FileText | 3 | Condicional (según repositorios activos) |
| `operational-experiences` | `pkg:standard:operational-experiences` | Experiencias Operacionales | operational-experiences | Zap | 4 | Defectuoso (por falla en asignación JSONB) |

### 4.2. Matriz de Experiencias Operacionales (`OperationalExperienceRegistry.js`)

| experienceKey | Nombre | Tabla BD | Prefijo | Componente Resolver | Estado Auditado |
|---|---|---|---|---|---|
| `dispatches` | Despachos | `despachos` | `DESP` | `UniversalOperationalRuntime.jsx` | Defectuoso (Tabla global sin `module_slug`) |
| `inventarios` | Inventarios | `inventarios` | `INV` | `UniversalOperationalRuntime.jsx` | Requiere migración SQL de tabla |
| `produccion` | Producción | `produccion` | `PROD` | `UniversalOperationalRuntime.jsx` | Requiere migración SQL de tabla |
| `recepcion` | Recepción | `recepcion` | `REC` | `UniversalOperationalRuntime.jsx` | Requiere migración SQL de tabla |
| `productos` | Productos | `productos` | `PROD` | `UniversalOperationalRuntime.jsx` | Operativo (Tabla maestra de productos) |

---

## 5. AUDITORÍA ESPECÍFICA DE EXPERIENCIAS

### 5.1. Despachos
* **Causa Raíz de Falla de Información:** La tabla `despachos` no cuenta con columna `module_id` ni `module_slug`. El servicio `operationalRecordsService` ejecuta la consulta `SELECT * FROM despachos` sin parámetro de filtrado. La UI envía `moduleSlug` al componente `UniversalOperationalRuntime`, pero el orquestador no la utiliza en el query de persistencia. Por ende, la vista muestra datos globales o queda vacía si la tabla no contiene registros.

### 5.2. Alertas
* **Caso A (Alerta Predeterminada):** En módulos recién creados sin metadatos en `alert_config`, la función `provideDefaultAlertConfiguration()` (Sprint 197) retorna la configuración estática por defecto (`{ enabled: true, periodicity: null }`). La UI presenta esta configuración por defecto como una alerta sin frecuencia. Es un comportamiento esperado de diseño, no un fallo de creación.
* **Caso B (Creación Manual de Alerta):** El formulario de alertas no inserta filas en una tabla `sgc_alerts`. Invoca a `AlertConfigurationPersistenceAdapter` que realiza un `updateForm(resourceId, { alert_config: metadata })`. Si el módulo no posee formularios previamente creados, la actualización afecta a 0 filas sin emitir error.

---

## 6. AUDITORÍA DE DASHBOARD Y SIDEBAR

* **Fuente de Datos Compartida:** Tanto el Dashboard (`Dashboard.jsx`) como el Sidebar (`DashboardLayout.jsx`) consumen la misma operación `GET_RUNTIME_MODULES` que invoca `dynamicService.getRuntimeModules()`.
* **Consulta SQL SSOT:** `SELECT id, name, slug, icon, color, order_index, state, visible FROM sgc_modules WHERE is_active = true AND visible = true ORDER BY order_index ASC`.
* **Causa del desajuste:** `getRuntimeModules()` no filtra por la columna `state`. Por ende, los módulos en estado `draft` (creados pero con asignación fallida) se despliegan en el Dashboard. En el Sidebar, la lista no se actualiza inmediatamente tras el fallo debido a que el evento `dispatchModuleChange('create')` no llega a ejecutarse al retornar la excepción en la UI.

---

## 7. RESPUESTAS A LAS PREGUNTAS DEL SPRINT (§23)

| # | Pregunta de Diagnóstico | Respuesta Certificada de Auditoría |
|---|---|---|
| **A** | ¿Por qué aparece `Unexpected error during ASSIGN_CAPABILITIES`? | Por doble encapsulamiento en las capas Application/Transaction que ocultan el error SQL original de Supabase (ausencia o tipo inválido de columna `capabilities` JSONB o política RLS). |
| **B** | ¿Por qué el módulo sí se crea? | Porque `CREATE_MODULE` es un `insert()` Supabase aislado que se ejecuta y persiste de forma independiente antes de intentar la asignación. |
| **C** | ¿Por qué el módulo aparece en Dashboard? | Porque `getRuntimeModules()` no filtra por el estado del módulo (`state`), recuperando módulos en estado `draft`. |
| **D** | ¿Por qué no aparece correctamente en Sidebar? | Porque el evento de refresco `dispatchModuleChange` se omite cuando `ASSIGN_CAPABILITIES` falla, evitando el re-fetch en el layout. |
| **E** | ¿Por qué Despachos no muestra información? | Porque la tabla `despachos` es una tabla global que no incluye columna `module_slug` ni filtrado por módulo en `operationalRecordsService`. |
| **F** | ¿Por qué Alertas no funciona correctamente? | Porque Alertas no es un modelo de registros independientes, sino metadatos JSONB (`alert_config`) guardados en las filas de formularios o repositorios. |
| **G** | ¿Por qué aparece una alerta predeterminada? | Porque `provideDefaultAlertConfiguration()` retorna la configuración estática por defecto cuando el recurso no tiene metadatos `alert_config`. |
| **H** | ¿Por qué una alerta creada manualmente no aparece? | Porque intenta actualizar el `alert_config` de un formulario existente; al no haber formularios vinculados al nuevo módulo, la actualización afecta 0 filas. |
| **I** | ¿Por qué Registros e Historial funcionan? | Porque leen de tablas independientes (`sgc_forms`, `sgc_form_responses`) y son asignadas incondicionalmente por el camino de *fallback* de `CapabilityPublicSetAdapter`. |
| **J** | ¿Existe un problema común en Experiencias Operacionales? | Sí, todas dependen de que `ASSIGN_CAPABILITIES` persista el array `enabledExperiences`. Al fallar, el *fallback* las activa todas indiscriminadamente. |
| **K** | ¿Existe un problema de persistencia? | Sí, la columna `capabilities` JSONB en `sgc_modules` no está documentada en los scripts de migración oficiales. |
| **L** | ¿Existe un problema de Runtime/Registry? | Sí, la ruta de *fallback* en `CapabilityPublicSetAdapter` es demasiado permisiva ante fallos de persistencia. |
| **M** | ¿Existe un problema de contratos? | Sí, `ModuleCapabilityAssignmentIntegrityValidation` no valida los contenidos ni paquetes contra el registro central. |
| **N** | ¿Existe transacciones o partial write? | **SÍ, CONFIRMADO (CRÍTICO).** Existe un `PARTIAL WRITE` donde el módulo queda persistido en BD pero sin capacidades. |

---

## 8. MATRIZ DE HALLAZGOS (FINDINGS)

```text
FINDING-269-01
Severity: CRITICAL
Layer: Persistence Schema
Component: sgc_modules table / Supabase
Symptom: ASSIGN_CAPABILITIES falla con "Unexpected error during ASSIGN_CAPABILITIES".
Root Cause: La columna `capabilities` de tipo JSONB en `sgc_modules` no está declarada en el schema.sql inicial. Si falta en la BD o tiene un tipo incompatible, los UPDATE fallan.
Recommended Correction: Crear migración SQL para asegurar la columna `capabilities JSONB DEFAULT '[]'::jsonb`.

FINDING-269-02
Severity: CRITICAL
Layer: Transaction / Application Layer
Component: CreateModuleWizard.jsx
Symptom: El módulo queda creado en la BD tras fallar la asignación de capacidades (Partial Write).
Root Cause: Operaciones secuenciales aisladas (CREATE_MODULE, ASSIGN_CAPABILITIES, CHANGE_MODULE_STATE) sin transacción wrapping ni mecanismo de rollback/compensación.
Recommended Correction: Diseñar una operación orquestada transaccional o patrón Saga/Compensación que elimine el módulo si la asignación falla.

FINDING-269-03
Severity: HIGH
Layer: Error Handling
Component: ModuleAdministrationApplicationService & AssignmentTransactionManager
Symptom: El desarrollador y el usuario reciben únicamente "Unexpected error during ASSIGN_CAPABILITIES".
Root Cause: Doble re-wrap del error donde `error.cause.cause` (el error real de Supabase) es omitido en los metadatos expuestos.
Recommended Correction: Preservar la cadena completa de causas en los metadatos de ApplicationError y registrar logs detallados en el service boundary.

FINDING-269-04
Severity: HIGH
Layer: Runtime / Capability Resolution
Component: CapabilityPublicSetAdapter.js
Symptom: Módulos con falla en asignación muestran todas las capacidades en la UI.
Root Cause: El camino de Fallback activa incondicionalmente formularios, historial y todas las experiencias operacionales cuando `capabilities` es null o vacío.
Recommended Correction: Ajustar el fallback para no incluir experiencias operacionales no configuradas explícitamente.

FINDING-269-05
Severity: HIGH
Layer: Persistence / Operational Domain
Component: despachos table & operationalRecordsService.js
Symptom: La experiencia Despachos no filtra ni muestra información acotada al módulo.
Root Cause: La tabla `despachos` carece de columna `module_slug` o `module_id`. El servicio consulta la tabla de forma global.
Recommended Correction: Incluir columna `module_slug` en las tablas de experiencias operacionales y filtrar las consultas por el módulo activo.

FINDING-269-06
Severity: HIGH
Layer: Alert Write-Path
Component: AlertConfigurationPersistenceAdapter.js
Symptom: La creación manual de alertas desde formularios no genera cambios visibles.
Root Cause: La "creación" de alertas modifica la columna `alert_config` de un recurso existente (`sgc_forms`). Sin formularios creados en el módulo, la actualización afecta 0 filas.
Recommended Correction: Aclarar en UI la diferencia entre configurar alertas sobre recursos existentes y registrar alertas operacionales.

FINDING-269-07
Severity: MEDIUM
Layer: Presentation Layer
Component: dynamicService.js (getRuntimeModules)
Symptom: Módulos en estado `draft` (incompletos) aparecen en el Dashboard y Sidebar.
Root Cause: `getRuntimeModules()` filtra por `is_active` y `visible`, pero omite el filtro por `state`.
Recommended Correction: Agregar filtro de estado `state IN ('configurable', 'operational')` en la consulta de módulos runtime.

FINDING-269-08
Severity: MEDIUM
Layer: Persistence Schema
Component: OperationalExperienceRegistry.js & Migration Scripts
Symptom: Experiencias como `inventarios`, `produccion` y `recepcion` fallarán al cargar datos.
Root Cause: Las tablas correspondientes a estas experiencias no existen en el script de esquema SQL de Supabase.
Recommended Correction: Crear scripts de migración DDL para las tablas `inventarios`, `produccion` y `recepcion`.

FINDING-269-09
Severity: MEDIUM
Layer: Alert Domain
Component: DefaultAlertConfigurationProvider.js
Symptom: Aparecen alertas por defecto con frecuencia nula al crear un módulo.
Root Cause: `provideDefaultAlertConfiguration()` entrega metadatos por defecto (`periodicity: null`) a recursos que aún no han sido configurados.
Recommended Correction: Ocultar o deshabilitar las alertas por defecto en la vista de monitoreo hasta que sean configuradas explícitamente.

FINDING-269-10
Severity: LOW
Layer: Validation Engine
Component: ModuleCapabilityAssignmentIntegrityValidation.js
Symptom: Asignaciones con paquetes inválidos pasan la validación previa.
Root Cause: La validación únicamente comprueba la presencia de tres campos clave, sin verificar la validez del paquete contra `CapabilityPackageRegistry`.
Recommended Correction: Enriquecer la validación determinística para comprobar la existencia del `packageId` registrado.
```

---

## 9. PLAN DE CORRECCIÓN PARA SPRINTS FUTUROS

### Sprint 270 — Reparación de Infraestructura y Persistencia
1. Ejecutar migración DDL para columna `capabilities JSONB` en `sgc_modules`.
2. Crear migraciones DDL para tablas operacionales faltantes (`inventarios`, `produccion`, `recepcion`).
3. Reforzar el manejo de errores para exponer `originalMessage` en la capa de aplicación.
4. Incluir filtro por `state` en `getRuntimeModules()`.

### Sprint 271 — Integridad de Escritura y Transaccionalidad
1. Implementar patrón compensatorio (*rollback*) en la UI/Application Service para `CREATE_MODULE`.
2. Ajustar la lógica del adaptador de *fallback* en `CapabilityPublicSetAdapter.js`.
3. Fortalecer el motor de validación `ModuleCapabilityAssignmentIntegrityValidation`.

### Sprint 272 — Dominio Operacional y Experiencia de Alertas
1. Añadir columna `module_slug` en las tablas de experiencias operacionales y filtrar las consultas en el orquestador.
2. Refactorizar el flujo de configuración de alertas en la UI para vincularse de forma explícita a recursos existentes.

---

*SPRINT 269 — AUDITORÍA FINALIZADA — SIN CAMBIOS DE CÓDIGO REALIZADOS*
