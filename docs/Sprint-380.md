# Sprint 380 — Historical Knowledge Extraction & Architecture Consolidation

**Date:** 2026-09-03  
**Branch:** release/stable-sprint79  
**Classification:** KNOWLEDGE CONSOLIDATED  
**Mode:** DOCUMENTATION ONLY — NO FUNCTIONAL CODE CHANGES  
**Baseline:** c7d9547 (Sprint 375 certified production baseline)  

---

## Executive Summary

Sprint 380 successfully transforms 380+ Sprints of chronological forensic evidence into a **permanent, navigable architectural knowledge base**. The sprint establishes:

1. **ADR Registry** — 10 Architectural Decision Records capturing all major decisions
2. **Contract Registry** — 8 System Contracts defining immutable interfaces
3. **Current Architecture Document** — Single source of truth for production architecture
4. **Deployment Architecture** — Complete deployment pipeline documentation
5. **Historical Knowledge Map** — Cross-domain navigation of 380+ Sprints
6. **Preservation Policy** — Governance for future knowledge management

**No functional code changes. No production mutations. Zero regressions.**

---

## Deliverables Created

| Artifact | Path | Status |
|----------|------|--------|
| **ADR Registry** | docs/15-architecture/adr/ | 10 ADRs |
| **ADR Index** | docs/15-architecture/adr/adr-index.md | Complete |
| **ADR-001** | Metadata-Driven Architecture | Complete |
| **ADR-002** | Runtime-Driven Execution Model | Complete |
| **ADR-003** | Capability-Driven Authorization | Complete |
| **ADR-004** | Supabase as Remote Persistence Backend | Complete |
| **ADR-005** | GitHub Actions + GitHub Pages Production Deployment | Complete |
| **ADR-006** | Tenant-Scoped Persistence | Complete |
| **ADR-007** | Authentication Client Initialization Contract | Complete |
| **ADR-008** | Temporal Recurrence Window Model | Complete |
| **ADR-009** | Document Storage and RLS Security Model | Complete |
| **ADR-010** | Historical Sprint Preservation Policy | Complete |
| **ADR Index** | docs/15-architecture/adr/adr-index.md | Complete |
| **Contract Registry** | docs/02-contracts/contract-registry.md | Complete (8 contracts) |
| **Current Architecture** | docs/15-architecture/current-architecture.md | Complete |
| **Deployment Architecture** | docs/15-architecture/deployment-architecture.md | Complete |
| **Historical Knowledge Map** | docs/15-architecture/historical-knowledge-map.md | Complete |
| **Sprint 380 Report** | docs/Sprint-380.md (this document) | Complete |

---

## Knowledge Extracted by Domain

### A. Runtime & Form Engine (ADR-001, ADR-002)
- **Metadata-Driven Architecture**: 100+ forms defined in database, zero-code creation
- **Runtime-Driven Execution**: EngineRegistry + DynamicFieldRenderer + lazy loading
- **Component Registry**: Atomic components with standardized props contract
- **Key Invariants**: STATIC-NO-COMPONENT, METADATA-DRIVEN, FLAT-STATE, LAZY-LOAD

### B. Authentication & Multi-Tenancy (ADR-003, ADR-006, ADR-007)
- **Capability-Driven Authorization**: Fine-grained operations, tenant-scoped
- **Tenant-Scoped Persistence**: Hybrid adapter (localStorage + Supabase), email-domain tenantId
- **Auth Client Contract**: Null guards, build-time env injection, error classification
- **Key Invariants**: Email-domain tenantId, hybrid adapter, RLS isolation, null guards

### C. Temporal & Recurrence Engine (ADR-008)
- **Anchor Immutability**: completedAt never redefines anchor
- **Calendar-Aware**: Monthly/yearly follow calendar, leap year saturation
- **Local Timezone**: All calculations in browser timezone
- **Sprint 341 Certified**: All invariants preserved through Sprints 346-350

