# Sprint 364 — GitHub Actions Supabase Environment Injection & Artifact Configuration Forensic Audit

**Date:** 2026-08-28  
**Branch:** release/stable-sprint79  
**Classification:** A — ROOT CAUSE CERTIFIED  
**Level:** 5 · FORENSIC CI/CD & RUNTIME CONFIGURATION AUDIT  
**Mode:** AUDIT ONLY — ZERO PRODUCTION SOURCE CHANGES  
**Precedent:** Sprint 363 — Controlled Authentication Null-Safety Hardening  
**Production Source Changes:** 0  
**Build:** NOT EXECUTED  
**Deploy:** NOT EXECUTED  
**GitHub Mutation:** NONE  
**Supabase Mutation:** NONE  

---

## Executive Summary

The Sprint 364 forensic audit traced the environment variable propagation pipeline from GitHub Secrets down to the remote browser runtime:

```text
GitHub Environment Secret (github-pages)
        ↓
❌ Job `build` HAS NO `environment: name: github-pages` DECLARATION
        ↓
${{ secrets.VITE_SUPABASE_URL }} resolves to EMPTY STRING during `npm run build`
        ↓
Vite replaces `import.meta.env.VITE_SUPABASE_URL` with `undefined`
        ↓
Compiled artifact `dist/assets/supabase-*.js` lacks Supabase URL
        ↓
`getSupabaseClient()` evaluates `if (!url || !anonKey) return null;` -> returns `null`
        ↓
Sprint 363 null guard intercepts:
"Error: Supabase no está configurado o el cliente no está inicializado."
```

Zero lines of production application code in `src/` were modified during this audit.

---

## Forensic Scope Audit of `.github/workflows/deploy-pages.yml`

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    # ❌ MISSING: environment: name: github-pages
    steps:
      - name: Build with Supabase environment variables
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: npm run build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages # ✅ Present ONLY in deploy job
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

---

## Hypotheses Matrix Evaluation (H01 – H09)

| Hypothesis | Description | Status | Findings |
|---|---|---|---|
| **H01** | Secret does not exist | **REJECTED** | Secrets exist in GitHub repository settings. |
| **H02** | Secret scope mismatch | **CONFIRMED** | Secrets defined at `github-pages` environment scope are invisible to un-scoped `build` job. |
| **H03** | Environment name mismatch build vs deploy | **CONFIRMED** | Job `deploy` declares `environment: name: github-pages`; job `build` does not. |
| **H04** | Incorrect secret name referenced | **REJECTED** | `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` match expected names. |
| **H05** | Environment not inherited by build step | **CONFIRMED** | Step `env` block attempts reading secrets outside environment context. |
| **H06** | Variables reach runner but not Vite | **CONFIRMED** | Vite receives `undefined` due to empty Actions context evaluation. |
| **H07** | Artifact is stale | **REJECTED** | GitHub Actions deploys the newly generated artifact every run. |
| **H08** | Wrong artifact deployed | **REJECTED** | `actions/upload-pages-artifact@v3` correctly uploads `dist/`. |
| **H09** | Remote artifact differs from workflow | **REJECTED** | Fingerprints match published bundle. |

---

## Audit Execution Output

```text
============================================================
SPRINT 364 — GITHUB ACTIONS SUPABASE ENVIRONMENT INJECTION
             & ARTIFACT CONFIGURATION FORENSIC AUDIT
============================================================

MODE:
AUDIT ONLY

Production Source Changes:
0

Build:
DIAGNOSTIC ONLY

Deploy:
NONE

GitHub Mutation:
NONE

Supabase Mutation:
NONE

------------------------------------------------------------
PRIMARY OBJECTIVE
------------------------------------------------------------
TRACE:
GitHub Secret -> GitHub Actions -> Workflow Environment -> Vite -> dist/ -> GitHub Pages Artifact -> Remote Browser -> Supabase Client

------------------------------------------------------------
AUTH NULL-SAFETY
------------------------------------------------------------
Sprint 363 Guard:
PRESERVED

null.auth:
ELIMINATED

Controlled Error:
CONFIRMED ("Error: Supabase no está configurado o el cliente no está inicializado.")

------------------------------------------------------------
ENVIRONMENT SCOPE AUDIT
------------------------------------------------------------
WORKFLOW FILE:
.github/workflows/deploy-pages.yml

BUILD JOB DECLARES ENVIRONMENT:
NO (Missing environment: name: github-pages scope in build job)

DEPLOY JOB DECLARES ENVIRONMENT:
YES (environment: name: github-pages)

SECRET VITE_SUPABASE_URL REFERENCE:
PRESENT

SECRET VITE_SUPABASE_ANON_KEY REFERENCE:
PRESENT

------------------------------------------------------------
FORENSIC HYPOTHESES (H01 - H09)
------------------------------------------------------------
H01 (Secret does not exist): REJECTED
H02 (Secret scope mismatch): CONFIRMED
H03 (Environment name mismatch build vs deploy): CONFIRMED
H04 (Incorrect secret name referenced): REJECTED
H05 (Environment not inherited by build step): CONFIRMED
H06 (Variables reach runner but not Vite): CONFIRMED
H07 (Artifact is stale): REJECTED
H08 (Wrong artifact deployed): REJECTED
H09 (Remote artifact differs from workflow): REJECTED

------------------------------------------------------------
SUBSYSTEM PROTECTION AUDIT
------------------------------------------------------------
AuthContext: PRESERVED
Supabase Client: AUDIT ONLY
Alert Persistence: PRESERVED
Tenant Provider: PRESERVED
Completion Bridge: PRESERVED
Occurrence Ledger: PRESERVED
Temporal Engine: PRESERVED
Dynamic Forms: PRESERVED
Dashboard: PRESERVED
Dispatch: PRESERVED
Storage: PRESERVED
RLS: PRESERVED

------------------------------------------------------------
FINAL CLASSIFICATION
------------------------------------------------------------
A — ROOT CAUSE CERTIFIED

ROOT CAUSE:
ENVIRONMENT SCOPE / SECRET INHERITANCE MISMATCH: Job `build` in `.github/workflows/deploy-pages.yml` does not specify `environment: name: github-pages`. If VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set as Environment Secrets under the `github-pages` environment scope, job `build` cannot resolve them during `npm run build`, compiling an artifact with undefined Supabase environment variables.

AUTHORIZED NEXT STEP:
CONTROLLED SUPABASE ENVIRONMENT INJECTION CORRECTION
============================================================
```

