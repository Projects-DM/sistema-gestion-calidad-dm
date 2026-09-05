# Professional Roadmap — Sistema de Gestión de Calidad (SGC-DM)

**Version:** 1.0 (Sprint 383)  
**Classification:** PROFESSIONAL PRESENTATION — STRATEGIC ROADMAP  
**Branch:** `release/stable-sprint79`  
**Baseline:** `c7d9547`

---

## 1. Strategic Vision

Transform SGC-DM from a **functional internal tool** into a **professional-grade, portfolio-ready enterprise platform** that demonstrates:

- **Architectural maturity** — Documented, contract-based, forensic-certified
- **Operational excellence** — Production-hardened, monitored, recoverable
- **Engineering rigor** — Forensic methodology, contract-based design, controlled evolution
- **Professional presentation** — Portfolio-ready documentation, interview-ready narrative

---

## 2. Roadmap Phases

### Phase 1: Professional Foundation (Sprints 383-386) — **IMMEDIATE**

| Sprint | Focus | Deliverable | Owner |
|--------|-------|-------------|-------|
| **383** | **Professional Presentation & Portfolio Readiness** | Professional README, Architecture Overview, Feature/Security/Deployment docs, Interview talking points | Sprint 383 |
| **384** | **Repository Governance & Structural Refinement** | Branch protection, legacy cleanup (gh-pages, .bak, deploy script), CI artifact validation | Sprint 384 |
| **385** | **Automated Testing Infrastructure** | Vitest unit tests (SchemaNormalizer, AuthResolver, OccurrenceSchedule), Playwright E2E (Login→Dashboard→Form→Logout), CI integration | Sprint 385 |
| **386** | **Staging Environment & Preview Deployments** | GitHub Actions preview deployments on PR, staging Supabase project, preview URLs in PR comments | Sprint 386 |

**Success Criteria Phase 1:**
- [ ] Professional README + Architecture docs live
- [ ] Branch protection on `release/stable-sprint79`
- [ ] Legacy cleanup: `gh-pages` branch deleted, `deploy` script removed, `.bak` files removed, `dist/` in `.gitignore`
- [ ] CI validates Supabase URL in build artifact
- [ ] Staging deployments on every PR
- [ ] Unit tests passing in CI

---

### Phase 2: Engineering Maturity (Sprints 387-390) — **SHORT TERM**

| Sprint | Focus | Deliverable | Evidence Required |
|--------|-------|-------------|-------------------|
| **387** | **Cross-Tenant Security Hardening** | Automated negative tenant isolation tests (Tenant A cannot read Tenant B), cross-browser persistence validation (Playwright multi-browser) | Playwright test suite passing |
| **388** | **Infrastructure as Code Completeness** | Storage RLS policies as code (Supabase migrations), Supabase secrets rotation procedure, database migration rollback procedure | Migration files + runbook |
| **389** | **CI/CD Maturity** | Automated artifact validation (Supabase URL in chunk), deployment health checks, rollback automation, deployment notifications | CI pipeline + runbook |
| **390** | **Observability Foundation** | Structured logging (Sentry), distributed tracing, custom metrics (form submission latency, auth latency), alerting rules | Sentry dashboard + Grafana/Prometheus |

**Success Criteria Phase 2:**
- [ ] Negative tenant isolation tests passing in CI
- [ ] Cross-browser persistence tests passing
- [ ] Storage RLS policies in migrations (IaC)
- [ ] Automated artifact validation in CI
- [ ] Structured logging + error tracking operational

---

### Phase 3: Productization (Sprints 391-396) — **MEDIUM TERM**

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| **391** | **Multi-Tenant Hardening** | Tenant onboarding flow, tenant admin panel, per-tenant feature flags, usage quotas |
| **392** | **Observability Maturity** | Distributed tracing (OpenTelemetry), custom dashboards (form submission latency, auth latency, error rates), SLO definitions + alerting |
| **393** | **Performance Optimization** | Bundle analysis + code splitting optimization, Supabase query optimization (indexes, materialized views), caching strategy (React Query / SWR) |
| **394** | **Advanced Security** | Supabase secrets rotation automation, CSP hardening, CSP nonce via Vite plugin, dependency scanning (npm audit + Snyk), secret scanning (GitHub secret scanning) |
| **395** | **Developer Experience** | Storybook for component library, API documentation (OpenAPI from Supabase), onboarding docs for new developers, component playground |
| **396** | **Platform Readiness** | Multi-region deployment strategy, disaster recovery drill, capacity planning, cost optimization analysis |

---

## 3. Long-Term Vision (Sprints 397-410) — **LONG TERM**

| Horizon | Theme | Outcomes |
|---------|-------|----------|
| **Year 1** | **Productization** | Multi-tenant SaaS ready, self-service onboarding, billing integration, white-label option |
| **Year 2** | **Platform Ecosystem** | Plugin architecture, webhook system, public API (OpenAPI), partner integrations (ERP, WMS) |
| **Year 3** | **AI-Enhanced Quality** | Evidence classification (Vision AI), anomaly detection (ML on audit logs), predictive maintenance scheduling, natural language form builder |

---

## 4. Investment Areas by Priority

| Priority | Area | Investment | Rationale |
|----------|------|------------|-----------|
| **P0** | Testing Infrastructure | High | Zero automated tests = regression risk |
| **P0** | Branch Protection / CI Gates | High | Prevents accidental production breaks |
| **P0** | Legacy Cleanup | Medium | Reduces confusion, attack surface |
| **P1** | Automated Testing | High | Enables confident refactoring |
| **P1** | Staging/Preview Deployments | High | Faster feedback, safer releases |
| **P1** | Cross-Tenant Security Testing | Critical | Compliance / trust requirement |
| **P1** | IaC for Storage RLS | High | Reproducibility / auditability |
| **P2** | Observability Stack | Medium | Operational maturity |
| **P2** | Performance Optimization | Medium | User experience at scale |
| **P2** | Developer Experience | Medium | Onboarding / velocity |
| **P3** | Multi-Tenant SaaS Features | Strategic | Business growth |
| **P3** | AI/ML Integration | Strategic | Differentiation |

