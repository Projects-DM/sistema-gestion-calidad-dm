# Sprint 341 — Alert Recurrence Temporal Engine Forensic Audit

**Estado:** **CERTIFIED · 137/137** · 0.1s · timebox OK
**Nivel:** 5 · **Tipo:** FORENSIC ARCHITECTURE AUDIT · AUDIT ONLY
**Precedentes:** Sprints 306 · 307 · 308 · 309 · 310 · 340
**Suite:** `scripts/sprint-341-alert-recurrence-temporal-engine-forensic-audit.mjs`
**Production Source Changes:** 0

---

## Clasificación final

```
FINAL CLASSIFICATION: TEMPORAL ENGINE CERTIFIED
STATUS:                CERTIFIED
SCOPE:                 ALERT RECURRENCE / COMPLETION / EXPIRATION / NEXT WINDOW
```

El motor de recurrencia activo implementa **exactamente** el modelo anclado requerido:
`windowStart = startDate + startTime (local)` · `windowEnd = windowStart + period` ·
`completedAt` **no** redefine la ventana · la siguiente ventana es **derivada**.

## Pipeline rastreado (INPUT → TRANSFORM → TIMESTAMP → OWNER)

| Etapa | Módulo | Semántica temporal |
|---|---|---|
| Configuration Source | `sgc_forms.alert_config` / `sgc_document_repositories.alert_config` | `{ alertConfigurations: [{ periodicity, startDate, startTime }] }` |
| Metadata | `AlertConfigurationResolver.extractResourceAlertCollection` | Único lector de storage keys |
| Normalizer | `MetadataNormalizer.normalizePeriodicity` | `{ amount, unit }` validado (amount>0, unit ∈ PERIODICITY_UNITS) |
| Resolver | `resolveResourceAlertCollection` → AlertConfiguration VO | Config inalterada, congelada |
| Schedule | `OccurrenceSchedule.parseAnchor` | `startDate` (local midnight) + `startTime` (HH:MM) → anchor ms |
| Recurrence | `occurrenceWindowAt(anchor, periodicity, now)` | `startsAt = anchor+(N-1)*period` · `dueAt = startsAt+period` (fin **exclusivo**) |
| Completion | `CompletionBridge → OccurrenceLedger` | `occurrence::<alertId>::<occurrenceId>` · durable localStorage |
| Current State | `OccurrenceLifecycle.classifyOccurrence` | `COMPLETED` precedencia absoluta |
| Projection | `projectCurrentOccurrences` → AlertOccurrence VO | `now` transportado (nunca calculado en dominio) |
| Presentation | `projectResourceAlertState` | 0 re-derivación (consume classifyOccurrence) |

## Respuestas forenses Q01–Q15

- **Q01/Q02**: frecuencia almacenada en metadata del recurso, llega como `{ amount, unit }` AS-IS.
- **Q03**: normalizada en `MetadataNormalizer.normalizePeriodicity` (única).
- **Q04/Q05**: `windowStart = anchor(startDate+startTime LOCAL)` · `windowEnd = start + period`.
- **Q06**: la ventana usa **fecha + hora** (startDate + startTime HH:MM).
- **Q07**: ventana **estable** durante el ciclo (anchor fijo; `now` solo selecciona la secuencia).
- **Q08**: `completedAt` → OccurrenceLedger (durable, replay al boot).
- **Q09**: `classifyOccurrence` (COMPLETED con precedencia absoluta).
- **Q10/Q11**: expiración y próxima recurrencia **derivadas** por `occurrenceWindowAt`/`computeTarget` (nunca persistidas).
- **Q12**: el motor Sprint 199 (`evaluateAlert`/PeriodicEvaluationStrategy) existe pero es **temporalmente inerte** en el runtime (useAlertRuntime no entrega `runtimeContext` → `nextDue=null`, NORMAL). La autoridad activa es la de Ocurrencias.
- **Q13**: 0 dependencia de UI (presentación sin imports/llamadas al schedule).
- **Q14**: dependencia del momento de consulta **sí**, por diseño — `now` se transporta y solo selecciona la ventana.
- **Q15**: dependencia del timezone **local** (ensamblado local, CAL386); sin conversión UTC/IANA en el dominio.

## Pruebas determinísticas

- **T16 (DAILY + completion 15:00)**: 12:01→ACTIVE · 15:00→COMPLETED · 23:59/00:00/11:59→COMPLETED · 12:00→NEXT WINDOW (ACTIVE) · 12:01→ACTIVE. **PASS** — el cumplimiento no desplaza la ventana.
- **T17 (DAILY sin completion)**: 0 `ACTIVE→HIDDEN` por cambio de día; cruce de `dueAt` → siguiente ventana. **PASS**.
- **T18 (repetición ×4)**: mismo `now` → mismo estado (determinístico, 0 drift / 0 moving window). **PASS**.

## Frecuencias certificadas

| Frecuencia | Semántica real | Verificación |
|---|---|---|
| **DAILY** | 24h ms-lineal (19/08 12:00 → 20/08 12:00) | PASS |
| **WEEKLY** | 7 días (19/08 → 26/08) — **NO** calendar/ISO week | PASS |
| **MONTHLY** | **Modelo A — CALENDAR month** (19/08→19/09), POLITY CAL-001 (saturación fin de mes: 31/01→28/02) | PASS |
| **YEARLY** | **Calendar year** (19/08→19/08+1a), saturación 29 Feb→28 Feb | PASS |
| **CUSTOM** | N × unidad (10 días → 29/08 12:00) | PASS |
| **TIMEZONE** | Local consistente (dependencia documentada; `America/Bogota` no se aplica — tz del navegador) | PASS |

## Hipótesis

- **Descartadas con evidencia**: H01 (Calendar Reset), H02 (Moving Window), H03 (Completion-Based Window), H05 (Schedule/Completion Precedence), H06 (Timestamp Precision), H08 (Periodicity Normalization), H10 (Cached/Stale State).
- **H04**: descartada — `classifyOccurrence` respeta el cumplimiento (precedencia absoluta).
- **H07 CONSISTENTE**: parse 100% local, sin mezcla Supabase/UTC/browser en el dominio.
- **H09 PARCIAL (nota arquitectónica)**: existe un 2º motor (`evaluateAlert`, months=30d / years=365d / `baseDate=lastExecution??createdAt`) pero es **inerte** hoy (sin `runtimeContext`); la autoridad temporal activa es única (`OccurrenceSchedule`→`OccurrenceProjection`).

## Evidencia E01–E11

`source of frequency` → `normalized periodicity` → `start timestamp` → `window start/end` →
`completion timestamp` → `evaluation timestamp` → `expiration` → `next recurrence` →
`timezone` → `final state`: **todas PASS** (detalle en suite).

## Cierre

¿A partir de qué timestamp comienza una ventana, qué determina su expiración, cómo
interactúa con `completedAt` y cuándo nace la siguiente ventana?

> **Ventana N**: `[anchor + (N-1)·period, anchor + N·period)` con `anchor = startDate+startTime` (local).
> **Expiración**: al cruzar `dueAt` (fin exclusivo) → secuencia N+1.
> **completedAt**: cambia el estado dentro de su ventana (precedencia COMPLETED); **nunca** el calendario de recurrencia.
> **Siguiente ventana**: derivada por `computeTarget`/`occurrenceWindowAt` — nunca persistida.

**No se autoriza Sprint 342**: el motor cumple el modelo esperado (TEMPORAL ENGINE CERTIFIED).