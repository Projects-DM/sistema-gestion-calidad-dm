# SPRINT 64 — Core Capability Assignment Operational Layer (SSOT)

> **Tipo:** Core Architecture / Operational Layer / Capability Assignment Write Path

> **Nivel esperado:** LEVEL 3 — CERTIFIED CORE OPERATIONAL LAYER

> **Estado esperado:** BLOQUEADO / NO CERTIFICABLE CON LA EVIDENCIA ACTUAL DEL WORKSPACE

---

## 0) Objetivo
Definir y certificar la **infraestructura operacional del Write Path** para `Capability Assignments`.

Este objetivo se formula bajo el principio: **crear una única autoridad de escritura** del Core, completamente desacoplada de cualquier tecnología de persistencia.

---

## 1) Alcance
### En este sprint se esperaba incluir (Core únicamente)
- `CapabilityAssignmentService`
- `AssignmentValidationEngine`
- `AssignmentTransactionManager`
- `CapabilityPersistenceProvider` (como fachada operacional)
- `ModuleCapabilityAssignmentRepository` (como contrato operacional)

### No se incluye
- UI
- Runtime Engine
- DynamicModule / DynamicForm
- Persistencia física
- Supabase / PostgreSQL / SQLite / REST / GraphQL / MongoDB / Firebase

---

## 2) Motivación arquitectónica
A partir de lo certificado en Sprints 59–63, el **Read Path** ya opera con:

`Capability Package Registry → ModuleCapabilityResolver → Capability Public Set → DynamicModule → Dynamic Forms/Records`

El único gap estructural para cerrar el modelo **Capability Driven** es el **Operational Write Path** para `Capability Assignments`.

---

## 3) Arquitectura (Pipeline operacional esperado)
Pipeline operacional exigido:

```text
Administrator
  │
  ▼
CapabilityAssignmentService
  │
  ▼
AssignmentValidationEngine
  │
  ▼
AssignmentTransactionManager
  │
  ▼
CapabilityPersistenceProvider
  │
  ▼
ModuleCapabilityAssignmentRepository
  │
  ▼
Persistence Adapter (futuro)
  │
  ▼
Supabase / PostgreSQL / SQLite / REST / GraphQL / MongoDB / Firebase
```

---

## 4) Evidencias del workspace (bloqueo del sprint)
### 4.1 `ModuleCapabilityAssignmentRepository` no es operacional
Archivo:
- `src/core/persistence/capabilities/repositories/ModuleCapabilityAssignmentRepository.js`

Evidencia:
- `listByModuleId` lanza `not implemented`
- `getById` lanza `not implemented`

Resultado: **no existe write-path certificable** para assignments.

### 4.2 `CapabilityPersistenceProvider` no expone operaciones oficiales de escritura
Archivo:
- `src/core/persistence/capabilities/CapabilityPersistenceProvider.js`

Evidencia:
- Implementa lecturas (ej. `listAssignmentsByModuleId`, `getPackageById`, etc.)
- No expone métodos `createAssignments`, `replaceAssignments`, `deleteAssignments`

Resultado: **no existe fachada operacional completa** para write-path.

---

## 5) Decisiones SSOT para este sprint (estado “no certificable”)
Bajo SSOT y restricciones (no inferir modelos físicos no certificados), este sprint se clasifica como:

- **No implementable**: falta el contrato/implementación operacional que permita:
  - CRUD write de assignments
  - atomicidad lógica y transacciones con rollback (sin persistencia física certificada)
- **No certificable**: no existe evidencia de:
  - `CapabilityAssignmentService`
  - `AssignmentValidationEngine`
  - `AssignmentTransactionManager`

---

## 6) Componentes implementados
**Ninguno en código** (solo documentación SSOT).

---

## 7) Validaciones realizadas
Validaciones por inspección de código / evidencia:

1. Existencia operacional del repositorio de assignments
   - Resultado: **No** (`not implemented`).
2. Existencia de una fachada de persistencia operacional para escritura
   - Resultado: **No** (`CapabilityPersistenceProvider` sin métodos de escritura).
3. Desacoplamiento del Core respecto a persistencia
   - Resultado: no aplica para write-path porque no existe infraestructura operacional sobre la cual desacoplar.

---

## 8) Checklist de aceptación (para este sprint)
Marcación según evidencia actual del workspace:

- [ ] Existe una única autoridad para la escritura de `Capability Assignments` → **No**
- [ ] El Core queda desacoplado de tecnologías de persistencia para escritura → **No** (faltan contratos/operaciones)
- [ ] La arquitectura soporta futuros adapters sin modificar el Core → **No certificable**
- [ ] Runtime continúa funcionando sin modificaciones → N/A (no se modificó runtime)
- [ ] UI continúa funcionando sin modificaciones → N/A (no se modificó UI)
- [ ] No existen regresiones → **N/A**
- [ ] Se genera este documento → **Sí**
- [ ] npm run build finaliza correctamente → **No ejecutado en este sprint**

---

## 9) Resultado esperado vs. resultado real
### Resultado esperado
Write Path Core completo y certificable.

### Resultado real
Sprint 64 **bloqueado** por falta de infraestructura operacional certificable para `Capability Assignments`.

---

## 10) Dictamen final de certificación
**SPRINT 64 — NO CERTIFICABLE**.

Motivo: el workspace no contiene el write-path operacional certificado:
- `ModuleCapabilityAssignmentRepository` no implementa CRUD requerido
- `CapabilityPersistenceProvider` no expone operaciones oficiales de escritura

---

## 11) Archivos creados / modificados
- **Creado:** `docs/14-sprint/SPRINT_64_CORE_CAPABILITY_ASSIGNMENT_OPERATIONAL_LAYER.md`

- **Modificados en código:** ninguno.

---

## 12) Evidencia de reutilización
- El documento reutiliza la evidencia certificada del Read Path en Sprints 59–63.

---

## 13) Próximo paso SSOT (para desbloquear Sprint 64)
Se requiere que el proyecto provea (en workspace) una implementación operacional certificada para:
- `ModuleCapabilityAssignmentRepository` (CRUD operacional de assignments)
- `CapabilityPersistenceProvider` (fachada de escritura)

Solo con esa base será posible certificar el pipeline **CapabilityAssignmentService → Validation → Transaction → PersistenceProvider → Repository**.

