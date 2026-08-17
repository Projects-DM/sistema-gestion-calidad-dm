# Sprint 332 — Evidence Report Field Projection · Forensic Integration Audit

**Rama:** release/stable-sprint79
**Modo:** AUDIT ONLY · LEVEL 5 · FORENSIC DISCREPANCY AUDIT
**Precedente:** Sprint 331 — Informative Display Field · Controlled Runtime & Evidence Integration
**Dependencias:** Sprint 328 (Explicit Field Ordering) · Sprint 330 (Informative Display Field Audit) · Sprint 331 (Informative Integration)
**Evidencia:** `CALIDAD_DEL_AGUA_2026-08-17_13-14.pdf` (DATOS DEL REGISTRO sin valores Campo/Valor; texto informativo desbordado)
**Suite:** `scripts/sprint-332-evidence-report-field-projection-forensic-audit.mjs`
**Resultado:** **CERTIFIED** 76/76 (E01–E80 + casos A–T) · 0.1s · exit=0 · timebox OK
**Regresión histórica:** NO ejecutada (auditoría dirigida).
**Cambios src/:** **0** (AUDIT ONLY) · **SQL:** 0 · **Dependencias:** 0 · **Servicios/modelos nuevos:** 0
**Clasificación final:** **CONTROLLED CORRECTION REQUIRED** — el defecto está localizado dentro del pipeline existente; **NO es un ARCHITECTURAL GAP**.

---

## 1. Pregunta forense

> ¿Dónde se rompe la cadena entre `sgc_response_values` + metadata de `sgc_form_fields`
> y la representación final del Evidence Report?

**Respuesta certificada — punto exacto de pérdida:** `src/shared/report/evidenceReportModel.js:87`

```js
valueByField.set(field.id, { val, field });
```

El merge del Sprint 331 indexa las respuestas por `field.id` (el `id` del campo dentro del join),
pero **la proyección de la consulta NO trae ese `id`**:

- `dynamicService.getModuleResponses` (`src/services/dynamicService.js:384`):
  `sgc_response_values ( field_id, value_text, value_number, value_boolean, value_json, sgc_form_fields ( label, field_type, options ) )` → el join solo proyecta `label, field_type, options`.
- `dispatchEvidenceAdapter.buildDispatchEvidenceRecord` (`src/shared/report/dispatchEvidenceAdapter.js:52`):
  `sgc_form_fields: { label, field_type: type, options: {} }` → tampoco trae `id`.

**Consecuencia mecánica (reproducida por la suite):**

1. `field.id` es `undefined` para **todas** las respuestas no-firma → el `Map` guarda **una sola** entrada bajo la clave `undefined` (colapso a 1).
2. Ruta con skeleton (Historial/Consulta, `DynamicRecordsView`): `valueByField.get(skeletonField.id)` con uuid real → `miss` → **todas las filas de respuesta se descartan** → en `DATOS DEL REGISTRO` solo quedan las bandas informativas.
3. Ruta fallback (Despachos, `UniversalOperationalRuntime`): `.values()` devuelve la **única** entrada colapsada → solo aparece la **última** respuesta.

**La clave de corrección existe y está proyectada:** `field_id` SÍ viaja en cada `sgc_response_values`. El merge correcto es `field_id` ↔ `field.id` del skeleton. Corrección localizada al modelo — sin arquitectura nueva.

## 2. Principio rector

**ONE FORM DEFINITION · ONE RESPONSE CONTRACT · ONE EVIDENCE MODEL · ONE PDF RENDERER · ONE CANONICAL ORDER.**

## 3. Trazabilidad del valor por etapa (PRESENT / ABSENT / TRANSFORMED / DROPPED)

| Etapa | text | textarea | number | boolean | select | signature | informative |
|-------|------|----------|--------|---------|--------|-----------|-------------|
| DB → query (`getModuleResponses`) | PRESENT (`value_text`) | PRESENT (`value_text`) | PRESENT (`value_number`) | PRESENT (`value_boolean`) | PRESENT (`value_text`/`value_json`) | PRESENT (canal previo) | — (no responde) |
| record object → `sgc_response_values` | PRESENT | PRESENT | PRESENT | PRESENT | PRESENT | PRESENT | ABSENT (sin row) |
| `sgc_response_values` → EvidenceReportModel | PRESENT (itera el array) | PRESENT | PRESENT | PRESENT | PRESENT | PRESENT | N/A |
| Model merge (`valueByField.set(field.id)`) | **DROPPED** | **DROPPED** | **DROPPED** | **DROPPED** | **DROPPED** | PRESERVED | — |
| normalized field/value | — | — | — | — | — | — | PRESENT (metadata only) |
| EvidenceReportRenderer → PDF | ABSENT | ABSENT | ABSENT | ABSENT | ABSENT | PRESENT (href) | PRESENT (banda, layout defect) |

**Conclusión por tipo:** el patrón `text/textarea/number/boolean/select → perdido; signature → funciona; informative → mal layout` demuestra que **no es un fallo por tipo**, sino de la **ruta común de proyección de respuestas** (una sola clave `field_id`).

## 4. Defecto de layout del informative (separado de la proyección)

`src/shared/report/evidenceReportRenderer.js:281` dibuja la banda informativa como:

```js
doc.text(f.label, MARGIN_X + 8, y + 13);
```

