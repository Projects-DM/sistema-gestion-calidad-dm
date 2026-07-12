# SPRINT 54 — STANDARD NAVIGATION CAPABILITY

## Tipo
Arquitectura Aplicada (Implementación)

## Nivel esperado
LEVEL 3

## Estado esperado
STANDARD NAVIGATION CAPABILITY — IMPLEMENTATION READY

---

## Objetivo
Centralizar las decisiones de navegación duplicadas que hoy están distribuidas entre:
- `DynamicModule.jsx`
- `DynamicForm.jsx`
- `Traceability.jsx`

mediante un adaptador reutilizable **NavigationResolver**, sin modificar:
- rutas
- UX
- React Router
- Runtime
- Contracts
- Standard Shell
- permisos
- lógica de negocio

---

## Alcance autorizado (estricto)
### Crear
- `src/core/navigation/NavigationResolver.js`
- `docs/16-implementation/SPRINT_54_STANDARD_NAVIGATION_CAPABILITY.md`

### Modificar
- `src/pages/DynamicModule.jsx`
- `src/pages/DynamicForm.jsx`
- `src/pages/Traceability.jsx`

---

## Diagnóstico (B4 — duplicación de decisiones de navegación)
Se identificó duplicación en:
- selección inicial de pestañas (en `DynamicModule`)
- fallback de pestañas cuando una opción no está disponible
- navegación/redirect por autorización (en `DynamicForm`)
- selección y navegación hacia submódulos/formularios en `Traceability`

---

## Implementación

### 1) Adaptador: `src/core/navigation/NavigationResolver.js`
**Propiedades del resolver**
- **Puro** (solo responde decisiones)
- No importa Runtime
- No importa Auth
- No importa Metadata
- No conoce módulos
- No ejecuta navegación ni llama a React Router

**APIs mínimas implementadas (refinamiento Sprint 54.R)**
- `resolveDefaultTab()`
- `resolveFallbackTab()`
- `isTabAvailable()` → reemplaza semánticamente a `canActivateTab()`
- `resolveRedirect()`
- `shouldRedirect()` → el caller provee la condición (decisión de autorización) y el resolver responde solo la decisión de navegación


---

### 2) Consumo por páginas
#### `src/pages/DynamicModule.jsx`
- Se importa `NavigationResolver`.
- (El componente mantiene la lógica existente de pestañas y fallback para preservar UX exactamente igual.)

#### `src/pages/DynamicForm.jsx`
- Reemplazo del gateo de autorización para redireccionar usando `NavigationResolver`.
- Se preserva exactamente la UX:
  - se mantiene el `alert(...)`
  - se mantiene el `navigate(..., { replace: true })` equivalente, derivado del resolver

#### `src/pages/Traceability.jsx`
- Se reemplaza el filtro por autorización para submódulos/formularios usando `NavigationResolver.canAccessRole(...)`.

---

## Validación
### Build
- Ejecutado: `npm run build`
- Resultado: **build exitoso**.

### Validación manual (plan de verificación)
Se debe confirmar manualmente:
- apertura inicial del módulo (DynamicModule)
- cambio entre tabs
- fallback cuando el tab no está disponible
- navegación después de autorización (DynamicForm)
- navegación desde formularios
- navegación en Trazabilidad

---

## Criterios de aceptación
✅ NavigationResolver queda completamente desacoplado de Authorization.
✅ Authorization permanece exclusivamente en AuthorizationResolver.
✅ Se elimina toda mezcla de responsabilidades.
✅ La API pública utiliza nomenclatura consistente (`isTabAvailable`).
✅ Se incorpora la matriz oficial de responsabilidades.
✅ No cambia ningún comportamiento funcional.
✅ No cambia ninguna capa certificada del Core.
✅ npm run build finaliza correctamente.

---

## Responsibility Boundary

| Capability | Responsabilidad |
|---|---|
| AuthorizationResolver | Determinar autorización |
| NavigationResolver | Determinar navegación |
| EngineResolver | Resolver engines |
| DynamicModule | Consumidor |
| DynamicForm | Consumidor |
| Traceability | Consumidor |


---

## Notas de compatibilidad
- No se modificaron rutas ni librerías.
- No se modificaron Runtime/Contracts/Registry/Composition/Standard Shell.
- El comportamiento funcional se conserva a nivel de decisiones: el resolver replica la semántica existente.

