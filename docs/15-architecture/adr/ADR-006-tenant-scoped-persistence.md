# ADR-006: Tenant-Scoped Persistence

**Status:** ACCEPTED  
**Date:** 2026-08-22 (Sprint 346), 2026-08-28 (Sprint 348 correction), 2026-09-03 (consolidated)  
**Deciders:** Architecture Team  
**Sprint References:** Sprint 341 (temporal engine), Sprint 345 (audit), Sprint 346 (implementation), Sprint 347 (wiring audit), Sprint 348 (correction), Sprint 350 (deployment audit), Sprint 351 (deployment fix)

---

## Context

The alert system originally used browser-local `localStorage` for persistence:

```javascript
// Before: localStorage only
localStorage.setItem('sgc.alert.occurrence-completion-ledger.v1', JSON.stringify(ledger));
```

This created critical failures in production:
- **Cross-user isolation**: User A completes alert → User B (same tenant) sees `PENDING`
- **Cross-browser isolation**: Same user, different browser → state not shared
- **No audit trail**: localStorage not queryable, no audit trail
- **Device loss**: Clear browser data = loss of all completion state

The system needed **true multi-tenant shared persistence** where:
- Users in same tenant (`dmdistribuciones.com`) share completion state
- Users in different tenants (`dmdistribuciones.com` vs `polloscalenos.com`) are isolated
- State persists across browsers, devices, sessions
- First completion visible immediately to all tenant users

## Decision

Implement **Tenant-Scoped Hybrid Persistence** with a **Hybrid Adapter** pattern:

### Architecture

```
USER (email)
    ↓
AUTH CONTEXT (tenantId = email.split('@')[1].toLowerCase())
    ↓
TENANT PROVIDER (TenantIdProviderRegistrar)
    ↓
COMPLETION BRIDGE (injects tenantId into signals)
    ↓
OCCURRENCE LEDGER (keys: tenant::{tenantId}::occurrence::{alertId}::{occurrenceId})
    ↓
HYBRID PERSISTENCE PORT
    ├── localStorage (immediate, fallback, legacy compatible)
    └── Supabase (tenant-scoped, shared cross-browser)
          ↓
    SHARED TENANT STATE
```

### Key Components

| Component | Responsibility |
|-----------|----------------|
| `AuthContext.jsx` | Derives `tenantId` from email domain (`email.split('@')[1].toLowerCase()`) |
| `TenantIdProviderRegistrar` | Registers `tenantIdProvider` function for lazy access |
| `CompletionBridge` | Injects `tenantId` into completion signals |
| `OccurrenceLedger` | Keys include `tenant::{tenantId}::` prefix |
| `OccurrenceLedgerPersistencePort` | Hybrid adapter: `localStorage` + Supabase |
| `OccurrenceLedgerDurableBoot` | Lazy hydration (waits for `tenantIdProvider`) |

### Persistence Keys

| Type | Format | Example |
|------|--------|---------|
| **Specific** | `tenant::{tenantId}::occurrence::{alertId}::{occurrenceId}` | `tenant::dmdistribuciones.com::occurrence::alert-123::occ-001` |
| **Legacy** | `tenant::{tenantId}::resource::{resourceKind}::{resourceId}::{moduleId}` | `tenant::dmdistribuciones.com::resource::dynamicRecords::rec-456::mod-789` |

### Hybrid Adapter Behavior

```javascript
createHybridTenantAdapter({
  localAdapter: createDurableOccurrenceLedgerAdapter(),  // localStorage (immediate)
  supabaseAdapter: createTenantScopedSupabaseAdapter()   // Supabase (shared)
})

// Read: Supabase first → fallback localStorage
// Write: Dual write (localStorage + Supabase)
// Tenant isolation: tenant_id column in Supabase + tenant:: prefix in keys
```

### Supabase Schema

```sql
CREATE TABLE sgc_alert_occurrence_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,           -- 'dmdistribuciones.com'
  alert_id TEXT NOT NULL,
  occurrence_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, alert_id, occurrence_id)
);

-- RLS Policy
CREATE POLICY "tenant_isolation" ON sgc_alert_occurrence_completions
  FOR ALL USING (tenant_id = get_current_tenant());
```

