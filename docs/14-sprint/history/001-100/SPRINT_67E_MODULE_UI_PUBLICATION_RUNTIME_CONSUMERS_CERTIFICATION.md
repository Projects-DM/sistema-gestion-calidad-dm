# SPRINT 67E — Module UI Publication & Runtime Consumers Certification

**Date:** 2026-07-14
**Level:** LEVEL 3 — CERTIFICATION
**Status:** AUDIT COMPLETED / ROOT CAUSE IDENTIFIED / IMPLEMENTATION SCOPE CERTIFIED
**Depends on:** Sprint 67C, Sprint 67D, Sprint 67D.1

---

## EXECUTIVE SUMMARY

The Runtime Module System pipeline is **functionally correct but incomplete at the workflow boundary**. The CreateModuleWizard creates modules in `configurable` state and stops. The `getRuntimeModules()` SQL filter requires `state = 'operational'`. Modules created via the wizard are therefore **invisible** to Sidebar, Dashboard, and Repository Selector until manually transitioned to `operational` via ModuleEditPanel.

**Root Cause:** The CreateModuleWizard does not complete the full lifecycle to `operational`. It transitions `draft → configurable` but does NOT proceed to `configurable → operational`.

**Impact:** 3 consumers affected:
1. Dashboard — no dynamic module cards
2. Sidebar — no dynamic menu items
3. Repository Selector — no dynamic modules in dropdown

---

## 1. CONSUMER MAP

### 1.1 Runtime Publication Consumers

| Consumer | File | Query | Filter | Event Listener | Assessment |
|----------|------|-------|--------|----------------|------------|
| Sidebar | `src/layouts/DashboardLayout.jsx:70-95` | `GET_RUNTIME_MODULES` | `is_active + visible + state=operational` | `onModuleChange` ✓ | ✅ Correct |
| Dashboard | `src/pages/Dashboard.jsx:65-90` | `GET_RUNTIME_MODULES` | Same | `onModuleChange` ✓ | ✅ Correct |
| Repository Selector | `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx:174` | `GET_RUNTIME_MODULES` | Same | ❌ Mount only | ⚠️ Acceptable |

### 1.2 Admin Module List Consumers

| Consumer | File | Query | Filter | Event Listener | Assessment |
|----------|------|-------|--------|----------------|------------|
| ModuleManager | `src/components/workspace/ModuleManager.jsx:70-89` | `GET_MODULES` | `is_active` only | Manual refresh | ✅ Correct |
| Configuration Forms | `src/pages/Configuration.jsx:54` | `GET_MODULES` | `is_active` only | None (admin) | ✅ Correct |
| Configuration Module Selector | `src/pages/Configuration.jsx:268` | `GET_MODULES` | `is_active` only | None (admin) | ✅ Correct |

### 1.3 Runtime Data Consumers (direct dynamicService)

| Consumer | File | Methods | Purpose |
|----------|------|---------|---------|
| DynamicModule | `src/pages/DynamicModule.jsx:143-150` | `getModuleBySlug()`, `getFormsByModule()` | Module shell |
| DynamicModuleById | `src/pages/DynamicModuleById.jsx:55` | `getModuleById()` | ID→slug redirect |
| DynamicRecordsView | `src/components/DynamicRecordsView.jsx:51` | `getModuleResponses()` | Records |
| DynamicForm | `src/pages/DynamicForm.jsx:36-48` | `getFormBySlug()`, `getFormFields()` | Form rendering |
| Traceability | `src/pages/Traceability.jsx:97-99` | `getModuleBySlug('trazabilidad')`, `getFormsByModule()` | Landing page |

### 1.4 Capability Resolution Pipeline

| Component | File | Role |
|-----------|------|------|
| `useCapabilityPublicSet` | `src/core/capabilities/public/useCapabilityPublicSet.js` | React hook — orchestrates resolution |
| `CapabilityPublicSetAdapter` | `src/core/capabilities/public/CapabilityPublicSetAdapter.js` | DB-first provider with legacy fallback |
| `ModuleCapabilityResolver` | `src/core/capabilities/ModuleCapabilityResolver.js` | Normalization engine |
| `CapabilityPackageRegistry` | `src/core/capabilities/CapabilityPackageRegistry.js` | 3 standard packages |

---

## 2. RUNTIME PUBLICATION MAP

