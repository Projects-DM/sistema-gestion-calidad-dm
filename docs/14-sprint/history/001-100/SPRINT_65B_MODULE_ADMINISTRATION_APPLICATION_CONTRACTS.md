# SPRINT 65B — Module Administration Application Contracts (SSOT)

> **Tipo:** Core Architecture / Application Layer / Public Contracts  
> **Nivel esperado:** LEVEL 3 — APPLICATION CONTRACTS CERTIFIED  
> **Estado esperado:** IMPLEMENTADO Y CERTIFICADO  
> **Fecha:** 2026-07-13

---

## 1) Objetivo

Construir la **Application Contracts Layer** para la administración de módulos, estableciendo la frontera oficial entre la UI y el Core.

Este Sprint **no implementa lógica de negocio**, no modifica Runtime, no modifica persistencia y no cambia la experiencia del usuario.

Su objetivo es definir los **contratos públicos** que utilizarán todas las operaciones administrativas futuras.

---

## 2) Arquitectura Objetivo

```text
Configuration UI
        │
        ▼
Module Administration Application Layer
        │
        ▼
Public Contracts  ← ESTE SPRINT
        │
        ▼
Operational Layer
        │
        ▼
Persistence Provider
        │
        ▼
Repository Contract
        │
        ▼
Persistence Adapter
```

---

## 3) Principios Arquitectónicos

### UI independiente
La UI nunca conoce: Supabase, PostgreSQL, MongoDB, Firebase, REST, GraphQL.  
La UI únicamente consume contratos públicos.

### Core independiente
El Core nunca conoce: React, Componentes, Hooks, Runtime, Navegación, Persistencia intercambiable.  
La persistencia se considera un Adapter.

### IA desacoplada
Las futuras integraciones de IA consumirán únicamente: Application Services, Capability Services, Operational Services.  
Nunca: React, Supabase, Componentes, Runtime.

---

## 4) Archivos Creados

### 4.1 Estructura

```
src/core/applicationLayer/
    moduleAdministration/
        contracts/
            ModuleAdministrationOperation.js
            ModuleAdministrationRequest.js
            ModuleAdministrationContext.js
            ModuleAdministrationResult.js
            ModuleAdministrationError.js
```

### 4.2 ModuleAdministrationOperation.js

**Propósito:** Catálogo oficial de operaciones administrativas.

**Exporta:**
- `ModuleAdministrationOperation` — Enum freezeado con 7 operaciones de escritura
- `ModuleAdministrationQuery` — Enum freezeado con 3 operaciones de lectura
- `isWriteOperation(operation)` — Valida si es operación de escritura
- `isReadOperation(operation)` — Valida si es operación de lectura
- `isValidOperation(operation)` — Valida si es operación reconocida

**Operaciones de escritura:**

| Operación | Descripción |
|---|---|
| `CREATE_MODULE` | Crear módulo nuevo en estado Draft |
| `UPDATE_MODULE_METADATA` | Actualizar nombre, slug, descripción |
| `UPDATE_MODULE_VISUAL_CONFIG` | Actualizar icono, orden, visibilidad |
| `ASSIGN_CAPABILITIES` | Reemplazar conjunto de capacidades |
| `REMOVE_CAPABILITIES` | Eliminar todas las capacidades |
| `CHANGE_MODULE_STATE` | Cambiar estado del ciclo de vida |
| `DELETE_MODULE` | Eliminar módulo permanentemente |

**Operaciones de lectura:**

| Operación | Descripción |
|---|---|
| `GET_MODULES` | Obtener lista de módulos |
| `GET_MODULE` | Obtener detalle de un módulo |
| `GET_MODULE_CONFIGURATION` | Obtener configuración de formularios/campos |

**Dependencias externas:** Ninguna.

---

### 4.3 ModuleAdministrationRequest.js

**Propósito:** Representar toda solicitud proveniente de la UI.

**Exporta:**
- `createModuleAdministrationRequest(params)` — Factory function que crea y congela un request

**Campos del request:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `operation` | String | SI | Operación a ejecutar |
| `actor` | Object | No | Quién solicita (id, role, email) |
| `target` | String | No | Identidad del módulo afectado |
| `payload` | Object | No | Datos específicos de la operación |
| `correlationId` | String | No | Identificador de trazabilidad |
| `metadata` | Object | No | Metadata extensible (tenant, locale, etc.) |
| `_createdAt` | String | Auto | Timestamp de creación |

