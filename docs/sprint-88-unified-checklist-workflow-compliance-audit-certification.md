# Sprint 88 — Unified Checklist Workflow & Compliance Audit Certification

**Tipo:** Runtime Workflow Certification & Compliance Audit Architecture
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 87 — Checklist Runtime & Compliance Workflow Certification
**Branch:** `operativo-v1`
**Build:** 0 errores, 2701 módulos, 2.19s

---

## Objetivo

Certificar oficialmente el Checklist como un **Workflow Operacional reutilizable del campo `boolean`**, eliminando cualquier implementación paralela (`checklist_compliance`) y garantizando su correcto funcionamiento en:

- Importación documental
- Form Builder
- Dynamic Form Runtime
- Persistencia
- Dynamic Records View
- Exportaciones
- Dashboard / Compliance Summary

## Problema Arquitectónico Eliminado

La implementación Sprint 87 poseía dos tipos de Checklist paralelos:

| Tipo | Propósito | Problema |
|------|-----------|----------|
| `boolean` | Checkbox Sí/No | Sin soporte de compliance |
| `checklist_compliance` | Radio + comentario | Duplicado arquitectónico |

Esto violaba: **REUSE FIRST**, **ZERO PARALLEL FIELD TYPES**, **RUNTIME FIRST**.

## Solución

El Checklist deja de ser un tipo de campo. Pasa a ser un **Workflow Operacional** del campo `boolean` existente, activado mediante `options.choices`:

```json
{
  "field_type": "boolean",
  "options": {
    "choices": ["Cumple", "No cumple"],
    "requiresCommentOnFailure": true,
    "commentPrompt": "Explique la no conformidad"
  }
}
```

### Comportamiento unificado

| `boolean` sin `options.choices` | `boolean` con `options.choices` |
|--------------------------------|----------------------------------|
| Checkbox simple | Radio group (Cumple/No cumple) |
| Valores: `true` / `false` | Valores: `'Cumple'` / `'No cumple'` |
| Persistencia: `value_boolean` | Persistencia: `value_json` = `{ value, comment? }` |
| Sin comentario | Comentario obligatorio en No cumple |

## Eliminaciones certificadas

Se eliminó completamente `checklist_compliance` de:

- **builderAdapter.js** — El mapeo `boolean`→`checklist_compliance` desaparece. El `boolean` con compliance options pasa limpio como `boolean`.
- **FormBuilder.jsx** — Opción `checklist_compliance` eliminada del dropdown. Ahora `boolean` tiene toggle opcional "Habilitar workflow de compliance".
- **BaseGeneric.jsx** — Caso `checklist_compliance` eliminado. Unificado en `boolean` con bifurcación por `options.choices`.
- **BaseChecklist.jsx** — Ídem.
- **BaseMediciones.jsx** — Ídem.
- **DynamicForm.jsx** — Toda referencia a `checklist_compliance` reemplazada por `boolean` + `options.choices`.

## Cambios por archivo

### `src/services/import/builderAdapter.js` (37 → 28 líneas)

| Antes | Después |
|-------|---------|
| `allowedTypes` incluía `checklist_compliance` | Solo tipos estándar |
| `boolean`+compliance → mapeado a `checklist_compliance` | `boolean` pasa limpio con sus `options` |

### `src/components/FormBuilder.jsx` (626 líneas)

| Cambio | Detalle |
|--------|---------|
| Estado `optComplianceEnabled` / `editOptComplianceEnabled` | Nuevo toggle booleano |
| Dropdown tipo: eliminado `checklist_compliance` | Solo `boolean` con label "Checklist (Cumple/No Cumple)" |
| Condicional `boolean`: checkbox compliance + commentPrompt input | Reemplaza al antiguo condicional `checklist_compliance` |
| Guardado: `boolean` + compliance activo → `options.choices`, `requiresCommentOnFailure`, `commentPrompt` | Contrato unificado |
| Display en lista: "Checklist Compliance" cuando `requiresCommentOnFailure === true` | Label dinámico |

### `src/components/engines/BaseGeneric.jsx` (139 → 134 líneas)

| Antes | Después |
|-------|---------|
| Caso `'boolean'`: checkbox con label "Cumple / Sí" | `isCompliance = field.options?.choices?.length > 0` |
| Caso `'checklist_compliance'`: radio + comentario | Si compliance → radio + comentario; si no → checkbox con label "Sí / No" |

### `src/components/engines/BaseChecklist.jsx` (123 → 119 líneas)

| Antes | Después |
|-------|---------|
| `field_type === 'boolean'`: radio true/false | `isCompliance` check → radio 'Cumple'/'No cumple' + comentario, o radio true/false legacy |
| `field_type === 'checklist_compliance'`: radio + comentario | Eliminado |
| Highlight rojo: solo `values[field.id] === false` | También `=== 'No cumple'` |

