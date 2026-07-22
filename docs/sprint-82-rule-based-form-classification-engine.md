# Sprint 82 — Rule-Based Form Classification Engine Certification

**Tipo:** Business Rules Engine & Import Assistant Intelligence
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 81 — Dynamic Forms Visual Builder V2
**Branch:** `operativo-v1`
**Build:** 0 errores, 2701 módulos, 2.31s

---

## Objetivo

Certificar el primer motor oficial de clasificación de formularios del SGC-DM, permitiendo que cualquier archivo importado (Excel, PDF, Word o texto estructurado) sea interpretado mediante reglas de negocio y transformado directamente en un formulario Dynamic Forms reutilizando completamente la infraestructura existente.

Este sprint NO crea un nuevo constructor, NO modifica el Runtime y NO introduce una arquitectura paralela. Su única responsabilidad es mejorar la inteligencia del proceso de importación.

## Filosofía Aplicada

- **REUSE FIRST** — 0 archivos nuevos, 1 archivo modificado
- **Rule-Based Classification** — Sin IA, sin OCR, sin pipelines
- **Zero New Runtime** — Runtime no se toca
- **Zero Parallel Builder** — Solo el Visual Builder de Sprint 81
- **Business Knowledge First** — 60 reglas de negocio codificadas
- **Human Validation Before Save** — El administrador siempre revisa antes de persistir

## Arquitectura

```
Archivo
  ↓
Parser existente (documentParser.js)
  ↓
Rule-Based Form Classification Engine   ← Sprint 82
  ↓
Dynamic Forms Contract
  ↓
Visual Builder existente (FormBuilder.jsx)
  ↓
Validación humana
  ↓
Guardar (persistencia existente)
```

El Rule-Based Form Classification Engine es únicamente una capa de decisión. No persiste datos, no modifica contratos, no accede directamente a Supabase.

---

## Cambios realizados

### Archivo modificado: `src/services/import/structureDetector.js`

Reescrito completo para implementar el motor de clasificación basado en reglas.

### Nuevas estructuras de datos

| Estructura | Descripción |
|------------|-------------|
| `CHECKLIST_PAIRS` | 5 patrones de pares adyacentes (C/NC, Sí/No, Cumple/No Cumple, Conforme/No Conforme) que se fusionan en un único campo boolean |
| `DOCUMENT_METADATA` | 12 términos para excluir metadatos documentales (página, vigencia, manual, procedimiento, nombre del formato, encabezados, etc.) |
| `RUNTIME_METADATA` | 22 términos para excluir campos del Runtime (fecha, hora, día, mes, año, usuario, creado por, código, folio, versión, registro, etc.) |
| `OPTIONAL_EXCEPTIONS` | 5 términos que permanecen como `required: false` (observaciones, acción correctiva, comentarios, hallazgos, recomendaciones) |
| `TYPE_RULES` | 60 reglas de clasificación con prioridad numérica, organizadas por tipo: boolean, signature, number, textarea, select |

### Nuevas funciones

| Función | Línea | Propósito |
|---------|-------|-----------|
| `buildColumnDefs(rawHeaders)` | — | Analiza encabezados, detecta pares adyacentes C/NC y los fusiona en una sola definición de columna |
| `isDocumentMetadata(label)` | — | Excluye metadatos documentales + códigos FO-XXX, PR-XXX, etc. |
| `isRuntimeMetadata(label)` | — | Excluye campos administrados por el Runtime |
| `isOptionalField(label)` | — | Determina si un campo debe ser opcional (false) vs obligatorio (true) |

### Mejoras en la clasificación (TYPE_RULES)

**Boolean / Checklist (9 reglas):**
- C/NC → `boolean` (prioridad 95)
- Sí/No → `boolean` (prioridad 90)
- Cumple/No Cumple → `boolean` (prioridad 90)
- Conforme/No Conforme → `boolean` (prioridad 90)
- Aprobado/Rechazado → `boolean` (prioridad 85)
- Verdadero/Falso → `boolean` (prioridad 85)
- Autorizado/No Autorizado → `boolean` (prioridad 80)
- Aplica/No Aplica → `boolean` (prioridad 75)
- CU, NC individuales → `boolean` (prioridad 70)

**Signature (6 reglas):**
| Regla | Prioridad |
|-------|-----------|
| Firma, Firmar, Rúbrica | 90 |
| Verifica, Verificación | 85 |
| Revisó, Revisa, Revisión | 80 |
| Aprobó, Aprueba, Aprobación | 80 |
| Autoriza, Autorización | 75 |
| Responsable, Elaboró | 70 |

**Cargo** explícitamente excluido de signature → clasifica como `text`.

