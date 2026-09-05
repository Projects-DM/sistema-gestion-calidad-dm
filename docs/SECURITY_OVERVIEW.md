# Security Overview — Sistema de Gestión de Calidad (SGC-DM)

**Version:** 1.0 (Sprint 383)  
**Classification:** PROFESSIONAL PRESENTATION  
**Branch:** `release/stable-sprint79`

---

## 1. Security Architecture Overview

The SGC-DM implements a **defense-in-depth** security model with controls at every layer:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    APPLICATION LAYER                              │   │
│  │  • Capability-Driven Authorization (ADR-003)                    │   │
│  │  • Tenant Context Isolation (ADR-006)                           │   │
│  │  • Authentication Null Guards (ADR-007 / Sprint 363)            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                         │
│                              ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    TRANSPORT LAYER                                │   │
│  │  • HTTPS Enforced (GitHub Pages + Supabase)                     │   │
│  │  • HSTS via GitHub Pages                                         │   │
│  │  • CSP via Vite Build                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                         │
│                              ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    BACKEND LAYER (Supabase)                     │   │
│  │  • PostgreSQL Row Level Security (RLS)                          │   │
│  │  • Supabase Auth (GoTrue) — JWT + Sessions                     │   │
│  │  • Storage RLS (tenant-scoped paths)                            │   │
│  │  • Edge Functions (future)                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                         │
│                              ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    INFRASTRUCTURE LAYER                         │   │
│  │  • GitHub Pages (HTTPS, HSTS, CDN)                              │   │
│  │  • GitHub Actions (Environment Secrets)                         │   │
│  │  • Supabase Infrastructure (SOC2, ISO27001)                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Architecture

### 2.1 Authentication Flow

```
User Credentials
      ↓
Login.jsx → useAuth.signIn(email, password)
      ↓
AuthContext.signIn() → supabase.auth.signInWithPassword()
      ↓
Supabase Auth (GoTrue)
      ↓
JWT Access Token + Refresh Token
      ↓
localStorage (sb-<project>-auth-token)
      ↓
AuthContext.onAuthStateChange()
      ↓
Session Established → User Profile + Tenant Resolution
```

### 2.2 Supabase Client Initialization Contract (ADR-007)

**File:** `src/lib/supabase.js`

```javascript
export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // NULL GUARD — Critical invariant
  if (!url || !anonKey) return null;

  if (!cached) {
    cached = createClient(url, anonKey);
  }
  return cached;
}

export function isSupabaseConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
```

**Key Invariants:**
| Invariant | Implementation |
|-----------|----------------|
| **Singleton** | `let cached` — single instance |
| **Null Guard** | Returns `null` if env vars missing |
| **Build-Time Injection** | Vite replaces `import.meta.env.VITE_*` at compile time |
| **Environment Awareness** | `isSupabaseConfigured()` for health checks |

### 2.3 Authentication Hardening (Sprint 363)

**Null Guards Added (Sprint 363):**

```javascript
// AuthContext.jsx — Null Guards Added

// 1. Profile Fetch Guard
const fetchAndSetProfile = useCallback(async (userId) => {
  if (!supabase) return;  // Early return
  // ... fetch profile
}, [supabase]);

// 2. SignIn Guard
const signIn = async (email, password) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado o el cliente no está inicializado.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // ...
};

// 3. SignOut Guard
const signOut = async () => {
  if (supabase) {
    await supabase.auth.signOut();
  }
  setUser(null);
  setProfile(null);
};
```

**Null Guard Classification:**
| Guard Location | Protection |
|----------------|--------------|
| `signIn` | Throws controlled error before dereferencing `supabase.auth` |
| `signOut` | Conditional `await supabase.auth.signOut()` |
| `fetchAndSetProfile` | Early return if `!supabase` |
| `onAuthStateChange` | Guarded by `if (!supabase) return` in useEffect |

---

## 3. Authorization Architecture

### 3.1 Capability-Driven Authorization (ADR-003)

