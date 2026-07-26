# Sprint 132.1A — Operational Runtime Governance & Lifecycle Semantics Audit (SSOT)

**Tipo:** Core Runtime Governance Sprint (Auditoría Arquitectónica)
**Estado:** LEVEL 3 — CERTIFIED
**Branch:** operativo-v1
**Dependencias:** Sprint 132 — Runtime Record Lifecycle Governance Audit
**Archivos auditados:** Todos los involucrados en el Runtime Operacional
**Archivos modificados:** 0
**Archivos nuevos:** 1 (este documento)

---

## Preámbulo

Este sprint es 100% auditoría arquitectónica. No se ha modificado código. El objetivo es certificar el significado operacional de cada estado, acción, vista, score y componente del Runtime del SGC-DM antes de introducir cualquier cambio funcional.

Se auditaron los siguientes archivos contra código fuente real:

| Archivo | Rol | Líneas |
|---------|-----|--------|
| `OperationalExperienceRegistry.js` | Contratos SSOT de experiencia | ~400 |
| `OperationalExperienceLifecycleOrchestrator.js` | Ciclo de vida operacional (CRUD + bulk) | ~320 |
| `OperationalDataCompletion.js` | Completion Score + Readiness + canApprove/Close/Reopen | ~200 |
| `operationalRecordsService.js` | Persistencia (fetch/insert/update/delete/insertBatch) | ~170 |
| `UniversalOperationalRuntime.jsx` | UI Runtime (handlers, dropdown, botones, tabla, badges, vistas) | ~620 |
| `OperationalEventBus.js` | Sistema pub/sub de eventos | ~40 |
| `OperationalFlowOrchestrator.js` | Orquestador de flujos | ~70 |

---

## FASE 1 — Operational Workflow Audit

### 1.1 Workflow operacional actual

Basado en el código fuente, el flujo operacional actual es:

```
CREACIÓN (form/import)
  ↓ automationRules: setDefault('pendiente')
pendiente
  ↓ dropdown / bulkUpdateStatus
en_proceso
  ↓ dropdown / bulkUpdateStatus
completado
  ↓ handleBulkApprove → Orchestrator.approveRecords → estado: 'approved'
approved
  ↓ handleBulkClose → Orchestrator.closeRecords → estado: 'cerrado'
cerrado
  ↓ handleBulkReopen → Orchestrator.reopenRecords → estado: 'en_proceso'
en_proceso (vuelta al ciclo)
```

### 1.2 Veredicto por estado

#### `pendiente`

| Atributo | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué significa? | Estado inicial del registro. El registro ha sido creado pero aún no se está trabajando activamente |
| Responsabilidad | Indicar que el registro está en la cola de trabajo del operativo |
| ¿Es persistente? | **SÍ** — Se persiste en DB (`record.estado`) |
| ¿Es computado? | **NO** — Es un valor explícito del usuario. Lo asigna `automationRules` con `setDefault: 'pendiente'` |
| ¿Quién lo modifica? | El usuario a través del dropdown o el sistema al crear/importar |
| ¿Puede modificarse manualmente? | **SÍ** — El usuario puede cambiarlo a `en_proceso` o `completado` vía dropdown |
| ¿Tiene sentido operacional? | **SÍ** — Representa registros pendientes de procesar |
| ¿Tiene sentido para futuras auditorías? | **SÍ** — Es necesario para saber qué registros no han sido procesados |
| ¿Tiene sentido para futuras periodicidades? | **SÍ** — Permite agrupar registros por estado inicial para vencimientos |

#### `en_proceso`

| Atributo | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué significa? | El registro está siendo activamente trabajado por el operativo |
| Responsabilidad | Indicar que el registro tiene actividad en curso |
| ¿Es persistente? | **SÍ** — Se persiste en DB |
| ¿Es computado? | **NO** — Es un valor explícito del usuario |
| ¿Quién lo modifica? | El usuario vía dropdown. También es el estado destino de `Reabrir` |
| ¿Puede modificarse manualmente? | **SÍ** — El usuario puede cambiarlo a `pendiente` o `completado` vía dropdown |
| ¿Tiene sentido operacional? | **SÍ** — Es el estado de trabajo activo más importante |
| ¿Tiene sentido para futuras auditorías? | **SÍ** — Permite medir tiempo de procesamiento activo |
| ¿Tiene sentido para futuras periodicidades? | **SÍ** — Los registros en proceso pueden tener alertas de tiempo |

#### `completado`

| Atributo | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué significa? | El registro ha sido completado por el operativo y está listo para revisión/aprobación |
| Responsabilidad | Antesala de aprobación. Es el último estado de trabajo del usuario |
| ¿Es persistente? | **SÍ** — Se persiste en DB |
| ¿Es computado? | **NO** — Es un valor explícito del usuario |
| ¿Quién lo modifica? | El usuario vía dropdown (operativo) |
| ¿Puede modificarse manualmente? | **SÍ** — El usuario puede cambiarlo a `en_proceso` o `pendiente` |
| ¿Tiene sentido operacional? | **SÍ** — Marca que el operativo terminó su trabajo |
| ¿Tiene sentido para futuras auditorías? | **SÍ** — Es el punto de entrada al workflow de aprobación |
| ¿Tiene sentido para futuras periodicidades? | **SÍ** — Registros completados sin aprobar pueden tener alertas de vencimiento |

#### `approved`

