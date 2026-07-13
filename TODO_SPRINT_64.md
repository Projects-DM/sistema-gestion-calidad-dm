# TODO_SPRINT_64 — Core Operational Layer Foundation (SSOT)

## Plan (aprobado)
1. Revisar contratos existentes: ModuleCapabilityAssignment, mapper, validación estructural.
2. Implementar **Operational Layer Foundation** en `src/core/operationalLayer/`.
3. Implementar **Operation Pipeline** oficial.
4. Implementar `CapabilityAssignmentService`.
5. Implementar `AssignmentValidationEngine` (determinístico, sin dependencias externas).
6. Implementar `AssignmentTransactionManager` (coordina Validate/Execute/Commit/Rollback).
7. Actualizar `CapabilityPersistenceProvider` (fachada operacional; normaliza errores; agrega write operations definidas por el contrato).
8. Actualizar `ModuleCapabilityAssignmentRepository` (contrato operacional; define operaciones requeridas por TransactionManager).
9. Validar reutilización (no duplicar responsabilidades) y desacoplamiento (sin Runtime/React/DB).
10. Ejecutar `npm run build`.
11. Consolidar evidencia y completar SSOT document `docs/14-sprint/SPRINT_64_CORE_OPERATIONAL_LAYER_FOUNDATION.md`.

## Progreso
- [x] Preparar borrador del documento SSOT obligatorio.
- [x] Implementar código según los puntos 2–10.
- [x] Ejecutar `npm run build` exitoso (Vite).


