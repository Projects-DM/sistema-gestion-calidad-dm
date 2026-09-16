# Sprint 343 — Dispatch Batch Lot Assignment · Controlled Correction

**Estado:** **IMPLEMENTED / CERTIFIED · 51/51** · 0.0s · build PASS (2.5s)
**Nivel:** 5 · **Tipo:** Operational Capability · Bulk Metadata Update · Lot Validation
**Branch:** `release/stable-sprint79`
**Precedente directo:** Sprint 342 — Dispatch Batch Lot Assignment Architecture Audit
**Suite:** `scripts/sprint-343-dispatch-batch-lot-assignment-controlled-correction.mjs`
**Archivos autorizados (superficie mínima):** 4 src + 1 nuevo módulo puro

---

## Clasificación final

```
FINAL CLASSIFICATION: BATCH LOT ASSIGNMENT — CONTROLLED CORRECTION
STATUS:                IMPLEMENTED / CERTIFIED
PIPELINE:              selectedIds → bulkAssignLot → updateBatch({lote}) → persistence
SCOPE:                 solo lote · estado intacto · metadata intacta · 0 no-seleccionados afectados
```

## Pipeline objetivo (implementado)

```
UniversalOperationalRuntime            → handler bulk (selectedIds)
  ↓ Array.from(selectedIds)
OperationalExperienceLifecycleOrchestrator
  ↓ bulkAssignLot(ids, lote, user)
operationalRecordsService
  ↓ updateBatch(ids, { lote }) · chunk 200
Persistence
```

Punto exacto de integración confirmado por código: `handleBulkAssignLot`
(`UniversalOperationalRuntime.jsx:312`) → `bulkAssignLot`
(`OperationalExperienceLifecycleOrchestrator.js:237`) → `_service.updateBatch`
(`operationalRecordsService.js:120`) — **sin** segunda capa de persistencia,
**sin** sistema de selección nuevo, **sin** modelo de lote paralelo.

## Rutas de asignación de lote (ahora 4)

| Vía | Estado | Módulo |
|---|---|---|
| Create | UNCHANGED | Runtime form → `createRecord` |
| Edit | UNCHANGED | Runtime form → `updateRecord` |
| Import | UNCHANGED | `importRecords` (sin lógica de lote nueva) |
| **Bulk assign** | **NEW** | `bulkAssignLot(ids, lote, user)` → `updateBatch({lote})` |

## Regla fundamental de selección (§4)

La operación opera **exclusivamente** sobre `Array.from(selectedIds)`. Nunca
`filteredRecords` / `visibleRecords` / `allRecords`. Verificado en suite:
`N(/filteredRecords/, handler)` PASS — 25 filtrados, 4 seleccionados → 4
actualizados, 21 intactos.

## Validación del lote (VAL-01/02/03) — fuente única

Nuevo módulo puro `src/core/capabilities/experiences/OperationalLotRules.js`
(sin imports, Node-testable). La autoridad de validación vive en el Orchestrator,
que la consume vía `validateLot`:

- **VAL-01** — obligatorio: `'' / '   ' / null / undefined` → `INVALID_LOT`, 0 escrituras.
- **VAL-02** — normalización: `"  LOT-001  "` → `"LOT-001"` (trim) **antes** de persistir.
- **VAL-03** — sin semántica nueva: no se inventan restricciones de formato que no
  existan en create/edit (lote = texto libre). Espacios internos preservados.

Justificación del CREATE (regla REUSE>EXTEND>CREATE): el Orchestrator no es
importable en Node (imports sin extensión, estilo Vite) → la única forma de
verificar el comportamiento VAL determinísticamente es un módulo puro. Además
evita duplicar lógica de validación en el runtime.

## Corrección requerida en persistencia (enabler crítico)

`applyFieldMapping` inyectaba `null` para claves de mapping ausentes en
actualizaciones parciales (`cantidad → cantidad_bolsas: null`), lo que habría
borrado `cantidad_bolsas` al hacer `updateBatch({ lote })`. Corregido en
`operationalRecordsService.js:18-22`: mapear **solo claves presentes**
(`hasOwnProperty`). Efectos:

- `bulkAssignLot` escribe **solo `lote`** (invariantes §11 preservadas).
- Corrección de un **bug latente**: `bulkUpdateStatus` (Sprint 323) también
  nulificaba `cantidad_bolsas` al cambiar estado — ahora lo preserva.
- Create/Edit/Import: sin cambio de comportamiento (los registros completos
  siguen conteniendo todos los campos canónicos).

## Semántica de la operación

- **Estado**: NO cambia (`PENDIENTE+lote → PENDIENTE`). No emite
  `RECORDS_STATUS_UPDATED` (consumido por `CompletionBridge` solo para status).
- **canComplete (§13)**: la operación habilita corregir `producto+sin lote`
  (inconsistent → potentially consistent), pero **no** llama a
  `bulkUpdateStatus('completado')` — son dos operaciones independientes.
- **Lote existente**: sobrescribible (`LOT-A → LOT-B`), igual que el contrato de
  edición individual; sin regla de bloqueo nueva.
- **Idempotencia**: `LOT-A → LOT-A` seguro (valor normalizado determinístico).
- **Atomicidad (§18)**: `updateBatch` chunked a 200 **sin** transacción
  cross-chunk — documentado, no se finge atomicidad. El resultado reporta
  `count` real vs `requested` (no-encontrados visibles en UI).
- **Error handling (§19)**: `bulkAssignLot` no tiene try/catch → el error
  original (Supabase/Postgres/RLS/constraint) se propaga; la UI lo muestra
  como `'Error al asignar lote: <causa original>'` (preserva el mensaje).
- **Feedback (§20)**: banner success con `count` actualizados + no-encontrados;
  banner error en fallo — reutiliza el sistema de banners existente.
- **Limpieza (§21)** y **refresh (§22)**: `setSelectedIds(new Set())` +
  `setRecords(map)` con los registros devueltos por `updateBatch` (filas
  completas) → filtros/dashboard consumen el nuevo valor automáticamente.
- **Seguridad (§26/27)**: la acción está envuelta en `RoleGate` con las mismas
  roles que editar lote individualmente (`administrador/calidad/operativo`);
  la frontera sigue siendo la selección existente.

## Cambios por archivo

| Archivo | Cambio | Tipo |
|---|---|---|
| `src/core/capabilities/experiences/OperationalLotRules.js` | `normalizeLot` / `validateLot` / `INVALID_LOT` | **CREATE** (puro, justificado) |
| `src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js` | `bulkAssignLot(ids, lote, user)` + import de reglas | **EXTEND** |
| `src/services/operationalRecordsService.js` | `applyFieldMapping` solo-claves-presentes (enabler + bug latent) | **EXTEND** |
| `src/modules/experiences/UniversalOperationalRuntime.jsx` | estado `bulkLotOpen/bulkLotInput`, `handleBulkAssignLot`, acción "Asignar lote" + input, limpieza consistente | **EXTEND** |

## Verificación

- **Suite** `scripts/sprint-343-...mjs`: **51/51 PASS** (VAL × 12, dominio
  canComplete × 7, orchestrator × 14, service × 4, runtime × 10, git × 3).
  Incluye tests comportamentales sobre `OperationalLotRules` y
  `OperationalDataCompletion` (producto±lote ↔ canComplete).
- **Build**: PASS (2.5s). **Lint**: 0 problemas nuevos (los 8 existentes
  pertenecen a código previo: exportPdf/exportExcel, effects, memo de
  filteredRecords, parámetro `displayFields`).
- **GIT**: solo la superficie autorizada + artefactos Sprint 342 (pendiente de
  commit) aparecen como modificados.

## Cierre

> `selectedIds` → "Asignar lote" → validación VAL-01/02 → `bulkAssignLot` →
> `updateBatch({ lote })` (chunk 200, solo-claves-presentes) → N despachos con
> nuevo lote; 0 no-seleccionados afectados; 0 estados modificados; 0 metadata
> no relacionada modificada. Import/Filtros/Dashboard/Estado: UNCHANGED.
> Seguridad: EXISTING CONTRACT (mismo RoleGate que editar lote).

**FINAL CLASSIFICATION: BATCH LOT ASSIGNMENT — CONTROLLED CORRECTION · IMPLEMENTED / CERTIFIED**