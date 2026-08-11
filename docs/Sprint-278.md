# Sprint 278 — Implementation of Compliance Identity & Deterministic Multi-Alert Resolution

**Branch:** `release/stable-sprint79`
**Modo:** IMPLEMENTATION + CERTIFICATION
**SSOT previo:** `docs/Sprint-268.md` (AUDIT + DESIGN — READY FOR EXECUTION)
**Dependencias:** Sprint 257 · 261 · 263 · 264 · 265 · 266 · 267 · 268
**Estado esperado:** PLAN → IMPLEMENTED → VERIFIED → **CERTIFIED**

---

## 1. Objetivo

Implementar el modelo aprobado en Sprint 268:

> **Una acción de usuario puede completar como máximo UNA ocurrencia de alerta.**

- **Aislamiento real de cumplimiento** entre alertas que comparten un mismo recurso.
- **Preservación completa** del comportamiento normal de formularios/repositorios SIN alertas.
- Transporte de identidad (`alertId` + `occurrenceId`) desde la tarjeta de alerta hasta el Ledger.

Unidad de cumplimiento: **OCCURRENCE**. Recurso: **SHARED**. Completion: **ISOLATED**.

---

## 2. Modelo de dominio (Sprint 268 §3 — SSOT)

```text
RESOURCE ≠ ALERT ≠ OCCURRENCE ≠ COMPLETION

resourceId
     ├── alertId A  ├── occurrence A1  └── occurrence A2
     ├── alertId B  ├── occurrence B1  └── occurrence B2
     └── alertId C  ├── occurrence C1  └── occurrence C2
```

- **Recurso** = sobre qué objeto se trabaja → NO identifica cumplimiento.
- **Alerta** = qué obligación operacional (`alertId`).
- **Ocurrencia** = qué instancia temporal de la obligación (`occurrenceId`) — **UNIDAD DE CUMPLIMIENTO**.
- El recurso compartido **nunca** almacena `form.completedAlert` / `form.completedOccurrence` /
  `repository.alertStatus` (§11). La identidad de cumplimiento pertenece al modelo de ocurrencia.

---

## 3. Dos caminos de entrada

### Camino A — Entrada desde una alerta (`origin: 'alert'`)

```text
AlertMonitoringExperience (Alerta B) → Ir al formulario → DynamicForm → Guardar
    ↓
alertId + occurrenceId  (contexto explícito en la navegación)
    ↓
SOLO la ocurrencia B  ← CUMPLIDA
A y C permanecen en su estado previo
```

### Camino B — Entrada directa al recurso (`origin: 'resource'`)

```text
DynamicForm → Guardar
    ↓
¿El recurso tiene alertas configuradas?
    ├── NO  → guardado normal, SIN lógica de alertas (sin completion)
    └── SÍ  → DeterministicCompletionResolver elige UNA candidata
              → vencida más antigua (overdue, dueAt ASC) ó
                  hoy más próxima a vencer (today/active, dueAt ASC)
              → completar SOLO esa ocurrencia
```

---

## 4. Prioridad absoluta de resolución

```text
IDENTIDAD EXPLÍCITA  >  RESOLUCIÓN DETERMINÍSTICA  >  NINGUNA
```

- `origin='alert'` → ignorar la resolución temporal aunque A esté vencida y B esté vigente.
- `origin='resource'` → resolver determinísticamente (§5).
- Sin candidata elegible → **NO COMPLETION** (el formulario sí se guarda).

Nunca: `origin=alert` que descarta `alertId` y resuelve la "alerta más antigua".

---

## 5. Resolución determinística sin contexto (§6 Sprint 268)

| Prioridad | Estado clasificado (OccurrenceLifecycle) | Selección |
|-----------|------------------------------------------|-----------|
| 1 | `overdue` (vencida) | `MIN(dueAt)` → la vencida más antigua |
| 2 | `today` / `active` (ventana actual) | `MIN(dueAt)` → la que vence primero |
| 3 | `upcoming` (futura) | **NO elegible** → NO completion |
| — | sin candidata | **NO COMPLETION** |

### Desempate (Sprint 268 §6 nota / §16)

Dos alertas con exactamente la misma ventana:

