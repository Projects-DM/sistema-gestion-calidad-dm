# Sprint 254 — Alert Scheduling Lifecycle & Completion State Audit

> Nivel 5 · Auditoría de ciclo de vida de programación · Estado de completitud · Auditoría del modelo de ocurrencias

## Tipo
Auditoría · Documentación técnica (audit-only) · Sin cambios de código

**Impacto: exclusivamente documental.** Este sprint NO crea tablas, columnas, estrategias de
evaluación, servicios, contratos, capturadores, ni modifica Metadata, Runtime, Persistence,
Dynamic Runtime, Form Engine, Document Engine, Alert Engine, Notification Engine, Application
Services, Resolver, Mapper, Providers, Contracts, ni el modelo de datos. Estado esperado:
**ALERT SCHEDULING LIFECYCLE AUDITED — Occurrence-to-Completion Certified Gap (Path B)**.

---

## 1. Objetivo

Certificar el ciclo de vida de la programación de Alertas a partir de la lectura directa de las
fuentes (sin modificar código ni crear pruebas sintéticas): de dónde nace la *fecha de inicio*,
cuáles son los *anclajes temporales*, cómo se clasifican *Hoy / Próximas / Vencidas / Activas*, y —
lo más decisivo— si existe una **identidad de ocurrencia** que permita declarar que un alerta
*queda cumplida* tras un número de formularios/registros/documentos presentados. La conclusión
certificada es que **ese vínculo ocurrencia→completitud NO es resoluble bajo el contrato actual**,
por lo que la mejora esperada no puede implementarse en la capa de presentación.

## 2. Evidencia de fuentes (leída, no inferida)

### 2.1 Origen de `startDate` / `startTime`
- `src/modules/experiences/AlertConfigurationForm.jsx:7-34` — el formulario declara explícitamente que
  `name`, `description`, `startDate`, `startTime` **son identificadores presentacionales**
  ("presentational identifiers") ignorados por el Mapper/Validation certificado (las llaves extra
  nunca rompen el contrato canónico de 9 campos).
- `src/modules/experiences/AlertConfigurationPanel.jsx:130-158` — un alerta nuevo se siembra desde el
  config activo `{...base, name: '', description: ''}`. **No existe ningún default `today 00:00`**;
  `startDate`/`startTime` quedan vacíos por defecto y no se persisten.

### 2.2 Anclajes temporales y `due`
- `src/core/capabilities/alert/evaluation/AlertTemporalState.js` — `TEMPORAL_STATE_KEYS` (6 claves):
  `baseDate`, `period`, `nextDue`, `remaining`, `elapsed`, `overdue`.
- `src/core/capabilities/alert/evaluation/PeriodicEvaluationStrategy.js`:
  - `baseDate = runtimeContext.lastExecution ?? runtimeContext.createdAt`;
  - `period = durationToMs(periodicity)`;
  - `nextDue = baseDate + period`;
  - `overdue = now > nextDue`.
  Es decir, la fecha objetivo se deriva de la **creación (o última ejecución)**, NO de un
  `startDate` de config y NO de una ocurrencia. (Unidades: `months = 30 días`, `years = 365 días`.)

### 2.3 Clasificación operativa (UI)
- `src/modules/experiences/AlertMonitoringExperience.jsx:144-155` — `derivedState(enabled, remainingMs)`:
  - `remainingMs < 0` → `overdue` (Vencida);
  - `remainingMs <= 8.64e7` (**24 h**) → `today` (Hoy);
  - `remainingMs <= 2.592e8` (**72 h**) → `upcoming` (Próximas);
  - resto → `active` (Activa);
  - `enabled === false` → `disabled` (Deshabilitada).
- `:60-64` — jerarquía oficial de grupos: `Vencidas → Hoy → Próximas → Activas → Deshabilitadas`.
- Nota UX: "Hoy" es una **ventana de 24 h** (no el día calendario), por lo que a las 23:00 una alerta
  programada dentro de la misma jornada ya aparece como "Vencida".