### Boot Sequence (Corrected in Sprint 348)

```
1. main.jsx → createRoot()
2. App.jsx mounts → AuthProvider → TenantIdProviderRegistrar
3. TenantIdProviderRegistrar registers tenantIdProvider
4. lazyHydrate() triggered when tenantId available
5. bootDurableOccurrenceLedger() hydrates from persistence port
```

### Cross-Tenant Isolation

| Tenant A (`dmdistribuciones.com`) | Tenant B (`polloscalenos.com`) |
|----------------------------------|--------------------------------|
| `tenant::dmdistribuciones.com::...` | `tenant::polloscalenos.com::...` |
| Supabase `tenant_id = 'dmdistribuciones.com'` | Supabase `tenant_id = 'polloscalenos.com'` |
| localStorage fallback (compat) | localStorage fallback (compat) |

**Guarantee**: `SELECT * FROM sgc_alert_occurrence_completions WHERE tenant_id = $1` → row-level isolation

## Consequences

### Positive
- **True multi-tenancy**: Users in same tenant share state across browsers/devices
- **Immediate visibility**: First completion visible to all tenant users instantly
- **Cross-browser**: Same user, different browser → state shared via Supabase
- **Audit trail**: Supabase provides queryable completion history
- **Temporal engine preserved**: Sprint 341 recurrence engine unchanged

### Negative
- **Supabase dependency**: Offline mode falls back to localStorage only
- **Boot complexity**: Lazy hydration required to wait for tenantId
- **Migration risk**: Legacy localStorage keys need migration strategy
- **RLS dependency**: Requires correct Supabase RLS policies

## Implementation Evidence

| Sprint | Artifact |
|--------|----------|
| Sprint 341 | Temporal recurrence engine (preserved) |
| Sprint 345 | Forensic audit of shared persistence boundary |
| Sprint 346 | Implementation (7 core files + TenantIdProviderRegistrar) |
| Sprint 347 | Wiring audit (found missing imports + boot ordering) |
| Sprint 348 | Correction (imports + lazy hydration + boot sequencing) |
| Sprint 350 | Deployment audit (GitHub Pages env vars missing) |
| Sprint 351 | Deployment fix (GitHub Actions + secrets) |

### Key Files

| File | Role |
|------|------|
| `src/context/AuthContext.jsx` | `deriveTenantIdFromEmail`, exposes `tenantId` |
| `src/components/TenantIdProviderRegistrar.jsx` | Registers `tenantIdProvider` |
| `src/core/capabilities/alert/occurrence/CompletionBridge.js` | Injects `tenantId` into signals |
| `src/core/capabilities/alert/occurrence/OccurrenceLedger.js` | Keys with `tenant::{tenantId}::` prefix |
| `src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js` | Hybrid adapter + Supabase adapter |
| `src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js` | Lazy hydration |
| `src/components/TenantIdProviderRegistrar.jsx` | Registers provider |
| `src/hooks/useAlertRuntime.js` | Registers provider + deps |
| `src/main.jsx` / `src/App.jsx` | Boot sequencing |

## Consequences

### Positive
- **True shared state**: Cross-user, cross-browser, cross-device
- **Temporal engine intact**: Sprint 341 recurrence logic untouched
- **Audit ready**: Supabase provides queryable completion history
- **Offline resilient**: localStorage fallback preserved

### Negative
- **Supabase dependency**: Requires Supabase availability for shared state
- **Boot complexity**: Lazy hydration adds initialization latency
- **Migration**: Legacy localStorage keys need migration
- **RLS critical**: Database policies must be correct

## Related ADRs
- ADR-001: Metadata-Driven Architecture (foundation)
- ADR-003: Capability-Driven Authorization (tenant context for auth)
- ADR-004: Supabase as Remote Persistence Backend (Supabase integration)
- ADR-005: GitHub Actions + GitHub Pages Production Deployment (deployment must include tenant env)

---

**Supersedes**: localStorage-only persistence (Sprints 1-345)  
**Next Review**: 2026-12-01