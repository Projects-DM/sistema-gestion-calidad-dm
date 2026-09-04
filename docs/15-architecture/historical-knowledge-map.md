# Historical Knowledge Map — SGC-DM Sprint Evolution

**Version:** 1.0 (Sprint 380 Consolidated)  
**Status:** KNOWLEDGE CONSOLIDATED  
**Branch:** release/stable-sprint79  
**Last Updated:** 2026-09-03  

---

## Purpose

This map provides navigable access to the architectural knowledge embedded in 380+ Sprints, organized by domain rather than chronology. It answers: **"Where was this decided/fixed/learned?"**

---

## Domain Index

### A. Runtime & Form Engine
| Topic | Key Sprints | Current Doc |
|-------|-------------|-------------|
| **Runtime Architecture** | Sprint 8, 65-67, 70, 80-99, 100+ | `docs/01-core-runtime/dynamic_runtime_engine.md` |
| **Component Registry** | Sprint 65-67, 70, 80-99 | `docs/01-core-runtime/component_registry.md` |
| **Core Architecture (EAV)** | Sprint 1-50, 65-67, 70 | `docs/01-core-runtime/core_architecture.md` |
| **Metadata-Driven Forms** | Sprint 1-50, 65-67, 70, 80-99 | ADR-001, ADR-002 |
| **Engine Registry & Lazy Loading** | Sprint 65-67, 70 | `component_registry.md`, ADR-002 |

### B. Authentication & Multi-Tenancy
| Topic | Key Sprints | Current Doc |
|-------|-------------|-------------|
| **Supabase Client & Auth** | Sprint 355-370, 362-363, 369 | ADR-004, ADR-007 |
| **Auth Null Guards** | Sprint 362 (audit), 363 (fix), 369 (cert) | ADR-007 |
| **Tenant Derivation (email domain)** | Sprint 346, 347, 348, 350-351 | ADR-006 |
| **Tenant-Scoped Persistence** | Sprint 345-348, 350-351 | ADR-006 |
| **Capability-Driven Auth** | Sprint 60-62, 65-67, 70, 100+ | ADR-003 |

### C. Temporal & Recurrence Engine
| Topic | Key Sprints | Current Doc |
|-------|-------------|-------------|
| **Recurrence Window Model** | Sprint 341 (certified), 346-348, 350 | ADR-008 |
| **Anchor Immutability** | Sprint 341, 346-348, 350 | ADR-008 |
| **Calendar-Aware Monthly/Yearly** | Sprint 341, 346-348 | ADR-008 |
| **Timezone Handling (Local)** | Sprint 341, 346-348 | ADR-008 |

### C. Persistence & Storage
| Topic | Key Sprints | Current Doc |
|-------|-------------|-------------|
| **Hybrid Persistence (localStorage + Supabase)** | Sprint 346-348, 350-351 | ADR-006 |
| **Tenant-Scoped Keys** | Sprint 346, 347, 348 | ADR-006 |
| **RLS Policies** | Sprint 344, 346-348, 369 | ADR-004, ADR-009 |
| **Document Storage (Evidencias/Firmas/Documentos)** | Sprint 70, 344, 369 | ADR-009 |
| **Supabase Storage + RLS** | Sprint 70, 344, 346-348 | ADR-009 |

### D. CI/CD & Deployment
| Topic | Key Sprints | Current Doc |
|-------|-------------|-------------|
| **GitHub Actions + Pages Deployment** | Sprint 351, 360-361, 369 | ADR-005 |
| **Environment Secrets (github-pages)** | Sprint 360, 361, 369 | ADR-005 |
| **Pages Source = GitHub Actions** | Sprint 360, 361 | ADR-005 |
| **Legacy gh-pages Branch** | Sprint 350-360 (stale 2026-07-15) | Deployment Arch |
| **Environment Secrets Scope** | Sprint 360, 361 | ADR-005 |

### E. Alert & Completion System
| Topic | Key Sprints | Current Doc |
|-------|-------------|-------------|
| **Completion Bridge** | Sprint 346, 347, 348 | ADR-006 |
| **Occurrence Ledger** | Sprint 346, 347, 348 | ADR-006 |
| **Hybrid Persistence Port** | Sprint 346, 347, 348 | ADR-006 |
| **First Completion Immediate** | Sprint 346, 348 | ADR-006 |
| **Cross-User/Cross-Browser Sync** | Sprint 346, 348, 350-351 | ADR-006 |

### F. CI/CD & Deployment Evolution
| Topic | Key Sprints | Current Doc |
|-------|-------------|-------------|
| **Legacy Deploy (gh-pages branch)** | Sprint 1-350 (stale 2026-07-15) | Deployment Arch |
| **GitHub Actions Introduction** | Sprint 351 (f355a13) | ADR-005 |
| **Missing Env Scope (build job)** | Sprint 355-360 | ADR-005 |
| **Env Scope Fix (environment: github-pages)** | Sprint 361 | ADR-005 |
| **Pages Source = GitHub Actions** | Sprint 361 | ADR-005 |
| **Final Certification** | Sprint 369 | ADR-005 |

### G. Authentication Regression Chain
| Phase | Sprints | Root Cause | Resolution |
|-------|---------|------------|------------|
| **1. ERR_NAME_NOT_RESOLVED** | 355-358 | Missing GitHub Pages secrets | Sprint 356 (configure secrets) |
| **2. Deployment Source Conflict** | 360 | Pages source = branch vs Actions | Sprint 361 (Pages = Actions) |
| **3. TypeError: null.auth** | 362 | getSupabaseClient() returns null | Sprint 363 (null guards) |
| **3. Null Guards Added** | 363 | AuthContext hardening | Sprint 363 |
| **4. Final Certification** | 369 | All 30 DoD PASS | Sprint 369 |

