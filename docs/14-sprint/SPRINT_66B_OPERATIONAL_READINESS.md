# Sprint 66B — Operational Readiness Certification

**Estado:** COMPLETADO ✅  
**Fecha:** 2026-07-13  
**Dependencia:** Sprint 66A (Integration Audit)

---

## 1. Resumen Ejecutivo

Auditoría integral y corrección de bugs críticos de runtime en los componentes de Module Administration (CreateModuleWizard, ModuleManager, ModuleDetailPanel, ModuleEditPanel). Se creó el `ModuleCapabilityPersistenceAdapter` como puente entre la Application Service y Supabase para persistencia de capacidades, se corrigió la inyección de `persistenceProvider` en todos los componentes UI, y se completó la persistencia de campos `color`, `category`, `grupo`.

---

## 2. Bugs Corregidos

### CRÍTICO-1: persistenceProvider no inyectado
**Componentes afectados:** CreateModuleWizard, ModuleManager, ModuleEditPanel  
**Impacto:** `ASSIGN_CAPABILITIES` siempre falla — `ModuleAdministrationApplicationService._handleAssignCapabilities` lanza `ApplicationError` cuando `this.persistenceProvider` es null. Las capacidades nunca se persisten.

**Causa raíz:**
```javascript
// ❌ ANTES: constructor sin persistenceProvider
const appService = new ModuleAdministrationApplicationService();
```

**Corrección:**
```javascript
// ✅ DESPUÉS: con adapter de persistencia
import { ModuleCapabilityPersistenceAdapter } from '../../core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js';
const persistenceProvider = new ModuleCapabilityPersistenceAdapter();
const appService = new ModuleAdministrationApplicationService({ persistenceProvider });
```

### CRÍTICO-2: campos color/category/grupo no persistidos
**Componente afectado:** ModuleAdministrationApplicationService  
**Impacto:** CREATE_MODULE y UPDATE_MODULE_VISUAL_CONFIG ignoraban estos campos — nunca llegaban a Supabase.

**Corrección:**
- CREATE_MODULE: agregados `color`, `category`, `grupo` al INSERT
- UPDATE_MODULE_VISUAL_CONFIG: agregado `color` al UPDATE
- UPDATE_MODULE_METADATA: extendido para persistir `category` y `grupo`

### ALTO-1: ICON_MAP incompleto en DetailPanel
**Componente:** ModuleDetailPanel  
**Impacto:** 12 de 15 opciones de ícono se renderizaban como fallback `ListChecks`.

**Corrección:** ICON_MAP extendido a los 15 iconos disponibles: `Layers, ClipboardList, FileText, ListChecks, History, BarChart3, Settings, Users, Package, Shield, Truck, Wrench, Heart, GraduationCap, Building2`.

### ALTO-2: Capacidad hardcodeada en DetailPanel
**Componente:** ModuleDetailPanel  
**Impacto:** Las capacidades se mostraban siempre como las mismas 3 hardcodeadas, sin reflejar lo asignado.

**Corrección:** Lectura dinámica desde `module.capabilities` (JSONB) cruzada con `CapabilityPackageRegistry` para obtener nombre, ícono y color correctos.

### MEDIO-1: Stale closure en ModuleManager.onSaved
**Componente:** ModuleManager  
**Impacto:** Después de editar, `modules.find()` usaba un array obsoleto del closure, resultando en `selectedModule` incorrecto.

**Corrección:** Uso de `useRef` para mantener referencia actualizada del array de módulos.

### MEDIO-2: Slug sin validación regex en EditPanel
**Componente:** ModuleEditPanel  
**Impacto:** Slugs con caracteres inválidos (mayúsculas, espacios, caracteres especiales) se aceptaban sin validación.

**Corrección:** Agregada validación `^[a-z0-9-]+$` consistente con CreateModuleWizard.

### MEDIO-3: Capacidades hardcodeadas en EditPanel
**Componente:** ModuleEditPanel  
**Impacto:** `selectedCaps` siempre comenzaba con `['forms', 'records', 'repository']` sin importar lo previamente asignado.

**Corrección:** Inicialización desde `module.capabilities` JSONB, con fallback a `enabledByDefault`.

---

## 3. Archivos Creados

### ModuleCapabilityPersistenceAdapter
**Ruta:** `src/core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js`

Adaptador transitional que implementa la interfaz `CapabilityPersistenceProvider` esperada por el pipeline operativo (`CapabilityAssignmentService → AssignmentTransactionManager`).

