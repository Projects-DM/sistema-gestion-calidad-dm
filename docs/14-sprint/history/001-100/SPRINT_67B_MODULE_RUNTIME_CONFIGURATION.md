# Sprint 67B — Module Runtime Configuration (SSOT)

**Tipo:** Core Architecture / Runtime Discovery / Dynamic Module Publication
**Nivel:** LEVEL 3 — RUNTIME CONFIGURATION CERTIFIED
**Estado:** CERTIFICADO
**Fecha:** 2026-07-13
**Dependencia:** Sprint 67A.1 — Application Context Alignment (Certified)

---

## 1. Resumen Ejecutivo

Completar la integración entre el Module Administration Core y el Runtime Engine, permitiendo que un módulo administrado pueda ser descubierto, publicado y ejecutado dinámicamente sin registrar rutas manuales ni modificar el código del Runtime.

A partir de este Sprint, el Runtime utiliza exclusivamente la información persistida en `sgc_modules` para determinar qué módulos deben exponerse al usuario.

**No se modifica la arquitectura Runtime certificada; únicamente se completa la composición dinámica.**

---

## 2. Auditoría Inicial

### A. Sidebar

| Aspecto | Estado Antes | Estado Después |
|---------|-------------|----------------|
| Fuente de módulos | Hardcoded `menuItems` (8 items) | `STATIC_MENU_ITEMS` (2) + DB dinámica |
| Filtro por roles | `menuItems.filter()` post-render | `useMemo` con filtro integrado |
| Módulos ocultos | Sin filtro `visible`/`state` | Filtrado por `is_active + visible + state=operational` |
| Cache | Constante en memoria | `useEffect` + `useMemo` (refresco por sesión) |
| Orden | Hardcoded | `order_index` desde DB |

### B. Runtime Discovery

| Aspecto | Estado Antes | Estado Después |
|---------|-------------|----------------|
| Origen de lista | `dynamicService.getModules()` (solo `is_active`) | `dynamicService.getRuntimeModules()` (3 filtros) |
| Consumidor | `Configuration.jsx` (admin) | Sidebar + Dashboard (todos los usuarios) |
| Contrato | `GET_MODULES` | `GET_RUNTIME_MODULES` (nuevo) |

### C. React Router

| Aspecto | Estado | Veredicto |
|---------|--------|-----------|
| `<Route path=":moduleSlug">` | Catch-all pre-existente en `App.jsx:66` | ✅ Sin cambios necesarios |
| Resolución | `DynamicModule` resuelve por slug via `dynamicService.getModuleBySlug()` | ✅ Funcional |

### D. DynamicModule

| Aspecto | Estado | Veredicto |
|---------|--------|-----------|
| Resolución por slug | `useParams()` → `getModuleBySlug()` → render | ✅ Sin cambios |
| Lista hardcodeada | No existe | ✅ SSOT |
| Capability Public Set | `useCapabilityPublicSet()` → tabs dinámicos | ✅ Sin cambios |

### E. Visibility Rules

| Campo | Filtro Antes | Filtro Después |
|-------|-------------|----------------|
| `is_active` | ✅ En `getModules()` | ✅ En `getRuntimeModules()` |
| `visible` | ❌ Inerte (editable pero no filtrado) | ✅ Filtrado |
| `state` | ❌ No filtrado | ✅ Solo `operational` |

---

## 3. Modelo Oficial de Publicación

Un módulo será visible en el sidebar y dashboard únicamente cuando:

```
is_active = true
AND visible = true
AND state = 'operational'
```

No basta con existir. El módulo debe estar activo, visible, y en estado operacional.

---

## 4. Contrato de Runtime Discovery

```
UI Component (Sidebar / Dashboard)
  │
  ├── ApplicationContext (actorId=UUID, source='ui-sidebar'|'ui-dashboard')
  │
  ▼
ModuleAdministrationApplicationService.execute()
  │
  ├── operation: 'GET_RUNTIME_MODULES'
  │
  ▼
_handleGetRuntimeModules()
  │
  ▼
dynamicService.getRuntimeModules()
  │
  ├── SELECT * FROM sgc_modules
  │   WHERE is_active = true
  │     AND visible = true
  │     AND state = 'operational'
  │   ORDER BY order_index ASC
  │
  ▼
ApplicationResult { data: Module[] }
```

