# Sprint 193 — Dashboard Alert Runtime Performance Audit & Immediate Consumption Certification (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — DASHBOARD PERFORMANCE AUDIT
- **Type:** Performance Audit · Runtime Consumption Audit · Existing Dashboard Verification
- **Impact:** Dashboard · Alert Capability · Runtime Consumption · Existing Dashboard Provider
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Tipo de sprint:** **100% AUDITORÍA** — ninguna modificación funcional

---

## 1. Objetivo

Determinar por qué el Dashboard renderiza las **Alertas Operacionales** después del resto de los widgets (percepción de "carga tardía" / "otro Dashboard"). El resultado es **únicamente un diagnóstico preciso**; no corrige nada. El siguiente Sprint usará este informe para optimizar el render en el mismo ciclo.

## 2. Veredictos de las hipótesis (PENDIENTE → resuelto)

| Hipótesis | Veredicto |
|---|---|
| **H1** — ¿Dashboard renderiza primero y luego solicita Alert Runtime? | ⚠️ **PARCIAL.** Ambos hooks disparan sus efectos en el mount (React corre efectos tras el primer commit). Pero el render visible de los widgets base queda bloqueado por `useDashboardMetrics.loading`, y las métricas de alerta resuelven **después** porque su pipeline es estrictamente más pesado (fan-out de red). No hay solicitud secuencial; hay **percepción secuencial**. |
| **H2** — ¿AlertDashboardDataProvider realiza una consulta independiente? | ❌ **NO.** `provideAlertDashboardData` es una función **síncrona pura** (L40–100) que deriva `metrics` desde `request.configurationDescriptor` (`deriveMetricsFromDescriptor`, L22–38). **Cero consultas.** La latencia NO está aquí. |
| **H3** — ¿useAlertRuntime se ejecuta después del primer render? | ✅ **CONFIRMADA (causa).** El efecto de `useAlertRuntime` (L201–210) dispara `collectExistingResources` que en contexto global (Dashboard) hace un **fan-out multi-módulo** de consultas de red (ver §5). Su resultado (`setExisting`) aterriza en un render posterior (R4), mucho después de que resuelvan las métricas base (2 consultas paralelas). |
| **H4** — ¿Existe un useEffect independiente para Alert Dashboard? | ✅ **SÍ.** `useAlertRuntime` posee su propio `useEffect` (L201–210), independiente del `useEffect` de `useDashboardMetrics` (L52–54). Es la cadena asíncrona que controla la aparición de la sección de alertas. |
| **H5** — ¿El Dashboard espera a que termine RuntimeBinding? | ⚠️ **PARCIAL.** El Dashboard base **NO espera**: el render base está gateado solo por `useDashboardMetrics.loading` (L127). Únicamente la **sección de alertas** espera la cadena completa binding→rules→consumption→dashboard metrics (`alertMetrics`, L63). |
| **H6** — ¿El Dashboard realiza dos renders completos? | ✅ **SÍ (mínimo 4 renders en mount limpio).** R1 loader → R2 widgets base (sin alertas) → R3 grid de módulos → R4 sección de alertas. El "salto" visual son los renders R2→R4. Ver §6. |
| **H7** — ¿Las métricas del Dashboard se calculan mediante Promise separada? | ✅ **SÍ.** `computeDashboardMetrics(rawResponses)` se ejecuta dentro de `refresh()` (L40) a partir de una cadena de consulta propia (`getRawResponses`). Es un pipeline asíncrono independiente del de alertas. |
| **H8** — ¿Existe memoización incompleta? | ❌ **NO RELEVANTE.** La memoización interna de `useAlertRuntime` (useMemo de audit/visibleExisting/binding/rules/consumption/visibility/workspace/dashboard) es correcta. La demora es **latencia de red**, no recomputación. |
| **H9** — ¿Dashboard vuelve a montar Alert Provider? | ❌ **NO.** `useAlertRuntime` se invoca incondicionalmente (L59–62) y `alertDashboard` es estable (useMemo sobre `[base, consumption]`). La sección JSX se monta una sola vez cuando `alertMetrics` pasa de `null` a valor. No hay remontaje del provider. |
| **H10** — ¿Existe Suspense/Lazy/Loader solo para Alert Dashboard? | ❌ **NO.** No hay Suspense ni Lazy. El único loader gatea **todo** el Dashboard (L127–134). La sección de alertas no tiene placeholder propio: simplemente **no existe** hasta R4, por eso "aparece de golpe". |