**Number (18 reglas):**
Temperatura, hipoclorito, ppm, concentración, cantidad, nº, total, peso/kg/gramos, litros/ml/m3, ph, porcentaje/%, medida/medición, dimensión, tolerancia, límite, rango, resultado, valor, importe/monto/precio/costo.

**Textarea (9 reglas):**
Acción correctiva, hallazgos, recomendaciones, observaciones, comentarios, descripción, detalle, notas, texto largo.

**Select (20 reglas):**
Tipo, categoría, opción, seleccionar, estado, lista/dropdown, motivo, área, departamento, turno, proceso, producto, proveedor, cliente, ubicación, zona, color, modelo, marca.

---

## Flujo del motor

```
rawHeaders (ej: ["Área", "C", "NC", "Acción Correctiva"])
  ↓
buildColumnDefs()
  ├── ["Área"]               → { label: "Área", sourceIndices: [0] }
  ├── ["C", "NC"]             → { label: "Cumple / No Cumple", sourceIndices: [1,2], forceType: "boolean", isChecklist: true }
  └── ["Acción Correctiva"]   → { label: "Acción Correctiva", sourceIndices: [3] }
  ↓
for each colDef:
  isDocumentMetadata()?       → skip (ej: "Página", "FO-001")
  isRuntimeMetadata()?        → skip (ej: "Fecha", "Usuario")
  seenLabels?                 → skip duplicados
  detectFieldType()           → TYPE_RULES (60 reglas con prioridad)
  isOptionalField()?          → required=false / required=true
  ↓
hasChecklist?                 → auto-genera "Observaciones" (textarea, opcional)
  ↓
Mover signature → final       → firma siempre último campo
  ↓
Asignar orderIndex            → secuencia 1..N
```

---

## Criterios de certificación

| # | Criterio | Estado | Detalle |
|---|----------|--------|---------|
| 1 | Clasificación basada en estructura documental | ✅ | `buildColumnDefs()` analiza pares adyacentes de encabezados y los fusiona |
| 2 | Exclusión de metadatos documentales | ✅ | `DOCUMENT_METADATA` + regex FO-XXX, PR-XXX |
| 3 | Exclusión de campos del Runtime | ✅ | `RUNTIME_METADATA` con 22 términos, incluye `registro` |
| 4 | C/NC, Sí/No → único Checklist | ✅ | `CHECKLIST_PAIRS` con 5 patrones, fusionados en un solo boolean |
| 5 | Observaciones automáticas tras checklist | ✅ | Generación automática si existen campos boolean |
| 6 | Firma única al final del formulario | ✅ | `sigFields` se reubican siempre al final |
| 7 | Detección de campos numéricos | ✅ | 18 reglas number en TYPE_RULES |
| 8 | Detección de texto largo | ✅ | 9 reglas textarea, incluye acción correctiva, hallazgos, recomendaciones |
| 9 | Detección de listas desplegables | ✅ | 20 reglas select en TYPE_RULES |
| 10 | Opciones persistidas con comas | ✅ | `choices` como array, serialización limpia en builderAdapter |
| 11 | Campos obligatorios por defecto | ✅ | `OPTIONAL_EXCEPTIONS` define las 5 únicas excepciones |
| 12 | Conservación del orden + firma al final | ✅ | orden detection → firma se mueve al final |
| 13 | Compatibilidad multiformato | ✅ | Reglas independientes del tipo de archivo (XLSX, CSV, DOCX, PDF) |

---

## Reglas de negocio oficiales

```
Cargo         → text
Responsable   → signature
Verifica      → signature
Revisó        → signature
Aprobó        → signature
Firma         → signature
Observaciones → textarea (opcional)
Hallazgos     → textarea (opcional)
C/NC          → boolean fusionado (Cumple / No Cumple)
Sí/No         → boolean fusionado (Sí / No)
Temperatura   → number
PPM           → number
```

---

## UX: Auto-scroll + Auto-focus (hardening Sprint 81)

Además de la clasificación, se mejoró la experiencia del Visual Builder en `src/components/FormBuilder.jsx`:

- **`useRef`** (`editFormRef`) anclado al formulario de edición
- **`useEffect`** que observa `editingFieldId`: `scrollIntoView({ behavior: 'smooth', block: 'center' })` + `focus()` en el primer input
- **Una sola interacción**: Editar → scroll automático → cursor listo para escribir

---

## Resumen de archivos

| Archivo | Cambio |
|---------|--------|
| `src/services/import/structureDetector.js` | Reescribir completo: 60 reglas, fusión de pares C/NC, exclusión de metadatos, signatures al final, required por defecto, Observaciones automáticas |
| `src/components/FormBuilder.jsx` | +3 líneas: `useRef`, `useEffect` para auto-scroll y auto-focus al editar campo |