### `src/components/engines/BaseMediciones.jsx` (163 → 155 líneas)

| Antes | Después |
|-------|---------|
| `field_type === 'checklist_compliance'`: radio + comentario | `field_type === 'boolean'` con `options.choices` → radio + comentario |

### `src/pages/DynamicForm.jsx` (236 → 231 líneas)

| Cambio | Detalle |
|--------|---------|
| Inicialización: `boolean`+compliance → `''`, `boolean` simple → `false` | Antes: `checklist_compliance` → `''` |
| EvidenceRequired: también detecta `'No cumple'` | Antes: solo `=== false` |
| Validación pre-submit: `boolean`+compliance en lugar de `checklist_compliance` | Misma lógica, tipo unificado |
| Persistencia: `boolean`+compliance → `{ value, comment }` en `value_json` | Antes: `checklist_compliance` |

### `src/components/DynamicRecordsView.jsx` (664 líneas)

| Cambio | Detalle |
|--------|---------|
| `loadRecords`: detección de incumplimiento vía `value_boolean === false` **o** `value_json.value === 'No cumple'` | Compatible con ambos formatos |
| Modal display: si `value_json` existe, muestra `value_json.value` + `value_json.comment` | Antes: solo `value_boolean ? 'Sí / Cumple' : 'No / No Cumple'` |
| Color rojo: también para `value_json.value === 'No cumple'` | Consistencia visual |

### `src/shared/utils/exportDataNormalizer.js` (218 líneas)

| Cambio | Detalle |
|--------|---------|
| `normalizeValue`: si `value` es objeto con `.value`, formatea compliance + comentario | "No cumple - Se encontró suciedad." |
| Raw extraction: `boolean`+`options.choices` → usa `val.value_json` | Antes: solo `val.value_boolean` |

### `src/modules/dashboard/utils/dashboardCalculations.js` (107 líneas)

| Cambio | Detalle |
|--------|---------|
| `isResponseCritical`: añadida detección de `value_boolean === false` y `value_json.value === 'No cumple'` | Antes: solo números fuera de rango |

### `src/services/import/structureDetector.js`

**Sin cambios.** `standardizeChecklistFields()` ya produce `boolean` con `options.choices`, `requiresCommentOnFailure`, `commentPrompt` — el contrato unificado.

## Compliance Workflow oficial

```
boolean field
  │
  ├── sin options.choices
  │     └── checkbox: Sí / No
  │
  └── con options.choices
        │
        ├── Cumple
        │     └── Guardar: { "value": "Cumple" }
        │
        └── No cumple
              ├── Mostrar comentario obligatorio
              └── Guardar: { "value": "No cumple", "comment": "..." }
```

## Persistencia oficial

### Cumple

```json
{
  "field_id": { "value": "Cumple" }
}
```

→ Almacenado en `sgc_response_values.value_json`

### No cumple (con comentario)

```json
{
  "field_id": {
    "value": "No cumple",
    "comment": "Se encontró suciedad en la superficie"
  }
}
```

→ Almacenado en `sgc_response_values.value_json`

## Principios arquitectónicos

| Principio | Aplicación |
|-----------|-----------|
| **REUSE FIRST** | Se reutiliza `boolean` — 0 tipos nuevos |
| **ZERO NEW FIELD TYPES** | `checklist_compliance` eliminado del sistema |
| **ZERO NEW COMPONENTS** | 0 componentes nuevos creados |
| **ZERO NEW TABLES** | Persistencia reutilizada (`sgc_response_values.value_json`) |
| **COMPLIANCE FIRST** | El boolean soporta auditoría completa |
| **RUNTIME FIRST** | Un único workflow operacional en 3 engines |
| **HUMAN VALIDATION FIRST** | Validación preservada y unificada |
| **BUSINESS KNOWLEDGE FIRST** | Compliance operacional certificado end-to-end |

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | `checklist_compliance` eliminado de builderAdapter | ✅ Mapeo eliminado |
| 2 | `checklist_compliance` eliminado de FormBuilder | ✅ Dropdown + handlers eliminados |
| 3 | `checklist_compliance` eliminado de los 3 engines | ✅ Unificado en `boolean` |
| 4 | `checklist_compliance` eliminado de DynamicForm | ✅ Reemplazado por `boolean`+compliance |
| 5 | Boolean sin compliance funciona como checkbox | ✅ Preservado en los 3 engines |
| 6 | Boolean con compliance renderiza radio + comentario | ✅ Unificado en los 3 engines |
| 7 | DynamicRecordsView muestra compliance desde `value_json` | ✅ value + comment visibles |
| 8 | Exportaciones incluyen compliance + comentario | ✅ "No cumple - comentario" |
| 9 | Dashboard detecta incumplimientos boolean | ✅ `isResponseCritical` actualizado |
| 10 | Build 0 errores | ✅ 2701 módulos |
