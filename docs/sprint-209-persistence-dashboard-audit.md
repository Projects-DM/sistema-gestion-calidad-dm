# Sprint 209 — Alert Runtime Persistence & Dashboard Integration Audit (MASTER SSOT LEVEL 5)

- **Architecture Status:** LEVEL 5 — ALERT CAPABILITY · OPERATIONAL PERSISTENCE AUDIT
- **Type:** End-to-End Integration Audit · Runtime Persistence Verification · Dashboard Consumption Verification
- **Impact:** Auditoría integral (sin introducir nuevas funcionalidades)
- **Branch:** `release/stable-sprint79`
- **Date:** 2026-08-03

---

## 1. Objetivo

Auditar de extremo a extremo la propagación de la configuración de alertas: desde la configuración persistida vía Operational Experience hasta la experiencia operacional (Workspace, Dashboard, Notification, Lifecycle, Operational Actions).

Este Sprint **no introduce funcionalidad** y **no modifica capas certificadas**. Produce diagnóstico y plan de remediación con evidencia `file:line`.

## 2. Alcance

Pipeline auditado:

```
Alert Configuration UI
        │
        ▼
AlertConfigurationApplicationService
        │
        ▼
Persistence Adapter
        │
        ▼
Database (alert_config)
        │
        ▼
AlertConfigurationResolver
        │
        ▼
Runtime Wiring
        │
        ▼
Runtime Activation
        │
        ▼
Evaluation Engine
        │
        ▼
Consumption Layer
        │
        ├────────► Workspace
        ├────────► Dashboard
        ├────────► Notification
        ├────────► Lifecycle
        └────────► Operational Actions
```

## 3. VEREDICTO EJECUTIVO

**El pipeline NO se rompe en las capas certificadas; se rompe en la lectura de persistencia y en el wiring del hook que alimenta la UI.**

1. **La propagación de la configuración se rompe en la RE-lectura de `dynamicForms`.** El adapter persiste `alert_config` en `sgc_forms`, pero la consulta de runtime (`dynamicService.getFormsByModule`) **no selecciona la columna `alert_config`** → el Resolver jamás recibe el JSON persistido y cae a defaults. Los `documentRepositories` SÍ hacen round-trip completo.
2. **El Dashboard siempre muestra 0/0/0/0** porque el hook `useAlertRuntime` llama a `provideAlertDashboardData` **sin pasar `evaluationEntries`**, por lo que siempre toma la rama `fallbackMetrics` (ceros). La ruta certificada `mapEvaluationsToDashboardMetrics` **existe pero nunca recibe datos reales.**
3. **Los valores "Formulario / Media / Alta"** NO provienen de la persistencia: son etiquetas de UI y el default de configuración `priority: 'medium'` (Media) de `DefaultAlertConfigurationProvider`. No existe ningún `DEFAULT_ALERT_RULES` (está prohibido por arquitectura).

---

## 4. Auditorías obligatorias — resultados con evidencia

### QA1 — Persistencia → Resolver

| Escenario | Resultado | Evidencia |
|---|---|---|
| `documentRepositories` | ✅ Round-trip completo: escribe `sgc_document_repositories.alert_config` y relee `.select('*')` → `mapRepositoryRow` → `alertConfiguration` → Resolver lo extrae verbatim | `documentRepositoriesService.js:29-31,59,120-129`; `AlertConfigurationResolver.js:38-41,53-61` |
| `dynamicForms` | ❌ **PROPAGACIÓN ROTA**: escribe `sgc_forms.alert_config` pero `getFormsByModule`/`getFormBySlug` NO seleccionan `alert_config` → Resolver recibe el recurso sin la columna → emite `source:'default'` con defaults | `AlertConfigurationPersistenceAdapter.js:56-61`; `dynamicService.js:80-97`; `AlertConfigurationResolver.js:57` |
| `loadConfiguration` del Port | ⚠️ No lee el registro; solo responde `{accepted, backend, reference}` (lectura real queda en el Resolver) | `AlertConfigurationPersistenceAdapter.js:103-114`; `AlertConfigurationApplicationService.js:68-71` |

**QA1 veredicto:** el Resolver lee el JSON almacenado únicamente si el recurso que recibe ya trae la columna. Para forms, **nunca la trae** → defaults.

### QA2 — Resolver → Runtime Wiring

