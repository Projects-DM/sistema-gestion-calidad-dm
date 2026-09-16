# Sprint 291 — Corrective Alert State Placement & Resource Surface Integration

**Branch:** `release/stable-sprint79`
**Modo:** CONTROLLED CORRECTION · FORENSIC AUDIT + VISUAL RELOCATION
**SSOT:** `docs/Sprint-291.md`
**Dependencias:** Sprint 284 · 285 · 286 · 288 · 289 · 290
**VERDICT: SPRINT 291 — CERTIFIED**

---

## 1. Objetivo

> Corregir la ubicación visual implementada en el Sprint 290.
> El estado de alerta quedó demasiado profundo en la experiencia del usuario
> (dentro del formulario cuando se ingresa a diligenciar).

La ubicación correcta es **ANTES de ingresar al formulario**:

```text
DynamicModule · FormsContent  ("Formatos Disponibles")
        ↓
Card del formato
        ↓
Estado de alerta (estado · prioridad · próximo vencimiento · próximos eventos · eventos abiertos)
        ↓
Ingresar → Formulario  (el formulario NO presenta alertas)
```

**Nota de nomenclatura:** la brief nombra la superficie "DynamicRecordsView"; en el
código real el grid "Formatos Disponibles" vive en `FormsContent`
(`src/pages/DynamicModule.jsx:69-132`). `DynamicRecordsView` es el historial de
registros (su `recordBadge` de Runtime Visibility se conserva intacto). La corrección
se ubicó donde realmente existe la card del formato.

---

## 2. Tabla de autoridad del estado (no se tocó)

```text
ALERT CONFIGURATION
        ↓
   ALERT RUNTIME (useAlertRuntime)
        ↓
 OCCURRENCE PROJECTION  ←─ la ÚNICA autoridad de estado (certificada)
        ↓
 projectResourceAlertState (util de presentación puro, Sprint 290)
        ↓
  FORMAT CARD · REPOSITORY CARD · CATEGORY CARD
```

---

## 3. F1 — FORENSIC AUDIT (obligatorio antes de modificar)

| Superficie | Qué consume actualmente | Qué debe consumir |
|---|---|---|
| `DynamicRecordsView` (:36) | `useAlertRuntime` → `visibility` → `recordBadge` (Runtime Visibility, Sprint 184). Historial de registros | Igual (historial). El `recordBadge` NO es el panel del Sprint 290 |
| `DynamicForm` (:54,:120,:370) | Antes: `{visibility, occurrences, existing}` → `formAlertState` (useMemo) + `ResourceAlertStatePanel` (panel "Alerta operacional del recurso") | **Solo** `{visibility}` → `formBadge` (Sprint 184). PANEL ELIMINADO |
| `DynamicModule FormsContent` (:69-132) | Solo `forms`/`moduleSlug`; cards SIN estado de alerta | Consume `useAlertRuntime` (1 call) → proyecta POR FORMATO con `projectResourceAlertState` → `FormatAlertState` en la card |
| `ModuleDocumentViewer` (:44-64,:271,:326) | Antes: `repositoryAlertState` (solo activo) + chips minúsculos | `repositoryAlertStates` (mapa por repositorio) + `RepositoryAlertStateBlock` rico (Repositorio y Categoría) |
| `OperationalExperienceRegistry` | — | Intacto (AC-01/AC-02; NO DELETE) |
| `useAlertRuntime` | hook certificado | Reutilizado (no duplicado: 1 call en FormsContent) |
| `projectResourceAlertState` | util puro certificado | Reutilizado en las 3 superficies |
| `AlertDashboardDataProvider` | KPI "Alertas Activas" | Intacto (Sprint 289) |

---

## 4. F2 — DynamicForm (AC-05/AC-06)

`src/pages/DynamicForm.jsx`:
- **Eliminado** `ResourceAlertStatePanel`, `RESOURCE_STATE_ICON_COMPONENTS`, `formAlertState`
  y los imports `projectResourceAlertState`/`formatExecutionTime`/`useMemo`.
- El hook consume **solo** `{ visibility }` (formBadge de Runtime Visibility, Sprint 184).
- El formulario vuelve a su responsabilidad exclusiva: **campos, validaciones,
  evidencias, acciones, persistencia + completion intent (Sprint 280)**.
- Se conservan el banner de origen (Sprint 286, `alertContext`) y el `formBadge`.

---

## 5. F3 — DynamicModule · Formatos Disponibles (TEST 01)

