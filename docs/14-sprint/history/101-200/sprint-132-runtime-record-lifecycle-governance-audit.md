# Sprint 132 — Runtime Record Lifecycle Governance Audit & Performance Hardening (SSOT)

**Tipo:** Core Runtime Governance Sprint  
**Estado:** LEVEL 3 — CERTIFIED (Audit Only — No Implementation)  
**Branch:** operativo-v1  
**Dependencias:** Sprint 131.x (Universal Import System)  
**Archivos modificados:** 0  
**Archivos nuevos:** 0  

---

## 1. Objetivo

Auditar completamente el ciclo de vida operacional de los registros del sistema: estados, acciones, botones, performance y duplicidad arquitectónica. Este sprint NO implementa cambios — documenta hallazgos para el Sprint 132.1.

---

## FASE 1 — Estados existentes

### 1.1 Inventario completo de estados (14 valores encontrados)

| # | Valor | Origen | ¿En DB? | ¿En UI? | ¿Se usa? |
|---|-------|--------|---------|---------|----------|
| 1 | `pendiente` | Contract options + automations | ✅ `r.estado` | ✅ Filtros, badge, dropdown | ✅ Activo |
| 2 | `en_proceso` | Contract options + dropdown | ✅ `r.estado` | ✅ Filtros, badge, dropdown | ✅ Activo |
| 3 | `completado` | Contract options + dropdown | ✅ `r.estado` | ✅ Filtros, badge, dropdown | ✅ Activo |
| 4 | `approved` | Orchestrator `approveRecords` | ✅ | ✅ Badge (gris) | ✅ Activo |
| 5 | `cerrado` | Orchestrator `closeRecords` | ✅ | ✅ Filtros, badge | ✅ Activo |
| 6 | `draft` | Readiness state (score < 100) | ⬜ Computado | ✅ Filtro | ⚠️ Solo filtro |
| 7 | `validated` | Readiness + reopen target | ⬜ Computado | ✅ Filtro readiness | ⚠️ Solo estado interno |
| 8 | `ready` | Readiness state | ⬜ Computado | ✅ Filtro readiness | ⚠️ Solo estado interno |
| 9 | `rechazado` | Display badge style (line 818) | ❌ No existe | ❌ No filtrable | ❌ **Orfano** |
| 10 | `pending_completion` | Readiness (errors > 0) | ⬜ Computado | ✅ Filtro | ⚠️ Solo estado interno |
| 11 | `closed` | Readiness check (en. synonym) | ❌ No se escribe | ❌ No visible | ❌ **Duplicado de cerrado** |
| 12 | `listo` | Readiness check (es. synonym) | ❌ No se escribe | ❌ No visible | ❌ **Duplicado de ready** |
| 13 | `aprobado` | Automation inventarios | ✅ Otra tabla | ❌ Despachos no | ❌ **Inconsistente (es vs en)** |
| 14 | `activo` | Automation productos | ✅ Otra tabla | ❌ Despachos no | ❌ Otro módulo |

### 1.2 Estados que realmente se persisten en `despachos`

```
1. pendiente         → setDefault automation + usuario
2. en_proceso        → dropdown + bulkUpdateStatus
3. completado        → dropdown + bulkUpdateStatus
4. approved          → orchestrator.approveRecords
5. cerrado           → orchestrator.closeRecords
```

**Solo 5 estados se escriben realmente en la base de datos.**

### 1.3 Estados computados (NO se persisten)

```
draft                → score < 100
validated            → score = 100, sin errores, sin inconsistencias
ready                → marcado manualmente
pending_completion   → errores de validación
inconsistent         → inconsistencias detectadas
```

Son 5 estados adicionales que existen solo en memoria (readiness).

### 1.4 Estados huérfanos

| Estado | Problema |
|--------|----------|
| `rechazado` | Existe en el badge de la tabla (línea 818) pero NUNCA se asigna, no hay lógica que lo produzca, no es filtrable |
| `closed` / `listo` | Solamente existen como sinónimos en `getReadinessState` — `cerrado` es el único valor real |
| `aprobado` | Es `approved` en inglés, `aprobado` en español para otro módulo — inconsistencia entre experiencias |

