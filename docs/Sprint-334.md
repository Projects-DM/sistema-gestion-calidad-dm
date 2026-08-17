# Sprint 334 — Evidence Report Informative Section Layout · Forensic Presentation Audit

**Rama:** release/stable-sprint79
**Modo:** LEVEL 5 · AUDIT ONLY · FORENSIC PRESENTATION AUDIT
**Precedente:** Sprint 333 bis — Informative Presentation · Controlled Presentation Correction (CERTIFIED estructural)
**Objeto:** Evidence Report PDF → INFORMACIÓN DEL FORMULARIO (layout vertical)
**Suite:** `scripts/sprint-334-evidence-report-informative-section-layout-forensic-audit.mjs`
**Resultado:** **ROOT CAUSE CERTIFIED** 83/83 (E01–E25 + Forensic F01–F25 + INV01–30) · 3.3s · timebox OK
**Cambios src/:** **0** (INV23 certifica que el objeto auditado no fue mutado) · **SQL:** 0 · **Storage:** 0 · **Servicios/modelos/renderers nuevos:** 0
**Clasificación:** **FORENSIC PRESENTATION DISCREPANCY — CONTROLLED CORRECTION REQUIRED** · **D) SECTION COMPOSITION DEFECT**

---

## 1. Pregunta forense

> ¿La sección INFORMACIÓN DEL FORMULARIO posee realmente un espacio vertical reservado y consumido antes de DATOS DEL REGISTRO, o existe una discrepancia entre la posición visual dibujada y el cursor lógico?

**Respuesta certificada con geometría REAL (jspdf instrumentado, sin tocar src):**

```
INFORMACIÓN DEL FORMULARIO: startY=534.0 endY=562.0 height=28.0pt page=1
  primer bloque informative: top=542 bottom=562.0 → OVERLAP barra = 10.0pt; título cubierto = true
DATOS DEL REGISTRO: startY=570.0
INFO.endY(562.0) <= DATOS.startY(570.0) → true
```

## 2. Causa raíz — D) SECTION COMPOSITION DEFECT

En `drawRecord` (`evidenceReportRenderer.js`), tras dibujar el título de sección:

```js
y = ensureSpace(doc, y, 24);
sectionTitle(doc, y, 'INFORMACIÓN DEL FORMULARIO');   // barra rect(..., 18, 'F') → [y, y+18]
y += 8;                                                // ← SOLO 8pt de avance
```

`sectionTitle` dibuja una **barra rellena de 18pt** (y su texto en baseline `y+13`). El cursor avanza solo `8pt`, por lo que el primer bloque informative (`doc.rect(MARGIN_X, y, CONTENT_W, bandHeight, 'F')` en `y+8`, relleno `#EEF2F6`) **se superpone 10pt sobre la barra y cubre el texto del título** (baseline `y+13` ∈ bloque `[y+8, y+8+bandHeight]`).

**Contraste con el patrón correcto de la casa** (barra de 18pt → avance ≥ 26):

| Sección | Avance tras barra 18pt | Correcto |
|---|---|---|
| INFORMACIÓN DEL REGISTRO | `y += 26` | ✔ |
| RESUMEN | `y += 28` | ✔ |
| CONTEXTO DEL FORMULARIO | `y += 28` | ✔ |
| FIRMAS Y EVIDENCIAS | `y += 26` | ✔ |
| **INFORMACIÓN DEL FORMULARIO** | **`y += 8`** | **✘ (10pt de solape)** |

## 3. Lo que quedó certificado como CORRECTO (0 defecto)

- **ensureSpace**: todas las llamadas son `y = ensureSpace(...)` (0 huérfanas); tras `addPage()` devuelve `y = 40` (F25: primer bloque de página 2 en `40`).
- **Altura del bloque**: `bandHeight = lines.length × 12 + 8` ≡ altura del rect dibujado (altura lógica = altura visual).
- **Límites INTER-sección**: `INFO.endY(562) <= DATOS.startY(570)` ✔ y `DATOS.finalY <= FIRMAS.startY` ✔ — el defecto es **INTRA-sección** (título vs primer bloque), no entre secciones.
- **Separación estructural**: informative fuera de Campo|Valor (F09) y de FIRMAS (F10); firma preservada; orden canónico `order_index`; Excel intacto; modelo/`field_id`/`order_index` intactos.
- **Múltiples informativos**: intervalos verticales independientes `I1:[y1,y2] I2:[y2+gap,y3] I3:[y3+gap,y4]` (F12).
- **Wrapping**: `splitTextToSize(f.label, CONTENT_W - 16)`, 0 overflow horizontal (F14), 0 truncado/ellipsis, 0 posición absoluta en el bloque.
- **Page break**: informative multi-bloque provoca salto de página conservando estructura (F21–F23).

## 4. Descarte de las demás categorías

- **A) CURSOR MANAGEMENT DEFECT** — descartado como primario: `ensureSpace` y los `y = ...` son correctos; el `y` se asigna en todas las mutaciones.
- **B) PAGE BREAK / ensureSpace DEFECT** — descartado: condición `SAFE_BOTTOM` correcta, retorno `40` verificado.
- **C) HEIGHT CALCULATION DEFECT** — descartado: `bandHeight` coincide con el rect dibujado.
- **E) DATA MODEL DEFECT** — descartado: detección de informative, `field_id ↔ field.id`, `order_index` PASS.
- **D) SECTION COMPOSITION DEFECT** — **CONFIRMADO**: el avance del cursor tras el título de 18pt es 8pt (constante de separación insuficiente).

## 5. Corrección quirúrgica requerida (próximo sprint)

Una línea en `evidenceReportRenderer.js` (bloque `if (informativeFields.length > 0)`):

```js
sectionTitle(doc, y, 'INFORMACIÓN DEL FORMULARIO');
y += 8;   // →  y += 18   (o adoptar el patrón de la casa: y += 26)
```

Prohibido resolver por font-size/truncado/ellipsis/offsets arbitrarios/constantes globales. No tocar modelo de respuestas ni arquitectura certificada.

## 6. Veredicto

```
FIELD PROJECTION          CERTIFIED
FIELD VALUE               CERTIFIED
INFORMATIVE MODEL         CERTIFIED
INFORMATIVE SEPARATION    CERTIFIED (structural)
CAMPO | VALOR             CERTIFIED
SIGNATURE                 PRESERVED
EXCEL                     PRESERVED
ensureSpace / page break  CERTIFIED
height calculation        CERTIFIED
inter-section boundaries  CERTIFIED
INTRA-section overlap     DISCREPANCIA CERTIFICADA (barra 18pt vs avance 8pt)

CLASIFICACIÓN: D) SECTION COMPOSITION DEFECT
FINAL CLASSIFICATION: FORENSIC PRESENTATION DISCREPANCY
  → CONTROLLED PRESENTATION CORRECTION REQUIRED
STATUS: ROOT CAUSE CERTIFIED
```

**Validación funcional manual sugerida:** Módulo → Historial y Consulta → Informe con Evidencia. El texto `INFORMACIÓN DEL FORMULARIO` aparece parcialmente tapado por el primer bloque informativo (superposición de 10pt). Tras la corrección quirúrgica (1 línea), el título debe quedar completamente visible con su barra.
