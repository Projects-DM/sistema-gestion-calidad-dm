# Sprint 302 — Runtime Activation Failure & Completion Boundary Forensic Audit

Rama: `release/stable-sprint79`
Modo: AUDIT ONLY · LEVEL 5 · FORENSIC RUNTIME VALIDATION — SIN cambios funcionales
Fecha: 2026-08-12
Tipo: Auditoría ejecutable con clasificación forense única al final
Dependencias: Sprints 257 · 280 · 284 · 289 · 290 · 291 · 292 · 294 · 295 · 296 · 297 · 298 · 299 · 300 · 301
Suite: `node scripts/sprint-302-runtime-activation-completion-boundary-audit.mjs`

## Objetivo

Determinar con evidencia ejecutable si el error observado en navegador:

```
RuntimePersistenceProviderCompositionRoot.ts:55
ReferenceError: require is not defined
```

interrumpe el flujo real de completion de las alertas o si constituye un fallo
paralelo que NO afecta al `COMPLETION_INTENT`.

## Resultado

**TOTAL: 75/76 PASS** · `process.exit(0)` · sin correcciones aplicadas.

El único FAIL es la **discrepancia registrada en F17** (spec §19): el script de
sweep `sprint-298-calendar-recurrence.mjs` NO existe con ese nombre — se registra
la discrepancia y NO se inventa un reemplazo silencioso (`SWEEP_DISCREPANCY`).
Discrepancia ≠ defecto de frontera: el exit code distingue ambos casos.

## Clasificación forense final

```
SPRINT 302 — FINAL FORENSIC CLASSIFICATION
  RuntimeActivation:                FAILURE (bug real)
  RuntimePersistenceProviderCompositionRoot: FAILURE (require CJS → ReferenceError)
  DynamicForm completion boundary:  PASS
  ModuleDocumentViewer completion:  PASS
  EventBus:                         PASS
  CompletionBridge:                 PASS
  OccurrenceLedger:                 PASS
  Persistence:                      PASS
  Projection:                       PASS
  Reactivity:                       PASS
  Presentation:                     PASS

  ROOT CAUSE: RUNTIME_ACTIVATION_FAILURE (+ COMPLETION PIPELINE HEALTHY) — Resultado A

  RECOMMENDED NEXT SPRINT: Sprint 303 — conversión mínima require→import en
      RuntimePersistenceProviderCompositionRoot.ts (causa técnica confirmada por F16)
```

**Respuesta a las 8 preguntas del criterio de salida (§23):**

| # | Pregunta | Verdict |
|---|---|---|
| 1 | ¿Existe el `require is not defined`? | **YES** — reproducido `ReferenceError: require is not defined` ejecutando las 4 líneas reales del constructor en contexto ESM/browser (F01 AC-04). |
| 2 | ¿Interrumpe a DynamicForm? | **NO** — `activate()` captura el init, logea y **retorna** `{success:false}` (NO lanza). El emisor sigue y publica (F03/F04/F05). |
| 3 | ¿Interrumpe a ModuleDocumentViewer? | **NO** — el viewer NO llama al runtime; su path es aislado (F06). |
| 4 | ¿`COMPLETION_INTENT` se publica tras la operación SaaS? | FORM: **YES** · REPOSITORY: **YES** · CATEGORY: **YES** (F03–F06, F13). |
| 5 | ¿El Bridge recibe el evento? | **YES** — ledger=1, handler único, identidad conservada (F07/F08). |
| 6 | ¿El Ledger registra el hecho? | **YES** — tamaño 1, clave `occurrence::<alertId>::<occurrenceId>` (F09). |
| 7 | ¿La proyección pasa a `hasOpen=false` en la misma sesión? | **YES** — F11, tras el intent (sin refresh). |
| 8 | ¿La UI recibe el nuevo estado? | **YES** — F12 (completionTick→memo invalidado→presentador consume) y F13 (`presentación oculta = null`). |

## Matriz de resultados por fase

