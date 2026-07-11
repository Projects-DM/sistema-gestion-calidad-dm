# SPRINT 50.2 — CORE IMPLEMENTATION READINESS AUDIT (SSOT)

> **Tipo:** Arquitectura Aplicada (Implementation Readiness)
> 
> **Nivel esperado:** LEVEL 3 — CERTIFIED
>
> **Estado esperado:** IMPLEMENTATION READY (dictamen de auditoría solamente)
>
> **Restricción:** Sprint 50.2 es **técnico-audit only**: **NO modifica código / NO modifica arquitectura / NO modifica SSOT / NO crea implementación**. El único archivo nuevo permitido es este documento.

---

## Fuentes (evidencia permitida)

### SSOT (permitido)
- `CORE_STANDARD_MODULE_STRATEGY_v1.md`
- `CORE_GOVERNANCE_MODEL_v1.md`
- `CORE_RUNTIME_GOVERNANCE_MODEL_v1.md`
- `CORE_STANDARD_SHELL_MODEL_v1.md`
- `CORE_CAPABILITY_MODEL_v1.md`
- `CORE_CAPABILITY_REGISTRY_MODEL_v1.md`
- `CORE_CAPABILITY_RESOLVER_MODEL_v1.md`
- `CORE_CAPABILITY_COMPOSITION_ENGINE_MODEL_v1.md`

### Implementación actual (permitida)
- Inspección directa (read-only) de archivos bajo `src/` listados en las evidencias de hallazgos.

> Nota: `search_files` no fue utilizable (sin ripgrep); todas las evidencias provienen de inspección directa (read-only).

---

# FASE 1 — Core Inventory Audit (inventario completo)

Para cada componente:
- propósito
- responsabilidades
- nivel de reutilización
- dependencia del negocio
- evidencia

## 1) DynamicModule

### Evidencia
- **Archivo:** `src/pages/DynamicModule.jsx`
- **Componente:** `DynamicModule()`

### Propósito
Renderizar la experiencia “por módulo”:
- carga del módulo por `moduleSlug` vía `dynamicService.getModuleBySlug`
- carga de formularios por módulo
- UI de pestañas: “Diligenciar Registros”, “Historial y Consultas”, “Repositorio Documental”

### Responsabilidades (observadas)
- **Orquestación de UI** y navegación (tabs) para un módulo.
- **Reglas de activación por slug** (`isDocumentEnabled`) para habilitar repositorio.
- Filtrado de formularios por rol (`filteredForms`).
- Presentación de `DynamicRecordsView` y `ModuleDocumentViewer`.

### Nivel de reutilización (diagnóstico)
- **Bajo** como Core reusable, porque el comportamiento UI está fuertemente acoplado a un conjunto de módulos/slugs y a reglas de negocio (pestañas y habilitación por slug).

### Dependencia del negocio
- Alta: contiene whitelist de slugs y lógica de “repositorio documental habilitado/no habilitado”.

### Evidencia de hardcode (ver también Fase 3)
- `['mantenimiento', 'calidad', 'operaciones', 'gestion-documental', 'medicion-control'].includes(slug)`.

---

## 2) DynamicForm

### Evidencia
- **Archivo:** `src/pages/DynamicForm.jsx`
- **Componente:** `DynamicForm()`

### Propósito
Renderizar un formulario dinámico por `formSlug`:
- cargar definiciones y campos
- construir valores iniciales
- ejecutar un “engine” de UI basado en `formDef.engine_type`
- validar reglas manuales de requerimientos/evidencias
- enviar respuesta y activar runtime bridge

### Responsabilidades (observadas)
- **Orquestación de UI** y switch explícito de engines: `BaseChecklist` / `BaseMediciones` / `BaseGeneric`.
- Validación manual sobre fields (ej.: boolean false => “hallazgos críticos”).
- Evidencias obligatorias cuando hay hallazgos críticos.
- Lógica de submit y bridge a runtime: invoca `dynamicService.submitFormResponse()` y luego `runtimeActivationLayer.activate(result.__runtime_internal_event)`.

