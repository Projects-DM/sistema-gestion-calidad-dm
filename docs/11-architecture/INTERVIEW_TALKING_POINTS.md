# Interview Talking Points — Sistema de Gestión de Calidad (SGC-DM)

**Version:** 1.0 (Sprint 383)  
**Classification:** PROFESSIONAL PRESENTATION — INTERVIEW PREPARATION  
**Branch:** `release/stable-sprint79`

---

## 1. Elevator Pitch (30 Seconds)

> **"I built a metadata-driven quality management system for industrial distribution. Instead of hardcoding 100+ forms, the application reads form definitions from a database at runtime and renders them through a dynamic engine. It uses Supabase for auth, database, and storage with Row-Level Security for multi-tenant isolation. The deployment is fully automated via GitHub Actions to GitHub Pages. The architecture is metadata-driven, runtime-driven, capability-driven, and tenant-scoped."**

---

## 2. Core Technical Questions

### Q: "What did you build?"

**Answer:** *"A metadata-driven Quality Management System for industrial distribution. Instead of hardcoding forms, the application reads form definitions from a database at runtime and renders them through a dynamic engine. It handles quality inspections, dispatch tracking, evidence capture with photos/signatures, and multi-tenant isolation. Built with React 19, Vite, Supabase (PostgreSQL + Auth + Storage), deployed via GitHub Actions to GitHub Pages."*

**Follow-up hooks:** "metadata-driven", "runtime engine", "Supabase", "multi-tenant"

---

### Q: "Why React? Why Vite?"

**Answer:** *"React 19 for component architecture and ecosystem. Vite 8 for fast dev server (ESM native), fast builds (Rollup), and excellent tree-shaking. The runtime engine architecture benefits from Vite's code-splitting and lazy loading — engines and field components load on demand, reducing initial bundle by ~65%."*

**Key points:** React 19 concurrent features, Vite ESM + Rollup, lazy loading via `React.lazy` + `ComponentRegistry`

---

### Q: "How does the dynamic form engine work?"

**Answer:** *"Forms are defined as metadata in PostgreSQL (`sgc_forms` + `sgc_form_fields`). At runtime:
1. `RuntimeSchemaParser` parses the form schema
2. `SchemaNormalizer` normalizes partial metadata to `FormContract` + `FieldContract[]`
3. `RuntimeFormFactory` builds a `RuntimeFormModel` with initial values
4. `RuntimeContext` provides flat state map + validation
4. `DynamicForm` resolves engine via `EngineRegistry` → `LayoutEngine` → `DynamicFieldRenderer` → `ComponentRegistry` → atomic field components
4. All reactive via `RuntimeContext` flat state map `{ [fieldId]: value }`"*

**Key files:** `RuntimeSchemaParser`, `SchemaNormalizer`, `RuntimeFormFactory`, `RuntimeContext`, `LayoutEngine`, `DynamicFieldRenderer`, `ComponentRegistry`

---

### Q: "How does authentication work?"

**Answer:** *"Supabase Auth (GoTrue) with email/password. On login, `supabase.auth.signInWithPassword()` returns JWT session stored in `localStorage` (`sb-*-auth-token`). `AuthContext` uses `onAuthStateChange` to sync session → user → profile → tenantId. Critical: `getSupabaseClient()` has a null guard — returns `null` if env vars missing, preventing `TypeError: Cannot read properties of null`. AuthContext has defensive null guards on every `supabase.auth` access (Sprint 363 hardening)."*

**Key files:** `src/lib/supabase.js`, `src/context/AuthContext.jsx`, `src/pages/Login.jsx`

---

### Q: "How does multi-tenancy work?"

**Answer:** *"Tenant ID derived from email domain: `user@domain.com` → `domain.com`. `AuthContext` derives `tenantId` via `deriveTenantIdFromEmail()`. `TenantIdProviderRegistrar` registers provider → `lazyHydrate()` boots `OccurrenceLedger` with hybrid adapter. Hybrid adapter: localStorage (immediate) + Supabase (tenant-scoped). Supabase adapter filters by `tenant_id` column. RLS policies enforce `tenant_id = get_current_tenant()` at database level. Storage paths: `evidencias/{tenantId}/{responseId}/...`."*

