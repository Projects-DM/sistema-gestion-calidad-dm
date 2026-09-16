# Sprint 323 — Operational Completion Convergence · Controlled Migration

**Rama:** release/stable-sprint79
**Modo:** CONTROLLED MIGRATION · LEVEL 5 · ARCHITECTURAL CONVERGENCE
**Precedente:** Sprint 322 (PARTIAL — dependencia real, simplificable)
**Suite:** `scripts/sprint-323-operational-completion-convergence.mjs`
**Resultado:** **CERTIFIED** 77/77 gates (E01–E35 + Casos A–G) · 3.5s · exit=0 · timebox OK
**Regresión histórica 296–322:** NO ejecutada (migración dirigida).

---

## 1. Principio rector

> **ONE OPERATIONAL LIFECYCLE · ONE TERMINAL STATE · ONE SOURCE OF TRUTH**

`completado` es el **único estado terminal operacional**; `Eliminar` es una operación
independiente y destructiva; `approved`/`cerrado` quedan solo como estados históricos
con **compatibilidad de presentación** (sin UPDATE masivo).

## 2. Pregunta de migración — respuesta

**YES — SAFE TO REMOVE.** Todos los contratos dependientes de `approved`, `cerrado` y
`RECORDS_APPROVED`/`RECORDS_CLOSED` fueron absorbidos/migrados y demostrados equivalentes
por la suite (CompletionBridge, Alert Runtime, Views, Metrics, Lifecycle, Selection, Delete,
Historical records, Export, Evidence Report, Import, Dashboard, Build, Scope — **PASS**).

## 3. Cambios aplicados

| Archivo | Cambio |
|---|---|
| `OperationalDataCompletion.js` | `canApprove`/`canClose`/`canReopen` → **`canComplete`** (`readiness validated|ready`, reutiliza `getReadinessState`; sin duplicar lógica de score) |
| `OperationalExperienceLifecycleOrchestrator.js` | Gate en `bulkUpdateStatus`: `newStatus === 'completado'` exige `canComplete(record)` por registro (recordsMap). `approveRecords`/`closeRecords`/`reopenRecords` **eliminados** (y sus eventos). |
| `CompletionBridge.js` | `FINAL_SINGLE_EVENTS = [RESOURCE_COMPLETED]`. Retiradas las constantes `RECORDS_APPROVED_EVENT`/`RECORDS_CLOSED_EVENT`. Se mantienen `RESOURCE_COMPLETED` + `RECORDS_STATUS_UPDATED`(completado) + `COMPLETION_INTENT`. |
| `UniversalOperationalRuntime.jsx` | Import sin canApprove/Close/Reopen; `handleBulkStatus` pasa `recordsMap` y muestra errores del gate; handlers Aprobar/Cerrar/Reabrir eliminados; botones eliminados; vistas `approved`/`closed` convergidas → `completed` (legacy compatible); métrica `Completados = estado === 'completado'`; badge legacy approved/cerrado presentado como `completado`. |

## 4. Contrato crítico de finalización

```
canComplete =
    readinessState === 'validated'
    ||
    readinessState === 'ready'
```

Implementado **reutilizando** `getReadinessState` (mecanismo certificado Sprint 132.1) —
no se creó validación nueva ni score duplicado. `en_proceso → completado` se **BLOQUEA**
(success:false, invalidIds) cuando el registro no alcanza validated/ready. Verificado en
runtime: `draft`→BLOCK, `inconsistent`→BLOCK, `validated`/`ready`→PASS.

## 5. Migración de CompletionBridge (regla de seguridad)

1. ✅ Se identificaron TODOS los consumidores (Sprint 322).
2. ✅ Se migró cada consumidor: la vía certificada `completado → RESOURCE_COMPLETED` +
   `RECORDS_STATUS_UPDATED (newStatus completado)` alimenta el bridge (OccurrenceLedger)
   — era el camino Sprint 257/280 ya certificado.
3. ✅ Equivalencia funcional demostrada: `recordBulk` + `OccurrenceLedger.recordCompletion`
   idénticos en ambas señales.
4. ✅ Regresión dirigida ejecutada (Caso D/E).
5. ✅ **Entonces** se retiraron los eventos de la clasificación final:
   `FINAL_SINGLE_EVENTS = [RESOURCE_COMPLETED]`.

