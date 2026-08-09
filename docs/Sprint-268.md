# Sprint 268 — Auditoría, Diseño y Resolución Determinística de Cumplimiento de Alertas

**Branch:** `release/stable-sprint79`
**Modo:** AUDIT + ARCHITECTURAL DESIGN + DECISION · **0 cambios en `src/` · 0 `.mjs` nuevos**
**SSOT:** este documento (`docs/Sprint-268.md`)
**Dependencias:** Spr 260 · 261 · 262 · 263 · 264 · 265 · 266 (certificados) · 267 (isolación, en revisión)

Gas de cierre: **SPRINT 268 — READY FOR EXECUTION** · Código: **0 cambios** · `.mjs`: **0** · Producción: **0 cambios**

---

## 1. Decisión central (SSOT)

> El formulario, registro o repositorio **puede ser compartido** entre muchas alertas.
> El **cumplimiento nunca se comparte automáticamente**.

**La unidad real y única de cumplimiento es la OCURRENCIA**, con identidad derivada de
`alertId + occurrenceId`. `resourceId` y `moduleId` identifican *sobre qué objeto se trabaja*;
`alertId`/`occurrenceId` identifican *qué obligación operacional se satisface*. La primera es un
recurso; la segunda es una intención de cumplimiento. Son planos distintos y **no deben fusionarse**.

---

## 2. Contexto certificado (Sprints 260–267)

El pipeline completo (config → runtime → card → navegación → DynamicForm → signal → bridge →
ledger → matching → clasificación) quedó auditado en Sprint 266 con fixture **22/22 PASS**:

- Configuración y runtime ya transportan identidad por alerta (`alertId = resource:alert:i`;
  `occurrenceId = alertId:occ:seq`), pero la **NAVEGACIÓN** (`open-form`) transporta **solo
  `resourceId`** — primera pérdida (Sprint 266, STEP 4).
- El publisher de `DynamicForm`, la señal genérica, el bridge y el ledger son **resource-scoped**
  (`resourceKind::resourceId::moduleId`, sin dimensión de alerta). Una sola señal a las 21:30
  marca **A/B/C = completed** simultáneamente (colapso final: Ledger+Matching).

**Conclusión observable:** hoy *guardar un formulario* produce `A=completed, B=completed,
C=completed` (introido). El comportamiento funcional requerido es `máximo una ocurrencia`.

---

## 3. Principio rector: RESOURCE ≠ COMPLETION IDENTITY

| Concepto | Representa | Ejemplos | ¿Identifica cumplimiento? |
|---|---|---|---|
| **Recurso** | sobre qué objeto se trabaja | `resourceId`, `resourceKind`, `moduleId`, `formId`, `repositoryId` | **No** |
| **Alerta** | qué obligación operacional | `alertId`, `periodicity`, `anchor`, `window`, `priority`, `setConfig` | Sí (nivel alerta) |
| **Ocurrencia** | qué instancia temporal de la obligación | `occurrenceKey`, `sequence`, `startsAt`, `dueAt`, `status` | **SÍ — UNIT de cumplimiento** |

Regla certificable (AC-02, AC-11): dos o más alertas pueden compartir **`resourceId`, `moduleId`,
`formId`, `repositoryId`** **sin compartir jamás** `alertId`, `occurrenceKey`, `completionState` ni
`completedAt` cuando esos campos representan la identidad de cumplimiento.

---

## 4. Dos tipos de intención

El sistema distingue dos escenarios de origen de la acción.

### 4.1 Cumplimiento con identidad explícita («origin = alert»)

El usuario entra desde **Experiencias Op. → Alertas → Alerta B → Ir al formulario**. La acción
tiene contexto de alerta. Conceptual:

```
CompletionIntent
├── resourceId
├── alertId
├── occurrenceKey     ← resolverá como identidad objetivo
└── completedAt
```

Regla (AC-04): la **identidad explícita tiene prioridad absoluta** sobre cualquier resolución
temporal. `B → guardar → SOLO B = completed` (A y C permanecen en su estado original).

