# 🧾 ENGINE DE AUDITORÍA (AUDIT ENGINE) — AUDIT-READY & NORMATIVA
## Sistema de Gestión de Calidad (SGC-DM) — Fase 2: Infrastructure & Persistence Layer
**Autor:** Principal Software Architect / Enterprise Solution Architect  
**Versión:** 1.0 (Fase 2 — Audit Engine)  
**Estatus:** BORRADOR PARA REVISIÓN DOCUMENTAL  
**Clasificación:** Confidencial / Propiedad Técnica Integradora  

---

## 1. VISIÓN GENERAL

### 1.1 Propósito

El **Audit Engine** es la especificación arquitectónica (documental) de cómo SGC-DM garantiza **Audit-Ready** para trazabilidad normativa (INVIMA/ISO) y protección contra manipulación.

En SGC-DM, la auditoría no es un “log adicional”. Es parte del **contrato transaccional** de la persistencia:

- si falla la escritura del registro operativo y su auditoría inmutable,
- el flujo debe tratar la operación como no completada (all-or-nothing conceptual),
- y debe registrar/propagar el resultado al runtime para offline-first (sin borrar trabajo del operario).

### 1.2 Principio cardinal

> [!IMPORTANT]
> La auditoría debe ser **correlacionable**, **completa** e **inmutable conceptualmente**, conectando evidencia física (storage_path) con el registro transaccional y con el actor que ejecutó la acción.

---

## 2. OBJETIVO ENTERPRISE DE TRAZABILIDAD

SGC-DM requiere auditoría para:

- **Submit (captura de planta)**: evidencia + valores EAV + bitácora.
- **Verify (aprobación/rechazo)**: comentario, segregación de funciones y firma si aplica.
- **Workflow status transitions**: cambios de estado controlados por `WorkflowEngine`.
- **Evidence registration**: registro de referencias a storage.
- **Compensación/rollback**: eventos que expliquen que ocurrió una compensación por SAGA (sin reescribir auditorías previas).

---

## 3. MODELO DE AUDITORÍA (DOCUMENTAL)

### 3.1 Entidades de auditoría existentes (DB model conceptual)
Este motor debe mapear su salida a `sgc_audit_logs`:

- `response_id`
- `action_type`
- `modified_by` (actor)
- `old_data` (jsonb)
- `new_data` (jsonb)
- `reason`
- `created_at`

> [!NOTE]
> Este documento asume que la tabla `sgc_audit_logs` ya existe como bitácora inmutable por diseño (definido en `sql_setup_audit.sql` y el contrato transaccional de `transaction_architecture.md`).

---

## 4. CORRELACIÓN AUDIT-READY (EVIDENCIA ↔ REGISTRO)

### 4.1 Campos mínimos de correlación

Para que la auditoría sea legalmente defendible:

- `response_id` (correlación primaria del registro operativo)
- `action_type` (semántica del evento)
- `modified_by` (quién ejecutó la acción)
- `old_data/new_data` (contexto para reconstrucción)
- `storage_path` (correlación con evidencia física)
- `field_id` (cuando aplica a valores EAV específicos)

La forma documental recomendada:
- En `submit` logs: incluir en `new_data` el conjunto de referencias a evidencias por `storage_path`.
- En `verify` logs: incluir `new_status` + `verification_comment` + `signatureStoragePath` si aplica.

---

## 5. INMUTABILIDAD Y PROTECCIÓN CONTRA MANIPULACIÓN (CONCEPTO)

### 5.1 Requisitos de seguridad operacional
Sin introducir cambios de código ni SQL, el Audit Engine exige:

- RLS habilitado en `sgc_audit_logs`
- Inserción controlada (sin permisos de update/delete para clientes operativos)
- Integridad lógica: una operación completa crea el log; si la auditoría falla, la operación debe tratarse como fallida.

> [!IMPORTANT]
> Esta regla es coherente con `transaction_architecture.md`: si la auditoría inmutable no se escribe, no existe “estado operacional defendible”.

---

## 6. INTEGRACIÓN CON LÍMITES TRANSACCIONALES

