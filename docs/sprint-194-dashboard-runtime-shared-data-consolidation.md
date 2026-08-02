# Sprint 194 — Dashboard Runtime Shared Data Consolidation (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — DASHBOARD SHARED RUNTIME CONSOLIDATION
- **Type:** Runtime Optimization · Shared Data Audit · Existing Pipeline Consolidation
- **Impact:** Dashboard · useDashboardMetrics · useAlertRuntime · Runtime Modules · Existing Runtime Providers
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-02
- **Tipo de sprint:** **100% AUDITORÍA** — ninguna modificación funcional

---

## 1. Objetivo

Eliminar el retardo perceptible de las Alertas Operacionales determinando **exactamente qué información ya existe en el Dashboard** y está siendo **consultada nuevamente** por Alert Runtime. Este Sprint **NO optimiza todavía**: certifica qué datos ya existen, cuáles se vuelven a pedir y cuáles pueden reutilizarse, dejando preparado el Sprint 195.

## 2. Respuesta a la pregunta arquitectónica (A0)

> ¿Por qué el Dashboard necesita volver a construir todo el Runtime de Alertas si los módulos ya fueron cargados por el propio Dashboard?

**No debería.** El Dashboard ya carga `runtimeModules` (id+slug de cada módulo runtime) y la cadena base ya consulta **todas** las respuestas (`sgc_form_responses`) de forma global. Sin embargo, `useAlertRuntime` (contexto global) ejecuta un fan-out que **vuelve a pedir** módulos y respuestas como si el Dashboard no existiera, y además suma formularios/documentos/repositorios/categorías que el Dashboard sí no tiene. La duplicación es real y medible (A6/A7/A8).

## 3. Mapa de datos: quién tiene qué (A9)

| Dato | Dueño (hook/componente) | Fuente | Estado en Dashboard |
|---|---|---|---|
| `runtimeModules` (id, slug, name, icon, color, order_index) | **Dashboard** — `useState` L54 | `GET_RUNTIME_MODULES` → `dynamicService.getRuntimeModules()` (appService) | ✅ **Ya cargado** |
| `rawResponses` (todas las `sgc_form_responses` globales) | **useDashboardMetrics** | `dashboardService.getRawResponses()` | ✅ **Ya consultado** (encapsulado dentro del hook; NO expuesto como handle) |
| `recentActivity` | **useDashboardMetrics** | `dashboardService.getRecentResponses(5)` | ✅ Ya cargado |
| `metrics` (KPIs base) | **useDashboardMetrics** | `computeDashboardMetrics(rawResponses)` | ✅ Ya cargado |
| `forms` (por módulo) | **useAlertRuntime** | `dynamicService.getFormsByModule(id)` × M | ❌ No existe en Dashboard |
| `records` (por módulo) | **useAlertRuntime** | `dynamicService.getModuleResponses(id)` × M | ⚠️ Misma tabla que `rawResponses` — **duplicado** |
| `documents` (por módulo) | **useAlertRuntime** | `documentsService.getRecords(slug)` × M | ❌ No existe en Dashboard |
| `repositories` (por módulo) | **useAlertRuntime** | `documentRepositoriesService.getRepositories(slug)` × M | ❌ No existe en Dashboard |
| `categories` (por repositorio) | **useAlertRuntime** | `getCategories(repo.id)` × R | ❌ No existe en Dashboard |

## 4. Certificación A1–A12

### A1 — ¿Dashboard ya conoce los módulos?
**SÍ (parcial).** `runtimeModules` (Dashboard.jsx L54) conoce la **identidad** de cada módulo runtime (`id`, `slug`, `name`). No conoce formularios/documentos/repositorios por módulo.

### A2 — ¿Dashboard ya conoce los módulos runtime?
**SÍ.** `GET_RUNTIME_MODULES` (Dashboard L71–90) → `ModuleAdministrationApplicationService` L201 → `dynamicService.getRuntimeModules()`: consulta `sgc_modules` con `is_active=true` y `visible=true`, devolviendo `id, name, slug, icon, color, order_index`. Es exactamente el conjunto de módulos que `useAlertRuntime` recorre en su rama global.

### A3 — ¿useAlertRuntime vuelve a pedirlos?
**SÍ.** La rama global de `collectExistingResources` (useAlertRuntime.js L83) ejecuta `dynamicService.getModules()` (otra consulta a `sgc_modules`) y luego, por módulo, `getModuleById(id)` (L48). **Tres consultas a la misma tabla** para datos que `runtimeModules` ya entrega.