- **Sin política de wrapping**: no usa `splitTextToSize` (contraste con `kv()`, líneas 62–63, que sí lo usa con `CONTENT_W - labelWidth - 8`).
- **Altura fija** de 20pt (`doc.rect(..., 20, 'F')`): no crece con el contenido.
- **Consecuencia**: un informative largo se desborda horizontalmente más allá de `CONTENT_W` y puede superponerse a la siguiente sección (síntoma observado: `asdassssssssssssssssssssss...`).

**Regla esperada (aplicable en la corrección posterior):** DISPLAY BLOCK con wrapping — texto limitado a `CONTENT_W - 16` y altura de banda calculada según las líneas envueltas. Prohibido arreglarlo reduciendo el tamaño de fuente.

## 5. Lo que la auditoría certificó como PRESERVADO

| Componente | Estado | Evidencia |
|------------|--------|-----------|
| Cabecera / contexto / información del registro | PASS | renderer 315/331 intacto |
| Firma digital | PRESERVED | canal previo al Map (`evidenceReportModel.js:70-85`) |
| informative (presentación) | PRESENT | metadata only, `value: ''`, `presentation: true` |
| Orden canónico | PRESERVED | `getFormFields` → `.order('order_index')`; el orden NUNCA se reconstruye desde `response_values` |
| Excel (aislamiento) | PRESERVED | `exportDataNormalizer` usa `field.label` del join (SÍ proyectado); informative excluido en los 3 pases; signature/evidencia intactos |
| Un solo modelo / un solo renderer | PRESERVED | 2 callers (`DynamicRecordsView` + `UniversalOperationalRuntime`), sin servicios nuevos |
| Runtime de captura / DynamicForm / motor de orden / pipeline de firma | NO TOCADOS | git scope 332 = 0 cambios src |

## 6. Prohibiciones respetadas

0 consultas nuevas · 0 segundo modelo de respuestas · 0 `InformativeReportService` · 0 `EvidenceFieldService` · 0 snapshot de campos · 0 cambio en `sgc_form_fields`/schema · 0 tabla nueva · 0 alteración del runtime de captura/DynamicForm/motor de orden/pipeline de firma · 0 segundo renderer PDF · 0 datos hardcodeados.

## 7. Resultado de la suite

- **E01–E10** — scope (0 cambios src en 332) + claves de proyección del join (sin `id`, con `field_id`).
- **E11–E25** — reproducción runtime del defecto (skeleton → 0 filas; fallback → colapso a 1; firma preservada; patrón multi-tipo).
- **E26–E40** — trazabilidad por etapa (DB → query → record → modelo → renderer).
- **E41–E55** — layout informative: 0 `splitTextToSize` en la banda, altura fija, contraste con `kv()`.
- **E56–E70** — orden canónico por `order_index`; informativos en posiciones exactas; regresión legacy.
- **E71–E80** — aislamiento Excel; prohibiciones; 2 callers únicos.
- **Casos A–T** — todos los tipos, legacy, mixed, multiple records, no-response, informative + respuesta artificial, sin duplicados de firma.

## 8. Corrección autorizada para el siguiente sprint (Sprint 333)

Localizada y acotada al **Evidence Report Model** (y, en su caso, al adapter de despachos si se decide inyectar `field_id`):

1. **Merge por `field_id`** en `buildRecord`: indexar con `val.field_id` y resolver contra `field.id` del skeleton. Debe preservarse el caso de firma (canal previo).
2. **Ruta fallback (despachos)**: restaurar el comportamiento previo (iterar `sgc_response_values` directamente) o garantizar `field_id` en el adapter — sin colapso a 1 fila.
3. **Política de wrapping** en la banda informativa del renderer: `splitTextToSize(f.label, CONTENT_W - 16)` + altura de banda por líneas (DISPLAY BLOCK), sin reducir fuente.
4. **Compatibilidad**: formulario legacy (sin informative), formulario nuevo (con informative) y mixto deben producir un informe válido.

**Regla:** no se crea una segunda consulta, ni un segundo modelo, ni un nuevo servicio.

## 9. Veredicto

```
EVIDENCE REPORT GENERATION       PASS
REPORT HEADER                    PASS
REPORT CONTEXT                   PASS
RECORD METADATA                  PASS
FIELD VALUE PROJECTION           DISCREPANCY (LOCALIZED — evidenceReportModel.js:87)
TEXT/TEXTAREA/NUMBER/BOOLEAN/SEL  DROPPED (join sin id; field_id disponible)
SIGNATURE PROJECTION             PRESERVED
INFORMATIVE PROJECTION           PRESENT
INFORMATIVE LAYOUT               DISCREPANCY (sin wrap — renderer.js:281)
CANONICAL ORDER                  PRESERVED (order_index)
RESPONSE/METADATA MERGE          DROPPED (key field.id)
LEGACY COMPATIBILITY             DISCREPANCY (regresión a corregir)
EXCEL ISOLATION                  PRESERVED
SECOND PIPELINE                  NONE
NEW MODEL / TABLE / SERVICE      NONE
SRC CHANGES (332)                0

FINAL CLASSIFICATION: CONTROLLED CORRECTION REQUIRED
```

**Estado:** AUDIT ONLY completada. Sprint 333 autorizado para la *Controlled Correction* del Evidence Report (merge `field_id` ↔ `id` + política de wrapping del informative), sin tocar arquitectura.