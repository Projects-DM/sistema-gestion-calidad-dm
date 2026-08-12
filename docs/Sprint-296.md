# Sprint 296 — Auditoría forense: Completion & Recurrence de Ocurrencias

**Tipo:** AUDIT ONLY (sin cambios de código funcional).

**Fecha:** 2026-08-11 · **Estado:** CERTIFICADO (evidencia ejecutable en `scripts/sprint-296-alert-occurrence-completion-recurrence-audit.mjs`, 42/42 PASS).

**Objetivo:** responder con evidencia (no por intuición) cómo una alerta pasa de
`pendiente → cumplida → próxima ocurrencia`, en los tres recursos
(Formulario / Repositorio / Categoría), y determinar el cambio mínimo para el
Sprint 297.

**SSOT (Source of Truth):** las líneas citadas son la UNICA fuente de verdad.
Esta auditoría NO modifica dominio, runtime, UI, persistence ni schema.

---

## F1 — Cómo se deriva una ocorrencia (window-aware, sin store)

Evidencia: `OccurrenceSchedule.js:79-90` + `OccurrenceProjection.js:77-161`.

- `parseAnchor(item)` (`OccurrenceSchedule.js:29-45`) convierte
  `startDate + startTime` en un anchor en ms (default: fecha sin hora → 00:00).
- La ventana actual en `now` es `occurrenceWindowAt(anchorMs, cadence, now)`:

  ```text
  sequence = floor((now - anchor) / cadence) + 1
  startsAt = anchor + (sequence - 1) * cadence
  dueAt    = startsAt + cadence            // extremo EXCLUSIVO
  ```

- La ocurrencia se DERIVA al momento de proyectar: NO existe una tabla/entidad
  persistida de ocurrencias. `projectCurrentOccurrences` proyecta COMO MÁXIMO
  UNA ocurrencia actual por configuración de alerta (la ventana que contiene a
  `now`). Cerrado: `continuidad` — cuando `dueAt` se cruza, la siguiente
  proyección devuelve la ventana `sequence+1` (no hay lag, no hay gap).

**Hallazgo F1:** la "próxima ocurrencia" no se almacena; es derivada del
schedule en el momento de la consulta (`computeTarget` / `occurrenceWindowAt`).
Esto ya satisface la Regla del brief: *"la próxima apariencia se deriva, jamás
se almacena"* — el runtime no necesita ningún store de futuras ocurrencias.

## F2 — Qué acciones generan Completion (emisores reales)

Auditoría de `grep` sobre `OperationalEventBus.publish` en `src/`:

| Emisor | Archivo:línea | Canal | Registra |
|---|---|---|---|
| DynamicForm (save de formulario) | `DynamicForm.jsx:209,219` | `COMPLETION_INTENT_EVENT` | **la ocurrencia del FORM (dynamicForms)** |
| Orchestrator (records) | `OperationalExperienceLifecycleOrchestrator.js:203` | `RESOURCE_COMPLETED` | bulk/lazy dynamicRecords |
| Orchestrator (approve) | `...LifecycleOrchestrator.js:238` | `RECORDS_APPROVED` | bulk/lazy dynamicRecords |
| Orchestrator (close) | `...LifecycleOrchestrator.js:257` | `RECORDS_CLOSED` | bulk/lazy dynamicRecords |
| Orchestrator (bulk status) | `...LifecycleOrchestrator.js:198` | `RECORDS_STATUS_UPDATED` | solo si `newStatus==='completado'` |

**Suscripción del bridge** (`CompletionBridge.js:152-181`): solo
`FINAL_SINGLE_EVENTS` (RESOURCE_COMPLETED / RECORDS_APPROVED / RECORDS_CLOSED),
`RECORDS_STATUS_UPDATED` (gate `completado`) y `COMPLETION_INTENT_EVENT`.

**Hallazgo F2:** `RECORD_CREATED` (`...LifecycleOrchestrator.js:100`) se emite
pero NO lo suscribe el bridge → **DEC-256-06 certificado**: crear un registro
NUNCA completa una alerta. `RECORD_UPDATED`, `RECORD_DELETED`,
`RECORDS_IMPORTED`, `RECORDS_REOPENED` tampoco.

## F3 — DynamicForm es el único emisor para una alerta de FORM (no para Category/Repository)

Evidencia: `DynamicForm.jsx:196-227`.

1. Guardrail: SOLO publica si el form tiene alertas
   (`extractResourceAlertCollection(formDef).length > 0`).
2. `origin='alert'` (línea 209): el usuario llegó desde una tarjeta de alerta
   con `location.state.alertContext` (`{ alertId, occurrenceId }`, inyectado por
   `AlertMonitoringExperience.jsx:277-302` vía `resolveActionRoute`). Identidad
   explícita → exacta, **sin fallback temporal**.
3. `origin='resource'` (línea 219): entrada directa al form (Link normal desde
   el módulo). El bridge filtra por `resourceKind/resourceId/moduleId` y
   `DeterministicCompletionResolver` elige AT MOST ONE.

**Hallazgo F3 (responder al brief):** una acción de "cumplir la alerta **del
día**" hoy en día SOLO se dispara guardando el formulario del día. La señal
queda anclada `occurrence::<alertId>::<occurrenceId>` — la ocurrencia pertenece
al PERÍODO ventana (8:00 → +24h), no al instante exacto: guardar a las 10:30
(08:00 hábil) completa la ocurrencia de hoy; no crea aparición hoy + mañana.

## F4/F5 — GAP CERTIFICADO: Category & Repository NO emiten completion

Auditoría `grep` de `COMPLETION_INTENT|RESOURCE_COMPLETED|RECORDS_APPROVED|RECORDS_CLOSED`:

