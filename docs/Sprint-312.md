# Sprint 312 — Alert Completion Persistence & Temporal Visual Semantics · Forensic Audit

Rama: `release/stable-sprint79`
Modo: AUDIT ONLY · LEVEL 5 · FORENSIC CERTIFICATION
Fecha: 2026-08-13
Tipo: Auditoría ejecutable de por qué la alerta desaparece visualmente tras el completion — **CERTIFIED**
Dependencias: Sprint 306 CERTIFIED · Sprint 307 CERTIFIED · Sprint 310 CERTIFIED (53/53) · Sprint 311 CERTIFIED (46/46)
Suite: `node scripts/sprint-312-alert-completion-persistence-temporal-visual-forensic-audit.mjs`

## Clasificación final

```
SPRINT 312 — ALERT COMPLETION PERSISTENCE & TEMPORAL VISUAL SEMANTICS · FORENSIC AUDIT

  F01 COMPLETION PERSISTENCE         PASS
  F02 BEFORE STATE                   PASS
  F03 AFTER STATE                    PASS
  F04 CONFIG INTACT                  PASS
  F05 OPEN/COMPLETED/DISABLED        PASS
  F06 N→N+1 OCCURRENCE               PASS
  F07 DAILY N+1                      PASS
  F08 WEEKLY N+1                     PASS
  F09 MONTHLY N+1                    PASS
  F10 YEARLY N+1                     PASS
  F11 TEMPORALITY AUTHORITY          PASS
  F12 PRIORITY vs URGENCY            PASS
  F13 THRESHOLD VIABILITY            PASS
  F14 ROOT CAUSE GATE                PASS
  F15 COMPLETED+NEXT MATERIAL        PASS
  F16 DYNAMIC MODULE                 PASS
  F17 DOCUMENT VIEWER                PASS
  F18 METADATA POST-COMPLETION       PASS
  F19 MULTI-ALERT ISOLATION          PASS
  F20 TEMPORAL MATRIX                PASS
  F21 DESCRIPTOR STATUS              PASS
  F22 NEXT-EXECUTION MATERIAL        PASS
  F23 PRESENTED vs PERSISTED         PASS
  F24 NO VISUAL HACKS                PASS
  F25 REGRESSIONS                    PASS (15/15)
  F26 BUILD                          PASS
  F27 SCOPE INTEGRITY                PASS

  STATUS:                  CERTIFIED
```

TOTAL: **108/108 PASS** · `src/` NO MODIFICADO (F27: LIMPIO).

## Pregunta auditada (§1)

¿Por qué una alerta con recurrencia ACTIVA desaparece visualmente tras completar
su última occurrence abierta? ¿Se pierden datos (persistencia/ledger/recurrencia/
proyección) o es semántica de presentación?

**Respuesta certificada por ejecución real:**

> La causa es **PRESENTATION GATE**, no pérdida de datos. Tras el completion el
> estado SIGUE existiendo (`present=true`, `hasOpen=false`, `status=completed`,
> metadata completa), pero `buildScheduleLines` excluye los events completed/
> cancelled → `schedule=[]` → el gate `schedule.length === 0 → return null`
> elimina la tarjeta. `COMPLETION ≠ DELETE ALERT`. La N+1 es **derivada** por el
> pipeline de recurrence (nueva occurrence, `seq=N+1`, propia `startsAt/dueAt`),
> jamás almacenada ni creada por la UI.

## Evidencia central (§33)

```
BEFORE
  configuration.enabled      = true
  occurrence.id              = 12:alert:0:occ:1
  occurrence.status          = open (today)
  state.present              = true
  state.hasOpen              = true
  state.name                 = PREOPERATIVO
  state.periodicity          = {"amount":1,"unit":"days"}
  state.priority             = high
  schedule                   = [{"day":"Mañana","times":["09:00"]}]

COMPLETION
  ledger                     = persisted (size=1, occurrenceId=12:alert:0:occ:1)
  occurrence N               = completed
  configuration              = ACTIVE (enabled=true)

AFTER
  occurrence N               = completed (status=completed)
  state.name                 = PREOPERATIVO
  state.periodicity          = {"amount":1,"unit":"days"}
  state.priority             = high / Alta
  state.status               = completed
  next occurrence            = N+1 (id=12:alert:0:occ:2, seq=2)
  next execution             = Mañana 09:00 → N+1 startsAt=2026-08-14T14:00:00.000Z

CURRENT PRESENTATION
  buildScheduleLines         = []
  UnifiedAlertPresentation   = null (tarjeta oculta)

ROOT CAUSE
  PRESENTATION GATE
  schedule.length === 0  →  return null
```

