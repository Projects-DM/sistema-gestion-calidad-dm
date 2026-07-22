# TRACEABILITY_DEEP_AUDIT.md — SPRINT T1.0 (Traceability Module Deep Audit)

> Restricción: **NO IMPLEMENTAR CAMBIOS**. **NO MODIFICAR CÓDIGO**. Solo inspección/documentación.

## 0) Alcance (solo módulo)
- Traceability / Trazabilidad
- Historial de despachos (UI “Historial” dentro de `/trazabilidad/despachos`)
- Importación Design Enterprise (Excel → persistencia)
- Consultas relacionadas (búsqueda/filtros dentro de despachos)

## 1) A) Business Flow Audit

### Flujo completo (negocio) — versión “real” observada
**Design Enterprise (UI + input) → Exportación → Importación → Persistencia → Consulta → Historial → Trazabilidad**

#### 1.1 Design Enterprise (qué entra)
- Usuario (roles) entra al módulo desde `Traceability.jsx`.
- Submódulo relevante: **Despachos / Historial** (`/trazabilidad/despachos`).
- Input principal para creación/modificación:
  - Form manual (UI en `Dispatches.jsx`)
  - Excel (UI `ExcelUploadModal` + parse/transform en `dispatchesExcel.js`)

#### 1.2 Exportación (qué se genera)
- Exportación PDF desde el historial de despachos:
  - Trigger: botón “PDF” en `Dispatches.jsx`
  - Implementación: `exportDispatchesPdf()` en `src/utils/dispatchesPdf.js`
  - Incluye campos visibles: fecha, hora, cliente, producto, lote, cantidad, peso, destino, placa, conductor, observaciones.

#### 1.3 Importación (qué transforma)
- Input: archivo Excel `.xlsx` (seleccionado por `ExcelUploadModal`, no auditado aquí).
- Proceso:
  1) `dispatchesExcel.parseDispatchesExcelFile(file)`
  2) Modo “operations report” (fallback) detectando un layout especial tipo `reports/Report.xlsx`.
  3) Si no coincide, detecta fila de encabezados y mapea columnas por sinónimos.
  4) Convierte formatos de fecha/hora y numéricos.
  5) Producción final: lista de objetos con campos canónicos `fechaDespacho, hora, cliente, producto, lote, cantidadBolsas, peso, destino, placa, conductor, observaciones`.

#### 1.4 Persistencia (qué se almacena)
- La persistencia desde este módulo se realiza en Supabase mediante `despachosService.js`.
- Endpoints observados (por llamadas):
  - `fetchDespachos()` → `sb.from('despachos').select('*')`
  - `insertDespacho(payload)` → `sb.from('despachos').insert(payload).select('*').single()`
  - `updateDespacho(id, payload)` → `.update(payload).eq('id', id)`
  - `insertDespachosBatch(payloads)` → `.insert(chunk).select('*')` con chunk de 200
  - `deleteDespacho(id)` → `.delete().eq('id', id)`

- Transformación adicional (UI):
  - `formToInsertPayload()` y `excelRowToInsertPayload()` en `despachosService.js` crean el payload final.
  - Se fuerza `estado: 'Completado'`.

#### 1.5 Consulta (qué se muestra)
- `Dispatches.jsx` carga todo desde `fetchDespachos()` y muestra una tabla.
- Búsqueda real-time en memoria (filtra por cliente/producto/lote/destino/conductor/placa).

#### 1.6 Historial y trazabilidad (cómo se “reconstruye”)
- En esta implementación, “trazabilidad” para despachos se asocia a:
  - listado/historial del registro `despachos`
  - exportación
- Nota importante: el módulo **no** muestra “eventos por despacho” (audit temporal detallado) en este flujo de despachos.
- Existe una auditoría detallada para formularios en `DynamicRecordsView` (verificación/audit por `sgc_audit_logs`), pero **no forma parte del módulo despachos**; es para “registros de formularios” (no despachos en sí).

---

## 2) B) Data Structure Audit

### 2.1 Tablas involucradas (observadas por código)
Para **Despachos / Historial**:
- `despachos` (tabla principal)

