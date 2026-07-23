# Sprint 91 — Operational Traceability Experience & Document Intelligence Certification

**Tipo:** Operational Experience Architecture & Document Intelligence Certification
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 84 (Layout Intelligence), Sprint 85 (Section Intelligence), Sprint 86 (Pattern Recognition), Sprint 88 (Unified Checklist), Sprint 89 (Signature Governance), Sprint 90 (Visual Governance & Administration)
**Branch:** `operativo-v1`
**Build:** 0 errores, 2702 módulos, 2.26s
**Archivos modificados:** 5 (2 creados, 2 modificados, 1 eliminado)

---

## Objetivo

Certificar que la trazabilidad operacional se gestiona exclusivamente mediante la arquitectura dinámica existente, sin crear nuevos módulos, runtimes, builders, tablas ni motores.

La trazabilidad deja de ser un módulo del sistema. Se convierte en una **Operational Experience**.

## Filosofía oficial

```
Operational Experience
  → Import Engine (REUSE)
    → Operational Data Extraction Layer
      → Runtime existente (REUSE)
        → Dashboard (REUSE)
          → Export Engine (REUSE)
            → Document Repository (REUSE)
```

## Problema identificado

La página `Dispatches.jsx` y `DispatchesExperience.jsx` eran un duplicado al ~80%. El Import Engine certificado era completamente bypassado por `dispatchesExcel.js`, que tenía su propio parser XLSX, su propio sistema de sinónimos y su propia lógica de detección de encabezados.

## Cambios realizados

### 1. Creado: `src/services/import/operationalDataExtractionLayer.js` (200 líneas)

Nueva capa oficial de extracción de datos operacionales. NO es un motor — es una capa de normalización.

**Responsabilidades:**
- Recibir documentos ya interpretados por el Import Engine (`parseDocument()`)
- Aplicar sistema de sinónimos multi-idioma para detección inteligente de columnas
- Normalizar valores (fechas, horas, números) preservando tipos originales
- Devolver registros operacionales listos para el Runtime

**Funciones exportadas:**
| Función | Propósito |
|---------|-----------|
| `normalizeDispatches(parsedDoc)` | Normaliza documento a registros de despacho |
| `buildHeaderMap(headers, fields, synonyms)` | Mapea encabezados usando sinónimos |
| `detectHeaderRow(headers, rows, fields, synonyms)` | Encuentra fila de encabezados |
| `pickValue(row, key)` | Extrae valor seguro de fila |
| `toYmd(value)` | Normaliza a formato fecha ISO |
| `toHm(value)` | Normaliza a formato hora |
| `toNumber(value)` | Normaliza a valor numérico |
| `CANONICAL_FIELDS` | Campos canónicos de despacho |
| `FIELD_SYNONYMS` | Sinónimos multi-idioma |

### 2. Modificado: `src/services/import/documentParser.js`

Agregado `rawRows` al resultado de `parseXLSX()` — preserva los valores originales del Excel (números, fechas, strings) sin stringificar. Backwards compatible: todos los consumers existentes reciben los mismos datos.

| Antes | Después |
|-------|---------|
| `rows: jsonData.slice(1).map(row => row.map(String))` | `rawRows: jsonData.slice(1)` + `rows: ...map(String)` |
| Return sin `rawRows` | Return con `rawRows: parsed.rawRows || parsed.rows` |

### 3. Modificado: `src/utils/dispatchesExcel.js`

**Eliminadas ~200 líneas de código duplicado:** funciones `toYmd`, `toHm`, `toNumber`, `normalizeHeader`, `buildHeaderMap`, `pickValue`, `detectHeaderRow`, `CANONICAL_FIELDS`, `FIELD_SYNONYMS`, `scoreHeaderMatch`.

| Antes | Después |
|-------|---------|
| Parser XLSX propio | Delega a `parseDocument()` del Import Engine |
| Header matching propio | Delega a `normalizeDispatches()` de Extraction Layer |
| 330 líneas | 145 líneas (-56%) |

**Flujo anterior:**
```
File → dispatchesExcel.js (parse + normalize) → dispatch records
```

**Flujo actual:**
```
File → Import Engine (parseDocument) → Extraction Layer (normalizeDispatches) → dispatch records
```

### 4. Eliminado: `src/pages/Dispatches.jsx` (672 líneas)

Página orfandad — sin ruta en App.jsx, sin imports, reemplazada por `DispatchesExperience.jsx`.

**Código duplicado eliminado:** ~80% de superposición con `DispatchesExperience.jsx`:
- Mock data duplicada (MOCK_CLIENTS, MOCK_DRIVERS, MOCK_PRODUCTS)
- CRUD duplicado (fetchDespachos, insertDespacho, etc.)
- UI duplicada (formulario, tabla, filtros, export PDF)

## Arquitectura certificada

```
Documento (XLSX, XLS, CSV, PDF, DOCX)
  ↓
Import Engine (parseDocument) — REUSE
  ↓ { headers, rows, rawRows, textContent }
Operational Data Extraction Layer — NUEVA (NO es un motor)
  ↓ { rows, matchedHeaders, missingHeaders }
despachosService → insertDespacho — REUSE
  ↓
Runtime (DispatchesExperience) — REUSE
```

## Principios certificados

| Principio | Aplicación |
|-----------|-----------|
| REUSE FIRST | Import Engine, Runtime, despachosService reutilizados |
| ZERO NEW RUNTIMES | Sin DispatchRuntime |
| ZERO NEW BUILDERS | Sin DispatchBuilder |
| ZERO NEW TABLES | Sin nuevas tablas |
| OPERATIONAL EXPERIENCE FIRST | Despachos registrado en OperationalExperienceRegistry |
| DOCUMENT INTELLIGENCE FIRST | Import Engine entiende formatos, Extraction Layer normaliza |
| BUSINESS KNOWLEDGE FIRST | Sinónimos multi-idioma en Extraction Layer |
| ZERO DOCUMENT COUPLING | Extraction Layer recibe documentos ya interpretados |
| MULTI COMPANY READY | Sin reglas por cliente |
| EXPORT READY | dispatchesPdf.js reutilizado sin cambios |
| FUTURE INTEGRATIONS READY | Extraction Layer preparado para nuevos campos canónicos |

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Despachos certificado como Operational Experience | ✅ Registrado en OperationalExperienceRegistry |
| 2 | No existe módulo independiente de trazabilidad | ✅ Sin módulo trazabilidad |
| 3 | Reutilización del Import Engine | ✅ dispatchesExcel.js delega en `parseDocument()` |
| 4 | Reutilización del Runtime | ✅ DispatchesExperience sin cambios |
| 5 | Reutilización del Dashboard | ✅ Sin cambios |
| 6 | Reutilización del Export Engine | ✅ dispatchesPdf.js sin cambios |
| 7 | Reutilización del Document Repository | ✅ Sin cambios |
| 8 | Operational Data Extraction Layer certificada | ✅ Creada como capa de normalización (no motor) |
| 9 | Compatibilidad con PDF, Excel, Word y CSV | ✅ Import Engine ya soporta todos |
| 10 | Zero New Runtimes | ✅ |
| 11 | Zero New Builders | ✅ |
| 12 | Zero New Tables innecesarias | ✅ |
| 13 | Arquitectura Multiempresa preparada | ✅ Sin reglas por cliente |
| 14 | Future ERP Integrations Ready | ✅ Extraction Layer extensible |
| 15 | LEVEL 3 Certification | ✅ Build 0 errores, 2702 módulos |
