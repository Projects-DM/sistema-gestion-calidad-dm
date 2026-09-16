# Sprint 289 — Dashboard Alert KPI Consolidation & Source Authority Certification

**Branch:** `release/stable-sprint79`
**Modo:** ARCHITECTURAL IMPLEMENTATION + DATA-SOURCE CONSOLIDATION + CERTIFICATION
**Producción:** 2 archivos (`AlertDashboardDataProvider.js`, `useAlertRuntime.js`) + 1 script de certificación. 0 cambios en Configuration, Persistence, Schema, Scheduler, Completion, OccurrenceLifecycle o Workspace.
**SSOT:** `docs/Sprint-289.md`
**Dependencias:** Sprint 280 · 284 · 285 · 286 · 287 · 288
**VERDICT: SPRINT 289 — CERTIFIED**

---

## 1. Objetivo

Eliminar la divergencia de fuente del KPI **"Alertas Activas"** detectada en Sprint 287: el Dashboard contaba el número de reglas evaluadas (`evaluationEntries.length`), ignorando el estado de completion; el monitor operacional clasifica occurrences proyectadas (OccurrenceProjection + Lifecycle + Ledger). Se consolida en **UNA autoridad de alertas**.

## 2. Arquitectura antes/después

### ANTES (divergencia)

```text
Dashboard.jsx
   ├─ useDashboardMetrics → metrics de registros (SIN alertas)
   └─ useAlertRuntime.alertDashboard.metrics
         └─ AlertDashboardDataProvider
               └─ mapEvaluationsToDashboardMetrics(entries)
                     └─ activeAlerts = entries.length   ← cuenta CONFIGURACIONES,
                                                            ignora COMPLETED
```

### DESPUÉS (consolidada)

```text
Dashboard.jsx
   └─ useAlertRuntime.alertDashboard.metrics
         └─ AlertDashboardDataProvider
               ├─ activeAlerts ← countActiveOccurrences(occurrences)
               │     └─ AlertCapability.occurrences
               │           └─ OccurrenceProjection + OccurrenceLifecycle + Ledger
               │              (MISMO estado que consume AlertMonitoringExperience)
               └─ criticalAlerts/expiringDocuments/pendingActions ← evaluation entries
```

Regla: **ONE ALERT AUTHORITY** — el KPI es una proyección resumida del mismo estado operacional certificado.

---

## 3. F1 — Dashboard Data-Source Discovery

| Símbolo | Ubicación | Resultado |
|---|---|---|
| `useDashboardMetrics` | `src/modules/dashboard/hooks/useDashboardMetrics.js` | Métricas de **registros** (totalRecords/today/pending/approved/rejected/critical) desde `dashboardService.getRawResponses`. **NO produce alertas.** |
| `AlertDashboardDataProvider` | `runtime-consumption/AlertDashboardDataProvider.js` | Provider del Dashboard (Sprint 180/200) — provee `alertMetrics` |
| `alertMetrics` | `Dashboard.jsx:87` = `alertDashboard?.metrics` (de `useAlertRuntime.dashboard`) | Consumidor real del KPI |
| `activeAlerts` | `Dashboard.jsx:303` (`label="Alertas Activas"`) | KPI objetivo |
| `alertasActivas` | `dynamicService.js:366` (`getDashboardStats`) | Placeholder hardcodeado = 0. **Sin consumidores** (0 hits) |
| `DashboardAlertProvider/Adapter` | `dashboard-alert/` (Sprint 205) | **Dead code** — self-contained, 0 importadores externos |

**Hallazgo F1:** `useDashboardMetrics` NO es fuente paralela de alertas (es métricas de calidad de registros). No requiere migración.

## 4. F2 — useAlertRuntime Authority Audit (Q1–Q6)

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| Q1 ¿alertMetrics proviene de occurrences? | **ANTES: NO.** El provider contaba `evaluationEntries.length`. **AHORA: SÍ** — `dashboard` recibe `occurrences` (memo `useAlertRuntime.js:447-455`) y `activeAlerts = countActiveOccurrences(occurrences)` | `AlertDashboardDataProvider.js:120-122` |
| Q2 ¿usa el mismo completion certificado? | **SÍ** — `classifyOccurrence` (OccurrenceLifecycle) con precedence `COMPLETED`/`CANCELLED` sobre la proyección que ya carga `completion.signalKey` del ledger | `OccurrenceLifecycle.js:48-67` |
| Q3 ¿recalcula ventanas temporales? | **NO** — consume `startsAt/dueAt/sequence` ya proyectados; nunca `remainingMs`/`dueAt < now` | `countActiveOccurrences` solo clasifica |
| Q4 ¿reconstruye alertId? | **NO** — 0 fórmulas locales | F7 |
| Q5 ¿reconstruye occurrenceId? | **NO** — 0 fórmulas locales | F7 |
| Q6 ¿inquiere fuente distinta de OccurrenceProjection? | **NO** — única fuente = `useAlertRuntime.occurrences` | `useAlertRuntime.js:447-455` |

## 5. F3 — AlertDashboardDataProvider Audit

