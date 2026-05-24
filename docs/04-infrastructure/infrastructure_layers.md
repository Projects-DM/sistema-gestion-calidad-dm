# 🧩 INFRASTRUCTURE LAYERS (INFRASTRUCTURE_LAYERS) — FASE 2
## Sistema de Gestión de Calidad (SGC-DM) — Infrastructure & Persistence Layer
**Autor:** Principal Software Architect / Enterprise Solution Architect  
**Versión:** 1.0 (Fase 2 — Infrastructure Layers)  
**Estatus:** BORRADOR PARA REVISIÓN DOCUMENTAL  
**Clasificación:** Confidencial / Propiedad Técnica Integradora  

---

## 1. VISIÓN GENERAL

Este documento presenta la **vista por capas de infraestructura operacional** para la **Fase 2**:

- consistencia transaccional (all-or-nothing conceptual)
- sincronización segura
- offline-first (contractual/documental)
- retry orchestration y rollback/compensación segura
- desacoplamiento de base de datos y storage (contract-based)
- audit-ready / trazabilidad normativa
- escalabilidad progresiva (multi-storage y multi-DB futuro)

El objetivo es que la infraestructura se perciba como una plataforma enterprise:
**seria, modular, mantenible, auditable y sostenible a largo plazo**.

> [!IMPORTANT]
> Este documento es 100% documental: no propone cambios de código, no diseña microservicios innecesarios y no introduce nuevas tablas.

---

## 2. STACK OPERACIONAL (CARTOGRAFÍA DE CAPAS)

### 2.1 Diagrama de capas

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Runtime (State + Workflow)                       │
│  - GlobalRuntimeStore (formSlice, workflowSlice, validationSlice)        │
│  - uploadQueue (evidencias/firmas en cola)                              │
│  - DRAFT snapshot (offline-first)                                       │
└──────────────────────────────────────────────────────────────────────────┘
                 │ invoca (contract-based)
                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  TransactionService / Transaction Layer                  │
│  - fronteras de aislamiento (units of work)                             │
│  - orquestación lógica del submit / verify / transitions                │
│  - manejo de errores y fallback UX (documental)                         │
└──────────────────────────────────────────────────────────────────────────┘
                 │ llama (puerto)
                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│               PersistenceOrchestrator (IRuntimePersistenceLayer)         │
│  - retry/backoff (retry orchestration contractual)                       │
│  - metadata cache (solo lectura)                                         │
│  - mapping EAV → sgc_response_values (bulk conceptual)                 │
│  - coordinación con storage (SAGA de compensación)                        │
└──────────────────────────────────────────────────────────────────────────┘
                 │ delega a (adaptador)
                 ▼
┌───────────────────────────────────────────────┬──────────────────────────────┐
│               Adapter (DB/Storage)     │  StorageProvider abstraction  │
│  - SupabaseAdapter (activo)            │  - evidencia/firmas lifecycle │
│  - SQLAdapter futuro (compatibilidad) │  - delete(paths) compensación │
└───────────────────────────────────────────────┴──────────────────────────────┘
                 │ escribe/lee
                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         DB & Storage Operacionales                       │
│  - DB: sgc_form_responses, sgc_response_values, sgc_evidences, logs  │
│  - Storage: bucket(s), storage_path, public_url                        │
└──────────────────────────────────────────────────────────────────────────┘
                 │ publica
                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Event Bus / Analytics / IA-Readiness                 │
│  - consistencia eventual para métricas/alerts/ETL                       │
│  - audit-ready: correlación vía response_id + storage_path              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. FAMÍLIAS DE RESPONSABILIDADES (SEPARACIÓN SIN ACOPLAMIENTO)

### 3.1 Runtime (State)
**Responsabilidad:** mantener el estado operacional en RAM/IndexedDB:
- `formValues` (EAV map)
- `uploadQueue` (evidencias/firmas)
- `draftSnapshot` y conservación ante interrupciones

> [!NOTE]
> El runtime NO conoce el proveedor físico. Solo conoce contratos.

### 3.2 Transaction Layer
**Responsabilidad:** describir fronteras del unit-of-work:
- submit
- verify
- workflow transitions

Y aplicar el principio all-or-nothing conceptual:
- consistencia operacional
- conservar estado del operario si falla
- orquestar compensación si el fallo sucede post-upload

