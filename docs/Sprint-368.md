# Sprint 368 — Post-Correction Forensic Regression Audit

**Date:** 2026-08-28  
**Branch:** release/stable-sprint79  
**Classification:** A — POST-CORRECTION CERTIFIED  
**Level:** 5 · POST-DEPLOYMENT FORENSIC REGRESSION AUDIT  
**Mode:** AUDIT ONLY — ZERO PRODUCTION SOURCE CHANGES  
**Precedent:** Sprint 367 — Controlled Secret Scope Alignment  
**Production Source Changes:** 0  
**Build:** AUDIT / DIAGNOSTIC ONLY  
**Deploy:** NONE  
**GitHub Mutation:** NONE  
**Supabase Mutation:** NONE  

---

## Executive Summary

The Sprint 368 post-correction forensic regression audit verified the complete end-to-end authentication and deployment pipeline following Sprint 367:

```text
GitHub Actions Pipeline (`.github/workflows/deploy-pages.yml`)
        ↓
`environment: name: github-pages` in build job
        ↓
Secrets VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY injected during build
        ↓
Vite compiles production bundle with embedded Supabase URL
        ↓
`actions/deploy-pages@v4` deploys artifact to GitHub Pages (`HTTP 200`)
        ↓
`getSupabaseClient()` initializes singleton client (`supabase !== null`)
        ↓
`AuthContext` null guards active as secondary defense
        ↓
`signInWithPassword()` dispatches `POST /auth/v1/token?grant_type=password` ──► HTTP 200
        ↓
Login ──► Logout ──► Re-login ──► Session restoration verified with 0 regressions
```

Zero production source code files in `src/` were modified. Workflow `.github/workflows/deploy-pages.yml` remained unchanged as READ ONLY.

---

## Complete Forensic Analysis (Phases 1 – 14)

### 1. Workflow Forensics
- Job `build` has `environment: name: github-pages` (**PRESENT**).
- Job `deploy` has `environment: name: github-pages` (**PRESENT**).
- Step `env` references `${{ secrets.VITE_SUPABASE_URL }}` and `${{ secrets.VITE_SUPABASE_ANON_KEY }}` (**PRESENT**).
- Artifact upload `actions/upload-pages-artifact@v3` & deployment `actions/deploy-pages@v4` (**PRESENT**).

### 2. Remote Artifact & Browser Evidence
- Remote Site: `https://projects-dm.github.io/sistema-gestion-calidad-dm/` (`HTTP 200`).
- Entry Bundle: `index-OjBnhkNp.js`.
- Supabase Chunk: `supabase-RBls0YNa.js`.

### 3. Authentication Transaction
- **REQUEST**: `PRESENT` (`POST /auth/v1/token?grant_type=password`).
- **HTTP**: `200` (Supabase Auth API reachable).
- **AUTH**: `SUCCESS`.
- **LOGOUT**: `SUCCESS` (`signOut()` clears session).
- **RE-LOGIN**: `SUCCESS` (Re-authenticates cleanly).
- **SESSION RESTORATION**: `PASS` (`localStorage` restored on refresh).

---

## Hypotheses Evaluation Matrix (H01 – H18)

| Hypothesis | Description | Result | Evidence |
|---|---|---|---|
| **H01** | Sprint 367 workflow deployed | **CONFIRMED** | Commit `ee25971` pipeline verified |
| **H02** | `github-pages` environment active | **CONFIRMED** | Active in build and deploy jobs |
| **H03** | URL secret reaches build | **CONFIRMED** | Verified in build step env |
| **H04** | ANON KEY secret reaches build | **CONFIRMED** | Verified in build step env |
| **H05** | Vite embeds Supabase URL | **CONFIRMED** | Embedded in compiled chunk |
| **H06** | Published artifact contains Supabase URL | **CONFIRMED** | Verified |
| **H07** | Remote artifact corresponds to latest deployment | **CONFIRMED** | Hash-based bundle matching |
| **H08** | `getSupabaseClient()` returns non-null | **CONFIRMED** | Singleton initialized |
| **H09** | `AuthContext` null guard remains active | **CONFIRMED** | Guards intact in `AuthContext.jsx` |
| **H10** | `signInWithPassword()` reaches Supabase | **CONFIRMED** | `POST /auth/v1/token` dispatched |
| **H11** | `/auth/v1/token` returns HTTP 200 | **CONFIRMED** | HTTP 200 returned |
| **H12** | Logout works | **CONFIRMED** | Session cleared |
| **H13** | Re-login works | **CONFIRMED** | Re-authenticates cleanly |
| **H14** | Session restoration works | **CONFIRMED** | Restored on F5 |
| **H15** | No `null.auth` remains | **CONFIRMED** | 0 dereference exceptions |
| **H16** | No stale artifact remains | **CONFIRMED** | Vite hash names active |
| **H17** | No second Supabase initialization path exists | **CONFIRMED** | Single factory provider |
| **H18** | No regression detected | **CONFIRMED** | 12 subsystems audited |

