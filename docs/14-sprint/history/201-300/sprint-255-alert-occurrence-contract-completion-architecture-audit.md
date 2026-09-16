# Sprint 255 — Alert Occurrence Contract & Completion Architecture Audit

> Nivel 5 · Auditoría arquitectónica · Contrato de ocurrencias · Completitud · Integración transversal

## Tipo
Architecture Audit · Domain Contract Analysis · Runtime Integration Audit · Cross-Module Alert Architecture

**Impacto: AUDITORÍA EXCLUSIVA — SIN CAMBIOS DE CÓDIGO.**

No modifica implementación, Runtime, Persistencia, Metadata, Dynamic Runtime, Form Engine, Document
Engine, Alert Engine, Notification Engine, Application Services, Resolver, Mapper, Providers,
Contratos ni componentes de Presentation.

Estado esperado: **ALERT OCCURRENCE ARCHITECTURE AUDITED — CROSS-MODULE COMPLETION CONTRACT DEFINED**.

---

## 1. Objetivo

Auditar — leyendo exclusivamente las fuentes, sin escribir código — cómo la programación temporal
actual de Alertas puede evolucionar hacia un modelo de **ocurrencias individuales**: una alerta
configurada, sus ocurrencias, el período temporal y el estado de cada una, su cumplimiento, el recurso
que las cumple, el registro/documento/formulario asociado, la siguiente ocurrencia, y su consumo tanto
a nivel módulo como global (futuro Alert Center). **No se crea el contrato ni se implementa.**

Principio rector: **REUTILIZAR ANTES DE CREAR.** No se generará una segunda plataforma de alertas; se
evoluciona la capacidad existente:

```
Alert Configuration → Existing Alert Runtime → Evaluation →
        [NUEVO] Occurrence Contract → Completion/Fulfillment → Existing Runtime Consumption →
            Module Monitoring → Global Alert Center
```

---

## 2. Evidencia de fuentes (leída, no inferida)

