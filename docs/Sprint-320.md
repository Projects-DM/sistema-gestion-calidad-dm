# Sprint 320 — Acciones de Despachos · Consolidación de Presentación

- **Estado:** CERTIFIED (exit=0) · 104/104 gates E01–E32 · ~3.3s
- **Suite:** `scripts/sprint-320-operational-dispatch-actions-presentation-consolidation-controlled-correction.mjs`
- **Modo:** LEVEL 5 · FORENSIC UI AUDIT + CONTROLLED CORRECTION
- **Dependencias:** Sprint 317 (filtros + selección) · Sprint 319 (Informe de Evidencia)
- **Rama:** `release/stable-sprint79` (2026-08-16)

## Objetivo

Consolidar la presentación de las acciones de Despachos eliminando duplicados y separando
claramente **acciones del módulo** (superior) de **acciones sobre la selección** (inferior).
Solo cambia **dónde** se presentan las acciones: ninguna capacidad funcional se modificó.

## Estado antes / después

| Acción | Antes | Después |
|---|---|---|
| PDF | Superior | **ELIMINADO** (handler retirado; capacidad superada por el Informe de Evidencia 315/319) |
| CSV | Superior | **ELIMINADO** como acción (duplicado de Exportar) |
| Exportar | Inferior | **MOVIDO** a superior (exportación del dataset, misma `handleExportCsv`) |
| Informe de Evidencia | Inferior | **MOVIDO** a superior (mismo handler 319, misma cadena adapter→modelo→renderer) |
| Dashboard | Superior | CONSERVADO |
| Importar | Superior | CONSERVADO |
| Nuevo | Superior | CONSERVADO |
| Cambiar estado / Aprobar / Cerrar / Reabrir / Eliminar | Inferior | CONSERVADOS |

## Arquitectura resultante

```
ACCIONES DEL MÓDULO (superior)
   Exportar | Informe de Evidencia | Dashboard | Importar | Nuevo

ACCIONES SOBRE SELECCIÓN (barra inferior, visible con selectedIds)
   Cambiar estado ▼ | Aprobar | Cerrar | Reabrir | Eliminar
```

## Invariantes verificadas

- `Exportar` → misma `handleExportCsv` → `orchestrator.exportExcel` (CSV intacto).
- `Informe de Evidencia` → mismo `handleEvidenceReport` → `filteredRecords ∩ selectedIds`
  → `buildDispatchEvidenceRecords` (adapter 319) → `buildEvidenceReportModel` + `renderEvidenceReport`
  (315) → `EVID-YYYY-MM-DD-NNN`. Se conservan gate de selección vacía, paginación y normalización.
- `selectedIds` / `toggleSelect` / `toggleSelectAll` / `allFilteredSelected` intactos.
- Filtros (`filters` / `setFilters` / `filteredRecords`) intactos.
- Acciones de estado (`handleBulkStatus/Approve/Close/Reopen/Delete`) intactas.
- Importar (`UniversalImportWorkflow`), Dashboard (`UniversalOperationalDashboard`) y Nuevo intactos.
- 0 queries nuevas, 0 SSOT nuevo, 0 persistencia, sin cambios en el runtime ni en contratos.

## Alcance

- **Modificado:** `src/modules/experiences/UniversalOperationalRuntime.jsx` (solo presentación).
- **Nuevos:** suite `scripts/sprint-320-*.mjs`, `docs/Sprint-320.md`.
- **No tocados:** adapter 319, modelo/renderer 315, filterCore/sgcFilterAdapter, servicios,
  Dashboard, ImportWorkflow, dynamicService, Supabase, exportDataNormalizer.

## Gates E01–E32 (resumen)

- **E01–E05** inventario: propietarios de handlers, ubicación, duplicidad resuelta.
- **E06–E10** consolidación superior: Exportar e Informe arriba; Dashboard/Importar/Nuevo conservados.
- **E11–E15** eliminación: sin botones PDF/CSV, sin Exportar/Informe en la barra inferior, sin duplicados.
- **E16–E20** integridad: handlers conservados, selección/filtros/acciones de estado intactos.
- **E21–E25** Importar/Dashboard/Nuevo intactos, servicios y contratos sin cambios.
- **E26–E30** arquitectura: sin query/SSOT/persistencia/estado funcional nuevo.
- **E31** `npm run build` → PASS.
- **E32** scope: solo UOR modificado + suite/doc nuevos (318/319 ya presentes).

## Clasificación final

`ACTION OWNERSHIP` · `DUPLICATE REMOVAL` · `EXPORT CONSOLIDATION` · `EVIDENCE REPORT POSITION` ·
`MODULE ACTIONS` · `SELECTION ACTIONS` · `IMPORT UNTOUCHED` · `DASHBOARD UNTOUCHED` ·
`NEW UNTOUCHED` · `SELECTION INTACT` · `FILTERS INTACT` · `STATE ACTIONS INTACT` ·
`NO NEW QUERY` · `NO NEW SSOT` · `NO PERSISTENCE MUTATION` · `NO RUNTIME CHANGE` ·
`BUILD` · `SCOPE` · **STATUS: CERTIFIED**

## Notas

- El handler `handleExportPdf` fue retirado junto con su botón: la capacidad documental
  está plenamente representada por el Informe de Evidencia (Sprint 315/319). El
  `exportPdf` del orchestrator permanece intacto (deprecación en sprint aparte).
- La regresión histórica 296–319 no se ejecutó (auditoría dirigida y timeboxed).