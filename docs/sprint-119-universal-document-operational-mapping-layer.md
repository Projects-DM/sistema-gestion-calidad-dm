# Sprint 119 — Universal Document Operational Mapping Layer (SSOT)

**Tipo:** Production Operationalization Sprint
**Estado:** LEVEL 3 — PRODUCTION READY
**Depende de:** Sprint 91 - Sprint 118
**Branch:** `operativo-v1`
**Build:** 0 errores, 2714 módulos
**Arquitectura:** Universal Document Pipeline Hardening
**Archivos nuevos:** 0
**Archivos modificados:** 4

---

## Objetivo

Certificar la capa universal de interpretación operacional documental del SGC-DM, permitiendo que cualquier documento real del negocio (PDF, Excel, Word o CSV) pueda ser comprendido estructuralmente antes de convertirse en registros operacionales.

Este sprint NO crea un nuevo motor de importación.
Este sprint NO crea inteligencia artificial.
Este sprint NO crea lógica específica para Despachos.

Su única responsabilidad es comprender la estructura operacional del documento.

---

## Problema resuelto

El pipeline existente extraía texto, filas, metadatos, detectaba tablas y normalizaba campos — pero **no comprendía cómo estaba organizado el documento**. Metadata y tabla aparecían mezcladas, produciendo registros incorrectos.

### Antes

```
PDF
  ↓
568 filas
  ↓
14% score
  ↓
0 registros
```

### Después

```
PDF
  ↓
Metadata encontrada: Cliente, Fecha, Factura
  ↓
Tabla encontrada: Producto, Cantidad, Lote, Temperatura (25 filas)
  ↓
Modelo operacional construido
  ↓
Esperando construcción de registros (Sprint 120)
```

---

## Pipeline certificado

```
Documento (PDF/Excel/CSV/Word)
  ↓
parseDocument()
  ↓
analyzeDocumentStructure()
  ├── metadataBlock   ← NUEVO: startRow, endRow, fields detectados
  ├── tableBlock      ← NUEVO: startRow, endRow, headers, rows, columns
  └── documentSummary ← NUEVO: hasMetadata, hasTable, totalRows, totalHeaders
  ↓
Operational Mapping Layer ← NUEVO
  └── buildOperationalDocumentModel()
      ├── metadata: { fecha, cliente, factura, destino, conductor, placa, observaciones }
      ├── table: { headers, rows }
      └── documentSummary
  ↓
normalizeOperationalData()
  ↓
evaluateRecord()
  ↓
Human Validation
  ↓
Operational Runtime
  ↓
Persistencia
```

---

## Cambios por archivo

### `documentStructureAnalyzer.js`

**Nuevas funciones:**
- `detectMetadataBlock(rows, sections)` — detecta el bloque de metadata (filas antes de la primera sección de tabla)
- `detectTableBlock(rows, sections)` — selecciona la mejor región de tabla (mayor rowCount) y extrae headers + filas

**Nuevos campos en retorno:**
- `metadataBlock: { startRow, endRow, fields } | null`
- `tableBlock: { startRow, endRow, headers, rows, columns } | null`
- `documentSummary: { hasMetadata, hasTable, totalRows, totalHeaders, metadataFieldsFound, tableHeadersFound, tableRowsFound }`

### `operationalDataExtractionLayer.js`

**Nueva función:**
```js
buildOperationalDocumentModel({ parsedDocument, structureAnalysis })
```
- Construye el modelo documental universal `{ metadata, table, documentSummary }`
- Mapea campos detectados a nombres canónicos (fecha, cliente, factura, destino, conductor, placa, observaciones)
- NO construye registros operacionales
- NO normaliza campos
- NO persiste información

### `UniversalImportWorkflow.jsx`

**Nuevo bloque visual — DOCUMENTO ANALIZADO (Block 1.5):**
```
DOCUMENTO ANALIZADO
  Metadata encontrada:  [lista de campos detectados]
  Tabla encontrada:     Headers: N [lista de headers]
  Registros encontrados: N
  Summary:              Metadata N campos | Headers N | Filas N | Total doc N
```
- Muestra claramente qué encontró el sistema, qué no encontró, qué tabla detectó y cuántos registros detectó
- Insertado entre Block 1 (Información del documento) y Block 2 (Metadata encontrada)

