# ADR Index — Architectural Decision Records Registry

**Status:** ACTIVE  
**Maintained by:** Architecture Team  
**Last Updated:** 2026-09-03 (Sprint 380)  
**Governance:** ADR-010 (Historical Sprint Preservation Policy)

---

## ADR Registry

| ADR | Title | Status | Date | Sprint Refs | Related |
|-----|-------|--------|------|-------------|---------|
| ADR-001 | Metadata-Driven Architecture | ACCEPTED | 2026-05-22 | Sprint 1-50, 65-67, 70, 80-99 | ADR-002, ADR-003, ADR-006 |
| ADR-002 | Runtime-Driven Execution Model | ACCEPTED | 2026-05-22 | Sprint 8, 65-67, 70, 80-99, 100+ | ADR-001, ADR-003 |
| ADR-003 | Capability-Driven Authorization | ACCEPTED | 2026-06-15 | Sprint 60-62, 65-67, 70, 100+ | ADR-001, ADR-006 |
| ADR-004 | Supabase as Remote Persistence Backend | ACCEPTED | 2026-07-16 | Sprint 70, 341, 346-351, 356-369 | ADR-005, ADR-006, ADR-007, ADR-009 |
| ADR-005 | GitHub Actions + GitHub Pages Production Deployment | ACCEPTED | 2026-08-27 | Sprint 351, 360, 361, 369 | ADR-004, ADR-007 |
| ADR-006 | Tenant-Scoped Persistence | ACCEPTED | 2026-08-22 | Sprint 341, 345-348, 350-351 | ADR-001, ADR-003, ADR-004, ADR-005 |
| ADR-007 | Authentication Client Initialization Contract | ACCEPTED | 2026-08-28 | Sprint 355-370, 362-363, 369 | ADR-004, ADR-005, ADR-006 |
| ADR-008 | Temporal Recurrence Window Model | ACCEPTED | 2026-05-15 | Sprint 341, 346-348, 350 | ADR-001, ADR-006 |
| ADR-009 | Document Storage and RLS Security Model | ACCEPTED | 2026-07-16 | Sprint 70, 344, 346-348, 369 | ADR-004, ADR-003, ADR-006 |
| ADR-010 | Historical Sprint Preservation Policy | ACCEPTED | 2026-09-03 | Sprint 378, 379, 380 | All ADRs |

---

## ADR Lifecycle

| Stage | Criteria |
|-------|----------|
| PROPOSED | Draft submitted for review |
| ACCEPTED | Approved by Architecture Team, implemented |
| SUPERSEDED | Replaced by newer ADR (reference in Supersedes) |
| DEPRECATED | No longer relevant, but kept for history |

---

## ADR Template

All ADRs must follow this structure:

```markdown
# ADR-XXX: Title

**Status:** PROPOSED | ACCEPTED | SUPERSEDED | DEPRECATED  
**Date:** YYYY-MM-DD  
**Deciders:** [Names/Roles]  
**Sprint References:** [Sprint numbers]

---

## Context
[Problem statement, constraints, alternatives considered]

## Decision
[What was decided, with technical details]

## Consequences
### Positive
[Benefits]
### Negative
[Drawbacks, risks]

## Implementation Evidence
| Sprint | Artifact |
|--------|----------|
| Sprint XXX | [Link/Description] |

## Related ADRs
- ADR-XXX: [Title]

---

**Supersedes**: [Previous ADR if applicable]  
**Next Review**: YYYY-MM-DD
```

---

## Governance

- **Owner**: Architecture Team
- **Review cadence**: Quarterly (or when major architectural change)
- **Creation trigger**: Any decision affecting:
  - System-wide architecture
  - Cross-cutting concerns (auth, persistence, deployment, security)
  - Technology selection (database, hosting, frameworks)
  - Data models affecting multiple modules
- **Review process**: 
  1. Author drafts ADR
  2. Architecture Team reviews (async or sync)
  3. Approve -> ACCEPTED, Request changes -> PROPOSED, Reject -> CLOSED
  4. Merge to docs/15-architecture/adr/ADR-XXX-*.md
  5. Update this index

---

## Quick Reference by Domain

### Architecture Foundation
- ADR-001: Metadata-Driven Architecture (EAV, dynamic forms)
- ADR-002: Runtime-Driven Execution Model (engine resolution, lazy loading)

### Authorization & Multi-Tenancy
- ADR-003: Capability-Driven Authorization (fine-grained, tenant-scoped)
- ADR-006: Tenant-Scoped Persistence (hybrid adapter, email-domain tenantId)

### Backend & Infrastructure
- ADR-004: Supabase as Remote Persistence Backend (PostgreSQL, Auth, Storage, RLS)
- ADR-005: GitHub Actions + GitHub Pages Production Deployment (CI/CD, secrets, Pages source)

### Security & Contracts
- ADR-007: Authentication Client Initialization Contract (null guards, build-time env)
- ADR-009: Document Storage and RLS Security Model (Storage + RLS policies)

### Domain-Specific Models
- ADR-008: Temporal Recurrence Window Model (calendar-aware, anchor-immutable)

### Governance
- ADR-010: Historical Sprint Preservation Policy (Sprint classification, knowledge extraction)

---

## Cross-Reference Matrix

| ADR | Depends On | Enables |
|-----|------------|---------|
| ADR-001 | — | ADR-002, ADR-003, ADR-006 |
| ADR-002 | ADR-001 | ADR-003, ADR-007 |
| ADR-003 | ADR-001 | ADR-004, ADR-006 |
| ADR-004 | ADR-001, ADR-003 | ADR-005, ADR-006, ADR-007, ADR-009 |
| ADR-005 | ADR-004 | ADR-007 |
| ADR-006 | ADR-001, ADR-003, ADR-004 | ADR-005 |
| ADR-007 | ADR-004, ADR-005 | — |
| ADR-008 | ADR-001 | ADR-006 |
| ADR-009 | ADR-004, ADR-003, ADR-006 | — |
| ADR-010 | — | All ADRs (governance) |

---

**Last Updated**: 2026-09-03 (Sprint 380)  
**Next Review**: 2026-12-01