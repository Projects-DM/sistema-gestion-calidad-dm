# SPRINT 169 — Dashboard Architecture Audit & UX Consolidation (SSOT)

- **Tipo:** Arquitectura / UX / Auditoria
- **Nivel esperado:** LEVEL 3 - CERTIFIED
- **Estado:** **AUDITED & READY FOR IMPLEMENTATION**
- **Alcance:** Solo presentacion. CERO cambios funcionales, CERO nuevas capas, CERO duplicidad de informacion.
- **Branch:** `release/stable-sprint79`

---

## 1. Resumen ejecutivo

Este Sprint es una **auditoria documental** (sin cambios de codigo de produccion) que inventaria todo lo que el Dashboard consume hoy, mapea sus dependencias, catastra los estados reutilizables y certifica una propuesta de reorganizacion visual basada en **paneles colapsables**, reutilizando el 100% de la informacion ya producida por los componentes certificados. No se crean motores, servicios, modelos ni KPIs nuevos.

**Confirmacion central:** la reorganizacion visual propuesta **no requiere modificar ninguna capa certificada** (Runtime, Evaluation, Consumption, Dynamic Records, Operational Alerts, Dashboard Service, providers/adapters/contracts). Unicamente reorganiza la presentacion.

---

## 2. Inventario de componentes del Dashboard

| Componente | Responsable | Estado | Dependencias | Nivel de reutilizacion | Mejora visual posible |
|---|---|---|---|---|---|
| `src/pages/Dashboard.jsx` | Pagina del Dashboard (ruta `/dashboard`) | Activo | `useDashboardMetrics`, `useAlertRuntime`, `DashboardMetricCard`, `DashboardRecentActivity`, `ModuleAdministrationApplicationService`, lucide icons | **No reutilizable** (pagina especifica) | Reorganizar en paneles colapsables; eliminar duplicidad del KPI "Alertas Activas" |
| `src/modules/dashboard/components/DashboardMetricCard.jsx` | Tarjeta KPI | Activo | solo class | **Reutilizable** (named + default) | Reutilizarse tal cual dentro de los paneles |
| `src/modules/dashboard/components/DashboardRecentActivity.jsx` | Panel "Actividad Reciente" | Activo | `recent` prop, lucide `Activity` | **Reutilizable** | Mantener como panel colapsable opcional |
| `src/modules/dashboard/hooks/useDashboardMetrics.js` | Hook de metricas de registros | Activo | `dashboardService`, `computeDashboardMetrics` | **Reutilizable** | No se toca: fuente de "Registros Operacionales" |
| `src/modules/experiences/UniversalOperationalDashboard.jsx` | Dashboard operacional modal (experiencias) | Activo pero **no wireado** a `/dashboard` | tab / statCards | No reutilizable para esta ruta | Prior-art visual, no incluido |
| `src/modules/experiences/AlertMonitoringExperience.jsx` | Consumidor del Workspace de alertas | Activo | `useAlertRuntime` workspace, `alertVisualClasses` | Parcialmente reutilizable | Referencia de agrupacion por prioridad |

**Gap UX:** no existe en el codebase un primitivo generico `Collapsible`/`Accordion`. El patron existente mas cercano es el acordeon inline con `useState(bool)` + `ChevronDown/ChevronRight` en `src/modules/experiences/UniversalImportWorkflow.jsx` (lineas ~277-321). Cualquier implementacion colapsable exigira **crear un componente de presentacion reutilizable** (permitido: solo presentacion).

---

## 3. Mapa de dependencias

```
Dashboard.jsx
 |-- useDashboardMetrics -> dashboardService.getRawResponses() -> sgc_form_responses + sgc_forms + sgc_response_values
 |        L-- computeDashboardMetrics(responses)  (dashboardCalculations.js) -> { totalRecords, todayRecords,
 |                                                                                pendingReview, approved, rejected, critical }
 |-- useAlertRuntime({ module:null, moduleId:null })            // contexto GLOBAL
 |        |-- dashboardService.getRawResponses()   <- REUSA la misma query (nunca re-fetch duplicado)
 |        |-- dynamicService.getRuntimeModules()
 |        L-- dashboard provider = provideAlertDashboardData({..., configurationDescriptor, evaluationEntries})
 |                 L-- mapEvaluationsToDashboardMetrics(entries)  (AlertConsumptionMapper.js)
 |                         -> { activeAlerts, criticalAlerts, expiringDocuments, pendingActions }
 |-- ModuleAdministrationApplicationService (GET_RUNTIME_MODULES)  -> modulos del sistema (icon/color/name/desc)
 L-- DashboardMetricCard / DashboardRecentActivity  // presentacion
```

**Principio cumplido:** el Dashboard **nunca es dueno de la informacion**. Tanto las metricas de registros como las metricas de alertas provienen de capas certificadas (`useDashboardMetrics` -> calculo compartido; `useAlertRuntime` -> Dashboard Provider certificado). El Dashboard unicamente presenta.

---

## 4. Inventario de servicios consumidos

