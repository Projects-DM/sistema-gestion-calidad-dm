# SPRINT 65A — Module Administration Domain Model (SSOT)

> **Tipo:** Core Architecture / Domain Modeling / SSOT Foundation  
> **Nivel esperado:** LEVEL 3 — DOMAIN MODEL CERTIFIED  
> **Estado esperado:** DOCUMENTADO Y CERTIFICADO (Sin implementación funcional)  
> **Documento:** `SPRINT_65A_MODULE_ADMINISTRATION_DOMAIN_MODEL`

---

## Resumen Ejecutivo

Este documento define el **Modelo de Dominio oficial** para la Administración de Módulos del SGC-DM. Establece qué es un módulo, qué entidades lo componen, qué responsabilidades pertenecen a cada capa, y qué operaciones administrativas son oficiales.

Este Sprint **NO implementa código funcional**.  
Este Sprint **solamente define el dominio**.

---

## 0) Estado de Certificación

```text
ARCHITECTURE STATUS
LEVEL 3 — DOMAIN MODEL CERTIFIED

DOCUMENT
SPRINT_65A_MODULE_ADMINISTRATION_DOMAIN_MODEL

STATUS
DOMAIN MODEL DEFINED — IMPLEMENTATION PENDING
```

---

## 1) Objetivo

Diseñar y documentar el **Module Administration Domain Model** que servirá como contrato oficial para toda la administración de módulos del SGC-DM.

Este modelo será la base de:
- `ModuleAdministrationApplicationService`
- Module Wizard
- Capability Assignment
- Runtime Integration
- Dynamic Modules
- Metadata Factory

Toda implementación posterior deberá respetar este modelo.

---

## 2) Relación con Documentos Certificados

Este documento **NO reemplaza** ni modifica los siguientes SSOT certificados:

| Documento | Estado | Relación |
|---|---|---|
| `MODULE_CONTRACT_v1` | CERTIFICADO | **Preservado.** Define qué es un módulo a nivel arquitectónico. Este Sprint 65A **amplía** esa definición hacia el dominio de administración. |
| `CORE_MODULE_CAPABILITY_MODEL_v1` | CERTIFICADO | **Preservado.** Define el Capability Model. Este Sprint 65A lo complementa con las entidades de asignación. |
| `CORE_STANDARD_SHELL_MODEL_v1` | CERTIFICADO | **Preservado.** Define la gobernanza del Shell. Este Sprint 65A es coherente con sus invariantes. |
| `CORE_CAPABILITY_MODEL_v1` | CERTIFICADO | **Preservado.** Define Capabilities como entidades reutilizables. |
| `CORE_CAPABILITY_REGISTRY_MODEL_v1` | CERTIFICADO | **Preservado.** Define el Registry. |
| `CORE_CAPABILITY_RESOLVER_MODEL_v1` | CERTIFICADO | **Preservado.** Define el Resolver. |

### 2.1 Qué aporta este Sprint sobre lo certificado

| Lo que MODULE_CONTRACT_v1 define | Lo que SPRINT 65A amplía |
|---|---|
| Identidad del módulo (id, slug, name) | Entidades completas del dominio de administración |
| Capacidades estándar obligatorias | Catálogo oficial de operaciones administrativas |
| Fronteras Core/UI/Runtime | Responsabilidades por capa para administración |
| Bridge con Runtime | Contratos públicos de la Application Layer |
| — | Ciclo de vida del módulo (estados) |
| — | Límites exactos del dominio de administración |

---

## 3) Definición Oficial de un Módulo

### 3.1 Definición (complemento a MODULE_CONTRACT_v1)

Un **módulo** es una **unidad funcional de negocio persistida** que:

1. Tiene una **identidad estable** (id + slug + name)
2. Posee un **conjunto de capacidades** (capability assignments) que definen su comportamiento
3. Tiene una **configuración** que determina qué formularios, campos y reglas contiene
4. Posee una **presentación visual** (icono, orden, estado de visualización)
5. Se encuentra en un **estado dentro de su ciclo de vida**
6. Es **consumido por el Runtime** para renderizar formularios y gestionar registros
7. Es **administrado por la Application Layer** para operaciones de creación, edición y eliminación

### 3.2 Identidad

| Campo | Tipo | Propósito | Obligatorio |
|---|---|---|---|
| `moduleId` | UUID | Identidad persistente, clave relacional | SI |
| `slug` | String | Identidad navegable, entrada por ruta | SI |
| `name` | String | Identidad de presentación | SI |

> **Regla SSOT:** El `moduleId` (UUID) es la identidad canónica. El `slug` es la identidad de navegación. El `name` es solo presentación. Ninguno de los tres es intercambiable.

### 3.3 Propósito

Un módulo existe para **agrupar funcionalidad de negocio** de manera que:
- Los usuarios finales puedan **diligenciar registros** (formularios dinámicos)
- Los usuarios finales puedan **consultar historial** (registros y auditoría)
- Los administradores puedan **configurar** qué capacidades posee
- El Runtime pueda **resolver** qué renderizar y cómo

