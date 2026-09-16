# Sprint 279 — Auditoría y Diseño de Identidad Multi-Entrada para Cumplimiento de Alertas

**Branch:** `release/stable-sprint79`
**Modo:** AUDIT + ARCHITECTURAL DESIGN + DECISION
**Producción:** 0 cambios · **src/:** 0 cambios · **Scripts `.mjs`:** 0 nuevos
**SSOT:** `docs/Sprint-279.md`
**Dependencias:** Sprint 257 · 261 · 263 · 264 · 265 · 266 · 267 · 268 · 278
**Estado final:** **SPRINT 279 — READY FOR EXECUTION**

---

## 1. Objetivo

Auditar y cerrar la arquitectura de **todas las rutas de entrada** que pueden producir un
guardado susceptible de cumplir una alerta, garantizando que:

```text
RECURSO COMPARTIDO  ≠  IDENTIDAD DE ALERTA  ≠  IDENTIDAD DE OCURRENCIA  ≠  CUMPLIMIENTO
```

El sistema debe soportar simultáneamente:

- **Entrada A** — Experiencias Operacionales → Alerta específica → Ir al formulario → Guardar
  → SOLO esa ocurrencia completada.
- **Entrada B** — Módulo → Formulario directamente → Guardar → ¿Tiene alertas? NO → normal;
  SÍ → Deterministic Completion Resolution → UNA ocurrencia elegible → COMPLETED.
- **Entrada C** — Recurso sin alertas → Guardar → persistencia normal → FIN (sin lógica de alertas).

Nunca se crea una dependencia artificial entre recursos normales y el sistema de alertas.

Este sprint **NO implementa**; produce la especificación accionable y los límites exactos que
Sprint 280 deberá implementar (AC-26).

---

## 2. Principio rector: clasificar por ORIGEN antes de resolver

```text
USER ACTION → ENTRY CONTEXT
                 ├── origin = alert     → IDENTIDAD EXPLÍCITA → UNA occurrence específica
                 └── origin = resource  → RESOLUCIÓN DETERMINÍSTICA → UNA occurrence elegible
              resource sin alertas      → NO COMPLETION
```

**Jerarquía absoluta (certificada):**

```text
1. IDENTIDAD EXPLÍCITA          (origin = alert → alertId + occurrenceId obligatorios)
2. RESOLUCIÓN DETERMINÍSTICA    (origin = resource → overdue→today/active)
3. NINGÚN COMPLETION            (upcoming / sin candidata / sin alertas)
```

Prohibido — jamás:

```text
resourceId → buscar todas las alertas → completar todas        (RESOURCE_COMPLETED masivo)
alertId perdido → buscar "la más antigua"                       (si la acción nació de una alerta)
```

---

## 3. Método de auditoría

Se auditaron **todas** las rutas de entrada de guardado de `dynamicForms` y `dynamicRecords` y
**todos** los publishers de eventos finales que alimentan el OccurrenceLedger, verificando en
cada frontera la pregunta:

> ¿La identidad de la alerta/ocurrencia continúa disponible? (YES solo cuando `origin = alert`)

### 3.1 Todas las rutas de entrada al formulario (guardado)

| # | Entrada | Ubicación | Contexto de alerta disponible | Hallazgo |
|---|---------|-----------|-------------------------------|----------|
| 1 | Experiencias Op → Alertas → Ir al formulario | `AlertMonitoringExperience.jsx:316-332` (card) → `open-form` | **SÍ** — `card.alertId` / `card.occurrenceId` existen en 249/297 | **PÉRDIDA**: el descriptor `open-form` (316-321) solo envía `resourceId`; `ACTION_ROUTE['open-form']` (331-332) llama a `resolveActionRoute('open-form', { moduleSlug, resourceId })` |
| 2 | Módulo → Formularios (Link directo) | `DynamicModule.jsx:73-74` → `/modulo/:moduleSlug/:formSlug` | NO aplica (entrada directa) | Corresponde a `origin='resource'` (resolución determinística si hay alertas) |
| 3 | Traceabilidad → Formulario (Link directo) | `Traceability.jsx:190-191` → `/modulo/trazabilidad/:formSlug` | NO aplica (entrada directa) | Igual que (2): `origin='resource'` |
| 4 | Ruta canónica (registry) | `App.jsx:60` → `<Route path="modulo/:moduleSlug/:formSlug">` | NO aplica | DynamicForm lee `useParams()`; NO lee `location.state` hoy |
| 5 | Workspace (cards operativas) | `AlertWorkspaceBuilder.js:37-38` + `AlertWorkspaceActionDescriptor.js:21-45` | `alert.id`/`alert.alertId` conocidos en builder | **PÉRDIDA POTENCIAL**: `buildActionDescriptor` solo emite `action, resourceType, resourceId, documentId, moduleId, tab, metadata` — no `alertId`/`occurrenceId` |
| 6 | Records operativos (bulk) | `OperationalExperienceLifecycleOrchestrator.js:190-213, 223-259` | NO aplica (dynamicRecords en lote) | Publishers `RESOURCE_COMPLETED` / `RECORDS_APPROVED` / `RECORDS_CLOSED` con `recordIds` (guardado normal de records) |