```text
1. dueAt ASC
2. occurrenceId ASC
```

**NUNCA** `array index`, ni `first element`, ni orden accidental de configuración.

---

## 6. Contrato CompletionIntent (frontera conceptual, Sprint 268 §10)

```js
{
  origin: 'alert' | 'resource',   // obligatorio
  resourceKind,                    // dynamicForms | documentRepository
  resourceId,
  moduleId,
  alertId?,                        // OBLIGATORIO cuando origin='alert'
  occurrenceId?,                   // OBLIGATORIO cuando origin='alert'
  completedAt,
}
```

- `origin='alert'` → **debe** contener `alertId` + `occurrenceId`.
- `origin='resource'` → sin identidad de alerta → resolución determinística.

El intent vive **en el límite de la acción** (navegación + DynamicForm) y NO contamina el VO
`AlertConfiguration` ni el recurso persistido (Metadata Envelope Sprint 263).

---

## 7. Reutilización obligatoria (no crear clasificador nuevo)

Se reutiliza EXACTAMENTE la semántica temporal certificada:

```text
OccurrenceLifecycle.classifyOccurrence   // today / overdue / upcoming / active / completed
OccurrenceSchedule.parseAnchor / cadenceMs / occurrenceWindowAt
OccurrenceProjection                      // derivación read-only
OccurrenceContract.createAlertOccurrence / occurrenceIdOf / isAlertOccurrence
```

**NO** se reconstruye `today`, `overdue`, `upcoming`, etc. **NO** se crea un segundo clasificador.

---

## 8. Estado actual del código (brechas auditadas — evidencia)

| Frontera | Archivo · línea | Problema actual | Cambio previsto |
|---|---|---|---|
| Navegación | `src/core/navigation/ExistingModuleRouteResolver.js:79-105` | `resolveActionRoute('open-form')` mapea `formSlug=resourceId`; descarta `alertId`/`occurrenceId` | Ampliar descriptor opcional: `{ action, resourceId, alertId?, occurrenceId? }` |
| Experiencia | `AlertMonitoringExperience.jsx:249, 296-321` | La tarjeta ya conoce `alertId` (249) y `occurrenceId` (297) pero el descriptor `open-form` (316-321) solo transporta `resourceId` | Añadir `alertId`/`occurrenceId` al descriptor + transportar por `location.state` |
| DynamicForm | `DynamicForm.jsx:189-195` | SIEMPRE publica `RESOURCE_COMPLETED_EVENT` genérico resource-scoped → el Ledger marca TODAS las ventanas | Leer contexto de la ruta; publicar intent con `origin` + alert context, o resolución determinística, o nada |
| Signal | `CompletionSignal.js:31-42, 47-59` | Señal genérica sin dimensión de alerta; matching solo por resource/window | Aceptar señal con `alertId`/`occurrenceId` (identity explícita) |
| Bridge | `CompletionBridge.js:33-53` | Deduce `resourceId ?? recordId ?? id`; registra resource-scoped | Respetar `origin` del intent: explícito → registro específico; resource → resolución determinística; sin alertas → NO completion |
| Ledger | `OccurrenceLedger.js:30, 32-34, 44-48` | Key `resourceKind::resourceId::moduleId` — UNA señal satisface TODAS las ventanas del recurso (colapso A/B/C) | Key con dimensión opcional `alertId::occurrenceId` cuando el intent es explícito; mantiene la key resource-scoped como fallback (compat) |
| Resolución | `src/core/capabilities/alert/occurrence/DeterministicCompletionResolver.js` (**NO EXISTE**) | No existe política de candidato único | NUEVO módulo puro: tabla de decisión §5 + desempate deterministico idempotente |

---

## 9. Plan de cambios (orden de implementación)

> **Regla:** REUTILIZACIÓN máxima antes que proliferación de servicios. No se crea EventBus,
> Ledger, Store, Scheduler, persistencia ni servicios paralelos.

### 9.0 `src/core/capabilities/alert/occurrence/DeterministicCompletionResolver.js` (NUEVO)

Frontera pura (read-only, sin estado, sin persistence):

```js
resolveSingleOccurrence({ occurrences, nowMs })
  → 0 o 1 occurrence elegible
```