Tablas relacionadas (probables/indirectas):
- No se observan joins o dependencias en el módulo despachos (solo `despachos`).

> Importante: el usuario pidió ejemplo de `dispatches`, `dispatch_items`, `clients`, `products`, etc. **En el código actual se observa la tabla única `despachos`**, y no hay separación a ítems/cliente/producto por tabla.

### 2.2 Relaciones
- 1 despacho → N productos: **NO aplica** en el módulo despachos actual.
- El modelo parece ser “desnormalizado”: un registro tiene `producto` (texto) y `cantidad/peso/lote` por fila.

### 2.3 Campos críticos (observados)
En UI/servicios se usan estos campos del registro:
- Identidad:
  - `id` (UUID) (se usa `record.id`, se muestra `displayId`)
- Datos de despacho:
  - `fecha` (string yyyy-MM-dd)
  - `hora` (string HH:mm)
  - `cliente` (texto)
  - `producto` (texto)
  - `lote` (texto)
  - `cantidad_bolsas` (num)
  - `peso` (num)
  - `destino` (texto)
  - `placa` (texto)
  - `conductor` (texto)
  - `observaciones` (texto)
  - `estado` (string; se fuerza “Completado” en insert/form)
  - `created_at` (para orden/mostrar)

### 2.4 Verificaciones de integridad (lo que NO se ve en código)
- Unicidad/constraints: **no verificadas** desde el frontend.
- Índices: **no visibles** aquí (requiere inspección SQL/migraciones; no se incluyeron en esta corrida).

---

## 3) C) Import Process Audit

### 3.1 Archivo origen
- Excel `.xlsx`.
- Se soportan:
  - Layout estándar con encabezados en alguna fila.
  - Layout especial “operations report” (fallback) detectando “reporte de operaciones”.

### 3.2 Quién importa
- Usuario final desde UI `Dispatches.jsx` → `ExcelUploadModal`.

### 3.3 Qué servicio procesa
- `src/utils/dispatchesExcel.js`
  - `parseDispatchesExcelFile(file)`
  - `parseOperationsReport(aoa)`
  - conversiones `toYmd`, `toHm`, `toNumber`
  - mapeo por sinónimos y detección de encabezados

### 3.4 Validaciones existentes (front-end)
- Verifica que el archivo sea `.xlsx`.
- Si no hay filas detectables → devuelve vacío y se bloquea la inserción.
- Filtra filas vacías.

### 3.5 Riesgos en import
- Duplicados: **no se ve** estrategia anti-duplicado (no hay dedupe por lote/fecha/placa/etc.).
- Campos vacíos:
  - se normaliza a `''` en varios casos; `toNumber` devuelve `''` en vez de `null`.
  - al construir payload, el insert a Supabase puede aceptar (o fallar) según constraints del schema.
- Errores silenciosos:
  - muchos parseos devuelven `''` sin levantar error.
- Registros huérfanos:
  - no hay tablas hijo; por tanto “huérfanos” no aplican.

---

## 4) D) Identity Audit

### 4.1 ID de despacho
- Campo: `id`.
- Uso:
  - se usa como PK en UI y en operaciones `update/delete`.

### 4.2 Repetición / unicidad
- El frontend no impone unicidad.
- Se depende de constraints de Supabase (no visibles en esta corrida).

### 4.3 PK/FK e índices
- PK: inferida por uso como UUID.
- FK: no observadas en el modelo del frontend (no hay joins).
- Índices/constraints: no inspeccionados (no se leyó schema SQL).

---

## 5) E) Traceability Completeness Audit

### 5.1 Reconstrucción “quién/qu&eacute;/cu&aacute;ndo/c&oacute;mo”
Para **cada despacho**, con lo inspeccionado:
- **Quién**: NO se observa campo `created_by` en el flujo despachos.
  - En `despachosService.js` se usan campos sin `created_by`/`modified_by`.
- **Qué**: sí (cliente/producto/lote/destino/cantidad/peso).
- **Cuándo**: parcialmente (fecha/hora + `created_at` para orden).
- **Cómo**: parcialmente:
  - manual vs import no se persiste como evento/atributo.

