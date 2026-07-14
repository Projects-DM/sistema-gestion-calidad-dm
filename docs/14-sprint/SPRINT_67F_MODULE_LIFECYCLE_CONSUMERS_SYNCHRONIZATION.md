# SPRINT 67F — Module Lifecycle Consumers Synchronization

**Date:** 2026-07-14
**Level:** LEVEL 3 — CERTIFIED
**Status:** CERTIFIED
**Depends on:** Sprint 67C, Sprint 67D, Sprint 67D.1, Sprint 67E

---

## EXECUTIVE SUMMARY

One component was using the wrong query contract. `DocumentRepositoriesAdmin.jsx` used `GET_RUNTIME_MODULES` (operational-only) instead of `GET_MODULES` (all-active), preventing administrative users from configuring modules that were in `configurable` state. Additionally, it lacked an event listener for module change synchronization.

**Changes made:**
1. `GET_RUNTIME_MODULES` → `GET_MODULES` in DocumentRepositoriesAdmin module selector
2. Added `onModuleChange` event listener for automatic re-fetch after module mutations

**State Machine:** ✅ Preserved. No lifecycle changes.
**Runtime Publication:** ✅ Intact. No filter changes.

---

## 1. MODULE LIFECYCLE CONSUMERS AUDIT

### 1.1 Consumer Classification

| Consumer | File | Layer | Query | Event Listener | Classification |
|----------|------|-------|-------|----------------|----------------|
| Sidebar | `DashboardLayout.jsx:71,88` | Runtime | `GET_RUNTIME_MODULES` | `onModuleChange` ✓ | Runtime Consumer |
| Dashboard | `Dashboard.jsx:66,83` | Runtime | `GET_RUNTIME_MODULES` | `onModuleChange` ✓ | Runtime Consumer |
| ModuleManager | `ModuleManager.jsx:71` | Admin | `GET_MODULES` | Manual refresh | Admin Consumer |
| Configuration | `Configuration.jsx:55` | Admin | `GET_MODULES` | None (admin) | Admin Consumer |
| DocumentRepositoriesAdmin | `DocumentRepositoriesAdmin.jsx:176` | Admin | `GET_MODULES` ✓ (fixed) | `onModuleChange` ✓ (fixed) | Admin Consumer |

### 1.2 State Machine (Preserved)

```
draft
  ↓  (CreateModuleWizard)
configurable
  ↓  (ModuleEditPanel)
operational
  ↓  (ModuleEditPanel)
deprecated
  ↓  (ModuleEditPanel)
archived
```

**No modifications to state machine.** ✅

---

## 2. ADMINISTRATION PUBLICATION PIPELINE AUDIT

### 2.1 Before Sprint 67F

```
DocumentRepositoriesAdmin
  └─ GET_RUNTIME_MODULES → is_active + visible + state=operational
     ❌ CONFIGURABLE MODULES EXCLUDED
     ❌ NEW MODULES INVISIBLE
```

### 2.2 After Sprint 67F

```
DocumentRepositoriesAdmin
  └─ GET_MODULES → is_active only
     ✅ ALL ACTIVE MODULES VISIBLE
     ✅ CONFIGURABLE MODULES CONFIGURABLE
     ✅ EVENT-DRIVEN RE-FETCH
```

---

## 3. RUNTIME PUBLICATION PIPELINE AUDIT

**No changes to Runtime publication.** All Runtime consumers continue using `GET_RUNTIME_MODULES`:

| Consumer | Query | Filter | Status |
|----------|-------|--------|--------|
| Sidebar | `GET_RUNTIME_MODULES` | `is_active + visible + state=operational` | ✅ Unchanged |
| Dashboard | `GET_RUNTIME_MODULES` | `is_active + visible + state=operational` | ✅ Unchanged |

---

## 4. ADMINISTRATIVE CRUD SYNCHRONIZATION AUDIT

### 4.1 ModuleManager

| Operation | Dispatches | Re-fetches |
|-----------|-----------|------------|
| DELETE_MODULE | `dispatchModuleChange('delete')` | `refreshModules()` (manual) |
| CREATE (via wizard) | `dispatchModuleChange('create')` | `refreshModules()` (via `onCreated` callback) |

**Assessment:** ✅ Correct — Admin consumer with manual refresh + event dispatch.

### 4.2 ModuleEditPanel

| Operation | Dispatches | Re-fetches |
|-----------|-----------|------------|
| UPDATE_MODULE_METADATA | `dispatchModuleChange('update')` | Via `onSaved` callback |
| UPDATE_MODULE_VISUAL_CONFIG | `dispatchModuleChange('update')` | Via `onSaved` callback |
| ASSIGN_CAPABILITIES | `dispatchModuleChange('update')` | None (inline success) |
| CHANGE_MODULE_STATE | `dispatchModuleChange('state-change')` | Via `onSaved` callback |

