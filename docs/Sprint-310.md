# Sprint 310 — Alert Metadata Projection · Controlled Correction

Rama: `release/stable-sprint79`
Modo: CONTROLLED CORRECTION · LEVEL 5 · PROJECTION ONLY
Fecha: 2026-08-12
Tipo: Corrección controlada del transporte de metadata al estado proyectado — **CERTIFIED**
Dependencias: Sprint 307 CERTIFIED · Sprint 308 BLOCKED (baseline) · Sprint 309 PIPELINE CERTIFIED
Suite: `node scripts/sprint-310-alert-metadata-projection-controlled-correction.mjs`

## Clasificación final

```
SPRINT 310 — CONTROLLED CORRECTION

  NAME TRANSPORT:          PASS
  PERIODICITY TRANSPORT:   PASS
  PRIORITY PRESERVED:      PASS
  IDENTITY INTEGRITY:      PASS
  MULTI-ALERT ISOLATION:   PASS

  SINGLE RESOLVER CALL:    PASS
  NEW QUERY:               NONE
  NEW SSOT:                NONE

  PRESENTATION CHANGED:    NONE
  RUNTIME CHANGED:         NONE
  LEDGER CHANGED:          NONE
  RECURRENCE CHANGED:      NONE

  COMPLETION:              PASS
  N+1:                     PASS
  DISABLED:                PASS

  CONSUMERS:               COMPATIBLE
  BUILD:                   PASS
  REGRESSIONS:             GREEN

  STATUS:                  CERTIFIED
```

TOTAL: **53/53 PASS**.

## Qué se corrigió

`projectResourceAlertState` (único archivo autorizado, §21) transporta ahora al
estado proyectado la metadata que el Resolver SSOT **ya entregaba** en el mismo
envelope (Sprint 309 PIPELINE CERTIFIED) y que el projector descartaba:

| Campo | Autoridad (§4) | Origen |
|---|---|---|
| `name` | `envelope.items[].metadata.name` | **NO** `configuration.name` (Sprint 309: `name ∉ AlertConfiguration`, VO de 9 campos canónicos) |
| `periodicity` | `envelope.items[].configuration.periodicity` | **NO** derivada de `events`/`startsAt`/`dueAt`/`nextExecution`/`occurrences` |
| `priority` / `priorityLabel` | existente | sin cambios (§8) |

El pipeline certificado:

```
                    RESOLVER SSOT
                         │
                         ▼
             resolveResourceAlertEnvelope()      ← UNA sola llamada (E08)
                         │
                         ▼
                  envelope.items
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           metadata  configuration  ...
              │          │
            name    periodicity
                         │
                       priority
              │          │
              └─────┬────┘
                    ▼
       projectResourceAlertState
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
        name    periodicity  priority
                              │
                         priorityLabel
                    │
                    ▼
      UnifiedAlertResourcePresentation   ← Sprint 311 lo consumirá
```

## Corrección exacta (§3)

La única llamada al Resolver ahora alimenta dos mapas keyed por `alertId`
(sin segunda consulta, sin segundo envelope):

```js
const envelope = resolveResourceAlertEnvelope(resource);
cfgByAlertId = new Map();   // alertId → configuration   (priority, periodicity, enabled)
metaByAlertId = new Map();  // alertId → metadata        (name, description, …)
for (const it of (envelope?.items ?? [])) {
  const alertKey = String(it?.alertId ?? '');
  cfgByAlertId.set(alertKey, it?.configuration ?? null);
  metaByAlertId.set(alertKey, it?.metadata ?? null);
}
```

En cada evento proyectado se transportan `name` y `periodicity` (mismo
`alertId`, sin mezcla §7), y el estado final los expone desde el head junto a
`priority`/`priorityLabel`:

```js
const name = meta?.name || null;          // ausente → null, NUNCA "Sin nombre"
const periodicity = cfg?.periodicity ?? null;  // ausente → null, sin inferir "diaria"
```

## Dónde se aplicó

- **Modificado**: `src/utils/alertResourceState.js` (+28 / −2, diff localizado).
- **Intactos** (§9–§12): `AlertConfiguration` (VO sin `name`), el Resolver,
  `UnifiedAlertResourcePresentation`, Runtime, Ledger, recurrence, scheduler,
  persistencia, `DynamicModule` y `ModuleDocumentViewer`.
- **Sin formatter** (§5–§6): NO se creó `frequencyLabel`/`newFrequencyFormatter`/
  `formatPeriodicityLocal`/`scheduleToFrequency`. El estado transporta la
  `periodicity` **canónica**; la representación textual es responsabilidad del
  siguiente paso de presentación.

## Invariantes verificadas (§14)

