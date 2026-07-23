# Sprint 98 — Universal Operational Rules Engine Certification

**Tipo:** Operational Rules & Business Intelligence Architecture Certification
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 91, Sprint 94, Sprint 95, Sprint 96, Sprint 97
**Branch:** `operativo-v1`
**Build:** 0 errores, 2705 módulos, 2.23s
**Archivos modificados:** 10 (6 creados, 4 modificados)

---

## Objetivo

Certificar el Universal Operational Rules Engine como la **única capa oficial** responsable de la ejecución de reglas operacionales, validaciones, automatizaciones y compliance de **todas** las Operational Experiences del SGC-DM.

## Problema arquitectónico

El Universal Runtime ya importa, normaliza, persiste, renderiza y exporta. Pero no existe una capa certificada para:

- Validaciones de campos obligatorios, rangos, formatos
- Reglas de negocio (dependencias entre campos)
- Compliance operacional (alertas, umbrales)
- Automatizaciones (fecha/hora actual, valores por defecto)
- Visibilidad dinámica (mostrar/ocultar campos según valores)

Sin esta capa, cada experiencia futura empezaría a implementar su propia lógica en el Runtime.

## Filosofía certificada

```
ONE EXPERIENCE = ONE CONTRACT = ONE UNIVERSAL RULES ENGINE
```

## Arquitectura certificada

```
Operational Experience Contract
  ├── validationRules   → ValidationProcessor
  ├── businessRules     → BusinessRulesProcessor
  ├── complianceRules   → ComplianceProcessor
  ├── automationRules   → AutomationProcessor
  └── visibilityRules   → VisibilityProcessor
          ↓
   UniversalOperationalRulesEngine (orchestrator)
          ↓
   Universal Runtime / Universal Import Workflow
```

## Cambios por archivo

### 1. Creado: `src/core/capabilities/experiences/rules/UniversalOperationalRulesEngine.js`

Orquestador que expone 3 APIs consumidas por Runtime e Import Workflow:

| API | Propósito |
|-----|-----------|
| `evaluateRecord(record, contract)` | Retorna `{ isValid, validationErrors, businessErrors, complianceIssues, allErrors }` |
| `applyFormAutomations(data, contract)` | Aplica automationRules (setCurrentDate, setCurrentTime, setDefault) |
| `getFormVisibility(data, contract)` | Computa visibilityRules → `{ field: true/false }` |

### 2. Creado: `src/core/capabilities/experiences/rules/ValidationProcessor.js`

Valida un registro contra `validationRules` del contrato.

| Regla | Comportamiento |
|-------|---------------|
| `required: true` | Rechaza si vacío |
| `min: number` | Rechaza si valor < min |
| `max: number` | Rechaza si valor > max |
| `format: 'date'` | Rechaza si no YYYY-MM-DD |
| `format: 'time'` | Rechaza si no HH:mm |
| `format: 'number'` | Rechaza si no numérico |
| `pattern: regex` | Rechaza si no coincide |

Retorna `[{ field, message }]`.

### 3. Creado: `src/core/capabilities/experiences/rules/BusinessRulesProcessor.js`

Valida dependencias entre campos. Si `field` tiene valor, verifica que `requires[]` tengan valor.

```js
{ field: 'producto', requires: ['lote'] }
```

Retorna `[{ field, message }]`.

### 4. Creado: `src/core/capabilities/experiences/rules/ComplianceProcessor.js`

Evalúa condiciones operacionales y genera alertas sin bloquear.

| Operator | Comportamiento |
|----------|---------------|
| `greaterThan` | Alerta si valor > threshold |
| `lessThan` | Alerta si valor < threshold |
| `equals` | Alerta si valor === target |
| `notEmpty` | Alerta si campo tiene valor |
| `isEmpty` | Alerta si campo vacío |

Retorna `[{ field, message, severity, value, detail }]`.

### 5. Creado: `src/core/capabilities/experiences/rules/AutomationProcessor.js`

Aplica automatizaciones al abrir el formulario.

| Action | Comportamiento |
|--------|---------------|
| `setCurrentDate` | Establece fecha actual si campo vacío |
| `setCurrentTime` | Establece hora actual si campo vacío |
| `setDefault` | Establece valor por defecto si campo vacío |

### 6. Creado: `src/core/capabilities/experiences/rules/VisibilityProcessor.js`

Determina qué campos mostrar/ocultar según valores de otros campos.

Soporta sintaxis string shorthand (`notEmpty`, `isEmpty`, `truthy`) y object syntax (`{ operator, value }`).

### 7. Modificado: `src/core/capabilities/experiences/OperationalExperienceRegistry.js`

**Descriptor actualizado** con 5 nuevas secciones:

| Sección | Propósito |
|---------|-----------|
| `validationRules` | `{ field: { required, min, max, format, pattern } }` |
| `businessRules` | `[{ field, requires: [] }]` |
| `complianceRules` | `[{ field, operator, value, severity, message }]` |
| `automationRules` | `[{ field, action, value }]` |
| `visibilityRules` | `[{ field, showWhen }]` |

**Dispatches contract actualizado con reglas reales:**

```js
validationRules: {
  cliente: { required: true },
  producto: { required: true },
  cantidad: { min: 1 },
},
businessRules: [
  { field: 'producto', requires: ['lote'] },
  { field: 'cliente', requires: ['producto'] },
],
complianceRules: [
  { field: 'cantidad', operator: 'greaterThan', value: 200, severity: 'info',
    message: 'Despacho mayor a 200 bolsas — verificar capacidad' },
],
automationRules: [
  { field: 'fecha', action: 'setCurrentDate' },
  { field: 'hora', action: 'setCurrentTime' },
],
visibilityRules: [
  { field: 'observaciones', showWhen: { producto: 'notEmpty' } },
],
```

