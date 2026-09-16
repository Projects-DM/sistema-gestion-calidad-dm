# SPRINT 65B.1 — Application Contracts Consolidation (SSOT)

> **Tipo:** Core Architecture / Application Layer / Contracts Consolidation  
> **Nivel esperado:** LEVEL 3 — APPLICATION CONTRACTS CONSOLIDATED  
> **Estado esperado:** IMPLEMENTADO Y CERTIFICADO  
> **Fecha:** 2026-07-13

---

## 1) Objetivo

Consolidar la arquitectura de contratos de la Application Layer antes de comenzar cualquier implementación funcional.

Este sprint **no modifica comportamiento**, no modifica Runtime, no modifica persistencia, no modifica UI.

Su único propósito es estabilizar la arquitectura contractual.

---

## 2) Motivación

Durante la revisión del Sprint 65B se identificaron oportunidades de mejora:

| Problema | Solución |
|---|---|
| Contratos específicos de dominio no reutilizables | Separar contratos comunes del dominio |
| Result y Error mezclados en un mismo archivo | Separar `ApplicationResult` (funcional) de `ApplicationError` (excepciones) |
| Sin versionado de contratos | Agregar `contractName` + `contractVersion` a todos los contratos |
| Metadata plana | Normalizar metadata con `source`, `featureFlags`, `telemetry`, `tracing`, `audit` |

---

## 3) Estructura Final

```
src/core/applicationLayer/
    common/
        contracts/
            ApplicationRequest.js      ← Genérico, reutilizable
            ApplicationContext.js      ← Genérico, reutilizable
            ApplicationResult.js       ← Genérico, reutilizable
            ApplicationError.js        ← Genérico, reutilizable

    moduleAdministration/
        contracts/
            ModuleAdministrationOperation.js  ← Específico del dominio
```

---

## 4) Contratos Comunes

### 4.1 ApplicationRequest

**Propósito:** Representar toda solicitud desde cualquier caller hacia cualquier Application Service.

**Campos:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `contractName` | String | Auto | `'ApplicationRequest'` |
| `contractVersion` | String | Auto | `'1.0.0'` |
| `operation` | String | SI | Operación a ejecutar |
| `actor` | Object | No | Quién solicita (id, role, email) |
| `target` | String | No | Identidad de la entidad afectada |
| `payload` | Object | No | Datos de la operación |
| `correlationId` | String | No | Trazabilidad |
| `metadata` | Object | No | Metadata normalizada |
| `_createdAt` | String | Auto | Timestamp |

**Metadata normalizada:**

```javascript
metadata: {
  source: 'UI' | 'API' | 'AI' | 'Scheduler' | 'Import' | 'Automation',
  featureFlags: { ... },
  telemetry: { ... },
  tracing: { ... },
  audit: { ... },
  custom: { ... }
}
```

**Dependencias:** Ninguna.

---

### 4.2 ApplicationContext

**Propósito:** Transportar contexto operacional a través de todo el pipeline.

**Campos:**

| Campo | Tipo | Descripción |
|---|---|---|
| `contractName` | String | `'ApplicationContext'` |
| `contractVersion` | String | `'1.0.0'` |
| `actorId` | String | Identificador del actor |
| `actorRole` | String | Rol del actor |
| `actorEmail` | String | Email del actor |
| `tenantId` | String | Multi-tenant |
| `organizationId` | String | Multi-empresa |
| `locale` | String | Locale preferido |
| `correlationId` | String | Trazabilidad distribuida |
| `timestamp` | String | Timestamp |
| `permissions` | Object | Permisos resueltos |
| `metadata` | Object | Metadata extensible |

**Diseño:** Todos los campos opcionales excepto `contractName` y `contractVersion`. Backward compatible por diseño.

**Dependencias:** Ninguna.

---

### 4.3 ApplicationResult

**Propósito:** Representar resultados funcionales (éxito o fallo esperado).

**SSOT Rule:**
```
Validaciones         → ApplicationResult(success=false)
Unexpected errors    → throw ApplicationError
```

**Campos (éxito):**

| Campo | Tipo | Descripción |
|---|---|---|
| `contractName` | String | `'ApplicationResult'` |
| `contractVersion` | String | `'1.0.0'` |
| `success` | Boolean | `true` |
| `data` | * | Datos de la operación |
| `warnings` | Array | Advertencias no bloqueantes |
| `metadata` | Object | Metadata extensible |
| `correlationId` | String | Trazabilidad |
| `timestamp` | String | Timestamp |

**Campos (fallo funcional):**

| Campo | Tipo | Descripción |
|---|---|---|
| `success` | Boolean | `false` |
| `error` | Object | `{ code, message }` |
| `data` | * | Datos parciales |
| `warnings` | Array | Advertencias |
| `metadata` | Object | Metadata |
| `correlationId` | String | Trazabilidad |
| `timestamp` | String | Timestamp |