| Servicio | Funcion consumida | Informacion que entrega |
|---|---|---|
| `dashboardService.getRawResponses(filters)` | Query compartida layer (Sprint 195) | Filas crudas de `sgc_form_responses` (+form, +response_values). **No recalcula** |
| `dashboardService.getRecentResponses(limit=5)` | Actividad reciente | Respuestas recientes (form + engine_type + created_at) |
| `dynamicService.getRuntimeModules()` | Modulos del sistema | Modulos visibles/no archivados/no deprecated |
| `useAlertRuntime` (facade `dashboard`, `notification`, `lifecycle`, `operationalActions`) | Consumo del Runtime de Alertas | Metricas de Dashboard Provider certificado + entries reales |
| `ModuleAdministrationApplicationService` (`GET_RUNTIME_MODULES`) | Modulos renderizados | Tarjetas de modulos (name/icon/color/desc) |

Todos estos servicios **ya existen y estan certificados**. No se introduce ningun servicio nuevo.

---

## 5. Auditoria de datos - quien genera / calcula / consume / mantiene

| Indicador | Quien lo genera? | Quien lo calcula? | Quien lo consume? | Quien lo mantiene? |
|---|---|---|---|---|
| `totalRecords` | `sgc_form_responses` | `computeDashboardMetrics` (`dashboardCalculations.js:74`) | `Dashboard.jsx` KPI | Dynamic Records / supabase |
| `todayRecords` | `sgc_form_responses` | `computeDashboardMetrics` (:83-88) | `Dashboard.jsx` KPI | Dynamic Records |
| `pendingReview` | `sgc_form_responses` | `computeDashboardMetrics` (:91) | **calculado pero NO mostrado** | Dynamic Records |
| `approved` | `sgc_form_responses` | `computeDashboardMetrics` (:93) | **calculado pero NO mostrado** | Dynamic Records |
| `rejected` | `sgc_form_responses` | `computeDashboardMetrics` (:95) | `Dashboard.jsx` "Incumplimientos" | Dynamic Records |
| `critical` | `sgc_form_responses` | `computeDashboardMetrics` (:100-102, `isResponseCritical`) | `Dashboard.jsx` "Alertas Activas" (registros) | Dynamic Records |
| `activeAlerts` | Alert Runtime | `mapEvaluationsToDashboardMetrics` (`AlertConsumptionMapper.js:123`) | `Dashboard.jsx` "Alertas Activas" (alertas) | Operational Alerts |
| `criticalAlerts` | Alert Runtime | `mapEvaluationsToDashboardMetrics` (:114-118) | `Dashboard.jsx` | Operational Alerts |
| `expiringDocuments` | Alert Runtime | `mapEvaluationsToDashboardMetrics` (:119) | `Dashboard.jsx` | Operational Alerts |
| `pendingActions` | Alert Runtime | `mapEvaluationsToDashboardMetrics` (:120) | `Dashboard.jsx` | Operational Alerts |

**Conclusion:** el Dashboard no recalcula nada; consume indicadores ya calculados por capas certificadas. Para la consolidacion visual unicamente se redistribuiran estos indicadores en la UI, sin tocar su fuente.

---

## 6. Inventario de estados reutilizables (NO crear conceptos nuevos)

### 6.1 Registros
| Valor canonico | Significado | Referencias |
|---|---|---|
| `pendiente_revision` | Pendiente de revision (default al registrar) | `dashboardCalculations.js:91`; `dynamicService.js:151` |
| `aprobado` | Aprobado | `dashboardCalculations.js:93`; `DynamicRecordsView.jsx` |
| `rechazado` | Rechazado | `dashboardCalculations.js:95`; `DynamicRecordsView.jsx` |
| `corregido` | Corregido (UI-only) | `DynamicRecordsView.jsx` |

### 6.2 Alertas - prioridad (configurada por recurso)
`ALERT_PRIORITY_LEVELS = ['low','medium','high','critical']` - `AlertPriorityPolicy.js:10`
`PRIORITY_LABELS = { low:'Baja', medium:'Media', high:'Alta', critical:'Critica' }`

### 6.3 Alertas - estado de evaluacion (derivado)
`EVALUATION_STATUSES = ['NORMAL','WARNING','CRITICAL','OVERDUE']` - `AlertEvaluationContract.js:41-46`
Severidad: `EVALUATION_SEVERITIES = ['green','yellow','red','critical']` (:52-57)

### 6.4 Candidatos de panel "Registros Operacionales" (estados ya existentes)
`Activos / Pendientes / Aprobados / Rechazados / Criticos` -> mapean a `totalRecords`, `pendingReview`, `approved`, `rejected`, `critical`.

### 6.5 Candidatos de panel "Alertas Operacionales" (estados ya existentes)
`Criticas / Altas / Medias / Informativas` -> reutilizan `critical/high/medium/low` del modelo de Workspace (`AlertWorkspaceViewModel` - `summary`, grupos por prioridad).

---

## 7. Propuesta de reorganizacion visual certificada

Exclusivamente presentacion. Dos paneles colapsables que reutilizan los indicadores existentes y sus fuentes certificadas:

