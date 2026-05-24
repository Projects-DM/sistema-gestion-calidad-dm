# 📑 CONTRATOS API DE RUNTIME ↔ PERSISTENCE LAYER (RUNTIME API CONTRACTS)
## Sistema de Gestión de Calidad (SGC-DM) — Fase 2: Infrastructure & Persistence Layer
**Autor:** Principal Software Architect / Enterprise Solution Architect  
**Versión:** 1.0 (Fase 2 — Runtime Contracts)  
**Estatus:** BORRADOR PARA REVISIÓN DOCUMENTAL  
**Clasificación:** Confidencial / Propiedad Técnica Integradora  

---

## 1. PROPÓSITO

Este documento define los **contratos arquitectónicos** (no ejecutables) entre:

- El **Runtime** (estado global y workflows)  
- La **Transaction/Persistence orchestration**  
- Los **adaptadores** hacia DB y Storage  

El objetivo es mantener un sistema **contract-based, metadata-driven, audit-ready y desacoplado**, sin modificar runtime existente ni lógica ejecutable del proyecto.

---

## 2. TAXONOMÍA DE CONTRATOS (NIVELES)

### 2.1 Contratos de datos (Data Contracts)
Definen la forma estructural del payload que cruza el límite de persistencia.

### 2.2 Contratos de errores (Error Contracts)
Definen semántica de errores para:
- permitir **retry orchestration**
- habilitar UI/UX coherente con offline-first (solo conducta documental)
- asegurar auditabilidad

### 2.3 Contratos de idempotencia/deduplicación (Idempotency Contracts)
Definen cómo reintentos (por red o offline) no deben generar duplicados.

### 2.4 Contratos de correlación (Correlation Contracts)
Definen los identificadores obligatorios para auditoría:
- `response_id`
- `field_id`
- referencias `sgc_evidences.storage_path`
- trazas inmutables en `sgc_audit_logs`

---

## 3. CONTRATO CENTRAL DE PERSISTENCIA: IRuntimePersistenceLayer (Referencia)

El contrato conceptual base ya está definido en:

- `docs/database/persistence_architecture.md` → `IRuntimePersistenceLayer`

Este documento **no re-definirá** su interfaz ejecutable; únicamente consolida los **payloads** y los contratos de error/correlación que soportan las operaciones del runtime.

---

## 4. CONTRATOS DE DATOS (PAYLOADS)

### 4.1 TransactionPayload (Submit de formulario dinámico)

**Propósito:** transportar la unidad transaccional “submit” incluyendo valores dinámicos EAV, evidencias y metadata operacional.

**Requisitos documentales:**
- debe permitir mapeo determinístico a `sgc_form_responses`, `sgc_response_values`, `sgc_evidences` y `sgc_audit_logs`
- debe soportar retry sin duplicación (ver 5.3)
- debe incluir metadatos mínimos para trazabilidad y offline-first

#### Campos contractuales mínimos
- `formId`
- `userId` (operario creador)
- `values[]` (EAV tipado por field_type)
  - `fieldId`
  - `fieldType`
  - `valueText | valueNumeric | valueBoolean | valueJson | valueDate` (según corresponda)
- `evidences[]`
  - `fieldId`
  - `storagePath`
  - `publicUrl` (si el storage lo provee)
  - `fileType`
  - `fileSizeBytes`
  - metadatos documentales (ej. `hasGPSMetadata`)
- `metadata`
  - `capturedAt`
  - `deviceInfo?`
  - `geolocation?`
  - `networkType?` (incluye `offline` como estado documental)
  - `draftRecovered?`

> [!IMPORTANT]
> En presencia de evidencias subidas previamente, el `storagePath` debe ser el único identificador operativo para compensación SAGA (ver `transaction_architecture.md` y `storage_architecture.md`).

---

### 4.2 VerificationPayload (Verificación/Approve-Reject)

**Propósito:** ejecutar una frontera transaccional de verificación que:
- actualiza estado del registro en `sgc_form_responses`
- persiste comentario y segregación de funciones
- genera auditoría inmutable

**Campos contractuales mínimos:**
- `responseId`
- `verifierId`
- `action` (`approve | reject`)
- `comment` (obligatorio)
- `signatureStoragePath?` y/o `signaturePublicUrl?` (si aplica)

---

### 4.3 WorkflowStatusChangePayload (Transiciones controladas)

**Propósito:** registrar cambios de estado permitidos por `WorkflowEngine` y asegurar correlación audit-ready.

