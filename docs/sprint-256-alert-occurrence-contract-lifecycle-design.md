# Sprint 256 — Alert Occurrence Contract & Lifecycle Design

> Nivel 5 · Diseño arquitectónico · Contrato de ocurrencias · Ciclo de vida · Completitud · Runtime Integration

## Tipo
Architecture Design · Domain Contract Design · Lifecycle Modeling · Runtime Extension Design

**Impacto: DOCUMENTACIÓN Y DISEÑO EXCLUSIVAMENTE — SIN IMPLEMENTACIÓN.**

Este Sprint NO modifica código y NO crea: tablas, columnas, servicios, engines, providers, stores,
contexts, eventos, componentes de UI, rutas, contratos ejecutables ni migraciones.

NO modifica: `AlertConfiguration`, `alertConfigurations[]`, `AlertConfigurationResolver`,
`AlertEvaluationEngine`, `PeriodicEvaluationStrategy`, `AlertTemporalState`, Form Engine,
Document Engine, Persistence, `AlertMonitoringExperience`, Dashboard ni Alert Center.

Estado objetivo: **ALERT OCCURRENCE CONTRACT DESIGNED — LIFECYCLE & COMPLETION MODEL CERTIFIED**.

---

## 1. Objetivo

Diseñar formalmente el contrato de ocurrencia de Alertas identificado como **GAP en Sprint 255**,
respondiendo de forma definitiva:

- ¿Qué es una ocurrencia y cómo se identifica?
- ¿De qué config nace y qué recurso debe cumplirla?
- ¿Cómo se calculan `startsAt` / `dueAt` y cómo nace la siguiente ocurrencia?
- ¿Qué estados son persistentes vs derivados?
- ¿Cómo se determina que una ocurrencia fue cumplida y con qué evento?
- ¿Cómo evitar doble cumplimiento (idempotencia) y cómo manejar concurrencia?
- ¿Cómo se maneja timezone?
- ¿Cómo se relaciona con formularías/registros/documentos y con el Runtime existente?
- ¿Cómo se consumirá por el módulo de experiencias y por el futuro Global Alert Center?
- ¿Cómo preservar compatibilidad con alertas existentes y escalar sin segunda plataforma?

## 2. Principio arquitectónico obligatorio — REUSE BEFORE CREATE

El contrato se construye sobre la infraestructura existente. **Prohibición**: NO puede terminar con

```
Alert Runtime + Occurrence Runtime + Alert Center Runtime
```

Debe existir **un solo dominio de Alertas**; el Alert Center es otro *consumidor*, jamás otro motor.

```
Alert Configuration → Existing Resolver → Existing Runtime → Existing Evaluation →
        Occurrence Contract (Temporal State · Completion State · Resource Binding) →
        Existing Runtime Consumption → Module Alert Monitoring | Global Alert Center
```

## 3. Definición conceptual oficial

Se certifica la separación de responsabilidades:

```
ALERT CONFIGURATION  ≠  ALERT OCCURRENCE  ≠  RESOURCE  ≠  COMPLETION EVENT
```

- **Alert Configuration**: qué debe hacerse y bajo qué reglas (formulario, periodicidad, prioridad,
  automaticClose). La config puede generar **múltiples ocurrencias**.
- **Alert Occurrence**: instancia temporal concreta de esa alerta para un período específico
  (alerta `Control de temperatura`, ocurrencia `2026-08-07`, `startsAt 00:00`, `dueAt 23:59`,
  `status PENDING` → al completarse `COMPLETED`; la siguiente será `2026-08-08`).

## 4. Identidad de la ocurrencia

Se certifica: **`alertId !== occurrenceId`**.

- `alertId` identifica la **configuración**.
- `occurrenceId` identifica una **instancia única** de esa configuración.

```
AlertConfiguration  id = ALERT-001
Occurrence          id = OCC-001, alertId = ALERT-001
   ALERT-001 → OCC-001 · OCC-002 · OCC-003 · …
```

Cada ocurrencia **no** se convierte en una nueva alerta.

## 5. Contrato conceptual de Occurrence (diseño, no implementación)

