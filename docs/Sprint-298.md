# Sprint 298 — Recurrencia Calendario-Aware (Meses / Años) + Ancla Fecha-Correcta

Rama: `release/stable-sprint79`
Modo: CONTROLLED · LEVEL 5 (una UNO motor de recurrencia; la recurrencia sigue DERIVADA, nunca persistida)
Dependencias: Sprint 257 · 264 · 280 · 284 · 289 · 290 · 291 · 292 · 294 · 295 · 296 · 297

## Contexto

Las recurrencias `hours/days/weeks` eran lineales en ms y correctas. Los períodos
`months` y `years` no podían proyectarse con aritmética de calendario real
(leap days, fines de mes) dentro del motor certificado, y `parseAnchor` montaba
las fechas pura de `YYYY-MM-DD` vía `new Date(literal)` — que en zonas UTC-negativas
desplaza un día atrás la medianoche local (ej. `15/08` → `14/08 08:00 local`).
Ese corrimiento quedó "codificado" dentro de varias suites de certificación
previas (289/290/291) y enmascaraba el análisis de aislamiento (267).

Este sprint corrige el ancla a semántica CALENDAR (fecha local) y agrega el ÚNICO
punto de extensión calendario del motor: aritmética de meses/años con la política
CAL-001 (saturación al último día válido del mes objetivo).

## Qué cambió (mínimo, un solo motor)

### 1. `OccurrenceSchedule.js` — ancla fecha-correcta (CAL386)

- `parseAnchor`: un literal PURE de fecha (`YYYY-MM-DD`, el que elige el usuario)
  se ensambla como MEDIANOCHE LOCAL (`localDateOnlyMs`). Cualquier otro literal
  (RFC, con hora) conserva el parseo anterior (fallback).
- Efecto: `15/08/2026 08:00` en zona UTC-negativa ahora ancla en `15/08/2026
  08:00` (antes `14/08 08:00`). La primera ventana SIEMPRE inicia en el
  `startDate` configurado (§7).

### 2. `OccurrenceSchedule.js` — recurrencia calendario (meses / años)

- `computeTarget(anchor, periodicityOrCadence, now)` y
  `occurrenceWindowAt(anchor, periodicityOrCadence, now)` aceptan ahora EITHER una
  cadencia numérica (contracto legacy ms-lineal, sin cambios) OR una periodicidad
  rica `{ amount, unit }` con `unit: 'months' | 'years'` — el ÚNICO camino capaz
  de calendario. Nada más cambia de semántica.
- `calendarAddMonths` / `calendarAddYears` — **POLICY CAL-001**: se preserva el
  día anclado; cuando el mes objetivo no tiene ese día (31 ene → feb, 29 feb →
  año no bisiesto) la ocurrencia cae en el ÚLTIMO día válido del mes. Nunca un
  desborde silencioso al mes siguiente ni una aproximación fija de 30/365 días.
- `calendarSequenceWindow` — EXACTAMENTE una ventana por configuración:
  `[startsAt(N), startsAt(N+1))` con la fecha de inicio nunca-not-after `now`;
  clamping acotado (los inicios son monótonos) para absorber la saturación.
  La acción en cualquier instante de la ventana completa la ocurrencia N.
- `calendarComputeTarget` — la PRÓXIMA ocurrencia es siempre DERIVADA (AC-18),
  nunca guardada.

### 3. `OccurrenceProjection.js` — pasa la periodicidad RICA al schedule

- El projector ya no deriva `cadenceMs`; pasa `{ amount, unit }` tal cual. Así
  `months/years` proyectan con aritmética de calendario y las demás unidades
  conservan el camino ms-lineal certificado. Un solo motor, un solo algoritmo.

### 4. `AlertConfigurationForm.jsx` — preset "Cada año"

- Nuevo preset `anual` (unit `years`) en el selector de recurrencia. El
  Mapper/Normalizer/Resolver ya aceptaban `years`; aquí solo se expone la
  presentación. NO se crea ningún formulario anual paralelo.

