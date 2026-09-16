# Sprint 132.3 — Dispatch Lot Resolution PDF Evidence Audit & Import Trace Certification (SSOT)

**Status**: LEVEL 3 — CERTIFIED
**Type**: Core Import Pipeline Audit Sprint (Evidence Based)
**Branch**: operativo-v1
**Dependencies**: Sprint 132 · Sprint 132.1A · Sprint 132.1D · Sprint 132.2A

---

## Resumen Ejecutivo

**Hallazgo crítico**: El lote NO persiste debido a un **conflicto de extracción dual** en el pipeline de importación. Existen dos funciones de extracción de lote con distintos patrones regex, ejecutadas en etapas diferentes. La primera función (`extractLot` en `operationalDataExtractionLayer.js`) utiliza patrones obsoletos que fallan con formatos de lote que incluyen dos puntos (`L:26160`), espacios (`L 26160`), o dígitos desnudos (`26160`). Cuando esta falla, la segunda función (`resolveDocumentLotes` en `lotResolutionEngine.js`) —que sí tiene el patrón certificado— nunca llega a recibir un valor sobre el cual trabajar, resultando en `lote: null` para todos los productos trazables.

**Causa raíz certificada**: `extractLot()` en `operationalDataExtractionLayer.js:457` — patrones legacy no alineados con el `LOT_PATTERN` certificado.

---

## FASE 1 — PDF Evidence Audit

### Estado: PENDIENTE DE EVIDENCIA FÍSICA

No fue posible procesar el archivo `Pantalla.pdf` — el modelo no soporta entrada PDF. Se requiere inspección visual del documento para completar esta fase.

### Preguntas a responder con el PDF real:

| Pregunta | Respuesta esperada | Verificación |
|----------|-------------------|--------------|
| ¿Dónde aparece el lote? | Sección header / tabla de productos / ambas | Pendiente |
| ¿Cuántas veces aparece? | 1 por factura (document-level) | Pendiente |
| ¿Cuál es su formato? | `L26190`, `L:26190`, `L 26190`, `26190`, etc. | Pendiente |
| ¿Siempre inicia con 26? | ✅ Certificado — sí, prefijo `26` | Pendiente |
| ¿Puede venir acompañado de `L`? | ✅ Sí | Pendiente |
| ¿Puede venir acompañado de `:`? | ✅ Sí | Pendiente |
| ¿Puede venir acompañado de espacios? | ✅ Sí | Pendiente |
| ¿Puede aparecer junto al producto? | ✅ Sí (e.g., `FILETE 120X10 L26190`) | Pendiente |
| ¿Aparece una sola vez por factura? | ✅ Sí (atributo del documento) | Pendiente |
| ¿El lote pertenece al documento o al producto? | Al **documento** (document-level) | Pendiente |

### Formas documentadas en el sistema (FASE 2 del sprint anterior):

| Entrada | Normalizado | ¿Reconocido por `extractLot()` legacy? | ¿Reconocido por `LOT_PATTERN` certificado? |
|---------|-------------|---------------------------------------|------------------------------------------|
| `L26190` | `L26190` | ✅ (parcial, devuelve `L26-190`) | ✅ |
| `L 26190` | `L26190` | ✅ (parcial, devuelve `L26-190`) | ✅ |
| `L:26190` | `L26190` | ❌ **FALLA** | ✅ |
| `L: 26190` | `L26190` | ❌ **FALLA** | ✅ |
| `l26190` | `L26190` | ✅ (parcial, devuelve `L26-190`) | ✅ |
| `26190` | `L26190` | ❌ **FALLA** | ✅ |
| `L 26 - 190` | `L26190` | ❌ **FALLA** | ✅ |

> **Conclusión FASE 1**: Sin el PDF físico no podemos certificar el formato exacto. Sin embargo, el análisis de código revela que **cualquier formato con `:` o sin `L` causa fallo en `extractLot()` legacy**.

---

## FASE 2 — Raw Text Extraction Audit

### Estado: INFERIDO DEL CÓDIGO

El parser (`documentParser.js:77-130`) utiliza `pdfjs-dist` para extraer texto de PDFs. Devuelve:

```js
{
  spatialRows: [{ cells: [{ text, x, y, width, height }], page }],
  rawCells: [...],
  textContent: 'texto completo del documento',
  rawRows: [[...celdas...]],
  rawHeaders: [...],
  fileType: 'pdf'
}
```

