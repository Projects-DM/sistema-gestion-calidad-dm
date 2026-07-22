# Sprint 85 — Document Section Intelligence & Checklist Compliance Engine

**Tipo:** Business Knowledge Evolution & Dynamic Forms Compliance Workflow
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 84 — Document Layout Intelligence Engine
**Branch:** `operativo-v1`
**Build:** 0 errores, 2701 módulos, 2.60s

---

## Objetivo

Certificar el primer motor oficial de análisis por **secciones documentales** del SGC-DM y evolucionar el comportamiento del campo Checklist (Cumple / No cumple), permitiendo:

- Interpretar documentos complejos por bloques operacionales en lugar de campos aislados.
- Clasificar correctamente el tipo de dato de cada sección.
- Estandarizar el comportamiento oficial del Checklist a **Cumple** / **No cumple**.
- Capturar evidencia obligatoria de no conformidad.
- Reutilizar completamente el Runtime, Dynamic Forms Builder y persistencia existente.

## Problema identificado

Sprint 84 demostró que un documento puede contener **múltiples estructuras documentales simultáneamente**:

```
FORMATO PREOPERATIVO
  ↓
  Metadatos documentales    ← FO-001, Versión, Página
  ↓
  Filtros sanitarios         ← Checklist
  Medición de cloro          ← Medición
  Medición de pH             ← Medición
  Checklist operacional      ← Checklist
  Observaciones              ← Texto libre
  Firma                      ← Signature
```

Un documento **no posee un único layout**. La verdadera unidad arquitectónica de análisis es la **sección operacional**.

## Nueva arquitectura

```
Documento
  ↓
Document Parser
  ↓
Document Section Detector      ← Sprint 85 (NUEVO)
  ↓
Section Classification Engine  ← Sprint 85 (NUEVO)
  ↓
  Metadata Section   → ignorado (nunca campos)
  Runtime Section    → ignorado (gestionado por Runtime)
  Checklist Section  → boolean (Cumple / No cumple)
  Measurement Section → number
  Operational Section → text / textarea / select
  Signature Section  → signature (Verifica)
  ↓
Business Knowledge Engine      ← Sprint 83
  ↓
Dynamic Form Contract
  ↓
Visual Builder
  ↓
Administrador revisa
  ↓
Persistencia existente
```

No cambia Runtime, Builder ni persistencia. Solo se inserta una capa de organización seccional.

---

## Secciones oficiales certificadas

### Metadata Section

Nunca se convierte en campos. Ejemplos:

```
FO-001
Página 1 de 1
Versión 2
Código
Registro documental
```

### Runtime Section

Nunca se convierte en campos. Ejemplos:

```
Fecha
Hora
Mes
Año
Usuario
Responsable del diligenciamiento
```

### Checklist Section

Sección utilizada para ítems de verificación:

```
Puertas          → Cumple / No cumple
Techo            → Cumple / No cumple
Maquinaria       → Cumple / No cumple
Área de ingreso  → Cumple / No cumple
Lavabotas        → Cumple / No cumple
Canecas          → Cumple / No cumple
Luminarias       → Cumple / No cumple
```

### Measurement Section

Sección utilizada para lecturas numéricas:

```
Temperatura   → number
pH            → number
PPM           → number
Peso          → number
Concentración → number
```

### Operational Section

Sección para campos de texto libre, descripciones, selecciones:

```
Limpieza     → text
Desinfección → text
Proveedor    → select
Descripción  → textarea
Observaciones → textarea
```

### Signature Section

```
Verifica → signature
```

---

## Checklist Compliance Engine

A partir de Sprint 85 el comportamiento oficial del checklist:

| Opción | Acción |
|--------|--------|
| **Cumple** | Guardar sin información adicional |
| **No cumple** | Mostrar comentario obligatorio: *"Explique la no conformidad"* |

### Workflow oficial

```
Usuario
  ↓
Cumple?  →  Guardar (sin comentario)
No cumple? →  Mostrar campo de comentario obligatorio
                ↓
              Usuario explica no conformidad
                ↓
              Guardar con comentario asociado
```

### Normalización de pares

Todos los pares detectados se normalizan a **Cumple / No Cumple**:

| Original | Normalizado |
|----------|-------------|
| C / NC | Cumple / No Cumple |
| Sí / No | Cumple / No Cumple |
| Conforme / No Conforme | Cumple / No Cumple |
| Cumple / No Cumple | Cumple / No Cumple |

### Reglas del Checklist

**Regla 1** — El comentario solamente aparece cuando existe un incumplimiento.

**Regla 2** — El comentario es obligatorio.

**Regla 3** — La observación pertenece al checklist que la originó (no es una observación global del formulario).

**Regla 4** — La persistencia se mantiene dentro del contrato actual del Runtime. No se crean tablas nuevas.

