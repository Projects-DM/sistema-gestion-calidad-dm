# Sprint 300 — Live Completion Reconciliation (LCR) Audit + Contingency

Rama: `release/stable-sprint79`
Modo: AUDIT · LEVEL 5 · LIVE RUNTIME VALIDATION + CONTINGENT CORRECTION
Fecha: 2026-08-12
Tipo: Auditoría ejecutable con la corrección contingente del margen de Sprint 299 §ROOT CAUSE (1).
Dependencias: Sprints 257 · 280 · 284 · 289 · 290 · 291 · 292 · 294 · 295 · 296 · 297 · 298 · 299

## Objetivo

Certificar con evidencia ejecutable que el pipeline de completion reconcilia la
alerta en la **misma sesión** (sin refresh manual) y, sobre la base de ese
certificado, aplicar la **corrección contingente** autorizada por el spec Sprint
300 §13 — sustituir el flag global `wired` de `wireCompletionBridge` por una
comprobación de **listener ownership real**:

```
ACCIÓN REAL → EVENTO DE COMPLETION → BRIDGE (owner real) → RESOLVER → LEDGER
→ PERSISTENCIA DEL HECHO → PROYECCIÓN (memo invalidado por completionTick)
→ ESTADO DE ALERTA → PRESENTACIÓN
```

La corrección fue **condicional a la confirmación del margen** (Sprint 299
F03/F10: tras `OperationalEventBus.clear()`, el bridge quedaba "wired" pero sin
handlers → el completion siguiente se perdía en silencio). Sprint 300 confirma el
margen (F16), lo corrige y re-certifica la familia completa.

Suite: `node scripts/sprint-300-live-completion-reconciliation-audit.mjs`

## Resultado

**TOTAL: 65/65 PASS** · `process.exit(0)` · Sweep completo de la familia sin
regresiones (266/267 mantienen únicamente sus 2 checks pre-existentes de la
CompletionSignal genérica — identidad null en el borde EMITTER→BRIDGE — fuera
de alcance y documentados en 299 como recomendación (2) opcional).

## Corrección aplicada (contingencia confirmada)

| Archivo | Cambio |
|---|---|
| `src/core/capabilities/experiences/OperationalEventBus.js` | Método aditivo **read-only** `hasListener(eventType, handler)` — introspcción de ownership que jamás muta (no hay cambios de comportamiento para `subscribe`/`publish`/`clear`). |
| `src/core/capabilities/alert/occurrence/CompletionBridge.js` | Eliminado el flag global `let wired`. `wireCompletionBridge` ahora re-arma **solo cuando su handler `COMPLETION_INTENT` deja de estar realmente registrado** (`hasListener(COMPLETION_INTENT_EVENT, completionIntentHandler)`), descarta leftovers stale antes de re-suscribir y devuelve no-op si ya es dueño → **idempotente y nunca duplica handlers**. |

Guardianes de la corrección (F16, 8 checks verdes):

1. `src` sin referencia a un flag `wired` (regex estática `\bwired\b`).
2. El guard de cableado deriva del ownership real (`hasListener` + identidad del handler).
3. `hasListener` es read-only y espeja `subscribe`/`unsubscribe` (pre=false → sub=true → unsub=false).
4. **El defecto original**: tras `OperationalEventBus.clear()` + nuevo `wireCompletionBridge()`, publicar `COMPLETION_INTENT` registra el hecho (ledger size=1, write-through=1) — con el código anterior se perdía en silencio (REACTIVITY_MARGIN).
5. **Sin duplicados**: cablear 3 veces y publicar una sola vez produce **exactamente 1** escritura en el puerto durable (si hubiera N handlers, el write-through registraría N llamadas pese al overwrite del Map).

## Matriz de resultados por fase

