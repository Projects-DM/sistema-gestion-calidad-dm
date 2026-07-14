# Sprint 67 — Dynamic Module Configuration & Runtime Composition

**Tipo:** Core Architecture / Runtime Configuration / Module Composition
**Nivel esperado:** LEVEL 3 — OPERATIONAL MODULE CONFIGURATION
**Estado:** PLAN
**Fecha:** 2026-07-13
**Dependencia:** Sprint 66C (Certified)

---

## 1. Resumen Ejecutivo

Completar el ciclo de vida de un módulo dinámico permitiendo que un administrador configure completamente un módulo recién creado mediante composición, reutilizando exclusivamente la infraestructura certificada del Runtime.

**Decisiones del usuario:**
- Tab: 4ta pestaña en ModuleEditPanel (`[Información] [Capacidades] [Estado] [Configuración]`)
- Reordenamiento: Flechas向上/abajo (reutiliza Universal Order Motor)
- Creación de formularios: Mover a pestaña Configuración (consolidar bajo contexto del módulo)
- Formulario por defecto: Auto-abrir al entrar al módulo
- Alcance: Solo a nivel de formulario (CRUD + orden + default). Configuración de campos se mantiene en FormBuilder

---

## 2. Análisis de Arquitectura Actual

### Estado actual del flujo de formularios

```
Configuration.jsx (separado de ModuleManager)
  ↓
sgc_forms (sin order_index, sin is_default)
  ↓
dynamicService.getFormsByModule() (ordena por created_at)
  ↓
DynamicModule.FormsContent (renderiza grid de cards)
```

### Problemas identificados

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Sin `order_index` en `sgc_forms` | Formularios aparecen en orden de creación |
| 2 | Sin `is_default` | No hay formulario que se abra automáticamente |
| 3 | CRUD de formularios separado del módulo | Admin debe navegar entre Configuration y ModuleManager |
| 4 | Formularios bypass ApplicationService | No hay validación ni autorización centralizada |
| 5 | `getFormsByModule()` ordena por `created_at` | No respeta orden configurado por admin |

### Componentes reutilizados (sin modificar)

| Componente | Uso en Sprint 67 |
|------------|------------------|
| DynamicModule | Lee `order_index` e `is_default` de formularios |
| DynamicForm | Se abre automáticamente si es default |
| UniversalOrderMotor | Reordenamiento de formularios |
| ModuleAdministrationApplicationService | Nuevas operaciones de configuración |
| ApplicationRequest/Result/Error | Contratos existentes |

---

## 3. Plan de Implementación

### Fase 1: Database Migration

**Archivo:** `docs/12-database/sql_sprint_67_form_configuration.sql`

```sql
-- 1. Agregar order_index a sgc_forms
ALTER TABLE public.sgc_forms
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 2. Agregar is_default a sgc_forms
ALTER TABLE public.sgc_forms
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- 3. Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_sgc_forms_order ON public.sgc_forms (module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sgc_forms_default ON public.sgc_forms (module_id, is_default) WHERE is_default = true;

-- 4. Migración de datos existentes: establecer orden por created_at
WITH ordered_forms AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY module_id ORDER BY created_at) - 1 as rn
  FROM public.sgc_forms
)
UPDATE public.sgc_forms f
SET order_index = o.rn
FROM ordered_forms o
WHERE f.id = o.id;
```

### Fase 2: Operation Contracts

**Archivo:** `src/core/applicationLayer/moduleAdministration/contracts/ModuleAdministrationOperation.js`

Agregar nuevas operaciones:

```javascript
// Form Configuration Operations
GET_MODULE_FORMS: 'GET_MODULE_FORMS',
CREATE_MODULE_FORM: 'CREATE_MODULE_FORM',
UPDATE_MODULE_FORM: 'UPDATE_MODULE_FORM',
DELETE_MODULE_FORM: 'DELETE_MODULE_FORM',
UPDATE_FORM_ORDER: 'UPDATE_FORM_ORDER',
SET_DEFAULT_FORM: 'SET_DEFAULT_FORM',
```

### Fase 3: ApplicationService Handlers

**Archivo:** `src/core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js`

Nuevos handlers:

