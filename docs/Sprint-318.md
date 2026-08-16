# Sprint 318 — Operational Dispatch Evidence Report · Export Architecture Forensic Audit

Rama: `release/stable-sprint79` · Fecha: 2026-08-16
Modo: **AUDIT ONLY · LEVEL 5 · FORENSIC CERTIFICATION** · Estado: **CERTIFIED** (131/131, exit 0, ~3.5s)

## Objetivo
Auditar la capacidad de exportación de `Configuración → Experiencias Operacionales → Despachos`
para certificar si puede converger en el **Informe de Evidencia de Registros** (Sprint 315) mediante un
**adaptador reutilizable**, sin crear una segunda fuente de verdad ni tocar importación/Dashboard/runtime.

NO se implementó nada. Suite read-only: `scripts/sprint-318-operational-dispatch-evidence-report-export-forensic-audit.mjs`.

## Pregunta forense principal → YES (con evidencia ejecutable)
> ¿La arquitectura operacional de Despachos contiene información estructurada, identificable y trazable
> para generar el mismo Informe de Evidencia de Registros mediante un adaptador reutilizable, sin crear
> una segunda fuente de verdad ni modificar importación, Dashboard o runtime?

**SÍ.** Despachos posee identidad canónica (`id` uuid + `displayId` `DESP-xxxx`), inventario de campos
declarado en el registry (`tableFields` 12 + `canonicalFields` 14), pipeline de filtros y selección única,
y una exportación CSV íntegra. El modelo 315 se demuestra alimentable con una **transformación mínima**
(`DispatchEvidenceAdapter` → `sgc_response_values`), sin tocar `EvidenceReportModel` ni el renderer.

## Pipeline reconstruido (propietario real de cada etapa)
```
DynamicModule
  -> OperationalExperienceRegistry.resolveComponent('dispatches')     [DynamicModule.jsx:250]
  -> UniversalOperationalRuntime                                      [UOR]
  -> OperationalExperienceLifecycleOrchestrator.loadRecords()         [orchestrator:49]
  -> createOperationalRecordsService('despachos').fetch()             [operationalRecordsService:64]
       .from('despachos').select('*').order('created_at' DESC)
  -> filteredRecords  (view -> search -> filters exactos)             [UOR:444]
  -> selectedIds (Set único)                                          [UOR:77]
  -> Export Layer { CSV | PDF }                                       [orchestrator exportPdf/exportExcel]
```
`src/services/despachosService.js` (`rowToUi`/`fetchDespachos`/CRUD) es **código muerto**: 0 importadores.
La fuente real es `operationalRecordsService`.

## Hallazgos clave (evidencia ejecutable)
- **Identidad**: `id` (uuid PK) canónico; `displayId` derivado (`DESP-<8>`). Exportación keyed por `id`
  (`key={record.id}`), NUNCA por fecha/cliente/producto/lote. `A.id !== B.id` verificado.
- **Inventario**: `tableFields` = fecha, hora, cliente, producto, lote, cantidad, peso, temperatura,
  destino, placa, conductor, estado (12). `canonicalFields` añade observaciones + signature_estado (14).
  `fieldMapping: { cantidad -> cantidad_bolsas }`.
- **CSV**: header = **ALL records**; bulk "Exportar" = **SELECTED records**; columnas = `tableFields`;
  BOM `\uFEFF`; escape `""`; sin `.sort()`; orden de entrada preservado; integridad verificada en runtime.
- **Filtros**: pipeline `view -> search -> filters exactos` = patrón 316/317 **compatible**, pero la
  implementación es **DUPLICATED** (inline en UOR, no consume `filterCore`). Único `.sort()` = `getUniqueValues`.
- **Selección**: `Set` único; select-all sobre `filteredRecords`; persiste al cambiar búsqueda/filtros;
  reset solo al cambiar vista. **SELECT ≠ VERIFY**: checkboxes sin gate de permisos de verificación.
- **PDF roto — DOBLE CAUSA RAÍZ** en `orchestrator.exportPdf`:
  1. **IMPORT**: `const { default: jsPDF } = await import('jspdf')` → en jsPDF v3 el `default` es un objeto,
     no el constructor → `new jsPDF()` lanza `TypeError: jsPDF is not a constructor` (reproducido en Node).
  2. **DEPENDENCY/LIBRARY**: `const mod = await import('jspdf-autotable')` nunca se aplica; `doc.autoTable`
     (API v2) no existe en jsPDF v3 (verificado incluso con la clase correcta `{ jsPDF }`).
  El catch muestra "No se pudo generar el PDF." → el usuario ve "No puede generar PDF".
  `src/utils/dispatchesPdf.js` (implementación v3 correcta con `autoTable(doc, {...})`) existe pero es **código muerto**.