### 3.2 Todos los publishers de completion (signal → ledger)

| Publisher | Ubicación | Payload | Tipo de evento |
|-----------|-----------|---------|----------------|
| DynamicForm (formulario) | `DynamicForm.jsx:189-195` | `{ resourceKind:'dynamicForms', resourceId: formDef.id, moduleId: moduleSlug, completedAt }` | `RESOURCE_COMPLETED` — **SIEMPRE se publica tras guardar**, con o sin alertas |
| Orchestrator records (completado masivo) | `OperationalExperienceLifecycleOrchestrator.js:203-210` | `{ experienceKey, recordIds, resourceKind:'dynamicRecords', completedAt }` | `RESOURCE_COMPLETED` |
| Orchestrator records (aprobación) | `OperationalExperienceLifecycleOrchestrator.js:238` | `{ experienceKey, recordIds }` | `RECORDS_APPROVED` |
| Orchestrator records (cierre) | `OperationalExperienceLifecycleOrchestrator.js:257` | `{ experienceKey, recordIds }` | `RECORDS_CLOSED` |
| Orchestrator records (status masivo) | `OperationalExperienceLifecycleOrchestrator.js:198` | `{ experienceKey, recordIds, newStatus }` | `RECORDS_STATUS_UPDATED` (bridge filtra `newStatus === 'completado'`) |

Consumidor de todos: `CompletionBridge.js` (`FINAL_SINGLE_EVENTS` en 29, `recordBulk`/`inferSingleSignal`
en 33-54) → `OccurrenceLedger.recordCompletion`.

### 3.3 Cadena de identidad (frontera por frontera)

```text
Card (alertId/occurrenceId DISPONIBLES: AlertMonitoringExperience 249, 297)
  ↓
Action Descriptor (316-321)         ✗ SOLO resourceId — alertId/occurrenceId NO viajan
  ↓
Route Resolver (resolveActionRoute 79-105)   ✗ firma { moduleSlug, resourceId } — sin alert context
  ↓
Navigation (CardButton 359-364)     ✗ navigate(target string) — sin location.state
  ↓
DynamicForm (189-195)               ✗ publica RESOURCE_COMPLETED genérico resource-scoped
                                      (no lee location.state, no distingue origin)
  ↓
CompletionIntent                     ✗ NO EXISTE como contrato ejecutado
  ↓
CompletionSignal (31-42)            ✗ señal genérica sin alertId/occurrenceId
  ↓
CompletionBridge (33-54)            ✗ deduce resourceId, registra resource-scoped
  ↓
OccurrenceLedger (30, 32-34, 44-48) ✗ key resourceKind::resourceId::moduleId — UNO
                                        satisface TODAS las ventanas del recurso (colapso A/B/C)
  ↓
Classification (Ledger 60-81)       ✗ completionSignalFor window-aware resource-scoped →
                                        misma señal marca A/B/C simultáneamente
```

**Confirmado:** la pérdida de `origin`/`alertId`/`occurrenceId` en la frontera 2 (Action
Descriptor) reproduce el comportamiento Sprint 266: *guardar un formulario produce
A=B=C=completed*.

---

## 4. Decisión arquitectónica — CompletionIntent (contrato certificado)

Límite de la acción (NO contamina `AlertConfiguration` ni el recurso persistido, mantiene el
Metadata Envelope de Sprint 263):

