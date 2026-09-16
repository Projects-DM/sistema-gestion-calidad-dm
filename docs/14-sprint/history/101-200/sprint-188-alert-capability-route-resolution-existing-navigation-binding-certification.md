# Sprint 188 — Alert Capability Route Resolution & Existing Navigation Binding Certification (MASTER SSOT LEVEL 4)

- **Architecture Status:** LEVEL 4 — EXISTING ROUTE BINDING CERTIFIED
- **Type:** Existing Navigation Resolution Audit
- **Impact:** Alert Workspace · Core Navigation · Existing Router Binding
- **Branch:** `release/stable-sprint79` (trabajo activo; spec nominal `operativo-v1`)
- **Date:** 2026-08-01
- **Result:** **R1–R10 PASS** · Regresión Sprint 185 **B1–B10+B11 PASS** · Regresión Sprint 186 **F1–F8 PASS** · Regresión Sprint 187 **N1–N8 PASS** · Build ~2.36s · Existing Route Binding CERTIFIED

---

## 1. Objetivo

Certificar que **toda navegación emitida por Alert Workspace reutiliza exactamente las rutas existentes** del Router certificado de SGC-DM, **eliminando cualquier dependencia de rutas asumidas** (`/modulo/:slug`) que no formen parte del registro oficial.

Este Sprint **no modifica** React Router, Runtime, Binding, Visibilidad, Workspace core, Dashboard, Capability Resolver ni Assignment Engine; **no crea** rutas nuevas, Router paralelo, Navigation Engine, Repository paralelo ni Document Viewer paralelo.

## 2. Problema detectado (auditoría previa)

El Router oficial (`src/App.jsx`) registra:

```
<Route path=":moduleSlug"        element={<DynamicModule />} />      ← ruta CANÓNICA de módulo
<Route path=":moduleId"          element={<DynamicModuleById />} />
<Route path="modulo/:moduleSlug/:formSlug" element={<DynamicForm />} />  ← SOLO formularios (2 segmentos)
```

- **Ruta canónica de un módulo:** `:moduleSlug` → `/${moduleSlug}` (p.ej. `/calidad`). Así lo usan `Dashboard` (`path: \`/${mod.slug}\``), `DynamicForm` (`navigate(\`/${moduleSlug}\`)`) y `NavigationResolver.resolveRedirect`.
- **La ruta `modulo/:moduleSlug/:formSlug` existe SOLO para DynamicForm** y exige dos segmentos después de `modulo/`.
- **Bug:** `AlertMonitoringExperience` construía `/modulo/${moduleSlug}` para `open-record` y `go-to-document`. Esa ruta NO está registrada → error:
  `No routes matched location "/modulo/calidad"`.

## 3. Decisión arquitectónica

> **El Workspace NUNCA construye rutas.** Solicita al **ExistingModuleRouteResolver** la `canonicalRoute` derivada **únicamente** de las rutas registradas en el Router existente.

```
Descriptor → Route Resolver → canonicalRoute → React Router existente → Dynamic Module → Repository → Documento seleccionado
```

NUNCA: `Workspace → "/modulo/..." → React Router`.

## 4. Cambios implementados

### `core/navigation/ExistingRouteRegistry.js` (NUEVO — SSOT del Router)
- Espejo **exacto** de las rutas registradas en `App.jsx`: `login`, `dashboard`, `configuracion`, `usuarios`, `runtime-playground`, **`:moduleSlug` → DynamicModule** (canónica), `:moduleId`, **`modulo/:moduleSlug/:formSlug` → DynamicForm**.
- Cada entrada: `{ name, pattern, target, build() }` — `build()` reproduce cómo el Router interpreta el patrón. Nada se hardcodea en los callers.

