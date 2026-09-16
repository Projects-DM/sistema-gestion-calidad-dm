# Architecture Overview — Sistema de Gestión de Calidad (SGC-DM)

**Version:** 2.0 (Sprint 383 Consolidated)  
**Status:** PRODUCTION CERTIFIED (Sprint 369)  
**Branch:** `release/stable-sprint79`  
**Last Updated:** 2026-09-04

---

## 1. Executive Summary

The **Sistema de Gestión de Calidad (SGC-DM)** is a **metadata-driven, runtime-executed, tenant-scoped quality management platform** deployed on GitHub Pages with Supabase as the backend. The architecture separates configuration (database) from execution (runtime engine), enabling non-technical users to create and manage 100+ operational forms without code changes.

**Production URL:** `https://projects-dm.github.io/sistema-gestion-calidad-dm/`  
**Baseline Commit:** `c7d9547` (Sprint 375/376 certified)  
**Current HEAD:** `eceaf47` (Sprint 382 governance)

---

## 2. Architectural Principles

| Principle | Description | Implementation Evidence |
|-----------|-------------|------------------------|
| **Metadata-Driven** | Forms defined in DB, not hardcoded | `sgc_forms`, `sgc_form_fields` tables; `DynamicForm.jsx` interprets metadata |
| **Runtime-Driven** | Engine interprets metadata at runtime | `RuntimeSchemaParser` → `SchemaNormalizer` → `RuntimeFormFactory` → `RuntimeContext` |
| **Capability-Driven** | Fine-grained auth via capabilities | `AuthorizationResolver`, `CapabilityRegistry`, `ModuleCapabilityResolver` |
| **Tenant-Scoped** | Email-domain tenant isolation | `deriveTenantIdFromEmail()`, hybrid adapter, RLS |
| **Contract-Based** | Explicit invariants | 8 System Contracts (CONTRACT-001 through CONTRACT-008) |
| **Temporal Logic** | Calendar-aware recurrence | `OccurrenceSchedule.js` with anchor immutability |

---

## 3. System Layers

### 3.1 Frontend Layer (React 19 + Vite 8)

| Component | Responsibility | Key Files |
|-----------|----------------|-----------|
| **Router** | SPA Navigation | `src/App.jsx`, `react-router-dom` v7 |
| **Pages** | Route-level Views | `src/pages/` (Dashboard, DynamicForm, DynamicModule, Login, etc.) |
| **Layouts** | Page Structure | `src/layouts/DashboardLayout.jsx` |
| **Components** | Reusable UI | `src/components/` (engines, engines, workspace, EvidenceUploader, SignaturePad) |
| **Context** | Global State | `src/context/AuthContext.jsx`, `useAuth` hook |
| **Hooks** | Reusable Logic | `src/hooks/useAuth.js`, `src/hooks/useAlertRuntime.js` |

### 3.2 Runtime Engine Layer

| Component | Responsibility | Key Files |
|-----------|----------------|-----------|
| **Schema Parser** | Parses form metadata | `src/runtime/schema/parser/RuntimeSchemaParser.ts` |
| **Normalizer** | Normalizes partial metadata | `src/runtime/schema/normalization/SchemaNormalizer.ts` |
| **Form Factory** | Builds runtime model | `src/runtime/schema/factories/RuntimeFormFactory.ts` |
| **Runtime Context** | State + Validation | `src/runtime/context/RuntimeContext.tsx` |
| **Layout Engine** | Layout Resolution | `src/runtime/layout/engine/LayoutEngine.tsx` |
| **Field Renderer** | Field Delegation | `src/runtime/rendering/DynamicFieldRenderer.tsx` |
| **Component Registry** | Field Type Resolution | `src/runtime/rendering/registry/ComponentRegistry.tsx` |
| **Form Renderer** | Form Orchestration | `src/runtime/form/engine/FormRendererEngine.tsx` |

### 3.3 Services & Data Layer