- El wiring (`runtime-wiring/AlertRuntimeConfigurationBridge.js`, `AlertRuntimeConfigurationProvider.js`) es transporte puro: recibe la configuración **ya resuelta como input** y la reenvía sin defaults (`AlertRuntimeConfigurationProvider.js:76-100` — sin input devuelve record inerte con `configuration: null`). ✅ No sustituye por defaults.
- ⚠️ **Hallazgo estructural:** `runtime-wiring` y `runtime-activation` **no están conectados al camino runtime real.** Ningún módulo fuera de sus carpetas los importa; el facade `alert/index.js` expone `requestRuntimeConsumption` y `resolveResourceAlertConfiguration`, no el wiring. El camino real es: `useAlertRuntime` → `AlertCapability.runtimeBinding` → `deriveRulesFromBinding` → `resolveResourceAlertConfiguration` → rules como input a `requestRuntimeConsumption`.

### QA3 — Runtime Wiring → Runtime Activation

- `activateRuntimeWiring` (`runtime-activation/RuntimeActivationCoordinator.js:43-64`) **preserva la identidad de referencia** de `configuration` y `runtimeContext`; no copia ni sustituye. El contrato prohíbe `modify-configuration`/`modify-runtimeContext` (`RuntimeActivationContract.js:29-42`). ✅ Sin substitución por defaults.
- ⚠️ También orfanado respecto al camino real (mismo hallazgo QA2).

### QA4 — Runtime → Evaluation (configuración persistida)

- El Engine recibe `{ descriptor, configuration, runtimeContext }` como **input**; nunca lee metadata ni defaults (`evaluation/AlertEvaluationEngine.js:47-51`). `requestRuntimeConsumption` evalúa internamente por regla usando `buildAlertRuleDescriptor` + `createAlertConfiguration` + `evaluateAlert` (`runtime-consumption/index.js:48-59`).
- El `AlertConfiguration` se construye copiando los campos que la regla transporta (`AlertConfiguration.js:49-54`). Si la regla no lleva campos de configuración, el policy colapsa a `remaining: null` → `green`/`NORMAL` (`RelativeRiskPolicy.js:33,103-105`).
- **Default real:** `DefaultAlertConfigurationProvider.js:11-27` (`DEFAULT_ALERT_CONFIGURATION`, `priority:'medium'`) aplicado por `MetadataNormalizer.normalizeAlertConfiguration` (`:99-123`) y `AlertPriorityPolicy.resolvePriority` (`:24`, default `'medium'` → label `'Media'`).
- ❌ **Para forms**: como la columna no se relee (QA1), la evaluación usa la configuración default (Media), no la persistida.

### QA5 — Evaluation → Consumption

- `requestRuntimeConsumption` es función pura y estadística: lee solo `request`; sin `rules` → `evaluationEntries: []` (`runtime-consumption/index.js:49,124-139`). No genera reglas por defecto (no existe `DEFAULT_ALERT_RULES`; está prohibido en `RuntimeBindingBoundary.js:9,16,70`). ✅

### QA6 — Workspace consume solo Consumption Entries

- `provideWorkspaceAlerts` lee únicamente `request.evaluationEntries` y devuelve `cards: []` si no hay entries (`workspace-alert/WorkspaceAlertProvider.js:47-52`). ✅ Consumidor puro.
- ⚠️ **No está conectado al runtime real** (idem QA2/QA3: ningún import fuera de su carpeta). El hook usa un camino legacy `AlertCapability.workspace(...)` con `alertsFromDescriptor`.

### QA7 — Dashboard consume Metrics del Consumption Layer

- El provider certificado `provideDashboardAlerts` → `adaptDashboardKpis` → `mapEvaluationsToDashboardMetrics` cuenta exclusivamente los entries pasados (`AlertConsumptionMapper.js:112-128`). ✅ Lógica certificada correcta.
- ❌ **El camino real la saltea:** `useAlertRuntime` llama `provideAlertDashboardData({...base, configurationDescriptor})` **sin `evaluationEntries`** (`useAlertRuntime.js:437-443`) → siempre `fallbackMetrics` → **0/0/0/0** (`AlertDashboardDataProvider.js:19-33,78-81`). La KPI "Alertas Activas" de la primera fila del Dashboard es otro cálculo (`dashboardCalculations.js:59-114`, cuenta respuestas SGC, no el capability de alertas).

### QA8 — Notification usa configuración persistida

- El consumer certificado consume `evaluationEntries` + `notification` transportado (`NotificationActivationAdapter.js:36-56`). ✅ Contract correcto.
- ⚠️ Al no estar conectado y depender de las entries del runtime (que para forms vienen de config default), la configuración persistida de notificación no se refleja en el camino real.

### QA9 — Lifecycle genera registros solo desde Consumption

- `provideLifecycleRecords` → `adaptLifecycleRecord` lee únicamente `entry` + `timestamp` transportado (`lifecycle/AlertLifecycleProvider.js`, `AlertLifecycleAdapter.js`). ✅ Nunca evalúa ni calcula.

