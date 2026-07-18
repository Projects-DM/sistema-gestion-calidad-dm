# Sprint 79 — Operational Experiences Capability Foundation & Dispatches Migration

## Certification Status: ✅ CERTIFIED (pending manual approval)

## Summary

Sprint 79 implements a **pluggable operational experiences capability** that allows any module in the system to enable reusable, domain-specific feature sets (like "Despachos") via the `operational-experiences` capability, following the same Capability Architecture as forms/records/repository.

The first experience migrated is **Dispatches** — previously hardcoded as a standalone page (`/trazabilidad/despachos`) — now rendered as a pluggable experience within the DynamicModule Standard Shell via `/:moduleSlug` routing.

---

## Architecture

### New Files Created

| File | Purpose |
|------|---------|
| `src/core/capabilities/experiences/OperationalExperienceRegistry.js` | SSOT registry for operational experiences. Exposes `registerExperience()`, `listExperiences()`, `getExperience()`, `resolveComponent()`. No React/Runtime coupling. |
| `src/modules/experiences/dispatches/DispatchesExperience.jsx` | First experience: reusable dispatch management wrapping existing `despachosService`, `dispatchesPdf`, etc. Accepts `moduleSlug`/`moduleName` props. |

### Files Modified

| File | Change |
|------|--------|
| `src/core/capabilities/CapabilityPackageRegistry.js` | Added `operational-experiences` package (category: operational-experiences, icon: Zap, order: 4, enabledByDefault: false) |
| `src/core/capabilities/public/CapabilityPublicSetAdapter.js` | Enriches `operational-experiences` assignments with available experiences from `OperationalExperienceRegistry`. Added `getEnabledExperiences()` to `CapabilityPublicSet`. |
| `src/core/capabilities/public/CapabilityPublicSet.js` | Added `getEnabledExperiences()` method returning enabled experience descriptors. |
| `src/pages/DynamicModule.jsx` | Added `OperationalExperiencesContent` component with lazy loading + experience sub-tabs. Added `operational-experiences` case in `renderTabContent()` switch. |
| `src/components/workspace/CreateModuleWizard.jsx` | Added operational-experiences capability with sub-experience checkbox selection, experience preview, `Zap` icon. |
| `src/components/workspace/ModuleEditPanel.jsx` | Added experience sub-selection UI, `toggleExperience()`, `enabledExperiences` state, save logic for experience metadata. |
| `src/App.jsx` | **Removed** hardcoded `/trazabilidad` and `/trazabilidad/despachos` routes. Removed `Traceability` and `Dispatches` page imports. Trazabilidad now routes through `/:moduleSlug` → DynamicModule. |

### Unchanged Files (Invariant)

- `src/core/runtimeRuntime.js` — No modifications
- `src/core/capabilities/moduleCapabilityResolution/NormalizationEngine.js` — No modifications
- `src/core/capabilities/moduleCapabilityResolution/CapabilitySetBuilder.js` — No modifications
- `src/core/capabilities/ModuleCapabilityResolver.js` — No modifications
- `src/pages/DynamicForm.jsx` — No modifications
- `src/services/despachosService.js` — No modifications (shared utility)
- `src/utils/dispatchesPdf.js` — No modifications (shared utility)
- `src/config/dispatchesConfig.js` — No modifications (shared utility)

---

## Certification Checks

| # | Check | Status | Details |
|---|-------|--------|---------|
| 1 | Build passes with 0 errors | ✅ | 2,414 modules transformed, 1.88s |
| 2 | Main chunk ≤ 2,100 KB | ✅ | 1,503.98 KB (reduced from 2,003 KB by extracting Dispatches lazy chunk) |
| 3 | No hardcoded module references in App.jsx | ✅ | Only `:moduleSlug` and `:moduleId` dynamic routes |
| 4 | No Traceability/Dispatches imports in App.jsx | ✅ | Confirmed: no `import Traceability` or `import Dispatches` |
| 5 | OperationalExperienceRegistry exists and is pure | ✅ | No React/Supabase/Runtime coupling |
| 6 | DispatchesExperience wraps existing services | ✅ | Uses `despachosService`, `dispatchesPdf`, `dispatchesConfig` |
| 7 | Experience lazy-loaded in DynamicModule | ✅ | `OperationalExperienceRegistry.resolveComponent()` → dynamic import |
| 8 | CapabilityPublicSetAdapter enriches operational-experiences | ✅ | Adds available experiences from registry |
| 9 | CreateModuleWizard supports experience sub-selection | ✅ | Checkbox UI for enabling individual experiences |
| 10 | ModuleEditPanel supports experience sub-selection | ✅ | Checkbox UI + save logic with `enabledExperiences` metadata |
| 11 | No modifications to Runtime/DynamicForm/motor dinámico | ✅ | Verified |
| 12 | No modifications to capability assignment service / capability registry / operational layer | ✅ | Only CapabilityPackageRegistry extended with new package |
| 13 | Sidebar renders all 7 operational modules | ✅ | Configuración, Trazabilidad, Operaciones, Mantenimiento, Calidad, Medición y Control, Gestión Documental |
| 14 | Trazabilidad has operational-experiences capability | ✅ | BD: caps=["forms","records","repository","operational-experiences"], enabledExperiences=["dispatches"] |
| 15 | No orphaned route references | ✅ | Old pages (Traceability.jsx, Dispatches.jsx) exist but are unreachable from router |

---

## Sidebar Modules (Sprint 79 Final State)

| Module | Slug | State | Capabilities |
|--------|------|-------|--------------|
| Configuración | configuracion | operational | [] (core) |
| Trazabilidad | trazabilidad | operational | forms, records, repository, **operational-experiences** [dispatches] |
| Operaciones | operaciones | operational | forms, records, repository |
| Mantenimiento | mantenimiento | operational | forms, records, repository |
| Calidad | calidad | operational | forms, records, repository |
| Medición y Control | medicion-control | operational | forms, records, repository |
| Gestión Documental | gestion-documental | operational | forms, records, repository |

---

## Pending Cleanup (Not Blockers)

1. `src/pages/Traceability.jsx` — Orphaned, unreachable from router. Can be deleted in next sprint.
2. `src/pages/Dispatches.jsx` — Orphaned, unreachable from router. Can be deleted in next sprint.
3. `docs/12-database/sql_seed_data.sql` — Contains old migrated module INSERTs flagged since Sprint 78.
4. `docs/12-database/sql_setup_dynamic.sql` — Contains old migrated module INSERTs flagged since Sprint 78.

---

## Build Summary

```
vite v8.0.10 building client environment for production...
✓ 2414 modules transformed.
dist/index.html                              1.00 kB │ gzip:   0.47 kB
dist/assets/index-ChI9EUei.js            1,503.98 kB │ gzip: 422.06 kB  ← main (reduced)
dist/assets/DispatchesExperience-D-q85aLC.js   491.59 kB │ gzip: 155.29 kB ← lazy experience
dist/assets/supabase-DG2SFwSi.js          195.53 kB │ gzip:  49.96 kB
dist/assets/html2canvas-B2iW1LSc.js      199.61 kB │ gzip:  46.82 kB
dist/assets/index.es-CHyqZrYb.js         151.46 kB │ gzip:  48.92 kB
✓ built in 1.88s
```

---

## NO COMMIT — Awaiting Manual Approval

This certification is provided for **manual audit only**. No git commit has been made.
Deploy to GitHub Pages is blocked (no `gh auth` in environment).
