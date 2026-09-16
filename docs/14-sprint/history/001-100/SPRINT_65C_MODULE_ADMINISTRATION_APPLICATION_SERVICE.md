# Sprint 65C — Module Administration Application Service

**Estado:** COMPLETADO ✅  
**Fecha:** 2026-07-13  
**Dependencia:** Sprint 65B.1 (Common Contracts Consolidation)

---

## 1. Objetivo

Implementar `ModuleAdministrationApplicationService` como la **única frontera oficial** entre la UI (React) y el Core. Toda operación de administración de módulos debe fluir exclusivamente a través de este servicio.

---

## 2. Restricciones Respetadas

| Restricción | Estado |
|---|---|
| No modificar Runtime | ✅ |
| No modificar DynamicModule | ✅ |
| No modificar DynamicForm | ✅ |
| No modificar DynamicRecordsView | ✅ |
| No modificar Core certificado | ✅ |
| No modificar Operational Layer | ✅ |
| No modificar Repository Contracts | ✅ |
| No modificar Persistence Providers | ✅ |
| No modificar Capability Resolution | ✅ |
| No modificar dynamicService | ✅ |
| Solo crear archivo nuevo | ✅ |

---

## 3. Archivo Creado

### `src/core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js`

**~450 líneas | Clase exportada: `ModuleAdministrationApplicationService`**

---

## 4. Diseño del Servicio

### 4.1 API Pública

```javascript
const service = new ModuleAdministrationApplicationService({ persistenceProvider });
const result = await service.execute(request, context);
```

| Método | Tipo | Descripción |
|---|---|---|
| `execute(request, context)` | Público | Punto de entrada único; valida, autoriza y enruta |

### 4.2 Operaciones Soportadas (10)

#### Queries (Solo lectura)

| Operación | Descripción | Fuente de datos |
|---|---|---|
| `GET_MODULES` | Lista todos los módulos activos | dynamicService |
| `GET_MODULE` | Detalle de un módulo por ID | dynamicService |
| `GET_MODULE_CONFIGURATION` | Módulo + forms + fields | dynamicService |

#### Write (Escritura)

| Operación | Descripción | Fuente de datos |
|---|---|---|
| `CREATE_MODULE` | Crear módulo (Draft) | Supabase directo |
| `UPDATE_MODULE_METADATA` | Actualizar nombre/slug/descripción | dynamicService + Supabase |
| `UPDATE_MODULE_VISUAL_CONFIG` | Actualizar icon/order/visibility | Supabase directo |
| `ASSIGN_CAPABILITIES` | Reemplazar asignaciones de capabilities | CapabilityAssignmentService |
| `REMOVE_CAPABILITIES` | Eliminar todas las capabilities | CapabilityAssignmentService |
| `CHANGE_MODULE_STATE` | Transicionar estado del módulo | Supabase directo |
| `DELETE_MODULE` | Eliminar módulo (hard delete) | Supabase directo |

### 4.3 Flujo de Ejecución

```
UI → execute(request, context)
  ├── 1. Validar request (operation requerida)
  ├── 2. Validar context (actorId requerido)
  ├── 3. Autorizar (write requiere admin/super_admin)
  └── 4. Enrutar a handler
        ├── Queries → dynamicService (transicional)
        ├── Writes CRUD → Supabase directo (encapsulado)
        └── Capabilities → CapabilityAssignmentService
```

### 4.4 Contratos Utilizados

| Contrato | Uso |
|---|---|
| `ApplicationRequest` | Entrada: operation, actor, target, payload |
| `ApplicationContext` | Entrada: actorId, actorRole, correlationId |
| `ApplicationResult` | Salida exitosa: createApplicationResult({ data }) |
| `ApplicationResult` | Salida fallida: createApplicationFailure({ code, message }) |
| `ApplicationError` | Errores inesperados: throw new ApplicationError(...) |
| `ModuleAdministrationOperation` | Enum de operaciones write |
| `ModuleAdministrationQuery` | Enum de operaciones read |

### 4.5 Regla SSOT (Result vs Error)

```
Validaciones conocidas     → createApplicationFailure({ code, message })
Errores inesperados        → throw new ApplicationError(code, message, details, cause)

NUNCA coexisten para el mismo error.
```

---

## 5. Machine States y Transiciones

El servicio implementa un modelo de estados de 生命周期 para módulos:

```
draft ──→ configurable ──→ operational ──→ deprecated ──→ archived
  │                        │                               │
  └────────────────────────┘                               │
  └────────────────────────────────────────────────────────┘
```

### Transiciones válidas

| Estado actual | Estados permitidos |
|---|---|
| `draft` | `configurable` |
| `configurable` | `operational`, `archived` |
| `operational` | `deprecated` |
| `deprecated` | `archived`, `configurable` |
| `archived` | `draft` |

---

## 6. Validaciones Implementadas

