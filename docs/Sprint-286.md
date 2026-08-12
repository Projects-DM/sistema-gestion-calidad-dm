# Sprint 286 — Form / Repository Alert UI Migration & Presentation Hardening

**Branch:** `release/stable-sprint79`
**Modo:** ARCHITECTURAL UI IMPLEMENTATION + PRESENTATION HARDENING + CERTIFICATION
**Producción:** `src/modules/experiences/AlertMonitoringExperience.jsx` + `src/pages/DynamicForm.jsx` (fronteras de consumo autorizadas) · **0 cambios** en dominio/persistencia/configuración
**SSOT:** `docs/Sprint-286.md`
**Dependencias:** Sprint 280 · 283 · 284 · 285
**Estado final:** **SPRINT 286 — EN EJECUCIÓN**

---

## 1. Objetivo

Completar la migración visual iniciada en Sprint 285: las alertas se perciben como ESTADO OPERACIONAL
de los recursos reales, no como una segunda experiencia funcional que duplica formularios, registros o
repositorios.

```text
RECURSO REAL                          ALERT STATE
     │                                   │
     ├── Datos reales                    ├── prioridad
     ├── Registros/documentos reales     ├── vencimiento
     ├── Estado operacional              ├── cumplimiento
     │                                   └── navegación al recurso real
     └── ALERT STATE
```

La alerta no es un recurso; no crea pantallas paralelas, registros, formularios ni repositorios.
Proyecta y presenta estado sobre el recurso existente.

---

## 2. Contexto certificado (Sprint 284/285)

```text
AlertConfigurationResolver.alertConfigIdOf  →  identidad canónica (284)
OccurrenceProjection                        →  SSOT de proyección (284)
AlertMonitoringExperience                   →  consumo de ocurrencias reales (285)
```

Sprint 286 NO vuelve a introducir lógica de identidad. La UI hace
`CONSUMIR → CLASIFICAR → PRESENTAR → NAVEGAR`. Nunca `RECONSTRUIR → RESOLVER → PERSISTIR`.

---

## 3. Cambios ejecutados

### F8 — ESLint / resolveAlertIcon (resuelto)

`src/modules/experiences/AlertMonitoringExperience.jsx`

- El warning pre-existente `react-hooks/static-components` (`resolveAlertIcon(card.icon)` dentro de
  render, reportado desde Sprint 284 AC-22) queda resuelto.
- Los componentes de ícono se resuelven UNA vez en scope de módulo (mapa congelado
  `CARD_ICON_COMPONENTS`) y se indexan por `card.status` en render. `resolveAlertIcon` nunca se invoca
  dentro del render.
- Expresión permitida por el sprint: corrección de capa de presentación únicamente. No se tocó
  identidad, occurrences, completion, runtime ni configuración.

Resultado: `npx eslint src/modules/experiences/AlertMonitoringExperience.jsx` → **0 errores**.

### F1 — DynamicForm: integración visual del estado/alerta (banner de origen)

`src/pages/DynamicForm.jsx`

- Al llegar **desde una alerta** (`location.state.alertContext` existente y válido), el formulario REAL
  presenta un banner contextual "Vienes de una alerta operacional" consumiendo
  `alertContext.alertId` / `alertContext.occurrenceId` — identidades canónicas YA transportadas por
  `ExistingModuleRouteResolver` (Sprint 280 F2). Nunca reconstruidas.
- DynamicForm sigue siendo el formulario real → registro real → completion real (Sprint 280 F4). El
  banner es presentación contextual, no un componente nuevo (`AlertForm`/`AlertRecord` NO existen).
- No se agregaron errores ESLint (el único hallazgo del archivo, `setEvidenceRequired` línea 116, es
  pre-existente y verificado idéntico en baseline `git stash`).

### F2 — Repository: integración verificada (sin cambios)

- La UI del repositorio real (`ModuleDocumentViewer`) **ya** presenta el estado de alerta sobre los
  documentos reales vía `documentBadge` (`visibility?.badges?.documentRepository`, Runtime Visibility,
  Sprint 184). El patrón de consumo está intacto.
- No se introdujo `AlertRepository`/`AlertDocument`/`AlertRepositoryViewer`.
- Frontera `Repository → Category`: **fuera de alcance** (Sprint 287).

---

## 4. F6 — Evidencia de identidad (0 fórmulas locales)