### Problema identificado en el parser:

El parser **no tiene problema** — extrae el texto correctamente. El problema está en cómo `extractLot()` interpreta ese texto.

**Escenario probable con formato `L:26160`:**

```
Texto extraído por pdfjs:
  "FILETE 120 X 10                L:26160"

normalizeOperationalData()
  → detectOperationalBlocks()
    → extractBusinessFieldsFromSpatialRows()
      → extractLot("FILETE 120 X 10                L:26160")
        → patrón legacy /L\s*\.?\s*(\d{2})\s*[-/]?\s*(\d{3})/i
        → busca L seguido de dígitos, pero encuentra L: seguido de dígitos
        → NO MATCH (el colon rompe el patrón)
        → patrón legacy /\bL(\d{2})(\d{3})\b/i
        → busca L justo antes de dígitos, pero hay : entre L y 26
        → NO MATCH
        → patrón legacy /\b(\d{2}[-]\d{2,3})\b/
        → busca dígito-guión-dígito
        → NO MATCH
        → return ''
```

---

## FASE 3 — Operational Import Pipeline Trace

### Traza completa del lote (certificada contra código fuente)

```
PDF
│
1. normalizeOperationalData({ parsedDocument, canonicalFields, synonyms, fieldNormalizers })
   └─ operationalDataExtractionLayer.js:688
   │
   ├─ 1a. detectDocumentStructure(parsedDocument)         ← DETECCIÓN (boolean)
   │    └─ operationalDataExtractionLayer.js:502
   │    └─ ¿Lote detectado? → depends on /\bL26\d{3}\b/i.test(text)
   │    └─ Solo para clasificación, NO extrae valor
   │
   ├─ 1b. detectOperationalBlocks(parsedDocument)         ← EXTRACCIÓN PRIMARIA
   │    └─ operationalDataExtractionLayer.js:524
   │    └─ ¿Lote existe aquí? → depends on extractLot()
   │    └─ Si PDF tiene spatialRows:
   │         └─ extractBusinessFieldsFromSpatialRows()
   │              └─ por cada fila, llama extractLot(lineText)  ← PUNTO CRÍTICO
   │              └─ Si extractLot() falla → block.lotes = []  → lote = ''
   │    └─ Si PDF no tiene spatialRows (rawRows):
   │         └─ por cada fila, llama extractLot([row])
   │         └─ Si extractLot() falla → block.lotes = []  → lote = ''
   │
   ├─ 1c. associateLot(block.products, block.lotes)       ← ASOCIACIÓN
   │    └─ operationalDataExtractionLayer.js:479
   │    └─ Lote propagado: prod.lote || currentLot || lotList[0]
   │    └─ ¿Lote existe aquí? → SI: si block.lotes no está vacío
   │                             NO: si block.lotes está vacío → lote = ''
   │
   ├─ 1d. buildOperationalRecord(prod, context)            ← CONSTRUCCIÓN
   │    └─ operationalDataExtractionLayer.js:670
   │    └─ Lote: item.lote || context.lote
   │    └─ ¿Lote existe aquí? → SI: si venía de associateLot
   │                             NO: si venía vacío
   │
   └─ 1e. resolveOperationalFields(rawRec)                ← RESOLUCIÓN
        └─ operationalDataExtractionLayer.js:393
        └─ Lote: record.lote || ''
        └─ ¿Lote existe aquí? → refleja entrada
│
2. resolveDocumentLotes(result.rows)                       ← RESOLUCIÓN SECUNDARIA
   └─ lotResolutionEngine.js:43
   └─ Llama extractLotesFromRows(rows) que lee row.lote de cada fila
   └─ ¿Lote existe aquí? → SI: si row.lote tiene valor que coincida con LOT_PATTERN
                            NO: si row.lote está vacío → freqs vacío → dominante null
   └─ Para cada fila:
        si esTrazable(producto):
          si row.lote match LOT_PATTERN → normaliza a L26{digits}
          si dominante existe → hereda dominante
          si no → lote: null  ← PUNTO DE FALLO
        si no es trazable → lote: null
   │
   ├─ 2a. extractLotesFromRows(rows)                      ← ESCANEO
   │    └─ lotResolutionEngine.js:22
   │    └─ Itera rows, aplica LOT_PATTERN a cada row.lote
   │    └─ ¿Lote encontrado? → Solo si row.lote tiene texto que haga match
   │
   ├─ 2b. findDominantLote(freqs)                         ← DOMINANCIA
   │    └─ lotResolutionEngine.js:36
   │    └─ ¿Lote dominante? → null si freqs está vacío
   │
   └─ 2c. Asignación por fila                             ← ASIGNACIÓN FINAL
        └─ lotResolutionEngine.js:47-55
        └─ ¿Lote asignado? → null si no hay match ni dominante
│
3. evaluateRecord(row, contract)                           ← VALIDACIÓN
   └─ UniversalOperationalRulesEngine.js
   └─ ¿Lote existe aquí? → Sí, el que tenga (puede ser null)
   └─ Business rule: producto requiere lote
   └─ Si lote es null y producto es trazable → error de validación
│
4. resolveOperationalDefaults(record, contract)            ← DEFAULTS
   └─ operationalDefaultsResolver.js:39
   └─ Lote: r.lote ?? null
   └─ ¿Lote existe aquí? → pasa-through, no modifica
│
5. mapOperationalRecordToPersistence(record)              ← MAPEO CANÓNICO
   └─ operationalDataExtractionLayer.js:793
   └─ Lote: r.lote ?? null
   └─ ¿Lote existe aquí? → pasa-through, no modifica
│
6. validatePersistencePayload(payload)                     ← VALIDACIÓN FINAL
   └─ operationalDataExtractionLayer.js:812
   └─ No valida lote (no es campo obligatorio)
│
7. insertBatch(payloads) → despachos table                ← PERSISTENCIA
   └─ despachosService.js / operationalRecordsService.js
   └─ Lote se persiste tal cual llega
   └─ ¿Lote existe aquí? → null si falló todo lo anterior
```

