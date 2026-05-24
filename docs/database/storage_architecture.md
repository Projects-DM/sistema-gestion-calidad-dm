# 🗃️ ARQUITECTURA DE STORAGE Y LIFECYCLE MANAGEMENT (STORAGE ARCHITECTURE)
## Sistema de Gestión de Calidad (SGC-DM) — Fase 2: Infrastructure & Persistence Layer
**Autor:** Principal Software Architect / Enterprise Solution Architect  
**Versión:** 1.0 (Fase 2 — Storage & Lifecycle)  
**Estatus:** BORRADOR PARA REVISIÓN DOCUMENTAL  
**Clasificación:** Confidencial / Propiedad Técnica Integradora  

---

## 1. VISIÓN GENERAL

### 1.1 Propósito

La **arquitectura de Storage** define el modo en que SGC-DM administra los **recursos físicos** (evidencias fotográficas, firmas digitales y adjuntos operacionales) con el objetivo de:

- Soportar **offline-first** de forma documental/arquitectónica (upload precede al commit de DB).
- Mantener **protección de auditoría**: la evidencia física debe poder correlacionarse con el registro transaccional y su traza inmutable.
- Implementar **storage lifecycle management** con compensación segura (SAGA) para evitar archivos huérfanos.
- Preparar el sistema para **multi-storage futuro** (Supabase Storage hoy; S3/GCS/FS local futuro) manteniendo el runtime desacoplado.

> [!IMPORTANT]
> **Regla de Oro:** El Storage NO reemplaza a la auditoría ni a la consistencia transaccional de DB. El Storage opera como **componente de persistencia complementaria**, siempre coordinado por la capa de persistencia/transaction orchestration.

---

## 2. POSICIÓN EN LA ARQUITECTURA ENTERPRISE

### 2.1 Relación Storage ↔ Persistencia transaccional

En SGC-DM, el orden conceptual recomendado es:

1. **Upload de evidencias** (Storage) → genera `storage_path` y `public_url`.
2. **Submit transaccional** (DB) → inserta `sgc_form_responses` + `sgc_response_values` + referencias de evidencias + auditoría inmutable.
3. Si falla el commit, se ejecuta **compensación** sobre Storage.

Este orden es coherente con `transaction_architecture.md` (estrategia SAGA para huérfanos) y con `persistence_architecture.md` (orquestación única).

---

## 3. TAXONOMÍA CONCEPTUAL DE OBJETOS EN STORAGE

### 3.1 Tipos de recursos

SGC-DM clasifica los objetos físicos por su relación semántica con el runtime:

- **Evidencias de campo (`evidence`)**
  - Fotos, imágenes o adjuntos que soportan valores capturados en un formulario.
- **Firmas digitales (`signature`)**
  - Trazos o firmas renderizadas (ej. PNG) con correlación a campos de tipo firma.

> [!NOTE]
> El tipo de objeto define la convención del `storage_path` y la correlación necesaria para auditoría.

### 3.2 Identificadores de correlación (correlation keys)

Para trazabilidad y lifecycle, cada objeto en Storage debe permitir correlación con:

- `response_id` (correlación primaria con el registro transaccional)
- `field_id` (correlación secundaria con el campo del contrato/formulario)
- `tenant_id` (si se habilita multi-tenant futuro; recomendado como extensible)
- `client_request_id` o `draft_snapshot_id` (opcional, para idempotencia en reintentos offline-first; ver `runtime_api_contracts.md`)

---

## 4. CONVENCIÓN DE RUTAS (storage_path) Y ESTRUCTURA LÓGICA

### 4.1 Principios

La convención de ruta en Storage debe:
- Ser **determinística** o al menos trazable (para compensación SAGA).
- Ser **particionada** por fechas/response para facilitar depuración operacional.
- Permitir aplicar **políticas de limpieza** por caducidad (TTL lógico).

### 4.2 Propuesta de estructura (conceptual)

Ejemplo conceptual de `storage_path`:

- Evidencias:
  - `evidencias/{tenantId?}/{responseId}/{fieldId}/{yyyy}/{mm}/{dd}/{objectId}.ext`
- Firmas:
  - `firmas/{tenantId?}/{responseId}/{fieldId}/{objectId}.png`

El `objectId` puede ser:
- un UUID generado por el cliente, o
- un identificador temporal del upload queue.

> [!IMPORTANT]
> La arquitectura exige que el `storage_path` sea devuelto por el Storage Provider y luego guardado en DB (tabla `sgc_evidences.storage_path`), para que la compensación SAGA sea posible sin ambigüedad.

---

## 5. STORAGE PROVIDER ABSTRACTION (PLUGGABLE STORAGE)

### 5.1 Objetivo de desacoplamiento

SGC-DM requiere que el runtime/persistencia no dependan del proveedor físico. Por lo tanto, se define un contrato conceptual de **StorageProvider**:

- `upload(file, path): UploadResult`
- `delete(paths[]): void`
- `getPublicUrl(path): string` (si aplica)
- `healthCheck(): boolean`

La implementación real puede ser Supabase Storage hoy; S3/GCS/FS local futuro.

> [!NOTE]
> Este documento es exclusivamente arquitectónico: no se introducen microservicios ni lógica ejecutable nueva.

---

## 6. LIFECYCLE MANAGEMENT: ESTADOS LÓGICOS DE LOS OBJETOS

### 6.1 Modelo de estados

Cada objeto en Storage recorre estados lógicos (documentales):

1. **`uploaded_temp`**
   - El archivo está en Storage pero aún NO existe commit transaccional asociado.
