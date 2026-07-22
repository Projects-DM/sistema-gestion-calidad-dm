# Sprint 84 — Document Layout Intelligence Engine

**Tipo:** Document Structure Recognition & Layout Intelligence
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 83 — Business Knowledge Classification Engine
**Branch:** `operativo-v1`
**Build:** 0 errores, 2701 módulos, 2.28s

---

## Objetivo

Evolucionar el motor de importación para que, **antes** de clasificar los campos, sea capaz de reconocer la estructura general del documento.

A partir de este Sprint el sistema deja de analizar únicamente palabras individuales y comienza a **identificar el tipo de documento** que está procesando. Esta clasificación permite interpretar correctamente formularios verticales, tablas operacionales y listas de inspección reutilizando completamente el Builder existente.

No se modifica Runtime, Dynamic Forms, persistencia ni se crean nuevos componentes. Toda la inteligencia permanece concentrada en `structureDetector.js`.

## Problema identificado

Hasta Sprint 83 el motor interpreta todos los documentos como si fueran listas verticales. Sin embargo, los formatos del Sistema de Gestión de Calidad poseen múltiples estructuras documentales:

```
FORMULARIO                  vs     DÍA  |  DETERGENTE  |  DESINFECTANTE  |  ACCIONES CORRECTIVAS  |  OBSERVACIONES
Pregunta                          1    |      ✓        |       ✓         |                        |
Pregunta                          2    |      ✓        |       ✗         |   Limpiar filtro      |
Pregunta                          3    |      ✗        |       ✓         |   Reponer jabón       |
Firma                            ...
```

En el segundo caso las filas representan **registros**, no definiciones de campo. Los campos son únicamente los encabezados.

## Filosofía

El motor ya no clasifica palabras. El motor ya no clasifica únicamente campos. A partir de este Sprint el motor clasifica **primero la arquitectura documental**.

La secuencia oficial es ahora:

```
Documento
  ↓
Parser (documentParser.js)
  ↓
Document Layout Detector       ← Sprint 84 (NUEVO)
  ↓
Business Knowledge Engine      ← Sprint 83
  ↓
Visual Builder (FormBuilder.jsx)
  ↓
Administrador revisa
  ↓
Guardar (persistencia existente)
```

---

## Los 3 layouts oficiales certificados

### TYPE_A — Vertical Form

Formulario tradicional. Sin cambios respecto a Sprint 83.

```
Nombre
Cargo
Temperatura
Observaciones
Firma
```

### TYPE_B — Operational Table

Documento basado en columnas y múltiples filas repetitivas.

```
DÍA  |  DETERGENTE  |  DESINFECTANTE  |  LIMPIEZA  |  ACCIONES CORRECTIVAS  |  OBSERVACIONES
1    |      ✓       |       ✓         |     ✓      |                        |
2    |      ✓       |       ✗         |     ✓      |  Limpiar filtro        |
3    |      ✗       |       ✓         |     ✓      |  Reponer jabón         |
...
31
```

Las filas representan registros. Los encabezados representan campos.

### TYPE_C — Inspection Checklist

Lista continua de elementos inspeccionables. Ya manejado por Sprint 83 (`detectInspectionBlocks`).

```
Puertas
Paredes
Techo
Luminarias
Lavamanos
```

Cada elemento se convierte automáticamente en `Cumple / No Cumple`.

---

## Las 10 reglas oficiales para TYPE_B

### Regla 1 — Detectar tablas operacionales

Indicadores:
- Primera fila con encabezados
- Muchas filas repetitivas (≥ 8)
- Numeración secuencial en primera columna (1–31)
- O: valores de día/mes en primera columna

→ Clasificar como `TYPE_B`

### Regla 2 — Nunca convertir filas en campos

Las filas representan registros, nunca definición del formulario. Solo los encabezados se procesan como candidatos a campo.

### Regla 3 — Ignorar columnas Runtime

Nunca generar campo para:

```
Día, Mes, Año, Fecha, Hora
```

Estos campos ya existen dentro del Runtime.

### Regla 4 — Fusionar encabezados multinivel

Cuando la primera fila de datos contiene sub-encabezados (texto largo, sin números), se fusionan:

```
DESINFECTANTE              LIMPIEZA
Amonio Cuaternario 200 PPM   Jabón Neutro
```

Resultado:
```
Desinfectante - Amonio Cuaternario 200 PPM
Limpieza - Jabón Neutro
```

No se crean dos campos.

### Regla 5 — Elementos operacionales

Todo encabezado que represente un elemento físico o actividad operacional → `Cumple / No Cumple` (boolean).

```
Detergente    →  Cumple / No Cumple
Desinfectante →  Cumple / No Cumple
Limpieza      →  Cumple / No Cumple
Puerta ingreso → Cumple / No Cumple
Maquinaria    →  Cumple / No Cumple
```

La detección se aplica a columnas que:
- No están clasificadas por `TYPE_RULES` (número, textarea, select, signature)
- No son metadatos (Runtime, Business Role, Document Metadata)
- No son numéricas por muestras

