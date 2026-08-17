# Sprint 330 — Informative Display Field · Forensic Architecture Audit

**Rama:** release/stable-sprint79
**Modo:** AUDIT ONLY · LEVEL 5 · FORENSIC ARCHITECTURE AUDIT
**Precedente:** Sprint 329 — Field Order Control Placement (CERTIFIED)
**Dependencias:** Sprint 328 (Explicit Field Ordering) · Dynamic Form Runtime · Evidence Report Pipeline · Form Metadata Contract
**Suite:** `scripts/sprint-330-informative-display-field-forensic-architecture-audit.mjs`
**Resultado:** **CERTIFIED** 117/117 (gates + casos A–Z + invariantes 1–20) · 4.1s · exit=0 · timebox OK
**Regresión histórica 296–329:** NO ejecutada (auditoría dirigida, sin implementación).
**Cambios src/:** 0 · **SQL:** 0 · **Storage:** 0 · **Dependencias:** 0
**Clasificación final:** **CONTROLLED METADATA EXTENSION**
**Estado:** AUDIT ONLY — sin implementación. Sprint 331 autorizado para implementar el contrato.

---

## 1. Pregunta forense

> ¿El SGC-DM puede incorporar un campo informativo/no respondible como nueva semántica del
> contrato de campo existente, reutilizando runtime, persistencia, ordenamiento e informes,
> sin segundo modelo ni lógica paralela?

**Respuesta certificada: SÍ — CONTROLLED METADATA EXTENSION.**

## 2. Principio rector

**INFORMATION IS FORM METADATA, NOT OPERATIONAL RESPONSE.**

```
ONE FORM MODEL + ONE FIELD IDENTITY + ONE EXPLICIT ORDER + ONE FIELD TYPE CONTRACT
+ ONE RUNTIME + ONE EVIDENCE PIPELINE = STRUCTURED FORM PRESENTATION
```

## 3. Inventario de arquitectura (hallazgos con evidencia)

### 3.1 Contrato de persistencia — `sgc_form_fields` (`docs/12-database/sql_setup_dynamic.sql:38-48`)

| Columna | Tipo | Nota |
|---------|------|------|
| `id` | UUID PK | identidad |
| `form_id` | UUID FK → sgc_forms | |
| `name` / `label` | TEXT | |
| `field_type` | **TEXT NOT NULL** | **sin CHECK / sin enum → acepta `'informative'` SIN SQL** |
| `options` | JSONB | |
| `required` | BOOLEAN default false | |
| `order_index` | INTEGER NOT NULL default 0 | contrato de orden persistido |

Respuestas = **EAV** en `sgc_response_values` (`value_text/value_number/value_boolean/value_json`),
con FK `field_id → sgc_form_fields(id) ON DELETE CASCADE` (sin snapshot de definición).

### 3.2 SSOT de tipos — FRAGMENTADA (hallazgo)

- Union TS `RuntimeFieldType` con escape `| string` (`runtimeContracts.ts:7-18`) — abierta.
- `ComponentRegistry.ts` — 12 renderers (autoridad de dispatch real del runtime moderno).
- `FormBuilder.jsx` — 6 opciones de autoría (`text/textarea/number/boolean/select/signature`).
- `builderAdapter.js:8-14` — whitelist de import que coacciona desconocidos → `text`.

**No existe una autoridad única.** Al añadir `informative` debe tocarse el MISMO punto (union +
builder + registry), prohibido `INFORMATIVE_TYPES` en capas separadas.

### 3.3 Runtime — tipo desconocido

| Camino | Comportamiento |
|--------|----------------|
| Moderno (`DynamicFieldRenderer.tsx:47-55`) | `UnsupportedFieldTypeFallback` → warning div, **0 crash, 0 input** |
| Legacy (`BaseGeneric.jsx:116-125`) | **default → `<input type="text">`** (hoy `informative` renderizaría input) |
| Validación (`fieldRules.ts:42-44`) | `default: return true` — tipos desconocidos aceptados |

### 3.4 Orden — motor agnóstico del tipo

`UniversalOrderMotor` **no referencia `field_type`** (solo `id`/`order`/`operation.type`): un
campo `informative` es otro elemento ordenable sin segundo motor. `order_index` se escribe
solo en `FormBuilderOrderAdapter` y se lee solo en `getFormFields`.

### 3.5 Respuesta operacional — GAP localizado

Hoy el payload de submit incluye **todos** los campos sin filtrar por tipo
(`DynamicForm.jsx:177`, `dynamicService.js:158`). Un `informative` generaría una fila EAV con
`value_text: ''`. **Decisión:** el Sprint 331 debe **excluir** `informative` del payload
(filtro localizado). `required` debe ser `false` (si no, bloquea el submit).

### 3.6 Historial / consulta

