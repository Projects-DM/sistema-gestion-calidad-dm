# Sprint 336 — Informative Field Runtime Layout · Forensic Presentation Audit

**Estado:** ROOT CAUSE CERTIFIED · CONTROLLED PRESENTATION CORRECTION (337)
**Nivel:** 5 · **Tipo:** FORENSIC AUDIT (AUDIT ONLY — 0 cambios src)
**Suite:** `scripts/sprint-336-informative-field-runtime-layout-forensic-audit.mjs`
**Resultado:** **120/120 CERTIFIED** · 3.2s · timebox OK · build PASS

---

## Síntoma auditado

En la captura (Diligencia Registros → Formulario dinámico), un campo **`informative`**
("Texto informativo") con texto extenso provoca **overflow horizontal / scroll diagonal**:
la interfaz se vuelve desplazable en diagonal y el texto se corta visualmente.

## Cadena forense (FORM BUILDER → VIEWPORT)

| Eslabón | Ruta | Estado |
|---|---|---|
| Metadata del tipo | sgc_form_fields → getFormFields | PRESENT |
| Exclusión de valores/payload | DynamicForm (init, required, submit) | PRESENT |
| Resolución de engine | EngineResolver → BaseChecklist/BaseGeneric/BaseMediciones | PRESENT |
| Dispatch runtime | ComponentRegistry → FieldInformative | PRESENT |
| Renderer | FieldInformative / engines (bloque `<div>` con `{label}`) | **DEFECT** |
| Wrapper / grid / flex | `md:col-span-2` sin `min-w-0` | **DEFECT** |
| Contenedor | `max-w-4xl mx-auto` (acotado) | PRESERVED |
| Viewport | `<main>` con `overflow-y-auto` → `overflow-x` compila a `auto` | contribuye |

## CAUSA RAÍZ CERTIFICADA

El renderer informative emite el label en un **`<div>` bloque sin contrato de wrapping**:

- **0 `overflow-wrap` / `word-break` / `break-words`** → un token o cadena sin oportunidad de
  quiebre (soft-break) fija un `min-content` mayor al ancho disponible.
- **0 `min-w-0`** → los ítems grid/flex conservan `min-width:auto` y el exceso amplifica.
- **0 política de overflow** (`overflow-hidden` / `overflow-x-hidden`).

Con `<main>` en `overflow-y-auto`, el navegador computa `overflow-x: auto` → el exceso se
convierte en **scrollbar horizontal = scroll diagonal**.

**Prueba forense estática (min-content vs ancho disponible ≈ 768px):**
- Texto con espacios (FILTRO SANITARIO): token más largo = 13 chars → min-content ≈ 114px → **wrap normal, 0 overflow**.
- Cadena continua (§12): 120 chars → min-content ≈ 1056px → **OVERFLOW** (0 soft-break + 0 overflow-wrap).

## Clasificación A–H

- **A) INFORMATIVE RENDERER DEFECT** — CONFIRMADA (primaria)
- **E) CSS OVERFLOW POLICY DEFECT** — CONFIRMADA (secundaria)
- B) FIELD WRAPPER DEFECT — contribuyente (sin `min-w-0`)
- C) GRID/FLEX SIZING DEFECT — descartada (tracks `minmax(0,1fr)`)
- D) FORM CONTAINER WIDTH DEFECT — descartada (`max-w-4xl`)
- F) DATA/LABEL TRANSFORMATION — descartada (label sin transformar)
- G) RUNTIME DISPATCH DEFECT — descartada (registrado, 0 fallback)
- H) ARCHITECTURAL GAP — descartado (contrato integrado)

## Verdicto

```
INFORMATIVE TYPE CONTRACT   PRESERVED
RUNTIME DISPATCH            PRESERVED
INFORMATIVE RENDERER        DEFECT: sin wrapping/sizing contract
FIELD WRAPPER               DEFECT: sin min-w-0
GRID/FLEX SIZING            PRESERVED (minmax(0,1fr))
FORM CONTAINER              PRESERVED (max-w-4xl)
TEXT WRAPPING               PARCIAL (solo soft-breaks, 0 overflow-wrap)
HORIZONTAL OVERFLOW         DISCREPANCIA CERTIFICADA (tokens continuos)
VERTICAL GROWTH             PRESERVED (div bloque, altura auto)
LEGACY COMPATIBILITY        PRESERVED
EVIDENCE REPORT             PRESERVED · EXCEL PRESERVED
PERSISTENCE                 PRESERVED · ORDER ENGINE PRESERVED
SECOND RUNTIME              FORBIDDEN (ninguno creado)
SECOND RENDERER             FORBIDDEN (ninguno creado)
NEW MODEL / NEW SERVICE     FORBIDDEN (ninguno creado)
```

## Punto quirúrgico para Sprint 337 (CORRECTION)

Añadir contrato de wrapping/sizing al bloque informative en:

1. `src/runtime/renderer/fields/FieldInformative.tsx`
2. `src/components/engines/BaseGeneric.jsx`
3. `src/components/engines/BaseChecklist.jsx`
4. `src/components/engines/BaseMediciones.jsx`

**→ `min-w-0` + `break-words` (`overflow-wrap:break-word`) [+ `overflow-hidden`]**

Satisface **INFORMATIVE-WIDTH-01** para **cualquier** `label.length`:
`renderedWidth <= containerWidth` · `renderedHeight >= originalLineHeight` · `overflowX = 0`.

## Auditoría de alcance (AUDIT ONLY)

- **0** archivos `src/` modificados/creados en este sprint (working tree src limpio).
- **0** SQL · **0** dependencias · **0** servicios/modelos/tablas/consultas nuevos.
- No se tocó Evidence Report, Excel, submit de DynamicForm ni order engine.
- Artefacto: suite `scripts/sprint-336-...mjs` (único untracked del sprint).