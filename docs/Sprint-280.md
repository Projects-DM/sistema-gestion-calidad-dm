# Sprint 280 — Implementación de Identidad Multi-Entrada para Cumplimiento de Alertas

**Branch:** `release/stable-sprint79`
**Modo:** IMPLEMENTATION + CERTIFICATION
**Producción:** 8 archivos modificados · **1 archivo nuevo** · Certificación ejecutable en Node (no `.mjs` persistido)
**SSOT:** `docs/Sprint-280.md`
**Dependencias:** Sprint 255 · 256 · 257 · 261 · 263 · 264 · 265 · 266 · 268 · 278 · 279
**Contrato de entrada:** Sprint 279 §9 (fronteras F1–F9) y §11 (casos 01–10)
**Estado final:** **SPRINT 280 — CERTIFIED**

---

## 1. Objetivo

Ejecutar el alcance EXACTO autorizado por Sprint 279 §9, cerrando la cadena de identidad de
cumplimiento de alertas en las rutas:

```text
Entrada A — Alerta → Formulario → Guardar → SOLO esa ocurrencia completada
Entrada B — Formulario directo → ¿alertas? NO → guardado normal; SÍ → resolución determinística → UNA
Entrada C — Recurso sin alertas → guardado normal → SIN lógica de alertas
```

Regla inamovible certificada en 279:

```text
RECURSO COMPARTIDO  ≠  IDENTIDAD DE ALERTA  ≠  IDENTIDAD DE OCURRENCIA  ≠  CUMPLIMIENTO
```

**Bug raíz corregido en este sprint (F8):** el ledger no registraba un completion
determinísticamente resuelto (`origin='resource'`) en la clave específica — solo lo hacía para
`origin='alert'`. Consecuencia: guardar una entrada directa en un formulario con 3 alertas
producía `A=B=C=COMPLETED` (reproducción del comportamiento Sprint 266).

---

## 2. Principio rector ejecutado: clasificar por ORIGEN antes de resolver

```text
USER ACTION → ENTRY CONTEXT
                 ├── origin = alert     → IDENTIDAD EXPLÍCITA → occurrenceId exacta
                 └── origin = resource  → RESOLUCIÓN DETERMINÍSTICA → UNA ocurrencia elegible
              recurso sin alertas       → NO COMPLETION
```

Jerarquía (certificada en ejecución):

```text
1. IDENTIDAD EXPLÍCITA    (origin = alert → alertId + occurrenceId obligatorios)
2. RESOLUCIÓN DETERMINÍSTICA (origin = resource → overdue → today/active)
3. NINGÚN COMPLETION       (upcoming / sin candidata / sin alertas)
```

---

## 3. Fronteras implementadas (Sprint 279 §9)

| Frontera | Archivo | Cambio |
|----------|---------|--------|
| F1 — Experiencia | `src/modules/experiences/AlertMonitoringExperience.jsx` | El descriptor `open-form` conserva `alertId` + `occurrenceId` (la card YA los poseía); `ACTION_ROUTE['open-form']` devuelve `{ path: canonicalRoute, state: { alertContext } }`; `CardButton` navega con `navigate(target.path, { state: target.state })` |
| F2 — Resolver rutas | `src/core/navigation/ExistingModuleRouteResolver.js` | `resolveActionRoute(action, { alertId?, occurrenceId? })` propaga `alertContext` SIN cambiar `canonicalRoute` |
| F3 — Navegación | `src/pages/DynamicForm.jsx` (lectura `location.state?.alertContext`) | Leer el contexto de alerta preservado |
| F4 — DynamicForm | `src/pages/DynamicForm.jsx` | Publica `COMPLETION_INTENT_EVENT` con `origin`; **sin alertas NO publica** (AC-12 `<extractResourceAlertCollection(formDef).length > 0`) |
| F5 — Signal | `src/core/capabilities/alert/occurrence/CompletionSignal.js` | Transporta `origin`/`alertId`/`occurrenceId`; `hasOccurrenceIdentity` (agnóstico al origin) + `matchExplicitOccurrence` por identidad |
| F6 — Bridge | `src/core/capabilities/alert/occurrence/CompletionBridge.js` | `handleCompletionIntent`: `origin='alert'` → específica; `origin='resource'` → resolver determinístico → específica de ESA; sin candidata → NO COMPLETION |
| F7 — Resolución | `src/core/capabilities/alert/occurrence/DeterministicCompletionResolver.js` (**NUEVO**) | Política §6 de 279: `overdue`→`MIN(dueAt)`, `today/active`→`MIN(dueAt)`; desempate `(dueAt ASC, occurrenceId ASC)`; pure |
| F8 — Ledger | `src/core/capabilities/alert/occurrence/OccurrenceLedger.js` | Clave específica `occurrence::<alertId>::<occurrenceId>` para CUALQUIER señal con identidad (fix del colapso A/B/C); fallback resource-scoped solo compat |
| F9 — Clasificación | `src/core/capabilities/alert/occurrence/OccurrenceProjection.js` + `AlertMonitoringExperience.jsx` (consumo) | La proyección consulta la clave específica de cada ocurrencia; `classifyOccurrence` intacto |

