# Sprint 86 — Operational Document Pattern Recognition & Checklist Compliance Certification

**Tipo:** Operational Pattern Intelligence & Dynamic Forms Compliance Architecture
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 85 — Document Section Intelligence & Checklist Compliance Engine
**Branch:** `operativo-v1`
**Build:** 0 errores, 2701 módulos, 2.39s

---

## Objetivo

Certificar oficialmente el modelo arquitectónico mediante el cual el SGC-DM interpreta documentos operacionales del Sistema de Gestión de Calidad.

A partir de este Sprint el motor de importación deja de pensar en **campos individuales** y pasa a pensar en **patrones documentales operacionales**, permitiendo identificar correctamente la **intención de negocio** del formulario antes de clasificar sus campos.

Adicionalmente, se certifica el comportamiento oficial del campo **Checklist Compliance**, convirtiéndolo en el estándar de cumplimiento operacional de la plataforma.

## Problema Arquitectónico Identificado

Hasta Sprint 85 el motor realizaba:

```
Campo
  ↓
¿Qué tipo es?
  ↓
Text / Boolean / Number / Select / Textarea / Signature
```

Pero los documentos del SGC-DM no son conjuntos de campos aislados. Un documento operacional representa una **intención documental específica**:

```
Checklist Operacional
Checklist de saneamiento
Checklist de limpieza
Tabla operacional
Formato de mediciones
Formato mixto
Formato textual
```

La verdadera unidad arquitectónica de clasificación no es el campo individual sino el **patrón operacional del documento**.

## Nueva Filosofía Oficial

| Orden | Prioridad |
|-------|-----------|
| DOCUMENT FIRST | El documento completo se clasifica primero |
| PATTERN FIRST | Luego se identifica el patrón operacional |
| SECTION FIRST | Luego se detectan las secciones internas |
| FIELD FIRST | Finalmente se clasifican los campos individuales |

```
Documento
  ↓
Document Parser
  ↓
Operational Pattern Detector        ← Sprint 86 (NUEVO)
  ↓
Document Layout Detector            ← Sprint 84
  ↓
Document Section Detector           ← Sprint 85
  ↓
Business Knowledge Engine           ← Sprint 83
  ↓
Checklist First Philosophy          ← Sprint 86 (NUEVO)
  ↓
Dynamic Forms Contract
  ↓
Visual Builder
  ↓
Administrador valida
  ↓
Persistencia existente
```

---

## Operational Pattern Recognition Engine

Se certifican oficialmente 5 patrones documentales:

### PATTERN_A — Operational Checklist

Documento compuesto predominantemente por ítems de verificación.

```
Área ingreso     →  Checklist Compliance
Maquinaria       →  Checklist Compliance
Luminarias       →  Checklist Compliance
Techo            →  Checklist Compliance
Lavamanos        →  Checklist Compliance
Puertas          →  Checklist Compliance
Canecas          →  Checklist Compliance
```

Detectado cuando: `booleanRatio >= 0.5` o `layoutType === 'TYPE_C'`

### PATTERN_B — Operational Table

Documento tabular con columnas operacionales.

```
Día  |  Detergente  |  Desinfectante  |  Limpieza  |  Acciones correctivas  |  Observaciones
```

Detectado cuando: `layoutType === 'TYPE_B'`

### PATTERN_C — Measurement Form

Documento compuesto predominantemente por lecturas numéricas.

```
Temperatura  →  Number
pH           →  Number
PPM          →  Number
Peso         →  Number
Cantidad     →  Number
```

Detectado cuando: `numRatio >= 0.5`

### PATTERN_D — Textual Form

Documento compuesto predominantemente por campos de texto libre.

```
Descripción          →  Textarea
Hallazgos            →  Textarea
Recomendaciones      →  Textarea
Acciones tomadas     →  Textarea
```

Detectado cuando: `textareaRatio >= 0.5`

### PATTERN_E — Mixed Operational Form

Documento con múltiples patrones coexistiendo.

```
Checklist
  +  Measurements
  +  Textareas
  +  Signature
```

Detectado cuando: ningún otro patrón domina (>50%).

---

## Checklist First Philosophy

**Principio arquitectónico oficial:**

> Si el motor posee dudas razonables sobre la clasificación de un elemento operacional, deberá priorizar **Checklist Compliance** sobre **Text**.

### Orden oficial de clasificación

```
1. Measurement       (si hay evidencia numérica)
2. Checklist Compliance  (por defecto para elementos operacionales)
3. Textarea          (texto largo, observaciones)
4. Select            (opciones discretas)
5. Text              (solo si hay evidencia explícita de texto)
6. Signature         (al final del formulario)
```

### Regla de oro

```
Unknown Operational Element
  ↓
Checklist Compliance (no Text)
```

### Excepciones (nunca serán Checklist Compliance)

```
Temperatura, PPM, pH, Peso, Cantidad, Concentración
```

Estos permanecen como `number` (Measurement Section).

### Implementación

La función `applyChecklistFirst(fields)` recorre los campos clasificados como `text` (el fallback por defecto anterior) y los convierte a `boolean` cuando:
- La etiqueta tiene ≤ 40 caracteres
- No coincide con patrones de texto conocidos (nombre, dirección, lote, etc.)

---

## Checklist Compliance Certification

### Tipo oficial

```
checklist_compliance
```

Internamente reutiliza:
- **Select** (opciones: Cumple, No cumple)
- **Textarea condicional** (comentario obligatorio en No cumple)

No constituye un nuevo Runtime, nueva persistencia ni nuevo Builder.

### Workflow oficial

