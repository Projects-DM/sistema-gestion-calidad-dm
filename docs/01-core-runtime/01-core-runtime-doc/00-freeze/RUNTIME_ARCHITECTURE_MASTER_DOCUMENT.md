# RUNTIME_ARCHITECTURE_MASTER_DOCUMENT.md

## IMPORTANTE

* NO IMPLEMENTAR CAMBIOS
* NO MODIFICAR CÓDIGO
* NO CREAR ARCHIVOS PRODUCTIVOS
* NO CREAR MIGRACIONES
* NO REFACTORIZAR
* NO CREAR ADAPTERS
* NO GENERAR PLANES DE IMPLEMENTACIÓN

## OBJETIVO

Documento maestro de arquitectura consolidada para la integración **SaaS ↔ Runtime**.

Este documento consolida únicamente evidencia previamente validada en:

- `SAAS_RUNTIME_INTEGRATION_AUDIT.md`
- `SAAS_DOMAIN_MAPPING_AUDIT.md`
- `SAAS_RUNTIME_INTEGRATION_STRATEGY_AUDIT.md`
- `TRACEABILITY_DEEP_AUDIT.md`
- `TRACEABILITY_RUNTIME_READINESS.md`
- `SAAS_RUNTIME_TARGET_ARCHITECTURE_AUDIT.md`
- `T2.3_RUNTIME_SAAS_COMPATIBILITY_MATRIX_AUDIT.md`
- `T2.4_MINIMAL_RUNTIME_CONTRACT_AUDIT.md`
- `T2.5_RUNTIME_INTEGRATION_BACKLOG_AUDIT.md`
- `T2.6_SPRINT_23_EXECUTION_BLUEPRINT.md`
- `T2.7_RUNTIME_BUSINESS_EVENT_ARCHITECTURE_AUDIT.md`

No se generan nuevos hallazgos.

---

## FASE 1 — EXECUTIVE SUMMARY

### ¿Qué es el SaaS?
El SaaS es la **experiencia de usuario + dominio de negocio** persistido en Supabase, incluyendo:
- Auth/Profiles/Roles
- Dynamic Forms (sgc_* con EAV)
- Evidencias
- Auditoría operacional de formularios (sgc_audit_logs)
- Otros dominios UI (dashboard, configuración, certificados, trazabilidad/dispatches)

### ¿Qué es el Runtime?
El Runtime es el **motor desacoplado de ejecución** con arquitectura provider-factory que contiene:
- Persistence execution routing
- Audit
- Analytics
- Scoring (y capas futuras)

### ¿Por qué existen ambos?
- SaaS define el dominio/experiencia y la persistencia del negocio.
- Runtime define ejecución determinista y provider-agnostic observabilidad/inteligencia.

### ¿Por qué deben integrarse?
Para alimentar observabilidad e inteligencia del Runtime (Audit → Analytics → Scoring) a partir de eventos de negocio del SaaS sin romper boundaries ni acoplarse a Supabase dentro del Runtime.

---

## FASE 2 — CURRENT ARCHITECTURE

### SaaS (estructura actual)

Clasificación por estado (según evidencia de auditorías previas):

- **Formularios Dinámicos (DynamicModule/DynamicForm/dynamicService)**
  - Owner: SaaS
  - Responsabilidad: producir eventos auditables `sgc_audit_logs` para create/verify de respuestas
  - Estado: base para Sprint 23

- **Evidencias (sgc_evidences)**
  - Owner: SaaS
  - Responsabilidad: adjuntos/metadata asociada a responses
  - Estado: base parcial para scoring/analytics

- **Auditoría Operacional (sgc_audit_logs)**
  - Owner: SaaS
  - Responsabilidad: registrar `action_type='create'|'verify'` para el dominio formularios
  - Estado: READY para Audit/Analytics básicos (vía integración mínima)

- **Otros dominios UI** (Dashboard, Configuración, Certificados, Traceability/Dispatches, Technical Sheets)
  - Owner: SaaS
  - Estado: fuera del foco Sprint 23 (y/o not ready por falta de audit/event contracts)

### Runtime (estructura actual)

- **Provider Factory / Persistence Provider system**
  - Responsabilidad: provider-agnostic routing y ejecución de persistencia
  - Estado: base operativa