**Key files:** `AuthContext.jsx` (`deriveTenantIdFromEmail`), `TenantIdProviderRegistrar`, `OccurrenceLedgerPersistencePort.js` (hybrid adapter), `createTenantScopedSupabaseAdapter`, RLS policies.

---

### Q: "How does the dynamic form rendering work?"

**Answer:** *"Form metadata in `sgc_forms` + `sgc_form_fields` tables. At runtime:
1. `dynamicService.getFormBySlug()` + `getFormFields()` fetch metadata
2. `RuntimeSchemaParser` + `SchemaNormalizer` → `FormContract` + `FieldContract[]`
4. `RuntimeFormFactory` creates `RuntimeFormModel` with `initialValues`
4. `RuntimeContext` provides flat state `{ [fieldId]: value }` + validation
4. `DynamicForm` → `EngineResolver.resolveEngineComponent(engineType)` → `LayoutEngine` → `DynamicFieldRenderer` → `ComponentRegistry.getComponent(fieldType)` → atomic field component (`FieldText`, `FieldNumber`, `SignatureField`, etc.)
4. All via `DynamicFieldRenderer` with `FieldRenderProps` contract"*

---

### Q: "How does tenant isolation work?"

**Answer:** *"Three layers:
1. **Application**: `tenantId` from email domain (`user@domain.com` → `domain.com`)
2. **Runtime**: Hybrid adapter — keys prefixed `tenant::{tenantId}::`; Supabase adapter filters by `tenant_id` column
3. **Database**: RLS policies on all `sgc_*` tables + `storage.objects` with `tenant_id = get_current_tenant()`
4. **Storage**: Paths `evidencias/{tenantId}/{responseId}/...` + RLS on `storage.objects`

*No cross-tenant negative test yet — documented as evidence gap (Sprint 383+)."*

---

### Q: "How does the temporal recurrence engine work?"

**Answer:** *"Sprint 341 certified. Key invariants:
- **Anchor Immutability**: `windowStart = startDate + startTime` — never changes
- **Anchor Stability**: `completedAt` NEVER redefines anchor
- **Next Derived**: Next window derived from original anchor, not `completedAt`
- **Calendar-Aware**: Monthly = calendar month (not 30 days), Yearly = calendar year with leap saturation (Feb 29 → Feb 28)
- **Weekly** = 7 days (NOT ISO week)
- **Local Timezone**: All calculations in browser local time

*Core: `OccurrenceSchedule.js` — `parseAnchor`, `computeTarget`, `occurrenceWindowAt`, `calendarAddMonths/Years` with saturation logic."*

---

### Q: "How does deployment work?"

**Answer:** *"GitHub Actions → GitHub Pages.
1. Push to `release/stable-sprint79` triggers workflow
2. GitHub Actions: `checkout` → `setup-node` → `npm ci` → `npm run build` (with `VITE_SUPABASE_URL`/`ANON_KEY` from GitHub Environment Secrets)
4. Build verification: echoes `VITE_SUPABASE_URL=PRESENT`
4. `actions/upload-pages-artifact@v3` → `actions/deploy-pages@v4`
4. GitHub Pages source = **GitHub Actions** (not branch)
4. Production: `https://projects-dm.github.io/sistema-gestion-calidad-dm/`*

*Legacy `npm run deploy` (gh-pages branch) is deprecated — branch stale since 2026-07-15."*

---

### Q: "How did you fix the authentication regression?"

**Answer:** *"Three-phase regression (Sprints 355-370):
1. **Sprint 351**: GitHub Actions workflow added but build job missing `environment: github-pages` → Environment Secrets not resolved
2. **Sprint 355-358**: `ERR_NAME_NOT_RESOLVED` — `VITE_SUPABASE_URL` undefined at build → `createClient(undefined)` → DNS failure
3. **Sprint 360**: Pages source = branch (`gh-pages`) vs Actions artifact mismatch
4. **Sprint 361**: Added `environment: github-pages` to build job + Pages Source = GitHub Actions
4. **Sprint 362**: New error `TypeError: Cannot read properties of null` — `getSupabaseClient()` returns `null` → `supabase.auth` dereference
4. **Sprint 363**: Added null guards in `AuthContext` (`signIn`, `signOut`, `fetchAndSetProfile`)
4. **Sprint 369**: Final certification — all 30 DoD PASS