### `OperationalExperienceRegistry.js`

**Nuevo campo en contract:**
```js
documentMappingHints: {
  preferMetadata: true,
  preferTables: true,
  minimumTableColumns: 2,
}
```
- Añadido al descriptor frozen en `registerExperience()`
- Añadido al contrato expuesto por `getExperienceContract()`
- Configurado con valores por defecto en las 5 experiencias registradas (dispatches, inventarios, produccion, recepcion, productos)
- Permite que futuras experiencias operacionales adapten el comportamiento del mapeador documental sin modificar el pipeline

---

## GAPs corregidos

| GAP | Problema | Corrección | Estado |
|---|---|---|---|
| GAP-01 | El pipeline no comprende la estructura operacional del documento | Operational Mapping Layer con metadataBlock + tableBlock + documentSummary | ✅ |
| GAP-02 | Metadata y tabla se encuentran mezcladas | Separación estructural: metadataBlock (pre-table) vs tableBlock (región detectada) | ✅ |
| GAP-03 | El usuario no sabe qué encontró el sistema | Document Analysis visual con metadata, headers, registros y summary | ✅ |

---

## Lo que NO hace este sprint

| Prohibición | Estado |
|---|---|
| Construir registros operacionales | ✅ No implementado |
| Persistir información | ✅ No implementado |
| Modificar el Runtime | ✅ No modificado |
| Crear IA | ✅ No creada |
| Agregar OCR | ✅ No agregado |
| Crear nuevas capabilities | ✅ No creadas |
| Crear nuevos parsers | ✅ No creados |
| Crear nuevas experiencias | ✅ No creadas |
| Crear nuevo Registry | ✅ No creado |
| Crear nuevo Import Engine | ✅ No creado |
| ERP Integration | ✅ No implementada |

---

## Anchored Summary

**Anchored Summary — Sprint 119**
- **Sprint:** 119 — Universal Document Operational Mapping Layer
- **Objective:** Understand the operational structure of any business document (PDF, Excel, Word, CSV) before transforming it into traceability records — without creating new infrastructure
- **What was built:**
  - **Metadata/Table boundary detection:** `detectMetadataBlock()` and `detectTableBlock()` in `documentStructureAnalyzer.js` — separates pre-table metadata rows from the detected table region
  - **Document Summary:** `documentSummary` object with `hasMetadata`, `hasTable`, `totalRows`, `totalHeaders`, `metadataFieldsFound`, `tableHeadersFound`, `tableRowsFound`
  - **Operational Document Model builder:** `buildOperationalDocumentModel()` in `operationalDataExtractionLayer.js` — returns `{ metadata, table, documentSummary }` without normalizing or persisting
  - **Document Analysis UI:** New "DOCUMENTO ANALIZADO" section in `UniversalImportWorkflow.jsx` showing metadata found, table headers, and record count
  - **documentMappingHints:** New contract field in `OperationalExperienceRegistry.js` — `{ preferMetadata, preferTables, minimumTableColumns }` for future experience-level tuning
- **Files changed:** 4
  - `src/services/import/documentStructureAnalyzer.js` (metadataBlock + tableBlock + documentSummary)
  - `src/services/import/operationalDataExtractionLayer.js` (buildOperationalDocumentModel)
  - `src/modules/experiences/UniversalImportWorkflow.jsx` (document analysis visual section)
  - `src/core/capabilities/experiences/OperationalExperienceRegistry.js` (documentMappingHints)
- **Key Decision:** No new parsers, engines, capabilities, or infrastructure. The Operational Mapping Layer is a pure data transformation that consumes the existing structure analysis and produces a universal document model. The documentMappingHints pattern ensures experience-level configurability without pipeline modification.
- **Prepares:** Sprint 120 — Universal Operational Record Builder
- **Status:** ✅ Certified (build 0 errors, 2714 modules)