`src/pages/DynamicModule.jsx`:
- `FormsContent` consume `useAlertRuntime({ moduleId, module: moduleSlug, moduleSlug })`.
- `alertStatesByForm` (useMemo) proyecta el estado de alerta de CADA formato con el
  mismo proyector certificado (`resourceKind:'dynamicForms'`, resourceId = form.id).
- `FormatAlertState` (iconos estáticos a nivel módulo, patrón Sprint 286 F8) presenta
  en la card: **estado, prioridad, próximo vencimiento, próximos eventos y cantidad de
  eventos abiertos**, ANTES de la acción "Ingresar".
- Resource con alerta → card con estado; recurso sin alerta → card limpia (consume,
  no inventa).

---

## 6. F4 — ModuleDocumentViewer (AC-05/AC-06/AC-07)

`src/modules/documentViewer/ModuleDocumentViewer.jsx`:
- `repositoryAlertStates` (useMemo, mapa `repoId → projectResourceAlertState`) — una
  alerta visual POR repositorio, con los windows internos como eventos.
- `RepositoryAlertStateBlock` (iconos estáticos, patrón Sprint 286 F8) presenta en la
  card del repositorio: **Alerta operacional · Estado · Prioridad · Próximo vencimiento ·
  eventos abiertos · próximos eventos**, junto al chip "Activo".
- **Categoría:** hereda la presentación del **repositorio dueño** vía
  `category.repository_id → repository.id` (`categoryOwnerState`). **NO se inventa
  identidad de categoría** — misma evidencia root que Sprint 290 (F4).
- El `documentBadge` (Runtime Visibility) y CRUD de repositorios se conservan.

---

## 7. Acceptance Criteria — Sprint 291

| AC | Criterio | Resultado |
|---|---|---|
| AC-01 | HIDE/DETACH de Alertas en navegación primaria se mantiene | **PASS** (TEST 09) |
| AC-02 | AlertMonitoringExperience/dominio intactos (NO DELETE) | **PASS** (TEST 09) |
| AC-03 | El estado de alerta se muestra ANTES de entrar al formulario | **PASS** (TEST 01) |
| AC-04 | Card de formato conserva nombre/identificación/Ingresar/metadata | **PASS** (card `Link` intacta) |
| AC-05 | DynamicForm no muestra panel interno de alertas | **PASS** (TEST 02/03) |
| AC-06 | DynamicForm permanece como recurso real | **PASS** (TEST 02) |
| AC-07 | Repositorio consume y presenta estado real de alerta | **PASS** (TEST 04) |
| AC-08 | Repository sigue siendo el recurso real | **PASS** |
| AC-09 | Categoría se integra solo con evidencia root (`repository_id`) | **PASS** (TEST 05) |
| AC-10 | No existe AlertForm | **PASS** (TEST 10) |
| AC-11 | No existe AlertRepository | **PASS** (TEST 10) |
| AC-12 | No existe AlertCategory | **PASS** (TEST 05/10) |
| AC-13 | No se crean nuevas rutas de alertas | **PASS** (TEST 10) |
| AC-14 | No se reconstruye alertId | **PASS** (TEST 10) |
| AC-15 | No se reconstruye occurrenceId | **PASS** (TEST 10) |
| AC-16 | No se reconstruye signalKey | **PASS** (TEST 11) |
| AC-17 | Una sola alerta visual por recurso (eventos internos N) | **PASS** (TEST 06) |
| AC-18 | El usuario identifica qué formato diligenciar antes de ingresar | **PASS** (TEST 01) |
| AC-19 | El usuario identifica prioridad/vencimiento/estado en la card | **PASS** (TEST 01/07) |
| AC-20 | El usuario reporta la alerta sin entrar a la experiencia Alertas | **PASS** (AC-01+03) |
| AC-21 | Configuration desacoplada (0 cambios) | **PASS** (regresión) |
| AC-22 | Recursos no conocen Configuration (consumen proyección/estado) | **PASS** (TEST 11) |
| AC-23 | No nueva persistencia / Store / EventBus | **PASS** (TEST 11) |
| AC-24 | Sin duplicación de runtime (1 uso por superficie) | **PASS** (TEST 10) |
| AC-25 | Build PASS | **PASS** (2.43s) |
| AC-26 | Contrato Sprint 284 permanece PASS | **PASS** (21/21) |
| AC-27 | KPI Sprint 289 permanece PASS | **PASS** (10/10) |
| AC-28 | Migración visual Sprint 290 permanece PASS | **PASS** (27/27) |
| AC-29 | Lint: 0 problemas NUEVOS en el diff | **PASS** |

