# Sprint 132.1C — Persistence Layer Bulk Operations Governance Audit (SSOT)

**Status**: LEVEL 3 — CERTIFIED
**Type**: Core Architecture Governance Sprint (Architectural Audit)
**Branch**: operativo-v1
**Dependencies**: Sprint 132 · Sprint 132.1A · Sprint 132.1B

---

## FASE 1 — Bulk Operations Responsibility Audit

### Pregunta fundamental

> ¿Quién debe ser responsable de implementar la operación masiva (el "cómo")?

### Diagnóstico actual

| Capa | Responsabilidad actual | Problema |
|------|----------------------|----------|
| **Runtime** | `handleBulkDelete()` → llama al Orchestrator con IDs | Correcto (solo coordinación UI) |
| **Orchestrator** | `bulkDelete(ids)` → itera `for(const id of ids) { service.delete(id) }` | **INCORRECTO** — implementa el "cómo" masivo |
| **Service** | `delete(id)` → DELETE individual. `insertBatch` existe pero `deleteBatch` NO | **AUSENTE** — falta el primitivo batch |

### Responsabilidad arquitectónica definitiva

```
┌─────────────────────────────────────────────────────────┐
│                      RUNTIME (UI)                        │
│  Responsabilidad: Selección, confirmación, feedback      │
│  NO debe conocer: Cómo se persiste, en qué DB, batch     │
│  Llama a: Orchestrator.bulkDelete(ids)                   │
└────────────────────────┬────────────────────────────────┘
                         │ ids[] + user
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR (Core)                     │
│  Responsabilidad: Validación (canApprove/canClose etc),  │
│                   Audit logging, EventBus publish        │
│  NO debe implementar: Bucles de persistencia             │
│  Llama a: Service.deleteBatch(ids)                       │
└────────────────────────┬────────────────────────────────┘
                         │ ids[] (ya validados)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              PERSISTENCE PROVIDER (Service)               │
│  Responsabilidad: CÓMO se ejecuta la operación masiva    │
│                   Chunking, concurrencia, SQL batch      │
│  NO debe exponer: Detalles del provider al Orchestrator  │
│  Implementa: deleteBatch, updateBatch, insertBatch       │
└────────────────────────┬────────────────────────────────┘
                         │ SQL / REST / API
                         ▼
┌─────────────────────────────────────────────────────────┐
│              DATABASE / EXTERNAL SYSTEM                   │
│  Responsabilidad: Ejecutar la transacción                │
└─────────────────────────────────────────────────────────┘
```

### Respuestas

**¿Debe conocer el Runtime cómo se eliminan los registros?**
→ **NO.** El Runtime solo pasa IDs. No sabe si es DELETE individual, batch SQL, soft delete, o una llamada API REST.

**¿Debe conocer el Orchestrator cómo se eliminan los registros?**
→ **NO.** El Orchestrator valida reglas de negocio, audita y publica eventos. Delega la ejecución al Persistence Provider mediante `deleteBatch(ids)`.

**¿Debe conocer el Persistence Provider cómo se eliminan los registros?**
→ **SÍ.** Es su responsabilidad exclusiva. Él decide: `IN (ids)` SQL, chunking, transacciones, concurrencia.

**¿La implementación debe variar dependiendo del proveedor de persistencia?**
→ **SÍ.** Esa es la esencia de Persistence Agnostic Architecture. Supabase usa `.in().delete()`, Firebase usa `delete()`, SQLite usa `DELETE WHERE id IN (...)`. Cada provider implementa su propia estrategia, pero expone la misma interfaz `deleteBatch(ids)`.

---

## FASE 2 — Persistence Layer Governance Audit

### Responsabilidades actuales

| Método | Existe | Batch | Escalable |
|--------|--------|-------|-----------|
| `fetch()` | ✅ | ❌ (sin paginación) | ❌ |
| `insert()` | ✅ | ❌ | ✅ (individual) |
| `update()` | ✅ | ❌ | ✅ (individual) |
| `delete()` | ✅ | ❌ | ❌ (individual) |
| `insertBatch()` | ✅ | ✅ (chunk 200) | ✅ |
| `deleteBatch()` | ❌ | ❌ | ❌ **AUSENTE** |
| `updateBatch()` | ❌ | ❌ | ❌ **AUSENTE** |

### Responsabilidades que le faltan

```
INTERFAZ MÍNIMA DEL PERSISTENCE PROVIDER

fetch(query?)              → Record[]        // getAll con paginación opcional
fetchById(id)              → Record          // getOne
insert(record)             → Record          // individual
insertBatch(records)       → Record[]        // batch con chunking (EXISTE)
update(id, record)         → Record          // individual
updateBatch(ids, record)   → Record[]        // *** FALTANTE ***
delete(id)                 → boolean         // individual
deleteBatch(ids)           → boolean         // *** FALTANTE ***
```

