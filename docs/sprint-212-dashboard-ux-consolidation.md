# SPRINT 212 — Dashboard Architecture Audit & UX Consolidation (MASTER SSOT LEVEL 5)

- **Architecture Status:** LEVEL 5 — OPERATIONAL DASHBOARD · UX CONSOLIDATION · PRESENTATION LAYER CERTIFICATION
- **Type:** Architecture Audit · UX Consolidation · Presentation Layer Refinement
- **Impact:** Presentation Layer unicamente. NO modifica Runtime, Dynamic Forms, Dynamic Records, Alert Engine, Notification Engine, Lifecycle, Operational Actions, Persistence, Contracts, Providers, Evaluation Engine ni modelos de datos certificados.
- **Branch:** `release/stable-sprint79`
- **Date:** 2026-08-04
- **Estado:** **ARCHITECTURE AUDITED · UX CONSOLIDATION CERTIFIED · READY FOR IMPLEMENTATION (SPRINT 213)**

---

## 1. Resumen ejecutivo

Este Sprint certifica la auditoria arquitectonica integral del Dashboard del SGC-DM y establece oficialmente el **modelo de presentacion por Dominios Operacionales** (Registros Operacionales / Alertas Operacionales / Accesos Operacionales) con comportamiento colapsable. Es un Sprint de **auditoria y certificacion**: **cero cambios funcionales, cero modificaciones sobre capas certificadas, cero duplicidad de informacion**. El Dashboard queda certificado como consumidor-agrupador-presentador exclusivamente.

El Sprint 169 (auditoria profunda del Dashboard) se consolida aqui como base; Sprint 212 agrega la certificacion formal por dominios, la politica de reutilizacion R1–R8 y el plan de implementacion certificado para el **Sprint 213 — Dashboard UX Refactoring (Implementation)**.

---

## 2. Principio arquitectonico certificado

El Dashboard **deja oficialmente de ser considerado un productor de informacion**.

```
Consume  ->  Agrupa  ->  Presenta
```

Nunca: Calcular, Generar, Persistir, Evaluar.

Modelo actual (consume de dominios independientes, cada dominio mantiene la propiedad absoluta de sus datos):

```
Dynamic Records ─┐
Operational Alerts ─┼──> Dashboard
Runtime ─────────────┘
```

## 3. Politica oficial de reutilizacion (R1–R8)

| Codigo | Politica | Estado |
|---|---|---|
| R1 | Reutilizar componentes existentes | Verificado (seccion 6) |
| R2 | No crear nuevos motores | Verificado |
| R3 | No crear nuevos servicios | Verificado (seccion 5) |
| R4 | No duplicar informacion | Verificado (Dashboard usa las mismas queries compartidas) |
| R5 | No recalcular indicadores existentes | Verificado (seccion 7: consume metricas calculadas) |
| R6 | Mantener contratos certificados | Verificado (seccion 10) |
| R7 | Mantener desacoplamiento entre dominios | Verificado (seccion 8) |
| R8 | Toda mejora sera exclusivamente visual | Verificado (cero cambios de produccion) |

---

## 4. A1 — Auditoria de componentes

| Componente | Responsabilidad | Propietario funcional | Dependencias | Reutilizacion | Certificacion |
|---|---|---|---|---|---|
| `src/pages/Dashboard.jsx` | Pagina del Dashboard (ruta `/dashboard`): agrupa y presenta KPIs, alertas, modulos y actividad reciente | Presentacion | `useDashboardMetrics`, `useAlertRuntime`, `DashboardMetricCard`, `DashboardRecentActivity`, `ModuleAdministrationApplicationService`, lucide icons | No reutilizable (pagina) | Certificado |
| `src/modules/dashboard/components/DashboardMetricCard.jsx` | Tarjeta KPI responsiva (label/value/icon/trend/color/bg) | Presentacion | Ninguna (solo class) | **Reutilizable** (named + default export) | Certificado |
| `src/modules/dashboard/components/DashboardRecentActivity.jsx` | Panel "Actividad Reciente" | Presentacion | `recent` prop, lucide `Activity` | **Reutilizable** | Certificado |
| `src/modules/dashboard/hooks/useDashboardMetrics.js` | Hook: consulta `dashboardService` + delega calculo a `computeDashboardMetrics` | Dashboard metrics (records) | `dashboardService`, `dashboardCalculations` | Reutilizable | Certificado |
| `src/modules/dashboard/services/dashboardService.js` | Query layer compartida (Sprint 195): `getRawResponses`, `getRecentResponses` | Dashboard / Runtime (share) | supabase | Reutilizable | Certificado |
| `src/modules/dashboard/utils/dashboardCalculations.js` | `computeDashboardMetrics`, `isResponseCritical`, `isMeasurementCritical` (puros) | Dashboard metrics | Ninguna (puro) | Reutilizable | Certificado |
| `src/modules/experiences/UniversalImportWorkflow.jsx` | Prior-art acordeon (patron `diagOpen` + Chevron) | Experiencias | - | Referencia (no reutilizado) | No parte del Dashboard |