| Component | Responsibility | Key Files |
|-----------|----------------|-----------|
| **Dynamic Service** | Supabase CRUD + Audit | `src/services/dynamicService.js` |
| **Supabase Client** | Singleton Client | `src/lib/supabase.js` |
| **Auth Context** | Auth + Tenant | `src/context/AuthContext.jsx` |
| **Runtime Persistence** | Hybrid Adapter | `src/runtime/persistence/...` |

### 3.4 Core Domain Logic

| Domain | Responsibility | Key Files |
|--------|----------------|-----------|
| **Auth** | Login, Session, Tenant | `src/context/AuthContext.jsx`, `src/lib/supabase.js` |
| **Alerts/Occurrences** | Scheduling, Completion | `src/core/capabilities/alert/occurrence/` |
| **Persistence** | Hybrid (LocalStorage + Supabase) | `src/core/capabilities/alert/occurrence/persistence/` |
| **Temporal Engine** | Recurrence Scheduling | `src/core/capabilities/alert/occurrence/OccurrenceSchedule.js` |
| **Tenant Resolution** | Email Domain → Tenant ID | `AuthContext.jsx` → `deriveTenantIdFromEmail()` |

---

## 4. Data Flow

### 4.1 Form Rendering Pipeline

```
Metadata (DB: sgc_forms + sgc_form_fields)
    ↓
dynamicService.getFormBySlug() + getFormFields()
    ↓
RuntimeSchemaParser.parse() → SchemaNormalizer.normalizeForm()
    ↓
RuntimeFormFactory.createRuntimeFormModel()
    ↓
RuntimeFormModel { formContract, normalizedFields, initialValues }
    ↓
RuntimeContext (RuntimeProvider) → formContract + initialValues
    ↓
DynamicForm → EngineResolver.resolveEngineComponent(engineType)
    ↓
LayoutEngine → DynamicFieldRenderer → ComponentRegistry
    ↓
Atomic Field Components (FieldText, FieldNumber, SignaturePad, etc.)
```

### 4.2 Form Submission Pipeline

```
User Submit
    ↓
DynamicForm.handleSubmit() → dynamicService.submitFormResponse()
    ↓
dynamicService.submitFormResponse(formId, userId, values, evidences)
    ↓
1. INSERT sgc_form_responses → response.id
2. INSERT sgc_response_values (EAV) → field_id + typed value
3. INSERT sgc_evidences (if any) → file_url, storage_path
4. INSERT sgc_audit_logs (action_type: 'create')
    ↓
Return { response, __runtime_internal_event }
    ↓
runtimeActivationLayer.activate(internalEvent)
    ↓
CompletionBridge → OccurrenceLedger → Hybrid Adapter
    ↓
localStorage (immediate) + Supabase (tenant-scoped)
```

### 4.3 Authentication Flow

```
App Mount
    ↓
AuthProvider (AuthContext.jsx)
    ↓
getSupabaseClient() → singleton or null
    ↓
supabase.auth.onAuthStateChange()
    ↓
session?.user → setUser() + fetchAndSetProfile(user.id)
    ↓
deriveTenantIdFromEmail(email) → tenantId
    ↓
TenantIdProviderRegistrar → setTenantIdProvider(tenantId)
    ↓
lazyHydrate() → bootDurableOccurrenceLedger()
    ↓
Hybrid Adapter registered on OccurrenceLedger
```

---

## 5. Key Invariants

### 5.1 Runtime Invariants (ADR-002)

| Invariant | Description | Enforcement |
|-----------|-------------|-------------|
| **STATIC-NO-COMPONENT** | No form-specific React components in `src/pages/` | Only `DynamicForm.jsx` in pages |
| **METADATA-DRIVEN** | All form behavior from metadata | `DynamicForm` reads `formContract` |
| **FLAT-STATE** | Runtime state = `{ [fieldId]: value }` | `RuntimeContext` uses flat map |
| **LAZY-LOAD** | Engines/Fields loaded on demand | `React.lazy` + `Suspense` in registries |

