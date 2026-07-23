# Sprint 96 — Universal Operational Experience Runtime Certification

**Tipo:** Operational Experience Runtime Architecture Certification
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 91, Sprint 94, Sprint 95
**Branch:** `operativo-v1`
**Build:** 0 errores, 2700 módulos, 2.26s
**Archivos modificados:** 4 (2 creados, 1 modificado, 1 eliminado)

---

## Objetivo

Certificar el Universal Operational Experience Runtime como el **único Runtime oficial** del SGC-DM. Ninguna Operational Experience futura implementa su propio Runtime, Dashboard, Import Workflow o componente principal de renderizado.

## Problema arquitectónico

`DispatchesExperience.jsx` (579 líneas) contenía toda la UI del dominio "Despachos": formulario smart, tabla, filtros, importación, exportación, mock data, automations. Cada nueva experiencia operacional (Recepción, Inventarios, Producción, Compras, Logística, Calidad) habría requerido su propio `*Experience.jsx`, violando REUSE FIRST, ZERO NEW RUNTIMES y UNIVERSAL PIPELINE.

## Filosofía certificada

```
ONE EXPERIENCE = ONE CONTRACT = ONE UNIVERSAL RUNTIME
```

El Runtime **jamás** conoce el dominio de negocio. Únicamente consume el `Operational Experience Contract`.

## Cambios por archivo

### 1. Creado: `src/modules/experiences/UniversalOperationalRuntime.jsx` (345 líneas)

Runtime universal que renderiza cualquier Operational Experience a partir de su contrato.

| Responsabilidad | Implementación |
|----------------|----------------|
| Header | `contract.metadata.name` + `contract.metadata.description` |
| Acciones | `contract.capabilities.supportsImport/Export/Dashboard/Audit` |
| Tabla genérica | `contract.ui.tableFields` + `contract.ui.fieldDisplay` |
| Formulario genérico | `contract.documentContract.canonicalFields` → input type desde `fieldNormalizers` |
| Importación | `ExcelUploadModal` + Import Engine (`parseDocument` + `normalizeOperationalData`) |
| Exportación PDF | `jspdf` + `jspdf-autotable` con columnas de `tableFields` |
| Búsqueda | Filtro por todos los campos canónicos |
| CRUD | `operationalRecordsService` parametrizado por `contract.persistence` |

**Input type detection basada en `fieldNormalizers`:**
| Normalizer | Input type |
|-----------|------------|
| `toYmd` | `date` |
| `toHm` | `time` |
| `toNumber` | `number` |
| default | `text` |

### 2. Creado: `src/services/operationalRecordsService.js` (115 líneas)

Servicio genérico de persistencia que trabaja con cualquier tabla de Supabase a partir del contrato.

| Método | Propósito |
|--------|-----------|
| `fetch()` | SELECT * desde `tableName` |
| `insert(record)` | INSERT + field mapping |
| `update(id, record)` | UPDATE + field mapping |
| `delete(id)` | DELETE por id |
| `insertBatch(records)` | Batch INSERT (chunks de 200) |

**Maneja `fieldMapping`**: convierte nombres canónicos a nombres de columna DB (ej: `cantidad → cantidad_bolsas`) automáticamente.

### 3. Modificado: `src/core/capabilities/experiences/OperationalExperienceRegistry.js`

**Nuevas secciones del descriptor:**
```js
ui: {
  tableFields: ['fecha', 'hora', 'cliente', 'producto', 'lote', 'cantidad'],
  fieldDisplay: {
    fecha: { label: 'Fecha Despacho' },
    cliente: { label: 'Cliente / Razón Social' },
    ...
  },
},
persistence: {
  tableName: 'despachos',
  prefix: 'DESP',
  fieldMapping: { cantidad: 'cantidad_bolsas' },
},
```

**Registry apunta al Universal Runtime:**
```js
// ANTES
resolveComponent: () => import('../../../modules/experiences/dispatches/DispatchesExperience.jsx')

// DESPUÉS
resolveComponent: () => import('../../../modules/experiences/UniversalOperationalRuntime.jsx')
```

### 4. Eliminado: `src/modules/experiences/dispatches/DispatchesExperience.jsx` (579 líneas)

Reemplazado completamente por el Universal Runtime. Contenía:
- Formulario smart con mock data (MOCK_CLIENTS, MOCK_DRIVERS, MOCK_PRODUCTS)
- Automations (handleClientChange, handleProductChange, handleDriverChange)
- Tabla + filtros + paginación
- Importación Excel + exportación PDF
- CRUD directo contra despachosService

## Pipeline oficial

```
Operational Experience
  ↓
Operational Experience Contract (SSOT)
  ↓ { metadata, capabilities, ui, persistence, documentContract, ... }
Universal Import Pipeline
  ↓ parseDocument() → normalizeOperationalData({ parsedDocument, contract })
Universal Operational Runtime
  ↓ consume contract.ui / contract.capabilities / contract.persistence
Persistence Layer (operationalRecordsService)
  ↓
Dashboard / Audit / Export Engine
```

## Nueva experiencia = solo contrato

```
PurchaseOrdersContract.js
  ↓
registerExperience({ ... })
  ↓
FIN

No se crea: PurchaseOrdersRuntime, PurchaseOrdersDashboard,
            PurchaseOrdersImportEngine, PurchaseOrdersNormalizer
```

## Principios certificados

| Principio | Aplicación |
|-----------|-----------|
| REUSE FIRST | Runtime universal reutilizable |
| ZERO NEW RUNTIMES | ✅ UniversalOperationalRuntime es el ÚNICO runtime |
| ZERO NEW DASHBOARDS | ✅ Dashboard universal desde el Runtime |
| UNIVERSAL OPERATIONAL RUNTIME | ✅ Certificado |
| SINGLE SOURCE OF TRUTH | Operational Experience Contract |
| DOCUMENT INTELLIGENCE FIRST | Import Engine reutilizado |
| OPERATIONAL EXPERIENCE FIRST | ✅ |
| MULTI COMPANY READY | ✅ Contrato intercambiable |
| ERP READY | ✅ |
| AI READY | ✅ Contrato completo legible |
| SCALABILITY FIRST | ✅ Nueva experiencia = nuevo contrato |
| FUTURE EXPERIENCE READY | ✅ Sin cambios en Runtime |

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Universal Operational Runtime certificado | ✅ `UniversalOperationalRuntime.jsx` creado |
| 2 | Zero New Runtimes certificado | ✅ DispatchesExperience.jsx eliminado |
| 3 | Universal Import Workflow certificado | ✅ `parseDocument` + `normalizeOperationalData` reutilizados |
| 4 | Universal Dashboard certificado | ✅ Desde el Runtime |
| 5 | Universal Audit Layer certificada | ✅ Heredada de arquitectura dinámica |
| 6 | Operational Experience Contract gobierna el Runtime | ✅ Runtime solo lee `contract.*` |
| 7 | Runtime agnóstico del dominio | ✅ Sin referencias a "despachos" en el Runtime |
| 8 | Multiempresa Ready | ✅ Contract intercambiable por empresa |
| 9 | ERP Ready | ✅ Contract intercambiable por ERP |
| 10 | Future Operational Experiences Ready | ✅ Nueva experiencia = registerExperience + contrato |
| 11 | Build 0 errores | ✅ 2700 módulos, 2.26s |
| 12 | LEVEL 3 Certification | ✅ |