- **Modelo 315**: espera `sgc_response_values` + `sgc_form_fields`, `sgc_forms`, `profiles`, `sgc_evidences`,
  `status`, `computedStatus`. Los registros de Despachos son planos → **REUSE + ADAPTER** (no directo).
  El suite demuestra en runtime la transformación mínima → modelo (totalRecords, moduleName, forms) → renderer
  genera PDF paginado en Node (≥1 página). Sin incompatibilidad que exija un nuevo modelo.
- **Firma**: `signature_estado = pending | signed` (enum). NO posee URL/imagen de firma → se presentará como
  campo, NO como enlace "Ver Firma". No se crea almacenamiento nuevo.
- **Evidencia**: sin mecanismo en registros de Despachos; el renderer maneja arrays vacíos (evidencias = []).
- **Importación y Dashboard**: `UNTOUCHED`. La importación sigue vía `orchestrator.importRecords`; el
  Dashboard es un componente separado (`UniversalOperationalDashboard`) con su propio servicio.

## Regla de reutilización (§4)
| Capacidad | Clasificación |
|---|---|
| Fuente de datos | REUSE DIRECT (`operationalRecordsService`) |
| Filtros | REUSE + EXTENSION (patrón compatible; DUPLICATED inline → migrar al Filter Core en 319) |
| Selección | REUSE DIRECT (Set único, `records.filter(selectedIds)`) |
| Normalización | REUSE + ADAPTER (`exportDataNormalizer`/`normalizeValue` vía adapter) |
| Modelo documental | REUSE DIRECT (`EvidenceReportModel` sin cambios) |
| Renderer | REUSE DIRECT (`EvidenceReportRenderer` sin cambios) |
| CSV | REUSE DIRECT (salida técnica; se conserva) |
| PDF antiguo (orchestrator) | NO REUTILIZAR (defectuoso); la capacidad profesional es el renderer 315 |
| Firma / Evidencia | NOT REQUIRED (no existe mecanismo; no se crea almacenamiento) |

## Arquitectura mínima autorizada para Sprint 319
```
Despachos -> filteredRecords -> selectedRecords
  -> DispatchEvidenceAdapter (nuevo, src/shared/filters o src/shared/report)
  -> EvidenceReportModel (315) -> EvidenceReportRenderer (315)
  -> Informe de Evidencia de Registros
```
No se crea otro renderer/modelo/consulta/almacenamiento. CSV se conserva (interoperabilidad técnica).

## Clasificación final §30
```
DATA SOURCE            PASS     CSV CAPABILITY          PASS
RECORD IDENTITY        PASS     CSV INTEGRITY           PASS
FIELD INVENTORY        PASS     FILTER COMPATIBILITY    PASS
DATA COMPLETENESS      PASS     SELECTION COMPATIBILITY PASS
PDF ROOT CAUSE         PASS     REPORT RENDERER COMPAT  PASS
REPORT MODEL COMPAT    PASS     SIGNATURE               PASS
EVIDENCE               PASS     REUSE ARCHITECTURE      PASS
NO NEW QUERY           PASS     NO NEW SSOT             PASS
NO PERSISTENCE CHANGE  PASS     IMPORT UNTOUCHED        PASS
DASHBOARD UNTOUCHED    PASS     SCOPE                   PASS
BUILD                  PASS
STATUS: CERTIFIED
```

## Build y Scope
- `npm run build` → `✓ built` (PASS, sin regresión histórica).
- `git status --short src/` → **CLEAN** (entregables 316/317 ya commiteados en `f6615a7`).
- Únicos artefactos del sprint: `scripts/sprint-318-*.mjs` y este documento.

## Principio establecido (§35)
Toda nueva exportación debe seguir: ¿existe motor? → ¿contrato? → ¿normalizador? → ¿modelo documental? →
¿renderer? → **ADAPTAR** → extender solo con evidencia → crear algo nuevo solo con incompatibilidad certificada.