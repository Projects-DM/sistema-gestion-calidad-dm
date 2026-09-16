# Sprint 306 — Recurrence Window & Completion Persistence Forensic Certification

Rama: `release/stable-sprint79`
Modo: AUDIT ONLY · LEVEL 5 · FORENSIC CERTIFICATION
Fecha: 2026-08-12
Tipo: Auditoría ejecutable con clasificación final única
Dependencias: Sprints 296 · 297 · 299 · 300 · 301 · 302 · 303 · 304 · 305
Suite: `node scripts/sprint-306-recurrence-window-completion-persistence-forensic-certification.mjs`

## Objetivo

Certificar de manera ejecutable que el comportamiento observado tras completar un
formulario o repositorio corresponde realmente al modelo de **occurrence-aware
completion** (nunca a una desactivación de la alerta):

```
ALERTA CONFIGURADA → OCCURRENCE N → COMPLETION INTENT → OCCURRENCE N = COMPLETED
→ hasOpen=false → ALERTA DESAPARECE → siguiente ventana → OCCURRENCE N+1
→ hasOpen=true → ALERTA VUELVE A APARECER
```

## Pregunta forense principal

> Cuando una alerta desaparece después de completar un formulario o repositorio,
> ¿se desactiva la alerta o se completa únicamente la occurrence vigente?

**Respuesta: se completa la occurrence vigente.** La configuración de alerta
permanece `ACTIVE` (F01/F08); se cierra la ventana actual (F02/F04); el hecho se
persiste y sobrevive a un refresh (F03); la siguiente ventana **re-deriva** una
nueva occurrence abierta (F05/F06); y el ciclo continúa N→N+1→N+2 sin bloquearse
(F14).

## Resultado

**TOTAL: 53/53 PASS** · `process.exit(0)` · Build `✓ built in 2.63s` · src/ limpio.

```
SPRINT 306 — RECURRENCE WINDOW & COMPLETION PERSISTENCE

  CONFIGURATION:               ACTIVE
  CURRENT OCCURRENCE:          COMPLETED
  CURRENT WINDOW:              CLOSED
  COMPLETION PERSISTENCE:      PASS
  PAGE/RUNTIME RECONCILIATION: PASS
  NEXT OCCURRENCE:             RE-DERIVED
  RECURRENCE:                  PASS
  FORM:                        PASS
  REPOSITORY:                  PASS
  LEDGER IDEMPOTENCY:          PASS
  REACTIVITY:                  PASS
  PRESENTATION:                PASS
  RUNTIME ESM:                 PASS
  BUILD:                        PASS
  SRC MODIFICATION:            NONE

  ROOT CAUSE:                 NONE
  BEHAVIORAL CHANGE:          NONE
  NEW STATE:                  NONE
  NEW PIPELINE:               NONE

  STATUS:                     CERTIFIED
```

## Matriz de resultados por fase