```js
{
  origin: 'alert' | 'resource',   // OBLIGATORIO
  resourceKind,                    // 'dynamicForms' | 'documentRepository' | 'dynamicRecords'
  resourceId,
  moduleId,
  alertId?,                        // OBLIGATORIO cuando origin='alert'
  occurrenceId?,                   // OBLIGATORIO cuando origin='alert'
  completedAt,
}
```

| Regla | Valor |
|-------|-------|
| `origin='alert'` | `alertId` y `occurrenceId` **obligatorios**; resolución = ausente (la identidad decide) |
| `origin='resource'` | `alertId`/`occurrenceId` **ausentes**; el sistema ejecuta la resolución determinística |

---

## 5. Decisión arquitectónica — Ledger (aislamiento)

El OccurrenceLedger debe distinguir:

```text
resource-scoped fallback (compatibilidad)      = resourceKind::resourceId::moduleId
specific occurrence completion (Sprint 280)    = alertId::occurrenceId
```

Regla certificada: un completion específico de `A:occ:001` **nunca** satisface `B:occ:001`,
`C:occ:001`, `D:occ:001` aunque compartan `resourceId`/`moduleId`/`formId`.

- `origin='alert'` → el bridge registra en la clave específica `alertId::occurrenceId`.
- `origin='resource'` → resolución determinística selecciona UNA ocurrencia → registro específico
  de ESA ocurrencia.
- `completionSignalFor` consulta primero la clave específica de la ocurrencia y solo cae al
  fallback resource-scoped cuando no existe clave específica (compatibilidad S257 preservada).
- Idempotencia conservada: misma señal ×2 → 1 transición.

Prohibido — nunca:

```text
Map<resourceId, completed>
resourceId → completed  como estado de alerta
RESOURCE_COMPLETED → marcar TODAS las alertas del recurso (para nuevas acciones)
```

---

## 6. Decisión arquitectónica — Resolución determinística (origin=resource)

Reutiliza EXCLUSIVAMENTE `OccurrenceLifecycle.classifyOccurrence` (NUNCA un clasificador nuevo):

| Prioridad | Estado clasificado | Selección |
|-----------|--------------------|-----------|
| 1 | `overdue` (vencida) | `MIN(dueAt)` → **la vencida más antigua** |
| 2 | `today` / `active` (ventana actual) | `MIN(dueAt)` → **la que vence primero** |
| 3 | `upcoming` (futura) | **NO elegible** → NO COMPLETION |
| — | sin candidata | **NO COMPLETION** |

**Desempate** (AC-20) — dos alertas con la misma ventana:

```text
1. dueAt ASC
2. occurrenceId ASC
```

Nunca `array index`, nunca `first element`, nunca orden accidental de configuración.

La frontera candidata se ubica en `src/core/capabilities/alert/occurrence/DeterministicCompletionResolver.js`
(módulo PURE, read-only, sin estado ni persistencia) — ver §9.

---

## 7. Recursos sin alertas — guardrail obligatorio (AC-12/13/23)

Si `alertConfigurations.length === 0` (o la colección extraída es vacía), el guardado NO debe
convertirse en una operación de alertas:

```text
USER → FORM/REPOSITORY → SAVE → PERSISTENCE      ✓

SAVE → Alert Runtime → Resolver → Ledger          ✗
```

**Hallazgo a corregir en Sprint 280:** `DynamicForm.jsx:189-195` publica `RESOURCE_COMPLETED`
**incondicionalmente** tras guardar, incluso cuando el formulario no tiene alertas. Aunque hoy la
señal no tenga ventanas que satisfacer (nulo), introduce una operación de alertas innecesaria en
el flujo normal. Sprint 280 debe condicionar el publish a la existencia real de alertas/ocurrencias.

Tabla objetivo:

| Recurso | Alertas | Guardado | Cumplimiento |
|---------|---------|----------|--------------|
| Formulario A | 0 | Normal | Ninguno |
| Formulario B | 1 | Normal | Una ocurrencia |
| Formulario C | 3 | Normal | Máximo una ocurrencia |
| Repositorio A | 0 | Normal | Ninguno |
| Repositorio B | 2 | Normal | Máximo una ocurrencia |

---

## 8. Ejemplos operativos obligatorios (decisión verifiable en Sprint 280)

### 8.1 Aislamiento temporal (formulario directo)

