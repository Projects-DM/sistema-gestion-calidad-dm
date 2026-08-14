# Sprint 311 — Unified Alert Metadata Presentation · Controlled Correction

Rama: `release/stable-sprint79`
Modo: CONTROLLED CORRECTION · LEVEL 5 · PRESENTATION ONLY
Fecha: 2026-08-13
Tipo: Presentación de la metadata certificada (nombre + frecuencia + prioridad) en el renderer unificado — **CERTIFIED**
Dependencias: Sprint 307 CERTIFIED · Sprint 309 PIPELINE CERTIFIED · Sprint 310 CERTIFIED (53/53)
Suite: `node scripts/sprint-311-unified-alert-metadata-presentation-certification.mjs`

## Clasificación final

```
SPRINT 311 — UNIFIED ALERT METADATA PRESENTATION · CONTROLLED CORRECTION

  NAME:                    PASS
  FREQUENCY:               PASS
  PRIORITY VISUAL:         PASS
  SINGLE PRESENTATION:     PASS
  PURE PRESENTATION:       PASS
  COMPLETION:              PASS
  N+1:                     PASS
  DISABLED:                PASS
  MULTI-ALERT:             PASS
  RESPONSIVE:              PASS
  NO PARALLEL STATE:       PASS
  NEW QUERY:               NONE
  NEW STATE:               NONE
  NEW PIPELINE:            NONE
  NEW SSOT:                NONE
  BUILD:                   PASS
  REGRESSIONS:             GREEN

  STATUS:                  CERTIFIED
```

TOTAL: **46/46 PASS**.

## Qué se presentó

`UnifiedAlertResourcePresentation` (el ÚNICO renderer certificado para las tres
superficies: Formato / Repositorio / Categoría) consume ahora la metadata que
Sprint 310 transportó al estado proyectado:

| Campo | Autoridad (§2) | Origen |
|---|---|---|
| `name` | `state.name` | Sprint 310 → `envelope.metadata.name` |
| `periodicity` | `state.periodicity` | Sprint 310 → `configuration.periodicity` (VO canónico) |
| `priority` / `priorityLabel` | existente | `PRIORITY_VISUALS` certificado |

Render resultante (una sola línea compacta + frecuencia + schedule intacto):

```
│ ● [icono]  PREOPERATIVO LIMPIEZA Y DESINFECCION · Alta    │
│            Cada 2 semanas                                 │
│            Mañana 09:00                                   │
```

## Corrección exacta (§3)

Tres adiciones localizadas en el componente (un único archivo de `src/`):

1. **`frequencyLabel`** — formatter local único que acepta el VO `periodicity`
   (`{amount, unit}`) → "Cada día / Cada 2 semanas / Cada mes / Cada 3 meses".
   No existe ningún formatter exportado que acepte el VO en la frontera de
   presentación (auditado §4); este es UN solo helper estándar. Deriva SOLO de
   `state.periodicity` — nunca de `startsAt`/`dueAt`/`nextExecution`/events.
2. **`PRIORITY_ICON_COMPONENTS`** — mapa estático resuelto una vez a module
   scope (patrón F8 de Sprint 286): `low/medium/high/critical → icono del
   descriptor certificado`. CERO `resolveAlertIcon` en render.
3. **Layout** — dot de color + icono de prioridad + nombre (+ label `· Alta`
   compacto); si `name` es `null`, el título es `priorityLabel` (nunca se
   inventa "Sin nombre"/"Alerta operacional"). Línea de frecuencia opcional y
   schedule sin cambios (flex-wrap, truncate, sin overflow).

Gates preservados verbatim (E08/E09/E10): `state?.present !== true → null` y
`schedule.length === 0 → null`.

## Dónde se aplicó

- **Modificado**: `src/shared/components/alert/UnifiedAlertResourcePresentation.jsx` (único archivo de `src/`, §17).
- **Intactos** (§5–§9): pipeline de proyección (`alertResourceState.js` — Sprint 310), Resolver, `AlertConfiguration`, Runtime, Ledger, recurrence, persistencia, `DynamicModule`, `ModuleDocumentViewer`.
- **Sin formatter duplicado**: solo `frequencyLabel` (E17: 1 definición + 1 uso).
- **Sin duplicar prioridad**: se reutiliza `PRIORITY_VISUALS` completo (E16).

