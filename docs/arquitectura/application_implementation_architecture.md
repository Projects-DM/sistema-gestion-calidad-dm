# 🏗️ APPLICATION IMPLEMENTATION ARCHITECTURE (Blueprint) — SGC-DM
## Sistema de Gestión de Calidad (SGC-DM) — Transición: ARCHITECTURE → IMPLEMENTATION
**Autor:** Principal Enterprise Software Architect  
**Versión:** 1.0 (Implementation Blueprint)  
**Estatus:** BORRADOR PARA REVISIÓN DOCUMENTAL  
**Clasificación:** Confidencial / Propiedad Técnica Integradora  

---

## 0. Objetivo del documento

Aterrizar la arquitectura enterprise aprobada hacia una **estructura de implementación real** para:

- React (UI runtime-driven)
- Supabase (Auth/DB/Storage hoy)
- runtime engine (metadatos → ejecución dinámica)
- persistencia orquestada (contrato → adaptador → DB/Storage)
- offline-first (draft + upload queue; coordinación documental)
- audit-ready (trazabilidad normativa)

> [!IMPORTANT]
> Este documento es 100% blueprint y **NO** diseña lógica ejecutable nueva, **NO** reescribe documentos existentes, **NO** altera tablas, y **NO** requiere modificaciones de componentes React.

---

## 1. Invariantes enterprise que debe respetar la implementación

1. **Metadata-driven & reusable-first:** UI y ejecución dinámica se fundamentan en contracts de form/field.
2. **Runtime-oriented:** la UI se mantiene como “presentational” y delega a servicios orquestadores.
3. **Contract-based:** el runtime no depende del proveedor físico; depende del contrato de persistencia.
4. **Audit-ready:** toda operación transaccional incorpora bitácora correlacionable.
5. **Offline-first:** se conserva el trabajo del operario (draft + upload queuing) hasta commit confirmado.
6. **Event-driven runtime platform:** propagación de side-effects mediante Event Bus (en proceso) y correlación audit-ready.
7. **Database-agnostic:** compatibilidad conceptual para PostgreSQL/MySQL/SQL Server a través de adaptadores (sin vendor lock en runtime).

---

## 2. Realidad actual de implementación (observada en el código)

Sin modificar código, este blueprint toma como evidencia que hoy existe acoplamiento directo a Supabase en `src/services/dynamicService.js`:

- Lecturas de metadata: `sgc_modules`, `sgc_forms`, `sgc_form_fields`
- Operaciones de escritura: `sgc_form_responses`, `sgc_response_values`, `sgc_evidences`, `sgc_audit_logs`
- Flujo de submit/verify implementado con múltiples round-trips secuenciales (lo cual contrasta con el modelo “all-or-nothing” documental de `transaction_architecture.md`).

> [!WARNING]
> Este documento no corrige código ahora. Solo define **cómo** debería organizarse la implementación para respetar los contratos enterprise ya aprobados.

---

## 3. Capas de implementación (estructura real de responsabilidades)

### 3.1 Vista operacional: capas

```
[ UI / Pages ]  ──(contratos payload)──►  [ Runtime Orchestration ]
                                         [ TransactionService ]
                                         [ Validation orchestration hooks ]
                                         [ Workflow orchestration ]
                                         [ Event propagation ]

TransactionService ──(IRuntimePersistenceLayer port)──► [ PersistenceOrchestrator ]
PersistenceOrchestrator ──(adapter port)──► [ DB Adapter + StorageProvider ]
DB Adapter ──► [ DB (tables EAV + audit logs) ]
StorageProvider ──► [ Storage (storage_path lifecycle) ]

Luego: se publican eventos al Event Bus (in-process) para analytics/side-effects.
```

### 3.2 Mapa de responsabilidades por componente

- **UI (React Pages / Components)**
  - Captura y renderizado
  - No conoce SQL ni tablas
  - No ejecuta reglas transaccionales: solo consume contrato de alto nivel

- **Runtime Orchestration (Transaction/Workflow/Validation)**
  - Construye payloads
  - Invoca persistencia vía contrato
  - Define semántica de retry/error y conservación offline-first (documental)

- **PersistenceOrchestrator (IRuntimePersistenceLayer)**
  - Retry orchestration
  - Mapping EAV
  - Coordinación con Storage (SAGA para evidencia huérfana)
  - Propagación de errores con semántica retryable

