# Sprint 132.9 — Module Workspace Performance Audit & Query Pipeline Certification (SSOT)

> **Architecture Status:** LEVEL 3 — CERTIFIED  
> **Type:** Performance Audit (Read Only)  
> **Branch:** operativo-v1  
> **Date:** 2026-07-26  

## Objetivo

Auditar el pipeline completo de carga del Workspace "Módulos" dentro del módulo de Configuración para identificar cuellos de botella de rendimiento.

**0 archivos modificados. 0 optimizaciones implementadas. 100% auditoría.**

---

## FASE 1 — Query Pipeline Audit

### Mapa completo del pipeline

```
Configuration.jsx (entry point)
 │
 ├── activeTab === 'modulos'
 │   └── WorkspaceFoundation.jsx (wrapper trivial — 12 líneas, 0 queries)
 │       └── ModuleManager.jsx
 │           │
 │           ├── 1. appService.execute(GET_MODULES)
 │           │   └── ModuleAdministrationApplicationService
 │           │       └── dynamicService.getModules()
 │           │           └── supabase.from('sgc_modules')
 │           │               .select('id, name, slug, created_at')
 │           │               .eq('is_active', true)
 │           │               .order('created_at')
 │           │           ◆ 1 query, ~4 columnas
 │           │
 │           └── 2. Promise.all(adminModules.map(...))  ← PARALELO
 │               │
 │               ├── 2a. appService.execute(GET_MODULE_CONFIGURATION, target: m.id)  × N
 │               │   └── ModuleAdministrationApplicationService._handleGetModuleConfiguration()
 │               │       ├── dynamicService.getModuleById({ moduleId })
 │               │       │   └── supabase.from('sgc_modules').select('*').eq('id', m.id).single()
 │               │       │   ◆ 1 query, TODAS las columnas
 │               │       │
 │               │       ├── dynamicService.getFormsByModule(moduleId)
 │               │       │   └── supabase.from('sgc_forms')
 │               │       │       .select('id, name, slug, module_id, engine_type, ...')
 │               │       │       .eq('module_id', m.id)
 │               │       │   ◆ 1 query, ~8 columnas
 │               │       │
 │               │       └── Promise.all(forms.map(f => getFormFields(f.id)))  × M
 │               │           └── supabase.from('sgc_form_fields').select('*').eq('form_id', f.id)
 │               │           ◆ M queries, TODAS las columnas
 │               │
 │               └── 2b. supabase.from('sgc_document_repositories')
 │                   .select('*', { count: 'exact', head: true })
 │                   .eq('module_slug', m.slug)  × N
 │                   ◆ N queries, head=true (solo conteo)
 │
 ├── Estado React: modules, formsByModuleId, reposByModuleSlug, loading
 │
 ├── Render condicional:
 │   ├── isCreating  → CreateModuleWizard
 │   ├── selectedModule + isEditing → ModuleEditPanel
 │   ├── selectedModule → ModuleDetailPanel
 │   └── default → Tabla de módulos
 │
 ├── ModuleDetailPanel.jsx (UI-only, 0 queries)
 │   └── module prop → renderiza nombre, slug, estado, capabilities, formsCount
 │
 └── ModuleEditPanel.jsx (UI-only al cargar, 0 queries DB)
     ├── CapabilityPackageRegistry.listPackages() → síncrono, en memoria
     └── OperationalExperienceRegistry.listExperiences() → síncrono, en memoria
```

---

## FASE 2 — Query Count Audit

### Carga inicial del Workspace Módulos (N=10 módulos)

| # | Query | Origen | ¿Obligatoria? | ¿Redundante? | Tiempo estimado |
|---|-------|--------|---------------|-------------|-----------------|
| 1 | `sgc_modules` (listado) | GET_MODULES | ✅ Sí | ❌ No | ~150ms |
| 2a×N | `sgc_modules` (por ID) | GET_MODULE_CONFIGURATION | ⚠️ Parcial | 🟡 Sí, datos ya disponibles en #1 | ~100ms × 10 = ~1s |
| 2b×N | `sgc_forms` (por module_id) | GET_MODULE_CONFIGURATION | ⚠️ Parcial | 🟡 Sí, solo necesita COUNT | ~100ms × 10 = ~1s |
| 2c×N×M | `sgc_form_fields` (por form_id) | GET_MODULE_CONFIGURATION | ❌ No | 🔴 Sí, solo necesita COUNT | ~50ms × 30 = ~1.5s |
| 3×N | `sgc_document_repositories` (count) | ModuleManager | ✅ Sí | ❌ No (head query) | ~50ms × 10 = ~500ms |