### Nivel de reutilización
- **Parcial**: existe un runtime/renderer framework, pero el componente mezcla reglas de negocio y reglas de requerimiento de evidencia.

### Dependencia del negocio
- Alta: reglas explícitas sobre field types/valores (boolean/no cumple, out-of-bounds) y observaciones.

---

## 3) Runtime

### Evidencia (Core runtime-related)
- **Archivo:** `src/runtime/context/RuntimeContext.tsx`
- **Componente:** `RuntimeProvider` / `useRuntime`

- **Archivo:** `src/runtime/provider/RuntimeProviderRoot.tsx`
- **Componente:** `RuntimeProviderRoot`

### Propósito
Proveer snapshot y acciones de estado para el renderer de un formulario.
- maneja `values`, `validationErrors`, `disabled`, `uiState`.
- orquesta validación por cambio de campo usando `FieldValidationOrchestrator`.

### Responsabilidades (observadas)
- Manejo de estado local y validación reactiva.
- No se observó (en el scope leído) independencia total del renderer/UI.

### Nivel de reutilización
- **Parcial**: arquitectura de “runtime provider/renderer” existe, y se apoya en contratos tipados. Sin embargo, hay mezcla conceptual con UI y estado de validación/hilos.

### Dependencia del negocio
- Media: el motor de validación depende de definiciones de `form.fields`, que provienen de metadata del negocio; no obstante, el runtime en sí no “decide dominio” explícitamente (requiere ver validation layer completa, no inspeccionada en esta pasada).

---

## 4) Metadata Engine

### Evidencia (aproximación por composición)
- **Archivo:** `src/services/dynamicService.js`
- **Componente:** `dynamicService.getFormFields()` / `getFormBySlug()` / `getModuleBySlug()`

### Propósito
Obtener definiciones desde persistencia:
- módulos (`sgc_modules`)
- formularios (`sgc_forms`)
- campos (`sgc_form_fields`)

### Responsabilidades (observadas)
- “Metadata consumption” vía Supabase.

### Nivel de reutilización
- **No reutilizable como Core** según frontera SSOT: el acceso a persistencia y estructura de tablas está mezclado en `dynamicService` (infra/proveedor), no como engine Core aislado.

### Dependencia del negocio
- Alta: acoplamiento a tablas `sgc_*` y a esquema operativo.

---

## 5) Capability Consumption (Registry/Resolver/Composition)

### Evidencia
- **Archivo:** `src/runtime/registry/registryResolver.tsx` (read intent fallido antes; luego no confirmado en esta sesión)
- **Archivo:** `src/runtime/registry/ComponentRegistryBase.tsx`
- **Componente:** `ComponentRegistryBase` / `componentRegistryBase`

### Propósito (observado)
Resolver `fieldDef.fieldType` hacia un componente renderer compatible.

### Responsabilidades (observadas)
- Registro y resolución de `RuntimeFieldType -> componente`.
- Renderizado de campos con fallback.

### Nivel de reutilización
- **No Core capability model**: esto es más cercano a *component registry* (render atoms) que a Capability Registry/Resolver del SSOT (definición/decisión de capabilities de módulo). 

### Dependencia del negocio
- Media: depende de `RuntimeFieldType` y contratos de `fieldDef` provenientes de metadata del negocio.

---

## 6) Routing

### Evidencia
- **Archivo:** `src/App.jsx`
- **Componente:** `App()` (react-router routes)
- **Archivo:** `src/components/ProtectedRoute.jsx`
- **Componente:** `ProtectedRoute()`

### Propósito
- Definir rutas principales y rutas parametrizadas (`:moduleSlug`, `/modulo/:moduleSlug/:formSlug`).
- Gate de acceso por sesión/rol.

### Responsabilidades (observadas)
- Routing de UI.
- Autorización por roles en `ProtectedRoute`.

### Nivel de reutilización
- **No reutilizable como Core**: es un adaptador de UI y navegación, sin evidencia de ser un “Standard Navigation” independiente de dominio.

