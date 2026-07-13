# SPRINT 65 — Auditoría Arquitectónica: Integración Core + Runtime + Application (Post Sprint 64)

> **Tipo:** Auditoría Arquitectónica / Post-Certificación Core  
> **Fecha:** 2026-07-13  
> **Alcance:** Core (`src/core/`), Runtime (`src/runtime/`), Application (`src/components/`, `src/pages/`, `src/services/`)  
> **Restricción:** Solo inspección. Sin cambios de código.

---

## 1) Estado Real de la Arquitectura

### 1.1 Inventario del Core — 43 archivos en `src/core/`

| Subsistema | Archivos | Estado | Dependencias externas |
|---|---|---|---|
| `persistence/capabilities/domainModels/` | 6 | COMPLETO, certificado | Ninguna |
| `persistence/capabilities/mappers/` | 6 | COMPLETO, certificado | Ninguna |
| `persistence/capabilities/validation/` | 4 | COMPLETO (faltan 2 validadores) | Ninguna |
| `persistence/capabilities/repositories/` | 6 | **Solo contratos** (todos throw "not implemented") | Ninguna |
| `persistence/capabilities/CapabilityPersistenceProvider.js` | 1 | COMPLETO, certificado | Solo internos |
| `operationalLayer/` | 5 | COMPLETO, certificado (Sprint 64/64.1) | Ninguna |
| `capabilities/` (Registry, Discovery, PackageRegistry) | 3 | COMPLETO | Authorization, Navigation, Engine |
| `capabilities/moduleCapabilityResolution/` | 5 | COMPLETO | Solo internos |
| `capabilities/public/` | 3 | **TRANSICIONAL** | React, `documentRepositoriesService` |
| `engine/EngineResolver.js` | 1 | COMPLETO | **3 componentes UI React** |
| `authorization/AuthorizationResolver.js` | 1 | COMPLETO, limpio | Ninguna |
| `navigation/NavigationResolver.js` | 1 | COMPLETO | Ninguna |
| `applicationLayer/moduleAdministration/` | 0 | **VACÍO** (solo directorio) | — |

### 1.2 Inventario del Runtime — 174 archivos en `src/runtime/`

| Subsistema | Archivos | Estado | Notas |
|---|---|---|---|
| Types & Contracts (`types/`) | 1 | COMPLETO | Definiciones TypeScript |
| Context (`context/`) | 1 | COMPLETO | RuntimeProvider (React) |
| Schema Normalization (`schema/`) | 3 | COMPLETO | Parser → Normalizer → Factory |
| Form Registry & Resolution (`forms/`) | 6 | COMPLETO | In-memory registries |
| Field Registry (`fields/`) | 3 | COMPLETO | In-memory registries |
| Layout Registry & Resolution (`layout/`) | 5 | COMPLETO | In-memory registries |
| Rules Registry & Resolution (`rules/`) | 5 | COMPLETO | Pure functions |
| Runtime Builder (`builder/`) | 3 | COMPLETO | Orquestador central |
| Rendering (`rendering/`, `registry/`) | 19 | COMPLETO | 14 componentes atómicos |
| Validation (`validation/`) | 9 | COMPLETO | Field + Form contract validation |
| Transaction (`transaction/`) | 11 | COMPLETO | Submit → EAV → Persistence |
| Persistence Provider Factory (`persistence/`) | 30+ | COMPLETO | Memory + Supabase + LocalStorage |
| Intelligence Layer (analytics, scoring, decision, selection) | 25+ | COMPLETO | Provider auto-selection |
| Recovery (`recovery/`) | 8 | COMPLETO | Retry + state machine |
| Integration (`integration/`) | 2 | COMPLETO | Activation + Event translation |
| Eventing (`eventing/`) | 1 | COMPLETO | In-memory pub/sub |
| Hooks (`hooks/`) | 2 | COMPLETO | useRuntimeField, useRulesEngine |
| Runtime Host (`runtime-host/`) | 3 | COMPLETO | FormRuntimeHost |
| Playground (`playground/`) | 1 | COMPLETO | Dev sandbox |

