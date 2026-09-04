# Current Architecture — Sistema de Gestión de Calidad (SGC-DM)

**Version:** 3.0 (Sprint 380 Consolidated)  
**Status:** PRODUCTION CERTIFIED (Sprint 369)  
**Branch:** `release/stable-sprint79`  
**Commit:** `cc42e3c` (Sprint 377 certification)  
**Last Updated:** 2026-09-03  

---

## Executive Summary

The SGC-DM is a **metadata-driven, runtime-executed, tenant-scoped quality management platform** deployed on GitHub Pages with Supabase as the backend. The architecture separates configuration (database) from execution (runtime engine), enabling non-technical users to create and manage 100+ operational forms without code changes.

**Production URL**: `https://projects-dm.github.io/sistema-gestion-calidad-dm/`  
**Baseline Commit**: `cc42e3c` (Sprint 377)  
**Certification**: Sprint 369 — FINAL PRODUCTION CERTIFIED

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SGC-DM ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │  DEVELOPER   │    │   STAGING    │    │  PRODUCTION  │                  │
│  │  (localhost) │    │ (preview)    │    │ (GitHub Pages)│                 │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                           │
│         ▼                   ▼                   ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     GITHUB ACTIONS PIPELINE                         │   │
│  │  release/stable-sprint79 ──► Build (npm run build) ──► Deploy      │   │
│  │  Environment: github-pages | Secrets: VITE_SUPABASE_*               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      GITHUB PAGES (CDN)                             │   │
│  │  https://projects-dm.github.io/sistema-gestion-calidad-dm/          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                        │
│                                   ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        BROWSER (SPA)                                │   │
│  │  React 19 + Vite 8 + Tailwind 4 + React Router 7                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                        │
│         ┌─────────────────────────┼─────────────────────────┐             │
│         ▼                         ▼                         ▼             │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐         │
│  │  SUPABASE   │         │  SUPABASE   │         │  SUPABASE   │         │
│  │  POSTGRESQL │         │  AUTH       │         │  STORAGE    │         │
│  │  (RLS)      │         │  (GoTrue)   │         │  (S3)       │         │
│  └─────────────┘         └─────────────┘         └─────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Architectural Pillars

### 1. Metadata-Driven Architecture (ADR-001)
- **Forms as Data**: 100+ forms defined in `sgc_forms` + `sgc_form_fields` tables
- **EAV Storage**: Responses in `sgc_form_responses` + `sgc_response_values`
- **Zero-code forms**: Quality managers create forms via admin panel

### 2. Runtime-Driven Execution (ADR-002)
- **Dynamic Rendering**: `DynamicForm.jsx` + `ComponentRegistry` interpret metadata
- **Engine Resolution**: `engine_type` selects `BaseChecklist`, `BaseMediciones`, etc.
- **Lazy Loading**: `React.lazy` engines = 65% bundle reduction

### 3. Capability-Driven Authorization (ADR-003)
- **Fine-grained capabilities**: `form:submit`, `form:verify`, `module:configure`, etc.
- **Tenant-scoped**: All capabilities implicitly scoped to user's tenant
- **Dynamic modules**: New modules declare capabilities; resolver handles rest

### 4. Supabase as Backend (ADR-004)
- **PostgreSQL + RLS**: Multi-tenant isolation at database level
- **GoTrue Auth**: JWT + email/password + session management
- **Storage**: Evidence photos, signatures, documents with RLS
- **Edge Functions**: Future transactional workflows

### 5. GitHub Actions + Pages Deployment (ADR-005)
- **Automated**: Push to `release/stable-sprint79` → deploy
- **Environment Secrets**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `github-pages` environment
- **Pages Source**: "GitHub Actions" (not branch)

### 6. Tenant-Scoped Persistence (ADR-006)
- **Hybrid Adapter**: localStorage (immediate) + Supabase (shared)
- **Tenant derivation**: Email domain (`user@domain.com` → `domain.com`)
- **Key format**: `tenant::{tenantId}::occurrence::{alertId}::{occurrenceId}`

### 7. Auth Initialization Contract (ADR-007)
- **Null guards**: `getSupabaseClient()` returns `null` if env vars missing
- **Defensive guards**: Every `supabase.auth` access guarded
- **Build-time injection**: GitHub Environment secrets → Vite build

