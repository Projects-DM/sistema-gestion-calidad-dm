# Sprint 256-CERT — Alert Occurrence Contract & Lifecycle Design Certification

> Nivel 5 · Architecture Certification · Contract Validation · Lifecycle Certification · Runtime Governance

## Tipo
Architecture Certification · Domain Contract Certification · Lifecycle Validation · Runtime Integration
Certification · Cross-Module Governance

**Impacto: CERTIFICACIÓN EXCLUSIVAMENTE DOCUMENTAL — SIN CAMBIOS DE CÓDIGO.**

Este Sprint NO implementa el contrato diseñado en Sprint 256 y NO crea ni modifica: tablas, columnas,
persistencia, servicios, engines, providers, stores, contexts, eventos, componentes UI, rutas,
Runtime, Alert Engine, Notification Engine, Form Engine, Document Engine, Dashboard, Alert Center,
`AlertConfiguration`, `alertConfigurations[]`, `AlertConfigurationResolver` ni
`AlertMonitoringExperience`.

Estado objetivo: **ALERT OCCURRENCE CONTRACT & LIFECYCLE DESIGN — CERTIFIED FOR IMPLEMENTATION**.

---

## 1. Objetivo

Certificar formalmente el diseño de Sprint 256 verificando que el contrato de ocurrencias:

- separa **Alert Configuration** de **Alert Occurrence**;
- permite múltiples ocurrencias sobre una única configuración;
- reutiliza Runtime, Resolver, Evaluation y Temporal State existentes;
- define correctamente la relación con recursos operacionales;
- diferencia estados **persistentes** de **derivados**;
- define un mecanismo correcto de cumplimiento y **NO usa `RECORD_CREATED`** como señal de cumplimiento;
- contempla idempotencia y concurrencia;
- establece timezone como requisito explícito;
- mantiene `AlertConfiguration` como **SSOT**;
- permite evolución cross-module;
- habilita un futuro **Global Alert Center** sin segundo motor;
- mantiene compatibilidad con alertas existentes;
- fija una frontera segura para Sprint 257.

**Pregunta certificada:** ¿el diseño (Sprint 256) está suficientemente cerrado y arquitectónicamente
seguro para comenzar implementación?

## 2. Regla absoluta de certificación

Esta sprint no rediseña: **verifica**.

```
Sprint 255 (Audit) → Sprint 256 (Contract & Lifecycle Design) → 256-CERT
                                                                    ├── PASS → Sprint 257 Implementation
                                                                    └── FAIL → Design Correction
```

No se introducen decisiones nuevas. Toda inconsistencia se registra como **GAP/BLOCKER** y no se
implementa en esta Sprint.

## 3. Principio rector — REUSE BEFORE CREATE

La certificación garantiza que Sprint 257 no produzca una arquitectura paralela:

```
Alert Configuration → Existing Resolver → Existing Alert Runtime → Existing Evaluation
        → Occurrence Contract (Temporal State · Completion Signal)
        → Occurrence State → Module Monitoring | Global Alert Center
```

Prohibido: `Alert Runtime + Occurrence Runtime + Alert Center Runtime`. Debe existir
**ONE ALERT DOMAIN** con múltiples consumidores.

## 4. Fuentes contrastadas (evidencia, no inferencia)

| Área | Fuente |
|---|---|
| Configuration | `AlertConfiguration.js` |
| Metadata | `AlertConfigurationMetadata.js` |
| Defaults | `DefaultAlertConfigurationProvider.js` |
| Evaluation | `PeriodicEvaluationStrategy.js` |
| Monitoring | `AlertMonitoringExperience.jsx` |
| Resolver | `AlertConfigurationResolver.js` |
| Runtime Consumption | `AlertFormRuntimeAdapter.js` · `AlertRecordRuntimeAdapter.js` · `AlertDocumentRuntimeAdapter.js` |
| Temporal State | `AlertTemporalState` |
| Lifecycle operacional | `OperationalExperienceLifecycleOrchestrator.js` |
| Event Bus | `OperationalEventBus.js` |
| Documentos | `documentsService.js` · `documentRepositoriesService.js` |
| Navigation | `ExistingModuleRouteResolver.js` |
| Dashboard / App | `DashboardLayout.jsx` · `App.jsx` |

La certificación distingue estrictamente **hecho existente** de **decisión de diseño futuro**.

## 5. Matriz de certificación del contrato (OCC-CERT)

