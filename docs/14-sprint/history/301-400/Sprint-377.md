# Sprint 377 — Development/Staging Architecture & Production Isolation

**Date:** 2026-08-31  
**Branch:** release/stable-sprint79  
**Classification:** ARCHITECTURE HARDENING / PRODUCTION ISOLATION  
**Mode:** AUDIT + CONTROLLED ARCHITECTURE DESIGN — NO PRODUCTION FEATURE CHANGES  

---

## Executive Summary

Sprint 377 establishes the **operational safety model** for the project's next evolution phase. Following the production baseline certification (Sprint 376), this sprint defines the architecture that separates development, staging, and production — ensuring the certified production baseline (`c7d9547`) remains protected while enabling controlled feature evolution.

**No application code changes. No production mutations. Architecture definition only.**

---

## 1. Production Baseline (Certified)

| Property | Value |
|----------|-------|
| **PRODUCTION_BASELINE_COMMIT** | `c7d954707dc28ac22aece47d32c9e639d5974105` |
| **PRODUCTION_BASELINE_DATE** | 2026-08-29 |
| **PRODUCTION_BASELINE_BRANCH** | `release/stable-sprint79` |
| **STATUS** | PRODUCTION OPERATIONAL |
| **AUTHENTICATION** | CERTIFIED |
| **CI/CD** | CERTIFIED |
| **GITHUB PAGES** | GitHub Actions |
| **SUPABASE** | Operational |

**Critical Rule:** Production is now a **protected baseline** — not a development environment.

---

## 2. Target Architecture

```text
                         ┌──────────────────────┐
                         │      PRODUCTION      │
                         │                      │
                         │ GitHub Pages         │
                         │ Production Artifact  │
                         │ Production Supabase  │
                         └──────────▲───────────┘
                                    │
                              APPROVED RELEASE
                                    │
                         ┌──────────┴───────────┐
                         │       STAGING        │
                         │                      │
                         │ Release Candidate    │
                         │ Integration Tests    │
                         │ Auth Tests            │
                         │ Regression Tests      │
                         └──────────▲───────────┘
                                    │
                              DEVELOPMENT MERGE
                                    │
                         ┌──────────┴───────────┐
                         │     DEVELOPMENT      │
                         │                      │
                         │ Feature Branches     │
                         │ Localhost             │
                         │ Local Testing         │
                         │ Experimental Changes  │
                         └──────────────────────┘
```

---

## 3. Git Branch Strategy

```text
release/stable-sprint79  ──────► PRODUCTION (PROTECTED)
        │
        │
        ▼
    development  ──────► INTEGRATION / STAGING PREP
        │
        ├── feature/*   ──────► NEW FUNCTIONALITY
        │
        ├── fix/*       ──────► BUG FIXES
        │
        ├── refactor/*  ──────► CODE IMPROVEMENTS
        │
        └── chore/*     ──────► MAINTENANCE
        │
        ▼
    staging  ──────► RELEASE CANDIDATE VALIDATION
        │
        ▼
    release/stable-sprint79  ──────► PRODUCTION DEPLOYMENT
```

**Key Policy:** `release/stable-sprint79` is **conceptually protected** — no direct development work.

---

## 4. Feature Branch Policy

### Branch Creation
```bash
# Always start from certified baseline
git checkout release/stable-sprint79
git pull origin release/stable-sprint79

# Create feature branch
git checkout -b feature/alert-performance
# or
git checkout -b fix/alert-persistence
# or
git checkout -b refactor/ui-components
```

### Promotion Flow
```text
feature/* / fix/* / refactor/*
       │
       ▼
development (integration, local validation)
       │
       ▼
staging (controlled deployment, regression testing)
       │
       ▼
release/stable-sprint79 (production deployment)
```

**Never:** `feature` → `production` directly.

---

## 5. Environment Separation

### Development
```text
localhost
feature branches
local .env (development Supabase)
npm run dev
npm run build (local validation)
```

### Staging
```text
GitHub Pages Preview (or dedicated staging)
Isolated Supabase project (staging data)
Integration + regression test suite
Release Candidate validation
```

### Production
```text
GitHub Pages (projects-dm.github.io)
Production Supabase (operational data)
Approved releases ONLY
No experimental changes
```