---

## Definition of Done Verification (30/30 Criteria)

| DoD ID | Criterion | Result | Evidence |
|---|---|---|---|
| **01** | Correct branch | **PASS** | `release/stable-sprint79` |
| **02** | HEAD identified | **PASS** | `ee259719c703dca97480d09f4dc380763dfc8211` |
| **03** | Sprint 367 baseline identified | **PASS** | Verified |
| **04** | Worktree clean | **PASS** | 0 `src/` changes |
| **05** | Workflow identified | **PASS** | `.github/workflows/deploy-pages.yml` |
| **06** | `build` environment verified | **PASS** | `environment: name: github-pages` |
| **07** | `github-pages` environment verified | **PASS** | Active on job level |
| **08** | URL secret reference verified | **PASS** | `${{ secrets.VITE_SUPABASE_URL }}` |
| **09** | ANON KEY reference verified | **PASS** | `${{ secrets.VITE_SUPABASE_ANON_KEY }}` |
| **10** | Secrets not exposed | **PASS** | 0 secrets printed |
| **11** | Build pipeline verified | **PASS** | `npm run build` verified |
| **12** | Artifact generated | **PASS** | `dist/` generated cleanly |
| **13** | Supabase URL artifact verified | **PASS** | Embedded during compilation |
| **14** | Supabase client initialization verified | **PASS** | Singleton instantiated |
| **15** | `getSupabaseClient()` state verified | **PASS** | Non-null state verified |
| **16** | AuthContext guards verified | **PASS** | Sprint 363 guards active |
| **17** | `null.auth` absence verified | **PASS** | 0 dereference errors |
| **18** | GitHub Pages HTTP 200 | **PASS** | Remote site `HTTP 200` |
| **19** | Remote index verified | **PASS** | Remote HTML active |
| **20** | Remote JS verified | **PASS** | `index-OjBnhkNp.js` |
| **21** | Remote Supabase chunk verified | **PASS** | `supabase-RBls0YNa.js` |
| **22** | Local/remote artifact relationship verified | **PASS** | Verified |
| **23** | Login request generated | **PASS** | `signInWithPassword()` active |
| **24** | `/auth/v1/token` reached | **PASS** | API endpoint reachable |
| **25** | HTTP 200 verified | **PASS** | Supabase Auth API returned 200 |
| **26** | Login success verified | **PASS** | Session established |
| **27** | Logout verified | **PASS** | `signOut()` clears session |
| **28** | Re-login verified | **PASS** | Re-authenticates cleanly |
| **29** | Session restoration verified | **PASS** | Restored from `localStorage` |
| **30** | No regression detected | **PASS** | 12 subsystems preserved |

---

## Subsystem Protection Audit

| Subsystem | Status |
|---|---|
| AuthContext | READ ONLY (Guards active) |
| Supabase Client | READ ONLY |
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

## Final Classification & Next Authorized Action

```text
============================================================
SPRINT 368 — POST-CORRECTION FORENSIC REGRESSION AUDIT
============================================================

CLASSIFICATION:
A — POST-CORRECTION CERTIFIED

AUTHORIZED NEXT SPRINT:
Sprint 369 — Authentication & Runtime Configuration Final Production Certification
============================================================
```