### 2.4 Estado de completitud / ocurrencia
- `src/core/capabilities/alert/operational-configuration/AlertConfigurationMetadata.js:97-99` —
  existe `automaticClose` como **booleano de intención** ("Auto-close the alert when the resource is
  fulfilled") sin mecanismo que una un recurso a una ocurrencia.
- `src/core/capabilities/alert/operational-flow/AlertFlowResult.js:23` — `pipelineStatus: 'completed'`
  es un estado interno del pipeline (análisis), no un registro de ocurrencia.
- `src/core/capabilities/alert/runtime-consumption/AlertFormRuntimeAdapter.js:46-98` — el adapter
  consume SOLO `{ descriptor, evaluation }` y produce un contexto `{ status, severity, remaining,
  overdue, nextDue, … }`. **No** conoce las presentaciones realizadas, **no** direccionan un formulario
  / registro / documento a una ocurrencia y **no** gestiona un contador de completitud.
- Búsqueda sobre todo `src/core/capabilities/alert` de `completed|fulfilled|occurrence|nextOccurrence`
  NO encontró ninguna identidad de ocurrencia (solo `automaticClose` y `pipelineStatus:'completed'`).

## 3. Gaps certificados

| Clave | Pregunta | Respuesta certificada |
|---|---|---|
| A | ¿`startDate`/`startTime` persisten y definen el inicio? | NO. Son presentativos, vacíos por defecto, ignorados por el Mapper. |
| B | ¿De dónde viene la fecha objetivo? | `createdAt` (o última ejecución), vía `PeriodicEvaluationStrategy`. |
| C | ¿Clasificación Hoy/Próximas/Vencidas/Activas? | SÍ, por ventanas de `remainingMs` (24 h / 72 h / resto), no por día calendario. |
| D | ¿Existe identidad de ocurrencia (ocurrenceId)? | NO. |
| E | ¿Existe señal de completitud por recurso/ocurrencia? | NO. Solo `automaticClose` (intención) sin mecanismo. |
| F | Un alerta puede "cumplirse" al presentar N registros | NO observable ni modelable bajo el contrato actual. |
| G | ¿Se puede resolver en la capa de presentación? | NO. Requiere contrato de arquitectura (feo. DSGN) + engine + persistencia. |

## 4. Conclusión (Veredicto de auditoría)

**La asociación ocurrencia→completitud NO es resoluble en la capa de presentación.** El modelo
certificado de la capacidade de alertas no mantiene un registro de ocurrencias ni recibe una señal de
cumplimiento proveniente de Formularios/Registros/Documentos. No existe forma de declarar
programáticamente que un alerta "quedó cumplida" tras N presentaciones.

Por tanto, la mejora que se esperaba no puede implementarse como un cambio de UI únicamente
(Path B preliminar → **contrato de arquitectura primero**). El siguiente Sprint certificará directamente
el nuevo contrato de ocurrencia (definición de identidad de ocurrencia vinculada a un
recurso/proveedor y a un evento de presentación, con estado por-ocurrencia y regeneración de
`createdAt`-base siguientes), antes de cualquier trabajo de presentación.

## 5. Definition of Done (documentado; sin cambios de código)
✅ Auditados todas las acciones de programación (2.1-2.4) desde fuentes, sin inferencia.
✅ Identificada la ausencia de identidad de ocurrencia y de señal de completitud.
✅ Documentada la clasificación Hoy/Próximas/Vencidas/Activas con ventanas exactas.
✅ Documentada la derivación `baseDate`/`nextDue`/`overdue` desde `createdAt`/`lastExecution`.
✅ Documentada la no-persistencia de `startDate`/`startTime` (identificadores presentativos).
✅ Documentado el Camino B de arquitectura (contrato de ocurrencia) como requisito previo.
✅ Zero cambios de código (audit-only). Árbol limpio.
✅ Suite de auditoría de meta `ALS-1…ALS-24` (espectros: modelos a blockmap).

## 6. Certificación / estado final
Scheduling lifecycle auditado · Origen de fecha certificado · Clasificación operativa certificada ·
Ventanas de tiempo certificadas · Persistencia de `startDate` certificada· **ausencias de identidad de
ocurrencia certificada** · **ausencia de señal de completitud certificada** · Camino de arquitectura
requerido certificado · sin cambios de código · documentación audit-only ·
**ALERT SCHEDULING LIFECYCLE AUDITED — OCCURRENCE-TO-COMPLETION GAP CERTIFIED**. Since the model
only supports temporal scheduling (createdAt-based), any future work on per-occurrence completion must
be introduced as an architecture contract (edge-case B) and then engine + persistence, before UI.