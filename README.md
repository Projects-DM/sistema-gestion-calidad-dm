# 🛡️ Sistema de Gestión de Calidad (SGC) — DM Distribuciones

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20Auth%20%2B%20Storage-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/JavaScript-ES2024-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

---

## 📋 Project Overview

### What is this?

**Sistema de Gestión de Calidad (SGC)** — **DM Distribuciones** is a **web application** designed to **digitize, automate, and audit quality management processes** for industrial distribution operations. The platform replaces manual, paper-based quality control processes with a centralized, traceable, and auditable digital platform.

### Problem

Industrial quality management traditionally relies on:

* **Paper-based forms** and Excel spreadsheets scattered across locations
* **Manual data entry** leading to transcription errors and data loss
* **Disconnected evidence** (photos, signatures) stored separately from records
* **No real-time visibility** into quality metrics across sites
* **Manual audit trails** that are incomplete or reconstructed post-facto
* **Difficult cross-site compliance reporting** requiring manual consolidation

### Solution

A **metadata-driven, runtime-executed web application** that provides:

* **Centralized quality operations** — One platform for all quality processes
* **Dynamic forms engine** — Configure 100+ form types without code changes
* **Real-time traceability** — End-to-end traceability from creation to completion
* **Tenant-scoped persistence** — Multi-tenant isolation with shared cross-browser state
* **Evidence-driven workflows** — Photo evidence, digital signatures, digital certificates
* **Temporal recurrence engine** — Calendar-aware scheduling with anchor immutability
* **Full audit trail** — Immutable audit logs for regulatory compliance (INVIMA, ISO)

---

## 🏗️ Architecture Overview

### Architectural Principles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ARCHITECTURAL PRINCIPLES                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Metadata-Driven      │ Forms defined in DB, not hardcoded             │
│  Runtime-Driven       │ Engine interprets metadata at runtime          │
│  Capability-Driven    │ Fine-grained authorization via capabilities    │
│  Tenant-Scoped        │ Multi-tenant isolation via email domain        │
│  Contract-Based       │ Explicit invariants enforced by contracts      │
│  Temporal Logic       │ Calendar-aware recurrence with anchor immutability│
└─────────────────────────────────────────────────────────────────────────┘
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React 19 + Vite 8)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Router   │→ │ Modules  │→ │ DynamicForm  │→ │ Runtime Engine     │  │
│  └──────────┘  └──────────┘  └──────────────┘  └────────────────────┘  │
│                              │                    │                     │
│                              ▼                    ▼                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    RUNTIME ENGINE                               │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │ Schema      │→ │ Normalizer   │→ │ RuntimeFormFactory   │  │   │
│  │  │ Parser      │  │ (normalizer) │  │ (formContract, etc)  │  │   │
│  │  └─────────────┘  └──────────────┘  └──────────────────────┘  │   │
│  │                              │                    │            │   │
│  │                              ▼                    ▼            │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │              RENDERING LAYER                            │  │   │
│  │  │  LayoutEngine → DynamicFieldRenderer → ComponentRegistry │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                        │
│                              ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  SERVICES LAYER (Supabase)                      │   │
│  │  Auth  │  Database (PostgreSQL + RLS)  │  Storage (S3)         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Features by Domain

### 📦 Operations & Traceability
* **Dispatch Management** — Batch/lot assignment, vehicle tracking, driver logs
* **Quality Inspections** — Dynamic checklists, measurements, evidence capture
* **Document Management** — Version-controlled documents with digital signatures
* **Traceability Matrix** — End-to-end lot/batch tracking from source to destination

### 🔬 Quality Control
* **Dynamic Forms Engine** — 100+ configurable form types (checklists, measurements, audits, CAPA)
* **Evidence Capture** — Camera integration, image compression, digital signatures (Canvas)
* **Real-time Validation** — Conditional logic, range validation, critical value alerts
* **Temporal Recurrence** — Calendar-aware scheduling (daily/weekly/monthly/yearly/custom)