- **Audit Layer (RuntimeExecutionAuditRecorder + RuntimeExecutionAuditRegistry)**
  - Responsabilidad: registrar ejecuciones (started/succeeded/failed) con `operationType` y `correlationId?`
  - Estado: READY para pipeline basado en eventos del dominio integrado en forma de ejecución/persistencia

- **Analytics Layer (RuntimeProviderAnalyticsEngine + registry)**
  - Responsabilidad: derivar métricas a partir del `RuntimeExecutionAuditRegistry`
  - Estado: READY para métricas básicas

- **Scoring Layer**
  - Responsabilidad: convertir analytics snapshots en scores
  - Estado: PARTIAL en el alcance validado

- **Decision / Selection / Recovery**
  - Responsabilidad: capas futuras
  - Estado: fuera de Sprint 23

---

## FASE 3 — CONSOLIDATED FINDINGS

| Hallazgo | Impacto | Estado | Fuente |
|---|---:|---|---|
| No existe una Business Event Layer nativa para eventos `FORM_CREATED`/`FORM_VERIFIED` como first-class business events | Impacta ruta SPS → Runtime | Confirmado | `T2.7_RUNTIME_BUSINESS_EVENT_ARCHITECTURE_AUDIT.md` |
| Runtime Audit opera sobre Provider Executions / Persistence Router path | Define entrada real al Audit | Confirmado | `T2.7_RUNTIME_BUSINESS_EVENT_ARCHITECTURE_AUDIT.md`, `T2.4_MINIMAL_RUNTIME_CONTRACT_AUDIT.md` |
| Analytics depende de Audit Registry (no de un event stream business independiente) | Determina que Audit es prerequisite | Confirmado | `T2.3_RUNTIME_SAAS_COMPATIBILITY_MATRIX_AUDIT.md` |
| La taxonomía runtime `FORM_CREATED`/`FORM_VERIFIED` no está curada como parte de la superficie operacional actual de audit sin mapping mínimo | Define contrato mínimo parcial | Confirmado | `T2.4_MINIMAL_RUNTIME_CONTRACT_AUDIT.md`, `T2.5_RUNTIME_INTEGRATION_BACKLOG_AUDIT.md` |
| Payload no debe consumir EAV raw; payload normalizado es requisito conceptual | Define bloqueo parcial | Confirmado | `T2.4_MINIMAL_RUNTIME_CONTRACT_AUDIT.md` |

---

## FASE 4 — PRESERVATION MATRIX

### Runtime — conservar / adaptar
- **Provider Factory / Persistence Routing:** conservar (base)
- **RuntimeExecutionAuditRecorder / RuntimeExecutionAuditRegistry:** conservar
- **Analytics Engine:** conservar
- **Scoring Engine:** conservar (con alcance limitado)

### SaaS — conservar / integrar
- **DynamicModule / DynamicForm / dynamicService:** conservar (productores de audit events del dominio formularios)
- **sgc_form_responses / sgc_audit_logs / sgc_evidences:** conservar
- **EAV raw (sgc_response_values):** conservar solo como fuente interna del SaaS; no consumido como payload runtime

---

## FASE 5 — EXCLUDED COMPONENTS (Sprint 23)

Debe permanecer fuera del alcance:
- **Dispatches / Traceability Integration** (no contract/audit equivalente validado en este baseline)
- **Selection Layer**
- **Recovery Layer**
- **Decision avanzada**
- **Provider Binding Extensions**

Justificación consolidada:
- `T2.5_RUNTIME_INTEGRATION_BACKLOG_AUDIT.md` y `T2.6_SPRINT_23_EXECUTION_BLUEPRINT.md`
- congelación explícita: `docs/01-core-runtime/01-core-runtime-doc/ARCHITECTURE_FREEZE_V1.md`

---

## FASE 6 — ROOT ARCHITECTURAL PROBLEM

**Por qué `FORM_CREATED` y `FORM_VERIFIED` no pueden entrar directamente al Runtime actual**:

El Runtime actual es un **Provider Runtime** (Audit/Analytics/Scoring se alimentan del camino de ejecuciones de persistencia y su registro interno).

No es un **Business Event Runtime** con un catálogo nativo de eventos de negocio `FORM_CREATED/FORM_VERIFIED` como primera clase.