---

## 6. Supabase Environment Strategy

| Environment | Supabase Project | Purpose |
|-------------|------------------|---------|
| **Development** | Dev project | Experimentation, local dev |
| **Staging** | Staging project | Test data, regression scenarios |
| **Production** | Production project | Operational data only |

**Migration Path:** Progressive separation — start with dev/staging split, maintain production isolation.

---

## 7. Production Secret Isolation (Critical)

| Secret | Production Location | NOT Allowed In |
|--------|---------------------|----------------|
| `VITE_SUPABASE_URL` | GitHub Environment: `github-pages` | feature branches, development, staging, docs, source code |
| `VITE_SUPABASE_ANON_KEY` | GitHub Environment: `github-pages` | feature branches, development, staging, docs, source code |

**Enforcement:** Secrets scoped exclusively to `github-pages` Environment. No leakage to any other context.

---

## 8. CI/CD Promotion Pipeline

```text
Developer
    │
    ▼
Feature Branch (PR)
    │
    ▼
CI Pipeline
    ├── npm ci
    ├── npm run build
    ├── lint
    ├── unit/integration tests
    ├── artifact validation (createClient + URL check)
    └── bundle size check
    │
    ▼
Staging Deployment
    ├── Authentication tests
    ├── Runtime smoke tests
    ├── Persistence tests
    ├── UI regression tests
    └── Smoke tests (Login → Dashboard → Logout)
    │
    ▼
Release Candidate Tag
    │
    ▼
Production Approval
    │
    ▼
Production Deployment
    ├── GitHub Actions workflow
    ├── Environment secrets resolution
    ├── Build + artifact generation
    ├── GitHub Pages deployment
    └── Production health check
```

---

## 9. Production Deployment Gate

A version is **NOT** production-ready because `npm run build` succeeds.

**Required Gate Criteria:**
```text
[ ] BUILD (npm ci + npm run build + lint)
[ ] ARTIFACT (valid Supabase client embedded)
[ ] AUTH (Login → Session → Dashboard)
[ ] RUNTIME (no console errors)
[ ] PERSISTENCE (core flows)
[ ] REGRESSION (critical paths)
[ ] STAGING (full validation passed)
[ ] PRODUCTION HEALTH (post-deploy smoke test)
```

---

## 10. Mandatory Pre-Production Checklist

### Git
- [ ] Correct branch (`release/stable-sprint79` for production)
- [ ] Working tree clean
- [ ] Commit SHA identified
- [ ] Release candidate identified

### Build
- [ ] `npm ci` passes
- [ ] `npm run build` passes
- [ ] No build errors
- [ ] Artifact generated

### Environment
- [ ] Correct environment targeted
- [ ] Correct Supabase endpoint for target
- [ ] Correct secret scope (Environment)
- [ ] No production secret leakage

### Authentication
- [ ] Login works
- [ ] Session established
- [ ] Profile loads
- [ ] Dashboard accessible
- [ ] Logout works
- [ ] Re-login works

### Functional Regression
- [ ] Navigation
- [ ] Forms
- [ ] Alerts
- [ ] Documents
- [ ] Storage
- [ ] RBAC
- [ ] Persistence

### Browser
- [ ] Desktop
- [ ] Incognito/Private
- [ ] Mobile

### Deployment
- [ ] Workflow green
- [ ] Artifact valid (createClient + URL present)
- [ ] Pages deployment successful
- [ ] Production smoke test successful

---

## 11. Rollback Strategy

**Every production deployment must have a known rollback reference.**

```
CURRENT PRODUCTION: c7d9547
        │
        ▼
If release fails:
    1. STOP
    2. DO NOT PATCH PRODUCTION DIRECTLY
    3. ROLLBACK TO LAST KNOWN GOOD
```

| Rollback Type | Reference | Method |
|---------------|-----------|--------|
| **Immediate** | gh-pages branch (stale but valid) | Switch Pages source to branch |
| **Full** | `54951b7` | `npm run deploy` from baseline |

Rollback based on **known Git commit/artifact**, not memory.

---

## 12. Release Traceability

Every production deployment must be traceable to:

```text
Sprint: XXX
Commit: <SHA>
Branch: release/stable-sprint79
Workflow Run: <GitHub Actions Run ID>
Artifact: Production build (SHA-256)
Deployment: GitHub Actions → GitHub Pages
Status: CERTIFIED / ROLLED BACK
```

---

## 13. Hardening Priorities (Next Sprints)

| Sprint | Focus | Objective |
|--------|-------|-----------|
| **378** | Branch Protection & Required CI Checks | Prevent accidental production changes |
| **379** | Staging Environment Establishment | Controlled pre-production deployment |
| **380** | Automated Artifact Validation | Verify artifact before deployment |
| **381** | Authentication Regression Suite | Automate Login→Session→Dashboard→Logout |
| **382** | Application Regression Suite | Automated critical-path testing |
| **383+** | Functional Evolution | Alert persistence, UI, performance, etc. |

---

## 14. Golden Rule

> **Production is a destination, not a development environment.**

> **No feature is production-ready because it works on localhost.**

A feature becomes production-ready **only after**:

```text
LOCAL
  ↓
CI
  ↓
STAGING
  ↓
REGRESSION
  ↓
RELEASE CANDIDATE
  ↓
APPROVAL
  ↓
PRODUCTION
```

---

## 15. Sprint 377 Success Criteria

| Control | Target | Status |
|---------|--------|--------|
| Production baseline identified | ✅ | `c7d9547` |
| Production commit identified | ✅ | Verified |
| Production branch identified | ✅ | `release/stable-sprint79` |
| Development isolated conceptually | ✅ | Documented |
| Feature branch strategy defined | ✅ | `feature/*`, `fix/*`, `refactor/*` |
| Staging architecture defined | ✅ | Defined as required promotion layer |
| Production isolation defined | ✅ | Release-only |
| Environment separation defined | ✅ | Dev/Staging/Prod |
| Production secrets isolated | ✅ | GitHub Environment scoped |
| Supabase separation defined | ✅ | Targeted for separation |
| CI/CD promotion model defined | ✅ | Documented |
| Rollback model defined | ✅ | Known-commit based |
| Release traceability defined | ✅ | Sprint + Commit + Run ID |
| **Application modifications** | **0** | ✅ |
| **Production mutations** | **0** | ✅ |
| **Supabase mutations** | **0** | ✅ |
| **Deployments** | **0** | ✅ |

---

## 16. Final Classification

```
============================================================
SPRINT 377 — DEVELOPMENT / STAGING ARCHITECTURE
                 & PRODUCTION ISOLATION
============================================================

CURRENT PRODUCTION:
c7d9547
        │
        ▼
PRODUCTION BASELINE CERTIFIED

------------------------------------------------------------

DEVELOPMENT:
Feature branches
Local environment
Local Supabase
Local build
        │
        ▼

STAGING:
Controlled deployment
Isolated environment
Integration testing
Regression testing
        │
        ▼

PRODUCTION:
Approved release only
GitHub Actions
Production Environment
Production Supabase
        │
        ▼

CERTIFIED ARTIFACT

------------------------------------------------------------

STATUS:
ARCHITECTURE HARDENING DEFINED

PRODUCTION:
PROTECTED BASELINE

BASELINE:
c7d9547

DEVELOPMENT:
ISOLATED

STAGING:
DEFINED AS REQUIRED PROMOTION LAYER

PRODUCTION:
RELEASE-ONLY

CI/CD:
PROMOTION-BASED

ROLLBACK:
KNOWN-COMMIT BASED

SECRETS:
ENVIRONMENT-SCOPED

SUPABASE:
TARGETED FOR ENVIRONMENT SEPARATION

APPLICATION CHANGES:
0

PRODUCTION CHANGES:
0

SUPABASE MUTATIONS:
0

DEPLOYMENTS:
0

RISK:
REDUCED

NEXT:
SPRINT 378 — BRANCH PROTECTION & REQUIRED CI CHECKS

============================================================
```

---

## Conclusion

Sprint 377 transforms the project from:

```text
code → deploy → hope
```

To:

```text
code
  ↓
CI
  ↓
staging
  ↓
testing
  ↓
release candidate
  ↓
approved artifact
  ↓
production
```

The certified baseline `c7d9547` remains the stable reference point. All future evolution proceeds through the defined promotion pipeline, with production receiving only validated, approved artifacts.