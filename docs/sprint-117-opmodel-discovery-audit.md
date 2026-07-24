# Sprint 117 — Dispatch Operational Model Discovery & Import Intelligence Audit (SSOT)

**Tipo:** Production Operational Discovery Sprint
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 91 - Sprint 116
**Branch:** `operativo-v1`
**Build:** 0 errores, 2714 módulos
**Archivos nuevos:** 0
**Archivos modificados:** 0

---

## Objetivo

Certificar el modelo operacional real de la experiencia de Despachos de DM Distribuciones y auditar el pipeline de importación documental para garantizar que la arquitectura existente pueda interpretar correctamente los documentos utilizados por el negocio antes de transformarlos en registros operacionales de trazabilidad.

Este sprint NO agrega nuevas funcionalidades ni capacidades. Es exclusivamente de **Discovery**, **Audit**, **Functional Modeling** y **Business Alignment**.

---

## Operational Model Discovery

### Pregunta 1 — ¿Un despacho puede contener varios productos?

**Respuesta:** SÍ.

Un despacho (camión, ruta, conductor, fecha de salida) transporta **múltiples productos** para **múltiples clientes** en un mismo viaje. La factura de despacho lista cada producto con su lote, cantidad y temperatura individual.

**Evidencia:** El contrato actual tiene `producto` como campo único (no repetible), lo que fuerza una fila por producto. En la realidad, una fila = un producto-lote dentro de un despacho que puede tener 15+ productos.

### Pregunta 2 — ¿Cada producto genera un registro independiente?

**Respuesta:** SÍ.

Cada producto + lote dentro de un despacho es una unidad de trazabilidad independiente. El registro operacional de trazabilidad se define como:

> **Registro Operacional = (Despacho, Producto, Lote, Temperatura, Cantidad)**

Esto significa que un solo despacho con 10 productos genera **10 registros operacionales**.

**Impacto en el modelo actual:** El contrato actual ya produce 1 registro por fila, lo cual es correcto en granularidad. Sin embargo, los metadatos compartidos (conductor, placa, destino, fecha) se duplican en cada registro.

### Pregunta 3 — ¿La factura es un documento operacional?

**Respuesta:** NO directamente.

La factura es un **documento comercial** que contiene la información operacional. El sistema no debe importar la factura como un registro — debe **extraer** los registros operacionales desde la factura.

La factura es el **contenedor**: contiene cliente, productos, lotes, cantidades, conductor, destino. El sistema debe descomponerla en N registros operacionales.

### Pregunta 4 — ¿El lote pertenece al producto o al despacho?

**Respuesta:** Al PRODUCTO.

Cada producto dentro de un despacho tiene su propio lote (o lotes). El lote es un atributo del producto en el contexto del despacho.

**Modelo correcto:** `(Despacho → Producto → Lote → Cantidad → Temperatura)`

### Pregunta 5 — ¿La temperatura pertenece al despacho o al producto?

**Respuesta:** Al PRODUCTO (o al producto-lote).

Cada producto puede tener un requisito de temperatura diferente. Un despacho puede transportar producto congelado (-18°C) y producto refrigerado (4°C) simultáneamente.

**GAP actual:** El contrato tiene temperatura a nivel de registro (fila), lo cual es correcto para la granularidad producto-lote.

### Pregunta 6 — ¿El conductor pertenece al despacho o a la factura?

**Respuesta:** Al DESPACHO.

El conductor es parte de la información logística del despacho (viaje/camión), no de la factura ni del producto. Se comparte entre todos los registros del mismo despacho.

### Pregunta 7 — ¿La firma pertenece al conductor o al registro?

**Respuesta:** Al CONDUCTOR (como parte del despacho).

La firma digital del conductor certifica la recepción de TODO el despacho, no de un producto individual. Es un metadato compartido a nivel de despacho.

### Pregunta 8 — ¿Cuál es el identificador único del registro operacional de trazabilidad?

**Respuesta:** `(ID_Despacho, Producto, Lote)`.

| Componente | Descripción |
|---|---|
| ID Despacho | Número de factura o ID interno del viaje |
| Producto | Código SKU o nombre del producto |
| Lote | Código de lote del producto |

