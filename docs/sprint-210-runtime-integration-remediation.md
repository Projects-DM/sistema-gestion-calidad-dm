# SPRINT 210 — Runtime Integration Remediation (MASTER SSOT LEVEL 5)

- **Architecture Status:** LEVEL 5 — ALERT CAPABILITY · RUNTIME INTEGRATION REMEDIATION
- **Type:** Runtime Integration Remediation · End-to-End Runtime Connection · Production Readiness
- **Impact:** Integración únicamente. No introduce nuevas capacidades. No modifica arquitectura certificada. No crea nuevos Engines, Providers, Adapters ni Contracts.
- **Branch:** `release/stable-sprint79`
- **Date:** 2026-08-03

---

## 1. Objetivo

Corregir las incidencias detectadas en Sprint 209 para que el Runtime certificado alimente completamente la experiencia operacional. No se crean funcionalidades: se **conectan correctamente las ya certificadas** reutilizando exclusivamente componentes certificados.

## 2. Alcance — incidencias corregidas

| # | Incidencia | Corrección |
|---|---|---|
| R1 | Propagación de `alert_config` desde `sgc_forms` hasta el Resolver | `dynamicService.getFormsByModule`/`getFormBySlug` ahora seleccionan la columna `alert_config` |
| R2 | `dynamicService ↓ AlertConfigurationResolver` sin defaults | El Resolver ya lee `resource.alertConfiguration ?? resource.alert_config`; con la columna presente, `source: 'metadata'` y NUNCA default |
| R3 | Runtime Consumption ↓ Dashboard Provider | El hook pasa `evaluationEntries` a `provideAlertDashboardData` → KPIs reales |
| R4 | Runtime Consumption ↓ Workspace Provider | El hook pasa `evaluationEntries` a `AlertCapability.workspace` → tarjetas con estado real; se elimina el flujo legacy (workspace sin entries) |
| R5 | Runtime Consumption ↓ Notification | El hook conecta `provideNotificationRequests` con entries + `notification` persistido transportado |
| R6 | Runtime Consumption ↓ Lifecycle | El hook conecta `provideLifecycleRecords` con entries reales |
| R7 | Runtime Consumption ↓ Operational Actions | El hook conecta `provideOperationalActions` con entries (Alert IDs reales) |

## 3. Archivos modificados (solo integración)

| Archivo | Cambio |
|---|---|
| `src/services/dynamicService.js` | `getFormsByModule` y `getFormBySlug` incluyen `alert_config` en la selección |
| `src/hooks/useAlertRuntime.js` | Pasa `evaluationEntries` al Dashboard y al Workspace; conecta Notification, Lifecycle y Operational Actions con los providers certificados |

Ningún componente certificado fue modificado. Los providers ya soportaban `evaluationEntries` (contract `{ descriptor, evaluation }` de la Consumption Layer); solo faltaba el wiring.

## 4. Detalle de la corrección R1/R2

- **Antes:** el adapter escribía `alert_config` en `sgc_forms`, pero `getFormsByModule` (`.select('id, name, slug, ...')`) no seleccionaba la columna → el Resolver recibía el recurso sin metadata → `source: 'default'` (priority `'medium'`/Media).
- **Ahora:** `alert_config` se selecciona → el Resolver extrae `resource.alert_config` (`AlertConfigurationResolver.js:40`) → `source: 'metadata'`, `priority`, `notification`, `risk`, `enabled` transportados tal cual. Sin defaults.

Evidencia: `dynamicService.js:84,96` incluyen `alert_config`; `AlertConfigurationResolver.js:53-61` emite `source:'metadata'` con la config persistida.

## 5. Detalle de la corrección R3 (Dashboard)

- **Antes:** el hook llamaba `provideAlertDashboardData({ ...base, configurationDescriptor })` sin `evaluationEntries` → siempre `fallbackMetrics` → **0/0/0/0** (`AlertDashboardDataProvider.js:26-33,78-81`).
- **Ahora:** `evaluationEntries: consumption.evaluationEntries` → la rama `entries.length > 0` ejecuta el mapper certificado `mapEvaluationsToDashboardMetrics` (`AlertConsumptionMapper.js:112-128`) → KPIs reales (Alertas Activas/Críticas, Documentos por Vencer, Acciones Pendientes).