### 5.2 Persistence Invariants (CONTRACT-007)

| Invariant | Description | Enforcement |
|-----------|-------------|-------------|
| **DUAL-WRITE** | Write to localStorage + Supabase | `createHybridTenantAdapter()` |
| **READ-PRIORITY** | Read Supabase first, fallback localStorage | `createHybridTenantAdapter.readSignals()` |
| **TENANT-ISOLATION** | Keys prefixed `tenant::{tenantId}::` | `occurrenceCompletionStorageKey()` |
| **RLS-ENFORCEMENT** | `tenant_id` column + RLS policies | Supabase RLS policies |

### 5.3 Authentication Invariants (CONTRACT-002)

| Invariant | Description | Enforcement |
|-----------|-------------|-------------|
| **NULL-GUARD** | `getSupabaseClient()` returns `null` if env vars missing | `if (!url || !anonKey) return null` |
| **DEFENSIVE-GUARDS** | Every `supabase.auth` access guarded | `if (!supabase) throw Error(...)` |
| **BUILD-TIME-INJECTION** | Env vars injected at Vite build time | GitHub Actions `environment: github-pages` |

### 5.4 Temporal Invariants (CONTRACT-005 / ADR-008)

| Invariant | Specification |
|-----------|---------------|
| **ANCHOR-IMMUTABILITY** | `windowStart = startDate + startTime (local)` — never changes |
| **WINDOW-CALCULATION** | `windowEnd = windowStart + period` (derived, not stored) |
| **ANCHOR-STABILITY** | `completedAt` NEVER redefines anchor |
| **NEXT-DERIVED** | Next window = derived from anchor (not from `completedAt`) |
| **MONTHLY-CALENDAR** | Calendar month (Model A + CAL-001) |
| **YEARLY-CALENDAR** | Calendar year + leap saturation (29/02→28/02) |
| **WEEKLY-7DAY** | 7 days (NOT ISO week) |
| **TIMEZONE-LOCAL** | All calculations in browser local timezone |

---

## 6. Supabase Schema (Key Tables)

| Table | Purpose | RLS |
|-------|---------|-----|
| `sgc_modules` | Module definitions | ✅ |
| `sgc_forms` | Form definitions (engine_type, roles_allowed) | ✅ |
| `sgc_form_fields` | Field definitions (EAV attributes) | ✅ |
| `sgc_form_responses` | Submitted form instances | ✅ |
| `sgc_response_values` | EAV values (value_text, value_number, value_boolean, value_json) | ✅ |
| `sgc_evidences` | File uploads (photos, signatures) | ✅ |
| `sgc_audit_logs` | Immutable audit trail | ✅ |
| `sgc_alert_occurrence_completions` | Tenant-scoped completion signals | ✅ |
| `profiles` | User profiles (rol, tenant_id via email) | ✅ |
| `sgc_alert_occurrence_completions` | Completion signals | ✅ |

### RLS Policy Pattern

```sql
-- Standard pattern for tenant isolation
CREATE POLICY "tenant_isolation" ON public.sgc_alert_occurrence_completions
  FOR ALL USING (tenant_id = get_current_tenant());
```

---

