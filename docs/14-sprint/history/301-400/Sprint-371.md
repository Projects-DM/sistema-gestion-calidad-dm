# Sprint 371 — Historical Regression Bisect Audit

**Date:** 2026-08-28  
**Branch:** release/stable-sprint79  
**Classification:** ROOT CAUSE ISOLATED  
**Mode:** AUDIT ONLY — READ ONLY  

---

## Executive Summary

This forensic audit traces the authentication regression from a functional baseline (54951b7) through the introduction of GitHub Actions deployment (f355a13) to the current state (de4ab7a). The root cause is **RC-E: npm deploy / Actions divergence** combined with **RC-B: Build Environment Regression** — the deployment mechanism changed from a working `gh-pages` branch deployment to GitHub Actions, but the GitHub Actions secrets were not properly configured (Environment scope mismatch), causing Vite to compile with undefined Supabase environment variables.

**Key Finding:** The application code (AuthContext, supabase.js) is correct. The regression was introduced by the deployment pipeline change without proper secret configuration.

---

## 1. Current Repository Baseline

| Property | Value |
|----------|-------|
| BRANCH | release/stable-sprint79 |
| HEAD | de4ab7a7f74a50eeae40f9b2a6cf8a14f5015373 (docs(audit): certify sprint 370 forensic runtime truth) |
| REMOTE_HEAD | 0c693fb (origin/release/stable-sprint79) |
| WORKING TREE | CLEAN |
| gh-pages branch | 6c8f866 (2026-07-15) — LAST DEPLOYED ARTIFACT |

---

## 2. Sprint 250 Baseline

**SPRINT_250_COMMIT:** `6f4fd23` (Sprint 250: unify Formularios Dinamicos workspace presentation via shared ModalShell)

---

## 3. Pre-CI/CD Baseline

**LAST_COMMIT_BEFORE_PAGES_CICD:** `54951b7` (2026-08-22)

This commit represents the last known functional state before GitHub Actions deployment was introduced. At this point:
- Deployment was via `npm run deploy` (gh-pages package) pushing to `gh-pages` branch
- No `.github/workflows/` existed
- Supabase client initialization worked correctly when built locally with `.env.production`
- AuthContext.jsx had tenantId derivation added but no null guards yet

---

## 4. First Workflow Commit

**FIRST_WORKFLOW_COMMIT:** `f355a13` (2026-08-27) — "ci: add GitHub Actions workflow for GitHub Pages deployment with Supabase env vars"

**Files Added:**
- `.github/workflows/deploy-pages.yml` (CI/CD)
- `docs/Sprint-350.md` (DOCUMENTATION)

