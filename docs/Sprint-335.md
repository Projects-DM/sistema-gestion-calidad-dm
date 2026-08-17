# Sprint 335 — Evidence Report Informative Section Spacing · Controlled Presentation Correction

**Rama:** release/stable-sprint79
**Modo:** LEVEL 5 · IMPLEMENTATION · CONTROLLED PRESENTATION CORRECTION
**Precedente:** Sprint 334 — Forensic Presentation Audit (ROOT CAUSE CERTIFIED 83/83)
**Dependencias:** Sprint 333 bis · Sprint 334
**Objeto:** Evidence Report PDF → INFORMACIÓN DEL FORMULARIO (solapamiento intra-sección)
**Suite:** `scripts/sprint-335-evidence-report-informative-section-spacing-controlled-correction.mjs`
**Resultado:** **CERTIFIED 127/127** (E01–E90 + Casos A–J + INV01–24) · 6.4s · timebox OK · build PASS
**Cambio src:** 1 archivo · 1 línea (`evidenceReportRenderer.js`) · **SQL/storage/servicios/modelos/renderers/pipelines:** NONE
**Clasificación final:** **CONTROLLED PRESENTATION CORRECTION** · STATUS **CERTIFIED**

---

## 1. Corrección aplicada (quirúrgica)

`src/shared/report/evidenceReportRenderer.js` — zona autorizada `if (informativeFields.length > 0)`:

```diff
   sectionTitle(doc, y, 'INFORMACIÓN DEL FORMULARIO');
-  y += 8;
+  y += 26;   // 18pt header + 8pt spacing = 26pt consumed (patrón de la casa)
```

`26pt` no es un offset arbitrario: es el patrón de composición ya existente
(INFORMACIÓN DEL REGISTRO → +26, FIRMAS Y EVIDENCIAS → +26). Uno solo se
corrigió; los demás quedaron intactos (E06).

## 2. Evidencia geométrica REAL (escenario C — informative + respuestas)

```
INFORMACIÓN DEL FORMULARIO: barra=[534..552] endY=580.0pt page=1
  primer bloque informative: top=560 bottom=580.0
  GAP = 8.0pt · OVERLAP = 0.0pt · título cubierto = false
informativeTop(560) >= sectionTitleBottom(552)? true
dataStartY(588.0) > informativeEndY(580.0)? true
```

Invariante geométrica principal de Sprint 335, cumplida:

- `informativeTop (560) >= sectionTitleBottom (552)` ✔
- `informativeTop - sectionTitleBottom = 8` ✔
- `overlap = 0pt` (antes 10pt) ✔
- `dataStartY (588) > informativeEndY (580)` ✔

## 3. Cobertura de la suite

- **E01–E20** scope (1 archivo, mismo set src que 334) + corrección localizada (`y += 26`, 0 `y += 8`, patrón de la casa conservado).
- **E21–E40** geometría del section header con render REAL: barra 18pt, GAP 8pt, overlap 0, título no cubierto, límites inter-sección, 0 overflow, informative fuera de Campo|Valor y de FIRMAS.
- **E41–E55** múltiples informative (I1<I2<I3, separación ≥ 4pt), informative largo (wrap, h>20, 0 overflow/truncado/posición absoluta), orden canónico, mixed form, informative-only.
- **E56–E70** page boundaries: page break conserva estructura y orden por página (DATOS en/después del último bloque, antes de FIRMAS), cursor vuelve a 40 tras `addPage`.
- **E71–E80** regresión Campo | Valor (TEXT/TEXTAREA/NUMBER/BOOLEAN "Cumple"/SELECT) + firma ("Ver Firma N").
- **E81–E90** legacy / mixed / informative-only / build PASS / modelo y adapter no mutados.
- **Casos A–J**: sin informative · uno · múltiples · largo · +responses · +firma · completo · page break · multiline · zero overlap.
- **INV01–24**: tabla de invariantes de Sprint 335 completa (título visible, barra completa, overlap 0, 8pt separación, wrapping, altura dinámica, múltiples, Campo|Valor, firma, orden canónico, legacy, mixed, page break, ensureSpace, modelo, field_id, Excel, 0 SQL/servicio/renderer/pipeline, scope 1 archivo, build).

## 4. Regresión NO reabierta (todo PRESERVED)

FIELD VALUE PROJECTION (TEXT/TEXTAREA/NUMBER/BOOLEAN-CHECKLIST/SELECT) · SIGNATURE ·
INFORMATIVE MODEL · INFORMATIVE SEPARATION · CANONICAL ORDER · EXCEL · PAGE BREAK · LEGACY.

## 5. Veredicto

```
INFORMATIVE DETECTION      PRESERVED    NEW MODEL    NONE
INFORMATIVE SEPARATION     PRESERVED    NEW SERVICE  NONE
SECTION HEADER             PRESERVED    NEW TABLE    NONE
HEADER HEIGHT              18pt         NEW PIPELINE NONE
SECTION SPACING            8pt          NEW RENDERER NONE
TOTAL CONSUMED SPACE       26pt         SCOPE        1 FILE
INTRA-SECTION OVERLAP      0pt          BUILD        PASS
INFORMATIVE WRAPPING       PRESERVED
DYNAMIC HEIGHT             PRESERVED    FINAL CLASSIFICATION:
CAMPO | VALOR              PRESERVED    CONTROLLED PRESENTATION CORRECTION
SIGNATURE                  PRESERVED
PAGE BREAK                 PRESERVED    STATUS: CERTIFIED
LEGACY                     PRESERVED
EXCEL                      PRESERVED
```

**Validación funcional manual:** Módulo → Historial y Consulta → Informe con Evidencia.
El encabezado `INFORMACIÓN DEL FORMULARIO` queda completamente visible con su barra íntegra;
los textos informativos comienzan debajo con separación limpia (GAP 8pt).