Esta tripleta identifica de forma única cada registro operacional de trazabilidad.

---

## Document Intelligence Audit

### Pipeline auditado

```
Documento (Excel/PDF)
  ↓
parseDocument()          → rawRows, rawHeaders, textContent
  ↓
analyzeDocumentStructure → { documentType, confidence, sections, signals }
  ↓
normalizeOperationalData → { rows, matchedHeaders, missingHeaders }
  ↓
evaluateRecord           → { allErrors, complianceIssues }
  ↓
Human Validation         → row toggle, cell edit, select/deselect
  ↓
Operational Runtime      → inserción en tabla 'despachos'
```

### ¿Qué está funcionando?

| Componente | Estado |
|---|---|
| `parseDocument()` para XLSX/XLS | ✅ Correcto — extrae filas, encabezados, texto |
| `parseDocument()` para CSV | ✅ Correcto |
| `parseDocument()` para DOCX | ✅ Correcto |
| `parseDocument()` para PDF (texto) | ⚠️ Ahora funcional — worker configurado, agrupación por coordenadas XY |
| `analyzeDocumentStructure()` | ✅ Detecta tabular vs semi-estructurado con 8 señales |
| `normalizeOperationalData()` para tabulares | ✅ Mapeo por sinónimos, detección dinámica de fila de encabezados |
| `normalizeOperationalData()` semi-estructurados | ✅ Usa regiones de tabla, extrae metadatos pre-tabla |
| `evaluateRecord()` | ✅ Validación fields required, business rules, compliance |
| Human Validation UI | ✅ Vista previa, edición de celdas, toggle por fila |

### ¿Qué no está funcionando?

| Problema | Severidad | Causa |
|---|---|---|
| PDF sin texto (escaneado/imagen) | 🔴 BLOQUEANTE | No hay OCR — `getTextContent()` devuelve vacío |
| Documentos con 1 factura → N productos | 🟡 GAP | El pipeline trata cada fila como registro independiente sin agrupar por factura |
| Metadatos compartidos duplicados | 🟡 GAP | conductor, placa, destino se repiten en cada fila sin relación entre registros |
| Sin número de factura en campos canónicos | 🟡 GAP | El contrato no modela el ID del documento origen |
| Multi-lote por producto | 🟢 Menor | Un producto puede tener múltiples lotes en el mismo despacho |

### ¿Qué información está siendo detectada?

| Información | Detectado por | Confianza |
|---|---|---|
| Tipo de documento | `analyzeDocumentStructure()` | Alta |
| Número de filas con datos | `parseDocument().rawRows.length` | Alta |
| Encabezados de columna | `detectHeaderRow()` / sinónimos | Alta |
| Campos coincidentes | `buildHeaderMap()` | Media-Alta |
| Campos faltantes | Diferencia canonicalFields - matchedHeaders | Alta |
| Regiones de tabla (semi-estructurado) | `extractTableRegions()` | Media |
| Metadatos pre-tabla (pares label:valor) | `extractMetadataRowPairs()` | Media |

### ¿Qué estructura documental NO está siendo comprendida?

| Estructura Real | Estado en el pipeline |
|---|---|
| Documento → Factura | ❌ No detectado. No hay campo `numero_factura` |
| Factura → Cliente | ✅ Detectado por sinónimos de `cliente` |
| Factura → N Productos | ❌ No hay agrupación. Cada fila es independiente |
| Producto → Lote | ✅ Lote es campo canónico |
| Producto → Temperatura | ✅ Temperatura es campo canónico |
| Despacho → Conductor | ✅ Conductor es campo canónico |
| Despacho → Placa | ✅ Placa es campo canónico |
| Conductor → Firma | ✅ `signature_estado` es campo canónico |
| Relación entre registros del mismo despacho | ❌ No existe. No hay `dispatch_id` o `factura_id` |

---

## Modelo Documental Real vs Modelo Actual

### Modelo Actual (1 Fila = 1 Registro)

```
Excel Row → { fecha, hora, cliente, producto, lote, cantidad, peso, temperatura, destino, placa, conductor, estado, observaciones }
```

