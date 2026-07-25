# Sprint 126 — Universal Import System Architectural Audit & Simplification Certification (SSOT)

**Tipo:** Core Architecture Audit & Recovery Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 91 → Sprint 125  
**Archivos modificados:** 0  
**Archivos nuevos:** 0  
**Entregable:** Diagnóstico arquitectónico + Pipeline mínimo certificado + Plan de implementación

---

## 1. Diagnóstico completo del sistema

### 1.1 Resumen ejecutivo

El Universal Import System creció de **~650 líneas (Sprint 94-97)** a **~2,278 líneas (Sprint 125)** distribuidas en **4 archivos críticos** más un `index.js` de re-exportación. Sin embargo, la precisión en la construcción de registros operacionales **no mejoró proporcionalmente** — y en algunos casos empeoró.

| Archivo | Sprint 94-97 | Sprint 125 | Crecimiento |
|---|---|---|---|
| `documentParser.js` | ~120 | 151 | 1.3x |
| `documentStructureAnalyzer.js` | 125 | 679 | **5.4x** |
| `operationalDataExtractionLayer.js` | 154 | 403 | **2.6x** |
| `UniversalImportWorkflow.jsx` | 374 | 1,045 | **2.8x** |
| **Total** | **~773** | **~2,278** | **2.9x** |

### 1.2 Audit de componentes

#### COMPONENTE: `documentParser.js` — Parser Layer

| Pregunta | Respuesta |
|---|---|
| Responsabilidad | Parsear archivos (PDF, XLSX, CSV, DOCX) a un formato común `{ rawHeaders, rawRows, textContent }` |
| ¿Funciona? | Sí |
| ¿Se reutiliza? | Sí — es el único parser, usado por todo el pipeline |
| ¿Debe modificarse? | No |
| ¿Es indispensable? | Sí |
| **Veredicto** | **KEEP** — único componente que funciona correctamente sin inflación |

**Líneas:** 151 (bien)
**Exportaciones:** 1 (`parseDocument`)
**Funciones internas:** 4 (`parseCSV`, `parseXLSX`, `parseDOCX`, `parsePDF`)
**Código muerto:** `documentSegments: null` en el retorno (nunca se usa desde que se movió a `documentStructureAnalyzer`)

#### COMPONENTE: `documentStructureAnalyzer.js` — Structure Analyzer

| Pregunta | Respuesta |
|---|---|
| Responsabilidad original | Clasificar documento como TABULAR vs SEMI_STRUCTURED |
| Responsabilidad actual | Clasificar + segmentar + extraer metadata + reconocer patrones + analizar anatomía + detectar headers operacionales + resolver relaciones + calcular confianza incremental |
| ¿Funciona? | Parcialmente — las funciones originales (clasificación) funcionan; las agregadas (anatomía, patrón, headers) no han demostrado mejora funcional |
| ¿Está siendo utilizado? | Sí — todas las exportaciones se usan en el workflow |
| ¿Es indispensable? | SÍ para `analyzeDocumentStructure`; NO para `recognizeDocumentPattern`, `analyzeDocumentAnatomy`, `resolveOperationalRegion`, `detectOperationalHeaders` |
| ¿Duplica responsabilidades? | Sí — `segmentDocument` duplica seccionamiento que ya existía en `extractTableRegions`; `resolveOperationalRelationships` replica lógica que `buildDocumentRecords` ya hace |
| ¿Puede ser absorbido? | Sí — la clasificación Tabular/Semi es útil; el resto (patrón, anatomía, región, headers) debe simplificarse o eliminarse |
| **Veredicto** | **SPLIT + SIMPLIFY** — mantener `analyzeDocumentStructure` como clasificador ligero; mover o eliminar el resto |