`DynamicRecordsView` itera las filas EAV almacenadas + JOIN vivo a `sgc_form_fields` (sin
re-derivar de `getFormFields`, sin snapshot). Un informativo excluido del payload no tendría
fila → no aparecería como dato (correcto: es metadata, se reconstruye de la definición).

### 3.7 Evidence Report — GAP localizado (CRÍTICO)

Pipeline: `evidenceReportModel.js` (0-query, itera **solo** `rec.sgc_response_values`) →
`evidenceReportRenderer.js` (jsPDF + autoTable `Campo/Valor`). Un campo sin fila de respuesta
se **descarta**: hoy un `informative` no aparecería en su posición. `order_index` NO se
consume en el reporte (el orden es el de inserción, coincidencia no contractual).

**Decisión:** el reporte debe usar **field metadata + response** (no response-only) para
colocar informativos en posición. El Sprint 331 extiende el modelo para que, ante un
`informative`, produzca una fila de presentación (label en su posición), **nunca**
`label: —` / `N/A` / `undefined`. Segunda pipeline prohibida.

### 3.8 Excel — política explícita requerida

`exportDataNormalizer` construye columnas **solo** desde filas almacenadas; celdas vacías →
`''`. Decisión: `informative` se **excluye de la tabla de datos de respuestas** (no es fila,
no es columna, no es encabezado). PDF y Excel pueden diferir.

### 3.9 Seguridad

0 `dangerouslySetInnerHTML` en `src`; renderers/reporte/Excel tratan el contenido como
**texto plano** (React escapa; jsPDF dibuja texto; Excel `toString`). `label` de un
informativo es segura por construcción.

## 4. Verdicto de invariantes (§28)

1 un solo modelo de campo PASS · 2 un solo `sgc_form_fields` PASS · 3 un solo `order_index`
PASS · 4 un solo UniversalOrderMotor PASS · 5 identidad preservada PASS · 6 tipos existentes
preservados PASS · 7 informative no genera respuesta (decisión) · 8 informative sin
validación (aceptado por defecto) PASS · 9 participa del orden PASS · 10 persiste como
metadata PASS · 11 sin tabla nueva PASS · 12 sin servicio nuevo PASS · 13 sin segundo
runtime PASS · 14 sin segundo pipeline PASS · 15 sin SQL si esquema lo permite PASS ·
16 legacy compatible PASS · 17 Evidence Report auditable PASS · 18 historial compatible PASS ·
19 Excel evaluado explícitamente PASS · 20 SSOT única (a consolidar) PASS.

## 5. Contrato de implementación para Sprint 331

| Aspecto | Decisión |
|---------|----------|
| UI Label | **Texto informativo** |
| Technical Type | **informative** |
| Behavior | NON-INTERACTIVE (render label, 0 input) |
| Response | NONE (excluir del payload de submit) |
| Required | NOT APPLICABLE / FALSE |
| Ordering | order_index + moveFieldToOrder (sin cambio) |
| Persistence | `sgc_form_fields` (sin SQL) |
| Storage | NONE |
| Runtime | rama localizada en engine legacy + clave en registry |
| Evidence | render metadata en orden canónico (model + response) |
| Excel | política explícita (excluir de tabla de respuestas) |

Contrato conceptual:

```js
{ id, label: "FILTRO SANITARIO", type: "informative", required: false, order }
```

NO response · NO validation · NO required interaction · NO user input · NO observation.

## 6. Reglas negativas

**SECOND PIPELINE FORBIDDEN.** Prohibido: `sgc_form_display_fields` / `sgc_form_sections` /
`sgc_form_instructions` / `sgc_form_text_blocks` / `form_descriptions` / `display_fields` /
`informative_fields` como tablas; `InformativeFieldService` / `DisplayFieldService` /
`FormPresentationService` / `FormSectionService`; segunda tabla, segundo runtime, segundo
motor, segundo persistence path, segundo ordering engine; múltiples tipos para título/
descripción/instrucción/separador (mínima semántica: `informative`).

## 7. Veredicto

```
FIELD MODEL                  PASS
FIELD TYPE SSOT              PASS (fragmentada — a consolidar)
PERSISTENCE                  PASS
ORDER CONTRACT               PASS
RUNTIME                      PASS
VALIDATION                   PASS
RESPONSE SEPARATION          GAP (exclusión localizada en 331)
HISTORY / QUERY              PASS
EVIDENCE REPORT              GAP (metadata + response en 331)
EXCEL                        PASS (política explícita)
LEGACY COMPATIBILITY         PASS
NO NEW TABLE                 PASS
NO NEW SERVICE               PASS
NO SECOND RUNTIME            PASS
NO SECOND ORDER ENGINE       PASS
NO SECOND STORAGE PIPELINE   PASS
SECURITY                     PASS
SCOPE                        PASS (AUDIT ONLY)
BUILD                        PASS

FINAL CLASSIFICATION: CONTROLLED METADATA EXTENSION
STATUS: CERTIFIED (117/117 · 4.1s)
```