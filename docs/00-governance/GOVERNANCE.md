# GOVERNANCE.md — Documentation Governance Source of Truth

**Status:** ACTIVE (Sprint 403 — Certification + Governance Finalization)
**Scope:** `docs/` documentation governance only. This document governs **documentation**, not software architecture (ADRs), code, SQL, or `.ai/`.
**Precedents:** 397 · 398 · 399 · 399.1 · 400 · 401 · 402 (VALIDATION COMPLETE / READY FOR CERTIFICATION)

---

## 1. Purpose

Define who decides, where things live, and how documentation changes — so the repository never again accumulates unclassified, duplicated, or orphaned documents. Every file under `docs/` has one responsibility, one authority, and one controlled change process.

## 2. Governance Principles

1. One responsibility → one clear authority (SoT matrix §4).
2. Historical ≠ current. Audit ≠ governance. Blueprint ≠ as-built. Overview ≠ detailed decision. Evidence ≠ operational documentation.
3. No duplication without declared purpose (dual layers below are declared, not accidental).
4. Preserve traceability (`git mv`, hashes, no history rewrites).
5. Controlled modification only (change control §18); read-only audits never modify the audited object.

## 3. Documentation Domains

| Domain | Responsibility |
|--------|----------------|
| 00 Governance | Process rules only (this file is the sole CURRENT file) |
| 01 Core Runtime | How the runtime works (architecture + certified freeze/master-model) |
| 02 Contracts | Contracts in force; `contract-registry.md` is the index SoT |
| 03 Validation | How the system validates |
| 04 Infrastructure | As-built infrastructure/persistence/deployment detail |
| 05 Implementation | Blueprints, plans, historical implementation roadmaps |
| 06 Analytics / AI | Enterprise analysis and AI strategy (dated analysis preserved) |
| 07 Scalability | How the system scales |
| 08 Registry | Official engine registry |
| 09 Business Assets | Business inventories and assets |
| 10 AI Context | Operational context for agents (snapshots, handoff, working logs) |
| 11 Current Architecture | Professional/consolidated view (explain the system) |
| 12 Database | Versioned SQL state (`supabase/migrations/`) + minimal notes |
| 13 Audit | Governance reports (`informes/`) vs forensic evidence (`anexos/`) |
| 14 Sprint History | Chronological Sprint evidence, `history/` ranges only |
| 15 Architecture Decisions | Formal decisions (`adr/`), certified SSOT models, knowledge maps |

## 4. Source-of-Truth Matrix

| Responsibility | Source of Truth |
|----------------|-----------------|
| Governance | `00-governance/GOVERNANCE.md` (this file) |
| Runtime architecture/contracts | Applicable SoT in `01-core-runtime` |
| Contract registry | `02-contracts/contract-registry.md` |
| Validation | `03-validation` |
| Deployment As-Built | `04-infrastructure/DEPLOYMENT_OVERVIEW.md` |
| Implementation plans | `05-implementation` |
| Analytics / AI | `06-analytics-ai` |
| Scalability | `07-scalability` |
| Engine registry | `08-registry/engine_registry.md` |
| Business assets | `09-business-assets` |
| AI operational context | `10-ai-context/AI_HANDOFF_INDEX.md` |
| Professional architecture | `11-architecture/ARCHITECTURE_OVERVIEW.md` |
| Database state | `12-database/supabase/migrations/` |
| Audit evidence | `13-auditoria/` (`informes/` verdicts, `anexos/` evidence) |
| Sprint chronology | `14-sprint/history/` |
| Architecture decisions | `15-architecture/adr/` |

Authority ≠ single file: a domain may hold specialized documents if responsibilities differ, nothing competes, and the SoT relation is explicit.

## 5. Document Lifecycle

```text
CREATE → CLASSIFY → ASSIGN DOMAIN → DEFINE AUTHORITY → LINK → MAINTAIN → REVIEW → CONSOLIDATE → ARCHIVE
```

## 6. Naming Rules

Use `UPPER-KEBAB` for governance/audit/certification docs, existing domain conventions otherwise; never `file:///`-style or machine-local names; fix typos on discovery via controlled Sprint (`10/ROJECT_STRUCTURE_TREE.md` precedent: verify → remove/rename, never silently).

## 7. Placement Rules

New document → answer Q1–Q6 (Sprint 403 §6): responsibility, authority (SoT/supporting/evidence/historical), domain (§3), duplication check, replacement handling, consumers. Sprint evidence → `14/history/<range>`; formal decision → `15/adr/`; contract → `02/` + registry entry (no entry = does not exist); agent working context → `10/`; audit verdict → `13/informes/`, workpaper → `13/anexos/`. When in doubt: REVIEW, never a new folder.

## 8. Link Rules

Relative paths only; never `file:///` or absolute author-machine paths; update inbound links when moving (historical logs exempt — preserved verbatim); link to the SoT, not to copies.

## 9. Historical Documentation

`14-sprint/history/` (ranges 001-100/101-200/201-300/301-400) is the chronological evidence repository. History is never rewritten to "clean up". Nested legacy subdirs (`45–49-sprint` inside 001-100) are INFO/DEFERRED, not defects.

## 10. Audit Documentation

`13-auditoria/informes/` = verdicts and governance reports (incl. 39x/40x series). `13-auditoria/anexos/` = forensic evidence and workpapers. Never mix levels. Active-phase reports may sit at `13-auditoria/` root during execution and file into `informes/` at Sprint close.

## 11. Architecture Documentation

`11-architecture/` = current professional/consolidated view (how the system works, for reviewers/recruiters). `15-architecture/` = detailed architecture, certified SSOT models, formal decisions. Coexistence is by design, not duplication.

## 12. Infrastructure vs Implementation

`04-infrastructure/` = AS-BUILT (as it runs). `05-implementation/` = BLUEPRINT/PLAN (as it was designed). Professional docs reference the as-built; never duplicate it.

## 13. Contract Layers

`01-core-runtime/.../SRCL_v1.0.md` = canonical Runtime Module Contract. `02-contracts/SRCL_V1.0.md` = Form Contract Layer note. Both registered in `02-contracts/contract-registry.md` (§Supplementary Contract Layers). Distinct scope/hash, justified coexistence.

## 14. Consolidation Rules

Consolidate only on: real duplication, SoT competition, unjustified fragmentation, obsolescence, clear maintainability gain. Never consolidate across: different functions, historical records, evidence, ADRs, blueprint/as-built, overview/detail pairs, traceability-providing separations.

## 15. Archive Rules

Archive (mark, keep in place or relocate with traceability) when historic/forensic/traceability value exists. Delete only verified-empty, unreferenced files via explicit gate (precedent: E01/E02 Sprint 401). Never delete history to obtain a "clean" structure.

## 16. Audit Rules

```text
AUDIT → REPORT → EVIDENCE → FINDINGS → CERTIFICATION
```

Read-only audits never modify the audited object (precedent: 397/398/399/402). Corrections run in a later controlled Sprint.

## 17. Sprint Documentation

A Sprint must represent a verifiable professional outcome, not bare file operations. Operations are means; the certified outcome is the goal.

## 18. Change Control

Significant reorganizations follow: `AUDIT → UNDERSTAND → CLASSIFY → DESIGN TARGET → PLAN → MIGRATE → VALIDATE → CERTIFY` (precedent: 397→403). No mass moves without reconciled inventory; no execution without certified plan; no certification without independent validation.

---

*Authority: Sprint 403 certification. Changes to this file require an explicit governance Sprint. It governs documentation; it does not replace ADRs, contracts, SQL, code, or Sprint reports. `.ai/` is out of scope.*