---

## 7) Authorization

### Evidencia
- **Archivo:** `src/context/AuthContext.jsx`
- **Componente:** `AuthProvider`
- **Archivo:** `src/hooks/useAuth.js`
- **Componente:** `useAuth`
- **Archivo:** `src/components/ProtectedRoute.jsx`
- **Componente:** `ProtectedRoute`
- **Archivo:** `src/components/RoleGate.jsx`
- **Componente:** `RoleGate`

### Propósito
Proveer `rol` y controlar render de rutas o componentes.

### Responsabilidades (observadas)
- Consultar perfil desde Supabase (`profiles`).
- Gate por `allowedRoles`.
- Gate adicional en componentes (p.ej. `DynamicModule` filtra forms por rol).

### Nivel de reutilización
- **Parcial**: existe un modelo de roles, pero está acoplado a `profiles` y rol strings concretos.

### Dependencia del negocio
- Alta: roles específicos (`administrador`, `calidad`, `operativo`, etc.) y lógica adicional en componentes.

---

## 8) Document Management

### Evidencia
- **Archivo:** `src/components/DocumentManager.jsx`
- **Componente:** `DocumentManager`
- **Archivo:** `src/components/DocumentModule.jsx`
- **Componente:** `DocumentModule`
- **Archivo:** `src/services/documentsService.js`
- **Componente:** `documentsService`

### Propósito
Gestión documental con Supabase Storage + tablas.
- Programas (único por módulo)
- Registros documentales (múltiples por módulo/categoría)

### Responsabilidades (observadas)
- CRUD y visor de PDF (iframe).
- Selección de categorías y carga por tipo.
- Permisos para subida/administración basados en `useAuth`.

### Nivel de reutilización
- **Parcial**: existe “document domain” end-to-end, pero acoplado a UI y a esquemas/paths concretos.

### Dependencia del negocio
- Alta: buckets/paths y categorías concretas.

---

## 9) Records

### Evidencia
- **Archivo:** `src/components/DynamicRecordsView.jsx`
- **Componente:** `DynamicRecordsView`

### Propósito
Historial y consultas de respuestas por módulo.
Incluye:
- tabla
- filtros
- modal de detalles
- auditoría y verificación
- exportación

### Responsabilidades (observadas)
- Cálculo de estado y hallazgos críticos en el cliente.
- Verificación de registros (operacional) con acciones `dynamicService.verifyFormResponse` / `verifyMultipleFormResponses`.
- Bridge a runtime en verificación individual (usa `runtimeActivationLayer.activate` vía `dynamicService.verifyFormResponse`).

### Nivel de reutilización
- **No reutilizable como Core**: mezcla lógica de negocio (verificación, computedStatus) con UI.

### Dependencia del negocio
- Muy alta.

---

## 10) Standard Navigation

### Evidencia
- **Archivo:** `src/App.jsx`
- **Componentes:** rutas y nesting en `DashboardLayout` (no inspeccionado en esta pasada)
- **Archivo:** `src/pages/Dashboard.jsx`
- **Componente:** grid de módulos con array hardcodeado `modules = [...]`
- **Archivo:** `src/pages/DynamicModule.jsx`
- **Componente:** tabs concretas

### Propósito
Navegación del sistema por UI.

### Responsabilidades (observadas)
- Construcción de menú por array estático de módulos con roles, colores y rutas.
- Tabs con lógica de habilitación por slug.

### Nivel de reutilización
- Bajo: hardcodes de navegación.

### Dependencia del negocio
- Alta.

---

# FASE 2 — Responsibility Audit (Core / Business Module / Mezcla)

Clasificación por componente (con evidencia):