- `DynamicForm.jsx:209,219` (único emisor de `COMPLETION_INTENT`).
- Orquestador de records (unique para dynamicRecords).
- **NINGÚN emisor** para `documentRepository` ni `documentCategory`
  (no hay `publish` en upload de PDF, no hay `publish` en acciones de
  repositorio/categoría).

**Consecuencia:** un repositorio o categoría PUEDE PROJECTAR su ocurrencia
actual (overdue/today) pero **no existe acción que la complete** en runtime.
La alerta de un repo/categoría queda "presente" pero jamás se completa por una
acción del dominio. (El ledger podría recibir señales legacy importadas, pero
aún así hoy no se emiten.)

## F6 — Recurrencia diaria (evidencia real en suite)

- Cadencia `days=8.64e7`, anchor `2026-07-06 08:00`.
- `occurrenceWindowAt(anchor, days, 2026-07-06 10:30)` → sequence 1,
  startsAt `08:00`, dueAt `+24h`.
- Completion `completedAt=10:30` (dentro de la ventana) → la ocurrencia se
  satisface (OCC-CERT-12: `completedAt ∈ [startsAt, dueAt)`).
- Al día siguiente `windowAt(..., 2026-07-07 08:00)` → sequence 2 (nueva
  ventana). La proyección es REPLACE: solo existe la ventana actual → una
  ocurrencia por día.

## F7 — Recurrencia semanal / ventana laboral (evidencia real en suite)

- Cadencia `weeks=6.048e8`, anchor `2026-07-06 08:00` (lunes).
- **UNA ventana por período** `[lunes, lunes+7d)`. La semana laboral
  Lun–Sáb (domingo no laboral) **NO se traduce** a múltiples apariciones
  diarias: el schedule es calendar-driven por cadencia, NO business-days.
- Al cruzar `dueAt` (lunes siguiente 08:00) → sequence+1. Una semana completada
  NO reaparece hasta la siguiente ventana.

**Nota Sprint 297:** si la especificación exige un calendario laboral real
("Domingo no laboral" = sin ventana ese día), el modelo actual (single window
por cadencia) NO lo representa sin un cambio de contrato de schedule — ver
STOP list.

## F8/F9 — Próxima derivada + presentación oculta

- `computeTarget(anchor, cadence, now)` devuelve el siguiente inicio; la
  proyección lo vuelve actual cuando `now` cruza el extremo. Nada se guarda.
- `buildScheduleLines` (`alertResourceState.js:85`) salta `completed/cancelled`;
  el componente unificado `UnifiedAlertResourcePresentation.jsx:45` devuelve
  `null` si `schedule.length===0` → la tarjeta **se oculta** al cumplirse
  (Regla B).

## F11/F12 — Idempotencia + ledger IN-MEMORY

- `recordCompletion` (`OccurrenceLedger.js:59-66`) sobre-escribe la misma clave →
  idempotente por identidad (OCC-CERT-13). Doble envío → un solo hecho.
- `OccurrenceLedger` es un `Map` en memoria, NO reactivo, documentado
  literalmente como limitación (`OccurrenceLedger.js:30-33`). El "port" de
  persistencia es la propia interfaz map-like; `RuntimePersistenceBootstrap.ts`
  NO referencia ledgers/occurrences → **después de un refresh/recarga NO hay
  durabilidad de los hechos de completion**. (Sprint 297: si se exige
  persistencia, es el cambio.)

---

## Resumen de hallazgos con evidencia

- La cadencia diaria produce exactamente UNA ocurrencia actual por alerta; la
  ventana es `[startsAt, dueAt)`. ✅ (F1) — el usuario que guarda su form del día
  completa E.S.A. ocurrencia, sin generar apariciones espurias.
- La recurrencia semanal es calendar-driven single-window; NO existen
  *business-days* ni "domingo no laboral" en el schedule. ✅-documented (F7).
- `origin='alert'` = identidad explícita y decisiva (sin fallback temporal) para
  el flujo "tarjeta → form". ✅ (F3)
- `origin='resource'` = AT MOST ONE vía resolver determinista (overdue→MIN due,
  today/active→MIN due, upcoming NO elegible). ✅ (F3/F8)
- `RECORD_CREATED` NUNCA completa (DEC-256-06). ✅ (F2)
- **GAP:** no existe emisor para completar alertas de `documentRepository` /
  `documentCategory`. La ocurrencia se proyecta, pero ninguna acción la
  completa. ❗ (F4/F5)
- Ledger de completion IN-MEMORY (no sobrevive refresh; idempotente). ❗ (F12)

---

## Cambio mínimo para Sprint 297 (recomendado)

1. **Ante el GAP F4/F5** (proyectado vía runtime, no vía store extra): emitir un
   `COMPLETION_INTENT` (o `RESOURCE_COMPLETED`) desde la acción real de
   cumplimiento del recurso:
   - **Category**: al completar la subida de registro/documento (viewer) →
     emitir con `resourceKind:'documentCategory', resourceId: category.id,
     moduleId`, `origin:'resource'` (el bridge resuelve AT MOST ONE) o con
     identidad explícita si venía de una tarjeta.
   - **Repository**: idem en `documentRepository`.
2. **Persistencia (F12)**: si la traza de completion debe sobrevivir recargas,
   implementar el port durable del `OccurrenceLedger` (misma clave + mismos
   métodos — OCC-CERT-30), sin tocar bridge/runtime.

(Ninguno de los dos requiere cambiar `OccurrenceContract`, `occurrenceIdOf`,
crear `CategoryAlert`, nuevos store/scheduler, lógica de alertas en
DynamicForm/Category/Repository, ocultar desde React, ni duplicar el motor de
completion — por tanto están DENTRO del alcance mínimo aceptable.)