### 3.4 Ciclo de vida

Ver sección 6.

### 3.5 Límites

Ver sección 7.

---

## 4) Entidades del Dominio

### 4.1 Análisis de cada entidad

Cada entidad es analizada para determinar si **debe existir** dentro del dominio de administración de módulos.

---

#### 4.1.1 Module

**¿Debe existir?** SI — ESencial.

**Justificación:** Es la entidad raíz del dominio. Sin `Module` no hay nada que administrar. Representa la unidad funcional persistida en `sgc_modules`.

**Definición:**
- Entidad que representa un módulo funcional del sistema
- Posee identidad estable (moduleId, slug, name)
- Posee estado de ciclo de vida
- Es el aggregate root del dominio de administración

**Campos:**
- `moduleId` (UUID) — Identidad persistente
- `slug` (String) — Identidad navegable
- `name` (String) — Nombre de presentación
- `description` (String, opcional) — Descripción del módulo
- `lifecycleState` (Enum) — Estado en el ciclo de vida
- `createdAt` (Timestamp) — Fecha de creación
- `updatedAt` (Timestamp, opcional) — Fecha de última modificación

**Relaciones:**
- 1 Module → N ModuleCapabilityAssignment
- 1 Module → N ModuleForm (formularios asociados)
- 1 Module → 1 ModuleVisualConfiguration

**Tabla Supabase actual:** `sgc_modules` (campos: `id`, `name`, `slug`, `is_active`, `created_at`)

**Gap con modelo ideal:** Falta `description`, `lifecycleState`, `updatedAt`. El campo `is_active` actual es un boolean binario; el modelo ideal requiere un enum de estados.

---

#### 4.1.2 ModuleCapabilityAssignment

**¿Debe existir?** SI — Ya existe y está certificada.

**Justificación:** Ya está implementada como domain model en `src/core/persistence/capabilities/domainModels/ModuleCapabilityAssignment.js`. Representa la relación entre un módulo y un paquete de capacidades. Es el vínculo formal entre módulos y capacidades.

**Definición:**
- Entidad que representa la asignación de una capacidad (paquete) a un módulo
- Vincula `moduleId` con `packageId`
- Posee estado de asignación

**Campos:** (ya certificados)
- `assignmentId` (String) — Identidad inmutable
- `moduleId` (String) — Referencia al módulo
- `packageId` (String) — Referencia al paquete de capacidad
- `state` (String) — Estado de la asignación
- `owner` (String, opcional) — Propietario
- `version` (String, opcional) — Versión

**Tabla Supabase:** Pendiente (repositorio es contrato sin implementar)

---

#### 4.1.3 ModuleMetadata

**¿Debe existir?** NO como entidad separada.

**Justificación:** Los campos de metadata del módulo (`description`, `createdAt`, `updatedAt`, `lifecycleState`) pertenecen naturalmente a la entidad `Module`. Crear una entidad `ModuleMetadata` separada introduciría una artificial separación que requeriría JOINs innecesarios y rompería la cohesión. La metadata es parte integral del módulo, no una entidad independiente.

**Decisión:** Los campos de metadata se integran directamente en `Module`.

---

#### 4.1.4 ModuleCapabilities (como colección)

**¿Debe existir?** NO como entidad separada. SI como concepto.

**Justificación:** "Las capacidades de un módulo" son el **conjunto de `ModuleCapabilityAssignment`** asociadas al módulo. No es una entidad nueva; es una proyección de las asignaciones existentes. El `ModuleCapabilityResolver` ya resuelve esta proyección.

**Decisión:** No crear entidad `ModuleCapabilities`. El conjunto de capacidades se obtiene ejecutando `ModuleCapabilityResolver.resolve({ moduleId })`.

---

#### 4.1.5 ModuleConfiguration

**¿Debe existir?** NO como entidad separada en esta fase.

**Justificación:** La configuración funcional de un módulo (qué formularios tiene, qué campos poseen, qué reglas aplica) ya está persistida en `sgc_forms` y `sgc_form_fields`. Estas tablas **ya existen** y son consumidas por `dynamicService.getFormsByModule()` y `dynamicService.getFormFields()`. Crear una entidad `ModuleConfiguration` que envuelva esta información sería duplicar la fuente de verdad.

**Decisión:** La configuración se obtiene de las tablas existentes (`sgc_forms`, `sgc_form_fields`) a través de `dynamicService`. No se crea entidad separada. Si en el futuro se necesita una capa de abstracción, se podrá definir como un **value object** que proyecte la información de las tablas existentes.

---

#### 4.1.6 ModuleVisualConfiguration

**¿Debe exister?** SI — Como value object dentro de Module.

**Justificación:** La configuración visual (icono, orden de aparición, si es visible en el sidebar) es información distinta a la identidad funcional del módulo. Un módulo puede tener el mismo nombre pero diferentes iconos u orden según el contexto de presentación. Separar esto como un value object permite:
- Cambiar el orden sin modificar la identidad
- Cambiar el icono sin modificar la funcionalidad
- Mantener la configuración visual cohesiva