---

## 8. Tests obligatorios (F6)

| Test | Resultado |
|---|---|
| TEST 01 — Card de formato: estado · prioridad · próximo vencimiento · eventos · abiertos (antes de ingresar) | **PASS** |
| TEST 02 — DynamicForm no renderiza `ResourceAlertStatePanel` ni proyecta estado interno | **PASS** |
| TEST 03 — Panel Sprint 290 eliminado; formulario vuelve a su responsabilidad exclusiva | **PASS** |
| TEST 04 — Repositorio/Categoría: bloque rico + herencia root `repository_id` | **PASS** |
| TEST 05 — Sin identidad de categoría (`category:alert:...` no se construye) | **PASS** |
| TEST 06 — Una alerta visual por recurso (form A: 2 events internos, 1 estado) | **PASS** |
| TEST 07 — Prioridad/vencimiento enrichidos (Resolver envelope; head más próximo) | **PASS** |
| TEST 08 — Completion consumido, no re-derivado (open 2→1) | **PASS** |
| TEST 09 — HIDE/DETACH + dominio intacto | **PASS** |
| TEST 10 — STOP conditions (sin recursos/rutas/álgebra/duplicación) | **PASS** |
| TEST 11 — Proyector puro: consume clasificador certificado + envelope; nunca identidad | **PASS** |
| TEST 12 — `formatExecutionTime` (label UI) | **PASS** |

`node scripts/sprint-291-alert-state-placement.mjs` → **50/50 PASS**.

---

## 9. Regression Matrix

| Área | Resultado |
|---|---|
| Configuration | 0 cambios |
| Supabase / Schema / Persistence | 0 cambios |
| OccurrenceProjection / Lifecycle / Schedule | 0 cambios |
| CompletionSignal / CompletionBridge / Ledger | 0 cambios |
| Workspace / Dashboard KPI (Sprint 289) | 0 cambios · 10/10 PASS |
| Sprint 284 contract | 21/21 PASS |
| Sprint 290 visual migration | 27/27 PASS |
| Sprint 280 isolation | PASS (vía TEST 04bis 289) |
| Build | PASS (2.43s) |
| Lint | 0 problemas NUEVOS en el diff (10 preexistentes HEAD: DynamicModule 5E+1W, DynamicForm 1E, ModuleDocumentViewer 3E) |

---

## 10. STOP Conditions (resultado)

| STOP | Estado |
|---|---|
| Necesita modificar Configuration | **NO DISPARADO** (0 cambios) |
| Necesita modificar AlertCapability / OccurrenceProjection / OccurrenceLifecycle / Completion | **NO DISPARADO** |
| Necesita crear Store / EventBus / persistencia / tablas | **NO DISPARADO** |
| Necesita crear AlertForm / AlertRepository / AlertCategory | **NO DISPARADO** |
| Necesita nuevas rutas / experiencias | **NO DISPARADO** |
| Necesita duplicar useAlertRuntime | **NO DISPARADO** (1 call por superficie) |
| Necesita reconstruir alertId / occurrenceId / signalKey | **NO DISPARADO** |
| Necesita modificar modelos DynamicForm / Repository / Category | **NO DISPARADO** |

---

## 11. Veredicto

**SPRINT 291 — CERTIFIED**

- El estado de alerta se presenta **antes** de ingresar al formulario (card de formato)
  y en tarjetas **enriquecidas** de Repositorio y Categoría (raíz `repository_id`).
- `DynamicForm` ya no aloja panel de alerta: vuelve a ser el recurso real con sus
  responsabilidades exclusivas.
- Una autoridad de estado (OccurrenceProjection) → proyector puro → cards.
  0 duplicación funcional, 0 cambio de dominio, Configuration intacta.
- Tests: 50/50 (291) + 27/27 (290) + 10/10 (289) + 21/21 (284) + Sprint 280 isolation + Build PASS.

---

## 12. Roadmap (provisional)

```text
289 → Dashboard KPI Consolidation                         ✅ CERTIFIED
290 → Alert State Visual Migration to Real Resources       ✅ CERTIFIED
291 → Corrective Alert State Placement (this doc)          ✅ CERTIFIED
291+ → (pendiente) — decisión de ciclo de vida de
      AlertMonitoringExperience + posibles superficies globales.
```

Los números posteriores no quedan certificados por este documento.