```
sgc_modules (DB)
  │
  ├─ is_active = true
  ├─ visible = true
  └─ state = 'operational'  ◄── THE FILTER
        │
        ▼
dynamicService.getRuntimeModules()
  │  SELECT * FROM sgc_modules
  │  WHERE is_active = true
  │    AND visible = true
  │    AND state = 'operational'
  │  ORDER BY order_index ASC
        │
        ▼
ModuleAdministrationApplicationService._handleGetRuntimeModules()
  │  Delegates to dynamicService.getRuntimeModules()
  │  Returns createApplicationResult({ data: modules })
        │
        ▼
appService.execute({ operation: 'GET_RUNTIME_MODULES' }, context)
  │
  ├─► DashboardLayout (Sidebar)  ──► setRuntimeModules(result.data)
  ├─► Dashboard                   ──► setRuntimeModules(result.data)
  └─► DocumentRepositoriesAdmin   ──► setModules(result.data)
```

---

## 3. VISUAL PUBLICATION MAP

### 3.1 Sidebar (`DashboardLayout.jsx`)

```
STATIC_MENU_ITEMS (hardcoded)
  ├─ Dashboard (path: 'dashboard')
  └─ Configuración (path: 'configuracion')
        │
        ▼
runtimeModules (from GET_RUNTIME_MODULES)
  │  .map(mod => ({
  │    path: mod.slug,
  │    name: mod.name,
  │    icon: ICON_MAP[mod.icon] || FileText,
  │    color: mod.color,
  │    _runtime: true,
  │  }))
        │
        ▼
menuItems = [...staticItems, ...filtered dynamicItems]
        │
        ▼
filteredMenuItems.map(item => <NavLink to={item.path}>)
```

**Rendering logic:** Line 155 — iterates `filteredMenuItems`, renders `NavLink` for each.

**Assessment:** ✅ Rendering logic is correct. If `runtimeModules` contains data, items WILL appear.

### 3.2 Dashboard (`Dashboard.jsx`)

```
STATIC_MODULE_CARDS (hardcoded)
  └─ Configuración (path: '/configuracion')
        │
        ▼
runtimeModules (from GET_RUNTIME_MODULES)
  │  .map(mod => ({
  │    id: mod.id,
  │    path: `/${mod.slug}`,
  │    name: mod.name,
  │    icon: ICON_MAP[mod.icon] || FileText,
  │    color: mod.color,
  │    desc: mod.description || mod.name,
  │  }))
        │
        ▼
allModules = [...dynamicCards, ...staticCards]
        │
        ▼
filteredModules.map(mod => <Link to={mod.path}>)
```

**Rendering logic:** Line 170 — iterates `filteredModules`, renders `Link` cards.

**Assessment:** ✅ Rendering logic is correct. If `runtimeModules` contains data, cards WILL appear.

### 3.3 Repository Selector (`DocumentRepositoriesAdmin.jsx`)

```
modules (from GET_RUNTIME_MODULES)
  │  loaded once on mount (line 171-184)
        │
        ▼
<select value={repoForm.module_slug}>
  <option value="">Selecciona un módulo...</option>
  {modules.map(m => (
    <option key={m.slug} value={m.slug}>{m.name}</option>
  ))}
</select>
```

**Rendering logic:** Line 593 — renders `<option>` for each module in `modules` state.

**Assessment:** ✅ Rendering logic is correct. If `modules` contains data, options WILL appear.

---

## 4. REPOSITORY SELECTOR MAP

```
DocumentRepositoriesAdmin
  │
  ├─ useEffect([], []) on mount:
  │    appService.execute(GET_RUNTIME_MODULES)
  │    → setModules(result.data)
  │
  ├─ Module Selector (line 587-599):
  │    <select>
  │      modules.map(m => <option value={m.slug}>{m.name}</option>)
  │    </select>
  │
  └─ Assessment: Loads once, no event listener
     Acceptable: Admin tool, module list is for configuration
```

---

## 5. PUBLICATION FILTERS MAP

| Filter | Source | Applied By | Purpose |
|--------|--------|------------|---------|
| `is_active = true` | `sgc_modules.is_active` column | `dynamicService.getRuntimeModules()` SQL | Exclude inactive modules |
| `visible = true` | `sgc_modules.visible` column | `dynamicService.getRuntimeModules()` SQL | Exclude hidden modules |
| `state = 'operational'` | `sgc_modules.state` column | `dynamicService.getRuntimeModules()` SQL | Only published modules |
| `order_index ASC` | `sgc_modules.order_index` column | `dynamicService.getRuntimeModules()` SQL | Sort order |
| Static path dedup | `staticPaths` Set | `DashboardLayout.jsx:106`, `Dashboard.jsx:102` | Prevent duplicate menu items |
| Role filter | `STATIC_MENU_ITEMS.roles` | `DashboardLayout.jsx:98` | Role-based menu visibility |

