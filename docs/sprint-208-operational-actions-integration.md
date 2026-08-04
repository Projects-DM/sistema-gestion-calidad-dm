# Sprint 208 — Alert Operational Actions Integration (MASTER SSOT LEVEL 5)

- **Architecture Status:** LEVEL 5 — ALERT CAPABILITY · OPERATIONAL ACTIONS INTEGRATION
- **Type:** Operational Interaction Integration · User Action Pipeline · Controlled Runtime Interaction
- **Impact:** Operational Actions Layer únicamente (sin modificar Runtime, Evaluation Engine, Consumption Layer, Dashboard, Workspace, Notification, Lifecycle, Runtime Wiring ni Runtime Activation)
- **Branch:** `release/stable-sprint79`
- **Date:** 2026-08-03

---

## 1. Objetivo

Incorporar oficialmente las acciones operacionales que los usuarios pueden ejecutar sobre una alerta. A partir de este Sprint el usuario podrá interactuar con una alerta operacional mediante un pipeline completamente desacoplado y certificado. Las acciones no modifican el Runtime; únicamente generan solicitudes operacionales.

## 2. Principio arquitectónico

Las acciones operacionales jamás modifican directamente una alerta. Nunca modifican Runtime, nunca modifican Evaluation, nunca modifican Consumption. Únicamente producen Operational Action Requests.

## 3. Pipeline certificado

```
Metadata
      ↓
Runtime
      ↓
Evaluation Engine
      ↓
Consumption Layer
      ↓
Operational Actions
      ↓
Action Adapter
      ↓
Action Persistence
```

No existen rutas alternativas.

## 4. Componentes nuevos

| Componente | Responsabilidad |
|---|---|
| `AlertOperationalActionProvider` | Consume únicamente Consumption Entries certificados. |
| `AlertOperationalActionAdapter` | Convierte Consumption Entry + User Action → Operational Action Request. |
| `AlertOperationalActionBoundary` | Declara oficialmente la frontera Consumption → Operational Actions. |
| `AlertOperationalActionContract` | Contrato oficial Consumption Entry → Operational Action Request. |

## 5. Acciones certificadas

Únicamente se certifican las siguientes acciones operacionales: `ACKNOWLEDGE`, `DISMISS`, `POSTPONE`, `RESOLVE`, `REOPEN`, `ESCALATE`. No se certifican nuevas acciones fuera de este conjunto.

## 6. Información permitida

Operational Actions consume únicamente: `descriptor.id`, `descriptor.message`, `evaluation.status`, `evaluation.severity`, `evaluation.remaining`, `evaluation.transition`, `evaluation.nextDue`, `evaluation.escalation`, más el intent del usuario transportado (`action`, `performedBy`, `timestamp`, `comment`, `reason`).

Nunca: `Runtime`, `Metadata`, `Strategy`, `Policy`, `Resolver`, `AlertConfiguration`, `AlertTemporalState`.

## 7. Operational Action Request

El único objeto permitido:

```json
{
  "alertId": "...",
  "action": "ACKNOWLEDGE",
  "performedBy": "...",
  "timestamp": "...",
  "comment": "...",
  "reason": "..."
}
```

Nunca: `Runtime`, `RuntimeContext`, `Metadata`, `AlertConfiguration`, `Strategy`, `Policy`, `AlertEvaluation`.

## 8. Responsabilidades

- Operational Action Provider → produce únicamente Consumption Entries. Nunca Runtime, Evaluation o Metadata.
- Operational Action Adapter → produce únicamente Operational Action Requests. Nunca AlertEvaluation, Runtime o Strategy. `performedBy`/`timestamp` son transportados, nunca generados.
- Persistence → únicamente almacena solicitudes operacionales. Nunca modifica Runtime, Consumption o Lifecycle.

## 9. Invariantes

- Operational Actions nunca importa Runtime.
- Nunca importa Runtime Wiring.
- Nunca importa Runtime Activation.
- Nunca importa Evaluation Engine.
- Nunca importa Metadata.
- Nunca importa Resolver.
- Consume únicamente Consumption.
- AlertEvaluation permanece completamente inmutable.
- Produce únicamente Operational Action Requests.

## 10. Restricciones