**Definición:**
- Value object que encapsula la presentación visual del módulo
- No es una entidad independiente (no tiene identidad propia)

**Campos:**
- `icon` (String, opcional) — Nombre del icono (ej: lucide-react icon name)
- `displayOrder` (Number, opcional) — Orden de aparición
- `isVisible` (Boolean) — Si es visible en navegación (default: true)
- `color` (String, opcional) — Color de acento

**Relación:** Compuesto por `Module`. No existe sin un módulo padre.

---

#### 4.1.7 ModuleState

**¿Debe existir?** NO como entidad separada.

**Justificación:** El estado del módulo es un **campo enumerado** dentro de la entidad `Module` (`lifecycleState`). No tiene comportamiento propio, no tiene identidad independiente, y no tiene relaciones con otras entidades. Definirlo como una entidad separada sería over-engineering.

**Decisión:** El estado se define como un enum dentro de `Module`. Ver sección 6.

---

#### 4.1.8 ModuleNavigation

**¿Debe existir?** NO como entidad separada.

**Justificación:** La navegación del módulo (tabs que aparecen, orden de tabs, qué tabs están habilitadas) se deriva **completamente** del conjunto de capacidades asignadas. El `CapabilityPublicSet.getTabs()` ya resuelve esto. Crear una entidad `ModuleNavigation` separada introduciría una fuente de verdad paralela.

**Decisión:** La navegación se resuelve dinámicamente vía `CapabilityPublicSet.getTabs()`. No se crea entidad separada.

---

#### 4.1.9 ModulePermissions

**¿Debe existir?** NO como entidad separada en esta fase.

**Justificación:** Los permisos del módulo (quién puede acceder, quién puede editar) son una concern transversal gobernada por `AuthorizationResolver` y las RLS policies de Supabase. No son específicos de la administración de módulos. En el futuro, si se necesitan permisos granulares por módulo, se podrá definir como una relación dentro de `Module`.

**Decisión:** Los permisos se manejan por `AuthorizationResolver` (rol `administrador`) y RLS de Supabase. No se crea entidad separada.

---

#### 4.1.10 ModuleRuntimeBinding

**¿Debe existir?** NO como entidad separada.

**Justificación:** El vínculo entre un módulo y el Runtime ya está establecido por el bridge `__runtime_internal_event` y por el `CapabilityPublicSet`. No hay un "binding" persistente que administrar; la conexión se resuelve en tiempo de ejecución.

**Decisión:** El Runtime consume la información del módulo via `CapabilityPublicSet` y `dynamicService`. No se crea entidad separada.

---

#### 4.1.11 ModuleDefinition

**¿Debe exister?** NO como entidad separada.

**Justificación:** El concepto de `ModuleDefinition` (la definición abstracta de qué es un módulo) ya está capturado por la combinación de `Module` + `ModuleCapabilityAssignment` + la metadata persistida. Crear una `ModuleDefinition` separada introduciría una capa de abstracción innecesaria.

**Decisión:** `Module` es la definición. No se crea entidad separada.

---

### 4.2 Resumen de Entidades del Dominio

| Entidad | ¿Existe? | Tipo | Justificación |
|---|---|---|---|
| **Module** | SI (parcial en `sgc_modules`) | Entity (aggregate root) | Entidad raíz del dominio |
| **ModuleCapabilityAssignment** | SI (certificada) | Entity | Vínculo módulo-capacidad |
| **ModuleVisualConfiguration** | NO | Value Object | Presentación visual separada de identidad |
| ModuleMetadata | NO | — | Integrado en Module |
| ModuleCapabilities | NO | — | Proyección de assignments |
| ModuleConfiguration | NO | — | Persistida en sgc_forms/sgc_form_fields |
| ModuleState | NO | — | Enum dentro de Module |
| ModuleNavigation | NO | — | Resuelto dinámicamente por CapabilityPublicSet |
| ModulePermissions | NO | — | Gobernado por AuthorizationResolver |
| ModuleRuntimeBinding | NO | — | Resuelto en runtime por CapabilityPublicSet |
| ModuleDefinition | NO | — | Module es la definición |

### 4.3 Diagrama de Entidades