Evidencia:
- `T2.7_RUNTIME_BUSINESS_EVENT_ARCHITECTURE_AUDIT.md`
- `T2.4_MINIMAL_RUNTIME_CONTRACT_AUDIT.md` (payload/taxonomía/pipeline parcial)

---

## FASE 7 — GAP IDENTIFICATION

SaaS
↓
??? (Business Event Integration/Translation hacia el mecanismo de Audit/Analytics existente)
↓
Runtime

La pieza faltante es una **capa de integración/traducción de Business Events** para transformar eventos del dominio formularios (create/verify → FORM_CREATED/FORM_VERIFIED) en una forma que el Audit/Analytics del Runtime pueda registrar/derivar con contratos mínimos y sin romper pureza.

Evidencia consolidada:
- `T2.7_RUNTIME_BUSINESS_EVENT_ARCHITECTURE_AUDIT.md`
- `T2.4_MINIMAL_RUNTIME_CONTRACT_AUDIT.md`

---

## FASE 8 — TARGET ARCHITECTURE

Arquitectura objetivo (alto nivel, sin implementación):

SaaS
↓
Business Event Integration Layer (traducción hacia el mecanismo existente)
↓
Runtime Audit
↓
Runtime Analytics
↓
Runtime Scoring

Evidencia y alcance:
- `docs/01-core-runtime/01-core-runtime-doc/ARCHITECTURE_FREEZE_V1.md`
- `T2.6_SPRINT_23_EXECUTION_BLUEPRINT.md`
- `T2.7_RUNTIME_BUSINESS_EVENT_ARCHITECTURE_AUDIT.md`

---

## FASE 9 — SPRINT ROADMAP

- **Sprint 23**
  - Integrar formularios dinámicos:
    - FORM_CREATED → Audit → Analytics
    - FORM_VERIFIED → Audit → Analytics
  - Scoring: señales mínimas

- **Sprint 24**
  - scoring/analytics más avanzados y dashboard/analytics (según backlog)

- **Sprint 25+**
  - Decision, Selection, Recovery y Dispatches (cuando exista contract/audit/event model)

---

## FASE 10 — MATURITY SCORE (consolidado)

| Área | Estado |
|---|---|
| SaaS | READY/PARTIAL (formularios con audit, otros dominios fuera) |
| Runtime Core | READY |
| Provider Factory | READY |
| Audit | READY |
| Analytics | READY |
| Scoring | PARTIAL |
| Business Event Integration | PARTIAL (capa requerida; runtime no es business-event native) |
| Global Runtime Integration | PARTIAL |

Razonamiento consolidado:
- `T2.3`, `T2.4`, `T2.5`, `T2.6`, `T2.7`

---

## FASE 11 — OFFICIAL PROJECT STATUS

- **Discovery Phase:** COMPLETED (dominios y evidencias consolidados)
- **Architecture Audit Phase:** COMPLETED (todas las auditorías de integración y business event architecture)
- **Sprint 23 Readiness:** PARTIAL
  - Justificación: identidad/taxonomía/payload parcialmente listos; no se integra business-event nativo sin capa de traducción.

---

## FASE 12 — FINAL EXECUTIVE DECISION

1) **Qué debe integrarse primero:** Formularios dinámicos (FORM_CREATED / FORM_VERIFIED) con Audit → Analytics.
2) **Qué debe esperar:** Dispatches/Traceability y capas Decision/Selection/Recovery.
3) **Qué no debe tocarse:** Provider binding extensions, recovery, selection, decision avanzada, y cualquier acoplamiento Supabase dentro del Runtime.
4) **Riesgo principal:** ausencia de Business Event Layer nativa y contratos parciales de taxonomía/payload/replay para un modelo estrictamente business-event.
5) **Ruta crítica:** Business Event Integration/Translation (conceptual) → Runtime Audit → Runtime Analytics → Scoring señales mínimas.
6) **Siguiente documento oficial del proyecto:**

NEXT DOCUMENT:
S23.1_BUSINESS_EVENT_INTEGRATION_DESIGN.md

---

## RESULTADO ESPERADO
Documento maestro consolidado.

No se realizaron nuevas auditorías; no se diseñó implementación; no se introdujeron cambios de código.

