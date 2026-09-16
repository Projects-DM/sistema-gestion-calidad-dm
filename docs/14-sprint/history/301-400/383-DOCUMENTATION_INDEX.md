# Documentation Index â€” Sistema de GestiÃ³n de Calidad (SGC-DM)

**Version:** 1.0 (Sprint 383)  
**Classification:** DOCUMENTATION INDEX â€” NAVIGATION GUIDE  
**Branch:** `release/stable-sprint79`  
**Baseline:** `c7d9547`

---

## 1. Quick Navigation

| Category | Document | Purpose | Audience |
|----------|----------|---------|----------|
| **Entry Point** | [README.md](../README.md) | Project overview, quick start, tech stack | All |
| **Architecture** | [Architecture Overview](ARCHITECTURE_OVERVIEW.md) | System architecture, layers, data flows, invariants | Architects, Engineers |
| **Architecture** | [Current Architecture](15-architecture/current-architecture.md) | Current production architecture | Architects, Engineers |
| **Architecture** | [Deployment Architecture](deployment-architecture.md) | Deployment pipeline, GitHub Actions, GitHub Pages | DevOps, Engineers |
| **Architecture** | [Historical Knowledge Map](historical-knowledge-map.md) | Sprint-to-domain knowledge map | Architects, Historians |
| **Architecture** | [Security Overview](SECURITY_OVERVIEW.md) | Security model, auth, authZ, RLS, storage | Security, Engineers |
| **Architecture** | [Deployment Overview](DEPLOYMENT_OVERVIEW.md) | Deployment pipeline, GitHub Actions, GitHub Pages | DevOps, Engineers |
| **Features** | [Feature Overview](FEATURE_OVERVIEW.md) | All functional capabilities by domain | Product, Engineers |
| **Architecture** | [Project Status](PROJECT_STATUS.md) | Current status, baseline, certifications, gaps | All Stakeholders |
| **Governance** | [Professional Roadmap](PROFESSIONAL_ROADMAP.md) | Strategic roadmap, phases, milestones | Leadership, Engineers |
| **Governance** | [Sprint 382 Report](Sprint-382.md) | Repository governance audit | Governance, Engineers |
| **Governance** | [Sprint 381R Report](Sprint-381R.md) | Architecture certification refinement | Auditors, Architects |
| **Governance** | [Sprint 381 Report](Sprint-381.md) | Architecture certification | Auditors, Architects |
| **Governance** | [Sprint 380 Report](Sprint-380.md) | Historical knowledge extraction | Historians, Architects |
| **Governance** | [Sprint 376 Report](Sprint-376.md) | Production baseline certification | Auditors, Leadership |
| **Contracts** | [Contract Registry](../02-contracts/contract-registry.md) | 8 System Contracts | Architects, Engineers |
| **Contracts** | [CONTRACT-001](../02-contracts/CONTRACT-001-supabase-client-contract.md) | Supabase Client Contract | Engineers |
| **Contracts** | [CONTRACT-002](../02-contracts/CONTRACT-002-authentication-contract.md) | Authentication Contract | Engineers |
| **Contracts** | [CONTRACT-003](../02-contracts/CONTRACT-003-environment-variable-contract.md) | Environment Variable Contract | DevOps, Engineers |
| **Contracts** | [CONTRACT-004](../02-contracts/CONTRACT-004-runtime-schema-contract.md) | Runtime Schema Contract | Engineers |
| **Contracts** | [CONTRACT-005](../02-contracts/CONTRACT-005-temporal-window-contract.md) | Temporal Window Contract | Engineers |
| **Contracts** | [CONTRACT-006](../02-contracts/CONTRACT-006-tenant-isolation-contract.md) | Tenant Isolation Contract | Security, Engineers |
| **Contracts** | [CONTRACT-007](../02-contracts/CONTRACT-007-persistence-contract.md) | Persistence Contract | Engineers |
| **Contracts** | [CONTRACT-008](../02-contracts/CONTRACT-008-github-pages-deployment-contract.md) | GitHub Pages Deployment Contract | DevOps, Engineers |
| **ADRs** | [ADR Index](15-architecture/adr/adr-index.md) | ADR Registry (10 ADRs) | Architects, Engineers |
| **ADRs** | [ADR-001](15-architecture/adr/ADR-001-metadata-driven-architecture.md) | Metadata-Driven Architecture | Architects |
| **ADRs** | [ADR-002](15-architecture/adr/ADR-002-runtime-driven-execution-model.md) | Runtime-Driven Execution Model | Architects |
| **ADRs** | [ADR-003](15-architecture/adr/ADR-003-capability-driven-authorization.md) | Capability-Driven Authorization | Architects |
| **ADRs** | [ADR-004](15-architecture/adr/ADR-004-supabase-remote-persistence-backend.md) | Supabase as Backend | Architects |
| **ADRs** | [ADR-005](15-architecture/adr/ADR-005-github-actions-github-pages-deployment.md) | GitHub Actions + Pages Deployment | Architects, DevOps |
| **ADRs** | [ADR-006](15-architecture/adr/ADR-006-tenant-scoped-persistence.md) | Tenant-Scoped Persistence | Architects |
| **ADRs** | [ADR-007](15-architecture/adr/ADR-007-authentication-client-initialization-contract.md) | Auth Client Initialization | Architects |
| **ADRs** | [ADR-008](15-architecture/adr/ADR-008-temporal-recurrence-window-model.md) | Temporal Recurrence Model | Architects |
| **ADRs** | [ADR-009](15-architecture/adr/ADR-009-document-storage-rls-security-model.md) | Document Storage + RLS | Architects |
| **ADRs** | [ADR-010](15-architecture/adr/ADR-010-historical-sprint-preservation-policy.md) | Sprint Preservation Policy | Governance |
| **Sprints** | [Sprint 383](Sprint-383.md) | Professional Presentation Sprint | All |
| **Sprints** | [Sprint 382](14-sprint/history/301-400/Sprint-382.md) | Repository Governance Audit | All |
| **Sprints** | [Sprint 381R](14-sprint/history/301-400/Sprint-381R.md) | Architecture Certification Refinement | All |
| **Sprints** | [Sprint 381](14-sprint/history/301-400/Sprint-381.md) | Architecture Certification | All |
| **Sprints** | [Sprint 380](14-sprint/history/301-400/Sprint-380.md) | Historical Knowledge Extraction | All |
| **Sprints** | [Sprint 376](14-sprint/history/301-400/Sprint-376.md) | Production Baseline | All |
| **Sprints** | [Sprint 377](14-sprint/history/301-400/Sprint-377.md) | Architecture Isolation | All |
| **Sprints** | [Sprint 378](14-sprint/history/301-400/Sprint-378.md) | Repository Archaeology | All |
| **Sprints** | [Sprint 381](14-sprint/history/301-400/Sprint-381.md) | Architecture Certification | All |
| **Sprints** | [Sprint 381R](14-sprint/history/301-400/Sprint-381R.md) | Architecture Certification Refinement | All |
| **Sprints** | [Sprint 380](14-sprint/history/301-400/Sprint-380.md) | Historical Knowledge Extraction | All |
| **Sprints** | [Sprint 376](14-sprint/history/301-400/Sprint-376.md) | Production Baseline | All |
| **Sprints** | [Sprint 377](14-sprint/history/301-400/Sprint-377.md) | Architecture Isolation | All |
| **Sprints** | [Sprint 378](14-sprint/history/301-400/Sprint-378.md) | Repository Archaeology | All |
| **Sprints** | [Sprint 381](14-sprint/history/301-400/Sprint-381.md) | Architecture Certification | All |
| **Sprints** | [Sprint 381R](14-sprint/history/301-400/Sprint-381R.md) | Architecture Certification Refinement | All |
| **Sprints** | [Sprint 380](14-sprint/history/301-400/Sprint-380.md) | Historical Knowledge Extraction | All |
| **Sprints** | [Sprint 376](14-sprint/history/301-400/Sprint-376.md) | Production Baseline | All |
| **Sprints** | [Sprint 377](14-sprint/history/301-400/Sprint-377.md) | Architecture Isolation | All |
| **Sprints** | [Sprint 378](14-sprint/history/301-400/Sprint-378.md) | Repository Archaeology | All |
| **Sprints** | [Sprint 381](14-sprint/history/301-400/Sprint-381.md) | Architecture Certification | All |
| **Sprints** | [Sprint 381R](14-sprint/history/301-400/Sprint-381R.md) | Architecture Certification Refinement | All |
| **Sprints** | [Sprint 380](14-sprint/history/301-400/Sprint-380.md) | Historical Knowledge Extraction | All |
| **Sprints** | [Sprint 376](14-sprint/history/301-400/Sprint-376.md) | Production Baseline | All |
| **Sprints** | [Sprint 377](14-sprint/history/301-400/Sprint-377.md) | Architecture Isolation | All |
| **Sprints** | [Sprint 378](14-sprint/history/301-400/Sprint-378.md) | Repository Archaeology | All |