### 8. Temporal Recurrence Model (ADR-008)
- **Anchor immutability**: `completedAt` never redefines anchor
- **Calendar-aware**: Monthly/yearly follow calendar, not fixed days
- **Local timezone**: All calculations in browser timezone

### 9. Document Storage + RLS (ADR-009)
- **Supabase Storage**: Evidence photos, signatures, PDFs
- **RLS on storage.objects**: Folder-based tenant isolation
- **Signed URLs**: Time-limited access, no public URLs

### 10. Temporal Recurrence Model (ADR-008)
- **Anchor immutability**: `completedAt` never redefines anchor
- **Calendar-aware**: Monthly/yearly follow calendar, not fixed days
- **Local timezone**: All calculations in browser timezone

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React | 19.2.5 |
| **Build** | Vite | 8.0.10 |
| **Routing** | React Router DOM | 7.14.2 |
| **Styling** | Tailwind CSS | 4.2.4 |
| **State** | Zustand | 5.0.14 |
| **Date** | date-fns | 4.1.0 |
| **PDF** | jsPDF + autotable | 4.2.1 / 5.0.7 |
| **Excel** | xlsx | 0.18.5 |
| **Backend** | Supabase | 2.105.1 |
| **Auth** | Supabase Auth (GoTrue) | Included |
| **Database** | PostgreSQL 15+ | Via Supabase |
| **Storage** | Supabase Storage (S3) | Included |
| **CI/CD** | GitHub Actions | ubuntu-latest, Node 20 |
| **Hosting** | GitHub Pages | Custom domain support |

---

## Key Invariants (Production Certified)

| Invariant | Description | Certification |
|-----------|-------------|---------------|
| **PROD-BUILD** | `npm run build` succeeds with Supabase env vars | Sprint 369 |
| **PROD-ARTIFACT** | Bundle contains valid Supabase client + URL | Sprint 369 |
| **PROD-AUTH** | Login → Session → Dashboard → Logout → Re-login | Sprint 369 |
| **PROD-NULL** | No `null.auth` dereferences | Sprint 369 |
| **PROD-DNS** | Supabase hostname resolves from browser | Sprint 369 |
| **CI-SECRETS** | GitHub Environment secrets resolve at build | Sprint 361 |
| **CI-PAGES** | GitHub Pages source = GitHub Actions | Sprint 361 |
| **TENANT-ISO** | Cross-tenant data isolation via RLS | Sprint 346-348 |
| **TEMPORAL** | Recurrence anchor immutability | Sprint 341 |
| **PERSISTENCE** | Hybrid adapter (localStorage + Supabase) | Sprint 346-348 |

---

## Current Production Baseline

| Property | Value |
|----------|-------|
| **Branch** | `release/stable-sprint79` |
| **Commit** | `cc42e3c66fe2206ae52f377ee9db83898336b484` |
| **Date** | 2026-09-03 |
| **Workflow** | `.github/workflows/deploy-pages.yml` (ee25971 corrected) |
| **Environment** | `github-pages` (build + deploy jobs) |
| **Secrets** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `github-pages` env |
| **Pages Source** | GitHub Actions |
| **Production URL** | `https://projects-dm.github.io/sistema-gestion-calidad-dm/` |

---

## Rollback Reference

| Scenario | Reference | Method |
|----------|-----------|--------|
| **Immediate** | `gh-pages` branch @ `6c8f866` (2026-07-15) | Switch Pages source to branch |
| **Full** | `54951b7` (Sprint 348 certified) | `git checkout 54951b7 && npm run deploy` |

---

## Next Evolution Targets (Sprints 381+)

| Sprint | Focus |
|--------|-------|
| 381 | Branch Protection & Required CI Checks |
| 382 | Staging Environment Establishment |
| 383 | Automated Artifact Validation |
| 384 | Authentication Regression Suite |
| 385 | Application Regression Suite |
| 386+ | Functional Evolution (Alert persistence, UI, Performance) |

---

**Document Maintained by**: Architecture Team  
**Last Updated**: 2026-09-03 (Sprint 380)  
**Next Review**: 2026-12-01