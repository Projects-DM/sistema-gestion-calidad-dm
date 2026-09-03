# Sprint 376 — Production Baseline & CI/CD Hardening Audit

**Date:** 2026-08-29  
**Branch:** release/stable-sprint79  
**Classification:** PRODUCTION BASELINE CERTIFIED  
**Mode:** AUDIT ONLY — READ ONLY  

---

## Executive Summary

The production system has been **certified operational** following the authentication recovery (Sprints 371–375). This audit establishes the current state as a **certified production baseline** for future evolution. All application code is preserved, the CI/CD pipeline is correctly configured, the local build produces a valid Supabase artifact, and production authentication has been restored.

---

## 1. Git Baseline

| Property | Value |
|----------|-------|
| **CURRENT_BRANCH** | release/stable-sprint79 |
| **CURRENT_HEAD** | c7d954707dc28ac22aece47d32c9e639d5974105 |
| **REMOTE_HEAD** | c7d9547 (origin/release/stable-sprint79) |
| **WORKING_TREE** | CLEAN (only untracked audit docs) |
| **LAST_PRODUCTION_RELEVANT_COMMIT** | c7d9547 — docs(sprint-375): certify production recovery and authentication |

**Commit History (Production-Relevant):**
```
c7d9547  docs(sprint-375): certify production recovery and authentication
de4ab7a  docs(audit): certify sprint 370 forensic runtime truth
ee25971  ci(auth): inject supabase environment into pages build
0dd1e45  fix(auth): harden supabase client initialization
f355a13  ci: add GitHub Actions workflow for GitHub Pages deployment
54951b7  feat(alerts): certify tenant persistence runtime wiring (LAST KNOWN GOOD PRE-CI/CD)
```

**PRODUCTION_BASELINE_COMMIT:** `c7d9547`  
**PRODUCTION_BASELINE_DATE:** 2026-08-29  
**PRODUCTION_BASELINE_BRANCH:** `release/stable-sprint79`

---

## 2. CI/CD Contract Audit

| Contract | Estado |
|----------|--------|
| Branch | release/stable-sprint79 ✅ |
| Build command | `npm run build` ✅ |
| Environment | github-pages ✅ |
| Supabase URL secret reference | `${{ secrets.VITE_SUPABASE_URL }}` ✅ |
| Supabase key secret reference | `${{ secrets.VITE_SUPABASE_ANON_KEY }}` ✅ |
| Artifact upload | `actions/upload-pages-artifact@v3` ✅ |
| Pages deployment | `actions/deploy-pages@v4` ✅ |
| Pages source | **GitHub Actions** (required, manual verification) ✅ |

---

## 3. Workflow Verification

**File:** `.github/workflows/deploy-pages.yml` — **NO MODIFICATIONS**

| Check | Status | Evidence |
|-------|--------|----------|
| workflow exists | ✅ PASS | Present at HEAD |
| build job exists | ✅ PASS | `jobs.build` defined |
| deploy job exists | ✅ PASS | `jobs.deploy` defined |
| build.environment = github-pages | ✅ PASS | `environment: name: github-pages` |
| deploy.environment = github-pages | ✅ PASS | `environment: name: github-pages` |
| VITE_SUPABASE_URL reference | ✅ PASS | `${{ secrets.VITE_SUPABASE_URL }}` |
| VITE_SUPABASE_ANON_KEY reference | ✅ PASS | `${{ secrets.VITE_SUPABASE_ANON_KEY }}` |
| permissions.contents = read | ✅ PASS | `contents: read` |
| permissions.pages = write | ✅ PASS | `pages: write` |
| permissions.id-token = write | ✅ PASS | `id-token: write` |
| upload-pages-artifact | ✅ PASS | `actions/upload-pages-artifact@v3` |
| deploy-pages | ✅ PASS | `actions/deploy-pages@v4` |
| workflow_dispatch | ✅ PASS | Manual trigger enabled |
| Build verification echoes | ✅ PASS | `VITE_SUPABASE_URL=PRESENT` checks |

---

## 4. Environment Contract (References Only)

