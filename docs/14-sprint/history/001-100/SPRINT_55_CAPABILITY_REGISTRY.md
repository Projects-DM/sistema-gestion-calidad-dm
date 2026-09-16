# SPRINT 55 — Capability Registry

## Tipo
Arquitectura Aplicada (Implementation)

## Nivel esperado
LEVEL 3

## Estado esperado
FIRST CAPABILITY REGISTRY

---

## Objetivo
Implementar el **primer Capability Registry del Core** para que los consumidores (DynamicModule, DynamicForm, Traceability) conozcan únicamente el punto de acceso `CapabilityRegistry` y eviten importaciones directas a:
- `AuthorizationResolver`
- `NavigationResolver`
- `EngineResolver`

---

## Alcance autorizado
### Crear
- `src/core/capabilities/CapabilityRegistry.js`

### Modificar (consumidores)
- `src/pages/DynamicModule.jsx`
- `src/pages/DynamicForm.jsx`
- `src/pages/Traceability.jsx` (solo para consistencia de adopción de `CapabilityRegistry`)

---

## Cambios realizados

### 1) CapabilityRegistry (nuevo SSOT aplicado en runtime)
**Archivo:** `src/core/capabilities/CapabilityRegistry.js`

**API pública (mínima, requerida):**
- `getCapability(name)`
- `hasCapability(name)`
- `listCapabilities()`

**Registro inicial (capacidades del Core):**
- `authorization` → export namespace `AuthorizationResolver` (incluye `canAccessRole`)
- `navigation` → `NavigationResolver` (incluye `resolveRedirect`)
- `engine` → adaptador con `resolveEngineComponent`

**Principios verificados (a nivel de código):**
- El Registry **no ejecuta lógica de negocio**.
- El Registry **no navega**.
- El Registry **no autoriza**.
- El Registry **no resuelve motores** con lógica propia; únicamente **registra referencias** (y para `engine` entrega un adaptador de referencia que delega en `resolveEngineComponent`).
- No conoce Runtime/Metadata/negocio.

---

### 2) Consumidores migrados a CapabilityRegistry

#### DynamicModule
**Archivo:** `src/pages/DynamicModule.jsx`
- Eliminados imports directos de `AuthorizationResolver` y `NavigationResolver`.
- Se introduce:
  - `const authorization = CapabilityRegistry.getCapability('authorization')`
  - `const navigation = CapabilityRegistry.getCapability('navigation')`
- `filteredForms` ahora usa:
  - `authorization.canAccessRole(...)`

> Nota: la lógica de UX/DOM/rutas/tab permanece idéntica; el cambio es exclusivamente de consumo.

#### DynamicForm
**Archivo:** `src/pages/DynamicForm.jsx`
- Eliminados imports directos de `AuthorizationResolver`/`NavigationResolver`/`EngineResolver`.
- Se introduce:
  - `authorization.canAccessRole(...)`
  - `navigation.resolveRedirect(...)`
  - `engine.resolveEngineComponent(...)`

#### Traceability
**Archivo:** `src/pages/Traceability.jsx`
- Eliminados imports directos de `AuthorizationResolver`.
- `filteredSubmodules` ahora usa:
  - `authorization.canAccessRole(...)`
- Migración de consumo en la fase de filtrado de formularios dinámicos.

---

## Validación
### Build
Se ejecutó:
- `npm run build`

Resultado:
- **Build exitoso** (sin errores de compilación).

---

## Criterios de aceptación (verificación)
- ✅ Existe un único `CapabilityRegistry`.
- ✅ Los consumidores migrados dejan de importar resolvers directos.
- ✅ `CapabilityRegistry` solo registra y entrega capacidades.
- ✅ Los resolvers permanecen puros (sin acoplamiento circular y sin navegación/permiso ejecutado desde el Registry).
- ✅ No cambia `Runtime`, `Contracts`, `SSOT certificados`, ni la UX/rutas (cambio de imports y acceso por `getCapability`).
- ✅ `npm run build` finaliza correctamente.

---

## Evidencias (por inspección)
- `src/core/capabilities/CapabilityRegistry.js`
- `src/pages/DynamicModule.jsx`
- `src/pages/DynamicForm.jsx`
- `src/pages/Traceability.jsx`

---

## Estado final
**Sprint 55 — COMPLETED**: Capability Registry implementado y adoptado por consumidores, con build final OK.