## 3. Componentes auditados (sin modificar)

| Componente | Ruta | Rol |
|---|---|---|
| Dashboard | `src/pages/Dashboard.jsx` | Consumidor de ambas cadenas; gatea secciones |
| dashboardService | `src/modules/dashboard/services/dashboardService.js` | 2 consultas base (getRawResponses, getRecentResponses) |
| useDashboardMetrics | `src/modules/dashboard/hooks/useDashboardMetrics.js` | Cadena base: refresh → computeDashboardMetrics |
| AlertDashboardDataProvider | `src/core/capabilities/alert/runtime-consumption/AlertDashboardDataProvider.js` | Provider **síncrono puro** de métricas |
| useAlertRuntime | `src/hooks/useAlertRuntime.js` | Puente de consumo de Alert Capability (efecto + useMemo) |
| runtimeConsumption / runtimeBinding / runtimeAudit | `src/core/capabilities/alert/*` | Superficies **síncronas** (derivación pura) |
| Capability Resolver | `src/core/capabilities/alert/index.js` | Exposición de superficies |

## 4. Trazabilidad cronológica (mount del Dashboard)

```
Dashboard mount (Dashboard.jsx L51)
   │
   ├─ useAuth()                                   → síncrono (Context)
   ├─ useDashboardMetrics()                       → estado inicial loading=true, metrics=0
   ├─ useState(runtimeModules)
   ├─ useAlertRuntime({module:null, moduleId:null}) → estado inicial existing=null → TODO null
   │
   │  COMMIT R1 → loading=true → LOADER FULL-SCREEN (L127)  ← TODO el Dashboard oculto
   │
   ▼
   Efectos del mount (4 efectos, orden de ejecución de React):
   │
   ├─ Efecto A · useDashboardMetrics (L52–54)  → refresh()
   │     └─ Promise.all([ getRawResponses, getRecentResponses ])      ← 2 consultas paralelas (rápido)
   │
   ├─ Efecto B · useAlertRuntime (L201–210)    → collectExistingResources(global)
   │     └─ getModules() + Σ_por módulo [ getModuleById + 4 paralelas + Σ_categorías ] ← 1+5M+R consultas (lento)
   │
   ├─ Efecto C · Dashboard (L71–90)            → GET_RUNTIME_MODULES (appService)      ← 1 consulta
   │
   └─ Efecto D · Dashboard (L92–108)           → onModuleChange (suscripción, sin consulta inicial)
   │
   ▼
   Efecto A resuelve → setMetrics + setRecentActivity + setLoading(false)
   │
   COMMIT R2 → widgets base (KPIs, actividad reciente) + grid módulos (solo tarjeta estática)
   │            ✗ sección Alertas Operacionales AUSENTE (alertMetrics === null, L182)
   │
   ▼
   Efecto C resuelve → setRuntimeModules
   │
   COMMIT R3 → grid de módulos poblado
   │
   ▼
   Efecto B resuelve → setExisting(data)
   │   useMemo chain (R4 render): audit → visibleExisting → binding → rules
   │                              → consumption → visibility → workspace
   │                              → dashboard (provideAlertDashboardData) → alertMetrics ≠ null
   │
   COMMIT R4 → SECCIÓN Alertas Operacionales MONTA (L182–223)
   │            Los 4 DashboardMetricCard de alerta aparecen de golpe
   │
   ▼
   Render Final completo
```

## 5. CAUSA RAÍZ (precisa)

1. **La sección de alertas está gateada por `{alertMetrics && ...}` (Dashboard.jsx L182)** y `alertMetrics` depende de `alertDashboard`, que solo se produce al final de la cadena de consumo global del Alert Capability (`useAlertRuntime` → `dashboard` useMemo L303–309 → `provideAlertDashboardData`).

2. **En contexto global (`moduleId:null`, `module:null`), `collectExistingResources` ejecuta un fan-out multi-módulo de red** (`useAlertRuntime.js` L82–114 + `collectModuleOperationalData` L45–72): `getModules()` + por cada módulo `getModuleById` + `Promise.all[getFormsByModule, getModuleResponses, getRecords, getRepositories]` + por cada repositorio `getCategories`. Total **1 + 5·M + R consultas** — estrictamente más lento que las 2 consultas paralelas de la cadena base.

