# Sprint 307 — Unified Alert Resource Presentation Certification

Rama: `release/stable-sprint79`
Modo: AUDIT ONLY · LEVEL 5 · PRESENTATION CERTIFICATION
Fecha: 2026-08-12
Tipo: Auditoría ejecutable con clasificación final única
Dependencias: Sprints 296 · 297 · 299 · 300 · 301 · 302 · 303 · 304 · 305 · 306
Suite: `node scripts/sprint-307-unified-alert-resource-presentation-certification.mjs`

## Objetivo

Certificar de manera ejecutable que existe **UNA sola presentación visual de
alerta de recurso** (`UnifiedAlertResourcePresentation`) que:

```
(a) consumen formato (DynamicModule), repositorio y categoría (ModuleDocumentViewer) por igual;
(b) es PURA — consume SOLO el estado ya proyectado por projectResourceAlertState;
(c) no re-deriva identidad / horarios / prioridad (PURE PRESENTATION, AC-04..AC-13);
(d) se oculta tras completar (buildScheduleLines excluye la occurrence completada →
    schedule vacío → null) y reaparece en la siguiente ventana SOLO porque la
    configuración sigue ACTIVE — nunca por estado visual paralelo.
```

## Pregunta de presentación principal

> ¿Hay un único estándar visual por recurso, o cada superficie (formato /
> repositorio / categoría) reinventa su propia tarjeta de alerta?

**Respuesta: un único estándar.** Las tres superficies delegan en el MISMO
componente `UnifiedAlertResourcePresentation`, que consume el MISMO selector
certificado `projectResourceAlertState` y el MISMO formateador
`buildScheduleLines`. El componente es pura presentación (no consulta ledger,
proyección, bridge, resolver ni event-bus) y usa los mismos gates de
presentación (`present !== true` → null; schedule vacío → null).

## Resultado

**TOTAL: 65/65 PASS** · `process.exit(0)` · Build `✓ built in 2.40s` · src/ limpio.

```
SPRINT 307 — UNIFIED ALERT RESOURCE PRESENTATION

  PRESENTATION STANDARD:          UNIFIED (1 componente · 3 superficies)
  PRESENTATION AUTHORITY:         projectResourceAlertState
  PURE PRESENTATION:              PASS
  PRESENTATION GATE:              PASS
  SCHEDULE FORMATTER:             buildScheduleLines
  NO SECONDARY METADATA:          PASS
  FEEDS (form/repo/category):     3/3
  NO VISUAL HACKS:                NONE
  REACTIVITY:                     PASS
  COMPLETION → HIDDEN:            schedule=0
  NEXT WINDOW → VISIBLE:          RE-DERIVED
  DISABLED SUPPRESSION:           PASS
  RUNTIME VISIBILITY SURFACES:    PASS
  RUNTIME ESM:                    PASS
  BUILD:                          PASS
  SRC MODIFICATION:               NONE

  ROOT CAUSE:                 NONE
  BEHAVIORAL CHANGE:          NONE
  NEW STATE:                  NONE
  NEW PIPELINE:               NONE

  STATUS:                     CERTIFIED
```

## Matriz de resultados por fase