| Handler | Descripción | Validaciones |
|---------|-------------|--------------|
| `_getModuleForms` | Obtiene formularios del módulo ordenados | moduleId requerido |
| `_createModuleForm` | Crea formulario en el módulo | name, slug, engine_type requeridos; slug único |
| `_updateModuleForm` | Actualiza metadata del formulario | formId requerido; slug único si cambia |
| `_deleteModuleForm` | Elimina formulario | formId requerido; no eliminar si tiene responses |
| `_updateFormOrder` | Reordena formularios | moduleId, orderedIds requeridos |
| `_setDefaultForm` | Establece formulario por defecto | moduleId, formId requeridos; un solo default por módulo |

### Fase 4: Order Adapter

**Archivo:** `src/core/applicationLayer/moduleAdministration/adapters/ModuleFormsOrderAdapter.js`

Adapta Universal Order Motor para formularios:

```javascript
class ModuleFormsOrderAdapter {
  constructor({ dynamicService, supabase }) {
    this._dynamicService = dynamicService;
    this._supabase = supabase;
  }

  async reorderForms({ moduleId, orderedIds }) {
    // 1. Persistir order_index para cada formulario
    for (let idx = 0; idx < orderedIds.length; idx++) {
      await this._supabase
        .from('sgc_forms')
        .update({ order_index: idx })
        .eq('id', orderedIds[idx]);
    }
    // 2. Recargar y retornar formularios ordenados
    return this._dynamicService.getFormsByModule(moduleId);
  }
}
```

### Fase 5: UI Components

#### 5.1 ModuleEditPanel — Nueva pestaña "Configuración"

**Archivo:** `src/components/workspace/ModuleEditPanel.jsx`

Cambios:
- Agregar 4ta pestaña: `[Información] [Capacidades] [Estado] [Configuración]`
- La pestaña "Configuración" renderiza `<ModuleFormsManager>`
- Pasar `module` y `onSave` como props

#### 5.2 ModuleFormsManager (Nuevo componente)

**Archivo:** `src/components/workspace/ModuleFormsManager.jsx`

Responsabilidades:
- Lista de formularios del módulo (ordenados por `order_index`)
- Botones向上/abajo para reordenar (usa Universal Order Motor)
- Crear nuevo formulario inline
- Editar nombre, descripción, engine_type
- Eliminar formulario (con confirmación)
- Toggle `is_default` por formulario (radio button o checkbox)
- Toggle `is_active` por formulario (show/hide)

Estructura:
```
┌─────────────────────────────────────────┐
│ Configuración del Módulo                │
├─────────────────────────────────────────┤
│ Formularios                             │
│ ┌─────────────────────────────────────┐ │
│ │ ↑ ↓ Formulario Recepción    [★] [×]│ │
│ │ ↑ ↓ Formulario Despacho     [ ] [×]│ │
│ │ ↑ ↓ Formulario Producción   [ ] [×]│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Agregar Formulario]                  │
│                                         │
│ Formulario por defecto: Recepción       │
│                                         │
│ [Guardar Cambios]                       │
└─────────────────────────────────────────┘
```

#### 5.3 DynamicModule — Auto-abrir formulario por defecto

**Archivo:** `src/pages/DynamicModule.jsx`

Cambios:
- After loading forms, check if any has `is_default = true`
- If default form exists, auto-navigate to it (or auto-select it)
- Update `getFormsByModule()` call to use new ordering

---

## 4. Flujo de Datos

### Crear formulario dentro del módulo

```
Admin → ModuleEditPanel → Configuración tab
  ↓
ModuleFormsManager → "Agregar Formulario"
  ↓
Inline form: name, slug, engine_type, description
  ↓
ModuleConfigurationService → ApplicationService.execute(CREATE_MODULE_FORM)
  ↓
Handler: _createModuleForm → validate → supabase.insert('sgc_forms')
  ↓
Return: ApplicationResult(success=true, data: { id, name, slug, ... })
  ↓
ModuleFormsManager → refresh forms list
```

### Reordenar formularios

```
Admin → ModuleFormsManager → click ↑ on "Despacho"
  ↓
UniversalOrderMotor.moveUp(sequence, targetId)
  ↓
ModuleFormsOrderAdapter.reorderForms({ moduleId, orderedIds })
  ↓
Supabase: UPDATE sgc_forms SET order_index = idx WHERE id = ?
  ↓
Return: updated forms list
  ↓
ModuleFormsManager → re-render with new order
```

### Establecer formulario por defecto