| Fase | Verificación | Resultado | Evidencia |
|---|---|---|---|
| F01 | Config: `enabled===true` antes y después; periodicity/startDate/startTime/priority idénticos; mutación=0 | PASS 3/3 | mutation=0 |
| F02 | Occurrence real: ANTES hasOpen=true → completion vía bridge → Ledger=EXACTAMENTE 1 → hasOpen=false (misma sesión) | PASS 4/4 | after=false |
| F03 | Persistencia: write-through al port durable → recrear mundo re-leyendo SOLO el ledger → occurrence COMPLETED, hasOpen=false | PASS 4/4 | replayed≥1 |
| F04 | Refresh/re-evaluación del runtime dentro de la MISMA ventana → hasOpen=false, la alerta NO reaparece | PASS 2/2 | t=false t+1h=false |
| F05 | Día N: completion → Occurrence N COMPLETED, hasOpen=false · Día N+1: occurrence nueva ≠ N, status≠COMPLETED, hasOpen=true | PASS 5/5 | N+1=occ:2 |
| F06 | Matriz DIARIA/SEMANAL/MENSUAL/ANUAL: N→CLOSED · N+1→OPEN | PASS 4/4 | N+1 re-derivada |
| F07 | Sin recurrence prematura: tras completion NO aparece nueva occurrence abierta en la misma ventana | PASS | occurrences=1 |
| F08 | Sin desactivación permanente: enabled sigue TRUE, periodicity y alertConfigurations intactos; sin `enabled=false` en fuente | PASS 3/3 | |
| F09 | FORM regression: moduleId alineado (305 intacto) → Ledger=1 · hasOpen true→false | PASS 2/2 | |
| F10 | REPOSITORY regression: uploadRecord SUCCESS → Ledger=1 · hasOpen true→false | PASS 2/2 | |
| F11 | Sin hacks visuales (display/reload/forceUpdate/justUploaded/completedLocal/setTimeout); presentación depende SOLO de `projectResourceAlertState` + `state.present` | PASS 3/3 | |
| F12 | Reactividad: completionTick → useAlertRuntime → memo `[existing, base, completionTick]` → nueva referencia; sin estado React paralelo | PASS 3/3 | |
| F13 | Ledger idempotente: Completion #1 → Ledger=1 · #2 → Ledger=1; occurrence permanece cerrada | PASS 2/2 | #1=1 #2=1 |
| F14 | N→CLOSED → N+1 OPEN→CLOSED → N+2 OPEN (no se bloquea tras el primer completion) | PASS 3/3 | N+2=NEW |
| F15 | Runtime/ESM: require()=0 · import dinámico=0 · CompositionRoot ESM bootstrap PASS (303 intacto) | PASS 3/3 | |
| F16 | Build `npm run build` → ✓ built in 2.63s; package.json conserva `"build": "vite build"` | PASS 2/2 | |
| F17 | `src/` SIN modificaciones nuevas (`git status --short src/` limpio) | PASS | (limpio) |
| F18 | Familia: 296 exit=0 · 297 exit=0 · 299 80/80 · 300 65/65 · 301 53/53 · 302 semántica · 303 53/53 · 304 semántica · 305 80/80 + ALIGNED + Ledger | PASS 9/9 | |

## Demostración clave (F05 — corazón del sprint)

Con una alerta diaria anclada a `2026-08-12 09:00`:

| Momento | Occurrence | status | hasOpen |
|---|---|---|---|
| Día N (12/08) | `12:alert:0:occ:1` | COMPLETED | **false** |
| Día N+1 (13/08) | `12:alert:0:occ:2` (NUEVA, derivada) | NEW | **true** |

`N ≠ N+1` (distintos occurrenceId): la occurrence completada NO se reusa. La
alerta reaparece porque su configuration sigue ACTIVE y el schedule deriva la
siguiente ventana — no porque haya estado paralelo.

## Scope respetado / STOP list

- **CERO** cambios en `src/`: `git status --short src/` → limpio (F17).
- No se usó `writeFileSync`/`appendFileSync`/`rm`/`rename`/`git checkout`/
  `git restore`/`git reset` sobre código funcional.
- No se introdujo `completedLocal`, `justUploaded`, `isCompleted`, `alertHidden`
  ni ningún estado paralelo para lograr el cierre (F03/F11/F12).
- No se modificó `src/` (prohibido por STOP RULE). La única edición de script es
  la robustez del guard F10 del Sprint 305 (acepta el árbol limpio post-commit).
- `scripts/sprint-306-recurrence-window-completion-persistence-forensic-certification.mjs`
  y este documento son los únicos artefactos nuevos.

## Declaración

**Sprint 306 — CERTIFIED.** La desaparición de la alerta tras completar un
formulario o repositorio se explica íntegramente por el modelo occurrence-aware:
la **occurrence vigente** se marca COMPLETED, se persiste en el Ledger, la ventana
actual se cierra, y la siguiente ventana de recurrencia **re-deriva** una nueva
occurrence abierta — la **configuración de la alerta nunca se desactiva**
(`enabled===true` antes y después). Se descartaron definitivamente: desactivación
permanente, estado visual paralelo, hacks de presentación, mutación de
configuración y reactividad de segunda fuente.