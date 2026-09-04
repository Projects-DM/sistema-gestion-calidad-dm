# Contract Registry — System Contracts Registry

**Status:** ACTIVE  
**Maintained by:** Architecture Team  
**Last Updated:** 2026-09-03 (Sprint 380)  
**Governance:** ADR-010 (Historical Sprint Preservation Policy)

---

## Contract Registry

| Contract ID | Title | Domain | Status | Owner | Validation |
|-------------|-------|--------|--------|-------|------------|
| **CONTRACT-001** | Supabase Client Contract | Authentication/Persistence | ACTIVE | Architecture Team | Sprint 362, 363, 369 |
| **CONTRACT-002** | Authentication Contract | Authentication | ACTIVE | Architecture Team | Sprint 362, 363, 369 |
| **CONTRACT-003** | Environment Variable Contract | Deployment/Build | ACTIVE | DevOps | Sprint 355, 356, 360-361, 369 |
| **CONTRACT-004** | Runtime Schema Contract | Runtime/Forms | ACTIVE | Architecture Team | Sprint 65-67, 70, 80-99 |
| **CONTRACT-005** | Temporal Window Contract | Alerts/Recurrence | ACTIVE | Architecture Team | Sprint 341, 346-348 |
| **CONTRACT-006** | Tenant Isolation Contract | Multi-tenancy/Persistence | ACTIVE | Architecture Team | Sprint 346-348, 350-351 |
| **CONTRACT-007** | Persistence Contract | Persistence | ACTIVE | Architecture Team | Sprint 346-348, 350 |
| **CONTRACT-008** | GitHub Pages Deployment Contract | Deployment | ACTIVE | DevOps | Sprint 351, 360-361, 369 |

---

## CONTRACT-001: Supabase Client Contract

**Domain**: Authentication / Persistence  
**Status**: ACTIVE  
**Owner**: Architecture Team  
**Validated in Sprints**: 362, 363, 369

### WHAT
Defines the contract for the Supabase client singleton used throughout the application.

### WHY
Ensures consistent client initialization, prevents multiple client instances, and defines behavior when environment variables are missing.

### CURRENT IMPLEMENTATION
**File**: `src/lib/supabase.js`

```javascript
export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;  // NULL GUARD

  if (!cached) {
    cached = createClient(url, anonKey);
  }
  return cached;
}

export function isSupabaseConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
```

### DEPENDENCIES
- `@supabase/supabase-js` v2.105.1
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### FAILURE MODE
- Missing env vars → returns `null` (not throw)
- Invalid URL/key → `createClient` throws at initialization time
- Network failure → Supabase client throws on operations

### VALIDATION
- Sprint 362: Null-state forensic audit → CONFIRMED
- Sprint 363: Hardening → Guards added
- Sprint 369: Final certification → PASS

### DO NOT BREAK
- Singleton pattern (`let cached`)
- Null guard (`if (!url || !anonKey) return null`)
- Single `createClient` call
- `isSupabaseConfigured()` export

---

## CONTRACT-002: Authentication Contract

**Domain**: Authentication  
**Status**: ACTIVE  
**Owner**: Architecture Team  
**Validated in Sprints**: 362, 363, 369

### WHAT
Defines the authentication flow contract between `AuthContext`, `Supabase Client`, and `Login.jsx`.

### WHY
Ensures consistent authentication behavior, proper null handling, and clear error messages.

### CURRENT IMPLEMENTATION
**File**: `src/context/AuthContext.jsx`

```javascript
// Null guards (Sprint 363 hardening)
const signIn = async (email, password) => {
  if (!supabase) {
    throw new Error('Supabase no esta configurado o el cliente no esta inicializado.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

const signOut = async () => {
  if (supabase) {
    await supabase.auth.signOut();
  }
  setUser(null);
  setProfile(null);
};

// Session management via onAuthStateChange
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    setUser(session.user);
    fetchAndSetProfile(session.user.id);
  } else {
    setUser(null);
    setProfile(null);
  }
  setLoading(false);
});
```

