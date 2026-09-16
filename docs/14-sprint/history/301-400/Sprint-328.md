# Sprint 328 — Explicit Field Ordering · Controlled Metadata Extension

**Rama:** release/stable-sprint79
**Modo:** LEVEL 5 · IMPLEMENTATION · CONTROLLED METADATA EXTENSION
**Precedente:** Sprint 327 — Document Repository Media Capture (CERTIFIED)
**Dependencias:** Sprint 44.2B (UniversalOrderMotor) · contrato `sgc_form_fields.order_index` (preexistente)
**Suite:** `scripts/sprint-328-explicit-field-ordering-controlled-metadata-extension.mjs`
**Resultado:** **CERTIFIED** 101/101 checks (E01–E80 + casos A–O) · 4.3s · exit=0 · timebox OK
**Regresión histórica 296–327:** NO ejecutada (cambio controlado dirigido).
**Cambios src/ (2 autorizados):** `src/components/FormBuilder.jsx` · `src/order-motor/UniversalOrderMotor.js`
**Clasificación:** **CONTROLLED METADATA EXTENSION**

---

## 1. Objetivo

> La **posición** de un campo del Constructor Visual ya no es un efecto secundario del array de render:
> es una **propiedad de metadata explícita y persistente** (`order`, invariante `1..N` contiguo) que
> viaja dentro del contrato de campo existente, sin nuevo modelo, sin nueva tabla, sin nuevo servicio,
> sin nuevo tipo y sin reconstruir identidades.

**Logrado:** crear un campo permite elegir su posición (1..N+1), editar permite reordenar (1..N),
las flechas ↑/↓ convergen en la **misma** operación canónica que el orden explícito (`moveFieldToOrder`),
la normalización (`normalizeFieldOrder`) es idempotente y compatible con formularios legacy
(sin `order` → se deriva de `order_index` o posición), y la persistencia reutiliza el contrato
existente (`FormBuilderOrderAdapter` → `sgc_form_fields.order_index`).

## 2. Principio rector

**ONE FIELD IDENTITY · ONE EXPLICIT ORDER · ONE REORDER ENGINE · ONE METADATA CONTRACT.**

- `FIELD IDENTITY ≠ FIELD POSITION`: el `id` nunca cambia al reordenar.
- La operación de reordenar es **una**: `moveFieldToOrder(fields, fieldId, targetOrder)`.
  `moveUp`/`moveDown`/`reorder` son **delegados** (flecha ↑ = `order-1`, ↓ = `order+1`).
- La normalización es **idempotente** y **no muta** la entrada.
- El orden canónico es `order` (dominio builder); la columna física `order_index` se escribe
  únicamente en la **frontera de persistencia** (FormBuilderOrderAdapter).

## 3. Contrato

```js
{ id, label, type, required, order, options }
```

- `order ∈ {1..N}` contiguo (invariante).
- Legacy: `normalizeFieldOrder(fields)` deriva `order` de `field.order ?? field.order_index ?? posición`.
- Crear: rango válido `1..N+1`; fuera de rango → clamp a `N+1` (999 → N+1).
- Editar: rango válido `1..N`; fuera de rango → clamp a `N` (999 → N).
- Entradas inválidas (`0`, `-1`, `1.5`, `abc`): rechazadas en la UI o normalizadas controladamente
  (el motor deja la secuencia sin cambios).

## 4. Implementación

### 4.1 `src/order-motor/UniversalOrderMotor.js` — motor canónico (Sprint 44.2B + 328)

Nuevas exportaciones (todo converge en `moveFieldToOrder`):

- `toPositiveInt(s)` — entero estricto.
- `normalizeFieldOrder(sequence)` — derivación `order ?? order_index ?? idx+1` · **idempotente** · no muta.
- `moveFieldToOrder(sequence, fieldId, targetOrder)` — valida/clampa `targetOrder` a `1..N`,
  posiciona y reindexa a `1..N`; inválido o misma posición → sin cambios.
- `moveUp`/`moveDown`/`reorder` — **delegados** de la operación canónica (flechas = `order ∓ 1`).

El motor **nunca escribe `order_index`** ni reconstruye `id`.

### 4.2 `src/components/FormBuilder.jsx` — convergencia flechas/orden explícito

- `newField.order` / `editField.order`: inputs numéricos en Configuración (rango `1..N+1` crear,
  `1..N` editar) con validación estricta (`parseStrictPositiveInt`) y clamp.
- `handleAddField`: inserta `order_index` real, y si la posición solicitada no es la final usa
  `moveFieldToOrder` + `reorderFormFieldsOrder` (modo import: mismo motor en memoria).