- **Adapters**
  - SupabaseAdapter (activo)
  - Adaptadores futuros: SQLServerAdapter / RestApiAdapter (solo conceptual)
  - StorageProvider (Supabase Storage hoy)

- **Audit & Event Propagation**
  - Audit Engine asegura correlación y fronteras
  - Event Bus distribuye side-effects después de commit (consistencia eventual para analytics)

---

## 4. Flujo completo de implementación (operacional y contract-based)

### 4.1 Submit (workflow de captura de planta)

**Entrada de UI / Runtime:**
- `formId`, `userId`
- `values` (map EAV `{ [field_id]: value }`)
- `uploadQueue` / evidences ya subidas (storage refs)
- metadata operacional (capturedAt, geolocation opcional, networkType opcional, draftRecovered opcional)

**Contrato interno (documental) que debe aplicarse:**
1. Validar que payload respeta el contrato del form/field (ya lo hace ValidationEngine)
2. PersistenceOrchestrator:
   - Retry/backoff si error transitorio
   - Coordina mapping EAV → `sgc_response_values` (bulk conceptual)
   - Coordina evidencias: inserta `sgc_evidences` con `storage_path`
   - Inserta `sgc_audit_logs` inmutable
3. Si falla DB post-upload:
   - Compensación SAGA: eliminar por `storage_path` (storage lifecycle management)

**Salida:**
- success + `responseId` o error con `retryable`

> [!IMPORTANT]
> La implementación debe conservar el “estado del operario” en UX hasta commit confirmado (offline-first semantics).

---

### 4.2 Verify (aprobación/rechazo)

Entrada:
- `responseId`, `verifierId`, `action`, `comment`, `signatureStoragePath?`

Orquestación:
- actualización de `sgc_form_responses` (status y verificación)
- insertar `sgc_audit_logs`
- eventos de workflow (audit-ready y event-driven side effects)

---

## 5. Offline-first y sincronización (implementación documental)

La implementación debe respetar los invariantes de `runtime_state_architecture.md`:

- **Draft snapshot** preserva `formValues` + `uploadQueue`
- `uploadQueue` mantiene estados del ciclo de subida
- en errores transitorios:
  - no borrar el trabajo del operario
  - mantener modo RETRY y reintentar cuando vuelva la conectividad
- SAGA de storage elimina evidencia solo cuando DB falla después del upload

---

## 6. Integración Supabase (sin romper vendor-agnosticidad)

- **Supabase DB Adapter** traduce el contrato a operaciones físicas
- **Supabase StorageProvider** gestiona `storage_path` y `delete(paths)`
- el runtime NO debería depender de `@supabase/supabase-js` directamente

> [!WARNING]
> La evidencia actual muestra uso directo de `supabase.from(...)` desde services. La implementación enterprise blueprint recomienda reemplazarlo por adapter/port usage progresivo (sin reescribir runtime engine).

---

## 7. Recomendaciones profesionales: inconsistencias / riesgos detectados (sin código)

### 7.1 Riesgos de consistencia transaccional
- El flujo observable de `dynamicService.submitFormResponse` realiza INSERTs secuenciales sin una frontera transaccional unificada (contradice el “all-or-nothing” de `transaction_architecture.md` y incrementa riesgo de datos huérfanos).

### 7.2 Riesgo de auditoría incompleta
- La auditoría se inserta al final del submit; si falla antes de completar valores/evidencias, puede quedar inconsistencia entre registro maestro y evidencia/values.

### 7.3 Riesgo de bloqueo tecnológico (vendor lock)
- Services dependen explícitamente de Supabase y de estructura de tablas: dificulta migración a otros motores, contraviniendo `database-agnostic` ya aprobado.

### 7.4 Riesgo de retry/deduplicación
- Reintentos ante fallas transitorias no están protegidos por un contrato de idempotencia explícito (offline-first requiere deduplicación conceptual para evitar duplicados en DB y auditoría).

---

## 8. Resultado esperado tras esta blueprint (qué “debe existir”)

Aunque no se implemente ahora:
- una estructura de carpetas que refleje los límites de responsabilidad
- un uso conceptual de ports/adapters
- un flujo de retry/orchestration consistente con contratos Fase 2
- una correlación audit-ready evidencia ↔ response_id vía `storage_path`

---

**Fin del documento**