```
Occurrence
├── occurrenceId
├── alertId
├── resourceKind
├── resourceId
├── moduleId
├── startsAt
├── dueAt
├── timezone
├── sequence
├── status
├── completion
└── createdAt
```

## 6. Resource Binding

El recurso se identifica con el triple **`resourceKind + resourceId + moduleId`** (ya derivable en el
sistema actual), manteniendo el sistema metadata-driven, runtime-driven y module-agnostic:

| resourceKind | resourceId | moduleId | Ejemplo |
|---|---|---|---|
| `dynamicForms` | form slug | módulo | Formulario de temperatura |
| `dynamicRecords` | id reg. | módulo | Registro operacional |
| `documentRepository` | doc id | módulo | Documento del repositorio |

## 7. Modelo temporal

```
Configuration → Schedule → Occurrence #N → Completion → Occurrence #N+1
```

- **startsAt** — inicio de la ocurrencia (diario: `2026-08-07 00:00`).
- **dueAt** — límite temporal (diario: `2026-08-07 23:59:59`). La implementación definiré
  exactamente si el límite es **inclusive** o **exclusive** (frontera: evitar que `23:59:59` cree
  ambigüedad).

## 8. Reutilización de `computeTarget`

Se certifica: **NO crear otro algoritmo de scheduling.** `parseAnchor()` + `computeTarget()`
(Sprint 237, hoy en presentación) es el punto de partida; debe **elevarse** de
"presentation-only scheduling" a "domain scheduling contract" **sin duplicación** (Diseño 256-10).

## 9. Estados de Occurrence

### 9.1 Persistentes
- `COMPLETED`
- `CANCELLED` (opcional, no necesariamente en la primera implementación)

### 9.2 Derivados (NO persistir; se calculan de `startsAt/dueAt/completion/now`)
- `PENDING`, `TODAY`, `UPCOMING`, `OVERDUE`, `ACTIVE`

## 10. Regla fundamental de clasificación

Una ocurrencia completada **nunca** reaparece como pendiente temporal:

```text
if completion === COMPLETED → COMPLETED
else if now > dueAt         → OVERDUE
else if now >= startsAt ∧ now <= dueAt → TODAY
else if startsAt > now      → UPCOMING
else                        → ACTIVE
```

La implementación adapta esta regla al ViewModel existente **sin crear un clasificador paralelo**.

## 11. Frecuencia diaria

`Periodicidad = 1 día` genera: `07/08→OCC-001, 08/08→OCC-002, 09/08→OCC-003, 10/08→OCC-004`.

Si el usuario completa `OCC-001`:
- `07/08 → COMPLETED`, `08/08 → UPCOMING/TODAY`.
- **Prohibido**: `07/08 → OVERDUE` después de completarlo correctamente.

## 12. Frecuencias superiores

El mismo contrato cubre `hours | days | weeks | months | years | once`. Mensual:

- `ALERT-100 → OCC-001(ago) → OCC-002(sep) → OCC-003(oct) → OCC-004(nov)`.
- **Prohibido**: `ALERT-100-AUG/SEP/OCT`. La configuración continúa siendo única.

## 13. Completion Contract

Se certifica: **`RECORD_CREATED ≠ COMPLETED`**. Crear un registro no implica final del proceso.
El cumplimiento proviene de una señal semántica de finalización:

```
Operational Resource → Completion Signal → Alert Occurrence → COMPLETED
```

## 14. Completion Event (diseño, no implementación)

Se diseña una señal genérica (ej. `RESOURCE_COMPLETED`) con suficiente info para identificar
`resourceKind/resourceId/moduleId` y resolver el matching con la occurrence. El evento es
**operacional genérico**, no contiene lógica de Alertas.

## 15. Matching

Una `Completion Event` se empareja con la occurrence respetando la ventana temporal
(`startsAt..dueAt`). No basta "existe un registro"; se exige "existe una presentación válida para
**esta** ocurrencia" (`resourceKind + resourceId + moduleId + ventana`).

## 16. Idempotencia

Requisito: una occurrence **no puede completarse dos veces**. Identidad lógica de la operación:
`occurrenceId + completion` (ej. `OCC-001 + COMPLETED` → única transición válida).

