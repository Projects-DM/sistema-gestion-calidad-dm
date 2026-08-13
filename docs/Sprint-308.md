# Sprint 308 — Unified Alert Metadata Presentation · Controlled Correction

Rama: `release/stable-sprint79`
Modo: CONTROLLED CORRECTION · LEVEL 5 · PRESENTATION ONLY
Fecha: 2026-08-12
Tipo: Corrección controlada de presentación visual — **BLOCKED** (STOP respetado)
Dependencia obligatoria: Sprint 307 — CERTIFIED · 65/65 PASS
Suite elegibilidad: `node scripts/sprint-308-alert-metadata-presentation-elegibility.mjs`

## Clasificación final

```
SPRINT 308 — CONTROLLED CORRECTION BLOCKED

  NAME IN PROJECTED STATE:    BLOCKED
  FREQUENCY IN STATE:         BLOCKED
  PRIORITY IN STATE:          PASS  (la única metadata 308 disponible ya)
  GATES 307:                  INTACT
  SRC MODIFICATION:           NONE
  NEW STATE:                  NONE
  NEW PIPELINE:               NONE

  ROOT CAUSE:                 METADATA NOT TRANSPORTED
                              (name/frequency ausentes del estado proyectado)
  STATUS:                     CONTROLLED CORRECTION BLOCKED
```

TOTAL: 13/15 PASS — los 2 FAIL son la evidencia del bloqueo (E01 name · E01 frequency).

## Por qué se blocó (regla de STOP, spec §23 · §24)

El sprint 308 pide presentar **nombre + frecuencia + prioridad** en
`UnifiedAlertResourcePresentation` consumiendo **únicamente `state`** (spec
§16: PURE PRESENTATION — el componente no puede consultar Resolver, Ledger,
Projection, Runtime ni hacer nuevas queries).

La verificación empírica sobre el estado proyectado certificado (Sprint 307)
demuestra:

| Campo pedido (308) | ¿Está en `projectResourceAlertState`? | Dónde vive hoy |
|---|---|---|
| `name` | **NO** | solo en el envelope del Resolver `resolveResourceAlertEnvelope(...).items[i].metadata.name` |
| `frequency` / `periodicity` | **NO** | solo en `configuration.periodicity` del envelope (ni formatter certificado existe en la frontera) |
| `priority` / `priorityLabel` | **SÍ** | `state.priority` · `state.priorityLabel` (viaja ya en el estado) |

```
state keys  = present,resourceKind,resourceId,status,statusLabel,color,icon,
              priority,priorityLabel,nextDue,nextExecution,total,openCount,
              hasOpen,events
event keys  = occurrenceId,alertId,sequence,startsAt,dueAt,status,statusLabel,
              color,icon,persistent,priority,priorityLabel,dueMs,sortKey
```

Para exponer `name`/`frequency` en la tarjeta **sin** modificar el estado
proyectado, el componente tendría que:

1. consultar el Resolver / envelope → **prohibido** (§16, §24 `nueva query`);
   o
2. recibir una nueva prop (`resource`) desde los consumidores → rompe la firma
   `{ state, className }` certificada (§16) y abre un canal por superficie
   (§10/§11/§12 "mismo renderer"); o
3. **modificar `projectResourceAlertState`** para transportar
   `name`/`periodicity` al estado → **prohibido taxativamente** (§23: "No tocar
   projectResourceAlertState", salvo discrepancia objetiva con 307, y en ese
   caso STOP); o
4. recalcular la frecuencia en la UI desde dates/periodicity → **prohibido**
   (§6: "NO recalcular la frecuencia en la UI").

Ninguna opción cabe dentro de la frontera **PRESENTATION LAYER exclusively**
del sprint. Por tanto se dispara el STOP del §24:

> `metadata no disponible` / `metadata requiere modificar Runtime` →
> **CONTROLLED CORRECTION BLOCKED** · documentar el hallazgo.