**Exporta:**
- `createApplicationResult(params)` — Factory para éxito
- `createApplicationFailure(params)` — Factory para fallo funcional

**Dependencias:** Ninguna.

---

### 4.4 ApplicationError

**Propósito:** Representar errores inesperados (infraestructura, sistema).

**SSOT Rule:**
```
Validaciones         → ApplicationResult(success=false)
Unexpected errors    → throw ApplicationError
```

**Códigos estándar:**

| Código | Descripción |
|---|---|
| `INVALID_REQUEST` | Request incompleto |
| `UNKNOWN_OPERATION` | Operación no reconocida |
| `ENTITY_NOT_FOUND` | Entidad no encontrada |
| `ENTITY_ALREADY_EXISTS` | Entidad duplicada |
| `UNAUTHORIZED` | Sin permisos |
| `VALIDATION_FAILED` | Validación fallida |
| `INFRASTRUCTURE_ERROR` | Error de infraestructura |
| `INTERNAL_ERROR` | Error interno |

**Exporta:**
- `ApplicationError` — Clase que extiende `Error`
- `createApplicationError(params)` — Factory
- `ApplicationErrorCode` — Enum de códigos estándar

**Dependencias:** Ninguna (usa Error nativo).

---

## 5) Contratos de Dominio

### 5.1 ModuleAdministrationOperation

**Propósito:** Catálogo oficial de operaciones administrativas de módulos.

**Se mantiene sin cambios** del Sprint 65B. Es el único contrato de dominio en esta fase.

**Operaciones de escritura (7):**
- `CREATE_MODULE`, `UPDATE_MODULE_METADATA`, `UPDATE_MODULE_VISUAL_CONFIG`
- `ASSIGN_CAPABILITIES`, `REMOVE_CAPABILITIES`
- `CHANGE_MODULE_STATE`, `DELETE_MODULE`

**Operaciones de lectura (3):**
- `GET_MODULES`, `GET_MODULE`, `GET_MODULE_CONFIGURATION`

**Dependencias:** Ninguna.

---

## 6) Eliminación de Duplicaciones

| Archivo eliminado | Reemplazado por |
|---|---|
| `ModuleAdministrationRequest.js` | `common/contracts/ApplicationRequest.js` |
| `ModuleAdministrationContext.js` | `common/contracts/ApplicationContext.js` |
| `ModuleAdministrationResult.js` | `common/contracts/ApplicationResult.js` |
| `ModuleAdministrationError.js` | `common/contracts/ApplicationError.js` |

**Verificación:** grep confirmó que ningún archivo importa los contratos eliminados.

---

## 7) Versionado de Contratos

Todos los contratos incluyen:

| Campo | Valor | Propósito |
|---|---|---|
| `contractName` | String (ej: `'ApplicationRequest'`) | Identificador del contrato |
| `contractVersion` | `'1.0.0'` | Versión del contrato |

**Reglas de versionado:**
- `1.0.0` → Versión inicial
- Cambios menores (campo opcional nuevo) → `1.1.0`
- Cambios mayores (campo obligatorio nuevo, cambio de tipo) → `2.0.0`

---

## 8) Revisión de Dependencias

| Contrato | React | Runtime | Supabase | Repository | Operational Layer |
|---|---|---|---|---|---|
| ApplicationRequest | NO | NO | NO | NO | NO |
| ApplicationContext | NO | NO | NO | NO | NO |
| ApplicationResult | NO | NO | NO | NO | NO |
| ApplicationError | NO | NO | NO | NO | NO |
| ModuleAdministrationOperation | NO | NO | NO | NO | NO |

**PASS** — Zero dependencias externas en todos los contratos.

---

## 9) Build

```
npm run build
✓ built in 1.27s
```

**PASS** — Build exitoso.

---

## 10) Checklist

- [x] `common/contracts/ApplicationRequest.js` — Creado con metadata normalizada
- [x] `common/contracts/ApplicationContext.js` — Creado con backward compatibility
- [x] `common/contracts/ApplicationResult.js` — Creado con success + failure factories
- [x] `common/contracts/ApplicationError.js` — Creado con 8 códigos estándar
- [x] `moduleAdministration/contracts/ModuleAdministrationOperation.js` — Mantenido sin cambios
- [x] 4 contratos obsoletos eliminados
- [x] Zero dependencias externas
- [x] Todos los contratos versionados (contractName + contractVersion)
- [x] Metadata extensible (source, featureFlags, telemetry, tracing, audit)
- [x] `npm run build` exitoso

---

## 11) Dictamen Final

**SPRINT 65B.1 — APPLICATION CONTRACTS CONSOLIDATED.**

Se certifica porque:
1. Contratos comunes separados del dominio
2. Result y Error desacoplados (SSOT rule aplicada)
3. Todos los contratos versionados
4. Metadata extensible normalizada
5. Compatible con IA, multi-tenant, microservicios
6. Zero dependencias externas
7. `npm run build` exitoso
8. Preparado para Sprint 65C (Application Service)
