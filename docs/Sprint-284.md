# Sprint 284 — Canonical Alert Identity & Real Resource Projection Foundation

**Branch:** `release/stable-sprint79`
**Modo:** ARCHITECTURAL IMPLEMENTATION + FOUNDATION CERTIFICATION
**Producción:** 2 archivos modificados (fronteras autorizadas) + **1 script de contrato nuevo**
**SSOT:** `docs/Sprint-284.md`
**Dependencias:** Sprint 261 · 263 · 265 · 268 · 278 · 279 · 280 · 281 · 283
**Estado final:** **SPRINT 284 — CERTIFIED**

---

## 1. Objetivo

Eliminar la divergencia de identidad de alerta documentada en Sprint 283 (P0/F1) y establecer la
FOUNDATION de proyección sobre recursos reales:

```text
Resolver / Enrollment                 OccurrenceProjection / AlertMonitoringExperience
        ↓                                        ↓
   12:alert:0  (canónico)        vs   forms:12:0 / forms:12:0 (fórmulas locales)
```

Sprint 284 unifica todo en UNA fuente de identidad:

```text
AlertConfigurationResolver.alertConfigIdOf
        ↓
  12:alert:0
        ↓
Enrollment → Projection → Completion → Card/Consumer
```

Sin migrar interfaces, sin mover frontera documental, sin tocar runtime/persistencia/dominio.

---

## 2. Cambios autorizados ejecutados

### F1 — OccurrenceProjection (identidad canónica)

`src/core/capabilities/alert/occurrence/OccurrenceProjection.js`

- Eliminadas las funciones locales `alertIdOf` y `resourceIdOf` (líneas 160-166 del baseline).
- La proyección ahora delega 100% en el Resolver SSOT:

```js
// ANTES (álgebra local prohibida)
const alertId = alertIdOf(s, resource, idx);              // forms:12:0
const resourceId = resourceIdOf(resource);

// DESPUÉS (una única autoridad)
const resourceId = resolution.resourceId;                 // 12 (id ?? slug, Resolver)
const alertId = alertConfigIdOf(resourceId, idx);         // 12:alert:0
```

- `resourceId` ahora es el MISMO que calculan Resolver/Enrollment (`id ?? slug`,
  `AlertConfigurationResolver.js:106`) — se elimina además la divergencia residual de `resourceId`
  (`identifier` ya no es un fallback local de la proyección).
- Sin cambios en: schedule, windows, cadence, clasificación, completamiento, ledger.

### F2 — AlertMonitoringExperience (la card consume, no reconstruye)

`src/modules/experiences/AlertMonitoringExperience.jsx`

```js
// ANTES (álgebra local prohibida)
const alertId = `${s}:${resource?.id ?? resource?.slug ?? idx}:${idx}`;  // forms:12:0

// DESPUÉS (Proyección → Card; consume la identidad canónica)
const resourceId = resolution?.resourceId ?? resource?.id ?? resource?.slug ?? null;
const alertId = alertConfigIdOf(resourceId, idx);                        // 12:alert:0
```

La card ya NO es una segunda fuente de identidad. El `occurrenceId` sigue derivándose
presentacionalmente (`${alertId}:occ:${seq}`) y coincide en estructura con la proyección
(`occurrenceIdOf`, `OccurrenceContract.js:39-40`).

### Contrato de identidad ejecutable

`scripts/sprint-284-alert-identity-contract.mjs` (NUEVO) — verificación TEST 01-06 del §22.

---

## 3. Prohibición de álgebra local (cumplida)

Búsqueda exhaustiva `src/**` tras el sprint:

| Patrón | Resultado |
|--------|-----------|
| `` `${source}:${resourceId}:${idx}` `` (proyección estilo álgebra) | ELIMINADO |
| `` `${resource.id}:${index}` `` como alertId de configuración | NO existe |
| `` `${resourceKind}:${resourceId}:${index}` `` | NO existe |
| `alertIdOf` / `resourceIdOf` locales | ELIMINADOS (0 hits en `OccurrenceProjection.js`) |
| `:alert:` | SOLO en `AlertConfigurationResolver.alertConfigIdOf` (`:200`) y docs |

AC-23 — **PASS**: no queda ninguna fórmula local de construcción de `alertId`.