## Prioridad (la única metadata 308 ya disponible)

`priority`/`priorityLabel` **sí** viajan en el estado certificado
(`priority=high · label=Alta`). El descriptor visual `PRIORITY_VISUALS`
(baja/media/alta/crítica → color/icon) existe y es reutilizable sin ningún
cambio de pipeline. **No** se duplicó PRIORITY_VISUALS ni se creó
`newPriorityColors`/`newPriorityIcons`/`priorityMap2`.

Nota de campo detectada (no accionada): el `PRIORITY_LABELS` local de
`alertResourceState.js` cubre `low/medium/high` (fallback `'Media'` fuera de
esos), mientras `AlertVisualDescriptor` sí contempla `critical`. Es un matiz de
enriquecimiento, NO una discrepancia que permita tocar el selector en 308.

## Respuesta a los criterios de aceptación (§33)

| Criterio | Estado |
|---|---|
| Nombre de alerta visible | **BLOCKED** — nombre ausente del estado proyectado |
| Nombre proviene de metadata certificada | No alcanzable sin tocar pipeline |
| Frecuencia visible | **BLOCKED** — periodicity ausente del estado |
| Frecuencia NO se recalcula desde UI | Se respeta, pero no hay nada que mostrar |
| Prioridad representada visualmente | Posible (priority + PRIORITY_VISUALS ya listos) |
| Se reutiliza AlertVisualDescriptor | Confirmado disponible |
| No se duplica PRIORITY_VISUALS | Respetado |
| Gates 307 (`present !== true` · `schedule.length === 0`) | **INTACT** (E06 PASS) |
| Completion / N+1 / disabled | **INTACT** (baseline 307 PASS) |
| Sin estado React paralelo | Respetado (E06 PASS) |
| Sin nueva query / persistencia | Respetado |
| No se modifica Runtime / Ledger / recurrence | **Respetado** — `src/` limpio |
| Responsive | Sin tocar — frontiera pura |
| Build / Regresiones 296–307 | Sin cambios → no necesarias; 307 sigue CERTIFIED |

## Scope respetado / STOP list

- **CERO** cambios en `src/`: `git status --short src/` → limpio (E07 PASS).
- No se modificó `projectResourceAlertState`, `UnifiedAlertResourcePresentation`,
  el Resolver, el Ledger, la proyección, la recurrencia ni la persistencia.
- No se creó ningún estado paralelo, formatter de frecuencia "inventado",
  fallback que fabrica metadata (§20: no convertir `undefined frequency` en
  `Diaria`), renderer específico por superficie ni pipeline alternativo.
- Única metadata confirmada para presentación sin cambios: `priority`.

## Evidencia

Suite: `scripts/sprint-308-alert-metadata-presentation-elegibility.mjs`
- E01 — `name` ausente del estado proyectado (keys listadas).
- E01 — `frequency`/`periodicity` ausente del estado proyectado.
- E02 — `metadata.name="PREOPERATIVO LIMPIEZA Y DESINFECCION"` vive SOLO en el
  envelope del Resolver (aguas arriba del selector).
- E05 — `priority=high · label=Alta` SÍ viaja; `PRIORITY_VISUALS` reutilizable.
- E06 — gates 307 intactos; sin `useState`/`useEffect`/`setTimeout` en el
  componente (sin paralelo).
- E07 — `src/` sin modificaciones.

## Próximo paso (fuera de 308)

Un sprint de **pipeline** (NO presentation-only) que transporte
`name`/`periodicity` (y un label de frecuencia certificado) en el estado
proyectado por `projectResourceAlertState`, enriquecidos desde el envelope del
Resolver mediante el mismo patrón que ya transporta `priority`, re-habilitaría
exactamente los cambios 1 y 2 del 308. Sprint 308, tal como está definido
(PRESENTATION LAYER exclusively), **no puede implementarse hoy** sin violar sus
propias reglas de STOP.