```
┌─────────────────────────────────────┐
│              Module                  │
│  (aggregate root)                   │
│                                     │
│  moduleId: UUID                     │
│  slug: String                       │
│  name: String                       │
│  description: String?               │
│  lifecycleState: ModuleState        │
│  createdAt: Timestamp               │
│  updatedAt: Timestamp?              │
│                                     │
│  ┌───────────────────────────┐      │
│  │  visualConfiguration:     │      │
│  │  ModuleVisualConfiguration│      │
│  │  (value object)           │      │
│  │  icon?: String            │      │
│  │  displayOrder?: Number    │      │
│  │  isVisible: Boolean       │      │
│  │  color?: String           │      │
│  └───────────────────────────┘      │
│                                     │
│  1 ──── N ModuleCapabilityAssignment│
└─────────────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────────────┐
│    ModuleCapabilityAssignment       │
│  (entity — ya certificada)          │
│                                     │
│  assignmentId: String               │
│  moduleId: String                   │
│  packageId: String                  │
│  state: String                      │
│  owner?: String                     │
│  version?: String                   │
└─────────────────────────────────────┘
              │
              │ N:1 (via packageId)
              ▼
┌─────────────────────────────────────┐
│      CapabilityPackage              │
│  (entity — ya certificada)          │
│                                     │
│  packageId: String                  │
│  definitionId: String               │
│  contractId: String                 │
│  manifestId: String                 │
│  ...                                │
└─────────────────────────────────────┘
```

---

## 5) Responsabilidades por Capa

### 5.1 Regla de ownership

Cada responsabilidad pertenece a **exactamente una capa**. Ninguna responsabilidad debe quedar compartida.

### 5.2 Matriz de responsabilidades

| Responsabilidad | Capa propietaria | Capas que NO la administran |
|---|---|---|
| Definir la identidad de un módulo | **Module** (domain entity) | UI, Runtime, Persistence |
| Crear un módulo nuevo | **Application Layer** (ModuleAdministrationApplicationService) | UI, Core, Runtime, Persistence |
| Editar metadata de un módulo | **Application Layer** | UI directa, Core, Runtime |
| Eliminar un módulo | **Application Layer** | UI directa, Core, Runtime |
| Asignar capacidades a un módulo | **Application Layer** → CapabilityAssignmentService | UI directa, Runtime |
| Obtener la lista de módulos | **Application Layer** → dynamicService (transicional) | UI directa |
| Obtener el detalle de un módulo | **Application Layer** → dynamicService (transicional) | UI directa |
| Obtener formularios de un módulo | **dynamicService** (transicional) | Application Layer, Core, Runtime |
| Obtener campos de un formulario | **dynamicService** (transicional) | Application Layer, Core, Runtime |
| Resolver capacidades de un módulo | **ModuleCapabilityResolver** (Core) | UI, Application Layer, Runtime |
| Resolver tabs de navegación | **CapabilityPublicSet** (Core → Runtime) | UI directa, Application Layer |
| Renderizar formularios | **Runtime** (FormRuntimeHost → FormRendererEngine) | UI, Core, Application Layer |
| Guardar registros (submit) | **Runtime** (RuntimeSubmitFacade → PersistenceExecutionRouter) | UI, Core, Application Layer |
| Persistir módulos en DB | **Persistence** (dynamicService → Supabase) | UI, Core, Runtime |
| Persistir capabilities en DB | **Persistence** (Repository → Supabase) | UI, Core, Runtime |
| Autorizar acceso a un módulo | **AuthorizationResolver** (Core) | UI, Application Layer, Runtime |
| Determinar el engine de un formulario | **EngineResolver** (Core) → UI | Application Layer, Runtime |
| Mostrar la interfaz del módulo | **UI** (DynamicModule, DynamicForm) | Core, Application Layer, Runtime |

### 5.3 Diagrama de Ownership

```
┌──────────────────────────────────────────────────────────────┐
│                        UI LAYER                              │
│  DynamicModule, DynamicForm, Configuration, ModuleManager    │
│                                                              │
│  Ownership: Mostrar interfaz, capturar input del usuario     │
│  NO ownership: Persistencia, lógica, orquestación            │
└───────────────────────────────┬──────────────────────────────┘
                                │ consume
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  ModuleAdministrationApplicationService                      │
│                                                              │
│  Ownership: Orquestar operaciones administrativas            │
│  Recibe: request → valida → delega → retorna result          │
│  NO ownership: Persistencia directa, Runtime, UI             │
└───────────┬──────────────────────────────┬───────────────────┘
            │ delega writes                │ delega reads
            ▼                              ▼
┌────────────────────────┐  ┌──────────────────────────────────┐
│   OPERATIONAL LAYER    │  │   CORE (transicional)            │
│  CapabilityAssignment  │  │   dynamicService                 │
│  Service               │  │   (lectura/escritura de módulos)  │
│                        │  │                                  │
│  Ownership: Validar,   │  │  Ownership: CRUD de metadata     │
│  ejecutar, transaccionar│  │  de módulos (transicional)       │
└───────────┬────────────┘  └───────────┬──────────────────────┘
            │                           │
            ▼                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                         │
│  CapabilityPersistenceProvider → Repository Contracts        │
│  dynamicService → Supabase                                  │
│                                                              │
│  Ownership: Acceso a datos, mapeo, validación estructural    │
│  NO ownership: Lógica de negocio, orquestación, UI          │
└──────────────────────────────────────────────────────────────┘
```

---

## 6) Ciclo de Vida del Módulo (Estados)

### 6.1 Estados oficiales

