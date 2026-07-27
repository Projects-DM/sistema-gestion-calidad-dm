# Sprint 132.7 — Configuration Workspace Performance Audit (Certificación)

> **Fecha:** 2026-07-26  
> **Objetivo:** Auditar el pipeline completo de render del workspace de Configuración (pestañas "Formularios Dinámicos" y "Módulos") para identificar cuellos de botella de rendimiento.  
> **Tipo:** Read-only audit — NO se permiten optimizaciones en este sprint.

---

## Arquitectura del Pipeline

```
Configuration.jsx
 ├── Pestaña: Formularios Dinámicos
 │   ├── appService.execute(GET_MODULES)          → sgc_modules (1 query)
 │   ├── for (m of modules) SEQUENTIAL LOOP       → N queries a sgc_forms
 │   │   └── dynamicService.getFormsByModule(m.id)
 │   ├── setSelectedModule / setSelectedForm       → estado React
 │   ├── DynamicForm.jsx
 │   │   ├── getFormBySlug(formSlug)               → sgc_forms (1 query)
 │   │   └── getFormFields(form.id)                → sgc_form_fields (1 query)
 │   └── FormBuilder (edición inline de campos)
 │
 └── Pestaña: Módulos
     └── WorkspaceFoundation.jsx (wrapper trivial)
         └── ModuleManager.jsx
             ├── appService.execute(GET_MODULES)          → sgc_modules (1 query)
             ├── Promise.all(modules.map → PARALLEL
             │   ├── appService.execute(GET_MODULE_CONFIG, target: m.id)  → N queries
             │   └── supabase.from('sgc_document_repositories')
             │          .select('*', {head:true}).eq('module_slug', m.slug)  → N queries
             └── ModuleEditPanel.jsx
                  └── UI-only (sin DB queries adicionales)
```

---

## FASE 1 — Dynamic Forms (Pestaña "Formularios Dinámicos")

### a) Carga inicial en Configuration.jsx (~3.5–4.5s)

| Paso | Componente | Query | Tiempo estimado |
|------|-----------|-------|-----------------|
| 1 | Configuration.jsx:70 | `getModules()` → `sgc_modules` (1 query) | ~150ms |
| 2 | Configuration.jsx:71 | `for (m of mods)` **SEQUENTIAL** `getFormsByModule(m.id)` → `sgc_forms` (N queries) | ~200–300ms × N ≈ 2–4s |
| 3 | Configuración de estado React | `setModules(mods); setFormsByModule(map)` | ~50ms |
| **Total** | | **1 + N queries secuenciales** | **~3.5–4.5s** |

**Root cause:** Línea 71 de `Configuration.jsx` usa un bucle `for...of` con `await` dentro, forzando N queries secuenciales en lugar de paralelas.

```javascript
// Configuration.jsx:71 — CUELLO DE BOTELLA
for (const m of mods) {
  const forms = await dynamicService.getFormsByModule(m.id);
  acc[m.id] = forms;
}
```

### b) dynamicService.getFormsByModule() — Sin caché

```javascript
// dynamicService.js:55
async getFormsByModule(moduleId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sgc_forms')
    .select('*')                    // Select ALL columns
    .eq('module_id', moduleId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}
```

Problemas:
- `select('*')` trae columnas innecesarias para el listado (como `fields_schema` si existe)
- Sin filtro de columnas → más payload del necesario
- Sin caché cliente → cada navegación al tab refetchea todo

### c) DynamicForm.jsx — Dual query al seleccionar un formulario

| Paso | Llamada | Tiempo |
|------|---------|--------|
| 1 | `getFormBySlug(formSlug)` → `sgc_forms` | ~150ms |
| 2 | `getFormFields(form.id)` → `sgc_form_fields` | ~100ms |
| **Total** | 2 queries por selección | ~250ms |

La primera query (`getFormBySlug`) es parcialmente redundante: cuando se navega desde el módulo ya se tiene el `formId`, pero el flujo actual usa `formSlug` como identificador.

---

## FASE 2 — Dynamic Modules (Pestaña "Módulos")

### a) Carga en ModuleManager.jsx (~1–1.5s)

| Paso | Query | Tiempo |
|------|-------|--------|
| 1 | `appService.execute(GET_MODULES)` → `sgc_modules` | ~150ms |
| 2 | `Promise.all(modules.map(...))` **PARALELO** | ~800ms–1.2s |
| 2a | `GET_MODULE_CONFIGURATION` × N → `sgc_module_capabilities` | ~100–200ms c/u |
| 2b | `sgc_document_repositories` count × N (head: true) | ~50–100ms c/u |
| **Total** | 1 + 2N queries en paralelo | **~1–1.5s** |

