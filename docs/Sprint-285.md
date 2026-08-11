# Sprint 285 — Real Resource Alert Consumption / UI Migration

**Branch:** `release/stable-sprint79`
**Modo:** ARCHITECTURAL IMPLEMENTATION + CONSUMPTION MIGRATION + CERTIFICATION
**Producción:** cambios únicamente en las fronteras de consumo autorizadas · 0 cambios en configuración, persistencia, schema, scheduler o dominio temporal
**SSOT:** `docs/Sprint-285.md`
**Dependencias:** Sprint 280 · 283 · 284
**Estado objetivo:** **SPRINT 285 — EN EJECUCIÓN**

---

## 1. Objetivo

Tras la certificación de Sprint 284, la identidad ya no debe reconstruirse en la experiencia de alertas.

Sprint 285 ejecuta el siguiente paso:

Las alertas dejan de comportarse como una segunda colección de registros y pasan a comportarse como una proyección operacional de los recursos reales existentes.

Arquitectura objetivo:

```text
                    RECURSO REAL
                         │
              ┌──────────┴──────────┐
              │                     │
        Dynamic Form          Document Repository
              │                     │
       registros reales       documentos reales
              │                     │
              └──────────┬──────────┘
                         │
                 Alert Projection
                         │
              ┌──────────┴──────────┐
              │                     │
        estado temporal       cumplimiento
        overdue/today        completed/pending
              │                     │
              └──────────┬──────────┘
                         │
                 UI de consumo
```

La alerta no crea un recurso nuevo. La alerta no crea un registro paralelo. La alerta no crea una
experiencia operacional adicional para representar el mismo dato. La alerta solamente proyecta
información sobre el recurso real.

---

## 2. Principio rector

```text
RESOURCE
   ↓
REAL RESOURCE IDENTITY
   ↓
OCCURRENCE PROJECTION
   ↓
ALERT STATE
   ↓
REAL RESOURCE UI
```

La experiencia de alertas deja de ser una segunda entrada funcional al sistema. Pasa a ser,
progresivamente, una capa de observación y priorización.

---

## 3. Alcance exacto

- **F1 — Dynamic Forms:** consumir las ocurrencias proyectadas desde el recurso/formulario real
  (module · form · record · occurrence · alert state), sin entidad de formulario alternativa.
- **F2 — Document Repositories:** consumir la proyección de alerta sobre el repositorio real. La
  transición `Repository → Category` permanece reservada para Sprint 287.
- **F3 — AlertMonitoringExperience:** vista operacional de alertas, no duplicado de registros.
- **F4 — Navegación:** la acción principal lleva al recurso real (Existing Form / Existing Repository),
  nunca a una alerta-specific form experience.

---

## 4. Cambios ejecutados

### F3 — `src/modules/experiences/AlertMonitoringExperience.jsx`

El experience pasa a ser consumidor puro de la proyección:

- `useAlertRuntime` entrega **`{ existing, occurrences }`**. `occurrences` son los AlertOccurrence VOs
  ALREADY proyectados por `OccurrenceProjection` (identidad, ventana y completion SSOT). `existing` se
  usa SOLO para enriquecimiento visual.
- Reemplazada `projectConfigCards` (re-derivación local de anchors/ventanas/ledger/identidad) por
  **`projectConsumedCards`**: mapa ocurrencia proyectada → card consumiendo
  `alertId` / `occurrenceId` / `signalKey` / `startsAt` / `dueAt` DIRECTAMENTE de la proyección.
- **Enriquecimiento** (nunca segunda identidad): título/prioridad/canal/frecuencia/habilitado se
  resuelven desde el recurso REAL localizado en `existing` por `resourceId` vía Resolver SSOT
  (`resolveResourceAlertEnvelope`, DEC-263).
- **Clasificación** de presentación: `classifyOccurrence` (OccurrenceLifecycle, window + completion
  precedence) sobre la ocurrencia proyectada. Nunca `remainingMs` como decisor.
- **Navegación**: `ExistingModuleRouteResolver.resolveActionRoute` con `resourceId` REAL del recurso
  (form slug/identifier). Prohibido construir rutas con alertId/occurrenceId/index local.
- **Eliminados del consumidor** (Gate C): `parseAnchor/cadenceMs/computeTarget/occurrenceWindowAt`,
  `OccurrenceLedger.completionSignalFor`, `derivedState`, `deriveFormState` y la construcción local de
  `alertId`/`occurrenceId`.

### F1/F2 — Reutilización

No se crearon `AlertForm`, `AlertRecord`, `AlertRepository`, `AlertRecordViewer` ni CRUD de alertas.
DynamicForm/Repository existentes permanecen como recursos reales; la alerta solo abre el recurso.

---

## 5. Completion — frontera inamovible

Sprint 285 NO modifica `CompletionSignal`, `CompletionBridge`, `OccurrenceLedger`,
`OccurrenceLifecycle`, `OccurrenceSchedule`. La certificación Sprint 280 continúa válida:
`A → completed`, `B → completed`, `C → pending`; `resource shared ≠ occurrence shared`. El cambio es
solo DÓNDE se presenta y consume la ocurrencia, no CÓMO se certifica el completion.

---

## 6. Acceptance Criteria — estado