**Gap UX certificado:** **no existe** en el codebase un primitivo generico `Collapsible`/`Accordion`. `rg` sobre `src` confirma ausencia de `Collapsible`, `Accordion`, `<details>/<summary>` (unica coincidencia: un comentario en `UniversalImportWorkflow.jsx`). El Sprint 213 debera crear `CollapsiblePanel.jsx` (presentacion pura) — unico componente nuevo autorizado.

---

## 5. A2 — Auditoria de servicios

| Servicio | Funcion consumida | Origen de datos | Responsabilidad |
|---|---|---|---|
| `dashboardService.getRawResponses(filters)` | Filas crudas de respuestas | `sgc_form_responses` + `sgc_forms` + `sgc_response_values` | Entrega filas; NO recalcula |
| `dashboardService.getRecentResponses(limit=5)` | Actividad reciente | `sgc_form_responses` (desc by created_at) | Entrega respuestas recientes |
| `useAlertRuntime` (facade `dashboard`) | Metricas de alertas | Runtime/Evaluation → `provideAlertDashboardData` → `mapEvaluationsToDashboardMetrics` | Entrega KPIs de alertas certificados |
| `ModuleAdministrationApplicationService` (`GET_RUNTIME_MODULES`) | Modulos del sistema | `moduleAdministration` | Entrega tarjetas de acceso |
| `dynamicService.getRuntimeModules()` | Modulos visibles (no archivados/no deprecated) | `sgc_modules` | Filtro de visibilidad |

Todos los servicios **ya existen y estan certificados**. R3 cumplido: no se introduce ningun servicio nuevo.

---

## 6. A3 — Mapa oficial de dependencias

```
Dashboard.jsx (presentacion, ruta /dashboard)
 |-- useDashboardMetrics ──> dashboardService.getRawResponses() ──> supabase
 |        L-- computeDashboardMetrics(responses) ──> metrics {totalRecords, todayRecords, pendingReview, approved, rejected, critical}
 |-- useAlertRuntime({module:null, moduleId:null})   // contexto GLOBAL
 |        |-- dashboardService.getRawResponses()     // REUSA la misma query (sin duplicado)
 |        |-- dynamicService.getRuntimeModules()
 |        L-- dashboard provider ──> mapEvaluationsToDashboardMetrics ──> alertMetrics {activeAlerts, criticalAlerts, expiringDocuments, pendingActions}
 |-- ModuleAdministrationApplicationService (GET_RUNTIME_MODULES) ──> modulos del sistema
 |-- DashboardMetricCard (reutilizado por cada KPI)
 L-- DashboardRecentActivity (recent={recentActivity})
```

Validaciones A3 (certificadas en suite D3):
- **Sin dependencias circulares**: `dashboardService` (capa inferior) no importa components/hooks/utils; `DashboardMetricCard` no importa hooks ni service; el modulo `dashboard/` jamas importa `pages/`.
- **El Dashboard no es propietario de estados externos**: su estado local es solo presentacion (`loading`, `error`, `runtimeModules`).
- **Componentes desacoplados**: los dominios (records / alerts / modules) se consumen via hooks/facades, sin acoplamiento entre si.

---

## 7. A4 — Auditoria de datos

| Indicador | Origen | Propietario | Consumidor | Contrato | Frecuencia |
|---|---|---|---|---|---|
| `totalRecords` | `sgc_form_responses` | Dynamic Records | `DashboardMetricCard` | `useDashboardMetrics.metrics` | On refresh |
| `todayRecords` | `sgc_form_responses` | Dynamic Records | `DashboardMetricCard` | idem | On refresh |
| `pendingReview` | `sgc_form_responses` | Dynamic Records | calculado, hoy NO mostrado | idem | On refresh |
| `approved` | `sgc_form_responses` | Dynamic Records | calculado, hoy NO mostrado | idem | On refresh |
| `rejected` | `sgc_form_responses` | Dynamic Records | `DashboardMetricCard` "Incumplimientos" | idem | On refresh |
| `critical` | `sgc_form_responses` | Dynamic Records | `DashboardMetricCard` | idem | On refresh |
| `activeAlerts` | Runtime/Evaluation | Operational Alerts | `DashboardMetricCard` | `useAlertRuntime.dashboard.metrics` | Runtime cycle |
| `criticalAlerts` | Runtime/Evaluation | Operational Alerts | `DashboardMetricCard` | idem | Runtime cycle |
| `expiringDocuments` | Runtime/Evaluation | Operational Alerts | `DashboardMetricCard` | idem | Runtime cycle |
| `pendingActions` | Runtime/Evaluation | Operational Alerts | `DashboardMetricCard` | idem | Runtime cycle |