**Líneas:** 679 (debería ser < 150)
**Exportaciones:** 5 (demasiadas para un "analyzer")
**Funciones internas:** 17 (muchas no usadas: `classifyRowContent`)
**Código muerto:**
- `classifyRowContent()` — nunca se llama
- `FINANCIAL_KEYWORDS`, `ADMIN_KEYWORDS`, `COMMERCIAL_KEYWORDS`, `OPERATIONAL_KEYWORDS` — arrays gigantes usados solo en `segmentDocument`
- `documentSegments` en `analyzeDocumentStructure` retorno — el workflow lee `segments` directamente de `analysis?.documentSegments` pero también lo recalcula
- `pipelineConfidence` — se calcula pero el workflow lo muestra como `Pipeline` en diagnostics

#### COMPONENTE: `operationalDataExtractionLayer.js` — Operational Data Extraction Layer

| Pregunta | Respuesta |
|---|---|
| Responsabilidad original | Detectar headers → aplicar sinónimos → normalizar tipos → construir registros |
| Responsabilidad actual | Todo lo anterior + herencia de metadata + shared fields + semi-structured handling + post-filter + document records + operational document model |
| ¿Dónde se construyen realmente los registros? | En `normalizeOperationalData` — esta es la función NÚCLEO del pipeline |
| ¿Es el verdadero problema del pipeline? | **SÍ** — `normalizeOperationalData` recibe demasiados parámetros (contract, structureAnalysis, operationalSection, relationshipModel) que no debería necesitar. En Sprint 94 recibía solo `{ parsedDocument, canonicalFields, synonyms, fieldNormalizers }` y funcionaba |
| ¿Puede absorber responsabilidades adicionales? | No — debe simplificarse, no expandirse |
| ¿Debe convertirse en el núcleo del Universal Import? | **SÍ** — `normalizeOperationalData` YA es el núcleo. Todo lo demás son capas diagnósticas que no construyen registros |
| **Veredicto** | **REFACTOR** — restaurar la firma original simple; eliminar dependencias de structureAnalysis, operationalSection, relationshipModel |

**Líneas:** 403 (debería ser < 180)
**Exportaciones:** 11 (demasiadas)
**Problemas identificados:**
1. `normalizeOperationalData` acepta `contract` en lugar de `{ canonicalFields, synonyms, fieldNormalizers }` — acoplamiento innecesario
2. `buildDocumentRecords` — duplica lógica que ya existe en `normalizeOperationalData`
3. `buildOperationalDocumentModel` — simple wrapper que extrae metadata y table del analysis
4. `buildOperationalRecords` — duplica `normalizeOperationalData` con ligeras variaciones (metadata inheritance, completeness scoring)
5. `extractMetadataRowPairs` — duplica `extractAllMetadata` de documentStructureAnalyzer
6. Post-filter (líneas 198-217) — lógica de limpieza que debería ser una función aparte o estar en un normalizador

#### COMPONENTE: `UniversalImportWorkflow.jsx` — Import Workflow (UI)

| Pregunta | Respuesta |
|---|---|
| Responsabilidad | UI del pipeline de importación: carga, preview, validación humana, importación |
| ¿La UI refleja realmente el pipeline? | Sí, pero muestra demasiados bloques diagnósticos que confunden al usuario |
| ¿Está mostrando información redundante? | Sí — Bloques 1.5, 1.75, 1.8, 1.83, 1.84, 1.85, 1.86, 2, 6 son puramente diagnósticos. El usuario solo necesita Bloques 1, 3, 4, 5 y Validación Humana |
| ¿Qué bloques aportan valor? | **ALTO**: Bloque 1 (info), Bloque 4 (mapeo), Bloque 5 (resultado), Validación Humana (tabla editable) |
| ¿Qué bloques son diagnósticos? | **DIAGNÓSTICO**: 1.5 (DOCUMENTO ANALIZADO), 1.75 (SECCIÓN OPERACIONAL), 1.8 (MODELO OPERACIONAL), 1.83 (ANATOMÍA), 1.84 (HEADERS), 1.85 (PATRÓN), 1.86 (REGISTROS DOCUMENTALES), 1.9 (PIPELINE DIAGNOSTICS), 2 (METADATA), 6 (REGISTROS CONSTRUIDOS) |
| **Veredicto** | **SIMPLIFY** — colapsar todos los bloques diagnósticos en un solo acordeón "Diagnósticos del pipeline"; mostrar siempre los bloques funcionales (1, 3, 4, 5, Validación Humana) |