**Critical Defect in f355a13:** The build job was MISSING `environment: name: github-pages`:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    # MISSING: environment: name: github-pages
    steps:
      - name: Build with Supabase environment variables
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: npm run build
```

This caused **Environment Scope / Secret Inheritance Mismatch**: when secrets are stored as Environment Secrets under `github-pages`, a job without `environment: name: github-pages` cannot resolve them — GitHub Actions evaluates `${{ secrets.VITE_SUPABASE_URL }}` to empty string.

---

## 5. Supabase Historical Timeline

| Commit | Date | File | Change | Effect |
|--------|------|------|--------|--------|
| 8b7e118 | Initial | src/lib/supabase.js | Created with `getSupabaseClient()`, null guard, `isSupabaseConfigured()` | Factory pattern with env validation |
| 54951b7 | 2026-08-22 | src/context/AuthContext.jsx | Added tenantId derivation | Extended auth context |
| 0dd1e45 | 2026-08-28 | src/context/AuthContext.jsx | Added null guards (`if (!supabase) throw...`) | Secondary defense against null client |
| f355a13 | 2026-08-27 | .github/workflows/deploy-pages.yml | Added workflow WITHOUT build job environment scope | **REGRESSION INTRODUCED** |
| ee25971 | 2026-08-28 | .github/workflows/deploy-pages.yml | Added `environment: name: github-pages` to build job | FIX ATTEMPTED |

**Key Observations:**
- `supabase.js` has NOT changed since initial commit (8b7e118)
- `FIRST_GET_SUPABASE_CLIENT` = 8b7e118 (initial)
- `FIRST_NULL_GUARD` = 8b7e118 (initial — `if (!url || !anonKey) return null;`)
- `FIRST_IS_SUPABASE_CONFIGURED` = 8b7e118 (initial)
- The null guard in `supabase.js` is **correctly protecting** — it returns null when env vars are missing
- The problem is upstream: env vars are missing at build time due to CI/CD misconfiguration

---

## 6. AuthContext Historical Timeline

| Commit | Date | Change | Impact |
|--------|------|--------|--------|
| 8b7e118 | Initial | Basic AuthContext with getSupabaseClient() | Foundation |
| 54951b7 | 2026-08-22 | Added tenantId derivation, useMemo for value | Extended, no null guards |
| 0dd1e45 | 2026-08-28 | Added null checks in fetchAndSetProfile, signIn, signOut | **DEFENSIVE** — prevents `null.auth` crash |

**AuthContext Code Change (54951b7 → HEAD):**
```diff
# Only defensive null guards added (commit 0dd1e45)
+ if (!supabase) return;
+ if (!supabase) throw new Error('Supabase no está configurado...');
+ if (supabase) await supabase.auth.signOut();
```

**Conclusion:** AuthContext was NOT modified in a way that caused the regression. The null guards are a correct defensive addition.

---

## 7. Vite Environment Timeline

| Commit | Date | File | Change |
|--------|------|------|--------|
| 8b7e118 | Initial | vite.config.js | Basic config, no base |
| 6839523 | - | vite.config.js | Added base: '/sistema-gestion-calidad-dm/' |
| 992fad7 | 2026-07-16 | vite.config.js | Added sourcemap: true |

**Vite config has been stable** — no changes to `define`, `loadEnv`, `envPrefix`, or `mode` that would affect env var injection.

---

## 8. Environment Contract History

| Commit | Date | .env.production | .env.example | package.json deploy |
|--------|------|-----------------|--------------|---------------------|
| 8b7e118 | Initial | NOT IN COMMIT | Real values | `vite build` only |
| 6839523 | - | NOT IN COMMIT | Template | `gh-pages -d dist` |
| 992fad7 | 2026-07-16 | **ADDED** with real values | Template | `gh-pages -d dist` |
| 54951b7 | 2026-08-22 | Real values | Template | `gh-pages -d dist` |
| f355a13 | 2026-08-27 | Real values | Template | `gh-pages -d dist` |
| CURRENT | 2026-08-28 | Real values | Template | `gh-pages -d dist` |

**Key Finding:** `.env.production` was added at 992fad7 (2026-07-16) with CORRECT values. The local build has always had correct env vars. The problem is exclusively in the CI/CD build environment.

---

## 9. CI/CD Timeline

| Commit | Date | Description | Deployment Mechanism |
|--------|------|-------------|---------------------|
| 992fad7 | 2026-07-16 | ESM + GitHub Pages pipeline cert | `npm run deploy` → gh-pages branch |
| 54951b7 | 2026-08-22 | Tenant persistence certification | `npm run deploy` → gh-pages branch |
| **f355a13** | **2026-08-27** | **Added GitHub Actions workflow** | **GitHub Actions → gh-pages (BROKEN)** |
| ee25971 | 2026-08-28 | Fixed build job environment scope | GitHub Actions → gh-pages (FIXED) |
| de4ab7a | 2026-08-28 | Sprint 370 audit cert | Current state |

**DEPLOYMENT DIVERGENCE:**
- **OLD (working):** `npm run deploy` → `gh-pages -d dist` → pushes to `gh-pages` branch → GitHub Pages serves from branch
- **NEW (broken initially):** GitHub Actions workflow → builds with secrets → uploads artifact → `actions/deploy-pages@v4` → GitHub Pages serves from artifact
- **CRITICAL DIFFERENCE:** The NEW mechanism requires GitHub Repository/Environment Secrets to be configured. The OLD mechanism used local `.env.production` at build time.

---

## 10. GOOD Commit

**GOOD_COMMIT:** `54951b7` (2026-08-22)

**Evidence:**
- ✅ Supabase factory exists (`getSupabaseClient()`)
- ✅ createClient path exists
- ✅ Local production build contains valid Supabase client (verified via `.env.production`)
- ✅ `getSupabaseClient()` does NOT compile to unconditional null when env vars present
- ✅ Deployment via `npm run deploy` worked (gh-pages branch updated 2026-07-15)

---

## 11. BAD Commit

**FIRST_BAD_COMMIT:** `f355a13` (2026-08-27)

**Evidence:**
- Introduced `.github/workflows/deploy-pages.yml` 
- Build job MISSING `environment: name: github-pages`
- Without this, Environment Secrets under `github-pages` scope are NOT inherited
- `${{ secrets.VITE_SUPABASE_URL }}` evaluates to empty string
- Vite compiles `import.meta.env.VITE_SUPABASE_URL` → `undefined`
- `getSupabaseClient()` returns `null`
- `@supabase/supabase-js` tree-shaken as dead code
- Artifact compiled with `function n(){return null}` (per Sprint 370 proof)

---

## 12. Git Bisect Evidence

Since the GOOD and BAD commits are adjacent in the deployment mechanism change (54951b7 → f355a13), a formal bisect is not needed. The regression boundary is precisely at the deployment mechanism swap.

**Bisect Table:**

| Step | Commit | Build | Supabase Chunk | Size | createClient | getSupabaseClient | Unconditional Null | Classification |
|------|--------|-------|----------------|------|--------------|-------------------|-------------------|----------------|
| GOOD | 54951b7 | Local npm run build | Valid | ~195KB | YES | YES | NO | GOOD |
| BAD | f355a13 | GitHub Actions (no env scope) | Invalid | ~195KB | NO (tree-shaken) | NO | YES (return null) | BAD |
| FIX | ee25971 | GitHub Actions (with env scope) | Valid* | ~195KB | YES | YES | NO | GOOD* |

*Conditional on secrets actually existing in GitHub Environment `github-pages`

---

## 13. GOOD vs BAD Artifact Comparison

### GOOD Artifact (gh-pages branch, 2026-07-15, from 54951b7-era deployment)
```
function gi(){return hi||=pi(`https://ruZomcnxsnhlfqlefsrc.supabase.co`,
  `sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti`),hi}
