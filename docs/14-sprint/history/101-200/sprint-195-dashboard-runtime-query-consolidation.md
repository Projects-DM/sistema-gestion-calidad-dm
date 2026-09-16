# Sprint 195 — Dashboard Runtime Query Consolidation (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — DASHBOARD QUERY CONSOLIDATION CERTIFIED
- **Type:** Existing Query Consolidation · Runtime Optimization · Shared Query Layer
- **Impact:** Dashboard · Dashboard Metrics · Alert Capability · Existing Runtime Services
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Resultado esperado:** Dashboard sincronizado · Alertas en el mismo ciclo · **0 consultas duplicadas** a módulos y respuestas · SSOT preservada.

---

## 1. Principio aplicado

> **Los datos compartidos deben reutilizar consultas existentes, nunca estados React existentes.**

```
NO:   Dashboard → Shared Runtime State → Alert Runtime
SÍ:   Dashboard Metrics → Existing Query Layer ← Alert Runtime
Ambos consumen la misma fuente. Nunca entre sí.
```

El Dashboard jamás es proveedor del Runtime; Alert Runtime jamás depende del Dashboard. Ambos dependen únicamente de la **capa de consulta existente** (`dashboardService` / `dynamicService`).

## 2. Cambios (consolidación)

| Archivo | Cambio |
|---|---|
| `src/modules/dashboard/services/dashboardService.js` | `getRawResponses` se convierte en la **capa compartida** de `sgc_form_responses`: select consolidado (`sgc_forms!inner(id,name,slug,module_id)` + `label`) e **in-flight dedup** (consultas concurrentes idénticas comparten UNA petición de red). |
| `src/services/dynamicService.js` | `getRuntimeModules` se convierte en la **capa compartida** de `sgc_modules`: select con `state, visible` (preserva el filtro archived/deprecated) e **in-flight dedup**. |
| `src/hooks/useAlertRuntime.js` | La rama **global (Dashboard)** de `collectExistingResources` consume la capa compartida: `getRuntimeModules()` + `getRawResponses()` (dedup → mismo request que el Dashboard). **Elimina** `getModules()`, `getModuleById()` y `getModuleResponses()` del flujo global. Consulta únicamente lo que el Dashboard NO posee: `forms`, `documents`, `repositories`, `categories`. |

**No creado:** Runtime nuevo, Context nuevo, Provider nuevo, Cache Manager, Store, Engine, Suspense, lazy.
**No modificado:** Runtime Binding, Runtime Visibility, Runtime Consumption, Runtime Audit, Capability Resolver, Workspace, Router, DynamicModule, Dashboard Provider, dashboardService.getRecentResponses, rama de módulo único.

## 3. Flujo resultante

```
Dashboard mount
  ├─ useDashboardMetrics → getRawResponses + getRecentResponses
  ├─ GET_RUNTIME_MODULES → getRuntimeModules
  └─ useAlertRuntime (global)
        ├─ getRuntimeModules()        ─┐  SAME request (in-flight dedup)
        ├─ getRawResponses()          ─┘  = Dashboard Metrics / GET_RUNTIME_MODULES
        └─ SOLO forms · documents · repositories · categories   (exclusivas de Alert Runtime)
        └─ dashboard metrics en el MISMO ciclo que las métricas base
```

Antes: `getModules` + `getModuleById`×M + `getModuleResponses`×M (duplicados) → **1 + 2M consultas eliminadas**.
Después: 0 consultas duplicadas a `sgc_modules` y `sgc_form_responses`.

## 4. Certification Q1–Q12

```
Q1   Dashboard continúa cargando correctamente ....... ✅
Q2   Dashboard Metrics sin regresiones ............... ✅
Q3   Alert Runtime continúa funcionando .............. ✅
Q4   Sin consultas duplicadas de módulos ............. ✅ (getRuntimeModules compartida; getModules() eliminado)
Q5   Sin consultas duplicadas de respuestas .......... ✅ (getRawResponses compartida; agrupación por module_id)
Q6   Forms siguen consultándose ...................... ✅ (getFormsByModule)
Q7   Repositories siguen consultándose ............... ✅ (getRepositories)
Q8   Documents siguen consultándose .................. ✅ (getRecords)
Q9   Categories siguen consultándose ................. ✅ (getCategories)
Q10  Alertas junto a los demás widgets, sin retraso .. ✅ (módulos+respuestas en el MISMO request que el Dashboard)
Q11  No aumenta el número de renders ................. ✅ (sin Suspense/lazy; efectos intactos: 1 en useAlertRuntime, 2 en Dashboard)
Q12  Build PASS ...................................... ✅ (vite 2.88s)
```

## 5. Certification final

```
SPRINT 195 — DASHBOARD RUNTIME QUERY CONSOLIDATION

Dashboard Metrics ................. ✅
Existing Query Layer .............. ✅ (dashboardService.getRawResponses / dynamicService.getRuntimeModules)
Alert Runtime ..................... ✅
Zero Duplicate Queries ............ ✅ (0 duplicadas a sgc_modules y sgc_form_responses)
Zero Parallel Runtime ............. ✅
Zero Shared React State ........... ✅ (solo in-flight dedup de consultas; sin estados compartidos)
Zero New Providers ................ ✅
Zero Architecture Regression ...... ✅ (regresión 185–190 PASS)

100% Existing Services · 100% Existing Query Layer · 100% SSOT
100% Runtime Decoupled · 100% Dashboard Stabilized
```
