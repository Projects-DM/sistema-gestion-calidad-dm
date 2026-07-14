# Sprint 66 — Dynamic Module Wizard & Composition Engine

**Estado:** COMPLETADO ✅ — LEVEL 3 OPERATIONAL MODULE COMPOSITION  
**Fecha:** 2026-07-13  
**Dependencia:** Sprint 65E (Architecture Ready)

---

## 1. Resumen Ejecutivo

Implementación del primer flujo completamente operacional para crear módulos dinámicos utilizando exclusivamente la arquitectura certificada. El administrador ahora puede crear, editar, eliminar, activar/desactivar módulos y gestionar capacidades desde la UI.

**Resultado:** "Módulo = composición" reemplaza definitivamente "Módulo = código".

---

## 2. Arquitectura Implementada

```
UI (ModuleManager, Wizard, EditPanel, DetailPanel)
        │
        ▼
ModuleAdministrationApplicationService (única frontera)
        │
        ├── CREATE_MODULE → Supabase (encapsulado)
        ├── UPDATE_MODULE_METADATA → dynamicService (adapter)
        ├── UPDATE_MODULE_VISUAL_CONFIG → Supabase (encapsulado)
        ├── ASSIGN_CAPABILITIES → CapabilityAssignmentService (operational)
        ├── REMOVE_CAPABILITIES → CapabilityAssignmentService (operational)
        ├── CHANGE_MODULE_STATE → Supabase (encapsulado)
        ├── DELETE_MODULE → Supabase (encapsulado)
        └── GET_MODULES / GET_MODULE / GET_MODULE_CONFIGURATION → dynamicService (adapter)
```

---

## 3. Archivos Creados

### `src/components/workspace/CreateModuleWizard.jsx` (~350 líneas)

Wizard de 5 pasos para crear módulos:

| Paso | Contenido | Validación |
|---|---|---|
| 1 | Información general (nombre, slug, descripción, ícono, color, orden, visible) | Nombre ≥3, slug requerido |
| 2 | Programa (categoría, grupo) | Opcional |
| 3 | Capacidades (selección del CapabilityPackageRegistry) | ≥1 capacidad |
| 4 | Vista previa (tabs, componentes, configuración) | Solo lectura |
| 5 | Crear módulo (CREATE_MODULE → ASSIGN_CAPABILITIES → CHANGE_MODULE_STATE) | Execute |

**Operaciones Application Service utilizadas:**
1. `CREATE_MODULE` — Crear módulo en estado Draft
2. `ASSIGN_CAPABILITIES` — Asignar capacidades seleccionadas
3. `CHANGE_MODULE_STATE` — Transicionar a Configurable

---

## 4. Archivos Modificados

### 4.1 ModuleManager.jsx

| Cambio | Detalle |
|---|---|
| Import CreateModuleWizard | Nuevo componente wizard |
| Import Trash2 | Icono de eliminar |
| State `isCreating` | Controla vista del wizard |
| Botón "+ Nuevo módulo" | Ahora funcional, abre el wizard |
| Columna "Estado" | Muestra badge de estado del módulo |
| Botón eliminar | Acción de eliminar por módulo |
| `refreshModules()` | Función reutilizable para recargar datos |
| `handleDelete()` | Eliminación con confirmación |

**Flujo actualizado:**
```
ModuleManager (tabla)
  │
  │  Click "+ Nuevo módulo"
  ▼
CreateModuleWizard (5 pasos)
  │
  │  Crear → onCreated → refreshModules → tabla
  │
  │  Click Edit icon en fila
  ▼
ModuleDetailPanel (detalle con capacidades y estado)
  │
  │  Click "Editar módulo"
  ▼
ModuleEditPanel (tabs: Información, Capacidades, Estado)
  │
  │  Guardar → onSaved → refreshModules → tabla
  │
  │  Click "Eliminar"
  ▼
handleDelete() → confirm → DELETE_MODULE → refreshModules
```

### 4.2 ModuleDetailPanel.jsx

| Cambio | Detalle |
|---|---|
| Import Trash2, ListChecks, History, FileText | Iconos de capacidades y eliminar |
| Mostrar ícono y color | Visual representation del módulo |
| Mostrar descripción | Campo description |
| Mostrar estado | Badge de estado con color |
| Mostrar visible | Indicador de visibilidad |
| Mostrar capacidades activas | Lista de capacidades con iconos |
| Botón "Eliminar" | Acción de eliminar |
| Props `onDelete` | Callback para eliminación |

### 4.3 ModuleEditPanel.jsx

| Cambio | Detalle |
|---|---|
| Import CapabilityPackageRegistry | Capacidades disponibles |
| 3 tabs | Información, Capacidades, Estado |
| Tab Información | Nombre, slug, descripción, ícono, color, orden, visible |
| Tab Capacidades | Selección de capacidades con toggle |
| Tab Estado | Transiciones de estado permitidas |
| UPDATE_MODULE_VISUAL_CONFIG | Guardar ícono, color, orden, visible |
| ASSIGN_CAPABILITIES | Guardar capacidades seleccionadas |
| CHANGE_MODULE_STATE | Transicionar estado |
| Props `onDelete` | Callback para eliminación |

---

## 5. Capacidades Soportadas

### CapabilityPackageRegistry (SSOT)

| packageKey | displayName | icon | defaultOrder |
|---|---|---|---|
| `forms` | Diligenciar Registros | ListChecks | 1 |
| `records` | Historial y Consultas | History | 2 |
| `repository` | Repositorio Documental | FileText | 3 |

### Composición de Módulo

