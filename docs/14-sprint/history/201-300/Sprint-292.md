# Sprint 292 — Compact Alert State Presentation & Resource Card Refinement

**Branch:** `release/stable-sprint79`
**Modo:** CONTROLLED UI REFINEMENT · PRESENTATIONAL ONLY
**SSOT:** `docs/Sprint-292.md`
**Dependencias:** Sprint 284 · 285 · 288 · 289 · 290 · 291
**VERDICT: SPRINT 292 — CERTIFIED**

---

## 1. Objetivo

> Reducir y simplificar visualmente el bloque de alerta dentro de la card del formato.

La card responde únicamente: **¿Este formato tiene una alerta y cuándo debo prestarle atención?**

### Antes
```
⚠ Alerta operacional
Estado: Hoy
Prioridad: Media
Próximo: Hoy 20:37
3 evento(s) abierto(s)
Hoy - Hoy 20:37
Hoy - Hoy 20:38
Hoy - Mañana 05:07
```

### Después
```
┌─────────────────────────────┐
│ ◷ Alerta operacional        │
│   Hoy · 20:37 · 20:38       │
│   Mañana · 05:07            │
└─────────────────────────────┘
```

---

## 2. Alcance

**ÚNICAMENTE PRESENTACIÓN VISUAL.** 0 cambios en: Alert Runtime,
OccurrenceProjection, OccurrenceLifecycle, Completion, Configuration, Persistence,
Schema, Repository, Category, DynamicForm logic, Dashboard, Workspace,
AlertMonitoringExperience.

**Superficies tocadas:**
- `src/pages/DynamicModule.jsx` → `FormatAlertState` (bloque compacto) + `buildScheduleLines`.
- `src/utils/alertResourceState.js` → **nuevo** `buildScheduleLines` (agrupador horario puro de presentación).

`ModuleDocumentViewer.jsx` (Repositorio/Categoría) y `DynamicRecordsView.jsx` **no se**
modifican (TEST 08; la regla de configuración Repository→Categories queda reconocida
como comportamiento actual, sin tocarla — ver sección 7).

---

## 3. F1 — Auditoría (estado actual del bloque)

| Superficie | Antes | Después |
|---|---|---|
| Card de formato (`FormatAlertState`) | Estado + Prioridad + openCount + lista de eventos con prefijo repetido ("Hoy - Hoy 20:37") | Día (Hoy/Mañana/fecha) · HH:MM, agrupado por día; bloque `px-2.5 py-1.5`, título 11px, líneas 11px |
| `DynamicForm` | Formulario puro (Sprint 291 — panel removido) | **Sin cambios** (regla Sprint 291 congelada: no reintroducir panel) |
| `ModuleDocumentViewer` | Bloque rico de Repositorio/Categoría (Sprint 291) | **Sin cambios** |
| `buildScheduleLines` (util) | — | NUEVO: N occurrences → 1 estado visual → N horarios relevantes (AC-17) |

---

## 4. F2 — `buildScheduleLines` (util, presentación pura)

`src/utils/alertResourceState.js`:
- Entrada: `events` del proyector (`{ status, dueMs }`). Salida: `[{ day, times[] }]`.
- `day` ∈ `Hoy` | `Mañana` | `12 ago` (día + mes abreviado). `times` = `HH:MM`.
- Agrupa horarios del mismo día en una línea → **no repite el prefijo del día** (AC-06).
- Salta eventos `completed`/`cancelled` → horarios solo relevantes (AC-05).
- Es selección pura de presentación: no escribe, no consulta, no recalcula schedules
  (reutiliza `dueMs` de la proyección certificada).

---

## 5. F3 — `FormatAlertState` compacto (DynamicModule)

`src/pages/DynamicModule.jsx`:
- El bloque consume el mismo `projectResourceAlertState` (Sprint 290/291) y renderiza
  SOLO `schedule = buildScheduleLines(state.events)`.