**Regla 5** — Los checklist continúan siendo reutilizables dentro del Dynamic Forms Builder.

---

## Filosofía aplicada

| Principio | Aplicación |
|-----------|------------|
| REUSE FIRST | 0 componentes nuevos |
| BUSINESS KNOWLEDGE FIRST | El motor entiende secciones, no palabras |
| SECTION BASED ANALYSIS | Cada bloque se clasifica por su contexto |
| HUMAN VALIDATION FIRST | Administrador revisa antes de guardar |
| ZERO NEW RUNTIME | Sin cambios en el motor de ejecución |
| ZERO NEW PERSISTENCE | Sin nuevas tablas ni contratos |
| ZERO PARALLEL BUILDERS | Único Builder certificado |

---

## Cambios en el código

### Archivo modificado: `src/services/import/structureDetector.js` (530 → 571 líneas)

| Cambio | Líneas | Descripción |
|--------|--------|-------------|
| `CHECKLIST_PAIRS` | 50–56 | Todos los `outputLabel` normalizados a `'Cumple / No Cumple'` (Sí/No, C/NC, Conforme/No Conforme → Cumple/No Cumple) |
| `classifyFieldSection()` | 391–396 | Nueva función que asigna un tipo de sección a cada campo según su `fieldType` (boolean → checklist, number → measurement, signature → signature, resto → operational) |
| `detectSectionsFromFields()` | 398–416 | Nueva función que recorre los campos en orden y agrupa los consecutivos con el mismo tipo de sección, asignando `field.section` a cada campo |
| `standardizeChecklistFields()` | 418–427 | Nueva función que añade metadatos de compliance a todo campo boolean: opciones `['Cumple', 'No cumple']`, flag `enforceCommentOnFalse`, y `commentPrompt` |
| `detectStructure()` | 567–570 | Integración: `detectSectionsFromFields()` + `standardizeChecklistFields()` ejecutados antes del return. `sections` agregado al valor de retorno |

### Flujo completo de `detectStructure` (Spring 85)

```
rawModel
  ↓
detectLayout()                       ← Sprint 84: TYPE_A / TYPE_B / TYPE_C
  ↓
skipTitleRow()                       ← Sprint 84: remover fila título (TYPE_B)
  ↓
mergeMultiLevelHeaders()             ← Sprint 84: fusionar encabezados multinivel (TYPE_B)
  ↓
buildColumnDefs()                    ← fusiona pares C/NC, Sí/No → Cumple/No Cumple
  ↓
detectInspectionBlocks()             ← 5+ cortas consecutivas → boolean
  ↓
markOperationalColumns()             ← Sprint 84: TYPE_B no clasificadas → boolean
  ↓
for each colDef:
  Exclusión (metadatos, runtime, roles)
  Clasificación por TYPE_RULES / sample values
  ↓
TYPE_B? → agregar Acciones Correctivas + Observaciones
  ↓
Signature collapse → única "Verifica" al final
  ↓
Required por tipo, OrderIndex
  ↓
detectSectionsFromFields()           ← Sprint 85 (NUEVO): agrupar campos en secciones
  ↓
standardizeChecklistFields()         ← Sprint 85 (NUEVO): Cumple/No Cumple + compliance
  ↓
Return { fields, sections, layoutType, ... }
```

---

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Document Section Intelligence Engine certificado | ✅ `detectSectionsFromFields()` agrupa campos por tipo de sección |
| 2 | Análisis documental por secciones operacionales | ✅ Cada campo recibe `section` (checklist, measurement, operational, signature) |
| 3 | Checklist Compliance Engine certificado | ✅ `standardizeChecklistFields()` añade compliance metadata |
| 4 | Cumple / No cumple oficializado | ✅ Todos los `CHECKLIST_PAIRS` normalizados + `options.options = ['Cumple', 'No cumple']` |
| 5 | Comentario obligatorio por incumplimiento | ✅ `enforceCommentOnFalse: true`, `commentPrompt: 'Explique la no conformidad'` |
| 6 | Persistencia reutilizada | ✅ Sin nuevas tablas ni contratos |
| 7 | Runtime reutilizado | ✅ Sin cambios en Runtime |
| 8 | Visual Builder reutilizado | ✅ Sin cambios en Builder |
| 9 | Signature única preservada | ✅ Sprint 83: signature collapse preservado |
| 10 | Validación humana preservada | ✅ Mismo flujo de importación con revisión del administrador |
| 11 | Arquitectura actual preservada | ✅ 0 nuevas dependencias, 0 refactors arquitectónicos |
| 12 | Cero componentes paralelos | ✅ 0 archivos nuevos |
| 13 | Cero nuevas tablas | ✅ Sin cambios en base de datos |