| Atributo | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué significa? | El registro ha sido aprobado por calidad/administración. Certifica que cumple las condiciones operacionales |
| Responsabilidad | Certificación de calidad. Es una aprobación **operacional** (no administrativa) |
| ¿Es persistente? | **SÍ** — Se persiste en DB |
| ¿Es computado? | **NO** — Lo escribe `Orchestrator.approveRecords` tras validar precondiciones |
| ¿Quién lo modifica? | El usuario con rol `calidad` o `administrador` mediante el botón "Aprobar" |
| ¿Puede modificarse manualmente? | **NO** — Solo vía botón "Aprobar" con validación. Orchestrator valida `canApprove` |
| ¿Tiene sentido operacional? | **SÍ** — Es la certificación de que el registro cumple los requisitos |
| ¿Tiene sentido para futuras auditorías? | **SÍ** — Fundamental para la trazabilidad de aprobaciones |
| ¿Tiene sentido para futuras periodicidades? | **SÍ** — Los registros aprobados pueden tener vencimientos (revisión periódica) |

#### `cerrado`

| Atributo | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué significa? | Estado terminal del registro. El ciclo de vida ha concluido |
| Responsabilidad | Indicar que el registro está cerrado y no requiere más acciones |
| ¿Es persistente? | **SÍ** — Se persiste en DB |
| ¿Es computado? | **NO** — Lo escribe `Orchestrator.closeRecords` tras validar `canClose` |
| ¿Quién lo modifica? | El usuario con rol `calidad` o `administrador` mediante el botón "Cerrar" |
| ¿Puede modificarse manualmente? | **SÍ pero con restricción** — Solo vía "Reabrir" que lo devuelve a `en_proceso` |
| ¿Tiene sentido operacional? | **SÍ** — Es necesario saber qué registros están finalizados |
| ¿Tiene sentido para futuras auditorías? | **SÍ** — Es el evento final en la línea de tiempo del registro |
| ¿Tiene sentido para futuras periodicidades? | **SÍ** — Registros cerrados pueden tener retención documental o archivado |

### 1.3 Estados computados (Readiness Engine — NO se persisten)

Los siguientes estados existen en `getReadinessState()` de `OperationalDataCompletion.js` pero **NUNCA se escriben en DB**:

| Estado | Condición | Naturaleza |
|--------|-----------|------------|
| `draft` | `score < 100` | **Computado** — Registro incompleto |
| `validated` | `score === 100` y sin errores y sin inconsistencias | **Computado** — Registro completo y listo para aprobar |
| `ready` | `record.estado === 'ready'` | **Computado** — Ready explícito (marcado manual) |
| `inconsistent` | `detectInconsistencies()` retorna issues | **Computado** — Datos inconsistentes |
| `pending_completion` | `errors.length > 0` | **Computado** — Errores de validación presentes |

---

## FASE 2 — Record Actions Audit

### 2.1 Dropdown Audit

**Evidencia en código:** `OperationalExperienceRegistry.js` línea que define `estado` options, y `UniversalOperationalRuntime.jsx` líneas del select de bulk actions.

**Estado actual (Sprint 132.1A — ya corregido en Registry):**
El Registry ya tiene solo 3 opciones: `['pendiente', 'en_proceso', 'completado']`

**Veredicto Dropdown:**

| Opción | ¿Debe aparecer? | Razón |
|--------|-----------------|-------|
| `pendiente` | **SÍ** | Estado de trabajo del usuario, modificable manualmente |
| `en_proceso` | **SÍ** | Estado de trabajo del usuario, modificable manualmente |
| `completado` | **SÍ** | Estado de trabajo del usuario, modificable manualmente |
| `draft` | **NO** | Estado computado del Readiness Engine, no se persiste |
| `validated` | **NO** | Estado computado del Readiness Engine, no se persiste |
| `ready` | **NO** | Estado computado del Readiness Engine, no se persiste |
| `approved` | **NO** | Acción controlada por botón "Aprobar" con validación |
| `cerrado` | **NO** | Acción controlada por botón "Cerrar" con validación |

### 2.2 Button Audit

#### Botón: Aprobar

| Atributo | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué representa? | Una **acción de certificación operacional** que transiciona un registro a `approved` |
| ¿Es una acción? | **SÍ** — Es una acción supervisada con precondiciones |
| ¿Es un workflow? | **NO** — Es un paso del workflow, no un workflow completo |
| ¿Es un estado? | **NO** — El estado resultante es `approved`, el botón es la acción |
| ¿Tiene relación con el score? | **SÍ** — `canApprove` requiere que `getReadinessState` retorne `'validated'` o `'ready'`, lo que implícitamente requiere `score === 100` |
| ¿Tiene relación con las vistas? | **SÍ** — La vista "Listos" muestra registros que pueden aprobarse |
| ¿Tiene relación con periodicidad futura? | **SÍ** — Registros aprobados pueden ser sujetos a revisión periódica |
| ¿Tiene relación con auditorías futuras? | **SÍ** — La aprobación queda registrada en el audit trail |
| ¿Duplica funcionalidad existente? | **NO** — El dropdown ya no tiene `approved`. Es único |

#### Botón: Cerrar

| Atributo | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué representa? | Una **acción de finalización** que transiciona el registro a `cerrado` (estado terminal) |
| ¿Es una acción? | **SÍ** |
| ¿Es un workflow? | **NO** |
| ¿Es un estado? | **NO** — El estado resultante es `cerrado` |
| ¿Tiene relación con el score? | **INDIRECTA** — Solo requiere que el estado actual sea `approved` |
| ¿Tiene relación con las vistas? | **SÍ** — Aparece en la vista "Aprobados" |
| ¿Tiene relación con periodicidad futura? | **SÍ** — El cierre puede activar retención documental |
| ¿Tiene relación con auditorías futuras? | **SÍ** — El cierre queda registrado |
| ¿Duplica funcionalidad existente? | **NO** — El dropdown ya no tiene `cerrado`. Es único |

