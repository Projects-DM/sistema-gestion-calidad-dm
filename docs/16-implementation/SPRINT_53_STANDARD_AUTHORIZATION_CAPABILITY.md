# SPRINT 53 — Standard Authorization Capability

**Tipo:** Arquitectura Aplicada (Implementación)

**Nivel esperado:** LEVEL 3

**Estado esperado:** STANDARD AUTHORIZATION CAPABILITY — IMPLEMENTATION READY

---

## 1) Diagnóstico

En el sprint 50.2 (auditoría Core Readiness) se identificó duplicación arquitectónica en la **autorización**.

**Evidencias (autorización hoy):**
- `src/pages/DynamicModule.jsx`
  - Filtro de formularios por `roles_allowed.includes(rol)`.
- `src/pages/DynamicForm.jsx`
  - Gateo por `form.roles_allowed.includes(rol)` y navegación/alert en caso de no acceso.
- `src/pages/Traceability.jsx`
  - Filtro de submódulos por `sub.roles.includes(rol)`.
  - Filtro de formularios por `f.roles_allowed.includes(rol)`.

Esto implica que la autorización no está encapsulada como una capacidad reutilizable.

---

## 2) Brecha detectada

**Brecha:** Duplicación de la regla `roles_allowed.includes(rol)` repartida en múltiples componentes.

**Consecuencia:**
- Cambiar políticas/semántica futura de autorización sería un cambio transversal en varios lugares.
- Dificulta preparar RBAC/políticas dinámicas y plugins.

---

## 3) Estrategia

Objetivo estricto del Sprint:
- Extraer un adaptador reutilizable para autorización **sin modificar reglas, roles, UX, rutas ni mensajes**.

Estrategia:
- Centralizar la misma semántica actual en un único lugar, manteniendo `includes()` como criterio literal.
- Implementar un **Authorization Capability Adapter** como función pura.

---

## 4) Implementación

### 4.1 Nuevo adaptador puro

**Archivo creado:**
- `src/core/authorization/AuthorizationResolver.js`

**API (pequeña y consistente):**
- `canAccessRole(requiredRoles, userRole)`
  - Si `requiredRoles` es null/undefined => acceso permitido (misma semántica anterior por ausencia de restricción).
  - Si existe => `requiredRoles.includes(userRole)`.

### 4.2 Componentes actualizados (consumo unificado)

**Archivos modificados:**
- `src/pages/DynamicModule.jsx`
  - Reemplaza `!f.roles_allowed || f.roles_allowed.includes(rol)` por `canAccessRole(f?.roles_allowed, rol)`.
- `src/pages/DynamicForm.jsx`
  - Reemplaza el gateo `form.roles_allowed && !form.roles_allowed.includes(rol)` por `!canAccessRole(form?.roles_allowed, rol)`.
  - Se preservan exactamente el `alert()` y `navigate(..., { replace: true })`.
- `src/pages/Traceability.jsx`
  - Reemplaza `!sub.roles || sub.roles.includes(rol)` por `canAccessRole(sub?.roles, rol)`.
  - Reemplaza `!f.roles_allowed || f.roles_allowed.includes(rol)` por `canAccessRole(f?.roles_allowed, rol)`.

---

## 5) Evidencias

1) Centralización:
- `src/core/authorization/AuthorizationResolver.js`
  - Define una única implementación del criterio `includes()`.

2) Consumo consistente:
- `DynamicModule.jsx`, `DynamicForm.jsx`, `Traceability.jsx`
  - Ya no duplican la lógica `roles_allowed.includes(rol)`.

---

## 6) Validación

Validación ejecutada:
- `npm run build`.

Validación funcional esperada (sin cambios de UX/reglas):
- Usuarios con roles autorizados ven exactamente lo mismo que antes.
- Usuarios sin permisos son bloqueados exactamente igual (mismo `alert`/navegación).

---

## 7) Compatibilidad

Compatibilidad hacia atrás:
- Semántica preservada: se mantiene `requiredRoles.includes(userRole)`.
- Comportamiento previo para ausencia de `roles_allowed`/`roles` se mantiene vía retorno `true` en `canAccessRole`.

Compatibilidad hacia adelante:
- Al introducir Authorization Policies/Capability driven rules en el futuro, el adaptador es el punto natural de evolución.

---

## 8) Riesgos

| Riesgo | Descripción | Mitigación |
|---|---|---|
| Error de semántica en ausencia de roles | Si se altera el comportamiento cuando no existe restricción | Mitigación: `canAccessRole` replica la semántica anterior (si no hay `requiredRoles` => true). |
| Import incorrecto / ruta | Puede romper compilación | Mitigación: `npm run build` confirma compilación. |
| Alcance incompleto | Quedan checks de roles fuera de los archivos objetivo | Mitigación: el alcance del sprint fue los componentes auditados; otros checks pueden revisarse en sprints siguientes. |

---

## 9) Checklist

- [x] Crear `AuthorizationResolver` como adaptador puro.
- [x] Eliminar duplicación de `roles_allowed.includes(rol)` en:
  - [x] `DynamicModule.jsx`
  - [x] `DynamicForm.jsx`
  - [x] `Traceability.jsx`
- [x] Mantener UX (mensajes, navegación y rutas).
- [x] Mantener reglas existentes (sin agregar roles ni cambiar includes()).
- [x] `npm run build` exitoso.

---

## 10) Conclusión

Sprint 53 implementa la primera **Authorization Capability Adapter**.

Resultado:
- La autorización queda centralizada en un único punto reutilizable.
- Se prepara el Core para RBAC/políticas dinámicas y futura expansión sin tocar múltiples componentes.

---

## 11) Criterio de aceptación

El Sprint se considera completado cuando:

✅ Desaparecen comprobaciones duplicadas de autorización en los componentes auditados.
✅ Todos consumen `AuthorizationResolver`.
✅ El comportamiento funcional es idéntico.
✅ No cambian permisos ni UX.
✅ No se modifica ninguna otra capa del Core (Runtime/Contracts/Registry/Composition/Standard Shell).