---

## FASE 2 — Ciclo de vida del registro

### 2.1 Mapa actual del ciclo de vida

```
         ┌─────────────────┐
         │    pendiente     │ ← automations / creación
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │   en_proceso     │ ← usuario cambia manualmente
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │   completado     │ ← usuario cambia manualmente
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │    approved      │ ← handleBulkApprove
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │    cerrado       │ ← handleBulkClose
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │   validated      │ ← handleBulkReopen
         └────────┬────────┘
                  │
                  └──→ vuelve a approved → cerrado
```

### 2.2 Readiness paralelo (no persiste)

```
computeCompletionScore
  ↓
score < 100    → draft
score = 100    → validated
inconsistencias → inconsistent
errores        → pending_completion
estado nativo  → closed / approved / ready
```

### 2.3 Problema: Dos modelos de estado

Existen **dos sistemas paralelos** que gobiernan el estado:

| Sistema | Naturaleza | Persiste | Gobernado por |
|---------|-----------|----------|---------------|
| `record.estado` | Nativo (DB) | ✅ | Orchestrator + Service |
| `readinessStates` | Computado (Runtime) | ❌ | `getReadinessState` + `computeCompletionScore` |

**Problema:** El dropdown de estado permite cambiar a CUALQUIER valor (`estadoOptions`), mientras que los botones Approve/Close/Reopen tienen reglas específicas. Pero el Orchestrator **no valida** las reglas antes de escribir.

---

## FASE 3 — Botones y acciones

### 3.1 Matriz de acciones

| Acción | Handler | ¿Valida precondición? | ¿Escribe DB? | ¿Publica EventBus? | ¿Funciona? |
|--------|---------|----------------------|--------------|-------------------|------------|
| **Edit** | `handleEdit` | ❌ No aplica | ❌ Solo UI | ❌ | ✅ |
| **Delete (single)** | `handleDelete` | ❌ `window.confirm` | ✅ `service.delete` | ✅ `RECORD_DELETED` | ✅ |
| **Delete (bulk)** | `handleBulkDelete` | ❌ `window.confirm` | ✅ N iteraciones | ❌ **No publica** | ⚠️ Lento |
| **Status dropdown** | `handleBulkStatus` | ❌ Ninguna | ✅ N iteraciones | ❌ No publica | ⚠️ Sin control |
| **Approve** | `handleBulkApprove` | ✅ UI: `canApprove` (score) | ⚠️ **Orchestrator NO valida** | ❌ No publica | ⚠️ Brecha |
| **Close** | `handleBulkClose` | ✅ UI: `canClose` | ⚠️ **Orchestrator NO valida** | ❌ No publica | ⚠️ Brecha |
| **Reopen** | `handleBulkReopen` | ✅ UI: `canReopen` | ⚠️ **Orchestrator NO valida** | ❌ No publica | ⚠️ Brecha |
| **Export PDF** | `handleExportPdf` | ❌ N/A | ❌ | ❌ | ✅ |
| **Export CSV** | `handleExportCsv` | ❌ N/A | ❌ | ❌ | ✅ |
| **Import** | `handleExcelImported` | ✅ Pipeline completo | ✅ batch | ✅ `RECORDS_IMPORTED` | ✅ |

### 3.2 Brecha crítica: Orchestrator sin validación

Los métodos del Orchestrator NO llaman a `canApprove`, `canClose`, `canReopen`:

```js
// Runtime handleBulkApprove (línea 249) — valida en UI:
const invalid = selected.filter(r => !canApprove(r, contract));
if (invalid.length > 0) { setBanner('error'); return; }

// Orchestrator approveRecords (línea 208) — NO valida:
for (const id of ids) {
  const record = { estado: 'approved' };  // <-- escribe sin preguntar
  await this._service.update(id, record);  // <-- fuerza el cambio
}
```

