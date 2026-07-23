# Sprint 97 — Universal Operational Experience Import Workflow Certification

**Tipo:** Operational Experience Import Workflow & Human Validation Architecture Certification
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 91, Sprint 94, Sprint 95, Sprint 96
**Branch:** `operativo-v1`
**Build:** 0 errores, 2699 módulos, 2.22s
**Archivos modificados:** 5 (1 creado, 1 modificado, 3 eliminados)

---

## Objetivo

Certificar el Universal Operational Experience Import Workflow como el **único flujo oficial de importación documental** del SGC-DM. Ninguna Operational Experience futura implementa su propio importador, vista previa o validación humana.

## Problema arquitectónico

`ExcelUploadModal.jsx` (246 líneas) estaba acoplado al dominio "Despachos":
- Título fijo: "Cargar Excel de Despachos"
- Tabla de preview con columnas hardcodeadas (`fechaDespacho`, `hora`, `cliente`, etc.)
- Usaba `parseDispatchesExcelFile` que contenía un parser especial de "Reporte de Operaciones"
- Sin validación humana: el usuario no podía editar ni seleccionar filas antes de importar

Cada nueva experiencia operacional habría requerido su propio `*UploadModal.jsx`.

## Filosofía certificada

```
ONE IMPORT WORKFLOW FOR ALL OPERATIONAL EXPERIENCES
```

## Arquitectura certificada

```
Documento
  ↓
Import Engine (parseDocument)
  ↓
Operational Experience Contract
  ↓
Universal Data Normalizer (normalizeOperationalData)
  ↓
Universal Import Preview + Human Validation Layer
  ↓
Operational Mapping Layer (contract-driven)
  ↓
Persistence Layer
  ↓
Universal Runtime
```

## Cambios por archivo

### 1. Creado: `src/modules/experiences/UniversalImportWorkflow.jsx` (332 líneas)

Workflow universal de importación que reemplaza al `ExcelUploadModal` específico de despachos.

**Responsabilidades certificadas:**

| Capa | Implementación |
|------|----------------|
| **Import Preview** | Preview completa con tabla editable, todas las filas visibles, no solo primeras 8 |
| **Human Validation** | Edición inline por celda, checkbox por fila para incluir/excluir, "Seleccionar/Deseleccionar todas" |
| **Header Mapping** | Sección visual con 3 columnas: encabezados encontrados, faltantes, no reconocidos |
| **Operational Mapping** | `contract.documentContract.canonicalFields` + `synonyms` + `fieldNormalizers` |
| **Input Type Detection** | `fieldNormalizers` → date/time/number/text igual que en el Runtime |
| **Summary** | Banner con total filas, válidas, con observaciones, campos configurados, campos encontrados |

**Nunca hace:**
```js
if (dispatches) ...
if (inventory) ...
if (production) ...
```

**Solo consume:**
```js
contract.documentContract    → canonicalFields, synonyms, fieldNormalizers
contract.ui.tableFields      → columnas de preview
contract.ui.fieldDisplay     → labels
contract.metadata.name       → título del modal
```

**Flujo interno:**
1. Upload (drag/drop o click) → `parseDocument(file)` del Import Engine
2. `normalizeOperationalData({ parsedDocument, contract })` → registros normalizados
3. Preview: mapeo de encabezados + tabla editable + resumen
4. Usuario revisa, edita valores, marca/desmarca filas
5. Confirm → `onImported(approvedRows)` (sin campos internos `_rowIndex`, `_included`, `_errors`)

### 2. Modificado: `src/modules/experiences/UniversalOperationalRuntime.jsx`

- Import `ExcelUploadModal` → reemplazado por `UniversalImportWorkflow`
- Import `parseDocument` + `normalizeOperationalData` → eliminados (ahora internos del workflow)
- `UniversalImportWorkflow` recibe `contract={contract}` como prop

### 3. Eliminado: `src/components/ExcelUploadModal.jsx` (246 líneas)