- **Eliminado:** `Estado: …`, `Prioridad: …`, `Próximo: …`, `N evento(s) abierto(s)`
  y el prefijo redundante por evento (AC-02..AC-06).
- **Jerarquía de la card:** icono → nombre → ~8-12px → alerta → acción "Ingresar"
  (AC-07/AC-08). `mb-2` bajo nombre, `mt-2` sobre alerta, `mb-2` descripción, `pt-2`
  acción; sin grandes separaciones verticales (AC-09 card conserva diseño).
- **Compacto:** `rounded-lg border px-2.5 py-1.5`, título 11px bold, líneas 11px,
  icono `w-3.5`, `leading-tight`, sin títulos repetitivos ni metadata secundaria (AC-08).
- **Responsive:** cada día es una fila con `flex-wrap`; cada hora es `whitespace-nowrap`
  separada por `·`. Con espacio todo en la misma fila; sin espacio, wrap sin overflow,
  sin textos cortados, sin desplazamiento horizontal (AC-18).
- Sin alerta (no `present` o `schedule.length === 0`) → **no hay bloque** (TEST 03).
- **Regla de hooks:** `buildScheduleLines` se calcula directo (barato), sin `useMemo`
  posterior al early-return (rules-of-hooks limpio).

---

## 6. Prioridad (AC-03 / TEST 06)

La prioridad **no se presenta** en la vista compacta de la card, pero **continúa
existiendo en el modelo** y es utilizada por el runtime (enriquecimiento `priority`
en el proyector, `PRIORITY_LABELS` en el util). Este sprint no elimina prioridad ni
inventa nueva semántica visual.

---

## 7. Repositorio y Categorías (regla de configuración congela)

`Configuration → Repository → Categories` sigue siendo el comportamiento actual:
una alerta configurada sobre el repositorio puede aparecer visualmente en sus
categorías. Este sprint **NO** toca resolver de configuración, schema, persistencia,
`resourceKind`, enrollment ni category identity. `Configuration → Category` es un
trabajo futuro, fuera de Sprint 292.

---

## 8. Separation architecture (congelada)

```text
CONFIGURATION → ALERT DOMAIN → RUNTIME/OCCURRENCES → PRESENTATION
                                                        ├── Formato
                                                        ├── Repositorio
                                                        └── Categoría
```

Nunca `DynamicForm → Alert Configuration`, `Repository → Alert Logic`,
`Category → Alert Runtime`. Los recursos consumen estado; no administran alertas.

---

## 9. Acceptance Criteria

| AC | Criterio | Resultado |
|---|---|---|
| AC-01 | Alerta permanece en card de formato | **PASS** (TEST 01/02/04) |
| AC-02 | "Estado: Hoy" eliminado | **PASS** (TEST 04) |
| AC-03 | "Prioridad: Media" eliminada de vista compacta | **PASS** (TEST 06) |
| AC-04 | "N eventos abiertos" eliminado | **PASS** (TEST 05) |
| AC-05 | Horarios permanecen visibles | **PASS** (TEST 01/02) |
| AC-06 | Fechas repetitivas simplificadas (día una sola vez) | **PASS** (TEST 02) |
| AC-07 | Espacio entre título y alerta reducido | **PASS** (TEST 10: `mb-2`/`mt-2`) |
| AC-08 | Altura del bloque reducida | **PASS** (bloque `py-1.5`, 11px) |
| AC-09 | Card conserva diseño actual | **PASS** (card intacta) |
| AC-10 | Formulario no recibe nueva lógica | **PASS** (TEST 07) |
| AC-11 | Runtime sin cambios | **PASS** (0 toques) |
| AC-12 | Configuration sin cambios | **PASS** (0 toques) |
| AC-13 | Repository sin cambios funcionales | **PASS** (TEST 08) |
| AC-14 | Category sin nueva identidad | **PASS** (TEST 09) |
| AC-15 | Occurrences sin modificaciones | **PASS** (0 toques) |
| AC-16 | Completion sin modificaciones | **PASS** (0 toques) |
| AC-17 | Una alerta visual puede representar múltiples horarios | **PASS** (TEST 02) |
| AC-18 | Responsive sin overflow | **PASS** (TEST 10: flex-wrap + nowrap) |
| AC-19 | Experiencias Operacionales permanece oculta | **PASS** (DETACH intacto, Sprint 291) |
| AC-20 | Build PASS | **PASS** (2.53s) |