---

## Sprint Classification Map

### Current Architecture (Reference)
| Sprint | Domain | Status |
|--------|--------|--------|
| Sprint 369 | Final Production Certification | **CURRENT** |
| Sprint 376 | Production Baseline | **CURRENT** |
| Sprint 377 | Architecture Isolation | **CURRENT** |
| Sprint 378 | Repository Archaeology | **CURRENT** |
| Sprint 379 | Reconciliation | **CURRENT** |
| Sprint 380 | Knowledge Consolidation | **CURRENT** |

### Architectural Decisions (Extracted to ADRs)
| ADR | Source Sprints | Domain |
|-----|----------------|--------|
| ADR-001 | Sprint 1-50, 65-67, 70, 80-99 | Metadata-Driven Architecture |
| ADR-002 | Sprint 8, 65-67, 70, 80-99 | Runtime-Driven Execution |
| ADR-003 | Sprint 60-62, 65-67, 70 | Capability-Driven Authorization |
| ADR-004 | Sprint 70, 341, 346-351, 356-369 | Supabase Backend |
| ADR-005 | Sprint 351, 360-361, 369 | CI/CD Deployment |
| ADR-006 | Sprint 341, 345-348, 350-351 | Tenant-Scoped Persistence |
| ADR-007 | Sprint 355-370, 362-363, 369 | Auth Client Contract |
| ADR-008 | Sprint 341, 346-348, 350 | Temporal Recurrence |
| ADR-009 | Sprint 70, 344, 346-348, 369 | Document Storage + RLS |
| ADR-010 | Sprint 378, 379, 380 | Sprint Preservation Policy |

### Historical Evidence (Archived)
| Range | Description | Location |
|-------|-------------|----------|
| Sprint 1-50 | Early MVP, static forms, MVP | `docs/14-sprint/` + root |
| Sprint 51-99 | Runtime engine, EAV maturation | `docs/14-sprint/`, `docs/01-core-runtime/` |
| Sprint 100-199 | Capability auth, module admin | `docs/14-sprint/` |
| Sprint 200-299 | Alert system, temporal engine | `docs/14-sprint/`, `docs/13-auditoria/` |
| Sprint 300-340 | Completion, persistence, UI | `docs/14-sprint/`, `docs/13-auditoria/` |
| Sprint 341-350 | Temporal engine, tenant persistence | `docs/14-sprint/`, `docs/13-auditoria/` |
| Sprint 351-370 | CI/CD regression, auth recovery | `docs/14-sprint/`, root `Sprint-XXX.md` |
| Sprint 371-380 | Architecture hardening, knowledge consolidation | Root `Sprint-XXX.md` |

---

## Cross-Domain Dependency Map

```
                    ┌─────────────────────┐
                    │   METADATA (ADR-001) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │  RUNTIME    │  │   AUTH      │  │  TENANT     │
       │  ENGINE     │  │  (ADR-007)  │  │  (ADR-006)  │
       │  (ADR-002)  │  └──────┬──────┘  └──────┬──────┘
       └──────┬──────┘       │                │
              │              │                │
              ▼              ▼                ▼
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │  SUPABASE   │  │  CI/CD      │  │  TEMPORAL   │
       │  (ADR-004)  │  │  (ADR-005)  │  │  (ADR-008)  │
       └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                      ┌─────────────────┐
                      │   DEPLOYMENT    │
                      │    (ADR-005)    │
                      └─────────────────┘
```

---

## Knowledge Extraction Status (Sprint 380)

| Phase | Status | Artifacts Created |
|-------|--------|-------------------|
| **Directory Structure** | ✅ | `docs/15-architecture/adr/`, `docs/02-contracts/`, `docs/14-sprint/archive/` |
| **ADR Registry** | ✅ | 10 ADRs (ADR-001 through ADR-010) |
| **ADR Index** | ✅ | `docs/15-architecture/adr/adr-index.md` |
| **Contract Registry** | ✅ | `docs/02-contracts/contract-registry.md` (8 contracts) |
| **Current Architecture** | ✅ | `docs/15-architecture/current-architecture.md` |
| **Deployment Architecture** | ✅ | `docs/15-architecture/deployment-architecture.md` |
| **Historical Knowledge Map** | ✅ | This document |
| **ADR Index** | ✅ | `docs/15-architecture/adr/adr-index.md` |
| **Sprint 380 Report** | ✅ | `docs/Sprint-380.md` (this sprint) |
| **Archive Migration** | ⏳ | Move root Sprint-*.md to `docs/14-sprint/archive/` |

---

## Quick Navigation: "Where was X decided?"

| Question | Answer |
|----------|--------|
| **How are forms defined?** | ADR-001 (Metadata-Driven), `core_architecture.md` |
| **How does the runtime engine work?** | ADR-002, `dynamic_runtime_engine.md` |
| **How does auth work?** | ADR-007 (client), ADR-004 (Supabase), Sprint 362-369 |
| **How are tenants isolated?** | ADR-006, Sprint 346-348, 350-351 |
| **How does CI/CD work?** | ADR-005, Sprint 361, 369 |
| **What caused the auth regression?** | Sprint 355-370 chain (Sprint 371 bisect) |
| **How does temporal recurrence work?** | ADR-008, Sprint 341, 346-348 |
| **How are documents stored?** | ADR-009, Sprint 70, 344, 369 |
| **How to deploy?** | ADR-005, `deployment-architecture.md`, Sprint 361 |
| **How to rollback?** | `deployment-architecture.md`, Sprint 376 |

---

**Document Maintained by**: Architecture Team  
**Last Updated**: 2026-09-03 (Sprint 380)  
**Next Review**: 2026-12-01