**Restricciones:**
- `operation` es obligatorio y debe ser válido
- El objeto resultante es frozen (inmutable)
- Compatible con multi-tenant, offline, AI

**Dependencias externas:** Ninguna (importa `isValidOperation` de `ModuleAdministrationOperation`).

---

### 4.4 ModuleAdministrationContext.js

**Propósito:** Transportar contexto operacional a través de todo el pipeline.

**Exporta:**
- `createModuleAdministrationContext(params)` — Factory function que crea y congela un context

**Campos del context:**

| Campo | Tipo | Descripción |
|---|---|---|
| `actorId` | String | Identificador del actor |
| `actorRole` | String | Rol del actor |
| `actorEmail` | String | Email del actor |
| `tenantId` | String | Identificador de tenant (multi-tenant) |
| `organizationId` | String | Identificador de organización |
| `locale` | String | Locale preferido (ej: 'es-CO') |
| `correlationId` | String | ID de trazabilidad distribuida |
| `timestamp` | String | Timestamp de la operación |
| `permissions` | Object | Permisos resueltos del actor |
| `metadata` | Object | Metadata extensible |
| `contractVersion` | String | Versión del contrato (auto: '1.0.0') |

**Diseño:**
- Todos los campos son opcionales excepto `contractVersion`
- Diseñado para evolucionar sin breaking changes
- Backward compatible por diseño

**Dependencias externas:** Ninguna.

---

### 4.5 ModuleAdministrationResult.js

**Propósito:** Representar un resultado homogéneo para cualquier operación.

**Exporta:**
- `createModuleAdministrationResult(params)` — Factory para resultados exitosos
- `createModuleAdministrationFailure(params)` — Factory para resultados fallidos

**Campos del result (éxito):**

| Campo | Tipo | Descripción |
|---|---|---|
| `success` | Boolean | `true` siempre |
| `data` | * | Datos de la operación |
| `warnings` | Array | Advertencias no bloqueantes |
| `metadata` | Object | Metadata extensible |
| `correlationId` | String | Trazabilidad |
| `timestamp` | String | Timestamp del resultado |

**Campos del result (fallo esperado):**

| Campo | Tipo | Descripción |
|---|---|---|
| `success` | Boolean | `false` |
| `error` | Object | `{ code, message }` |
| `data` | * | Datos parciales si disponibles |
| `warnings` | Array | Advertencias |
| `metadata` | Object | Metadata |
| `correlationId` | String | Trazabilidad |
| `timestamp` | String | Timestamp |

**Distinción clave:**
- **Result fallido** = fallo esperado (validación, reglas de negocio)
- **Error lanzado** = fallo inesperado (infraestructura, sistema)

**Dependencias externas:** Ninguna.

---

### 4.6 ModuleAdministrationError.js

**Propósito:** Normalizar errores de la Application Layer.

**Exporta:**
- `ModuleAdministrationError` — Clase que extiende `Error`
- `createModuleAdministrationError(params)` — Factory function
- `ModuleAdministrationErrorCode` — Enum freezeado con códigos de error

**Códigos de error:**

| Código | Descripción |
|---|---|
| `INVALID_REQUEST` | Request incompleto |
| `UNKNOWN_OPERATION` | Operación no reconocida |
| `MODULE_NOT_FOUND` | Módulo no encontrado |
| `MODULE_ALREADY_EXISTS` | Módulo duplicado (slug) |
| `INVALID_STATE_TRANSITION` | Transición de estado inválida |
| `MODULE_HAS_DEPENDENCIES` | Módulo tiene dependencias |
| `INVALID_CAPABILITY_ASSIGNMENT` | Asignación de capacidad inválida |
| `CAPABILITY_PACKAGE_NOT_FOUND` | Paquete de capacidad no encontrado |
| `UNAUTHORIZED` | Actor sin permisos |
| `VALIDATION_FAILED` | Validación fallida |
| `INFRASTRUCTURE_ERROR` | Error de infraestructura |
| `INTERNAL_ERROR` | Error interno desconocido |

**Campos del error:**

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | String | `'ModuleAdministrationError'` |
| `code` | String | Código máquina-readable |
| `message` | String | Mensaje humano-readable |
| `details` | * | Detalles estructurados |
| `cause` | Error | Error original (cadena) |
| `timestamp` | String | Timestamp |
| `stack` | String | Stack trace (heredado de Error) |

