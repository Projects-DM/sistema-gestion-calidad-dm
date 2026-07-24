# SGC-DM
## Architectural Governance

---

# Purpose

This document defines the immutable architectural rules governing the evolution of the SGC-DM platform.

No Sprint may violate these principles.

---

# Certified Core

The following components are considered stable:

- Dynamic Module Factory
- Dynamic Forms
- Dynamic Records
- Repository Capability
- Operational Experiences
- Runtime
- Metadata Publication
- Module Administration

These components SHALL NOT be redesigned.

---

# Evolution Model

Every new feature SHALL evolve through:

Business Need

↓

Reuse Analysis

↓

Extension

↓

Certification

Never:

Business Need

↓

Rewrite

↓

New Architecture

---

# Architectural Priorities

Priority 1

Reuse existing components.

Priority 2

Configure existing components.

Priority 3

Extend existing capabilities.

Priority 4

Create new code only if absolutely necessary.

---

# Forbidden Practices

- Duplicate Builders
- Parallel CRUDs
- Parallel Pipelines
- New Runtime Layers
- New Metadata Systems
- New Persistence Models
- Hardcoded Business Logic
- Feature-specific architectures

---

# Golden Question

Before writing code:

"What certified component already solves part of this problem?"