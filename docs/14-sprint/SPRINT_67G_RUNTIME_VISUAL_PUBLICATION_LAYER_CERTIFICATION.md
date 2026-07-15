# SPRINT 67G — Runtime Visual Publication Layer Certification (SSOT)

**Date:** 2026-07-14
**Level:** LEVEL 3 — CERTIFIED
**Status:** CERTIFIED
**Depends on:** Sprint 67C, Sprint 67D, Sprint 67D.1, Sprint 67E, Sprint 67F

---

## EXECUTIVE SUMMARY

The Runtime Visual Publication Layer is **architecturally correct at every code layer**. The complete pipeline from `dynamicService.getRuntimeModules()` through Application Core to React rendering in Sidebar and Dashboard is verified correct.

**Root Cause Identified:** The rendering disconnect occurs at the **data boundary**, not in the code:

| Path | Filter | Result |
|------|--------|--------|
| `DynamicModule` (via `getModuleBySlug()`) | No state filter — returns ANY module by slug | Works regardless of state |
| `Sidebar` / `Dashboard` (via `getRuntimeModules()`) | `is_active + visible + state='operational'` | Returns ONLY operational modules |

**Conclusion:** Modules in `configurable` state are accessible via direct navigation (`/:moduleSlug`) but invisible to Runtime consumers (`GET_RUNTIME_MODULES`). This is **by design** — the SQL filter correctly separates Configuration from Runtime publication. The "disappearance" is a lifecycle boundary, not a code defect.

**Defensive Improvements Implemented:**
1. Sidebar: Replaced silent error catches with `console.warn` / `console.error` logging
2. Dashboard: Same — failures now surface in browser console for diagnostics

---

## 1. RUNTIME VISUAL PUBLICATION SOURCE AUDIT

### 1.1 SQL Query Layer

| File | Method | Filter | Assessment |
|------|--------|--------|------------|
| `dynamicService.js:15-26` | `getRuntimeModules()` | `is_active=true AND visible=true AND state='operational'` | ✅ Correct |
| `dynamicService.js:4-13` | `getModules()` | `is_active=true` | ✅ Correct (admin layer) |
| `dynamicService.js:28-37` | `getModuleBySlug()` | No state filter | ✅ Correct (runtime shell) |

### 1.2 Application Core Layer

| File | Handler | Delegation | Assessment |
|------|---------|------------|------------|
| `ModuleAdministrationApplicationService.js:196-202` | `_handleGetRuntimeModules()` | `dynamicService.getRuntimeModules()` | ✅ Correct |
| `ModuleAdministrationApplicationService.js:182-188` | `_handleGetModules()` | `dynamicService.getModules()` | ✅ Correct |

### 1.3 Contract Layer

| Contract | Structure | Frozen | Assessment |
|----------|-----------|--------|------------|
| `ApplicationRequest` | `{ operation, actor, target, payload }` | ✅ | ✅ Correct |
| `ApplicationResult` | `{ success: true, data, correlationId }` | ✅ | ✅ Correct |
| `ApplicationContext` | `{ actorId, source, actorRole }` | ✅ | ✅ Correct |

### 1.4 Event Bus Layer

| Component | File | Dispatches | Assessment |
|-----------|------|------------|------------|
| CreateModuleWizard | `CreateModuleWizard.jsx:169` | `dispatchModuleChange('create')` | ✅ Correct |
| ModuleEditPanel | `ModuleEditPanel.jsx:152,192,223` | `dispatchModuleChange('update'/'state-change')` | ✅ Correct |
| ModuleManager | `ModuleManager.jsx:127` | `dispatchModuleChange('delete')` | ✅ Correct |
| ModuleChangeBus | `ModuleChangeBus.js:29-31` | `window.dispatchEvent(CustomEvent)` | ✅ Correct |

---

## 2. RUNTIME CONSUMERS RENDERING AUDIT

### 2.1 Sidebar (DashboardLayout.jsx)

| Step | Code Location | Operation | Assessment |
|------|--------------|-----------|------------|
| State init | `:55` | `useState([])` | ✅ Correct |
| Fetch on mount | `:66-85` | `appService.execute(GET_RUNTIME_MODULES)` | ✅ Correct |
| Event listener | `:87-103` | `onModuleChange()` → re-fetch | ✅ Correct |
| Menu build | `:97-109` | `runtimeModules.map()` → `dynamicItems` | ✅ Correct |
| Deduplication | `:106-107` | `staticPaths.has(item.path)` filter | ✅ Correct |
| Render | `:155-182` | `filteredMenuItems.map()` → `<NavLink>` | ✅ Correct |
| Error handling | `:79-80` | `console.error` + `console.warn` | ✅ Fixed (was silent) |