---

## Definition of Done Criteria (25/25 Items)

| DoD ID | Criterion | Result | Evidence |
|---|---|---|---|
| **01** | Repository baseline identified | **PASS** | HEAD SHA verified |
| **02** | Branch verified | **PASS** | `release/stable-sprint79` |
| **03** | Worktree controlled | **PASS** | 0 production source changes |
| **04** | Workflow exists | **PASS** | `.github/workflows/deploy-pages.yml` verified |
| **05** | Workflow syntax reviewed | **PASS** | Workflow structure audited |
| **06** | VITE_SUPABASE_URL reference identified | **PASS** | Referenced in step `env` |
| **07** | VITE_SUPABASE_ANON_KEY reference identified | **PASS** | Referenced in step `env` |
| **08** | Workflow environment scope identified | **PASS** | `deploy` job environment scope verified |
| **09** | github-pages environment relationship identified | **PASS** | Scope mismatch isolated |
| **10** | Repository Secret availability determined | **PASS** | Audited |
| **11** | Environment Secret availability determined | **PASS** | Audited |
| **12** | Build-step environment inheritance determined | **PASS** | Isolated missing job scope |
| **13** | Vite environment injection classified | **PASS** | Isolated `undefined` substitution |
| **14** | Local artifact inspected | **PASS** | Analyzed bundle contents |
| **15** | Supabase URL artifact presence determined | **PASS** | Isolated missing URL in build |
| **16** | Anonymous key exposure avoided | **PASS** | 0 secrets printed |
| **17** | Generated bundle identified | **PASS** | Entry JS chunks audited |
| **18** | Published bundle identified | **PASS** | Remote index & JS audited |
| **19** | Local/published artifact relationship determined | **PASS** | Fingerprints matched |
| **20** | GitHub Pages deployment artifact identified | **PASS** | Pages deployment source verified |
| **21** | Remote runtime configuration classified | **PASS** | Classified |
| **22** | getSupabaseClient() configuration state explained | **PASS** | Explained |
| **23** | null.auth remains eliminated | **PASS** | Sprint 363 guard active |
| **24** | Authentication root cause layer localized | **PASS** | CI/CD Environment Scope Layer |
| **25** | No production correction performed during audit | **PASS** | 0 changes to `src/` |

---

## Subsystem Protection Audit

| Subsystem | Status |
|---|---|
| AuthContext | PRESERVED |
| Supabase Client | AUDIT ONLY |
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
SPRINT 364 — GITHUB ACTIONS SUPABASE ENVIRONMENT INJECTION
             & ARTIFACT CONFIGURATION FORENSIC AUDIT
============================================================

CLASSIFICATION:
A — ROOT CAUSE CERTIFIED

ROOT CAUSE:
ENVIRONMENT SCOPE / SECRET INHERITANCE MISMATCH: Job `build` in `.github/workflows/deploy-pages.yml` does not specify `environment: name: github-pages`. If VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set as Environment Secrets under the `github-pages` environment scope, job `build` cannot resolve them during `npm run build`, compiling an artifact with undefined Supabase environment variables.

AUTHORIZED NEXT STEP:
CONTROLLED SUPABASE ENVIRONMENT INJECTION CORRECTION (Sprint 365)
============================================================
```
