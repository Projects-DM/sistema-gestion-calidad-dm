# Sprint 118 — Universal Document Import Intelligence Hardening (SSOT)

**Tipo:** Production Operationalization Sprint
**Estado:** LEVEL 3 — PRODUCTION READY
**Depende de:** Sprint 91 - Sprint 117
**Branch:** `operativo-v1`
**Build:** 0 errores, 2714 módulos
**Archivos nuevos:** 0
**Archivos modificados:** 4

---

## Objetivo

Endurecer el pipeline universal de importación documental para que cualquier documento operacional real del negocio (Excel, PDF, Word, CSV) pueda ser importado y transformado correctamente en registros operacionales de trazabilidad, sin crear nuevas capacidades ni nuevos motores.

---

## Pipeline Final

```
Documento (XLSX/XLS/CSV/DOCX/PDF)
  ↓
parseDocument()
  ├── Multi-sheet detection → selecciona la hoja con más datos
  ├── XLSX: decode_range para scoring sin parsear celdas
  ├── PDF: agrupación por coordenadas XY (filas + columnas)
  └── CSV/DOCX: parseo existente
  ↓
analyzeDocumentStructure()
  ├── Clasificación TABULAR / SEMI_STRUCTURED (8 señales)
  ├── extractAllMetadata() → KNOWN_META_LABELS + label:value pairs
  └── Region detection para tablas complejas
  ↓
normalizeOperationalData()
  ├── detectHeaderRow() con fallback headerScore
  │   (rows con 2+ celdas, allShort, numeric penalty)
  ├── buildHeaderMap() con synonyms scoring
  ├── metadata fallback (pre-table o discoveredLabels)
  └── completenessScore en return
  ↓
evaluateRecord()
  ├── validationRules
  ├── businessRules
  └── complianceRules
  ↓
Human Validation
  ├── Completitud visual (% + barra de progreso)
  ├── Hoja activa (multi-sheet Excel)
  ├── Metadatos descubiertos (tags)
  ├── Campos encontrados / faltantes / desconocidos
  └── Edición de celdas + toggle por fila
  ↓
Operational Runtime → Persistencia
```

---

## Cambios por archivo

### `documentParser.js`
- **Multi-sheet Excel**: `parseXLSX` ahora itera sobre `workbook.SheetNames`, usa `XLSX.utils.decode_range(sheet['!ref'])` para obtener dimensiones sin parsear contenido, selecciona la hoja con más filas × columnas, y retorna `{ sheetNames, activeSheet }`.
- **ParseDocument**: Propaga `sheetNames` y `activeSheet` en el return.

### `documentStructureAnalyzer.js`
- **KNOWN_META_LABELS**: 11 grupos de etiquetas reconocibles (fecha, cliente, destino, conductor, placa, factura, observaciones, producto, lote, temperatura, cantidad).
- **extractAllMetadata()**: Escanea hasta 50 filas buscando pares label:value en KNOWN_META_LABELS + cualquier celda terminada en `:`. Retorna `{ discoveredLabels }` en metadata.
- **Completeness**: Señal indirecta via metadata block detection.

### `operationalDataExtractionLayer.js`
- **detectHeaderRow()**: Escanea filas con ≥2 celdas (antes ≥3). Añade `headerScore` como fallback: penaliza filas con contenido numérico, premia filas con celdas cortas (header-like). Si no hay matches por synonyms, usa el mejor headerScore.
- **completenessScore**: Ambos paths (tabular y semi-structured) retornan `completenessScore = matchedCount / canonicalFields.length`.

### `UniversalImportWorkflow.jsx`
- **Estado nuevo**: `activeSheet`, `completenessScore`.
- **Summary banner**: Barra de progreso de completitud + nombre de hoja activa.
- **Inteligencia documental**: Tags de metadatos descubiertos (pares key:value con estilo badge).
- **Reset**: Limpia los nuevos estados.

---

## GAPs corregidos

| GAP | Problema | Corrección | Estado |
|---|---|---|---|
| GAP-01 | No comprende documentos reales | Multi-sheet + metadata discovery + fallback header detection | ✅ |
| GAP-02 | Depende de headers ideales | headerScore fallback cuando synonyms no matchean | ✅ |
| GAP-03 | No identifica tablas complejas | extractAllMetadata para pre-table metadata | ✅ |
| GAP-04 | No identifica metadatos operacionales | KNOWN_META_LABELS + label:value scan | ✅ |
| GAP-05 | No soporta múltiples hojas de Excel | decode_range + best sheet selection | ✅ |
| GAP-06 | Poca tolerancia a formatos distintos | detectHeaderRow con 2 cells + numeric penalty | ✅ |

---

## Restricciones verificadas

| Prohibición | Estado |
|---|---|
| New Runtime | ✅ No creado |
| New Import Engine | ✅ No creado |
| New Capability | ✅ No creada |
| New Dashboard | ✅ No creado |
| New Service | ✅ No creado |
| New Registry | ✅ No creado |
| New Parser | ✅ No creado |
| New Experience | ✅ No creada |
| New Orchestrator | ✅ No creado |
| OCR | ✅ No implementado |
| AI Layer | ✅ No implementada |
| Product Intelligence | ✅ No implementada |

---

## Anchored Summary

---
**Anchored Summary — Sprint 118**
- **Sprint:** 118 — Universal Document Import Intelligence Hardening
- **Objective:** Harden the universal import pipeline so real business documents (Excel multi-sheet, PDF, CSV, Word) are correctly parsed, headers detected, metadata extracted, and records normalized — without new infrastructure
- **What was built:**
  - **Multi-sheet Excel:** `parseXLSX` now scores all sheets via `decode_range`, selects the largest, returns `sheetNames` + `activeSheet`
  - **Metadata discovery:** `extractAllMetadata()` scans up to 50 rows for KNOWN_META_LABELS (11 groups: fecha, cliente, destino, conductor, placa, factura, etc.) and `label:` patterns — returns `discoveredLabels` in structure analysis
  - **Header detection fallback:** `detectHeaderRow` now accepts ≥2 cell rows and computes `headerScore` (penalizes numeric rows, rewards short-text rows) as fallback when synonym matching yields 0 hits
  - **Completeness score:** Both normalization paths return `completenessScore = matchedFields / totalFields`
  - **UI enhancements:** completeness progress bar, active sheet name, metadata tags in intelligence card
- **Files changed:** 4
  - `src/services/import/documentParser.js` (multi-sheet + decode_range scoring)
  - `src/services/import/documentStructureAnalyzer.js` (KNOWN_META_LABELS + extractAllMetadata)
  - `src/services/import/operationalDataExtractionLayer.js` (header fallback + completenessScore)
  - `src/modules/experiences/UniversalImportWorkflow.jsx` (UI: completeness, sheet, metadata tags)
- **Key Decision:** No new parsers, engines, or capabilities. All hardening done by modifying existing pipeline modules. The `detectHeaderRow` fallback ensures even documents with no synonym-matched headers still get processed using the most header-like row.
- **Status:** ✅ Certified (build 0 errors, 2714 modules)