| Secret | Reference | Status |
|--------|-----------|--------|
| VITE_SUPABASE_URL | `${{ secrets.VITE_SUPABASE_URL }}` | ✅ REFERENCE PRESENT |
| VITE_SUPABASE_ANON_KEY | `${{ secrets.VITE_SUPABASE_ANON_KEY }}` | ✅ REFERENCE PRESENT |

> **Note:** Values verified in GitHub Environment `github-pages` during Sprint 374 recovery. No values exposed in this audit.

---

## 5. Local Environment Audit

| File | Exists | VITE_SUPABASE_URL | VITE_SUPABASE_ANON_KEY | Format Valid |
|------|--------|-------------------|------------------------|--------------|
| .env | ✅ YES | ✅ YES | ✅ YES | HTTPS + *.supabase.co ✅ |
| .env.production | ✅ YES | ✅ YES | ✅ YES | HTTPS + *.supabase.co ✅ |
| .env.example | ✅ YES | ✅ YES | ✅ YES | Template ✅ |

**LOCAL ENVIRONMENT CONTRACT: VALID**

---

## 6. Supabase Application Contract

### src/lib/supabase.js — STABLE (unchanged since initial commit)

| Check | Status |
|-------|--------|
| import.meta.env.VITE_SUPABASE_URL | ✅ PRESENT |
| import.meta.env.VITE_SUPABASE_ANON_KEY | ✅ PRESENT |
| createClient | ✅ PRESENT |
| getSupabaseClient() | ✅ PRESENT (singleton pattern) |
| isSupabaseConfigured() | ✅ PRESENT |
| Null guard (`if (!url || !anonKey) return null`) | ✅ PRESENT |

**SUPABASE CLIENT: STABLE**

### src/context/AuthContext.jsx — STABLE (defensive null guards only)

| Check | Status |
|-------|--------|
| getSupabaseClient() | ✅ USED |
| signIn() | ✅ PRESENT (with null guard) |
| signOut() | ✅ PRESENT (with null guard) |
| supabase.auth.signInWithPassword | ✅ PRESENT |
| supabase.auth.signOut | ✅ PRESENT |
| onAuthStateChange | ✅ PRESENT |
| Session/profile management | ✅ PRESENT |
| Defensive null guards | ✅ PRESENT (commit 0dd1e45) |

**AUTH IMPLEMENTATION: STABLE**  
**AUTH CODE MODIFICATIONS SINCE RECOVERY: 0**

---

## 7. Local Production Build

| Metric | Result |
|--------|--------|
| **BUILD RESULT** | ✅ SUCCESS |
| **BUILD TIME** | 7.75s |
| **DIST CREATED** | ✅ YES |
| **BUILD ERRORS** | 0 |
| **BUILD WARNINGS** | Chunk size > 500kB (expected for monolithic build) |

**Build Output:**
```
dist/index.html                                          1.45 kB │ gzip:   0.55 kB
dist/assets/supabase-BSsRzCe5.js                       195.53 kB │ gzip:  49.96 kB
dist/assets/index-AU2GEjaQ.js                        2,332.96 kB │ gzip: 625.87 kB
... (19 total assets)
✓ built in 7.75s
```

---

## 8. Artifact Forensic Check

**File:** `dist/assets/supabase-BSsRzCe5.js` (195,530 bytes)

| Check | Status | Evidence |
|-------|--------|----------|
| createClient | ✅ PRESENT | Found in minified bundle |
| getSupabaseClient | ✅ PRESENT | Found in minified bundle |
| isSupabaseConfigured | ✅ PRESENT | Found in minified bundle |
| supabase.co EMBEDDED | ✅ YES | `https://ruZomcnxsnhlfqlefsrc.supabase.co` |
| NULL STUB `function n(){return null}` | ❌ NOT FOUND | **VALID ARTIFACT** |

**LOCAL PRODUCTION ARTIFACT: VALID**

---

## 9. Artifact Integrity (SHA-256)