| Componente | Core | Business | Mezcla |
|---|---|---|---|
| DynamicModule |  | ✓ | ✓ (orquesta UI, gating por slug/roles, tabs) |
| DynamicForm |  | ✓ | ✓ (validación/evidencias + engine switch; bridge runtime) |
| Runtime (provider/validation/rendering) | ✓ (parcial) | ✓ (por dependencia de reglas del negocio vía fields) | ✓ (state/UI acoplados) |
| Metadata Engine (dynamicService) |  | ✓/Shared Infra | ✓ (acceso a persistencia con esquema sgc_*) |
| Capability Consumption |  |  | No aplica como capability model; es component registry (UI atoms) |
| Routing |  | ✓/Shared UI | ✓ |
| Authorization |  |  | ✓ (strings roles + gating en varias capas) |
| Document Management |  | ✓ | ✓ |
| Records |  | ✓ | ✓ |
| Standard Navigation |  |  | ✓ (menú hardcodeado) |

---

# FASE 3 — Hardcode Audit (arquitectónicos)

## 3.1 Lista por slug (hardcode)
- **Evidencia:** `src/pages/DynamicModule.jsx` → `isDocumentEnabled(slug)` con whitelist.
- **Descripción:** habilitación de “Repositorio Documental” depende de array estático de slugs.
- **Impacto:** no es metadata-driven; cada módulo nuevo requiere cambio en Core/UI.
- **Riesgo:** bloquea reutilización del standard shell (no soporta “capabilidad documental” por metadata).
- **Posibilidad de convertirlo en metadata:** alta (esto debería residir en un modelo de capacidades/document capabilities por módulo).
- **Prioridad:** **Crítica**.

## 3.2 if/switch específicos por engine_type
- **Evidencia:** `src/pages/DynamicForm.jsx` → `switch (formDef.engine_type)` con casos `BaseChecklist` / `BaseMediciones`.
- **Descripción:** extensión de engines acoplada a código.
- **Impacto:** limita marketplace/plugins de motores; requiere recompilación.
- **Riesgo:** drift entre engine discovery y runtime composition.
- **Posibilidad metadata:** media-alta (engine mapping por capability defs).
- **Prioridad:** **Alta**.

## 3.3 Reglas especiales (negocio) hardcodeadas en cliente
- **Evidencia:** `src/pages/DynamicForm.jsx`
  - boolean false => “hallazgos críticos”
  - number fuera de min/max => “hallazgos críticos”
  - requiere evidencia y observación con heurística sobre `name`/`label`.
- **Descripción:** reglas de auditoría/calificación están embebidas en UI.
- **Impacto:** impide convertir el Core en estándar reutilizable y capability-driven.
- **Riesgo:** business logic en el borde de runtime experience.
- **Posibilidad metadata:** media (parámetros de evidencia/observación deberían ser contratos/capabilities).
- **Prioridad:** **Crítica**.

## 3.4 Permisos duplicados por capas
- **Evidencia:**
  - `src/components/ProtectedRoute.jsx` (route gate)
  - `src/pages/DynamicModule.jsx` (filtra forms por `roles_allowed`)
  - `src/pages/DynamicForm.jsx` (alert + redirect por `form.roles_allowed`)
  - `src/components/DocumentManager.jsx` (canManage con `isAdmin/isCalidad`)
  - `src/components/DynamicRecordsView.jsx` (isVerificador y gating adicional)
- **Descripción:** gating por roles implementado en múltiples componentes.
- **Impacto:** drift de autorización y no single responsibility.
- **Riesgo:** seguridad/consistencia y escalabilidad.
- **Prioridad:** **Alta**.

## 3.5 Navegación hardcodeada (array modules)
- **Evidencia:** `src/pages/Dashboard.jsx` → `const modules = [...]` con rutas/roles/descripciones/iconos.
- **Descripción:** el “standard navigation” no está governado por metadata/capabilities.
- **Impacto:** requiere cambios por módulo nuevo.
- **Prioridad:** **Alta**.

## 3.6 Registros/estado calculado en cliente
- **Evidencia:** `src/components/DynamicRecordsView.jsx`
  - `computedStatus` y `criticalIssues` calculados en `loadRecords()`.
