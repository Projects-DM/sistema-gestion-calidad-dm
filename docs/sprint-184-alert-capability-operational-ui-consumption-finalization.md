# Sprint 184 — Alert Capability Operational UI Consumption Finalization (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — END-TO-END OPERATIONAL CERTIFIED + UI CONSUMPTION FINALIZED
- **Type:** UI Consumption Integration · Architecture Certification
- **Impact:** Dynamic Forms · Dynamic Records · Document Repository · Dashboard · Alert Monitoring Experience
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-01
- **Result:** **15/15 PASS** · Build 2.34s · 29 contratos · 1 hook de consumo UI · 0 componentes paralelos

---

## 1. Objetivo

Finalizar el consumo operacional del Alert Capability desde las superficies UI existentes, cerrando el Sprint 183. **El Sprint 184 no introduce lógica nueva ni componentes paralelos**: la UI consume exclusivamente las superficies certificadas del runtime (`runtimeConsumption`, `runtimeVisibility`, `workspace`, `AlertDashboardDataProvider`) a través de **un único puente de consumo**.

## 2. Decisiones del usuario

| Pregunta | Decisión |
|----------|----------|
| ¿Cómo consume la UI el contexto de alertas? | **`runtimeConsumption` una sola vez** → `alertContext` por motor → alimenta `runtimeVisibility` / `workspace` / `AlertDashboardDataProvider`. Consumo puro, sin re-derivar. |
| ¿Dónde se renderiza el workspace? | **Dentro de la pestaña de experiencias** del módulo: `OperationalExperienceRegistry.resolveComponent('alert-monitoring')` → `AlertMonitoringExperience.jsx` (experiencia `renderable: true`). |

## 3. Puente de consumo único (SSOT de la UI)

`src/hooks/useAlertRuntime.js` es **el único** punto de entrada de la UI hacia el Alert Capability. Toda superficie consume el mismo runtime truth:

```js
const { consumption, visibility, workspace, dashboard } = useAlertRuntime({ moduleId, module, moduleSlug });
```

| Superficie UI | Surfaces consumidas |
|---------------|---------------------|
| `DynamicForm.jsx` | `runtimeConsumption` → `runtimeVisibility.badges.dynamicForms` |
| `DynamicRecordsView.jsx` | `runtimeConsumption` → `runtimeVisibility.badges.dynamicRecords` |
| `ModuleDocumentViewer.jsx` | `runtimeConsumption` → `runtimeVisibility.badges.documentRepository` |
| `Dashboard.jsx` | `AlertDashboardDataProvider` → `{activeAlerts, criticalAlerts, expiringDocuments, pendingActions}` |
| `AlertMonitoringExperience.jsx` | `workspace` → ViewModel (cards / groups.byPriority / summary) + Action Descriptors |

Reglas demo (`DEFAULT_ALERT_RULES`): 3 reglas representativas (`dynamicForms` temperature-control high, `dynamicRecords` mantenimiento critical, `documentRepository` poe-limpieza medium). No existe store persistido de reglas en la app; fluyen por las superficies certificadas exactamente como reglas reales.

## 4. Matriz de certificación — Resultados

| # | Validación | Resultado |
|---|-----------|-----------|
| A1 | Runtime consume todos los motores existentes (forms/records/repository/dashboard) | **PASS** |
| A2 | Dynamic Forms consume contexto (badge/estado/prioridad/tooltip/acción) | **PASS** |
| A3 | Dynamic Records consume contexto (estado/prioridad/acción) | **PASS** |
| A4 | Document Repository consume contexto (próximo a vencer / vencido) | **PASS** |
| A5 | Dashboard consume métricas del provider (sin admin/navigate) | **PASS** |
| B1 | Workspace ViewModel: tarjetas con Tipo/Origen/Prioridad/Estado/Mensaje | **PASS** |
| B2 | Cada tarjeta consume un Action Descriptor navegable | **PASS** |
| B3 | Navegación: Formulario → `open-form` → `dynamicForm` | **PASS** |
| B4 | Navegación: Registro → `open-record` → `dynamicRecord` | **PASS** |
| B5 | Navegación: Documento → `open-document` → `document` | **PASS** |
| SSOT1 | Alert Monitoring única experiencia renderable, sin package | **PASS** |
| SSOT2 | Sin componentes paralelos en la facade | **PASS** |
| SSOT3 | UI consume únicamente ViewModels y Descriptors | **PASS** |
| SSOT4 | Sin ejecución permitida en superficies UI | **PASS** |
| SSOT5 | 29 contratos intactos + superficies runtime visibles | **PASS** |

