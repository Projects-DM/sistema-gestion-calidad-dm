# Sprint 305 — Dynamic Form Module Identity Alignment (Controlled Functional Correction)

Rama: `release/stable-sprint79`
Modo: CONTROLLED FUNCTIONAL CORRECTION · LEVEL 5 · MINIMAL CHANGE · SINGLE BOUNDARY
Fecha: 2026-08-12
Tipo: Corrección funcional controlada + validación ejecutable
Dependencias: Sprints 303 (runtime ESM) · 304 (auditoría forense — causa aislada)
Suite: `node scripts/sprint-305-dynamicform-module-identity-alignment.mjs`

## Problema certificado (Sprint 304)

```
DynamicForm
   ├── moduleId publicado → moduleSlug ("operaciones")        [STRING]
   └── useAlertRuntime provider moduleId → formDef.module_id  [NUMÉRICO 3]
                          ↓
                CompletionBridge filtra
              String(occ.moduleId) === String(intent.moduleId)
                          ↓
                    '3' !== 'operaciones'
                          ↓
                    NO MATCH → Ledger = 0
                          ↓
                    hasOpen = true
                          ↓
              ALERTA PERMANECE ABIERTA (origin='resource')
```

La frontera causal era EXCLUSIVAMENTE la identidad de `moduleId` del intent de
DynamicForm frente a la identidad que su propio provider de proyección usa. No
era un fallo del Ledger, del Bridge (como arquitectura), de la proyección, del
tick, de React, de la presentación, del runtime activation, de la persistencia
ni de la recurrencia.

## Corrección aplicada (único cambio funcional)

`src/pages/DynamicForm.jsx` — el productor ahora **reutiliza la misma identidad
canónica que ya consume el provider del runtime del formulario**, en ambas ramas
(`origin='alert'` y `origin='resource'`):

```js
// antes (defecto): moduleId: moduleSlug,
// después (305):    moduleId: formDef?.module_id ?? moduleSlug,
```

La regla cumplida (Sprint 305 §4): NO se duplicó ni inventó una identidad — se
reutilizó la identidad `formDef.module_id` que el propio `useAlertRuntime` del
formulario ya usa como `base.moduleId`. El fallback `?? moduleSlug` conserva el
comportamiento cuando `module_id` no esté disponible (identidad STRING, igual que
el caso repositorio certificado).

## Resultado

**TOTAL: 35/35 PASS** · `process.exit(0)` · Build `✓ built in 2.54s`.

### F02 — Validación forense especial (spec §8)

```
ANTES (Sprint 304):  provider.moduleId=3 · intent.moduleId='operaciones' · MATCH=false → Ledger=0 → hasOpen=true
DESPUÉS (Sprint 305): provider.moduleId=3 · intent.moduleId=3            · MATCH=true  → Ledger=1 → hasOpen=false
```

El identificador canónico resultante es el **numérico** (`form.module_id`): es el
que el contrato del runtime del formulario ya establecía (el provider registra
`formDef?.module_id`), por lo que la corrección lo reutiliza tal cual.

## Matriz de resultados (Regression Matrix)

| Fase | Verificación | Resultado |
|---|---|---|
| F01 | intent origin=resource usa `moduleId: formDef?.module_id ?? moduleSlug` | PASS |
| F01 | intent origin=alert usa la MISMA identidad canónica | PASS |
| F01 | hook provider mantiene `moduleId: formDef?.module_id` (invariante intacto) | PASS |
| F01 | el intent NUNCA usa moduleSlug puro como moduleId (defecto eliminado) | PASS |
| F01 | publish SOLO tras submitFormResponse + hasAlerts (guardrail) | PASS |
| F01 | sin hacks visuales (display:none / reload / forceUpdate / completedLocal) | PASS |
| F02 | **provider.moduleId === intent.moduleId** (FORM directo) | PASS `3 vs 3` |
| F02 | FORM directo → **Ledger=1** · hasOpen TRUE→FALSE | PASS `before=true after=false` |
| F02 | UI consume solo la proyección (present), no hack visual | PASS |
| F03 | FORM vía alert-card → Ledger=1 · hasOpen TRUE→FALSE | PASS |
| F04 | REPOSITORY directo → Ledger=1 · hasOpen TRUE→FALSE | PASS |
| F04 | CATEGORÍA heredada → own occurrence, Ledger=1 · hasOpen TRUE→FALSE | PASS |
| F05 | Submit fallido → 0 completion · Upload fallido → 0 completion | PASS |
| F05 | Recurso sin ocurrencia → Ledger=0 (0 completion) | PASS |
| F06 | Completion duplicado → EXACTAMENTE 1 hecho por ventana | PASS |
| F07 | Recurrencia diaria/semanal/mensual/anual → N cerrada, N+1 re-derivada | PASS |
| F08 | CompositionRoot require()=0 · sin dynamic import · instancia ESM real | PASS |
| F09 | Build `npm run build` → ✓ built in 2.54s | PASS |
| F10 | Único src/ modificado = `src/pages/DynamicForm.jsx` (modification guard) | PASS |
| F11 | Familia: 296 exit=0 · 297 exit=0 · 299 80/80 · 300 65/65 · 301 53/53 · 302 semántica · 303 53/53 · 304 semántica | PASS 8/8 |

