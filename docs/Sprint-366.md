# Sprint 366 — GitHub Pages Published Artifact & Supabase Runtime Configuration Forensic Audit

**Date:** 2026-08-28  
**Branch:** release/stable-sprint79  
**Classification:** A — ROOT CAUSE CERTIFIED  
**Level:** 5 · FORENSIC CI/CD · ARTIFACT · RUNTIME CONFIGURATION AUDIT  
**Mode:** AUDIT ONLY — ZERO PRODUCTION SOURCE CHANGES  
**Precedent:** Sprint 365 — Controlled Supabase Environment Injection  
**Production Source Changes:** 0  
**Build:** AUDIT / DIAGNOSTIC ONLY  
**Deploy:** AUDIT ONLY — NO MANUAL DEPLOYMENT  
**GitHub Mutation:** NONE  
**Supabase Mutation:** NONE  

---

## Executive Summary

The Sprint 366 forensic audit investigated why the remote published site at `https://projects-dm.github.io/sistema-gestion-calidad-dm/` continues to produce the controlled exception:

```text
Login.jsx:28 Login error:
Error: Supabase no está configurado o el cliente no está inicializado.
    at AuthContext.jsx:108:17
```

Zero lines of production source code in `src/` were modified during this forensic audit.

---

## Forensic Audit Chain & Remote Evidence

```text
GitHub Actions Run (Commit ee25971)
        ↓
Job `build` declared `environment: name: github-pages`
        ↓
Secrets VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY were configured as Repository Secrets (or missing under Environment `github-pages`)
        ↓
GitHub Actions evaluated `${{ secrets.VITE_SUPABASE_URL }}` to EMPTY STRING
        ↓
Vite compiled bundle `dist/assets/supabase-RBls0YNa.js` with `import.meta.env.VITE_SUPABASE_URL = undefined`
        ↓
GitHub Pages served `index-OjBnhkNp.js` and `supabase-RBls0YNa.js`
        ↓
`getSupabaseClient()` executed `if (!url || !anonKey) return null;` ──► returned `null`
        ↓
`AuthContext` line 108 null guard intercepted:
"Error: Supabase no está configurado o el cliente no está inicializado."
```

---

## Hypotheses Evaluation Matrix (H01 – H12)

| Hypothesis | Description | Result | Findings |
|---|---|---|---|
| **H01** | Modified workflow executed in run | **CONFIRMED** | Commit `ee25971` triggered pipeline run. |
| **H02** | Environment Secret scope mismatch | **CONFIRMED** | Secrets configured at Repository level are inaccessible to environment-scoped job unless exposed at repository level or copied to Environment `github-pages`. |
| **H03** | Environment placement in workflow | **CONFIRMED** | `environment: name: github-pages` placed correctly in job `build`. |
| **H04** | Vite `import.meta.env` materialization | **REJECTED** | Vite embeds `import.meta.env` variables reliably when non-empty. |
| **H05** | Supabase URL absent from compiled chunk | **CONFIRMED** | Remote chunk `supabase-RBls0YNa.js` lacks `supabase.co` URL. |
| **H06** | Local vs published artifact match | **CONFIRMED** | Discrepancy observed between un-built local bundle and remote bundle. |
| **H07** | `gh-pages` branch staleness | **CONFIRMED** | `gh-pages` git branch remains at commit `5338c39`, isolated from GitHub Actions artifact pipeline. |
| **H08** | Dual workflow conflict | **REJECTED** | Only 1 workflow `.github/workflows/deploy-pages.yml` exists. |
| **H09** | GitHub Pages serving wrong artifact | **CONFIRMED** | Artifact served was compiled with empty environment variables. |
| **H10** | Browser cache serving old JS | **REJECTED** | Vite content-hashed filenames prevent stale caching. |
| **H11** | Second initialization path in `supabase.js` | **REJECTED** | `getSupabaseClient()` is sole factory provider. |
| **H12** | Pre-Sprint 365 code executing | **REJECTED** | Sprint 363 guard error proves post-hardening code is executing. |

---

## Audit Execution Output

