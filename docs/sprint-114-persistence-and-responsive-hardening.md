# Sprint 114 — Operational Experience Persistence & Responsive Hardening (SSOT)

**Tipo:** Production Hardening Sprint
**Estado:** LEVEL 3 — PRODUCTION READY
**Branch:** `operativo-v1`
**Build:** 0 errores, 2712 módulos
**Archivos nuevos:** 0
**Archivos modificados:** 4

---

## Objetivo

Corregir GAPs funcionales encontrados durante la operación real de la primera experiencia operacional: persistencia real de configuración, renderizado responsive, eliminación de redundancia visual.

## GAPs resueltos

### GAP-01: La configuración de experiencias operacionales no persiste

**Categoría:** Functional GAP
**Archivo:** `src/core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js`

**Causa raíz:**
El método `replaceAssignmentsForModule` normalizaba los assignments eliminando `enabledExperiences` del objeto operational-experiences antes de guardarlo en `sgc_modules.capabilities`.

Flujo:
```
ModuleEditPanel.saveCapabilities()
    ↓
assignment.enabledExperiences = ['dispatches']  ✅
    ↓
ModuleCapabilityPersistenceAdapter.replaceAssignmentsForModule()
    ↓
normalized = assignments.map(a => { assignmentId, moduleId, packageId, state, owner, version, orderIndex })
    ↓
❌ enabledExperiences ELIMINADO
    ↓
DB: sgc_modules.capabilities = [{ packageId: 'pkg:standard:operational-experiences', ... }]  ❌ sin enabledExperiences
    ↓
Al recargar → ModuleEditPanel no encuentra enabledExperiences → activa TODAS por defecto
```

**Fix:** Preservar `enabledExperiences` en la normalización cuando `packageId === operational-experiences`.

**Estado:** CORREGIDO

---

### GAP-02: Tabs del módulo no son responsive

**Categoría:** UX GAP
**Archivo:** `src/pages/DynamicModule.jsx`

**Antes:**
```jsx
<div className="flex border-b border-gray-200 gap-8">
```
→ scroll horizontal en móvil

**Después:**
```jsx
<div className="flex flex-wrap border-b border-gray-200 gap-2 sm:gap-8">
```
→ wrapping automático, sin scroll

**Estado:** CORREGIDO

---

### GAP-03: Sub-tabs de experiencias no son responsive

**Categoría:** UX GAP
**Archivo:** `src/pages/DynamicModule.jsx`

**Antes:**
```jsx
<div className="flex gap-2 border-b border-gray-200 pb-2">
```

**Después:**
```jsx
<div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
```

**Estado:** CORREGIDO

---

### GAP-04: Action buttons no son responsive

**Categoría:** UX GAP
**Archivo:** `src/modules/experiences/UniversalOperationalRuntime.jsx`

**Antes:**
```jsx
<div className="flex items-center gap-3 w-full sm:w-auto">
```

**Después:**
```jsx
<div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
```

Comportamiento:
```
Desktop:   PDF | CSV | Dashboard | Importar | Nuevo
Mobile:    PDF  CSV
           Dashboard  Importar
           Nuevo
```

**Estado:** CORREGIDO

---

### GAP-05: Título redundante en Runtime

**Categoría:** UX GAP
**Archivo:** `src/modules/experiences/UniversalOperationalRuntime.jsx`

**Antes:**
```
Despachos                   [PDF] [CSV] [Dashboard] [Importar] [Nuevo]
Registro, historial...
```
→ "Despachos" repetido (ya visible en sub-tab y KPIs)

**Después:**
```
                            [PDF] [CSV] [Dashboard] [Importar] [Nuevo]
Registro, historial...
```
→ Eliminado el título redundante. Solo se muestra la descripción si existe.

**Estado:** CORREGIDO

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js` | Persistir `enabledExperiences` en operational-experiences |
| `src/pages/DynamicModule.jsx` | `flex-wrap` en tabs principales y sub-tabs de experiencias |
| `src/modules/experiences/UniversalOperationalRuntime.jsx` | `flex-wrap` en action buttons + eliminar título redundante |

## Restricciones verificadas

| Prohibición | Estado |
|-------------|--------|
| `OperationalToolbar` | ❌ — no creado |
| `OperationalMobileRuntime` | ❌ — no creado |
| `OperationalExperienceManagerV2` | ❌ — no creado |
| `OperationalResponsiveEngine` | ❌ — no creado |
| `CapabilityPersistenceService` | ❌ — no creado |

## Resultado esperado

1. **Persistencia real**: admin selecciona Despachos → guarda → recarga → solo Despachos aparece
2. **Tabs responsive**: wrapping automático sin scroll horizontal en móvil
3. **Sub-tabs responsive**: experiencias envueltas automáticamente
4. **Action buttons responsive**: toolbar se adapta a cualquier viewport
5. **Sin redundancia**: el Runtime muestra solo contenido útil

La aplicación queda preparada para operación diaria desde dispositivos móviles.