### ¿Es reutilizable?

**Parcialmente.** El patrón factory `createOperationalRecordsService(tableName, config)` es correcto y reutilizable. Pero está acoplado a Supabase directamente (`getSupabaseClient()`). Para ser Multi Provider, necesita una capa de abstracción adicional.

### ¿Es escalable?

**No, por la ausencia de `deleteBatch` y `updateBatch`.** El `insertBatch` demuestra que el patrón es conocido y viable. La omisión de `deleteBatch` es la causa raíz de la degradación identificada en Sprint 132.1B.

### ¿Es desacoplado del proveedor de base de datos?

**No.** `getSupabaseClient()` está hardcodeado. Para ser Persistence Agnostic, el provider debe inyectarse desde fuera.

### ¿Permite futuras integraciones?

**Potencialmente sí.** El factory pattern permite crear providers alternativos. Pero la interfaz actual no está formalizada como contrato.

---

## FASE 3 — Universal Bulk Operations Audit

### Clasificación arquitectónica definitiva

| Operación | ¿Es Core? | ¿Es Runtime? | ¿Es Persistence? | ¿Metadata Driven? | Provider Driven? |
|-----------|-----------|-------------|-----------------|-------------------|-----------------|
| **Bulk Delete** | ❌ Dominio | ❌ | ✅ Provider | ❌ | ✅ |
| **Bulk Insert** | ❌ Dominio | ❌ | ✅ Provider | ❌ | ✅ |
| **Bulk Update** | ❌ Dominio | ❌ | ✅ Provider | ❌ | ✅ |
| **Bulk Approval** | ✅ Dominio | ❌ | Usa `updateBatch` | ✅ | ❌ |
| **Bulk Close** | ✅ Dominio | ❌ | Usa `updateBatch` | ✅ | ❌ |
| **Bulk Reopen** | ✅ Dominio | ❌ | Usa `updateBatch` | ✅ | ❌ |
| **Bulk Import** | ✅ Dominio | ❌ | Usa `insertBatch` | ✅ | ❌ |
| **Bulk Export** | ✅ Dominio | ✅ Presentación | ❌ (datos en memoria) | ✅ | ❌ |
| **Bulk Restore** | ✅ Dominio | ❌ | Usa `updateBatch` | ✅ | ❌ |

### Explicación

**Provider Operations** (infraestructura):
- `deleteBatch`, `insertBatch`, `updateBatch`
- Son mecánicas de persistencia. No tienen reglas de negocio.
- El Runtime y Orchestrator no deben conocer los detalles.
- Cada proveedor implementa su estrategia óptima.

**Domain Operations** (core de negocio):
- `approveRecords`, `closeRecords`, `reopenRecords`
- Tienen reglas de negocio: `canApprove`, `canClose`, `canReopen`.
- Pertenecen al Orchestrator (Core).
- Su implementación de persistencia DELEGA en `updateBatch` del provider.

### Diagrama de responsabilidades

```
Runtime (UI)
  │
  ├─ handleBulkApprove()  → Orchestrator.approveRecords(ids)
  ├─ handleBulkClose()    → Orchestrator.closeRecords(ids)
  ├─ handleBulkReopen()   → Orchestrator.reopenRecords(ids)
  ├─ handleBulkDelete()   → Orchestrator.bulkDelete(ids)     ← ¿Domain o Provider?
  └─ handleBulkStatus()   → Orchestrator.bulkUpdateStatus()  ← ¿Domain o Provider?

Orchestrator (Core)
  │
  ├─ approveRecords()     → canApprove() + Service.updateBatch()     → Service
  ├─ closeRecords()       → canClose()   + Service.updateBatch()     → Service
  ├─ reopenRecords()      → canReopen()  + Service.updateBatch()     → Service
  ├─ bulkDelete()         → Service.deleteBatch()                     → Service
  └─ bulkUpdateStatus()   → Service.updateBatch()                     → Service

Persistence Provider (Service)
  │
  ├─ updateBatch(ids, data) → UPDATE chunked + transacted  → DB
  └─ deleteBatch(ids)       → DELETE IN chunked + transacted → DB
```

### ¿`bulkDelete` y `bulkUpdateStatus` son Domain o Provider?

Son **provider operations** disfrazadas de domain. No tienen reglas de negocio (cualquier registro puede eliminarse). No necesitan validación de estado. Pertenecen al provider.

Sin embargo, por consistencia arquitectónica y para mantener el patrón de Audit + EventBus, el Orchestrator puede exponer `bulkDelete` como un passthrough que:
1. Recibe IDs
2. Delega a `Service.deleteBatch(ids)`  ← responsabilidad del provider
3. Audita el resultado
4. Publica evento