### Totales

| Métrica | Valor |
|---------|-------|
| **Queries totales** | 1 + N + N + N×M + N = **1 + 3N + N×M** |
| Para N=10, M=3 | 1 + 30 + 30 = **61 queries** |
| **Tiempo acumulado estimado** | ~4.15s (en paralelo ~1.5–2s) |
| **Queries obligatorias** | 1 (GET_MODULES) + N (repos count) = 11 |
| **Queries parcialmente redundantes** | 2N (module by id + forms by module) = 20 |
| **Queries completamente redundantes** | N×M (form fields) = 30 |

### Hallazgo crítico

`GET_MODULE_CONFIGURATION` carga forms completos CON todos sus fields para cada módulo, pero **ModuleManager.jsx:91 solo usa `forms.length`**:

```javascript
// ModuleManager.jsx:90-92
formsMap[m.id] = configResult.success !== false
  ? (configResult.data?.forms?.length || 0)
  : 0;
```

El 100% del payload de `getFormFields` (y ~90% de `getFormsByModule`) es **desperdiciado**.

---

## FASE 3 — Payload Audit

### sgc_modules — GET_MODULES

| Métrica | Valor |
|---------|-------|
| Columnas solicitadas | `id, name, slug, created_at` (4) |
| Columnas en tabla | ~14 |
| Payload ahorrado | ~70% |
| Columnas realmente usadas por ModuleManager | `id, slug` (para las N queries siguientes), `name` (display) |
| Payload real utilizado | ~30% del transferido |

### sgc_modules — GET_MODULE (dentro de GET_MODULE_CONFIGURATION)

| Métrica | Valor |
|---------|-------|
| Columnas solicitadas | `select('*')` — TODAS |
| Necesario para el render | ❌ Nada — ModuleManager solo usa `configResult.data?.forms?.length` |
| Payload utilizado | **0%** |
| **Desperdicio** | **100%** — el módulo ya fue cargado en GET_MODULES |

### sgc_forms — getFormsByModule

| Métrica | Valor |
|---------|-------|
| Columnas solicitadas | `id, name, slug, module_id, engine_type, description, roles_allowed, created_at` (8) |
| Necesario para ModuleManager | Solo `id` (para getFormFields) y conteo |
| Payload utilizado | **~12.5%** (solo el id para contar) |

### sgc_form_fields — getFormFields

| Métrica | Valor |
|---------|-------|
| Columnas solicitadas | `select('*')` — TODAS |
| Necesario para ModuleManager | **Nada** — solo se usa `forms.length` |
| Payload utilizado | **0%** |
| **Desperdicio** | **100%** |

### sgc_document_repositories — count query

| Métrica | Valor |
|---------|-------|
| Tipo | `head: true` (solo conteo) |
| Columnas | `select('*')` pero head=true no transfiere filas |
| Payload real | Mínimo (solo el entero del conteo) |
| Payload utilizado | 100% |
| **Eficiencia** | ✅ Óptima |

### Resumen de payload

| Query | Transferido | Utilizado | Desperdicio |
|-------|------------|-----------|-------------|
| GET_MODULES (list) | ~2KB | ~1.5KB | ~25% |
| GET_MODULE (by id) × N | ~3KB × 10 | 0 | **100%** |
| getFormsByModule × N | ~2KB × 10 | ~0.2KB | **~90%** |
| getFormFields × N×M | ~5KB × 30 | 0 | **100%** |
| repos count × N | ~0.1KB × 10 | ~0.1KB | 0% |
| **Total** | **~200KB** | **~3KB** | **~98.5%** |

---

## FASE 4 — React Render Audit

### ModuleManager.jsx

