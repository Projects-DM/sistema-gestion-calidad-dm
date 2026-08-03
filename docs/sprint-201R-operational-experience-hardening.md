# Sprint 201.R — Alert Configuration Operational Experience Hardening (LEVEL 5)

- **Architecture Status:** LEVEL 5 — ALERT CAPABILITY · OPERATIONAL EXPERIENCE HARDENED · PERSISTENCE BOUNDARY CERTIFIED
- **Type:** Application Layer Hardening · Persistence Boundary · Operational Experience Stabilization
- **Impact:** Alert Configuration Application Layer · Operational Experience · Persistence Boundary
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-03
- **Resultado esperado:** Desacoplar completamente la experiencia administrativa de la infraestructura de persistencia mediante un puerto oficial de persistencia (Persistence Port), dejando la UI preparada para soportar cualquier recurso configurable sin modificaciones futuras.

---

## 1. Objetivo

Fortalecer la arquitectura de la experiencia administrativa implementada en Sprint 201. El objetivo NO es agregar funcionalidad, sino garantizar que toda la experiencia operacional cumpla el mismo nivel de desacoplamiento certificado que ya poseen Runtime, Evaluation Engine, Consumption Layer y Alert Configuration Resolver.

La experiencia administrativa deja de conocer **dónde ni cómo** se persiste la configuración.

## 2. Principio arquitectónico

```
Alert Configuration UI
        │
        ▼
AlertConfigurationApplicationService
        │
        ▼
AlertConfigurationPersistencePort
        │
        ▼
Persistence Adapter
        │
        ├──────────────► dynamicService (Forms)
        │
        └──────────────► documentRepositoriesService (Document Repositories)
```

Toda decisión de infraestructura queda encapsulada dentro del Adapter.

## 3. Problema detectado

En Sprint 201 el Application Service orquestaba la lógica de negocio correctamente, pero la **UI seleccionaba el adaptador de persistencia por tipo de recurso** (`formAlertConfigurationPersistence` vs `repositoryAlertConfigurationPersistence`) y cada adaptador guardaba `if(resourceKind === …)`. Eso acoplaba la capa de presentación a la infraestructura y rompía parcialmente la Dependency Rule.

## 4. Componentes nuevos / modificados

### Core (capa de aplicación, `operational-configuration/`)
- **`AlertConfigurationPersistencePort.js`** (NUEVO) — contrato puro `Object.freeze`. Define las DOS operaciones `loadConfiguration(resourceReference)` y `saveConfiguration(resourceReference, configuration)`, más el predicate `hasAlert…PersistencePort`. NO contiene implementación, NO importa servicios, bases de datos, SQL ni Runtime. Expone la constant (`PERSISTENCE_PORT_OPERATIONS`, `ALERT_CONFIGURATION_PERSISTENCE_PORT`).
- **`AlertConfigurationApplicationService.js`** (REFACTOR) — desaparecen por completo los imports de la infraestructura. El servicio conoce únicamente el Port. Añade `loadConfiguration(resourceReference)` y `saveConfiguration({ resource, formState })`. Se conserva `save({resourceKind, resourceId, formState})` como superficie de retro-compatibilidad (certificación Sprint 201 / O5).

### Experiencia + infraestructura (`src/modules/experiences/`)
- **`AlertConfigurationPersistenceAdapter.js`** (NUEVO) — el ÚNICO implementador del Port y el ÚNICO componente autorizado para conocer `dynamicService` / `documentRepositoriesService`. Resuelve el backend mediante un **registry de handlers** (open/closed): un recurso con `module_id` → `forms`; con `module_slug` → `repository`. Agregar un recurso configurable nuevo (Equipos, Activos, Procesos, …) = registrar un handler aquí, sin tocar UI / Panel / Form / App Service.
- **`AlertConfigurationPanel.jsx`** (REFACTOR) — solo conoce el `AlertConfigurationApplicationService`. El guardado pasa por `saveConfiguration({ resource, formState })`, sin `resourceKind` ni selección de adaptador.
- **`Configuration.jsx`** / **`DocumentRepositoriesAdmin.jsx`** (WIRING) — ambos inyectan el MISMO `alertConfigurationPersistence` (adapter único) en el panel; ya no eligen adaptador por tipo de recurso.

> Nota de compatibilidad: se conserva `src/modules/experiences/alertConfigurationPersistence.js` (adaptadores de Sprint 201) íntegro para no romper las certificaciones 201 (O1/O5/O8). El flujo operacional nuevo usa `AlertConfigurationPersistenceAdapter`.

## 5. Contrato certificado del Port

| Operación | Firma | Responsabilidad |
|---|---|---|
| `loadConfiguration` | `(resourceReference)` → `{ accepted, backend, reference }` | Reconocer/rutea un recurso al hub de persistencia |
| `saveConfiguration` | `(resourceReference, configuration)` → `{ reference, configuration, backend, row }` | Persistir metadata canónica a través del hub |

El Port nunca expone la selección; la resolución es interna del Adapter.

## 6. Responsabilidades certificadas

| Capa | Produce | Nunca |
|---|---|---|
| UI | interacción | persistencia |
| Application Service | orquestación | infraestructura |
| Persistence Port | contrato | implementación |
| Persistence Adapter | adaptación | negocio |
| Infrastructure | almacenamiento | reglas |

## 7. Restricciones respetadas

- Prohibido: `if(resourceType === ...)`/`switch(resourceKind)` en UI/App, acceso directo de UI o App Service a servicios concretos.
- Toda selección de infraestructura pertenece exclusivamente al Adapter.
- **No se modificó** capas congeladas: `AlertConfigurationResolver`, `MetadataNormalizer`, `AlertConfiguration`, `DefaultAlertConfigurationProvider`, Runtime Binding, `useAlertRuntime`, `AlertEvaluationEngine`, estrategias/políticas, `AlertDashboardDataProvider`, Workspace, Consumption Layer, `AlertRuleDescriptor`. Verificable por `git diff` (solo los 4 archivos de la experiencia + 2 nuevos).

## 8. Certificación

Suite: `sprint-201R-operational-experience-hardening-certification.mjs` → **QA1–QA9 PASS** (adyacente BUILD PASS).

| Ítem | Estado |
|---|---|
| Un único Persistence Port (contrato puro) | ✅ |
| Un único Persistence Adapter (único dueño de infra) | ✅ |
| Application Service desacoplado (solo Port) | ✅ |
| UI desacoplada de infraestructura | ✅ |
| Sin `import` de servicios en UI | ✅ |
| Sin `import` de infraestructura en App Service | ✅ |
| Dependency Rule respetada | ✅ |
| Open/Closed fortalecido (registry de handlers) | ✅ |
| Build PASS | ✅ |

## 9. Regresiones

TODAS PASS (verificado):

- Sprint 197 (P1–P13)
- Sprint 198 (I1–I13)
- Sprint 198.R (H1–H10)
- Sprint 198.R2 (B1–B8)
- Sprint 199 (J1–J12)
- Sprint 199.R (K1–K10)
- Sprint 199.R2 (M1–M10)
- Sprint 199.R3 (N1–N8)
- Sprint 200 (C1–C14)
- Sprint 201 (O1–O9)

## 10. FINAL CERTIFICATION

**LEVEL 5 — ALERT CAPABILITY · RUNTIME CERTIFIED · ENGINE CERTIFIED · PIPELINE CERTIFIED · PUBLIC API CERTIFIED · CONSUMPTION LAYER CERTIFIED · OPERATIONAL EXPERIENCE CERTIFIED · APPLICATION LAYER HARDENED · PERSISTENCE BOUNDARY CERTIFIED**