2. **`committed_ref`**
   - DB registró `sgc_evidences` con el `storage_path` (vínculo confirmado).
3. **`orphan_candidate`**
   - Si falla DB tras upload, el objeto queda candidato a limpieza.
4. **`purged`**
   - Eliminado por compensación SAGA inmediata o limpieza por TTL programado.

### 6.2 Transiciones

- `uploaded_temp` → `committed_ref`
  - cuando `submitFormResponse` confirma el commit SQL e inserta la referencia.
- `uploaded_temp` → `orphan_candidate`
  - cuando falla el commit transaccional luego de subir evidencias.
- `orphan_candidate` → `purged`
  - por compensación inmediata (SAGA) o por proceso de purga.

---

## 7. COMPENSACIÓN SAGA SOBRE STORAGE (HUÉRFANOS)

### 7.1 Condición de huérfanos

Un archivo es huérfano si:
- fue subido al Storage con éxito,
- pero DB no pudo insertar/confirmar `sgc_form_responses` y/o `sgc_evidences`.

### 7.2 Acción de compensación

La compensación debe:
- eliminar del bucket los `storage_path` generados durante el submit,
- registrar/propagar en el runtime un resultado transaccional (retryable/non-retryable) según el error.

> [!IMPORTANT]
> La arquitectura exige que el algoritmo de borrado use exclusivamente `storage_path` devueltos por Storage Provider para evitar borrados equivocados.

### 7.3 TTL de seguridad (limpieza programada)

Como respaldo operacional (no como reemplazo de SAGA), se recomienda:
- una purga por edad de `uploaded_temp` sin referencia en DB.

Este TTL es un mecanismo de resiliencia operacional y reduce riesgo de storage growth.

---

## 8. OFFLINE-FIRST Y STORAGE: INTERACCIÓN DOCUMENTAL

SGC-DM define que offline-first debe preservar el trabajo del operario.

En el caso de evidencias:
- La subida puede ocurrir mientras hay conectividad parcial.
- Si no hay conectividad, el runtime mantiene una cola en memoria/IndexedDB (`uploadQueue`) hasta reconectar.
- Al reconectar, se ejecuta el flujo normal:
  1) upload que confirma `public_url`,
  2) submit transaccional DB,
  3) compensación si algo falla.

> [!NOTE]
> Este documento no prescribe ejecución; describe el contrato de coordinación con `runtime_state_architecture.md` y `persistence_architecture.md`.

---

## 9. PROTECCIÓN DE AUDITORÍA Y CONSISTENCIA OPERACIONAL

### 9.1 Evidencia ↔ auditoría

La evidencia física debe estar correlacionada con:
- `sgc_form_responses.id` (response_id)
- `sgc_form_fields.id` (field_id)
- `sgc_evidences.storage_path` y `file_url`/`public_url`
- `sgc_audit_logs.action_type` y `created_at` (trazabilidad inmutable)

La arquitectura de auditoría se desarrolla en `audit_engine.md`.

### 9.2 Minimización de superficie de ataque (operacional)

Sin diseñar lógica ejecutable nueva, se establecen requisitos:
- bucket público o semi-público SOLO si el contrato legal lo permite (hoy, según docs existentes, existe bucket público).
- eliminación controlada para administradores (si el modelo lo exige).
- RLS y políticas de Storage alineadas con roles del runtime (requisito conceptual, no implementación).

---

## 10. MULTI-STORAGE FUTURO: COMPATIBILIDAD POR CONTRATO

Para garantizar escalabilidad progresiva sin reescritura:
- El runtime persiste únicamente `storage_path` y la referencia pública (según proveedor).
- Los contratos de `UploadResult` y `delete(paths)` deben ser equivalentes en forma y semántica.
- `audit_engine.md` debe poder correlacionar evidencia incluso si el backend cambia.

---

## 11. RIESGOS Y MITIGACIONES (STORAGE)

| ID | Riesgo | Impacto | Mitigación Arquitectónica |
| --- | --- | --- | --- |
| ST-R-01 | Archivos huérfanos por fallo DB post-upload | Crecimiento storage, costo y desorden operacional | SAGA + purga TTL por candidatos |
| ST-R-02 | Paths no determinísticos o no trazables | Compensación imposible o borrados incorrectos | Convención y correlación obligatoria |
| ST-R-03 | Incompatibilidad futura con otro proveedor | Bloqueo tecnológico | StorageProvider abstraction por contrato |
| ST-R-04 | Pérdida de correlación evidence↔response | Auditoría incompleta | Guardar storage_path en `sgc_evidences` y referenciar `response_id` |

---

## 12. REFERENCIAS CRUZADAS EN LA ARQUITECTURA

- `docs/database/persistence_architecture.md`
  - Orquestación submit + registro `sgc_evidences` + retry/backoff + SAGA.
- `docs/database/transaction_architecture.md`
  - Estrategia rollback/compensación para evidencia.
- `docs/core/runtime_state_architecture.md`
  - `uploadQueue` y `draftSnapshot` para offline-first.
- `docs/database/database_setup.md`
  - Bucket `documentos-sgc` y políticas de acceso (referencia operativa).
- `docs/database/audit_engine.md` (a crear)
  - Integridad audit-ready y correlación evidencia ↔ bitácora inmutable.

---

**Documento mantenido por:** Dirección General de Arquitectura de Software e Integridad Operativa SGC-DM  
**Última actualización:** 24 de Mayo de 2026  
**Próxima revisión:** antes de finalizar Fase 2B (alineación runtime + contratos)
