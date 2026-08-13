# Sprint 301 — Live Alert Reconciliation & UI State Ownership Certification

Rama: `release/stable-sprint79`
Modo: AUDIT · LEVEL 5 · LIVE RUNTIME VALIDATION (sin corrección aplicada)
Fecha: 2026-08-12
Tipo: Auditoría ejecutable que certifica que el pipeline certificado en Sprint 300
llega **íntegro** hasta la presentación React: una acción real completa UNA
ocurrencia, el hecho se lee en vivo por la proyección, el `completionTick`
invalida el memo y la alerta se oculta **en la misma sesión** sin refresh.
Dependencias: Sprints 257 · 280 · 284 · 289 · 290 · 291 · 292 · 294 · 295 · 296 · 297 · 298 · 299 · 300

## Objetivo

Cerrar la frontera pendiente de Sprint 300 (recomendación (3): prueba E2E UI-level)
certificando con evidencia ejecutable la **propiedad de estado de la UI**: existe
UN solo dueño del estado de alertas (`useAlertRuntime.occurrences`) y los
presentadores (Dashboard, DynamicModule, ModuleDocumentViewer, AlertMonitoringExperience)
consumen la proyección sin inventar estado propio, sin segunda fuente de verdad y
sin escrituras al ledger.

```
ACCIÓN REAL (FORM/REPO) → publish(COMPLETION_INTENT) → BRIDGE → RESOLVER → LEDGER
→ completionTick (N+1) → re-proyección del memo → NUEVO objeto de estado
→ PRESENTADOR consume (schedule.length===0 → null) → alerta oculta en la MISMA sesión
```

Suite: `node scripts/sprint-301-e2e-live-alert-reconciliation.mjs`

## Resultado

**TOTAL: 53/53 PASS** · `process.exit(0)` · sin correcciones aplicadas.

Los únicos 2 FAIL del primer run fueron **bugs de las aserciones de la propia
suite**, no del motor:

1. **F01 AC-23**: la verificación prohibía `publish(` en `ModuleDocumentViewer`,
   pero el viewer es un **emisor certificado** de `COMPLETION_INTENT` (escribir
   completions ≠ publicar el intent). Se restringió la aserción a prohibir la
   escritura directa al ledger (`recordCompletion`/`OccurrenceLedger.`).
2. **F10 AC-13**: se ejecutaba a las 10:00, antes de que la alerta B (14:00)
   iniciara su ventana → B correctamente clasificaba `upcoming`. Re-temporizado a
   las 15:00 → determinista: A=completed, B=today (open), C=upcoming, ledger=1 hecho.

## Corrección aplicada

Ninguna. `NO_ACTIVE_FAILURE` / `UI_STATE_OWNERSHIP_OK`. La propiedad se conserva
sin tocar el motor: OccurrenceContract/Schedule/Projection/Bridge/Resolver/
Ledger/Persistence/recurrencia quedaron intactos (STOP list).

## Matriz de resultados por fase