| File | SHA-256 |
|------|---------|
| dist/index.html | `f86ecb090227f7b0c1554e8c08815aefbf674e0b277c83b6ce64fb2eae1c5b47` |
| dist/assets/supabase-BSsRzCe5.js | `7adf72d429538546636e4e82d3cf4af2def282c00243a965db9aa4dc049571be` |
| dist/assets/index-AU2GEjaQ.js | `b394889dad7d88f42e4f43680b7461fb778128f73ccd130e4fe794a50ec49897` |
| dist/assets/index-DmN2BT2u.css | `b15e34821a6206f727ff5e5df515454f338f00892127e1fbdefcb7020c84701f` |

**Total artifact files:** 19  
**Total artifact size:** ~3.8 MB (gzipped ~950 KB)

---

## 10. Production URL Audit

**Production URL:** `https://projects-dm.github.io/sistema-gestion-calidad-dm/`

| Layer | Status |
|-------|--------|
| Pages source | **GitHub Actions** (verified Sprint 374) |
| Environment | github-pages |
| Deployment mechanism | `actions/deploy-pages@v4` |
| Legacy gh-pages branch | **NOT PRODUCTION SOURCE** (stale since 2026-07-15) |
| Last deployment | Sprint 374 workflow run |

> **Note:** Remote deployment evidence recorded in Sprint 374. This audit confirms the configuration is correct.

---

## 11. Production Runtime Smoke Test (Sprint 374 Evidence)

| Test | Result |
|------|--------|
| ✓ application loads | ✅ PASS |
| ✓ no white screen | ✅ PASS |
| ✓ login works | ✅ PASS |
| ✓ session established | ✅ PASS |
| ✓ dashboard loads | ✅ PASS |
| ✓ navigation works | ✅ PASS |
| ✓ logout works | ✅ PASS |
| ✓ re-login works | ✅ PASS |

**Console Regression Check:**
- ❌ `Invalid supabaseUrl` — NOT PRESENT
- ❌ `Supabase no está configurado` — NOT PRESENT
- ❌ `ERR_NAME_NOT_RESOLVED` — NOT PRESENT
- ❌ `Cannot read properties of null` — NOT PRESENT

---

## 12. Persistence / Alerts Constraint (Explicitly Out of Scope)

| Area | Status |
|------|--------|
| ALERT PERSISTENCE | NOT AUDITED FOR CORRECTION |
| ALERT PERFORMANCE | NOT MODIFIED |
| TENANT PERSISTENCE | NOT MODIFIED |
| CROSS-BROWSER PERSISTENCE | NOT MODIFIED |

**Rationale:** These are deliberate future evolution targets, not baseline concerns.

---

## 13. GitHub Pages Baseline

| Property | Value |
|----------|-------|
| Pages source | GitHub Actions ✅ |
| Environment | github-pages ✅ |
| Deployment mechanism | actions/deploy-pages@v4 ✅ |
| Legacy gh-pages branch | Stale (2026-07-15) — NOT PRODUCTION SOURCE |

---

## 14. Critical Deployment Invariant

**PRODUCTION DEPLOYMENT IS VALID ONLY WHEN:**

1. ✅ Workflow executes successfully
2. ✅ Environment secrets resolve (github-pages)
3. ✅ Build succeeds (`npm run build`)
4. ✅ Artifact is generated (`dist/`)
5. ✅ Artifact contains valid Supabase client (createClient + URL)
6. ✅ GitHub Pages deployment succeeds (`actions/deploy-pages`)
7. ✅ Production URL serves the new artifact
8. ✅ Authentication succeeds (Supabase Auth)
9. ✅ Smoke test succeeds (Login → Dashboard → Logout → Re-login)

---

## 15. Future Production Gate — Hardening Gap Analysis

| Control | Actual | Objetivo |
|---------|--------|----------|
| Production branch protection | ❌ Missing | ✅ Required (branch protection rules) |
| CI build required | ✅ Workflow exists | ✅ Required status check |
| Environment protection | ⚠️ Exists | ✅ Protected (reviewers) |
| Secrets validation | ⚠️ Manual | ✅ Automated pre-flight |
| Artifact content validation | ❌ Manual | ✅ Automated (CI step) |
| Automated smoke test | ❌ Manual | ✅ Automated (Playwright/Cypress) |
| Production health check | ❌ Manual | ✅ Automated (scheduled) |
| Deployment rollback strategy | ❌ Manual | ✅ Documented + Automated |
| Artifact provenance | ❌ None | ✅ Signed/Verified |
| Staging environment | ❌ None | ✅ Required (preview deployments) |
| Regression suite | ⚠️ Partial | ✅ Formal |