**Riesgo:** Si alguien llama al Orchestrator directamente (ej. desde una API, hook, o prueba), el estado se forza sin verificar `canApprove` / `canClose` / `canReopen`.

### 3.3 El score 100%

`canApprove` en `UniversalOperationalRuntime.jsx` línea 250:

```js
const invalid = selected.filter(r => !canApprove(r, contract));
```

Y `canApprove` en `OperationalDataCompletion.js` línea 128:

```js
export function canApprove(record, contract) {
  const state = getReadinessState(record, contract);
  return state === 'ready' || state === 'validated';
}
```

Para que `state === 'validated'`, se requiere:
1. `inconsistencies.length === 0`
2. `errors.length === 0`
3. `score === 100`

**El score 100% NO es un requisito directo.** Es una consecuencia de que `getReadinessState` retorne `'validated'`, que requiere `score >= 100`. Si se quiere permitir `score >= 80`, se debe cambiar:
- `if (score < 100) return 'draft'` → `if (score < 80) return 'draft'`

Esto permitiría que registros con 80% pasen a `'validated'` y luego a `'approved'`.

### 3.4 Reopen — ¿puede reabrir?

`canReopen` (línea 138):
```js
return record.estado === 'cerrado' || record.estado === 'approved';
```

- ✅ Puede reabrir `cerrado`
- ✅ Puede reabrir `approved`
- ❌ NO puede reabrir `pendiente` (no tendría sentido)
- ❌ NO puede reabrir un registro sin estado

Al reabrir, el estado se setea a `'validated'` (no vuelve a `pendiente` o `en_proceso`).

### 3.5 Close — ¿estado o acción?

`Close` es una **acción** que escribe el estado `'cerrado'`. Es parcialmente irreversible porque:
- `'cerrado'` solo puede salir mediante `Reopen` → `'validated'`
- No hay botón para cambiar de `'cerrado'` a otro estado desde el dropdown

No es completamente irreversible porque `Reopen` existe.

### 3.6 Delete — lentitud

`bulkDelete` en el Orchestrator (línea 199):
```js
async bulkDelete(ids, user) {
  for (const id of ids) {
    await this._service.delete(id);           // N llamadas SECUENCIALES
    OperationalAuditService.auditDelete(...);
  }
}
```

**Causa de lentitud:** Para N=50 registros seleccionados:
- 50 llamadas `DELETE` a Supabase (secuenciales)
- 50 llamadas `auditDelete` (secuenciales)
- Sin `batchDelete` en la capa de servicio
- Sin `EventBus.publish` en `bulkDelete`
- Sin `optimistic update` — espera a que todas las promesas se resuelvan

Además, `handleBulkDelete` fuerza un re-render completo de la tabla al hacer `setRecords(prev => prev.filter(...))`, pero la UI ya se actualizó en cada iteración. No hay `optimistic update`.

---

## FASE 4 — Performance

### 4.1 Triple evaluación del formulario

```
1. buildInitialForm (Orchestrator línea 71)
   → evaluateRecord internamente
   → setFormData(result.formData)

2. useEffect [formData, isFormOpen] (Runtime líneas 121-127)
   → evaluate (tercer evaluateRecord)
   → recalcVisibility
   → setFormErrors + setComplianceWarnings + setVisibility
   (3 setStates → 3 renders potenciales sin React 18 batching)

3. handleSubmit → createRecord/updateRecord (Orchestrator líneas 87/105)
   → evaluateRecord (tercera vez)
```

**Impacto:** Bajo en formularios simples (despachos tiene ~12 campos). En módulos con 30+ campos, la latencia de validación se triplica innecesariamente.

### 4.2 N operaciones secuenciales en bulk

| Operación | Llamadas por registro | Total para 50 registros |
|-----------|----------------------|------------------------|
| `bulkDelete` | 1 DELETE + 1 audit | 100 llamadas secuenciales |
| `bulkUpdateStatus` | 1 UPDATE + 1 audit | 100 llamadas secuenciales |
| `approveRecords` | 1 UPDATE + 1 audit | 100 llamadas secuenciales |
| `closeRecords` | 1 UPDATE + 1 audit | 100 llamadas secuenciales |
| `reopenRecords` | 1 UPDATE + 1 audit | 100 llamadas secuenciales |