### DEPENDENCIES
- `getSupabaseClient()` from `src/lib/supabase.js`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` environment variables
- Supabase Auth (GoTrue)

### FAILURE MODE
| Error | Layer | User Message |
|-------|-------|--------------|
| `null.auth` dereference | PRE-NETWORK | "Supabase no esta configurado..." |
| `ERR_NAME_NOT_RESOLVED` | NETWORK | "Error de conexion..." |
| `AuthRetryableFetchError` | NETWORK | "Error de conexion..." |
| `AuthApiError` (400/401/403) | APPLICATION | "Credenciales invalidas" |

### VALIDATION
- Sprint 362: Null-state audit → ROOT CAUSE CERTIFIED
- Sprint 363: Hardening → Guards added
- Sprint 369: Final certification → PASS

### DO NOT BREAK
- Null guards in `signIn`, `signOut`, `fetchAndSetProfile`
- `onAuthStateChange` subscription lifecycle
- Session restoration from `localStorage`
- `tenantId` derivation from email domain

---

## CONTRACT-003: Environment Variable Contract

**Domain**: Deployment / Build  
**Status**: ACTIVE  
**Owner**: DevOps  
**Validated in Sprints**: 355, 356, 360-361, 369

### WHAT
Defines the contract for build-time environment variable injection.

### WHY
Ensures Supabase credentials are correctly injected at build time, preventing runtime failures.

### CURRENT IMPLEMENTATION

#### Local (`.env.production`)
```env
VITE_SUPABASE_URL=https://ruxomcnxsnhlfqlefsrc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti
```

#### CI/CD (GitHub Actions)
```yaml
jobs:
  build:
    environment:
      name: github-pages
    steps:
      - name: Build with Supabase environment variables
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: |
          test -n "$VITE_SUPABASE_URL" && echo "PRESENT" || echo "WARNING_UNSET"
          test -n "$VITE_SUPABASE_ANON_KEY" && echo "PRESENT" || echo "WARNING_UNSET"
          npm run build
```

#### Vite Build-Time Injection
Vite replaces `import.meta.env.VITE_*` at compile time:
- Present → actual value embedded in bundle
- Missing → `undefined` in bundle

### DEPENDENCIES
- GitHub Environment `github-pages` with secrets
- GitHub Actions workflow `.github/workflows/deploy-pages.yml`
- Vite build system

### FAILURE MODE
| Scenario | Build Result | Runtime Result |
|----------|--------------|----------------|
| Secrets configured | PASS (PRESENT) | PASS |
| Secrets missing | PASS (WARNING_UNSET) | `null` client → Auth fails |
| Wrong secret name | PASS (WARNING_UNSET) | `null` client → Auth fails |

### VALIDATION
- Sprint 355: Deployment regression audit → ROOT CAUSE CERTIFIED
- Sprint 360: Deployment failure audit → ROOT CAUSE CANDIDATE
- Sprint 361: Correction verified → PASS
- Sprint 369: Final certification → PASS

### DO NOT BREAK
- GitHub Environment `github-pages` must exist
- Secrets must be in Environment (not Repository Secrets)
- `environment: name: github-pages` on BOTH build and deploy jobs
- Verification echoes in build logs (`PRESENT` / `WARNING_UNSET`)

---

## CONTRACT-004: Runtime Schema Contract

**Domain**: Runtime / Forms  
**Status**: ACTIVE  
**Owner**: Architecture Team  
**Validated in Sprints**: 65-67, 70, 80-99

### WHAT
Defines the contract between form metadata in database and runtime rendering engine.

### WHY
Ensures form definitions in database are correctly interpreted by the runtime engine.

### CURRENT IMPLEMENTATION
**Files**: 
- `src/components/DynamicFieldRenderer.jsx`
- `src/components/engines/EngineRegistry.js`
- `src/components/registry/ComponentRegistry.js`

### Schema Contract

```typescript
interface FormContract {
  id: string;
  code: string;
  name: string;
  engineType: 'BaseChecklist' | 'BaseMediciones' | 'BaseWorkflow' | 'BaseTrazabilidad' | 'BaseMantenimiento';
  workflowConfig: {
    requiresApproval: boolean;
    requiresSignature: boolean;
    verifierRole: string;
    allowedRoles: string[];
  };
  security: {
    requiresStorage: boolean;
    offlineReady: boolean;
  };
  aiIntegration: {
    compatibleIa: boolean;
    iaTags: string[];
  };
  fields: FieldContract[];
}