Cada módulo creado está compuesto por 5 bloques:

| Bloque | Descripción | Implementado |
|---|---|---|
| Metadata | Nombre, slug, descripción, ícono, color, orden, visible | ✅ |
| Capabilities | Capacidades asignadas del registry | ✅ |
| Navigation | Pestañas resueltas desde capabilities | ✅ (DynamicModule) |
| Visual Configuration | Ícono, color, orden, grupo, categoría | ✅ |
| Lifecycle | Draft → Configurable → Operational → Deprecated → Archived | ✅ |

---

## 6. Modelos de Estados

### Transiciones Permitidas

```
draft ──→ configurable ──→ operational ──→ deprecated ──→ archived
  │                        │                               │
  └────────────────────────┘                               │
  └────────────────────────────────────────────────────────┘
```

| Estado actual | Transiciones permitidas |
|---|---|
| `draft` | `configurable` |
| `configurable` | `operational`, `archived` |
| `operational` | `deprecated` |
| `deprecated` | `archived`, `configurable` |
| `archived` | `draft` |

---

## 7. Reutilización

### UI Existente Reutilizada

| Componente | Uso en nuevo módulo |
|---|---|
| DynamicModule | Renderiza tabs y contenido del módulo |
| DynamicForm | Renderiza formularios del módulo |
| DynamicRecordsView | Muestra historial y consultas |
| ModuleDocumentViewer | Gestión documental |
| CapabilityPublicSet | Resolución de capacidades |
| EngineResolver | Renderizado de formularios |

### Sin Código Específico

Los módulos creados usan exactamente la misma infraestructura que los módulos existentes (Operaciones, Medición y Control, Mantenimiento, etc.). No se crea código nuevo para cada módulo.

---

## 8. Extensibilidad

### Para agregar nuevas capacidades

1. Registrar en `CapabilityPackageRegistry.js`:
```javascript
registerPackage({
  packageKey: 'products',
  displayName: 'Productos',
  description: 'Gestión de productos',
  category: 'products',
  icon: 'Package',
  defaultOrder: 4,
  dependencies: [],
  visibility: 'public',
  enabledByDefault: false,
});
```

2. El wizard automáticamente mostrará la nueva capacidad
3. No se modifica el wizard ni la arquitectura

### Para agregar nuevos tipos de módulos

El mismo mecanismo permite crear:
- Ventas, Compras, Inventario, Clientes, Proveedores
- Talento Humano, Finanzas, Mantenimiento, Producción
- CRM, ERP, BI

Sin crear componentes nuevos.

---

## 9. Operaciones Application Service Utilizadas

| Operación | En Wizard | En EditPanel |
|---|---|---|
| `CREATE_MODULE` | ✅ Paso 5 | — |
| `UPDATE_MODULE_METADATA` | — | ✅ Tab Info |
| `UPDATE_MODULE_VISUAL_CONFIG` | — | ✅ Tab Info |
| `ASSIGN_CAPABILITIES` | ✅ Paso 5 | ✅ Tab Capacidades |
| `REMOVE_CAPABILITIES` | — | — |
| `CHANGE_MODULE_STATE` | ✅ Paso 5 | ✅ Tab Estado |
| `DELETE_MODULE` | — | ✅ Botón eliminar |
| `GET_MODULES` | — | — |
| `GET_MODULE` | — | — |
| `GET_MODULE_CONFIGURATION` | — | — |

---

## 10. Restricciones Respetadas

| Restricción | Estado |
|---|---|
| No modificar Runtime Engine certificado | ✅ |
| No modificar Operational Layer certificada | ✅ |
| No modificar Capability Registry | ✅ |
| No modificar Capability Resolver | ✅ |
| No modificar Repository Contracts | ✅ |
| No modificar Persistence Provider | ✅ |
| No modificar Application Contracts | ✅ |
| No modificar UI de módulos existentes | ✅ |
| Toda comunicación UI → Core por ApplicationService | ✅ |

---

## 11. Criterios de Certificación

| Criterio | Estado |
|---|---|
| Administrador puede crear módulo desde UI | ✅ |
| Módulo aparece con misma apariencia que existentes | ✅ |
| Nombre, descripción, ícono y config visual editables | ✅ |
| Capacidades determinan pestañas visibles | ✅ |
| Módulo puede editarse, visualizarse y eliminarse | ✅ |
| No aparecen errores "módulo no encontrado" | ✅ |
| Runtime renderiza automáticamente formularios y registros | ✅ |
| Toda comunicación pasa por ApplicationService | ✅ |
| No se duplica lógica implementada | ✅ |
| Arquitectura preparada para migraciones futuras | ✅ |

---

## 12. Build Verification

```
> npm run build
✓ built in 1.32s
2416 modules transformed
```

---

## 13. Certificación

### ✅ LEVEL 3 — OPERATIONAL MODULE COMPOSITION

| Criterio | Estado |
|---|---|
| Create Module Wizard | ✅ |
| Module CRUD (Create, Read, Update, Delete) | ✅ |
| Capability Management | ✅ |
| State Lifecycle Management | ✅ |
| Visual Configuration | ✅ |
| Application Service Boundary | ✅ |
| No Runtime Modifications | ✅ |
| No Operational Layer Modifications | ✅ |
| Build Passing | ✅ |
| UI Reutilizada | ✅ |
| Extensibilidad Documentada | ✅ |

---

## 14. Siguiente Sprint

**Sprint 67** — Module Form Configuration
- Configurar formularios dentro de un módulo creado
- Crear, editar, eliminar formularios asociados
- Definir campos de formulario
- Asignar engine type a cada formulario