**No existe `updateBatch` ni `deleteBatch` en el service layer.** Supabase soporta `.update(payload).in('id', ids)` y `.delete().in('id', ids)` pero no se utiliza.

### 4.3 Re-render innecesario en delete

```js
// handleDelete (línea 166) — correcto, optimistic:
setRecords(prev => prev.filter(r => r.id !== id));

// handleBulkDelete (línea 225) — también correcto pero lento porque espera N iteraciones:
await orchestratorRef.current.bulkDelete(Array.from(selectedIds), auditUser);
setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
```

El bulk delete espera a que TODAS las N iteraciones terminen antes de actualizar la UI. No hay feedback parcial, no hay optimistic update progresivo.

### 4.4 Doble persistencia

**No se encontró doble persistencia.** Cada operación CRUD hace exactamente una llamada DB:

| Operación | Llamadas DB |
|-----------|-------------|
| `createRecord` | 1 `insert` |
| `updateRecord` | 1 `update` |
| `deleteRecord` | 1 `delete` |
| `importRecords` | 1 `insertBatch` (1 chunk) |
| `insertBatch` | 1 `insert` por chunk (200 registros) |

### 4.5 Renderizado

El Runtime tiene **19 `useState`** y **12 `useMemo`** que se recalculan en cada render. Los memo más pesados:

| useMemo | Dependencias | Costo |
|---------|-------------|-------|
| `completionScores` (línea 329) | `[records]` | `O(n * canonicalFields)` — recorre todos los registros |
| `readinessStates` (línea 337) | `[records, completionScores]` | `O(n)` — llama `getReadinessState` |
| `filteredRecords` (línea 418) | `[records, activeView, searchTerm, filters, viewFilters, completionScores, readinessStates, recordInconsistencies, duplicateGroups]` | Alto — se recalcula cuando cambia cualquiera de 8 dependencias |
| `viewCounts` (línea 410) | `[filteredRecords]` | Bajo |

**Problema:** Cualquier cambio en `records` (delete, create, status change) recalcula TODOS los memo, incluyendo `completionScores` que re-evalúa cada registro contra `canonicalFields`.

---

## FASE 5 — Propuesta de consolidación

### 5.1 Estados recomendados (reducir de 14 a 4-5)

**Propuesta mínima (4 estados):**

```
pendiente  →  en_proceso  →  completado  →  cerrado
```

**Propuesta con aprobación (5 estados):**

```
pendiente  →  en_proceso  →  completado  →  approved  →  cerrado
```

**Estados a eliminar:**
- `rechazado` — nunca se usa, no hay lógica que lo genere
- `closed` / `listo` — sinónimos de `cerrado` / `ready`
- `aprobado` / `activo` — pertenecen a otros módulos
- `draft` / `validated` / `ready` / `pending_completion` / `inconsistent` — deben seguir siendo computados (readiness), no persistidos

### 5.2 Acciones recomendadas

| Acción | Estado objetivo | ¿Validar precondición? | ¿Publicar EventBus? |
|--------|----------------|------------------------|---------------------|
| Approve | `approved` | ✅ `canApprove` (en Orchestrator, no solo UI) | ✅ `RECORD_APPROVED` |
| Close | `cerrado` | ✅ `canClose` (en Orchestrator) | ✅ `RECORD_CLOSED` |
| Reopen | `en_proceso` | ✅ `canReopen` (en Orchestrator) | ✅ `RECORD_REOPENED` |
| Delete | — | ✅ Ninguna | ✅ `RECORD_DELETED` (bulk también) |

**Propuesta para Reopen:** Cambiar destino de `'validated'` a `'en_proceso'` — es más intuitivo que `'validated'` (que es un estado interno).