El Orchestrator NO implementa el bucle. Solo orquesta.

---

## FASE 4 — Scalability Audit

### Proyección por volumen

| Registros | Hoy (secuencial) | Con `deleteBatch` + chunking |
|-----------|------------------|------------------------------|
| 10 | ~1s | ~100ms |
| 100 | ~10s | ~200ms |
| 1.000 | ~100s | ~500ms |
| 10.000 | ~16 min | ~2s |
| 100.000 | ~2.7 horas | ~15s |

### Escenarios Multi Company

En un escenario multi-empresa:
- Cada empresa puede tener su propia base de datos (separación física).
- El `PersistenceProvider` debe recibir la empresa como parámetro de conexión.
- El Runtime y Orchestrator NO cambian — solo el provider sabe a qué DB conectar.

```
MultiCompanyProvider : PersistenceProvider {
  constructor(companyId) {
    this.db = getConnectionForCompany(companyId);
  }
  deleteBatch(ids) {
    return this.db.table.delete().in('id', ids);
  }
}
```

### Escenarios Multi Módulo

Cada experiencia operacional (Despachos, Recepción, etc.) tiene su propio contrato y tabla. El factory `createOperationalRecordsService` ya resuelve esto:
```
createOperationalRecordsService('despachos', { prefix: 'DES' })
createOperationalRecordsService('recepcion', { prefix: 'REC' })
```

Cada instancia puede tener su propio provider. No hay acoplamiento entre módulos.

### Cuellos de botella por capa

| Capa | 10 | 100 | 1.000 | 10.000 | 100.000 |
|------|----|-----|-------|--------|---------|
| **Runtime (render)** | ✅ | ✅ | ⚠️ Virtual scroll necesario | ❌ Paginación obligatory | ❌ |
| **Orchestrator (validación)** | ✅ | ✅ | ✅ | ⚠️ Batch validate | ⚠️ |
| **Service (persistencia)** | ✅ | ✅ | ✅ (con batch) | ⚠️ Chunking 500 | ⚠️ Chunking 1000 |
| **Audit (log)** | ✅ | ✅ | ⚠️ Batch audit | ❌ Batch audit necesario | ❌ |
| **Red (HTTP)** | ✅ | ✅ | ⚠️ Chunking | ❌ | ❌ |

---

## FASE 5 — Future Integrations Audit

### Matriz de compatibilidad

| Proveedor | ¿Runtime cambia? | ¿Orchestrator cambia? | ¿Provider cambia? |
|-----------|-----------------|----------------------|-------------------|
| **PostgreSQL nativo** | No | No | ✅ Provider nuevo |
| **Supabase** | No | No | ✅ Provider existente (mejorar) |
| **Firebase Firestore** | No | No | ✅ Provider nuevo |
| **SQLite** | No | No | ✅ Provider nuevo |
| **IndexedDB** | No | No | ✅ Provider nuevo |
| **REST API externa** | No | No | ✅ Provider nuevo |
| **ERP (SAP, etc)** | No | No | ✅ Provider nuevo |
| **MongoDB** | No | No | ✅ Provider nuevo |

### Implicaciones

**Runtime**: 0 cambios. Siempre llama a `orchestrator.bulkDelete(ids)`. No sabe ni le importa si los datos van a Supabase, Firebase o un ERP.

**Orchestrator**: 0 cambios. Siempre valida, delega al provider, audita, publica evento.

**Provider**: Cambia completamente. Es el único punto de variación. Cada proveedor implementa:
```js
// Interfaz contractual (implícita hoy, explícita mañana):
class PersistenceProvider {
  async fetch(query) {}
  async insert(record) {}
  async insertBatch(records) {}
  async update(id, record) {}
  async updateBatch(ids, record) {}
  async delete(id) {}
  async deleteBatch(ids) {}
}
```

### ¿El Provider puede encapsular las diferencias tecnológicas?

**SÍ.** Esa es su función. Un provider de Supabase genera REST calls. Un provider de Firebase genera document writes. Un provider de ERP genera SOAP/XML. El Orchestrator ve la misma interfaz.

### Estrategia de integración para ERP

```
Runtime → Orchestrator.bulkDelete(ids)
  → Orchestrator valida (canApprove etc.)
  → Orchestrator.deleteBatch(ids)
    → ERPProvider.deleteBatch(ids)
      → POST /api/orders/batch-delete { ids: [...] }
      → ERP responde { success: true, deleted: 45, failed: 5 }
    → Orchestrator audita resultado
    → Orchestrator publica evento
  → Runtime actualiza UI
```

El Runtime no sabe que está llamando a un ERP. El Orchestrator no sabe que es un ERP. Solo el Provider lo sabe.