| ID | Área | Veredicto | Sustento certificado |
|---|---|---|---|
| OCC-CERT-01 | Config ≠ Occurrence | **PASS** | `alertId` identifica config; `occurrenceId` identidad temporal; N ocurrencias por config; la ocurrencia no crea configuración. |
| OCC-CERT-02 | Identity | **PASS** | `ALERT-001 → OCC-001…OCC-N`; prohibido `alertId = occurrenceId`. |
| OCC-CERT-03 | Resource Binding | **PASS (REUSE)** | `resourceKind/resourceId/moduleId` ya derivables para `dynamicForms/dynamicRecords/documentRepository`, sin conocimiento específico de módulos. |
| OCC-CERT-04 | Temporal Contract | **PASS (DESIGN)** | `startsAt`=inicio, `dueAt`=límite, `timezone` explícito, `sequence` diferencia ocurrencias; la siguiente mantiene la misma configuración. |
| OCC-CERT-05 | Scheduling Reuse | **PASS (REUSE)** | Continúa `parseAnchor()`→`computeTarget()`; solo su futura elevación a dominio. Prohibidos: `OccurrenceSchedulerV2`, `AlertScheduleEngine`, `RecurringAlertEngine`. |
| OCC-CERT-06 | Frequencies | **PASS** | `hours/days/weeks/months/years/once`; configuración única (`ALERT-100 → OCC-001..004`), no `ALERT-100-AUG`. |
| OCC-CERT-07 | Lifecycle | **PASS** | Persist: `COMPLETED`, `CANCELLED`(opc). Deriv: `PENDING/TODAY/UPCOMING/ACTIVE/OVERDUE`. Los temporales no se vuelven histórico persistente. |
| OCC-CERT-08 | Completed precedence | **PASS** | `if COMPLETED → COMPLETED else → temporal`. Una completada **nunca** reaparece como `OVERDUE` (apunta el bug 255). |
| OCC-CERT-09 | Daily occurrence | **PASS** | `07/08→OCC-001; 08/08→OCC-002; …`; completado `OCC-001` → 002 queda próxima; prohibido `OCC-001 → OVERDUE`. |
| OCC-CERT-10 | Completion Contract | **PASS (CRITICAL)** | `RECORD_CREATED ≠ COMPLETED`: creación demuestra creación, no finalización/aprobación/cierre/cumplimiento. |
| OCC-CERT-11 | Completion Signal | **PASS (DESIGN)** | `Resource → Completion Signal → Occurrence → COMPLETED`; genérica, operacional, desacoplada, identificable por recurso; sin alert logic. |
| OCC-CERT-12 | Matching | **PASS** | Matching `resourceKind+resourceId+moduleId+occurrence window`; no basta "existe un registro". |
| OCC-CERT-13 | Idempotency | **PASS (REQUIRED)** | `occurrenceId + completion` = identidad lógica; una transición única por occurrence. |
| OCC-CERT-14 | Concurrency | **PASS (REQUIREMENT)** | `UI ≠ Authority`; `Completion → Application/Domain → Occurrence State`; protección en la capa adecuada. |
| OCC-CERT-15 | Timezone | **PASS / GATE** | Obligatoria antes de la semántica diaria definitiva. |
| OCC-CERT-16 | automaticClose | **PASS (REUSE)** | `automaticClose=true + valid completion → automatic completion`; sin `autoCloseV2`/`completionPolicy`/`alertCloseEngine`. |
| OCC-CERT-17 | Runtime Reuse | **PASS (MAX REUSE)** | Reusa `AlertEvaluationEngine`, `evaluateAlertSet`, `PeriodicEvaluationStrategy`, `AlertTemporalState`, Resolver, Mapper, adapters. |
| OCC-CERT-18 | Evaluation Extension | **PASS (EXTENSION)** | `OccurrenceEvaluationStrategy` = miembro de la familia `EvaluationStrategy` (reservada en el contrato existente); no un nuevo motor. |
| OCC-CERT-19 | Temporal State | **PASS (REUSE+EXTEND)** | `AlertTemporalState` sigue siendo la base; la occurrence agrega `occurrenceId/completion`. Sin `OccurrenceTemporalEngine/V2`. |
| OCC-CERT-20 | Form Engine Decoupl | **PASS (DECOUPLED)** | Form Engine no conoce Alertas; integración vía señal operacional. |
| OCC-CERT-21 | Document Engine Decoupled | **PASS (DECOUPLED)** | Document Engine sin lógica de alertas; evento operacional desacoplado. |
| OCC-CERT-22 | SSOT | **PASS** | `alertConfigurations[]` → `Resolver` = única verdad; la occurrence **no** duplica configuración. |
| OCC-CERT-23 | Backward Compat | **PASS** | `Existing Configuration → Initial Occurrence` sin duplicar/alterar la configuración, el Resolver, Runtime o Monitoring. |
| OCC-CERT-24 | Module Monitoring | **PASS (EXTENSION)** | `AlertMonitoringExperience` sigue siendo consumidor; extensión a bucket `Cumplidas` (ocurrencias). |
| OCC-CERT-25 | Global Alert Center | **PASS (PRESENTATION)** | Center = consumidor, NO Runtime (`Existing Domain → Module | Center`). |
| OCC-CERT-26 | Cross-Module | **PASS (MODULE AGNOSTIC)** | Vía `moduleId/resourceKind/resourceId`; sin `module === X`. |
| OCC-CERT-27 | Navigation | **PASS (REUSE)** | Reusa `ExistingModuleRouteResolver`; `Center→Occurrence→Resource→Form/Record/Doc`; sin rutas por módulo. |
| OCC-CERT-28 | Scalability | **PASS** | `1 module → N resources → N alerts → N occurrences`; All Modules → Global Center; sin motor distinto. |
| OCC-CERT-29 | Prohibited Architecture | **PASS (GUARDRAIL)** | Prohibidos `OccurrenceService/Engine`, `CompletionEngine`, `AlertRuntimeV2/CenterV2/Store/ContextV2/Redux/Zustand`, salvo auditoría futura. |
| OCC-CERT-30 | Persistence Boundary | **PASS (BOUNDARY)** | `AlertConfiguration ≠ Occurrence State`; config = SSOT; el histórico de ocurrencias será responsabilidad independiente en la implementación (257). |