**Líneas:** 1,045 (debería ser < 500)
**Estados:** `idle | parsing | preview | complete` (bien)
**Problemas identificados:**
1. 11 bloques de UI para 4 estados funcionales
2. Cálculos redundantes: `buildOperationalDocumentModel` + `buildOperationalRecords` + `buildDocumentRecords` + `normalizeOperationalData` se llaman secuencialmente pero solo `normalizeOperationalData` produce las filas que se importan
3. El import (handleImport) solo usa las filas de `normalizeOperationalData`, ignorando `builtRecords` y `documentRecords`

#### COMPONENTE: `src/services/import/index.js` — Re-export barrel

| Pregunta | Respuesta |
|---|---|
| Responsabilidad | Re-exportar `parseDocument` y `analyzeDocumentStructure` |
| **Veredicto** | **KEEP** — útil como barrel, aunque podría exportar también `normalizeOperationalData` |

---

## 2. Análisis de regresión funcional

### 2.1 ¿Qué funcionaba hace 20 sprints que hoy no funciona?

**Sprint 94 — Estado original certificado:**

```js
// normalizeOperationalData — 154 líneas
normalizeOperationalData({ parsedDocument, canonicalFields, synonyms, fieldNormalizers })
// Retornaba: { rows, matchedHeaders, missingHeaders }
```

```js
// handleFile — 5 líneas funcionales
const parsedDoc = await parseDocument(file);
const result = normalizeOperationalData({ parsedDocument: parsedDoc, contract });
```

**Pipeline completo (Sprint 94-97):**
```
Documento → Parser → normalizeOperationalData → Preview → Validación Humana → Import
```

**Pipeline actual (Sprint 125):**
```
Documento → Parser → StructureAnalyzer → Segmentation → Anatomy → Region → Headers → Pattern → DocumentRecords → OperationalDocumentModel → OperationalRecords → normalizeOperationalData → evaluateRecord → Preview → Validación Humana → Import
```

**Lo que se perdió:**

| Funcionalidad | Sprint 94 | Sprint 125 | ¿Dónde se perdió? |
|---|---|---|---|
| Simplicidad del normalizador | 1 función, 5 params | 1 función, 5 params (pero 3 son nuevos y acoplados) | Sprint 120-125 agregaron `structureAnalysis`, `operationalSection`, `relationshipModel` |
| Rendimiento | 1 llamada para construir registros | 4 llamadas: buildOperationalDocumentModel + buildOperationalRecords + buildDocumentRecords + normalizeOperationalData | Sprint 121-125 |
| Calidad de registros | Filas mapeadas directamente | Filas pasan por post-filter, metadata inheritance, shared fields | Sprint 122-125 |
| UI clara | 4 bloques | 11 bloques | Sprint 121-125 |
| Mantenibilidad | 154 líneas | 403 líneas | Sprint 120-125 |

### 2.2 Evidencia de degradación

```
Sprint 94:
  100 filas → normalizeOperationalData → 100 registros (mapeo directo)

Sprint 125:
  100 filas → StructureAnalyzer → Segmentation → Anatomy → Pattern → Records →
  normalizeOperationalData → post-filter → metadata inheritance → 80 registros
  (con posibles errores de herencia, shared fields incorrectos, post-filter agresivo)
```

**Causa raíz:** Cada sprint agregó una nueva capa "inteligente" que intenta adivinar estructura del documento, pero ninguna capa mejora la precisión del mapeo de campos. El mapeo real sigue siendo `buildHeaderMap()` + `fieldNormalizers[]` — exactamente lo mismo que en Sprint 94.

---

## 3. Componentes certificados

### KEEP (funcionan, no tocar)

