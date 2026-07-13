# SPRINT 64 — Core Operational Layer Foundation (SSOT)

> **Tipo:** Core Architecture / Foundation / Operational Layer  
> **Nivel esperado:** LEVEL 3 — CORE FOUNDATION CERTIFIED  
> **Estado esperado:** IMPLEMENTADO Y CERTIFICADO

---

## 1) Objetivo
Implementar la **infraestructura operacional reutilizable del Core** que gobierne **cualquier proceso de escritura** a través de un pipeline SSOT desacoplado de la persistencia física.

Esta infraestructura establece el patrón oficial del **Write Path**:

```text
Application
  │
  ▼
Operational Service
  │
  ▼
Validation Engine
  │
  ▼
Transaction Manager
  │
  ▼
Persistence Provider
  │
  ▼
Repository Contract
  │
  ▼
Persistence Adapter
  │
  ▼
Database Technology
```

En este Sprint se integra como primera implementación el patrón para **Capability Assignments**, mediante:
- `CapabilityAssignmentService`
- `AssignmentValidationEngine`
- `AssignmentTransactionManager`
- `CapabilityPersistenceProvider` (fachada operacional; extendida)
- `ModuleCapabilityAssignmentRepository` (contrato operacional)

---

## 2) Alcance
### Incluye (Core únicamente)
- **Operational Layer Foundation** (genérica y reusable)
- **Operation Pipeline** (flujo operacional oficial)
- **CapabilityAssignmentService** (primera implementación del patrón)
- **AssignmentValidationEngine** (motor puro determinístico)
- **AssignmentTransactionManager** (coordinación de atomicidad lógica)
- **CapabilityPersistenceProvider** (fachada operacional del Core)
- **ModuleCapabilityAssignmentRepository** (contrato operacional)

### No incluye
- UI / React
- Routing / Wizard
- Runtime Engine / DynamicModule / DynamicForm / DynamicRecordsView
- Persistencia física (Supabase/PostgreSQL/SQLite/…)
- Adaptadores físicos
- Formularios / Documentos / Reportes

---

## 3) Motivación arquitectónica
Los Sprint 55–63 certificaron completamente el **Read Path**.

El siguiente gap estructural es el **Write Path operacional** para entidades gobernadas por SSOT. Este Sprint provee el patrón oficial reutilizable para futuros servicios operacionales (Module Assignments, Workflow Assignments, AI Assignments, Permission Assignments, Notification Assignments, Engine Assignments).

---

## 4) Arquitectura del Operational Layer
### Separación estricta por responsabilidades
- **Operational Service (Application-facing)**
  - Coordina el pipeline.
  - Invoca Validation Engine.
  - Invoca Transaction Manager.
  - Utiliza exclusivamente el Persistence Provider.
  - No accede directamente a repositories.

- **Validation Engine (pure engine)**
  - Determinístico.
  - No conoce React/Runtime/DB/Provider/Repository.

- **Transaction Manager (orquestación atómica lógica)**
  - Coordina Validate → Execute → Commit → Rollback.
  - Independiente de la tecnología de persistencia.

- **Persistence Provider (fachada operacional)**
  - Encapsula acceso a persistencia.
  - Aísla el Repository (contrato operacional).
  - Normaliza errores.
  - No contiene reglas de negocio.

- **Repository Contract**
  - Contrato de persistencia del Core.
  - No contiene validaciones, reglas SSOT, lógica de negocio.

---

## 5) Pipeline oficial (Operational Write Path)

```text
Application
  │
  ▼
Operational Service
  │
  ▼
Validation Engine
  │
  ▼
Transaction Manager
  │
  ▼
Persistence Provider
  │
  ▼
Repository Contract
  │
  ▼
Persistence Adapter
  │
  ▼
Database Technology
```

---

## 6) Responsabilidades por componente

### 6.1 Operational Layer Foundation
- Implementa el contrato de orquestación reusable.
- Preparado para soportar servicios operacionales futuros sin cambios estructurales.