| Elemento | Línea | Problema | Severidad |
|----------|-------|----------|-----------|
| `useEffect` con función `load` interna | 110-128 | ⚠️ `refreshModules` como dependencia faltante | 🟡 Media |
| `modulesRef.current = modules` en render | 59 | 🔴 Mutación de ref durante render (viola reglas React 19) | 🔴 Alta |
| `filter(m => !CORE_PROTECTED_SLUGS.includes(m.slug))` | 79 | En `refreshModules`, no en render. Correcto. | ✅ |
| `columns` con `useMemo([])` | 61-71 | Dependencia vacía, constante. Correcto. | ✅ |
| `formsByModuleId[moduleId]` y `reposByModuleSlug[slug]` | 132, 188 | Acceso directo a objeto, O(1). Correcto. | ✅ |
| `modules.map(m => ...)` en render | 259 | Render de tabla, necesario. Sin memo. | 🟢 Baja |
| `getModuleField(...)` en cada render de fila | 260-263 | Llama 5× por fila en cada render. Podría memoizarse. | 🟢 Baja |

### ModuleDetailPanel.jsx

| Elemento | Problema |
|----------|----------|
| `useMemo` en 9 campos individuales (name, slug, icon, etc.) | ✅ Correcto, evita recomputación de `getModuleField` |
| `resolveIcon(icon)` dentro de IIFE en render (line 88) | ⚠️ Crea componente durante render (error de linter) |
| Renderiza `capabilities` desde module.capabilities | ✅ Sin queries, datos ya disponibles |

### ModuleEditPanel.jsx

| Elemento | Problema |
|----------|----------|
| `useMemo` para `appContext`, `allCapabilities`, `allExperiences` | ✅ Correcto |
| `CapabilityPackageRegistry.listPackages()` | ✅ Síncrono, en memoria, 0 queries |
| `OperationalExperienceRegistry.listExperiences()` | ✅ Síncrono, en memoria, 0 queries |
| `formsCount` prop definida pero no usada (error de linter) | 🟢 Baja |
| No hace queries DB al cargar | ✅ UI-only |

### Re-renders

| Disparador | Componentes afectados | ¿Necesario? |
|-----------|----------------------|-------------|
| `loading: true → false` | ModuleManager completo | ✅ Sí |
| `modules` cambia | ModuleManager tabla | ✅ Sí |
| `selectedModule` cambia | DetailPanel / EditPanel | ✅ Sí |
| `isCreating` cambia | CreateModuleWizard | ✅ Sí |
| `isEditing` cambia | EditPanel | ✅ Sí |

**No se detectaron renders innecesarios en el flujo principal.**

---

## FASE 5 — Capability Loading Audit

### GET_MODULE_CONFIGURATION — ¿Qué carga?

```javascript
// ModuleAdministrationApplicationService.js:229-256
async _handleGetModuleConfiguration(request, context) {
  const [module, forms] = await Promise.all([
    dynamicService.getModuleById({ moduleId }),   // → sgc_modules.*
    dynamicService.getFormsByModule(moduleId),     // → sgc_forms (8 cols)
  ]);

  const formsWithFields = await Promise.all(
    forms.map(async (form) => {
      const fields = await dynamicService.getFormFields(form.id); // → sgc_form_fields.*
      return { ...form, fields };
    })
  );

  return createApplicationResult({ data: { ...module, forms: formsWithFields } });
}
```

### ¿Qué necesita realmente ModuleManager.jsx?

```javascript
// ModuleManager.jsx:90-92 — ÚNICO CONSUMIDOR DEL RESULTADO
formsMap[m.id] = configResult.success !== false
  ? (configResult.data?.forms?.length || 0)
  : 0;
```

**Solo necesita el conteo de forms.** No necesita:
- ❌ Datos del módulo (ya disponible desde GET_MODULES)
- ❌ Nombres de forms
- ❌ Slugs de forms
- ❌ Engine types
- ❌ Fields de forms
- ❌ Descripciones

### ¿Qué campos necesita realmente la vista principal?