```
Temperatura  A→08:00  B→14:00  C→20:00
Guardar 09:00  → A=COMPLETED, B=PENDING,  C=PENDING
Guardar 15:00  → A=COMPLETED, B=COMPLETED, C=PENDING   (si A ya fue completada)
NUNCA          → A=B=C=COMPLETED por un único guardado
```

### 8.2 Entrada explícita (Alerta B aunque A vencida)

```
A=overdue  B=explícita (explicit)  C=upcoming
Entrar por B → Guardar → A=unchanged, B=COMPLETED, C=unchanged
```

### 8.3 Recurrencia

```
A:occ:001 = completed  → NO implica A:occ:002 = completed   (A:occ:002 = pending)
```

---

## 9. Fronteras de implementación para Sprint 280 (alcance EXACTO)

> Sprint 280 deberá estudiar y modificar ÚNICAMENTE estas fronteras. No autoriza otras capas por
> "más fáciles".

| Frontera | Archivo | Responsabilidad en Sprint 280 | Cambio previsto |
|----------|---------|-------------------------------|-----------------|
| F1 — Experiencia | `AlertMonitoringExperience.jsx` (316-332) | Conservar identidad de alerta | Descriptor `open-form` transporta `alertId`/`occurrenceId`; `CardButton` (359-364) navega con `location.state` |
| F2 — Resolver rutas | `ExistingModuleRouteResolver.js` (79-105) | Transportar contexto opcional | `resolveActionRoute('open-form', { moduleSlug, resourceId, alertId?, occurrenceId? })` → propaga `alertContext` sin cambiar `canonicalRoute` |
| F3 — Navegación | `DynamicForm.jsx` (uso de `location`) | Preservar `alertContext` | Leer `location.state?.alertContext` |
| F4 — DynamicForm | `DynamicForm.jsx` (189-195) | Construir la intención correcta | Publicar intent con `origin`; sin alertas → NO publicar; con alertas directas → resolver determinísticamente |
| F5 — Signal | `CompletionSignal.js` (31-59) | Transportar identidad | Aceptar `origin`/`alertId`/`occurrenceId`; match por identity cuando `origin='alert'` |
| F6 — Bridge | `CompletionBridge.js` (33-54) | Resolver según origen | `origin='alert'` → registro específico; `origin='resource'` → resolver determinístico → UNA ocurrencia; sin alertas → NO completion |
| F7 — Resolución | `occurrence/DeterministicCompletionResolver.js` (**NUEVO**) | Seleccionar una única occurrence | Tabla §6 + desempate `(dueAt ASC, occurrenceId ASC)` — pure |
| F8 — Ledger | `OccurrenceLedger.js` (30, 32-34, 44-48, 60-81) | Aislar completion | Clave específica `alertId::occurrenceId`; `completionSignalFor` primero específica, fallback resource-scoped |
| F9 — Clasificación | `OccurrenceProjection.js` / `AlertMonitoringExperience.jsx` (consumo) | Consultar completion específico | Proyección lee la clave específica de cada ocurrencia (mantiene `classifyOccurrence` intacto) |

**No se autoriza** modificar: Runtime, Engine, Scheduler, Enrollment, Capabilities fuera de las
fronteras, Supabase, schema, persistencias de recurso, repositorios (salvo corte de identidad),
ni `occurrence/**` más allá de F5-F9.

---

## 10. Implementación prohibida en Sprint 279 (este sprint)

No se modificó absolutamente nada:

- **`src/**`: 0 cambios**
- `*.mjs`: 0 creados
- Fixtures ejecutables: 0
- Supabase / schema: 0
- Nuevo EventBus / Scheduler / Ledger paralelo / Store paralelo: 0
- Modelo persistido del formulario o del repositorio: intacto
- **No se tocó**: `OccurrenceLifecycle`, `OccurrenceSchedule`, `OccurrenceContract`,
  `OccurrenceProjection` (read-only auditados), `CompletionSignal`, `CompletionBridge`,
  `OccurrenceLedger`, `ExistingModuleRouteResolver`, `AlertMonitoringExperience`,
  `DynamicForm`, `DeterministicCompletionResolver` (aún no creado).

---

## 11. Casos de certificación objetivo para Sprint 280