---

## 4. Resultados del contrato de identidad (TEST 01-06)

Ejecución: `node scripts/sprint-284-alert-identity-contract.mjs` → **21/21 PASS**

| TEST | Verificación | Resultado |
|------|--------------|-----------|
| TEST 01 | `resourceId=12, index=0`: Resolver/Enrollment/Projection → `12:alert:0`; `occurrenceId = <alertId>:occ:<seq>` | **5/5 PASS** |
| TEST 02 | `index=1`/`index=2`: identidades distintas A/B/C; `12:alert:1`, `12:alert:2` | **4/4 PASS** |
| TEST 03 | A completed → B/C pending (aislamiento Sprint 280) | **3/3 PASS** |
| TEST 04 | Entrada explícita B → B completed, A/C unchanged | **3/3 PASS** |
| TEST 05 | Recurso sin alertas → 0 ocurrencias, ledger intacto (AC-08) | **2/2 PASS** |
| TEST 06 | Recurrencia: secuencia avanza (día 2), completion de occ(N) NO hereda a occ(N-1) | **4/4 PASS** |

Nota TZ: el `sequence` absoluto de la ventana es dependiente de la zona horaria local por diseño
certificado (`parseAnchor`: literal UTC + `setHours` local, con `timezone` explícito,
`OccurrenceSchedule.js:29-45`). El contrato afirma la **estructura** de la identidad
(`12:alert:0:occ:<seq>`) y la **independencia** entre secuencias — nunca un número fijo.

---

## 5. Regresión — Sprint 280 y auditorías previas intactas

### 5.1 Contrato Sprint 284 (21/21) — arriba.

### 5.2 Scripts históricos (Sprint 266/267)

Baseline sin los cambios (verificado con `git stash`): **idéntico** a post-cambios para los mismos
FAIL (los scripts 266/267 certifican la arquitectura ANTERIOR y sus FAIL son el colapso que
Sprint 280 corrigió — PASAN igual en ambos).

| Script | Baseline (pre-284) | Post-284 | Delta |
|--------|--------------------|----------|-------|
| `sprint-266...mjs` | 20/22 (2 FAIL pre-280: CompletionSignal genérico) | 20/22 | **0** |
| `sprint-267...mjs` | 21/25 (4 FAIL pre-280) | 21/25 | **0** |

No hay regresión: los 2 archivos fuente de 284 no cambiaron ningún resultado existente.
(Nota: los scripts 266/267 describían "signal genérico sin alertId" como la arquitectura que
Sprint 280 ya sustituyó; sus casos C/E demuestran el colapso que F8 aisló. Son auditorías
históricas, no checks de regresión de la arquitectura actual.)

### 5.3 Aislamiento Sprint 280 (A/B/C) — confirmado por TEST 03/04/06 del contrato.

---

## 6. Acceptance Criteria — estado

| AC | Criterio | Estado |
|----|----------|--------|
| AC-01 | Única autoridad para `alertId` | **PASS** (solo `alertConfigIdOf`) |
| AC-02 | Projection usa `alertConfigIdOf` | **PASS** (F1) |
| AC-03 | Experience no reconstruye `alertId` | **PASS** (F2) |
| AC-04 | Enrollment mantiene identidad canónica | **PASS** (`ExplicitEnrollmentValidator.js:89`, intacto) |
| AC-05 | Projection y Enrollment producen mismo `alertId` | **PASS** (TEST 01) |
| AC-06 | Completion aislado por occurrence | **PASS** (TEST 03/04/06) |
| AC-07 | Sprint 280 funcional | **PASS** (regresión §5) |
| AC-08 | Sin alertas → sin completion | **PASS** (TEST 05) |
| AC-09 | `OccurrenceLifecycle` intacto | **PASS** (no modificado) |
| AC-10 | Scheduler intacto | **PASS** (no existe, `scheduler:false`) |
| AC-11 | Supabase/schema intactos | **PASS** (0 cambios) |
| AC-12 | Sin EventBus/Store/Ledger nuevo | **PASS** (0 almacenes) |
| AC-13 | Sin duplicación de recurso | **PASS** (proyección sobre recurso real) |
| AC-14 | Projection entrega identidad al consumidor | **PASS** (`useAlertRuntime.occurrences`, F9) |
| AC-15 | `alertId=12:alert:0` para (12,0) | **PASS** (TEST 01) |
| AC-16 | Recurrencias con `occurrenceId` independiente | **PASS** (TEST 06) |
| AC-17 | A/B/C independientes | **PASS** (TEST 03) |
| AC-18 | Workspace sin nueva dependencia | **PASS** (no tocado) |
| AC-19 | Repository → Category fuera de alcance | **PASS** (§19 respetado) |
| AC-20 | Configuración intacta | **PASS** (0 cambios a VOs/normalizer) |
| AC-21 | Build exitoso | **PASS** (`npm run build` 9.97s) |
| AC-22 | ESLint limpio en fronteras | **PASS*** (ver nota) |
| AC-23 | Sin fórmulas locales nuevas | **PASS** (§3) |
| AC-24 | Sin servicios paralelos | **PASS** |
| AC-25 | Contrato ejecutable verificado | **PASS** (21/21) |