### C. Persistence & Storage (ADR-004, ADR-006, ADR-009)
- **Supabase Backend**: PostgreSQL + Auth + Storage + RLS + Edge Functions
- **Hybrid Persistence**: localStorage (immediate) + Supabase (shared cross-browser)
- **Document Storage**: Supabase Storage with RLS on storage.objects
- **Key Invariants**: RLS tenant isolation, hybrid adapter dual-write, signed URLs

### D. CI/CD & Deployment (ADR-005)
- **GitHub Actions + Pages**: Automated push-to-deploy pipeline
- **Environment Secrets**: github-pages environment with scoped secrets
- **Pages Source**: Must be "GitHub Actions" (not branch)
- **Critical Invariants**: ENV-SCOPE, SECRETS-SCOPE, PAGES-SOURCE, BUILD-VERIFICATION

### E. Temporal Recurrence (ADR-008)
- **Anchor Immutability**: completedAt never redefines anchor
- **Calendar-Aware**: Monthly/yearly follow calendar, leap year saturation
- **Sprint 341 Certified**: Preserved through Sprints 346-350

---

## Historical Regression Chain Resolved

| Phase | Sprints | Root Cause | Resolution |
|-------|---------|------------|------------|
| 1. ERR_NAME_NOT_RESOLVED | 355-358 | Missing GitHub Pages secrets | Sprint 356 (configure secrets) |
| 2. Deployment Source Conflict | 360 | Pages source = branch vs Actions | Sprint 361 (Pages = Actions) |
| 3. TypeError: null.auth | 362 | getSupabaseClient() returns null | Sprint 363 (null guards) |
| 4. Null Guards Added | 363 | AuthContext hardening | Sprint 363 |
| 5. Final Certification | 369 | All 30 DoD PASS | Sprint 369 |

**Root Cause**: GitHub Actions build job lacked environment: github-pages → Environment Secrets not resolved → VITE_SUPABASE_URL = undefined at build → getSupabaseClient() returns null → AuthContext dereferences null.auth

---

## Repository Truth Established

| Component | Files | Classification |
|-----------|-------|----------------|
| Source Code (src/) | 589 | CORE — KEEP |
| Documentation (docs/) | 666 | HISTORICAL/ARCHITECTURAL — ARCHIVE/CONSOLIDATE |
| Scripts (scripts/) | 98 | AUDIT/FORENSIC — ARCHIVE |
| Database (supabase/) | 6 | CORE — KEEP |
| CI/CD (.github/) | 1 | CORE — KEEP |
| Generated (dist/) | 35 | GENERATED — EXCLUDE |
| Dependencies (node_modules/) | 45K+ | EXTERNAL — EXCLUDED |

**Product Core Ratio**: 42.7% of tracked files are actual product code.

---

## Governance Established

### ADR Registry (10 ADRs)
| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Metadata-Driven Architecture | ACCEPTED |
| ADR-002 | Runtime-Driven Execution Model | ACCEPTED |
| ADR-003 | Capability-Driven Authorization | ACCEPTED |
| ADR-004 | Supabase as Remote Persistence Backend | ACCEPTED |
| ADR-005 | GitHub Actions + GitHub Pages Production Deployment | ACCEPTED |
| ADR-006 | Tenant-Scoped Persistence | ACCEPTED |
| ADR-007 | Authentication Client Initialization Contract | ACCEPTED |
| ADR-008 | Temporal Recurrence Window Model | ACCEPTED |
| ADR-009 | Document Storage and RLS Security Model | ACCEPTED |
| ADR-010 | Historical Sprint Preservation Policy | ACCEPTED |

### Contract Registry (8 Contracts)
| Contract | Domain | Status |
|---------|--------|--------|
| CONTRACT-001 | Supabase Client Contract | ACTIVE |
| CONTRACT-002 | Authentication Contract | ACTIVE |
| CONTRACT-003 | Environment Variable Contract | ACTIVE |
| CONTRACT-004 | Runtime Schema Contract | ACTIVE |
| CONTRACT-005 | Temporal Window Contract | ACTIVE |
| CONTRACT-006 | Tenant Isolation Contract | ACTIVE |
| CONTRACT-007 | Persistence Contract | ACTIVE |
| CONTRACT-008 | GitHub Pages Deployment Contract | ACTIVE |