**ModuleManager.jsx** ya está optimizado con `Promise.all` — las queries por módulo se ejecutan en paralelo. No hay cuello de botella aquí.

### b) ModuleEditPanel.jsx — UI-only

ModuleEditPanel no hace ninguna query directa a Supabase. Toda la interacción es cliente-side hasta que se guarda, y los saves son single-shot (1 query por operación).

**Hallazgo positivo:** `useMemo` en `allCapabilities` y `allExperiences` evita recomputación innecesaria en re-renders.

---

## FASE 3 — Component Audit

| Componente | Líneas | DB Queries | Problemas detectados |
|-----------|--------|-----------|---------------------|
| Configuration.jsx | ~550 | 1 + N (secuencial) | 🚨 N+1 sequential loop |
| DynamicForm.jsx | ~600 | 2 por selección | ⚠️ Dual query parcialmente redundante |
| WorkspaceFoundation.jsx | 12 | 0 | ✅ Trivial wrapper |
| ModuleManager.jsx | ~160 | 1 + 2N (paralelo) | ⚠️ select('*') sin filtrar columnas |
| ModuleEditPanel.jsx | 554 | 0 load-time | ✅ UI-only, saves single-shot |
| dynamicService.js | 409 | — | Sin caché, select('*') generalizado |

---

## FASE 4 — Supabase Query Audit

| Query | Frecuencia | select | Filtros | Índices esperados |
|-------|-----------|--------|---------|-------------------|
| `sgc_modules` | Cada carga de Configuration | `*` | `is_active = true` | index on `is_active` |
| `sgc_forms` | Por módulo (N veces) | `*` | `module_id, is_active` | composite index `(module_id, is_active)` |
| `sgc_form_fields` | Por formulario | `*` | `form_id` | index on `form_id` |
| `sgc_module_capabilities` | Por módulo (N veces) | `*` | `module_id` | index on `module_id` |
| `sgc_document_repositories` | Por módulo (N veces, head) | `*` | `module_slug` | index on `module_slug` |

---

## FASE 5 — Estados de Carga en UI

| Componente | Indicador de carga | Problema |
|-----------|-------------------|----------|
| Configuration.jsx | `loadingModules` → spinner | OK — evita render vacío |
| DynamicForm.jsx | `loading` → spinner | OK — evita render vacío |
| ModuleManager.jsx | `loading` → spinner | OK — muestra skeleton |
| ModuleEditPanel.jsx | `saving` → botón disabled | OK — evita doble submit |

Los estados de carga están correctamente implementados. No hay race conditions visibles.

---

## FASE 6 — Root Causes Identificadas

### Crítico

| # | Severidad | Descripción | Archivo:línea |
|---|-----------|-------------|--------------|
| C1 | 🔴 Alta | **N+1 secuencial**: bucle `for...of` con `await` en cada iteración bloquea toda la carga de Configuration | `Configuration.jsx:71` |
| C2 | 🔴 Alta | **Sin paralelización**: las N queries de forms deberían correr en `Promise.all` | `Configuration.jsx:71` |

### Medio

| # | Severidad | Descripción | Archivo:línea |
|---|-----------|-------------|--------------|
| M1 | 🟡 Media | **select('*')** en queries de listado trae columnas no utilizadas | `dynamicService.js:7`, `:56`, `:80` |
| M2 | 🟡 Media | **Sin caché cliente**: cada navegación al tab refetchea todo desde cero | `Configuration.jsx:66-80` |
| M3 | 🟡 Media | **Dual query** en DynamicForm: `getFormBySlug` + `getFormFields` son 2 viajes cuando podría ser 1 | `DynamicForm.jsx:550-570` |

### Bajo

| # | Severidad | Descripción | Archivo:línea |
|---|-----------|-------------|--------------|
| B1 | 🟢 Baja | `ModuleAdministrationApplicationService` no expone batch queries para módulos | `ModuleAdministrationApplicationService.js` |

---

## Conclusión

El workspace de Configuration es funcionalmente correcto pero tiene un cuello de botella severo en la pestaña "Formularios Dinámicos" causado por un bucle N+1 secuencial en `Configuration.jsx:71`. Con N ≈ 10–15 módulos, esto agrega ~2–4 segundos de latencia que se resolverían cambiando a `Promise.all`.

La pestaña "Módulos" ya usa paralelización y es significativamente más rápida (~1–1.5s).

**Próximo sprint (Sprint 132.8):** Implementar optimizaciones:
1. Reemplazar `for...of` con `Promise.all` en Configuration.jsx
2. Reducir `select('*')` a columnas específicas en queries de listado
3. Agregar memo/caché simple para forms por módulo
4. Evaluar batch query en `getFormsByModule` (single query con `in` filter)

---

*Certificado — Read-only audit. 0 archivos modificados.*
