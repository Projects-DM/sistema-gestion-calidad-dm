# Sprint 102 — First Operational Experience Production Certification (SSOT)

**Tipo:** Operational Experience Production Capability Certification
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 91, Sprint 94, Sprint 95, Sprint 96, Sprint 97, Sprint 98, Sprint 99, Sprint 100, Sprint 101
**Branch:** `operativo-v1`
**Build:** 0 errores, 2708 módulos

---

## Objetivo

Certificar la primera Operational Experience productiva del SGC-DM utilizando el 100% del pipeline universal certificado.

Este sprint NO crea:

- Nuevos motores.
- Nuevos runtimes.
- Nuevos servicios.
- Nuevos dashboards.
- Nuevos workflows.
- Nuevas capas universales.

Su único objetivo es validar que la capacidad operacional es realmente reutilizable y se encuentra lista para producción.

## Filosofía oficial

```
BUILD THE CAPABILITY
    ↓
USE THE CAPABILITY
    ↓
DISCOVER REAL GAPS
    ↓
GENERALIZE ONLY WHAT IS NECESSARY
    ↓
CERTIFY THE CAPABILITY
```

## Alcance

La experiencia operacional "Despachos" funciona utilizando exclusivamente:

```
Operational Experience Contract
    ↓
Universal Runtime
    ↓
Universal Import Workflow
    ↓
Universal Rules Engine
    ↓
Universal Lifecycle Orchestrator
    ↓
Universal Persistence Layer
    ↓
Universal Audit Layer
    ↓
Universal Dashboard
    ↓
Import Engine
    ↓
Universal Normalizer
```

## Casos certificados

### CRUD completo

| Operación | Pipeline |
|-----------|----------|
| **Create** | `Orchestrator.createRecord()` → `evaluateRecord()` (validationRules + businessRules) → `service.insert()` → `auditCreate()` + `auditCompliance()` |
| **Read** | `Runtime.loadRecords()` → `service.fetch()` → reverse fieldMapping → `buildEmptyForm(record)` |
| **Update** | `Orchestrator.updateRecord()` → `evaluateRecord()` → `service.update()` (incluye `updated_at`) → `auditUpdate()` + `auditCompliance()` |
| **Delete** | `Orchestrator.deleteRecord()` → `service.delete()` → `auditDelete()` |

### Importación documental

| Formato | Pipeline |
|---------|----------|
| **Excel** | `parseDocument()` → `normalizeOperationalData()` → `UniversalImportWorkflow` (preview + human validation + header mapping) → `Orchestrator.importRecords()` → `service.insertBatch()` → `auditImport()` |
| **CSV** | `parseDocument()` → `normalizeOperationalData()` → `UniversalImportWorkflow` → `Orchestrator.importRecords()` |
| **PDF** | `parseDocument()` → `normalizeOperationalData()` → `UniversalImportWorkflow` → `Orchestrator.importRecords()` |
| **Word** | `parseDocument()` → `normalizeOperationalData()` → `UniversalImportWorkflow` → `Orchestrator.importRecords()` |
| **XLS** | `parseDocument()` → `normalizeOperationalData()` → `UniversalImportWorkflow` → `Orchestrator.importRecords()` |

### Dashboard

| Tab | Fuente |
|-----|--------|
| **Operational Metrics** | `service.fetch()` → conteo de registros + `dashboardRules.groupBy` |
| **Compliance Metrics** | `evaluateRecord()` con complianceRules → resultados agregados |
| **Audit Metrics** | `AuditService.getExperienceTimeline()` → eventos por tipo |
| **Business Metrics** | `service.fetch()` + `dashboardRules.groupBy` por campos de negocio |

### Auditoría

| Evento | Servicio |
|--------|----------|
| **Create** | `auditCreate()` |
| **Update** | `auditUpdate()` |
| **Delete** | `auditDelete()` |
| **Import** | `auditImport()` |
| **Export** | `auditExport()` |
| **Compliance** | `auditCompliance()` |
| **Rule Execution** | `auditRuleExecution()` |

### Reglas operacionales