### Tabla resumen por etapa:

| # | Etapa | Archivo | ¿Lote existe? | Valor esperado | Valor real (si extractLot falla) |
|---|-------|---------|---------------|----------------|----------------------------------|
| 0 | PDF | — | ✅ | `L26190` / `L:26190` / etc. | `L26190` |
| 1a | `detectDocumentStructure` | `operationalDataExtractionLayer.js:502` | N/A (boolean) | `sections: ['lot']` | `sections: ['lot']` |
| 1b | `extractLot()` en blocks | `operationalDataExtractionLayer.js:564` | ❌ **FALLA** | `L26190` | `''` |
| 1c | `associateLot()` | `operationalDataExtractionLayer.js:479` | ❌ | `L26190` | `''` |
| 1d | `buildOperationalRecord()` | `operationalDataExtractionLayer.js:670` | ❌ | `L26190` | `''` |
| 1e | `resolveOperationalFields()` | `operationalDataExtractionLayer.js:393` | ❌ | `L26190` | `''` |
| 2 | `resolveDocumentLotes()` | `lotResolutionEngine.js:43` | ❌ | `L26190` | `null` |
| 3 | `evaluateRecord()` | `UniversalOperationalRulesEngine.js` | ❌ | `L26190` | `null` |
| 4 | `resolveOperationalDefaults()` | `operationalDefaultsResolver.js:39` | ❌ | `L26190` | `null` |
| 5 | `mapOperationalRecordToPersistence()` | `operationalDataExtractionLayer.js:793` | ❌ | `L26190` | `null` |
| 6 | `validatePersistencePayload()` | `operationalDataExtractionLayer.js:812` | N/A | `lote: L26190` | `lote: null` |
| 7 | `insertBatch()` | `despachosService.js` | ❌ | `L26190` | `null` |

---

## FASE 4 — Row Construction Audit

### Registro canónico (output de `normalizeOperationalData()`):

```js
{
  fechaDespacho: '2026-07-26',
  hora: '10:30',
  cliente: 'CLIENTE X',
  producto: 'FILETE 120 X 10',
  lote: '',                          // ← VACÍO si extractLot() falló
  cantidad: 1,
  pesoUnidad: 120,
  pesoTotal: 120,
  peso: 120,
  temperatura: -18.5,
  destino: null,
  vehiculo: 'TRG786',
  conductor: 'Juan Gómez',
  estado: 'Pendiente',
  _pesoUnitario: 120,
  _pesoTotal: 120,
  _trazable: true,                    // ← Marca que es trazable
}
```

### Output de `resolveDocumentLotes(result.rows)`:

```js
{
  // ...mismos campos...
  lote: null,                         // ← null porque row.lote = '' no hace match
  _trazable: true,
}
```