```
Usuario
  ↓
Selecciona:  [Cumple]  →  Guardar (sin comentario)
  ↓
Selecciona:  [No cumple]  →  Mostrar comentario obligatorio
                               ↓
                             Usuario explica la no conformidad
                               ↓
                             Guardar con comentario asociado
```

### Comportamiento oficial

| Estado | Acción |
|--------|--------|
| **Cumple** | No requiere comentario |
| **No cumple** | Comentario obligatorio asociado al campo |

---

## Builder Certification

El Dynamic Forms Builder ahora soporta 7 tipos de campo:

| Tipo | Opción en builder |
|------|-------------------|
| Text | Texto corto |
| Textarea | Texto largo (Observaciones) |
| Number | Número |
| Boolean | Casilla (Sí/No - Cumple/No Cumple) |
| **Checklist Compliance** | **Checklist Compliance (Cumple/No Cumple + Comentario)** |
| Select | Lista desplegable |
| Signature | Firma digital |

Al seleccionar `checklist_compliance`:

```
Etiqueta: [__________________]
Tipo: [Checklist Compliance ▼]
Texto del comentario por incumplimiento: [Explique la no conformidad]
```

El campo se guarda con:
- `field_type`: `'checklist_compliance'`
- `options.options`: `['Cumple', 'No cumple']`
- `options.enforceCommentOnFalse`: `true`
- `options.commentPrompt`: texto configurable

---

## Cambios en el código

### `src/services/import/structureDetector.js` (601 → 628 líneas)

| Cambio | Líneas | Descripción |
|--------|--------|-------------|
| `applyChecklistFirst()` | 391–402 | Nueva función: convierte campos `text` no clasificados a `boolean` (Checklist First Philosophy) |
| `detectOperationalPattern()` | 404–419 | Nueva función: clasifica el documento como PATTERN_A..E según composición de campos |
| Integración en `detectStructure()` | 550, 600 | `applyChecklistFirst()` ejecutado tras clasificación, `detectOperationalPattern()` antes del return |
| `pattern` en return | 602 | Añadido al objeto de retorno |

### `src/services/import/builderAdapter.js` (27 → 38 líneas)

| Cambio | Descripción |
|--------|-------------|
| `CHECKLIST_COMPLIANCE_TYPES` | Nueva constante con `['checklist_compliance']` |
| Mapa boolean → checklist_compliance | Si `fieldType === 'boolean'` y `options.enforceCommentOnFalse`, se mapea a `'checklist_compliance'` |
| `allowedTypes` actualizado | Incluye `...CHECKLIST_COMPLIANCE_TYPES` |

### `src/components/FormBuilder.jsx` (585 → 605 líneas)

| Cambio | Descripción |
|--------|-------------|
| Estado `optCommentPrompt` / `editOptCommentPrompt` | Nuevos estados para el prompt de comentario |
| Opción `checklist_compliance` en selects | Añadida a ambos selectores de tipo (editar y nuevo) |
| UI condicional para `checklist_compliance` | Input para configurar el texto del comentario |
| Lógica de guardado | `options.commentPrompt`, `options.options`, `options.enforceCommentOnFalse` configurados al guardar |
| Display label | Muestra "Checklist Compliance" en lugar del raw type |

---

## Flujo completo certificado (Sprint 86)

```
rawModel
  ↓
detectLayout()                          ← Sprint 84
  ↓
skipTitleRow() + mergeMultiLevelHeaders()  ← Sprint 84
  ↓
buildColumnDefs() + detectInspectionBlocks()  ← Sprint 83
  ↓
markOperationalColumns()               ← Sprint 84 (TYPE_B)
  ↓
Clasificación individual de campos      ← Sprint 83/84
  ↓
applyChecklistFirst()                   ← Sprint 86 (NUEVO): text → boolean
  ↓
TYPE_B? → Acciones Correctivas + Observaciones
  ↓
Signature collapse → única "Verifica"
  ↓
detectSectionsFromFields()              ← Sprint 85
  ↓
standardizeChecklistFields()            ← Sprint 85
  ↓
detectOperationalPattern()              ← Sprint 86 (NUEVO): PATTERN_A..E
  ↓
Return { fields, sections, pattern, layoutType }
```

---

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Operational Pattern Recognition Engine certificado | ✅ `detectOperationalPattern()`: 5 patrones oficiales (A–E) |
| 2 | Checklist First Philosophy certificada | ✅ `applyChecklistFirst()`: unknown text → boolean |
| 3 | Checklist Compliance Field certificado | ✅ `checklist_compliance` type con Cumple/No cumple + comentario |
| 4 | Dynamic Forms Builder soporta Checklist Compliance | ✅ Nuevo tipo en selects + UI de configuración |
| 5 | Comentario obligatorio por incumplimiento | ✅ `enforceCommentOnFalse: true`, `commentPrompt` configurable |
| 6 | Operational Pattern Detection certificada | ✅ PATTERN_A: checklist, B: tabla, C: medición, D: textual, E: mixto |
| 7 | Clasificación documental mejorada | ✅ Documento → Patrón → Sección → Campo |
| 8 | Reutilización total de la arquitectura existente | ✅ 0 nuevas dependencias |
| 9 | Cero nuevos componentes | ✅ 0 archivos nuevos |
| 10 | Cero nuevas tablas | ✅ `field_type TEXT NOT NULL` acepta cualquier valor |
| 11 | Cero modificaciones del Runtime | ✅ Sin cambios en Runtime |
| 12 | Compatible con Excel, PDF, Word y CSV | ✅ Funciona sobre el parser existente |
| 13 | Validación humana preservada | ✅ Administrador revisa antes de guardar |
| 14 | LEVEL 3 Certification | ✅ Build 0 errores, 2701 módulos en 2.39s |