- **Descripción:** clasificación operacional del estado se hace en UI.
- **Impacto:** impide migración “Core-first” hacia modelos reutilizables.
- **Prioridad:** **Alta**.

---

# FASE 4 — Reusability Audit (Reutilizable / Parcial / No reutilizable)

| Componente | Reutilizable | Parcial | No reutilizable |
|---|---|---|---|
| DynamicModule |  | ✓ |  |
| DynamicForm |  | ✓ |  |
| Runtime |  | ✓ |  |
| Metadata Engine (dynamicService) |  |  | ✓ |
| Capability Consumption (component registry) |  |  | ✓ |
| Routing |  |  | ✓ |
| Authorization |  | ✓ |  |
| Document Management |  |  | ✓ |
| Records |  |  | ✓ |
| Standard Navigation |  |  | ✓ |

**Justificación corta (según evidencia):**
- lo “Standard” (core boundary) no está gobernado por capabilities/metadata, sino por hardcodes y reglas de negocio en componentes UI.
- runtime provider existe, pero su acoplamiento con UI y reglas de validación del negocio impide reutilización completa como Core.

---

# FASE 5 — Dependency Audit (acoplamientos)

Clasificación de dependencias innecesarias observadas (de mayor a menor):

- **Supabase / esquema de tablas sgc_***
  - **Evidencia:** `src/services/dynamicService.js`, `src/services/documentsService.js`, `src/context/AuthContext.jsx`.
  - **Impacto:** dificulta despliegue sin cambiar persistencia.

- **Acoplamiento a módulos específicos en UI**
  - **Evidencia:** `DynamicModule.jsx` whitelist.

- **Acoplamiento de autorización a strings de roles y gating duplicado**
  - **Evidencia:** `ProtectedRoute.jsx`, `AuthContext.jsx`, `DynamicRecordsView.jsx`.

- **Acoplamiento de motores (engine_type) a switch**
  - **Evidencia:** `DynamicForm.jsx`.

**Niveles (bajo/medio/alto) por componente (resumen):**
- DynamicModule: **Alto** (slug whitelist + UI orchestration)
- DynamicForm: **Alto** (business rules + engine switch)
- Runtime provider: **Medio** (contratos, pero depende de form.fields; y existe wiring UI)
- Metadata/dynamicService: **Alto**
- Routing: **Medio**
- Authorization: **Medio-Alto**
- Document/Records: **Alto**
- Standard Navigation: **Alto**

---

# FASE 6 — Core Readiness Matrix (oficial)

| Área | Estado |
|---|---|
| Runtime | Partial |
| DynamicModule | Partial |
| DynamicForm | Partial |
| Metadata | No Ready |
| Authorization | Partial |
| Documents | No Ready |
| Records | No Ready |
| Routing | Partial |

**Justificación clave por estados:**
- Hay estructuras de runtime y contratos, pero el sistema completo no es metadata/capability driven: hardcodes y lógica de negocio viven en componentes UI.

---

# FASE 7 — Refactoring Candidates (solo listar, no implementar)

> Nota: este sprint requiere listar candidatos solo como diagnóstico; no se implementa.

1) **Desacoplar “repositorio habilitado por slug”**
- **Motivo:** hardcode arquitectónico en `DynamicModule.jsx`.
- **Beneficio:** convertir a metadata/capability documental.
- **Prioridad:** **Crítico**
- **Riesgo:** requiere migración de configuración por módulo.
- **Impacto sobre Core:** alto.

2) **Estandarizar engines con discovery por capability/registry**
- **Motivo:** switch `engine_type` en `DynamicForm.jsx`.
- **Beneficio:** marketplace/plugins para motores.
- **Prioridad:** **Alta**
- **Riesgo:** asegurar compatibilidad con contratos de engines.
- **Impacto sobre Core:** alto.

3) **Mover reglas de “hallazgos críticos / evidencia requerida / observación requerida”**
- **Motivo:** reglas de negocio embebidas en UI.
- **Beneficio:** frontera Core/Business y compatibilidad IA.
- **Prioridad:** **Crítico**
- **Riesgo:** requiere definir contratos de negocio.
- **Impacto sobre Core:** alto.