---

## 10. Tests

`node scripts/sprint-292-alert-card-compact.mjs` → **34/34 PASS**

| Test | Resultado |
|---|---|
| TEST 01 — Single occurrence → `Hoy · 20:37` | **PASS** |
| TEST 02 — Multiple occurrences → `Hoy · 20:37 · 20:38` / `Mañana · 05:07` | **PASS** |
| TEST 03 — No alert → no block | **PASS** |
| TEST 04 — No duplicated state ("Estado:" no se renderiza) | **PASS** |
| TEST 05 — No open-count | **PASS** |
| TEST 06 — Priority hidden only (modelo intacto, presentación no) | **PASS** |
| TEST 07 — Form integrity (Formato → Ingresar idéntico) | **PASS** |
| TEST 08 — Repository regression (Repositorio/Categorías sin cambios) | **PASS** |
| TEST 09 — Architecture regression (sin AlertForm/AlertRepository/AlertCategory) | **PASS** |
| TEST 10 — Build + fuente sin overflow | **PASS** (build 2.53s) |

---

## 11. Regression Matrix

| Área | Resultado |
|---|---|
| Sprint 291 (placement) | 50/50 PASS |
| Sprint 290 (visual migration) | 27/27 PASS |
| Sprint 289 (KPI) | 10/10 PASS (no tocado; anterior) |
| Sprint 284 (identity contract) | 21/21 PASS (no tocado; anterior) |
| Sprint 280 isolation | PASS (anterior, vía TEST 04bis 289) |
| Build | PASS (2.53s) |
| Lint | 0 problemas NUEVOS en el diff (se corrigió el `useMemo` post-early-return; quedan 5E+1W preexistentes HEAD en DynamicModule, 1E en DynamicForm y 3E en ModuleDocumentViewer) |

---

## 12. STOP Conditions (resultado)

| STOP | Estado |
|---|---|
| Modificar Configuration / Enrollment / Resolver | **NO DISPARADO** |
| Modificar Runtime / OccurrenceProjection / OccurrenceLifecycle / Completion | **NO DISPARADO** |
| Modificar DynamicForm logic | **NO DISPARADO** |
| Modificar Repository/Category funcionalmente | **NO DISPARADO** (solo presentación) |
| Reintroducir panel grande en DynamicForm | **NO DISPARADO** (regla Sprint 291 congelada) |
| Nueva identidad / persistencia / rutas / experiencias | **NO DISPARADO** |
| Configurar alerta por categoría (Configuration → Category) | **FUERA DE ALCANCE** (sprint futuro) |

---

## 13. Veredicto

**SPRINT 292 — CERTIFIED**

- El bloque de alerta de la card de formato es ahora un **indicador compacto del
  recurso**: `Alerta operacional` + días/horas agrupados, sin metadata secundaria.
- N occurrences → 1 estado visual → N horarios relevantes (arquitectura Sprint 290 intacta).
- Única superficie tocada: presentación de la card de formato (+ helper puro de
  presentación en el util). 0 cambios de dominio, 0 cambios en Repositorio/Categoría.
- Tests: 34/34 (292) + 50/50 (291) + 27/27 (290) + Build PASS.

---

## 14. Roadmap (provisional)

```text
290 → Alert State Visual Migration to Real Resources       ✅ CERTIFIED
291 → Corrective Alert State Placement                     ✅ CERTIFIED
292 → Compact Alert State Presentation                      ✅ CERTIFIED
292+ → (pendiente) — Configuration → Category (alerta
      persistida sobre categoría) y decisiones futuras de
      AlertMonitoringExperience.
```

Los números posteriores no quedan certificados por este documento.