**Resultado: 15/15 PASS, 0 FAIL.**

## 5. Navegación del workspace

`AlertMonitoringExperience` traduce **únicamente** el `Action Descriptor` en una ruta React Router (nunca calcula rutas, nunca consulta Runtime):

| Action | Destino |
|--------|---------|
| `open-form` | `/modulo/${moduleSlug}/${action.resourceId}` |
| `open-record` | `/modulo/${moduleSlug}` → state `{ tab: 'records' }` |
| `open-document` | `/modulo/${moduleSlug}` → state `{ tab: 'repository' }` |

`DynamicModule` ahora honra el tab pasado por `location.state?.tab` (incluyendo cuando el usuario ya está dentro del módulo) — cambios en `src/pages/DynamicModule.jsx`.

## 6. Detalle de verificación

- `OperationalExperienceRegistry.getExperience('alert-monitoring')` → `metadata.renderable: true`, `resolveComponent` presente.
- `CapabilityPublicSet.getEnabledExperiences()` incluye `alert-monitoring` cuando el módulo tiene la capability `operational-experiences` (default: todas las experiencias del registry).
- `viewModel.summary` expone `total/critical/high/medium/low/forms/records/documents` (coincide con el header de `AlertMonitoringExperience`).
- Tarjetas exponen `tipo`, `origen`, `priorityLabel`, `estado`, `navigable`, `navigationLabel`, `action.*`.
- `groups.byPriority` = críticas → altas → medias → bajas, con `{priority, label, count, cards}`.
- `useAlertRuntime` consume `runtimeConsumption` una sola vez; `visibility`/`workspace`/`dashboard` derivan del mismo resultado (SSOT, sin re-consultas).

## 7. Auditoría SSOT

| Principio | Verificación | Estado |
|-----------|--------------|--------|
| Reutilización | Dynamic Forms, Records, Repository, Dashboard, Runtime, Resolver, Assignment, Workspace | ✅ |
| Desacoplamiento | Sin Supabase directo desde Core · sin React Router desde Core · sin motores paralelos | ✅ |
| Prohibiciones | Sin Alert Module/Runtime/Engine/Dashboard paralelos · sin lógica de navegación duplicada | ✅ |
| Puente único | `useAlertRuntime` = único hook de consumo UI | ✅ |

## 8. Definition of Done — Cumplimiento

- [x] La UI consume `runtimeConsumption` una sola vez por superficie.
- [x] Dynamic Forms muestra el badge de alerta del runtime.
- [x] Dynamic Records muestra el badge por registro.
- [x] Document Repository muestra el badge de documento (próximo a vencer / vencido).
- [x] Dashboard consume las métricas del provider (sin admin/navigate).
- [x] Alert Monitoring se renderiza como experiencia en la pestaña de experiencias.
- [x] Navegación por Action Descriptors (form/record/document) con tab correcto.
- [x] Sin componentes paralelos ni lógica duplicada.
- [x] Build exitoso (2.34s).
- [x] Auditoría SSOT aprobada.

## 9. Certificación

```
LEVEL 4
ALERT CAPABILITY
OPERATIONAL UI CONSUMPTION FINALIZED

Runtime Consumption ................ ✅
Runtime Visibility ................. ✅
Workspace ViewModel ............... ✅
Action Descriptors ................ ✅
Dynamic Forms Badge ............... ✅
Dynamic Records Badge ............. ✅
Document Repository Badge ......... ✅
Dashboard Metrics ................. ✅
Alert Monitoring Experience ....... ✅
SSOT Compliance ................... ✅

100% Existing Engine Reuse
100% Runtime Integration
100% Single Consumption Bridge
0 Parallel Runtime
0 Parallel Dashboard
0 Parallel Business Logic
```

## 10. Pendientes globales

- Commitear docs sin trackear (145+) y aclarar estrategia de ramas (`release/stable-sprint79` vs `operativo-v1`).
- `src/modules/dashboard/services/dashboardService.js` (143.AUD) debe consumir Alert Contracts en lugar de Supabase directo.