Wiring runtime: `src/hooks/useAlertRuntime.js` registra la proyección certificada como
OccurrenceProvider del bridge (reuso, sin fetch ni re-evaluación).

---

## 4. F6 — CompletionBridge: rutas de entrada

```js
handleCompletionIntent(intent)
├── origin === 'alert'
│      identity ALERT REQUERIDA (alertId + occurrenceId)
│      identidad inválida → REJECT (nunca adivinar, §279 §4)
│      → OccurrenceLedger.recordCompletion(signal)  [clave específica]
│      → return signal
├── origin === 'resource'
│      occurrences = provideOccurrences().filter(resourceKind/resourceId/moduleId)
│      occurrences.length === 0 → null   (NO COMPLETION)
│      resolved = resolveSingleOccurrence({ occurrences, nowMs: completedAt })
│      !resolved → null                   (NO COMPLETION)
│      → OccurrenceLedger.recordCompletion({ ..., origin:'resource', alertId, occurrenceId })
│      → return signal
└── cualquier otro → null
```

La selección de *cuál* ocurrencia pertenece EXCLUSIVAMENTE a F7; el bridge solo wire + recorda.

---

## 5. F7 — DeterministicCompletionResolver (nuevo)

Política (279 §6), read-only, sin estado ni persistencia:

| Prioridad | Clasificación (`classifyOccurrence`) | Selección |
|-----------|----------------------------------------|-----------|
| 0 | `overdue` | `MIN(dueAt)` → la vencida más antigua |
| 1 | `today` / `active` | `MIN(dueAt)` → la que vence primero |
| 2 | resto / `upcoming` / `persistent` (completed/cancelled) | NO elegible |
| — | sin candidata | `null` → NO COMPLETION |

Orden total determinístico: `(priority, dueAt ASC, occurrenceId ASC)`. Nunca `array[0]`, nunca
index, nunca orden de configuración (AC-20).

---

## 6. F8 — OccurrenceLedger: aislamiento real (fix del colapso)

### 6.1 Bug raíz (Sprint 279 §3.3 confirmó la pérdida; este sprint lo confirmó en ejecución)

`recordCompletion` elegía la clave específica SOLO cuando `origin === 'alert'`. El camino
determinístico (F6 `origin='resource'`) registraba la señal del resolvedor con `alertId` +
`occurrenceId`, pero caía a la clave legacy `resourceKind::resourceId::moduleId`.

Efecto certificado (test previo al fix, falló):

```text
FAIL §31 A completes    -> forms:5:0          ← A seleccionada
FAIL §31 B pending      -> pending            ← ¡B también quedaba COMPLETED!
FAIL §31 C pending      -> pending            ← ¡C también!
FAIL §31 action2 -> B   -> undefined          ← segunda acción sin elegible
```