### 🏢 Multi-Tenant Architecture
* **Tenant Isolation** — Email-domain derived tenant IDs (`user@domain.com` → `domain.com`)
* **Shared State** — Cross-browser/cross-device sync via Supabase
* **Offline Resilience** — LocalStorage fallback with hybrid persistence
* **RLS Enforcement** — Row-Level Security policies at database level

### 🔐 Security & Authorization
* **Capability-Driven Authorization** — Fine-grained permissions (`form:submit`, `form:verify`, `module:configure`)
* **Role-Based Access** — `administrador`, `calidad`, `operativo`, `consulta`, `conductor`
* **Tenant Isolation** — Row-Level Security (RLS) at PostgreSQL level
* **Storage Security** — Signed URLs, tenant-scoped paths, signed URLs with expiration

### 📊 Observability & Audit
* **Immutable Audit Logs** — Every action logged with actor, timestamp, before/after state
* **Evidence Integrity** — Signed URLs with expiration, hash verification
- **Temporal Engine** — Calendar-aware recurrence with immutable anchor

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React | 19.2.5 | UI Library |
| | Vite | 8.0.10 | Build Tool / Dev Server |
| | React Router | 7.14.2 | Client-side Routing |
| | Tailwind CSS | 4.2.4 | Utility-first Styling |
| **State** | Zustand | 5.0.14 | Global State |
| | React Context | 19.2.5 | Auth/Tenant/Context |
| **Backend (BaaS)** | Supabase | 2.105.1 | PostgreSQL + Auth + Storage + Realtime |
| **Database** | PostgreSQL | 15+ | Relational + RLS |
| **Auth** | GoTrue (Supabase) | 2.x | JWT + Sessions |
| **Storage** | Supabase Storage | S3-compatible | Evidence/Signatures/Docs |
| **PDF/Reports** | jsPDF + autotable | 4.2.1 / 5.0.7 | PDF Generation |
| **Excel** | xlsx | 0.18.5 | Import/Export |
| **Date/Time** | date-fns | 4.1.0 | Date Manipulation |
| **Icons** | Lucide React | 1.14.0 | Icon System |
| **Build** | Vite | 8.0.10 | Bundler |
| **Lint** | ESLint | 10.2.1 | Code Quality |

---

## 🏃 Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18.0.0 (recommended 20.x LTS) |
| npm | ≥ 9.0.0 |
| Supabase Account | Required |

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/Projects-DM/sistema-gestion-calidad-dm.git
cd sistema-gestion-calidad-dm

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# 4. Start development server
npm run dev
```

### Production Build

```bash
npm run build
# Output: ./dist/ (ready for GitHub Pages deployment)
```

---

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| [`docs/11-architecture/ARCHITECTURE_OVERVIEW.md`](docs/11-architecture/ARCHITECTURE_OVERVIEW.md) | System Architecture Overview |
| [`docs/15-architecture/adr/ADR-001`](docs/15-architecture/adr/ADR-001-metadata-driven-architecture.md) | Metadata-Driven Architecture |
| [`docs/15-architecture/adr/ADR-002`](docs/15-architecture/adr/ADR-002-runtime-driven-execution-model.md) | Runtime-Driven Execution Model |
| [`docs/15-architecture/adr/ADR-003`](docs/15-architecture/adr/ADR-003-capability-driven-authorization.md) | Capability-Driven Authorization |
| [`docs/15-architecture/adr/ADR-004`](docs/15-architecture/adr/ADR-004-supabase-remote-persistence-backend.md) | Supabase as Backend |
| [`docs/15-architecture/adr/ADR-005`](docs/15-architecture/adr/ADR-005-github-actions-github-pages-deployment.md) | GitHub Actions + Pages Deployment |
| [`docs/15-architecture/adr/ADR-006`](docs/15-architecture/adr/ADR-006-tenant-scoped-persistence.md) | Tenant-Scoped Persistence |
| [`docs/15-architecture/adr/ADR-007`](docs/15-architecture/adr/ADR-007-authentication-client-initialization-contract.md) | Auth Client Initialization Contract |
| [`docs/15-architecture/adr/ADR-008`](docs/15-architecture/adr/ADR-008-temporal-recurrence-window-model.md) | Temporal Recurrence Window Model |
| [`docs/15-architecture/adr/ADR-009`](docs/15-architecture/adr/ADR-009-document-storage-rls-security-model.md) | Document Storage & RLS Security |
| [`docs/15-architecture/adr/ADR-010`](docs/15-architecture/adr/ADR-010-historical-sprint-preservation-policy.md) | Historical Sprint Preservation Policy |
| [`docs/15-architecture/adr/ADR-011`](docs/15-architecture/adr/ADR-011-dynamic-module-architecture-decision.md) | Dynamic Module Architecture Decision |

---

## 🔐 Security Model

### Authentication Flow
```
User Login → Supabase Auth (GoTrue) → JWT Session → AuthContext
    ↓