## 7. CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/deploy-pages.yml`)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    environment:
      name: github-pages          # CRITICAL: Enables Environment Secrets
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4 (Node 20, npm cache)
      - run: npm ci
      - name: Build with Supabase env vars
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: |
          test -n "$VITE_SUPABASE_URL" && echo "PRESENT" || echo "WARNING_UNSET"
          test -n "$VITE_SUPABASE_ANON_KEY" && echo "PRESENT" || echo "WARNING_UNSET"
          npm run build
      - uses: actions/upload-pages-artifact@v3 (path: ./dist)

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
```

### Critical Invariants

| Invariant | Verification |
|-----------|--------------|
| **ENV-SCOPE** | Build job declares `environment: github-pages` |
| **SECRETS-SCOPE** | Secrets in Environment `github-pages` (not Repository Secrets) |
| **PAGES-SOURCE** | Pages Source = "GitHub Actions" (NOT "Deploy from branch") |
| **BUILD-VERIFICATION** | Logs show `VITE_SUPABASE_URL=PRESENT` |
| **ARTIFACT-VALIDATION** | Deployed bundle contains Supabase URL |

---

## 8. Security Posture

### Implemented Controls

| Control | Implementation |
|---------|----------------|
| **Authentication** | Supabase Auth (GoTrue) with JWT + email/password |
| **Authorization** | Capability-based (`AuthorizationResolver.canAccessRole`) |
| **Tenant Isolation** | Email domain derivation + RLS policies + hybrid adapter |
| **Storage Security** | Private bucket + signed URLs + tenant-scoped paths |
| **Audit Trail** | Immutable `sgc_audit_logs` on every write |
| **Transport** | HTTPS enforced (GitHub Pages + Supabase HTTPS) |
| **Secrets** | GitHub Environment Secrets (not in repo) |

### Evidence Gaps (Documented)

| Gap | Classification | Sprint |
|-----|----------------|--------|
| Cross-tenant negative test | EVIDENCE GAP (HIGH) | 383+ |
| Cross-browser persistence test | EVIDENCE GAP (MEDIUM) | 383+ |
| Storage RLS policies not fully IaC | REPRODUCIBILITY GAP | 383+ |
| No automated artifact validation | CI GAP | 383+ |
| No branch protection | GOVERNANCE GAP | 383+ |

---

## 9. Project Structure (src/)

```
src/
├── assets/                 # Static assets (logos, images)
├── components/             # Reusable React components
│   ├── engines/            # BaseChecklist, BaseMediciones, BaseGeneric
│   ├── workspace/          # ModuleManager, ModuleDetailPanel, ModuleEditPanel
│   ├── EvidenceUploader.jsx
│   ├── SignaturePad.jsx
│   └── ...
├── config/                 # App configuration
├── context/                # React Context providers
│   └── AuthContext.jsx     # Authentication + Tenant context
├── core/                   # Core domain logic
│   ├── applicationLayer/   # Application layer contracts
│   ├── authorization/      # AuthorizationResolver
│   ├── capabilities/       # Domain capabilities (alert, etc.)
│   │   └── alert/
│   │       ├── occurrence/     # OccurrenceLedger, CompletionBridge
│   │       │   └── persistence/  # Hybrid adapter, Supabase adapter
│   │       ├── evaluation/       # Alert evaluation engine
│   │       ├── operational-configuration/
│   │       └── ...
│   ├── engine/             # EngineResolver
│   ├── navigation/         # NavigationResolver
│   ├── operationalLayer/   # Operational layer services
│   └── persistence/        # Persistence providers
├── hooks/                  # Custom React hooks
├── layouts/                # Page layouts (DashboardLayout)
├── lib/                    # Library initializers
│   └── supabase.js         # Supabase singleton client
├── modules/                # Feature modules
│   ├── dashboard/          # Dashboard metrics, activities
│   ├── documentViewer/     # PDF/document viewer
│   └── experiences/        # Operational experiences
├── order-motor/            # Universal order processing
├── pages/                  # Route-level pages
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── DynamicForm.jsx     # Main dynamic form renderer
│   ├── DynamicModule.jsx
│   └── ...
├── runtime/                # Runtime Engine (NEW Architecture)
│   ├── builder/            # Runtime builder
│   ├── context/            # RuntimeContext (state + actions)
│   ├── eventing/           # SaveLifecycleEventDispatcher
│   ├── fields/             # Field contracts + registry
│   ├── form/               # FormRendererEngine, FormRuntimeProvider
│   ├── hooks/              # useRuntimeField
│   ├── integration/        # RuntimeActivationLayer
│   ├── layout/             # LayoutEngine + contracts
│   ├── persistence/        # SupabaseRuntimeAdapter, provider factory
│   ├── registry/           # ComponentRegistry, FormRegistry
│   ├── renderer/           # DynamicFieldRenderer, LayoutRenderer
│   ├── rules/              # RulesEngine, validation
│   ├── runtime-host/       # FormRuntimeHost
│   ├── schema/             # SchemaNormalizer, RuntimeSchemaParser
│   ├── transaction/        # Transaction contracts, payload builders
│   ├── types/              # RuntimeContracts, runtimeContracts.ts
│   └── validation/         # ValidationEngine, fieldRules
├── services/               # Business logic services
│   ├── dynamicService.js   # Main Supabase CRUD + audit
│   └── import/             # Import pipeline
├── shared/                 # Shared components/utilities
│   ├── components/         # ModalShell, viewers, etc.
│   ├── filters/            # Filter logic
│   ├── media/              # Media processor
│   ├── report/             # Evidence report rendering
│   ├── services/           # Export service
│   ├── state/              # Zustand stores
│   └── utils/              # Excel exporter, normalizers
├── utils/                  # Utility functions
└── main.jsx                # App entry point
```

---

## 10. Development Workflow

```bash
# 1. Start from baseline
git checkout release/stable-sprint79
git pull origin release/stable-sprint79

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Develop with forensic rigor
# - Audit first
# - Classify change (ADR/Contract/Sprint/Architecture)
# - Plan with evidence
# - Implement with tests
# - Regress against baseline