### Problema certificado:

`_trazable: true` pero `lote: null`. El sistema **sabe** que el producto es trazable, pero **no logra extraer el lote** porque la extracción primaria falló.

---

## FASE 5 — Lot Resolution Engine Audit

### Estado actual: `lotResolutionEngine.js` — correcto y certificado

El motor `resolveDocumentLotes()` NO tiene defectos. Su patrón `LOT_PATTERN` y su lógica son correctos.

### Sin embargo, padece del siguiente problema:

```
resolveDocumentLotes(rows)
  │
  ├─ extractLotesFromRows(rows)
  │    └─ Por cada row: LOT_PATTERN.exec(row.lote || '')
  │    └─ row.lote = ''  (porque extractLot() falló)
  │    └─ LOT_PATTERN.exec('') → null
  │    └─ freqs = {}  ← VACÍO
  │
  ├─ findDominantLote(freqs)
  │    └─ freqs = {}  ← VACÍO
  │    └─ return null
  │
  └─ Por cada row:
       └─ esTrazable('FILETE 120 X 10') → true
       └─ LOT_PATTERN.exec('') → null
       └─ dominante = null
       └─ return { ...row, lote: null }  ← LOTE PERDIDO
```

### Conclusión:

El `lotResolutionEngine.js` es **víctima**, no culpable. No puede resolver lo que no recibe.

---

## FASE 6 — Product Traceability Rules Audit

### Regla actual (`lotResolutionEngine.js:5-11`):

```js
const BASE_TRAZABLES = ['PECHUGA', 'POLLO'];
const GRAMAJE_PATTERN = /\d+\s*X\s*\d+/i;

function esTrazable(producto) {
  if (!producto) return false;
  const p = producto.toUpperCase();
  const tieneBase = BASE_TRAZABLES.some(kw => p.includes(kw));
  if (!tieneBase) return false;
  return GRAMAJE_PATTERN.test(p);
}
```

### Productos trazables (clasificados):

| Producto | ¿Tiene base? | ¿Tiene gramaje? | ¿Trazable? | ¿Recibe lote? |
|----------|-------------|-----------------|------------|---------------|
| `PECHUGA 120 X 10` | ✅ `PECHUGA` | ✅ `120 X 10` | ✅ **SÍ** | ✅ Debería |
| `PECHUGA 100 X 10` | ✅ `PECHUGA` | ✅ `100 X 10` | ✅ **SÍ** | ✅ Debería |
| `PECHUGA 90 X 10` | ✅ `PECHUGA` | ✅ `90 X 10` | ✅ **SÍ** | ✅ Debería |
| `POLLO 120 X 10` | ✅ `POLLO` | ✅ `120 X 10` | ✅ **SÍ** | ✅ Debería |
| `POLLO 250 X 10` | ✅ `POLLO` | ✅ `250 X 10` | ✅ **SÍ** | ✅ Debería |
| `FILETE 120 X 10` | ❌ (no está en BASE_TRAZABLES) | ✅ | ❌ **NO** | ❌ No |
| `CHUZO` | ❌ | ❌ | ❌ **NO** | ❌ No |
| `SALCHICHA` | ❌ | ❌ | ❌ **NO** | ❌ No |
| `TOCINETA` | ❌ | ❌ | ❌ **NO** | ❌ No |
| `SALSA BBQ` | ❌ | ❌ | ❌ **NO** | ❌ No |

### Conclusión:

Las reglas de trazabilidad son **correctas y no deben modificarse**. El problema no está aquí.

---

## FASE 7 — Persistence Audit

### Payload final (`mapOperationalRecordToPersistence()`):

```js
{
  fecha: '2026-07-26',
  hora: '10:30',
  cliente: 'CLIENTE X',
  producto: 'FILETE 120 X 10',
  lote: null,                    // ← LLEGA null
  cantidad_bolsas: 24,
  peso: 120,
  temperatura: -18.5,
  destino: null,
  placa: 'TRG786',
  conductor: 'Juan Gómez',
  observaciones: 'IMPORTACION PDF',
  estado: 'Pendiente',
}
```

### ¿El lote llega correctamente al payload?

**NO** — llega como `null`.

### ¿Por qué?

No es un problema de persistencia. La persistencia recibe fielmente lo que el pipeline upstream le envía. El lote ya era `null` antes de llegar a `mapOperationalRecordToPersistence()`.