```
v Registros Operacionales           (fuente: useDashboardMetrics -> metrics)
    - Registros Activos    -> totalRecords
    - Pendientes           -> pendingReview
    - Aprobados            -> approved
    - Rechazados           -> rejected
    - Criticos             -> critical

--------------------------------

v Alertas Operacionales             (fuente: useAlertRuntime -> alertDashboard.metrics)
    - Activas              -> activeAlerts
    - Criticas             -> criticalAlerts
    - Documentos por Vencer-> expiringDocuments
    - Acciones Pendientes  -> pendingActions
```

Cada panel usa el primitivo colapsable (nuevo componente de presentacion) + `DashboardMetricCard` reutilizado. Colapsado por defecto salvo el panel principal, manteniendo **exactamente la misma informacion** que existe hoy.

---

## 8. Componentes reutilizables identificados

| Componente | Uso en la propuesta |
|---|---|
| `DashboardMetricCard.jsx` | Render indivisible de cada KPI dentro de los paneles |
| `DashboardRecentActivity.jsx` | Panel "Actividad Reciente" (opcional colapsable) |
| `AlertWorkspaceViewModel` / `summary` (grupos por prioridad) | Datos ya agrupados para "Alertas por prioridad" |
| `useDashboardMetrics` / `useAlertRuntime` | Fuentes de datos; **no se modifican** |
| Patron acordeon (`UniversalImportWorkflow.jsx`) | Referencia para el nuevo primitivo `CollapsiblePanel` |

---

## 9. Lista de cambios visuales autorizados (para la implementacion)

1. **Crear** `src/modules/dashboard/components/CollapsiblePanel.jsx` (primitivo de presentacion: header + chevron + area expandible; `useState(bool)`, sin logica de negocio).
2. **Reorganizar** `src/pages/Dashboard.jsx` envolviendo los 4 KPI de registros y los 4 KPI de alertas en sendos `CollapsiblePanel` ("Registros Operacionales" / "Alertas Operacionales"), reutilizando `DashboardMetricCard`.
3. **Opcional presentacional:** corregir la colision de etiqueta "Alertas Activas" (KPI de registros `metrics.critical` vs KPI de alertas `activeAlerts`) mediante renombrado de la tarjeta de registros (p. ej. "Registros Criticos"), manteniendo su fuente de datos intacta.
4. **Opcional presentacional:** exponer `pendingReview` y `approved` (ya calculados, hoy ocultos) como chips dentro del panel "Registros Operacionales".
5. Mantener intactas las fuentes: `useDashboardMetrics`, `useAlertRuntime`, `dashboardService`, calculadores y providers.

**NO autorizado:** creacion de centros de notificacion, timeline, IA, graficas, nuevos KPIs, nuevos motores/servicios, cambios sobre Runtime, Dynamic Records u Operational Alerts.

---

## 10. Confirmacion de no-modificacion de la arquitectura certificada

- Runtime / Evaluation Engine / Consumption Layer / Dynamic Records / Operational Alerts: **intactos**.
- `DashboardAlertProvider`, `DashboardAlertAdapter`, `AlertDashboardDataProvider`, contracts/boundaries: **intactos** (solo se consume su salida).
- `dashboardService`, `useDashboardMetrics`, `computeDashboardMetrics`, `AlertConsumptionMapper`: **no se modifican**.
- La reorganizacion visual toca **unicamente** `src/pages/Dashboard.jsx` (presentacion) y agrega el primitivo de presentacion `CollapsiblePanel.jsx`.

**Conclusion:** se confirma que la implementacion de paneles colapsables NO requiere ninguna modificacion sobre la arquitectura certificada, los contratos de servicio, los modelos de datos ni la logica de negocio. Es una mejora estrictamente de presentacion, de bajo riesgo y de rapida adopcion.

---

## 11. Entregables

- [x] Inventario completo de componentes del Dashboard (seccion 2).
- [x] Mapa de dependencias (seccion 3).
- [x] Inventario de servicios consumidos (seccion 4).
- [x] Inventario de datos: quien genera/calcula/consume/mantiene (seccion 5).
- [x] Inventario de estados reutilizables (seccion 6).
- [x] Propuesta de reorganizacion visual certificada (seccion 7).
- [x] Identificacion de componentes reutilizables (seccion 8).
- [x] Lista de cambios visuales autorizados (seccion 9).
- [x] Confirmacion de no-modificacion de la arquitectura certificada (seccion 10).

---

## 12. Verification del sprint

- Tipo: **Auditoria** (sin cambios de produccion).
- Build: no requiere recompilacion por cambio de codigo (Sprint documental). El estado de la rama queda integro.
- Regresiones: aplican las suites certificadas existentes (Sprint 202-211); ninguna toca el Dashboard de forma que se vea afectada por una auditoria documental.
- Estado: **AUDITED & READY FOR IMPLEMENTATION** (LISTO PARA IMPLEMENTAR en un Sprint de presentacion sin riesgo).

## 13. Evaluacion final

**LEVEL 3 - CERTIFIED - DASHBOARD ARCHITECTURE AUDIT COMPLETE - UX CONSOLIDATION READY - SSOT PRESERVED - PRESENTATION ONLY - NO FUNCTIONAL CHANGES - LOW RISK IMPLEMENTATION PREPARED**