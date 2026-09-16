# SPRINT 67D.1 — Runtime Consumers & UI Publication Audit

**Date:** 2026-07-14
**Scope:** Comprehensive audit of all Runtime module consumers and UI publication synchronization
**Status:** AUDIT ONLY — No code modifications

---

## 1. Consumer Map

### 1.1 Admin Layer — Application Core (`appService.execute()`)

| # | Component | File | Operations Used | ModuleChangeBus |
|---|-----------|------|-----------------|-----------------|
| 1 | Sidebar | `src/layouts/DashboardLayout.jsx` | `GET_RUNTIME_MODULES` | Listener ✓ |
| 2 | Dashboard | `src/pages/Dashboard.jsx` | `GET_RUNTIME_MODULES` | Listener ✓ |
| 3 | Configuration | `src/pages/Configuration.jsx` | `GET_MODULES` | None (no module CRUD) |
| 4 | DocumentRepositoriesAdmin | `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx` | `GET_RUNTIME_MODULES` | None (no module CRUD) |
| 5 | ModuleManager | `src/components/workspace/ModuleManager.jsx` | `GET_MODULES`, `DELETE_MODULE` | Dispatcher ✓ |
| 6 | ModuleEditPanel | `src/components/workspace/ModuleEditPanel.jsx` | `UPDATE_MODULE_METADATA`, `UPDATE_MODULE_VISUAL_CONFIG`, `ASSIGN_CAPABILITIES`, `CHANGE_MODULE_STATE` | Dispatcher ✓ |
| 7 | CreateModuleWizard | `src/components/workspace/CreateModuleWizard.jsx` | `CREATE_MODULE`, `ASSIGN_CAPABILITIES`, `CHANGE_MODULE_STATE` | Dispatcher ✓ |

### 1.2 Runtime Layer — Direct `dynamicService` Consumers

| # | Component | File | dynamicService Methods | Purpose |
|---|-----------|------|------------------------|---------|
| 8 | DynamicModule | `src/pages/DynamicModule.jsx` | `getModuleBySlug()`, `getFormsByModule()` | Module metadata + forms (display only) |
| 9 | DynamicModuleById | `src/pages/DynamicModuleById.jsx` | `getModuleById()` | ID→slug redirect |
| 10 | DynamicRecordsView | `src/components/DynamicRecordsView.jsx` | `getModuleResponses()` | Record listing |
| 11 | DynamicForm | `src/pages/DynamicForm.jsx` | `getFormBySlug()`, `getFormFields()` | Form rendering |
| 12 | FormBuilder | `src/components/FormBuilder.jsx` | `getFormFields()`, `reorderFormFieldsOrder()` | Form field management |
| 13 | Traceability | `src/pages/Traceability.jsx` | `getModuleBySlug('trazabilidad')`, `getFormsByModule()` | Dynamic forms listing |

### 1.3 Capability Resolution Pipeline

```
useCapabilityPublicSet({ moduleSlug, moduleId })
        ↓
CapabilityPublicSetAdapter({ moduleSlug })
        ↓
  listAssignmentsByModuleId({ moduleId })
    → Primary: sgc_modules.capabilities (DB)
    → Fallback: forms + records (always) + repository (conditional)
        ↓
ModuleCapabilityResolver.resolveCapabilitySet()
        ↓
CapabilityPublicSet → DynamicModule tabs
```

**Consumers:** `DynamicModule.jsx` (sole consumer of `useCapabilityPublicSet`)
**Adapter:** `CapabilityPublicSetAdapter.js` (reads DB, fallback legacy)

### 1.4 Static Module Pages (No dynamicService)

| # | Component | File | Pattern |
|---|-----------|------|---------|
| 14 | Certificates | `src/pages/Certificates.jsx` | `<DocumentManager module="trazabilidad">` |
| 15 | TechnicalSheets | `src/pages/TechnicalSheets.jsx` | `<DocumentManager module="fichas_tecnicas">` |
| 16 | Dispatches | `src/pages\Dispatches.jsx` | `despachosService` (own service) |
| 17 | Users | `src/pages\Users.jsx` | `supabase.from('profiles')` (own query) |

---

## 2. Audit Results

### Audit 1: Source Audit

**Question:** Which components use Application Core vs direct `dynamicService` for module resolution?

**Findings:**

| Layer | Components | Module Source |
|-------|-----------|---------------|
| Application Core (`appService.execute`) | Sidebar, Dashboard, Configuration, DocumentRepositoriesAdmin, ModuleManager, ModuleEditPanel, CreateModuleWizard | `GET_MODULES` or `GET_RUNTIME_MODULES` |
| Direct `dynamicService` | DynamicModule, DynamicModuleById, Traceability | `getModuleBySlug()`, `getModuleById()` |