### Familia — tratamiento semántico

- **302** (auditoría histórica del defecto require, ya corregido en 303): se
  evalúa por defectos de frontera de completion (`F03..F14`) excluyendo la
  familia del defecto (`require|AC-|SWEEP|F16`) + clasificación
  `NO_ACTIVE_FAILURE`. ✓
- **304** (auditoría forense del defecto moduleId, ahora corregido): se evalúa
  por defectos de frontera excluyendo las filas de documentación del defecto
  (`[FORENSE]`/`[FORM]`/SLUG) + clasificación `EVENT_BRIDGE_FAILURE`. ✓
- **299/300** F01: sus aserciones verificaban literalmente `moduleId: moduleSlug`
  (contrato pre-corrección). Se actualizaron a aceptar la identidad canónica
  (`moduleId: formDef?.module_id ?? moduleSlug`) — mismo significado ("el intent
  lleva resourceKind/resourceId/moduleId"), sin alterar ninguna otra verificación.

## Clasificación final

```
SPRINT 305 — FINAL CLASSIFICATION

  FORM DIRECT COMPLETION:       PASS
  MODULE IDENTITY:              ALIGNED (form.module_id reutilizado)
  COMPLETION BRIDGE:            PASS
  OCCURRENCE LEDGER:            PASS
  PROJECTION:                   PASS
  REACTIVITY:                   PASS (completionTick intacto)
  PRESENTATION:                 PASS
  REPOSITORY REGRESSION:        PASS
  RUNTIME REGRESSION:           PASS
  BUILD:                        PASS

  ROOT CAUSE:                   CORRECTED
  BEHAVIORAL SCOPE:             MINIMAL (1 archivo funcional)
  ARCHITECTURAL CHANGE:         NONE
  NEW STATE:                    NONE
  NEW PIPELINE:                 NONE

  STATUS: CERTIFIED
```

## Scope respetado / STOP list

- Único archivo funcional modificado: `src/pages/DynamicForm.jsx` (2 líneas:
  `moduleId` en ambas ramas del intent).
- **NO** modificados: `CompletionBridge`, `OccurrenceLedger`,
  `OccurrenceProjection`, `useAlertRuntime`, `OperationalEventBus`,
  `RuntimeActivationLayer`, `RuntimePersistenceProviderCompositionRoot`,
  `ModuleDocumentViewer`, modelo de alertas, persistencia, recurrencia,
  scheduler.
- **NO** agregados: segunda fuente de verdad, estado local de completion, nuevo
  scheduler, nuevo persistence path, cambio de contrato del Ledger, cambio de
  recurrencia, cambio de presentación, `setTimeout` de completion,
  `display:none`, `window.location.reload()`, `forceUpdate()`.
- Los scripts 299/300 F01 (aserciones de identidad del intent) se actualizaron a
  la identidad canónica; nada más cambió en los scripts de familia.

## Declaración

**Sprint 305 — CERTIFIED.** La identidad de `moduleId` del `COMPLETION_INTENT` de
DynamicForm quedó alineada con la identidad canónica que consume su propio
provider de proyección (`formDef.module_id`, numérico). Con la identidad
resuelta, el `CompletionBridge` registra el hecho (`Ledger=1`), la proyección
pasa a `hasOpen=false` en la misma sesión y la alerta desaparece — para la
entrada directa al formulario (`origin='resource'`) y sin tocar ninguna otra
capa. Las regresiones 296–304 permanecen verdes y el build finaliza correctamente.

**Próximo (fuera de alcance 305):** nada funcional pendiente detectado; el
siguiente sprint certificaría la reconciliación visual en el workspace real si
hubiera un síntoma residual no explicado por esta frontera.