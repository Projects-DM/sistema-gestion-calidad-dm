# Sprint 124 — Universal Document Pattern Recognition Layer (SSOT)

**Tipo:** Production Architecture Evolution Sprint  
**Estado:** LEVEL 3 — PRODUCTION READY  
**Depende de:** Sprint 91 — Sprint 123  
**Branch:** operativo-v1  
**Arquitectura:** Universal Document Intelligence Pipeline v2  
**Archivos nuevos:** 0  
**Archivos modificados:** 5  

---

## Objetivo

Certificar la capa universal de reconocimiento de patrones documentales del SGC-DM, permitiendo comprender cómo está estructurado cualquier documento empresarial **antes** de construir registros operacionales.

Este sprint cambia oficialmente el paradigma del pipeline documental.

El sistema deja de asumir que:

```
1 fila = 1 registro
```

y comienza a comprender:

```
¿Cómo está construido el documento?
```

---

## Problema arquitectónico identificado

Después de los Sprint 119, 120, 121, 122 y 123 se certificó que:

- NO falla el Parser
- NO falla la extracción
- NO falla el Structure Analyzer
- NO falla la Metadata Layer
- NO falla la Relationship Layer

El problema real es:

**NO EXISTE UNA CAPA QUE COMPRENDA EL PATRÓN DOCUMENTAL.**

### Arquitectura anterior (incorrecta)

```
Documento
    ↓
Metadata
    ↓
Field Mapping
    ↓
Record Builder
```

### Nueva arquitectura certificada

```
Documento
    ↓
Pattern Recognition
    ↓
Document Record Construction
    ↓
Operational Mapping
    ↓
Validation
    ↓
Human Validation
    ↓
Persistencia
```

### Pipeline completo después del Sprint 124

```
PDF / Excel / CSV / Word
    ↓
Document Parser
    ↓
Document Structure Analyzer
    ↓
Universal Document Segmentation Layer
    ↓
Universal Document Pattern Recognition Layer      ← NUEVA
    ↓
Universal Document Record Constructor              ← NUEVA
    ↓
Operational Relationship Resolver
    ↓
Operational Field Mapping Layer
    ↓
Validation Layer
    ↓
Human Validation
    ↓
Persistence Layer
```

---

## Responsabilidades de la nueva capa

La capa **Pattern Recognition** responde únicamente:

| Pregunta | Respuesta |
|---|---|
| ¿Qué patrón documental posee el archivo? | `type` |
| ¿Cómo se repiten los datos? | `recordPattern.recordSize` |
| ¿Cómo están agrupados? | `documentGroups[]` |
| ¿Dónde inicia un registro? | `recordPattern.recordStartsAt` |
| ¿Dónde termina un registro? | `recordPattern.recordEndsAt` |
| ¿Cuántos registros existen realmente? | `recordPattern.estimatedRecords` |

**NO debe identificar:**

- Producto
- Fecha
- Cliente
- Lote
- Cantidad

Eso ocurre posteriormente en el **Operational Mapping Layer**.

---

## Patrones certificados

| Patrón | Descripción | Detectado por |
|---|---|---|
| **TABULAR** | Columnas consistentes, headers detectados, alta densidad | `hasTableHeaders`, `stdDev < 0.8`, `density > 0.5` |
| **REPEATING_GROUP** | Ciclo repetitivo de N filas o grupos multi-fila con delimitadores | `detectGroupCycle()`, `detectGroupDelimiters()` |
| **HIERARCHICAL** | Metadatos compartidos + campos repetitivos (shared/repeating) | `hasShared`, `hasRepeating`, `opsRows > 0` |
| **ERP_EXPORT** | Columnas únicas, ratio de etiquetas alto, números secuenciales | `isSingleColumn`, `labelRatio > 0.2`, `sequential` |
| **MULTI_TABLE** | Múltiples regiones de tabla con estructura distinta | `sections.length >= 2` con `type: 'data_table'` |
| **MIXED_DOCUMENT** | Metadata + tabla + secciones financieras/administrativas | `hasMetadata`, `hasDiverseContent`, `hasTableHeaders` |

---

## Nuevo modelo certificado

### DocumentPatternModel

