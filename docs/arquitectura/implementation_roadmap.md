# 🗺️ IMPLEMENTATION ROADMAP (IMPLEMENTATION_ROADMAP) — SGC-DM
## Sistema de Gestión de Calidad (SGC-DM) — Transición a “Implementation Blueprint”
**Autor:** Principal Enterprise Software Architect  
**Versión:** 1.0 (Implementation Roadmap)  
**Estatus:** BORRADOR PARA REVISIÓN DOCUMENTAL  
**Clasificación:** Confidencial / Propiedad Técnica Integradora  

---

## 0. Propósito

Este documento define un **roadmap documental** para convertir la arquitectura enterprise aprobada en una implementación real para:

- React (runtime-driven metadata-oriented)
- Supabase (DB + Auth + Storage) inicialmente
- event-driven runtime platform (in-process hoy)
- offline-first (draft snapshot + upload queue semántico)
- audit-ready (correlación legal)

> [!IMPORTANT]
> Restricción del proyecto: **no se modifica código ni tablas** en esta fase de documentación.  
> El roadmap define el orden de preparación/reestructuración conceptual.

---

## 1. Entrada (arquitectura ya aprobada)

La implementación debe respetar contratos y límites definidos por:

- `docs/database/persistence_architecture.md`
- `docs/database/transaction_architecture.md`
- `docs/database/storage_architecture.md` (nuevo)
- `docs/database/runtime_api_contracts.md` (nuevo)
- `docs/database/audit_engine.md` (nuevo)
- `docs/database/infrastructure_layers.md` (nuevo)
- `docs/database/database_adapter_architecture.md` (nuevo)
- `docs/core/runtime_state_architecture.md`
- `docs/core/dynamic_runtime_engine.md`
- `docs/core/event_bus_architecture.md`

---

## 2. Estado actual observado (riesgos a corregir, sin ejecutar cambios)

Basado en evidencia en `src/services/dynamicService.js`:

- Existe acoplamiento directo a Supabase (`supabase.from(...)`) desde servicios.
- Se ejecutan múltiples operaciones secuenciales (insert response → values → evidences → audit) sin una frontera transaccional unificada en el lado del “orchestrator” conceptual.
- No aparece contrato explícito de idempotencia/deduplicación (relevante offline-first y retries).
- El mapping EAV se define en un único servicio de forma acoplada (riesgo de duplicación futura y vendor lock).

---

## 3. Roadmap por hitos (documental → implementación real)

### Hito 1 — Base de estructura modular (target state)
**Objetivo:** establecer una estructura de implementación coherente con `project_structure_blueprint.md`.

- Adoptar la estructura target en `src/` (carpetas y ownership).
- Definir el “mapa de dependencias” según `runtime_module_dependencies.md`.
- Definir un punto de verdad documental:
  - `IRuntimePersistenceLayer` como contrato conceptual (ver `runtime_api_contracts.md` + `persistence_architecture.md`)
  - `Audit Engine` como correlación audit-ready (ver `audit_engine.md`)
  - `Storage lifecycle` como `storage_path` + SAGA (ver `storage_architecture.md`)

**Entregables (documentales y de preparación):**
- checklist de “prohibiciones” (ej. no usar supabase-js fuera de adapters)
- plantilla de adapter (DB/Storage) conceptual

---

### Hito 2 — Orquestación de persistencia consistente (boundary transaccional)
**Objetivo:** alineación conceptual del flujo transaccional con `transaction_architecture.md` y `persistence_architecture.md`.

- Convertir a nivel de diseño:
  - TransactionService como “single orchestration facade”
  - PersistenceOrchestrator como implementador conceptual del port `IRuntimePersistenceLayer`
- Asegurar la semántica:
  - all-or-nothing conceptual para submit/verify
  - propagación de errors con `retryable`/`non-retryable`
  - correlación audit-ready en el mismo unit-of-work conceptual

**Entregables:**
- documento de “flow contract” (submit/verify/workflow transitions) ya descrito en `application_implementation_architecture.md`
- catálogo de errores con semántica para retry orchestration (ver `runtime_api_contracts.md`)

---

### Hito 3 — Offline-first: contrato de sincronización y evidencias
**Objetivo:** asegurar que el cliente conserve el trabajo ante fallas, respetando `runtime_state_architecture.md`.

- Documentar semántica de:
  - `draftSnapshot`
  - `uploadQueue`
  - retomar submit con idempotencia (contrato documental)
- Documentar coordinación de evidencia:
  - upload que precede al commit conceptual
  - SAGA cleanup por `storage_path` si DB falla

**Entregables:**
- checklist de offline sync (documental)
- alineación storage ↔ audit correlation

---

### Hito 4 — Event propagation y audit orchestration (event-driven, audit-ready)
**Objetivo:** integrar event-driven side-effects como eventual y desacoplado.

- Asegurar que:
  - eventos críticos se registren y/o correlacionen con `sgc_audit_logs` (audit-ready)
  - analytics/IA-ready sean eventual y no bloqueen UI

**Entregables:**
- catálogo de eventos relevantes (con base en `event_bus_architecture.md`)
- reglas de correlación por `response_id` y `storage_path`

---

### Hito 5 — Multi-DB / multi-storage readiness (sin reescritura)
**Objetivo:** conservar “database-agnostic” como invariantes.

- Documentar how-to migrar conceptual:
  - reemplazar adapter DB y StorageProvider
  - conservar mapping EAV y contratos de errores
- Garantizar que el runtime no dependa de SQL/API del proveedor.

**Entregables:**
- tabla de compatibilidad (DB adaptadores futuros) con invariantes
- revisión de vendor lock (riesgo residual)

---

## 4. Riesgos restantes y cómo tratarlos (recomendaciones enterprise)

| Riesgo | Evidencia actual | Mitigación recomendada (documental → posterior refactor) |
| --- | --- | --- |
| Transaccionalidad incompleta | múltiples INSERT secuenciales en `dynamicService.js` | centralizar unit-of-work conceptual en PersistenceOrchestrator |
| Duplicación mapping EAV | mapping EAV en un único servicio | mover “single mapping” a orchestrator/adapter conceptual |
| Idempotencia offline | no definida contractualmente | agregar idempotency key contractual (sin tablas nuevas ahora) |
| Vendor lock Supabase | uso directo de `supabase-js` en services | encapsular en adapters (port & adapter target state) |
| Auditoría inconsistente | audit logs fuera de frontera unificada conceptual | audit-ready como parte del unit-of-work conceptual |

---

## 5. Checklist de cierre (Definition of Done documental)

Para declarar que el “Implementation Blueprint” está listo:

1. Existe estructura objetivo definida (`project_structure_blueprint.md`)
2. Existe matriz de dependencias con permitidos/prohibidos (`runtime_module_dependencies.md`)
3. Existe flow operacional completo (submit/verify/workflow/audit/storage/offline) (`application_implementation_architecture.md`)
4. Existe despliegue conceptual y fronteras (cliente↔Supabase) (`deployment_architecture.md`)
5. Existe plan de evolución y mitigación de riesgos (`implementation_roadmap.md`)
6. Se documenta coherencia con contracts Fase 2 (`storage/runtime_api/audit/infrastructure/adapter`)

---

**Documento mantenido por:** Dirección General de Arquitectura de Software e Integridad Operativa SGC-DM  
**Última actualización:** 24 de Mayo de 2026