- Filtra ocurrencias NO completadas (ledger).
- Prioridad 1: `classifyOccurrence(occ).key === 'overdue'` → `MIN(dueAt)`, desempate `occurrenceId ASC`.
- Prioridad 2: `today`/`active` → `MIN(dueAt)`, desempate `occurrenceId ASC`.
- Prioridad 3+: `upcoming`/sin candidata → `null` (NO COMPLETION).
- Desempate idempotente por `(dueAt, occurrenceId)` — nunca por índice de array.

### 9.1 `CompletionSignal.js`

- Extender `createCompletionSignal` para aceptar `origin`, `alertId`, `occurrenceId` opcionales
  (campos extra solo cuando `origin === 'alert'`).
- `matchCompletionToOccurrence` gana dimensión de alerta: cuando la señal trae `alertId`/`occurrenceId`,
  el match exige igualdad con la ocurrencia (identity explícita). Sin esos campos, conserva la semántica
  window-aware resource-scoped actual (compatibilidad certificada).

### 9.2 `OccurrenceLedger.js`

- Nuevo key opcional por alerta: para `origin='alert'` usa `alertId::occurrenceId`
  (registro específico, aislado). Para `origin='resource'` mantiene el key
  `resourceKind::resourceId::moduleId` actual (límite de compat, Sprint 268 §12 Ledger).
- `completionSignalFor` consulta primero la clave específica de la ocurrencia
  (`occurrenceId`/`alertId`) y solo cae al fallback resource-scoped si no existe clave específica.
- **Sin comprometer la idempotencia** (misma señal ×2 → 1 transición).

### 9.3 `CompletionBridge.js`

- El intent con `origin='alert'` registra el completion **específico** de la ocurrencia
  (alertId + occurrenceId → ledger key específico). El intent `origin='resource'` delega en
  `DeterministicCompletionResolver` (una ocurrencia) → registro específico.
- Recurso SIN alertas → **NO completion** (no se registra nada).
- Compat: los eventos heredados (`RESOURCE_COMPLETED`, etc.) que no llevan intent continúan
  en su semántica actual (no romper S257).

### 9.4 `ExistingModuleRouteResolver.js`

- `resolveActionRoute('open-form', { moduleSlug, resourceId, alertId?, occurrenceId? })`:
  devuelve `canonicalRoute` (sin cambio de path) y propaga `alertContext` opcional
  `{ alertId, occurrenceId }` en el descriptor para que DynamicForm lo recupere.
- El `open-form` normal `{ moduleSlug, resourceId }` sigue siendo válido (sin contexto).

### 9.5 `AlertMonitoringExperience.jsx`

- En `projectConfigCards`, el descriptor `open-form` (316-321) añade `alertId` y `occurrenceId`
  del card (disponibles en 249/297).
- `CardButton` (354-364) transporta el contexto por `location.state` al navegar:
  `{ alertContext: { alertId, occurrenceId } }`.

### 9.6 `DynamicForm.jsx`

- Lee `location.state?.alertContext` en el submit.
- Sin contexto (`origin='resource'`):
  - si el recurso NO tiene alertas/ocurrencias → guardado normal, **sin publish de completion**;
  - si tiene alertas → `DeterministicCompletionResolver` → publica la única ocurrencia elegible
    con `origin='resource'` (o NO publica si no hay candidata).
- Con contexto (`origin='alert'`) → publica la señal con `alertId` + `occurrenceId` explícitos;
  NUNCA resuelve otra alerta ("Alerta B" siempre completa B).

---

## 10. Alcance FIJO / Prohibido (Sprint 278)

**NO SE MODIFICA**: RuntimeActivation Layer, AlertRuntime, Scheduler, Engine, Enrollment,
Capabilities fuera de frontiers indicadas, Supabase, esquema de datos, modelo del formulario
para almacenar estado de alerta, repositorios (comportamiento de cumplimiento salvo el corte
de identidad), `occurrence/**` innecesariamente, configuraciones existentes sin necesidad.

**NO SE CREA**: EventBus, otro Ledger, otro Scheduler, Store paralelo, persistencia nueva, `.mjs`.