*Root cause: GitHub Actions build job missing `environment: github-pages` → Environment Secrets not inherited."*

---

### Q: "How does the temporal recurrence engine work?"

**Answer:** *"Sprint 341 certified. Key invariants:
- **Anchor Immutability**: `windowStart = startDate + startTime` — never changes
- **Anchor Stability**: `completedAt` NEVER redefines anchor
- **Next Derived**: Next window derived from original anchor, not `completedAt`
- **Calendar-Aware**: Monthly = calendar month (not 30 days), Yearly = calendar year with leap saturation (Feb 29 → Feb 28)
- **Local Timezone**: All calculations in browser local time

*Core: `OccurrenceSchedule.js` — `parseAnchor`, `computeTarget`, `occurrenceWindowAt`, `calendarAddMonths/Years` with saturation logic."*

---

### Q: "How does the hybrid persistence work?"

**Answer:** *"Two adapters:
1. **LocalStorage Adapter** (`createDurableOccurrenceLedgerAdapter`) — immediate, offline-capable
4. **Supabase Adapter** (`createTenantScopedSupabaseAdapter`) — tenant-scoped, cross-browser
4. **Hybrid Adapter** (`createHybridTenantAdapter`):
   - **Read**: Supabase first → fallback localStorage
   - **Write**: Dual write (localStorage immediate + Supabase async)
   - Keys prefixed `tenant::{tenantId}::`
   - Lazy hydration via `TenantIdProviderRegistrar` → `lazyHydrate()`"

---

### Q: "What was the hardest bug you fixed?"

**Answer:** *"The authentication regression chain (Sprints 355-370). Root cause was a missing `environment: github-pages` on the build job — GitHub Actions Environment Secrets weren't resolved, so `VITE_SUPABASE_URL` was `undefined` at build time. Vite replaced `import.meta.env.VITE_SUPABASE_URL` with `undefined`, `getSupabaseClient()` returned `null`, and `AuthContext` tried to call `supabase.auth.signInWithPassword()` on `null`. Fixed by adding `environment: github-pages` to build job (Sprint 361) and adding defensive null guards in `AuthContext` (Sprint 363)."*

---

### Q: "How do you handle evidence upload?"

**Answer:** *"`EvidenceUploader` component:
1. User selects file (camera or gallery)
2. `processImage()` from `mediaProcessor.js` — client-side WebP compression, resize
3. Upload to Supabase Storage: `documentos-sgc/evidencias/{tenantId}/{responseId}/{timestamp}.webp`
4. Get signed URL (1-year expiry) via `createSignedUrl`
4. Store `{ file_url, storage_path, file_type }` in `sgc_evidences` linked to `response_id`

*Image compression: `browser-image-compression` → WebP, max 2MB."*

---

### Q: "How do you handle digital signatures?"

**Answer:** *"`SignaturePad` component:
1. HTML5 Canvas (`SignaturePad` library) — touch/mouse drawing
2. `canvas.toBlob('image/png')` → blob
4. Upload to `documentos-sgc/firmas/{responseId}.png`
4. Get signed URL → store in form values as `signature_url`
4. Rendered as confirmed signature with green badge in UI"

---

### Q: "How do you handle offline/offline-first?"

**Answer:** *"Hybrid persistence adapter:
- **LocalStorage adapter** (`createDurableOccurrenceLedgerAdapter`) — immediate writes, works offline
- **Supabase adapter** (`createTenantScopedSupabaseAdapter`) — syncs when online
- **Hybrid adapter**: Read from Supabase first (fresh), fallback localStorage; Write dual (localStorage immediate + Supabase async)
- `OccurrenceLedgerDurableBoot` lazy hydration on `tenantId` available
- LocalStorage key: `sgc.alert.occurrence-completion-ledger.v1`"

---

### Q: "What's your testing strategy?"