El Runtime nunca leerá directamente Supabase. Toda lectura pasa por ApplicationService → DynamicService → Persistence.

---

## 5. Archivos Modificados

### 5.1 `src/services/dynamicService.js`

**Nuevo método: `getRuntimeModules()`**

```js
async getRuntimeModules() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sgc_modules')
    .select('*')
    .eq('is_active', true)
    .eq('visible', true)
    .eq('state', 'operational')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
},
```

**Diferencia con `getModules()`:**

| Método | Filtros | Orden | Uso |
|--------|---------|-------|-----|
| `getModules()` | `is_active=true` | `created_at ASC` | Admin (Configuration, ModuleManager) |
| `getRuntimeModules()` | `is_active + visible + state=operational` | `order_index ASC` | Runtime (Sidebar, Dashboard) |

### 5.2 `src/core/applicationLayer/moduleAdministration/contracts/ModuleAdministrationOperation.js`

**Nueva query: `GET_RUNTIME_MODULES`**

```js
export const ModuleAdministrationQuery = Object.freeze({
  GET_MODULES: 'GET_MODULES',
  GET_RUNTIME_MODULES: 'GET_RUNTIME_MODULES',  // ← NUEVO
  GET_MODULE: 'GET_MODULE',
  GET_MODULE_CONFIGURATION: 'GET_MODULE_CONFIGURATION',
});
```

### 5.3 `src/core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js`

**Nuevo routing + handler:**

```js
// Routing (execute())
case ModuleAdministrationQuery.GET_RUNTIME_MODULES:
  return await this._handleGetRuntimeModules(request, context);

// Handler
async _handleGetRuntimeModules(request, context) {
  const modules = await dynamicService.getRuntimeModules();
  return createApplicationResult({
    data: modules,
    correlationId: request.correlationId,
  });
}
```

### 5.4 `src/layouts/DashboardLayout.jsx`

**Cambios:**

| Antes | Después |
|-------|---------|
| `menuItems` hardcoded (8 items) | `STATIC_MENU_ITEMS` (2) + `runtimeModules` dinámicos |
| `useState` único | `useState` + `useEffect` + `useMemo` |
| Sin imports de Application Layer | Importa `appService`, `createApplicationRequest`, `createApplicationContext` |
| `filteredMenuItems = menuItems.filter(...)` | `filteredMenuItems = menuItems` (ya filtrado en `useMemo`) |

**Arquitectura del sidebar:**

```
STATIC_MENU_ITEMS (dashboard, configuración)
  │
  ├── Filtrado por rol
  │
  ▼
runtimeModules (GET_RUNTIME_MODULES)
  │
  ├── Mapeo: slug → path, icon → ICON_MAP, name → name
  │
  ▼
Merge (deduplicación por path)
  │
  ▼
menuItems = [...staticItems, ...dynamicItems]
  │
  ▼
Render NavLink por cada item
```

**ICON_MAP para resolver strings del DB:**

```js
const ICON_MAP = {
  LayoutDashboard, Droplets, Wrench, RouteIcon, AlertTriangle, FileText,
  Settings, Sparkles, ListChecks, History, BarChart3, Users, Package,
  Shield, Truck, Heart, GraduationCap, Building2, ShieldCheck,
};
```

### 5.5 `src/pages/Dashboard.jsx`

**Cambios:**

| Antes | Después |
|-------|---------|
| `modules` hardcoded (7 items) | `STATIC_MODULE_CARDS` (1) + `runtimeModules` dinámicos |
| Sin imports de Application Layer | Importa `appService`, `createApplicationRequest`, `createApplicationContext` |
| `mod.color` como Tailwind class | `style={{ backgroundColor: mod.color }}` (hex desde DB) |
| `key={mod.id}` | `key={mod.id \|\| mod.path}` (fallback para estáticos) |

---

## 6. Flujo Completo Habilitado