## Hallazgos por bloque (F01–F27)

### Persistencia y proyección (F01–F10)
- **F01** — completion registrado en el Ledger con signal específico e identity
  (`occurrenceId`), state sigue existiendo, `schedule=[]`, el componente devuelve
  `null`, y el MISMO renderer dibuja N+1 cuando el estado cambia (6/6).
- **F02/F03** — ANTES (`present=true, hasOpen=true, events=1, schedule=1`) vs
  DESPUÉS (`present=true, hasOpen=false, status=completed, schedule=0`); metadata
  y `occurrenceId` conservados (6/6 y 7/7).
- **F04** — `configuration.enabled=true` y ACTIVE tras completion; occurrence N
  COMPLETED sigue en la proyección (no borrada); ledger conserva
  `alertId/occurrenceId/completedAt` (4/4).
- **F05** — sin config → `null`; `enabled=false` → `null`; ACTIVE+OPEN → pendiente;
  ACTIVE+completed → state existe con N+1 future disponible; occurrence vencida →
  `overdue` (6/6).
- **F06** — N (`occ:1`) ≠ N+1 (`occ:2`); N+1 con `sequence=N+1` y PROPIOS
  `startsAt/dueAt` (ventana contigua) (4/4).
- **F07–F10** — daily/weekly/monthly/yearly: N COMPLETED conserva identidad,
  N+1 se DERIVA por recurrence (nueva occurrence, ventana siguiente), sin
  intervención de la UI (F07 4/4, F08 3/3, F09 2/2, F10 4/4). Yearly +180d sigue
  COMPLETED; +365d abre ventana N+1 (recurrencia anual, `seq=2`).

### Semántica temporal (F11–F15)
- **F11** — el estado inventaría la temporalidad: `status/statusLabel/nextDue/
  nextExecution/events`; la UI NO re-calcula (sin `new Date/Date.now/computeTarget/
  occurrenceWindowAt` en el código del componente); autoridad temporal = `nextDue:
  head.dueMs` en el selector (3/3).
- **F12** — prioridad y urgencia son dimensiones INDEPENDIENTES: anual
  `priority=high` con `status=upcoming` vs vencida con `status=overdue` (3/3).
- **F13** — umbrales temporales viables desde `state.nextDue`
  (Programada>7d · Próxima≤7d · Atención≤24h · Urgente≤1h · Vencida · Cumplida):
  SUPPORTED sin pipeline nuevo (3/3).
- **F14** — gate responsable confirmado por ejecución: `present` SIGUE true
  post-completion (no dispara), `schedule=[]` (sí dispara) → desaparición =
  `schedule.length === 0` (3/3).
- **F15** — post-completion el estado contiene el material COMPLETED+NEXT
  (`status=completed` + `nextDue`), suficiente para presentar "Cumplida · Próxima"
  SIN consultar fuentes adicionales (3/3).

### Consumidores (F16–F17)
- **F16** — `DynamicModule` delega a `FormatAlertState` → `UnifiedAlertResourcePresentation`
  (único renderer), sin ocultamiento condicional, sin `completedLocal`, consume
  `projectResourceAlertState` (4/4).
- **F17** — `RepositoryAlertStateBlock` delega al MISMO renderer, misma fuente de
  estado (≥2 usos), sin ocultamiento condicional en MDV (4/4).
- **FORMATO/REPO/CATEGORÍA → MISMO STATE + MISMO RENDERER.**

### Metadata y aislamiento (F18–F23)
- **F18** — tras completion `name/periodicity/priority/priorityLabel` conservados;
  la metadata renderiza en la ventana N+1 (el renderer NO perdió la capacidad de
  presentar el nombre) (4/4).
- **F19** — completar SOLO AlertA deja AlertA COMPLETED y B/C OPEN, sin
  contaminación cruzada (4/4).
- **F20** — matriz temporal: OPEN/Hoy presentable; COMPLETED/N+1 (mañana y anual)
  `state` existe (`hasOpen=false, status=completed`) y la presentación la oculta;
  DISABLED sin estado (3/3).