**Answer:** *"Currently: Manual verification + forensic audit scripts (98 scripts in `scripts/`). 
**Planned (Sprint 383+):**
- Unit tests: Vitest for `SchemaNormalizer`, `AuthorizationResolver`, `OccurrenceSchedule`
- E2E: Playwright for Login → Dashboard → Form Submit → Logout → Re-login
- CI artifact validation: Verify Supabase URL in `supabase-*.js` chunk
- Negative tenant tests: Tenant A cannot read Tenant B data"

---

### Q: "How do you handle migrations?"

**Answer:** *"Supabase migrations in `supabase/migrations/`:
- `sprint-131.7-optional-lote.sql` — optional lot column
- `sprint-294-category-alert-config.sql` — alert_config column
- RLS fixes in `supabase/rls_sgc_forms_fix.sql`, `rls_sgc_document_repositories_fix.sql`
- Schema baseline in `supabase/schema.sql`

*No ORM — direct SQL migrations. `dynamicService.js` uses typed Supabase client."*

---

## 9. Behavioral Questions

### "Tell me about a time you had to debug a production issue."

*"The authentication regression (Sprints 355-370). Production worked locally but failed on GitHub Pages with `ERR_NAME_NOT_RESOLVED`. Root cause: GitHub Actions build job missing `environment: github-pages`, so Environment Secrets weren't injected. Vite compiled with `undefined` Supabase URL. Fixed by adding `environment: github-pages` to build job and adding null guards in AuthContext."*

### "How do you ensure code quality?"

*"Forensic audit methodology:
1. **Audit First** — Static analysis before any change
2. **Classify** — ADR / Contract / Sprint / Architecture
3. **Plan** — Dedicated Sprint with evidence
4. **Implement** — Controlled change with evidence
4. **Test** — Regression suite + manual verification
5. **Audit** — Forensic verification
6. **Certify** — Sprint certification"

### "How do you handle technical debt?"

*"Document it as evidence gaps (Sprint 381R). Don't hide it — classify: `KNOWN DEFECT` ≠ `ARCHITECTURAL GAP` ≠ `GOVERNANCE GAP` ≠ `EVIDENCE GAP`. Create Future Sprint Candidates with evidence, risk, rollback plan. Never delete legacy without dependency audit."*

---

## 12. Quick Reference Card

| Topic | Key Files | Key Concept |
|-------|-----------|-------------|
| **Auth** | `src/lib/supabase.js`, `AuthContext.jsx` | Singleton, null guards, env injection |
| **AuthZ** | `AuthorizationResolver`, `CapabilityRegistry` | Capability-driven |
| **Tenant** | `AuthContext.jsx` (`deriveTenantIdFromEmail`), `OccurrenceLedgerPersistencePort` | Email domain → tenantId |
| **Runtime** | `RuntimeSchemaParser`, `SchemaNormalizer`, `RuntimeFormFactory`, `RuntimeContext` | Metadata → Runtime |
| **Forms** | `DynamicForm`, `EngineResolver`, `LayoutEngine`, `DynamicFieldRenderer` | Metadata → UI |
| **Persistence** | `OccurrenceLedgerPersistencePort` (hybrid) | Hybrid: localStorage + Supabase |
| **Temporal** | `OccurrenceSchedule.js` | Anchor immutability |
| **Auth** | `src/lib/supabase.js` (singleton, null guard) | Singleton + null guard |
| **AuthZ** | `AuthorizationResolver` | `roles_allowed.includes(role)` |
| **Deployment** | `.github/workflows/deploy-pages.yml` | Actions → Pages (not branch) |
| **Tenant** | `AuthContext` → `deriveTenantIdFromEmail` | Email domain |

---

## 12. Final Tips

1. **Always lead with evidence** — "Sprint 369 certified", "ADR-007 certified"
2. **Be honest about gaps** — "Negative cross-tenant test pending (Sprint 383)"
3. **Own the regression story** — "We found it, traced it, fixed it, documented it"
4. **Show the architecture** — Draw the layers on whiteboard
4. **Emphasize process** — "Audit First → Classify → Plan → Implement → Test → Audit → Certify"

---

*Prepared for Sprint 383 — Professional Project Presentation & Portfolio Readiness*  
*Based on Sprint 381R forensic certification and Sprint 382 repository governance audit*