Prohibido: `Runtime Action Engine`, `Operational Runtime`, `Action Strategy`, `Action Policy`, `Scheduler nuevo`, `Polling nuevo`, `Event Bus nuevo`, `Context nuevo`, `Store nuevo`, `Runtime paralelo`. Existe un único flujo: `Consumption ↓ Operational Actions`.

## 11. Definition of Done

- Operational Actions consume únicamente Consumption Layer ✅
- No existen cálculos dentro de Operational Actions ✅
- No existen dependencias hacia Runtime ✅
- AlertEvaluation permanece inmutable ✅
- Operational Actions genera únicamente Operational Action Requests ✅
- Build PASS ✅
- Regresiones PASS ✅

## 12. Certificación

Suite: `sprint-208-operational-actions-certification.mjs` → **OA1–OA12 PASS** (build 2.53s PASS).

| Ítem | Estado |
|---|---|
| Operational Action Provider | ✅ |
| Operational Action Adapter | ✅ |
| Operational Action Boundary | ✅ |
| Operational Action Contract | ✅ |
| Consume únicamente Consumption | ✅ |
| Sin dependencia a Runtime | ✅ |
| Sin dependencia a Engine | ✅ |
| AlertEvaluation inmutable | ✅ |
| Operational Action Requests únicamente | ✅ |
| Persistencia desacoplada | ✅ |
| Build PASS | ✅ |
| Regresiones PASS | ✅ |

## 13. Regresiones

PASS (verificado): Sprint 202, 202.R, 202.R2, 203, 204, 204.R, 205, 206, 207. Sin modificaciones sobre Runtime, Runtime Wiring, Runtime Activation, Execution, Consumption Layer, Dashboard, Workspace, Notification, Lifecycle, Operational Experience.

## 14. Componentes congelados

`AlertOperationalActionProvider`, `AlertOperationalActionAdapter`, `AlertOperationalActionBoundary`, `AlertOperationalActionContract`, `operational-actions/index.js`. Los Sprints posteriores no podrán modificar su responsabilidad arquitectónica.

## 15. Operational Actions Boundary Certification

```
Consumption Layer
        │
        ▼
AlertOperationalActionProvider
        │
        ▼
AlertOperationalActionAdapter
        │
        ▼
Operational Action Persistence
```

Frontera certificada: Operational Actions únicamente conoce la Consumption Layer mediante `AlertOperationalActionProvider`. Nunca cruza hacia: `Runtime`, `Runtime Wiring`, `Runtime Activation`, `Evaluation Engine`, `Metadata`, `Resolver`, `Notification`, `Dashboard`, `Workspace`, `Lifecycle`.

Dependency Rule certificada:

```
Consumption
      ↓
Operational Action Provider
      ↓
Operational Action Adapter
      ↓
Operational Action Persistence
```

Nunca: `Persistence → Runtime`, `Persistence → Consumption`, `Adapter → Runtime`, `Provider → Evaluation Engine`, `Provider → Metadata`. Open/Closed: solo se agregan nuevas acciones certificadas al conjunto declarativo; nunca se agregan Engines, Providers nuevos, Runtime paralelo, Strategy o Policy.

## 16. Architecture Freeze

Quedan congelados: `AlertOperationalActionProvider`, `AlertOperationalActionAdapter`, `AlertOperationalActionBoundary`, `AlertOperationalActionContract`, `operational-actions/index.js`.

## 17. FINAL CERTIFICATION

**LEVEL 5 — ALERT CAPABILITY · OPERATIONAL ACTIONS INTEGRATED · OPERATIONAL ACTION REQUEST CERTIFIED · CONSUMPTION BOUNDARY CERTIFIED · USER INTERACTION PIPELINE CERTIFIED · RUNTIME LAYERS UNTOUCHED · ARCHITECTURE STABILIZED**

## Estado del roadmap

Con este Sprint 208 queda construido el ciclo operativo completo del módulo de alertas: ✅ Configuración · ✅ Runtime · ✅ Wiring · ✅ Activación · ✅ Workspace · ✅ Dashboard · ✅ Notificaciones · ✅ Lifecycle (histórico) · ✅ Acciones operacionales (interacción del usuario).