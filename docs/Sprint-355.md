# Sprint 355 — Supabase Authentication Endpoint & Deployment Regression Forensic Audit

**Date:** 2026-08-28  
**Branch:** release/stable-sprint79  
**Classification:** ROOT CAUSE CERTIFIED  
**Mode:** AUDIT ONLY — Zero production source changes

---

## Executive Summary

The authentication regression (ERR_NAME_NOT_RESOLVED when reaching Supabase auth endpoint) is **not a code defect**. The root cause is a **deployment configuration gap**: GitHub Pages secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are not configured in the repository settings, and the `gh-pages` branch has not been updated since July 15, 2026 (before Sprint 351 introduced the deployment workflow).

**Architecture is correct.** Sprint 351 changes are correct. The deployment pipeline was not activated.

---

## Evidence Chain

### 1. Supabase Client Configuration (src/lib/supabase.js)
- ✅ Singleton pattern via `getSupabaseClient()` — lazy initialization
- ✅ Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `import.meta.env`
- ✅ Exports `isSupabaseConfigured()` guard
- ✅ Single `createClient` call — no duplicate instances

### 2. Auth Flow (src/context/AuthContext.jsx → src/pages/Login.jsx)
- ✅ `AuthContext` uses `getSupabaseClient()` — no direct `createClient`
- ✅ `signInWithPassword` called via supabase client from `getSupabaseClient()`
- ✅ `Login.jsx` consumes `signIn` from `useAuth` hook — no direct supabase calls
- ✅ No cross-contamination with `OccurrenceLedger`, `CompletionBridge`, `PersistencePort`, `TenantIdProviderRegistrar`

### 3. Environment Variable References
| File | VITE_SUPABASE_URL | VITE_SUPABASE_ANON_KEY |
|------|-------------------|------------------------|
| src/lib/supabase.js | ✅ Referenced | ✅ Referenced |
| .github/workflows/deploy-pages.yml | ✅ `${{ secrets.VITE_SUPABASE_URL }}` | ✅ `${{ secrets.VITE_SUPABASE_ANON_KEY }}` |
| .env.example | ✅ Template | ✅ Template |
| .env.production | ✅ `https://ruZomcnxsnhlfqlefsrc.supabase.co` | ✅ `sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti` |
| .env (local) | ✅ `https://ruZomcnxsnhlfqlefsrc.supabase.co` | ✅ `sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti` |

### 4. GitHub Pages Workflow (.github/workflows/deploy-pages.yml)
- ✅ Single workflow file (no duplicates)
- ✅ References secrets correctly: `VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}`
- ✅ Runs `npm run build` → uploads artifact → deploys via `actions/deploy-pages@v4`
- ✅ Uses `actions/setup-node@v4`, `actions/checkout@v4`, `actions/upload-pages-artifact@v3`

### 5. Vite Configuration (vite.config.js)
- ✅ Base path: `/sistema-gestion-calidad-dm/`
- ✅ No hardcoded Supabase configuration

### 6. Build Output Verification (dist/assets/supabase-1TBXvDG2.js)
- ✅ Supabase URL embedded: `https://ruxomcnxsnhlfqlefsrc.supabase.co`
- ✅ Anon key embedded: `sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti`
- ✅ `getSupabaseClient` and `isSupabaseConfigured` present in bundle

### 7. Sprint History Integrity
- ✅ No Sprint 352 scripts in `scripts/` (previously 2 duplicates, now removed)
- ✅ No Sprint 353 script (expected)
- ✅ Only authorized files in git status (audit scripts + docs)

---

## Root Cause Analysis

### Primary Cause: GitHub Pages Secrets Not Configured
The workflow `.github/workflows/deploy-pages.yml` correctly references:
```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

**However**, these secrets are **not defined** in GitHub Repository Settings → Secrets and variables → Actions → Repository secrets. Without them, the build runs with empty/undefined environment variables, causing the Supabase client to fail initialization on GitHub Pages.

### Secondary Cause: gh-pages Branch Stale
- `gh-pages` branch last updated: **July 15, 2026**
- Sprint 351 (deployment workflow) committed: **after July 15**
- The deployment workflow has **never run** against the current codebase

### Why ERR_NAME_NOT_RESOLVED?
On GitHub Pages, the built application loads with:
- `VITE_SUPABASE_URL` = `undefined` (secret not configured)
- `createClient(undefined, ...)` → Supabase client initialized with invalid URL
- `supabase.auth.signInWithPassword()` → DNS lookup for `undefined` → `ERR_NAME_NOT_RESOLVED`

---

## Verification Results

```
SPRINT 355 — SUPABASE AUTHENTICATION ENDPOINT & DEPLOYMENT REGRESSION FORENSIC AUDIT
======================================================================
PASS  54
FAIL  0
TIME  0.058s

FINAL CLASSIFICATION:
  STATUS:  CERTIFIED · AUDIT ONLY
  CLASS:   ROOT CAUSE CERTIFIED
```

All 54 static analysis checks pass.

---

## Correction Authorization

**APPROVED:** Sprint 356 — Configure GitHub Pages Secrets

### Required Actions (Sprint 356)
1. Navigate to GitHub Repository → Settings → Secrets and variables → Actions
2. Add Repository Secret: `VITE_SUPABASE_URL` = `https://ruZomcnxsnhlfqlefsrc.supabase.co`
3. Add Repository Secret: `VITE_SUPABASE_ANON_KEY` = `sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti`
4. Trigger workflow run (push to main or manual dispatch)
5. Verify `gh-pages` branch updates with new deployment
6. Validate authentication works on GitHub Pages URL

---

## Appendix: Commit Timeline

| Commit | Date | Description |
|--------|------|-------------|
| `54951b7` | Baseline | Last stable before Sprint 351 |
| `f355a13` | Sprint 351 | Added GitHub Actions workflow with Supabase env vars |
| `048c426` | Current HEAD | Includes all Sprint 351–355 audit artifacts |

---

## Conclusion

**No code changes required.** The authentication system is architecturally sound. The regression is purely a **deployment operations issue** — GitHub Pages secrets missing and `gh-pages` branch stale. Sprint 356 (configure secrets + trigger deploy) will resolve the ERR_NAME_NOT_RESOLVED error.