**Assessment:** ✅ CORRECT split
- Admin Layer uses Application Core (SSOT for module administration)
- Runtime Layer uses `dynamicService` directly (SSOT for Runtime data)
- `DynamicModule.jsx` uses `dynamicService.getModuleBySlug()` ONLY for display metadata (name, description, forms) — UI decisions driven by `useCapabilityPublicSet()`

**Traceability.jsx note:** Uses `dynamicService.getModuleBySlug('trazabilidad')` to load dynamic forms for the Traceability landing page. This is a static page consuming Runtime data — architecturally correct. The module slug `'trazabilidad'` is a known legacy module, not a dynamic resolution.

---

### Audit 2: Sidebar Publication

**Question:** Does Sidebar show exactly the modules visible in Runtime?

**Findings (`DashboardLayout.jsx`):**
- `STATIC_MENU_ITEMS`: Dashboard + Configuración (hardcoded, correct — never Runtime modules)
- Dynamic modules: `GET_RUNTIME_MODULES` → `is_active + visible + state=operational`
- Deduplication: `staticPaths` Set prevents duplicates between static and dynamic items
- `ModuleChangeBus` listener: re-fetches on any module mutation

**Assessment:** ✅ CERTIFIED
- Sidebar shows exactly the Runtime-published modules
- No hardcoded module lists remain (old `MODULE_OPTIONS` removed in Sprint 67C)
- Event-driven refresh ensures consistency after mutations

---

### Audit 3: Dashboard Publication

**Question:** Does Dashboard show exactly the modules visible in Runtime?

**Findings (`Dashboard.jsx`):**
- `STATIC_MODULE_CARDS`: Configuración only (hardcoded, correct)
- Dynamic modules: `GET_RUNTIME_MODULES` → same filter as Sidebar
- `ModuleChangeBus` listener: re-fetches on any module mutation
- Icon resolution: `ICON_MAP[mod.icon] || FileText` fallback

**Assessment:** ✅ CERTIFIED
- Dashboard and Sidebar use identical data source and filter
- No drift between module lists

---

### Audit 4: Refresh Strategy

**Question:** Are all publication points event-driven?

**Findings:**

| Consumer | Trigger | Mechanism |
|----------|---------|-----------|
| Sidebar (`DashboardLayout.jsx`) | Mount + `appContext` change + `onModuleChange` event | `useEffect([appContext])` + `useEffect(() => onModuleChange(...))` |
| Dashboard (`Dashboard.jsx`) | Mount + `appContext` change + `onModuleChange` event | Same pattern |
| DocumentRepositoriesAdmin | Mount only (`useEffect([], [])`) | No event listener |
| Configuration | Mount only (`useEffect([], [])`) | No event listener |

**Assessment:** ✅ CORRECT
- Sidebar and Dashboard: event-driven (mandatory — user-facing publication points)
- DocumentRepositoriesAdmin: mount-only (acceptable — admin tool, module selector is for configuration not publication)
- Configuration: mount-only (acceptable — admin tool, module list is for form management)

---

### Audit 5: Delete Sync

**Question:** When a module is deleted, does Sidebar/Dashboard remove it?

**Findings:**
- `ModuleManager.jsx:127`: `dispatchModuleChange('delete')` after successful delete
- `DashboardLayout.jsx:86`: `onModuleChange(() => { ... GET_RUNTIME_MODULES ... })` re-fetches
- `Dashboard.jsx:81`: Same listener pattern
- Deleted module will NOT appear in `GET_RUNTIME_MODULES` (state/archived or gone from DB)

**Assessment:** ✅ CERTIFIED
- Delete triggers event → re-fetch → deleted module excluded from results

---

### Audit 6: State Sync

**Question:** When a module changes state (e.g., operational→deprecated), does Sidebar/Dashboard update?

**Findings:**
- `ModuleEditPanel.jsx:223`: `dispatchModuleChange('state-change')` after state change
- Sidebar/Dashboard re-fetch → `GET_RUNTIME_MODULES` applies `state='operational'` filter
- Module transitioning away from `operational` will disappear from Runtime publication

**Assessment:** ✅ CERTIFIED
- State change triggers event → re-fetch → filter excludes non-operational modules

---

### Audit 7: Visibility Sync

**Question:** When a module's `visible` flag changes, does Sidebar/Dashboard update?

**Findings:**
- `ModuleEditPanel.jsx:137-144`: `UPDATE_MODULE_VISUAL_CONFIG` includes `visible` field
- `ModuleEditPanel.jsx:152`: Dispatches `dispatchModuleChange('update')` after visual config save
- Sidebar/Dashboard re-fetch → `GET_RUNTIME_MODULES` applies `visible=true` filter