**R4/R5 verificado:** el Dashboard no recalcula nada; consume indicadores ya calculados por capas certificadas (D4 de la suite).

---

## 8. A5 — Auditoria UX

| Aspecto | Hallazgo |
|---|---|
| Jerarquia visual | Heredada: KPIs (4) + Alertas (4) + Modulos + Actividad, sin jerarquia de dominios; solapan dos KPI "Alertas Activas" (registros `critical` vs alertas `activeAlerts`) |
| Organizacion | Tarjetas independientes, crecimiento poco escalable |
| Legibilidad | Correcta (cards responsivas 2/4 col); mejorable agrupando por dominio |
| Agrupacion funcional | Ausente: mezcla registros y alertas en filas planas |
| Consistencia | Alta (misma `DashboardMetricCard`) |
| Escalabilidad | Baja: cada nueva experiencia = nueva fila de cards |
| Espacios desperdiciados | Alto: filas de 4 cards siempre visibles consumen espacio vertical aun sin interaccion |

---

## 9. A6 — Auditoria de estados (solo estados existentes)

| Dominio | Estados certificados (reutilizados) | Fuente |
|---|---|---|
| Registros | `pendiente_revision` (Pendientes), `aprobado`, `rechazado`, `corregido` (UI) | `dashboardCalculations.js`, `dynamicService.js:151`, `DynamicRecordsView.jsx` |
| Alertas — prioridad | `critical` (Criticas), `high` (Altas), `medium` (Medias), `low` (Informativas) | `AlertPriorityPolicy.js` — `ALERT_PRIORITY_LEVELS`, `PRIORITY_LABELS` |
| Alertas — evaluacion | `NORMAL / WARNING / CRITICAL / OVERDUE`; severidades `green/yellow/red/critical` | `AlertEvaluationContract.js` |

**Confirmado:** no se introduce ningun estado nuevo. El Dashboard NO define literales de estado (verificado D6).

---

## 10. Nuevo modelo de presentacion certificado

```
Dashboard
 |-- v Registros Operacionales   (colapsable)
 |      - Registros activos   -> totalRecords
 |      - Pendientes          -> pendingReview
 |      - Aprobados           -> approved
 |      - Rechazados          -> rejected
 |      - Criticos            -> critical
 |
 |-- v Alertas Operacionales   (colapsable)
 |      - Activas             -> activeAlerts
 |      - Criticas            -> criticalAlerts
 |      - Documentos por Vencer -> expiringDocuments
 |      - Acciones Pendientes -> pendingActions
 |
 L-- Accesos Operacionales (modulos del sistema, grid existente)
```

Principios UX certificados (Sprint 212 en adelante):
1. Informacion agrupada por dominio.
2. Reduccion del espacio vertical (colapsado por defecto).
3. Acceso rapido a indicadores principales.
4. Expansion bajo demanda.
5. Consistencia visual.
6. Navegacion intuitiva.
7. Minima carga cognitiva.
8. Preparacion para crecimiento futuro.

Comportamiento colapsable = Accordion/Collapse **a nivel de presentacion** (`useState(bool)` + chevron + render condicional), sin tocar fuentes.

---

## 11. Mapa de reutilizacion (componentes reutilizables identificados)

| Elemento reutilizable | Uso en la reorganizacion |
|---|---|
| `DashboardMetricCard.jsx` | Render indivisible de cada KPI dentro de los paneles (sin cambios) |
| `useDashboardMetrics` + `computeDashboardMetrics` | Fuente de "Registros Operacionales" (sin cambios) |
| `useAlertRuntime.dashboard.metrics` | Fuente de "Alertas Operacionales" (sin cambios) |
| `DashboardRecentActivity.jsx` | Panel "Actividad Reciente" (opcional colapsable) |
| `Dashboard.jsx` grid de modulos | "Accesos Operacionales" (sin cambios) |
| Iconografia lucide (`AlertCircle`, `AlertTriangle`, `FileText`, `ListChecks`, etc.) | Iconos de los paneles (sin cambios) |
| Patron acordeon (`UniversalImportWorkflow.jsx` — `diagOpen` + `ChevronDown/Right`) | Referencia para `CollapsiblePanel.jsx` |

