# Sprint 333 — Evidence Report Field Projection · Controlled Correction

**Rama:** release/stable-sprint79
**Modo:** LEVEL 5 · IMPLEMENTATION · CONTROLLED CORRECTION
**Precedente:** Sprint 332 — Forensic Projection Audit (CERTIFIED, punto de pérdida localizado)
**Dependencias:** Sprint 328 (Explicit Field Ordering) · Sprint 330 (Informative Display Field Audit) · Sprint 331 (Informative Integration) · Sprint 332 (Forensic Audit)
**Evidencia de regresión:** `LIMPIEZA_Y_DESINFECCIÓN_2026-08-17_13-32.pdf` (DATOS DEL REGISTRO sin valores)
**Suite:** `scripts/sprint-333-evidence-report-field-projection-controlled-correction.mjs`
**Resultado:** **CERTIFIED** 105/105 (E01–E90 + casos A–T + INV01–30) · 6.3s · exit=0 · timebox OK · `npm run build` exit 0
**Regresión histórica 296–332:** NO ejecutada (corrección dirigida).
**Cambios src/:** 3 archivos (2 principales + 1 condicional) · **SQL:** 0 · **Dependencias:** 0 · **Servicios/modelos/tablas/consultas nuevos:** 0
**Clasificación:** **CERTIFIED**

---

## 1. Corrección 1 — EvidenceReportModel (`src/shared/report/evidenceReportModel.js`)

**Defecto corregido (Sprint 332):** el modelo indexaba respuestas por `field.id`, identidad **no proyectada** en el join de `getModuleResponses` (`sgc_form_fields ( label, field_type, options )`), colapsando todas las respuestas bajo la clave `undefined`.

**Operación canónica aplicada:**

```js
// índice de respuestas → SIEMPRE por field_id (identidad proyectada)
valueByField.set(val.field_id, { val, field });
// resolución contra la metadata del formulario
const entry = valueByField.get(field.id);
```

**Regla INV01 certificada:** `sgc_response_values.field_id ↔ sgc_form_fields.id`.

Además, en la ruta con skeleton, `label` y `options` de cada fila provienen del **skeleton** (metadata canónica de `sgc_form_fields`); el valor proviene de la respuesta resuelta. En la ruta fallback (sin skeleton) se conserva el join.

## 2. Corrección 3 — dispatchEvidenceAdapter (`src/shared/report/dispatchEvidenceAdapter.js`) — condicional autorizado

El adapter **preserva la identidad** `field_id` (mínima y localizada, una línea) sin resolver valores:

```js
sgc_response_values.map(({ field, label, type }) => ({
  field_id: field,          // ← identidad preservada (no resuelve valor)
  value_text, value_number, value_boolean, value_json,
  sgc_form_fields: { label, field_type: type, options: {} },
}))
```

La resolución (normalización de valores) sigue siendo 100% responsabilidad del `EvidenceReportModel` (REUSE de `exportDataNormalizer.normalizeValue`).

## 3. Corrección 4 — informative DISPLAY BLOCK (`src/shared/report/evidenceReportRenderer.js`)

Sustituye la banda de altura fija (20pt) y texto sin wrap por un **DISPLAY BLOCK con wrapping y altura dinámica**:

```js
const lines = doc.splitTextToSize(f.label, CONTENT_W - 16);      // wrap al ancho disponible
const bandHeight = lines.length * bandLineHeight + bandPadding;  // altura ∝ contenido
y = ensureSpace(doc, y, bandHeight + 4);                          // sin overlap ni salto brusco
doc.rect(MARGIN_X, y, CONTENT_W, bandHeight, 'F');                // banda crece
doc.text(lines, MARGIN_X + 8, y + bandPadding + bandLineHeight);  // N líneas envueltas
y += bandHeight + 4;
```

**Prohibiciones respetadas:** 0 reducción de `font-size`, 0 truncado, 0 ellipsis, 0 corte de texto, 0 desplazamiento/superposición, 0 altura fija mayor.

## 4. Modelo final combinado

```
sgc_form_fields (id, label, field_type, order_index, options)
        │
        ├── informative  →  fila de presentación (label, sin valor, sin —/N/A/undefined)
        ├── signature    →  canal propio (FIRMAS Y EVIDENCIAS → "Ver Firma N — label")
        └── respondibles →  resuelto por field_id
                                    │
sgc_response_values (field_id, value_text, value_number, value_boolean, value_json)
                                    │
                    EvidenceReportModel
                                    │
              secuencia ordenada por order_index
                                    │
                    EvidenceReportRenderer → PDF (Campo | Valor)
```

## 5. Compatibilidad certificada (runtime)