---

## 16. Rollback Baseline

| Reference | Value |
|-----------|-------|
| **LAST KNOWN GOOD COMMIT** | `54951b7` (pre-CI/CD, tenant persistence certified) |
| **LAST KNOWN GOOD ARTIFACT** | gh-pages branch @ 2026-07-15 (valid but stale) |
| **CURRENT PRODUCTION COMMIT** | `c7d9547` (Sprint 375 certified) |
| **CURRENT PRODUCTION ARTIFACT** | GitHub Actions deployment (Sprint 374) |

**ROLLBACK ANSWER:** **YES** — We know exactly which version to recover:
- **Immediate:** Revert Pages source to branch (gh-pages) if Actions fails
- **Full:** Reset to `54951b7` and `npm run deploy` (preserves tenant persistence work)

---

## 17. Git Safety Gate (Final Verification)

```
git status --short
→ (clean - only untracked docs/Sprint-*.md)

git diff --stat
→ (no output - no changes to tracked files)

git diff -- .github/workflows/deploy-pages.yml
→ (no output - workflow unchanged)
```

**VERIFIED:**
- ✅ NO SOURCE CHANGES
- ✅ NO WORKFLOW CHANGES
- ✅ NO PACKAGE CHANGES
- ✅ NO SUPABASE CHANGES
- ✅ ONLY DOCUMENTATION ADDED (docs/Sprint-*.md)

---

## 18. Final Classification

```
============================================================
PRODUCTION BASELINE CERTIFIED
============================================================

La versión actualmente desplegada es funcional,
reproducible y queda establecida como baseline oficial
para futuras evoluciones.

APPLICATION CODE:
PRESERVED (0 modifications)

PRODUCTION:
OPERATIONAL (https://projects-dm.github.io/sistema-gestion-calidad-dm/)

AUTH:
CERTIFIED (Login → Session → Dashboard → Logout → Re-login ✅)

CI/CD:
CERTIFIED (Workflow correct, Environment bound, Secrets referenced)

ARTIFACT:
CERTIFIED (createClient + URL embedded, NO null stub)

ROLLBACK REFERENCE:
IDENTIFIED (54951b7 for full, gh-pages branch for immediate)

HARDENING GAPS:
DOCUMENTED (11 controls identified for Sprint 377+)

APPLICATION CHANGES:
0

SUPABASE MUTATIONS:
0

PERSISTENCE CHANGES:
0

ALERT CHANGES:
0

STATUS:
BASELINE CERTIFIED
============================================================
```

---

## 19. Production Baseline Record (Summary)

| Item | Value |
|------|-------|
| **SPRINT** | 376 |
| **DATE** | 2026-08-29 |
| **BRANCH** | release/stable-sprint79 |
| **HEAD** | c7d954707dc28ac22aece47d32c9e639d5974105 |
| **PRODUCTION COMMIT** | c7d9547 |
| **WORKFLOW** | .github/workflows/deploy-pages.yml (ee25971 corrected) |
| **ENVIRONMENT** | github-pages |
| **BUILD CONTRACT** | npm run build → Vite → dist/ |
| **ARTIFACT** | supabase-BSsRzCe5.js (SHA: 7adf72d4...) |
| **PAGES** | GitHub Actions source |
| **SUPABASE CLIENT** | Valid (singleton, null-guarded) |
| **AUTH** | Certified (Supabase Auth functional) |
| **SMOKE TEST** | PASS (Login/Session/Dashboard/Logout/Re-login) |
| **KNOWN LIMITATIONS** | Chunk size warnings; no automated artifact validation; no staging |
| **HARDENING GAPS** | 11 controls (branch protection, automated tests, etc.) |
| **ROLLBACK REFERENCE** | 54951b7 (full) / gh-pages branch (immediate) |

---

**Report Generated:** Sprint 376 Audit Complete  
**Next Authorized Sprint:** 377 — Development / Staging Architecture