**Critical filter:** `state = 'operational'` — This is the ONLY filter that excludes newly created modules. Modules created via CreateModuleWizard have `state = 'configurable'`, not `operational`.

---

## 6. RUNTIME SYNCHRONIZATION MAP

```
CREATE MODULE (CreateModuleWizard)
  │  1. CREATE_MODULE → state: 'draft', is_active: true, visible: true
  │  2. ASSIGN_CAPABILITIES → sgc_modules.capabilities updated
  │  3. CHANGE_MODULE_STATE → state: 'configurable'
  │  4. dispatchModuleChange('create') → CustomEvent dispatched
  │
  ▼
ModuleChangeBus (window CustomEvent)
  │  Event: 'sgc-modules-changed'
  │  Detail: { type: 'create' }
  │
  ▼
DashboardLayout listener
  │  → appService.execute(GET_RUNTIME_MODULES)
  │  → result.data = [] (module is 'configurable', NOT 'operational')
  │  → setRuntimeModules([])
  │
Dashboard listener
  │  → same query → same empty result
  │
  ▼
RESULT: No change visible in UI
```

**The synchronization mechanism IS working correctly.** The event fires, the re-fetch happens, the data is returned. The problem is that the data returned by `getRuntimeModules()` correctly excludes the module because `state = 'configurable' ≠ 'operational'`.

---

## 7. END-TO-END PUBLICATION MAP

```
STEP 1: CreateModuleWizard.handleCreate()
  │  CREATE_MODULE → state: 'draft'
  │  ASSIGN_CAPABILITIES → capabilities stored
  │  CHANGE_MODULE_STATE → state: 'configurable'
  │  dispatchModuleChange('create')
  │
  ├── Module state: 'configurable'
  ├── getRuntimeModules(): EXCLUDED (state ≠ operational)
  └── Sidebar/Dashboard: NO CHANGE
        │
STEP 2: ModuleEditPanel (manual)
  │  User navigates to Configuration → Módulos → Edit module → State tab
  │  Selects 'Operational' → clicks "Cambiar estado"
  │  CHANGE_MODULE_STATE → state: 'operational'
  │  dispatchModuleChange('state-change')
  │
  ├── Module state: 'operational'
  ├── getRuntimeModules(): INCLUDED ✓
  └── Sidebar/Dashboard: MODULE APPEARS ✓
        │
STEP 3: DynamicModule rendering
  │  User clicks module in Sidebar/Dashboard → /:moduleSlug
  │  DynamicModule loads metadata by slug (any state works)
  │  useCapabilityPublicSet() resolves capabilities from DB
  │  Tabs rendered from Capability Public Set
  │
  └── Module renders correctly ✓
```

---

## 8. DEFECT CERTIFICATION

### Defect #1: CreateModuleWizard Lifecycle Incomplete

**Location:** `src/components/workspace/CreateModuleWizard.jsx:151-166`

**Code:**
```js
if (moduleId) {
  const stateResult = await appService.execute(
    createApplicationRequest({
      operation: 'CHANGE_MODULE_STATE',
      target: moduleId,
      payload: { newState: 'configurable' },  // ◄── STOPS HERE
      actor: { id: user?.id ?? null, role: rol === 'administrador' ? 'admin' : rol },
    }),
    appContext
  );
}
```

**Problem:** The wizard transitions `draft → configurable` but does NOT proceed to `configurable → operational`. Modules remain invisible to Runtime consumers.

**Impact:** ALL newly created modules are invisible to Sidebar, Dashboard, and Repository Selector until manually transitioned via ModuleEditPanel.

**Root Cause:** The CreateModuleWizard was designed to stop at `configurable` state, requiring manual operational transition. This is a workflow design gap, not a code bug.

### Defect #2: DocumentRepositoriesAdmin No Event Listener

**Location:** `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx:171-184`

**Code:**
```js
useEffect(() => {
  (async () => {
    try {
      const result = await appService.execute(
        createApplicationRequest({ operation: 'GET_RUNTIME_MODULES' }),
        { actorId: null, actorRole: 'admin', source: 'document-repositories-admin' }
      );
      const mods = result.success !== false ? (result.data || []) : [];
      setModules(mods);
    } catch (e) {
      console.error('Error loading modules for repository admin:', e);
    }
  })();
}, []);  // ◄── Mount only, no event listener
```