| Escenario | Estructura | Resultado |
|-----------|-----------|-----------|
| Legacy | text, number, boolean, select, signature | 4 filas Campo/Valor + firma aparte |
| Nuevo | informative, text, number, boolean, select, signature | informative en posición 1 + 4 filas + firma |
| Mixto | informative…text, textarea, number, boolean, select, informative, signature | 7 filas en orden canónico exacto (informativos en 1 y 8) |
| Múltiples registros | 2 registros | cada registro proyecta sus propios valores |
| Fallback despachos | 14 campos (adapter con field_id) | 14 filas, 0 colapso a 1 |
| Ausencia de respuesta | informative-only | reporte válido (presentación) |

## 6. Invariantes clave certificadas

- **01** `field_id ↔ field.id` · **02** 1 respuesta → 1 campo · **03** N respuestas → N asociaciones · **04** 0 colisiones `undefined`
- **05–09** text/textarea/number/boolean/select PASS · **10** signature PRESERVED
- **11–14** informative PASS / no response / usa metadata / respeta `order_index`
- **15–18** wrapping obligatorio / altura dinámica / 0 overflow horizontal / 0 overlap vertical
- **19–21** legacy / mixed / múltiples registros · **22** Excel intacto
- **23–25** un solo modelo / un solo renderer / 0 segundo pipeline
- **26–30** 0 servicio nuevo / 0 tabla nueva / 0 consulta nueva / 0 snapshot / build PASS

## 7. Aislamiento y scope

- **Excel (`exportDataNormalizer`)**: intacto — política 330/331 preservada (informative excluido en los 3 pases; signature y evidencias intactos).
- **Prohibidos no tocados**: `src/components/**`, `src/runtime/**`, `src/pages/DynamicForm.jsx`, `src/services/dynamicService.js`, `src/order-motor/**`, `docs/12-database/**`, `*.sql`, `package*.json`.
- **0 consultas nuevas**: el modelo sigue siendo 0-query; solo consume los registros ya cargados (`getModuleResponses` / `buildDispatchEvidenceRecords`) + la metadata de `sgc_form_fields` que ya inyectaba el caller (Sprint 331).

## 8. Veredicto

```
FIELD IDENTITY              PASS (field_id ↔ field.id)
FIELD VALUE PROJECTION      PASS
TEXT / TEXTAREA / NUMBER    PASS
BOOLEAN / SELECT            PASS
SIGNATURE                   PRESERVED
INFORMATIVE                 PASS
INFORMATIVE WRAPPING        PASS (splitTextToSize, CONTENT_W-16)
INFORMATIVE HEIGHT          PASS (líneas × lineHeight + padding)
CANONICAL ORDER             PASS (order_index)
LEGACY FORMS                PASS
MIXED FORMS                 PASS
MULTIPLE RECORDS            PASS
EXCEL                       PRESERVED
SECOND PIPELINE / MODEL / TABLE / SERVICE / QUERY   NONE
BUILD                       PASS (exit 0)

FINAL: CERTIFIED
```

**Validación funcional manual sugerida:** Módulo → Historial y Consulta → seleccionar registro → Informe con Evidencia. `DATOS DEL REGISTRO` debe mostrar `Campo | Valor` con todos los campos (texto, temperatura, cumple, tipo, observaciones) y el informative como bloque envuelto dentro de la página.

---

# Sprint 333 (bis) — Evidence Report Informative Presentation · Controlled Presentation Correction

**Precedente:** Sprint 332 — Evidence Report Field Projection · Forensic Integration Audit
**Suite:** `scripts/sprint-333-evidence-report-informative-presentation-controlled-correction.mjs`
**Resultado:** **CERTIFIED** 104/104 (E01–E55 + casos A–O + INV01–20) · 3.5s · exit=0 · timebox OK · `npm run build` exit 0
**Regresión histórica:** NO ejecutada (corrección dirigida).
**Cambios src/:** `evidenceReportRenderer.js` (solo renderer; modelo intacto) · **SQL:** 0 · **Dependencias:** 0 · **Servicios/modelos/tablas/consultas/renderers nuevos:** 0
**Clasificación:** **CONTROLLED PRESENTATION CORRECTION**

---

## 1. Principio rector

**INFORMATIVE IS PRESENTATION METADATA, NOT RESPONSE DATA.**

El tipo `informative` no pertenece a `Campo | Valor`. Es información estructural del formulario. El Sprint 331 lo integraba intercalado dentro de la tabla de respuestas (banda visual entre bloques de campos) — estructura incorrecta: el informative se leía como parte de la estructura de respuestas.

## 2. Separación de presentación (no de persistencia)

El modelo conserva la **estructura única** (`fields` con `presentation:true` + `order`); el renderer realiza la separación visual:

```
FORM DEFINITION (sgc_form_fields)
      │
      ├── informative  →  INFORMACIÓN DEL FORMULARIO  (DISPLAY BLOCK)
      ├── responses    →  DATOS DEL REGISTRO          (SOLO Campo | Valor)
      └── signature    →  FIRMAS Y EVIDENCIAS         (canal intacto)
```

```js
const informativeFields = record.fields.filter((f) => f.presentation);
const responseFields = record.fields.filter((f) => !f.presentation);
```

## 3. Renderer — tres secciones independientes

1. **`INFORMACIÓN DEL FORMULARIO`** — SOLO si `informativeFields.length > 0` (legacy intacto: sección omitida). Cada informative es un DISPLAY BLOCK: `splitTextToSize(f.label, CONTENT_W - 16)`, `bandHeight = líneas × 12 + 8`, `ensureSpace(doc, y, bandHeight + 4)`. 0 reducción de fuente, 0 truncado, 0 ellipsis, 0 altura fija, 0 overflow, 0 overlap.
2. **`DATOS DEL REGISTRO`** — la tabla `Campo | Valor` usa SOLO `responseFields.map((f) => [f.label, f.value])`; `Sin datos registrados` solo cuando no hay respuestas. 0 fila de informative en la tabla (prohibido `FILTRO SANITARIO —`/`undefined`/en blanco).
3. **`FIRMAS Y EVIDENCIAS`** — canal existente, intacto.

Orden de secciones certificado: `INFORMACIÓN < DATOS < FIRMAS`.

## 4. Modelo final combinado

```
sgc_form_fields (id, label, field_type, order_index, options)
        │
        ├── informative  →  presentation:true, value:'' (0 respuesta, 0 sgc_response_values)
        ├── signature    →  canal FIRMAS Y EVIDENCIAS ("Ver Firma N — label")
        └── respondibles →  resuelto por field_id → Campo | Valor
```

## 5. Compatibilidad certificada (runtime)

| Escenario | Resultado |
|-----------|-----------|
| Solo informative | bloque informativo válido (PDF válido) |
| Solo respuestas | tabla Campo\|Valor (4 filas) |
| Informative + respuestas | dos estructuras independientes |
| Múltiples informativos | todos en INFORMACIÓN DEL FORMULARIO, orden conservado |
| Informative largo / multilínea | wrapping + altura dinámica |
| Informative + respuestas + firma | tres secciones independientes |
| Informative inicio/intermedio/final | sin contaminar Campo\|Valor ni firmas |
| Legacy (sin informative) | sección omitida → reporte idéntico |
| Mixto | informative separado + respuestas correctas |
| Múltiples registros | cada registro conserva su contenido |

## 6. Invariantes certificadas (01–20)

01–05 un solo modelo de campos / un solo `sgc_form_fields` / un solo `order_index` / un solo `EvidenceReportModel` / un solo PDF renderer · 06 informative sin respuesta · 07 informative fuera de Campo\|Valor · 08 respuestas dentro de Campo\|Valor · 09 firma preservada · 10 orden canónico · 11 wrapping · 12 altura dinámica · 13 0 overflow · 14 0 overlap · 15 legacy compatible · 16 mixed forms · 17 Excel intacto · 18 0 tabla DB nueva · 19 0 servicio nuevo · 20 0 segundo renderer.

## 7. Veredicto

```
INFORMATIVE IDENTIFICATION   PASS (presentation:true)
INFORMATIVE SEPARATION       PASS (INFORMACIÓN DEL FORMULARIO)
CAMPO | VALOR ISOLATION      PASS (SOLO responseFields)
TEXT / TEXTAREA / NUMBER     PASS
BOOLEAN / SELECT             PASS
SIGNATURE                    PRESERVED
CANONICAL ORDER              PASS (order_index)
INFORMATIVE WRAPPING         PASS (splitTextToSize, CONTENT_W - 16)
DYNAMIC HEIGHT               PASS (líneas × lineHeight + padding)
PAGE BOUNDARIES              PASS (ensureSpace)
LEGACY FORMS                 PASS
MIXED FORMS / MULTI-RECORD   PASS
EXCEL                        PRESERVED
PERSISTENCE / RUNTIME / DB   UNCHANGED
NEW TABLE / SERVICE / RENDER NONE
BUILD                        PASS (exit 0)

FINAL: CONTROLLED PRESENTATION CORRECTION · CERTIFIED
```

**Validación funcional manual sugerida:** Módulo → Historial y Consulta → Informe con Evidencia. El PDF debe mostrar `INFORMACIÓN DEL FORMULARIO` con el/los texto(s) informativo(s) como bloques envueltos, seguidos de `DATOS DEL REGISTRO` con solo `Campo | Valor`, y `FIRMAS Y EVIDENCIAS` intacto.