```
User Authentication
       ↓
AuthContext → user.role + tenantId
       ↓
CapabilityDiscovery.discover('authorization')
       ↓
AuthorizationResolver.canAccessRole(requiredRoles, userRole)
       ↓
Component/Action Access Granted/Denied
```

### 3.2 Authorization Resolver

```javascript
// src/core/authorization/AuthorizationResolver.js
export function canAccessRole(requiredRoles, userRole) {
  if (!requiredRoles) return true;  // No restriction = open
  return requiredRoles.includes(userRole);
}

export function filterAuthorized(items, userRole) {
  return (items || []).filter((item) => canAccessRole(item?.roles_allowed, userRole));
}
```

### 3.3 Role → Capability Mapping

| Role | Capabilities |
|------|-------------|
| `administrador` | `*` (all capabilities across tenant) |
| `calidad` | `form:verify`, `form:export`, `module:configure`, `audit:read` |
| `operativo` | `form:submit`, `form:read`, `evidence:upload` |
| `consulta` | `form:read`, `dashboard:read` |
| `conductor` | `form:submit` (assigned modules only) |

### 3.3 Module-Level Authorization

```javascript
// DynamicForm.jsx — Authorization Check
const authorization = CapabilityDiscovery.discover('authorization');

useEffect(() => {
  if (form) {
    if (!authorization.canAccessRole(form?.roles_allowed, rol)) {
      alert('No tienes permisos para acceder a este formulario.');
      const redirect = navigation.resolveRedirect({ moduleSlug });
      if (redirect) navigate(redirect.to, { replace: redirect.replace });
      return;
    }
  }
}, [formSlug, rol, navigate, moduleSlug]);
```

---

## 4. Multi-Tenant Isolation (ADR-006)

### 4.1 Tenant Resolution

```javascript
// src/context/AuthContext.jsx
function deriveTenantIdFromEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

const tenantId = useMemo(() => deriveTenantIdFromEmail(user?.email), [user?.email]);
```

**Tenant Derivation:**
| Email | Tenant ID |
|-------|-----------|
| `operativo@dmdistribuciones.com` | `dmdistribuciones.com` |
| `calidad@polloscalenos.com` | `polloscalenos.com` |
| `operativo@empresa.com` | `empresa.com` |

**Properties:**
| Property | Value |
|----------|-------|
| **Derivation** | Email domain (split `@`, lowercase) |
| **Deterministic** | Same email → same tenant |
| **Immutable** | Cannot change without new account |
| **Portable** | Works across browsers/devices |

### 4.2 Tenant-Scoped Persistence

#### 4.2.1 Hybrid Persistence Adapter

```javascript
// src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js

export function createHybridTenantAdapter(options = {}) {
  const localAdapter = createDurableOccurrenceLedgerAdapter(options);
  const supabaseAdapter = createTenantScopedSupabaseAdapter(options);
  
  return Object.freeze({
    kind: 'hybrid-tenant',
    async readSignals() {
      // Priority: Supabase (tenant-scoped) → localStorage (fallback)
      const supabaseSignals = await supabaseAdapter.readSignals();
      if (supabaseSignals.length > 0) return supabaseSignals;
      return localAdapter.readSignals();
    },
    async writeSignal(signal) {
      // Dual write for immediate local feedback + tenant sharing
      localAdapter.writeSignal(signal);
      await supabaseAdapter.writeSignal(signal);
    },
    async clearSignals() {
      localAdapter.clearSignals();
      await supabaseAdapter.clearSignals();
    },
  });
}
```

#### 4.2.2 Tenant-Scoped Supabase Adapter

```javascript
export function createTenantScopedSupabaseAdapter(options = {}) {
  const getTenantId = options?.getTenantId ?? (() => null);
  const supabase = getSupabaseClient();

  async function readAll() {
    if (!isSupabaseConfigured() || !supabase) return [];
    const tenantId = getTenantId();
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('sgc_alert_occurrence_completions')
      .select('signal')
      .eq('tenant_id', tenantId);  // TENANT ISOLATION

    return (data || []).map(row => row.signal).filter(...);
  }

  async function writeOne(signal) {
    const tenantId = getTenantId();
    if (!tenantId) return;

    const key = occurrenceCompletionStorageKey(signal) || `${signal.resourceKind}::${signal.resourceId}`;
    
    const { error } = await supabase
      .from('sgc_alert_occurrence_completions')
      .upsert({
        tenant_id: tenantId,          // TENANT ISOLATION
        storage_key: key,
        signal: Object.freeze({ ...signal }),
      }, { onConflict: 'tenant_id,storage_key' });
  }
}
```