**Problem:** Module selector loads once on mount. If a module transitions to `operational` after mount, it won't appear in the selector until page refresh.

**Impact:** When a new module becomes operational, the Repository Admin selector won't show it until the user refreshes the page.

**Root Cause:** No `onModuleChange` listener for re-fetching modules after mutation events.

### Non-Defect: Dashboard/Sidebar After-Create Behavior

**Finding:** After CreateModuleWizard completes, Dashboard and Sidebar correctly show NO CHANGE because the module is in `configurable` state. This is **expected behavior**, not a bug. The `getRuntimeModules()` filter correctly excludes non-operational modules.

---

## 9. ROOT CAUSE CERTIFICATION

### Primary Root Cause: Lifecycle Gap

The CreateModuleWizard creates modules in `configurable` state. The `getRuntimeModules()` SQL filter requires `state = 'operational'`. There is a gap between what the wizard produces and what the Runtime publication filter expects.

**This is NOT a code defect.** The code correctly implements the lifecycle state machine:
- `draft → configurable` (wizard)
- `configurable → operational` (manual via ModuleEditPanel)
- `operational → deprecated` (manual)
- `deprecated → archived` (manual)

The issue is that the wizard stops at `configurable` and there is no automated path to `operational`.

### Secondary Root Cause: No Event Listener in Repository Admin

The DocumentRepositoriesAdmin module selector loads modules once on mount and does not listen for module change events. This means:
- If a module transitions to operational while the user is on the Repository Admin page, the selector won't update.
- The user must refresh the page to see newly operational modules.

---

## 10. IMPLEMENTATION SCOPE CERTIFICATION

### Components That MUST Be Modified (Sprint 67F)

| # | Component | File | Change Required | Priority |
|---|-----------|------|-----------------|----------|
| 1 | CreateModuleWizard | `src/components/workspace/CreateModuleWizard.jsx` | Add `configurable → operational` transition after state change to `configurable`, OR add a new operation `CREATE_MODULE_OPERATIONAL` that creates directly in `operational` state | HIGH |
| 2 | DocumentRepositoriesAdmin | `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx` | Add `onModuleChange` event listener to re-fetch modules after mutations | MEDIUM |

### Components That MUST NOT Be Modified

| # | Component | File | Reason |
|---|-----------|------|--------|
| 1 | DashboardLayout | `src/layouts/DashboardLayout.jsx` | Already correct — event listener + re-fetch |
| 2 | Dashboard | `src/pages/Dashboard.jsx` | Already correct — event listener + re-fetch |
| 3 | DynamicModule | `src/pages/DynamicModule.jsx` | Already correct — capability-driven rendering |
| 4 | dynamicService | `src/services/dynamicService.js` | Already correct — SQL filters are correct |
| 5 | ModuleAdministrationApplicationService | `src/core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js` | Already correct — handlers are correct |
| 6 | ModuleChangeBus | `src/core/applicationLayer/moduleAdministration/ModuleChangeBus.js` | Already correct — event bus works |
| 7 | ModuleManager | `src/components/workspace/ModuleManager.jsx` | Already correct — manual refresh + event dispatch |
| 8 | ModuleEditPanel | `src/components/workspace/ModuleEditPanel.jsx` | Already correct — state transitions + event dispatch |
| 9 | CapabilityPublicSetAdapter | `src/core/capabilities/public/CapabilityPublicSetAdapter.js` | Already correct — DB-first with fallback |
| 10 | useCapabilityPublicSet | `src/core/capabilities/public/useCapabilityPublicSet.js` | Already correct — pipeline orchestration |

### Option A: Modify CreateModuleWizard (Recommended)

Add `configurable → operational` transition after the `configurable` state change:

```
CREATE_MODULE → state: 'draft'
ASSIGN_CAPABILITIES
CHANGE_MODULE_STATE → state: 'configurable'
CHANGE_MODULE_STATE → state: 'operational'  ◄── NEW
dispatchModuleChange('create')
```

**Pros:** Modules appear immediately in Sidebar/Dashboard after creation.
**Cons:** Skips the `configurable` review step.

### Option B: Create New Operation

Add `CREATE_MODULE_OPERATIONAL` operation that creates directly in `operational` state.

**Pros:** Clean separation of intent.
**Cons:** Requires new operation enum, handler, and validation.

### Option C: Add Operational Toggle in Wizard

Add a checkbox in the wizard: "Publicar inmediatamente (Operacional)" that controls whether the module transitions to `operational` or stays at `configurable`.

**Pros:** Most flexible — user chooses.
**Cons:** More complex UI.

---