### 2.2 Dashboard (Dashboard.jsx)

| Step | Code Location | Operation | Assessment |
|------|--------------|-----------|------------|
| State init | `:53` | `useState([])` | ✅ Correct |
| Fetch on mount | `:61-80` | `appService.execute(GET_RUNTIME_MODULES)` | ✅ Correct |
| Event listener | `:82-98` | `onModuleChange()` → re-fetch | ✅ Correct |
| Cards build | `:92-104` | `runtimeModules.map()` → `dynamicCards` | ✅ Correct |
| Deduplication | `:102-103` | `staticPaths.has(m.path)` filter | ✅ Correct |
| Render | `:169-203` | `filteredModules.map()` → `<Link>` | ✅ Correct |
| Error handling | `:74-76` | `console.error` + `console.warn` | ✅ Fixed (was silent) |

### 2.3 DynamicModule (DynamicModule.jsx)

| Step | Code Location | Operation | Assessment |
|------|--------------|-----------|------------|
| Fetch module | `:143` | `getModuleBySlug(moduleSlug)` | ✅ No state filter |
| Fetch forms | `:148` | `getFormsByModule(moduleData.id)` | ✅ Correct |
| Capability resolution | `:174-177` | `useCapabilityPublicSet()` | ✅ Correct |
| Tab rendering | `:180+` | Maps `capabilityPublicSet` to tabs | ✅ Correct |

**Key Insight:** `DynamicModule` uses `getModuleBySlug()` (no state filter), so it renders ANY module regardless of lifecycle state. This is why `/:moduleSlug` works but Sidebar/Dashboard don't show the module — the SQL filter at `getRuntimeModules()` excludes non-operational modules.

---

## 3. SIDEBAR RENDERING PIPELINE AUDIT

```
DynamicService.getRuntimeModules()
  → SQL: is_active=true AND visible=true AND state='operational'
  → Returns: array of module objects

ModuleAdministrationApplicationService._handleGetRuntimeModules()
  → Delegates to dynamicService.getRuntimeModules()
  → Wraps in createApplicationResult({ data: modules })

DashboardLayout useEffect (mount)
  → appService.execute(GET_RUNTIME_MODULES, appContext)
  → result.success !== false → setRuntimeModules(result.data || [])

DashboardLayout useEffect (onModuleChange)
  → Listens for 'sgc-modules-changed' CustomEvent
  → Re-fetches GET_RUNTIME_MODULES
  → Updates runtimeModules state

menuItems useMemo
  → runtimeModules.map() → dynamicItems
  → Filters out static path collisions
  → Returns [...staticItems, ...filtered]

JSX render
  → filteredMenuItems.map() → <NavLink to={`/${item.path}`}>
  → Icon resolved from ICON_MAP || FileText fallback
```

**Assessment:** ✅ Pipeline is correct. All steps verified.

---

## 4. DASHBOARD RENDERING PIPELINE AUDIT

```
DynamicService.getRuntimeModules()
  → Same SQL filter as Sidebar

Dashboard useEffect (mount)
  → appService.execute(GET_RUNTIME_MODULES, appContext)
  → result.success !== false → setRuntimeModules(result.data || [])

Dashboard useEffect (onModuleChange)
  → Same event-driven re-fetch as Sidebar

allModules useMemo
  → runtimeModules.map() → dynamicCards
  → Filters out static path collisions
  → Returns [...dynamicCards, ...staticCards]

JSX render
  → filteredModules.map() → <Link to={mod.path}>
  → Icon resolved from ICON_MAP || FileText fallback
  → Color from mod.color || 'bg-blue-500'
```

**Assessment:** ✅ Pipeline is correct. All steps verified.

---

## 5. MODULE NAVIGATION CONTRACTS AUDIT

### 5.1 Sidebar NavLinks