interface FieldContract {
  id: string;
  name: string;
  label: string;
  fieldType: 'boolean' | 'number' | 'text' | 'select' | 'signature' | 'date';
  required: boolean;
  orderIndex: number;
  options: {
    min?: number;
    max?: number;
    unit?: string;
    choices?: string[];
    criticalValueTrigger?: any;
  };
}
```

### Component Contract

```typescript
interface InputComponentProps<T = any> {
  fieldDef: {
    id: string;
    name: string;
    label: string;
    required: boolean;
    options: {
      placeholder?: string;
      min?: number;
      max?: number;
      unit?: string;
      choices?: string[];
    };
  };
  value: T;
  onChange: (fieldId: string, newValue: T) => void;
  error?: string;
  disabled?: boolean;
}
```

### VALIDATION
- Component Registry resolves `field_type` → component
- Lazy loading via `React.lazy` + `Suspense`
- Props validation at component boundary

### DO NOT BREAK
- `FieldContract` interface
- `InputComponentProps` interface
- `ComponentRegistry` resolution map
- Lazy loading pattern

---

## CONTRACT-005: Temporal Window Contract

**Domain**: Alerts / Recurrence  
**Status**: ACTIVE  
**Owner**: Architecture Team  
**Validated in Sprints**: 341, 346-348, 350

### WHAT
Defines the contract for temporal recurrence window calculation.

### WHY
Ensures recurrence windows are calculated correctly with zero drift.

### INVARIANTS (Sprint 341 Certified)

| Invariant | Specification |
|-----------|---------------|
| ANCHOR-IMMUTABILITY | `windowStart = startDate + startTime (local)` — never changes |
| WINDOW-CALCULATION | `windowEnd = windowStart + period` (derived, not stored) |
| ANCHOR-STABILITY | `completedAt` NEVER redefines anchor |
| NEXT-DERIVED | Next window = derived from anchor (not from `completedAt`) |
| MONTHLY-CALENDAR | Monthly = Calendar month (Model A + CAL-001) |
| YEARLY-CALENDAR | Yearly = Calendar year + leap saturation (29/02->28/02) |
| WEEKLY-7DAY | Weekly = 7 days (NOT ISO week) |
| CUSTOM-MULTIPLIER | Custom = N x unidad |
| TIMEZONE-LOCAL | Timezone = LOCAL (browser) |

### DO NOT BREAK
- Anchor immutability
- Calendar-aware monthly/yearly
- Local timezone calculations
- Leap year saturation (Feb 29 -> Feb 28)

---

## CONTRACT-006: Tenant Isolation Contract

**Domain**: Multi-tenancy / Persistence  
**Status**: ACTIVE  
**Owner**: Architecture Team  
**Validated in Sprints**: 346-348, 350-351

### WHAT
Defines the contract for tenant-scoped data isolation.

### WHY
Ensures data from different tenants (`dmdistribuciones.com` vs `polloscalenos.com`) never leaks.

### CURRENT IMPLEMENTATION

#### Tenant Derivation
```javascript
// src/context/AuthContext.jsx
const tenantId = useMemo(() => deriveTenantIdFromEmail(user?.email), [user?.email]);
function deriveTenantIdFromEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}
```

#### Persistence Keys
| Type | Format |
|------|--------|
| Specific | `tenant::{tenantId}::occurrence::{alertId}::{occurrenceId}` |
| Legacy | `tenant::{tenantId}::resource::{resourceKind}::{resourceId}::{moduleId}` |

#### Supabase RLS
```sql
CREATE POLICY "tenant_isolation" ON sgc_alert_occurrence_completions
  FOR ALL USING (tenant_id = get_current_tenant());
```

### DO NOT BREAK
- Email domain derivation (`email.split('@')[1].toLowerCase()`)
- Key prefix format (`tenant::{tenantId}::`)
- Supabase RLS policies
- Hybrid adapter dual-write

---

## CONTRACT-007: Persistence Contract

**Domain**: Persistence  
**Status**: ACTIVE  
**Owner**: Architecture Team  
**Validated in Sprints**: 346-348, 350

### WHAT
Defines the contract for the hybrid persistence port.

### CURRENT IMPLEMENTATION

```javascript
// Hybrid Adapter Interface
{
  readSignals: () => Promise<Signal[]>,
  writeSignal: (signal) => void,
  clearSignals: () => void
}

// Hybrid Adapter Behavior
createHybridTenantAdapter({
  localAdapter: createDurableOccurrenceLedgerAdapter(),  // localStorage
  supabaseAdapter: createTenantScopedSupabaseAdapter()   // Supabase
})

// Read: Supabase first -> fallback localStorage
// Write: Dual write (localStorage + Supabase)
// Tenant isolation: tenant_id column + key prefix
```

### DO NOT BREAK
- Hybrid adapter interface
- Dual write (localStorage + Supabase)
- Read: Supabase first, fallback localStorage
- Tenant isolation in keys and RLS

---

## CONTRACT-008: GitHub Pages Deployment Contract

**Domain**: Deployment  
**Status**: ACTIVE  
**Owner**: DevOps  
**Validated in Sprints**: 351, 360-361, 369

### WHAT
Defines the contract for production deployment to GitHub Pages.

### CURRENT IMPLEMENTATION

#### Required Configuration
1. **GitHub Environment** `github-pages` exists with secrets
2. **Pages Source** = "GitHub Actions" (NOT "Deploy from branch")
3. **Workflow** `.github/workflows/deploy-pages.yml` with:
   - Build job: `environment: name: github-pages`
   - Deploy job: `environment: name: github-pages`
   - Secrets: `${{ secrets.VITE_SUPABASE_URL }}`, `${{ secrets.VITE_SUPABASE_ANON_KEY }}`

#### Verification Requirements
| Check | Required Output |
|-------|-----------------|
| Build | `VITE_SUPABASE_URL=PRESENT` |
| Build | `VITE_SUPABASE_ANON_KEY=PRESENT` |
| Deploy | `actions/deploy-pages@v4` PASS |
| Artifact | Supabase URL embedded in bundle |
| Runtime | `getSupabaseClient()` returns valid client |

### DO NOT BREAK
- Environment `github-pages` on BOTH build and deploy jobs
- Secrets in Environment (not Repository Secrets)
- Pages Source = "GitHub Actions"
- Build verification echoes

---

**Registry Maintained by**: Architecture Team  
**Last Updated**: 2026-09-03 (Sprint 380)  
**Next Review**: 2026-12-01