### 4.3 Database-Level Isolation (RLS)

```sql
-- Table: sgc_alert_occurrence_completions
CREATE TABLE public.sgc_alert_occurrence_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,                    -- TENANT ISOLATION
  storage_key TEXT NOT NULL,
  signal JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, storage_key)            -- TENANT + KEY UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_alert_occ_completions_tenant 
  ON sgc_alert_occurrence_completions (tenant_id);

-- RLS Policy
ALTER TABLE public.sgc_alert_occurrence_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.sgc_alert_occurrence_completions
  FOR ALL USING (tenant_id = get_current_tenant());

-- Helper function (in Supabase)
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'tenant_id';
$$;
```

**Tenant Isolation Matrix:**

| Operation | Mechanism |
|-----------|-----------|
| **Read** | `SELECT ... WHERE tenant_id = get_current_tenant()` |
| **Write** | `INSERT ... tenant_id = get_current_tenant()` |
| **Update** | `UPDATE ... WHERE tenant_id = get_current_tenant()` |
| **Delete** | `DELETE ... WHERE tenant_id = get_current_tenant()` |

---

## 4. Storage Security

### 5.1 Bucket Configuration

| Bucket | Purpose | Access |
|---------|---------|--------|
| `documentos-sgc` | Evidence, Signatures, Documents | Private |

### 5.2 Path Structure (Tenant-Scoped)

```
Bucket: documentos-sgc/
├── evidencias/
│   ├── {tenantId}/
│   │   ├── {responseId}/
│   │   │   ├── {timestamp}_{random}.webp
│   │   │   └── ...
├── firmas/
│   ├── {tenantId}/
│   │   ├── {responseId}.png
├── documentos/
│   ├── {tenantId}/
│       ├── {moduleId}/
│           ├── {documentId}.pdf
```

### 5.3 Storage RLS Policies

```sql
-- Bucket: documentos-sgc (private, not public)
CREATE POLICY "tenant_folder_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documentos-sgc' AND
    (storage.foldername(name))[1] = get_current_tenant()
  );

-- Helper function
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'tenant_id';
$$;
```

**Storage Access Matrix:**

| Operation | Evidencias | Firmas | Documentos |
|-----------|------------|--------|------------|
| **Upload** | `operativo`, `calidad`, `administrador` | `operativo`, `calidad`, `administrador` | `administrador`, `calidad` |
| **Download** | Same tenant + uploader/verifier | Same tenant + signer/verifier | Same tenant + role |
| **Delete** | `administrador` only | `administrador` only | `administrador` only |
| **List** | Tenant-scoped | Tenant-scoped | Role-scoped |

---

## 6. Audit Trail & Compliance

### 6.1 Immutable Audit Logs

```sql
CREATE TABLE public.sgc_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES sgc_form_responses(id),
  action_type TEXT NOT NULL,          -- 'create', 'verify', 'update', 'delete'
  modified_by UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only tenant members can read their own audit logs
CREATE POLICY "audit_logs_tenant" ON public.sgc_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sgc_form_responses r
      JOIN sgc_forms f ON r.form_id = f.id
      WHERE r.id = sgc_audit_logs.response_id
        AND f.tenant_id = get_current_tenant()
    )
  );
```

**Audit Events Captured:**
| Event | Action Type | Data Captured |
|-------|-------------|---------------|
| Form Create | `create` | New data + actor |
| Form Verify | `verify` | Status + comment + actor |
| Form Update | `update` | Old + new data + actor |
| Form Delete | `delete` | Old data + actor |
| Evidence Upload | `storage_upload` | File metadata + actor |
| Signature | `signature` | Signature URL + actor |