---

## 2. Quick Start Paths

### For New Developers
```
README.md
    â†“
Architecture Overview â†’ ARCHITECTURE_OVERVIEW.md
    â†“
Feature Overview â†’ FEATURE_OVERVIEW.md
    â†“
Security Overview â†’ SECURITY_OVERVIEW.md
    â†“
Deployment Overview â†’ DEPLOYMENT_OVERVIEW.md
```

### For Architects
```
ADR Index â†’ 15-architecture/adr/adr-index.md
    â†“
ADR-001 through ADR-010
    â†“
Current Architecture â†’ 15-architecture/current-architecture.md
    â†“
Architecture Overview â†’ ARCHITECTURE_OVERVIEW.md
    â†“
Contract Registry â†’ ../02-contracts/contract-registry.md
```

### For DevOps / Deployment Engineers
```
Deployment Overview â†’ DEPLOYMENT_OVERVIEW.md
    â†“
README.md (Deployment section)
    â†“
Architecture Overview â†’ ARCHITECTURE_OVERVIEW.md (Deployment section)
    â†“
Sprint 361 Report (Correction) â†’ Sprint-361.md
```

### For Security Engineers
```
Security Overview â†’ SECURITY_OVERVIEW.md
    â†“
ADR-007 (Auth Contract) â†’ 15-architecture/adr/ADR-007-authentication-client-initialization-contract.md
    â†“
ADR-006 (Tenant Persistence) â†’ 15-architecture/adr/ADR-006-tenant-scoped-persistence.md
    â†“
ADR-009 (Document Storage + RLS) â†’ 15-architecture/adr/ADR-009-document-storage-rls-security-model.md
```