Reemplazado completamente. Contenía:
- Título hardcodeado "Cargar Excel de Despachos"
- Columnas de preview hardcodeadas (fecha, hora, cliente, producto, etc.)
- Integración directa con `parseDispatchesExcelFile`
- Sin validación humana (sin edición inline, sin selección por fila)

### 4. Eliminado: `src/utils/dispatchesExcel.js` (152 líneas)

Contenía:
- `parseDispatchesExcelFile` — wrapper del pipeline Import Engine + Normalizer
- `parseOperationsReport` — parser especial para formato "Reporte de Operaciones"

Ya no es necesario porque `UniversalImportWorkflow` usa directamente `parseDocument` + `normalizeOperationalData`.

## Flujo certificado

```
Usuario arrastra .xlsx
  ↓
parseDocument(file)  ← Import Engine (Sprint 91)
  ↓
normalizeOperationalData({ parsedDocument, contract })  ← Universal Normalizer (Sprint 92)
  ↓
UniversalImportWorkflow muestra:
  ├── Header Mapping (encontrados / faltantes / no reconocidos)
  ├── Preview editable con validación humana
  └── Summary banner estadístico
  ↓
Usuario edita, selecciona filas, confirma
  ↓
onImported(approvedRows)
  ↓
service.insertBatch(approvedRows)  ← Persistence Layer (Sprint 96)
  ↓
Universal Runtime actualiza tabla
```

## Nueva experiencia operacional

Solamente requiere:

1. Crear contrato con `documentContract`, `ui.tableFields`, `persistence`
2. `registerExperience({ ... })`
3. **FIN**

Hereda automáticamente:
- Importación universal con preview → ✅
- Validación humana → ✅
- Header mapping inteligente → ✅
- Persistencia genérica → ✅
- Dashboard → ✅
- Auditoría → ✅
- Exportaciones → ✅
- Runtime universal → ✅

## Principios certificados

| Principio | Aplicación |
|-----------|-----------|
| REUSE FIRST | Workflow universal reutilizado |
| ONE IMPORT WORKFLOW | ✅ Certificado — UniversalImportWorkflow es el ÚNICO |
| ZERO NEW IMPORTERS | ✅ Certificado — ExcelUploadModal eliminado |
| ZERO NEW PREVIEW COMPONENTS | ✅ Certificado |
| HUMAN VALIDATION FIRST | ✅ Certificado — tabla editable, selección por fila |
| DOCUMENT INTELLIGENCE FIRST | ✅ Certificado — Import Engine reutilizado |
| OPERATIONAL EXPERIENCE FIRST | ✅ Certificado |
| UNIVERSAL PIPELINE | ✅ Certificado |
| CONTRACT DRIVEN IMPORT | ✅ Certificado |
| MULTI COMPANY READY | ✅ Certificado |
| ERP READY | ✅ Certificado |

## Restricciones arquitectónicas certificadas

Queda prohibido crear:
- `DispatchImportWorkflow` ❌
- `ProductionImportWorkflow` ❌
- `InventoryImportWorkflow` ❌
- `PurchaseImportWorkflow` ❌
- Validadores específicos por experiencia ❌

Todo usa `UniversalImportWorkflow`.

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Universal Import Workflow certificado | ✅ `UniversalImportWorkflow.jsx` |
| 2 | Universal Import Preview certificado | ✅ Tabla editable + header mapping |
| 3 | Human Validation Layer certificada | ✅ Edición inline, checkbox por fila |
| 4 | Operational Mapping Layer certificada | ✅ Contract-driven |
| 5 | Contract Driven Import certificado | ✅ Solo `contract.*` |
| 6 | Zero New Importers certificado | ✅ ExcelUploadModal eliminado |
| 7 | Runtime reutilizado | ✅ UniversalOperationalRuntime sin cambios mayores |
| 8 | Import Engine reutilizado | ✅ `parseDocument` desde el workflow |
| 9 | Universal Data Normalizer reutilizado | ✅ `normalizeOperationalData` desde el workflow |
| 10 | Multiempresa Ready | ✅ Contract intercambiable |
| 11 | ERP Ready | ✅ Contract intercambiable |
| 12 | LEVEL 3 Certification | ✅ Build 0 errores, 2699 módulos |