- **F21** — presentación colorea por PRIORIDAD (`PRIORITY_VISUALS`); el descriptor
  certificado YA contiene `STATUS_VISUALS` (expiring/expired/attention) → prioridad
  + status temporal coexisten sin duplicar descriptor (3/3).
- **F22** — estado post-completion trae `statusLabel="Cumplida"` + `nextExecution`
  + periodicity → "Cumplida · Próxima [fecha]" SUPPORTED (3/3).
- **F23** — presentado vs persistido se diferencian: la presentación oculta
  (`schedule=[]`) pero `alertId/occurrenceId/status/completedAt` y
  `configuration.enabled/periodicity/name/priority` existen (3/3).

### Integridad y alcance (F24–F27)
- **F24** — NINGÚN hack de visibilidad en la cadena auditada (sin
  `completedLocal/justUploaded/alertHidden/display:none/forceUpdate/reload/
  setTimeout-de-cierre`); el `setTimeout` de MDV es highlight de documento, no
  mecanismo de alerta (1/1).
- **F25** — regresiones 296–311 (14 miembros) **sin fails funcionales NUEVOS**
  (15/15). 302/304/307 reportan SOLO sus fails forenses pre-documentados en su
  propio baseline (n=9/9/5) — con `src/` limpio NO hay delta posible.
- **F26** — `npm run build → ✓ built` PASS (1/1).
- **F27** — `git status --short src/` → LIMPIO: Sprint 312 NO toca `src/` (1/1).

## Recomendación (no implementada, §32)

La presentación oculta un estado persistente y completo. Para mostrar el material
COMPLETED+NEXT basta con ajustes **de presentación** dentro del renderer unificado
(política temporal derivada SOLO de `state.nextDue`/`statusLabel`/`nextExecution`,
reutilizando `STATUS_VISUALS` del descriptor certificado) — **sin pipeline nuevo,
sin Resolver/Query/Ledger/selector/formatter nuevos, sin estado React paralelo**.
Fuera del alcance de Sprint 312 (AUDIT ONLY).

## Scope respetado / STOP list (§4, §30)

- **Ningún archivo de `src/` modificado** (F27: `git status --short src/` → LIMPIO).
- Sin hooks/estado paralelo (`completedLocal`, `alertHidden`, `justCompleted`,
  `showCompleted`, `nextAlertLocal`), sin resolver/query/ledger/projection/
  selector/formatter nuevos, sin tocar Ledger/CompletionBridge/Projection/state/
  componente/Resolver/Runtime/consumidores/persistence/recurrence.

## Evidencia

Suite: `scripts/sprint-312-alert-completion-persistence-temporal-visual-forensic-audit.mjs`

- F01–F10 — persistencia, proyección y recurrencia N→N+1 con ejecución real
  (Ledger + CompletionBridge + OperationalEventBus + proyección + recurrence).
- F11–F15 — semántica temporal: autoridad `nextDue`, independencia prioridad/
  urgencia, viabilidad de umbrales, gate de causa raíz, material COMPLETED+NEXT.
- F16–F17 — consumidores (DynamicModule / DocumentViewer) → renderer único.
- F18–F23 — metadata post-completion, aislamiento multi-alert, matriz temporal,
  descriptor STATUS, next-execution, presentado-vs-persistido.
- F24 — ausencia de hacks de visibilidad.
- F25 — regresiones 296–311 GREEN (delta 0, fails forenses pre-documentados).
- F26 — build exitoso.
- F27 — `src/` sin modificaciones.

## División de responsabilidades tras Sprint 312 (confirmada)

```
Resolver       → obtiene metadata        (Sprint 309)
Projection     → transporta metadata     (Sprint 310)
State          → expone metadata         (Sprint 310)
Presentation   → presenta metadata       (Sprint 311)
Persistence    → COMPLETION ≠ DELETE     (Sprint 312 — auditado, íntegro)
Recurrence     → N+1 DERIVADA            (Sprint 312 — auditado, íntegro)
UI             → no deriva metadata      (Sprint 312 — auditado)
```

## Próximo paso

Corrección de presentación (opcional, fuera de 312): exponer el estado
COMPLETED+NEXT dentro de `UnifiedAlertResourcePresentation` (p. ej. tarjeta
"Cumplida · Próxima {fecha}" derivada de `state.statusLabel` + `state.nextDue` +
`state.nextExecution`), manteniendo los gates de Sprint 307 intactos.