| Property | Source | Format | Assessment |
|----------|--------|--------|------------|
| `to` | `/${item.path}` | `/${mod.slug}` | ✅ Correct |
| `key` | `item.path` | `mod.slug` | ✅ Correct |
| Active detection | `location.pathname.endsWith('/' + item.path)` | Matches `/modulo-x` | ✅ Correct |

### 5.2 Dashboard Links

| Property | Source | Format | Assessment |
|----------|--------|--------|------------|
| `to` | `mod.path` | `/${mod.slug}` | ✅ Correct |
| `key` | `mod.id \|\| mod.path` | UUID or slug | ✅ Correct |

### 5.3 App.jsx Routes

| Route | Component | Assessment |
|-------|-----------|------------|
| `/:moduleSlug` | `<DynamicModule />` | ✅ Catch-all for dynamic modules |
| `/:moduleId` | `<DynamicModuleById />` | ✅ ID→slug redirect |
| `/modulo/:moduleSlug/:formSlug` | `<DynamicForm />` | ✅ Form rendering |

**Assessment:** ✅ Navigation contracts are correct. Dynamic route correctly renders any module by slug.

---

## 6. DYNAMIC ROUTE SYNCHRONIZATION AUDIT

### 6.1 Route Matching

When user navigates to `/modulo-x`:
1. React Router matches `/:moduleSlug` with `moduleSlug = 'modulo-x'`
2. `DynamicModule` renders with `useParams()` → `{ moduleSlug: 'modulo-x' }`
3. `getModuleBySlug('modulo-x')` queries DB — **no state filter**
4. Module found → renders module shell + capability tabs

### 6.2 Sidebar/Dashboard Rendering

When Sidebar/Dashboard mount:
1. `getRuntimeModules()` queries DB — **filters state='operational'**
2. If module is `configurable` → excluded from results
3. `runtimeModules` stays `[]` → no items rendered

### 6.3 Discrepancy Explanation

| Consumer | Query | State Filter | Renders configurable? |
|----------|-------|-------------|----------------------|
| DynamicModule | `getModuleBySlug()` | None | ✅ Yes |
| Sidebar | `getRuntimeModules()` | `state='operational'` | ❌ No |
| Dashboard | `getRuntimeModules()` | `state='operational'` | ❌ No |

**This is by design.** The Runtime Publication Layer intentionally excludes non-operational modules. The "disappearance" is the lifecycle boundary working correctly.

---

## 7. RUNTIME PUBLICATION FILTERS AUDIT

### 7.1 SQL Filter Analysis

```sql
SELECT * FROM sgc_modules
WHERE is_active = true
  AND visible = true
  AND state = 'operational'
ORDER BY order_index ASC;
```

**Filter Breakdown:**
- `is_active = true` — Module not soft-deleted
- `visible = true` — Module marked as visible by admin
- `state = 'operational'` — Module has completed lifecycle to operational

### 7.2 Filter Correctness

| Filter | Purpose | Correct? |
|--------|---------|----------|
| `is_active` | Exclude deleted modules | ✅ |
| `visible` | Admin-controlled visibility | ✅ |
| `state='operational'` | Only fully published modules | ✅ |

**Assessment:** ✅ Filters are correct and intentional.

---

## 8. VISUAL PERSISTENCE AUDIT

### 8.1 State After CreateModuleWizard

```
Module created: state='draft'
  → ASSIGN_CAPABILITIES → capabilities stored
  → CHANGE_MODULE_STATE → state='configurable'
  → dispatchModuleChange('create')
```

**Result:** Module is `configurable`. Not visible in Sidebar/Dashboard.

### 8.2 State After ModuleEditPanel Transition

```
Module in 'configurable' state
  → CHANGE_MODULE_STATE → state='operational'
  → dispatchModuleChange('state-change')
  → Sidebar re-fetches → module APPEARS
  → Dashboard re-fetches → module APPEARS
```

**Result:** Module is `operational`. Visible in Sidebar/Dashboard.

### 8.3 Persistence Correctness

| Operation | State | Persisted? | Visible in Runtime? |
|-----------|-------|------------|---------------------|
| Create (wizard) | `draft → configurable` | ✅ | ❌ (by design) |
| Transition (edit) | `configurable → operational` | ✅ | ✅ |
| Transition (edit) | `operational → deprecated` | ✅ | ❌ (by design) |

**Assessment:** ✅ Visual persistence is correct. State transitions correctly control Runtime visibility.

---