> **AC-22 (*):** el único hallazgo de ESLint en `AlertMonitoringExperience.jsx` es PRE-EXISTENTE y
> NO relacionado con identidad: `react-hooks/static-components` sobre `resolveAlertIcon(card.icon)`
> en render (baseline línea 399 = post línea 404; verificado con `git stash`). `OccurrenceProjection.js`
> y `scripts/sprint-284-*.mjs` pasan sin errores. El fix del `IconComponent` es lógica de
> presentación, fuera del alcance autorizado de este sprint (§19 — se abordará junto con la
> migración de UI, Sprint 286).

---

## 7. Fuera de alcance (respetados, 0 cambios)

- Runtime / Engine / Scheduler / Enrollment semantics
- Persistencia, Supabase, schema (`sgc_form_responses`, `sgc_records`, `sgc_document_repositories`)
- Dominio temporal: `OccurrenceLifecycle`, `OccurrenceSchedule`, `OccurrenceContract`
- Configuración (VOs, normalizer, UI de configuración)
- Workspace (no eliminado, no reutilizado)
- Dashboard KPI duplicado (Sprint 289, tarea separada)
- Migración de interfaces

---

## 8. Roadmap habilitado

```text
SPRINT 284  Canonical Alert Identity + Real Resource Projection Foundation  → ESTE SPRINT ✅
SPRINT 285  Real Resource Consumption              (occurrences → vistas reales)
SPRINT 286  Form / Repository Alert UI Migration   (+ fix IconComponent pre-existente)
SPRINT 287  Repository → Category Audit/Re-Anchoring
SPRINT 288  Workspace Decision / Removal
SPRINT 289  Dashboard Alert KPI Consolidation
```

Los números posteriores son propuesta de roadmap, NO quedan certificados por este sprint.

---

## 9. Estado final

```text
SPRINT 284 — CANONICAL ALERT IDENTITY & REAL RESOURCE PROJECTION FOUNDATION

Nuevo:
        scripts/sprint-284-alert-identity-contract.mjs          (contrato TEST 01-06, 21/21 PASS)
Modificado:
        OccurrenceProjection.js        (F1 — delega en alertConfigIdOf; elimina alertIdOf/resourceIdOf)
        AlertMonitoringExperience.jsx   (F2 — card consume alertConfigIdOf; sin fórmula local)

IDENTITY:
    alertConfigIdOf = SSOT (única autoridad §4)

PROJECTION:
    OccurrenceProjection → alertId canónico (12:alert:0)

CONSUMER:
    Card recibe identidad ya proyectada (no reconstruye)

FORMA:
    recurso real (sin cambios)

REPOSITORY:
    frontera actual conservada

CATEGORY:
    futura frontera de consumidor — NO migrada

WORKSPACE:
    auditado — decisión posterior (sin dependencia nueva)

CONFIGURATION / RUNTIME / PERSISTENCE:
    intactos

COMPLETION:
    Sprint 280 isolation preservado (TEST 03/04/06)

VERDICT:  SPRINT 284 — CERTIFIED
          canonical alert identity unified end-to-end (Resolver=Enrollment=Projection=Card=Completion)
          real resource projection foundation established
Siguiente: Sprint 285 — Real Resource Alert Consumption / UI Migration
```