#### Botón: Reabrir

| Atributo | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué representa? | Una **acción de reversión** que permite volver a trabajar un registro cerrado o aprobado |
| ¿Es una acción? | **SÍ** |
| ¿Es un workflow? | **NO** |
| ¿Es un estado? | **NO** — El estado destino es `en_proceso` |
| ¿Tiene relación con el score? | **NO** — No depende del score, solo del estado actual |
| ¿Tiene relación con las vistas? | **SÍ** — Aparece en vistas "Aprobados" y "Cerrados" |
| ¿Tiene relación con periodicidad futura? | **SÍ** — Permite reabrir registros para corrección periódica |
| ¿Tiene relación con auditorías futuras? | **SÍ** — La reapertura se registra en el timeline |
| ¿Duplica funcionalidad existente? | **NO** — No hay otro mecanismo para revertir `cerrado`/`approved` |

#### Botón: Exportar (Bulk)

| Atributo | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué representa? | **Salida de datos** de los registros seleccionados a formato CSV |
| ¿Es una acción? | **SÍ** — Acción de exportación selectiva |
| ¿Tiene relación con el score? | **NO** |
| ¿Duplica funcionalidad existente? | **NO** — Exportar en Header exporta todos. Exportar en Bulk exporta seleccionados |

#### Botón: Eliminar (Bulk)

| Atributo | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué representa? | **Destrucción física** de registros seleccionados |
| ¿Es una acción? | **SÍ** |
| ¿Tiene relación con el score? | **NO** |
| ¿Duplica funcionalidad existente? | **NO** — Eliminar individual (fila) vs Eliminar masivo (bulk) |

---

## FASE 3 — Completion Score Audit

### 3.1 Evidencia en código

`computeCompletionScore` en `OperationalDataCompletion.js`:

```js
export function computeCompletionScore(record, contract) {
  const canonicalFields = contract.documentContract?.canonicalFields || [];
  const total = canonicalFields.length;
  let filled = 0;
  // ... cuenta campos llenos vs total
  const score = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { score, total, filled, missing, warnings, errors };
}
```

### 3.2 Veredicto por pregunta

| Pregunta | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué representa realmente el score? | **Completitud del registro** — Es el porcentaje de campos canónicos que tienen valor. NO representa calidad, aprobación ni readiness |
| ¿Representa calidad? | **NO** — La calidad se mide por complianceRules, no por llenado de campos |
| ¿Representa completitud? | **SÍ** — Es exactamente eso: qué tan completo está el registro en términos de campos llenos |
| ¿Representa aprobación? | **NO** — La aprobación es una acción del usuario que requiere score 100% como precondición, pero no son equivalentes |
| ¿Representa readiness? | **NO** — Readiness es un estado computado que combina score + errores + inconsistencias. El score es solo un input |
| ¿Debe pertenecer al workflow? | **NO** — El score es una métrica. El workflow son los estados y acciones |
| ¿Debe pertenecer al motor de validación? | **SÍ** — El score se computa en tiempo real basado en datos, no se persiste |
| ¿Debe ser configurable? | **SÍ** — El threshold (actualmente 100) debería ser configurable por módulo/contrato |
| ¿Debe variar dependiendo del módulo? | **SÍ** — Diferentes módulos pueden requerir diferentes niveles de completitud |

### 3.3 Significado certificado de cada valor de score

| Score | Significado Operacional |
|-------|------------------------|
| **0%** | Registro recién creado o importado sin datos. Todos los campos están vacíos |
| **25%** | Registro con algunos campos llenos, pero la mayoría de los requeridos están vacíos |
| **50%** | Registro aproximadamente medio completo. Campos críticos pueden estar vacíos |
| **80%** | Registro mayormente completo. Pueden faltar campos opcionales |
| **100%** | Todos los campos canónicos tienen valor. El registro está completo para efectos de llenado |

### 3.4 Score Flow Diagram

```
computeCompletionScore(record, contract)
  ↓
canonicalFields.forEach(field → check if filled)
  ↓
result: { score: 0-100, total, filled, missing, warnings, errors }
  ↓
  usado por:
  ├── getReadinessState() → determina draft/validated/inconsistent/pending_completion
  ├── canApprove()        → requiere state === 'validated' (score=100 + sin errores + sin inconsistencias)
  ├── Badge en UI         → muestra score visual (verde/azul/amarillo/rojo)
  ├── Completion summary  → tarjetas de resumen (Completos / Por completar / Vacíos)
  └── Vista "Borradores"  → readinessState === 'draft' (score < 100)
```

---

## FASE 4 — Approval Governance Audit

### 4.1 Evidencia en código

**canApprove** en `OperationalDataCompletion.js`:
```js
export function canApprove(record, contract) {
  const state = getReadinessState(record, contract);
  return state === 'ready' || state === 'validated';
}
```

**getReadinessState** para retornar `'validated'`:
```js
if (inconsistencies.length > 0) return 'inconsistent';
if (errors.length > 0) return 'pending_completion';
if (score < 100) return 'draft';
return 'validated';
```

### 4.2 Veredicto por pregunta