---

## 4. Resource Allocation (Suggested)

| Sprint Range | Engineering Focus | % Capacity |
|--------------|-------------------|------------|
| 383-386 | Foundation / Governance / Testing | 70% |
| 387-390 | Engineering Maturity / Security | 60% |
| 391-396 | Productization / Platform | 50% |
| 397+ | Platform Ecosystem / AI | 40% |

*Remaining capacity: Maintenance, bug fixes, incremental features*

---

## 5. Success Metrics by Phase

### Phase 1 (Sprints 383-386)
| Metric | Target |
|--------|--------|
| Professional README + docs published | ✅ |
| Branch protection enabled | ✅ |
| Legacy artifacts removed | ✅ |
| CI artifact validation | ✅ |
| Staging deployments on PR | ✅ |
| Unit test coverage | > 60% |
| E2E critical path coverage | 100% (login→dashboard→form→logout) |

### Phase 2 (Sprints 387-390)
| Metric | Target |
|--------|--------|
| Cross-tenant negative tests | 100% pass |
| Cross-browser persistence | 100% pass (Chrome/Firefox/Safari) |
| Storage RLS in migrations | 100% |
| CI artifact validation | 100% pass |
| Structured logging | 100% requests |
| Error tracking | 100% captured |
| Deployment notifications | 100% |

### Phase 3 (Sprints 391-396)
| Metric | Target |
|--------|--------|
| Multi-tenant self-onboarding | ✅ |
| SLOs defined + alerting | 99.9% availability |
| Bundle size | < 500 KB gzipped initial |
| API response time (p95) | < 200ms |
| Deployment frequency | Daily |
| MTTR | < 30 min |

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Supabase pricing changes | Medium | High | Multi-cloud abstraction layer |
| Supabase downtime | Low | Critical | Multi-region DR plan |
| Key person dependency | High | High | Documentation + ADR + Contracts |
| Technical debt accumulation | High | High | Forensic audit sprints (quarterly) |
| Supabase vendor lock-in | Medium | High | IRuntimePersistenceLayer abstraction |
| Security vulnerability in dependencies | Medium | High | Dependabot + Snyk + npm audit |
| Data loss | Low | Catastrophic | Automated backups + PITR |

---

## 6. Governance Cadence

| Ceremony | Frequency | Participants | Output |
|----------|-----------|--------------|--------|
| **Sprint Planning** | Per Sprint | Tech Lead + Team | Sprint Goal + Evidence Plan |
| **Sprint Review** | Per Sprint | Team + Stakeholders | Demo + Evidence |
| **Sprint Retrospective** | Per Sprint | Team | Process Improvements |
| **Architecture Review** | Monthly | Tech Lead + Architect | ADR Updates / Drift Detection |
| **Security Review** | Quarterly | Security Champion | Threat Model Update |
| **Architecture Audit** | Quarterly | Forensic Auditor | Sprint 381R-style Audit |
| **Disaster Recovery Drill** | Semi-annual | Ops + Engineering | DR Runbook Validation |

---

## 7. Budget Considerations (Estimated)

| Category | Monthly (Est.) | Notes |
|----------|----------------|-------|
| **Supabase Pro** | $25-500 | Scales with usage |
| **GitHub Actions** | Free (public) / $0-50 | Actions minutes |
| **Sentry (Team)** | $26-80 | Error tracking |
| **Playwright Cloud** | $0-100 | E2E parallel runs |
| **Sentry/Logging** | $0-50 | Structured logging |
| **Total Estimated** | **$50-700/mo** | Scales with team/usage |

---

## 7. Decision Framework

For every proposed change:

```
1. AUDIT FIRST
   → What does the evidence say?
   
2. CLASSIFY
   → ADR / Contract / Sprint / Architecture / Governance
   
3. PLAN
   → Dedicated Sprint with evidence requirements
   
4. IMPLEMENT
   → Controlled change with evidence
   
5. TEST
   → Regression + new evidence
   
6. AUDIT
   → Forensic verification
   
7. CERTIFY
   → Sprint certification
   
8. COMMIT
   → Controlled merge
```

---

## 7. Communication Plan

| Audience | Channel | Frequency | Content |
|----------|---------|-----------|---------|
| **Engineering Team** | Slack / Standup | Daily | Sprint progress, blockers |
| **Stakeholders** | Email / Dashboard | Bi-weekly | Milestone progress, risks |
| **Technical Leadership** | Document Review | Monthly | Architecture decisions, risks |
| **Security Team** | Report | Quarterly | Security posture, incidents |

---

## 8. Definition of Ready / Done

### Definition of Ready (DoR)
- [ ] ADR written (if architectural)
- [ ] Contract updated (if contract-affecting)
- [ ] Evidence plan defined
- [ ] Rollback plan documented
- [ ] Sprint capacity confirmed

### Definition of Done (DoD)
- [ ] Implementation complete
- [ ] Evidence collected (logs, screenshots, test results)
- [ ] Regression suite passes
- [ ] ADR/Contract updated
- [ ] Documentation updated
- [ ] Sprint certification issued

---

*Document generated as part of Sprint 383 — Professional Project Presentation & Portfolio Readiness*  
*Roadmap baseline: `c7d9547` | Current HEAD: `eceaf47` | Branch: `release/stable-sprint79`*  
*Next Review: Sprint 384 Planning*