Tenant Resolution (email domain) → tenantId
    ↓
AuthContext → Supabase Client (singleton, null-guarded)
```

### Authorization Model
```
User → Role → Capability Set → Module Permission → Operation
```

| Role | Capabilities |
|------|--------------|
| `administrador` | All capabilities across tenant |
| `calidad` | `form:verify`, `form:export`, `module:configure`, `audit:read` |
| `operativo` | `form:submit`, `form:read`, `evidence:upload` |
| `consulta` | `form:read`, `dashboard:read` |
| `conductor` | `form:submit` (assigned modules only) |

### Data Isolation
| Layer | Mechanism |
|-------|-----------|
| **Application** | `tenantId` derived from email domain (`user@domain.com` → `domain.com`) |
| **Database** | RLS policies on all `sgc_*` tables with `tenant_id` column |
| **Storage** | Folder structure `bucket/{tenantId}/...` + RLS on `storage.objects` |
| **Runtime** | Hybrid adapter: LocalStorage (immediate) + Supabase (shared) |

---

## 🚀 Deployment

### Current Production Pipeline

```
Developer
    ↓
git push operativo
    ↓
GitHub Actions (workflow: deploy-pages.yml)
    ↓
npm ci → npm run build
    ↓
Vite Build (with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY from GitHub Environment Secrets)
    ↓
actions/upload-pages-artifact@v3
    ↓
actions/deploy-pages@v4
    ↓
GitHub Pages (projects-dm.github.io/sistema-gestion-calidad-dm/)
```

### Environment Configuration

| Environment | Supabase URL | Supabase Anon Key |
|-------------|--------------|-------------------|
| **Local** | `.env` / `.env.production` | `.env` / `.env.production` |
| **CI/CD** | GitHub Environment `github-pages` | GitHub Environment `github-pages` |
| **Production** | GitHub Environment `github-pages` | GitHub Environment `github-pages` |

### Legacy Deployment (Deprecated)

| Mechanism | Status | Notes |
|-----------|--------|-------|
| `npm run deploy` (`gh-pages -d dist`) | **LEGACY** | Kept for rollback reference |
| `gh-pages` branch | **LEGACY** | Last updated 2026-07-15, stale |

---

## 📊 Project Status

| Aspect | Status |
|--------|--------|
| **Application** | ✅ Operational (Sprint 369 certified) |
| **Authentication** | ✅ Hardened (Sprint 363) |
| **Persistence** | ✅ Hybrid (Supabase + LocalStorage) |
| **Tenant Isolation** | ✅ Implemented + RLS |
| **Temporal Engine** | ✅ Certified (Sprint 341) |
| **Document Storage** | ✅ Supabase Storage + RLS |
| **CI/CD** | ✅ GitHub Actions → GitHub Pages |
| **Automated Testing** | ✅ Vitest suite (documented 294 tests, Sprints 386–388); E2E pending |
| **Branch Protection** | ✅ Active rulesets (`release/stable-sprint79`, `operativo`, `develop`: deletion + non-fast-forward) |
| **Staging Environment** | ✅ Preview/Production environments + Vercel Preview deployments |

### Current Baseline
| Property | Value |
|----------|-------|
| **Baseline Commit (tag)** | `fd2f26309715f660e92f4181443f96ffff4d7f77` (`baseline-pre-produccion-2026-09-19`) |
| **Production Branch** | `operativo` (trigger `push: [operativo]`; verified deployment run #24) |
| **Rollback Reference** | `release/stable-sprint79` (`fd2f263`) |
| **Production URL** | `https://projects-dm.github.io/sistema-gestion-calidad-dm/` |