### Modelo Real Descubierto

```
Documento (archivo Excel/PDF)
  ├── metadata: [tipo_documento, nro_factura, fecha_factura, total_productos]
  │
  ├── Despacho
  │   ├── fecha_salida
  │   ├── hora_salida
  │   ├── conductor
  │   ├── placa
  │   ├── destino
  │   ├── firma_conductor
  │   │
  │   ├── Cliente 1
  │   │   ├── Producto A
  │   │   │   ├── Lote A1 → Registro: { producto, lote, cantidad, temperatura }
  │   │   │   └── Lote A2 → Registro: { producto, lote, cantidad, temperatura }
  │   │   └── Producto B
  │   │       └── Lote B1 → Registro: { producto, lote, cantidad, temperatura }
  │   │
  │   └── Cliente 2
  │       └── Producto C
  │           └── Lote C1 → Registro: { producto, lote, cantidad, temperatura }
```

### Unidad Mínima Operacional

**Registro Operacional de Trazabilidad** = `(Despacho, Producto, Lote)`

| Atributo | Origen | Obligatorio |
|---|---|---|
| `fecha` | Despacho | Sí |
| `hora` | Despacho | No |
| `nro_factura` | Documento | Sí |
| `cliente` | Documento | Sí |
| `producto` | Producto | Sí |
| `lote` | Lote | Sí |
| `cantidad` | Producto-Lote | Sí |
| `temperatura` | Producto-Lote | Condicional |
| `destino` | Despacho | No |
| `conductor` | Despacho | No |
| `placa` | Despacho | No |
| `firma` | Despacho | No |

---

## GAP Certification

### GAP-01: Granularidad del registro operacional

**Estado:** ✅ CERTIFICADO

**Problema:** La granularidad del registro operacional no estaba formalmente definida.

**Solución:** Definida como `(Despacho, Producto, Lote)`. La tripleta identifica de forma única cada registro de trazabilidad. El modelo actual de 1 fila = 1 registro es correcto para esta granularidad, pero debe enriquecerse con el identificador del despacho o factura origen.

### GAP-02: Documentos reales no coinciden con el modelo documental actual

**Estado:** ✅ CERTIFICADO

**Hallazgo:** Los documentos reales del negocio (facturas de despacho) contienen:
- Múltiples productos por documento
- Múltiples lotes por producto
- Metadatos compartidos (conductor, placa, destino) a nivel de despacho
- Información jerárquica que el modelo plano no captura

**Impacto:** El pipeline puede importar los datos, pero pierde la relación entre registros que pertenecen al mismo despacho.

### GAP-03: El pipeline de importación no comprende la estructura operacional del documento

**Estado:** ✅ AUDITADO

**Hallazgos del audit:**

| Etapa | Funciona | No funciona | Acción requerida |
|---|---|---|---|
| `parseDocument()` | Extracción de filas para XLSX, CSV, DOCX | PDF escaneado sin OCR | Considerar Tesseract.js en sprint futuro |
| `analyzeDocumentStructure()` | Clasificación TABULAR/SEMI_STRUCTURED | N/A — cumple propósito de discovery | Usar para informar la UI |
| `normalizeOperationalData()` | Mapeo de campos canónicos | No agrupa registros por documento origen | Enriquecer canonicalFields con `nro_factura` |
| `evaluateRecord()` | Validación de campos requeridos y compliance | Temperature check es genérico (8°C para todos) | Temperatura por tipo de producto |
| Human Validation | Edición, toggle, selección | No muestra relación entre registros | Agrupar por factura en UI |
| Persistencia | Inserción en tabla `despachos` | No hay tabla `trazabilidad` separada | Evaluar modelo de datos |

### GAP-04: El contrato operacional de Despachos requiere validación funcional

**Estado:** ✅ CERTIFICADO

**Hallazgo:** El contrato en `OperationalExperienceRegistry.js:131` está completo en términos de campos canónicos y sinónimos, pero:

1. **Falta `nro_factura`** como campo canónico para identificar el documento origen
2. **`temperatura` debería tener validación por tipo de producto** (no un umbral fijo de 8°C)
3. **La relación despacho-producto-lote** no se persiste actualmente — cada registro se inserta independientemente