| Estado | Definición | Transiciones permitidas |
|---|---|---|
| **Draft** | Módulo recién creado. Sin capacidades asignadas. No visible para usuarios finales. | → Configured |
| **Configured** | Módulo con capacidades asignadas. Listo para verificación pero no aún operativo. | → Operational, → Draft |
| **Operational** | Módulo activo y visible. Los usuarios finales pueden interactuar con él. | → Deprecated |
| **Deprecated** | Módulo deshabilitado. Sigue existiendo pero no es accesible. Los datos se preservan. | → Operational, → Archived |
| **Archived** | Módulo retirado permanentemente. No accesible. Datos preservados solo para auditoría. | (estado final) |

### 6.2 Diagrama de estados

```
                    ┌──────────┐
                    │  Draft   │
                    └────┬─────┘
                         │ create + assign capabilities
                         ▼
                    ┌──────────────┐
                    │  Configured  │
                    └──┬───────┬───┘
                       │       │
            verify &   │       │ revert to
            activate   │       │ draft
                       ▼       ▼
              ┌─────────────┐  ┌──────────┐
              │ Operational │  │  Draft   │
              └──────┬──────┘  └──────────┘
                     │
          deprecate  │
                     ▼
              ┌─────────────┐
              │  Deprecated │
              └──┬───────┬──┘
                 │       │
      reactivate │       │ archive
                 ▼       ▼
        ┌─────────────┐  ┌──────────┐
        │ Operational │  │ Archived │
        └─────────────┘  └──────────┘
```

### 6.3 Mapeo con estado actual

El campo `is_active` (boolean) en `sgc_modules` actualmente representa un estado binario. El modelo ideal requiere un enum:

| Estado actual (`is_active`) | Estado modelado |
|---|---|
| `true` | `Operational` |
| `false` | `Deprecated` o `Archived` (indistinguible) |

**Gap:** No hay distinción entre `Draft`, `Configured`, `Deprecated` y `Archived`. El modelo ideal requiere migración del campo `is_active` a un enum `lifecycleState`.

---

## 7) Contratos Públicos

### 7.1 ModuleAdministrationRequest

**Propósito:** Contrato de entrada para cualquier operación administrativa sobre módulos.

**Información que contiene:**
- `operation` — Tipo de operación a ejecutar
- `actor` — Quién solicita la operación (rol, id)
- `target` — Identidad del módulo afectado
- `payload` — Datos específicos de la operación
- `correlationId` — Identificador de trazabilidad

**Responsable de crearlo:** El caller de la Application Layer (UI o proceso administrativo).

**Estado actual:** Definido en Sprint 65 (contracts existentes). Pendiente verificación de completitud.

---

### 7.2 ModuleAdministrationResult

**Propósito:** Contrato de salida estándar para todas las operaciones administrativas.

**Información que contiene:**
- `ok` — Boolean indicando éxito/fallo
- `data` — Datos resultantes (tipo variable según operación)
- `warnings` — Advertencias no bloqueantes

**Responsable de crearlo:** `ModuleAdministrationApplicationService`.

**Estado actual:** Definido en Sprint 65 (contracts existentes).

---

### 7.3 ModuleAdministrationContext

**Propósito:** Contrato de contexto operacional que viaja con cada operación.

**Información que contiene:**
- `rol` — Rol del actor
- `actorId` — Identificador del actor
- `now` — Timestamp de la operación
- `correlationId` — Identificador de trazabilidad

**Responsable de crearlo:** La UI o el caller que inicia la operación.

**Estado actual:** Definido en Sprint 65 (contracts existentes).

---

### 7.4 ModuleAdministrationError

**Propósito:** Contrato de error enriquecido para fallos administrativos.

**Información que contiene:**
- `code` — Código de error tipado
- `message` — Mensaje legible
- `details` — Detalles adicionales del fallo

**Responsable de crearlo:** La Application Layer o el Operational Layer cuando detecta un fallo.

**Estado actual:** Definido en Sprint 65 (contracts existentes).

---

### 7.5 ModuleAdministrationEvent

**Propósito:** Evento normalizado emitido después de cada operación administrativa exitosa.

**Información que contiene:**
- `type` — Tipo de evento (`module_created`, `module_updated`, `module_deleted`, `capabilities_assigned`, `capabilities_removed`, `module_state_changed`)
- `moduleId` — Módulo afectado
- `actorId` — Quién ejecutó
- `timestamp` — Cuándo ocurrió
- `correlationId` — Trazabilidad
- `previousState` — Estado anterior (si aplica)
- `newState` — Estado nuevo (si aplica)

**Responsable de crearlo:** La Application Layer después de cada operación exitosa.

**Estado actual:** **NO EXISTE.** Deberá crearse en la implementación de la Application Layer.

**Decisión de diseño:** Los eventos administrativos son distintos a los eventos Runtime (`__runtime_internal_event`). Los eventos de administración son para trazabilidad administrativa; los de Runtime son para el pipeline de persistencia.

---

### 7.6 Resumen de Contratos