---

## 🗺️ Roadmap (historical plan, Sprint 383 — preserved)

> Historical note: this roadmap was written at Sprint 383. Completed since: branch protection (rulesets actives, Sprints 404–410), Vitest suite (Sprints 386–388), Preview/Production environments, production cutover to `operativo` (Sprints 411–415). Pending: E2E suite, Sentry/observability, SaaS/AI tracks.

### Planned at Sprint 383 — Immediate (383-386)
| Sprint | Focus |
|--------|-------|
| 383 | Professional Presentation & Portfolio Readiness |
| 384 | Branch Protection & CI Gates |
| 385 | Automated Testing Infrastructure (Vitest + Playwright) |
| 386 | Staging Environment + Preview Deployments |

### Medium Term (Sprint 387-390)
| Sprint | Focus |
|--------|-------|
| 387 | Cross-Tenant Negative Testing |
| 388 | Cross-Browser Persistence Validation |
| 389 | Automated Artifact Validation in CI |
| 390 | Production Health Checks / SLOs |

### Long Term (Sprint 391+)
| Area | Focus |
|------|-------|
| Scalability | Multi-tenant hardening, caching, CDN |
| Observability | Sentry, structured logging, metrics |
| Multi-Tenant | SaaS isolation, billing, onboarding |
| AI Integration | Evidence classification, anomaly detection |

---

## 👨‍💻 Developer Competencies Demonstrated

This project demonstrates proficiency in:

| Domain | Evidence |
|--------|----------|
| **Frontend Architecture** | React 19, dynamic rendering, lazy loading, context/state |
| **Runtime Architecture** | Schema normalization, dynamic rendering, lazy loading |
| **Authentication & AuthZ** | JWT, RBAC, Capability-based, tenant isolation |
| **Database Design** | EAV model, RLS policies, multi-tenant isolation |
| **CI/CD** | GitHub Actions, GitHub Pages, environment secrets |
| **Forensic Debugging** | Sprints 355-370: root cause analysis, regression chains |
| **Forensic Architecture** | ADR-001 through ADR-011 |
| **Contract-Based Design** | 8 system contracts with invariants |
| **Git Hygiene** | Baseline preservation, controlled changes |
| **Documentation** | ADRs, Contracts, Sprints, Architecture docs |

---

## 📄 License

© 2026 DM Distribuciones SAS (Projects-DM). All rights reserved. — SGC-DM is proprietary software; see [LICENSE](LICENSE) for details. Third-party dependencies remain governed exclusively by their own licenses.

---

## 🤝 Contributing

This project follows a **controlled evolution** model:

1. **Audit First** — Forensic analysis before any change
2. **Classify** — ADR / Contract / Sprint / Architecture
3. **Plan** — Dedicated Sprint with defined scope
4. **Implement** — Controlled change with evidence
5. **Test** — Regression suite + manual verification
6. **Audit** — Forensic verification
7. **Certify** — Sprint certification

---

## 📞 Contact

**Project:** Sistema de Gestión de Calidad — DM Distribuciones  
**Organization:** Projects-DM  
**Repository:** [github.com/Projects-DM/sistema-gestion-calidad-dm](https://github.com/Projects-DM/sistema-gestion-calidad-dm)  
**Production:** https://projects-dm.github.io/sistema-gestion-calidad-dm/

---

> **Built with forensic rigor, documented with architectural honesty, deployed with controlled evolution.**