No se produce `DELETE EVENT → ALERT REGRESSION`: el Alert Runtime sigue wired
(`wireCompletionBridge()` + `registerCompletionOccurrenceProvider`), el canal
`COMPLETION_INTENT` se preserva, y las alertas reciben la misma señal funcional
(Caso E PASS).

## 6. Vistas convergidas

| Vista | Destino |
|---|---|
| `all` / `pending` / `inProcess` / `draft` / `pendingCompletion` / `inconsistent` / `duplicates` / `readyToClose` / `withObservations` / `importedToday` | conservadas |
| `completed` | única representación de finalización: `estado === 'completado'` + **legacy `approved`/`cerrado`** (compatibilidad de presentación, §11) |
| `approved` | **retirada** (→ `completed`) |
| `closed` | **retirada** (→ `completed`) |

`readyToClose` (readiness `validated|ready`) se conserva: es una vista de **readiness**,
no apunta a ningún estado retirado, y ahora coincide con la elegibilidad real para completar.

## 7. Métricas

```
Completados === records.filter(r => r.estado === 'completado').length
```

Invariante verificado: independiente de `filteredRecords`, de la vista activa, del
dashboard y de los estados `approved`/`cerrado` (E23/E24). `Alertas` sigue siendo KPI
global sobre `records` (E25). Total/Pendientes/En proceso/Alertas conservan el
comportamiento certificado en Sprint 321 (E26).

## 8. Reabrir

**No** se creó sustituto "Reabrir". La transición `completado → en_proceso` queda
disponible explícitamente vía **Cambiar estado** (dropdown con `pendiente/en_proceso/
completado`), como capacidad de lifecycle, solo cuando exista necesidad de negocio
(no se duplica una segunda máquina).

## 9. UI objetivo

```
[ Cambiar estado ▼ ]   [ Eliminar ]
```

`Cambiar estado` conserva Pendiente / En proceso / Completado, conectado al pipeline
certificado `records → activeView → viewFilters → search → filters → filteredRecords →
selectedIds → bulkUpdateStatus`. Eliminar intacto: `selectedIds → bulkDelete →
deleteBatch → Supabase DELETE`.

## 10. Compatibilidad con registros históricos

- **Sin UPDATE masivo** (`UPDATE despachos SET estado='completado'` NO ejecutado).
- Legacy `approved`/`cerrado`: **presentation compatibility → completado** (badge y vista
  `completed`), sin tocar la persistencia.
- `approved`/`cerrado` no son completables vía el nuevo gate (readiness `closed`/`approved`),
  pero se presentan como terminales. La migración de datos históricos queda como problema
  separado si la auditoría posterior lo justifica.

## 11. Eliminar (operación independiente)

Conceptualmente separado del lifecycle:

```
STATUS LIFECYCLE      Pendiente → En proceso → Completado
DESTRUCTIVE OPERATION Eliminar
```

`bulkDelete` no escribe `estado` ni publica señales de completion (Caso G PASS).

## 12. Preservación (dominios prohibidos intactos)

`EvidenceReportModel`, `EvidenceReportRenderer`, `DispatchEvidenceAdapter`,
`exportDataNormalizer`, `operationalRecordsService`, `UniversalOperationalDashboard`,
`UniversalImportWorkflow`, `despachosService`, `DynamicRecordsView`, `filterCore`,
`sgcFilterAdapter`, `SupabasePersistenceProvider`, `dynamicService` → **sin cambios**
(E35 scope: exactamente 4 archivos autorizados modificados).

## 13. Veredicto

| Dominio | Estado |
|---|---|
| STATUS LIFECYCLE | CONVERGED |
| COMPLETION | SINGLE TERMINAL |
| APPROVAL / CLOSE / REOPEN | RETIRED |
| DELETE | PRESERVED |
| COMPLETION BRIDGE | MIGRATED |
| ALERTS | PRESERVED |
| VIEWS | CONVERGED |
| METRICS | STANDARDIZED |
| SELECTION / EXPORT / EVIDENCE REPORT / IMPORT / DASHBOARD | PRESERVED |
| NO NEW QUERY / NO NEW SSOT / NO PERSISTENCE MODEL / BUILD / SCOPE | PASS |

```
OPERATIONAL COMPLETION CONVERGENCE
STATUS: CERTIFIED
```