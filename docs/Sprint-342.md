# Sprint 342 — Dispatch Batch Lot Assignment Architecture Audit

**Estado:** **CERTIFIED · 75/75** · 0.0s · timebox OK
**Nivel:** 5 · **Tipo:** FORENSIC ARCHITECTURE AUDIT · AUDIT ONLY
**Precedentes:** Sprints 117 · 132.1 · 319 · 321 · 323 · 341
**Suite:** `scripts/sprint-342-dispatch-batch-lot-assignment-architecture-audit.mjs`
**Production Source Changes:** 0

---

## Clasificación final

```
FINAL CLASSIFICATION: BATCH LOT ASSIGNMENT — NOT IMPLEMENTED (documented gap)
STATUS:                CERTIFIED · AUDIT ONLY
SCOPE:                 BATCH OPERATIONS = STATUS/DELETE ONLY
                       LOT ASSIGNMENT = PER-RECORD/IMPORT ONLY
```

La arquitectura activa de Despachos **no posee** una vía batch de asignación de
lote. Las operaciones bulk se limitan a **cambio de estado** y **eliminación**;
el campo `lote` solo se asigna por registro (formulario create/edit) o por
importación. La auditoría certifica este contrato existente y documenta el gap.

## Pipeline batch rastreado (SELECTION → ACTION → VALIDATION → PERSISTENCE)

| Etapa | Módulo | Semántica |
|---|---|---|
| Selection State | `UniversalOperationalRuntime.jsx:83` | `selectedIds` (Set React, no persistente) |
| Toggle | `toggleSelect` (`:459`) · `toggleSelectAll` (`:443`) | fila individual / todo `filteredRecords` |
| Bulk bar | `:716-731` | **2 acciones**: "Cambiar estado..." + "Eliminar" |
| Scope | `Array.from(selectedIds)` (`:266,284`) | selección exacta — nunca `filteredRecords` |
| Autoridad | `OperationalExperienceLifecycleOrchestrator.js:191,228` | `bulkUpdateStatus` / `bulkDelete` |
| Whitelist | `:193` | `['pendiente','en_proceso','completado']` |
| Gate final | `:200-208` | `completado` exige `canComplete` (readiness validated/ready) |
| Persistencia | `operationalRecordsService.js:120-138` | `updateBatch(ids,{estado})` · chunk 200 · `cantidad→cantidad_bolsas` |
| Evidencia | `dispatchEvidenceAdapter.js:32` | `lote` proyectado como `value_text` |

## Respuestas forenses Q01–Q12

- **Q01**: selección batch = `selectedIds` (Set React, `Runtime:83`).
- **Q02**: `toggleSelect(id)` por fila; `toggleSelectAll` sobre `filteredRecords`.
- **Q03**: bulk bar expone solo "Cambiar estado..." y "Eliminar" — **0 acciones de lote**.
- **Q04**: operaciones de datos sobre `Array.from(selectedIds)` (selección exacta);
  el Informe de Evidencia intersecta `filteredRecords ∩ selectedIds`.
- **Q05**: autoridad del lifecycle = `Orchestrator.bulkUpdateStatus` / `bulkDelete`.
- **Q06**: whitelist cerrada `pendiente/en_proceso/completado`; `completado` gated
  por `canComplete` (readiness `validated`/`ready`, BLOCK con `invalidIds`).
- **Q07**: `updateBatch`/`deleteBatch` chunked a 200, mapeo `applyFieldMapping`
  (`cantidad→cantidad_bolsas`), `updated_at` inyectado por el service.
- **Q08**: **NO existe** capacidad de asignación de lote en batch (0 símbolos
  `assignLot/assign_lote/bulkLote/asignarLote` en todo el pipeline).
- **Q09**: rutas existentes de asignación de lote = formulario (create/edit vía
  `createRecord`/`updateRecord`) e importación (`importRecords`).
- **Q10**: `lote` es canonicalField + tableField; `businessRule producto→lote`;
  duplicados agrupados por `cliente+producto+lote` (`Runtime:349`).
- **Q11**: `dispatchEvidenceAdapter` proyecta `lote` como campo documental normal.
- **Q12**: autoridad de finalización = `canComplete` (`OperationalDataCompletion.js:130`);
  `producto sin lote` → `inconsistent` → impide `completado`.

## Inventario de hallazgos INV-01–20

- **INV-01/02**: selección es estado local; se limpia al cambiar vista o métrica.
- **INV-03/04**: select-all = `filteredRecords` completos; `allFilteredSelected` = `every`.
- **INV-05/06**: bulk bar condicionada a `selectedIds.size>0`; acciones = estado + delete.
- **INV-07**: **GAP** — 0 acción batch de lote (única vía batch de escritura = estado).
- **INV-08/09**: whitelist de 3 estados; bloqueo parcial devuelve `invalidIds`.
- **INV-10/11**: payload batch = `{ estado }` exclusivo (+`updated_at`); chunk 200.
- **INV-12**: único fieldMapping = `cantidad→cantidad_bolsas`; `lote` persiste as-is.
- **INV-13**: `bulkDelete` sin gate de readiness (borra cualquier selección).
- **INV-14/15**: `lote` canonical pero **no required** en `validationRules`
  (solo businessRule/inconsistency lo exige).
- **INV-16/17**: `producto sin lote` = inconsistent → bloquea `completado`; duplicados dependen de `lote`.
- **INV-18/19**: `lote` es campo de filtro del panel dinámico; proyectado como `value_text`.
- **INV-20**: importación inserta sin `evaluateRecord` (bypass de validación/readiness).

## Evidencia E01–E20

Selección (`Runtime:83,443,459,715`) → bulk handlers (`Runtime:262,275`) →
autoridad (`Orchestrator:191,228,193,203`) → persistencia (`service:106,120`) →
contrato (`Registry:176,201,240`) → dominio (`DataCompletion:92,130`) →
duplicados (`Runtime:349`) → evidencia (`adapter:32` · `Orchestrator:136-142`) →
config (`dispatchesConfig.js` sin lógica de lote) → auditoría (`service:69-70`):
**todas PASS** (detalle en suite).

## Cierre

¿Existe una vía batch para asignar un lote a un conjunto de despachos?

> **No.** El contrato activo opera batch **solo** sobre `estado` y `delete`.
> `lote` es un campo canónico por registro (`producto → requires lote`), asignado
> en el formulario o por importación; sin lote + producto informado el registro es
> `inconsistent` y no puede certificarse `completado`. La ruta batch de lote es un
> **gap arquitectónico documentado** — candidato a un futuro sprint de capacidad.

**Auditoría cerrada**: 0 production source changes · 75/75 · `BATCH LOT ASSIGNMENT — NOT IMPLEMENTED (documented gap)`.