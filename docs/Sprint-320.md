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

---

# Forensic Architecture Audit — Status Actions & Dashboard State Controls (AUDIT ONLY)

- **Estado:** CERTIFIED (exit=0) · 108/108 gates E01–E30 · ~3.2s · timebox <60s OK
- **Suite:** `scripts/sprint-320-operational-status-actions-dashboard-state-forensic-audit.mjs`
- **Modo:** AUDIT ONLY · 0 cambios en `src/` (E30 verificado vía git)
- **Pregunta forense:** ¿las acciones de estado, vistas operacionales e indicadores ya poseen
  una arquitectura funcional reutilizable, restaurable sin segunda fuente de verdad ni alterar
  el pipeline certificado de Despachos?
- **Clasificación de la pregunta forense: YES** (los mecanismos existen, están conectados y se
  derivan de una única fuente: `records`).

## Mapa forense

```
              SPRINT 320 — FORENSIC ARCHITECTURE MAP
                    │
   ┌────────────────┼────────────────┐
   ▼                ▼                ▼
 STATUS         VIEWS             METRICS
 ACTIONS     + FILTERS          + DASHBOARD
   │                │                │
   └────────────────┼────────────────┘
                    ▼
              SINGLE SOURCE (records)
                    │
                    ▼
         SPRINT 321 — CONTROLLED CORRECTION
```

## Hallazgos por dominio

### Status Actions (AUDITED) — E01, E03–E09

Las cinco acciones **existen y están conectadas** (no fueron eliminadas ni desconectadas):

| Acción | Owner (UOR) | Orchestrator | Estado destino | Precondición |
|---|---|---|---|---|
| Cambiar estado | `handleBulkStatus` | `bulkUpdateStatus` | `pendiente/en_proceso/completado` (validado) | `selectedIds.size > 0` |
| Aprobar | `handleBulkApprove` | `approveRecords` | `approved` | `canApprove` = readiness `validated/ready` (score 100) |
| Cerrar | `handleBulkClose` | `closeRecords` | `cerrado` | `canClose` = estado `approved` |
| Reabrir | `handleBulkReopen` | `reopenRecords` | `en_proceso` | `canReopen` = estado `cerrado`/`approved` |
| Eliminar | `handleBulkDelete` | `bulkDelete` | **HARD DELETE** (`service.deleteBatch` → `supabase.delete`) | confirmación + selección |

- Persistencia: `service.updateBatch(ids, { estado })` (Supabase) para transiciones; `deleteBatch` para eliminar.
- Refresco: `setRecords(prev => prev.map(...))` con los registros devueltos por el service; la selección se limpia tras cada acción.
- Auditoría: `OperationalAuditService.auditBatchUpdate` + `OperationalEventBus` (ej. `RECORDS_APPROVED`, `RESOURCE_COMPLETED` en `completado` — Sprint 257).
- **Máquina de estados real:** `pendiente → approved (approve, requiere score 100) → cerrado (close) → en_proceso (reopen)`; el dropdown permite fijar libremente `pendiente/en_proceso/completado`. `getReadinessState` solo reconoce `cerrado`/`approved`/`ready` como terminales (Sprint 132.1).

### Selection (AUDITED) — E02, E10, E11

- `selectedIds` (Set) es **la única selección**; `toggleSelect`/`toggleSelectAll`/`allFilteredSelected` intactos.
- `selectedRecords = filteredRecords ∩ selectedIds` — usada por Exportar, Informe de Evidencia y acciones operacionales.
- **Sin** `selectedOperationalIds`/`selectedExportIds`/`selectedReportIds` (una sola selección, §17).

### Operational View (AUDITED) — E13–E16

- **El selector SÍ funciona**: `activeView` (`'all'` default) → `<select onChange>` (línea ~706) →
  `setActiveView` + limpia filtros + limpia selección → `filteredRecords` aplica `viewFilters[activeView]` primero.