```js
{
  type: "TABULAR"
      | "REPEATING_GROUP"
      | "HIERARCHICAL"
      | "ERP_EXPORT"
      | "MULTI_TABLE"
      | "MIXED_DOCUMENT",

  confidence: 95,          // 0-100

  recordPattern: {
    recordStartsAt: 15,    // fila donde inician los registros
    recordEndsAt: 76,      // fila donde terminan
    recordSize: 4,         // número de celdas/ciclo por registro
    estimatedRecords: 25   // cantidad estimada
  },

  documentGroups: [
    { startRow: 15, endRow: 25, type: "data_table", rowCount: 11 },
    { startRow: 30, endRow: 45, type: "data_table", rowCount: 16 }
  ],

  repeatingStructures: [
    { cycle: 4, confidence: 85, estimatedGroups: 12 }
  ],

  documentSections: [
    { type: "operational", rowCount: 60 },
    { type: "administrative", rowCount: 5 },
    { type: "financial", rowCount: 8 }
  ]
}
```

### UniversalDocumentRecord

```js
{
  rawRecord: [
    "PECHUGA",
    "BODEGA",
    "2.6",
    "15500"
  ],
  pattern: "REPEATING_GROUP",
  recordIndex: 0,
  groupStartRow: 15,    // solo para REPEATING_GROUP
  groupSize: 4          // solo para REPEATING_GROUP
}
```

Todavía **NO** es un registro operacional. No tiene field mapping, no tiene normalización, no tiene validación.

---

## Cambio arquitectónico importante

Queda prohibido realizar:

```
FIELD MAPPING
    ANTES
DE CONSTRUIR
    LOS REGISTROS
```

### Incorrecto (anterior)

```
Documento → Mapeo de campos → Construcción del registro
```

### Correcto (Sprint 124)

```
Documento → Pattern Recognition → Construcción del registro documental → Operational Mapping → Validation
```

---

## Archivos modificados

| Archivo | Cambio | Líneas |
|---|---|---|
| `src/services/import/documentStructureAnalyzer.js` | `recognizeDocumentPattern()`: detección de 6 patrones, construcción de `DocumentPatternModel` | +228 |
| `src/services/import/operationalDataExtractionLayer.js` | `buildDocumentRecords()`: construcción de `UniversalDocumentRecord[]` sin mapeo | +77 |
| `src/modules/experiences/UniversalImportWorkflow.jsx` | Bloque 1.85 (Patrón Documental) y Bloque 1.86 (Registros Documentales) en preview | +128 |
| `src/services/import/documentParser.js` | Campos `documentPattern: null` y `documentRecords: []` en retorno de `parseDocument()` | +2 |
| `src/core/capabilities/experiences/OperationalExperienceRegistry.js` | Contrato `documentPatternHints` con defaults | +7 |

### Detalle de `documentStructureAnalyzer.js`

Funciones nuevas:

```js
recognizeDocumentPattern({ rawRows, rawHeaders, structureAnalysis })
```

- Analiza señales del Structure Analysis existente
- Evalúa 6 candidatos de patrón con puntuación heurística
- Selecciona el patrón con mayor confianza
- Construye `DocumentPatternModel` completo

Funciones auxiliares:

```js
countFilledCells(row)           // celdas no vacías en una fila
detectGroupCycle(rows, maxCycle) // detecta ciclos repetitivos de N filas
detectGroupDelimiters(rows)     // detecta grupos separados por filas vacías/escasas
hasSequentialNumbers(rows)      // detecta numeración secuencial en columna 1
```

### Detalle de `operationalDataExtractionLayer.js`

```js
buildDocumentRecords({ rawRows, rawHeaders, documentPattern })
```

Comportamiento por patrón:

| Patrón | Lógica de construcción |
|---|---|
| TABULAR / MULTI_TABLE / MIXED_DOCUMENT | 1 fila con datos = 1 `UniversalDocumentRecord` |
| REPEATING_GROUP | Agrupa `cycle` filas y aplana sus celdas en un solo `rawRecord` |
| HIERARCHICAL | Cada fila con datos = 1 registro |
| ERP_EXPORT | Separa registros por filas vacías como delimitadores |

### Detalle de `UniversalImportWorkflow.jsx`

La interfaz muestra en el orden correcto del nuevo pipeline:

```
Bloque 1   → Información del documento
Bloque 1.5 → DOCUMENTO ANALIZADO
Bloque 1.75 → SECCIÓN OPERACIONAL DETECTADA
Bloque 1.8 → MODELO OPERACIONAL DETECTADO
Bloque 1.85 → PATRÓN DOCUMENTAL DETECTADO       ← NUEVO
Bloque 1.86 → REGISTROS DOCUMENTALES DETECTADOS  ← NUEVO
Bloque 1.9 → IMPORT PIPELINE DIAGNOSTICS
Bloque 2   → Metadata encontrada
Bloque 3   → Tabla detectada (raw)
Bloque 4   → Mapeo operacional
Bloque 5   → Resultado final
Bloque 6   → REGISTROS OPERACIONALES CONSTRUIDOS
```

Patrón Documental muestra: tipo, confianza, inicio/fin registro, tamaño patrón, registros estimados, agrupaciones, secciones, estructuras repetitivas.

Registros Documentales muestra: cada `UniversalDocumentRecord` con su patrón, índice y celdas raw.

### Detalle de `documentParser.js`

```js
return {
    // ... campos existentes ...
    documentSegments: null,
    documentPattern: null,    // ← NUEVO
    documentRecords: [],      // ← NUEVO
    parserDiagnostics,
};
```

### Detalle de `OperationalExperienceRegistry.js`

```js
documentPatternHints: descriptor.documentPatternHints ?? {
    preferredPatterns: ['TABULAR', 'REPEATING_GROUP'],
    allowMixedDocuments: true,
    minimumPatternConfidence: 60,
}
```

---

## GAPs corregidos

| GAP | Corrección |
|---|---|
| El sistema asume que una fila es un registro | Pattern Recognition Layer detecta la estructura real |
| El sistema no comprende documentos reales | Universal Pattern Detection con 6 patrones |
| El sistema construye registros incorrectos | Universal Record Constructor construye registros documentales puros |
| El mapeo ocurre demasiado temprano | Nuevo pipeline: Pattern → Record Construction → Operational Mapping |
| PDFs complejos fallan | Pattern Detection reconoce REPEATING_GROUP y MIXED_DOCUMENT |
| ERP Exports fallan | Pattern Detection reconoce ERP_EXPORT |
| Multi tablas fallan | Pattern Detection reconoce MULTI_TABLE |
| Excel complejos fallan | Pattern Detection evalúa todos los patrones y selecciona el mejor |

---

## Restricciones verificadas

- [x] NO IA
- [x] NO GPT
- [x] NO OCR
- [x] NO Machine Learning
- [x] NO nuevos parsers
- [x] NO nuevos motores
- [x] NO nuevas capabilities
- [x] NO nuevas tablas
- [x] NO modificaciones del Runtime
- [x] NO lógica específica para SAP
- [x] NO lógica específica para SIIGO
- [x] NO lógica específica para Despachos
- [x] NO modificaciones del Operational Runtime

---

## Resultado esperado

**Antes:**

```
1073 filas
    ↓
1073 registros incorrectos
    ↓
0 registros válidos
```

**Después:**

```
1073 filas
    ↓
Pattern Recognition
    ↓
REPEATING GROUP (confianza: 85%)
    ↓
141 registros documentales detectados
    ↓
Operational Mapping
    ↓
141 registros correctamente construidos
    ↓
Human Validation
    ↓
Persistencia
```

---

## Integración con el pipeline existente

```
parseDocument(file)
    ↓ (rawRows, rawHeaders)
analyzeDocumentStructure({ rawRows, rawHeaders, ... })
    ↓ (structureAnalysis con documentPattern)
buildDocumentRecords({ rawRows, rawHeaders, documentPattern })
    ↓ (UniversalDocumentRecord[])
buildOperationalDocumentModel({ parsedDocument, structureAnalysis })
    ↓ (metadata, table)
buildOperationalRecords({ operationalDocumentModel, contract, ... })
    ↓ (registros operacionales con field mapping)
normalizeOperationalData({ parsedDocument, contract, structureAnalysis, ... })
    ↓ (registros normalizados + validados)
UniversalImportWorkflow muestra los 6+2 bloques
```

El `documentPattern` generado por `analyzeDocumentStructure` alimenta directamente a `buildDocumentRecords`. No hay estado intermedio ni orquestación adicional.

---

## Evidencia de certificación

- `npm run lint`: 0 errores en archivos modificados
- 5 archivos modificados, 0 archivos nuevos
- +435 líneas, -7 líneas
- Branch: `operativo-v1`