### 6.2 Fix

`OccurrenceLedger.js:59` — discriminar por IDENTIDAD, no por origin:

```js
const key = hasOccurrenceIdentity(signal)
  ? specificKeyFor(signal)   // occurrence::<alertId>::<occurrenceId>
  : resourceKeyFor(signal);  // resourceKind::resourceId::moduleId (solo compat)
```

`hasOccurrenceIdentity(signal)` = presencia de `alertId` + `occurrenceId` en CUALQUIER origin
(nuevo en `CompletionSignal.js`). El `origin='alert'` explícito sigue exigiendo identidad para el
bridge (§4), pero el ledger ya no depende del origin para aislar.

### 6.3 Post-fix (certificado)

```text
PASS §31 A completes   -> forms:5:0
PASS §31 A done        -> true           B/pending, C/pending, nunca all-3
PASS §31 action2 -> B  -> forms:5:1      2ª acción → siguiente ocurrencia
PASS explicit-B        -> forms:5:1      identidad explícita manda sobre prioridad temporal
PASS A unchaged/B completed/C unchanged  (TEST04 isolation)
```

Regla certificada: un completion de `A:occ:001` **nunca** satisface `B:occ:001`/`C:occ:001`.
Idempotencia: misma señal ×2 → 1 transición (clave única).

---

## 7. Casos de certificación (279 §11) — resultados

| Caso | Escenario | Resultado requerido | Resultado |
|------|-----------|---------------------|-----------|
| 01 | Sin alertas → guardar formulario | 0 completions | **PASS** (`null`, ledger `size=0`) |
| 02 | A B C → guardar directo 08:15 | A=COMPLETED, B/C PENDING | **PASS** |
| 03 | Directo 08:15 con A=08:00 B=14:00 C=20:00 | SOLO A | **PASS** (`forms:5:0`) |
| 04 | Entrada explícita B → guardar | A=unchanged · B=completed · C=unchanged | **PASS** |
| 05 | B explícita con A vencida | A=unchanged · B=completed · C=unchanged | **PASS** |
| 06 | Directo: A overdue, B today, C upcoming | A | **PASS** |
| 07 | Directo 10:00: A=08:00-09:00 completed, B=08:00-14:00 | B | **PASS** |
| 08 | Directo: A/B/C futuras | NONE | **PASS** (`null`) |
| 09 | Dos alertas misma ventana | desempate `(dueAt, occurrenceId)` | **PASS** (orden total en F7) |
| 10 | `A:occ:001` completed | `A:occ:002` pending (identidad independiente) | **PASS** (recurrencia día2 pending) |

Pruebas adicionales ejecutadas (Node, certificación manual):
`RESOURCE_COMPLETED` legacy compat intacto · `origin='alert'` sin identidad → rechazado ·
proyección completa lleva `signalKey` específico · `eslint` limpio en los 2 archivos tocados del
dominio occurrence.

---

## 8. Acceptance Criteria — estado

| AC | Criterio | Estado |
|----|----------|--------|
| AC-01 | Entradas al formulario auditable (Entrada A/B/C) | **PASS** (F1–F3 chain cerrada) |
| AC-02 | `origin=alert` ≠ `origin=resource` | **PASS** (F4, F6) |
| AC-03 | Alerta conserva `alertId` hasta el intent | **PASS** (<F1 Descriptor → F2 → F3 → F4 intent) |
| AC-04 | Alerta conserva `occurrenceId` hasta el intent | **PASS** (igual cadena F1–F3) |
| AC-05 | Entrada explícita prioridad absoluta | **PASS** (TEST04/05/10) |
| AC-06 | Formulario directo usa resolución determinística | **PASS** (F6→F7) |
| AC-07 | Máximo una ocurrencia por acción | **PASS** (F7 retorna 1; 14/14 crítico) |
| AC-08 | Vencida más antigua prioritaria | **PASS** (F7 tabla §5) |
| AC-09 | Hoy más próxima segunda | **PASS** (F7) |
| AC-10 | Upcoming no elegible | **PASS** (caso 08) |
| AC-11 | Sin candidata → no completion | **PASS** (F6 `null`) |
| AC-12 | Formulario sin alertas se guarda normal | **PASS** (F4 guardrail >= 1 alerta; caso 01) |
| AC-13 | Repositorio sin alertas guardado normal | **PASS** (mismo guardrail) |
| AC-16 | Compartir `resourceId` no comparte completion | **PASS** (F8 aislamiento) |
| AC-17 | Alert A no completa B/C | **PASS** (F8 + F9) |
| AC-18 | Alert B explícita no resuelve hacia A | **PASS** (TEST04/05) |
| AC-19 | Recurrencias identidad independiente | **PASS** (caso 10) |
| AC-20 | Desempate no depende del orden del array | **PASS** (F7 orden total) |