**Métodos:**
- `toJSON()` — Serializa a objeto plano para logging

**Dependencias externas:** Ninguna (usa Error nativo de JavaScript).

---

## 5) API Pública del Futuro Application Service

Aunque el servicio aún no se implementa, este Sprint deja definida su API pública:

```javascript
// Lecturas
getModules(context)           → ModuleAdministrationResult
getModule(context, moduleId)  → ModuleAdministrationResult
getModuleConfiguration(context, moduleId) → ModuleAdministrationResult

// Escrituras
createModule(context, payload)              → ModuleAdministrationResult
updateModule(context, moduleId, payload)    → ModuleAdministrationResult
deleteModule(context, moduleId)             → ModuleAdministrationResult
assignCapabilities(context, moduleId, assignments) → ModuleAdministrationResult
removeCapabilities(context, moduleId)       → ModuleAdministrationResult
changeModuleState(context, moduleId, newState) → ModuleAdministrationResult
updateModuleVisualConfig(context, moduleId, visualConfig) → ModuleAdministrationResult
```

**Patrón de retorno:** Toda operación retorna `ModuleAdministrationResult`.  
**Patrón de error:** Errores inesperados lanzan `ModuleAdministrationError`.

---

## 6) Compatibilidad Futura

Los contratos están diseñados para soportar sin rediseño:

| Capacidad | Cómo se soporta |
|---|---|
| Multiempresa | `context.organizationId` |
| Multibase de datos | Adapter pattern en persistence layer |
| Multi-tenant | `context.tenantId` |
| Offline | `result.metadata` puede incluir sync status |
| Sincronización | `request.correlationId` + `result.timestamp` |
| IA | Consumen Application Services, no UI |
| Automatizaciones | Mismo patrón Request → Result |
| Plugins | Nuevos operaciones se agregan al enum |
| Marketplace | Contratos son independientes del dominio |
| Microservicios | Contratos son transport-agnostic |

---

## 7) Verificación de Build

```
npm run build
✓ 2403 modules transformed.
✓ built in 1.31s
```

**Build exitoso.** Los contratos compilan correctamente con Vite/Rolldown.

---

## 8) Criterios de Certificación

| Criterio | Estado |
|---|---|
| Contratos públicos homogéneos | PASS — 5 contratos con patrón consistente |
| Sin dependencias hacia React | PASS — Zero imports de React |
| Sin dependencias hacia Runtime | PASS — Zero imports de Runtime |
| Sin dependencias hacia Supabase | PASS — Zero imports de Supabase |
| Compatibles con cualquier motor de persistencia | PASS — Contratos son transport-agnostic |
| Compatibles con futuras capacidades de IA | PASS — Patrón Request→Result genérico |
| Compatibles con arquitectura multi-tenant | PASS — context.tenantId disponible |
| Reutilizables por cualquier módulo administrativo futuro | PASS — Contratos genéricos, no específicos de módulos |

---

## 9) Checklist

- [x] `ModuleAdministrationOperation.js` — 7 operaciones escritura + 3 lectura + helpers
- [x] `ModuleAdministrationRequest.js` — Factory con validación y frozen output
- [x] `ModuleAdministrationContext.js` — Contexto extensible y backward compatible
- [x] `ModuleAdministrationResult.js` — Result success + Result failure factories
- [x] `ModuleAdministrationError.js` — Error class + 12 códigos + factory
- [x] Zero dependencias externas en todos los contratos
- [x] `npm run build` exitoso
- [x] Documentación SSOT creada

---

## 10) Dictamen Final

**SPRINT 65B — APPLICATION CONTRACTS CERTIFIED.**

Se certifica porque:
1. Los 5 contratos públicos existen y funcionan
2. Zero dependencias hacia React/Runtime/Supabase
3. Patrón homogéneo Request → Context → Result/Error
4. Operaciones oficiales definidas (7 escritura + 3 lectura)
5. Códigos de error tipados (12 códigos)
6. Compatible con multi-tenant, offline, IA, microservicios
7. `npm run build` exitoso
8. Preparado para Sprint 65C (Application Service Implementation)

---

## 11) Próximo Sprint

**Sprint 65C — Module Administration Application Service Implementation**

Implementará el `ModuleAdministrationApplicationService` que:
- Recibe Requests
- Valida Context
- Delega a Operational Layer / dynamicService
- Retorna Results
- Lanza Errors

Los contratos definidos en este Sprint 65B serán la base estable para esa implementación.