Búsqueda exhaustiva sobre `src` (excluyendo el dominio certificado
`core/capabilities/alert`):

| Patrón | Resultado |
|--------|-----------|
| `` `${source}:${resourceId}:${idx}` `` | **0 hits** |
| `` `${resource.id}:${index}` `` como alertId | **0 hits** |
| `` `${resourceKind}:${resourceId}:${index}` `` | **0 hits** |
| `` `${alertId}:occ:${seq}` `` / `:occ:` en consumidores | **0 hits** |
| `` `${...}:alert:${...}` `` / `:alert:` en consumidores | **0 hits** |
| `alertConfigIdOf` | SOLO en Resolver/Enrollment/Projection/index (SSOT) |

La UI consume `occurrence.alertId`, `occurrence.occurrenceId`, `occurrence.completion.signalKey`;
nunca los reconstruye (AC-24).

---

## 5. F9 — Auditoría de componentes obsoletos

| Patrón | Resultado |
|--------|-----------|
| `AlertForm` | **0 hits** |
| `AlertRecord` / `new AlertRecord` | **0 hits** |
| `AlertRepository` / `AlertRepositoryViewer` | **0 hits** |

No existen referencias muertas de la arquitectura anterior; no hubo limpieza especulativa.
Regla cumplida: `USED → conservar` · `DEAD → documentar` · `ORPHAN → eliminar solo con evidencia`
· `UNKNOWN → no tocar`. Nada que eliminar.

---

## 6. Acceptance Criteria — estado

| AC | Criterio | Estado |
|----|----------|--------|
| AC-01 | DynamicForm continúa siendo el formulario real | **PASS** |
| AC-02 | Repository continúa siendo el recurso real | **PASS** |
| AC-03 | Alert UI no crea recursos paralelos | **PASS** |
| AC-04 | Alert UI consume occurrences | **PASS** |
| AC-05 | alertId no se reconstruye | **PASS** (grep §4) |
| AC-06 | occurrenceId no se reconstruye | **PASS** (grep §4) |
| AC-07 | signalKey no se reconstruye | **PASS** |
| AC-08 | Navegación usa recurso real | **PASS** |
| AC-09 | ExistingModuleRouteResolver SSOT de navegación | **PASS** |
| AC-10 | classifyOccurrence SSOT temporal | **PASS** |
| AC-11 | Completion intacto | **PASS** |
| AC-12 | A/B/C aisladas | **PASS** (contrato Sprint 284/280) |
| AC-13 | No existe AlertForm | **PASS** (§5) |
| AC-14 | No existe AlertRecord | **PASS** (§5) |
| AC-15 | No existe AlertRepository | **PASS** (§5) |
| AC-16 | No existe persistencia nueva | **PASS** |
| AC-17 | Configuration intacta | **PASS** |
| AC-18 | Repository → Category fuera de alcance | **PASS** |
| AC-19 | Workspace fuera de alcance | **PASS** |
| AC-20 | Dashboard KPI fuera de alcance | **PASS** |
| AC-21 | No se crea nueva ruta de alertas | **PASS** |
| AC-22 | AlertMonitoringExperience es monitor, no CRUD | **PASS** |
| AC-23 | Presentación separa temporalidad y completion | **PASS** |
| AC-24 | No existe identidad local en UI | **PASS** (§4) |
| AC-25 | ESLint de frontera limpio | **PASS** (AlertMonitoring 0 errores; DynamicForm solo pre-existente) |
| AC-26 | Build exitoso | **PASS** (`npm run build`, 2.54s) |
| AC-27 | Contrato Sprint 284 21/21 permanece PASS | **PASS** |
| AC-28 | Aislamiento Sprint 280 permanece PASS | **PASS** |
| AC-29 | No se introducen servicios paralelos | **PASS** |
| AC-30 | No se duplica metadata persistida | **PASS** |

> **Nota AC-25:** `npm run lint` global reporta 137 errores PRE-EXISTENTES (verificado por
> `git stash` en baseline) en archivos fuera del alcance de este sprint. La frontera autorizada
> (`AlertMonitoringExperience.jsx`) queda a 0 errores y `DynamicForm.jsx` no agrega ninguno nuevo.

---

## 7. Pruebas obligatorias — estado

