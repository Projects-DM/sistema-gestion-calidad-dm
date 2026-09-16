# Sprint 290 — Alert State Visual Migration to Real Resources

**Branch:** `release/stable-sprint79`
**Modo:** CONTROLLED ARCHITECTURAL UI MIGRATION · FORENSIC AUDIT + IMPLEMENTATION
**Producción:** 1 util Puro Presentacional nuevo + 4 archivos de frontera visual (DynamicModule, DynamicForm, ModuleDocumentViewer) + 1 script de certificación. **0 cambios** en Configuration, Persistence, Schema, Scheduler, Completion, OccurrenceProjection, OccurrenceLifecycle, Workspace o Dashboard KPI.
**SSOT:** `docs/Sprint-290.md`
**Dependencias:** Sprint 280 · 284 · 285 · 286 · 287 · 288 · 289
**VERDICT: SPRINT 290 — CERTIFIED**

---

## 1. Principio rector implementado

> **Una alerta no es un recurso. Una alerta es ESTADO de un recurso.**

```text
ALERT CONFIGURATION
        ↓
   ALERT RUNTIME (useAlertRuntime)
        ↓
 OCCURRENCE PROJECTION  ←─ la ÚNICA autoridad de estado
        ↓
    ALERT STATE
        ↓
FORM · REPOSITORY · CATEGORY   ←─ la UI del RECURSO REAL consume → presenta
        ↓
      TRABAJO REAL
```

- La identidad del recurso sigue perteneciendo al recurso.
- La identidad de la alerta sigue perteneciendo al dominio certificado (Sprint 284).
- La UI **solamente los presenta juntos**.

---

## 2. F1 — Auditoría del punto de montaje de Alertas

| Superficie | Hallazgo | Evidencia |
|---|---|---|
| Montaje de `AlertMonitoringExperience` | Carga **lazy** vía `OperationalExperienceRegistry` bajo `alert-monitoring` con nombre **"Alertas"** | `enterprise-activation/index.js:42-115` (metadata name en :45; `resolveComponent` lazy en :114); montada solo en el tab `operational-experiences` de `DynamicModule.jsx:367-374` |
| Tabs del módulo | Config-driven desde `CapabilityPublicSet.getTabs()` (`CapabilityPublicSet.js:94-105`); labels en `CapabilityPackageRegistry.js:64-100` | `DynamicModule.jsx:330` |
| Experiencias habilitadas | `getEnabledExperiences()` filtra `availableExperiences` por `enabledExperiences` (`CapabilityPublicSet.js:142-149`); enrichment desde registry en `CapabilityPublicSetAdapter.js:120-138` | |
| Rutas de alertas | **No existen** rutas propias; solo `:moduleSlug`, `:moduleId`, `modulo/:moduleSlug/:formSlug` (`App.jsx:58-60`). `ExistingModuleRouteResolver.resolveActionRoute` mapea acciones → rutas canónicas existentes | `ExistingModuleRouteResolver.js:79-113` |
| Consumers de `useAlertRuntime` | 5 callers: DynamicRecordsView (:36), AlertMonitoringExperience (:390), ModuleDocumentViewer (:39), DynamicForm (:54), Dashboard (:83) | |

---

## 3. F2/F5 — Auditoría del dominio proyectable (la autoridad)

- **`useAlertRuntime`** expone `occurrences` (proyección certificada) + `existing` (snapshot CRUD puro para enriquecimiento) — hook `src/hooks/useAlertRuntime.js:348+`.
- **OccurrenceProjection** proyecta SOLO `forms` y `repositories` (`OccurrenceProjection.js:81`); el VO viaja con: `occurrenceId, alertId, resourceKind ('dynamicForms'|'documentRepository'), resourceId, moduleId, startsAt, dueAt, timezone, sequence, status, completion, createdAt` (contrato `OccurrenceContract.js:19-32`).
- **El VO NO lleva `formId`/`categoryId`/`repositoryId`/`moduleSlug`.** La única unión UI→recurso real es por **`resourceKind` + `resourceId`** (id ?? slug) — el mismo join que `AlertMonitoringExperience.projectConsumedCards` (líneas 224-228).

### Decisiones de autoridad
- Classification para la UI = **`OccurrenceLifecycle.classifyOccurrence`** certificado (window + completion precedence, OCC-CERT-08) — nunca re-derivado (F6).
- Completion consumido desde `occurrence.completion.signalKey` (ledger) — nunca re-query (F9).
- `startsAt/dueAt` consumidos de la proyección — nunca se recalcula schedules (Gate C).
- Priority/enabled para la presentación = ENRIQUECIMIENTO desde la envoltura del Resolver (`resolveResourceAlertEnvelope`, DEC-263) sobre el recurso real — nunca nuevo SSOT (Sprint 285 F3).

---

## 4. F3/F4 — Auditoría Category (STOP obligatorio evaluado)