---

## 4. Transport Security

| Layer | Implementation |
|-------|----------------|
| **HTTPS** | Enforced by GitHub Pages (HSTS) + Supabase |
| **HSTS** | Enforced by GitHub Pages |
| **CSP** | Vite build-time CSP headers |
| **CORS** | Supabase configured for GitHub Pages origin |
| **CSP Headers** | `script-src 'self'; object-src 'none'; base-uri 'self'` |

---

## 5. Secrets Management

| Secret | Storage | Scope |
|--------|---------|-------|
| `VITE_SUPABASE_URL` | GitHub Environment `github-pages` | Build-time injection |
| `VITE_SUPABASE_ANON_KEY` | GitHub Environment `github-pages` | Build-time injection |
| Supabase Service Role | Supabase Dashboard | Server-side only |
| GitHub Token | GitHub Actions | Workflow execution |

**Secret Injection at Build Time:**
```yaml
# .github/workflows/deploy-pages.yml
- name: Build with Supabase environment variables
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
  run: |
    test -n "$VITE_SUPABASE_URL" && echo "VITE_SUPABASE_URL=PRESENT" || echo "WARNING_UNSET"
    test -n "$VITE_SUPABASE_ANON_KEY" && echo "VITE_SUPABASE_ANON_KEY=PRESENT" || echo "WARNING_UNSET"
    npm run build
```

**Build-Time Injection:**
```
Vite replaces import.meta.env.VITE_* at compile time
→ bundle contains actual values (not process.env)
```

---

## 6. Evidence Gaps (Documented)

| Gap | Classification | Sprint |
|-----|----------------|--------|
| Cross-tenant negative test | EVIDENCE GAP (HIGH) | 383+ |
| Cross-browser persistence test | EVIDENCE GAP (MEDIUM) | 383+ |
| Storage RLS policies not fully IaC | REPRODUCIBILITY GAP | 383+ |
| No automated artifact validation | CI GAP (MEDIUM) | 383+ |
| No branch protection | GOVERNANCE GAP (MEDIUM) | 383+ |

---

## 7. Compliance Readiness

| Standard | Coverage | Notes |
|----------|----------|-------|
| **INVIMA** (Colombian FDA) | ✅ Evidence capture, audit trail, traceability | Production certified |
| **ISO 9001** | ✅ Traceability, audit trail, document control | Evidence-based |
| **ISO 27001** | ⚠️ Partial | RLS, encryption, audit logs present; missing formal risk assessment |
| **GDPR** | ⚠️ Partial | Tenant isolation, data minimization; no DPA automation |
| **SOC 2 Type II** | ⚠️ Partial | Supabase is SOC2; application controls need documentation |

---

## 4. Known Limitations (Honest Assessment)

| Limitation | Classification | Impact | Sprint |
|------------|----------------|--------|--------|
| No cross-tenant negative testing | EVIDENCE GAP (HIGH) | Cannot prove Tenant A cannot read Tenant B | 383+ |
| No cross-browser persistence test | EVIDENCE GAP (MEDIUM) | Manual verification only | 383+ |
| Storage RLS not fully IaC | REPRODUCIBILITY GAP (MEDIUM) | Policies in Dashboard, not migrations | 383+ |
| No automated artifact validation | CI GAP (MEDIUM) | Manual verification only | 383+ |
| No branch protection | GOVERNANCE GAP (MEDIUM) | No GitHub branch protection rules | 383+ |
| No staging environment | ENVIRONMENT GAP (MEDIUM) | No preview deployments | 384+ |
| No automated artifact validation | CI GAP (MEDIUM) | Manual verification | 383+ |

---

**Document Classification:** `SECURITY OVERVIEW — PROFESSIONAL PRESENTATION`  
**Generated:** Sprint 383 — Professional Project Presentation  
**Classification:** `SECURITY OVERVIEW — PROFESSIONAL PRESENTATION`  
**Baseline:** `c7d9547` | **HEAD:** `eceaf47` | **Branch:** `release/stable-sprint79`