- `handleUpdateField`: reordena con `moveFieldToOrder` + `reorderFormFieldsOrder` solo si el orden
  cambió (misma posición → idempotente); contenido vía `updateField` (contrato intacto).
- `handleMoveField(field, direction)`: **único** handler de flechas (↑/↓ = `order ∓ 1`) sobre
  `moveFieldToOrder` + persistencia vía adapter. Eliminados `handleMoveToDb` y el swap por índice.
- `orderedFields = useMemo(() => normalizeFieldOrder(fields))`: render **siempre** normalizado;
  la UI muestra `field.order` y deshabilita flechas en `order === 1` / `order === length`.
- `handleSaveImport`: `order_index: f.order ?? i + 1`.

## 5. Persistencia (contrato existente, NO tocado)

- `src/order-motor/adapters/FormBuilderOrderAdapter.js`: `reorderFormFieldsOrder({ formId, orderedIds })`
  traduce `orderedIds` (del motor) → `order_index` en `sgc_form_fields`. **Única** escritura de orden.
- `src/services/dynamicService.js`: `getFormFields` ordena por `order_index` (ascendente) → el
  runtime recibe los campos **ya en orden canónico**. `updateField` intacto.
- `src/pages/DynamicForm.jsx`: render en orden de llegada (sin re-ordenar).
- Runtime moderno (`LayoutRendererBase` sort por `orderIndex`): intacto.

## 6. Invariantes §20

| # | Invariante | Estado |
|---|------------|--------|
| 1 | `order` canónico 1..N contiguo | ✔ |
| 2 | `order_index` columna física (sin tabla nueva) | ✔ |
| 3 | 1 operación de reordenar (`moveFieldToOrder`) | ✔ |
| 4 | flechas ↑/↓ = `order ∓ 1` sobre el motor canónico | ✔ |
| 5 | `normalizeFieldOrder` idempotente | ✔ |
| 6 | identidad de campo nunca reconstruida | ✔ |
| 7 | tipos de campo intactos (text/textarea/number/boolean/select/signature) | ✔ |
| 8 | persistencia = adapter existente (`order_index`) | ✔ |
| 9 | runtime recibe orden canónico | ✔ |
| 10 | 0 tabla/servicio/entidad nueva | ✔ |
| 11 | 0 migración destructiva / backfill | ✔ |
| 12 | 0 segundo runtime de orden | ✔ |
| 13 | creación 1..N+1 con desplazamiento | ✔ |
| 14 | edición 1..N | ✔ |
| 15 | fuera de rango → clamp (crear N+1 · editar N) | ✔ |
| 16 | inválidos → rechazo controlado | ✔ |
| 17 | legacy compatible | ✔ |
| 18 | scope: 2 archivos src autorizados | ✔ |
| 19 | build PASS | ✔ |
| 20 | timebox (<120s) | ✔ |

## 7. Casos obligatorios A–O

A legacy→1..N · B crear al final (N+1) · C crear al principio (1) · D crear intermedio (12) ·
E mover 50→10 · F mover 10→50 · G misma posición idempotente (20→20) · H flecha ↑ converge ·
I flecha ↓ converge · J orden inválido sin cambios · K 999→N+1 · L identidad preservada ·
M tipos intactos · N guardar→recargar mismo orden · O runtime recibe orden canónico. **101/101 PASS.**

## 8. Alcance

**Modificado (2):** `src/order-motor/UniversalOrderMotor.js` · `src/components/FormBuilder.jsx`.
**No tocados (especificados):** runtime (`src/runtime/**`), Dashboard, DynamicForm, repositorio
documental, evidencia, storage, Supabase schema, Media Processing Core, `documentsService`,
SignaturePad, EvidenceUploader, CompletionBridge, Orchestrator, UOR/UOD, pipeline PDF.
**No creados:** `field_orders`/`form_field_orders`/`field_positions`, `orderService`/
`fieldOrderingService`, segundo builder, segundo runtime, segundo motor de orden, ID `field_1`.

## 9. Veredicto

```
FIELD IDENTITY             PRESERVED
FIELD ORDER                EXPLICIT
LEGACY FORMS               COMPATIBLE
ARROW REORDER              PRESERVED
DIRECT POSITIONING         ADDED
PERSISTENCE                EXISTING CONTRACT
RUNTIME                    PRESERVED
FIELD TYPES                PRESERVED
NEW SSOT                   NONE
NEW ENTITY                 NONE
NEW SERVICE                NONE
NEW TABLE                  NONE
DUPLICATE ORDER ENGINE     FORBIDDEN
SCOPE                      CONTROLLED
BUILD                      PASS
STATUS: CERTIFIED (101/101 · 4.3s)
```