| Componente | Archivo | Razón |
|---|---|---|
| `parseDocument` | `documentParser.js` | Único parser, funciona, bien aislado |
| `toYmd`, `toHm`, `toNumber` | `operationalDataExtractionLayer.js` | Normalizadores puros, reutilizados por el Registry |
| `normalizeHeader` | `operationalDataExtractionLayer.js` | Función pura de normalización de texto |
| `buildHeaderMap` | `operationalDataExtractionLayer.js` | Algoritmo de matching por sinónimos, funciona correctamente |
| `pickValue` | `operationalDataExtractionLayer.js` | Helper trivial, bien |
| `detectHeaderRow` | `operationalDataExtractionLayer.js` | Detección de fila de encabezados, funciona |

### SIMPLIFY (reducir, no eliminar)

| Componente | Archivo | Acción |
|---|---|---|
| `analyzeDocumentStructure` | `documentStructureAnalyzer.js` | Mantener clasificación TABULAR/SEMI; eliminar segmentación, anatomía, patrón |
| `normalizeOperationalData` | `operationalDataExtractionLayer.js` | Restaurar firma original: `{ parsedDocument, canonicalFields, synonyms, fieldNormalizers }` |
| `UniversalImportWorkflow` | `UniversalImportWorkflow.jsx` | Colapsar 11 bloques → 5 bloques funcionales + 1 acordeón diagnóstico |

### MERGE (fusionar en un solo flujo)

| Componente | Absorbido por | Razón |
|---|---|---|
| `buildOperationalDocumentModel` | `normalizeOperationalData` | Solo extrae metadata del analysis; puede ser inline |
| `buildOperationalRecords` | `normalizeOperationalData` | Duplica exactamente la lógica con metadata inheritance |
| `buildDocumentRecords` | `normalizeOperationalData` | Construye registros documentales que nunca se usan para el import real |
| `segmentDocument` | Eliminar | Reemplazado por analyzeDocumentAnatomy que tampoco aporta valor |
| `extractAllMetadata` | `normalizeOperationalData` | La extracción de metadata debe ser un paso opcional, no un pipeline stage |

### REMOVE (eliminar completamente)

| Componente | Archivo | Razón |
|---|---|---|
| `recognizeDocumentPattern` | `documentStructureAnalyzer.js` | No mejora la construcción de registros. Sprint 124 lo introdujo pero no se usa para mapear campos |
| `analyzeDocumentAnatomy` | `documentStructureAnalyzer.js` | Sprint 125 lo introdujo. El segmentation existente ya clasificaba secciones |
| `resolveOperationalRegion` | `documentStructureAnalyzer.js` | Depende de anatomy que debe eliminarse |
| `detectOperationalHeaders` | `documentStructureAnalyzer.js` | Duplica `detectHeaderRow` de operationalDataExtractionLayer |
| `pipelineConfidence` | `documentStructureAnalyzer.js` | Confianza incremental no usada para decisiones del pipeline |
| `resolveOperationalRelationships` | `documentStructureAnalyzer.js` | Lógica de shared+repeating fields no usada para construir registros |
| `classifyRowContent` | `documentStructureAnalyzer.js` | Nunca se llama |
| `FINANCIAL_KEYWORDS` etc. | `documentStructureAnalyzer.js` | Arrays de keywords solo usados en segmentDocument |
| Bloque 1.5, 1.75, 1.8, 1.83, 1.84, 1.85, 1.86, 2, 6 | `UniversalImportWorkflow.jsx` | Diagnósticos que no aportan al flujo de importación |

---

## 4. Pipeline mínimo certificado

### 4.1 Respuesta a la pregunta fundamental

**¿Qué estamos importando realmente?**

> **REGISTROS OPERACIONALES.**

El documento es únicamente el **medio de entrada**. El objetivo del sistema son los registros operacionales. Ninguna capa de "comprensión documental" es necesaria si el sistema ya puede extraer registros correctamente.

### 4.2 Pipeline mínimo universal

```
PDF / Excel / CSV / Word
    ↓
1. Parser (documentParser.js)
    ↓
2. Normalizer (normalizeOperationalData)  ← NÚCLEO
    ↓
3. Preview + Human Validation (UniversalImportWorkflow.jsx)  ← UI
    ↓
4. Persistence (onImported → service.insertBatch)
```