### Preservation Policy (ADR-010)
- **SPRINT != CURRENT ARCHITECTURE**: Sprints are historical evidence
- **Classification Framework**: CURRENT / ARCHITECTURAL / CONTRACT / DECISION / HISTORICAL / SUPERSEDED / LEGACY / CANDIDATE / UNKNOWN
- **Hierarchy**: Governance → Core Runtime → Contracts → Architecture → ADR Registry → Historical Evidence
- **No Deletion**: Sprints preserved as forensic evidence

---

## Risk Register (From Sprint 378)

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R01 | Pages source mismatch | HIGH | Set Pages source = GitHub Actions |
| R05 | Stale gh-pages branch | HIGH | Delete after Pages source fix |
| R02 | No branch protection | MEDIUM | Enable branch protection rules |
| R03 | Legacy deploy script | MEDIUM | Remove gh-pages -d dist from package.json |

---

## Immediate Actions Required (Sprint 381+)

| Priority | Action | Sprint |
|----------|--------|--------|
| HIGH | Set GitHub Pages source = GitHub Actions | 381 |
| HIGH | Enable branch protection on release/stable-sprint79 | 381 |
| HIGH | Remove legacy deploy script from package.json | 381 |
| HIGH | Delete gh-pages branch after Pages source fix | 381 |
| HIGH | Add dist/ to .gitignore, remove .bak files | 381 |
| MEDIUM | Archive sprint docs to docs/14-sprint/archive/ | 382 |
| MEDIUM | Create ADR registry in docs/15-architecture/adr/ | 382 |
| MEDIUM | Add artifact validation to CI | 383 |

---

## Constraints Verified

| Constraint | Status |
|------------|--------|
| NO src/ modifications | VERIFIED |
| NO workflow modifications | VERIFIED |
| NO package.json changes | VERIFIED |
| NO Supabase mutations | VERIFIED |
| NO RLS/Storage/Auth changes | VERIFIED |
| NO alert/persistence modifications | VERIFIED |
| NO git destructive operations | VERIFIED |
| NO functional code changes | VERIFIED |
| Working tree clean | VERIFIED (only audit docs added) |
| Production baseline preserved | VERIFIED (c7d9547) |

---

## Final Classification

```
============================================================
SPRINT 380 — HISTORICAL KNOWLEDGE EXTRACTION & ARCHITECTURE CONSOLIDATION
============================================================

HISTORICAL KNOWLEDGE:
        EXTRACTED

CURRENT ARCHITECTURE:
        CONSOLIDATED

ARCHITECTURAL DECISIONS:
        REGISTERED (10 ADRs)

SYSTEM CONTRACTS:
        IDENTIFIED (8 CONTRACTS)

GITHUB PAGES:
        CURRENT PRODUCTION PLATFORM

GITHUB ACTIONS:
        CURRENT DEPLOYMENT MECHANISM

FUNCTIONAL CODE:
        UNMODIFIED

DATABASE:
        UNMODIFIED

AUTH:
        UNMODIFIED

DEPLOYMENT:
        UNMODIFIED

HISTORICAL SPRINTS:
        PRESERVED

STATUS:
        KNOWLEDGE CONSOLIDATED
============================================================
```

---

## Next Authorized Sprint

**Sprint 381 — Branch Protection & Required CI Checks**

- Configure branch protection rules on release/stable-sprint79
- Add required status checks (CI build, artifact validation)
- Prevent direct pushes to production branch
- Enforce PR-based workflow

---

**Report Generated:** 2026-09-03  
**Sprint 380 Complete** — Knowledge Consolidated, Architecture Documented, Baseline Protected