| AC | Criterio | Estado |
|----|----------|--------|
| AC-01 | AlertMonitoring consume occurrences reales | **PASS** (F3, `useAlertRuntime.occurrences`) |
| AC-02 | No crea registros paralelos | **PASS** (proyección de solo lectura) |
| AC-03 | Form alert abre DynamicForm real | **PASS** (descriptor `open-form` + resourceId real) |
| AC-04 | Repository alert abre Repository real | **PASS** (descriptor `go-to-document`) |
| AC-05 | alertId permanece canónico | **PASS** (se consume, no se construye) |
| AC-06 | occurrenceId permanece canónico | **PASS** (se consume, no se construye) |
| AC-07 | Completion continúa en DynamicForm | **PASS** (cadena Sprint 280 intacta) |
| AC-08 | Ledger permanece intacto | **PASS** (0 cambios, no importado por consumidor) |
| AC-09 | A/B/C continúan aisladas | **PASS** (contrato Sprint 280, TEST 03/04) |
| AC-10 | No se crea AlertForm | **PASS** (grep sin hits) |
| AC-11 | No se crea AlertRecord | **PASS** (grep sin hits) |
| AC-12 | No se crea AlertRepository | **PASS** (grep sin hits) |
| AC-13 | No se duplica metadata persistida | **PASS** (enrichment read-only) |
| AC-14 | Repository → Category permanece fuera de alcance | **PASS** (0 cambios) |
| AC-15 | Configuration permanece intacta | **PASS** (0 cambios) |
| AC-16 | Workspace permanece sin dependencia nueva | **PASS** (0 cambios) |
| AC-17 | No se introduce nueva persistencia | **PASS** |
| AC-18 | No se introduce EventBus nuevo | **PASS** |
| AC-19 | No se modifica scheduler/domain temporal | **PASS** |
| AC-20 | Navigation usa identidad del recurso real | **PASS** |
| AC-21 | UI no reconstruye alertId | **PASS** (grep `:alert:` sin hits en consumidor) |
| AC-22 | UI no reconstruye occurrenceId | **PASS** (grep `:occ:` sin hits en consumidor) |
| AC-23 | ExistingModuleRouteResolver continúa reutilizado | **PASS** |
| AC-24 | Build exitoso | **PASS** (`npm run build`, 2.40s) |
| AC-25 | Contrato Sprint 284 permanece PASS | **PASS** (21/21) |
| AC-26 | Contrato Sprint 280 permanece PASS | **PASS** (aislamiento conservado) |

> **Nota ESLint:** el único hallazgo en la frontera es PRE-EXISTENTE (`react-hooks/static-components`
> sobre `resolveAlertIcon(card.icon)`, ya documentado en Sprint 284 AC-22) y queda diferido a la
> migración UI de Sprint 286. No fue introducido por este sprint.

---

## 7. Pruebas obligatorias — estado

| TEST | Verificación | Estado |
|------|--------------|--------|
| TEST 01 | Form real → Occurrence → DynamicForm real (same resourceId/alertId/occurrenceId) | **PASS** (consumo directo de proyección) |
| TEST 02 | Repository real → sin representación paralela | **PASS** |
| TEST 03 | Completion A → A COMPLETED, B/C PENDING | **PASS** (contrato Sprint 280) |
| TEST 04 | Acción 1 → A completed; Acción 2 → B completed; C pending | **PASS** |
| TEST 05 | Recurso sin alertas → 0 alert completions | **PASS** |
| TEST 06 | Identidad `resourceId=12, index=0` → `12:alert:0` y `12:alert:0:occ:<seq>` | **PASS** (contrato Sprint 284) |

---

## 8. Prohibiciones explícitas — cumplidas

NO nuevos servicios de alertas · NO nuevos stores · NO nuevas tablas · NO cambios Supabase · NO cambios
schema · NO cambios configuration · NO cambios scheduler · NO cambios lifecycle · NO cambios ledger ·
NO nuevos formularios de alerta · NO nuevos repositorios de alerta · NO duplicación de registros · NO
segunda fuente de identidad.

Búsquedas sobre el consumidor migrado: `AlertForm`, `AlertRecord`, `AlertRepository`, `:alert:`, `:occ:`,
`alertConfigIdOf`, `completionSignalFor` → **0 formulaciones locales de identidad**.

---

## 9. Fuera de alcance (respetados, 0 cambios)

- Repository → Category (Sprint 287) · Workspace removal (Sprint 288) · Dashboard KPI (Sprint 289)
- ISO document residence · Multiples alert configuraciones por recurso · Persistence migration
- Config redesign · Occurrence lifecycle redesign · `IconComponent` ESLint fix (Sprint 286)

---

## 10. Estado final

```text
SPRINT 285 — REAL RESOURCE ALERT CONSUMPTION / UI MIGRATION

IDENTITY:
    Sprint 284 canonical identity preserved (consumido, nunca reconstruido)
PROJECTION:
    OccurrenceProjection remains the SSOT projection layer
FORMS:
    Alert → DynamicForm real resource
REPOSITORIES:
    Alert → Repository real resource
COMPLETION:
    DynamicForm → CompletionIntent → CompletionBridge → Ledger
DUPLICATION:
    Alert does not create or represent a second record
CONFIGURATION:   intact
PERSISTENCE:     intact
CATEGORY:        not migrated — Sprint 287
WORKSPACE:       not decided — Sprint 288
DASHBOARD:       not consolidated — Sprint 289
MULTIPLE ALERTS: not introduced

VERDICT:  SPRINT 285 — EN EJECUCIÓN (F1-F4 implementadas; build + contratos PASS)
Siguiente: Sprint 286 — Form / Repository Alert UI Migration (+ fix IconComponent)
```