| Fase | Verificación | Resultado | Evidencia |
|---|---|---|---|
| F01 | `UnifiedAlertResourcePresentation` es el componente visual estándar | PASS 4/4 | DynamicModule + ModuleDocumentViewer delegan en él |
| F01 | DynamicModule (grilla de formatos) importa y delega en el MISMO componente | PASS | `<UnifiedAlertResourcePresentation state={state}/>` |
| F01 | ModuleDocumentViewer (repo/categoría) delega en el MISMO componente | PASS | `RepositoryAlertStateBlock` → mismo componente |
| F01 | Header consistente "Alerta operacional" (una sola firma visual) | PASS | |
| F02 | El componente NO consulta ledger/proyección/bridge/resolver/event-bus | PASS | ninguno (código real, sin docstrings) |
| F02 | Consume SOLO el state prop + buildScheduleLines | PASS | `state.present/color/status` + `buildScheduleLines(state.events)` |
| F02 | No re-deriva identidad/horarios/prioridad | PASS | alertId/occurrenceId/priority/periodicity ausentes |
| F03 | `if (state?.present !== true) return null` (gate de presentación) | PASS | |
| F03 | `if (schedule.length === 0) return null` (sin líneas no se renderiza) | PASS | |
| F03 | El cuerpo no puede renderizar con state ausente (present guard fija) | PASS | |
| F04 | resolveAlertIcon se invoca SOLO a module scope (mapa estático) | PASS | calls=7 (estático, 0 en render) |
| F04 | Icono en render INDEXADO del mapa (nunca se crea durante render) | PASS | `STATE_ICON_COMPONENTS[state.status] || .fallback` |
| F04 | Mapa cubre overdue/today/upcoming/active/completed/cancelled + fallback | PASS | |
| F05 | Día aparece UNA sola vez por grupo (Hoy · 20:37 · 20:40 → 1 línea) | PASS | `Hoy[20:37,20:40]` |
| F05 | completed/cancelled EXCLUIDOS del schedule | PASS | |
| F05 | Tiempos del mismo día DEDUPLICADOS | PASS | 20:40 una vez |
| F05 | Rótulos relativos Hoy / Mañana / fecha corta (ago) | PASS | `Hoy · Mañana · 14 ago` |
| F05 | HH:MM con cero a izquierda | PASS | |
| F06 | El estándar NO muestra Estado:/Prioridad:/Próximo/open-count | PASS | ninguno (código real) |
| F06 | El selector conserva metadata interna (priorityLabel/nextExecution) sin renderizarla | PASS | |
| F07 | 1 recurso real → EXACTAMENTE 1 estado visual (una alerta por recurso) | PASS | resourceId=12 present=true |
| F07 | hasOpen derivado del selector (no del componente) | PASS | hasOpen=true |
| F07 | El estado ES consumido sin re-proyección (present + events) | PASS | events=1, occurrenceId presente |
| F07 | alerta enabled=false → selector NO produce estado | PASS | state=null |
| F08 | FORMATO presenta vía selector unificado | PASS | resourceKind=dynamicForms |
| F08 | REPOSITORIO presenta vía selector unificado | PASS | resourceKind=documentRepository |
| F08 | CATEGORÍA presenta vía selector unificado | PASS | resourceKind=documentCategory |
| F08 | Ambas superficies proyectan SOLO con projectResourceAlertState | PASS | |
| F09 | Sin hacks visuales (display/reload/forceUpdate/justUploaded/completedLocal) | PASS | ninguno |
| F09 | Sin setTimeout como mecanismo de cierre/aparición en la cadena pura | PASS | |
| F09 | Responsive con flex-wrap (sin overflow horizontal) | PASS | flex-wrap + whitespace-nowrap |
| F10 | completionTick presente como invalidación certificada | PASS | |
| F10 | occurrences memo depende de [existing, base, completionTick] | PASS | |
| F10 | Sin estado React paralelo para la presentación | PASS | |
| F11 | Grilla de formatos usa occurrences (misma proyección del runtime) | PASS | |
| F11 | Repositorio usa occurrences (misma proyección del runtime) | PASS | |
| F11 | Categoría proyecta con resourceKind=documentCategory | PASS | |
| F12 | ANTES: alerta presentada (present=true · schedule>0) | PASS | present=true |
| F12 | completion → Ledger=1 (hecho persistido) | PASS | ledger=1 |
| F12 | DESPUÉS: buildScheduleLines = 0 líneas (oculta) | PASS | schedule=0 |
| F12 | hasOpen=false (ventana actual cerrada) | PASS | hasOpen=false |
| F12 | N+1: occurrence NUEVA (≠ N) con status ≠ COMPLETED | PASS | status=NEW |
| F12 | N+1: alerta REAPARECE presentada SOLO porque la config sigue activa | PASS | present=true |
| F13 | disabled=false → sin estado presentable | PASS | state=null |
| F13 | Configuration y occurrence quedan INTACTAS (solo se suprime la visual) | PASS | enabled=false, occurrence sí |
| F14 | AlertVisualDescriptor mapea alta → ícono/color/label | PASS | color=orange label=Alta |
| F14 | Renderers de badge consumen EXCLUSIVAMENTE el descriptor | PASS | |
| F14 | PRIORITY_VISUALS mantiene baja/media/alta/crítica | PASS | |
| F14 | alertVisual es SOLO mapeo puro color→clases / ícono→componente | PASS | |
| F15 | require() = 0 · dynamic import() = 0 · CompositionRoot ESM bootstrap | PASS 3/3 | |
| F16 | Build `npm run build` → ✓ built in 2.40s | PASS 2/2 | |
| F17 | `src/` SIN modificaciones nuevas (`git status --short src/` limpio) | PASS | (limpio) |
| F18 | Familia: 296 exit=0 · 297 exit=0 · 299 80/80 · 300 65/65 · 301 53/53 · 302 semántica · 303 39/39 · 304 semántica · 305 35/35 + ALIGNED · 306 53/53 + RE-DERIVED | PASS 10/10 | |