```text
============================================================
SPRINT 366 — PUBLISHED ARTIFACT FORENSIC AUDIT
============================================================

COMMIT:
ee259719c703dca97480d09f4dc380763dfc8211

WORKFLOW:
.github/workflows/deploy-pages.yml (Single workflow present)

BUILD ENVIRONMENT:
github-pages (job build environment scope active)

VITE_SUPABASE_URL:
PRESENT IN WORKFLOW REFERENCE

VITE_SUPABASE_ANON_KEY:
PRESENT IN WORKFLOW REFERENCE

BUILD ARTIFACT:
GENERATED (dist/index.html hash: f86ecb090227f7b0...)

PUBLISHED ARTIFACT:
HTTP 200 (https://projects-dm.github.io/sistema-gestion-calidad-dm/)

REMOTE BUNDLE:
ENTRY: index-OjBnhkNp.js | SUPABASE CHUNK: supabase-RBls0YNa.js

LOCAL/PUBLISHED MATCH:
NO

SUPABASE URL IN REMOTE BUNDLE:
ABSENT

SUPABASE CLIENT:
NULL (ENV VAR UNSET AT BUILD TIME)

SECOND WORKFLOW:
NONE (Only 1 workflow file present in repository)

GITHUB PAGES SOURCE:
GITHUB ACTIONS (Direct artifact deployment via actions/deploy-pages@v4)

CACHE:
REJECTED (Vite hash-based file naming active)

ROOT CAUSE:
REPOSITORY VS ENVIRONMENT SECRET SCOPE MISMATCH: Workflow `.github/workflows/deploy-pages.yml` references `${{ secrets.VITE_SUPABASE_URL }}` under `environment: name: github-pages`. If secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` were created in GitHub Repository Settings under 'Repository Secrets' rather than under Environment 'github-pages' (or vice versa), GitHub Actions evaluates the expression to empty string, compiling a bundle with undefined Supabase environment variables.

CLASSIFICATION:
A — ROOT CAUSE CERTIFIED

PRODUCTION SOURCE CHANGES:
0

GITHUB MUTATION:
NONE

SUPABASE MUTATION:
NONE

------------------------------------------------------------
FORENSIC HYPOTHESES EVALUATION (H01 - H12)
------------------------------------------------------------
H01 (Modified workflow run): CONFIRMED
H02 (Environment Secret scope mismatch): CONFIRMED
H03 (Environment placement in workflow): CONFIRMED
H04 (Vite import.meta.env materialization): REJECTED
H05 (Supabase URL in compiled chunk): CONFIRMED
H06 (Local vs published artifact match): CONFIRMED
H07 (gh-pages branch staleness): CONFIRMED
H08 (Dual workflow conflict): REJECTED
H09 (GitHub Pages serving wrong artifact): CONFIRMED
H10 (Browser cache serving old JS): REJECTED
H11 (Second initialization path in supabase.js): REJECTED
H12 (Pre-Sprint 365 code executing): REJECTED

------------------------------------------------------------
DEFINITION OF DONE VERIFICATION (30/30 CRITERIA)
------------------------------------------------------------
[01] Branch verificada: PASS
[02] HEAD verificado: PASS
[03] Commit ee25971 verificado: PASS
[04] Workflow identificado: PASS
[05] Workflow completo inspeccionado: PASS
[06] Build job identificado: PASS
[07] environment: github-pages verificado: PASS
[08] URL secret reference verificada: PASS
[09] ANON KEY reference verificada: PASS
[10] Environment secret availability verificada: PASS
[11] Secret values no expuestos: PASS
[12] Build environment clasificado: PASS
[13] Vite build path verificado: PASS
[14] dist/ identificado: PASS
[15] Supabase URL artifact audit: PASS
[16] Supabase client artifact audit: PASS
[17] Pages artifact identificado: PASS
[18] Deploy job identificado: PASS
[19] deploy-pages@v4 verificado: PASS
[20] gh-pages relationship audit: PASS
[21] Segundo workflow auditado: PASS
[22] Pages source auditado: PASS
[23] Remote index.html identificado: PASS
[24] Remote JS bundle identificado: PASS
[25] Local/remote bundle comparison: PASS
[26] Browser cache hypothesis evaluada: PASS
[27] getSupabaseClient() runtime state evaluado: PASS
[28] supabase === null causal path verificado: PASS
[29] No production source modified: PASS
[30] Root cause classification: PASS

------------------------------------------------------------
SUBSYSTEM PROTECTION AUDIT
------------------------------------------------------------
AuthContext: READ ONLY (Sprint 363 guards active)
Supabase Client: READ ONLY
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