3. **Dos gates asíncronos independientes**: `useDashboardMetrics.loading` (bloquea TODO el Dashboard hasta R2) y después `alertMetrics` (monta SOLO la sección de alertas en R4). El intervalo R2→R4 (~1 s) es la percepción de "las Alertas pertenecen a otro Dashboard".

4. **Sin placeholder**: la sección de alertas no tiene skeleton ni loader propio; pasa de "no existir" a "montada completa", lo que amplifica el efecto visual de salto.

**Componente responsable:** `Dashboard.jsx` (gate condicional L182) + `useAlertRuntime.js` (efecto L201–210 y fan-out global L82–114).

**Efecto responsable:** el `useEffect` de `useAlertRuntime` (L201–210) que dispara `collectExistingResources` en contexto global.

**No es responsable:** `AlertDashboardDataProvider` (puro/síncrono), `runtimeBinding`/`runtimeConsumption`/`runtimeAudit` (síncronos), memoización, Suspense/Lazy, remontaje del provider.

## 6. Métricas de auditoría

| Métrica | Valor (mount limpio) |
|---|---|
| Tiempo de primer render | Inmediato — COMMIT R1 (loader full-screen) |
| Tiempo hasta AlertDashboardDataProvider | COMMIT R4 — tras resolver el fan-out global (el ~1 s observado) |
| Tiempo de RuntimeConsumption | Síncrono, dentro de R4 (useMemo) — CPU despreciable |
| Tiempo de RuntimeBinding | Síncrono, dentro de R4 (useMemo) — CPU despreciable |
| Tiempo de Dashboard completo | COMMIT R4 |
| Número total de renders | **4** (R1 loader, R2 base, R3 módulos, R4 alertas) |
| Número de efectos ejecutados | **4** (A: dashboard metrics, B: alert runtime, C: runtime modules, D: onModuleChange) |
| Número de consultas al Runtime (Alert Capability) | **1 + 5·M + R** (M = módulos runtime visibles, R = repositorios totales) |
| Consultas de la cadena base (dashboardService) | 2 (paralelas) |
| Consultas de la cadena de módulos | 1 (GET_RUNTIME_MODULES) |

## 7. Conclusión y recomendación (para el Sprint siguiente)

El Dashboard **no** renderiza alertas y luego solicita Runtime, ni ejecuta una consulta independiente desde el Provider, ni vuelve a montar el provider. El fenómeno es el resultado de **dos gates asíncronos independientes** y de que la cadena global de consumo de alertas es **estrictamente más pesada en red** que la cadena base.

**Orientación de optimización para el próximo Sprint** (sin violar SSOT, Runtime, Workspace ni Provider):

- Renderizar la sección de alertas **en el mismo ciclo** que el resto, desacoplando el gate visual de la resolución de datos: p. ej. placeholder/skeleton mientras `alertMetrics` es `null`, o levantar el estado de `useAlertRuntime` al mismo nivel de carga que `useDashboardMetrics` para un único gate de carga.
- Reducir el fan-out global manteniendo **una sola consulta agregada** del Runtime existente (sin cambiar contratos), o paralelizar por completo las colecciones por módulo (ya están en `Promise.all` por módulo, pero los módulos se recorren secuencialmente en el `map` de L86–90; un `Promise.all` sobre todos los módulos acortaría el tiempo total).
- Nunca crear Dashboard/Provider/Caché/Runtime paralelos; reutilizar la infraestructura existente (DoD Sprint 193).

## 8. Certification

```
LEVEL 4
DASHBOARD PERFORMANCE AUDIT

Causa raíz identificada ........ ✅ (doble gate asíncrono + fan-out global de red)
Componente responsable ......... ✅ (Dashboard.jsx L182 · useAlertRuntime L201–210/L82–114)
Efecto responsable ............. ✅ (useEffect de useAlertRuntime)
Número real de renders ......... ✅ (4)
Orden cronológico completo ..... ✅ (§4)
0 modificaciones funcionales ... ✅
0 Runtime Changes .............. ✅
0 Parallel Providers ........... ✅
```
