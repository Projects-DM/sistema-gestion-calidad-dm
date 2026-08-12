# Sprint 288 — AlertWorkspace Architectural Decision & Orphan Resolution

**Branch:** `release/stable-sprint79`
**Modo:** ARCHITECTURAL AUDIT + CONTROLLED DECISION + ORPHAN RESOLUTION
**Producción:** 0 cambios de código · 0 cambios Supabase · 0 cambios Schema · 0 cambios Configuration · 0 cambios Runtime
**SSOT:** `docs/Sprint-288.md`
**Dependencias:** Sprint 280 · 283 · 284 · 285 · 286 · 287
**Decisión:** **WORKSPACE = CONTRACTUAL (Clase B) → CONSERVAR + DOCUMENTAR**
**VERDICT: SPRINT 288 — CERTIFIED**

---

## 1. Objetivo

Resolver arquitectónicamente el hallazgo del Sprint 287 (`Workspace = PARALLEL / ORPHAN`, eliminación NO autorizada) mediante evidencia, distinguiendo: API contractual, extensión futura, factory registrada, import dinámico, dependencia indirecta, arquitectura preparada y código muerto.

## 2. Principio aplicado

```text
USED      → CONSERVAR
DEAD      → DOCUMENTAR
ORPHAN    → EVIDENCIAR → RESOLVER
UNKNOWN   → NO TOCAR
```

No se eliminó código por ausencia de consumidor visible.

## 3. Resultado de la decisión (evidencia)

```text
AlertCapability.workspace (contrato público congelado)
        │
        ▼
requestWorkspace (workspace/index.js:28)
        │
        ▼
useAlertRuntime.js:450 (runtime compone y retorna:527)
        │
        ▼
SIN CONSUMIDOR UI DE SU OUTPUT

PERO:

AlertCapability.workspace     (alert/index.js:213)
AlertCapability.workspaceBoundary (alert/index.js:214)
AlertCapability.contracts.workspace (alert/index.js:250)
= MIEMBROS DEL CONTRATO PÚBLICO CONGELADO → STOP-01 ACTIVA
```

**CLASIFICACIÓN: CLASE B — CONTRACTUAL. Acción: CONSERVAR + DOCUMENTAR. NO DELETE.**

---

## 4. F1 — Workspace Consumer Discovery

### 4.1 Símbolos auditados (grep exhaustivo sobre `src/**`)

| Símbolo | Hallazgo |
|---|---|
| `AlertWorkspaceBuilder` | Definido en `workspace/AlertWorkspaceBuilder.js`; importado por `workspace/index.js:14` y `AlertWorkspaceResolver.js:15` |
| `AlertCapability.workspace` | `alert/index.js:213` (contrato) + `useAlertRuntime.js:450` (única invocación) |
| `requestWorkspace` | `workspace/index.js:28`; importado solo por `alert/index.js:116` |
| `buildAlertWorkspaceCard` | `workspace/index.js:14,23` (re-export) + Builder |
| `buildAlertWorkspaceViewModel` | `workspace/index.js:15,24` + Resolver |
| `resolveAlertWorkspace` | `workspace/index.js:11,20` + Resolver |
| `applyAlertGroupingPolicy` / groupAlerts* | Solo dentro de `workspace/` (index + ViewModel) |
| `resolveAlertNavigation` / NAVIGATION_SPECS | Solo dentro de `workspace/` |
| `buildActionDescriptor` | Solo dentro de `workspace/` |
| `WORKSPACE_BOUNDARY` | `alert/index.js:117,214` + `workspace/index.js:17,26,89` |
| `AlertWorkspaceContract` | `alert/index.js:115,250` + `workspace/index.js` |

### 4.2 Consumidores reales del runtime

`useAlertRuntime` es consumido por exactamente 5 componentes:

| Componente | Desestructura | ¿Usa workspace? |
|---|---|---|
| `DynamicRecordsView.jsx:36` | `visibility` | NO |
| `DynamicForm.jsx:54` | `visibility` | NO |
| `Dashboard.jsx:83` | `dashboard` | NO |
| `ModuleDocumentViewer.jsx:39` | `visibility` | NO |
| `AlertMonitoringExperience.jsx:390` | `existing, occurrences` | NO |

**Ningún componente desestructura `.workspace` del hook.** El output computado en `useAlertRuntime.js:447-455` y retornado en `:527` no se renderiza.

### 4.3 Falsos positivos excluidos