**Assessment:** ✅ CERTIFIED
- Visibility change triggers `update` event → re-fetch → filter applies
- `ModuleEditPanel.jsx:223`: State change also dispatches `'state-change'` event

**Note:** There is no dedicated `dispatchModuleChange('visibility-change')` call. The `update` event type covers this case because `UPDATE_MODULE_VISUAL_CONFIG` includes `visible` in its payload, and the subsequent `dispatchModuleChange('update')` triggers re-fetch.

---

### Audit 8: Cache Audit

**Question:** Is there unnecessary duplication or stale cache risk?

**Findings:**
- `GET_RUNTIME_MODULES` is called by Sidebar and Dashboard independently
- No shared cache between the two consumers (each maintains own `runtimeModules` state)
- Both use `appContext` dependency for auth-aware re-fetch
- `dynamicService.getRuntimeModules()` makes a fresh Supabase query each call (no in-memory cache)

**Assessment:** ✅ ACCEPTABLE
- Dual independent fetches are acceptable for two small independent UI components
- No stale cache risk — each fetch is a fresh DB query
- `appContext` dependency ensures re-fetch on auth changes

---

### Audit 9: End-to-End Publication Flow

**Question:** Full lifecycle — Create → Publish → Render → Mutate → Re-render

**Flow:**

```
1. Admin creates module (CreateModuleWizard)
   → CREATE_MODULE → ASSIGN_CAPABILITIES → CHANGE_MODULE_STATE(configurable)
   → dispatchModuleChange('create')

2. Admin transitions to operational (ModuleEditPanel)
   → CHANGE_MODULE_STATE(operational)
   → dispatchModuleChange('state-change')

3. Sidebar/Dashboard receive event
   → GET_RUNTIME_MODULES (is_active + visible + state=operational)
   → Module appears in UI

4. User navigates to /:moduleSlug
   → DynamicModule loads metadata via dynamicService.getModuleBySlug()
   → useCapabilityPublicSet() resolves capabilities from DB
   → Tabs rendered from Capability Public Set

5. Admin updates capabilities (ModuleEditPanel)
   → ASSIGN_CAPABILITIES → dispatchModuleChange('update')
   → Sidebar/Dashboard re-fetch (module still visible)
   → Next DynamicModule visit reads updated capabilities from DB

6. Admin deletes module (ModuleManager)
   → DELETE_MODULE → dispatchModuleChange('delete')
   → Sidebar/Dashboard re-fetch → module excluded
```

**Assessment:** ✅ CERTIFIED
- Full lifecycle is event-driven and consistent
- No gaps in the publication synchronization chain

---

### Audit 10: UI Certification

**Question:** Does every Runtime consumer use correct data sources and contracts?

| Component | Module Data | Capabilities | Forms | Records | Assessment |
|-----------|-------------|--------------|-------|---------|------------|
| DynamicModule | `dynamicService.getModuleBySlug()` | `useCapabilityPublicSet()` | `dynamicService.getFormsByModule()` | — | ✅ Correct |
| DynamicModuleById | `dynamicService.getModuleById()` | — | — | — | ✅ Correct (redirect only) |
| DynamicRecordsView | — (receives `moduleId` prop) | — | — | `dynamicService.getModuleResponses()` | ✅ Correct |
| DynamicForm | `dynamicService.getFormBySlug()` | — | `dynamicService.getFormFields()` | — | ✅ Correct |
| FormBuilder | — (receives `formDef` prop) | — | `dynamicService.getFormFields()` | — | ✅ Correct |
| Traceability | `dynamicService.getModuleBySlug('trazabilidad')` | — | `dynamicService.getFormsByModule()` | — | ✅ Correct (static page) |
| ModuleDocumentViewer | — (receives `moduleSlug` prop) | — | — | `documentRepositoriesService` | ✅ Correct |
| Configuration | `appService(GET_MODULES)` | — | `dynamicService.getFormsByModule()` | — | ✅ Correct (admin) |
| DocumentRepositoriesAdmin | `appService(GET_RUNTIME_MODULES)` | — | — | — | ✅ Correct (admin) |
| Sidebar | `appService(GET_RUNTIME_MODULES)` | — | — | — | ✅ Correct |
| Dashboard | `appService(GET_RUNTIME_MODULES)` | — | — | — | ✅ Correct |

**Assessment:** ✅ ALL CONSUMERS CORRECT
- No Runtime component makes UI decisions based on hardcoded module conditions
- No component imports `documentRepositoriesService` for capability resolution (except `CapabilityPublicSetAdapter` in legacy fallback)
- `CapabilityPublicSetAdapter` correctly reads DB first, falls back to legacy