## Invariantes verificadas (§14)

| Invariante | Resultado |
|---|---|
| Present (`present !== true → null`) | PASS (E08) |
| Schedule (`schedule.length === 0 → null`) | PASS (E09) |
| Completion (completada → `schedule=[]` → `null`) | PASS (E10) |
| N+1 (estado abierto → render visible) | PASS (E11) |
| Disabled (state `null` → `null`) | PASS (E12) |
| Name ausente → sin inventar | PASS (E13) |
| Periodicity ausente → sin inferir | PASS (E14) |
| Multi-alert (A/B/C aisladas) | PASS (E15) |
| Responsive (flex-wrap + truncate + min-w-0) | PASS (E18) |
| Sin estado React paralelo | PASS (E19) |

## Render real (react-dom/server)

La suite bundlea el `.jsx` con `rolldown` (external: `react`, `react-dom`,
`react-dom/server`, `lucide-react`) dentro de `.s311-bundle/` en la raíz del
proyecto (para que `node_modules` resuelva) y verifica el **HTML producido**,
no solo la fuente:

- E01 — `PREOPERATIVO LIMPIEZA Y DESINFECCION` presente en el HTML.
- E02 — `Cada día`, `Cada 2 semanas`, `Cada mes`, `Cada 3 meses`.
- E04/E05 — `Alta`/`Baja`/`Media`/`Crítica` por descriptor (low/medium/high/critical).

## Regresiones (§18)

Familia ejecutada con **medición de delta real** (baseline: ambos archivos de
`src/` restaurados a HEAD vía backup plano, sin `git stash` porque las suites de
la familia gestionan su propia pila): 296, 297, 299, 300, 301, 302, 303, 304,
305, 306, 307, 308, 310 → **GREEN** (E21, 13/13).

- **0 fails funcionales nuevos**. 302/304/307 ya reportaban fails en el
  baseline (audits forenses de sprints previos) — el delta de 311 es SOLO el
  MODIFICATION GUARD de `src/` (autorizado por §17).
- Build (`npm run build → ✓ built`) PASS (E20).

## Scope respetado / STOP list

- **Solo** `UnifiedAlertResourcePresentation.jsx` modificado en `src/`.
- Sin resolver/fetch/query/runtime/ledger/projection/event-bus calls (E07).
- Imports restringidos a `alertVisual` + `buildScheduleLines` + `PRIORITY_VISUALS` (E07).
- Sin estado React paralelo ni hacks de visibilidad (E19).
- Sin variantes de renderer por superficie: Formato/Repo/Categoría → el MISMO componente (E06).

## Evidencia

Suite: `scripts/sprint-311-unified-alert-metadata-presentation-certification.mjs`

- E01–E05 — render real de name/frecuencia/prioridad.
- E06 — un solo renderer para las tres superficies.
- E07 — pure presentation (0 canales).
- E08–E15 — invariantes de presentación.
- E16–E17 — sin duplicación de prioridad/frecuencia.
- E18–E19 — responsive + sin estado paralelo.
- E20 — build exitoso.
- E21 — regresiones 296–310 sin delta funcional.

## División de responsabilidades tras Sprint 311

```
Resolver       → obtiene metadata        (Sprint 309)
Projection     → transporta metadata     (Sprint 310)
State          → expone metadata         (Sprint 310)
Presentation   → presenta metadata       (Sprint 311 — hecho aquí)
UI             → no deriva metadata
```

## Próximo paso

**Sprint 312 — ALERT COMPLETION PERSISTENCE & TEMPORAL VISUAL SEMANTICS FORENSIC
AUDIT**: auditar (sin cambios funcionales) por qué la alerta deja de presentarse
cuando `schedule=[]` tras el completion, distinguir formalmente
abierta/cumplida/próxima/urgente y certificar qué información temporal ya está
disponible en el estado proyectado. La hipótesis a comprobar: la desaparición es
exclusivamente semántica de presentación (`schedule.length === 0 → null`), no de
persistencia (`COMPLETION ≠ DELETE ALERT`).