```
Admin crea módulo
  │
  ▼
INSERT sgc_modules (state=draft, visible=true, is_active=true)
  │
  ▼
Admin configura módulo → state=operational
  │
  ▼
GET_RUNTIME_MODULES retorna el módulo
  │
  ├── Sidebar lo publica como NavLink
  │
  ├── Dashboard lo muestra como card
  │
  ▼
Usuario hace clic → /:moduleSlug
  │
  ▼
App.jsx catch-all → <DynamicModule />
  │
  ▼
DynamicModule resuelve por slug → render con Capability Public Set
  │
  ▼
Forms / Records / Repository disponibles
```

---

## 7. Componentes NO Afectados

No se modificaron:

- Runtime Engine
- DynamicForm
- Records Engine
- Capability Registry
- Operational Layer
- Persistence Contracts
- Repository Layer
- Event Contracts
- App.jsx (catch-all route pre-existente)
- ModuleManager (sin cambios funcionales)
- CreateModuleWizard (sin cambios)

---

## 8. Preparación para Sprint 67C

Este Sprint deja preparado:

```
Dynamic Module (ya funciona)
  │
  ▼
Configuration (Sprint 67C agregará formularios)
  │
  ▼
Forms (CRUD + orden + default)
  │
  ▼
Records
```

Sprint 67C solamente agregará formularios. No volverá a tocar Runtime.

---

## 9. Riesgos Mitigados

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Sidebar con módulos hardcodeados | Eliminado | Reemplazado por DB dinámica |
| Router con rutas estáticas | N/A | Catch-all `:moduleSlug` ya existía |
| DynamicModule usando registros antiguos | N/A | Resolución por slug sin cambios |
| Publicar módulos draft | Prevenido | Filtro `state=operational` |
| Módulos visibles pero inactivos | Prevenido | Filtro triple: `is_active + visible + state` |

---

## 10. Criterios de Certificación

| Criterio | Estado |
|----------|--------|
| Runtime descubre módulos dinámicos | ✅ `getRuntimeModules()` |
| Sidebar publica automáticamente | ✅ `useEffect` + `useMemo` |
| Router acepta módulos nuevos | ✅ `:moduleSlug` catch-all |
| DynamicModule carga sin código específico | ✅ Resolución por slug |
| Sin registro manual de módulos | ✅ Solo DB → sidebar |
| Sin romper Runtime | ✅ Sin cambios en Runtime |
| Sin romper SSOT | ✅ ApplicationService como único boundary |
| Desacoplado de Supabase | ✅ Sidebar → ApplicationService → dynamicService |
| Compatible con IA | ✅ `source: 'ai-agent'` en contexto |
| Compatible con Offline | ✅ `source: 'offline-sync'` en contexto |
| Visible rules certificadas | ✅ `is_active + visible + state=operational` |
| Orden certificado | ✅ `order_index ASC` |
| Preparado para Sprint 67C | ✅ Solo falta agregar formularios |

---

## 11. Diferencia de Métodos de Consulta

| Método | Filtros | Orden | Consumidor | Contrato |
|--------|---------|-------|------------|----------|
| `getModules()` | `is_active=true` | `created_at ASC` | Admin UI | `GET_MODULES` |
| `getRuntimeModules()` | `is_active + visible + state=operational` | `order_index ASC` | Sidebar, Dashboard | `GET_RUNTIME_MODULES` |
| `getModuleBySlug()` | `slug=X` | — | DynamicModule | Directo |
| `getModuleById()` | `id=X` | — | DynamicModuleById, Admin | Directo |

---

## 12. Notas de Implementación

### Por qué `getRuntimeModules()` es un método nuevo (no modificación de `getModules()`)

1. **Separación de responsabilidades:** Admin necesita ver todos los módulos activos; Runtime solo los publicados
2. **Backward compatibility:** `GET_MODULES` sigue funcionando para Configuration y ModuleManager
3. **Performance:** Menos datos transferidos cuando solo se necesitan módulos operacionales
4. **Seguridad:** Módulos en draft o deprecated no se exponen al usuario final

### Por qué `STATIC_MENU_ITEMS` solo conserva dashboard y configuración

- `dashboard` → Página estática con KPIs, no es módulo de DB
- `configuracion` → Página admin con role gate, no es módulo runtime
- Los demás módulos (operaciones, trazabilidad, etc.) ahora vienen de la DB
- Si el admin no crea un módulo en la DB, simplemente no aparece en el sidebar