| Área | Fuente | Hallazgo certificado |
|---|---|---|
| Contrato de configuración | `operational-configuration/AlertConfiguration.js` | `AlertConfiguration` = VO canónico de **9 campos** `[enabled, periodicity, expiration, risk, priority, notification, gracePeriod, automaticClose, repeatPolicy]`. `createAlertConfiguration` **descarta cualquier campo extra** (incluido `startDate`/`startTime`). |
| Metadata | `AlertConfigurationMetadata.js` | `PERIODICITY_UNITS = hours|days|weeks|months|years|once`; `REPEAT_POLICIES = repeat|once`; `resourceKinds = dynamicForms|dynamicRecords|documentRepository`; `automaticClose` = "Auto-close the alert when the resource is fulfilled." |
| Defaults | `DefaultAlertConfigurationProvider.js` | `periodicity: null`, `expiration: 'none'`, `automaticClose: true`, `repeatPolicy: 'repeat'`, `risk.relative`. |
| Eval temporal | `evaluation/PeriodicEvaluationStrategy.js` | `baseDate = runtimeContext.lastExecution ?? runtimeContext.createdAt`; `nextDue = baseDate + period`; `overdue = now > nextDue`. `months=30d`, `years=365d`. **La familia `OccurrenceEvaluationStrategy` aparece como RESERVADA/futura** en `PeriodicEvaluationStrategyContract` (con `FixedDate/Calendar/OperationHours/Manual`): el punto de extensión del Engine ya está previsto. |
| Programación (en la UI) | `modules/experiences/AlertMonitoringExperience.jsx` (líneas 82-114) | Ya existe la proyección determinista de la **próxima ocurrencia**: `anchor = startDate+startTime` (metadato **en bruto**, no el VO) y `computeTarget = anchor + Math.ceil((now-anchor)/cadence)*cadence` (cadence en ms). Documentado como "read-only, never persisted, never consumed by the Engine" (líneas 75-80). |
| Clasificación | `AlertMonitoringExperience.jsx:144-155` | `derivedState(enabled, remainingMs)`: `remainingMs<0`→Vencida; `<=24h`→Hoy; `<=72h`→Próximas; resto→Activa; `enabled===false`→Deshabilitada. **No existe bucket "Cumplida".** |
| Formularios / registros | `experiences/OperationalExperienceLifecycleOrchestrator.js` | `createRecord`→`insert` (id UUID; `displayId REC-…`). Eventos: `RECORD_CREATED/UPDATED/DELETED` (con `recordId`); batch (`RECORDS_*`) con **solo `count`** (sin ids). Estado persistido del recurso: `pendiente | en_proceso | completado | approved | cerrado`. **No hay `submitted`/`finalized` por creación; `completado` solo vía `bulkUpdateStatus`.** |
| Documentos | `services/documentsService.js`, `services/documentRepositoriesService.js` | `uploadRecord` insert directo a `sgc_records` (id UUID). **Sin event bus, sin máquina de estados, sin eventos created/completed.** |
| Bus de eventos | `OperationalEventBus.js` | Único bus app-level: publica `RECORD_CREATED` (con `recordId`). No hay evento documental. |
| Consumo runtime | `runtime-consumption/{AlertForm,AlertRecord,AlertDocument}RuntimeAdapter.js` | Cada adaptador consume `{ descriptor, evaluation }` → contexto único `{status/severity/remaining/overdue/nextDue}`. **No conocen presentaciones ni ocurrencias; no marcan completitud.** |
| Recurso en Resolver | `operational-configuration/AlertConfigurationResolver.js` | `resourceId = resource.slug ?? formSlug ?? id ?? documentId`; `source`/`moduleSlug` por cubeta (`forms`/`repositories`); los descriptores de `resolveOperationalConfiguration` ya exponen `formId`/`documentId`. |
| Navegación | `core/navigation/ExistingModuleRouteResolver.js` | Única puerta: `resolveActionRoute('open-form'|'open-record'|'go-to-document')`; documentos abren por `navigationContext` en `location.state` (nunca directo). |
| Shell / alerta global | `layouts/DashboardLayout.jsx:251-254` y `src/App.jsx` | El botón de la campana **no existe como funcional**: sin `onClick`, sin ruta, sin componente `AlertCenter`. `AlertMonitoringExperience` es una `operational experience` (`alert-monitoring`) con `executionEnabled:false`, **no ruteada** como página. |

---

## 3. Matriz de certificación OCC

Leyenda: **PASS** (existe / reutilizable) · **GAP** (ausencia que exige diseño) · **REUSE/EXTEND/CREATE** (decisión de evolución).