### 4.2 Cumplimiento sin identidad explícita («origin = resource»)

El usuario entra **directamente al formulario** (sin pasar por una tarjeta de alerta). No hay
`alertId`. El sistema resuelve el candidato con una política determinística (§6). Este mecanismo
se denomina **Deterministic Completion Resolution**.

---

## 5. Regla de prioridad de contexto (columna vertebral)

```
SI existe contexto explícito de alerta
    → completar ESA ocurrencia (única)
SI NO existe contexto explícito
    → resolver ÚNICA candidata por política determinística
SI no hay candidata elegible
    → NO completar ninguna
```

Orden absoluto: **IDENTIDAD EXPLÍCITA > RESOLUCIÓN TEMPORAL > NINGUNA.**

Esto blinda el caso crítico (§7): un usuario que entró por la tarjeta de **B** jamás ve a **A**
(vendida) marcada por la acción aunque A esté disparada temporalmente.

---

## 6. Política de resolución determinística (sin contexto)

Regla de selección (AC-05/06/07), evaluada sobre las ocurrencias **elegibles** del recurso:

| Prioridad | Estado clasificado | Criterio de selección |
|---|---|---|
| **1** | `overdue` (vencida) | la de **`dueAt` ascendente** — la vencida **más antigua** |
| **2** | `today`/`active` dentro de la ventana actual | **`dueAt` ascendente** — la más próxima a vencer |
| **3** | `upcoming` (futura) | **NO elegible** salvo autorización explícita futura |

Si `overdue == 0` y `today == 0` (o no existen candidatas elegibles): **no se cumple ninguna**
(AC-09). La ausencia de alerta elegible **no** debe crear un cumplimiento artificial.

**Nota — simultáneas (AC-13):** si dos alertas comparten exactamente la misma ventana (`A→08:00`,
`B→08:00`), `dueAt ASC` es ambiguo. Este sprint **no define** la regla de desempate (requiere
decisión de negocio determinística, orden-idempotente). Spr 269 deberá definirse el desempate
SOBRE la base de esta auditoría, con un criterio determinístico (p. ej. lexicográfico sobre
`occurrenceKey`) y **no** dependiente del orden del array.

---

## 7. Tabla de decisión (casos obligatorios)

| Estado de alertas | Acción | Resultado esperado (única ocurrencia) |
|---|---|---|
| A vencida, B hoy, C futura | Guardar | **A** |
| A hoy 08:00, B hoy 14:00 | Guardar 09:00 | **A** (más próximo a vencer) |
| A cumplida, B hoy 14:00 | Guardar 10:00 | **B** |
| A/B/C futuras | Guardar | **Ninguna** |
| A vencida, B vencida | Guardar | **La más antigua** (dueAt ASC) |
| A explícita desde Alertas | Guardar | **A exclusivamente** |
| A explícita + B/C | Guardar | **A exclusivamente** (contexto gana) |
| Sin alertas | Guardar | **Ninguna** |

---

## 8. Casos de estudio

### 8.1 Recurrencia (AC-12, compatibilidad Sprint 257)

Una ocurrencia completada **no** satura la siguiente:

```
A:occ:2026-08-09 → completed
A:occ:2026-08-10 → pending (propia identidad temporal)
```

### 8.2 Múltiples alertas del mismo formulario (AC-10/AC-11)

```
Formulario Temperatura → A(08:00) B(12:00) C(16:00) D(20:00)
Tras completar A:  A=Cumplida, B=Pend., C=Pend., D=Pend.
Tras completar B:  A=Cumplida, B=Cumplida, C=Pend., D=Pend.
```

El formulario sigue siendo **uno**; las obligaciones siguen siendo **cuatro**.

### 8.3 Recurrente diaria dentro de la misma alerta

La ocurrencia del día siguiente conserva su propia `sequence`; el flujo del Sprint 257
(`occurrenceKey = alertId:occ:seq`) ya garantiza identidades distintas. La resolución
determinística **nunca** `Mark`a la siguiente recurrencia.

---

## 9. Navegación desde Alertas (concepto — NO implementar)