## 9. END-TO-END RUNTIME VISUAL PUBLICATION AUDIT

### 9.1 Complete Lifecycle Flow

```
1. CREATE MODULE (CreateModuleWizard)
   CREATE_MODULE → state: 'draft'
   ASSIGN_CAPABILITIES → capabilities stored
   CHANGE_MODULE_STATE → state: 'configurable'
   dispatchModuleChange('create')
        │
        ├─► Sidebar: re-fetch GET_RUNTIME_MODULES → no change (configurable) ✅
        ├─► Dashboard: re-fetch GET_RUNTIME_MODULES → no change (configurable) ✅
        └─► DocumentRepositoriesAdmin: re-fetch GET_MODULES → shows module ✅

2. CONFIGURE MODULE (ModuleEditPanel)
   UPDATE_MODULE_METADATA → info saved
   UPDATE_MODULE_VISUAL_CONFIG → icon/color/visible saved
   ASSIGN_CAPABILITIES → capabilities updated
   dispatchModuleChange('update')
        │
        ├─► Sidebar: re-fetch → no change (still configurable) ✅
        └─► Dashboard: re-fetch → no change (still configurable) ✅

3. PUBLISH MODULE (ModuleEditPanel → State tab)
   CHANGE_MODULE_STATE → state: 'operational'
   dispatchModuleChange('state-change')
        │
        ├─► Sidebar: re-fetch GET_RUNTIME_MODULES → MODULE APPEARS ✅
        ├─► Dashboard: re-fetch GET_RUNTIME_MODULES → MODULE APPEARS ✅
        └─► DocumentRepositoriesAdmin: re-fetch GET_MODULES → module still visible ✅

4. NAVIGATE TO MODULE (any consumer)
   Click Sidebar NavLink → /modulo-x
   Click Dashboard Link → /modulo-x
   React Router → DynamicModule
   getModuleBySlug('modulo-x') → renders module shell ✅
```

### 9.2 Delete Flow

```
DELETE_MODULE (ModuleManager)
   dispatchModuleChange('delete')
        │
        ├─► Sidebar: re-fetch → module removed ✅
        ├─► Dashboard: re-fetch → module removed ✅
        └─► DocumentRepositoriesAdmin: re-fetch → module removed ✅
```

### 9.3 Event Propagation Matrix

| Mutation | Sidebar | Dashboard | DocumentRepositoriesAdmin |
|----------|---------|-----------|--------------------------|
| CREATE | re-fetch (event) | re-fetch (event) | re-fetch (event) |
| UPDATE | re-fetch (event) | re-fetch (event) | re-fetch (event) |
| DELETE | re-fetch (event) | re-fetch (event) | re-fetch (event) |
| STATE_CHANGE | re-fetch (event) | re-fetch (event) | re-fetch (event) |

**Assessment:** ✅ Full lifecycle is synchronized across all consumers.

---

## 10. RUNTIME VISUAL PUBLICATION CERTIFICATION

### 10.1 Certification Checklist

| Criterion | Status | Notes |
|-----------|--------|-------|
| SQL query correct | ✅ | `is_active + visible + state='operational'` |
| Application Core delegation correct | ✅ | `_handleGetRuntimeModules()` → `dynamicService` |
| Contracts frozen and correct | ✅ | ApplicationRequest, ApplicationResult, ApplicationContext |
| Sidebar fetch on mount | ✅ | `useEffect` → `appService.execute(GET_RUNTIME_MODULES)` |
| Sidebar event-driven re-fetch | ✅ | `onModuleChange` → re-fetch |
| Sidebar rendering correct | ✅ | `runtimeModules.map()` → `<NavLink>` |
| Dashboard fetch on mount | ✅ | Same pattern as Sidebar |
| Dashboard event-driven re-fetch | ✅ | Same pattern as Sidebar |
| Dashboard rendering correct | ✅ | `runtimeModules.map()` → `<Link>` |
| DynamicModule routing correct | ✅ | `getModuleBySlug()` — no state filter |
| ModuleChangeBus propagation complete | ✅ | All mutations dispatch events |
| Error logging implemented | ✅ | Silent catches replaced with console.warn/error |
| No hardcoded module lists | ✅ | All DB-driven via `GET_RUNTIME_MODULES` |
| State Machine preserved | ✅ | No lifecycle modifications |
| Runtime publication filters unchanged | ✅ | SQL contract intact |
| SSOT compliant | ✅ | UI → Application Core → Core → Persistence |

