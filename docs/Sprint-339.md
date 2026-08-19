# Sprint 339 — Visual Form Builder Select Field · Controlled Runtime Dispatch Correction

**Estado:** **CERTIFIED · 120/120** · 4.0s · timebox OK · build PASS
**Nivel:** 5 · **Tipo:** IMPLEMENTATION · CONTROLLED CORRECTION
**Precedente:** Sprint 338 (FORENSIC ARCHITECTURE AUDIT → ROOT CAUSE CERTIFIED 115/115)
**Suite:** `scripts/sprint-339-select-field-runtime-dispatch-controlled-correction.mjs`

---

## Corrección aplicada (3 archivos autorizados · +45/-5)

| Archivo | Cambio |
|---|---|
| `src/components/engines/BaseChecklist.jsx` | Rama `field.field_type === 'select'` **antes** del fallback textarea → `<select>` con `field.options?.choices` |
| `src/components/engines/BaseMediciones.jsx` | Rama `field.field_type === 'select'` **antes** del default numérico → `<select>` con `choices` |
| `src/runtime/renderer/fields/FieldSelect.tsx` | Lectura alineada a `fieldDef.options?.choices` (string[]) — eliminada dependencia de `options.options` |

Semántica corregida:
```
select ──BaseChecklist──► <select>      (antes: fallback <textarea> "observaciones")
select ──BaseMediciones─► <select>      (antes: default <input type="number">)
FieldSelect ──► options.choices         (contrato canónico, una sola estructura)
```

## Certificación

- **E01–E10 scope**: exactamente los 3 archivos autorizados; 0 SQL/schema/migration; DynamicForm, dynamicService, FormBuilder, builderAdapter, ComponentRegistry, BaseGeneric, FieldInformative, Evidence Report, docs/12-database intactos; 0 archivo src nuevo.
- **E11–E25 BaseChecklist**: rama select antes del fallback; `<select>` + placeholder + `choices` + required + `onChange(field.id, value)`; 0 textarea/number en la rama.
- **E26–E40 BaseMediciones**: rama select antes del default; `<select>` + placeholder + `choices` + required + label; 0 number en la rama; text/textarea/boolean/signature/informative intactos.
- **E41–E50 FieldSelect**: `options.choices` como fuente; 0 `options.options`; placeholder + `onChange(fieldDef.id, value)` + required; soporta string[] y compat `{label,value}`; una sola estructura.
- **E51–E60 choices**: AREA → 2 opciones, orden y texto preservados; 1 y 3 opciones; 0 opción fusionada; los 4 renderers consumen `choices`.
- **E61–E70 selección→respuesta**: `onChange(field.id, value)` → `sgc_response_values` (value_text); 0 tabla/ruta especial.
- **E71–E80 campos mixtos**: informative/text/textarea/number/boolean/select/signature coexisten en ambos engines.
- **E81–E90 regresión**: BaseGeneric no tocado (case select intacto); FormBuilder/dynamicService/registry/DynamicForm/FieldInformative intactos; 0 select→textarea/number; 0 heurística de contenido.
- **E91–E100 arquitectura**: 1 solo registro select; 1 sola estructura choices; 0 SQL/tabla/servicio/modelo/pipeline; Evidence Report, Excel, order engine intactos; **BUILD exit 0**.
- **Casos A–J** + **SELECT-01..10**: todos PASS.

## Clasificación final

```
SELECT TYPE MAPPING             PRESERVED
OPTIONS PARSING                 PRESERVED
BUILDER ADAPTER                 PRESERVED
PERSISTENCE                     PRESERVED
READ PATH                       PRESERVED
COMPONENT REGISTRY              PRESERVED
BASECHECKLIST SELECT            CORRECTED
BASEMEDICIONES SELECT           CORRECTED
FIELDSELECT OPTIONS             ALIGNED (choices)
SELECT → <select>               PASS
SELECT → TEXTAREA               0
SELECT → NUMBER                 0
FIELD IDENTITY                  PRESERVED
OPTIONS CHOICES                 PRESERVED
RESPONSE PERSISTENCE            PRESERVED (sgc_response_values)
ORDER                           PRESERVED
TEXT/TEXTAREA/NUMBER/BOOLEAN    PRESERVED
SIGNATURE                       PRESERVED
INFORMATIVE                     PRESERVED
EVIDENCE REPORT                 PRESERVED
EXCEL                           PRESERVED
SQL                             0
NEW TABLE / SERVICE / MODEL     0
NEW RUNTIME / SECOND PIPELINE   0
BUILD                           PASS
```

**FINAL CLASSIFICATION:** CONTROLLED SELECT RUNTIME DISPATCH CORRECTION · **STATUS: CERTIFIED** · SCOPE: SELECT DISPATCH ONLY