### 8. Modificado: `src/modules/experiences/UniversalImportWorkflow.jsx`

- Importa `evaluateRecord` del Rules Engine
- Cada fila normalizada pasa por `evaluateRecord()`:
  - `_errors`: validation + business errors
  - `_compliance`: compliance issues
  - `_included`: auto-deselect rows con errores de validación
- Tabla de preview incluye columna "Validación" con iconos:
  - ✅ Verde: fila válida
  - ⚠️ Rojo: errores de validación (tooltip con mensajes)
  - 🛡️ Naranja: alertas de compliance (tooltip con mensajes)
- Sección de "Alertas de compliance" agrupada por fila

### 9. Modificado: `src/modules/experiences/UniversalOperationalRuntime.jsx`

- **Formulario**: `applyFormAutomations()` al abrir (nuevo o editar)
  - Setea fecha/hora actual automáticamente
  - Setea valores por defecto
- **Validación**: `evaluateRecord()` al hacer submit
  - Bloquea si hay errores; muestra mensajes por campo
  - Campos con error: borde rojo + fondo rojo + mensaje
  - Campos con compliance: mensaje naranja
- **Visibilidad**: `getFormVisibility()` al abrir y al cambiar campos
  - `visibility[f] === false` → campo oculto

## Pipeline certificado

```
Documento
  ↓
Import Engine
  ↓
Normalizer
  ↓
Operational Contract (validationRules, businessRules, complianceRules, automationRules, visibilityRules)
  ↓
Universal Rules Engine
  ├── ValidationProcessor  →  errores obligatorios/rangos/formatos
  ├── BusinessProcessor    →  dependencias entre campos
  ├── ComplianceProcessor  →  alertas operacionales no bloqueantes
  ├── AutomationProcessor  →  auto-fill al abrir formulario
  └── VisibilityProcessor  →  mostrar/ocultar dinámicamente
  ↓
Universal Runtime / Import Workflow
  ↓
Persistence
  ↓
Audit Layer (Sprint 99)
  ↓
Dashboard (Sprint 100)
```

## Nuevas reglas = solo contrato

```
// Antes (prohibido)
if (cliente === '') { error }
if (temperatura > 4) { warning }
setDefault('fecha')

// Después (contract-driven)
validationRules: { cliente: { required: true } }
complianceRules: [{ field: 'temperatura', operator: 'greaterThan', value: 4 }]
automationRules: [{ field: 'fecha', action: 'setCurrentDate' }]
```

## Principios certificados

| Principio | Aplicación |
|-----------|-----------|
| REUSE FIRST | Rules Engine reutilizable |
| ONE RULES ENGINE | ✅ Certificado — UniversalOperationalRulesEngine es el ÚNICO |
| ZERO DOMAIN LOGIC | ✅ Runtime jamás hace `if (dispatches)` ni `if (temperatura > 4)` |
| CONTRACT DRIVEN RULES | ✅ Toda regla desde `contract.validationRules`, etc. |
| UNIVERSAL VALIDATIONS | ✅ ValidationProcessor |
| UNIVERSAL COMPLIANCE | ✅ ComplianceProcessor |
| UNIVERSAL AUTOMATIONS | ✅ AutomationProcessor |
| UNIVERSAL VISIBILITY | ✅ VisibilityProcessor |
| ZERO NEW RUNTIMES | ✅ Runtime reutilizado sin lógica de negocio |
| MULTI COMPANY READY | ✅ Contract intercambiable |
| ERP READY | ✅ Contract intercambiable |
| AI READY | ✅ Reglas descriptivas legibles por IA |

## Restricciones arquitectónicas certificadas

Queda prohibido crear:
- `DispatchRulesEngine` ❌
- `InventoryRulesEngine` ❌
- `ProductionRulesEngine` ❌
- `QualityRulesEngine` ❌
- `PurchaseRulesEngine` ❌

Queda prohibido implementar lógica de negocio en:
- Runtime ❌
- Import Workflow ❌
- Persistence Layer ❌

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Universal Operational Rules Engine certificado | ✅ `UniversalOperationalRulesEngine.js` |
| 2 | Validation Rules certificadas | ✅ `ValidationProcessor.js` |
| 3 | Business Rules certificadas | ✅ `BusinessRulesProcessor.js` |
| 4 | Compliance Rules certificadas | ✅ `ComplianceProcessor.js` |
| 5 | Automation Rules certificadas | ✅ `AutomationProcessor.js` |
| 6 | Visibility Rules certificadas | ✅ `VisibilityProcessor.js` |
| 7 | Contract Driven Rules certificado | ✅ 5 secciones nuevas en el contrato |
| 8 | Zero Domain Logic certificado | ✅ Sin `if (dispatches)` en Runtime |
| 9 | Zero New Rules Engines certificado | ✅ Único Rules Engine |
| 10 | Multiempresa Ready | ✅ Contract intercambiable |
| 11 | ERP Ready | ✅ Contract intercambiable |
| 12 | Future Operational Experiences Ready | ✅ Solo agregar reglas al contrato |
| 13 | Build 0 errores | ✅ 2705 módulos, 2.23s |
| 14 | LEVEL 3 Certification | ✅ |