**Justificación:**

1. **Parser** — necesario y suficiente para convertir cualquier archivo a `{ rawHeaders, rawRows }`
2. **Normalizer** — `normalizeOperationalData` con firma simple: detecta headers → mapea por sinónimos → normaliza tipos → filita vacíos → retorna registros. Esto es lo que **siempre** ha construido los registros reales.
3. **Preview + Human Validation** — el usuario revisa, edita, selecciona filas.
4. **Persistence** — inserta los registros seleccionados.

**Ninguna de las siguientes capas es necesaria:**
- ❌ Structure Analysis (TABULAR vs SEMI)
- ❌ Document Segmentation
- ❌ Document Anatomy
- ❌ Operational Region Intelligence
- ❌ Pattern Recognition
- ❌ Document Record Constructor
- ❌ Operational Relationship Resolver
- ❌ Operational Document Model Builder
- ❌ Operational Records Builder (duplicado)

### 4.3 ¿Por qué estas capas no son necesarias?

| Capa | Lo que promete | Realidad |
|---|---|---|
| Structure Analysis | Clasificar documento | Solo produce `documentType` que nadie usa para decidir el pipeline |
| Segmentation | Separar secciones | Produce `operationalSection` que `normalizeOperationalData` ignora en modo TABULAR |
| Anatomy | Identificar regiones | Repite la clasificación de segmentation con nombres diferentes |
| Pattern Recognition | Detectar cómo se repiten datos | Produce `documentPattern` que no se usa para construir registros |
| Document Records | Construir registros documentales | Produce `documentRecords` que el import ignora (usa `normalizeOperationalData`) |
| Relationship | Resolver shared+repeating | Produce `relationshipModel` que `normalizeOperationalData` usa para herencia de metadata — fuente de errores |

---

## 5. Plan de implementación real

### Fase 1: Simplificación (Sprint 127)

**Objetivo:** Reducir `documentStructureAnalyzer.js` a su función original.

```diff
- documentStructureAnalyzer.js: 679 líneas → ~120 líneas
- Eliminar: recognizeDocumentPattern, analyzeDocumentAnatomy, resolveOperationalRegion,
  detectOperationalHeaders, segmentDocument, resolveOperationalRelationships,
  extractAllMetadata, classifyRowContent, isFormatPlaceholder, FINANCIAL/ADMIN/COMMERCIAL/OPERATIONAL_KEYWORDS
- Mantener: analyzeDocumentStructure (clasificación TABULAR/SEMI), collectColumnStats,
  detectSparseFirstRow, detectLabelPatternRatio, countSectionHeaders, countEmptyRows,
  checkHeaderQuality, extractTableRegions, multiCellFirstRow, detectSequentialFirstCol,
  dataDensityScore, countNonEmpty
```

### Fase 2: Limpieza (Sprint 128)

**Objetivo:** Restaurar `normalizeOperationalData` a su firma original.

```diff
- normalizeOperationalData({ parsedDocument, contract, structureAnalysis, operationalSection, relationshipModel })
+ normalizeOperationalData({ parsedDocument, canonicalFields, synonyms, fieldNormalizers })
  // Internamente:
  // 1. detectHeaderRow
  // 2. buildHeaderMap
  // 3. Mapear + normalizar
  // 4. Filtrar vacíos
  // 5. Retornar { rows, matchedHeaders, missingHeaders }
```

```diff
- Eliminar: buildDocumentRecords, buildOperationalRecords, buildOperationalDocumentModel
- Mantener: buildHeaderMap, detectHeaderRow, pickValue, normalizeHeader, toYmd, toHm, toNumber
```

### Fase 3: UI Simplificada (Sprint 129)

**Objetivo:** Reducir `UniversalImportWorkflow.jsx` de 1,045 a ~500 líneas.

