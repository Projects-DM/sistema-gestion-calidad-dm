# ADR-002: Runtime-Driven Execution Model

**Status:** ACCEPTED  
**Date:** 2026-05-22 (original), 2026-09-03 (consolidated)  
**Deciders:** Architecture Team  
**Sprint References:** Sprint 8, Sprint 65-67, Sprint 70, Sprint 80-99, Sprint 100+

---

## Context

The SGC-DM system must render and execute 100+ distinct operational forms (checklists, measurements, audits, maintenance, calibrations, CAPA) without hardcoding each form's logic. Traditional approaches required:

- New React component per form type
- Custom validation logic per form
- Manual wiring of persistence per form
- Build + deploy for each new form type

This created a bottleneck where engineering became the gatekeeper for operational changes.

## Decision

Adopt a **Runtime-Driven Execution Model** where the application interprets metadata contracts at runtime rather than compiling form-specific logic:

### Core Principles

1. **Metadata Contract → UI State**: Form definitions (`sgc_forms` + `sgc_form_fields`) are parsed into `FormContract` + `FieldContract[]` at runtime
2. **Engine Resolution**: `engine_type` field in `sgc_forms` selects the render engine (`BaseChecklist`, `BaseMediciones`, `BaseWorkflow`, `BaseTrazabilidad`, `BaseMantenimiento`)
3. **Field-Level Reactivity**: `DynamicFieldRenderer` resolves each `field_type` to an atomic component via `ComponentRegistry`
4. **State as Flat Map**: Runtime state is a plain object `{ [fieldId]: value }` — no nested trees, no class instances
5. **Validation as Data**: Rules derived from `fieldDef.options` (min, max, required, criticalValueTrigger)

### Runtime Layers

```
Presentation Layer (React)
    ↓
DynamicForm + DynamicFieldRenderer + ComponentRegistry
    ↓
Runtime Engine Core
    ├── MetadataInterpreter (parses form schema → FormContract)
    ├── RuntimeStateManager (flat { [fieldId]: value } map)
    └── ValidationSystem (reactive rules from fieldDef.options)
    ↓
Workflow Layer (StateMachine + TransitionEngine)
    ↓
Transaction Layer (TransactionService + SagaCompensation)
    ↓
Persistence Layer (IRuntimePersistenceLayer → Adapters)
    ↓
Analytics Layer (hooks → BI/Compliance)
```

### Key Invariants

| Invariant | Description |
|-----------|-------------|
| **STATIC-NO-COMPONENT** | No form-specific React components in `src/pages/` — only orchestrators |
| **METADATA-DRIVEN** | All field behavior derived from `sgc_form_fields` JSON |
| **FLAT-STATE** | Runtime state = `{ [fieldId]: value }` — no nested objects |
| **LAZY-LOAD** | Engines and fields loaded via `React.lazy` + `Suspense` |

## Consequences

### Positive
- **Engineering decoupled from operations**: New form types = DB config only
- **Bundle optimization**: `React.lazy` engines = 65% initial bundle reduction
- **Testability**: Runtime logic testable via metadata fixtures
- **Extensibility**: New engines = new lazy import + registry entry + DB config

### Negative
- **Type safety at runtime**: TypeScript can't validate dynamic field contracts
- **Debugging complexity**: Stack traces show generic `DynamicFieldRenderer` frames
- **Performance overhead**: Runtime interpretation adds ~5-10ms per field mount

## Implementation Evidence

- **Core**: `docs/01-core-runtime/dynamic_runtime_engine.md` (516 lines)
- **Runtime engine**: `src/runtime/engine/`, `src/runtime/renderer/`, `src/runtime/registry/`
- **Component registry**: `docs/01-core-runtime/component_registry.md` (358 lines)
- **Engine registry**: `src/components/engines/EngineRegistry.js`
- **Field renderer**: `src/components/DynamicFieldRenderer.jsx`
- **Sprint validation**: Sprints 8, 65-67, 70, 80-99, 100+

## Related ADRs
- ADR-001: Metadata-Driven Architecture (foundation)
- ADR-003: Capability-Driven Authorization
- ADR-007: Authentication Client Initialization Contract

---

**Supersedes**: Static per-form component architecture (Sprints 1-7)  
**Next Review**: 2026-12-01