| Campo | Regla | Error |
|---|---|---|
| `name` | Requerido, ≥3 caracteres | `VALIDATION_FAILED` |
| `slug` | Requerido, solo `[a-z0-9-]` | `VALIDATION_FAILED` |
| `order_index` | Si se provee, ≥0 | `VALIDATION_FAILED` |
| `visible` | Si se provee, boolean | `VALIDATION_FAILED` |
| `newState` | Debe ser estado válido | `INVALID_STATE` |
| `newState` | Transición debe ser válida | `INVALID_STATE_TRANSITION` |
| `moduleId` | Requerido para operaciones targeting | `VALIDATION_FAILED` |
| `assignments` | Debe ser array | `VALIDATION_FAILED` |

---

## 7. Reglas de Negocio

| Regla | Implementación |
|---|---|
| No se puede eliminar módulo operational | `DELETE_MODULE` retorna failure |
| Transiciones de estado son restringidas | `VALID_STATE_TRANSITIONS` map |
| Solo admin/super_admin pueden escribir | `_checkAuthorization()` |
| Slug duplicado retorna failure | Error code `23505` → `MODULE_ALREADY_EXISTS` |

---

## 8. Dependencias

| Dependencia | Tipo | Notas |
|---|---|---|
| `dynamicService` | Transicional (lectura) | Será reemplazado por repositories |
| `CapabilityAssignmentService` | Delegación | Operational Layer certificada |
| `getSupabaseClient` | Persistencia (escritura) | Encapsulado en el servicio |
| `ApplicationRequest` | Contrato | Common contract v1.0.0 |
| `ApplicationContext` | Contrato | Common contract v1.0.0 |
| `ApplicationResult` | Contrato | Common contract v1.0.0 |
| `ApplicationError` | Contrato | Common contract v1.0.0 |
| `ModuleAdministrationOperation` | Contrato | Domain operation enum |

---

## 9. Código de Ejemplo

### Crear módulo

```javascript
import { ModuleAdministrationApplicationService } from './ModuleAdministrationApplicationService.js';
import { createApplicationRequest } from '../common/contracts/ApplicationRequest.js';
import { createApplicationContext } from '../common/contracts/ApplicationContext.js';

const service = new ModuleAdministrationApplicationService();

const request = createApplicationRequest({
  operation: 'CREATE_MODULE',
  payload: {
    name: 'Control de Proveedores',
    slug: 'control-proveedores',
    description: 'Gestión y evaluación de proveedores',
    icon: 'Truck',
    order_index: 5,
    visible: true,
  },
  actor: { id: 'user-123', role: 'admin' },
});

const context = createApplicationContext({
  actorId: 'user-123',
  actorRole: 'admin',
});

const result = await service.execute(request, context);
// result.success === true
// result.data → { id: '...', name: 'Control de Proveedores', state: 'draft', ... }
```

### Cambiar estado

```javascript
const request = createApplicationRequest({
  operation: 'CHANGE_MODULE_STATE',
  target: 'module-id-123',
  payload: { newState: 'configurable' },
  actor: { id: 'user-123', role: 'admin' },
});

const result = await service.execute(request, context);
// result.data.state === 'configurable'
```

### Error de validación

```javascript
const request = createApplicationRequest({
  operation: 'CREATE_MODULE',
  payload: { name: 'AB', slug: '' },
  actor: { id: 'user-123', role: 'admin' },
});

const result = await service.execute(request, context);
// result.success === false
// result.error.code === 'VALIDATION_FAILED'
// result.error.message === 'Module name is required and must be at least 3 characters'
```

### Error inesperado (throw)

```javascript
// Si Supabase falla inesperadamente:
throw ApplicationError {
  code: 'INFRASTRUCTURE_ERROR',
  message: 'Failed to create module in database',
  details: { supabaseError: '...', code: '...' },
  cause: Error original
}
```

---

## 10. Estrategia de Transición

### Fase actual (Sprint 65C)

| Capa | Estrategia |
|---|---|
| Queries (GET_*) | Delega a dynamicService (transicional) |
| CREATE/UPDATE/DELETE | Supabase directo (encapsulado en el servicio) |
| Capabilities | Delega a CapabilityAssignmentService (Operational Layer) |

### Fase futura (Sprints 66+)

| Capa | Estrategia futura |
|---|---|
| Queries | Repository pattern (ModuleRepository) |
| Writes CRUD | Repository pattern (ModuleRepository) |
| Capabilities | Ya está bien (Operational Layer) |
| dynamicService | Será eliminado como dependencia |

La UI nunca conocerá dynamicService ni Supabase. Solo conocerá `ModuleAdministrationApplicationService`.

---

## 11. Build Verification

```
> npm run build
✓ built in 1.38s
2403 modules transformed
```

---

## 12. Siguiente Sprint

**Sprint 65D:** Integración del Application Service con la UI
- Modificar `ModuleManager.jsx` para usar `ModuleAdministrationApplicationService` en vez de `dynamicService`
- Modificar `moduleEditPanel.jsx` para usar el Application Service
- Verificar que la UI funcione correctamente con el nuevo boundary
