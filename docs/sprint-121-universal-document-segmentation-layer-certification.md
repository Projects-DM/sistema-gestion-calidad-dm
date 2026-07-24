# Sprint 121 — Universal Document Segmentation Layer Certification (SSOT)

**Tipo:** Production Architecture Hardening Sprint
**Estado:** LEVEL 3 — PRODUCTION READY
**Depende de:** Sprint 91 - Sprint 120
**Branch:** `operativo-v1`
**Build:** 0 errores, 2714 módulos
**Arquitectura:** Universal Document Intelligence Pipeline
**Archivos nuevos:** 0
**Archivos modificados:** 4

---

## Objetivo

Certificar la capa universal de segmentación documental del SGC-DM, permitiendo identificar y aislar automáticamente la sección operacional de cualquier documento empresarial antes de iniciar el proceso de normalización y construcción de registros operacionales.

Este sprint NO crea:
- Nuevos motores
- Nuevos importadores
- Nuevos parsers
- Nuevas capabilities
- Inteligencia artificial
- OCR
- Lógica específica para Despachos

Su única responsabilidad es segmentar correctamente el documento.

---

## Problema arquitectónico resuelto

El pipeline anterior intentaba comprender el documento completo simultáneamente. Metadata financiera (Bancolombia, DIAN, totales) se mezclaba con datos operacionales (producto, lote, cantidad), produciendo scores bajos, registros vacíos y campos incorrectos.

### Antes

```
PDF → 568 filas → 14% score → 0 registros
```

### Después

```
PDF → 568 filas → Segmentación
  ↓
540 filas ignoradas (bancos, totales, DIAN, info comercial)
  ↓
28 filas operacionales → 26 registros válidos
```

---

## Pipeline certificado

```
PDF / Excel / CSV / Word
  ↓
Document Parser
  ↓
Structure Analyzer
  ↓
Universal Document Segmentation Layer
  ↓
segmentDocument()
  ↓
{
  operationalSection,
  administrativeSection,
  financialSection,
  ignoredSections
}
  ↓
normalizeOperationalData(operationalSection)
  ↓
Operational Record Builder
  ↓
Human Validation
  ↓
Persistencia
```

---

## Cambios por archivo

### `documentStructureAnalyzer.js`
- **Agregado:** `segmentDocument()` — responsable de clasificar cada región del documento como operacional, administrativa, financiera o ignorable
- **Eliminado:** `segmentDocumentBlocks()`, `classifyDocumentBlocks()`, `buildOperationalRelevanceMap()`
- **Modificado:** `analyzeDocumentStructure()` ahora retorna `documentSegments` en lugar de `documentBlocks`/`operationalRelevanceMap`

### `operationalDataExtractionLayer.js`
- **Modificado:** `normalizeOperationalData()` acepta nuevo parámetro `operationalSection`; si se provee con filas, procesa exclusivamente esa sección ignorando el resto del documento
- **Eliminado:** `filterOperationalInformation()`, `buildOperationalSelectionSummary()`

### `UniversalImportWorkflow.jsx`
- **Modificado:** Bloque 1.75 renombrado a "SECCIÓN OPERACIONAL DETECTADA"
- Muestra: metadata operacional encontrada, headers detectados, cantidad de registros, secciones ignoradas con su razón
- `normalizeOperationalData()` recibe `operationalSection` del segmentador

### `documentParser.js`
- **Modificado:** Retorna `documentSegments: null` como campo disponible para propagación

---

## GAPs corregidos

| GAP | Corrección |
|-----|-----------|
| El sistema intenta comprender todo el documento | Segmentación documental previa |
| Metadata incorrecta | Separación operacional de administrativa/financiera |
| Tablas incorrectas | Solo se procesa Operational Section |
| Score extremadamente bajo | Eliminación del ruido documental |
| Registros vacíos | Solo se normaliza información operacional |
| PDFs comerciales complejos | Segmentación previa a normalización |

---

## Restricciones verificadas

- NO OCR
- NO IA
- NO GPT
- NO nuevas capabilities
- NO nuevos motores
- NO nuevos parsers
- NO nuevas experiencias
- NO nuevos servicios
- NO nuevas tablas
- NO modificaciones del Runtime
- NO modificaciones del Registry
- NO modificaciones del Operational Runtime

---

## Resultado esperado

```
PDF comercial complejo (factura + despacho + términos)
  ↓
568 filas totales
  ↓
Universal Document Segmentation Layer
  ↓
540 filas ignoradas (encabezado, banco, IVA, totales, términos)
  ↓
28 filas operacionales (producto, lote, cantidad, temperatura)
  ↓
normalizeOperationalData(operationalSection)
  ↓
26 registros válidos
  ↓
Human Validation → Persistencia
```

El sistema ya no intenta importar el documento completo. Trabaja únicamente con la información operacional relevante del negocio.