**Recomendaciones:**

| # | Recomendación | Prioridad | Sprint sugerido |
|---|---|---|---|
| 1 | Agregar `nro_factura` a `canonicalFields` de Despachos | Alta | Sprint 118 |
| 2 | Agregar `producto_id` o `codigo_producto` para relacionar con maestro de productos | Alta | Sprint 118 |
| 3 | Validar temperatura contra el tipo de producto usando el Product Master | Media | Sprint 119 |
| 4 | Agrupar registros por factura en la UI de Human Validation | Media | Sprint 119 |
| 5 | Evaluar tabla de trazabilidad separada con foreign key a despacho | Baja | Sprint 120 |

---

## Estrategia de Importación para Documentos Reales

Basado en el discovery, la estrategia correcta para importar documentos reales del negocio es:

### Fase 1 (Sprinteable — Sprint 118)

Mantener 1 fila = 1 registro, pero enriquecer:

```
documentContract.canonicalFields.push('nro_factura');
documentContract.canonicalFields.push('codigo_producto');
```

Cada fila importada llevará:
- `nro_factura`: identificador del documento origen (permite agrupar registros)
- `codigo_producto`: código SKU del producto (permite relacionar con Product Master)

Los metadatos compartidos (conductor, placa, destino) se mantienen duplicados por fila, lo cual es aceptable para el modelo actual.

### Fase 2 (Sprint 119-120)

- UI de validación humana agrupada por factura
- Validación de temperatura contra el Product Master
- Trazabilidad: consulta de todos los registros de una misma factura

### Fase 3 (Futuro)

- Tabla de trazabilidad normalizada con foreign keys
- OCR para PDFs escaneados
- Carga por lote agrupando por despacho

---

## Resultado

| Criterio | Estado |
|---|---|
| Operational Model Discovery completado | ✅ |
| Import Intelligence Audit completado | ✅ |
| Registro operacional formalmente definido | ✅ `(Despacho, Producto, Lote)` |
| Modelo documental certificado | ✅ |
| Pipeline auditado | ✅ |
| Zero New Infrastructure | ✅ |
| Business Alignment completado | ✅ |
| Arquitectura preservada | ✅ |
| Production Ready para evolución futura | ✅ |

---

## Cambios en la base de código

**Archivos modificados:** 0

Este sprint fue exclusivamente de Discovery + Audit. No se modificó infraestructura ni se crearon nuevas capacidades.

Los cambios funcionales (agregar `nro_factura` a canonicalFields, UI agrupada) se realizarán en Sprints 118+ basados en este reporte.

---

## Anchored Summary

---
**Anchored Summary — Sprint 117**
- **Sprint:** 117 — Dispatch Operational Model Discovery & Import Intelligence Audit
- **Objective:** Certify the real operational model of Dispatch dispatches and audit the document import pipeline against real business documents
- **What was discovered:**
  - **Operational Model:** A dispatch can carry multiple products × multiple lots. The operational traceability record is defined as `(Dispatch, Product, Lot)`. Temperature belongs to product-lot, not dispatch. The driver signature certifies the entire dispatch, not individual products. Invoice number is missing from canonical fields.
  - **Pipeline Audit:** `parseDocument()` works for XLSX/CSV/DOCX. PDF now has proper worker config and XY-position-aware row extraction. Scanned PDFs (no text layer) remain unsupported. The normalizer correctly maps fields via synonyms for tabular docs, and the semi-structured path now uses table regions + metadata extraction.
  - **GAPs Certified:** 4 GAPs identified — granularity undefined (GAP-01), real docs don't match flat model (GAP-02), pipeline misses document→invoice→product hierarchy (GAP-03), contract needs `nro_factura` and product-type-aware validation (GAP-04).
- **Files changed:** 0 (discovery-only sprint)
- **Key Decision:** No new infrastructure. The dispatch contract must add `nro_factura` and `codigo_producto` to canonicalFields in Sprint 118. The flat 1-row = 1-record model is correct for granularity but needs document grouping metadata.
- **Status:** ✅ Certified