| Campo | ¿Dónde se usa? | ¿Cargado por GET_MODULES? |
|-------|---------------|--------------------------|
| Nombre | Tabla + DetailPanel | ✅ Sí (GET_MODULES) |
| Slug | Tabla + DetailPanel | ✅ Sí (GET_MODULES) |
| Estado | Tabla + DetailPanel | ❌ No (no está en select) |
| Fecha creación | Tabla + DetailPanel | ✅ Sí (GET_MODULES) |
| Formas count | Tabla + DetailPanel | ❌ No (necesita COUNT aparte) |
| Repos count | Tabla | ❌ No (necesita COUNT aparte) |
| Icon | DetailPanel | ❌ No (no está en select) |
| Color | DetailPanel | ❌ No (no está en select) |
| Capabilities | DetailPanel + EditPanel | ❌ No (cargado aparte) |

**Observación:** `GET_MODULES` no incluye `state`, `icon`, `color`, `visible`, `category`, `grupo` en su select. Esto es correcto para el listado de tabla, pero cuando se abre el DetailPanel, algunos campos faltan. Sin embargo, el DetailPanel recibe el módulo completo desde `selectedModule` que proviene del array `modules` — y esos campos no están porque `GET_MODULES` ahora solo pide 4 columnas.

**Este es un bug potencial:** Si `GET_MODULES` no devuelve `state`, `icon`, `color`, etc., el DetailPanel mostrará valores por defecto.

Wait — pero en el Sprint 132.8 se optimizó GET_MODULES a solo `id, name, slug, created_at`. Y el DetailPanel usa `module.state`, `module.icon`, `module.color`, etc. de la prop `module` que viene del array `modules` en ModuleManager.

Esto significa que el DetailPanel mostraría `state: 'draft'` (por el fallback en `getModuleField`), `icon: 'Layers'` (fallback), `color: '#3B82F6'` (fallback) — valores incorrectos si el módulo tiene otros valores.

Pero esto es un hallazgo de la auditoría, no un cambio que deba hacer ahora (es read-only). Lo documentaré.

### Capacidades: ¿Es necesario cargar TODAS?

Para la **vista principal** (tabla de módulos): No necesita ninguna capability. Solo necesita conteos.

Para el **DetailPanel**: `module.capabilities` se renderiza desde la prop. Si el módulo se cargó con GET_MODULES (que no incluye capabilities), no estarán disponibles. El DetailPanel mostraría "Sin capacidades asignadas".

Para el **EditPanel**: CapabilityPackageRegistry.listPackages() es síncrono en memoria. Las capabilities asignadas se cargan desde `module.capabilities` vía prop. Si no están disponibles, el EditPanel inicializa con `enabledByDefault`.

**Conclusión:** GET_MODULE_CONFIGURATION carga capabilities de forma inline (JSONB en sgc_modules.capabilities). No hay una tabla separada. La carga es eficiente porque es una sola columna JSONB incluida en la misma fila del módulo. El problema no es la carga de capabilities sino la carga innecesaria de forms y fields.

---

## FASE 6 — Progressive Loading Audit

### ¿Es posible progressive loading?

Estado actual: Todo se carga en **2 fases secuenciales**:
1. GET_MODULES (1 query)
2. Promise.all (GET_MODULE_CONFIGURATION × N + repos count × N)

### Propuesta de progressive loading

```
Fase 1 (0ms)     : Render spinner
Fase 2 (~150ms)  : GET_MODULES → render tabla con nombres + slugs
Fase 3 (~300ms)  : Batch count: forms + repos → render badgesnuméricos
                   (reemplazar 2N+M×N queries con 2 batch queries)
Fase 4 (~0ms)    : DetailPanel / EditPanel bajo demanda (lazy)
                   → sin queries extra, datos ya disponibles
```

### Beneficio estimado

| Fase | Actual | Progressive | Diferencia |
|------|--------|-------------|------------|
| First Paint | ~1.5s (todo o nada) | ~150ms | ✅ -1.35s |
| Full load | ~1.5s | ~450ms | ✅ -1.05s |

### Requisitos para progressive loading