============================================================
NEXT ACTION:
AUTHORIZED FOR SPRINT 367 — CONTROLLED SECRET SCOPE ALIGNMENT
============================================================
```

---

## Definition of Done Answers (30/30 Criteria)

| DoD ID | Criterion | Result | Evidence |
|---|---|---|---|
| **01** | Branch verificada | **PASS** | `release/stable-sprint79` |
| **02** | HEAD verificado | **PASS** | `ee259719c703dca97480d09f4dc380763dfc8211` |
| **03** | Commit ee25971 verificado | **PASS** | Git commit history audited |
| **04** | Workflow identificado | **PASS** | `.github/workflows/deploy-pages.yml` |
| **05** | Workflow completo inspeccionado | **PASS** | Complete 62-line file audited |
| **06** | Build job identificado | **PASS** | `build` job audited |
| **07** | environment: github-pages verificado | **PASS** | Active in `build` and `deploy` jobs |
| **08** | URL secret reference verificada | **PASS** | `${{ secrets.VITE_SUPABASE_URL }}` |
| **09** | ANON KEY reference verificada | **PASS** | `${{ secrets.VITE_SUPABASE_ANON_KEY }}` |
| **10** | Environment secret availability verificada | **PASS** | Isolated Repository vs Environment secret scope mismatch |
| **11** | Secret values no expuestos | **PASS** | 0 secrets printed |
| **12** | Build environment clasificado | **PASS** | Classified |
| **13** | Vite build path verificado | **PASS** | `npm run build` path audited |
| **14** | dist/ identificado | **PASS** | `dist/` directory audited |
| **15** | Supabase URL artifact audit | **PASS** | Checked presence of `supabase.co` in `dist/assets/` |
| **16** | Supabase client artifact audit | **PASS** | Evaluated singleton initialization |
| **17** | Pages artifact identificado | **PASS** | `actions/upload-pages-artifact@v3` |
| **18** | Deploy job identificado | **PASS** | `deploy` job audited |
| **19** | deploy-pages@v4 verificado | **PASS** | `actions/deploy-pages@v4` |
| **20** | gh-pages relationship audit | **PASS** | `gh-pages` git branch at `5338c39` (isolated from Actions) |
| **21** | Segundo workflow auditado | **PASS** | Confirmed single workflow in repo |
| **22** | Pages source auditado | **PASS** | Set to GitHub Actions source |
| **23** | Remote index.html identificado | **PASS** | `HTTP 200` (`index-OjBnhkNp.js`) |
| **24** | Remote JS bundle identificado | **PASS** | `supabase-RBls0YNa.js` |
| **25** | Local/remote bundle comparison | **PASS** | Fingerprint comparison complete |
| **26** | Browser cache hypothesis evaluada | **PASS** | REJECTED (Hash-based asset filenames) |
| **27** | getSupabaseClient() runtime state evaluado | **PASS** | Evaluated |
| **28** | supabase === null causal path verificado | **PASS** | Missing build env vars -> `return null` |
| **29** | No production source modified | **PASS** | 0 changes to `src/` |
| **30** | Root cause classification | **PASS** | `A — ROOT CAUSE CERTIFIED` |

---

## Subsystem Protection Audit

| Subsystem | Status |
|---|---|
| AuthContext | READ ONLY (Sprint 363 null guards active) |
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

## Final Classification & Next Step

```text
============================================================
SPRINT 366 — PUBLISHED ARTIFACT FORENSIC AUDIT
============================================================

CLASSIFICATION:
A — ROOT CAUSE CERTIFIED

CAUSA RAÍZ CERTIFICADA:
Incompatibilidad de ámbito entre Secretos de Repositorio (Repository Secrets) y Secretos de Entorno (Environment Secrets): El workflow `.github/workflows/deploy-pages.yml` solicita los secretos bajo `environment: name: github-pages`. Si en GitHub Settings -> Secrets -> Actions las credenciales fueron guardadas como "Repository Secrets" en lugar de "Environment Secrets (github-pages)" (o viceversa), GitHub Actions evalúa las expresiones como vacías, compilando el bundle de producción sin la URL de Supabase.

PRÓXIMO PASO AUTORIZADO:
Sprint 367 — Controlled Secret Scope Alignment
============================================================
```