| Caso | Escenario | Resultado requerido |
|------|-----------|---------------------|
| 01 | Sin alertas → guardar formulario | SUCCESS · **0 completions** |
| 02 | UNA alerta A → guardar directo | A=completed |
| 03 | A B C → guardar directo | UNA sola completed |
| 04 | Entrada explícita B → guardar | A=unchanged · B=completed · C=unchanged |
| 05 | B explícita con A vencida | A=unchanged · B=completed · C=unchanged |
| 06 | Directo: A overdue, B today, C upcoming | A |
| 07 | Directo 09:00: A=08:00 B=14:00 C=20:00 | A |
| 08 | Directo: A/B/C futuras | NONE |
| 09 | Dos alertas misma hora | Desempate `(dueAt ASC, occurrenceId ASC)` — nunca `array[0]` |
| 10 | A:occ:001 completed | A:occ:002 pending (identidad independiente) |

---

## 12. Acceptance Criteria — verificación

| AC | Criterio | Estado en 279 |
|----|----------|---------------|
| AC-01 | Se auditan todas las entradas al formulario | **PASS** (§3.1: 6 entradas mapeadas) |
| AC-02 | Se diferencia `origin=alert` de `origin=resource` | **PASS** (§2, §4) |
| AC-03 | Entrada desde alerta conserva `alertId` | **DESIGN** → F1-F3 (brecha certificada §3.3) |
| AC-04 | Entrada desde alerta conserva `occurrenceId` | **DESIGN** → F1-F3 (brecha certificada §3.3) |
| AC-05 | Entrada explícita tiene prioridad absoluta | **PASS** (§2, §5) |
| AC-06 | Formulario directo utiliza resolución determinística | **DESIGN** → F6-F7 |
| AC-07 | Máximo una occurrence por acción | **PASS** (§2, §5) |
| AC-08 | Vencida más antigua tiene prioridad | **PASS** (§6) |
| AC-09 | Hoy más próxima tiene segunda prioridad | **PASS** (§6) |
| AC-10 | Upcoming no es elegible | **PASS** (§6) |
| AC-11 | Sin candidata no hay completion | **PASS** (§6) |
| AC-12 | Formulario sin alertas se guarda normalmente | **PASS** (§7 — hallazgo publish incondicional F4) |
| AC-13 | Repositorio sin alertas se guarda normalmente | **PASS** (§7) |
| AC-14 | Compartir formulario no comparte completion | **PASS** (§2, §5, §8) |
| AC-15 | Compartir repositorio no comparte completion | **PASS** (§2, §5) |
| AC-16 | Compartir `resourceId` no comparte completion | **PASS** (§5) |
| AC-17 | Alert A no puede completar B/C | **PASS** (§5, §8) |
| AC-18 | Alert B explícita no se resuelve hacia A | **PASS** (§2, §5) |
| AC-19 | Recurrencias mantienen identidad independiente | **PASS** (§8.3) |
| AC-20 | Desempate no depende del orden del array | **PASS** (§6) |
| AC-21 | No se introduce nuevo EventBus/Ledger/Store/Scheduler | **PASS** (0 creados) |
| AC-22 | No se modifica persistencia del recurso | **PASS** (0 cambios) |
| AC-23 | No se modifica lógica de recursos sin alertas | **PASS** (hallazgo F4 documentado para 280) |
| AC-24 | `src/` permanece intacto durante este Sprint | **PASS** (0 cambios) |
| AC-25 | No se crean `.mjs` | **PASS** (0 nuevos) |
| AC-26 | Documento produce especificación accionable para Sprint 280 | **PASS** (§9 fronteras + §11 casos) |

---

## 13. Estado final

```text
SPRINT 279 — AUDIT + ARCHITECTURAL DESIGN + DECISION
Código producción:  0
Cambios en src/:    0
Nuevos .mjs:        0
Persistencia:       0
Supabase:           0
SSOT:               docs/Sprint-279.md

DECISIÓN:
  ENTRY FROM ALERT        → EXPLICIT ALERT IDENTITY → EXACT OCCURRENCE → ONE COMPLETION
  DIRECT RESOURCE ENTRY   → HAS ALERTS? → NO → NORMAL SAVE
                                          → YES → DETERMINISTIC RESOLUTION → ONE OCCURRENCE → ONE COMPLETION
  RESOURCE WITHOUT ALERT  → NORMAL APPLICATION FLOW → NO ALERT LOGIC

VERDICT: SPRINT 279 — READY FOR EXECUTION
Siguiente: Sprint 280 — Implementation of Multi-Entry Completion Identity (fronteras F1-F9)
```