## 6. Implementation Gates (Sprint 257)

Sprint 257 NO comienza si cambia cualquiera de estos contratos:

| Gate | Regla |
|---|---|
| A · Identity | `alertId ≠ occurrenceId` |
| B · SSOT | `AlertConfiguration` = configuration SSOT |
| C · Scheduling | `computeTarget()` se reutiliza (no duplica) |
| D · Completion | `RECORD_CREATED ≠ COMPLETED` |
| E · Resource | `resourceKind + resourceId + moduleId` |
| F · Lifecycle | `COMPLETED`=persistente; `OVERDUE/TODAY/UPCOMING/ACTIVE`=derivado |
| G · Runtime | **ONE ALERT RUNTIME** |
| H · Global Center | Global Alert Center = consumidor |
| I · Timezone | explícito antes de la semántica diaria definitiva |
| J · Persistence | `Configuration` ≠ `Occurrence State` |

## 7. Resultado de certificación

```
                    ALERT DOMAIN
                         │
                         ▼
              Alert Configuration (SSOT)
                         │
                         ▼
                  Existing Runtime / Evaluation
                         │
                         ▼
                  Occurrence #N
                    │        │
          Temporal State   Completion
                    │        │
                    └────┬───┘
                         ▼
                  Occurrence State
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
        Module Monitoring    Global Alert Center
```

**No existe necesidad arquitectónica de un segundo Runtime.**

## 8. Definition of Done

**Contract** — ✅ `occurrenceId` certificado · ✅ `alertId ≠ occurrenceId` · ✅ configuration→N
occurrences · ✅ resource binding certificado · ✅ `startsAt/dueAt` certificados · ✅ timezone
obligatorio · ✅ `sequence` certificado.

**Lifecycle** — ✅ `COMPLETED` persistente · ✅ `CANCELLED` opcional · ✅ temporales derivados ·
✅ completed precedence · ✅ siguiente ocurrencia definida · ✅ diaria/semanal/mensual/anual
certificadas.

**Completion** — ✅ `RECORD_CREATED ≠ COMPLETED` · ✅ Completion Signal definido · ✅ matching definido ·
✅ idempotencia requerida · ✅ concurrencia requerida · ✅ `automaticClose` reutilizado.

**Runtime** — ✅ Runtime reutilizado · ✅ Evaluation reutilizada/extensible · ✅ Temporal State
reutilizado · ✅ Resolver/Mapper/Adapters reutilizados · ✅ `computeTarget` reutilizado ·
✅ sin segundo Runtime.

**Cross-module** — ✅ Module Monitoring certificado · ✅ Global Alert Center = consumidor ·
✅ filtros definidos · ✅ navegación desacoplada · ✅ module-agnostic · ✅ metadata/runtime-driven.

**Seguridad arquitectónica** — ✅ SSOT preservado · ✅ Config separada de Occurrence State ·
✅ Form/Document Engines desacoplados · ✅ sin Store/Context/Engine/Runtime nuevo ·
✅ sin implementación durante la certificación.

## 9. Certificación final

```
╔══════════════════════════════════════════════════════════════════╗
║            SPRINT 256-CERT — CERTIFIED                          ║
║ Alert Configuration ≠ Alert Occurrence                         ║
║ Configuration = SSOT · Occurrence = instancia temporal          ║
║ Completion = señal operacional explícita                        ║
║ Temporal State = derivado · COMPLETED = persistente             ║
║ Runtime = reutilizado · Scheduling = reutilizado                ║
║ Cross-module = metadata/runtime-driven                         ║
║ Global Alert Center = consumidor, no motor                      ║
║ Form/Document Engines = desacoplados                            ║
║ Timezone = implementation gate                                  ║
║ No segundo Runtime / Engine / Store                             ║
╚══════════════════════════════════════════════════════════════════╝
```

**Estado oficial: SPRINT 256-CERT — ALERT OCCURRENCE CONTRACT & LIFECYCLE DESIGN CERTIFIED — Resultado
PASS · Impacto DOCUMENTAL (sin cambios de código) · Arquitectura READY FOR IMPLEMENTATION.**