### 5. Reconciliación de suites de certificación (evidencia CAL383)

Las suites previas codificaban la ventana CORRIDA (misma fecha startDate pero
ancla desplazada un día). Con anclas fecha-correctas las expectativas se
corrigen al calendario real (primera ventana = startDate):

- `scripts/sprint-289-dashboard-kpi-consolidation.mjs` — TEST 05: día 2 →
  `A occ:1 → occ:2` (no `occ:3`); B/C mantienen `occ:1` (su primera ventana aún
  cae en día 2), no `occ:2`.
- `scripts/sprint-290-alert-state-visual-migration.mjs` — TEST 17: head = ocurrencia
  con vencimiento más próximo = A 08:00 (`12:alert:0`), no B.
- `scripts/sprint-291-alert-state-placement.mjs` — TEST 07: mismo head A 08:00.
- `scripts/sprint-267-multi-alert-completion-isolation-audit.mjs` — el demo del
  prototipo de aislamiento por ocurrencia (Casos A–E) limpiaba `protoLedger`
  pero NO el ledger real que la STEP 5 dejó con el completion 21:30; con las
  ventanas correctas ese fallback legacy casaba con B/C y falsaba el caso.
  Ahora cada caso aísla el ledger real (solo hechos del prototipo) y `completeActed`
  ya no borra `protoLedger` a mitad del caso (Caso D — dos intenciones A+B
  secuenciales).

## Certificación

Sweep completo tras el cambio (`node scripts/sprint-*.mjs`):

| Suite | Resultado | Nota |
|---|---|---|
| Sprint 265 | 15/15 | sin cambios |
| Sprint 266 | 20/22 | 2 checks pre-existentes (STEP 6: la señal genérica porta claves identidad `null`) — fuera de alcance |
| Sprint 267 | 23/25 | Harness reparado; 2 checks pre-existentes (STEP 5, mismas claves `null`) — fuera de alcance |
| Sprint 284 | ALL PASS | sin cambios |
| Sprint 289 | 10/10 | TEST 05 corregido a calendario |
| Sprint 290 | 27/27 | TEST 17 head corregido |
| Sprint 291 | 50/50 | TEST 07 head corregido |
| Sprint 292 | 34/34 | sin cambios |
| Sprint 294 | 16/16 | sin cambios |
| Sprint 295 x2 | 32/32 · 32/32 | sin cambios |
| Sprint 296 | 42/42 | sin cambios |
| Sprint 297 | 38/38 | sin cambios |

Directo del motor:

```
node scripts/sprint-298-calendar-recurrence.mjs        (si se agrega la suite dedicada)
```

### Evidencia semántica (§7)

- Ancla `2026-08-15 08:00` + mensual → `15/08/2026 08:00`, `15/09/2026 08:00`, …
- Ancla `2026-08-15 08:00` + anual → `15/08/2026 08:00`, `15/08/2027 08:00`,
  `15/08/2028 08:00` (leap 2028 respetado — nunca 365 días).
- Saturación CAL-001: `31/01 08:00` mensual → `28/02` (o `29/02` bisiesto);
  `29/02/2028 08:00` anual → `28/02/2029`.

## STOP list respetada

- NO se crearon `AnnualAlertService` / `MonthlyAlertService` / segundo planificador:
  un único motor en `OccurrenceSchedule`.
- La recurrencia sigue DERIVADA en el momento de consulta; el ledger guarda solo
  hechos de completion (AC-18 / Sprint 297 intactos).
- El contrato legacy ms-lineal (hours/days/weeks y cadencia numérica) NO cambió
  de semántica; toda suite previa con cadencia numérica sigue pasando idéntica.
- No se toca `OccurrenceContract` / `occurrenceIdOf` / bridge / runtime de
  completion.
- La señal genérica conserva sus claves identidad `null` (gap conocido 266/267,
  sin cambios en este sprint).