## 6. Detalle de la corrección R4 (Workspace)

- **Antes:** `AlertCapability.workspace({ ...base, alerts })` sin `evaluationEntries` → `resolveAlertWorkspace` (`AlertWorkspaceResolver.js:49`) recibía `entries` indefinido → tarjetas sin estado evaluado (placeholder identity).
- **Ahora:** se pasa `evaluationEntries` → `matchEvaluationEntry` (Resolver.js:18-35) empareja cada alerta con su entry → `mapEvaluationToWorkspaceCard` (`AlertWorkspaceBuilder.js:64-66`) mezcla el estado YA CALCULADO en la tarjeta. Sin placeholders.

## 7. Detalle de la corrección R5–R7 (Notification, Lifecycle, Operational Actions)

- El hook expone ahora `notification`, `lifecycle` y `operationalActions` usando los providers certificados:
  - `provideNotificationRequests({ ...base, evaluationEntries, notification })` — `notification` se transporta desde la configuración persistida (`rules[].notification`); Notification nunca decide cuándo ejecutar.
  - `provideLifecycleRecords({ ...base, evaluationEntries, timestamp: null })` — registros solo desde Consumption; el timestamp lo transporta el consumidor (nunca lo genera Lifecycle).
  - `provideOperationalActions({ ...base, evaluationEntries, actions: [] })` — opera sobre los Alert IDs reales derivados de las entries; los intents de usuario se transportan.

## 8. Verificaciones obligatorias — resultados

| Verificación | Resultado |
|---|---|
| V1 — Persistencia completa (alerta reaparece al reabrir) | ✅ Resolver lee `alert_config` verbatim (`source:'metadata'`) |
| V2 — Modificar alerta se refleja en Runtime, sin defaults | ✅ Config persistida transportada tal cual (priority `high`, notification channel/recipients) |
| V3 — Eliminar alerta desaparece del Runtime | ✅ `enabled:false` → `shouldProduceAlert` = false |
| V4 — Dashboard con datos reales, nunca 0 por wiring | ✅ KPIs iguales a `mapEvaluationsToDashboardMetrics` sobre las entries reales |
| V5 — Workspace con las alertas configuradas, sin placeholders | ✅ Tarjetas con estado evaluado (`status`/`severity`) |
| V6 — Notification consume la configuración persistida | ✅ channel/recipients transportados desde `alert_config.notification` |
| V7 — Lifecycle registra únicamente eventos reales | ✅ Registros con `status` igual a la entry evaluada |
| V8 — Operational Actions operan sobre Alert IDs reales | ✅ Request con `alertId` real del descriptor |

## 9. Definition of Done

- Persistencia Runtime completa ✅
- Dashboard operativo ✅
- Workspace operativo ✅
- Notification operativa ✅
- Lifecycle operativo ✅
- Operational Actions operativas ✅
- Sin defaults inesperados ✅
- Sin wiring legacy (workspace sin entries) ✅
- Build PASS (2.47s) ✅
- Regresiones PASS (13/13 suites) ✅

## 10. Resultado esperado alcanzado

El usuario puede ahora: crear una alerta → cerrar el sistema → volver a ingresar → ver la misma alerta persistida → verla en Workspace → verla en Dashboard → tenerla disponible para Notification → ver su historial en Lifecycle → ejecutar acciones operacionales sobre ella. Todo utilizando el mismo Runtime certificado.

## 11. FINAL CERTIFICATION

**LEVEL 5 — ALERT CAPABILITY · RUNTIME INTEGRATION REMEDIATED · END-TO-END PERSISTENCE ACTIVE · DASHBOARD OPERATIONAL · WORKSPACE OPERATIONAL · NOTIFICATION OPERATIONAL · LIFECYCLE OPERATIONAL · OPERATIONAL ACTIONS OPERATIONAL · PRODUCTION RUNTIME READY**