### A4 — ¿Dashboard ya conoce respuestas?
**SÍ (en el pipeline).** `useDashboardMetrics` consulta **todas** las `sgc_form_responses` (globales, sin filtro de módulo) vía `dashboardService.getRawResponses()` (dashboardService.js L38–70). Nota: el arreglo crudo queda dentro del hook y solo se devuelven `metrics`/`recentActivity`; aún no hay un handle compartido (punto A12).

### A5 — ¿Alert Runtime vuelve a consultar respuestas?
**SÍ.** `collectModuleOperationalData` ejecuta `getModuleResponses(id)` (useAlertRuntime.js L58) por cada módulo — **misma tabla `sgc_form_responses`**, filas solapadas con `rawResponses`. Duplicado a nivel de fila.

### A6 — Consultas exactamente duplicadas

| Consulta | Dashboard | Alert Runtime | Duplicada |
|---|---|---|---|
| `sgc_modules` (módulos) | `getRuntimeModules()` (1) | `getModules()` (1) + `getModuleById(id)` × M (M) | ✅ **SÍ** — 1 + M consultas redundantes |
| `sgc_form_responses` (respuestas) | `getRawResponses()` (1, global) | `getModuleResponses(id)` × M (M) | ✅ **SÍ** — M consultas redundantes |

**No duplicadas** (solo las pide Alert Runtime, el Dashboard no las tiene): `getFormsByModule` (M), `getRecords` (M), `getRepositories` (M), `getCategories` (R).

### A7 — Tabla de reutilizables

| Consulta | Dashboard | Alert Runtime | Reutilizable |
|---|---|---|---|
| Modules (`sgc_modules`) | ✔ | ✔ | ✔ — `runtimeModules` provee `id+slug` |
| Responses (`sgc_form_responses`) | ✔ | ✔ | ✔ — `rawResponses` es global y cubre todos los registros |
| Forms (`sgc_forms`) | ✖ | ✔ | ✖ |
| Documents | ✖ | ✔ | ✖ |
| Repositories | ✖ | ✔ | ✖ |
| Categories | ✖ | ✔ | ✖ |

### A8 — ¿Qué porcentaje del Runtime podría construirse con datos ya cargados?

Fan-out global = **1 + 5·M + R** consultas (`1` getModules + `M`×(getModuleById + 4 paralelas) + `R` categorías).

Reutilizables = **1 + 2·M** (`getModules` + `getModuleById`×M + `getModuleResponses`×M).

```
% reutilizable = (1 + 2M) / (1 + 5M + R)
```

Ejemplos:
- M=6, R=12 → `13 / 43` ≈ **30%**
- M=8, R=16 → `17 / 57` ≈ **30%**

Por dimensión de datos: **2 de 6** (modules, records) = **33%**. La parte reutilizable son las dos dimensiones de **mayor volumen e identidad** (todos los módulos y todos los registros); la parte no reutilizable (forms/documents/repositories/categories ≈ 70% de las consultas) es la que Alert Runtime debe seguir consultando porque el Dashboard no la posee.

### A9 — Dueño de cada dato
Ver tabla del §3 (hook dueño por dato).

### A10 — Orden actual vs ideal

```
ACTUAL
Dashboard mount
  ├─ useDashboardMetrics → getRawResponses + getRecentResponses   (2 consultas)
  ├─ GET_RUNTIME_MODULES → runtimeModules                          (1 consulta)
  └─ useAlertRuntime (global)
        ├─ getModules() + por módulo: getModuleById                (1 + M consultas duplicadas)
        ├─ getModuleResponses(id)                                  (M consultas duplicadas)
        └─ getFormsByModule / getRecords / getRepositories / getCategories  (3M + R consultas)
        └─ dashboard metrics en R4 (≈1 s después)

IDEAL
Dashboard mount
  ├─ useDashboardMetrics → getRawResponses + getRecentResponses    (2 consultas)
  ├─ GET_RUNTIME_MODULES → runtimeModules                          (1 consulta)
  │
  ▼  Shared Runtime Data = { runtimeModules, rawResponses }   ← inyección (A12)
  │
  └─ useAlertRuntime({ sharedRuntimeData })
        ├─ reutiliza modules + responses (0 consultas duplicadas)
        └─ consulta SOLO forms / documents / repositories / categories  (3M + R consultas)
        └─ dashboard metrics en el MISMO ciclo que el resto (R2/R3)
```

### A11 — Duplicación de trabajo (existente, auditada)