| Invariante | Resultado |
|---|---|
| Visibility (`present`) | PASS — recurso sin ocurrencias → `null` (E09) |
| Schedule (`events` → `buildScheduleLines`) | PASS — misma proyección, sin rotura (E10) |
| Completion (occurrence completada → excluded) | PASS — `hasOpen=false`, `schedule=[]` (E11) |
| N+1 (N hidden → N+1 visible) | PASS — `hasOpen` re-derivado mañana (E12) |
| Disabled (`enabled=false` → suppression) | PASS — state `null` (E13) |
| Priority (`priority` / `priorityLabel`) | PASS — intactos (E03/E04) |

## Casos obligatorios (§15)

| Caso | Entrada | Salida verificada |
|---|---|---|
| A — metadata completa | `name=AlertA`, `periodicity={2 weeks}`, `priority=high` | `state.name="AlertA"`, `state.periodicity={2,weeks}`, `state.priority="high"` |
| B — name ausente | sin `name` | `state.name=null` — no se inventa "Alerta operacional" ni "Sin nombre" |
| C — periodicity ausente | `periodicity=null` | `state.periodicity=null` — sin inferir daily/weekly desde fechas |
| D — múltiples alertas | A + B + C | aislamiento por `alertId`: A→A, B→B, C→C, sin contaminación |
| E — completion | occurrence completada | `schedule=[]`, `hasOpen=false` |
| F — next window | N completada | N oculta hoy, N+1 visible mañana |

## Integridad por alertId (§7)

La asociación `alertId → {configuration, metadata}` se mantiene 1:1:
`alert-A → AlertA`, `alert-B → AlertB`, `alert-C → AlertC`. La suite verifica
explícitamente que **nunca** ocurre `alert-A → AlertB` (E07).

## Regresiones (§18)

Familia ejecutada con **medición de delta real** (baseline con `git stash` de
`src/utils/alertResourceState.js` vs. post-corrección): 296, 297, 299, 300,
301, 302, 303, 304, 305, 306, 307, 308 → **GREEN** (E22, 12/12).

- **0 fails funcionales nuevos**. 302/304 ya reportaban fails forenses en el
  baseline (audits que documentan boundaries de sprints previos) — el delta de
  310 es SOLO el MODIFICATION GUARD de `src/` (autorizado por §21).
- **Sprint 308** (baseline BLOCKED) flipea a **CERTIFIED**: la metadata ya está
  transportada, su gate de elegibilidad E01 (name/periodicity en state) ahora
  pasa. El bloqueo de 308 se resuelve exactamente como proyectaba su "Próximo
  paso": con un sprint de pipeline, no de presentación.
- Build (`npm run build → ✓ built`) PASS (E21).

## Scope respetado / STOP list

- **Solo** `src/utils/alertResourceState.js` modificado en `src/` (E20:
  `git status --short src/` → `M src/utils/alertResourceState.js`).
- Sin segunda consulta al Resolver (E08: exactamente 1 llamada).
- Sin modificar Resolver, AlertConfiguration, Presentation, Runtime, Ledger,
  recurrence, persistence ni consumidores (E16/E17).
- Sin formatter de frecuencia duplicado (E16).
- Consumidores compatibles: `DynamicModule.jsx` y `ModuleDocumentViewer.jsx`
  acceden por propiedad específica (`state.present`, `state.events`), sin
  `Object.keys(state)`/`JSON.stringify(state)`/spread/deepEqual → la extensión
  aditiva es no-breaking (E14/E15).

## Evidencia

Suite: `scripts/sprint-310-alert-metadata-projection-controlled-correction.mjs`

- E01 — `name` transportado a `state` y a cada evento.
- E02 — `periodicity` canónica transportada (sin `frequencyLabel` inventado).
- E03/E04 — priority/priorityLabel intactos.
- E05/E06 — `resourceId` y `alertId` preservados (identity consumida, no reconstruida).
- E07 — aislamiento multi-alerta sin contaminación cruzada.
- E08 — una sola llamada al Resolver.
- E09–E13 — gates de visibility/schedule/completion/N+1/disabled intactos.
- E14–E17 — consumidores compatibles; sin dependencia de presentación/runtime.
- E20 — scope de archivos: solo el selector.
- E21 — build exitoso.
- E22 — regresiones 296–308 sin delta funcional.

## División de responsabilidades tras Sprint 310

```
Resolver       → obtiene metadata
Projection     → transporta metadata
State          → expone metadata
Presentation   → presenta metadata      (Sprint 311)
UI             → no deriva metadata
```

## Próximo paso

**Sprint 311 — PRESENTATION**: consumir `state.name` + `state.periodicity` en
`UnifiedAlertResourcePresentation` (nombre + frecuencia + prioridad visual),
reutilizando `PRIORITY_VISUALS`/descriptores certificados. La separación queda
garantizada: 310 = DATA PROJECTION (hecho aquí), 311 = PRESENTATION.