- **Evidencia de relación real y estable:** `category.repository_id → repository.id` — confirmado en `documentRepositoriesService.mapCategoryRow` (`:39`) y `ResourceVisibilityValidator.js:41-44`.
- La alerta está configurada **sobre el Repository** (resourceKind `documentRepository`, resourceId = repository.id), nunca sobre la categoría.
- **PROYECCIÓN:** la categoría PRESENTA el estado de alerta de **su repositorio dueño** (presentación heredada, root = `category.repository_id`).
- **NO se inventa identidad:** NO `alertId = category.id`, NO `category:alert:...`. La identidad queda en el repositorio (`:alert:0`). **STOP conditions: 0 disparadas.**

---

## 5. F5b — HIDE/DETACH (no DELETE)

`DynamicModule.jsx`:
- `DETACHED_EXPERIENCE_KEYS = ['alert-monitoring']` — la experiencia "Alertas" deja la lista de experiencias operacionales visibles al usuario (`visibleExperiences`, useMemo sobre `getEnabledExperiences()`).
- Si al detachar la experiencia la lista queda vacía, el tab "Experiencias Operacionales" se oculta (`visibleTabs`) — no queda un tab muerto.
- **No DELETE DOMAIN:** `AlertMonitoringExperience`, el registry, el runtime, el workspace contractual y AlertCapability permanecen intactos (AC-01/AC-02).

---

## 6. F5 — Nuevo util puro de presentación: `src/utils/alertResourceState.js`

**Tipo: presentation selector puro** (consume → presenta). NO es un adaptador, NO es una capacidad, NO es runtime. Recibe las `occurrences` **ya proyectadas** y el recurso real, y:

- Agrupa por `resourceKind + resourceId` → **UNA alerta visual por recurso** con los windows internos como **eventos** (AC-17).
- Clasifica cada evento con `classifyOccurrence` certificado (más bucket `disabled` SOLO si `enabled === false` del envelope, no-Open).
- Enriquece `priority`/`priorityLabel`/`enabled` desde la envoltura del Resolver (DEC-263).
- Expone: `present, status, statusLabel, color, icon, priority, priorityLabel, nextDue, nextExecution, total, openCount, hasOpen, events[]`.
- Exporta también `formatExecutionTime` (label-only HH:mm/día).

**Nunca:** `alertConfigIdOf`, `occurrenceIdOf`, window recompute, ledger query, localStorage, persistencia, store, EventBus (verificado por TEST 21).

---

## 7. F6 — DynamicForm (AC-03/AC-04)

`src/pages/DynamicForm.jsx`:
- Consume `{ visibility, occurrences, existing }` de `useAlertRuntime` (mismo hook, sin duplicar runtime).
- `formAlertState = useMemo(() => projectResourceAlertState({ occurrences, resourceKind:'dynamicForms', resourceId: formDef.id ?? slug, resource }))`.
- `ResourceAlertStatePanel` (iconos estáticos a nivel módulo, patrón Sprint 286 F8) presenta: **"Alerta operacional del recurso"** → estado, prioridad, próximo vencimiento y **eventos internos** (ocurre: secuencia y hora).
- El formulario **sigue siendo el recurso real** (nombre, campos, evidencias, save). El panel es estado presentado, no un segundo formulario. Alertas legacy `formBadge` conservadas.

---

## 8. F7 — ModuleDocumentViewer (AC-05/AC-06/AC-07)

`src/modules/documentViewer/ModuleDocumentViewer.jsx`:
- Consume `{ visibility, occurrences, existing }`; `repositoryAlertState` (useMemo) sobre `resourceKind:'documentRepository'`, resourceId = `activeRepositoryId`.
- **Repositorio activo:** chip de alerta con estado + próximo vencimiento sobre el item del repositorio (una alerta visual por repositorio, eventos internos).
- **Categorías:** chip de alerta **heredado del repositorio dueño** (condición `String(c.repository_id) === String(activeRepositoryId)`) — evidencia base root, identidad nunca en la categoría.
- El `documentBadge` (Runtime Visibility) existente se conserva. El repositorio sigue siendo el recurso real (repos/categorías/documentos/upload/PDF).

---

## 9. Aceptance Criteria — Sprint 290

