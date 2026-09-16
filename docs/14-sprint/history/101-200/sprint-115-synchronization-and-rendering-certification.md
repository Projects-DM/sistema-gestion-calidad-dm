# Sprint 115 — Operational Runtime Synchronization & Rendering Certification (SSOT)

**Tipo:** Production Stabilization Sprint
**Estado:** LEVEL 3 — PRODUCTION READY
**Branch:** `operativo-v1`
**Build:** 0 errores, 2712 módulos
**Archivos nuevos:** 0
**Archivos modificados:** 5

---

## Objetivo

Certificar la sincronización completa entre Configuration → Persistence → DynamicModule → Operational Runtime, garantizando que el Runtime renderice **solamente** las experiencias habilitadas por el administrador.

## GAPs resueltos

### GAP-01: Runtime ignora enabledExperiences y renderiza todas las experiencias

**Categoría:** Functional GAP
**Archivos afectados:** 4 archivos

#### Causa raíz

El `NormalizationEngine` del capability pipeline elimina propiedades extra de los assignments (solo conserva `assignmentId, moduleId, packageId, version, state`). Sprint 114 intentó solucionarlo enriqueciendo en `getPackageById()`, pero esa función no conoce la configuración por módulo — devolvía **todas** las experiencias siempre.

Flujo del error:
```
Admin guarda: enabledExperiences: ['dispatches'] ✅
    ↓
listAssignmentsByModuleId → devuelve enriched assignment con enabledExperiences: ['dispatches'] ✅
    ↓
NormalizationEngine → STRIP: enabledExperiences ELIMINADO ❌
    ↓
getPackageById → devuelve enabledExperiences: [TODAS] (no sabe cuál configuró el admin) ❌
    ↓
getEnabledExperiences() → oeDef.enabledExperiences = TODAS → renderiza TODO ❌
```

#### Solución

Se implementó un canal directo que **bypasses** el NormalizationEngine:

1. **`CapabilityPublicSetAdapter`**: Almacena `_experiencesConfig` durante `listAssignmentsByModuleId` (antes del normalize). Nuevo método `getExperiencesConfig()` expone el dato.

2. **`useCapabilityPublicSet`**: Después de resolver, llama a `provider.getExperiencesConfig()` y lo pasa a `CapabilityPublicSet`.

3. **`CapabilityPublicSet`**: Nuevo parámetro `experiencesConfig` en el constructor. `getEnabledExperiences()` lo usa directamente, ignorando assignments (stripped) y definitions (estáticas).

4. **`CapabilityPublicSetAdapter.getPackageById`**: Se eliminó el enrichment incorrecto de Sprint 114 (que devolvía todas las experiencias).

Flujo corregido:
```
Admin guarda: enabledExperiences: ['dispatches'] ✅
    ↓
listAssignmentsByModuleId → almacena _experiencesConfig = { enabledExperiences: ['dispatches'], availableExperiences: [...] } ✅
    ↓
NormalizationEngine → STRIP assignments (no afecta a _experiencesConfig) ✅
    ↓
useCapabilityPublicSet → provider.getExperiencesConfig() → lo pasa a CapabilityPublicSet ✅
    ↓
getEnabledExperiences() → usa _experiencesConfig.enabledExperiences → filtro correcto ✅
    ↓
Renderiza solo: Despachos ✅
```

---

### GAP-02: Action Toolbar con scroll horizontal

**Categoría:** UX GAP
**Archivo:** `src/modules/experiences/UniversalOperationalRuntime.jsx`

**Cambios:**
- Contenedor toolbar: `flex-wrap justify-start sm:justify-end`
- Todos los botones: `whitespace-nowrap` para evitar ruptura interna
- Comportamiento:
  ```
  Desktop:  [PDF] [CSV] [Dashboard] [Importar] [Nuevo]
  Tablet:   [PDF] [CSV]
            [Dashboard] [Importar]
            [Nuevo]
  Mobile:   [PDF]  [CSV]
            [Dashboard] [Importar]
            [Nuevo]
  ```

---

### GAP-03: Responsive Hardening completo

**Verificación de todos los componentes:**

| Componente | Estado | Estrategia |
|------------|--------|------------|
| Tabs principales (DynamicModule) | ✅ | `flex-wrap gap-2 sm:gap-8` |
| Sub-tabs experiencias | ✅ | `flex-wrap gap-2` |
| Business summary bar | ✅ | `grid grid-cols-2 sm:grid-cols-5` |
| Operational Views Tabs | ✅ | `flex-wrap gap-1` |
| Search bar + Filtros | ✅ | `flex-col sm:flex-row` |
| Filter panel | ✅ | `flex-wrap gap-3` |
| Bulk actions bar | ✅ | `flex-wrap justify-end` |
| Completion summary cards | ✅ | `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` |
| Timeline modal | ✅ | `w-full max-w-2xl`, padding responsive |
| Import Workflow modal | ✅ | Componente existente responsive |
| Dashboard modal | ✅ | Componente existente responsive |
| Data table | ✅ | `overflow-x-auto` (solo scroll de tabla) |

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/core/capabilities/public/CapabilityPublicSetAdapter.js` | Store `_experiencesConfig`, nuevo `getExperiencesConfig()`, removed wrong `getPackageById` enrichment |
| `src/core/capabilities/public/CapabilityPublicSet.js` | Nuevo param `experiencesConfig`, `getEnabledExperiences()` usa config directa |
| `src/core/capabilities/public/useCapabilityPublicSet.js` | Pasa `provider.getExperiencesConfig()` al constructor de CapabilityPublicSet |
| `src/modules/experiences/UniversalOperationalRuntime.jsx` | Toolbar responsive (`flex-wrap`, `whitespace-nowrap`), bulk actions `flex-wrap` |

## Restricciones verificadas

| Prohibición | Estado |
|-------------|--------|
| `OperationalMobileRuntime` | ❌ |
| `OperationalToolbar` | ❌ |
| `OperationalRenderer` | ❌ |
| `OperationalExperienceManagerV2` | ❌ |
| `ResponsiveEngine` | ❌ |
| `DispatchRuntime` | ❌ |
| `DispatchToolbar` | ❌ |

## Resultado esperado

1. **Sincronización total**: admin configura solo Despachos → solo Despachos se renderiza
2. **Sin scroll horizontal** en toolbar, tabs, filtros, bulk actions, summary cards
3. **Toolbar responsive**: wrapping automático según viewport
4. **Zero nueva infraestructura**: todo dentro del pipeline certificado
5. Despachos queda **lista para operación diaria**