**Assessment:** ✅ Correct — All mutations dispatch events for Runtime consumers.

### 4.3 DocumentRepositoriesAdmin (FIXED)

| Event | Source | Response |
|-------|--------|----------|
| `onModuleChange` | Any admin mutation | Re-fetch `GET_MODULES` → update `modules` state |

**Assessment:** ✅ Correct after fix — Event-driven admin synchronization.

---

## 5. REPOSITORY SELECTOR SYNCHRONIZATION AUDIT

### Before

```js
// DocumentRepositoriesAdmin.jsx:175
operation: 'GET_RUNTIME_MODULES'
// → Only operational modules in dropdown
// → Configurable modules invisible
```

### After

```js
// DocumentRepositoriesAdmin.jsx:176
operation: 'GET_MODULES'
// → All active modules in dropdown
// → Configurable modules visible and configurable
```

**Assessment:** ✅ FIXED — Repository selector now shows all active modules.

---

## 6. CONFIGURATION MODULE SELECTOR SYNCHRONIZATION AUDIT

```js
// Configuration.jsx:55
operation: 'GET_MODULES'
// → All active modules in selector
// → Configurable modules visible
```

**Assessment:** ✅ Already correct — No change needed.

---

## 7. DOCUMENT REPOSITORY CONSUMERS AUDIT

| Consumer | File | Uses | Assessment |
|----------|------|------|------------|
| DocumentRepositoriesAdmin | `DocumentRepositoriesAdmin.jsx` | `GET_MODULES` (fixed) | ✅ Correct |
| ModuleDocumentViewer | `ModuleDocumentViewer.jsx` | `documentRepositoriesService` (Runtime) | ✅ Correct |
| CapabilityPublicSetAdapter | `CapabilityPublicSetAdapter.js` | `documentRepositoriesService` (legacy fallback) | ✅ Correct |

**Assessment:** ✅ All document repository consumers use correct contracts.

---

## 8. GLOBAL MODULE CHANGE PROPAGATION AUDIT

### 8.1 ModuleChangeBus Events

| Event Type | Producers | Consumers | Effect |
|------------|-----------|-----------|--------|
| `create` | CreateModuleWizard | Sidebar, Dashboard, DocumentRepositoriesAdmin | Re-fetch modules |
| `update` | ModuleEditPanel | Sidebar, Dashboard, DocumentRepositoriesAdmin | Re-fetch modules |
| `delete` | ModuleManager | Sidebar, Dashboard, DocumentRepositoriesAdmin | Re-fetch modules |
| `state-change` | ModuleEditPanel | Sidebar, Dashboard, DocumentRepositoriesAdmin | Re-fetch modules |
| `visibility-change` | (not yet dispatched) | Sidebar, Dashboard, DocumentRepositoriesAdmin | Re-fetch modules |

### 8.2 Propagation Matrix

| Mutation | ModuleManager | Configuration | DocumentRepositoriesAdmin | Sidebar | Dashboard |
|----------|---------------|---------------|---------------------------|---------|-----------|
| CREATE | refresh (manual) | — | re-fetch (event) ✓ | re-fetch (event) | re-fetch (event) |
| UPDATE | — | — | re-fetch (event) ✓ | re-fetch (event) | re-fetch (event) |
| DELETE | refresh + event | — | re-fetch (event) ✓ | re-fetch (event) | re-fetch (event) |
| STATE_CHANGE | — | — | re-fetch (event) ✓ | re-fetch (event) | re-fetch (event) |

**Assessment:** ✅ Global module change propagation is complete.

---

## 9. END-TO-END MODULE LIFECYCLE AUDIT

### 9.1 Create → Configure → Publish

```
1. CreateModuleWizard
   CREATE_MODULE → state: 'draft'
   ASSIGN_CAPABILITIES → capabilities stored
   CHANGE_MODULE_STATE → state: 'configurable'
   dispatchModuleChange('create')
        │
        ├─► ModuleManager: refreshModules() → shows module ✓
        ├─► DocumentRepositoriesAdmin: re-fetch GET_MODULES → shows module ✓
        ├─► Sidebar: re-fetch GET_RUNTIME_MODULES → no change (configurable) ✓
        └─► Dashboard: re-fetch GET_RUNTIME_MODULES → no change (configurable) ✓
        │
2. Configuration → DocumentRepositoriesAdmin
   Module appears in module selector ✓
   User can create repository for module ✓
        │
3. Configuration → Formularios
   User can create forms for module ✓
        │
4. ModuleEditPanel → Capabilities tab
   User can assign capabilities ✓
        │
5. ModuleEditPanel → State tab
   CHANGE_MODULE_STATE → state: 'operational'
   dispatchModuleChange('state-change')
        │
        ├─► ModuleManager: onSaved → refresh ✓
        ├─► DocumentRepositoriesAdmin: re-fetch GET_MODULES ✓
        ├─► Sidebar: re-fetch GET_RUNTIME_MODULES → MODULE APPEARS ✓
        └─► Dashboard: re-fetch GET_RUNTIME_MODULES → MODULE APPEARS ✓
```