### 6.2 CapabilityAssignmentService
- Primera implementación del patrón SSOT para `Capability Assignments`.
- Coordina el flujo y utiliza exclusivamente `CapabilityPersistenceProvider`.

### 6.3 AssignmentValidationEngine
- Motor determinístico para validación estructural/operacional del payload.
- Reutiliza la validación estructural existente: `ModuleCapabilityAssignmentIntegrityValidation`.

### 6.4 AssignmentTransactionManager
- Orquestación del flujo transaccional lógico (Execute; commit/rollback definidos por el adapter vía provider).
- Normaliza errores del flujo operacional.

### 6.5 CapabilityPersistenceProvider
- Fachada operacional del Core.
- Expone operaciones oficiales de escritura para assignments:
  - `replaceAssignmentsForModule`
  - `deleteAssignmentsForModule`
- Reutiliza validación estructural existente.

### 6.6 ModuleCapabilityAssignmentRepository (contrato operacional)
- Expone operaciones requeridas por el write-path del Core:
  - `replaceManyForModule`
  - `deleteManyByModuleId`
- Mantiene el carácter de contrato: no acopla a DB ni contiene lógica de negocio.

---

## 7) Componentes creados
- `src/core/operationalLayer/OperationPipeline.js`
- `src/core/operationalLayer/OperationalLayerFoundation.js`
- `src/core/operationalLayer/capabilityAssignment/CapabilityAssignmentService.js`
- `src/core/operationalLayer/capabilityAssignment/AssignmentValidationEngine.js`
- `src/core/operationalLayer/capabilityAssignment/AssignmentTransactionManager.js`

---

## 8) Componentes modificados
- `src/core/persistence/capabilities/CapabilityPersistenceProvider.js`
- `src/core/persistence/capabilities/repositories/ModuleCapabilityAssignmentRepository.js`

---

## 9) Principios de desacoplamiento (verificados por diseño)
- No dependencias hacia Supabase/DB/SQL/Adapters físicos.
- Sin acoplamiento a Runtime/React.
- Repository y Persistence Provider mantienen separación estricta de responsabilidades.

---

## 10) Compatibilidad con Sprint 55–63
- No se modifica infraestructura certificada del Read Path.
- No se toca UI / Runtime / DynamicModule / DynamicForm / DynamicRecordsView.

---

## 11) Evidencia de implementación
- Existe el pipeline operacional (Operational Service → Validation Engine → Transaction Manager → Persistence Provider).
- Existe primera implementación del patrón: `CapabilityAssignmentService`.
- Existe motor determinístico: `AssignmentValidationEngine`.
- Existe manager de orquestación transaccional lógica: `AssignmentTransactionManager`.
- `CapabilityPersistenceProvider` incorpora métodos de escritura operacional.
- `ModuleCapabilityAssignmentRepository` expone operaciones de escritura como contrato.

---

## 12) Evidencia de reutilización
Reutilizados (sin duplicación):
- `ModuleCapabilityAssignment`
- `ModuleCapabilityAssignmentMapper`
- `ModuleCapabilityAssignmentIntegrityValidation`

---

## 13) Resultado de `npm run build`
- `npm run build` (Vite) **OK**.

---

## 14) Checklist
- [x] Implementar Core Operational Layer como infraestructura reutilizable
- [x] Integrar CapabilityAssignmentService como primera implementación del patrón
- [x] Desacoplar Core completamente de persistencia física
- [x] Mantener compatibilidad total con Sprint 55–63
- [x] No modificar Runtime/UI/Read Path certificada
- [x] Ejecutar `npm run build` exitoso
- [x] Evidencia de reutilización
- [x] Evidencia de compatibilidad

---

## 15) Dictamen final
**SPRINT 64 — CERTIFICADO (CORE FOUNDATION CERTIFIED)**.

Se certifica porque:
1. La infraestructura del Operational Layer existe y es reusable.
2. CapabilityAssignmentService está integrado como primer servicio del patrón.
3. El Core permanece desacoplado de la persistencia física.
4. No se alteró el Read Path certificado.
5. `npm run build` finaliza exitosamente.