### QA10 — Operational Actions respeta la configuración persistida

- `provideOperationalActions` consume `evaluationEntries` + `actions` transportados; rechaza acciones no certificadas (`operational-actions/AlertOperationalActionAdapter.js:36-63`). ✅ Consumer puro.

---

## 5. Dashboard Audit — KPIs

### KPIs certificados (correctamente conectados a la lógica)

| KPI | Fuente | Estado |
|---|---|---|
| `activeAlerts` | `mapEvaluationsToDashboardMetrics` → `list.length` (`AlertConsumptionMapper.js:123`) | ✅ Implementado (cuenta entries) |
| `criticalAlerts` | count CRITICAL/OVERDUE/red/critical (`:114-118`) | ✅ Implementado |
| `expiringDocuments` | count source=documentRepository + needsAttention (`:119`) | ✅ Implementado |
| `pendingActions` | count source=dynamicRecords + needsAttention (`:120`) | ✅ Implementado |

### Dashboard real vs. placeholders

| Ítem | Estado | Evidencia |
|---|---|---|
| KPIs "Alertas Operativas" (Activas/Críticas/Documentos por Vencer/Acciones Pendientes) | ⚠️ **Placeholder de facto: 0/0/0/0** — el hook nunca pasa entries; siempre `fallbackMetrics` | `useAlertRuntime.js:437-443`; `AlertDashboardDataProvider.js:26-33,78-81` |
| `EMPTY_ALERT_METRICS` / ramas guard del Dashboard Provider | ✅ Placeholders intencionales (ceros) | `AlertDashboardDataProvider.js:19-24,43,59,72`; `DashboardAlertProvider.js:45-51` |
| Primera fila "Alertas Activas" | ⚠️ Es `metrics.critical` de `computeDashboardMetrics` (cuenta respuestas SGC, no el capability de alertas) | `Dashboard.jsx:144-148`; `dashboardCalculations.js:59-114` |
| Tarjetas "Alertas críticas/próximas/vencidas/riesgo alto-medio-bajo/acciones pendientes/documentos próximos/alertas escaladas" | ❌ **No existen como tarjetas pobladas** — no hay lista estática de tarjetas; las tarjetas del Workspace se construyen dinámicamente desde el descriptor/evaluation y el empty-state es texto de UI | `AlertWorkspaceBuilder.js:27`; `AlertGroupingPolicy.js:11-38`; `AlertWorkspaceViewModel.js:28`; `AlertMonitoringExperience.jsx:137,147` |

**Conclusión Dashboard:** la lógica de KPIs está implementada y certificada, pero **desconectada del runtime real**. "0 Alertas / 0 Documentos / 0 Acciones" es un síntoma de wiring, no de ausencia de lógica.

---

## 6. Mapa del Pipeline Runtime → Dashboard (estado real)

```
Persistencia (sgc_forms.alert_config) ──✗──► NO se relee ──► Resolver (defaults)      [FORMS]
Persistencia (sgc_document_repositories.alert_config) ──✓──► Resolver (verbatim)       [REPOS]
                                                                        │
                                                         resolveResourceAlertConfiguration
                                                                        │
                                              useAlertRuntime.deriveRulesFromBinding  (camino REAL)
                                                                        │
                                                       requestRuntimeConsumption({rules})
                                                                        │
                                                       evaluationEntries [{descriptor,evaluation}]
                                                                        │
                    ┌──────────────────────────┬──────────────────────────────┐
                    ▼                          ▼                              ▼
       provideAlertDashboardData          (consumers certificados        (wiring/activation
       (hook, SIN evaluationEntries)       workspace/dashboard/notif/    certificados)
       → fallbackMetrics → 0/0/0/0         lifecycle/actions: NO           → ORFANADOS
       ⚠️ RUTA ROTA                        conectados al runtime)
```

Leyenda: `✗` = propagación rota · `✓` = propagación intacta · `⚠️` = desacoplado/orfanado respecto al camino real.

---

## 7. Matriz de Incidencias (Esperado vs. Actual)