4) **Consolidar autorización y roles en un single layer**
- **Motivo:** gating duplicado.
- **Beneficio:** consistencia y menor drift.
- **Prioridad:** **Alta**
- **Riesgo:** regresiones en permisos.
- **Impacto sobre Core:** medio-alto.

5) **Eliminar hardcode de menú de módulos**
- **Motivo:** array estático `modules` en `Dashboard.jsx`.
- **Beneficio:** standard navigation metadata-driven.
- **Prioridad:** **Alta**
- **Riesgo:** asegurar mapping UI.
- **Impacto sobre Core:** medio.

6) **Evitar cálculo de computedStatus en cliente**
- **Motivo:** `DynamicRecordsView.jsx` hace clasificación.
- **Beneficio:** mover a contratos/capabilities de evaluación.
- **Prioridad:** **Alta**
- **Riesgo:** requiere contratos de scoring.
- **Impacto sobre Core:** medio-alto.

---

# FASE 8 — Migration Readiness (¿Trazabilidad migra al Core completamente?)

**Respuesta:** **NO** puede migrar completamente al Core en el estado actual.

### Qué falta exactamente (evidencia)
- Falta una capa declarativa que gobierne:
  - habilitación documental por capacidad
  - definición de engines y evaluación/validación (evidencia crítica)
  - clasificación operacional (computedStatus / criticalIssues)
- Hoy esas reglas viven como lógica explícita en UI:
  - `DynamicForm.jsx` (hallazgos críticos, evidencia requerida, observación obligatoria por heurística sobre nombres)
  - `DynamicRecordsView.jsx` (computedStatus y criticalIssues)
  - `DynamicModule.jsx` (slug whitelist para repositorio)

Por tanto, Trazabilidad no puede reducirse a un Business Module puro sobre Core reutilizable; requiere remover/aislar lógica de negocio embebida.

---

# FASE 9 — Implementation Roadmap (Sprint 51) (sin implementación)

## Iteración 1
- **Objetivo:** remover blockers de reutilización (hardcodes arquitectónicos de navegación/document/engine).
- **Componentes:**
  - `DynamicModule` (slug whitelist repositorio)
  - `DynamicForm` (switch de engine)
  - `Dashboard` (menú hardcodeado)
- **Riesgos:** migración de metadata existente; compatibilidad de rutas.
- **Dependencias:** definición de modelos metadata/capabilities para document/engines/navigation.

## Iteración 2
- **Objetivo:** asegurar separación Core/Business eliminando business logic embebida en UI.
- **Componentes:**
  - `DynamicForm` (hallazgos críticos / evidencia requerida)
  - `DynamicRecordsView` (computedStatus / criticalIssues / verificación)
- **Riesgos:** contratos de evaluación y evidencia.
- **Dependencias:** contratos de reglas; integración con runtime/capability model.

## Iteración 3
- **Objetivo:** consolidar Authorization.
- **Componentes:**
  - `ProtectedRoute`, `RoleGate`, `AuthContext`, y gating en DynamicModule/DynamicRecordsView/DocumentManager
- **Riesgos:** regresiones de seguridad.
- **Dependencias:** regla SSOT de autorización estándar (definición y ownership).

## Iteración 4
- **Objetivo:** cerrar readiness para AI/Plugins/Marketplace/Enterprise.
- **Componentes:**
  - Capability Consumption (convertir registry de UI atoms en registry de capabilities del Core)
  - engines/extensiones (discovery y composición)
- **Riesgos:** compatibilidad hacia contratos existentes.
- **Dependencias:** fortalecimiento Capability Registry/Resolver/Composition alignment.

---

# FASE 10 — Final Certification (dictamen oficial)

## ✓ El Core está listo para implementación
**Dictamen Sprint 50.2:** **NO** (en el sentido de “implementación funcional sin romper reutilización”).

