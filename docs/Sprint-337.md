# Sprint 337 — Informative Field Runtime Layout · Controlled Presentation Correction

**Estado:** **CERTIFIED · 145/145** · 4.1s · timebox OK · build PASS
**Nivel:** 5 · **Tipo:** IMPLEMENTATION · CONTROLLED PRESENTATION CORRECTION
**Precedente:** Sprint 336 (FORENSIC PRESENTATION AUDIT → ROOT CAUSE CERTIFIED)
**Suite:** `scripts/sprint-337-informative-field-runtime-layout-controlled-correction.mjs`
**Rama:** release/stable-sprint79

---

## Corrección aplicada (4 archivos autorizados · 8+/8-)

| Archivo | Cambio |
|---|---|
| `src/runtime/renderer/fields/FieldInformative.tsx` | `runtime-field-informative` → `min-w-0` · heading → `break-words overflow-hidden` |
| `src/components/engines/BaseGeneric.jsx` | ítem `md:col-span-2 pt-2` → `min-w-0` · heading → `break-words overflow-hidden` |
| `src/components/engines/BaseChecklist.jsx` | ítem `p-2` → `min-w-0` · heading → `break-words overflow-hidden` |
| `src/components/engines/BaseMediciones.jsx` | ítem `md:col-span-2 mt-2` → `min-w-0` · heading → `break-words overflow-hidden` |

Política única: **WRAP FIRST · CLIP NEVER AS DATA LOSS**
(`overflow-wrap:break-word` garantiza wrapping de tokens continuos; `overflow-hidden` es protección complementaria que nunca oculta contenido porque el texto ya se envuelve).

## Causa raíz atacada (Sprint 336 → 337)

`<div>{label}</div>` sin contrato → min-content > ancho disponible → overflow horizontal → scroll diagonal.
Ahora: `min-w-0` (min-width controlado en ítems grid/flex) + `break-words` (wrapping de tokens continuos) → `renderedWidth <= availableContainerWidth` para cualquier `label.length`.

## Certificación

- **E01–E15 scope**: exactamente los 4 archivos autorizados modificados; 0 SQL, 0 package.json, 0 docs/12-database, 0 DynamicForm/dynamicService/report/order-motor; líneas añadidas = solo clases del contrato.
- **E16–E30 renderer moderno**: estructura visual preservada + contrato aplicado; 0 input/interacción/validación/innerHTML/truncation.
- **E31–E45 wrapping**: `break-words` + `overflow-hidden` en los 4; política idéntica (1 solo set de clases); 0 nowrap/truncate/ellipsis/font-reduction.
- **E46–E55 min-width**: `min-w-0` en los 4; tracks `minmax(0,1fr)` intactos; contenedor `max-w-4xl` intacto; viewport con scroll vertical preservado.
- **E56–E65 tokens continuos**: 120 y 500 chars → **0 overflow**; texto corto 1 línea; texto largo multilínea; FILTRO SANITARIO íntegro; prueba negativa: sin contrato SÍ desborda (evidencia de que la corrección es el contrato).
- **E66–E75 múltiples informative**: rama dentro de `fields.map` (aplica a cada instancia); 3 informativos mezclados y only-form → 0 overflow.
- **E76–E85 regresión**: text/textarea/number/boolean/select/signature intactos; DynamicForm intacto (informative sigue fuera de values/payload).
- **E86–E95 engines legacy**: los 3 engines con semántica idéntica (NON-INTERACTIVE · DISPLAY BLOCK · RESPONSIVE · WRAPPING · GROWTH).
- **E96–E105 arquitectura**: 1 solo tipo/runtime/renderer; 0 segundo renderer/servicio/modelo/tabla/SQL; Evidence Report/Excel/submit/persistence/order intactos.
- **Casos A–O funcionales**: corto, largo, multiline, token continuo, múltiples, +text, +textarea, +number, +checklist, +select, +signature, only, legacy, mixed, viewport limitado → todos **0 overflow**.
- **INV01–24**: wrapping obligatorio, min-width controlado, 0 overflow horizontal, crecimiento vertical, contenido completo, legacy compatible.
- **BUILD**: `npm run build` → **exit 0**.

## Clasificación final

```
INFORMATIVE CONTRACT       PRESERVED
RUNTIME DISPATCH           PRESERVED
MODERN RENDERER            CORRECTED
LEGACY RENDERERS           CORRECTED
WRAPPING                   PASS
MIN-WIDTH                  PASS
CONTINUOUS TOKENS          PASS
VERTICAL GROWTH            PASS
HORIZONTAL OVERFLOW        0
DATA LOSS                  0
OTHER FIELD TYPES          PRESERVED
EVIDENCE REPORT            PRESERVED
EXCEL                      PRESERVED
PERSISTENCE                PRESERVED
ORDER ENGINE               PRESERVED
SECOND RUNTIME             NONE
SECOND RENDERER            NONE
NEW MODEL                  NONE
NEW SERVICE                NONE
NEW TABLE                  NONE
SQL                        0
BUILD                      PASS
```

**FINAL CLASSIFICATION:** CONTROLLED PRESENTATION CORRECTION · **STATUS: CERTIFIED** · SCOPE: RUNTIME INFORMATIVE LAYOUT ONLY