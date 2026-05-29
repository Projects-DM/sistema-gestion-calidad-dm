# AI_HANDOFF_INDEX.md

# SGC-DM — AI Handoff & Context Index

## Purpose

This document is the official entry point for any AI system, developer, or architectural review process interacting with the SGC-DM project.

The goal is to preserve:

* architectural coherence
* runtime integrity
* scalability principles
* implementation consistency
* maintainability
* and long-term evolution strategy

across future implementations, migrations, and AI-assisted development workflows.

---

# Project Identity

SGC-DM (Sistema de Gestión de Calidad Digital Metadata-Driven) is an enterprise-oriented platform designed for:

* operational digitalization
* audit-ready workflows
* metadata-driven form systems
* runtime-generated interfaces
* workflow orchestration
* quality management processes
* operational traceability
* offline-first evolution
* scalable runtime infrastructure
* future AI-assisted operational systems

The project follows a:

* runtime-first
* metadata-driven
* contract-based
* reusable-first
* event-oriented
* infrastructure-agnostic

architecture strategy.

---

# Core Architectural Principles

The following principles are considered CRITICAL and must not be violated:

## Runtime-First Architecture

The runtime layer is the core orchestration engine of the platform.

UI, persistence, validation, workflows, and future offline systems must remain decoupled from runtime internals.

---

## Infrastructure Decoupling

The runtime must NEVER directly depend on:

* Supabase
* database providers
* browser storage providers
* external APIs
* infrastructure SDKs

All infrastructure access must occur through boundaries/contracts/adapters.

---

## Metadata-Driven System

Forms, rendering behavior, workflows, validations, and future orchestration capabilities must remain metadata-driven whenever possible.

Avoid hardcoded workflows or rigid UI coupling.

---

## Reducer Purity & Determinism

Reducers and state machines must remain:

* pure
* deterministic
* side-effect free
* async-free

No timers, IO operations, or infrastructure logic are allowed inside reducers.

---

## Progressive Scalability

The project intentionally avoids premature hyperscale complexity.

Avoid:

* unnecessary microservices
* premature distributed systems
* over-engineering
* unnecessary abstractions

Scalability must remain controlled, modular, and incremental.

---

## Maintainability-First Strategy

The project prioritizes:

* clarity over cleverness
* modularity over complexity
* contracts over implicit coupling
* predictable behavior over hidden magic

Long-term maintainability is prioritized over short-term implementation speed.

---

# Current Project Phase

Current phase:

# Sprint 8.5 — Runtime Stabilization & Recovery Hardening

Main focus:

* runtime determinism
* recovery consistency
* hydration preparation
* invariant protection
* replay readiness
* idempotency stabilization
* architecture hardening

The project is currently stabilizing the runtime before introducing durable persistence and advanced offline-first capabilities.

---

# Current Runtime Status

Implemented foundations include:

* runtime rendering engine
* metadata-driven rendering
* runtime state integration
* schema normalization pipeline
* transaction orchestration layer
* runtime persistence boundaries
* persistence adapters
* submit lifecycle orchestration
* runtime event dispatching
* offline recovery foundations
* retry orchestration
* recovery state machine foundations

Architecture status:

✅ Enterprise runtime foundations established
✅ Persistence boundaries isolated
✅ Runtime orchestration modularized
✅ Recovery foundation operational
⚠ Hydration/replay contracts still evolving
⚠ Durable persistence not implemented yet

---

# Recommended Reading Order

For new AI systems or contributors:

1. PROJECT_OVERVIEW.md
2. CURRENT_STATE.md
3. RUNTIME_ARCHITECTURE.md
4. ROADMAP.md
5. CHANGELOG.md

---

# Critical Areas

The following areas are considered architecture-critical:

* runtime/
* transaction orchestration
* recovery lifecycle
* persistence boundaries
* runtime contracts
* metadata normalization
* runtime state machines

Changes in these areas must preserve:

* determinism
* boundary isolation
* replay safety
* future persistence compatibility

---

# Current Architectural Risks

Known architecture-sensitive areas:

* replay determinism
* hydration lifecycle contracts
* recovery invariants
* snapshot versioning
* idempotency semantics
* durable persistence preparation

These areas are currently under stabilization before Sprint 9.

---

# Future Evolution Strategy

Planned future evolution includes:

* durable persistence layer
* hydration lifecycle
* deterministic replay support
* offline-first synchronization
* advanced runtime orchestration
* operational analytics
* AI-assisted workflow systems
* scalable metadata administration
* dynamic workflow authoring

All future evolution must preserve:

* runtime isolation
* modularity
* maintainability
* infrastructure abstraction
* operational simplicity

---

# Important Constraints

The project explicitly avoids:

* hardcoded workflows
* tight provider coupling
* runtime-to-UI dependencies
* runtime-to-database dependencies
* unnecessary hyperscale architecture
* uncontrolled complexity growth

---

# Governance Note

All future development should follow:

* controlled incremental implementation
* architecture-first evolution
* stabilization before expansion
* modular scalability
* enterprise maintainability standards

This document acts as the primary AI architectural orientation layer for the SGC-DM project.