| Pregunta | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué significa `approved`? | Certificación operacional de que el registro cumple con los requisitos de completitud y consistencia |
| ¿Es un estado? | **SÍ** — Es un estado persistente en DB que representa que el registro fue aprobado |
| ¿Es una certificación? | **SÍ** — Es una certificación de calidad operacional a nivel de completitud de datos |
| ¿Es una aprobación operacional? | **SÍ** — Es una aprobación realizada por un usuario con rol calidad o administrador |
| ¿Es una aprobación administrativa? | **NO** — Es operacional. Una aprobación administrativa sería un concepto diferente (ej: aprobación de presupuesto) |
| ¿Es reutilizable para futuras auditorías? | **SÍ** — El flag `approved` en el registro permite filtrar y auditar qué registros fueron certificados |
| ¿Debe depender del score? | **SÍ** — Indirectamente. `canApprove` requiere `validated`, que requiere `score === 100` |
| ¿Debe depender de validaciones? | **SÍ** — `validated` requiere `errors.length === 0` e `inconsistencies.length === 0` |
| ¿Debe existir? | **SÍ** — Es necesario como paso previo al cierre y para trazabilidad |

### 4.3 Condiciones certificadas para aprobación

```
canApprove(record) = TRUE
  ├── readinessState === 'validated'
  │     ├── score === 100
  │     ├── errors.length === 0
  │     └── inconsistencies.length === 0
  └── readinessState === 'ready'
        └── record.estado === 'ready' (marcado manual)
```

---

## FASE 5 — Close Governance Audit

### 5.1 Evidencia en código

**canClose** en `OperationalDataCompletion.js`:
```js
export function canClose(record, contract) {
  const state = getReadinessState(record, contract);
  return state === 'approved';
}
```

### 5.2 Veredicto por pregunta

| Pregunta | Respuesta Certificada |
|----------|-----------------------|
| ¿Qué significa cerrar un registro? | Finalizar formalmente el ciclo de vida del registro |
| ¿Es un estado? | **SÍ** — `cerrado` es un estado persistente en DB |
| ¿Es una acción? | **SÍ** — "Cerrar" es la acción que produce el estado `cerrado` |
| ¿Es reversible? | **SÍ** — Vía el botón "Reabrir" que transiciona a `en_proceso` |
| ¿Debe requerir aprobación previa? | **SÍ** — `canClose` requiere `state === 'approved'`. No se puede cerrar sin aprobar |
| ¿Representa el final del workflow? | **SÍ** — Es el estado terminal del ciclo de vida operacional |
| ¿Tiene utilidad futura? | **SÍ** — Los registros cerrados pueden ser archivados, exportados o retenidos |

---

## FASE 6 — Reopen Governance Audit

### 6.1 Evidencia en código

**canReopen** en `OperationalDataCompletion.js`:
```js
export function canReopen(record, contract) {
  return record.estado === 'cerrado' || record.estado === 'approved';
}
```

**reopenRecords** en `OperationalExperienceLifecycleOrchestrator.js`:
```js
const updated = await this._service.update(id, { estado: 'en_proceso' });
```

### 6.2 Veredicto por pregunta

| Pregunta | Respuesta Certificada |
|----------|-----------------------|
| ¿Por qué existe? | Para corregir registros que fueron cerrados o aprobados incorrectamente |
| ¿Qué estado debe restaurar? | **`en_proceso`** — Estado de trabajo activo. No `validated` (computado) ni `pendiente` (inicial) |
| ¿Debe restaurar workflow? | **SÍ** — Al volver a `en_proceso`, el registro puede pasar nuevamente por completado → approved → cerrado |
| ¿Debe restaurar score? | **NO** — El score se computa en tiempo real. Se recalcula automáticamente |
| ¿Debe restaurar aprobación? | **NO** — Al reabrir, el registro pierde `approved` y debe ser aprobado nuevamente |
| ¿Debe conservar trazabilidad? | **SÍ** — El EventBus publica `RECORDS_REOPENED` y el AuditService registra la reapertura |

---

## FASE 7 — Operational Views Audit

### 7.1 Evidencia en código

```js
const views = [
  { key: 'all', label: 'Todos', icon: ListChecks },
  { key: 'pending', label: 'Pendientes', icon: Clock },
  { key: 'inProcess', label: 'En proceso', icon: Columns3 },
  { key: 'completed', label: 'Completados', icon: CheckCircle },
  { key: 'draft', label: 'Borradores', icon: Edit2 },
  { key: 'pendingCompletion', label: 'Por completar', icon: AlertTriangle },
  { key: 'inconsistent', label: 'Inconsistentes', icon: ShieldAlert },
  { key: 'duplicates', label: 'Duplicados', icon: Copy },
  { key: 'readyToClose', label: 'Listos', icon: CheckCheck },
  { key: 'approved', label: 'Aprobados', icon: CheckCheck },
  { key: 'closed', label: 'Cerrados', icon: CheckCircle },
  { key: 'withObservations', label: 'Con observaciones', icon: AlertTriangle },
  { key: 'importedToday', label: 'Importados hoy', icon: Download },
];
```

### 7.2 Veredicto por vista

