# ADR-007: Authentication Client Initialization Contract

**Status:** ACCEPTED  
**Date:** 2026-08-28 (Sprint 362-363), 2026-09-03 (consolidated)  
**Deciders:** Architecture Team  
**Sprint References:** Sprint 355-370 (auth regression chain), Sprint 362 (null-state audit), Sprint 363 (hardening), Sprint 369 (certification)

---

## Context

The authentication system experienced a critical regression chain (Sprints 355-370):

1. **Sprint 351**: GitHub Actions workflow introduced but build job lacked `environment: github-pages`
2. **Sprint 355-358**: `ERR_NAME_NOT_RESOLVED` — Supabase hostname unresolved due to missing env vars
3. **Sprint 360-361**: GitHub Pages source misconfiguration + missing Environment Secrets
4. **Sprint 362**: **New error** — `TypeError: Cannot read properties of null (reading 'auth')` at `AuthContext.jsx:106`
4. **Root cause**: `getSupabaseClient()` returns `null` when env vars missing → `supabase.auth` dereference throws pre-network

The core issue: **The authentication client initialization had no contract for the null state**, and `AuthContext` assumed `getSupabaseClient()` always returned a valid client.

## Decision

Establish a formal **Authentication Client Initialization Contract** with explicit null-state handling:

### Contract Requirements

| Requirement | Specification |
|-------------|---------------|
| **CLIENT-001** | `getSupabaseClient()` returns `SupabaseClient \| null` — never throws |
| **CLIENT-002** | `getSupabaseClient()` returns `null` iff `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` missing |
| **CLIENT-003** | `getSupabaseClient()` is a singleton — same instance returned on subsequent calls |
| **CLIENT-004** | `isSupabaseConfigured()` returns `boolean` — `true` iff both env vars present |
| **CLIENT-005** | `createClient()` called **at most once** — lazy initialization behind null guard |

### Null-State Handling Contract (AuthContext)

```javascript
// INVARIANT AUTH-NULL-01
const supabase = getSupabaseClient();

// INVARIANT AUTH-NULL-02: Null guard BEFORE any .auth access
const signIn = async (email, password) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado o el cliente no está inicializado.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

// INVARIANT AUTH-NULL-03: Guarded signOut
const signOut = async () => {
  if (supabase) {
    await supabase.auth.signOut();
  }
  setUser(null);
  setProfile(null);
};

// INVARIANT AUTH-NULL-04: Guarded profile fetch
const fetchAndSetProfile = useCallback(async (userId) => {
  if (!supabase) return;  // Early return, no throw
  // ... rest of implementation
}, [supabase]);
```

### Build-Time Contract

| Variable | Source | Required | Build Behavior |
|----------|--------|----------|----------------|
| `VITE_SUPABASE_URL` | GitHub Environment Secret | **REQUIRED** | Vite replaces `import.meta.env.VITE_SUPABASE_URL` at compile time |
| `VITE_SUPABASE_ANON_KEY` | GitHub Environment Secret | **REQUIRED** | Vite replaces `import.meta.env.VITE_SUPABASE_ANON_KEY` at compile time |

**If missing at build time**: Vite replaces with `undefined` → `getSupabaseClient()` returns `null` → AuthContext null guards activate → controlled error message instead of `TypeError`

### Error Classification

| Error | Layer | User Message | Recovery |
|-------|-------|--------------|----------|
| `TypeError: Cannot read properties of null` | **PRE-NETWORK** | "Supabase no está configurado..." | Configure Environment Secrets |
| `ERR_NAME_NOT_RESOLVED` | **NETWORK** | "Error de conexión..." | Check Supabase URL / DNS |
| `AuthRetryableFetchError` | **NETWORK** | "Error de conexión..." | Retry / check network |
| `AuthApiError` (400/401/403) | **APPLICATION** | "Credenciales inválidas" | Check credentials |

## Consequences

### Positive
- **Predictable failure modes**: No more `TypeError: Cannot read properties of null`
- **Clear error messages**: Users see actionable messages, not stack traces
- **Defense in depth**: Null guards at every `supabase.auth` access point
- **Build-time detection**: Missing env vars detected at build (warning logs)
- **Runtime safety**: Graceful degradation instead of crash

### Negative
- **Defensive code overhead**: Null guards at every supabase access point
- **Error message maintenance**: Spanish messages must be kept in sync
- **Testing burden**: Must test both null and valid client paths

## Implementation Evidence

| Sprint | Action |
|--------|--------|
| Sprint 362 | Forensic audit — identified null dereference at `AuthContext.jsx:106` |
| Sprint 363 | Hardening — added null guards in `AuthContext.jsx` (3 locations) |
| Sprint 369 | Final certification — null guards verified active, 0 regressions |

### Code Changes (Sprint 363)

```javascript
// src/context/AuthContext.jsx - Added null guards
const signIn = async (email, password) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado o el cliente no está inicializado.');
  }
  // ...
};

const signOut = async () => {
  if (supabase) {
    await supabase.auth.signOut();
  }
  // ...
};

const fetchAndSetProfile = useCallback(async (userId) => {
  if (!supabase) return;  // Early return, no throw
  // ...
}, [supabase]);
```

## Verification Evidence (Sprint 369 Certified)

| Check | Result |
|-------|--------|
| Null guards in `signIn` | ✅ PASS |
| Null guards in `signOut` | ✅ PASS |
| Null guards in `fetchAndSetProfile` | ✅ PASS |
| `getSupabaseClient()` null guard | ✅ PASS |
| `isSupabaseConfigured()` | ✅ PASS |
| Production login flow | ✅ SUCCESS |
| No `null.auth` dereferences | ✅ 0 observed |
| No regressions | ✅ 12 subsystems preserved |

## Related ADRs
- ADR-004: Supabase as Remote Persistence Backend (client initialization)
- ADR-005: GitHub Actions + GitHub Pages Production Deployment (build-time env injection)
- ADR-006: Tenant-Scoped Persistence (tenant context for auth)

---

**Supersedes**: Implicit assumption that `getSupabaseClient()` always returns valid client  
**Next Review**: 2026-12-01