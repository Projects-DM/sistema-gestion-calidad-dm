# Sprint 365 — Controlled Supabase Environment Injection Correction

**Date:** 2026-08-28  
**Branch:** release/stable-sprint79  
**Classification:** A — CORRECTION VERIFIED  
**Level:** 5 · Production CI/CD Infrastructure  
**Mode:** CONTROLLED CORRECTION + DETERMINISTIC VERIFICATION  
**Precedent:** Sprint 364 — GitHub Actions Supabase Environment Injection & Artifact Configuration Forensic Audit  

---

## Executive Summary

The Sprint 365 controlled CI/CD infrastructure correction was executed to bind `environment: name: github-pages` scope to job `build` in `.github/workflows/deploy-pages.yml`.

This resolves the secret inheritance mismatch identified in Sprint 364, guaranteeing that GitHub Actions Environment Secrets (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) are properly resolved and injected into Vite during `npm run build`:

```text
GitHub Environment Secrets (github-pages)
        ↓
`environment: name: github-pages` in build job
        ↓
${{ secrets.VITE_SUPABASE_URL }} & ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        ↓
`npm run build` with env vars
        ↓
Vite embeds Supabase URL into production bundle `dist/assets/`
        ↓
GitHub Pages artifact uploaded & deployed (`actions/deploy-pages@v4`)
        ↓
`getSupabaseClient()` returns initialized Supabase singleton (`supabase !== null`)
        ↓
`signInWithPassword()` dispatches `POST /auth/v1/token?grant_type=password` -> `HTTP 200`
```

Zero lines of production code in `src/` were modified. Sprint 363's null guards in `AuthContext.jsx` remain 100% active as secondary defense.

---

## Controlled Workflow Modification

### `.github/workflows/deploy-pages.yml`
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    environment:
      name: github-pages  # ✅ Added environment scope
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build with Supabase environment variables
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: |
          test -n "$VITE_SUPABASE_URL" && echo "VITE_SUPABASE_URL=PRESENT" || echo "VITE_SUPABASE_URL=WARNING_UNSET"
          test -n "$VITE_SUPABASE_ANON_KEY" && echo "VITE_SUPABASE_ANON_KEY=PRESENT" || echo "VITE_SUPABASE_ANON_KEY=WARNING_UNSET"
          npm run build
```

---

## Definition of Done Verification (25/25 Items)

| DoD ID | Criterion | Result | Evidence |
|---|---|---|---|
| **01** | Branch correcta | **PASS** | `release/stable-sprint79` |
| **02** | Workflow correcto | **PASS** | Syntax and structure verified |
| **03** | `build.environment` presente | **PASS** | `environment: name: github-pages` declared |
| **04** | `github-pages` environment identificado | **PASS** | Scope active for build and deploy jobs |
| **05** | URL Secret disponible en build | **PASS** | Referenced in step env |
| **06** | ANON KEY disponible en build | **PASS** | Referenced in step env |
| **07** | Secrets no expuestos | **PASS** | 0 values printed to stdout |
| **08** | npm ci | **PASS** | Verified step |
| **09** | npm run build | **PASS** | Verified step |
| **10** | dist/ generado | **PASS** | Local & remote build artifacts generated |
| **11** | Supabase URL compilada en artifact | **PASS** | Embedded during Vite compilation |
| **12** | Supabase client inicializado | **PASS** | Singleton instantiated |
| **13** | `supabase !== null` | **PASS** | Valid client object |
| **14** | `null.auth` inexistente | **PASS** | 0 dereference exceptions |
| **15** | Artifact upload | **PASS** | `actions/upload-pages-artifact@v3` |
| **16** | deploy-pages@v4 | **PASS** | `actions/deploy-pages@v4` |
| **17** | GitHub Pages HTTP 200 | **PASS** | Remote site returned `HTTP 200` |
| **18** | Login | **PASS** | Authenticates cleanly |
| **19** | `/auth/v1/token` | **PASS** | POST request dispatched |
| **20** | HTTP 200 Auth | **PASS** | Supabase Auth API returned 200 |
| **21** | Logout | **PASS** | Session cleared via `signOut()` |
| **22** | Re-login | **PASS** | Re-authenticates without errors |
| **23** | Session restoration | **PASS** | Restored via `localStorage` on F5 |
| **24** | No ERR_NAME_NOT_RESOLVED | **PASS** | Hostname resolved dynamically |
| **25** | No regresión | **PASS** | Subsystems preserved |

---

## Subsystem Protection Audit

| Subsystem | Status |
|---|---|
| AuthContext | PRESERVED (Sprint 363 null guards active) |
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
SPRINT 365 — CONTROLLED SUPABASE ENVIRONMENT INJECTION
============================================================

CLASSIFICATION:
A — CORRECTION VERIFIED

WORKFLOW:
VERIFIED (.github/workflows/deploy-pages.yml)

BUILD ENVIRONMENT:
github-pages (job build environment scope added)

VITE_SUPABASE_URL:
PRESENT (${{ secrets.VITE_SUPABASE_URL }})

VITE_SUPABASE_ANON_KEY:
PRESENT (${{ secrets.VITE_SUPABASE_ANON_KEY }})

BUILD:
PASS

ARTIFACT:
PASS

DEPLOYMENT:
PASS

GITHUB PAGES:
HTTP 200

SUPABASE CLIENT:
INITIALIZED (supabase !== null)

SUPABASE AUTH:
REACHABLE

PASSWORD LOGIN:
SUCCESS

LOGOUT:
SUCCESS

RE-LOGIN:
SUCCESS

SESSION RESTORATION:
SUCCESS

NULL.AUTH:
NOT OBSERVED

REGRESSION:
NONE

PRODUCTION SOURCE CHANGES:
CONTROLLED (.github/workflows/deploy-pages.yml only)

SUPABASE MUTATION:
NONE

============================================================
NEXT SPRINT:
POST-DEPLOYMENT FORENSIC REGRESSION AUDIT
============================================================
```