---

## 3. Known Acceptable Patterns

### 3.1 Legacy Fallback in CapabilityPublicSetAdapter

**Location:** `src/core/capabilities/public/CapabilityPublicSetAdapter.js:117-155`

Modules created before Sprint 67C that have no `capabilities` array in `sgc_modules.capabilities` receive the legacy default:
- `forms` + `records` (always active)
- `repository` (conditionally active based on `documentRepositoriesService.getRepositories()`)

**Assessment:** ✅ ACCEPTABLE — Graceful degradation for pre-existing modules

### 3.2 Traceability.jsx Hardcoded Slug

**Location:** `src/pages/Traceability.jsx:97`

```js
const moduleData = await dynamicService.getModuleBySlug('trazabilidad');
```

**Assessment:** ✅ ACCEPTABLE — Traceability is a static landing page, not a dynamic module selector. The hardcoded slug `'trazabilidad'` is a known legacy module.

### 3.3 Configuration.jsx Mixed Data Sources

**Location:** `src/pages/Configuration.jsx:54-66`

Uses `appService.execute(GET_MODULES)` for module list but `dynamicService.getFormsByModule()` for forms.

**Assessment:** ✅ ACCEPTABLE — Configuration is an admin tool; forms loading via `dynamicService` is correct (forms are Runtime data, not admin configuration).

---

## 4. Defects Found

**None.** This audit found zero defects.

All 10 audits pass. The module publication pipeline is fully synchronized:
- Admin mutations dispatch events via `ModuleChangeBus`
- Sidebar and Dashboard re-fetch on events
- Runtime consumers use correct data sources
- Capability resolution reads from DB with legacy fallback
- No hardcoded module lists remain

---

## 5. Certification

| Audit | Status |
|-------|--------|
| 1. Source Audit | ✅ PASS |
| 2. Sidebar Publication | ✅ PASS |
| 3. Dashboard Publication | ✅ PASS |
| 4. Refresh Strategy | ✅ PASS |
| 5. Delete Sync | ✅ PASS |
| 6. State Sync | ✅ PASS |
| 7. Visibility Sync | ✅ PASS |
| 8. Cache Audit | ✅ PASS |
| 9. E2E Publication Flow | ✅ PASS |
| 10. UI Certification | ✅ PASS |

**Overall: ✅ CERTIFIED — Runtime Consumers & UI Publication Synchronization is complete and correct.**

---

## 6. Files Examined

| File | Lines | Role |
|------|-------|------|
| `src/layouts/DashboardLayout.jsx` | 270 | Sidebar — runtime modules + event listener |
| `src/pages/Dashboard.jsx` | 211 | Dashboard — runtime modules + event listener |
| `src/pages/DynamicModule.jsx` | 298 | Runtime shell — capabilities + forms + records |
| `src/pages/DynamicModuleById.jsx` | 79 | Redirect wrapper — ID→slug |
| `src/pages/DynamicForm.jsx` | 209 | Form renderer — dynamicService direct |
| `src/pages/Configuration.jsx` | 343 | Forms admin — Application Core + dynamicService |
| `src/pages/Traceability.jsx` | 217 | Static landing — dynamicService for forms |
| `src/components/DynamicRecordsView.jsx` | 734 | Record listing — dynamicService direct |
| `src/components/FormBuilder.jsx` | 303 | Form field editor — dynamicService direct |
| `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx` | 776 | Repository admin — Application Core |
| `src/components/workspace/ModuleManager.jsx` | 286 | Module CRUD — Application Core + dispatcher |
| `src/components/workspace/ModuleEditPanel.jsx` | 494 | Module edit — Application Core + dispatcher |
| `src/components/workspace/CreateModuleWizard.jsx` | 512 | Module creation — Application Core + dispatcher |
| `src/core/capabilities/public/CapabilityPublicSetAdapter.js` | 176 | Capability resolution — DB + legacy fallback |
| `src/core/capabilities/public/useCapabilityPublicSet.js` | 134 | React hook — capability pipeline |
| `src/core/applicationLayer/moduleAdministration/ModuleChangeBus.js` | 44 | Event bus — CustomEvent on window |
| `src/services/dynamicService.js` | — | Persistence layer — Supabase queries |
| `src/App.jsx` | — | Router — catch-all `:moduleSlug` route |
| `src/pages/Certificates.jsx` | 22 | Static — DocumentManager wrapper |
| `src/pages/TechnicalSheets.jsx` | 23 | Static — DocumentManager wrapper |
| `src/pages/Dispatches.jsx` | 672 | Static — own service (despachosService) |
| `src/pages/Users.jsx` | 200 | Static — direct Supabase query |