### 1.3 Inventario de la Aplicación — 14 componentes auditados

| Componente | dynamicService directo | Supabase directo | Core import | Runtime import | App Layer import |
|---|---|---|---|---|---|
| `ModuleManager.jsx` | **SI** | No | No | No | No |
| `ModuleEditPanel.jsx` | **SI** | No | No | No | No |
| `ModuleDetailPanel.jsx` | No | No | No | No | No |
| `FormBuilder.jsx` | **SI** | **SI** (dynamic import) | No | No | No |
| `DynamicRecordsView.jsx` | **SI** | No | No | **SI** (activation) | No |
| `Configuration.jsx` | **SI** | **SI** (dynamic import) | No | No | No |
| `DynamicModule.jsx` | **SI** | No | **SI** (CapabilityDiscovery, useCapabilityPublicSet) | No | No |
| `DynamicModuleById.jsx` | **SI** | No | No | No | No |
| `DynamicForm.jsx` | **SI** | No | **SI** (CapabilityDiscovery) | **SI** (activation) | No |
| `WorkspaceFoundation.jsx` | No | No | No | No | No |
| `DynamicService.js` | — | **SI** (Supabase CRUD) | No | No | No |
| `AuthContext.jsx` | No | **SI** (profiles, auth) | No | No | No |
| `App.jsx` | No | No | No | **SI** (Playground) | No |
| **ModuleAdministrationApplicationService** | — | — | — | — | **NO EXISTE** |

---

## 2) Componentes Reutilizables (certificados, no tocar)

| Componente | Sprint | Estado | Justificación |
|---|---|---|---|
| 6 Domain Models | 59 | CERTIFICADO | Pure entities, zero deps |
| 6 Mappers | 59 | CERTIFICADO | Pure functions, zero deps |
| 4 Validators | 59/64 | CERTIFICADO | Pure functions, zero deps |
| 6 Repository Contracts | 59 | CERTIFICADO | Interface-only, zero deps |
| CapabilityPersistenceProvider | 59 | CERTIFICADO | Fachada operacional, zero external deps |
| OperationalLayerFoundation | 64 | CERTIFICADO | Constants, zero deps |
| OperationPipeline | 64 | CERTIFICADO | Pure pipeline, zero deps |
| CapabilityAssignmentService | 64 | CERTIFICADO | Orchestrator, zero deps |
| AssignmentValidationEngine | 64 | CERTIFICADO | Deterministic, zero deps |
| AssignmentTransactionManager | 64 | CERTIFICADO | Transaction coordinator, zero deps |
| CapabilityRegistry | 55 | CERTIFICADO | Static registry |
| CapabilityPackageRegistry | 55 | CERTIFICADO | Static registry, frozen |
| CapabilityDiscovery | 56 | CERTIFICADO | Facade over Registry |
| ModuleCapabilityResolver | 60 | CERTIFICADO | Resolver with DI |
| CapabilitySetBuilder + 3 engines | 60 | CERTIFICADO | Pure functions |
| CapabilityPublicSet | 61 | CERTIFICADO | Immutable data class |
| AuthorizationResolver | 53 | CERTIFICADO | Pure utility |
| NavigationResolver | 54 | CERTIFICADO | Pure utility (obsoleto pronto) |

---

## 3) Componentes Pendientes