| Contrato | Propósito | Responsable | Estado |
|---|---|---|---|
| `ModuleAdministrationRequest` | Entrada tipada | Caller | Definido (Sprint 65) |
| `ModuleAdministrationResult` | Salida tipada | Application Service | Definido (Sprint 65) |
| `ModuleAdministrationContext` | Contexto operacional | Caller | Definido (Sprint 65) |
| `ModuleAdministrationError` | Error enriquecido | Application/Operational Layer | Definido (Sprint 65) |
| `ModuleAdministrationEvent` | Evento post-operación | Application Service | **PENDIENTE** |

---

## 8) Operaciones Oficiales

### 8.1 Catálogo de operaciones administrativas

| Operación | Descripción | Entrada | Salida | Capa que ejecuta |
|---|---|---|---|---|
| `CreateModule` | Crea un módulo nuevo en estado Draft | Request(name, slug, description?, visualConfig?) | Result(Module) | Application → dynamicService |
| `UpdateModuleMetadata` | Actualiza nombre, slug, descripción | Request(moduleId, name?, slug?, description?) | Result(Module) | Application → dynamicService |
| `UpdateModuleVisualConfiguration` | Actualiza icono, orden, visibilidad | Request(moduleId, visualConfig) | Result(Module) | Application → dynamicService |
| `AssignCapabilities` | Reemplaza el conjunto de capacidades del módulo | Request(moduleId, assignments[]) | Result(assignments[]) | Application → CapabilityAssignmentService |
| `RemoveCapabilities` | Elimina todas las capacidades del módulo | Request(moduleId) | Result(void) | Application → CapabilityAssignmentService |
| `ChangeModuleState` | Cambia el estado del ciclo de vida | Request(moduleId, newState) | Result(Module) | Application → dynamicService |
| `DeleteModule` | Elimina un módulo permanentemente | Request(moduleId) | Result(void) | Application → dynamicService |
| `GetModule` | Obtiene el detalle completo de un módulo | Request(moduleId) | Result(Module) | Application → dynamicService |
| `GetModules` | Obtiene la lista de todos los módulos | Request(filters?) | Result(Module[]) | Application → dynamicService |
| `GetModuleConfiguration` | Obtiene la configuración de formularios/campos | Request(moduleId) | Result(forms[]) | Application → dynamicService |

### 8.2 Operaciones NO incluidas (y por qué)

| Operación | ¿Por qué NO? |
|---|---|
| `CreateForm` | Pertenecen a la administración de **formularios**, no de módulos. |
| `DeleteForm` | Misma razón. |
| `UpdateFormField` | Misma razón. |
| `SubmitResponse` | Pertenecen al **Runtime**, no a la administración. |
| `VerifyResponse` | Pertenecen al **Runtime**, no a la administración. |
| `ResolveCapabilities` | Pertenecen al **Core (ModuleCapabilityResolver)**, no a la administración. |
| `RenderModule` | Pertenecen al **Runtime**, no a la administración. |
| `AuthorizeAccess` | Pertenecen al **Core (AuthorizationResolver)**, no a la administración. |

---

## 9) Límites del Dominio

### 9.1 Qué SÍ administra Module Administration

- Crear módulos
- Editar metadata de módulos (nombre, slug, descripción)
- Editar configuración visual de módulos (icono, orden, visibilidad)
- Asignar/quitar capacidades a módulos
- Cambiar el estado del ciclo de vida de módulos
- Eliminar módulos
- Consultar módulos (lista, detalle)

### 9.2 Qué NO administra Module Administration

| Responsabilidad | ¿Quién la administra? | ¿Por qué no Module Administration? |
|---|---|---|
| Formularios (crear, editar, eliminar) | Administración de Formularios (futura) | Es un dominio separado con sus propias entidades |
| Campos de formularios | Administración de Formularios | Misma razón |
| Reglas de validación | Runtime (ValidationEngine) | Pertenecen al motor de ejecución |
| Reglas de negocio (show/hide/enable) | Runtime (RulesEngine) | Pertenecen al motor de ejecución |
| Renderizado de formularios | Runtime (FormRendererEngine) | Pertenecen al motor de presentación |
| Guardado de registros | Runtime (RuntimeSubmitFacade) | Pertenecen al motor de persistencia |
| Consulta de registros | Runtime / DynamicRecordsView | Pertenecen al motor de consulta |
| Resolución de capabilities | Core (ModuleCapabilityResolver) | Pertenecen al Core certificado |
| Navegación dinámica | Core (CapabilityPublicSet) | Se resuelve en runtime, no se administra |
| Autorización de acceso | Core (AuthorizationResolver) | Es transversal, no específico de módulos |
| Persistencia física | Supabase (via dynamicService o Repository) | Es infraestructura, no dominio |
| Configuración del Runtime | Runtime (RuntimeBuilder) | Es motor, no administración |

---

## 10) Integración Arquitectónica

### 10.1 Flujo de Administración (Write Path)