### 3.3 Persistence Orchestrator
**Responsabilidad:** ser la frontera conceptual que implementa `IRuntimePersistenceLayer`:
- retry/backoff (retry orchestration)
- metadata cache (TTL)
- mapping EAV
- coordinación con storage (SAGA de compensación)
- mantener contrato de errores `retryable`

### 3.4 Adapter(s) & Providers
**Responsabilidad:** representar el “motor físico”:
- adaptar al motor DB activo (supabase/postgres/sqlserver conceptual futuro)
- adaptar al storage provider activo (supabase storage hoy; S3/GCS futuro)

---

## 4. FRONTERAS TRANSACCIONALES VS FRONTERAS ASÍNCRONAS (EDA)

### 4.1 Regla de frontera

- **Dentro de la frontera transaccional (OLTP / síncrona conceptual):**
  - persistir `sgc_form_responses`
  - persistir `sgc_response_values` (EAV)
  - persistir `sgc_evidences` (referencias)
  - persistir `sgc_audit_logs` (inmutable conceptual)

- **Fuera de la frontera transaccional (EDA / asíncrona conceptual):**
  - analytics ETL
  - alertas secundarias
  - pipelines IA-ready

> [!IMPORTANT]
> La auditoría debe estar dentro de la frontera transaccional. Analytics/IA pueden ser eventual.

---

## 5. RESILIENCIA OPERACIONAL (RETRY, BACKOFF Y COMPENSACIÓN)

### 5.1 Retry orchestration (contractual/documental)

El contrato de error debe expresar:
- `retryable: true` (transitorio)
- `retryable: false` (no transitorio)

Y el orquestador debe aplicar backoff exponencial:
- `attempt 1` → base delay
- `attempt 2` → baseDelay * 2
- `attempt 3` → baseDelay * 4
- tope de delay máximo (para evitar cascada y congelamiento UX)

> [!NOTE]
> Este documento no implementa lógica; solo fija la semántica arquitectónica.

### 5.2 Rollback seguro vs Compensación (SAGA)

- **Rollback físico DB:** ocurre dentro de transacción y es nativo del motor.
- **Compensación Storage:** ocurre por SAGA si el fallo sucede después de upload.

La compensación debe:
- borrar por `storage_path` (correlación determinística)
- no borrar evidencia ya referenciada/comprometida
- no alterar registros de auditoría ya persistidos

---

## 6. MULTI-STORAGE / MULTI-DB: ESCALABILIDAD PROGRESIVA SIN REESCRITURA

### 6.1 Principio de compatibilidad futura

SGC-DM debe conservar invariantes:

- el runtime habla con `IRuntimePersistenceLayer` (contrato)
- el payload se mapea a EAV y referencias (sin lógica de proveedor en runtime)
- el storage se representa por `storage_path` y correlación

### 6.2 Implicación arquitectónica

- cambiar DB implica solo reemplazar adapter
- cambiar Storage implica solo reemplazar StorageProvider abstraction
- event bus y audit engine conservan correlación por `response_id` y `storage_path`

---

## 7. OBSERVABILIDAD OPERACIONAL (DOCUMENTAL)

Sin diseñar herramientas nuevas, el documento define requisitos de correlación documental:

- cada operación transaccional produce un `correlation context`:
  - `responseId` (si existe/si se genera)
  - `actorId`
  - lista de `storage_path` involucrados
  - `action_type` (submit/verify/workflow/evidence/compensated)

Ese contexto debe propagarse para:
- auditoría (`audit_engine.md`)
- event bus y analytics (consistencia eventual)

---

## 8. REFERENCIAS CRUZADAS

- `docs/database/persistence_architecture.md`
  - orquestación única, retry, mapping EAV, SAGA
- `docs/database/transaction_architecture.md`
  - fronteras de unidades transaccionales y rollback/compensación
- `docs/database/storage_architecture.md` (nuevo)
  - lifecycle y storage_path correlación
- `docs/database/runtime_api_contracts.md` (nuevo)
  - contratos de payload, errores, idempotencia y correlación
- `docs/database/audit_engine.md` (nuevo)
  - audit-ready, correlación evidencia ↔ logs

---

**Documento mantenido por:** Dirección General de Arquitectura de Software e Integridad Operativa SGC-DM  
**Última actualización:** 24 de Mayo de 2026  
**Próxima revisión:** alineación final con `persistence_architecture.md` y `database_adapter_architecture.md`