| Fase | Verificación | Resultado | Evidencia |
|---|---|---|---|
| F01 | `main.jsx` monta `<StrictMode><AuthProvider><App/></AuthProvider></StrictMode>` | PASS | árbol real |
| F01 | Boot de persistencia durable en arranque (`bootDurableOccurrenceLedger`) | PASS | |
| F01 | Router → ProtectedRoute → DashboardLayout → /dashboard → Dashboard | PASS | |
| F01 | `DynamicModule` bajo `:moduleSlug`; `DynamicForm` bajo `:formSlug` | PASS | |
| F01 | Dashboard · DynamicModule · ModuleDocumentViewer · AlertMonitoringExperience consumen `useAlertRuntime` (único dueño) | PASS | runtime surface |
| F01 | AC-21/22: los 4 presentadores sin estado `completed` local ni ocultamiento artificial (`display:none`, reload) | PASS | 4/4 |
| F01 | AC-23: los 4 presentadores no escriben completions al ledger (sin `recordCompletion`/`OccurrenceLedger.`) | PASS | 4/4 |
| F01 | AC-21: emisores de `COMPLETION_INTENT` = EXACTAMENTE DynamicForm + ModuleDocumentViewer | PASS | scan estático src/ |
| F02 | Hook REAL bajo auditoría (no placeholder, len=25191) | PASS | guard anti-stub |
| F02 | `completionTick` declarado como estado del runtime | PASS | |
| F02 | Deps reales del memo de `occurrences` = `[existing, base, completionTick]` | PASS | |
| F02 | El tick se suscribe al `COMPLETION_INTENT` en el MISMO effect que el bridge | PASS | |
| F02 | El memo SOLO invalida: el hook no duplica el motor (sin `recordCompletion` en hook) | PASS | |
| F02 | Render sin cambios reutiliza el MISMO objeto (memo estable) | PASS | |
| F02 | AC-05/06: `completionTick` N+1 → el memo recomputa y produce NUEVO objeto | PASS | tick=1 |
| F03 | EXACTAMENTE un archivo `OccurrenceLedger` en src (sin instancia duplicada) | PASS | ruta única |
| F03 | El bridge importa `./OccurrenceLedger.js` (misma ruta que la proyección) | PASS | |
| F03 | AC-04/23: el hecho del bridge es leído por la proyección de la UI (misma instancia) | PASS | completion=true active=0 |
| F04 | AC-24: el array de ocurrencias cambia de referencia tras el completion (memo no obsoleto) | PASS | before≠after |
| F04 | AC-08: `hasOpen` pasa de true a false | PASS | |
| F04 | El estado consumido por el presentador cambia de referencia | PASS | |
| F05 | AC-07: Dashboard recibe NUEVO objeto `metrics` tras el completion | PASS | referencia cambiada |
| F05 | AC-07: `activeAlerts` OLD=1 → NEW=0 | PASS | |
| F06 | AC-09: antes → el presentador renderiza el bloque (schedule>0); después → `null` (schedule.length===0, regla real) | PASS | schedule=1 → null |
| F06 | AC-21: la presentación NO inventa estado — consume y devuelve null con regla real | PASS | |
| F07 | FORM AC-01: el completion llega al ledger (la proyección lo ve) | PASS | open true → false |
| F07 | FORM AC-08/10: la alerta desaparece en la MISMA sesión (sin refresh) | PASS | |
| F07 | FORM AC-16: el día siguiente la nueva ocurrencia reabre la alerta | PASS | hasOpen=true |
| F07 | FORM AC-12: submit fallido NO completa (publish estrictamente tras `await submitFormResponse`) | PASS | |
| F08 | REPO AC-02: completion del repository llega al ledger y oculta en la misma sesión | PASS | open true → false |
| F08 | REPO AC-11: sin publish (upload fallido) la alerta permanece visible (sin completion optimista) | PASS | |
| F08 | REPO AC-11: el viewer publica SOLO tras `await uploadRecord` (el path de error nunca completa) | PASS | |
| F09 | CAT AC-03/14: categoría propia completa SOLO su categoría | PASS | |
| F09 | CAT AC-14: categoría propia NO completa el Repository (sigue visible) | PASS | |
| F09 | CAT AC-03/15: upload en categoría heredada completa el Repository dueño | PASS | |
| F10 | AC-13: A=completed, B=open (today), C=upcoming — una acción, una ocurrencia (a las 15:00, ventanas reales) | PASS | statuses por alertId |
| F10 | AC-13: el ledger registró EXACTAMENTE un hecho | PASS | size=1 |
| F11 | DIARIO/SEMANAL/MENSUAL/ANUAL (AC-16..19): completa el período → oculta; siguiente período → nueva ocurrencia reaparece | PASS | hidden=true reappeared=true |
| F12 | AC-20: refresh conserva el completion (hydrate → completed, alerta oculta) | PASS | replayed=1 |

## Traza de reactividad (in-memory, F03/F10)

La traza se mantiene **solo en memoria** (nunca se persiste, nunca toca `src/`).
El orden parcial que garantiza el ocultado en la misma sesión:

```
action.submit → (bridge registra el hecho en el ledger) → completionTick
→ re-proyección (memo invalidado, lee el ledger en vivo) → hasOpen=false
→ NUEVO objeto de estado → presentador devuelve null (schedule.length===0)
```

## Clasificación de hallazgos

Cada check usa la taxonomía obligatoria: `EMITTER_FAILURE`, `EVENT_BUS_FAILURE`,
`BRIDGE_FAILURE`, `RESOLVER_FAILURE`, `IDENTITY_FAILURE`, `LEDGER_FAILURE`,
`PERSISTENCE_FAILURE`, `PROJECTION_FAILURE`, `REACTIVITY_FAILURE`,
`PRESENTATION_FAILURE`, `RECURRENCE_FAILURE`. Con 53/53 verde no hay fallos
clasificables. Clasificación final:

- **NO_ACTIVE_FAILURE / UI_STATE_OWNERSHIP_OK** — single-owner
  (`useAlertRuntime.occurrences`); ledger único; sin segunda fuente de verdad.
- Cierre de la recomendación (3) de Sprint 299/300: la prueba E2E UI-level queda
  certificada por esta suite (semántica de memo React sobre el pipeline REAL con
  el árbol React y las deps reales verificadas estáticamente).

## Scope respetado / STOP list

- **CERO** cambios en `src/`. El motor quedó intacto (STOP list): no se tocaron
  OccurrenceContract, Schedule, Projection, Bridge, Resolver, Ledger, Persistence
  ni la recurrencia.
- No se crearon segundas fuentes de verdad, estados `completed` locales en
  presentadores, `display:none`, filtros visuales ni condiciones artificiales.
- No se alteró `UnifiedAlertResourcePresentation`, la semántica del ledger ni la
  proyección.
- `docs/` y `scripts/` son los únicos directorios nuevos.
