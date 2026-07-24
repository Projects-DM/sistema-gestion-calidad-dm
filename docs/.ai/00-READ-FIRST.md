# SGC-DM
## Artificial Intelligence Governance
### 00 — READ FIRST

---

# IMPORTANT

This document MUST be read before analyzing, proposing, designing or implementing any modification to the SGC-DM project.

This rule applies to:

- ChatGPT
- OpenCode
- Cursor
- Claude
- GitHub Copilot
- Future AI Agents
- Human Contributors

The `.ai` directory is the official governance layer for every AI-assisted development process.

No Sprint may begin without first reading the complete contents of this directory.

---

# Mission

The mission of every AI agent working on this repository is NOT to redesign the system.

The mission is to evolve the certified platform while preserving the architectural integrity of the Core.

The project is governed by one fundamental principle:

> Reuse the existing Core before creating anything new.

---

# Official Architecture Philosophy

The SGC-DM follows a **Core First Architecture**.

The Core of the system is considered certified and stable.

Future developments SHALL extend the Core.

Future developments SHALL NOT replace or duplicate the Core.

Every implementation must consume existing capabilities whenever possible.

---

# Architectural Principles

Every proposal SHALL follow these principles.

## 1. Business First

Technology exists only to solve a business problem.

Every Sprint begins with the business objective.

Never with the technical solution.

---

## 2. Core First

Always consume the certified Core before proposing new architecture.

---

## 3. Reuse First

Existing components SHALL always be reused whenever possible.

Creating duplicate implementations is prohibited.

---

## 4. Simplicity First

The simplest solution that satisfies the business objective SHALL always be preferred.

---

## 5. Incremental Evolution

The platform evolves through small, controlled improvements.

Never through complete redesigns.

---

## 6. Configuration over Code

Whenever possible:

Configure.

Do not recreate.

---

## 7. Human Validation

Artificial Intelligence assists.

The administrator validates.

The human always keeps final control.

---

# Official Development Order

Every Sprint SHALL follow this order:

Business Problem

↓

Expected Result

↓

Scope Definition

↓

Out of Scope

↓

Reuse Analysis

↓

Architecture Validation

↓

Implementation

↓

Functional Certification

↓

Commit

No exception is allowed.

---

# The 80% Rule

Before implementing any solution every AI agent SHALL answer:

Can at least 80% of the existing Core be reused?

If YES

Continue.

If NO

The architecture proposal SHALL be redesigned.

---

# Fundamental Rule

The system SHALL evolve by:

Reuse

↓

Extension

↓

Configuration

↓

Integration

Never by:

Replacement

Duplication

Parallel Architectures

Future-Proof Implementations

Over Engineering

---

# Architectural Responsibility

Every contributor is responsible for preserving the architectural integrity of the platform.

The objective is not writing more code.

The objective is increasing business value while keeping the Core stable.

---

END OF DOCUMENT