### 5.3 Score 80%

Si se desea cambiar el threshold:
```js
// OperationalDataCompletion.js línea 124
if (score < 100) return 'draft';      // actual
if (score < 80) return 'draft';       // propuesto
```

Esto requiere modificar **solamente 1 línea** y permite que registros con ≥80% pasen a `'validated'` y luego a `'approved'`.

### 5.4 Performance — Mínimas modificaciones necesarias

| Problema | Solución mínima | Archivo |
|----------|----------------|---------|
| Triple evaluación | Cachear resultado de `buildInitialForm` | `UniversalOperationalRuntime.jsx` |
| N secuencial bulk | Usar `.update(payload).in('id', ids)` + `.delete().in('id', ids)` | `operationalRecordsService.js` |
| Sin EventBus en bulk | Agregar `publish` en cada bulk handler | `OperationalExperienceLifecycleOrchestrator.js` |
| Orchestrator sin validación | Mover `canApprove`/`canClose`/`canReopen` al Orchestrator | `OperationalExperienceLifecycleOrchestrator.js` |
| Sin optimistic delete | Aplicar `setRecords` inmediato antes del await | `UniversalOperationalRuntime.jsx` |

### 5.5 Pipeline consolidado propuesto

```
Creación (import / form)
  ↓
pendiente ──→ en_proceso ──→ completado ──→ approved ──→ cerrado
  ↑              ↑               ↑
  │              │               └── Close (desde approved)
  │              │               └── Close (desde completado)
  │              └─────────────── Reopen (desde cerrado/approved → en_proceso)
  └────────────────────────────── Reject (desde cualquier estado → pendiente)
```

### 5.6 Restricciones a mantener

- ❌ No inventar lotes
- ❌ No crear nuevos motores
- ❌ No crear nuevas capas
- ❌ No duplicar lógica operacional
- ✅ Reutilizar Runtime existente
- ✅ Reutilizar Orchestrator existente
- ✅ Reutilizar `canApprove` / `canClose` / `canReopen`

---

## Resumen ejecutivo de hallazgos

| # | Hallazgo | Severidad | ¿Requiere código? |
|---|----------|-----------|-------------------|
| 1 | `rechazado` es un estado huérfano — existe en badge pero nunca se asigna | Baja | Eliminar del badge |
| 2 | 14 estados encontrados, solo 5 se persisten — hay 9 estados computados/huérfanos | Media | Documentar + limpiar |
| 3 | Orchestrator NO valida `canApprove/Close/Reopen` — escribe ciegamente | **Alta** | Mover validación al Orchestrator |
| 4 | `bulkDelete` y bulk status NO publican EventBus | Media | Agregar publish |
| 5 | Delete lento: N iteraciones secuenciales sin batch | **Alta** | Agregar `deleteBatch` / `updateBatch` |
| 6 | Triple evaluación del formulario en cada submit | Baja | Cachear resultado |
| 7 | Score 100% forzado por `getReadinessState` línea 124 | Media | Cambiar a ≥80% si se desea |
| 8 | `rechazado` no es filtrable ni seleccionable en vista | Baja | Eliminar |
| 9 | Sin `optimistic update` en bulk delete | Media | Agregar |

### Archivos que requieren modificación mínima en Sprint 132.1

```
1. src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js
   - Mover validación canApprove/canClose/canReopen al Orchestrator
   - Agregar EventBus.publish en bulk operations

2. src/services/operationalRecordsService.js
   - Agregar updateBatch(ids, payload)
   - Agregar deleteBatch(ids)

3. src/services/import/operationalDataExtractionLayer.js
   - Opcional: cambiar score threshold a ≥80

4. src/modules/experiences/UniversalOperationalRuntime.jsx
   - Cachear evaluación del formulario
   - Agregar optimistic update en bulk delete
   - Eliminar badge 'rechazado' (línea 818)
```

---

*Auditoría completada el Julio 2026. Branch: operativo-v1. 0 archivos modificados, 1 archivo nuevo (documento de auditoría).*