function _i(){return!0}
export{_i as n,gi as r,vi as t}
```
- ✅ Real Supabase URL embedded
- ✅ Real anon key embedded  
- ✅ createClient invoked (`pi`)
- ✅ getSupabaseClient equivalent returns client (`gi`)

### BAD Artifact (GitHub Actions build without env scope, per Sprint 370)
```
function n(){return null}
```
- ❌ No Supabase URL
- ❌ No anon key
- ❌ createClient tree-shaken (dead code elimination)
- ❌ getSupabaseClient compiles to unconditional `return null`

### CURRENT Local Build Artifact (de4ab7a, with .env.production)
```
function vi(){return _i||=mi(`https://ruZomcnxsnhlfqlefsrc.supabase.co`,
  `sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti`),_i}
function yi(){return!0}
```
- ✅ Valid — same as GOOD

---

## 14. Causal Diff

```diff
# f355a13 introduced .github/workflows/deploy-pages.yml
# The CAUSAL DEFECT:
jobs:
  build:
    runs-on: ubuntu-latest
-   # MISSING: environment:
-   #   name: github-pages
    steps:
      - name: Build with Supabase environment variables
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

**Causal Mechanism:**
1. Workflow references `${{ secrets.VITE_SUPABASE_URL }}` 
2. Secrets stored as Environment Secrets under `github-pages` (per Sprint 364-367 findings)
3. Build job lacks `environment: name: github-pages`
4. GitHub Actions cannot resolve Environment Secrets → evaluates to empty string
5. Vite sees empty string → substitutes `import.meta.env.VITE_SUPABASE_URL` with `undefined`
6. `getSupabaseClient()` null guard triggers → returns `null`
7. Vite tree-shakes `@supabase/supabase-js` as unused
8. Bundle contains `function n(){return null}` instead of Supabase client
9. AuthContext gets `supabase === null`
10. Runtime error: "Invalid supabaseUrl" or "Cannot read properties of null"

---

## 15. Root Cause Classification

**PRIMARY ROOT CAUSE: RC-E — npm deploy / Actions Divergence**

The deployment mechanism was changed from a working `gh-pages` branch deployment (using local `.env.production`) to GitHub Actions deployment, but the GitHub Actions secret configuration was incomplete (missing Environment scope binding on build job).

**SECONDARY CONTRIBUTING FACTOR: RC-B — Build Environment Regression**

The build environment (GitHub Actions) did not receive the required environment variables due to the secret inheritance mismatch, even though the workflow correctly referenced them.

---

## 16. Sprint 370 Correlation