```
Configuration UI
  │
  │  usuario crea/edita/elimina módulo
  ▼
ModuleAdministrationApplicationService
  │
  │  recibe Request, construye Context
  │  valida permisos (rol administrador)
  │
  ├──→ Para operaciones CRUD de módulos:
  │      │
  │      ▼
  │    dynamicService (transicional)
  │      │
  │      ▼
  │    Supabase (sgc_modules)
  │
  └──→ Para operaciones de capabilities:
         │
         ▼
       CapabilityAssignmentService
         │
         ▼
       runOperationalPipeline
         │
         ├──→ AssignmentValidationEngine (valida)
         │
         └──→ AssignmentTransactionManager (ejecuta)
                │
                ▼
              CapabilityPersistenceProvider
                │
                ▼
              ModuleCapabilityAssignmentRepository
                │
                ▼
              Supabase (sgc_module_capabilities) [futuro]
```

### 10.2 Flujo de Consumo (Read Path)

```
DynamicModule (UI)
  │
  │  resuelve módulo por slug
  ▼
dynamicService.getModuleBySlug(slug)
  │
  │  retorna Module
  ▼
CapabilityDiscovery + useCapabilityPublicSet
  │
  │  resuelve capabilities del módulo
  ▼
ModuleCapabilityResolver
  │
  │  lista assignments → resuelve packages → construye CapabilitySet
  ▼
CapabilityPublicSet
  │
  │  retorna tabs, capabilities, configuración visual
  ▼
DynamicModule renderiza tabs según capabilities
  │
  │  usuario selecciona tab "Diligenciar Registros"
  ▼
FormRuntimeHost
  │
  │  resuelve formulario → evalúa reglas → renderiza campos
  ▼
FormRendererEngine → LayoutEngine → DynamicFieldRenderer
  │
  │  usuario llena formulario y presiona Guardar
  ▼
RuntimeSubmitFacade.submit()
  │
  │  construye payload EAV → envía a persistencia
  ▼
PersistenceExecutionRouter → SupabaseRuntimeAdapter → dynamicService
```

### 10.3 Punto de unión entre ambos flujos

Los dos flujos se unen en **tres puntos**:

1. **Creación de módulo:** El flujo de administración crea un módulo en `sgc_modules`. El flujo de consumo lo descubre via `getModuleBySlug/getModuleById`.

2. **Asignación de capabilities:** El flujo de administración asigna capabilities via `CapabilityAssignmentService`. El flujo de consumo las resuelve via `ModuleCapabilityResolver` → `CapabilityPublicSet`.

3. **Runtime bridge:** Después de que el Runtime guarda un registro, emite `__runtime_internal_event`. Este evento es consumido por la UI para actualizaciones reactivas, no por la capa de administración.

---

## 11) Principios SSOT Validados

| Principio | ¿Cumple? | Evidencia |
|---|---|---|
| **Single Responsibility** | SI | Cada capa tiene exactamente una responsabilidad definida en la matriz (sección 5) |
| **Separation of Concerns** | SI | Dominio, persistencia, presentación y orquestación están claramente separados |
| **Dependency Inversion** | SI | Application Layer depende de contratos (interfaces), no de implementaciones concretas |
| **Core desacoplado** | SI | Core no depende de UI, Runtime, ni Supabase (excepto la transición de dynamicService) |
| **Runtime desacoplado** | SI | Runtime no depende de administración, Core certificado, ni Application Layer |
| **UI desacoplada** | **PARCIAL** | UI actual depende de dynamicService directamente. La Application Layer corregirá esto. |
| **Escalabilidad** | SI | Nuevas operaciones se agregan al catálogo sin modificar operaciones existentes |
| **Reutilización** | SI | CapabilityAssignmentService, ModuleCapabilityResolver, CapabilityPublicSet son reutilizados |
| **Cero duplicación** | SI | Cada entidad tiene un único propietario; no existen fuentes de verdad paralelas |

---

## 12) Riesgos Identificados

| Riesgo | Severidad | Mitigación |
|---|---|---|
| `sgc_modules` no tiene campo `lifecycleState` | ALTO | Migración de `is_active` (boolean) a `lifecycleState` (enum) en Fase 1 |
| `sgc_modules` no tiene campo `description` | MEDIUM | Agregar campo en migración |
| `sgc_module_capabilities` no existe en Supabase | ALTO | Crear tabla en Fase 2 |
| Repositories son contratos sin implementar | ALTO | Implementar adapters en Fase 2 |
| Application Layer está vacía (bug en Sprint 65) | CRÍTICO | Re-implementar en Fase 1 |
| 3 componentes UI hablan directo a Supabase | ALTO | Migrar a Application Layer en Fase 1 |
| Cero tests en el proyecto | CRÍTICO | Instalar Vitest, tests para Core y Application |
| `CapabilityPublicSetAdapter` hardcodea capabilities | ALTO | Migrar a repositories reales en Fase 2 |

---

## 13) Recomendaciones

### 13.1 Para la implementación del Sprint 65B