| Fase | Verificación | Resultado | Evidencia |
|---|---|---|---|
| F01 | Form publica `COMPLETION_INTENT` SOLO tras `await submitFormResponse` | PASS | publish@9254 > submit@8208 |
| F01 | Path de error/`catch` NUNCA publica; guardrail sin configuración | PASS | sin publish post-catch |
| F01 | `origin='alert'` (tarjeta) y `origin='resource'`; intent lleva kind/id/module | PASS | branch explícito |
| F02 | Viewer publica SOLO tras `await uploadRecord`; fallo → NO event | PASS | publish@10847 > upload@9965 |
| F02 | Ownership: categoría CON config → `documentCategory`; SIN config → `documentRepository`; **UNA** emisión por upload | PASS | else-if |
| F02 | AC-07: completar categoría OWN completa SOLO esa categoría | PASS | own=true repo=false |
| F02 | AC-03/09: upload de categoría heredada completa SOLO el Repository dueño | PASS | repo=true catOwn=false |
| F02 | AC-09: completion del Repository NO satisface categoría con config propia | PASS | cat=5 sigue open |
| F03 | Bus entrega al bridge ANTES de la re-proyección invalidada (orden seguro) | PASS | action>tick.reproject>published |
| F03 | 1 evento → 1 hecho; re-proyección del tick con hasOpen=false (misma sesión) | PASS | size=1 |
| F04 | Intents malformados rechazados; `origin='alert'` sin identidad → nunca adivina | PASS | null |
| F04 | `origin='resource'` resuelve AT MOST ONE; identidad exacta registrada | PASS | specific key |
| F05 | Selección determinista A (hoy, dueAt menor) — nunca A+B+C | PASS | 12:alert:0:occ:1 |
| F06 | `occurrenceId === occurrenceIdOf(alertId, seq)`; ≠ alertId; sufijo `:occ:<seq>` | PASS | contrato OCC-CERT |
| F07 | Ledger idempotente por identidad: 2 entregas → 1 hecho (size=1) | PASS | AC-27 |
| F08 | `recordCompletion → persistencePort.writeSignal`; refresh → rehidratación sobrevive | PASS | persisted=1, replayed=1 |
| F09 | Tras completion: `hasOpen=false`/`openCount=0`; día siguiente → ocurrencia derivada abierta | PASS | open=0 → open=1 |
| F10 | Hook REAL bajo auditoría (no placeholder, len=25191) | PASS | guard anti-stub |
| F10 | Runtime cablea el bridge ANTES del tick (mismo effect); memo invalidado por `completionTick`; sin duplicar motor | PASS | bridge@23667 < tick@24186; deps `[existing, base, completionTick]` |
| F10 | AC-16/17: inmediatamente tras publish, re-proyección en la MISMA sesión con hasOpen=false | PASS | reprojection=false |
| F11 | Presentación consume; `return null` si `present!==true` o schedule vacío; sin segunda fuente de verdad | PASS | consumo puro |
| F12 | Caso 1 (A→completed, B/C open) · Caso 2 (A+B completed) · Caso 3 (nunca A+B+C) | PASS | size=1 |
| F13 | DIARIO/SEMANAL/MENSUAL/ANUAL: completar el período → desaparece; siguiente → nueva derivada | PASS | seq 1→2 |
| F13 | Mensual es CALENDARIO (31/31/30 días), nunca 30 fijos; `calendarAddMonths` ≡ ventanas | PASS | CAL-001 |
| F14 | now<dueAt→today; now===dueAt→today; now>dueAt→overdue; dentro/fuera de ventana | PASS | OCC-CERT-08/12 |
| F15 | Emisores de `COMPLETION_INTENT` = EXACTAMENTE DynamicForm + ModuleDocumentViewer | PASS | scan estático src/ |
| F16 | Corrección contingente ejecutada y probada (8 checks — ver tabla anterior) | PASS | 65/65 |

## Traza de reactividad (in-memory, F03/F10)

La traza se mantiene **solo en memoria** (nunca se persiste, nunca toca `src/`).
El orden parcial que garantiza el ocultado en la misma sesión:

```
action.submit → (bridge registra el hecho en el ledger) → completionTick
→ re-proyección (memo invalidado, lee el ledger en vivo) → hasOpen=false
```

## Clasificación de hallazgos

Cada check usa la taxonomía obligatoria: `EMITTER_FAILURE`, `EVENT_BUS_FAILURE`,
`BRIDGE_FAILURE`, `RESOLVER_FAILURE`, `IDENTITY_FAILURE`, `LEDGER_FAILURE`,
`PERSISTENCE_FAILURE`, `PROJECTION_FAILURE`, `REACTIVITY_FAILURE`,
`PRESENTATION_FAILURE`, `RECURRENCE_FAILURE`. Con 65/65 verde no hay fallos
clasificables. El margen de Sprint 299 (`REACTIVITY_MARGIN`) fue **confirmado y
cerrado** en F16 — ya no es un hallazgo pendiente.

## Scope respetado / STOP list

- Cambios de `src/` **limitados** a la contingencia autorizada: `CompletionBridge.js`
  (listener ownership) + método aditivo read-only en `OperationalEventBus.js`.
- No se crearon schedulers, entidades de tabla de ocurrencias, lógica de
  completion en React ni segundas fuentes de verdad.
- No se usó `display:none`, filtros visuales ni condiciones artificiales.
- No se alteró `UnifiedAlertResourcePresentation`, la semántica del ledger, la
  proyección ni el contrato de ocurrencias (los checks F01..F15 los re-certifican intactos).
- `docs/` y `scripts/` son los únicos directorios nuevos.
- Recomendaciones (2) y (3) de Sprint 299 (omitir `alertId/occurrenceId: null`
  de la CompletionSignal genérica — cierra los checks pre-existentes 266/267 — y
  prueba E2E UI-level) permanecen **opcionales** y fuera de alcance.
