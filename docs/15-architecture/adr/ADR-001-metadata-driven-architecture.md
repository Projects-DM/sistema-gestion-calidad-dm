# ADR-001: Metadata-Driven Architecture

**Status:** ACCEPTED  
**Date:** 2026-05-22 (original), 2026-09-03 (consolidated)  
**Deciders:** Architecture Team  
**Sprint References:** Sprint 1-50, Sprint 65-67, Sprint 70, Sprint 80-99

---

## Context

The SGC-DM system was originally designed as a static form application where each form type required custom frontend components and backend schemas. As the number of operational forms grew beyond 100 formats across DM Distribuciones' industrial plants, the team faced:

- **Code explosion**: Each new form required new React components, validation logic, and API endpoints
- **Deployment friction**: Every form change required code deployment and build pipeline execution
- **Operational rigidity**: Non-technical quality managers could not create or modify forms
- **Technical debt**: Duplicate validation logic across 50+ form components

## Decision

Adopt a **Metadata-Driven Architecture** using the **Entity-Attribute-Value (EAV)** pattern as the foundational data model:

1. **Forms defined in database**: `sgc_forms` + `sgc_form_fields` tables store form definitions
2. **Fields as data**: Each field is a row in `sgc_form_fields` with `field_type`, `options`, `required`, `order`
3. **Dynamic rendering**: `DynamicForm.jsx` interprets field metadata and delegates to `ComponentRegistry`
4. **EAV storage**: Responses stored in `sgc_form_responses` + `sgc_response_values` (typed columns: `value_text`, `value_number`, `value_boolean`, `value_json`)

## Consequences

### Positive
- **Zero-code form creation**: Quality managers create forms via admin panel in minutes
- **No migrations for new forms**: Only INSERTs into `sgc_forms` + `sgc_form_fields`
- **Single render engine**: `DynamicForm.jsx` + `ComponentRegistry` handles all form types
- **Audit trail built-in**: Every response stored with full metadata for INVIMA compliance
- **Extensibility**: New field types added via `ComponentRegistry` without touching core logic

### Negative
- **Query complexity**: EAV requires JOINs across `sgc_response_values` + `sgc_form_fields`
- **Type safety at runtime**: Typed columns (`value_text`, `value_number`, `value_boolean`, `value_json`) require application-level validation
- **Reporting complexity**: Analytics require pivot operations on EAV data
- **Index strategy critical**: Composite indexes on `sgc_response_values(form_id, field_id)` essential

## Implementation Evidence

- **Core tables**: `sgc_forms`, `sgc_form_fields`, `sgc_form_responses`, `sgc_response_values`
- **Runtime engine**: `src/pages/DynamicForm.jsx`, `src/components/DynamicFieldRenderer.jsx`
- **Service layer**: `src/services/dynamicService.js` (13 methods, all EAV-aware)
- **Component registry**: `src/components/engines/EngineRegistry.js` + `DynamicFieldRenderer.jsx`
- **Sprint validation**: Sprints 65-67, 70, 80-99 certified this architecture

## Related ADRs
- ADR-002: Runtime-Driven Execution Model
- ADR-003: Capability-Driven Authorization
- ADR-006: Tenant-Scoped Persistence (extends EAV with tenant_id)

## Compliance
- **INVIMA traceability**: Full audit trail in `sgc_audit_logs`
- **INVARIANT**: No DDL migrations for new forms — only metadata INSERTs

---

**Supersedes**: Initial static-form architecture (Sprints 1-50)  
**Next Review**: 2026-12-01