Sprint 266 probó que `AlertMonitoringExperience` (rama de tarjeta) conoce `alertId` y
`occurrenceKey` por config, pero la acción que emite (`NTTY_ROUTE['open-form']`) transporta
**solo** `{ action, resourceId }` (véase `AlertMonitoringExperience.jsx:316-332` y
`resolveActionRoute` en `ExistingModuleRouteResolver.js:79-105`). Para satisfacer la regla de
identidad explícito, la ruta deberá conservar:

```
resource context  = { moduleSlug, formSlug(resourceId), resourceKind }
alert context     = { alertId, occurrenceId }
```

**Este Sprint 268 NO implementa ese transporte** (límite: `ExistingModuleRouteResolver`,
`DynamicForm`, `AlertMonitoringExperience`, `CompletionBridge`, `OccurrenceLedger` quedan
READ-ONLY). La certificación necesaria se hará en el Sprint 269.

---

## 10. Completion Intent (frontera conceptual)

```
USER ACTION
   ↓
COMPLETION INTENT   →  explicit: origin='alert', alertId, occurrenceId
                        implicit: origin='resource', resourceId
   ↓
OCCURRENCE RESOLUTION → (una única ocurrencia elegible, §5)
   ↓
COMPLETION (ledger) → state per-OCCURRENCE (no per-resource)
```

El `CompletionIntent` (contrato propuesto, NO implementado aquí):

```
{ origin: 'alert'|'resource',
  resourceKind, resourceId, moduleId,
  alertId?, occurrenceId?,        // presentes cuando origin='alert'
  completedAt }
```

Este contrato vivirá **en el límite de la acción** y **no** contamina el VO `AlertConfiguration`
ni el recurso persistido (ver §12 Límites) — respeta el Metadata Envelope de Sprint 263.

---

## 11. Lo que NO ocurre (comportamientos prohibidos por diseño)

- `RESOURCE_COMPLETED` → buscar todas las alertas del recurso → completar todas.
- `resourceId → completionState` como única identidad de cumplimiento.
- `alertConfigurations[0]` (orden del array) como mecanismo de selección.
- `Map<resourceId, completion>` para representar cumplimiento multi-alerta.
- Completar `upcoming` por defecto (prioridad 3 §6) sin autorización explícita futura.

---

## 12. Guardar el estado del pipeline en Spr 269 (NEXT SPRING — solo documentado)

Si la investigación o implementación del Sprint 269 requiriera tocar código, se documentará por
frontera: archivo, línea, problema, impacto, propuesta, dependencias y riesgos. Se lista aquí a
modo de referencia de lo YA auditado en 266:

| Frontera | Archivo · línea | Problema auditado | Propuesta (Sprint 269) | Dependencias |
|---|---|---|---|---|
| Navegación | `ExistingModuleRouteResolver.resolveActionRoute` (79–105) | `open-form` mapea `formSlug=resourceId`; pierde `alertId`/`occurrenceKey` | Ampliar descriptor de ruta opcional (`alertId`, `occurrenceId`) | resolver firma + callers (AlertMonitoringExperience:332) |
| Experiencia | `AlertMonitoringExperience.jsx` (249, 316–332) | Tarjeta conoce identidades pero la acción solo lleva `resourceId` | Añadir `alertId`/`occurrenceId` al descriptor de la acción `open-form` | navegación §9 |
| DynamicForm | `DynamicForm.jsx` (28, 189–195) | Publisher solo emite `resourceKind/resourceId/moduleId/completedAt` | Leer contexto de la ruta y emitir `origin` + alert context en el intent | navegación §9 |
| Signal/Bridge | `CompletionSignal.js` · `CompletionBridge.js` (33–42) | Señal genérica, deducción `resourceId ?? recordId ?? id`, sin alertId | Permitir `origin=alert` y reenrutar a resolución determinística | intent y contrato signal |
| Ledger | `OccurrenceLedger` (32–71) | key `resourceKind::resourceId::moduleId`; la única señal satisface TODAS las windows del recurso | key opcional por alerta/ocurrencia (`alertId::occurrenceKey`) cuando el intent es explícito | contrato 257, bridge |
| Resolución | §5–§7 (nuevo módulo «DeterministicCompletionResolver») | No existe política de candidato único ante ausencia de contexto | Implementar tabla de decisión (§7) + desempate determinista (§6, AC-13) | runtime activo, ledger |