| Método | Descripción |
|--------|-------------|
| `replaceAssignmentsForModule({ moduleId, assignments })` | Reemplaza todas las asignaciones de capacidades (JSONB en sgc_modules) |
| `listAssignmentsByModuleId({ moduleId })` | Lista asignaciones del módulo |
| `deleteAssignmentsForModule({ moduleId })` | Elimina todas las asignaciones |

**Estrategia de almacenamiento:** JSONB en columna `capabilities` de `sgc_modules`. Sin tabla separada.

### SQL Migration
**Ruta:** `docs/12-database/sql_sprint_66b_module_administration_columns.sql`

Agrega columnas a `sgc_modules`:
- `capabilities` (JSONB, default `[]`) — Asignaciones de capacidades
- `color` (TEXT, default `'#3B82F6'`) — Color UI
- `category` (TEXT) — Categoría de organización
- `grupo` (TEXT) — Grupo de organización
- `state` (TEXT, default `'draft'`) — Estado del ciclo de vida
- `order_index` (INTEGER, default 0) — Orden visual
- `visible` (BOOLEAN, default true) — Visibilidad UI
- `created_by` (UUID) — Actor creador

Incluye índices GIN para consultas JSONB sobre `capabilities`.

---

## 4. Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `ModuleAdministrationApplicationService.js` | CREATE_MODULE: +color/category/grupo; UPDATE_MODULE_VISUAL_CONFIG: +color; UPDATE_MODULE_METADATA: +category/grupo |
| `CreateModuleWizard.jsx` | +persistenceProvider injection; ICON_MAP extendido a 15 iconos |
| `ModuleManager.jsx` | +persistenceProvider injection; +useRef para stale closure fix |
| `ModuleEditPanel.jsx` | +persistenceProvider injection; ICON_MAP extendido; +slug regex validation; +color en visual config save; capabilities init from module |
| `ModuleDetailPanel.jsx` | +CapabilityPackageRegistry import; ICON_MAP extendido; capabilities dinámicas desde registry; +category/grupo display |

---

## 5. Arquitectura de Persistencia de Capacidades

```
UI Component
  └─ ModuleAdministrationApplicationService({ persistenceProvider })
       └─ _handleAssignCapabilities()
            └─ CapabilityAssignmentService({ persistenceProvider })
                 └─ AssignmentTransactionManager.execute()
                      └─ persistenceProvider.replaceAssignmentsForModule()
                           └─ ModuleCapabilityPersistenceAdapter
                                └─ Supabase: sgc_modules.capabilities (JSONB)
```

**SSOT preservada:**
- UI nunca conoce Supabase/Adapters (solo llama `appService.execute()`)
- Core nunca conoce React (adapter inyectado via constructor)
- El adapter es la única pieza que conoce Supabase en la capability pipeline

---

## 6. Verificación

| Check | Resultado |
|-------|-----------|
| `npm run build` | ✅ 1.29s, 2417 modules, 0 errors |
| Import paths (adapter → supabase) | ✅ Resolved correctly |
| ModuleAdministrationApplicationService persistenceProvider | ✅ Injected in all 3 UI components |
| CapabilityPackageRegistry import | ✅ Present in Wizard, EditPanel, DetailPanel |
| ICON_MAP completeness | ✅ 15 icons in all 4 components |
| Slug validation | ✅ Regex `^[a-z0-9-]+$` in Wizard and EditPanel |
| Stale closure fix | ✅ useRef pattern in ModuleManager |
| Color persistence | ✅ In CREATE_MODULE and UPDATE_MODULE_VISUAL_CONFIG |

---

## 7. Acción Requerida Antes de Producción

Ejecutar la migración SQL en Supabase:
```sql
-- Abrir: docs/12-database/sql_sprint_66b_module_administration_columns.sql
-- Ejecutar en: SQL Editor del proyecto Supabase
```

Sin esta migración, las operaciones de escritura de `capabilities`, `color`, `category`, `grupo` fallarán con error de columna inexistente.

---

## 8. Dictamen

### LEVEL 3 — OPERATIONAL READINESS CERTIFIED ✅

Todos los bugs críticos y medios identificados en la auditoría 66B han sido corregidos. La Architecture Service (ApplicationService) es el único boundary entre UI y Core. El `ModuleCapabilityPersistenceAdapter` cierra el gap de persistencia para asignaciones de capacidades. Build verificado exitosamente.