### For QA / Test Engineers
```
Project Status â†’ PROJECT_STATUS.md (Known Gaps section)
    â†“
Feature Overview â†’ FEATURE_OVERVIEW.md (Gaps section)
    â†“
Professional Roadmap â†’ PROFESSIONAL_ROADMAP.md (Testing phases)
```

### For Product Managers
```
README.md (Overview)
    â†“
Feature Overview â†’ FEATURE_OVERVIEW.md
    â†“
Project Status â†’ PROJECT_STATUS.md (Roadmap section)
    â†“
Professional Roadmap â†’ PROFESSIONAL_ROADMAP.md
```

### For Security Auditors
```
Security Overview â†’ SECURITY_OVERVIEW.md
    â†“
ADR-007 (Auth) + ADR-006 (Tenant) + ADR-009 (Storage)
    â†“
Sprint 369 Report (Final Certification)
    â†“
Sprint 362/363 Reports (Null State Audit + Hardening)
```

### For New Team Members (Onboarding Path)
```
Week 1: README.md + Architecture Overview + Project Status
Week 2: Feature Overview + Security Overview + Deployment Overview
Week 3: ADR-001 through ADR-010 + Contract Registry
Week 4: Sprint 381R + Sprint 382 + Sprint 383 (this sprint)
```

---

## 2. Document Metadata

