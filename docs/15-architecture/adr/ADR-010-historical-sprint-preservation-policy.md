# ADR-010: Historical Sprint Preservation Policy

**Status:** ACCEPTED  
**Date:** 2026-09-03 (Sprint 380)  
**Deciders:** Architecture Team  
**Sprint References:** Sprint 378 (repository archaeology), Sprint 379 (reconciliation), Sprint 380 (this sprint)

---

## Context

The SGC-DM project has accumulated 380+ Sprints of documentation, each capturing:
- Architectural decisions
- Forensic audits and root cause analyses
- Controlled corrections and certifications
- Regression discoveries and fixes
- Contract definitions and invariants
- Deployment procedures and failures

This represents **institutional knowledge** that would be costly to recreate. However, the current state has:
- 377+ Sprint documents in `docs/` root and `docs/14-sprint/`
- No unified index or navigation
- No distinction between current architecture and historical evidence
- Risk of knowledge loss during team transitions

## Decision

Establish a **Historical Sprint Preservation Policy** that:

### 1. Preservation (NOT Deletion)

> **SPRINT ≠ CURRENT ARCHITECTURE**

Sprints are **historical evidence**, not current architecture. They capture:
- What was tried
- What failed
- What was corrected
- Why decisions were made
- What regressions occurred

**Rule**: No Sprint document will be deleted. They are immutable historical records.

### 2. Classification Framework

Each Sprint document receives a classification:

| Classification | Meaning | Action |
|----------------|---------|--------|
| **CURRENT** | Describes current architecture | Reference in ADRs |
| **ARCHITECTURAL** | Contains architectural decisions | Extract to ADRs |
| **CONTRACT** | Defines system contracts | Extract to Contract Registry |
| **DECISION** | Documents architectural decision | Extract to ADRs |
| **HISTORICAL** | Evidence of past state | Archive |
| **SUPERSEDED** | Replaced by later solution | Archive with reference |
| **AUDIT** | Forensic analysis | Archive in `13-auditoria/` |
| **CERTIFICATION** | Production certification | Archive with reference |
| **REGRESSION** | Regression discovery/fix | Archive with reference |

### 3. Documentation Hierarchy (New)

```
docs/
├── 00-governance/           # Governance policies
│   ├── repository-governance
│   ├── sprint-governance
│   └── quality-gates
├── 01-core-runtime/         # Runtime architecture (CURRENT)
├── 02-contracts/            # System contracts (CURRENT)
├── 13-auditoria/            # Audit reports (HISTORICAL/AUDIT)
├── 14-sprint/
│   ├── 45-sprint/           # Sprint 45-49 (HISTORICAL)
│   ├── 46-sprint/           # Sprint 46 (HISTORICAL)
│   └── ...                  # ...
│   └── archive/             # All root sprint files moved here
├── 15-architecture/
│   ├── adr/                 # ADR Registry (DECISIONS)
│   ├── current-architecture.md
│   ├── deployment-architecture.md
│   └── historical-knowledge-map.md
└── Sprint-XXX.md            # Only CURRENT sprints in root
```

### 4. Knowledge Extraction Process

For each Sprint being consolidated:

1. **Read** the full Sprint document
2. **Classify** each section (CURRENT/ARCHITECTURAL/CONTRACT/DECISION/HISTORICAL)
3. **Extract**:
   - Architectural decisions → ADR Registry
   - System contracts → Contract Registry
   - Current architecture → Architecture docs
   - Historical evidence → Archive (unchanged)
4. **Cross-reference**: Link ADRs, Contracts, Architecture docs
5. **Archive**: Move original Sprint to `docs/14-sprint/archive/`

### 4. ADR Registry as Source of Truth

Architectural Decision Records become the **single source of truth** for:
- Why decisions were made
- What alternatives were considered
- What the current state is
- When to review

### 5. Contract Registry as Source of Truth

System contracts become the **single source of truth** for:
- What must not break
- Dependencies between components
- Failure modes
- Validation criteria

## Consequences

### Positive
- **Knowledge preserved**: 380+ Sprints retained as evidence
- **Navigation improved**: ADRs and Contracts provide entry points
- **Current vs Historical clear**: No confusion between "what is" and "what was"
- **Onboarding faster**: New team members read ADRs + Contracts, not 380 Sprints
- **Audit trail intact**: Full forensic history preserved

### Negative
- **Initial effort**: Significant work to classify and extract 377+ Sprints
- **Maintenance**: ADRs and Contracts must be kept current
- **Dual maintenance**: Both Sprints (archive) and ADRs/Contracts (current) must be kept

## Implementation Plan (Sprint 380)

| Phase | Action | Output |
|-------|--------|--------|
| 1 | Create directory structure | `docs/15-architecture/adr/`, `docs/02-contracts/`, `docs/14-sprint/archive/` |
| 2 | Create ADR Registry index | `docs/15-architecture/adr/adr-index.md` |
| 3 | Create 10 initial ADRs | ADR-001 through ADR-010 |
| 4 | Create Contract Registry | `docs/02-contracts/contract-registry.md` |
| 5 | Create Current Architecture doc | `docs/15-architecture/current-architecture.md` |
| 6 | Create Deployment Architecture doc | `docs/15-architecture/deployment-architecture.md` |
| 7 | Create Historical Knowledge Map | `docs/15-architecture/historical-knowledge-map.md` |
| 8 | Move root Sprint files to archive | `docs/14-sprint/archive/` |
| 9 | Create Sprint 380 report | This document |

## Related ADRs

All ADRs (001-010) reference this preservation policy as their governance basis.

---

**Status**: ACCEPTED — Sprint 380 execution in progress  
**Next Review**: 2026-12-01