| Fase | Verificación | Resultado | Evidencia |
|---|---|---|---|
| F01 | Composition Root: imports ES **+** EXACTAMENTE 4 `require()` CJS (línea 55 = APPM; 59 analytics; 65 decision; 69 PersistenceExecutionRouter) | PASS | requireCount=4; linea=55 |
| F01 | AC-03: el `require()` viaja al browser en dev/sourcemaps; el bundle dist lo neutraliza por build | PASS | source contiene require; dist count=0 |
| F01 | AC-04: instanciación mínima en contexto ESM → `ReferenceError: require is not defined` sobre las 4 líneas REALES | PASS | repro ejecutable |
| F02 | `initialize()` re-lanza; `activate()` captura y RETORNA `{success:false}` (NO lanza) | PASS | «Preserving SaaS transaction» |
| F02 | Traza: activate:start → initialize:start → bootstrap:create → compositionRoot:create → ERROR → initialize:catch → activate:fallback → activate:end | PASS | flujo NO se detiene |
| F03 | DynamicForm: submitFormResponse → activate → publish (orden real; publish fuera del catch) | PASS | |
| F04 | AC-06/07: éxito SaaS + runtime con defecto → EXACTAMENTE 1 intent (ledger=1) · AC-08: submit fallido → 0 intents | PASS | ledger=1 / emitted=0 |
| F05 | AC-09 — CASO A: tx=SUCCESS, runtime=FAILURE, completion=YES → `RUNTIME_ACTIVATION_FAILURE + NO_COMPLETION_FAILURE` | PASS | tx/rtErr/rtCatch/comp |
| F06 | Viewer aislado del runtime; upload OK → 1 intent (AC-10/12); upload fallido → 0 intents (AC-11) | PASS | size=0 tras fallo |
| F07 | AC-13/14/15: evento llega al bridge; UN handler efectivo (2 emisiones→1 hecho); identidad conservada | PASS | origin/resourceKind/resourceId/moduleId |
| F08 | AC-16/17/18: bridge recibe; origin='resource' resuelve; AT MOST ONE | PASS | 12:alert:0:occ:1 |
| F09 | AC-19/20/21: 1 hecho; clave `occurrence::…`; UN solo ledger | PASS | key de 3 segmentos |
| F10 | AC-22/23/24: writeSignal; port caído NO rompe el negocio; rehidratación mantiene el hecho | PASS | signals=1; replayed=1 |
| F11 | AC-25/26/27: hasOpen true→false en la misma sesión; siguiente ventana re-deriva N+1 | PASS | N=false N+1=true |
| F12 | AC-28..31: completionTick→memo invalidado→nueva referencia→presentador consume; sin workaround visual | PASS | referencia cambiada |
| F13 | FORM / REPOSITORY / CATEGORY heredada: completion → hasOpen=false → presentación oculta | PASS | status=completed |
| F14 | DIARIO / SEMANAL / MENSUAL / ANUAL: N=completed → N+1=open; schedule N+1 derivado | PASS | 4/4 |
| F15 | Resultado A (runtime bug real + pipeline sano); B y C descartados | PASS | |
| F16 | AC-35..37: los 4 targets tienen export ES; require INNECESARIO; conversión a import SIN circular dependency | PASS | sin ciclo |
| F17 | Sweep de familia: 296 (42/42), 297 (38/38), 299 (80/80), 300 (65/65), 301 (53/53) | PASS | |
| F17 | `sprint-298-calendar-recurrence.mjs` NO existe → **discrepancia registrada** (no se inventa reemplazo) | FAIL (registrada) | SWEEP_DISCREPANCY |

## Traza de flujo (F02/F03/F05)

La traza se mantiene **solo en memoria**. El nodo donde el flujo NO se detiene:

```
SaaS transaction (SUCCESS)
      ↓
RuntimeActivationLayer.activate()
      ├── initialize() → new RuntimePersistenceBootstrap() → new CompositionRoot()
      │        └── require(...) → ReferenceError: require is not defined
      ├── initialize:catch → re-lanza
      ├── activate:catch → logea "Preserving SaaS transaction" → RETORNA {success:false}
      ↓   (NO lanza → el emisor CONTINÚA)
DynamicForm: OperationalEventBus.publish(COMPLETION_INTENT_EVENT, …)  ← SE ALCANZA
      ↓
CompletionBridge → DeterministicCompletionResolver → OccurrenceLedger
      ↓
Projection → completionTick → useAlertRuntime → presentación (alerta oculta)
```

## Causa técnica del error de runtime (F16)

`RuntimePersistenceProviderCompositionRoot.ts` mezcla imports ES con 4
`require()` CommonJS en su constructor (L55/59/65/69). En el navegador (ESM real)
`require` no existe → ReferenceError. La conversión a `import` es:

- **segura** (AC-35): los 4 targets ya exportan clases/named exports ES;
- **innecesario hoy** (AC-36): carga estática, no dinámica;
- **sin ciclo** (AC-37): analytics/decision/runtime NO importan CompositionRoot.
- El dist actual ya lo neutraliza por build (require count=0), por eso la falla
  se manifiesta en dev/serve ESM — pero en cualquier caso NO toca la frontera de
  completion.

## Scope respetado / STOP list

- **CERO** cambios en `src/`. Ningún archivo funcional fue modificado.
- No se convirtió `require()` a `import` (pertenece a Sprint 303).
- No se tocó `RuntimeActivationLayer`, `RuntimePersistenceBootstrap`,
  `RuntimePersistenceProviderCompositionRoot`, `DynamicForm`,
  `ModuleDocumentViewer`, `CompletionBridge`, `OccurrenceLedger`,
  `useAlertRuntime`, `OccurrenceProjection`, `OccurrenceSchedule` ni
  `UnifiedAlertResourcePresentation`.
- No se crearon schedulers, ledgers, estado React paralelo, `display:none`,
  `justUploaded`, `completedLocal` ni segunda fuente de verdad.
- `scripts/sprint-302-runtime-activation-completion-boundary-audit.mjs` y este
  documento son los únicos artefactos nuevos.

## Declaración

**Sprint 302 — CERTIFIED.** Respuesta inequívoca a la pregunta forense principal:

> ¿RuntimeActivationLayer puede fallar por `require is not defined` y, aun así,
> el flujo de completion continúa hasta publicar y procesar `COMPLETION_INTENT`?

**SÍ.** El Runtime tiene un bug real e independiente (Resultado A), pero NO
bloquea completion: `activate()` contiene el fallo retornando `{success:false}`
sin lanzar; el emisor publica `COMPLETION_INTENT` en la misma sesión; la cadena
Bridge→Resolver→Ledger→Persistence→Projection→Reactivity→Presentation queda
certificada sana en este mismo run. La alerta persistente NO se explica por este
error.

**Próximo: Sprint 303** — conversión mínima `require→import` en
`RuntimePersistenceProviderCompositionRoot.ts` (corrección técnica autorizada por
la evidencia F16; fuera de alcance de 302).