| Vista | Naturaleza | ¿Sobrevive? | Razón |
|-------|-----------|-------------|-------|
| `Todos` | Filtro (todos) | **SÍ** | Vista por defecto necesaria |
| `Pendientes` | Filtro por estado DB | **SÍ** | Estado operacional `pendiente` |
| `En proceso` | Filtro por estado DB | **SÍ** | Estado operacional `en_proceso` |
| `Completados` | Filtro por estado DB | **SÍ** | Estado operacional `completado` |
| `Borradores` | **Computado** (Readiness) | **SÍ** | Vista útil: muestra registros con score < 100% |
| `Por completar` | **Computado** (Readiness) | **SÍ** | Vista útil: muestra registros con errores de validación |
| `Inconsistentes` | **Computado** (Readiness) | **SÍ** | Vista útil: muestra registros con datos inconsistentes |
| `Duplicados` | **Computado** (detectDuplicates) | **SÍ** | Vista útil para control de calidad |
| `Listos` | **Computado** (Readiness) | **SÍ** | Vista útil: muestra registros que pueden aprobarse (`validated` o `ready`) |
| `Aprobados` | Filtro por estado DB | **SÍ** | Estado operacional `approved` |
| `Cerrados` | Filtro por estado DB | **SÍ** | Estado operacional `cerrado` |
| `Con observaciones` | **Computado** | **SÍ** | Filtro útil operacionalmente |
| `Importados hoy` | **Computado** (fecha) | **SÍ** | Filtro útil para operaciones de importación |

### 7.3 Clasificación certificada de vistas

| Categoría | Vistas |
|-----------|--------|
| **Estados DB (filtro directo)** | Todos, Pendientes, En proceso, Completados, Aprobados, Cerrados |
| **Computados (Readiness Engine)** | Borradores, Por completar, Inconsistentes, Listos |
| **Computados (Business Logic)** | Duplicados, Con observaciones, Importados hoy |
| **A eliminar** | Ninguna — todas las vistas actuales tienen utilidad operacional |

### 7.4 Relación de vistas con componentes

```
viewFilters = useMemo(() => ({
  all:             () => true,
  pending:         r => r.estado === 'pendiente' || !r.estado,
  inProcess:       r => r.estado === 'en_proceso',
  completed:       r => r.estado === 'completado',
  approved:        r => r.estado === 'approved',
  closed:          r => r.estado === 'cerrado',
  draft:           r => readinessStates[r.id] === 'draft',
  pendingCompletion: r => readinessStates[r.id] === 'pending_completion',
  inconsistent:    r => recordInconsistencies[r.id]?.length > 0,
  duplicates:      r => duplicatedIds.has(r.id),
  readyToClose:    r => readinessStates[r.id] === 'validated' || readinessStates[r.id] === 'ready',
  withObservations: r => String(r.observaciones ?? '').trim().length > 0,
  importedToday:   r => isImportedToday(r),
}), [records, completionScores, readinessStates, recordInconsistencies, duplicatedIds]);
```

---

## FASE 8 — Record Selection Layer Audit

### 8.1 Funcionamiento actual

La selección de registros se maneja con un `Set` de IDs en estado `selectedIds`:

```js
const [selectedIds, setSelectedIds] = useState(new Set());
```

**Mecanismos:**
- **Seleccionar individual:** `toggleSelect(id)` — agrega/remueve del Set
- **Seleccionar todos:** `toggleSelectAll()` — selecciona/deselecciona todos los registros filtrados
- **Checkbox en tabla:** Cada fila tiene un checkbox que llama a `toggleSelect`
- **Checkbox en header:** Checkbox maestro que llama a `toggleSelectAll`

### 8.2 Dependencias

| Dependencia | Propósito | ¿Se recalcula en cada render? |
|-------------|-----------|-------------------------------|
| `selectedIds` (Set) | IDs seleccionados | Estado base, no se recalcula |
| `allFilteredSelected` (useMemo) | ¿Todos los filtrados están seleccionados? | **SÍ** — dependencias: `[filteredRecords, selectedIds]` |
| `filteredRecords` (useMemo) | Registros filtrados por vista + búsqueda + filtros | **SÍ** — 8 dependencias |
| Bulk actions bar | Renderizado condicional si `selectedIds.size > 0` | Condicional |

### 8.3 Optimizaciones identificadas

| Problema | Impacto | Optimización propuesta |
|----------|---------|----------------------|
| `selectedIds` es un Set creado en cada render si no se usa `useRef` | Bajo | Ya está correctamente implementado con `useState` |
| `allFilteredSelected` recalcula en cada cambio de `filteredRecords` | Medio | Podría memoizarse más agresivamente, pero el impacto es bajo dado el tamaño típico de registros |
| Bulk actions bar se re-renderiza completamente al cambiar selección | Medio | Podría extraerse a un componente memoizado |

---

## FASE 9 — Delete Performance Audit (CRÍTICA)

### 9.1 Evidencia en código

**Delete individual** — `Orchestrator.deleteRecord`:
```js
async deleteRecord(id, user) {
  await this._service.delete(id);
  OperationalAuditService.auditDelete({...});
  OperationalEventBus.publish('RECORD_DELETED', {...});
  return { success: true, action: 'deleted' };
}
```

**Delete masivo** — `Orchestrator.bulkDelete`:
```js
async bulkDelete(ids, user) {
  for (const id of ids) {
    await this._service.delete(id);           // N llamadas SECUENCIALES
    OperationalAuditService.auditDelete({...}); // N auditorías SECUENCIALES
  }
  OperationalEventBus.publish('RECORDS_BULK_DELETED', {...}); // 1 evento al final
  return { success: true, count: ids.length, action: 'bulk_deleted' };
}
```

**Service layer** — `operationalRecordsService.js`:
```js
async delete(id) {
  const sb = getSupabaseClient();
  const { error } = await sb.from(tableName).delete().eq('id', id); // 1 llamada por ID
  if (error) throw error;
  return true;
}
```

### 9.2 Diagnóstico