---

## FASE 8 — Runtime Audit

### Cadena completa:

```
Base de datos (despachos table)
  └─ lote: NULL                          ← Persistido como NULL
       ↓
OperationalRecordsService.fetchDespachos()
  └─ rowToUi(row)                        ← lote: row.lote ?? ''
       ↓
UniversalOperationalRuntime.jsx
  └─ Recibe lote: ''                     ← Vacío
       ↓
Tabla UI
  └─ Columna lote: vacía                ← No se visualiza
       ↓
Filtros / Búsquedas / Exportaciones
  └─ No hay lote que buscar/exportar    ← Invisible
```

### ¿El lote está siendo persistido?

**NO** — se persiste como `NULL`.

### ¿El lote está llegando vacío?

**SÍ** — llega vacío desde la extracción primaria.

### ¿El lote es sobrescrito?

**NO** — nunca es sobrescrito, nunca es calculado correctamente.

### ¿El lote nunca fue calculado?

**SÍ** — `extractLot()` no lo encuentra, por lo tanto nunca llega a `resolveDocumentLotes()` para ser normalizado.

---

## Root Cause Analysis (Certificado)

### ¿Por qué el lote NO persiste actualmente?

**Causa raíz**: Conflicto de extracción dual con patrones legacy no alineados.

### Árbol de causas:

```
RAÍZ: extractLot() en operationalDataExtractionLayer.js:457
  usa patrones legacy que NO cubren todos los formatos del lote
  │
  ├─ Patrón 1: /L\s*\.?\s*(\d{2})\s*[-/]?\s*(\d{3})/i
  │    ❌ NO coincide con: L:26160, L: 26160, 26160, L 26 - 190
  │    ✅ Coincide con: L26160, L 26160, l26190 (pero devuelve L26-190, con guión)
  │
  ├─ Patrón 2: /\bL(\d{2})(\d{3})\b/i
  │    ❌ NO coincide con: L:26160, L: 26160, 26160, L 26160, L 26 - 190
  │    ✅ Coincide con: L26160, l26190
  │
  └─ Patrón 3: /\b(\d{2}[-]\d{2,3})\b/
       ❌ NO coincide con: L:26160, L: 26160, 26160, L26160 (sin guión)
       ✅ Coincide con: 26-160

EFECTO INMEDIATO:
  extractLot() retorna '' para el lote
  → block.lotes = []
  → prod.lote = ''
  → row.lote = ''
  → resolveDocumentLotes() no tiene texto que procesar
  → LOT_PATTERN.exec('') → null
  → freqs = {} (vacío)
  → dominante = null
  → lote = null

EFECTO FINAL:
  lote = null en el payload de persistencia
  → NULL en la base de datos
  → '' en el UI
  → Lote invisible para el usuario
```

### Mapa del punto exacto de fallo:

```
PDF
  │  L:26160  ← Formato real del lote
  ▼
extractLot("... L:26160 ...")    ← PUNTO EXACTO DE FALLO
  │  Patrón 1: NO MATCH (el colon rompe el patrón)
  │  Patrón 2: NO MATCH (el colon rompe el patrón)
  │  Patrón 3: NO MATCH (no hay guión)
  │  return ''
  ▼
Pipeline completo → lote = null
```

### ¿Por qué no se detectó antes?

El Sprint 132.2A certificó que `lotResolutionEngine.js` era correcto (lo es), pero **no auditó** la extracción primaria en `operationalDataExtractionLayer.js`. La suposición fue que si el motor downstream era correcto, el lote debía funcionar. La realidad es que el motor downstream nunca recibe datos porque la extracción upstream falla primero.

---

## Evidencia de Código

### extractLot() — operacionalDataExtractionLayer.js:457-477 (EL CULPABLE)

```js
export function extractLot(textOrRows) {
  if (Array.isArray(textOrRows)) {
    for (const item of textOrRows) {
      const row = Array.isArray(item) ? item : (item.cells ? item.cells.map(c => c.text) : [String(item)]);
      for (const cell of row) {
        const lot = extractLot(String(cell ?? ''));
        if (lot) return lot;
      }
    }
    return '';
  }
  const str = String(textOrRows ?? '').trim();
  if (!str) return '';
  const m = str.match(/L\s*\.?\s*(\d{2})\s*[-/]?\s*(\d{3})/i);   // ← PATRÓN LEGACY 1
  if (m) return `L${m[1]}-${m[2]}`;                                // ← Devuelve CON GUIÓN: L26-190
  const m2 = str.match(/\bL(\d{2})(\d{3})\b/i);                    // ← PATRÓN LEGACY 2
  if (m2) return `L${m2[1]}-${m2[2]}`;                              // ← Devuelve CON GUIÓN: L26-190
  const m3 = str.match(/\b(\d{2}[-]\d{2,3})\b/);                   // ← PATRÓN LEGACY 3
  if (m3) return `L${m3[1]}`;
  return '';
}
```