| TEST | Verificación | Estado |
|------|--------------|--------|
| TEST 01 | Form real → DynamicForm real (same resourceId/alertId/occurrenceId) | **PASS** |
| TEST 02 | Repository real → NO AlertRepository | **PASS** (§5) |
| TEST 03 | Completion A→completed · B→pending · C→pending; luego A→completed B→completed C→pending | **PASS** (contrato 284 TEST 03/04) |
| TEST 04 | Identidad `12:alert:0` y `12:alert:0:occ:<seq>` sin construcción UI | **PASS** (⇒§4) |
| TEST 05 | Sin alertas → `occurrences=[]`, `completion=null` | **PASS** |
| TEST 06 | Todas las acciones terminan en resource real, nunca alert-specific route | **PASS** |
| TEST 07 | ESLint `react-hooks/static-components resolveAlertIcon(card.icon)` corregido | **PASS** (F8) |
| TEST 08 | `npm run build` exitoso | **PASS** (2.54s) |

---

## 8. Evidencia requerida

1. **Archivos modificados:** `src/modules/experiences/AlertMonitoringExperience.jsx`,
   `src/pages/DynamicForm.jsx`, `docs/Sprint-286.md` (este documento).
2. **Archivos nuevos:** `docs/Sprint-286.md`.
3. **Archivos eliminados:** ninguno.
4. **Imports eliminados (AlertMonitoringExperience):** `resolveResourceAlertCollection`,
   `extractResourceAlertCollection`, `parseAnchor`, `cadenceMs`, `computeTarget`, `occurrenceWindowAt`,
   `OccurrenceLedger`. **Imports agregados (DynamicForm):** `Bell` (lucide-react).
5. **Grep identidades locales:** 0 formulaciones (§4).
6. **Grep AlertForm/AlertRecord/AlertRepository:** 0 hits (§5).
7. **ESLint:** AlertMonitoringExperience → 0 errores; DynamicForm → solo pre-existente (baseline).
8. **Build:** `npm run build` PASS (2.54s).
9. **Contrato Sprint 284:** ALL PASS (21/21).
10. **Aislamiento Sprint 280:** PASS (TEST 03/04/06 del contrato 284).
11. **Navegación Form:** `resolveActionRoute('open-form')` → recurso real + `alertContext` contextual.
12. **Navegación Repository:** `resolveActionRoute('go-to-document')` → recurso real.

---

## 9. Regla de parada

No se necesitó activar. Ningún cambio tocó: Configuration · Supabase · Schema · Ledger ·
CompletionBridge · CompletionSignal · Lifecycle · Schedule · Enrollment · Repository → Category.

---

## 10. Resultado arquitectónico

```text
                   REAL RESOURCE
                         │
          ┌──────────────┴──────────────┐
          │                             │
     DynamicForm                 Repository
          │                             │
     Real Records                Real Documents
          │                             │
          └──────────────┬──────────────┘
                         │
                  OccurrenceProjection
                         │
                  Alert State / VO
                         │
             ┌───────────┴───────────┐
             │                       │
        Alert Monitor           Real Resource UI
             │                       │
        priorización             trabajo real
             │                       │
             └───────────┬───────────┘
                         │
                    Completion
```

Las alertas no son otro lugar donde trabajar; son una forma de encontrar y priorizar trabajo que ya
existe dentro del sistema.

---

## 11. Estado final

```text
SPRINT 286 — FORM / REPOSITORY ALERT UI MIGRATION & PRESENTATION HARDENING

IDENTITY:      Sprint 284 canonical identity — CONSUMED ONLY
PROJECTION:    OccurrenceProjection — SSOT
FORMS:         DynamicForm — REAL RESOURCE (+ banner de origen contextual)
REPOSITORIES:  Repository — REAL RESOURCE (documentBadge verificado)
ALERTS:        Monitoring / prioritization layer
NAVIGATION:    ExistingModuleRouteResolver → REAL RESOURCE
COMPLETION:    Sprint 280 chain — INTACT
CONFIGURATION: INTACT
PERSISTENCE:   INTACT
CATEGORY:      OUT OF SCOPE → Sprint 287
WORKSPACE:     OUT OF SCOPE → Sprint 288
DASHBOARD:     OUT OF SCOPE → Sprint 289
ESLINT:        PRE-EXISTING PRESENTATION ISSUE → RESOLVED (F8)

VERDICT:  SPRINT 286 — EN EJECUCIÓN (F1/F8 ejecutadas; build + contratos PASS)
Siguiente: Sprint 287 — Repository → Category Audit/Re-Anchoring
```