### Regla 6 — Campos especiales

Siempre:

```
Acciones Correctivas  →  textarea
Observaciones         →  textarea
```

Si el documento no los incluye como encabezados, se agregan automáticamente.

### Regla 7 — Firma única

Al finalizar cualquier documento tipo tabla:

```
Verifica  →  signature
```

Nunca generar múltiples firmas.

### Regla 8 — Orden documental

Mantener exactamente el orden original de los encabezados. Únicamente mover la firma al final.

### Regla 9 — Compatibilidad

Estas reglas funcionan para cualquier formato (Excel, PDF, Word, CSV, exportaciones ERP, reportes tabulares) sin crear lógica específica por formato.

### Regla 10 — Validación humana

El resultado nunca se guarda automáticamente. Siempre se envía al Visual Builder existente para revisión del administrador.

---

## Cambios en el código

### Archivo modificado: `src/services/import/structureDetector.js`

| Cambio | Líneas | Descripción |
|--------|--------|-------------|
| `detectLayout()` | 169–201 | Nueva función que clasifica el documento como TYPE_A / TYPE_B / TYPE_C usando secuencias numéricas, patrones de día/mes y conteo de filas |
| `mergeMultiLevelHeaders()` | 203–224 | Nueva función que detecta sub-encabezados en la primera fila de datos y los fusiona con el encabezado padre |
| `markOperationalColumns()` | 226–250 | Nueva función que marca como boolean toda columna TYPE_B no clasificada por reglas existentes ni excluible |
| `detectStructure()` | 371–505 | Flujo reorganizado: layout detection → multi-level merge (TYPE_B) → processing → operational columns (TYPE_B) → special fields (TYPE_B) |

### Flujo completo de `detectStructure` (Sprint 84)

```
rawModel
  ↓
detectLayout()                    ← Sprint 84: TYPE_A / TYPE_B / TYPE_C
  ↓
TYPE_B? → mergeMultiLevelHeaders()  ← Sprint 84: fusionar sub-encabezados
  ↓
buildColumnDefs()                 ← fusiona pares C/NC, Sí/No
  ↓
detectInspectionBlocks()          ← 5+ cortas consecutivas → boolean
  ↓
TYPE_B? → markOperationalColumns() ← Sprint 84: columnas no clasificadas → boolean
  ↓
for each colDef:
  isStandaloneNumber()?           → skip
  isDocumentMetadata()?           → skip
  isRuntimeMetadata()?            → skip
  isBusinessRole()?               → skip
  classify type                   → TYPE_RULES / sample values
  ↓
TYPE_B?                           → agregar Acciones Correctivas + Observaciones si no existen
  ↓
no TYPE_B?                        → 3+ boolean consecutivos → insertar Observaciones
  ↓
Signature collapse                → eliminar todas, agregar una "Verifica"
  ↓
Asignar required por tipo         → solo textarea=false
  ↓
Asignar orderIndex                → 1..N
  ↓
Return { layoutType, fields, ... }
```

---

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Detectar automáticamente formularios verticales (TYPE_A) | ✅ `detectLayout()` → fallback por defecto |
| 2 | Detectar automáticamente tablas operacionales (TYPE_B) | ✅ `detectLayout()` → secuencias numéricas + día/mes + filas ≥ 8 |
| 3 | Detectar automáticamente listas de inspección (TYPE_C) | ✅ `detectLayout()` → etiquetas cortas + líneas cortas |
| 4 | Ignorar filas en documentos tabulares | ✅ Solo `effectiveHeaders` se usan como definición de campos |
| 5 | Procesar únicamente encabezados como definición del formulario | ✅ `buildColumnDefs(effectiveHeaders)`, filas ignoradas |
| 6 | Fusionar encabezados multinivel | ✅ `mergeMultiLevelHeaders()` → texto largo sin números en primera fila de datos |
| 7 | Convertir elementos operacionales en "Cumple / No Cumple" | ✅ `markOperationalColumns()` → columnas no clasificadas → boolean |
| 8 | Ignorar campos administrados por el Runtime | ✅ `isRuntimeMetadata()` (Día, Mes, Fecha, Hora) |
| 9 | Mantener una única firma "Verifica" al final | ✅ Signature collapse + push al final |
| 10 | Mantener el orden documental original | ✅ Orden de columnDefs mantenido, signature al final |
| 11 | No crear nuevos componentes | ✅ 0 archivos nuevos |
| 12 | No modificar Runtime, Dynamic Forms, Builder ni Persistencia | ✅ Solo `structureDetector.js` |
| 13 | Reutilizar completamente la arquitectura certificada hasta Sprint 83 | ✅ 100% de las reglas Sprint 83 preservadas |
| 14 | Compatible con Excel, PDF, Word, CSV y exportaciones tabulares | ✅ Parser-agnóstico, funciona sobre `rawHeaders` + `rows` |
| 15 | Mantener validación humana mediante el Visual Builder antes de guardar | ✅ Mismo flujo de importación, administrador revisa antes de persistir |