| Tipo | Detalle |
|---|---|
| **Duplicación de consultas** | `sgc_modules` consultado 3 veces (getRuntimeModules + getModules + getModuleById×M); `sgc_form_responses` consultada 1 + M veces (getRawResponses + getModuleResponses×M). |
| **Duplicación de memoria** | Las mismas filas de `sgc_form_responses` residen 2 veces en el árbol: `rawResponses` (useDashboardMetrics) y `records` (useAlertRuntime.existing). |
| **Duplicación de transformación** | La clasificación/status de registros se recalcula en ambas cadenas (`computeDashboardMetrics` y `runtimeAudit`). |
| **Duplicación de mapping** | Módulo→recurso se mapea dos veces: `allModules` (Dashboard L110–122) y `collectModuleOperationalData` (Alert Runtime). |

### A12 — Punto exacto de inyección de Shared Runtime Data (certificado, NO implementado)

```
Aquí debe hacerse
        │
        ▼
antes de Runtime Binding     ← el binding deja de esperar el fan-out global
después de Dashboard Metrics ← cuando Efecto A (useDashboardMetrics) y Efecto C (GET_RUNTIME_MODULES) resolvieron
antes de Alert Runtime       ← useAlertRuntime recibe { sharedRuntimeData } como entrada
```

**Punto concreto:** la invocación de `useAlertRuntime` en `Dashboard.jsx` L59–62 (hoy `{ module: null, moduleId: null }`). En Sprint 195 pasará el handle compartido `{ sharedRuntimeData: { runtimeModules, rawResponses } }`. La rama global de `collectExistingResources` (useAlertRuntime.js L82–114) se sustituiría por una rama que **solo consulta** `forms`, `documents`, `repositories`, `categories` usando los `id+slug` ya cargados, eliminando `getModules`, `getModuleById` y `getModuleResponses`.

**Nota de trazabilidad:** `rawResponses` existe hoy dentro de `useDashboardMetrics` pero no se expone como objeto compartido (solo `metrics`/`recentActivity`/`refresh`). La inyección del Sprint 195 exigirá exponerlo (o un adaptador de datos compartidos), sin tocar el Runtime ni los servicios.

## 5. Definition of Done (cumplido)

- ✅ Identificadas todas las consultas duplicadas (`sgc_modules`: 1+M; `sgc_form_responses`: M).
- ✅ Identificado qué datos ya posee el Dashboard (`runtimeModules`, `rawResponses`/`metrics`, `recentActivity`).
- ✅ Identificado qué datos vuelve a pedir Alert Runtime (`getModules`, `getModuleById`, `getModuleResponses` + forms/documents/repositories/categories).
- ✅ Calculado el porcentaje reutilizable (**≈30%** de las consultas; **33%** de las dimensiones — modules + records).
- ✅ Certificado el punto exacto de inyección (Dashboard L59–62, antes de Runtime Binding, después de Dashboard Metrics).
- ✅ **Ninguna modificación funcional realizada.**

## 6. Certification S1–S12

```
LEVEL 4
DASHBOARD SHARED RUNTIME CONSOLIDATION

S1  ¿Dashboard conoce los módulos? ..................... ✅ SÍ (runtimeModules)
S2  ¿Dashboard conoce los módulos runtime? ............. ✅ SÍ (getRuntimeModules)
S3  ¿Alert Runtime vuelve a pedirlos? .................. ✅ SÍ (getModules + getModuleById)
S4  ¿Dashboard conoce respuestas? ...................... ✅ SÍ (rawResponses, global)
S5  ¿Alert Runtime vuelve a consultar respuestas? ...... ✅ SÍ (getModuleResponses × M)
S6  Consultas exactamente duplicadas ................... ✅ sgc_modules (1+M) + sgc_form_responses (M)
S7  Consultas reutilizables ............................ ✅ Modules ✔ · Responses ✔ · Forms ✖ · Docs ✖ · Repos ✖ · Cat ✖
S8  % del Runtime reutilizable ......................... ✅ ≈30% (1+2M)/(1+5M+R); 33% por dimensión
S9  Hook dueño de cada dato ............................ ✅ §3
S10 Orden ideal ........................................ ✅ §A10 (Shared Runtime Data → Alert Runtime → Dashboard)
S11 Duplicación de trabajo ............................. ✅ consultas + memoria + transformación + mapping
S12 Punto exacto de inyección .......................... ✅ Dashboard L59–62 · antes de Binding · después de Metrics

0 modificaciones funcionales · 0 caches nuevas · 0 runtimes paralelos
```
