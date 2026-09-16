# Sprint 374 — Production Deployment Recovery & Authentication Certification

**Date:** 2026-08-29  
**Branch:** release/stable-sprint79  
**Classification:** PENDING MANUAL VERIFICATION  
**Mode:** CONTROLLED RECOVERY + PRODUCTION VALIDATION  

---

## Executive Summary

Local static audit confirms: **application code is intact, workflow is correctly configured, local build produces VALID artifact**. The production regression (Invalid supabaseUrl) is caused by a **deployment pipeline configuration gap** — GitHub Environment secrets and Pages source must be configured manually, then the workflow executed.

**Current State:** READY FOR MANUAL DEPLOYMENT EXECUTION

---

## Local Verification Results (Completed)

| Layer | Status | Evidence |
|-------|--------|----------|
| **Branch** | ✅ | release/stable-sprint79 |
| **Working Tree** | ✅ CLEAN | Only audit docs |
| **Application Code** | ✅ PRESERVED | No src/ modifications |
| **supabase.js** | ✅ UNCHANGED | Null guard intact, createClient present |
| **AuthContext.jsx** | ✅ DEFENSIVE | Null guards only (commit 0dd1e45) |
| **vite.config.js** | ✅ STABLE | Base path correct |
| **Workflow Config** | ✅ CORRECT | ee25971 applied: build.environment=github-pages |
| **Local .env.production** | ✅ VALID | URL + key present, format correct |
| **Local Build Artifact** | ✅ VALID | createClient + URL embedded, NO null stub |

### Local Build Artifact Evidence
```
File: supabase-BSsRzCe5.js (195,530 bytes)
✅ createClient: PRESENT
✅ getSupabaseClient: PRESENT  
✅ isSupabaseConfigured: PRESENT
✅ supabase.co EMBEDDED: YES → https://ruZomcnxsnhlfqlefsrc.supabase.co
✅ NULL STUB (function n(){return null}): NOT FOUND
```

---

## Manual Actions Required (GitHub UI)

### 1. GitHub Environment Configuration
```
Repository → Settings → Environments → github-pages
```
**Required:**
- ✅ Environment `github-pages` exists
- ⚠️ Secret: `VITE_SUPABASE_URL` = `https://ruZomcnxsnhlfqlefsrc.supabase.co`
- ⚠️ Secret: `VITE_SUPABASE_ANON_KEY` = `sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti`

### 2. GitHub Pages Source
```
Repository → Settings → Pages → Build and deployment → Source
```
**Required:**
- ⚠️ **GitHub Actions** (NOT "Deploy from a branch")

> **CRITICAL:** gh-pages branch is STALE (last update 2026-07-15, 42 days BEFORE workflow introduction). If Pages source remains "Deploy from branch", it will serve the OLD artifact regardless of Actions success.

### 3. Workflow Execution
```
Actions → Deploy to GitHub Pages → Run workflow → release/stable-sprint79
```

---

## Expected Workflow Results

| Step | Expected Output |
|------|-----------------|
| Secret Injection | `VITE_SUPABASE_URL=PRESENT`<br>`VITE_SUPABASE_ANON_KEY=PRESENT` |
| Build | `npm run build` → SUCCESS |
| Artifact Upload | `actions/upload-pages-artifact@v3` → SUCCESS |
| Deployment | `actions/deploy-pages@v4` → SUCCESS |

**If build shows `WARNING_UNSET` or `ABSENT` → STOP (RC-B: Build Environment Failure)**

---

## Post-Deployment Verification

### Artifact Verification
Production artifact MUST contain:
- ✅ `createClient` present
- ✅ Supabase URL embedded (`https://ruZomcnxsnhlfqlefsrc.supabase.co`)
- ❌ `function n(){return null}` NOT FOUND

### Browser Runtime Verification (Incognito/Private Window)
**URL:** `https://projects-dm.github.io/sistema-gestion-calidad-dm/`

| Check | Expected |
|-------|----------|
| Console | No `Invalid supabaseUrl`, no `Supabase no está configurado` |
| LOAD | Application loads (no white screen) |
| LOGIN | Supabase Auth → SESSION established |
| DASHBOARD | Loads normally |
| LOGOUT | Works correctly |
| RE-LOGIN | Works without errors |
| MOBILE | Same flow on mobile browser (private) |