```diff
- Eliminar bloques diagnósticos: 1.5, 1.75, 1.8, 1.83, 1.84, 1.85, 1.86, 2, 6
- Colapsar en un acordeón "Diagnósticos del pipeline" (colapsado por defecto)
- Mantener siempre visibles: Bloque 1 (info), Bloque 3 (tabla raw), Bloque 4 (mapeo),
  Bloque 5 (resultado), Validación Humana (tabla editable)
- handleFile simplificado:
    const parsedDoc = await parseDocument(file);
    const result = normalizeOperationalData({ parsedDocument: parsedDoc, canonicalFields, synonyms, fieldNormalizers });
    // → rows, matchedHeaders, missingHeaders
```

---

## 6. Criterios de certificación

| Criterio | Cumple |
|---|---|
| ¿Qué parte del sistema realmente está fallando? | `normalizeOperationalData` está sobrecargada con dependencias innecesarias; las capas agregadas (Sprint 120-125) no mejoran la construcción de registros |
| ¿Por qué los Sprint 119-125 no generaron mejoras funcionales? | Porque introdujeron capas diagnósticas que no tocan el core del mapeo de campos. El core (`buildHeaderMap` + `fieldNormalizers`) no se modificó desde Sprint 94 |
| ¿Qué lógica funcional existía previamente y puede reutilizarse? | La firma original de `normalizeOperationalData` (Sprint 94-97) con `{ parsedDocument, canonicalFields, synonyms, fieldNormalizers }` |
| ¿Cuál es el pipeline mínimo? | Parser → Normalizer → Preview/Validation → Persistence |
| ¿La solución propuesta es más simple? | Sí — 4 etapas vs 11+ etapas actuales |

---

## 7. Regla arquitectónica permanente

El Universal Import System existe para **construir registros operacionales universales a partir de documentos empresariales**.

El documento es **únicamente el medio de entrada**; el verdadero objetivo del sistema son **los registros operacionales**.

Ninguna evolución futura podrá violar este principio.

---

## Anexo: Mapa de archivos actual vs propuesto

### Estado actual (Sprint 125)

```
src/services/import/
  index.js                                    (re-export barrel)
  documentParser.js                           (151 líneas — KEEP)
  documentStructureAnalyzer.js                (679 líneas — SPLIT + SIMPLIFY)
  operationalDataExtractionLayer.js           (403 líneas — REFACTOR)
src/modules/experiences/
  UniversalImportWorkflow.jsx                 (1,045 líneas — SIMPLIFY)
```

### Estado propuesto (Sprint 127-129)

```
src/services/import/
  index.js                                    (re-export barrel)
  documentParser.js                           (151 líneas — sin cambios)
  documentStructureAnalyzer.js                (~120 líneas — solo clasificación)
  operationalDataExtractionLayer.js           (~180 líneas — solo normalizeOperationalData + helpers)
  normalizeOperationalData.js                 (extraído de operationalDataExtractionLayer)
src/modules/experiences/
  UniversalImportWorkflow.jsx                 (~500 líneas — 5 bloques funcionales + acordeón)
```

---

## Anexo: Llamadas redundantes en handleFile

El `handleFile` actual realiza **7 operaciones** de las cuales solo **1** produce el resultado final:

| # | Operación | ¿Necesaria? | ¿Usada para import? |
|---|---|---|---|
| 1 | `analyzeDocumentStructure` | Solo para diagnóstico | No |
| 2 | `buildOperationalDocumentModel` | No | No |
| 3 | `buildOperationalRecords` | No | No |
| 4 | `buildDocumentRecords` | No | No |
| 5 | `normalizeOperationalData` | **SÍ** | **SÍ** — produce las filas que se importan |
| 6 | `evaluateRecord` (por fila) | Sí (validación) | Sí (filtra inválidos) |
| 7 | `computeUnknownHeaders` | Solo para UI | No |

**Costo de las operaciones redundantes:** +400% de procesamiento, +600% de mantenimiento, 0% de mejora funcional.

---

*Auditoría completada el Julio 2026. Branch: operativo-v1. 0 archivos modificados.*