## 17. Concurrencia

La UI nunca es la autoridad final:

```
Incorrecto: UI → setCompleted(true)
Correcto:    Completion Event → Application/Domain processing → Occurrence State
```

La protección de concurrencia vive en la capa de aplicación/persistencia perteneciente.

## 18. Timezone

El contrato futuro **debe declarar timezone explícitamente** (especialmente `daily/weekly/monthly`,
pues `00:00` depende de zona). Se evita que `23:59 Colombia` se lea como `00:59 UTC`. La timezone es
propiedad explícita del modelo temporal o política SSOT definida.

## 19. automaticClose

Semántica reutilizada: `automaticClose === true` → cuando el recurso satisface el criterio de
cumplimiento la occurrence puede pasar automáticamente a `COMPLETED`. **No se modifica la metadata**.
No se crean `autoCloseV2` ni `completionPolicy` sin justificación posterior.

## 20. Compatibilidad hacia atrás

```
Existing Alert Configuration → Occurrence Adapter → Initial Occurrence
```

La migración conceptual no reconstruye alertas; `AlertConfiguration` sigue siendo **SSOT**.

## 21. Runtime Integration

```
Existing Alert Runtime → { Configuration | Evaluation | Temporal State | Occurrence } → Existing Consumption
```

**Reuse**: `AlertEvaluationEngine`, `evaluateAlertSet`, `PeriodicEvaluationStrategy`,
`AlertTemporalState`, `AlertConfigurationResolver`, `AlertConsumptionMapper`,
`AlertFormRuntimeAdapter`, `AlertRecordRuntimeAdapter`, `AlertDocumentRuntimeAdapter`.

**Extend**: estrategia de ocurrencia; temporal state cuando corresponda; ViewModel; clasificación.

**Create (post-propuesta)**: estado persistente de ocurrencias; señal genérica de completion;
almacenamiento de ese estado; vista global de Alertas.

## 22. Module Alert Monitoring

```
AlertMonitoringExperience → Existing ViewModel → Vencidas | Hoy | Próximas | Activas | Cumplidas
```

La categoría **Cumplidas** representa **ocurrencias**, no configuraciones completas.

## 23. Global Alert Center (contrato conceptual)

La campana del Dashboard será la entrada al Alert Center. **Sin motor propio**:

```
Global Alert Center → Existing Alert Runtime/ViewModel → All Modules
```

- **Fila global mínima**: `module | alert | occurrence | resource | frequency | priority | startsAt | dueAt | status | completion`.
- **Filtros futuros**: Módulo, Estado, Fecha, Prioridad, Frecuencia, Tipo de recurso; luego búsqueda.
- **Navegación**: desacoplada vía `ExistingModuleRouteResolver`
  (`Global → Occurrence → Resource → Form | Record | Document`). Sin rutas por módulo.

## 24. Modelo arquitectónico final certificado

```
            Alert Configuration (SSOT)
                      │
                      ▼
        Existing Runtime / Resolver / Evaluation
                      │
                      ▼
                  Schedule (anchor + periodicity)
                      │
                      ▼
                   Occurrence #N
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   Temporal State          Completion Signal
          │                       │
          └──────────┬────────────┘
                     ▼
          Occurrence State (COMPLETED / derived)
                     │
            ┌────────┴────────┐
            ▼                 ▼
    Module Monitoring   Global Alert Center
```

## 25. Matriz REUSE / EXTEND / CREATE

| Componente | Decisión |
|---|---|
| Alert Configuration | REUSE |
| Alert Configuration Resolver | REUSE |
| Alert Evaluation Engine | REUSE |
| Periodic Evaluation | EXTEND |
| Occurrence Evaluation Strategy | EXTEND |
| Alert Temporal State | REUSE + EXTEND |
| `computeTarget` scheduling | REUSE / ELEVAR |
| Runtime Adapters | REUSE + EXTEND |
| Form Engine | REUSE |
| Document Engine | REUSE |
| Operational Event Bus | REUSE + EXTEND |
| Completion Signal | CREATE |
| Occurrence State | CREATE |
| Persistence de Occurrence | CREATE |
| AlertMonitoringExperience | REUSE + EXTEND |
| Global Alert Center | CREATE — Presentation only |
| Navigation Resolver | REUSE |
| Dashboard | EXTEND posteriormente |
| Second Alert Runtime / Engine / Store | **PROHIBIDO** |