## 11. FINAL CERTIFICATION

| Audit | Status | Notes |
|-------|--------|-------|
| 1. Runtime Publication Pipeline | ✅ PASS | SQL filters correct, Application Core correct |
| 2. Dashboard Publication | ✅ PASS | Rendering logic correct, event listener works |
| 3. Sidebar Publication | ✅ PASS | Rendering logic correct, event listener works |
| 4. Module Visibility Pipeline | ⚠️ GAP | `state = 'operational'` filter correct but wizard stops at `configurable` |
| 5. Repository Module Selector | ⚠️ GAP | Uses correct query but no event listener |
| 6. Runtime Consumers | ✅ PASS | All consumers use correct data sources |
| 7. Publication Filters | ✅ PASS | All filters correctly implemented |
| 8. Runtime Synchronization | ✅ PASS | ModuleChangeBus works correctly |
| 9. Visual Contracts | ✅ PASS | All rendering contracts correct |
| 10. End-to-End Publication | ⚠️ GAP | Pipeline correct but lifecycle incomplete at wizard boundary |

### Overall Assessment

**The architecture is certified.** The publication pipeline, filters, synchronization, and visual contracts are all correctly implemented. The gap is at the workflow boundary: the CreateModuleWizard stops at `configurable` state instead of completing the lifecycle to `operational`.

### Answers to Sprint Questions

1. **¿Por qué los módulos no aparecen en Dashboard?** — Porque `getRuntimeModules()` filtra `state = 'operational'` y el CreateModuleWizard deja el módulo en `configurable`.
2. **¿Por qué los módulos no aparecen en Sidebar?** — Mismo motivo: filtro SQL excluye módulos no-operacionales.
3. **¿Por qué los módulos no aparecen en Repository Selector?** — Mismo motivo + no tiene event listener para re-fetch.
4. **¿Cuál es el consumidor defectuoso?** — Ningún consumidor es defectuoso. Todos usan contratos correctos.
5. **¿Cuál es el contrato defectuoso?** — Ningún contrato es defectuoso. El filtro `state = 'operational'` es correcto.
6. **¿Cuál es el filtro defectuoso?** — Ningún filtro es defectuoso. El filtro SQL es correcto.
7. **¿La persistencia Runtime es correcta?** — Sí. Los módulos se persisten correctamente con `is_active: true`, `visible: true`.
8. **¿La sincronización Runtime es correcta?** — Sí. ModuleChangeBus funciona correctamente.
9. **¿Qué componentes deben ser modificados?** — `CreateModuleWizard.jsx` (agregar transición a `operational`) y `DocumentRepositoriesAdmin.jsx` (agregar event listener).
10. **¿Qué componentes NO deben tocarse?** — DashboardLayout, Dashboard, DynamicModule, dynamicService, ModuleAdministrationApplicationService, ModuleChangeBus, ModuleManager, ModuleEditPanel, CapabilityPublicSetAdapter, useCapabilityPublicSet.

---

## 12. FILES EXAMINED

| File | Lines | Role in Audit |
|------|-------|---------------|
| `src/services/dynamicService.js` | 374 | SQL queries — `getRuntimeModules()` filter |
| `src/core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js` | 723 | Application Core — query routing |
| `src/core/applicationLayer/moduleAdministration/contracts/ModuleAdministrationOperation.js` | 93 | Operation catalog |
| `src/layouts/DashboardLayout.jsx` | 270 | Sidebar — runtime modules + event listener |
| `src/pages/Dashboard.jsx` | 211 | Dashboard — runtime modules + event listener |
| `src/components/workspace/CreateModuleWizard.jsx` | 512 | Module creation — lifecycle gap identified |
| `src/components/workspace/ModuleEditPanel.jsx` | 494 | Module edit — state transitions + event dispatch |
| `src/components/workspace/ModuleManager.jsx` | 286 | Module CRUD — manual refresh + event dispatch |
| `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx` | 776 | Repository admin — module selector (no event listener) |
| `src/pages/Configuration.jsx` | 343 | Forms admin — module list via GET_MODULES |
| `src/pages/DynamicModule.jsx` | 298 | Runtime shell — capability-driven rendering |
| `src/core/capabilities/public/CapabilityPublicSetAdapter.js` | 176 | Capability resolution — DB + fallback |
| `src/core/capabilities/public/useCapabilityPublicSet.js` | 134 | React hook — pipeline orchestration |
| `src/core/applicationLayer/moduleAdministration/ModuleChangeBus.js` | 44 | Event bus — CustomEvent on window |
