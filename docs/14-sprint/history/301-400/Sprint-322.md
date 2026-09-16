# Sprint 322 — Forensic Redundancy Audit · Ciclo de Vida del Estado Operacional

**Modo:** AUDIT ONLY · Level 5 · 0 cambios en `src/`
**Suite:** `scripts/sprint-322-operational-status-lifecycle-forensic-audit.mjs`
**Resultado:** **CERTIFIED** 67/67 gates · 12.4s · exit=0 · timebox OK
**Regresión histórica 296–321:** NO ejecutada (audit dirigido, según spec).
**Clasificación final del lifecycle:** **PARTIAL**

---

## 1. Pregunta forense

¿Aprobar / Cerrar / Reabrir constituyen un **ciclo de negocio requerido** o una **segunda
máquina de estados redundante** frente al ciclo operacional `Pendiente → En proceso →
Completado` (con Eliminar como operación destructiva)?

## 2. Cadena de propiedad (E01–E05)

| Acción | Handler (UOR) | Orchestrator | Service (Supabase) | Eventos |
|---|---|---|---|---|
| Cambiar estado | `handleBulkStatus` | `bulkUpdateStatus` | `updateBatch` | `RECORDS_STATUS_UPDATED` (+`RESOURCE_COMPLETED` si `completado`) |
| Aprobar | `handleBulkApprove` | `approveRecords` | `updateBatch` | `RECORDS_APPROVED` + auditoría `approved` |
| Cerrar | `handleBulkClose` | `closeRecords` | `updateBatch` | `RECORDS_CLOSED` + auditoría `closed` |
| Reabrir | `handleBulkReopen` | `reopenRecords` | `updateBatch` | `RECORDS_REOPENED` + auditoría `reopened` |
| Eliminar | `handleBulkDelete` | `bulkDelete` | `deleteBatch` (HARD DELETE) | `RECORDS_BULK_DELETED` |

## 3. Matriz de transiciones (E06–E10)

| De | A | Vía dropdown | Vía ciclo compliance |
|---|---|---|---|
| `pendiente` | `en_proceso` | ✅ | — |
| `en_proceso` | `completado` | ✅ | — |
| `validated/ready` (score 100) | `approved` | ❌ **exclusivo** | ✅ `approveRecords` |
| `approved` | `cerrado` | ❌ **exclusivo** | ✅ `closeRecords` |
| `cerrado`/`approved` | `en_proceso` | ✅ (mismo destino) | ✅ `reopenRecords` |

`approved` y `cerrado` son **inalcanzables** desde el dropdown: solo Aprobar/Cerrar los generan.

## 4. Reglas de negocio (E11–E14)

- `canApprove` = readiness `validated | ready` → **gate de score 100**. Regla que el dropdown operacional NO expresa (permite `completado` sin validación).
- `canClose` = `estado === 'approved'` (cadena obligatoria).
- `canReopen` = `estado === 'cerrado' || estado === 'approved'`.
- Contrato dropdown: `allowedStatuses = ['pendiente','en_proceso','completado']` = `fieldOptions estado` del Registry.

## 5. Consumidores reales (E15–E20)

| Símbolo | Consumidores activos |
|---|---|
| `approved` | view `approved` + vista "Aprobados", badge, `canClose`, `getReadinessState`, **`RECORDS_APPROVED` = señal FINAL del CompletionBridge → OccurrenceLedger** |
| `cerrado` | view `closed` + vista "Cerrados", badge, métrica **Completados = `completado \|\| cerrado`**, `canReopen`, `getReadinessState`, **`RECORDS_CLOSED` = señal FINAL del CompletionBridge** |
| `Reabrir` | `reopenRecords` + guard; evento `RECORDS_REOPENED` **sin consumidor FINAL (solo auditoría)** |
| `completado` | métrica Completados, view `completed` (solo `completado`, **excluye `cerrado`**), `RESOURCE_COMPLETED`, handler `RECORDS_STATUS_UPDATED` del bridge |

- **Dashboard:** 0 referencias a `estado` → métricas independientes; solo lee el trail de auditoría (E19).
- **Views/Filtros:** views `approved`/`closed` son consumidores UI; filtros avanzados data-driven (`getUniqueValues`) (E20).
- **Reglas del contrato:** `complianceRules` referencian únicamente `pendiente` — no dependen de `approved`/`cerrado`.

## 6. Eventos / auditoría (E21–E24)