| Aspecto | Diagnóstico |
|---------|-------------|
| ¿Cuántas llamadas realiza? | **2N** — N DELETE + N auditDelete (para N registros) |
| ¿Son secuenciales? | **SÍ** — `for ... await ...` bloquea hasta completar cada iteración |
| ¿Existe batch delete? | **NO** — No hay `deleteBatch` en el service layer. Supabase soporta `.delete().in('id', ids)` |
| ¿Existe optimistic update? | **PARCIAL** — `handleBulkDelete` espera a que todas las promesas se resuelvan antes de actualizar UI |
| ¿Existe EventBus? | **SÍ** — Pero solo publica 1 evento al final, no por registro |
| ¿Existe rerender innecesario? | **SÍ** — `setRecords(prev => prev.filter(...))` se ejecuta una vez al final, pero mientras tanto la UI está congelada |
| ¿Existe doble persistencia? | **NO** — Cada registro se elimina una sola vez |
| ¿Existe recálculo del Runtime? | **SÍ** — Al actualizar `records`, se recalculan: `completionScores`, `readinessStates`, `recordInconsistencies`, `duplicateGroups`, `filteredRecords`, `viewCounts` |
| ¿Existe bloqueo del render? | **SÍ** — Mientras el bucle `for` se ejecuta, el hilo principal está bloqueado |

### 9.3 Tiempos estimados

| Escenario | Llamadas | Tiempo estimado (100ms/llamada) |
|-----------|----------|--------------------------------|
| Delete 1 registro | 2 (DELETE + audit) | ~200ms |
| Delete 100 registros | 200 | **~20 segundos** |
| Delete 500 registros | 1000 | **~100 segundos (1:40 min)** |
| Delete 1000 registros | 2000 | **~200 segundos (3:20 min)** |

### 9.4 Cuellos de botella identificados

| # | Cuello de botella | Causa raíz | Severidad |
|---|-------------------|------------|-----------|
| 1 | **N iteraciones secuenciales** | `for...of` con `await` sin paralelismo ni batch | **CRÍTICA** |
| 2 | **Sin deleteBatch** | Service layer no usa `.delete().in('id', ids)` | **CRÍTICA** |
| 3 | **Auditoría secuencial** | `auditDelete` se llama dentro del bucle | **ALTA** |
| 4 | **Sin feedback progresivo** | UI se congela hasta que todas las promesas se resuelven | **ALTA** |
| 5 | **Recálculo completo del Runtime** | Al actualizar `records`, todos los useMemo se recalculan | **MEDIA** |

### 9.5 Propuesta mínima de optimización

```js
// En operationalRecordsService.js — AGREGAR:
async deleteBatch(ids) {
  const sb = getSupabaseClient();
  const { error } = await sb.from(tableName).delete().in('id', ids); // 1 llamada
  if (error) throw error;
  return true;
}

// En Orchestrator — OPTIMIZAR bulkDelete:
async bulkDelete(ids, user) {
  await this._service.deleteBatch(ids);                                    // 1 llamada batch
  await OperationalAuditService.auditBatchDelete(ids.map(id => ({...})));  // 1 llamada batch
  OperationalEventBus.publish('RECORDS_BULK_DELETED', {...});
  return { success: true, count: ids.length };
}

// En UI Runtime — AGREGAR optimistic update:
const handleBulkDelete = async () => {
  const ids = Array.from(selectedIds);
  setRecords(prev => prev.filter(r => !selectedIds.has(r.id))); // OPTIMISTIC: actualizar UI inmediatamente
  setSelectedIds(new Set());
  try {
    await orchestratorRef.current.bulkDelete(ids, auditUser);
    setBanner({ type: 'success', message: `${ids.length} registro(s) eliminados.` });
  } catch (err) {
    setRecords(prev => [...prev, ...ids.map(id => ({ id }))]); // ROLLBACK en caso de error
    setBanner({ type: 'error', message: 'Error al eliminar: ' + err.message });
  }
};
```

**Impacto estimado de la optimización:**

| Escenario | Antes | Después | Mejora |
|-----------|-------|---------|--------|
| Delete 100 registros | ~20 segundos | **~500ms** (1 batch + 1 audit) | **40x** |
| Delete 500 registros | ~100 segundos | **~1 segundo** | **100x** |
| Delete 1000 registros | ~200 segundos | **~1.5 segundos** | **130x** |

---

## FASE 10 — Runtime Performance Audit

### 10.1 Diagnóstico de rendimiento

| Operación | ¿Es lenta? | Causa | Severidad |
|-----------|-----------|-------|-----------|
| Carga de registros | **Media** | `Supabase.select('*')` sin paginación. Con >10K registros se vuelve lento | MEDIA |
| Filtros (vistas) | **Media** | `filteredRecords` tiene 8 dependencias. Se recalcula completamente en cada cambio | MEDIA |
| Bulk Actions | **ALTA** | N iteraciones secuenciales sin batch. Apr/Close/Reopen también iteran | **ALTA** |
| Dropdown | **Baja** | Solo renderiza un select con 3 opciones. No es problema | BAJA |
| Views | **Media** | `viewCounts` recalcula conteo de todas las vistas en cada cambio de records | MEDIA |
| Importación | **Baja** | Ya usa `insertBatch` con chunkSize 200. Solo 1 llamada por chunk | BAJA |
| Exportación | **Baja** | Solo envía datos a jsPDF o genera CSV. No es intensivo | BAJA |
| Delete | **CRÍTICA** | N iteraciones secuenciales. Diagnóstico completo en FASE 9 | **CRÍTICA** |
| Refresh | **Media** | Recarga todo desde BD. Similar a carga inicial | MEDIA |
| Completion Score | **Media** | Se recalcula para TODOS los registros en cada cambio de `records`. O(n * fields) | MEDIA |
| Readiness | **Media** | Depende de completionScores. Se recalcula en cascada | MEDIA |
| Rendering | **Alta** | 19 useState + 12 useMemo. Cambios en records disparan recálculos en cadena | **ALTA** |