**No se autoriza crear componentes equivalentes mientras exista uno reutilizable** (R1).

---

## 12. Plan de implementacion certificado — Sprint 213

### 12.1 Unico componente nuevo
`src/modules/dashboard/components/CollapsiblePanel.jsx` — presentacion pura:
- Props: `{ title, icon, badge, defaultOpen, children }`.
- Estado interno: `useState(defaultOpen)`; toggle con `ChevronDown`/`ChevronRight`.
- Sin imports a servicios/hooks/core. Sin logica de negocio.

### 12.2 Reorganizacion (solo `src/pages/Dashboard.jsx`)
1. Envolver los 4 KPI de registros en `CollapsiblePanel "Registros Operacionales"` (defaultOpen=true; incluye chips `pendingReview` y `approved` opcionales).
2. Envolver los 4 KPI de alertas en `CollapsiblePanel "Alertas Operacionales"` (defaultOpen=true).
3. Mantener "Módulos del Sistema" y `DashboardRecentActivity` intactos (pueden envolverse en panels "Accesos Operacionales" / "Actividad Reciente").

### 12.3 Reglas de implementacion
- Reutilizar `DashboardMetricCard` tal cual (R1).
- No crear motores/servicios/contratos (R2/R3/R6).
- No recalcular metricas (R5): las props de los paneles llegan de `metrics` y `alertMetrics` existentes.
- No tocar `useDashboardMetrics`, `useAlertRuntime`, `dashboardService`, `dashboardCalculations`, providers, contracts.

### 12.4 Verificacion del Sprint 213
- Suite `sprint-213-dashboard-ux-refactoring-certification.mjs` (futura) + suite 212 (regresion) + suite alertas 202–212 (regresion global).
- Build PASS + regresiones PASS.
- Confirmar que la informacion presentada es identica a la de hoy (solo cambia la organizacion visual).

---

## 13. Componentes fuera del alcance (Sprints posteriores)

Notification Center, Timeline Operacional, Dashboard Widgets, Graficas, IA, KPIs inteligentes, Dashboard configurable, Drag & Drop, personalizacion del usuario, nuevos indicadores, nuevos motores.

---

## 14. Definition of Done (verificado)

- [x] Todos los componentes del Dashboard auditados (A1, seccion 4).
- [x] Dependencias completamente documentadas (A3, seccion 6).
- [x] Servicios inventariados (A2, seccion 5).
- [x] Estados certificados (A6, seccion 9).
- [x] Mapa de reutilizacion completado (seccion 11).
- [x] Componentes reutilizables identificados.
- [x] Arquitectura validada (sin ciclos, sin dueno de datos, desacoplada).
- [x] UX consolidada (modelo por dominios colapsables certificado).
- [x] Propuesta visual certificada (seccion 10).
- [x] Cero cambios funcionales realizados.
- [x] Cero modificaciones sobre Runtime.
- [x] Cero modificaciones sobre Alert Engine.
- [x] Cero modificaciones sobre Dynamic Records.
- [x] Arquitectura SSOT preservada.

## 15. Certificacion — `sprint-212-dashboard-ux-consolidation-certification.mjs`

Resultado: **D1–D8 = 8/8 PASS**

| Check | Verificacion |
|---|---|
| D1 | Componentes reutilizables existen y se exportan (`DashboardMetricCard`, `DashboardRecentActivity`) |
| D2 | Servicios consumidos certificados (`getRawResponses`, `getRecentResponses`, `computeDashboardMetrics`) |
| D3 | Sin dependencias circulares; desacoplamiento dominio/pagina |
| D4 | Dashboard no recalcula (consume metricas calculadas en utils) |
| D5 | No existe Accordion/Collapsible (gap del Sprint 213); prior-art identificado |
| D6 | Estados reutilizados (`low/medium/high/critical` + severidades), sin nuevos |
| D7 | SSOT: pagina consume solo hooks/facades certificados |
| D8 | Build PASS |

---

## 16. FINAL CERTIFICATION

**LEVEL 5 — DASHBOARD PRESENTATION LAYER · ARCHITECTURE AUDITED · UX CONSOLIDATION CERTIFIED · COMPONENT REUSE CERTIFIED · PRESENTATION MODEL STABILIZED · READY FOR IMPLEMENTATION (SPRINT 213)**