### 6.1 Frontera audit-ready
La persistencia debe considerar la creación de auditoría como parte de la misma unidad transaccional para:

- submit
- verify
- status transitions (workflow)

En términos contractuales:

- si `submitFormResponse` retorna success=true ⇒ audit log debe existir
- si `submitFormResponse` retorna success=false ⇒ no debe existir auditoría parcial ni huérfana sin correlación.

Esta expectativa ya se refleja en `persistence_architecture.md` y `transaction_architecture.md`.

---

## 7. AUDITORÍA Y COMPENSACIÓN SAGA

### 7.1 Casos
- submit falla después de upload de evidencias
- compensación borra archivos huérfanos
- se debe registrar la intención/resultado de compensación en términos auditables

### 7.2 Regla documental para compensación
No se deben “inventar” logs como si el submit hubiese sido commit exitoso. Debe existir un registro de compensación como evento operacional.

> [!NOTE]
> Este documento recomienda que `action_type` incluya variantes conceptuales:
> - `submit_started` (si se decide)
> - `submit_failed_and_compensated`
> (sin proponer columnas nuevas; solo semántica del `action_type` si ya existe libertad en la metadata del sistema)

---

## 8. EVENTOS Y EVENT-DRIVEN AUDIT

Aunque el commit SQL es síncrono, la auditoría alimenta pipelines event-driven:

- analytics/ETL (consistencia eventual)
- notificaciones/alerts (dependiendo del motor)
- IA-ready (solo lectura posterior del registro)

El Audit Engine debe:
- garantizar que el evento de audit ocurre tras commit
- permitir correlación a través de `response_id` y referencias a `storage_path`

Esto alinea con `persistence_architecture.md` (consistencia de eventos) y `event_bus_architecture.md` (ya existente).

---

## 9. CONTRATO DE AUDITORÍA (REGLAS DOCUMENTALES)

### 9.1 Reglas mínimas por acción

- **submit**
  - crear `sgc_form_responses`
  - crear `sgc_response_values` (bulk conceptual)
  - crear `sgc_evidences` (storage references)
  - crear `sgc_audit_logs` con `old_data/new_data`
- **verify**
  - actualizar estado verificado (approved/rejected)
  - registrar firma/paths si aplica
  - insertar `sgc_audit_logs`
- **workflow transition**
  - validar transición por `WorkflowEngine`
  - insertar `sgc_audit_logs` con reason

### 9.2 Reglas offline-first
Si hay offline durante captura:
- el Audit Engine no “escribe” hasta commit DB
- conserva en runtime un snapshot local y reintenta
- la auditoría se crea al completarse el commit transaccional

---

## 10. REFERENCIAS CRUZADAS

- `docs/database/persistence_architecture.md`
  - SAGA de evidencias
  - orquestación + retry
- `docs/database/transaction_architecture.md`
  - fronteras all-or-nothing
  - consistencia auditoría inmediata
- `docs/database/storage_architecture.md` (nuevo)
  - lifecycle states y compensación
- `docs/core/runtime_state_architecture.md`
  - conservación offline-first (sin borrado)
- `docs/core/event_bus_architecture.md` (ya existente)
  - consumo asíncrono posterior (analytics/alerts/IA)

---

## 11. RIESGOS Y MITIGACIONES (AUDIT)

| ID | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| AU-R-01 | Auditoría incompleta por fallo de commit | No defendible ante auditoría legal | Encapsular audit dentro de frontera transaccional |
| AU-R-02 | Evidence↔Audit sin correlación (sin storage_path) | Evidencia no trazable | Incluir `storage_path` en `new_data` |
| AU-R-03 | Duplicidad por retries no idempotentes | Doble historial | Idempotency contract en `runtime_api_contracts.md` |

---

**Documento mantenido por:** Dirección General de Arquitectura de Software e Integridad Operativa SGC-DM  
**Última actualización:** 24 de Mayo de 2026  
**Próxima revisión:** armonización final en `persistence_architecture.md` y `infrastructure_layers.md`