### 10.2 Mapa de recalculos en cadena

```
records cambia
  ↓
completionScores (useMemo) → O(n * canonicalFields) — recalcula score para cada registro
  ↓
readinessStates (useMemo) → O(n) — recalcula readiness para cada registro
  ↓
recordInconsistencies (useMemo) → O(n) — detecta inconsistencias para cada registro
  ↓
duplicateGroups (useMemo) → O(n * groupFields) — detecta duplicados
  ↓
duplicatedIds (useMemo) → O(groups) — extrae IDs duplicados
  ↓
viewFilters (useMemo) → computa 13 filtros sobre todos los registros
  ↓
viewCounts (useMemo) → cuenta registros en cada vista
  ↓
filteredRecords (useMemo) → aplica vista activa + búsqueda + filtros
```

### 10.3 Lo que es lento y por qué

| # | ¿Qué es lento? | ¿Por qué? |
|---|---------------|-----------|
| 1 | **Delete masivo** | N iteraciones secuenciales. Sin batch delete. Sin feedback progresivo |
| 2 | **Filtrado de registros** | Se recalcula completo en cada cambio. 8 dependencias + O(n * fields) |
| 3 | **Completion Score** | Se recalcula para todos los registros, incluso los no visibles |
| 4 | **Render condicional** | 19 useState causan re-renders en cadena. Sin React.memo en componentes hijos |

### 10.4 Lo que NO debe tocarse

| Componente | Razón |
|-----------|-------|
| **OperationalEventBus** | Funciona correctamente. Es simple y eficiente |
| **Import pipeline** | Ya usa batch con chunkSize 200. Es óptimo |
| **Export pipeline** | Baja criticidad. Funciona bien |
| **Form validation** | Se ejecuta solo al abrir formulario. No afecta la tabla |
| **Orchestrator CRUD individual** | Create, update, delete individual son rápidos |

---

## FASE 11 — Future Scalability Audit

### 11.1 Compatibilidad con funcionalidades futuras

| Funcionalidad Futura | Compatibilidad Actual | Acción Necesaria |
|---------------------|----------------------|------------------|
| **Periodicidades** | **ALTA** — Los estados `approved` y `cerrado` permiten adjuntar fechas de vencimiento/revisión | Ninguna inmediata |
| **Alertas** | **ALTA** — El EventBus ya publica eventos de creación, actualización, aprobación, cierre, reapertura | Las alertas pueden suscribirse al EventBus |
| **Auditorías internas** | **ALTA** — El audit trail existe y registra todas las operaciones con usuario y timestamp | Ninguna inmediata |
| **Vencimientos** | **MEDIA** — No hay campo de fecha de vencimiento en el modelo, pero los estados permiten identificar registros activos vs cerrados | Agregar campo `fecha_vencimiento` en contratos futuros |
| **Certificaciones** | **ALTA** — `approved` puede servir como certificación operacional base | Ninguna inmediata |
| **Workflow documental** | **MEDIA** — El workflow operacional actual es independiente del documental. Deben coexistir | Definir integración en sprint futuro |
| **Workflow operacional** | **ALTA** — Ya existe y está certificado en este documento | Ninguna |
| **Multi módulos** | **ALTA** — Cada módulo tiene su propio contrato en el Registry con sus propios estados, reglas y validaciones | Ninguna |
| **Metadata Factory** | **ALTA** — El Registry ya es un patrón de Metadata. Los contratos definen todo el comportamiento | Ninguna |
| **Universal Runtime** | **ALTA** — El Runtime actual ya es universal. Un solo componente sirve para todos los módulos | Ninguna |

### 11.2 Escalabilidad

| Aspecto | Evaluación |
|---------|------------|
| ¿Las decisiones tomadas son reutilizables? | **SÍ** — Los 5 estados certificados, las 3 vistas de trabajo, y los patrones de validación son reutilizables en cualquier módulo operacional |
| ¿Son escalables? | **SÍ** — El modelo de estados es plano (no jerárquico), simple y extensible. Se pueden agregar módulos sin modificar el Runtime |
| ¿Son Metadata Driven? | **SÍ** — Todo el comportamiento está definido en los contratos del Registry. El Runtime solo consume contratos |
| ¿Son Runtime Driven? | **SÍ** — El Runtime es el consumidor universal. Orquesta vistas, acciones y validaciones basadas en contratos |
| ¿Son compatibles con futuras experiencias operacionales? | **SÍ** — El patrón de Registry + Orchestrator + Runtime + EventBus permite agregar nuevas experiencias sin modificar el núcleo |

### 11.3 Gobernanza operacional futura

```
PRINCIPIOS DE GOBERNANZA FUTURA

1. Los estados persistentes son SOLO 5: pendiente, en_proceso, completado, approved, cerrado
2. Los estados computados (Readiness) NUNCA se persisten en DB
3. El dropdown solo expone estados de trabajo del usuario (pendiente, en_proceso, completado)
4. Los botones Aprobar/Cerrar/Reabrir son las únicas vías para transiciones supervisadas
5. El Orchestrator es la única autoridad del lifecycle — valida antes de persistir
6. El EventBus es el mecanismo de comunicación entre componentes del sistema
7. El score mide completitud, no calidad ni aprobación
8. Las vistas operacionales se clasifican en: estados DB, computados (Readiness), y computados (Business Logic)
9. Nuevos módulos solo requieren registrar un contrato en el Registry
10. Nuevas acciones operacionales siguen el patrón: UI handler → Orchestrator (con validación) → Service → EventBus
```