| Document | Lines | Last Updated | Sprint |
|----------|-------|--------------|--------|
| README.md | 200+ | 2026-09-04 | 383 |
| ARCHITECTURE_OVERVIEW.md | 400+ | 2026-09-04 | 383 |
| PROJECT_STATUS.md | 200+ | 2026-09-04 | 383 |
| FEATURE_OVERVIEW.md | 400+ | 2026-09-04 | 383 |
| SECURITY_OVERVIEW.md | 350+ | 2026-09-04 | 383 |
| DEPLOYMENT_OVERVIEW.md | 250+ | 2026-09-04 | 383 |
| INTERVIEW_TALKING_POINTS.md | 400+ | 2026-09-04 | 383 |
| PROFESSIONAL_ROADMAP.md | 300+ | 2026-09-04 | 383 |
| ARCHITECTURE_OVERVIEW.md | 400+ | 2026-09-03 | 381R |
| CURRENT_ARCHITECTURE.md | 250+ | 2026-09-03 | 381R |
| DEPLOYMENT_ARCHITECTURE.md | 250+ | 2026-09-03 | 382 |
| HISTORICAL_KNOWLEDGE_MAP.md | 350+ | 2026-09-03 | 382 |
| ADR-INDEX | 100+ | 2026-09-03 | 380 |
| CONTRACT-REGISTRY | 480+ | 2026-09-03 | 380 |

---

## 3. Cross-Reference Matrix

| Document | References | Referenced By |
|----------|------------|---------------|
| README.md | All | â€” |
| ARCHITECTURE_OVERVIEW.md | All ADRs, Contracts | README.md, PROJECT_STATUS.md |
| PROJECT_STATUS.md | All sprints, certifications | README.md |
| FEATURE_OVERVIEW.md | Architecture, Contracts, ADRs | README.md, PROJECT_STATUS.md |
| SECURITY_OVERVIEW.md | ADR-004, 006, 007, 009 | ARCHITECTURE_OVERVIEW.md, README.md |
| DEPLOYMENT_OVERVIEW.md | ADR-005, Sprint 361, 369 | README.md, ARCHITECTURE_OVERVIEW.md |
| ADR Index | All ADRs | ARCHITECTURE_OVERVIEW.md |
| CONTRACT REGISTRY | All Contracts | ARCHITECTURE_OVERVIEW.md, SECURITY_OVERVIEW.md |
| Sprint Reports | ADRs, Contracts | PROJECT_STATUS.md |

---

## 4. Search Keywords Index

| Keyword | Primary Document |
|---------|------------------|
| authentication | SECURITY_OVERVIEW.md, ADR-007, CONTRACT-002 |
| authorization | SECURITY_OVERVIEW.md, ADR-003, CONTRACT-002 |
| tenant | SECURITY_OVERVIEW.md, ADR-006, CONTRACT-006 |
| deployment | DEPLOYMENT_OVERVIEW.md, ADR-005 |
| architecture | ARCHITECTURE_OVERVIEW.md, current-architecture.md |
| deploy | DEPLOYMENT_OVERVIEW.md, ADR-005 |
| testing | PROJECT_STATUS.md, PROFESSIONAL_ROADMAP.md |
| roadmap | PROFESSIONAL_ROADMAP.md |
| interview | INTERVIEW_TALKING_POINTS.md |
| baseline | PROJECT_STATUS.md, Sprint-376.md |
| certification | Sprint-369.md, Sprint-376.md, Sprint-381.md |
| regression | Sprint-371.md, Sprint-372.2.md |
| forensic | Sprint-370.md, Sprint-371.md, Sprint-372.2.md |
| governance | Sprint-382.md, Sprint-382.2.md |
| roadmap | PROFESSIONAL_ROADMAP.md |
| interview | INTERVIEW_TALKING_POINTS.md |
| status | PROJECT_STATUS.md |
| baseline | PROJECT_STATUS.md, Sprint-376.md |
| evidence | Sprint-370.md, Sprint-371.md, Sprint-372.2.md |
| regression | Sprint-371.md, Sprint-372.2.md |
| audit | Sprint-370.md, Sprint-371.md, Sprint-372.2.md, Sprint-378.md, Sprint-382.md |

---

## 6. Document Standards

| Standard | Requirement |
|----------|-------------|
| Format | Markdown (.md) |
| Encoding | UTF-8 |
| Line Endings | LF |
| Headers | ATX style (# ## ###) |
| Code Blocks | Fenced with language hint |
| Links | Relative paths (./ ../) |
| Images | In docs/assets/ or external URLs |
| Tables | GitHub-flavored markdown |
| Metadata Header | Required (Version, Date, Classification, Branch, Baseline) |

---

*Generated as part of Sprint 383 â€” Professional Project Presentation & Portfolio Readiness*  
*Index baseline: c7d9547 | Current HEAD: eceaf47 | Branch: release/stable-sprint79*