Motivo: el sistema aún no cumple el criterio de “Core First” y “absence of business logic in Core” en la frontera; existen hardcodes arquitectónicos y business rules en componentes de UI.

## Métricas en % (aproximación por evidencia inspeccionada)
> Nota: porcentajes basados en detección cualitativa por hardcodes/acoplamientos y fronteras.

- **% reutilizable (Core reusable): ~25%**
  - existe infraestructura parcial: runtime provider/renderer base y runtime transaction contracts.
- **% requiere refactorización:** ~55%
  - por hardcodes y business rules en UI.
- **% contiene lógica de negocio:** ~60%
  - especialmente en DynamicForm/DynamicRecordsView.
- **% desacoplado:** ~30%
  - hay contratos en runtime transaction, pero el sistema end-to-end está acoplado a persistencia, reglas UI y routing.
- **% depende de hardcodes:** ~40%
  - slug whitelist, switch engines, computedStatus en cliente, modules array de navegación.
- **% preparado para IA:** ~25%
  - hay “capacidad conceptual” en contratos, pero reglas para evidencia/hallazgos no están capability-driven.
- **% preparado para Plugins:** ~20%
  - engines y navigation no son plug-in discoverable.
- **% preparado para Marketplace:** ~15% 
  - falta resolver capability-driven y governance para extensiones.
- **% preparado para Enterprise:** ~25%
  - hay arquitectura de runtime transaction contracts, pero falta boundary completa de persistencia y navegación/authorization.

---

## Certified – No refactoring required (si cumple)
En los archivos inspeccionados, **no se identificó** un componente que pueda ser declarado como *Certified – No refactoring required* de forma plena bajo las fronteras SSOT, dado que los hardcodes y business rules observados atraviesan la experiencia estándar del módulo.

---

# Resumen ejecutivo (hoja de ruta Sprint 51)

- **Core reutilizable parcial:** runtime transaction/contracts + runtime provider base existen, pero la experiencia final está gobernada por UI y hardcodes.
- **Principales blockers:**
  1) reglas de “hallazgos críticos / evidencia requerida / observación requerida” embebidas en `DynamicForm`.
  2) `DynamicRecordsView` calcula estado y criticalIssues en cliente.
  3) `DynamicModule` decide habilitación documental por slug whitelist.
  4) engines seleccionados por `switch (engine_type)`.
  5) navigation hardcodeada en `Dashboard`.

Este dictamen define que Sprint 51 debe enfocarse en convertir esas áreas en metadata/capability-driven y reforzar la frontera Core/Business según SSOT.

---

## Anexos requeridos (mínimos)

### Inventario completo del Core (según componentes auditados)
- DynamicModule, DynamicForm, Runtime, Metadata Engine (dynamicService), Capability Consumption (component registry), Routing, Authorization, Document Management, Records, Standard Navigation.

### Mapa de responsabilidades
- Observado: boundary Core/Business no está estrictamente separada en DynamicForm/DynamicRecordsView/DynamicModule (mezcla lógica UI + reglas negocio).

### Inventario de hardcodes
- whitelist slugs, switch engines, heurísticas de observación/evidencia, array modules navegación, gating duplicado por roles.

### Inventario de dependencias
- Supabase + esquema `sgc_*`, Storage bucket `documentos-sgc`, rutas con router base.

### Matriz de reutilización
- Incluida en Fase 4.

### Matriz de preparación para migración
- Incluida en Fase 8.

### Matriz de preparación para IA, Plugins, Marketplace y Enterprise
- Incluida en Fase 10 (% aproximado) y backlog implícito en Iteraciones 1-4.

### Deuda técnica identificada
- Business logic en UI, hardcodes arquitectónicos, gating duplicado, discovery de engines no capability-driven.

### Oportunidades de consolidación del Core
- Convertir habilitaciones (document/repository, engines, navigation, evaluation rules) a modelos metadata/capabilities.

### Roadmap priorizado para Sprint 51
- Iteraciones 1-4 en Fase 9.