---

## Entregables Certificados

### Workflow Operacional Definitivo

```
CREACIÓN → pendiente → en_proceso → completado → [Aprobar] → approved → [Cerrar] → cerrado
                           ↑                                                           │
                           └─────────────────── [Reabrir] ────────────────────────────┘
```

### Estados (5 persistentes)

| # | Estado | Naturaleza | Persiste | ¿Quién lo modifica? |
|---|--------|-----------|----------|---------------------|
| 1 | `pendiente` | Estado de trabajo | DB | Usuario (dropdown) o sistema (creación) |
| 2 | `en_proceso` | Estado de trabajo | DB | Usuario (dropdown) o Reabrir |
| 3 | `completado` | Estado de trabajo | DB | Usuario (dropdown) |
| 4 | `approved` | Certificación operacional | DB | Usuario (botón Aprobar con validación) |
| 5 | `cerrado` | Estado terminal | DB | Usuario (botón Cerrar con validación) |

### Estados computados (NO persistentes)

| Estado | Condición |
|--------|-----------|
| `draft` | `score < 100` |
| `validated` | `score === 100` + sin errores + sin inconsistencias |
| `ready` | `record.estado === 'ready'` |
| `inconsistent` | `detectInconsistencies()` retorna issues |
| `pending_completion` | `errors.length > 0` |

### Acciones

| Acción | Estado destino | Validación | EventBus |
|--------|---------------|------------|----------|
| Dropdown (cambio estado) | `pendiente/en_proceso/completado` | Solo permite 3 estados | `RECORDS_STATUS_UPDATED` |
| Aprobar | `approved` | `canApprove`: readiness = validated o ready | `RECORDS_APPROVED` |
| Cerrar | `cerrado` | `canClose`: estado = approved | `RECORDS_CLOSED` |
| Reabrir | `en_proceso` | `canReopen`: estado = cerrado o approved | `RECORDS_REOPENED` |
| Eliminar | — | Confirmación usuario | `RECORD_DELETED` / `RECORDS_BULK_DELETED` |

### Vistas Definitivas (TODAS sobreviven)

| Categoría | Vistas |
|-----------|--------|
| **Estados DB** | Todos, Pendientes, En proceso, Completados, Aprobados, Cerrados |
| **Readiness Engine** | Borradores, Por completar, Inconsistentes, Listos |
| **Business Logic** | Duplicados, Con observaciones, Importados hoy |

### Delete Performance Report

| Problema | Severidad | Solución propuesta |
|----------|-----------|-------------------|
| N iteraciones secuenciales sin batch | **CRÍTICA** | Agregar `deleteBatch()` en service layer |
| Auditoría dentro del bucle | **ALTA** | Agregar `auditBatchDelete()` |
| Sin feedback progresivo | **ALTA** | Agregar optimistic update en UI |
| Recálculo completo del Runtime | **MEDIA** | Memoización de componentes de tabla |

**Tiempo estimado actual vs optimizado:**

| Escenario | Actual | Optimizado | Mejora |
|-----------|--------|------------|--------|
| 100 registros | ~20s | ~500ms | **40x** |
| 500 registros | ~100s | ~1s | **100x** |
| 1000 registros | ~200s | ~1.5s | **130x** |

### Runtime Performance Report

| Componente | Estado | Recomendación |
|------------|--------|---------------|
| Carga de registros | Sin paginación | Agregar paginación con range() en service layer |
| Completion Score | Recalcula todos | Memoizar por página visible |
| FilteredRecords | 8 dependencias | Reducir dependencias o memoizar sub-cálculos |
| Rendering (19 useState) | Alto número de estados | Extraer tabla en componente memoizado |

### Future Scalability Report

| Requisito | Compatible | Notas |
|-----------|-----------|-------|
| Periodicidades | ✅ Sí | Estados permiten adjuntar vencimientos |
| Alertas | ✅ Sí | EventBus es extensible para notificaciones |
| Auditorías internas | ✅ Sí | Audit trail completo |
| Certificaciones | ✅ Sí | `approved` como certificación base |
| Multi módulos | ✅ Sí | Registry + Contratos |
| Metadata Driven | ✅ Sí | Todo el comportamiento en contratos |
| Universal Runtime | ✅ Sí | Runtime único para todos los módulos |

---

## Certificación

> **Sprint 132.1A — LEVEL 3 — CERTIFIED**
>
> **Estado:** AUDIT COMPLETE
>
> **Implementación:** 0 cambios de código — 100% Auditoría Arquitectónica y Operacional del Runtime.
>
> El modelo operacional definitivo del ciclo de vida de los registros en el SGC-DM ha sido:
> - Identificado (5 estados persistentes, 5 estados computados)
> - Documentado (significado, responsabilidad, persistencia, modificación)
> - Certificado (workflow, acciones, vistas, score, performance, escalabilidad futura)
>
> Los Sprints 132.2 (implementación de validaciones) y 132.3 (delete performance hardening) pueden proceder con plena autoridad arquitectónica basada en esta auditoría.

---

*Auditoría completada: Julio 2026 · Branch: operativo-v1 · 0 archivos modificados · 1 documento de auditoría producido*