**Clasificación: A — canonical adapter + C consolidation.**

- ANTES: agregador de entradas evaluadas (contaba configs enrolladas → semántica errónea).
- AHORA: **C (consolidado)** — `activeAlerts` deriva del estado de occurrences certificado; críticas/expirando/pendientes permanecen del mapper certificado (nunca recalcula severidades).
- El provider NUNCA recalcula riesgo/severidad/vencimientos/prioridades (Sprint 200 conservado).

## 6. F4 — useDashboardMetrics Audit

- `computeDashboardMetrics` (`dashboardCalculations.js:59-113`) → solo métricas de registros.
- **No existe segunda fuente para "Alertas Activas".** 0 duplicados activos.
- Ligera nota: `getDashboardStats()` (`dynamicService.js:366`) expone `alertasActivas: 0` hardcodeado sin consumidor — placeholder heredado, fuera de frontera editorial (no se modifica; documentado).

## 7. F5 — KPI Semantic Audit

Semántica certificada de "Alertas Activas" = **ocurrencias actualmente proyectadas sin completion COMPLETED/CANCELLED** — misma semántica que el monitor (buckets Vencidas/Hoy/Próximas/Activas/Deshabilitadas; Cumplidas excluidas).

NO se sustituye por: configuraciones, formularios con alertas, ocurrencias históricas, registros, resources, ni overdue sin clasificación.

## 8. F6 — Temporal/Completion Integrity

- Prohibido `remainingMs`/`dueAt < now` como sustituto del clasificador: **cumplido** — `countActiveOccurrences` usa el classificatorio certificado.
- No se reconstruye completion (localStorage/record-existence/resource): el estado viaja en `occurrence.completion` (OCC-CERT-12, F9).

## 9. F7 — Identity Integrity

Grep obligatorio en frontera Dashboard (Dashboard.jsx, AlertDashboardDataProvider, useDashboardMetrics, mapper):

- `:alert:` · `:occ:` · `alertConfigIdOf` · `occurrenceIdOf` → **0 hits** en estas fronteras.
- La identidad canónica (`12:alert:0`, `12:alert:0:occ:<seq>`) solo viaja desde OccurrenceProjection/Resolver (SSOT). **NO LOCAL IDENTITY ALGEBRA.**

## 10. F8 — Controlled Consolidation (implementado)

**Cambios mínimos, exclusivamente en la frontera Dashboard:**

### 10.1 `src/core/capabilities/alert/runtime-consumption/AlertDashboardDataProvider.js`

- Import de `classifyOccurrence` (OccurrenceLifecycle) — clasificador certificado.
- Nueva export `countActiveOccurrences(occurrences)` — cuenta occurrences proyectadas **no** `completed`/`cancelled`.
- `provideAlertDashboardData(request)`: acepta `request.occurrences`; si están presentes, `activeAlerts = countActiveOccurrences(occurrences)`; si no (call-sites legacy), fallback a entries certificadas (nunca álgebra local).

### 10.2 `src/hooks/useAlertRuntime.js`

- Memo `occurrences` reubicado ANTES del memo `dashboard` (deps `[existing, base]`).
- `dashboard` pasa `occurrences` al provider; deps `[base, consumption, occurrences]`.
- Eliminado el memo `occurrences` duplicado posterior (el retorno del hook queda idéntico).

### 10.3 `scripts/sprint-289-dashboard-kpi-consolidation.mjs`

- Suite de certificación nueva (TEST 04/05/06 del sprint + 04bis identity isolation). **10/10 PASS.**

**No refactor general del Dashboard. Sin Workspace, sin Completion, sin Configuration, sin persistencia.**

## 11. F9/F10 — No modificación de Workspace / AlertMonitoringExperience

- `AlertWorkspaceBuilder` **NO** alimenta el Dashboard (Sprint 288 contractual/reserved intacto; prohibición F9).
- `Dashboard` **NO** consume internals del monitor; ambos comparten la misma autoridad de datos (occurrences), nunca la UI del otro.

## 12. F11 — Acceptance Criteria