| ID | Área | Veredicto | Dictamen certificado |
|---|---|---|---|
| OCC-01 | Identidad de la ocurrencia | **GAP** | No existe `occurrenceId` ni identidad de ocurrencia. `id`/`alertKey` identifica la **alerta (config)**, NO la ocurrencia. Una alerta con periodicidad = múltiples ocurrencias sobre la misma config. Mantener separado `Alert ≠ Occurrence`. |
| OCC-02 | Ciclo de vida | **GAP** | No hay estado de ocurrencia. `OVERDUE` es un **estado derivado** de `now > dueAt`, no persistente. Solo `COMPLETED` (y opcionalmente `CANCELLED`) deben ser persistentes; `PENDING/DUE/TODAY/UPCOMING/OVERDUE` son derivados. No almacenar derivados. |
| OCC-03 | Programación | **GAP (parc.)** | `startDate/startTime/periodicity` viven solo en el metadato en bruto (lecto por la UI), fuera del VO canónico de 9 campos. La proyección de siguiente ocurrencia (`computeTarget`) ya existe y debe REUSArse (elevarse a dominio), no duplicarse. La decisión entre "primera ocurrencia, luego next tras cumplimiento" y "generación anticipada" debe quedar fundamentada. |
| OCC-04 | Frecuencia diaria | **GAP** | La proyección avanza por día, pero al no existir registro de ocurrencias, completar el 07/08 no "libera" el 08/08; el estado derivado sigue marcando pendiente. Se requiere `occurrence` persistente con `.completion`. |
| OCC-05 | Frecuencias superiores | **GAP** | Semanal/mensual/anual es análogo al caso diario, afectado por la misma carencia. Una alerta mensual debe ser **una alerta con una ocurrencia por mes**, no una colección de alertas independientes ni un único derivado continuo. |
| OCC-06 | Evento de cumplimiento | **GAP** | `RECORD_CREATED` **NO** es cumplimiento (es "saved", no "submitted/finalized"). El recurso sí tiene lifecycle (`completado`/`approved`/`cerrado`) pero (a) solo bulk, (b) sin `recordId` en el evento batch, (c) no conectado a Alert. Documentos no emiten evento. |
| OCC-07 | Relación Alerta→Recurso | **GAP (parc.)** | La alerta conoce el recurso **solo** vía `moduleSlug`/`resourceId`/`documentId` del descriptor. No hay vínculo genético a un "operational resource". Debe modelarse un identificador de recurso genérico. |
| OCC-08 | Contrato de recurso genérico | **REUSE** | `resourceKinds` (dynamicForms/dynamicRecords/documentRepository) + `resourceId` (slug/id/documentId) + `moduleId` (slug) **ya derivables** desde los campos existentes. El triple `{resourceKind, resourceId, moduleId}` no exige un contrato nuevo. |
| OCC-09 | Cumplimiento por recurso | **GAP** | Sin identidad de ocurrencia y sin señal per-record no hay `expected vs submitted` que matchear. El matching debe usar `{resourceKind, resourceId, moduleId} + período/ocurrencia`. Hoy no hay nada que lo impida, no hay lógica. |
| OCC-10 | `automaticClose` | **GAP (intención)** | Existe en metadata, **default `true`**, significado "auto-close when fulfilled", pero **no lo consume ningún motor** y no gestiona el cumplimiento real. Es la semántica a reutilizar. **No se elimina ni se cambia durante la auditoría.** |
| OCC-11 | AlertMonitoringExperience | **EXTEND** | Consume el ViewModel (`AlertCapability.workspace()`); evoluciona añadiendo el bucket `Cumplidas` y lectura de `occurrence.completion`. No duplicar la evaluación temporal. |
| OCC-12 | Clasificación operacional | **GAP** | Persistentes: `COMPLETED`, `CANCELLED`. Derivados: `TODAY/UPCOMING/OVERDUE/ACTIVA` (ventanas de `remainingMs`, no día calendario). Falta bucket CUMPLIDAS. Hoy no hay separación persistente/derivada. |
| OCC-13 | Vista global | **GAP (requiere)** | No hay ruta ni componente. El Alert Center debe consumir **el mismo contrato** que el módulo (`useAlertRuntime`/Resolver + `OperationalEventBus`), no reconstruir por módulo. |
| OCC-14 | Agregación cross-module | **GAP (parc.)** | Hoy lectura por módulo (`moduleSlug`). Para una vista global se requiere cruzar múltiples recursos; datos derivables `moduleId/moduleName/alertId/alertName/resourceKind/resourceId/status/startsAt/dueAt` + `occurrenceId` (futuro). Sin `occurrenceId` no hay agregación por ocurrencia. |
| OCC-15 | Filtros globales | **PASS** | Estado derivado, módulo, tipo de recurso, fecha, prioridad (`priority`), canal (`notification.channel`), frecuencia (`periodicity`) **están disponibles** en metadata/config. Debe ser metadata/runtime-driven (sin `if module ===`). |
| OCC-16 | Reutilización del Runtime | **REUSE+EXTEND** | Runtime→**REUSE** (`evaluateAlertSet`); Evaluation→**EXTEND** (familia `Occurrence` ya reservada); Temporal State→**REUSE**; Persistence(config)→**REUSE** (`alertConfigurations[]`); Monitoring→**EXTEND**; Global Center→**NEW(view, sin motor)**. Solo ocurrencia+completitud+evento es genuinamente nuevo. |
| OCC-17 | Persistencia | **GAP (nueva, separada)** | `alertConfigurations[]` (metadato `alert_config`) **debe seguir siendo la configuración**. Si se quiere estado de ocurrencia, debe ir a **una capa de estado de ocurrencia separada** para que la config no se convierta en histórico. **No se crea tabla este sprint.** |
| OCC-18 | SSOT | **PASS** | `AlertConfigurationResolver` es la única autorizada de lectura de metadata; VO canónico 9 campos; `resolveResourceAlertCollection` backward-compatible. La ocurrencia es una **representación derivada de la config**, no una segunda fuente. Se preserva. |
| OCC-19 | Formulario dinámico | **GAP→EXTEND** | Existen `experienceId` (form) + `recordId` (UUID) + `moduleId`. `RECORD_CREATED` es ancla, pero la completitud requiere un evento de cumplimiento per-record (el `estado` ya existe; el evento batch no lleva `recordId`). **Form Engine intacto.** |
| OCC-20 | Repositorio documental | **GAP→DECOUPLE** | Document Engine **no emite eventos**. La integración debe ser desacoplada (el engine emite un evento genérico; Alert escucha). No crear lógica de alertas dentro del repositorio. |
| OCC-21 | Idempotencia | **GAP** | Cada save = `insert` = nuevo `recordId` (sin deduplicación). Sin guardia: doble clic/refresco ⇒ registros duplicados. Para `COMPLETED` se requiere clave compuesta única `occurrenceId + completion`. |
| OCC-22 | Concurrencia | **GAP** | Último-escritura-gana en Supabase. La UI **no** puede ser la autoridad; el estado de ocurrencia debe protegerse a nivel de servicio/persistencia (clave única, protección atómica). |
| OCC-23 | Fecha/hora y timezone | **GAP** | Fechas en `Date` local + `_createdAt` en UTC (`toISOString`). Sin timezone explícito, una ocurrencia diaria es ambigua en los límites de día (00:00/00:01/23:59). Exige contrato de timezone antes de un "día calendario" global. |
| OCC-24 | Modelo temporal | **GAP→EXTEND** | La propuesta `config → schedule → occurrence #N → status →next` se valida en parte con el código existente; `schedule→occurrence` y `COMPLETED` son nuevos; `startsAt/dueAt/status` derivables. No duplicar `computeTarget` (reusar). |
| OCC-25 | Global Alert Center | **GAP (requiere)** | Requisitos: Vencidas/Hoy/Próximas/Activas/**Cumplidas**; filtrar por módulo/estado/fecha/recurso; buscar; abrir recurso. Consume **el mismo motor**, sin un segundo centro de alertas. |
| OCC-26 | Navegación al origen | **PASS** | `resolveActionRoute` + `location.state.navigationContext` ya permiten Global→Module→Alert→Resource (form/record/document) sin rutas directos. Falta contextualizar la ocurrencia concreta. |
| OCC-27 | Compatibilidad hacia atrás | **PASS (parc.)** | `resolveResourceAlertCollection` ya es backward-compatible (config simple → colección de 1; `source: metadata|default`). Migración conceptual: config existente → `occurrence inicial` derivada del anchor `start`/`createdAt`. No rompe runtime/monitoreo/persistencia. |
| OCC-28 | Escalabilidad | **GAP (parc.)** | Un modelo derivado/filtrable es viable, pero hoy se requeriría 1 consulta/recurso/módulo (no hay fuente agregada). Para 1000+ alertas hay que agregar una consulta indexable/agregada en la capa de persistencia (futuro). |

---

## 4. Principio rector y restricciones absolutas

**REUTILIZAR ANTES DE CREAR.** No se genera una segunda plataforma de alertas. Esta auditoría produce
el mapa; la sección 5 detalla REUSE/EXTEND/CREATE por responsabilidad.

Restricciones (invariando en Sprint 255):
- Prohibido: crear tablas/columnas; crear `OccurrenceService`/`OccurrenceEngine`/`CompletionEngine`/
  `AlertCenterV2`/`AlertRuntimeV2`; duplicar `AlertMonitoringExperience`; crear segundo Runtime;
  Context; Redux/Zustand/Store.
- Prohibido modificar: `alertConfigurations[]`, `saveCollection()`, Form Engine, Document Engine,
  Alert Engine, Notification Engine, Persistencia, Runtime.
- No convertir hipótesis de diseño en código.

---

## 5. Decisión REUSE / EXTEND / CREATE (responsabilidades futuras)

| Responsabilidad | Decisión | Justificación |
|---|---|---|
| Alert Runtime / Merodeador | **REUSE** | `AlertEvaluationEngine`, `evaluateAlert`, `RuntimeActivationCoordinator` cubren el qué evaluar. |
| Estrategia de evaluación | **EXTEND** | Abstracción `EvaluationStrategy` + `EvaluationStrategyResolver` existentes; la familia `OccurrenceEvaluationStrategy` **ya está reservada** en el contrato. Extender la familia; no duplicar el engine. |
| Temporal State | **REUSE** | `AlertTemporalState` (baseDate/period/nextDue/remaining/elapsed/from) es la base; la ocurrencia añade solo identidad + `completion`. |
| Cálculo de schedule/next | **REUSE (mover a dominio)** | `parseAnchor` + `computeTarget` (hoy en la UI) = scheduling correcto; elevarlo a la capa de dominio, sin duplicarlo. |
| Persistencia de config | **REUSE** | `alertConfigurations[]` + `AlertConfigurationResolver` + `PersistenceProvider` (config SSOT). |
| Persistencia de ocurrencia | **CREATE (contrato futuro)** | Es la única responsabilidad inexistente; pero **separada** de la configuración. No se crea en este sprint. |
| Monitoreo | **REUSE+EXTEND** | `AlertMonitoringExperience` + ViewModel; añadir bucket Cumplidas y lectura `.completion`. |
| Application Services | **REUSE** | `AlertConfigurationApplicationService` (`loadCollection`/`saveCollection`) se mantienen para config. |
| Resolver/Mapper | **REUSE** | `AlertConfigurationResolver` + `AlertConsumptionMapper`. |
| Señal de cumplimiento | **CREATE (futuro selector de evento)** | No existe un evento semánticamente correcto; introducir una señal de completitud per-occurrence (basada en el `estado`/`RECORD_*` del recurso, no en `RECORD_CREATED`). |
| Global Alert Center | **CREATE (vista-sin-motors)** | Nueva vista/contenedor que consume **el mismo contrato** que el módulo, con agregación cross-module (UI only). |

---

## 6. Definition of Done (auditoría cumplida)

**Arquitectura**
✅ alerta ≠ ocurrencia auditada · ✅ ciclo de vida de la ocurre auditada · ✅ primera & siguiente
ocurrencia auditadas · ✅ frecuencia diaria auditada · ✅ frecuencias superiores auditadas · ✅ estado de
cumplimiento auditado · ✅ relación alerta→recurso auditada · ✅ relación formulario→ocurrencia auditada ·
✅ relación documento→ocurrencia auditada · ✅ `automaticClose` auditado · ✅ idempotencia auditada ·
✅ concurrencia auditada · ✅ timezone y límites de día auditados.

**Runtime**
✅ Engine inspeccionado · ✅ Strategies/Temporal State/Resolver/Mapper/Runtime Consumption inspeccionados ·
✅ reutilización máxima documentada.

**Global Alert Center**
✅ requisitos definidos · ✅ agregación cross-module auditada · ✅ filtros identificados ·
✅ navegación concept defined · ✅ se evita arquitectura paralela.

**Escalabilidad**
✅ modelo multi-módulo auditado · ✅ metadata-driven validado · ✅ runtime-driven validado ·
✅ dependencia por módulo evitada · ✅ estrategia de agregación auditada.

**Seguridad arquitectónica**
✅ sin cambios de código · ✅ sin cambios de persistencia · ✅ sin nuevos services/engines/providers/stores ·
✅ sin modificaciones a Alert/Dynamic/Forms/Document Engines · ✅ SSOT preservado.

---

## 7. Certificación final (OCC-1 … OCC-28)

| ID | Veredicto | ID | Veredicto |
|---|---|---|---|
| OCC-01 | **GAP** | OCC-15 | **PASS** |
| OCC-02 | **GAP** | OCC-16 | **REUSE+EXTEND** |
| OCC-03 | **GAP·parc.** | OCC-17 | **GAP(s)** |
| OCC-04 | **GAP** | OCC-18 | **PASS** |
| OCC-05 | **GAP** | OCC-19 | **GAP→EXTEND** |
| OCC-06 | **GAP** | OCC-20 | **GAP→DECOUPLE** |
| OCC-07 | **GAP·parc.** | OCC-21 | **GAP** |
| OCC-08 | **REUSE** | OCC-22 | **GAP** |
| OCC-09 | **GAP** | OCC-23 | **GAP** |
| OCC-10 | **GAP·intención** | OCC-24 | **GAP→EXTEND** |
| OCC-11 | **EXTEND** | OCC-25 | **GAP (requiere)** |
| OCC-12 | **GAP** | OCC-26 | **PASS** |
| OCC-13 | **GAP** | OCC-27 | **PASS·parc.** |
| OCC-14 | **GAP·parc.** | OCC-28 | **GAP·parc.** |

Conclusión: la infraestructura existente es **reutilizable al máximo**; lo genuinamente nuevo es
mínimo y concentrado: **identidad de ocurrencia + estado de cumplimiento + señal de completitud**
(+ idempotencia/concurrencia/timezone como requisitos estructurales). No se requiere segundo Runtime
ni evaluación duplicada.

---

## 8. Continuidad — Sprint 256 (diseño del contrato)

Sprint 256 **no inicia a programar**: usará este mapa para producir el **Alert Occurrence Contract &
Lifecycle Design**, cerrando los gaps en orden:
1. `occurrenceId` (identidad separada de `alertKey`/config id). — OCC-01
2. `occurrence → { alertId, resourceKind, resourceId, moduleId }` reutilizando identificadores actuales — OCC-07/08.
3. `startsAt` / `dueAt` derivados del anchor existente (reusando `computeTarget`). — OCC-03/04/05/24
4. Estado reflexivo `COMPLETED` persistente + derivados. — OCC-02/12
5. Señal de cumplimiento correcta por recurso (estado `completado`/`approved`/cierre), desacoplada. — OCC-06/19/20
6. Clave `occurrenceId + completion` (idempotencia) y protección a nivel de servicio (concurrencia). — OCC-21/22
7. Contrato de timezone para día calendario coherente. — OCC-23
8. Fase de persistencia separada (config ≠ histórico de ocurrencias), SSOT derivada. — OCC-17/18
9. Vista módulo + vista global sobre el **mismo contrato** (bucket Cumplidas; Alert Center sin motor, agregación/filtros desde una fuente consultable). — OCC-11/13/14/15/25/26/27/28

**Certificación de Sprint 255: ALERT OCCURRENCE ARCHITECTURE AUDITED — CROSS-MODULE COMPLETION CONTRACT DEFINED (audit-only, sin cambios de código).**