- `src/components/workspace/ModuleManager.jsx` y `WorkspaceFoundation.jsx` → template UI de página de módulo, sin ninguna referencia a `AlertCapability`/`useAlertRuntime` (0 hits).
- `workspace-alert/` (paquete Sprint 204) → capa muerta con **0 importadores externos** (grep `from '...workspace-alert` = 0 hits en `src/`). **No forma parte** de la frontera `AlertCapability.workspace`; se documenta como capa separada (Sprint 283 §5.1 ya la marcó dead).
- Strings UI "alert-configuration-workspace" (data-testid) y comentarios en `AlertConfigurationPanel.jsx:35,48,337` → referencias de UI, no de código.

### 4.4 Dependencias del Builder fuera de la frontera

`AlertWorkspaceBuilder.js` importa:

| Dependencia | Ubicación | Compartida con | Estado |
|---|---|---|---|
| `buildAlertVisualDescriptor` | `runtime-visibility/AlertVisualDescriptor.js` | runtime-visibility (consumido por AlertMonitoringExperience path) | **FUERA DE FRONTERA — no tocar** |
| `resolveAlertNavigation` | `workspace/AlertNavigationResolver.js` | — | Dentro |
| `buildActionDescriptor` | `workspace/AlertWorkspaceActionDescriptor.js` | — | Dentro |
| `mapEvaluationToWorkspaceCard` | `evaluation/consumption/AlertConsumptionMapper.js` | dashboard/lifecycle/runtime-consumption/evaluation/notification/operational-actions | **FUERA DE FRONTERA — no tocar** |

---

## 5. F2 — AlertCapability Contract Audit (Q1–Q6)

`AlertCapability` (`alert/index.js:139`) es un objeto congelado: `Object.freeze({...})` que expone la identidad, boundaries y contratos certificados de la capability.

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| Q1 ¿workspace es contrato público? | **SÍ** | `AlertCapability.workspace: requestWorkspace` (`:213`), `AlertCapability.workspaceBoundary: WORKSPACE_BOUNDARY` (`:214`), `AlertCapability.contracts.workspace: AlertWorkspaceContract` (`:250`) |
| Q2 ¿Algún runtime consume workspace? | **SÍ (composición)** | `useAlertRuntime.js:450` lo invoca; retorna en `:527` |
| Q3 ¿Descubrible vía capability registry? | **SÍ** | Es propiedad directa del objeto público AlertCapability (equivalente a discovery) |
| Q4 ¿Efectos laterales? | **NO** | Puro: compone viewModel in-memory; sin persistencia/navegación/DB |
| Q5 ¿Eliminarla cambia el contrato? | **SÍ** | Quitar `workspace` + `workspaceBoundary` + `contracts.workspace` altera el objeto congelado público |
| Q6 ¿Participa realmente en runtime actual? | **Computa, no renderiza** | Se compone en cada render (memo `:447-455`) pero su output no tiene consumidor UI |

**STOP-01 ACTIVA — Workspace pertenece a contrato público vigente.**

---

## 6. F3 — AlertWorkspaceBuilder Audit

**Clasificación: PURE BUILDER.**

- Inputs: `{ alert, moduleId, entry }` → Output: tarjeta congelada.
- No estado, no side effects, no persistencia, no navegación, no DB, no React Router.
- Reutiliza descriptor visual y mapper de consumo certificados (nunca recalcula evaluación — Sprint 200).
- `AlertWorkspaceResolver` + `AlertWorkspaceViewModel` igualmente puros.

NO es OPERATIONAL COMPONENT: no participa en ejecución operacional fuera del mismo memo del runtime que lo compone sin render.

---

## 7. F4 — Workspace vs Monitoring (comparativa)

| Criterio | Workspace | AlertMonitoringExperience |
|---|---|---|
| Consume occurrences | NO (alerts del descriptor) | SÍ (occurrences proyectadas) |
| Consume real resources | NO directamente | SÍ (`existing` vía `:390`) |
| Navega recurso real | Descriptor puro (nav resolver) | SÍ (`resolveActionRoute` en `:390-403` + ACTION_ROUTE) |
| Persiste | NO | NO |
| Crea registros | NO | NO |
| Presenta alert state | viewModel cards (no renderizado) | SÍ (renderiza cards) |
| Es actualmente consumido | **NO (compone sin consumidor)** | SÍ |
| Es experiencia operacional | NO | SÍ |
| Duplica funcionalidad | PARALELO no renderizado (histórico ≤ Sprint 285) | — |