| AC | Criterio | Estado |
|---|---|---|
| AC-01 | Fuente actual del KPI identificada | **PASS** |
| AC-02 | alertMetrics auditado | **PASS** |
| AC-03 | AlertDashboardDataProvider auditado | **PASS** → canonical/consolidated |
| AC-04 | useDashboardMetrics auditado | **PASS** → no es paralelo |
| AC-05 | Fuentes paralelas identificadas | **PASS** → 0 activas (dashboard-alert probado dead; getDashboardStats sin consumidores) |
| AC-06 | Semántica "Alertas Activas" certificada | **PASS** |
| AC-07 | KPI utiliza una única fuente | **PASS** → occurrences |
| AC-08 | No se reconstruye alertId | **PASS** (0 fórmulas) |
| AC-09 | No se reconstruye occurrenceId | **PASS** (0 fórmulas) |
| AC-10 | No se recalcula completion | **PASS** |
| AC-11 | No se recalcula lifecycle | **PASS** (usa classificatorio) |
| AC-12 | No se introduce persistencia | **PASS** |
| AC-13 | No se introduce Store | **PASS** |
| AC-14 | No se introduce EventBus | **PASS** |
| AC-15 | Workspace no se convierte en fuente | **PASS** |
| AC-16 | AlertMonitoringExperience independiente | **PASS** (0 cambios) |
| AC-17 | Configuration intacta | **PASS** (0 cambios) |
| AC-18 | Completion intacto | **PASS** (0 cambios) |
| AC-19 | OccurrenceProjection intacta | **PASS** (0 cambios) |
| AC-20 | Repository → Category fuera de alcance | **PASS** (0 cambios) |
| AC-21 | DynamicForm intacto | **PASS** (0 cambios en este sprint) |
| AC-22 | Repository intacto | **PASS** (0 cambios) |
| AC-23 | Identidad canónica intacta | **PASS** (0 cambios Resolver/Occurrence) |
| AC-24 | Sprint 284 contract 21/21 | **PASS** (ejecutado) |
| AC-25 | Sprint 280 isolation intacto | **PASS** (TEST 04bis) |
| AC-26 | Build exitoso | **PASS** (2.41s) |
| AC-27 | Dashboard KPI source authority certificada | **PASS** |

## 13. F12 — Tests obligatorios

| Test | Resultado |
|---|---|
| TEST 01 Dashboard source | **PASS** — `alertMetrics.activeAlerts` ← `useAlertRuntime.dashboard` ← provider ← `occurrences` |
| TEST 02 Runtime consistency | **PASS** — Dashboard KPI = estado de alerta del runtime (misma proyección que monitor) |
| TEST 03 No duplicate derivation | **PASS** — 1 autoridad (occurrences); 0 duplicados activos; `useDashboardMetrics` no es fuente de alertas |
| TEST 04 Completion consistency | **PASS** — A completed → KPI=2; B/C pending (script 10/10; A nunca satisface B/C, 04bis) |
| TEST 05 Recurrence consistency | **PASS** — A occ:2→occ:3 en día 2; B/C occ:2 (ventanas sin transcurso); N(N+1) no colapsadas |
| TEST 06 No alerts | **PASS** — sin config → occurrences=[] → Alertas Activas=0, ledger intacto |
| TEST 07 Identity | **PASS** — 0 fórmulas locales alertId/occurrenceId en frontera Dashboard |
| TEST 08 Workspace isolation | **PASS** — Dashboard ≠ AlertWorkspaceBuilder (0 imports) |
| TEST 09 Build | **PASS** — `npm run build` exitoso (2.41s) |
| TEST 10 Historical contracts | **PASS** — Sprint 284 **21/21**; Sprint 280 A/B/C isolation PASS |

## 14. F13 — Regression Matrix

| Área | Resultado |
|---|---|
| Configuration | 0 cambios |
| Supabase | 0 cambios |
| Schema | 0 cambios |
| Persistence | 0 cambios |
| Enrollment | 0 cambios |
| OccurrenceProjection | 0 cambios |
| OccurrenceLifecycle | 0 cambios |
| OccurrenceSchedule | 0 cambios |
| CompletionSignal | 0 cambios |
| CompletionBridge | 0 cambios |
| OccurrenceLedger | 0 cambios |
| Workspace | 0 cambios |
| Repository → Category | 0 cambios |

## 15. STOP Conditions

| STOP | Estado |
|---|---|
| STOP-01 autoridad KPI | No aplica — autoridad determinada (occurrences) |
| STOP-02 useDashboardMetrics semántica distinta | No aplica — no es fuente de alertas |
| STOP-03 KPI sin OccurrenceProjection/runtime certificado | Inactiva — KPI usa la proyección certificada |
| STOP-04/05/06/07 (Completion/Configuration/Workspace/Category) | Inactivas — 0 modificaciones |
| STOP-08 dos fuentes legítimas | Inactiva — 1 autoridad establecida |

**Sin VERDICT B — READY WITH CONDITIONS: la evidencia fue suficiente y la consolidación se ejecutó.**

## 16. Veredicto

```text
ONE ALERT AUTHORITY
        │
   OccurrenceProjection
        │
   ┌────┴────┐
   ▼         ▼
Monitor   Dashboard KPI "Alertas Activas"
```

**SPRINT 289 — CERTIFIED**

- KPI "Alertas Activas" consolidado sobre la **única autoridad** (occurrences proyectadas + classificatorio certificado).
- 0 divergencias de fuente activas; 0 duplicados; 0 identidad local; 0 completion reconstruido.
- Cambios: 2 archivos de frontera Dashboard + 1 script de certificación (10/10). Build PASS. Lint 0 errores.
- Sprint 284 (21/21) y Sprint 280 (A/B/C isolation) intactos.

## 17. Roadmap (provisional)

```text
288 → Workspace retained/documented           ✅ CERTIFIED
289 → Dashboard KPI Consolidation             ✅ CERTIFIED
290 → Repository → Category Re-Anchoring      ⏳ requiere evidencia adicional (STOP-01/02/03 Sprint 287)
```

Los números posteriores no quedan certificados por este documento.