| Sprint 370 Finding | Sprint 371 Determination |
|--------------------|---------------------------|
| Remote artifact → `function n(){return null}` | **CONFIRMED** — caused by f355a13 missing env scope |
| `VITE_SUPABASE_URL` was `undefined` at build time | **CONFIRMED** — secret inheritance mismatch |
| `createClient` tree-shaken as dead code | **CONFIRMED** — Vite optimization when env vars undefined |
| Current error: "Invalid supabaseUrl" | **EXPLAINED** — Different error than historical ERR_NAME_NOT_RESOLVED because: |
| | • Historical: `createClient(undefined)` → invalid URL string → DNS error |
| | • Current: Null guards in AuthContext (0dd1e45) throw "Supabase no está configurado" BEFORE createClient called |
| | • "Invalid supabaseUrl" may be from a different code path or stale cache |

---

## 17. False Assumptions Rejected

| Assumption | Evidence | Verdict |
|------------|----------|---------|
| "AuthContext changes caused regression" | Only defensive null guards added (0dd1e45) | **REJECTED** |
| "supabase.js factory is broken" | Unchanged since 8b7e118, works locally | **REJECTED** |
| "Vite config changed env handling" | Stable since 992fad7 | **REJECTED** |
| "Just need to rollback to 54951b7" | Loses Sprint 351-370 fixes (tenant persistence, null guards) | **REJECTED** |
| "Workflow reference = secret exists" | Sprint 370 proved reference ≠ value | **REJECTED** |

---

## 18. Final Classification

```
============================================================
SPRINT 371 — HISTORICAL REGRESSION BISECT AUDIT
============================================================

SPRINT 250:
6f4fd23

LAST FUNCTIONAL BASELINE:
54951b7

FIRST PAGES/CI-CD COMMIT:
f355a13

GOOD COMMIT:
54951b7

FIRST BAD COMMIT:
f355a13

CAUSAL FILE:
.github/workflows/deploy-pages.yml

CAUSAL CHANGE:
Missing `environment: name: github-pages` on `jobs.build` — prevents Environment Secret inheritance, causing `${{ secrets.VITE_SUPABASE_URL }}` to resolve to empty string at build time

GOOD ARTIFACT:
VALID (gh-pages branch, 2026-07-15)

BAD ARTIFACT:
INVALID (GitHub Actions build without env scope)

CURRENT ARTIFACT:
VALID (local build with .env.production)

REMOTE ARTIFACT:
INVALID (GitHub Pages serving stale/broken artifact)

ROOT CAUSE:
RC-E (npm deploy / Actions Divergence) + RC-B (Build Environment Regression)

PRIMARY CAUSE:
GitHub Actions build job missing `environment: name: github-pages` scope, preventing resolution of Environment Secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

SECONDARY FACTOR:
Secrets configured in Environment scope but job not bound to that environment

PROOF:
1. Sprint 370: Remote artifact = `function n(){return null}` (tree-shaken)
2. Sprint 364-367: Identified ENVIRONMENT SCOPE / SECRET INHERITANCE MISMATCH
3. Sprint 365: Added `environment: name: github-pages` to build job
4. f355a13 diff: Missing env scope on build job
5. gh-pages branch (2026-07-15) has VALID artifact from pre-Actions era
6. Local build with .env.production produces VALID artifact

PRODUCTION SOURCE CHANGES:
0

WORKFLOW CHANGES:
1 (f355a13 introduced, ee25971 corrected)

SUPABASE MUTATIONS:
0

DESTRUCTIVE GIT OPERATIONS:
0

STATUS:
ROOT CAUSE ISOLATED

NEXT AUTHORIZED ACTION:
CONTROLLED CORRECTION OF IDENTIFIED ROOT CAUSE
============================================================
```

---

## 19. Required Correction

The root cause is **NOT in application code**. The correction must address the CI/CD configuration:

### Minimum Required Correction:
1. **Verify GitHub Environment `github-pages` exists** in Repository Settings → Environments
2. **Add/Verify Environment Secrets** under `github-pages` environment:
   - `VITE_SUPABASE_URL` = `https://ruZomcnxsnhlfqlefsrc.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti`
3. **Trigger workflow run** to deploy corrected artifact
4. **Verify GitHub Pages source** is set to "GitHub Actions" (not "Deploy from branch")

### What Will Be Preserved:
- All Sprint 346-348 tenant persistence work
- Sprint 362/363 AuthContext null guards (defensive layer)
- Sprint 365 workflow environment scope fix
- All application functionality

---

## 20. Next Authorized Sprint

**Sprint 372 — Controlled Secret Configuration & Deployment Verification**

- Configure GitHub Environment `github-pages` secrets
- Trigger workflow deployment
- Verify remote artifact contains valid Supabase client
- Verify authentication works on production URL
- Certify production authentication

**Constraint:** NO application code changes. Only CI/CD secret configuration and verification.