## 26. Decisiones certificadas (DEC-256)

| ID | Decisión |
|---|---|
| DEC-256-01 | Alert Configuration ≠ Alert Occurrence. |
| DEC-256-02 | Una configuración genera N ocurrencias. |
| DEC-256-03 | `occurrenceId` es obligatorio para identificar una ocurrencia. |
| DEC-256-04 | `overdue`, `today`, `upcoming` y `active` son estados derivados. |
| DEC-256-05 | `completed` es estado persistente. |
| DEC-256-06 | `RECORD_CREATED` no significa cumplimiento. |
| DEC-256-07 | El cumplimiento se origina de una señal operacional semánticamente correcta. |
| DEC-256-08 | El recurso se identifica por `resourceKind + resourceId + moduleId`. |
| DEC-256-09 | `automaticClose` se reutiliza. |
| DEC-256-10 | El scheduling existente no se duplica (`parseAnchor`/`computeTarget`). |
| DEC-256-11 | El Global Alert Center es consumidor del mismo Runtime. |
| DEC-256-12 | No existe un segundo motor (el Alert Center no es un motor). |
| DEC-256-13 | La configuración continúa siendo SSOT. |
| DEC-256-14 | Timezone debe ser explícito antes de implementar el modelo diario definitivo. |

## 27. Definition of Done

**Contrato** — ✅ `occurrenceId` definido · ✅ relación occurrence→alert definida ·
✅ relación occurrence→resource definida · ✅ `resourceKind/resourceId/moduleId` reutilizados ·
✅ `startsAt`/`dueAt` definidos · ✅ timezone requerido · ✅ `sequence` definido conceptualmente.

**Lifecycle** — ✅ estados persistentes definidos · ✅ estados derivados definidos ·
✅ `COMPLETED` separado de `OVERDUE` · ✅ siguiente ocurrencia definida · ✅ frecuencia diaria definida ·
✅ frecuencia mensual/anual definida.

**Completion** — ✅ `RECORD_CREATED ≠ COMPLETED` · ✅ Completion Signal diseñado · ✅ matching
diseñado · ✅ idempotencia requerida · ✅ concurrencia requerida.

**Runtime** — ✅ Runtime existente reutilizado · ✅ Evaluation extendida · ✅ Temporal State reutilizado ·
✅ `computeTarget` reutilizado · ✅ Resolver reutilizado · ✅ Mapper reutilizado.

**Cross-module** — ✅ modelo multi-módulo · ✅ Global Alert Center definido conceptualmente ·
✅ filtros definidos · ✅ navegación definida · ✅ mismo contrato para módulo y global.

**Arquitectura** — ✅ SSOT preservado · ✅ metadata-driven · ✅ runtime-driven · ✅ sin segundo Runtime ·
✅ sin segundo Engine · ✅ sin Store · ✅ **sin cambios de código**.

## 28. Estado final

```
SPRINT 256 — ALERT OCCURRENCE CONTRACT & LIFECYCLE DESIGN CERTIFIED

Alert ≠ Occurrence    | Configuration = SSOT            | Occurrence = instancia temporal
Completion = señal operacional explícita | Temporal states = derivados | Completion = persistente
Runtime = reutilizado | Scheduling = reutilizado (no duplicado)
Module Monitoring = consumer existente + extensión
Global Alert Center = consumidor futuro, sin segundo motor
Cross-module = metadata/runtime-driven | Timezone = requisito explícito del contrato
ARCHITECTURE READY FOR IMPLEMENTATION
```

**Certificación de Sprint 256: ALERT OCCURRENCE CONTRACT & LIFECYCLE DESIGN CERTIFIED
(design-only, sin cambios de código). → Sprint 257 implementará el contrato siguiendo esta matriz.**