**Resultado:** Workspace = **extensión/contrato no consumido** (Clase B), NO duplicado activo. El monitor operacional real es AlertMonitoringExperience sobre OccurrenceProjection.

---

## 8. F5 — Workspace Dependency Audit

| Superficie | ¿Depende de Workspace? | Evidencia |
|---|---|---|
| Dashboard | NO | `Dashboard.jsx:83` consume `dashboard` (presentación KPI) |
| Configuration | NO | `AlertConfigurationPanel/Form` sin imports de workspace (0 hits) |
| Runtime | SÍ (composición) | `useAlertRuntime.js:450` — depende de `AlertCapability.workspace` (contrato) |
| Routers / App.jsx | NO | 0 hits de workspace en rutas/App.jsx |
| Tests | NO | No existe framework de tests; 0 refs en specs |
| Scripts | NO | 0 hits de `workspace` en `scripts/` |
| Docs | **SÍ (documental)** | `sprint-182/181/210/209/279/281/283.md` lo referencian — refs documentales, NO code dependency |
| Capabilities registries | SOLO AlertCapability | `alert/index.js:213-214,250` |

**Conclusión F5:** única dependencia de código = la invocación dentro del contrato del runtime. Sin dependencia indirecta, dinámica ni documental-obligatoria.

---

## 9. F6 — Dead / Orphan / Parallel Classification

| Clase | Criterio | Resultado |
|---|---|---|
| A USED | Consumidor real del output | NO |
| B CONTRACTUAL | Parte de contrato vigente | **SÍ** → **CONSERVAR + DOCUMENTAR** |
| C FUTURE/RESERVED | Intención demostrable | Parcial (sólo como contrato) |
| D ORPHAN | Sin contrato ni dependencia | NO (tiene contrato) |
| E UNKNOWN | Evidencia insuficiente | NO |

**CLASIFICACIÓN FINAL: CLASE B — CONTRACTUAL.**

---

## 10. F7 — Controlled Removal Gate

| Condición | Valor | Bloquea |
|---|---|---|
| consumer = 0 | TRUE (output sin consumidor) | — |
| contractual | **TRUE** | **STOP — NO DELETE** |
| dynamic-discovery | FALSE | — |
| runtime-dependency | TRUE (composición) | STOP |
| configuration-dependency | FALSE | — |
| navigation-dependency | FALSE | — |
| test-contract | FALSE (no hay tests) | — |
| architectural-reservation | TRUE (contrato congelado) | STOP |

**Gate bloqueado: la eliminación NO procede.**

---

## 11. F8–F10 — Decisiones ejecutables

- **F8 (removal):** NO aplica. La eliminación queda **prohibida**.
- **F9 (conservación):** `Workspace = RESERVED/CONTRACTUAL ARCHITECTURAL SURFACE`, conservada y documentada. **NO** se implementa integración ficticia.
- **F10 (prohibición de falsa integración):** NO se agrega `AlertMonitoringExperience → AlertWorkspaceBuilder`. La cadena operacional actual permanece:

```text
OccurrenceProjection
        ↓
AlertMonitoringExperience
        ↓
Real Resource
```

---

## 12. F11 — Tests obligatorios

| Test | Resultado |
|---|---|
| TEST 01 Consumer Discovery | **PASS** — 0 consumidores UI del output; 1 composición vía contrato (`useAlertRuntime.js:450`) |
| TEST 02 Capability Contract | **PASS** — workspace en `alert/index.js:213-214,250` (contrato activo) |
| TEST 03 Runtime Isolation | **PASS** — runtime compone workspace; ningún consumidor del hook depende de su output (5/5 verificado) |
| TEST 04 Monitoring Isolation | **PASS** — `AlertMonitoringExperience.jsx:390` solo `existing, occurrences` |
| TEST 05 Completion Isolation | **PASS** — `CompletionBridge`/`OccurrenceLedger` sin refs a workspace (0 hits) |
| TEST 06 Configuration Isolation | **PASS** — `AlertConfigurationResolver`/Panel/Form sin refs (0 hits) |
| TEST 07 Navigation Isolation | **PASS** — rutas/App.jsx/route resolvers sin workspace (0 hits) |
| TEST 08 DynamicForm Regression | **PASS** — `DynamicForm.jsx:54` consume `visibility` (recurso real intacto) |
| TEST 09 Repository Regression | **PASS** — `ModuleDocumentViewer.jsx:39` consume `visibility` (recurso real intacto) |
| TEST 10 Build (`npm run build`) | **PASS** — 2930 módulos transformados, build 2.60s, sin errores |