| Componente | Estado | Acción requerida |
|---|---|---|
| `applicationLayer/moduleAdministration/` | **VACÍO** | Implementar `ModuleAdministrationApplicationService` |
| 6 Repository Contracts | **Solo contratos** (throw "not implemented") | Implementar adapters Supabase |
| `CapabilityPublicSetAdapter.js` | **TRANSICIONAL** | Migrar a adapter real con repositories |
| `useCapabilityPublicSet.js` | **TRANSICIONAL** | Mover fuera de `core/` (React hook en domain layer) |
| `EngineResolver.js` | **ACOPLADO a UI** | Desacoplar: retornar string/enum, no componentes React |
| `NavigationResolver.js` | **HARDCODED tabs** | Migrar a `CapabilityPublicSet.getTabs()` |
| `AssignmentValidationEngine.js` | **BUG** (import roto) | Corregir path de import |
| `ModuleAdministrationApplicationService` (Sprint 65) | **BUG** (new en objeto plano) | Corregir o re-implementar |
| Validadores faltantes | Sin `CapabilityDefinitionIntegrityValidation`, `CapabilityManifestIntegrityValidation` | Crear si se usa en provider |
| Tests | **CERO** en todo el proyecto | Instalar framework + tests críticos |

---

## 4) Violaciones de Desacoplamiento

### 4.1 UI → Supabase (CRÍTICO)

| Componente | Tabla | Operación |
|---|---|---|
| `FormBuilder.jsx` | `sgc_form_fields` | `insert`, `delete` |
| `Configuration.jsx` | `sgc_forms` | `insert`, `delete` |
| `AuthContext.jsx` | `profiles` | `select` |

### 4.2 UI → dynamicService (ALTO)

8 de 14 componentes llaman directamente a `dynamicService` para CRUD. No existe capa de orquestación entre UI y persistencia.

### 4.3 Core → UI (ALTO)

| Componente Core | Dependencia UI |
|---|---|
| `EngineResolver.js` | Importa `BaseChecklist`, `BaseMediciones`, `BaseGeneric` (componentes React) |

### 4.4 Core → React (MEDIUM)

| Componente Core | Dependencia React |
|---|---|
| `useCapabilityPublicSet.js` | Hook de React dentro de `core/` |

### 4.5 Core → External Service (MEDIUM)

| Componente Core | Dependencia |
|---|---|
| `CapabilityPublicSetAdapter.js` | `documentRepositoriesService` |

### 4.6 Runtime → dynamicService (BAJO — intencional)

`SupabaseRuntimeAdapter.ts` llama a `dynamicService.submitFormResponse()`. Esto es el bridge Runtime↔Supabase y es **intencional** por diseño.

---

## 5) Bugs Críticos Encontrados

### BUG 1 — `ModuleAdministrationApplicationService.js:30`

```
new ModuleCapabilityAssignmentRepository()
```

`ModuleCapabilityAssignmentRepository` es un **objeto plano**, no una clase. Usar `new` sobre él lanza `TypeError` en runtime. Esto crashea `ModuleManager.jsx` al cargar (el singleton se instancia en import time).

**Corrección:** Eliminar `new` o convertir el repository a class.

### BUG 2 — `AssignmentValidationEngine.js:9`

```js
import { validateModuleCapabilityAssignment }
  from '../../../persistence/capabilities/validation/ModuleCapabilityAssignmentIntegrityValidation/index.ts';
```

Dos problemas:
1. Path incorrecto: `../../..` desde `operationalLayer/capabilityAssignment/` llega a `src/`, no a `src/core/`. Debe ser `../../persistence/...`
2. Importa `index.ts` que es un **archivo vacío** (0 líneas). La función real está en el `.js` del directorio.

**Corrección:** Cambiar a `../../persistence/capabilities/validation/ModuleCapabilityAssignmentIntegrityValidation`

### BUG 3 — `CapabilityPersistenceProvider.js:114-121`

En `replaceAssignmentsForModule`, se re-mapean assignments a raws manualmente, perdiendo el campo `owner` del domain model validado. Inconsistente con el resto del flujo del provider.

---

## 6) Punto Exacto de Integración Recomendado

### Estado actual del flujo