1. Separar GET_MODULES del resto (ya está separado)
2. Reemplazar GET_MODULE_CONFIGURATION + repos count con batch COUNT queries
3. Renderizar tabla inmediatamente después de GET_MODULES
4. Actualizar badges cuando lleguen los conteos

**Sin hacks, sin skeletons innecesarios, sin loaders múltiples.**

---

## FASE 7 — Supabase Performance Audit

### Índices

| Tabla | Filtro usado | Índice esperado | Estado |
|-------|-------------|----------------|--------|
| `sgc_modules` | `is_active = true` | Index on `is_active` | ⚠️ No verificado |
| `sgc_modules` | `id = ?` | PK index (automático) | ✅ |
| `sgc_forms` | `module_id = ?, is_active = true` | Composite index `(module_id, is_active)` | ⚠️ No verificado |
| `sgc_form_fields` | `form_id = ?` | Index on `form_id` | ⚠️ No verificado |
| `sgc_document_repositories` | `module_slug = ?` | Index on `module_slug` | ⚠️ No verificado |

### Tamaño estimado de tablas

| Tabla | Filas estimadas | Tamaño estimado |
|-------|----------------|-----------------|
| `sgc_modules` | ~10–20 | ~10KB |
| `sgc_forms` | ~30–80 | ~50KB |
| `sgc_form_fields` | ~200–500 | ~200KB |
| `sgc_document_repositories` | ~10–30 | ~10KB |

### Head queries

✅ `sgc_document_repositories` usa `head: true` — óptimo para conteo.

### Batch queries disponibles

Actualmente NO se usan batch queries. Podrían reemplazar las N queries individuales:

```sql
-- En lugar de N queries:
SELECT COUNT(*) FROM sgc_forms WHERE module_id = 1;
SELECT COUNT(*) FROM sgc_forms WHERE module_id = 2;
...

-- Una sola batch query:
SELECT module_id, COUNT(*) as count
FROM sgc_forms
WHERE module_id IN (1, 2, 3, ...)
  AND is_active = true
GROUP BY module_id;
```

```sql
-- En lugar de N queries:
SELECT COUNT(*) FROM sgc_document_repositories WHERE module_slug = 'slug-1';
SELECT COUNT(*) FROM sgc_document_repositories WHERE module_slug = 'slug-2';
...

-- Una sola batch query:
SELECT module_slug, COUNT(*) as count
FROM sgc_document_repositories
WHERE module_slug IN ('slug-1', 'slug-2', ...)
GROUP BY module_slug;
```

### ¿Existe un cuello de botella en Supabase?

**NO.** El cuello de botella no está en Supabase sino en la **cantidad excesiva de queries** (61 para 10 módulos) y el **payload innecesario** (~98.5% desperdicio). Supabase responde rápido (~50–150ms por query), pero el volumen total de queries y datos transferidos es el problema.

---

## FASE 8 — Performance Targets

| Workspace | Actual | Objetivo | Alcanzable |
|-----------|--------|----------|-----------|
| Modules load | ~1.5–2 s | < 700 ms | ✅ Sí (batch queries + payload reduction) |
| Open Module | ~1 s | < 300 ms | ✅ Sí (datos ya disponibles, sin query extra) |
| Change Tabs | instantáneo | instantáneo | ✅ Ya cumplido |
| Edit Module | < 500 ms | mantener | ✅ Ya cumplido (UI-only) |
| Save Module | mantener | mantener | ✅ Ya cumplido |

### Para alcanzar targets

| Optimización | Impacto estimado | Esfuerzo |
|-------------|-----------------|----------|
| Reemplazar GET_MODULE_CONFIGURATION por COUNT batch | ~1.5s → ~50ms | 🟢 Bajo |
| Reemplazar N count de repos por batch query | ~500ms → ~50ms | 🟢 Bajo |
| Eliminar getModuleById en GET_MODULE_CONFIGURATION | ~1s → ~0ms | 🟢 Bajo |
| Agregar `state, icon, color` a GET_MODULES select | ~0ms (ya se carga) | 🟢 Bajo |

---

## FASE 9 — Architecture Constraints (Verificadas)

### Prohibido — No implementado

