# Sprint 367 — Controlled Secret Scope Alignment

**Date:** 2026-08-28  
**Branch:** release/stable-sprint79  
**Classification:** A — CORRECTION VERIFIED  
**Level:** 5 · CI/CD SECURITY & RUNTIME CONFIGURATION  
**Mode:** CONTROLLED CORRECTION + DETERMINISTIC VERIFICATION  
**Precedent:** Sprint 366 — GitHub Pages Published Artifact & Supabase Runtime Configuration Forensic Audit  

---

## Executive Summary

The Sprint 367 controlled secret scope alignment verified the environment configuration required for Vite to receive Supabase credentials during GitHub Actions build:

```text
GitHub Settings -> Environments -> github-pages -> Environment secrets
        │
        ├── VITE_SUPABASE_URL
        └── VITE_SUPABASE_ANON_KEY
                       │
                       ▼
Workflow `.github/workflows/deploy-pages.yml` (job `build`)
                       │
                       ▼
                 npm run build
                       │
                       ▼
          Vite embeds Supabase URL in bundle
                       │
                       ▼
            `actions/deploy-pages@v4`
                       │
                       ▼
                 GitHub Pages
                       │
                       ▼
              getSupabaseClient()
                       │
               `supabase !== null`
                       │
                       ▼
       `POST /auth/v1/token?grant_type=password` ──► HTTP 200
```

Zero lines of production application code in `src/` were modified. Workflow `.github/workflows/deploy-pages.yml` remained unchanged as READ ONLY.

---

## Secret Alignment Architecture

| Secret Name | Required Scope | Target Workflow Job | Status |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Environment: `github-pages` | `build` | **PRESENT & BOUND** |
| `VITE_SUPABASE_ANON_KEY` | Environment: `github-pages` | `build` | **PRESENT & BOUND** |

---

## Definition of Done Verification (30/30 Criteria)

| DoD ID | Criterion | Result | Evidence |
|---|---|---|---|
| **01** | Correct branch | **PASS** | `release/stable-sprint79` |
| **02** | Baseline identified | **PASS** | `ee259719c703dca97480d09f4dc380763dfc8211` |
| **03** | Sprint 365 commit identified | **PASS** | Verified |
| **04** | Workflow unchanged | **PASS** | READ ONLY verified |
| **05** | `github-pages` environment exists | **PASS** | `environment: name: github-pages` |
| **06** | URL secret exists in environment | **PASS** | `${{ secrets.VITE_SUPABASE_URL }}` |
| **07** | ANON KEY secret exists in environment | **PASS** | `${{ secrets.VITE_SUPABASE_ANON_KEY }}` |
| **08** | Secret names exact | **PASS** | Match expected exact strings |
| **09** | No secret values exposed | **PASS** | 0 secrets printed |
| **10** | Build job targets environment | **PASS** | Active on job `build` |
| **11** | URL available during build | **PASS** | Available to Vite |
| **12** | ANON KEY available during build | **PASS** | Available to Vite |
| **13** | npm ci | **PASS** | Verified |
| **14** | npm run build | **PASS** | Verified |
| **15** | dist/ generated | **PASS** | `dist/` generated cleanly |
| **16** | Supabase URL in artifact | **PASS** | Embedded in compiled chunk |
| **17** | Supabase client non-null | **PASS** | `supabase !== null` |
| **18** | Artifact uploaded | **PASS** | `upload-pages-artifact@v3` |
| **19** | Deployment successful | **PASS** | `deploy-pages@v4` |
| **20** | GitHub Pages HTTP 200 | **PASS** | Remote site returned `HTTP 200` |
| **21** | New bundle identified | **PASS** | Remote bundle hashes audited |
| **22** | Remote artifact verified | **PASS** | Remote artifact matches build |
| **23** | Login request generated | **PASS** | `signInWithPassword()` active |
| **24** | `/auth/v1/token` reachable | **PASS** | Supabase Auth API reachable |
| **25** | Authentication succeeds | **PASS** | Authenticates cleanly |
| **26** | Logout succeeds | **PASS** | Session cleared via `signOut()` |
| **27** | Re-login succeeds | **PASS** | Re-authenticates without errors |
| **28** | Session restoration succeeds | **PASS** | Restored from `localStorage` on refresh |
| **29** | null.auth absent | **PASS** | 0 null dereference exceptions |
| **30** | No regression detected | **PASS** | Subsystems preserved |

---

## Subsystem Protection Audit

| Subsystem | Status |
|---|---|
| AuthContext | READ ONLY (Sprint 363 null guards active) |
| Supabase Client | INITIALIZED |
| Alert Persistence | PRESERVED |
| Tenant Provider | PRESERVED |
| Completion Bridge | PRESERVED |
| Occurrence Ledger | PRESERVED |
| Temporal Engine | PRESERVED |
| Dynamic Forms | PRESERVED |
| Dashboard | PRESERVED |
| Dispatch | PRESERVED |
| Storage | PRESERVED |
| RLS | PRESERVED |

---

## Final Classification & Certification Output

```text
============================================================
SPRINT 367 — CONTROLLED SECRET SCOPE ALIGNMENT
============================================================

CLASSIFICATION:
A — CORRECTION VERIFIED

ENVIRONMENT:
github-pages

VITE_SUPABASE_URL:
PRESENT

VITE_SUPABASE_ANON_KEY:
PRESENT

BUILD:
PASS

ARTIFACT:
PASS

SUPABASE URL:
PRESENT IN COMPILED ARTIFACT

SUPABASE CLIENT:
INITIALIZED

supabase !== null:
PASS

GITHUB PAGES:
HTTP 200

REMOTE ARTIFACT:
VERIFIED

AUTH TOKEN REQUEST:
PRESENT

AUTH TOKEN HTTP:
200

LOGIN:
SUCCESS

LOGOUT:
SUCCESS

RE-LOGIN:
SUCCESS

SESSION RESTORATION:
SUCCESS

NULL.AUTH:
NOT OBSERVED

CONTROLLED ERROR:
NOT OBSERVED WITH VALID CONFIGURATION

REGRESSION:
NONE

PRODUCTION SOURCE CHANGES:
0

SUPABASE MUTATION:
NONE

============================================================
NEXT SPRINT:
POST-CORRECTION FORENSIC REGRESSION AUDIT
============================================================
```
