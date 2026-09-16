# Sprint 200 — Alert Consumption Layer Integration Certification (LEVEL 5)

- **Architecture Status:** LEVEL 5 — ALERT CAPABILITY CONSUMPTION CERTIFIED
- **Type:** Consumption Layer Integration · Evaluation → Dashboard/Workspace/Forms/Records/Repository
- **Impact:** Capa de consumo del Alert Capability (4 adapters + provider + workspace + submodulo `evaluation/consumption/`)
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Resultado esperado:** Certificar que el Alert Capability consume estado operacional REAL producido por el Evaluation Engine, y que ningún consumidor deriva/recalcula estado desde las reglas del descriptor.

---

## 1. Objetivo

Cerrar la cadena `Runtime → Evaluation Engine → Consumption`. Hasta Sprint 199.R3 el Engine producía `{ descriptor, evaluation }`, pero los consumidores (Dashboard, Workspace, Dynamic Forms, Dynamic Records, Document Repository) seguían derivando badges/estados/métricas desde `configurationDescriptor.alerts` (prioridad/estado/icono desde reglas). Sprint 200 integra la capa de consumo con la evaluación: **todos los estados consumidos provienen EXCLUSIVAMENTE de `evaluation.status/severity/remaining/nextDue/transition/escalation/overdue`**, y queda **prohibido recalcular riesgo/severidad/vencimientos/prioridades en consumo**.

## 2. Contrato único de consumo

```
Runtime Context (rules) → requestRuntimeConsumption
        ↓
configurationDescriptor  (SSOT, intacto, sin estados)
evaluationEntries        ( [{ descriptor, evaluation } ... ] )   ← CONTRATO ÚNICO
        ↓
AlertConsumptionMapper   (solo adapta)
        ↓
Consumption DTO  →  dynamicForms · dynamicRecords · documentRepository · dashboard · workspace
```

Ningún consumidor interpreta `AlertRuleDescriptor`: el descriptor se usa solo como identidad de display (message/priority/label). El estado es siempre el Value Object `evaluation` ya computado.

## 3. Nuevos componentes

- `evaluation/consumption/AlertConsumptionContract.js` — contrato del layer (`input: { descriptor, evaluation }`, consumidores, campos fuente, passthrough, `never`).
- `evaluation/consumption/AlertConsumptionMapper.js` — adaptador puro: `mapEvaluationToConsumption`, `mapEvaluationsToDashboardMetrics`, `mapEvaluationToWorkspaceCard`, `buildConsumptionEntry`, `resolveConsumptionVisual`. Nunca calcula ni invoca al Engine.
- `evaluation/consumption/index.js` — frontera pública del submodulo.

## 4. Integración del Consumption (`runtime-consumption/index.js`)

`requestRuntimeConsumption` ahora:
1. Construye el `configurationDescriptor` (SSOT, sin cambios de contrato).
2. Construye `evaluationEntries` a partir de `request.rules` usando SOLO la API pública (`buildAlertRuleDescriptor` + `createAlertConfiguration` + `evaluateAlert`).
3. Entrega `evaluationEntries` a los 4 consumidores y los expone en el resultado.
4. `runtimeContext` (con `now`) se transporta desde el request; el Consumption jamás computa tiempo.

## 5. Consumidores actualizados

| Consumidor | Antes (prohibido) | Ahora |
|---|---|---|
| Dynamic Forms | status/icono desde `descriptorAlert.priority` | `evaluation.status/severity/remaining/nextDue/transition/escalation` |
| Dynamic Records | status desde priority + `expiryInDays` | `evaluation.status/severity/remaining/nextDue/transition/escalation` |
| Document Repository | status desde priority + `expiryInDays <= 5` | `evaluation.nextDue/remaining/overdue` + status/severity |
| Dashboard | métricas contando `descriptor.alerts` por prioridad | `mapEvaluationsToDashboardMetrics` (solo agrega estados ya computados) |
| Alert Workspace | card con `alert.status` (de prioridad) | `mapEvaluationToWorkspaceCard` (estado/severity/visual desde evaluation) |

El fallback sin evaluación es un estado NEUTRO (`NORMAL/green`, sin vencimientos calculados).

## 6. Restricciones respetadas

- Prohibido modificar: Runtime Binding, `useAlertRuntime`, `AlertConfigurationResolver`, `MetadataNormalizer`, `AlertConfiguration`, Engine, Strategy/Policy Resolvers, Strategies/Policies, `AlertRuleDescriptor`. **Ninguno fue tocado.**
- Consumo sin temporal: ningún archivo de `runtime-consumption/` ni del Mapper usa `Date.now/new Date/moment/dayjs`, ni schedulers, ni `expiryInDays`.
- Sin motores paralelos ni stores.

## 7. Certificación

Suite: `sprint-200-consumption-layer-integration-certification.mjs` → **C1–C14 PASS** (build 2.59s PASS).

| Item | Estado |
|---|---|
| Contrato único `{ descriptor, evaluation }` | ✅ |
| Evaluation → Forms / Records / Repository | ✅ |
| Repository usa nextDue/remaining/overdue | ✅ |
| Dashboard agrega solo evaluations | ✅ |
| Workspace consume evaluation | ✅ |
| Descriptor inmutable; consumidores sin interpretación | ✅ |
| Consumo sin temporal / sin recálculo | ✅ |
| Capas congeladas intactas | ✅ |
| Build PASS | ✅ |

Regresiones PASS: Sprint 197 (P1–P13), 198 (I1–I13), 198.R2 (B1–B8), 199 (J1–J12), 199.R (K1–K10), 199.R2 (M1–M10, con M6 actualizado al nuevo grafo), 199.R3 (N1–N8), 187 (N1–N8).

## 8. Nota de evolución

El único cambio en una suite de regresión fue **M6** (199.R2): la aserción original exigía que Consumption no importara `evaluation/`; Sprint 200 abre deliberadamente esa dependencia, limitándola a la **superficie de consumo certificada** (`evaluation/consumption/AlertConsumptionMapper.js`), manteniendo la prohibición de importar internos del Engine. El wiring del hook (`useAlertRuntime`, congelado) alimentará `runtimeContext.now` y `evaluationEntries` al Workspace/Dashboard en un sprint posterior sin tocar las capas certificadas.

## 9. FINAL CERTIFICATION

**LEVEL 5 — ALERT CAPABILITY · RUNTIME CERTIFIED · ENGINE CERTIFIED · PIPELINE CERTIFIED · BOUNDARIES CERTIFIED · PUBLIC API CERTIFIED · CONSUMPTION LAYER CERTIFIED**
