# Sprint 319 — Informe de Evidencia de Despachos (Integración Controlada)

- **Estado:** CERTIFIED (exit=0) · 163/163 gates E01–E38 · 3.5s
- **Suite:** `scripts/sprint-319-operational-dispatch-evidence-report-controlled-integration.mjs`
- **Base:** Informe de Evidencia de Registros certificado en Sprint 315 (mismo modelo y renderer).
- **Precedentes:** Sprint 316 (filtros), Sprint 317 (filterCore + selección), Sprint 318 (auditoría forense de exportación Despachos, causa raíz del PDF roto).

## Objetivo

Integrar la experiencia **Despachos** con el Informe de Evidencia de Registros (Sprint 315)
sin nueva consulta, sin nuevo SSOT y sin persistencia: un **adapter puro** convierte los
registros ya cargados en memoria al contrato documental, y el modelo + renderer 315 generan
el PDF. El antiguo PDF del orchestrator (`exportPdf`) **no se repara ni se usa**.

## Cadena certificada

```
records (operationalRecordsService)
  → filteredRecords (filtros UOR)
    → selectedIds (Set de la barra de selección)
      → selectedRecords = filteredRecords.filter(r => selectedIds.has(r.id))
        → DispatchEvidenceAdapter (buildDispatchEvidenceRecords)
          → EvidenceReportModel (315)  →  EvidenceReportRenderer (315)  →  PDF
```

## Archivos

| Archivo | Cambio |
|---|---|
| `src/shared/report/dispatchEvidenceAdapter.js` | **NUEVO** — adapter puro |
| `src/modules/experiences/UniversalOperationalRuntime.jsx` | **M** — imports, `reportSequenceRef`, handler `handleEvidenceReport`, botón "Informe de Evidencia" |
| `scripts/sprint-319-*.mjs` | suite de certificación |
| `docs/Sprint-319.md` | este documento |

Prohibidos sin cambios y verificados intactos: `evidenceReportModel`, `evidenceReportRenderer`,
`exportDataNormalizer`, `OperationalExperienceLifecycleOrchestrator`, `UniversalOperationalDashboard`,
`UniversalImportWorkflow`, `operationalRecordsService`, `despachosService`, `dispatchesPdf`,
`dynamicService`, Supabase.

## Adapter (`dispatchEvidenceAdapter.js`)

- `DISPATCH_FORM_NAME = 'Despacho'` · `DISPATCH_FIELD_DEFS` = 14 campos canónicos (inventario 318):
  fecha, hora, cliente, producto, lote, cantidad, peso, temperatura, destino, placa, conductor,
  estado, observaciones, `signature_estado`.
- `buildDispatchEvidenceRecord(record)` → contrato del modelo 315 (`id`, `displayId`, `status`,
  `created_at`, `sgc_forms`, `profiles`, `sgc_evidences: []`, `sgc_response_values` con
  `value_text/value_number/value_boolean/value_json` + `sgc_form_fields`).
- `signature_estado` (pending/signed) es un **campo documental normal** (tipo text), nunca una
  firma con href; `evidences = []` (Despachos no tiene sgc_evidences; el renderer maneja vacío).
- **Puro**: sin `fetch`, `supabase`, `.from()`, `.select()`, `getModuleResponses`, `localStorage`,
  `sessionStorage`, `IndexedDB`, `insert/update/delete/upsert`, sin `sort` (preserva orden).

## Integración (UniversalOperationalRuntime)

- Botón **"Informe de Evidencia"** en la barra de acciones masivas (visible solo con selección),
  con el mismo lenguaje visual de la experiencia (icono `FileText`).
- `handleEvidenceReport` (tras `handleExportCsv`):
  - Gate: si `selectedRecords.length === 0` → banner "Seleccione al menos un registro para generar el informe."
  - `selectedRecords = filteredRecords.filter(r => selectedIds.has(r.id))`.
  - `reportSequenceRef.current += 1` → secuencia documental.
  - `buildEvidenceReportModel({ registros: buildDispatchEvidenceRecords(selectedRecords), moduleId, moduleName, documentSequence })` → `renderEvidenceReport({ model })` → nombre vía `buildExportFileName` → `doc.save`.
  - `catch` → banner de error (JS/PDF), sin romper el runtime.
- `documentId` = `EVID-YYYY-MM-DD-NNN` (pertenece al informe; ≠ `record.id`).

## Gates E01–E38 (resumen)

- **E01–E07** adapter existe, puro, contrato, identidad (`A.id !== B.id`), displayId, inventario 14, completitud.
- **E08–E12** fecha/hora/estado/signature/evidencias (vacíos seguros).
- **E13–E18** multi-registro, orden, filteredRecords, selección única reutilizada (`selectedIds`), casos B/C/D.
- **E19** gate de selección vacía con indicación clara.
- **E20** formato `EVID-YYYY-MM-DD-NNN` y separación del record id.
- **E21–E22** modelo y renderer 315 reutilizados (imports + invocación).
- **E23–E26** PDF real: cabecera `%PDF`, tamaño, contenido (org, módulo, form, lotes, placas, conductor, estado, labels, paginación `Página X de Y`).
- **E27** sin pérdida de datos (14 campos → tabla).
- **E28–E30** 0 queries, 0 SSOT, 0 mutación de persistencia.
- **E31–E34** CSV/XLSX intactos, import intacto, dashboard intacto, PDF antiguo no usado.
- **E35** compatibilidad de normalización (misma lógica `exportDataNormalizer`).
- **E36** `npm run build` → PASS.
- **E37** scope: solo UOR (M) + adapter (nuevo) + suite/doc.
- **E38** runtime end-to-end con los casos §29 (A=1, B=5+, C=dataset>filtered, D=10→3 exactos, E=identidad diferenciada).

## Clasificación §34

`DATA SOURCE (E03)` · `ADAPTER (E01,E02)` · `RECORD IDENTITY (E04)` · `FIELD COMPLETENESS (E06,E07)` ·
`SELECTION REUSE (E16,E17,E18)` · `FILTER COMPATIBILITY (E15)` · `MULTI-RECORD (E13)` ·
`ORDER PRESERVATION (E14)` · `DOCUMENT MODEL REUSE (E21)` · `RENDERER REUSE (E22)` ·
`PDF GENERATION (E23)` · `PDF CONTENT (E24)` · `PAGINATION (E25)` · `PAGE NUMBERING (E26)` ·
`NO DATA LOSS (E27)` · `NO NEW QUERY (E28)` · `NO NEW SSOT (E29)` · `NO PERSISTENCE MUTATION (E30)` ·
`CSV PRESERVED (E31)` · `IMPORT UNTOUCHED (E32)` · `DASHBOARD UNTOUCHED (E33)` · `OLD PDF NOT USED (E34)` ·
`BUILD (E36)` · `TARGETED REGRESSION (E12,E20,E35,E38)` · `SCOPE (E37)` · **STATUS: CERTIFIED**

## Notas

- Se usó el patrón de **adapter-first**: el modelo/renderer 315 no se modificaron; solo si se
  detectara una incompatibilidad certificada se extenderían (no fue el caso).
- La deprecación del PDF antiguo del orchestrator es un sprint aparte.
- No se ejecutó la regresión histórica 296–318 (regresión dirigida únicamente, timebox ~3.5s).