```
Admin → ModuleFormsManager → click ★ on "Recepción"
  ↓
ModuleConfigurationService → ApplicationService.execute(SET_DEFAULT_FORM)
  ↓
Handler: _setDefaultForm
  1. UPDATE sgc_forms SET is_default = false WHERE module_id = ?
  2. UPDATE sgc_forms SET is_default = true WHERE id = ?
  ↓
Return: ApplicationResult(success=true)
  ↓
ModuleFormsManager → re-render with new default
```

### Runtime auto-descubre formularios

```
User navigates to /:moduleSlug
  ↓
DynamicModule.jsx
  ↓
dynamicService.getFormsByModule(moduleId)
  → ORDER BY order_index ASC (NEW)
  ↓
Check forms for is_default = true
  → If exists: auto-navigate to /modulo/:moduleSlug/:defaultFormSlug
  → If not: show forms grid
  ↓
FormsContent renders forms in order_index sequence
```

---

## 5. Archivos a Crear/Modificar

### Archivos nuevos (4)

| Archivo | Descripción |
|---------|-------------|
| `docs/12-database/sql_sprint_67_form_configuration.sql` | Migración: order_index + is_default |
| `src/core/applicationLayer/moduleAdministration/operations/FormConfigurationOperations.js` | Definiciones de operaciones |
| `src/components/workspace/ModuleFormsManager.jsx` | UI de configuración de formularios |
| `src/core/applicationLayer/moduleAdministration/adapters/ModuleFormsOrderAdapter.js` | Adaptador Universal Order Motor para formularios |

### Archivos modificados (5)

| Archivo | Cambios |
|---------|---------|
| `src/core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js` | +6 handlers de configuración |
| `src/core/applicationLayer/moduleAdministration/contracts/ModuleAdministrationOperation.js` | +6 operaciones |
| `src/components/workspace/ModuleEditPanel.jsx` | +4ta pestaña "Configuración" |
| `src/services/dynamicService.js` | `getFormsByModule()` ordena por `order_index` |
| `src/pages/DynamicModule.jsx` | Auto-abrir formulario por defecto |

---

## 6. Restricciones Arquitectónicas

### No modificar

- Runtime Engine
- Capability Registry
- Operational Layer (CapabilityAssignmentService, etc.)
- Persistence Contracts
- Repository Contracts
- Application Contracts (ApplicationRequest, ApplicationResult, ApplicationError)
- DynamicModule (solo agregar lógica de default form)
- DynamicForm
- Records Engine
- DocumentModule

### Solo agregar

- Nuevas operaciones en ApplicationService
- Nuevos adapters para persistencia
- Nuevos componentes UI
- Nuevas columnas en base de datos

---

## 7. Criterios de Certificación

| # | Criterio | Estado esperado |
|---|----------|-----------------|
| 1 | Crear formularios dentro del módulo | ✅ |
| 2 | Editar formularios | ✅ |
| 3 | Eliminar formularios | ✅ |
| 4 | Reordenar formularios | ✅ |
| 5 | Seleccionar formulario por defecto | ✅ |
| 6 | Runtime descubre formularios automáticamente | ✅ |
| 7 | DynamicModule renderiza sin código específico | ✅ |
| 8 | Reutilización completa del Runtime | ✅ |
| 9 | Sin duplicación de lógica | ✅ |
| 10 | Toda comunicación pasa por ApplicationService | ✅ |

---

## 8. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Breaking change en `getFormsByModule()` | Bajo | Alto | Mantener compatibilidad: order_index DEFAULT 0 existentes |
| Formulario default conflictivo (múltiples defaults) | Medio | Medio | Validación en handler: un solo default por módulo |
| Universal Order Motor no soporta formularios | Bajo | Medio | Crear adapter que traduzca la interfaz |
| Performance al reordenar muchos formularios | Bajo | Bajo | UPDATE en batch, no N queries |

---

## 9. Estimación

| Fase | Tiempo estimado |
|------|-----------------|
| Fase 1: Database Migration | 10 min |
| Fase 2: Operation Contracts | 10 min |
| Fase 3: ApplicationService Handlers | 30 min |
| Fase 4: Order Adapter | 15 min |
| Fase 5: UI Components | 45 min |
| Testing y Build | 10 min |
| **Total** | **~2 horas** |

---

## 10. Aprobación

Este plan requiere aprobación del usuario antes de proceder con la implementación.

**Pendiente:** Ejecutar `sql_sprint_67_form_configuration.sql` en Supabase SQL Editor después de la implementación.
