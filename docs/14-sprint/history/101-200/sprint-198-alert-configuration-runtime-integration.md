# Sprint 198 — Alert Configuration Runtime Integration Refinement (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — ALERT CONFIGURATION RUNTIME INTEGRATION
- **Type:** Runtime Refinement · Metadata Consumption · SSOT Integration
- **Impact:** Alert Capability · Runtime Binding (integration point) · AlertConfigurationResolver
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Resultado esperado:** El Runtime consume la metadata certificada en Sprint 197 sin alterar la arquitectura ni introducir motores paralelos.

---

## 1. Principio aplicado

> **Toda decisión del Runtime proviene únicamente de: Metadata → AlertConfigurationResolver → Runtime Binding → Alert Runtime. No existe ruta alternativa.**

```
Antes:
  Resource → Runtime Binding → Regla hardcodeada

Después:
  Resource → AlertConfigurationResolver → MetadataNormalizer
         → Configuration → Runtime Binding → AlertRuleDescriptor
```

El Runtime **nunca conoce** formularios especiales, módulos especiales, reglas codificadas ni prioridades codificadas. La prioridad deriva **exclusivamente** de `configuration.priority` (decisión: **metadata estricta** — recurso sin metadata → default `medium`; Sprint 199 reintroducirá la severidad vía modelo de riesgo).

## 2. Cambios (punto mínimo de integración)

| Archivo | Cambio |
|---|---|
| `src/hooks/useAlertRuntime.js` | **Único archivo de código modificado.** `deriveRulesFromBinding()` ahora consume **exclusivamente** `resolveResourceAlertConfiguration(resource)` (importado de `operational-configuration/index.js`). Nuevo helper `resolveResourceForAlert()` localiza el recurso dueño de la metadata: formulario (forms), formulario padre (records), repositorio (documents). |

Detalle de `deriveRulesFromBinding`:

- **enabled** → `configuration.enabled`; si `false`, el recurso **no produce regla** (ni descriptor, ni alerta; no llega al Dashboard ni al Workspace).
- **priority / priorityLabel** → `configuration.priority` + `PRIORITY_LABELS`. Eliminadas las derivaciones `critico→critical`, `BaseMediciones→high`, `status→priority`.
- **repeatPolicy / automaticClose / notification / gracePeriod** → transportados desde `configuration.*` en cada regla.
- **active** → `configuration.enabled` (nunca `active: true` forzado).
- **message** → únicamente identidad real del recurso (transport, no configuración).
- **prioritySource** → `'default' | 'metadata'` (procedencia del Resolver).

**No modificado:** Runtime Engine, Binding Engine, Visibility, Consumption, Assignment, Capability Resolver, Dashboard.jsx, AlertMonitoringExperience, Repository Runtime, Dynamic Forms, Dynamic Records, AlertRuleDescriptor, AlertPriorityPolicy, AlertConfigurationContract, Resolver de config (Sprint 197).
**No creado:** motores/resolvers paralelos, stores, context, scheduler, cron, polling.

## 3. Fuente de la metadata (SSOT)

- `resolveResourceForAlert` entrega el recurso **crudo** (del estado `existing` del hook — NO del snapshot recolectado, que normaliza y descarta metadata) al Resolver.
- **Nunca** se lee `resource.alertConfiguration` / `resource.alert_config` desde el Runtime (verificado por inspección de código).
- Los formularios viajan desde `getFormsByModule` (sin columna `alert_config` aún → default); los repositorios viajan con passthrough de Sprint 197 (`mapRepositoryRow`).

## 4. Cambio de comportamiento consciente

Por decisión (metadata estricta), un recurso **sin metadata** resuelve a la configuración default completa: `priority: 'medium'`. Esto normaliza las prioridades que antes se derivaban de datos de runtime (registro crítico, formulario BaseMediciones). La severidad dinámica regresa en Sprint 199 vía el modelo de riesgo (metadata `risk`).

## 5. Certificación

- Suite: `sprint-198-alert-configuration-runtime-integration-certification.mjs` → **I1–I13 PASS**:
  - I1 único consumo del Resolver · I2 default completo · I3 `enabled=false` elimina regla · I4 prioridad desde metadata · I5 sin severidad derivada · I6 registro hereda config del formulario · I7 documento hereda config del repositorio · I8 `active` desde config · I9 sin prioridades/forms hardcodeados · I10 pipeline descriptor/workspace/dashboard · I11 repeatPolicy/automaticClose/notification/gracePeriod transportados · I12 disabled no llega a descriptor · I13 sin motores paralelos.
- Regresiones: Sprint 185–190 (B/F/N/R/C/D) + Sprint 195 (Q1–Q11) + Sprint 197 (P1–P13, P9 actualizado a invariante de continuidad) **PASS**.
- Build: `npm run build` **PASS** (2.49s).

## 6. Preparado para Sprint 199

La infraestructura queda lista: `Sprint 199` implementará cálculo de vencimiento/periodicidad/riesgo (metadata `risk` + `periodicity` + `expiration`) sin rediseñar el modelo — el Runtime ya consume `resolveResourceAlertConfiguration` y la regla ya transporta `repeatPolicy`, `automaticClose`, `notification`, `gracePeriod`.
