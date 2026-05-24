# 🧰 ARQUITECTURA DE ADAPTADORES DE BASE DE DATOS (DATABASE ADAPTER ARCHITECTURE)
## Sistema de Gestión de Calidad (SGC-DM) — Fase 2: Infrastructure & Persistence Layer
**Autor:** Principal Software Architect / Enterprise Solution Architect  
**Versión:** 1.0 (Fase 2 — Database Adapters)  
**Estatus:** BORRADOR PARA REVISIÓN DOCUMENTAL  
**Clasificación:** Confidencial / Propiedad Técnica Integradora  

---

## 1. VISIÓN GENERAL

Este documento define la **arquitectura de adaptadores** para desacoplar el runtime de SGC-DM de la tecnología física de base de datos.

El objetivo es asegurar:
- compatibilidad futura con **MySQL / PostgreSQL / SQL Server**
- escalabilidad progresiva sin reescritura
- consistencia transaccional conceptual (all-or-nothing)
- protección de auditoría (audit-ready)
- preparación para multi-storage y event-driven architecture (solo correlación)

> [!IMPORTANT]
> Restricción del proyecto: este trabajo es exclusivamente documental. No se diseña lógica ejecutable nueva ni se alteran tablas.

---

## 2. PRINCIPIOS ENTERPRISE

### 2.1 Ports & Adapters (Arquitectura Hexagonal)
- **Port**: `IRuntimePersistenceLayer` (contrato central documental/ejecutable existente en arquitectura).
- **Adapters**: implementaciones físicas hacia:
  - motor DB (por ejemplo Supabase/Postgres)
  - (futuro) motores alternos (SQLServer, MySQL)
  - (futuro) consumo vía API/servicios

La SPA/Runtime NO debería conocer el adaptador específico; solo invoca el contrato de persistencia.

### 2.2 Invariantes innegociables
- el runtime persiste mediante payloads transaccionales
- el mapeo EAV→filas EAV destino no debe duplicarse en múltiples lugares
- auditoría inmutable debe formar parte de la frontera transaccional conceptual
- storage se coordina por `storage_path` (correlación determinística)

---

## 3. FAMÍLIA DE ADAPTADORES (CONCEPTUAL)

### 3.1 Adaptador activo actual: SupabaseAdapter
Responsabilidades documentales:
- ejecutar operaciones de persistencia para:
  - submitFormResponse
  - verifyFormResponse
  - updateWorkflowStatus
  - lectura (getResponses/getResponseById/etc.)
- ejecutar mapeo EAV→tabla física (`sgc_response_values`)
- coordinar inserción de referencias de evidencias (`sgc_evidences`) y auditoría (`sgc_audit_logs`)
- respetar semántica de error `retryable`/`non-retryable` requerida por `runtime_api_contracts.md`

> [!NOTE]
> No se proponen cambios en el código actual. Solo se documenta la arquitectura conceptual.

### 3.2 Adaptadores futuros: SQLAdapter / SQLServerAdapter / RestApiAdapter
Responsabilidades documentales:
- implementar el mismo port `IRuntimePersistenceLayer`
- mantener contratos de payload y errores
- conservar mapping EAV y correlación audit-ready
- mantener garantías transaccionales (según capabilities del motor)

---

## 4. CONTRATO INTERNO: CAPABILIDADES DEL ADAPTER

### 4.1 Operaciones atómicas (units of work)
A nivel conceptual, el adaptador debe poder ejecutar una o más **operaciones atómicas universales** (ver `transaction_architecture.md`):

- `SUBMIT_FORM`:
  - `sgc_form_responses`
  - `sgc_response_values` (bulk conceptual)
  - `sgc_evidences`
  - `sgc_audit_logs`
  - init workflow (si aplica)

- `VERIFY_RESPONSE`:
  - update status / verificación
  - firma/comentario (si aplica)
  - auditoría inmutable

- `DISPATCH_CAPA_PLAN` (si aplica según workflow):
  - actualización de estado
  - creación de planes/correlación analítica (eventual)

### 4.2 Semántica de transacción y fronteras
El adaptador debe:
- iniciar/encapsular transacción en la frontera del motor DB
- asegurar all-or-nothing para el conjunto de inserts/updates conceptuales dentro del submit/verify
- propagar fallos con semántica `retryable`