**PROHIBIDO**: marcar todas las alertas de un recurso por una acción; marcar una alerta futura;
usar `alertConfigurations[0]`; usar el orden del array como identidad; completar una recurrencia
futura por herencia; modificar recursos sin alertas; alterar el flujo normal de guardado.

---

## 11. Acceptance Criteria objetivo

| AC | Criterio |
|----|----------|
| AC-01 | Una acción completa máximo UNA ocurrencia |
| AC-02 | Alertas del mismo recurso permanecen independientes |
| AC-03 | `alertId` identifica la obligación |
| AC-04 | `occurrenceId` identifica la instancia temporal |
| AC-05 | El recurso compartido no representa completion |
| AC-06 | Navegación conserva `alertId` |
| AC-07 | Navegación conserva `occurrenceId` |
| AC-08 | Guardar desde alerta completa exclusivamente esa ocurrencia |
| AC-09 | A/B/C no se contaminan entre sí |
| AC-10 | Vencida más antigua tiene prioridad |
| AC-11 | Si no hay vencida, hoy más próxima tiene prioridad |
| AC-12 | Upcoming no se completa |
| AC-13 | Sin candidata no hay completion |
| AC-14 | El algoritmo es determinístico + desempate idempotente `(dueAt, occurrenceId)` |
| AC-15 | Formulario sin alertas continúa guardándose normalmente |
| AC-16 | Repositorio sin alertas continúa funcionando normalmente |
| AC-17 | No se genera completion inexistente |
| AC-18 | No se introduce dependencia obligatoria con el sistema de alertas |
| AC-19 | Completar hoy no completa mañana |
| AC-20 | Cada occurrence conserva identidad independiente |
| AC-21 | Build exitoso |
| AC-22 | Sprint 265 (dominio + monitoreo) continúa funcionando |
| AC-23 | Alertas existentes continúan proyectándose |
| AC-24 | Formularios sin alertas no presentan regresiones |
| AC-25 | No se modifican innecesariamente módulos fuera del alcance |

---

## 12. Escenarios mínimos de certificación (Sprint 268 §14 + este doc §21)

```text
TEST 01  Sin alertas → formulario guarda → NINGÚN completion
TEST 02  A=08:00 B=14:00 C=20:00 · guardar 08:15 → A=completed, B/C=pending
TEST 03  A=08:00 B=14:00 C=20:00 · guardar 14:15 → A=previo, B=completed, C=pending
TEST 04  Entrar explícitamente por B → guardar → SOLO B=completed
TEST 05  A vencida + B hoy + C futura → guardar directo → A=completed
TEST 06  A/B/C futuras → guardar → NINGUNA completed
TEST 07  A día 1 completed → día 2 → nueva occurrence pending
TEST 08  Dos alertas misma hora → resultado determinístico (occurrenceId ASC, no orden de array)
TEST 09  Dos alertas mismo formulario → completar A → B permanece pending
TEST 10  Tres alertas mismo formulario → completar B → A/C sin modificación
TEST 11  Desempate: A y B misma ventana → misma ocurrencia elegida siempre
TEST 12  Recurrencia: A:occ:001 completed no implica A:occ:002 completed
```

---

## 13. Criterio de éxito arquitectónico

```text
ONE USER ACTION  →  ONE COMPLETION INTENT  →  ONE OCCURRENCE  →  ONE COMPLETION

ONE SHARED RESOURCE  →  MANY ALERTS  →  MANY OCCURRENCES  →  INDEPENDENT COMPLETION STATES
```

No basta con que la UI muestre "Cumplida": debe demostrarse el aislamiento y el repliegue a
write-path solo cuando existe candidata elegible.

---

## 14. Estado final esperado

```text
SPRINT 278 — IMPLEMENTATION + CERTIFICATION
Objetivo: Multi-Alert Completion Isolation
Entrada explícita:  alert → occurrence específica
Entrada directa:    resource → deterministic resolver → una occurrence
Sin alertas:        resource → guardado normal → sin completion
Unidad de cumplimiento: OCCURRENCE
Resource:           SHARED
Completion:         ISOLATED
Regla:              IDENTIDAD EXPLÍCITA > RESOLUCIÓN TEMPORAL > NINGUNA
Artefactos:         docs/Sprint-278.md (+ archivos de frontiers indicadas)
```