**Campos mínimos:**
- `responseId`
- `newStatus`
- `actorId`
- `reason?` (documental; requerido si la transición lo exige por metadata)

---

### 4.4 EvidenceRegistrationPayload (Registro/relación de evidencias)

**Propósito:** formalizar la asociación de evidencias a un registro transaccional.

**Campos mínimos:**
- `responseId`
- `evidences[]` con `storagePath` (correlación determinística)

---

## 5. CONTRATOS DE ERRORES (RETRY ORCHESTRATION)

### 5.1 Clasificación semántica de errores

Los errores deben exponerse al runtime con semántica documental:

- **Retryable (transitorio)**
  - problemas de conectividad
  - timeouts
  - fallas de disponibilidad momentánea

- **NonRetryable (no transitorio)**
  - errores contractuales/validación que no se resuelven con reintento
  - conflictos de integridad (ej. correlación imposible)

Esto se alinea con `transaction_architecture.md` (estrategia all-or-nothing y recuperación de estado UI).

### 5.2 Campos mínimos de error

- `code`
- `message`
- `retryable: boolean`
- (opcional) `details` (metadatos para observabilidad documental)

### 5.3 Idempotency & Deduplication Contract

Para offline-first y retries, se requiere evitar duplicados.

**Contrato conceptual:**
- cada solicitud debe incluir un `client_request_id` o `draft_snapshot_id` (concepto documental).
- los reintentos con el mismo idempotency key **no deben** generar múltiples `sgc_form_responses` para el mismo envío lógico.

> [!NOTE]
> Este documento describe el contrato; la implementación real puede requerir una columna adicional o constraint, pero **no se propone** modificar tablas (por restricción del enunciado). La regla debe documentarse para futuras mejoras controladas.

---

## 6. CONTRATOS DE CORRELACIÓN (AUDIT-READY)

### 6.1 Identificadores obligatorios

Para correlación audit-ready y mantenimiento de trazabilidad normativa:

- `responseId` (correlación primaria)
- `fieldId` (correlación secundaria para valores y evidencias)
- `storagePath` (correlación para evidence lifecycle)
- `actorId` (operario/verificador)
- `action_type` (tipo de auditoría: submit/verify/workflow/evidence)

### 6.2 Consistencia de “inmutabilidad conceptual”

El contrato asume que:
- los logs en `sgc_audit_logs` son inmutables
- la creación del log en la frontera transaccional no debe omitirse

---

## 7. CONTRATOS DE CARGA Y OFFLINE-FIRST (DOCUMENTAL)

### 7.1 Offline que preserva trabajo del operario

El runtime debe mantener localmente:
- valores capturados (formValues)
- cola de evidencias y firmas (`uploadQueue`)
- estado de workflow local

Cuando vuelve la conectividad:
- se retoma el submit siguiendo el contrato idempotente
- se ejecuta SAGA si falla DB tras upload

> [!IMPORTANT]
> Este documento establece el “qué” debe ocurrir; el “cómo” pertenece a la capa TransactionService / persistence orchestrator ya descrita en `persistence_architecture.md` y `runtime_state_architecture.md`.

---

## 8. REFERENCIAS CRUZADAS

- `docs/database/persistence_architecture.md`
  - contrato `IRuntimePersistenceLayer`
  - retry/backoff
  - orchestrator y mapeo EAV
- `docs/database/transaction_architecture.md`
  - all-or-nothing
  - fronteras runtime
  - SAGA para evidencia huérfana
- `docs/database/storage_architecture.md` (nuevo)
  - lifecycle states y storage_path conventions
- `docs/core/runtime_state_architecture.md`
  - uploadQueue y draftSnapshot
  - conservación en fallos de red

---

## 9. RIESGOS DOCUMENTALES A OBSERVAR (CONTRATOS)

| ID | Riesgo | Impacto | Recomendación documental |
| --- | --- | --- | --- |
| RC-R-01 | Reintentos que generan duplicados | auditoría inconsistente | definir idempotency key contractual (client_request_id) |
| RC-R-02 | Evidencia no correlacionable | auditoría incompleta | storage_path determinístico + response_id obligatorio |
| RC-R-03 | Errores sin retryable | retry mal orquestado | estandarizar Error Contract con retryable=true/false |

---

**Documento mantenido por:** Dirección General de Arquitectura de Software e Integridad Operativa SGC-DM  
**Última actualización:** 24 de Mayo de 2026  
**Próxima revisión:** alineación final con `audit_engine.md` (a crear) y `infrastructure_layers.md` (a crear)