Ningún elemento anterior se implementa en **este** Sprint; queda como documentación entregada a
Sprint 269 (AC-24).

---

## 13. Respuesta a la pregunta del usuario (decisión cerrada)

- **Si el usuario entra desde una alerta específica** (p. ej. tarjeta B): esa alerta es la **única
  candidata** y debe ser la única que quede cumplida (identidad explícita > resolución).
- **Si entra directamente al formulario**: `DeterministicCompletionResolver` selecciona **una**
  alerta elegible, priorizando **overdue** (dueAt ASC) y luego **today** (dueAt ASC); las **futuras
  nunca** se completan; si no hay elegible → **no se cumple ninguna**.

---

## 14. Acceptance Criteria (verificación)

| AC | Descripción | Este doc |
|---|---|---|
| AC-01 | Diferencia recurso vs unidad de cumplimiento | §3 |
| AC-02 | Una acción satisface como máximo UNA ocurrencia | §5, §6, §10 |
| AC-03 | Identidad explícita desde Alertas | §4.1, §9 |
| AC-04 | Prioridad: identidad explícita > resolución | §5, §13 |
| AC-05 | Resolución determinística sin identidad | §6 |
| AC-06 | Prioridad 1 = vencida más antigua | §6, §7 |
| AC-07 | Prioridad 2 = activa/hoy dueAt próximo | §6, §7 |
| AC-08 | Futuras NO se completan por defecto | §6, §8.1 |
| AC-09 | Sin elegible → ninguna | §6, §7 |
| AC-10 | Alertas del mismo recurso independientes | §3 |
| AC-11 | Compleción no contagia a otras alertas | §8.2, §11 |
| AC-12 | No se auto-completa la siguiente recurrencia | §8.1, §8.3 |
| AC-13 | Simultáneas: definido, desempate en 269 | §6 (nota) |
| AC-14 | Compatibilidad conceptual Sprint 257 | §4.1, §8.1 |
| AC-15 | Multi-config Sprint 261 | §8.2 |
| AC-16 | Metadata Envelope Sprint 263 | §10 (contrato) |
| AC-17..23 | Guardrails 0 cambios (occurrence/**, DynamicForm, nav, ledger, sin persistencia, sin `.mjs`, sin src) | §12, §15 |
| AC-24 | Spec accionable para Sprint 269 | §10–§13 |

---

## 15. Límites arquitectónicos respetados (Guardrails 268)

Lectura de solo — **ninguno modificado**:
`src/core/capabilities/alert/operational-configuration/**`,
`src/core/capabilities/alert/occurrence/**` (`OccurrenceLedger`, `CompletionSignal`,
`CompletionBridge`, `OccurrenceLifecycle`, `OccurrenceContract`, `OccurrenceProjection`,
`OccurrenceSchedule`),
`src/hooks/useAlertRuntime.js`,
`src/pages/DynamicForm.jsx`,
`src/modules/experiences/AlertMonitoringExperience.jsx`,
`src/core/navigation/**`.

Prohibiciones no saltadas: **0 cambios de producción**, **0 `.mjs`**, **0 fixtures ejecutables**,
**0 prototipos de Ledger**, **0 `CompletionIntentResolver` real** generado. Artefacto SSOT: solo
`docs/Sprint-268.md`.

---

## Estado final

```
SPRINT 268 — READY FOR EXECUTION
Modo: AUDIT + ARCHITECTURAL DESIGN + DECISION
Código: 0 cambios   ·   .mjs: 0   ·   Producción: 0
SSOT: docs/Sprint-268.md
Siguiente: Sprint 269 — Implementation of Deterministic Completion Intent,
           Occurrence Isolation y transporte de alert identity hasta el ledger
           (sólo tras certificar este doc).
```