# 🔗 RUNTIME MODULE DEPENDENCIES (MATRIZ DE RESPONSABILIDADES) — SGC-DM
## Sistema de Gestión de Calidad (SGC-DM) — Blueprint de Dependencias de Implementación
**Autor:** Principal Enterprise Software Architect  
**Versión:** 1.0 (Implementation Blueprint)  
**Estatus:** BORRADOR PARA REVISIÓN DOCUMENTAL  
**Clasificación:** Confidencial / Propiedad Técnica Integradora  

---

## 0. Propósito

Este documento define la **matriz de dependencias** y restricciones para aterrizar la arquitectura enterprise aprobada en una **estructura modular de implementación**.

Su objetivo es prevenir:
- vendor lock tecnológico
- duplicación de mapping EAV
- mezcla de responsabilidades (runtime vs persistence vs audit)
- overlaps entre capas (transaction/orchestrator/adapter)
- riesgos de auditoría y consistencia transaccional
- bloqueos tecnológicos al migrar Supabase/PostgreSQL hacia otros motores

> [!IMPORTANT]
> Documento exclusivamente documental: no implica cambios de código ni reestructuras automáticas.

---

## 1. Unidades de implementación (conceptuales)

Para este blueprint, definimos “módulos” como dominios de responsabilidad (no carpetas obligatorias). Se alinean con el `target state` propuesto en `project_structure_blueprint.md`.

### 1.1 Módulos principales
- **UI/Pages (Presentational)**  
- **Runtime Orchestration** (transaction/workflow/validation orchestration)
- **Persistence Orchestrator** (port `IRuntimePersistenceLayer`)
- **Adapters** (DB Adapter + StorageProvider)
- **Audit Engine (contractual)** (correlación audit-ready)
- **Event Bus** (in-process)
- **Offline-first layer** (draft snapshot + upload queue conceptual)
- **Analytics hooks (eventual/ETL readiness)**

---

## 2. Reglas de dependencias (permitidas / prohibidas)

### 2.1 Regla: “UI NO conoce proveedor”
- **Permitido:** UI llama a “facades” de servicios de orquestación (TransactionService / WorkflowService) que operan por contrato.
- **Prohibido:** UI o components ejecutar consultas directas a DB/Storage o depender de `@supabase/supabase-js`.

### 2.2 Regla: “Runtime NO escribe directo”
- **Permitido:** Runtime orquesta y construye payloads transaccionales.
- **Prohibido:** Runtime ejecuta SQL/ORM directamente o inserta en tablas físicas.

### 2.3 Regla: “PersistenceOrchestrator es el único orquestador”
- **Permitido:** PersistenceOrchestrator implementa retry/backoff, mapping EAV→EAV físico (conceptual) y coordinación SAGA para evidencias.
- **Prohibido:** dispersar mapping EAV en múltiples services o UI.

### 2.4 Regla: “Adapters encapsulan capacidades físicas”
- **Permitido:** Adapters traducen contratos a operaciones DB/Storage reales (Supabase hoy; otros motores futuro).
- **Prohibido:** adapters mezclar responsabilidades de audit business (audit_engine) con lógica de negocio.

### 2.5 Regla: “Audit-ready dentro de la frontera transaccional”
- **Permitido:** audit engine conceptual define qué debe quedar escrito correlacionado en `sgc_audit_logs`.
- **Prohibido:** audit logs inconsistentes por orden parcial fuera de la frontera transaccional conceptual.

---

## 3. Matriz de dependencias (Tabla)

Leyenda:
- ✅ Permitido
- ⚠️ Permitido solo como dependencia conceptual (sin lógica de proveedor)
- ❌ Prohibido

| From \ To | UI/Pages | Runtime Orch. | Persistence Orch. | Adapters (DB/Storage) | Audit Engine | Event Bus | Offline Layer | Analytics Hooks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **UI/Pages** | — | ✅ | ⚠️ (facade only) | ❌ | ⚠️ (solo contract) | ✅ | ⚠️ (draft UX only) | ⚠️ |
| **Runtime Orchestration** | — | — | ✅ | ❌ | ⚠️ (defines invariants) | ✅ | ✅ (queue semantics) | ⚠️ (event publication only) |
| **Persistence Orchestrator** | — | — | — | ✅ | ✅ (correlation) | ⚠️ | ✅ (SAGA coordination) | ⚠️ (post-commit events) |
| **Adapters** | — | — | — | — | ⚠️ (no lógica) | ⚠️ | — | — |
| **Audit Engine** | — | — | — | — | — | ⚠️ (publish audit events) | — | — |
| **Event Bus** | — | — | — | — | — | — | — | — |
| **Offline Layer** | — | ✅ (semantics) | ✅ (payload ready) | ❌ | — | ✅ | — | — |
| **Analytics Hooks** | — | ⚠️ | ⚠️ | ❌ | — | ✅ | — | — |

> [!NOTE]
> La tabla es intencionalmente restrictiva: busca estabilizar boundaries y facilitar migración futura.

---

## 4. Evidencias de riesgos actuales (derivados del código existente)

Basado en `src/services/dynamicService.js`:

- existe ejecución directa de operaciones sobre:
  - `sgc_form_responses`
  - `sgc_response_values`
  - `sgc_evidences`
  - `sgc_audit_logs`

Esto implica riesgos con respecto a:
- la frontera “PersistenceOrchestrator único”
- el “all-or-nothing conceptual” de `transaction_architecture.md`
- la “database-agnostic” requirement

> [!WARNING]
> Este documento describe el target state. No se modifica el código ahora.

---

## 5. Recomendaciones para onboarding técnico (sin tocar código)

### 5.1 Checklist de PR/Review arquitectónica
- ¿Algún PR introdujo `supabase.from(...)` fuera de adapters?
- ¿Se duplicó mapping EAV en más de una capa?
- ¿Se mezcló audit con lógica transaccional en servicios que no son PersistenceOrchestrator?
- ¿Se introdujeron dependencias desde UI hacia provider físico?
- ¿Los errores se clasifican consistentemente como `retryable`/`non-retryable` (documental)?

### 5.2 Contratos como “fuente única”
- `docs/database/persistence_architecture.md`  
- `docs/database/transaction_architecture.md`  
- `docs/database/runtime_api_contracts.md`  
- `docs/database/audit_engine.md`  

Estas fuentes deben guiar decisiones de dependencias y boundaries.

---

## 6. Referencias cruzadas

- `docs/arquitectura/project_structure_blueprint.md`
- `docs/database/persistence_architecture.md`
- `docs/database/transaction_architecture.md`
- `docs/database/runtime_api_contracts.md`
- `docs/database/audit_engine.md`
- `docs/core/event_bus_architecture.md`

---

**Documento mantenido por:** Dirección General de Arquitectura de Software e Integridad Operativa SGC-DM  
**Última actualización:** 24 de Mayo de 2026