| AC | Criterio | Resultado |
|---|---|---|
| AC-01 | Alertas deja de aparecer como experiencia operacional visible principal | **PASS** (detach presentacional; tab oculto si vacío) |
| AC-02 | No se elimina el dominio Alert | **PASS** (registry + componente intactos) |
| AC-03 | DynamicForm consume estado real de alerta | **PASS** (occurrences → projector → panel) |
| AC-04 | El formulario continúa siendo el recurso real | **PASS** |
| AC-05 | Repository consume estado real de alerta | **PASS** |
| AC-06 | Repository continúa siendo el recurso real | **PASS** |
| AC-07 | Category se integra únicamente con evidencia | **PASS** (root `category.repository_id → repository`) |
| AC-08 | No existe AlertForm | **PASS** (TEST 21) |
| AC-09 | No existe AlertRepository | **PASS** (TEST 21) |
| AC-10 | No existe AlertCategory | **PASS** (presentación heredada; NO clase/componente) |
| AC-11 | No se crean nuevas rutas de alertas | **PASS** (grep `alertas` en App.jsx = 0) |
| AC-12 | No se reconstruye alertId | **PASS** (0 fórmulas en fronteras) |
| AC-13 | No se reconstruye occurrenceId | **PASS** (0 fórmulas en fronteras) |
| AC-14 | No se reconstruye signalKey | **PASS** (consumido del VO) |
| AC-15 | No se recalcula completion | **PASS** (TEST 18: lee ledger vía proyección) |
| AC-16 | No se recalcula lifecycle | **PASS** (usa classifyOccurrence certificado) |
| AC-17 | Múltiples occurrences bajo un único estado visual del recurso | **PASS** (TEST 14: form A → 1 alerta, 2 eventos) |
| AC-18 | El usuario identifica qué formulario diligenciar | **PASS** (estado en la card del formulario real) |
| AC-19 | El usuario identifica prioridad/vencimiento/estado | **PASS** (TEST 17) |
| AC-20 | El usuario no necesita entrar a Alertas | **PASS** (Alertas fuera de navegación primaria) |
| AC-21 | AlertMonitoringExperience no es intermediario de recursos | **PASS** (DynamicForm/Viewer consumen useAlertRuntime directo) |
| AC-22 | No se introduce persistencia | **PASS** |
| AC-23 | No se introduce Store | **PASS** |
| AC-24 | No se introduce EventBus | **PASS** |
| AC-25 | Build PASS | **PASS** (2.61s) |
| AC-26 | Contrato Sprint 284 permanece PASS | **PASS** (21/21) |
| AC-27 | Aislamiento Sprint 280 permanece PASS | **PASS** (TEST 04bis del Sprint 289: A completed no satisface B/C) |
| AC-28 | Sprint 289 KPI permanece PASS | **PASS** (10/10) |

---

## 10. Tests obligatorios (F12)

| Test | Resultado |
|---|---|
| TEST 14 — One visual alert per resource (1 alerta, eventos internos) | **PASS** |
| TEST 15 — Per-resource isolation (B no leakea a A) | **PASS** |
| TEST 16 — Recurso sin alerta → sin estado (consume, no inventa) | **PASS** |
| TEST 17 — Prioridad enrichida por evento (Resolver envelope) | **PASS** (A=high, B=medium; head = vencimiento más próximo) |
| TEST 18 — Completion consumido, no re-derivado (ledger) | **PASS** (open 2→1; evento completado queda interno) |
| TEST 19 — Repository + Category (identidad en repositorio; NO category identity) | **PASS** |
| TEST 20 — HIDE/DETACH de navegación; dominio intacto | **PASS** |
| TEST 21 — STOP conditions (no AlertForm/AlertRepository/AlertCategory, sin álgebra, sin rutas) | **PASS** |
| TEST 22 — formatExecutionTime (label UI) | **PASS** |

`node scripts/sprint-290-alert-state-visual-migration.mjs` → **27/27 PASS**.

---

## 11. F13 — Regression Matrix

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
| Repository → Category | 0 cambios (categoría sigue siendo recurso real) |
| Dashboard KPI (Sprint 289) | 0 cambios · 10/10 PASS |
| Sprint 284 contract | 21/21 PASS |
| Sprint 280 isolation | PASS (vía TEST 04bis 289) |
| Build | PASS (2.61s) |
| Lint | 0 problemas NUEVOS en mi diff (util=0; UI = solo errores preexistentes HEAD) |

---

## 12. STOP Conditions (resultado)

| STOP | Estado |
|---|---|
| Necesita crear identidad nueva (category:alert:...) | **NO DISPARADO** — TEST 19/21 |
| Necesita modificar alertId / occurrenceId / signalKey | **NO DISPARADO** |
| Necesita modificar Completion | **NO DISPARADO** (0 cambios) |
| Necesita modificar Configuration | **NO DISPARADO** (0 cambios) |
| Necesita crear persistencia / Store / EventBus | **NO DISPARADO** |
| Necesita crear AlertForm / AlertRepository / AlertCategory / nueva experiencia / nuevo store / duplicar runtime | **NO DISPARADO** |

---

## 13. Veredicto

**SPRINT 290 — CERTIFIED**

- Alertas ya no es una superficie funcional que el usuario visita; pasó a ser **información operacional que el recurso real muestra** (formulario, repositorio, categoría).
- 1 autoridad de estado (OccurrenceProjection) → UI consume → presenta. 0 duplicación funcional.
- Categorías con evidencia (root `repository_id`), sin inventar identidad.
- HIDE/DETACH con dominio intacto (AC-02); migración visual, no eliminación arquitectónica.
- Tests: 27/27 (Sprint 290) + 21/21 (284) + 10/10 (289) + Sprint 280 isolation + Build PASS.

---

## 14. Roadmap (provisional)

```text
289 → Dashboard KPI Consolidation                         ✅ CERTIFIED
290 → Alert State Visual Migration to Real Resources       ✅ CERTIFIED
291 → (pendiente) — posible Global Alert Center unificado
      sobre la autoridad de proyección existente, o decisión
      de ciclo de vida de AlertMonitoringExperience.
```

Los números posteriores no quedan certificados por este documento.