---

## 5. EAV MAPPING Y TIPOLOGÍA DE VALORES

### 5.1 Mapeo conceptual por field_type
El adaptador debe respetar la estrategia ya declarada en `persistence_architecture.md`:

- `value_text` para texto/fecha/selecciones y firmas (según convención existente)
- `value_numeric` para mediciones numéricas
- `value_boolean` para checkbox/boolean
- `value_json` para multiselect/dynamic_table/repeating_section

### 5.2 Batching y reducción de round-trips (documental)
Para evitar degradación operacional:
- el adaptador debe aceptar que `values[]` puede enviarse como conjunto
- internamente, usar bulk insert o mecanismo equivalente del motor (conceptualmente)
- esto reduce latencia y mejora resiliencia ante redes inestables

> [!IMPORTANT]
> No se define implementación concreta. Solo se documenta la intención arquitectónica para adaptadores futuros.

---

## 6. COMPATIBILIDAD MULTI-DB (MySQL / PostgreSQL / SQL Server)

### 6.1 PostgreSQL (Base operativa actual)
- tipos nativos: `jsonb` y `numeric`
- transacciones: estándar ACID
- semántica de auditoría: insertar inmutable a `sgc_audit_logs`

### 6.2 MySQL (compatibilidad futura)
- estrategia conceptual para JSON:
  - mapear `value_json` a tipo JSON nativo equivalente
- constraints:
  - preservar tipado y validación por contrato/documento
- transacciones:
  - usar mecanismos del motor para all-or-nothing (equivalente a BEGIN/COMMIT)

### 6.3 SQL Server (compatibilidad futura)
- JSON:
  - mapear `options` y `value_json` a tipos NVARCHAR(MAX) con validación conceptual
- transacciones:
  - usar transacciones explícitas para submit/verify
- performance:
  - índices equivalentes a búsquedas por `field_id`/`response_id` (no se proponen columnas nuevas)

---

## 7. ADAPTER OBSERVABILITY Y CORRELACIÓN AUDIT-READY

### 7.1 Instrumentación documental (sin implementación)
El adaptador debe propagar/registrar un **correlation context**:

- `actorId`
- `responseId` (si aplica)
- conjunto de `storage_paths` involucrados
- `action_type` correspondiente

Este contexto se alinea con:
- `audit_engine.md`
- `runtime_api_contracts.md`
- `persistence_architecture.md`

### 7.2 Protección contra bloqueo tecnológico
Para evitar vendor lock:
- el adaptador es el lugar de “traducción”
- la arquitectura mantiene invariantes contractuales fuera del adaptador

---

## 8. RIESGOS DEL ADAPTER Y MITIGACIONES

| ID | Riesgo | Impacto | Mitigación |
| --- | --- | --- | --- |
| DA-R-01 | Divergencia del mapping EAV entre adaptadores | datos inconsistentes | single source of truth documental (contrato de mapeo) |
| DA-R-02 | Errores no clasificados (retryable/no) | retry mal orquestado | estandarizar error contract (runtime_api_contracts.md) |
| DA-R-03 | Auditoría omitida o fuera de frontera | no audit-ready | auditoría como parte del unit-of-work conceptual |
| DA-R-04 | Incompatibilidad de tipos JSON | pérdida de semántica | reglas conceptuales de tipo por field_type |

---

## 9. REFERENCIAS CRUZADAS

- `docs/database/persistence_architecture.md`
  - orchestrator y contrato `IRuntimePersistenceLayer`
  - retry, SAGA, caching metadata
- `docs/database/transaction_architecture.md`
  - all-or-nothing y operaciones atómicas
- `docs/database/runtime_api_contracts.md` (nuevo)
  - payloads, errores, idempotencia y correlación
- `docs/database/audit_engine.md` (nuevo)
  - audit-ready y protección normativa
- `docs/database/storage_architecture.md` (nuevo)
  - lifecycle y storage_path correlación
- `docs/core/runtime_state_architecture.md`
  - uploadQueue, draftSnapshot y conservación offline-first

---

**Documento mantenido por:** Dirección General de Arquitectura de Software e Integridad Operativa SGC-DM  
**Última actualización:** 24 de Mayo de 2026  
**Próxima revisión:** alineación final con `persistence_architecture.md` existente (consistencia terminológica)