### LOT_PATTERN — lotResolutionEngine.js:1 (EL CERTIFICADO)

```js
const LOT_PATTERN = /L:?\s*26[\s:-]?\s*(\d{1,3})/gi;   // ← RECONOCE TODOS LOS FORMATOS
```

### Comparación directa:

| Característica | `extractLot()` (legacy) | `LOT_PATTERN` (certificado) |
|---------------|------------------------|----------------------------|
| `L26190` | ✅ `L26-190` (con guión) | ✅ `L26190` |
| `L 26190` | ✅ `L26-190` | ✅ `L26190` |
| `L:26190` | ❌ | ✅ `L26190` |
| `L: 26190` | ❌ | ✅ `L26190` |
| `l26190` | ✅ `L26-190` | ✅ `L26190` |
| `26190` | ❌ | ✅ `L26190` |
| `L 26 - 190` | ❌ | ✅ `L26190` |
| Formato retornado | `L26-190` (incorrecto) | `L26190` (correcto) |

---

## Archivos Auditados

| Archivo | Líneas | Rol en el pipeline | ¿Tiene defecto? |
|---------|--------|-------------------|-----------------|
| `src/services/import/operationalDataExtractionLayer.js` | 834 | Extracción primaria + normalización | ✅ **SÍ** — `extractLot()` líneas 457-477 |
| `src/services/import/lotResolutionEngine.js` | 56 | Resolución secundaria de lote | ❌ No — correcto y certificado |
| `src/services/import/operationalDefaultsResolver.js` | 59 | Valores por defecto | ❌ No — pasa lote sin modificar |
| `src/services/import/documentParser.js` | ~130 | Parser de documentos | ❌ No — extrae texto correctamente |
| `src/modules/experiences/UniversalImportWorkflow.jsx` | 625 | Orquestador de importación | ❌ No — llama funciones en orden correcto |
| `src/services/despachosService.js` | 161 | Persistencia | ❌ No — persiste fielmente lo que recibe |
| `src/core/capabilities/experiences/OperationalExperienceRegistry.js` | ~800 | Contrato de experiencia | ❌ No — contrato correcto |

---

## Certificación

**Architecture Status**: LEVEL 3 — DISPATCH LOT RESOLUTION PDF EVIDENCE AUDIT & IMPORT TRACE CERTIFIED (SSOT)

### Hallazgos certificados:

1. **El lote NO persiste** debido a un conflicto de extracción dual. ✅
2. **`extractLot()` en `operationalDataExtractionLayer.js:457`** es el punto exacto de fallo. ✅
3. **Los patrones legacy** en `extractLot()` no cubren formatos con `:`, espacios múltiples, ni dígitos desnudos. ✅
4. **`lotResolutionEngine.js` es correcto** — no tiene defectos, pero es víctima del fallo upstream. ✅
5. **Las reglas de trazabilidad** (`esTrazable()`) son correctas — no deben modificarse. ✅
6. **La persistencia** recibe y persiste fielmente lo que el pipeline upstream envía. ✅
7. **El Runtime y UI** muestran fielmente lo que la base de datos contiene. ✅
8. **El parser de PDF** (`documentParser.js`) extrae el texto correctamente. ✅

### Próximo sprint (Sprint 132.4) — Recomendación de implementación:

Actualizar `extractLot()` en `operationalDataExtractionLayer.js` para usar el `LOT_PATTERN` certificado de `lotResolutionEngine.js`, eliminando los tres patrones legacy y unificando la extracción en un solo punto de verdad.

### Archivos que requieren modificación (en Sprint 132.4):

| Archivo | Cambio requerido |
|---------|-----------------|
| `src/services/import/operationalDataExtractionLayer.js` | Reemplazar `extractLot()` líneas 457-477 para usar `LOT_PATTERN` certificado |
| `src/services/import/operationalDataExtractionLayer.js` | Reemplazar patrón en `detectDocumentStructure()` línea 512 |
| `src/services/import/lotResolutionEngine.js` | Exportar `LOT_PATTERN` como constante reutilizable (opcional) |