---

## Decision Matrix

| Scenario | Evidence | Classification | Action |
|----------|----------|----------------|--------|
| **All ✅** | Secrets present, Actions green, artifact valid, login works | **PRODUCTION RECOVERY CERTIFIED** | Complete |
| Secrets ABSENT in build | `WARNING_UNSET` in logs | **RC-B: Build Environment Failure** | Fix Environment secrets |
| Pages source = branch | Artifact valid but Pages serves old | **RC-G: Pages Source Mismatch** | Switch Pages to Actions |
| Actions valid, browser invalid | Artifact valid but browser gets null stub | **RC-H: Artifact Mismatch** | Audit served artifact |

---

## Certification Matrix (Target State)

| Layer | Target |
|-------|--------|
| GitHub Environment | ✅ CERTIFIED |
| VITE_SUPABASE_URL secret | ✅ CERTIFIED |
| VITE_SUPABASE_ANON_KEY secret | ✅ CERTIFIED |
| Pages Source | ✅ GitHub Actions |
| Workflow Execution | ✅ CERTIFIED |
| Secret Injection | ✅ PRESENT |
| Vite Build | ✅ CERTIFIED |
| Artifact Upload | ✅ CERTIFIED |
| Pages Deployment | ✅ CERTIFIED |
| Supabase URL in Artifact | ✅ CERTIFIED |
| createClient | ✅ CERTIFIED |
| Null Stub | ❌ ABSENT |
| Production Load | ✅ CERTIFIED |
| Supabase Initialization | ✅ CERTIFIED |
| Login | ✅ CERTIFIED |
| Session | ✅ CERTIFIED |
| Dashboard | ✅ CERTIFIED |
| Logout | ✅ CERTIFIED |
| Re-login | ✅ CERTIFIED |
| Mobile | ✅ CERTIFIED |

---

## Constraints Compliance

| Constraint | Status |
|------------|--------|
| Application code changes | 0 |
| Supabase mutations | 0 |
| Persistence changes | 0 |
| Alert changes | 0 |
| RLS changes | 0 |
| Rollback executed | 0 |
| git reset/revert | 0 |
| npm run deploy executed | 0 |
| Secrets exposed | 0 |

---

## Next Steps (Manual)

1. **Configure GitHub Environment `github-pages`** with both secrets
2. **Switch Pages Source** to "GitHub Actions"  
3. **Run Workflow** on `release/stable-sprint79`
4. **Verify** build logs show `PRESENT` for both secrets
5. **Verify** deployment succeeds
6. **Test** production authentication in incognito + mobile
7. **Update this report** with run ID, timestamps, and PASS/FAIL results

---

## Run ID Tracking (To Be Filled After Execution)

| Field | Value |
|-------|-------|
| Workflow Run ID | [PENDING] |
| Commit SHA | de4ab7a |
| Build Start | [PENDING] |
| Build End | [PENDING] |
| Deploy End | [PENDING] |
| Pages Updated | [PENDING] |

---

## Final Classification (Pending)

```
============================================================
SPRINT 374 — PRODUCTION DEPLOYMENT RECOVERY
             & AUTHENTICATION CERTIFICATION
============================================================

BRANCH:
release/stable-sprint79

APPLICATION CODE:
PRESERVED

WORKFLOW:
CERTIFIED (local)

ENVIRONMENT:
PENDING (manual)

SECRETS:
PENDING (manual)

VITE INJECTION:
PENDING (Actions run)

BUILD:
PENDING (Actions run)

ARTIFACT:
PENDING (Actions run)

GITHUB PAGES:
PENDING (source switch + deploy)

SUPABASE CLIENT:
PENDING (production test)

AUTHENTICATION:
PENDING (production test)

SESSION:
PENDING (production test)

DASHBOARD:
PENDING (production test)

LOGOUT:
PENDING (production test)

RE-LOGIN:
PENDING (production test)

MOBILE:
PENDING (production test)

APPLICATION CODE CHANGES:
0

SUPABASE MUTATIONS:
0

PERSISTENCE CHANGES:
0

ALERT CHANGES:
0

ROLLBACK:
0

STATUS:
READY FOR MANUAL DEPLOYMENT EXECUTION

FINAL CLASSIFICATION:
PENDING — MANUAL GITHUB UI ACTIONS REQUIRED
============================================================
```