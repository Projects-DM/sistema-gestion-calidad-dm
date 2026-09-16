# Sprint 338 — Visual Form Builder Select Field · Forensic Architecture Audit

**Estado:** **ROOT CAUSE CERTIFIED · 115/115** · 0.6s · timebox OK · **AUDIT ONLY (0 src)**
**Nivel:** 5 · **Tipo:** FORENSIC ARCHITECTURE AUDIT
**Precedente:** Sprint 337 (Controlled Presentation Correction)
**Suite:** `scripts/sprint-338-select-field-builder-forensic-architecture-audit.mjs`

---

## Síntoma

En el Constructor Visual, el campo **AREA** con tipo **Lista desplegable** y opciones
`PLANTA DE PRODUCCION, EXTERIORESS` se guarda con `field_type = select`, pero en captura
el campo se comporta como **texto/observaciones** en lugar de un `<select>`.

## Cadena forense (caso AREA)

| Eslabón | Resultado |
|---|---|
| Constructor Visual (`Lista desplegable` → `select`) | PRESERVED |
| Parser de opciones (`split(',')` + `.trim()`) | PRESERVED |
| Builder Adapter (whitelist incluye `select`) | PRESERVED |
| Persistencia `sgc_form_fields` (`field_type` + `options.choices`) | PRESERVED |
| Read Path (`getFormFields` = `select('*')`, sin transformación) | PRESERVED |
| ComponentRegistry (`select` → `FieldSelect`) | PRESERVED |
| FieldSelect (genera `<select>` pero lee `options.options` ≠ `choices`) | DISCREPANCIA (secundaria) |
| **Engines legacy de captura** | **DEFECTO (primaria)** |

## CAUSA RAÍZ CERTIFICADA

La pérdida de identidad **no** ocurre en el Builder, la persistencia ni el registry.
Ocurre en el **dispatch de los engines legacy de captura**:

- **BaseChecklist.jsx** — `renderFieldInput` NO tiene rama `select` → el campo cae al
  **fallback `<textarea>`** (el propio código lo comenta: *"fallback for text fields like
  'observaciones'"*). → **síntoma exacto: campo de texto/observaciones.**
- **BaseMediciones.jsx** — NO tiene rama `select` → el campo cae al **default
  `<input type="number">`**.
- **BaseGeneric.jsx** — sí implementa `case 'select'` con `options.choices` (referencia correcta).

Evidencia: la captura usa `resolveEngineComponent(formDef.engine_type)` → engines legacy
(DynamicForm.jsx:266-267). Un formulario con `engine_type = BaseChecklist` o `BaseMediciones`
degradará cualquier campo `select` al fallback.

## Clasificación A–H

- **G) FALLBACK DEFECT — CONFIRMADA (PRIMARIA)**: engines legacy sin dispatch `select`.
- **F) FIELDSELECT OPTIONS CONTRACT — DISCREPANCIA SECUNDARIA**: `FieldSelect.tsx` lee
  `fieldDef.options?.options` (array de `{label,value}`) mientras el contrato canónico es
  `options.choices: string[]` (runtimeContracts.ts; mismo patrón que BaseGeneric/validación).
- A) Builder Type Mapping — descartada · B) Options Normalization — descartada
- C) Builder Adapter — descartada · D) Persistence Projection — descartada
- E) Registry Dispatch — descartada · H) Architectural Gap — descartado (BaseGeneric implementa el contrato)

## PUNTO QUIRÚRGICO PARA SPRINT 339 (AUDIT AUTORIZA)

1. **`BaseChecklist.jsx`** — `renderFieldInput`: añadir rama `select` **antes** del fallback
   (espejo de `BaseGeneric.jsx:85-98`, alimentada por `field.options?.choices`).
2. **`BaseMediciones.jsx`** — añadir rama `select` **antes** del default numérico.
3. **(Secundario)** **`FieldSelect.tsx`** — leer `fieldDef.options?.choices` (string[]) en
   lugar de `options.options` para alinear el runtime con el contrato `FieldOptions.choices`.

Sin tocar: Builder, persistencia, schema, SQL, registry, DynamicForm, Evidence Report,
Excel, informative, signature, order engine.

## Clasificación final

```
VISUAL BUILDER SELECT CONTRACT    PRESERVED
SELECT TYPE MAPPING               PRESERVED
OPTIONS PARSING                   PRESERVED (trim)
BUILDER ADAPTER                   PRESERVED
PERSISTENCE                       PRESERVED
READ PROJECTION                   PRESERVED
COMPONENT REGISTRY                PRESERVED
FIELDSELECT                       DISCREPANCY (options key)
SELECT → RUNTIME (legacy engines) DEFECT (BaseChecklist/BaseMediciones)
OPTIONS → RUNTIME                 PRESERVED (choices)
TEXT FALLBACK                     DEFECT (captura al select)
ORDER                             PRESERVED
OTHER FIELD TYPES                 UNTOUCHED
EVIDENCE REPORT                   UNTOUCHED · EXCEL UNTOUCHED
INFORMATIVE                       UNTOUCHED · SIGNATURE UNTOUCHED
SQL                               UNTOUCHED
```

**FINAL CLASSIFICATION:** CONTROLLED SELECT RUNTIME DISPATCH DISCREPANCY (G primaria · F secundaria)
**STATUS:** ROOT CAUSE CERTIFIED · **CORRECTION AUTHORIZED FOR SPRINT 339** · SCOPE: SELECT ONLY