| # | Componente | Estado esperado | Estado actual | Severidad |
|---|---|---|---|---|
| I1 | `dynamicService.getFormsByModule` / `getFormBySlug` | Releer `alert_config` de forms | No seleccionan la columna → defaults | **CRÍTICA** |
| I2 | `useAlertRuntime` → `provideAlertDashboardData` | Pasar `evaluationEntries` al Dashboard | No los pasa → `fallbackMetrics` 0/0/0/0 | **ALTA** |
| I3 | Wiring de los 5 consumers certificados (workspace-alert, dashboard-alert, notification-activation, lifecycle, operational-actions) al runtime real | Consumir las entries reales | Orfanados: no conectados al camino runtime | **ALTA** |
| I4 | `AlertConfigurationResolver` para forms | Leer metadata persistida | Emite `source:'default'` porque el recurso llega sin columna | **ALTA** (consecuencia de I1) |
| I5 | Primera fila KPI "Alertas Activas" del Dashboard | KPI del capability de alertas | Cuenta respuestas SGC (`dashboardCalculations`) | **MEDIA** |
| I6 | Tarjetas avanzadas del Dashboard (críticas/próximas/vencidas/escaladas/por riesgo) | Tarjetas pobladas desde Consumption | No existen (solo lógica de conteo) | **MEDIA** |

---

## 8. Plan de Remediación

### Prioridad 1 — Restaurar propagación de persistencia (I1, I4)
- **Acción:** incluir `alert_config` en la selección de `dynamicService.getFormsByModule` y `getFormBySlug` (o usar `.select('*')` / `mapFormRow` simétrico al de repos). El Resolver ya sabe extraer `resource.alertConfiguration ?? resource.alert_config` (`AlertConfigurationResolver.js:40`).
- **No toca** capas certificadas (resolver, runtime, engine, consumption) — solo el servicio de lectura de forms.

### Prioridad 2 — Conectar el Dashboard a las entries certificadas (I2)
- **Acción:** el hook `useAlertRuntime` debe pasar `evaluationEntries: consumption.evaluationEntries` a `provideAlertDashboardData` (o migrar el Dashboard al provider certificado `dashboard-alert/DashboardAlertProvider.js`), activando así `mapEvaluationsToDashboardMetrics` con datos reales.
- **No toca** el mapper certificado ni las capas de evaluación/consumption.

### Prioridad 3 — Integrar los consumers certificados al runtime real (I3)
- **Acción:** conectar `workspace-alert`, `notification-activation`, `lifecycle`, `operational-actions` como nodos del camino runtime (reemplazando el wiring legacy del hook), reutilizando sus providers ya certificados.

### Prioridad 4 — Aclarar semántica de KPIs del Dashboard (I5, I6)
- **Acción:** separar la KPI "Alertas Activas" del capability de alertas del conteo de respuestas SGC; decidir e implementar tarjetas avanzadas (críticas/próximas/vencidas/por riesgo) como vistas derivadas de las entries certificadas.

### Ya certificado — NO requiere cambio
Runtime, Evaluation Engine, Consumption Layer, `AlertConfigurationResolver` (lógica), runtime-wiring, runtime-activation, todos los providers/adapters de los 5 consumers, `mapEvaluationsToDashboardMetrics`, Lifecycle, Notification, Operational Actions.

---

## 9. Criterios de éxito — respuestas con evidencia

| Pregunta | Respuesta |
|---|---|
| ¿La configuración de `alert_config` llega al Resolver? | **Solo para `documentRepositories`** (round-trip verbatim). **Para forms NO**: la columna no se selecciona en la re-lectura (`dynamicService.js:84`). |
| ¿El Runtime consume persistida o defaults? | Para forms → **defaults** (`DefaultAlertConfigurationProvider`, priority `'medium'`/Media). Para repos → **persistida**. El wiring/activation certificados son transporte puro pero están orfanados. |
| ¿El Engine usa parámetros del usuario? | Solo si la regla transporta los campos; la configuración la provee el resolver (defaults para forms). |
| ¿Consumption refleja esas evaluaciones? | Sí, `requestRuntimeConsumption` es puro y devuelve las entries calculadas; sin rules devuelve `[]`. |
| ¿Workspace/Dashboard consumen Consumption o datos estáticos? | Los providers **certificados** consumen solo entries. **El Dashboard real NO**: el hook no pasa entries y cae a `fallbackMetrics` (ceros). El Workspace usa un camino legacy con `alertsFromDescriptor`. |
| ¿Qué KPIs están implementados y cuáles son placeholders? | Implementados: `activeAlerts/criticalAlerts/expiringDocuments/pendingActions` (lógica en `AlertConsumptionMapper.js:112-128`). Placeholder de facto en UI: la sección "Alertas Operativas" (0/0/0/0) por wiring. Primera fila "Alertas Activas": cálculo de respuestas SGC, no del capability. Tarjetas avanzadas: no existen. |

## 10. FINAL CERTIFICATION

**LEVEL 5 — ALERT CAPABILITY · END-TO-END PERSISTENCE AUDIT · RUNTIME PIPELINE VERIFICATION · DASHBOARD CONSUMPTION VERIFICATION · OPERATIONAL EXPERIENCE DIAGNOSTIC · READY FOR REMEDIATION**