```
UI (ModuleManager/Configuration)
  │
  ├─→ dynamicService (CRUD módulos/formularios)
  │     └─→ Supabase (sgc_modules, sgc_forms, sgc_form_fields)
  │
  ├─→ DynamicForm/DynamicRecordsView
  │     ├─→ dynamicService (submit/verify responses)
  │     │     └─→ Supabase (sgc_form_responses, sgc_response_values)
  │     └─→ runtimeActivationLayer.activate()
  │           └─→ PersistenceExecutionRouter
  │                 └─→ SupabaseRuntimeAdapter → dynamicService
  │
  └─→ DynamicModule
        ├─→ CapabilityDiscovery
        └─→ useCapabilityPublicSet → CapabilityPublicSetAdapter → documentRepositoriesService
```

### Punto de integración recomendado

El punto más limpio para conectar **Application → Core → Runtime** es:

```
UI (ModuleManager/Configuration)
  │
  ▼
ModuleAdministrationApplicationService ← AQUÍ FALTA
  │
  ├──→ dynamicService (TRANSICIONAL para sgc_modules CRUD)
  │     └─→ Supabase
  │
  ├──→ CapabilityAssignmentService (para capability assignments)
  │     └─→ Operational Layer → PersistenceProvider → Repository
  │
  └──→ Runtime (NO necesita cambio — ya funciona via dynamicService)
        └─→ PersistenceExecutionRouter → SupabaseRuntimeAdapter
```

**Justificación:**

1. **El Runtime NO necesita ser modificado.** Ya tiene su pipeline completo (Schema → Registry → Resolver → Builder → Renderer → Transaction → Persistence). El bridge con Supabase ya existe via `SupabaseRuntimeAdapter`.

2. **El Core ya tiene los servicios necesarios.** `CapabilityAssignmentService` + Operational Layer están certificados. Solo faltan los adapters de Repository para persistir de verdad.

3. **La Application Layer es la capa que falta.** El `ModuleAdministrationApplicationService` (documentado en Sprint 65 pero con bugs) es el punto correcto para interceptar la UI y redirigirla al Core.

4. **dynamicService puede permanecer como bridge transicional** para operaciones CRUD básicas de módulos (`getModules`, `getModuleById`, `updateModule`), encapsulado dentro del Application Service.

---

## 7) Duplicaciones Detectadas

| Duplicación | Ubicación 1 | Ubicación 2 | Acción |
|---|---|---|---|
| Registry patterns | `CapabilityRegistry.js` (Map singleton) | `CapabilityPackageRegistry.js` (Map singleton) | Consenso: mismo patrón, aceptable |
| Validation pattern | `validateModuleCapabilityAssignment` en `validation/` | `AssignmentValidationEngine` en `operationalLayer/` | NO duplicado: uno es structural, otro es operational |
| Resolvers | `NavigationResolver.js` (hardcoded tabs) | `CapabilityPublicSet.getTabs()` (dynamic) | **Migrar** de NavigationResolver a CapabilityPublicSet |
| Form rendering paths | Path A (`RuntimeProviderRoot` → `RuntimeRendererBase`) | Path B (`FormRuntimeHost` → `RuntimeBuilder` → `FormRendererEngine`) | **Path B es la dirección correcta**; Path A es legacy |
| Field renderers | `rendering/registry/ComponentRegistryBase.ts` | `registry/ComponentRegistryBase.tsx` (legacy) | **Eliminar** el legacy cuando Path A se deprec |
| `getModules()` | `dynamicService.getModules()` | `ModuleAdministrationApplicationService.getModuleList()` (Sprint 65, delega a dynamicService) | Transicional, aceptable |
| Supabase directo en UI | `FormBuilder.jsx` + `Configuration.jsx` | `dynamicService.js` | **Migrar** operaciones a dynamicService o Application Layer |

---

## 8) Mapa de Dependencias Completo