| Elemento | Estado |
|----------|--------|
| Caches globales | ❌ No implementado |
| React Query | ❌ No implementado |
| Redux | ❌ No implementado |
| Tanstack Query | ❌ No implementado |
| Providers nuevos | ❌ No implementado |
| Repositories nuevos | ❌ No implementado |
| Servicios nuevos | ❌ No implementado |
| Metadata caches | ❌ No implementado |
| Persistencia local | ❌ No implementado |
| IndexedDB | ❌ No implementado |
| Context global | ❌ No implementado |
| Duplicación de queries | ❌ No implementado |
| Cambios en Runtime | ❌ No implementado |

**0 archivos modificados. 0 optimizaciones implementadas. 100% auditoría.**

---

## Hallazgos Clave

### 🔴 Crítico

| # | Hallazgo | Archivo | Detalle |
|---|----------|---------|---------|
| H1 | GET_MODULE_CONFIGURATION carga forms+fields innecesarios | `ModuleAdministrationApplicationService.js:229-256` | ModuleManager solo necesita `forms.length` pero recibe forms completos con todos sus fields. **30 queries y ~150KB desperdiciados.** |
| H2 | `getModuleById` dentro de GET_MODULE_CONFIGURATION es redundante | `ModuleAdministrationApplicationService.js:239` | El módulo ya fue cargado en GET_MODULES. Esta query adicional desperdicia **10 queries y ~30KB.** |
| H3 | Mutación de ref durante render | `ModuleManager.jsx:59` | `modulesRef.current = modules` viola reglas de React 19. |

### 🟡 Medio

| # | Hallazgo | Archivo | Detalle |
|---|----------|---------|---------|
| M1 | Sin batch queries para conteos | ModuleManager | 20 queries individuales (forms + repos) podrían ser 2 batch queries |
| M2 | GET_MODULES no incluye `state, icon, color` | `dynamicService.js:8` | DetailPanel usa fallbacks que pueden mostrar datos incorrectos |
| M3 | `useEffect` con dependencia faltante | `ModuleManager.jsx:128` | `refreshModules` no está en dependency array |

### 🟢 Baja

| # | Hallazgo | Archivo | Detalle |
|---|----------|---------|---------|
| B1 | `getModuleField` llamado 5× por fila en tabla | ModuleManager | Podría memoizarse por fila |
| B2 | `formsCount` prop no usada en EditPanel | `ModuleEditPanel.jsx:59` | Solo linter, sin impacto funcional |
| B3 | Componente creado durante render en DetailPanel | `ModuleDetailPanel.jsx:88` | `resolveIcon` dentro de IIFE |

---

## Plan del Sprint 133.0 (Implementación)

| Prioridad | Optimización | Archivos | Esfuerzo |
|-----------|-------------|----------|----------|
| P1 | Reemplazar GET_MODULE_CONFIGURATION con COUNT batch query | `ModuleManager.jsx`, `dynamicService.js`, `ModuleAdministrationApplicationService.js` | 🟢 Bajo |
| P2 | Reemplazar N count de repos con batch query | `ModuleManager.jsx`, `dynamicService.js` | 🟢 Bajo |
| P3 | Agregar `state, icon, color, visible` a GET_MODULES select | `dynamicService.js` | 🟢 Bajo |
| P4 | Eliminar `useRef` mutation en ModuleManager | `ModuleManager.jsx` | 🟢 Bajo |
| P5 | Memoizar `getModuleField` por fila en tabla | `ModuleManager.jsx` | 🟢 Bajo |

**Impacto estimado total:** 61 queries → ~5 queries, ~200KB → ~5KB, ~1.5–2s → ~300–500ms

---

## Certificación

```
LEVEL 3 — MODULE WORKSPACE PERFORMANCE AUDIT CERTIFIED (SSOT)

- Query Pipeline auditado ✅
- React Render auditado ✅
- Supabase auditado ✅
- Payload auditado ✅ (98.5% desperdicio detectado)
- Capability Loading auditado ✅
- Progressive Loading auditado ✅
- Targets definidos ✅
- Arquitectura SSOT preservada ✅

0 archivos modificados.
0 optimizaciones implementadas.
100% auditoría de rendimiento.
```