- Opciones (`views`, 13) definidas **inline en UOR** (no en el Registry): all, pending, inProcess, completed,
  draft, pendingCompletion, inconsistent, duplicates, readyToClose, approved, closed, withObservations, importedToday.
- Conteos por vista: `viewCounts` = `records.filter(viewFilters[key])`.
- **Respuesta a la pregunta crítica (§8):** la vista NO perdió su conexión visual; es funcional.
  El único salto pendiente: los indicadores superiores no son clicables como cambio de vista.

### Filters (AUDITED) — E17, E18

- Pipeline certificado y operativo: `records → viewFilters[activeView] → searchTerm → filters → filteredRecords`.
- Despachos usa filtros **inline** (patrón compatible con filterCore/sgcFilterAdapter de Sprint 317, no unificado — Sprint 318 ya lo documentó). Convergencia posible sin duplicación.

### Metrics (AUDITED) — E19–E24

| Indicador | Fuente real |
|---|---|
| Total | `records.length` |
| Pendientes | `records.filter(estado==='pendiente' || !estado)` |
| En proceso | `records.filter(estado==='en_proceso')` |
| Completados | `records.filter(estado==='completado' || estado==='cerrado')` |
| Alertas | `filteredRecords.filter(inconsistencias || duplicados)` |

- **0 queries** por indicador: todos derivan de `records` en memoria (cumple §10).
- **Disparidad encontrada:** Alertas usa `filteredRecords` (view-scoped); los demás usan `records`.
  Es la única métrica cuyo valor depende de la vista activa — a estandarizar en Sprint 321.
- Los indicadores NO están vinculados a `activeView` (no clicables).

### Dashboard (AUDITED) — E25

- `UniversalOperationalDashboard` consulta su **propio** `service.fetch()` (misma tabla) + timeline de auditoría al abrir el modal.
- Métricas independientes (tabs operacional/compliance/auditoría) derivadas de su copia local — dos rutas de cálculo sobre **la misma fuente** (tabla `despachos`), sin duplicación de queries por indicador.
- No modificado (E30).

### Documental/Exportación (PRESERVED) — E12

- Exportar (CSV) e Informe de Evidencia son **documentación**, no acciones de estado: no tocan `updateBatch`/estado.
- Cadena 319/315 intacta (adapter → modelo → renderer → PDF).

## Clasificación §14 (¿qué pasó con las acciones operacionales?)

**F — Acción todavía existente pero condicionada por selección (por diseño).**
Las acciones de estado no fueron eliminadas ni movidas: la barra operacional se renderiza solo con
`selectedIds.size > 0` (Sprint 320 §11 — las acciones sobre selección exigen selección). Sin selección,
la barra no aparece, lo que explica la observación visual "no visibles". Con selección, funcionan (E03–E07).

## Clasificación final

```
Status Actions      AUDITED     Export           PRESERVED
Selection           AUDITED     Evidence Report  PRESERVED
Operational View    AUDITED     Import           PRESERVED
Filters             AUDITED     New              PRESERVED
Metrics             AUDITED     No New Query     REQUIRED
Dashboard           AUDITED     No New SSOT      REQUIRED
                                Scope            REQUIRED
                                Build            REQUIRED
STATUS: CERTIFIED
```

## Recomendación mínima para Sprint 321 (Controlled Correction)

1. **Indicadores → vistas:** hacer clicables los 5 indicadores superiores para fijar `activeView`
   (Total→`all`, Pendientes→`pending`, En proceso→`inProcess`, Completados→`completed`, Alertas→`inconsistent`)
   reutilizando el pipeline `records → activeView → search → filters → filteredRecords`. Sin pipeline nuevo.
2. **Alertas:** unificar su fuente con `records` (no `filteredRecords`) para que la métrica sea invariante de vista.
3. **Conservar:** selección única, acciones de estado (gate por selección), Exportar e Informe de Evidencia,
   Dashboard independiente, filtros inline compatibles.
4. **No crear:** queries por indicador, `viewOptions` en Registry obligatorio, selecciones adicionales.