### 5.2 Importación/modificación/verificación
- Importación: existe, pero no queda registrada como evento.
- Modificación: existe (update en `despachos`), pero no se ve auditoría por registro de cambios.
- Verificación: **no** se aplica a despachos como máquina de estado; “estado” parece estático “Completado”.

Conclusión: en el módulo despachos, la trazabilidad “completa” no es reconstruible como historial de eventos.

---

## 6) F) Scalability Audit (teórico)
Supuesto: tabla `despachos` con millones de filas.

### 6.1 10.000 / 100.000 / 1.000.000 despachos
Riesgo principal identificado por código:
- `fetchDespachos()` carga `select('*').order('created_at', { ascending: false })` **sin paginación**.
- UI filtra en memoria.
- Export PDF utiliza `records` completos.

### 6.2 Índices y consultas
- Se requiere índice en `created_at` para el ordenamiento, y en campos de búsqueda si se migra a paginación.
- No se observan filtros SQL desde el frontend.

### 6.3 Cargas masivas
- Batch insert chunked = 200.
- Riesgos:
  - Sin dedupe, una carga masiva puede crear duplicados.
  - Si el payload tiene tipos erróneos (`cantidad_bolsas`, `peso`), puede fallar la inserción del chunk completo.

---

## 7) G) Runtime Compatibility Audit (para conectar con Runtime Engine)

### 7.1 Eventos naturales del módulo despachos
Potenciales eventos (a inferir):
- DISPATCH_IMPORTED (import Excel)
- DISPATCH_UPDATED (edición)
- DISPATCH_DELETED (eliminación)
- DISPATCH_VIEWED (visualización en UI)

### 7.2 Compatibilidad por capas (estimación)
- Audit Layer:
  - **PARTIAL**: se tiene audit genérica para formularios (`sgc_audit_logs`), pero para despachos en sí **no** hay tabla de eventos ni escritura de audit por despacho.
- Analytics Layer:
  - **REQUIRES REFACTOR**: métricas tipo éxito/fallo/retiros no aplican; tampoco hay provider execution audit que alimente runtime analytics.
- Scoring Layer:
  - **REQUIRES REFACTOR**: no hay métricas normalizadas.
- Decision Layer:
  - **NOT READY**: no existen reglas/decisiones; es UI y estado estático.
- Selection Layer:
  - **NOT READY**: no hay provider selection en este módulo.

---

## 8) H) Technical Debt Audit

### 8.1 Acoplamientos (UI ↔ Supabase)
- `Dispatches.jsx` maneja:
  - carga de datos
  - transformaciones de UI
  - y llama directamente servicios de Supabase.

### 8.2 Service ↔ DB
- `despachosService.js` implementa directamente `sb.from('despachos')`.

### 8.3 IDs inconsistentes
- `displayId` transforma `id` para UI (no es un ID semántico).
- No hay correlation/transaction IDs.

### 8.4 Código duplicado / complejidad
- Similar lógica en parse Excel (sin modularización de validaciones/normalización de datos con contratos).

---

## 9) I) Refactor Readiness Report

Clasificación por objetivo:
- Integridad: **REQUIRES REFACTOR**
  - falta auditoría por despacho, falta identidad enriquecida
- Escalabilidad: **REQUIRES REFACTOR**
  - sin paginación ni filtros SQL
- Runtime Compatibility: **CRITICAL**
  - runtime layers requieren eventos/audits y contratos; despachos no tiene eventos persistidos

---

## 10) J) Deliverables (promesa)
Se generan en esta corrida únicamente los reportes .md solicitados.

(1) Este archivo ya es `TRACEABILITY_DEEP_AUDIT.md`.

(2) Se generará `TRACEABILITY_RUNTIME_READINESS.md` en el siguiente punto.

---

## 11) K) Final Verdict (para sprint T1.0)
- **FINAL STATUS: NOT READY** para integrar directamente Runtime Engine en el módulo “Despachos/Trazabilidad” sin refactors estructurales (audit/event contract + escalabilidad + identidad unificada).