| Tipo | Procesador |
|------|-----------|
| **Validation Rules** | `ValidationProcessor.js` — required, min, max, format, pattern |
| **Business Rules** | `BusinessRulesProcessor.js` — dependencias entre campos |
| **Compliance Rules** | `ComplianceProcessor.js` — greaterThan, lessThan, etc. |
| **Automation Rules** | `AutomationProcessor.js` — setCurrentDate, setCurrentTime, setDefault |
| **Visibility Rules** | `VisibilityProcessor.js` — show/hify logic |

### Runtime

`UniversalOperationalRuntime.jsx` — sin ninguna lógica específica de dominio. Todo el comportamiento es gobernado por `contract.*`.

## Bug descubierto y corregido

### Critical: experienceKey no se pasaba al Runtime

**Archivo:** `src/pages/DynamicModule.jsx:189`

**Antes:**
```jsx
<ExperienceComponent moduleSlug={moduleSlug} moduleName={moduleName} />
```

**Después:**
```jsx
<ExperienceComponent experienceKey={activeExperience} moduleSlug={moduleSlug} moduleName={moduleName} />
```

**Clasificación:** Pipeline GAP

**Impacto:** `UniversalOperationalRuntime` recibía `experienceKey: undefined`, causando que `getExperienceContract(undefined)` retornara `null`. Toda la experiencia fallaba al cargar. La infraestructura jamás se había probado end-to-end desde el hub hasta el runtime.

**¿Requiere una nueva capa universal?** NO

**Corregido en:** Sprint 102.

## Gap Discovery

### GAP-01: No hay `displayName` en el descriptor del contrato

**Categoría:** Contract GAP

**Archivo:** `DynamicModule.jsx:175`

**Problema:** `OperationalExperienceDescriptor` no tiene `displayName`. La propiedad real es `metadata.name`. El resolver agrega `displayName` durante el enriquecimiento en `CapabilityPublicSetAdapter`, pero esto es frágil — depende de que el adapter siempre esté presente.

**Solución aplicada:** Se cambió `{exp.displayName}` por `{exp.metadata?.name || exp.experienceKey}` en el hub.

**¿Requiere una nueva capa universal?** NO

**Estado:** CORREGIDO en Sprint 102

### GAP-02: Operations Report format no soportado

**Categoría:** Pipeline GAP

**Archivo:** `src/utils/dispatchesExcel.js` (eliminado en Sprint 97)

**Problema:** El parser `parseOperationsReport` manejaba un formato especial "Reporte de Operaciones" de Excel que incluía encabezado general + tabla de items + cliente separado en fila distinta. Este parser se eliminó con `dispatchesExcel.js` en Sprint 97 y no fue reemplazado.

**Impacto:** Si algún usuario de producción utiliza ese formato, la importación fallará.

**Recomendación:** Si el formato sigue en uso, implementar un `formatPlugin` opcional en el Import Workflow sin acoplar al dominio.

**¿Requiere una nueva capa universal?** NO

**Estado:** PENDIENTE (depende de uso en producción)

### GAP-03: Sin `updated_at` en registros

**Categoría:** Pipeline GAP

**Archivo:** `src/services/operationalRecordsService.js`

**Problema:** El Persistence Layer inserta `created_at` automáticamente (por Supabase) pero no actualizaba `updated_at` en modificaciones.

**Solución aplicada:** Se agregó `updated_at: new Date().toISOString()` al payload de `update()`.

**¿Requiere una nueva capa universal?** NO

**Estado:** CORREGIDO en Sprint 102

### GAP-04: Sin resaltado de celda específica con error en importación

**Categoría:** UX GAP

**Archivo:** `UniversalImportWorkflow.jsx`

**Problema:** El `UniversalImportWorkflow` muestra errores por fila (tooltip en la columna Validación) pero no resalta qué celda específica causó el error. El usuario sabe qué fila tiene error pero no qué campo corregir sin abrir el tooltip.

**Recomendación:** Marcar con borde rojo las celdas individuales que fallaron validación, similar al formulario del Runtime.

**¿Requiere una nueva capa universal?** NO

**Estado:** PENDIENTE (mejora UX)

### GAP-05: `FieldMapping` solo cubre escritura, no lectura

**Categoría:** Pipeline GAP

**Archivo:** `src/services/operationalRecordsService.js`