---

## 13. F12 — Regression Contracts

| Contract | Resultado |
|---|---|
| Sprint 284 — Canonical Alert Identity (21 checks) | **21/21 PASS** (TEST 01:5/5, 02:4/4, 03:3/3, 04:3/3, 05:2/2, 06:4/4) |
| Sprint 280 A/B/C isolation | **PASS** — TEST 03: A COMPLETED, B pending, C pending; TEST 04: B COMPLETED, A/C unchanged (sin contaminación) |

---

## 14. Acceptance Criteria

| AC | Criterio | Estado |
|---|---|---|
| AC-01 | Workspace consumer audit completo | **PASS** |
| AC-02 | AlertCapability contract audit completo | **PASS** |
| AC-03 | AlertWorkspaceBuilder audit (PURE BUILDER) | **PASS** |
| AC-04 | Dynamic/runtime dependencies auditadas | **PASS** |
| AC-05 | Navigation dependency auditada (0) | **PASS** |
| AC-06 | Configuration dependency auditada (0) | **PASS** |
| AC-07 | Completion dependency auditada (0) | **PASS** |
| AC-08 | Workspace vs Monitoring clasificado | **PASS** |
| AC-09 | Dead/Orphan/Contractual classification | **PASS** → Clase B |
| AC-10 | No eliminación especulativa | **PASS** |
| AC-11 | No integración artificial | **PASS** |
| AC-12 | No nueva persistencia | **PASS** |
| AC-13 | No nuevo EventBus | **PASS** |
| AC-14 | No nuevo Store | **PASS** |
| AC-15 | No cambio de Configuration | **PASS** |
| AC-16 | No cambio de Runtime | **PASS** |
| AC-17 | No cambio de Completion | **PASS** |
| AC-18 | No cambio de Repository → Category | **PASS** |
| AC-19 | DynamicForm intacto | **PASS** |
| AC-20 | Repository intacto | **PASS** |
| AC-21 | AlertMonitoringExperience intacto | **PASS** |
| AC-22 | Sprint 284 contract intacto | **PASS** (21/21) |
| AC-23 | Sprint 280 isolation intacto | **PASS** |
| AC-24 | Build exitoso | **PASS** |
| AC-25 | Decisión Workspace respaldada por evidencia | **PASS** |

---

## 15. STOP Conditions (resultado)

| STOP | Estado |
|---|---|
| STOP-01 (contrato público vigente) | **ACTIVA → bloquea delete** |
| STOP-02 (consumidor indirecto/dynamic) | INACTIVA |
| STOP-03 (registry/factory/runtime discovery) | Activa parcial (única vía: contrato AlertCapability) |
| STOP-04 (dependencia Configuration) | INACTIVA |
| STOP-05 (dependencia Completion) | INACTIVA |
| STOP-06 (dependencia Navigation) | INACTIVA |
| STOP-07 (cambio de contrato AlertCapability) | **ACTIVA → bloquea delete** |
| STOP-08 (ORPHAN vs RESERVED indistinguible) | INACTIVA (contrato categórico) |

---

## 16. Veredicto

```text
┌──────────────────────────────────────┐
│ ALERT WORKSPACE DECISION             │
├──────────────────────────────────────┤
│ USED          → KEEP                 │
│ CONTRACTUAL   → KEEP + DOCUMENT  ◄── │
│ RESERVED      → KEEP / JUSTIFY       │
│ ORPHAN        → CONTROLLED REMOVE    │
│ UNKNOWN       → STOP                 │
└──────────────────────────────────────┘
```

**SPRINT 288 — CERTIFIED**

- Workspace es **CLASE B — CONTRACTUAL** (miembro del objeto público congelado AlertCapability + contract `alert.workspace` + boundary).
- **Conservado y documentado como RESERVED ARCHITECTURAL SURFACE. No se elimina. No se integra artificialmente.**
- Cadena operacional certificada intacta (Projection → Monitoring → Real Resource → Completion).
- 0 cambios de código, 0 cambios de configuración, 0 cambios de persistencia.

---

## 17. Roadmap (provisional, no certificado aquí)

```text
288 → Workspace retained/documented (CERTIFIED)
289 → Dashboard KPI Consolidation (fuentes paralelas KPI — Sprint 287 F12)
290 → Repository → Category Re-Anchoring (STOP-01/02/03 de Sprint 287; requiere evidencia adicional)
```

Los números posteriores no quedan certificados por este documento.