## Demostración clave (F12 — el corazón del sprint)

Con una alerta diaria anclada a `2026-08-12 09:00` (misma cadena unificada que
presenta el formato/repositorio/categoría):

| Momento | Estado del selector | buildScheduleLines | Presentación unificada |
|---|---|---|---|
| ANTES (12/08 10:00) | present=true · hasOpen=true | `Hoy[09:00]` | **VISIBLE** |
| Tras completion (Ledger=1) | present=true · hasOpen=false | `[]` (la completada se excluye) | **OCULTA** (null) |
| N+1 (13/08 10:00) | present=true · hasOpen=true | `Hoy[09:00]` (occurrence nueva) | **REAPARECE** |

`N ≠ N+1`: la occurrence completada NO se reusa; la alerta reaparece porque su
configuration sigue ACTIVE y el schedule deriva la siguiente ventana. La
presentación se oculta y reaparece únicamente a través de
`buildScheduleLines` + `projectResourceAlertState` — **sin** `completedLocal`,
`justUploaded`, `display:none`, `forceUpdate` ni estado React paralelo.

## Scope respetado / STOP list

- **CERO** cambios en `src/`: `git status --short src/` → limpio (F17).
- No se usó `writeFileSync`/`appendFileSync`/`rm`/`rename`/`git checkout`/
  `git restore`/`git reset` sobre código funcional.
- No se introdujo `completedLocal`, `justUploaded`, `isCompleted`, `alertHidden`
  ni ningún estado paralelo para ocultar/reaparecer la alerta (F09/F10/F12).
- No se tocó `UnifiedAlertResourcePresentation`, `alertResourceState`,
  `alertVisual`, `useAlertRuntime`, el Resolver, el Ledger, la proyección, la
  recurrencia ni ninguna superficie de consumo.
- `scripts/sprint-307-unified-alert-resource-presentation-certification.mjs`
  y este documento son los únicos artefactos nuevos.

## Declaración

**Sprint 307 — CERTIFIED.** Existe **una sola presentación visual de alerta de
recurso** (`UnifiedAlertResourcePresentation`) consumida por igual por el
formato (grilla de DynamicModule), el repositorio y la categoría
(ModuleDocumentViewer). Es pura presentación: consume únicamente el estado ya
proyectado por `projectResourceAlertState` y lo formatea con `buildScheduleLines`
(día único por grupo, rotulos relativos, deduplicación de tiempos, exclusión de
completadas/canceladas), sin re-derivar identidad, horarios ni prioridad, y sin
estado visual paralelo. Tras completar, la occurrence completada queda fuera del
schedule (la presentación se oculta) y en la siguiente ventana la alerta
reaparece porque la configuración sigue ACTIVE y la ocurrencia N+1 se re-deriva.
La supresión visual de alertas deshabilitadas (Sprint 295) se mantiene con la
configuration y la occurrence intactas. Las regresiones 296–306 permanecen
verdes y el build finaliza correctamente.

**Próximo (fuera de alcance 307):** nada funcional pendiente detectado; la
cadena de presentación unificada queda certificada de extremo a extremo.