---

## Modelo Arquitectónico Definitivo

### Principio: "The Provider Knows How"

```
┌──────────────────────────────────────────┐
│           UNIVERSAL OPERATIONAL RUNTIME   │
│  (React Component)                        │
│                                           │
│  handleBulkDelete = (ids) =>              │
│    orchestrator.bulkDelete(ids, user)     │
│    → setRecords(filtered)                 │
│    → setSelectedIds(empty)                │
│    → setBanner(success)                   │
└──────────────────┬───────────────────────┘
                   │ llama
                   ▼
┌──────────────────────────────────────────┐
│    OPERATIONAL EXPERIENCE LIFECYCLE       │
│    ORCHESTRATOR (Core)                    │
│                                           │
│  bulkDelete = async (ids, user) =>        │
│    ✅ Valida (si aplica reglas)           │
│    ✅ service.deleteBatch(ids)            │ ← DELEGA
│    ✅ OperationalAuditService(...)        │
│    ✅ EventBus.publish(...)               │
│    return result                          │
└──────────────────┬───────────────────────┘
                   │ delega
                   ▼
┌──────────────────────────────────────────┐
│      PERSISTENCE PROVIDER (Service)       │
│                                           │
│  deleteBatch = async (ids) =>             │
│    🔧 Decide estrategia:                   │
│    ├─ Chunking (500 por lote)             │
│    ├─ Transacción SQL                     │
│    ├─ Concurrencia controlada             │
│    └─ Provider-specific (IN clause, etc.) │
│    return { deleted: N }                  │
└──────────────────────────────────────────┘
```

### Reglas de oro

1. **El Runtime nunca itera persistencia.** Solo pasa IDs y recibe resultados.
2. **El Orchestrator nunca itera persistencia.** Delega al provider.
3. **El Provider siempre implementa batch operations.** Si el provider subyacente no soporta batch, el Provider lo simula (chunking + concurrencia), pero el Orchestrator no lo sabe.
4. **El Audit es responsabilidad del Orchestrator, no del Provider.** El Provider persiste; el Orchestrator registra qué ocurrió.
5. **El EventBus es responsabilidad del Orchestrator.** El Provider no publica eventos.

---

## Lo que DEBE optimizarse (orden de prioridad)

| Prioridad | Qué | Dónde | Por qué |
|-----------|-----|-------|---------|
| **P1** | `deleteBatch(ids)` | Persistence Provider | Causa raíz del Sprint 132.1B |
| **P2** | `updateBatch(ids, data)` | Persistence Provider | Habilitar approve/close/reopen batch real |
| **P3** | Audit logging batch | Orchestrator | Evitar N inserts secuenciales |
| **P4** | Paginación en `fetch()` | Persistence Provider | Evitar cargar 10K registros en memoria |
| **P5** | Virtual scrolling | Runtime | Renderizar solo filas visibles |
| **P6** | Memoización diferencial | Runtime | No recalcular 999 scores si 1 cambió |
| **P7** | Provider abstraction interface | Persistence Layer | Para Multi Provider real |

## Lo que NO debe modificarse

| Componente | Razón |
|------------|-------|
| `UniversalOperationalRuntime.jsx` (lógica de negocio) | La UI delega correctamente en el Orchestrator |
| `OperationalExperienceLifecycleOrchestrator.js` (validación) | Sprint 132.1A certificó su rol como autoridad del lifecycle |
| Contratos metadata | No depende de cómo se persiste |
| `EventBus` | Es un mecanismo genérico, no necesita cambios |

---

## Certificación

**Architecture Status**: LEVEL 3 — PERSISTENCE LAYER BULK OPERATIONS GOVERNANCE CERTIFIED (SSOT)

Se certifica:

1. **Responsable de las operaciones masivas**: El **Persistence Provider** (capa de servicio). No el Runtime, no el Orchestrator.
2. **El Orchestrator delega, no implementa**: La corrección de Sprint 132.1B requiere mover el bucle de persistencia desde el Orchestrator al Provider.
3. **`deleteBatch` y `updateBatch` son los primitivos faltantes**: Sin ellos, ninguna optimización de grano más fino será efectiva.
4. **La interfaz del Provider debe formalizarse**: Para permitir Multi Provider real sin afectar el Core.
5. **El Runtime es estable**: No necesita cambios para soportar batch operations.
6. **El Core es estable**: Orchestrator, EventBus, Audit Service no necesitan cambios estructurales.
7. **Multi Company se resuelve en el Provider**: Cada empresa recibe su propia instancia del provider con su conexión.
8. **Multi Provider se resuelve en el Provider**: La factory `createOperationalRecordsService` debe aceptar un provider en lugar de hardcodear Supabase.