1. **Corregir los bugs del Sprint 65 antes de avanzar.** El `ModuleAdministrationApplicationService` tiene un `new` sobre un objeto plano que crashea al importar. Corregir antes de cualquier integración.

2. **No crear nuevas entidades.** El modelo de dominio es mínimo y coherente: `Module` + `ModuleCapabilityAssignment` + `ModuleVisualConfiguration` (value object). No agregar entidades que no estén justificadas.

3. **Migrar `is_active` a `lifecycleState`** como parte de la Fase 1. Esto habilita el ciclo de vida completo sin break changes (los módulos existentes con `is_active=true` migran a `Operational`).

4. **Consolidar acceso Supabase desde UI.** Migrar las 3 operaciones directas de Supabase en UI (`FormBuilder.insert/delete`, `Configuration.insert/delete`) a `dynamicService` antes de crear la Application Layer.

5. **No tocar el Runtime.** El Runtime funciona correctamente. La integración con el dominio de administración ocurre via capabilities, no via modificaciones al Runtime.

### 13.2 Para futuros sprints

6. **Administración de formularios** será un dominio separado con su propio modelo (Form, FormField, FormRule, etc.). No mezclar con administración de módulos.

7. **Los eventos de administración** (`ModuleAdministrationEvent`) deben alimentar un log de auditoría administrativa separado del audit log de registros operacionales.

---

## 14) Roadmap hacia Sprint 65B

### Fase 1 — Application Layer Foundation (Sprint 65B)

**Objetivo:** Crear el `ModuleAdministrationApplicationService` correctamente.

**Entregables:**
- Re-implementar `ModuleAdministrationApplicationService` (corregir bugs del Sprint 65)
- Contratos públicos verificados: Request, Result, Context, Error
- UI migrada a consumir Application Layer (ModuleManager, ModuleEditPanel)
- Supabase eliminado de UI (migrar a dynamicService)
- `npm run build` exitoso

**Criterio de éxito:**
- Ningún componente UI importa `dynamicService` directamente (excepto transicional en Application Service)
- Ningún componente UI accede a Supabase directamente (excepto AuthContext)
- Application Service funciona end-to-end

### Fase 2 — Repository Adapters + Capabilities Reales (Sprint 67)

**Objetivo:** Conectar repositories con Supabase y habilitar capabilities reales.

**Entregables:**
- `ModuleCapabilityAssignmentRepository` implementado con Supabase
- Tabla `sgc_module_capabilities` creada
- `CapabilityPublicSetAdapter` migrado a repositories reales
- Creación de módulos asigna capabilities reales
- `npm run build` exitoso

**Criterio de éxito:**
- Crear módulo → asigna capabilities → se puede navegar → tiene tabs correctos

### Fase 3 — Runtime Integration + Wizard (Sprint 68)

**Objetivo:** Integrar completamente con el Runtime.

**Entregables:**
- `DynamicModule` consume `CapabilityPublicSet.getTabs()`
- `NavigationResolver` migrado a `CapabilityPublicSet`
- `EngineResolver` desacoplado de componentes React
- Wizard de creación de módulos funcional
- `npm run build` exitoso

**Criterio de éxito:**
- Crear módulo → asignar capabilities → navegar → formularios → guardar registros → todo funciona

---

## 15) Dictamen Final

```text
SPRINT 65A — DOMAIN MODEL CERTIFIED

Module Administration Domain Model
definido y certificado.

Entidades: Module, ModuleCapabilityAssignment, ModuleVisualConfiguration
Operaciones: 10 oficiales (Create, Update×2, Assign, Remove, State, Delete, Get×2, GetConfig)
Estados: Draft → Configured → Operational → Deprecated → Archived
Contratos: 5 (Request, Result, Context, Error, Event)
Responsabilidades: 100% asignadas por capa, cero compartidas

Core preservado. Runtime preservado. UI preparada para migración.
```

---

## 16) Validación Final

| Criterio | Estado |
|---|---|
| ¿Qué es un módulo? | DEFINIDO (sección 3) |
| ¿Quién lo administra? | DEFINIDO (sección 5) |
| ¿Quién lo persiste? | DEFINIDO (sección 5) |
| ¿Quién le asigna capacidades? | DEFINIDO (sección 5, operación AssignCapabilities) |
| ¿Quién lo consume? | DEFINIDO (sección 10.2, flujo de consumo) |
| ¿Quién lo renderiza? | DEFINIDO (sección 10.2, Runtime) |
| ¿Cuáles son sus estados? | DEFINIDO (sección 6) |
| ¿Qué NO administra? | DEFINIDO (sección 9) |
| ¿Dónde se unen los flujos? | DEFINIDO (sección 10.3) |

**PASS** — Modelo de dominio completamente definido.  
**PASS** — Sin ambigüedades en responsabilidades.  
**PASS** — Compatible con todos los SSOT certificados.  
**PASS** — Preparado para Sprint 65B (Application Layer Foundation).
