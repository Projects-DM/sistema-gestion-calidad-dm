# 🚀 DEPLOYMENT ARCHITECTURE (DEPLOYMENT_ARCHITECTURE) — SGC-DM
## Sistema de Gestión de Calidad (SGC-DM) — Implementation Blueprint
**Autor:** Principal Enterprise Software Architect  
**Versión:** 1.0 (Implementation Blueprint)  
**Estatus:** BORRADOR PARA REVISIÓN DOCUMENTAL  
**Clasificación:** Confidencial / Propiedad Técnica Integradora  

---

## 0. Propósito

Definir una **arquitectura de despliegue** para llevar la implementación enterprise blueprint a un entorno real con:

- **React SPA**
- **Supabase** como backend inicial (Auth + Postgres + Storage)
- soporte **offline-first** a nivel runtime (draft + upload queue)
- coordinación de **retry orchestration**, **rollback/compensación**, y **audit-ready** sin introducir microservicios innecesarios

> [!IMPORTANT]
> Documento 100% blueprint: no diseña infraestructura cloud hyperscale, no agrega endpoints nuevos, y no asume cambios de código.

---

## 1. Contexto de despliegue (capas)

### 1.1 Diagrama de despliegue (conceptual)

```
┌─────────────────────────────────────────────────────────┐
│                     DISPOSITIVO / PLANTA              │
│  React SPA (Dynamic Runtime Engine + Offline-first)  │
│   - GlobalRuntimeStore / uploadQueue / draftSnapshot│
│   - Event Bus in-process (correlación y side effects)│
└───────────────┬─────────────────────────────────────────┘
                │ HTTPS (API) + Storage URLs
                ▼
┌─────────────────────────────────────────────────────────┐
│                     SUPABASE (Inicial)               │
│  - Auth (JWT)                                         │
│  - DB (Postgres) + RLS                               │
│  - Storage (bucket documentos-sgc)                   │
└───────────────┬─────────────────────────────────────────┘
                │ notificación / hooks event-driven (futuro)
                ▼
┌─────────────────────────────────────────────────────────┐
│ Event-Driven Readiness (futuro)                      │
│ - Event Bus puede extenderse con adapters (pg_notify│
│   / Edge Functions / Realtime) SOLO como evolución  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Reglas de despliegue enterprise (no-negociables)

### 2.1 Separación de fronteras
- **OLTP transaccional conceptual**:
  - submit / verify / workflow transition deben producir auditoría correlacionable.
- **Asincronía eventual**:
  - analytics, alertas secundarias, IA-ready se ejecutan como side-effects posterior al commit.

Esto preserva los invariantes definidos en:
- `transaction_architecture.md`
- `persistence_architecture.md`
- `audit_engine.md`

### 2.2 Contratos de error y reintentos
- Todo error debe clasificarse como:
  - `retryable: true` (transitorio)
  - `retryable: false` (no transitorio)
- El runtime debe conservar `formValues` y `uploadQueue` ante fallas.

> [!IMPORTANT]
> “Retry orchestration” es contractual y documental; no se propone infraestructura externa.

---

## 3. Offline-first: despliegue operacional (cliente)

### 3.1 Qué persiste en el cliente
- **draftSnapshot**:
  - `formValues` (map EAV)
  - `uploadQueue` (ítems subidos o pendientes)
  - estado de workflow local (semántica de edición)
- **uploadQueue**:
  - conserva `storagePath` y `publicUrl` cuando estén disponibles
  - conserva estado por ítem: `pending/uploading/uploaded/failed` (semántico)

### 3.2 Qué no se hace offline
- No se asume escritura transaccional DB sin conectividad.
- El submit final solo ocurre cuando:
  - el runtime decide (UI/intent del operario),
  - y la red permite ejecutar persistencia conceptual.

---

## 4. Storage: despliegue operacional (evidencias)

### 4.1 Bucket y políticas
- Bucket: `documentos-sgc`
- Accesos RLS/políticas deben alinearse con el contrato documental:
  - lectura para visualización (según modelo actual del proyecto)
  - escritura/insert/delete controlada por roles

Esto se alinea con `database_setup.md` y con:
- `storage_architecture.md`
- `audit_engine.md`

### 4.2 Compensación operacional
Cuando DB falla tras upload:
- SAGA debe borrar evidencias por `storage_path`
- y debe propagar un resultado transaccional al runtime con semántica `retryable`.

---

## 5. Auditoría normativa: despliegue de consistencia

### 5.1 Garantías de auditoría
- Los eventos audit-ready deben quedar creados dentro de la frontera transaccional conceptual.
- La auditoría debe incluir correlación mínima:
  - `response_id`
  - `action_type`
  - actor (`modified_by`)
  - y contexto en `old_data/new_data`

Esto se deriva de:
- `audit_engine.md`
- `transaction_architecture.md`
- `persistence_architecture.md`

---

## 6. Observabilidad y trazabilidad (sin rediseñar tooling)

### 6.1 Correlación entre capas
En despliegue real se debe monitorear correlación documental:
- `responseId` entre runtime, auditoría y storage
- `storage_path` en `sgc_evidences`
- `action_type` y timestamps en `sgc_audit_logs`

> [!NOTE]
> Este documento no prescribe herramientas (Sentry/Prometheus) porque no se solicita ejecución; define qué correlacionar.

---

## 7. Riesgos de despliegue y mitigaciones (operacionales)

| ID | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| DEP-R-01 | Inconsistencia evidencia↔DB | Auditoría incompleta | SAGA por `storage_path` y audit-ready fronterizado |
| DEP-R-02 | “Vendor lock” de Supabase | Bloqueo migración futura | runtime no debe depender de supabase-js; usar adapters conceptuales |
| DEP-R-03 | Retry sin deduplicación | registros duplicados | contrato de idempotencia documental en `runtime_api_contracts.md` |
| DEP-R-04 | Pérdida de eventos de auditoría | no audit-ready | audit dentro de unit-of-work conceptual; correlación obligatoria |

---

## 8. Resultado esperado del despliegue (estado blueprint)

Al final del despliegue enterprise blueprint:
- la SPA funciona en modo operacional offline-first (semántico)
- storage y DB mantienen consistencia por SAGA conceptual
- auditoría mantiene correlación legal
- event-driven side-effects se mantienen desacoplados para analytics/IA-ready (eventual)

---

**Documento mantenido por:** Dirección General de Arquitectura de Software e Integridad Operativa SGC-DM  
**Última actualización:** 24 de Mayo de 2026