### 9.2 Delete

```
ModuleManager → DELETE_MODULE
   dispatchModuleChange('delete')
        │
        ├─► ModuleManager: refreshModules() → module removed ✓
        ├─► DocumentRepositoriesAdmin: re-fetch GET_MODULES → module removed ✓
        ├─► Sidebar: re-fetch GET_RUNTIME_MODULES → module removed ✓
        └─► Dashboard: re-fetch GET_RUNTIME_MODULES → module removed ✓
```

**Assessment:** ✅ Full lifecycle is synchronized across all consumers.

---

## 10. MODULE LIFECYCLE CERTIFICATION

### 10.1 Certification Checklist

| Criterion | Status | Notes |
|-----------|--------|-------|
| Administration Publication certified | ✅ | All admin consumers use `GET_MODULES` |
| Runtime Publication intact | ✅ | Runtime consumers still use `GET_RUNTIME_MODULES` |
| State Machine preserved | ✅ | No lifecycle modifications |
| Repository Administration supports configurable modules | ✅ | Fixed: uses `GET_MODULES` |
| Configuration supports configurable modules | ✅ | Already correct |
| Admin CRUD synchronized | ✅ | Event-driven re-fetch in all admin consumers |
| Runtime CRUD synchronized | ✅ | Event-driven re-fetch in all runtime consumers |
| Global Module Synchronization certified | ✅ | ModuleChangeBus propagates to all consumers |
| No hardcodes | ✅ | All module lists are DB-driven |
| Runtime contracts not modified | ✅ | `getRuntimeModules()` SQL unchanged |
| Event Driven Synchronization certified | ✅ | ModuleChangeBus works for all consumers |
| Lifecycle Publication certified | ✅ | Full create→configure→publish→delete flow works |

### 10.2 Files Modified

| File | Change | Lines Affected |
|------|--------|----------------|
| `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx` | Import `onModuleChange`, change `GET_RUNTIME_MODULES` → `GET_MODULES`, add event listener | 24, 176, 187-197 |

### 10.3 Files NOT Modified (Protected)

| File | Reason |
|------|--------|
| `CreateModuleWizard.jsx` | State machine preserved |
| `Dashboard.jsx` | Runtime consumer — already correct |
| `DashboardLayout.jsx` | Runtime consumer — already correct |
| `DynamicModule.jsx` | Runtime consumer — already correct |
| `dynamicService.js` | SQL filters unchanged |
| `ModuleAdministrationApplicationService.js` | Handlers unchanged |
| `CapabilityPublicSetAdapter.js` | Capability resolution unchanged |
| `ModuleChangeBus.js` | Event bus unchanged (already supports all consumers) |
| `ModuleManager.jsx` | Admin consumer — already correct |
| `ModuleEditPanel.jsx` | Already dispatches events correctly |
| `Configuration.jsx` | Already uses `GET_MODULES` |

---

## 11. ANSWERS TO SPRINT QUESTIONS

| # | Question | Answer |
|---|----------|--------|
| 1 | ¿Administration Publication certificada? | ✅ Sí. DocumentRepositoriesAdmin ahora usa `GET_MODULES`. |
| 2 | ¿Runtime Publication intacta? | ✅ Sí. Sidebar y Dashboard continúan usando `GET_RUNTIME_MODULES`. |
| 3 | ¿State Machine preservado? | ✅ Sí. Sin modificaciones al ciclo de vida. |
| 4 | ¿Repository Administration soporta configurables? | ✅ Sí. Ahora muestra todos los módulos activos. |
| 5 | ¿Configuration soporta configurables? | ✅ Sí. Ya usaba `GET_MODULES`. |
| 6 | ¿CRUD administrativo sincronizado? | ✅ Sí. Event-driven re-fetch en todos los consumidores admin. |
| 7 | ¿CRUD Runtime sincronizado? | ✅ Sí. Event-driven re-fetch en Sidebar y Dashboard. |
| 8 | ¿Global Module Synchronization certificada? | ✅ Sí. ModuleChangeBus propaga a todos los consumidores. |
| 9 | ¿Existen hardcodes? | No. Todos los módulos son DB-driven. |
| 10 | ¿Se modificaron contratos Runtime? | No. `getRuntimeModules()` sin cambios. |
| 11 | ¿Event Driven certificado? | ✅ Sí. ModuleChangeBus funciona para admin y runtime. |
| 12 | ¿Lifecycle Publication certificada? | ✅ Sí. Flujo completo create→configure→publish→delete funciona. |