- `RECORDS_APPROVED` y `RECORDS_CLOSED` son **`FINAL_SINGLE_EVENTS`** del `CompletionBridge`
  (wired activamente en `useAlertRuntime.js`). Son la única vía que el módulo de alertas
  (Sprint 257/280/300) registra como cierre final junto a `RESOURCE_COMPLETED`.
- `RECORDS_REOPENED` no tiene suscripción: consumidor = solo trail de auditoría.
- La vía operacional (`completado` → `RESOURCE_COMPLETED` + `RECORDS_STATUS_UPDATED`) **también**
  alimenta el bridge → el dominio de completion está cubierto por el lifecycle operacional.

## 7. Integridad arquitectónica (E25–E28)

- Single source pipeline: un único `filteredRecords`/`viewFilters`; una única `selectedIds`.
- Exportar e Informe de Evidencia **desacoplados** del lifecycle (sin escrituras de estado).
- Cadena 319 (adapter → modelo → renderer) y 315 (renderer) intactas.
- **Persistencia no acoplada:** no existen `approved_at`/`closed_at`/`reopened_at` en todo `src/`.

## 8. Validación final (E29–E30)

- `git status --short -- src/` → **CLEAN** (único artefacto nuevo: suite 322 + este doc).
- `npm run build` → exit 0.

## 9. Decision forense → **PARTIAL**

**No es REDUNDANT (las 8 condiciones simultáneas NO se cumplen):**
1. ✅ Hay consumidores funcionales: vistas `approved`/`closed`, badges, métrica, gates.
2. ❌ NO hay dependencia del Dashboard (independiente) — ✔ condición, pero...
3. ❌ **SÍ hay dependencia de views/filtros/métrica** → falla la condición 3.
4. ✅ Sin dependencia documental (informe desacoplado).
5. ❌ **SÍ hay dependencia operacional externa**: `RECORDS_APPROVED`/`RECORDS_CLOSED` =
   señales FINALES del CompletionBridge (módulo de alertas ACTIVO) → falla la condición 5.
6. ❌ **SÍ existe regla de negocio exclusiva**: gate de score 100 + cadena aprobar→cerrar
   no expresables por el dropdown → falla la condición 6.
7. ✅ El lifecycle operacional cubre el dominio de completion (`RESOURCE_COMPLETED`),
   pero NO el gate de calidad → falla la condición 7 (cobertura total).
8. ✅ La remoción no rompería persistencia (sin timestamps), pero rompería los contratos
   de eventos y el gate → falla la condición 8 (no rompe dependencias requeridas).

**No es REQUIRED puro (existen rutas de cobertura por el lifecycle operacional):**
- El dominio de **completion** ya se cubre vía `RESOURCE_COMPLETED` (ruta certificada Sprint 257).
- `cerrado` se pliega en la métrica **Completados** (`completado || cerrado`) → superposición
  de representación entre máquinas (la vista `completed` ni siquiera muestra los `cerrado`).
- `Reabrir` produce un destino (`en_proceso`) alcanzable también por dropdown → duplicación parcial.
- `RECORDS_REOPENED` no tiene consumidor de cierre.

**Conclusión:** los tres comandos tienen **consumidores reales actuales** y no pueden retirarse
sin migración; pero existe una **ruta de simplificación controlada**:

> **Migración controlada (propuesta para Sprint 323, NO ejecutada en 322):**
> 1. Absorber el gate de score 100 en la transición operacional `en_proceso → completado`
>    (requiere `canComplete = validated | ready`), para que `completado` sea el único terminal.
> 2. Re-puntar el CompletionBridge a depender únicamente de `RESOURCE_COMPLETED` /
>    `RECORDS_STATUS_UPDATED (completado)` (eliminando `RECORDS_APPROVED`/`RECORDS_CLOSED`
>    de `FINAL_SINGLE_EVENTS`).
> 3. Re-mapear vistas/métricas: `approved` → `completed`; `cerrado` → `completed`;
>    métrica "Completados" → solo `completado`.
> 4. Retirar `Aprobar`/`Cerrar`/`Reabrir` solo tras certificar los pasos 1–3.
>    `Eliminar` (HARD DELETE) es una operación independiente y se mantiene.

**Veredicto emitido por la suite:** `PARTIAL` — dependencia real presente, simplificable
mediante migración controlada. Sin correcciones en este sprint (AUDIT ONLY).