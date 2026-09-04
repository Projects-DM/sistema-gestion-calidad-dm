# ADR-003: Capability-Driven Authorization

**Status:** ACCEPTED  
**Date:** 2026-06-15 (original), 2026-09-03 (consolidated)  
**Deciders:** Architecture Team  
**Sprint References:** Sprint 60-62, Sprint 65-67, Sprint 70, Sprint 100+

---

## Context

The SGC-DM system serves multiple organizational roles (Administrador, Calidad, Operativo, Consulta, Conductor) across potentially multiple tenants. Traditional RBAC (Role-Based Access Control) based on fixed role hierarchies was insufficient because:

- **Module access varies by capability**: "Crear Formulario" ≠ "Verificar Formulario" ≠ "Configurar Módulo"
- **Tenant isolation**: Users from `dmdistribuciones.com` must never see `polloscalenos.com` data
- **Dynamic module creation**: New modules created by admins must automatically inherit correct permissions
- **Operation-level granularity**: "Submit Form" ≠ "Verify Form" ≠ "Delete Form" ≠ "Export Data"

Traditional RBAC with fixed role→permission mappings required code changes for each new module/capability.

## Decision

Adopt **Capability-Driven Authorization** where access decisions are based on **capabilities** (fine-grained operations) rather than roles alone:

### Core Model

```
User
    ↓
Profile (rol + tenantId)
    ↓
CapabilityResolver
    ↓
Capability Set (per module/form/operation)
    ↓
Authorization Decision
```

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Capability** | Atomic operation: `form:create`, `form:submit`, `form:verify`, `module:configure`, `tenant:manage` |
| **Capability Set** | Set of capabilities granted to a role within a module context |
| **ModuleCapabilityResolver** | Resolves `role + moduleId + operation` → `boolean` |
| **Tenant Context** | All capabilities implicitly scoped to `user.tenantId` |

### Role → Capability Mapping (Current)

| Role | Capabilities |
|------|-------------|
| `administrador` | `*` (all capabilities across all modules in tenant) |
| `calidad` | `form:verify`, `form:export`, `module:configure`, `audit:read` |
| `operativo` | `form:submit`, `form:read`, `evidence:upload` |
| `consulta` | `form:read`, `dashboard:read` |
| `conductor` | `form:submit` (limited to assigned modules) |

### Tenant Isolation

All capabilities implicitly scoped by `tenantId` derived from email domain:
```javascript
const tenantId = email.split('@')[1].toLowerCase();
// operativo@dmdistribuciones.com → dmdistribuciones.com
```

RLS policies enforce tenant isolation at database level.

## Consequences

### Positive
- **Fine-grained control**: Operations authorized individually, not by role buckets
- **Dynamic modules**: New modules declare required capabilities; resolver handles rest
- **Tenant isolation by design**: All capabilities implicitly scoped to tenant
- **Auditability**: Each authorization decision traceable to capability + role + tenant

### Negative
- **Resolver complexity**: `ModuleCapabilityResolver` must handle inheritance, overrides, exceptions
- **Performance**: Capability resolution on every protected operation (mitigated by memoization)
- **Migration complexity**: Legacy role checks must be migrated to capability checks

## Implementation Evidence

- **Core**: `src/core/capabilities/` (ModuleCapabilityResolver, CapabilitySetResolutionEngine)
- **Sprints**: Sprint 60 (Phase 1), Sprint 65-67 (certification), Sprint 70
- **Files**: `src/core/capabilities/`, `src/hooks/useCapabilities.js`

## Related ADRs
- ADR-001: Metadata-Driven Architecture (forms declare required capabilities)
- ADR-006: Tenant-Scoped Persistence (all capabilities scoped to tenant)
- ADR-005: GitHub Actions + GitHub Pages Production Deployment

---

**Supersedes**: Static role-based middleware (Sprints 1-59)  
**Next Review**: 2026-12-01