### `core/navigation/ExistingModuleRouteResolver.js` (NUEVO)
- `resolveModuleRoute({ moduleSlug })` → `{ resolved, routeName, pattern, target, canonicalRoute }`. Módulo → `/${moduleSlug}` (ruta `:moduleSlug`).
- `resolveFormRoute({ moduleSlug, formSlug })` → `{ canonicalRoute: '/modulo/.../...' }` (ruta `modulo/:moduleSlug/:formSlug`, solo formularios).
- `resolveActionRoute(action, ctx)` → resuelve `open-form`/`open-record`/`go-to-document` contra el registry. **Nunca navega, nunca importa React Router, nunca crea rutas.**

### `core/navigation/index.js` (NUEVO — facade)
- Expone `EXISTING_ROUTE_REGISTRY`, `resolveModuleRoute`, `resolveFormRoute`, `resolveActionRoute`, y el `NavigationResolver` legacy sin cambios.

### `modules/experiences/AlertMonitoringExperience.jsx`
- `ACTION_ROUTE` ya NO interpola `/modulo/${moduleSlug}`. Cada acción llama `resolveActionRoute(...).canonicalRoute`:
  - `open-form` → `/modulo/:slug/:form` (ruta registrada de DynamicForm) — intacto.
  - `open-record` → `/:slug` (ruta canónica) con `state: { tab: 'records' }`.
  - `go-to-document` → `/:slug` (ruta canónica) con `state: { tab: 'repository', selectedDocumentId }`.

### Identidad (no mezclada)
- `moduleId` = identidad estable del módulo · `moduleSlug` = segmento URL · `routePath` = patrón registrado · `canonicalRoute` = ruta concreta derivada del patrón.

## 5. Validaciones — Resultados

| Validación | Resultado |
|---|---|
| El Router oficial es identificado (`App.jsx` → `:moduleSlug` → DynamicModule) | ✅ **R1** |
| No existen rutas hardcodeadas en el Workspace (solo `resolveActionRoute`) | ✅ **R2** |
| `moduleId` ≠ `moduleSlug` ≠ `routePath` correctamente diferenciados | ✅ **R3** |
| Route Resolver reutiliza únicamente rutas existentes (registry espejo de App.jsx) | ✅ **R4** |
| "Ir al documento" abre el módulo correcto (`/calidad`, nunca `/modulo/calidad`) | ✅ **R5** |
| Repositorio recibe `selectedDocumentId` vía `state` | ✅ **R6** |
| Documento queda seleccionado automáticamente (`selectedDocumentId = documentId`) | ✅ **R7** |
| "Ir al formulario" sigue funcionando como ahora (`/modulo/.../...` registrada) | ✅ **R8** |
| Sin rutas nuevas ni Router paralelo (registry espejo exacto; resolver nunca navega) | ✅ **R9** |
| 3 fuentes (form/record/document) navegan por rutas registradas; sin `open-document` | ✅ **R10** |
| Build PASS | ✅ **~2.36s** |

## 6. Restricciones cumplidas

- **No modificado:** React Router, Runtime Engine, Runtime Binding, Runtime Visibility, Workspace core (`alert/workspace/`), Dashboard, Capability Resolver, Assignment Engine.
- **No creado:** rutas nuevas, Router paralelo, Navigation Engine, Repository paralelo, Document Viewer paralelo.
- **No construidas** rutas con `/modulo/${moduleSlug}` en Alert Monitoring; el error `No routes matched location "/modulo/calidad"` desaparece.

## 7. Certificación

```
SPRINT 188 — EXISTING ROUTE BINDING CERTIFIED
  R1–R10            → PASS
  Regresión 185     → B1–B10 + B11 PASS
  Regresión 186     → F1–F8 + INT/BOUNDARY PASS
  Regresión 187     → N1–N8 PASS
  Build             → PASS (~2.36s)
```

**EXISTING ROUTE BINDING CERTIFIED.** La navegación de Alert Workspace reutiliza exclusivamente el Router existente; el error de ruta no registrada queda eliminado.