# 4. Verify
npm run lint
npm run build

# 5. PR → Review → Merge → Auto-deploy via GitHub Actions
```

---

## 11. Glossary

| Term | Definition |
|------|------------|
| **EAV** | Entity-Attribute-Value — flexible data model for dynamic forms |
| **RLS** | Row Level Security — PostgreSQL policy for row-level access control |
| **BaaS** | Backend as a Service — Supabase provides DB, Auth, Storage, Realtime |
| **EAV** | Entity-Attribute-Value — flexible data model for dynamic forms |
| **RLS** | Row Level Security — PostgreSQL policy for row-level access control |
| **BaaS** | Backend as a Service — Supabase provides DB, Auth, Storage, Realtime |
| **SPA** | Single Page Application — client-side routing, no full page reloads |
| **SPA** | Single Page Application — client-side routing, no full page reloads |
| **BaaS** | Backend as a Service — Supabase provides DB, Auth, Storage, Realtime |
| **EAV** | Entity-Attribute-Value — flexible data model for dynamic forms |
| **RLS** | Row Level Security — PostgreSQL policy for row-level access control |
| **SPA** | Single Page Application — client-side routing, no full page reloads |
| **BaaS** | Backend as a Service — Supabase provides DB, Auth, Storage, Realtime |
| **EAV** | Entity-Attribute-Value — flexible data model for dynamic forms |
| **RLS** | Row Level Security — PostgreSQL policy for row-level access control |
| **SPA** | Single Page Application — client-side routing, no full page reloads |

---

## 11. Related Documents

| Document | Path |
|----------|------|
| Deployment Architecture | `docs/15-architecture/deployment-architecture.md` |
| Historical Knowledge Map | `docs/15-architecture/historical-knowledge-map.md` |
| Current Architecture | `docs/15-architecture/current-architecture.md` |
| Deployment Architecture | `docs/15-architecture/deployment-architecture.md` |
| Contract Registry | `docs/02-contracts/contract-registry.md` |
| ADR Index | `docs/15-architecture/adr/adr-index.md` |
| ADR Registry | `docs/15-architecture/adr/` |
| Contract Registry | `docs/02-contracts/contract-registry.md` |
| Sprint 380 Report | `docs/Sprint-380.md` |
| Sprint 381 Report | `docs/Sprint-381.md` |
| Sprint 381R Report | `docs/Sprint-381R.md` |
| Sprint 382 Report | `docs/Sprint-382.md` |

---

---

*Document generated as part of Sprint 383 — Professional Project Presentation & Portfolio Readiness*  
*Architecture baseline: `c7d9547` | Current HEAD: `eceaf47` | Branch: `release/stable-sprint79`*