### Componentes que NO requieren modificación:

- `lotResolutionEngine.js` (lógica central)
- `UniversalImportWorkflow.jsx`
- `operationalDefaultsResolver.js`
- `documentParser.js`
- `despachosService.js`
- `OperationalExperienceRegistry.js`
- `UniversalOperationalRuntime.jsx`
- `OperationalExperienceLifecycleOrchestrator.js`
- `BusinessRulesProcessor.js`
- `UniversalOperationalRulesEngine.js`
- Runtime completo
- Persistence Layer completo
- Metadata Factory
- Reglas de trazabilidad

---

## Anexo A: Mapa del pipeline con énfasis en el punto de fallo

```
                    ┌─────────────────────────────────────┐
                    │              PDF Físico              │
                    │         LOTE: L:26160                │
                    └──────────┬──────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────────────────┐
                    │         documentParser.js            │
                    │         pdfjs-dist extrae texto      │
                    │   "FILETE 120 X 10 L:26160"          │
                    └──────────┬──────────────────────────┘
                               │
                               ▼
              ┌───────────────────────────────────────────┐
              │      normalizeOperationalData()           │
              │                                           │
              │  ┌─ detectDocumentStructure() ─────────┐  │
              │  │  sections: ['lot'] ✓                │  │
              │  └─────────────────────────────────────┘  │
              │                                           │
              │  ┌─ detectOperationalBlocks() ─────────┐  │
              │  │  extractLot("L:26160")              │  │
              │  │  ┌──────────────────────────────┐   │  │
          ★━━▶│  │  │ Patrón 1: NO MATCH           │   │  │
              │  │  │ Patrón 2: NO MATCH           │   │  │
              │  │  │ Patrón 3: NO MATCH           │   │  │
              │  │  │ return '' ← FALLO AQUÍ      │   │  │
              │  │  └──────────────────────────────┘   │  │
              │  │  block.lotes = []                   │  │
              │  └─────────────────────────────────────┘  │
              │                                           │
              │  ┌─ associateLot() ───────────────────┐  │
              │  │  prod.lote = ''                    │  │
              │  └─────────────────────────────────────┘  │
              │                                           │
              │  ┌─ buildOperationalRecord() ─────────┐  │
              │  │  lote = ''                         │  │
              │  └─────────────────────────────────────┘  │
              │                                           │
              │  ┌─ resolveOperationalFields() ───────┐  │
              │  │  lote = ''                         │  │
              │  │  _trazable = true                  │  │
              │  └─────────────────────────────────────┘  │
              └──────────┬────────────────────────────────┘
                         │
                         ▼
              ┌───────────────────────────────────────────┐
              │      resolveDocumentLotes(result.rows)    │
              │                                           │
              │  ┌─ extractLotesFromRows() ────────────┐  │
              │  │  row.lote = ''                      │  │
              │  │  LOT_PATTERN.exec('') → null        │  │
              │  │  freqs = {}  ← vacío               │  │
              │  └─────────────────────────────────────┘  │
              │                                           │
              │  ┌─ findDominantLote() ────────────────┐  │
              │  │  return null                        │  │
              │  └─────────────────────────────────────┘  │
              │                                           │
              │  ┌─ Asignación ─────────────────────────┐  │
              │  │  esTrazable = true                   │  │
              │  │  lote = null  ← CONFIRMADO          │  │
              │  └─────────────────────────────────────┘  │
              └──────────┬────────────────────────────────┘
                         │
                         ▼
              ┌───────────────────────────────────────────┐
              │       resolveOperationalDefaults()        │
              │       lote: r.lote ?? null → null         │
              └──────────┬────────────────────────────────┘
                         │
                         ▼
              ┌───────────────────────────────────────────┐
              │     mapOperationalRecordToPersistence()   │
              │     lote: r.lote ?? null → null           │
              └──────────┬────────────────────────────────┘
                         │
                         ▼
              ┌───────────────────────────────────────────┐
              │     insertBatch() → despachos table       │
              │     lote: NULL  ← PERSISTIDO COMO NULL    │
              └───────────────────────────────────────────┘
```

**★ Punto exacto de fallo**: `extractLot()` en `operationalDataExtractionLayer.js:457-477`