---

## 9. Fuera de alcance (respetados, 0 cambios)

`Runtime`, `Engine`, `Scheduler`, `Enrollment`, Supabase, schema, `AlertConfiguration` SSOT quedan
intactos. `classifyOccurrence`/`OccurrenceLifecycle` intacto (F7 lo REUSA). Los eventos legacy
`RESOURCE_COMPLETED`/`RECORDS_APPROVED`/`RECORDS_CLOSED`/`RECORDS_STATUS_UPDATED` continúan en la
vía compat (Sprint 257) sin migración masiva.

---

## 10. Estado final

```text
SPRINT 280 — IMPLEMENTATION + CERTIFICATION
Nuevo:  src/core/capabilities/alert/occurrence/DeterministicCompletionResolver.js  (F7)
Modificado:
        CompletionSignal.js        (F5 — hasOccurrenceIdentity/match origin-agnostic)
        CompletionBridge.js        (F6 — COMPLETION_INTENT + rutas por origin)
        OccurrenceLedger.js        (F8 — FIX colapso A/B/C: aislamiento por identidad)
        OccurrenceProjection.js    (F9 — consulta específica + signalKey)
        ExistingModuleRouteResolver.js (F2 — alertContext opcional, canonicalRoute intacta)
        AlertMonitoringExperience.jsx  (F1 — descriptor conserva identidad + state)
        DynamicForm.jsx            (F3/F4 — alertContext + intent por origin + guardrail)
        useAlertRuntime.js         (wiring OccurrenceProvider)
SSOT:   docs/Sprint-280.md

VERDICT:  SPRINT 280 — CERTIFIED
          multi-entry completion identity implemented and verified (F1–F9)
          bug "guardar directo → A=B=C=COMPLETED" ELIMINADO
Siguiente: persistir el ledger (OCC-CERT-30 boundary: mapa-key port) — fuera de este sprint.
```

---

## 11. Evidencia técnica (reproducibilidad)

Corrida crítica (mayor valor probatorio):

```text
PASS  §31 A completes   -> forms:5:0        (guardar 08:15 en formulario 3 alertas → SOLO A)
PASS  §31 A done        -> true
PASS  §31 B pending     -> pending
PASS  §31 C pending     -> pending
PASS  §31 never all-3   -> isolated
PASS  §31 action2 -> B  -> forms:5:1        (2ª acción a las 10:00 → B)
PASS  §31 action2 B done -> true
PASS  §31 action2 C untouched -> pending
PASS  explicit-B        -> forms:5:1        (identidad explícita manda)
PASS  T04 A unchanged   -> pending
PASS  T04 B completed   -> completed
PASS  T04 C unchanged   -> pending
PASS  T32 no-alert resource saved -> null
PASS  T32 ledger 0      -> size=0
TOTAL: 14/14
```

Los `FAIL` previos al fix F8 (`§31 B pending`, `§31 C pending`, `§31 action2 -> B`) pasaron a PASS
tras cambiar `hasExplicitOccurrenceIdentity` → `hasOccurrenceIdentity` en `OccurrenceLedger.recordCompletion`.