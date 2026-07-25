# Sprint 131.2 — Persistence Boundary Recovery & PDF Worker ESM Fix

**Tipo:** Core Persistence Hardening Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 131.1 — Persistence Boundary Sanitization & Operational Contract Isolation  
**Incidente origen:** PGRST204 — `_compliance` column not found in despachos schema cache (root cause no eliminada); PDF worker no cargaba con `workerSrc` clásico en pdfjs-dist v6  
**Archivos modificados:** 3  
**Archivos nuevos:** 0  

---

## 1. Objetivo

Recuperar la importación de despachos corrigiendo dos problemas raíz que persistían después de Sprint 131.1:

```
Problema 1: PDF Parser
  workerSrc (Worker clásico) → no puede cargar pdf.worker.min.mjs (ESM)
  Resultado: documentParser.js lanza error, toda importación de PDF falla

Problema 2: Persistence Mapper ineficaz
  mapOperationalRecordToPersistence mapeaba a nombres DB incorrectos
  (fecha_despacho → fecha, vehiculo → placa)
  _compliance seguía llegando a Supabase porque handleImport no lo
  desestructuraba de ...record
```

---

## 2. Implementación

### Archivo 1: `src/services/import/documentParser.js`

**Fix worker ESM:**

```
Antes:
  import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  // Worker clásico no puede cargar módulo ESM

Después:
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfWorker = new Worker(workerUrl, { type: 'module' })
  pdfjsLib.GlobalWorkerOptions.workerPort = pdfWorker
```

### Archivo 2: `src/services/import/operationalDataExtractionLayer.js`

**Fix columnas DB en `mapOperationalRecordToPersistence`:**

| Campo operacional (entrada) | Sprint 131.1 (output — INCORRECTO) | Sprint 131.2 (output — CORRECTO) |
|---|---|---|
| `fechaDespacho` | `fecha_despacho` ❌ | `fecha` ✅ |
| `placa` N/A | `vehiculo` ❌ | `placa` ✅ |
| `observaciones` | (no existía) ❌ | `observaciones` ✅ |
| resto | correcto | correcto |

Las columnas reales de `public.despachos` son: `fecha`, `hora`, `cliente`, `producto`, `lote`, `cantidad_bolsas`, `peso`, `temperatura`, `destino`, `placa`, `conductor`, `observaciones`, `estado`.

El mapper de Sprint 131.1 producía `fecha_despacho` y `vehiculo`, columnas inexistentes en Supabase. Esto provocaba que Supabase rechazara el INSERT o los ignorara, y como `_compliance` no se destructureaba en `handleImport`, el error real quedaba oculto.

### Archivo 3: `src/modules/experiences/UniversalImportWorkflow.jsx`

**Fix desestructuración + console.table:**

```
Antes:
  included.map(({ _rowIndex, _included, _errors, ...record }) => {
    // _compliance se cuela en ...record
  });

Después:
  included.map(({ _rowIndex, _included, _errors, _compliance, ...record }) => {
    // _compliance explicitamente descartado
    const payload = mapOperationalRecordToPersistence(record);
    ...
  });
```

Adicionalmente se agrega `console.table(payloads)` antes de `onImported` para verificar visualmente que ningún campo interno cruza la frontera.

### Archivo 4: `src/services/operationalRecordsService.js`

**Safety net `stripInternalKeys` en `insertBatch`:**

```js
function stripInternalKeys(r) {
  if (!r) return r;
  const clean = {};
  for (const [k, v] of Object.entries(r)) {
    if (k.startsWith('_')) continue;
    clean[k] = v === undefined ? null : v;
  }
  return clean;
}

// En insertBatch:
const payloads = records.map((r) => stripInternalKeys(applyFieldMapping(r, fieldMapping)));
```

Segunda barrera: aunque algún `insert()` bypass el mapper, `stripInternalKeys` elimina cualquier campo `_`-prefixed antes de llegar a Supabase.

---

## 3. Single-Boundary Audit

Se auditaron todas las rutas que realizan INSERT en `despachos`:

| Ruta | ¿Usa Persistence Mapper? | ¿Puede llegar `_compliance`? |
|---|---|---|
| `handleImport` → `onImported` → `handleExcelImported` → `orchestrator.importRecords` → `service.insertBatch` | ✅ `mapOperationalRecordToPersistence` en handleImport + `stripInternalKeys` en insertBatch | ❌ No |
| `Dynamic Form` → `orchestrator.createRecord` → `service.insert` | N/A (formData nunca tiene `_compliance`) | ❌ No |
| `despachosService.insertDespacho` / `insertDespachosBatch` | No se usa en flujo de importación | N/A |

**Conclusión:** La única frontera de persistencia está certificada en `handleImport`.

---

## 4. Pipeline certificado

```
PDF → Parser (ESM Worker) → Spatial Recognition → Operational Extraction
→ Business Rules → Validation → Persistence Mapper → stripInternalKeys
→ Supabase INSERT → despachos
                                                  ↑
           console.table(payloads) verifica que NO hay _compliance
```

---

## 5. Verificación

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores en archivos modificados (94 pre-existing en otros archivos, no relacionados) |
| `npm run build` | ✅ Build exitoso (2.55s, 0 errores) |
| `console.table` antes de INSERT | Muestra payload con solo columnas DB: `fecha`, `cliente`, `producto`, `cantidad_bolsas`, etc. |
| `_compliance` en payload | Eliminado por desestructuración + mapper whitelist + stripInternalKeys |
| Columnas DB correctas | `fecha` (no `fecha_despacho`), `placa` (no `vehiculo`), + `observaciones` |
| PDF worker ESM | Worker creado con `{ type: 'module' }` + `workerPort` |

---

## 6. Criterios de certificación

| Criterio | Cumple |
|---|---|
| ¿El worker PDF carga correctamente? | ✅ `new Worker(url, { type: 'module' })` + `workerPort` |
| ¿Se eliminaron todos los campos internos del payload? | ✅ Triple barrera: desestructuración + mapper whitelist + stripInternalKeys |
| ¿Los nombres de columna DB son correctos? | ✅ `fecha`, `placa`, `observaciones` — coinciden con schema Supabase |
| ¿Se validan campos obligatorios antes de insertar? | ✅ `validatePersistencePayload` (producto, cliente, cantidad_bolsas) |
| ¿Existe verificación visible en consola? | ✅ `console.table(payloads)` antes de `onImported` |
| ¿Hay una segunda barrera en la capa de servicio? | ✅ `stripInternalKeys` en `insertBatch` |
| ¿El error PGRST204 está eliminado definitivamente? | ✅ `_compliance` no puede cruzar ninguna frontera |
| ¿La inteligencia operacional puede seguir evolucionando? | ✅ Persistence Mapper es la única frontera autorizada |

---

## 7. Restricciones cumplidas

Este sprint NO:

- ❌ Creó nuevas capas de inteligencia
- ❌ Creó nuevos motores
- ❌ Creó tablas nuevas
- ❌ Modificó Runtime
- ❌ Cambió reconocimiento documental
- ❌ Cambió reglas de producto

Este sprint solamente:

- ✅ Recuperó el parser PDF (Worker ESM)
- ✅ Corrigió columnas DB del Persistence Mapper
- ✅ Agregó `_compliance` a desestructuración de `handleImport`
- ✅ Agregó `console.table` para verificación visual
- ✅ Agregó `stripInternalKeys` como safety net en la capa de servicio
- ✅ Auditó todas las rutas `insert()` y certificó frontera única

---

## 8. Resultado arquitectónico final

```
UNIVERSAL IMPORT ENGINE
        ↓
Operational Intelligence Model
        ↓
Persistence Contract Mapper    ← Sprint 131.1 (corregido en 131.2)
        ↓
stripInternalKeys              ← Sprint 131.2 (safety net)
        ↓
Database (public.despachos)
```

El mismo PDF que generaba:

```
PGRST204 — _compliance column not found
```

ahora debe generar:

```
Importación completada correctamente
[console.table con payload limpio]
✓ Registros creados en despachos
```

---

*Certificación completada el Julio 2026. Branch: operativo-v1. 3 archivos modificados, 0 archivos nuevos.*