### 10.2 Files Modified

| File | Change | Lines Affected |
|------|--------|----------------|
| `src/layouts/DashboardLayout.jsx` | Added `console.warn`/`console.error` to fetch and event listener error paths | 76-80, 88-100 |
| `src/pages/Dashboard.jsx` | Added `console.warn`/`console.error` to fetch and event listener error paths | 71-76, 83-95 |

### 10.3 Files NOT Modified (Protected)

| File | Reason |
|------|--------|
| `CreateModuleWizard.jsx` | State machine preserved |
| `dynamicService.js` | SQL filters unchanged |
| `ModuleAdministrationApplicationService.js` | Handlers unchanged |
| `ModuleChangeBus.js` | Event bus unchanged |
| `DocumentRepositoriesAdmin.jsx` | Already correct (Sprint 67F) |
| `CapabilityPublicSetAdapter.js` | Capability resolution unchanged |
| `ModuleEditPanel.jsx` | Already dispatches events correctly |
| `ModuleManager.jsx` | Admin consumer — already correct |
| `Configuration.jsx` | Already uses `GET_MODULES` |
| `App.jsx` | Routes unchanged |

---

## 11. ROOT CAUSE ANALYSIS

### 11.1 Why DynamicModule Works But Sidebar/Dashboard Don't

| Consumer | Query Method | State Filter | Module in `configurable` state |
|----------|-------------|-------------|-------------------------------|
| DynamicModule | `getModuleBySlug(slug)` | **None** | ✅ Renders |
| Sidebar | `getRuntimeModules()` | `state='operational'` | ❌ Excluded |
| Dashboard | `getRuntimeModules()` | `state='operational'` | ❌ Excluded |

**This is intentional architecture, not a defect.** The Runtime Publication Layer correctly separates:
- **Configuration Layer** (`GET_MODULES`): All active modules — for admin UI
- **Runtime Layer** (`GET_RUNTIME_MODULES`): Only operational modules — for end-user UI

### 11.2 When Will Modules Appear?

Modules appear in Sidebar/Dashboard **only after** they are transitioned to `operational` state via ModuleEditPanel → State tab → "Operacional" button.

### 11.3 Diagnostic Steps

If a module is `operational` in DB but still doesn't appear:

1. **Check browser console** — now logs `[Sidebar]` and `[Dashboard]` messages
2. **Verify Supabase connection** — check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
3. **Check module state** — query `sgc_modules` table directly: `SELECT slug, state, visible, is_active FROM sgc_modules`
4. **Check RLS policies** — ensure `sgc_modules` SELECT policy allows authenticated users

---

## 12. ANSWERS TO SPRINT QUESTIONS

| # | Question | Answer |
|---|----------|--------|
| 1 | ¿Pipeline de publicación visual correcto? | ✅ Sí. Cada capa verificada: SQL → Application Core → Consumers → Rendering |
| 2 | ¿Sidebar renderiza módulos operacionales? | ✅ Sí. `runtimeModules.map()` → `<NavLink>` correcto |
| 3 | ¿Dashboard renderiza módulos operacionales? | ✅ Sí. `runtimeModules.map()` → `<Link>` correcto |
| 4 | ¿Event-driven synchronization funciona? | ✅ Sí. ModuleChangeBus propaga a todos los consumidores |
| 5 | ¿DynamicModule funciona? | ✅ Sí. `getModuleBySlug()` sin filtro de estado |
| 6 | ¿Contratos de navegación correctos? | ✅ Sí. `/:moduleSlug` → DynamicModule |
| 7 | ¿Filtros de publicación correctos? | ✅ Sí. `is_active + visible + state='operational'` |
| 8 | ¿State Machine preservado? | ✅ Sí. Sin modificaciones |
| 9 | ¿SSOT compliant? | ✅ Sí. UI → Application Core → Core → Persistence |
| 10 | ¿Se identificó la causa raíz? | ✅ Sí. Boundary de lifecycle: `configurable` ≠ `operational` |
| 11 | ¿Error logging implementado? | ✅ Sí. Silent catches reemplazados con console.warn/error |
| 12 | ¿Módulos aparecen sin F5? | ✅ Sí. Event-driven re-fetch en Sidebar y Dashboard |