**Problema:** El `fieldMapping` (ej: `{ cantidad: 'cantidad_bolsas' }`) se aplica correctamente en escritura (insert/update) y se revierte en lectura (fetch). Pero `displayFields` opcional no se usa en el Runtime para filtrar columnas de la tabla. La lectura pasa por un reverse mapping frágil (basado en Object.entries inverso).

**Recomendación:** Hacer el reverse mapping explícito en el contrato en lugar de computado.

**¿Requiere una nueva capa universal?** NO

**Estado:** PENDIENTE

### GAP-06: Sin `supportsHumanValidation` en capabilities

**Categoría:** Contract GAP

**Archivo:** `OperationalExperienceRegistry.js:136-141`

**Problema:** El contrato declara `supportsImport` pero no `supportsHumanValidation`. La capacidad existe en el Import Workflow (Sprint 97) pero no estaba declarada.

**Solución aplicada:** Se agregó `supportsHumanValidation: true` a `capabilities` del contrato de "Despachos".

**¿Requiere una nueva capa universal?** NO

**Estado:** CORREGIDO en Sprint 102

## Resumen de gaps

| Gap | Categoría | ¿Requiere nueva capa universal? | Estado |
|-----|-----------|--------------------------------|--------|
| Bug: experienceKey faltante | Pipeline GAP | NO | CORREGIDO |
| GAP-01: displayName | Contract GAP | NO | CORREGIDO |
| GAP-02: Operations Report | Pipeline GAP | NO | PENDIENTE |
| GAP-03: updated_at | Pipeline GAP | NO | CORREGIDO |
| GAP-04: Cell highlight | UX GAP | NO | PENDIENTE |
| GAP-05: FieldMapping reverse | Pipeline GAP | NO | PENDIENTE |
| GAP-06: supportsHumanValidation | Contract GAP | NO | CORREGIDO |

**NINGÚN GAP REQUIERE UNA NUEVA CAPA UNIVERSAL.**

## Restricciones arquitectónicas

Queda prohibido crear (verificado que ninguna existe):

- `DispatchRuntime` ❌ — usa `UniversalOperationalRuntime`
- `DispatchDashboard` ❌ — usa `UniversalOperationalDashboard`
- `DispatchService` ❌ — usa `operationalRecordsService`
- `DispatchImportWorkflow` ❌ — usa `UniversalImportWorkflow`
- `DispatchRulesEngine` ❌ — usa `UniversalOperationalRulesEngine`
- `DispatchAuditLayer` ❌ — usa `operationalAuditService`
- `DispatchOrchestrator` ❌ — usa `OperationalExperienceLifecycleOrchestrator`
- `DispatchNormalizer` ❌ — usa `normalizeOperationalData`
- `DispatchPersistenceLayer` ❌ — usa `operationalRecordsService`

Toda la experiencia reutiliza el pipeline universal.

## Criterios de certificación

| # | Criterio | Estado esperado |
|---|----------|----------------|
| 1 | Primera Operational Experience certificada | ✅ "Despachos" |
| 2 | Pipeline universal reutilizado al 100% | ✅ Import → Normalize → Rules → Persist → Audit → Dashboard |
| 3 | CRUD operacional certificado | ✅ Create/Read/Update/Delete vía Orchestrator |
| 4 | Importación documental certificada | ✅ Excel/CSV/PDF/DOCX/XLS vía Import Engine + ImportWorkflow |
| 5 | Dashboard certificado | ✅ 4 tabs (Operational, Compliance, Audit, Business) |
| 6 | Auditoría operacional certificada | ✅ 7 eventos trackeados |
| 7 | Rules Engine certificado | ✅ 5 procesadores (Validation, Business, Compliance, Automation, Visibility) |
| 8 | Runtime certificado | ✅ UniversalOperationalRuntime sin lógica de dominio |
| 9 | Gap Discovery documentado | ✅ 6 gaps + 1 bug, ninguno requiere nueva capa universal |
| 10 | Zero New Infrastructure | ✅ Sin DispatchRuntime/DispatchService/DispatchDashboard/etc. |
| 11 | Multiempresa Ready | ✅ Contract intercambiable |
| 12 | ERP Ready | ✅ Sin lógica de dominio en pipeline |
| 13 | Capability Ready | ✅ Contrato gobierna toda la experiencia |
| 14 | LEVEL 3 Certification | ✅ Build 0 errores, 2708 módulos |