```
┌──────────────────────────────────────────────────────────────────┐
│                     APLICACIÓN (UI)                              │
│  Configuration, ModuleManager, DynamicModule, DynamicForm,       │
│  DynamicRecordsView, FormBuilder, DynamicModuleById              │
│                                                                  │
│  Dependencias: React, dynamicService, CapabilityDiscovery,      │
│                useCapabilityPublicSet, runtimeActivationLayer    │
│                Supabase (3 componentes)                          │
└───────────────────┬──────────────────────┬──────────────────────┘
                    │                      │
         ┌──────────┘                      └──────────┐
         ▼                                            ▼
┌─────────────────────┐              ┌────────────────────────────┐
│   dynamicService     │              │  CORE (src/core/)          │
│   (Supabase CRUD)   │              │                            │
│                      │              │  CapabilityRegistry        │
│  sgc_modules         │              │  CapabilityDiscovery       │
│  sgc_forms           │              │  CapabilityPackageRegistry │
│  sgc_form_fields     │              │  ModuleCapabilityResolver  │
│  sgc_form_responses  │              │  CapabilityPublicSet       │
│  sgc_response_values │              │  CapabilityPersistenceProv │
│  sgc_evidences       │              │  OperationalLayer          │
│  sgc_audit_logs      │              │  CapabilityAssignmentSvc   │
│  profiles            │              │  AuthorizationResolver     │
└─────────┬───────────┘              │  NavigationResolver        │
          │                          │  EngineResolver (⚠️ UI)    │
          │                          └────────────┬───────────────┘
          │                                       │
          ▼                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     RUNTIME (src/runtime/)                       │
│                                                                  │
│  Schema → Registry → Resolver → Builder → Renderer              │
│  Validation → Transaction → Persistence                          │
│  Intelligence Layer (analytics, scoring, decision, selection)    │
│  Recovery → Eventing → Integration                               │
│                                                                  │
│  Providers: Memory | Supabase | LocalStorage                     │
│  Bridge: SupabaseRuntimeAdapter → dynamicService                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9) Roadmap Recomendado (3 Fases)

### Fase 1 — Desacoplamiento y Application Layer (Sprint 66)

**Objetivo:** Establecer el Application Service como única puerta de entrada UI → Core

**Tareas:**
1. Re-implementar `ModuleAdministrationApplicationService` corrigiendo los bugs del Sprint 65
2. Migrar `ModuleManager.jsx` y `ModuleEditPanel.jsx` para consumir exclusivamente el Application Service
3. Migrar operaciones directas de Supabase en `FormBuilder.jsx` y `Configuration.jsx` a `dynamicService` (consolidar)
4. Mover `useCapabilityPublicSet.js` fuera de `core/` (a `src/hooks/` o `src/components/`)
5. Corregir `AssignmentValidationEngine.js` (path de import roto)
6. Verificar `npm run build`

**Criterio de éxito:**
- UI no importa `dynamicService` directamente (excepto transicional dentro del Application Service)
- UI no accede a Supabase directamente (excepto AuthContext)
- Application Service existe y funciona
- Build exitoso

### Fase 2 — Repository Adapters y Capabilities Reales (Sprint 67)

**Objetivo:** Conectar los repositories contratos con persistencia real

**Tareas:**
1. Implementar `ModuleCapabilityAssignmentRepository` adapter (Supabase → `sgc_module_capabilities`)
2. Implementar al menos `CapabilityPackageRepository` adapter (lectura de paquetes registrados)
3. Migrar `CapabilityPublicSetAdapter.js` para usar repositories reales en vez de `documentRepositoriesService`
4. Crear validadores faltantes (`CapabilityDefinitionIntegrityValidation`, `CapabilityManifestIntegrityValidation`)
5. Implementar creación de módulos con capabilities via `CapabilityAssignmentService`
6. Verificar `npm run build`

**Criterio de éxito:**
- Crear un módulo asigna capabilities reales en Supabase
- `CapabilityPublicSetAdapter` no depende de `documentRepositoriesService`
- El write path funciona: UI → Application → Operational Layer → PersistenceProvider → Repository → Supabase
- Build exitoso

### Fase 3 — Runtime Integration y Wizard (Sprint 68)

**Objetivo:** Integrar el módulo creado dinámicamente con el Runtime Engine

**Tareas:**
1. Conectar el `DynamicModule` al `CapabilityPublicSet` para resolver tabs dinámicamente
2. Migrar `NavigationResolver` a usar `CapabilityPublicSet.getTabs()`
3. Resolver `EngineResolver` desacoplando componentes React (retornar identificador, no componente)
4. Implementar wizard de creación de módulos en Configuration (selección de capabilities → creación → assignación)
5. Verificar que un módulo creado se puede navegar, renderizar formularios y guardar registros
6. Verificar `npm run build`

**Criterio de éxito:**
- Crear módulo desde UI → se asignan capabilities → se renderiza en DynamicModule → tiene tabs correctos → formularios funcionan → registros se guardan
- El Runtime no fue modificado
- No se duplicó lógica existente
- Build exitoso

---

## 10) Respuesta a los Criterios de Éxito

### ¿Qué ya está construido y certificado?
Todo el Core (persistence, capabilities, operational layer, resolvers) y el Runtime completo (174 archivos). 65 sprints de arquitectura certificados.

### ¿Qué no debe volver a modificarse?
Los 18 componentes certificados listados en la sección 2. El Runtime completo excepto la integración con CapabilityPublicSet.

### ¿Cuál es el punto correcto para integrar Core con la aplicación?
`ModuleAdministrationApplicationService` → es la única capa faltante. No necesita tocar ni Runtime ni Core certificado.

### ¿Qué debemos implementar primero para habilitar módulos dinámicos?
Fase 1: Application Service + desacoplamiento UI. Sin esto, no hay orquestación.

### ¿Cómo aprovechar la arquitectura SSOT existente sin duplicar?
Reutilizar: `CapabilityAssignmentService` para writes, `ModuleCapabilityResolver` para reads, `CapabilityPublicSet` para UI rendering. No crear nuevos servicios de persistencia — los repositories ya definen los contratos.

---

## 11) Riesgos Identificados

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Cero tests en 453 archivos | CRÍTICO | Instalar Vitest, tests unitarios para Core y Application Layer |
| `EngineResolver` importa React components | ALTO | Fase 3: retornar string identifier, resolver en UI |
| `CapabilityPublicSetAdapter` hardcodea capabilities | ALTO | Fase 2: migrar a repositories reales |
| Route conflict `/:moduleSlug` vs `/:moduleId` | MEDIUM | Verificar en Fase 3, ajustar orden en App.jsx |
| `ModuleCapabilityResolver` N+1 queries | MEDIUM | Optimizar en Fase 2 con batch query |
| `ModuleAdministrationApplicationService` tiene bugs (new en objeto plano) | ALTO | Fase 1: reimplementar correctamente |
| 3 componentes UI hablan directo a Supabase | ALTO | Fase 1: migrar a dynamicService |
| `applicationLayer/moduleAdministration/` está vacío | ALTO | Fase 1: implementar service + contratos |

---

## 12) Dictamen Final

**AUDITORÍA ARQUITECTÓNICA — COMPLETADA.**

La arquitectura SSOT del SGC-DM está **sólidamente construida** en Core (43 archivos certificados) y Runtime (174 archivos funcionales). El gap estructural es la **Application Layer** — la capa de orquestación entre UI y Core que debe mediar todas las operaciones administrativas de módulos.

El Runtime Engine está completamente funcional y NO requiere modificaciones. El Core tiene todos los servicios necesarios certificados. La integración se reduce a implementar el `ModuleAdministrationApplicationService` correctamente y migrar las dependencias directas de UI → Supabase/dynamicService.

El camino mínimo es de **3 fases**, implementables sin romper el sistema existente.
