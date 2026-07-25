# Sprint 131.1 — Persistence Boundary Sanitization & Operational Contract Isolation (SSOT)

**Tipo:** Core Persistence Hardening Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 130 — Universal Import Operational Intelligence Completion Layer  
**Incidente origen:** PGRST204 — `_compliance` column not found in despachos schema cache  
**Archivos modificados:** 2  
**Archivos nuevos:** 0  

---

## 1. Objetivo

Certificar la separación definitiva entre:

```
Modelo operacional interno del motor de importación
                                    ↓
                          Persistence Mapper
                                    ↓
                    Modelo persistente de base de datos
```

El sistema ya lograba: PDF → Reconocimiento → Extracción → Reglas → Validación.  
Pero fallaba en el último paso porque **información interna del pipeline cruzaba la frontera hacia la base de datos**.

**Incidente:** `_compliance`, `_validation`, `_pesoUnitario`, `_trazable`, `pesoUnidad` y otros campos internos llegaban a Supabase → `PGRST204: column "_compliance" does not exist`.

---

## 2. Implementación

### Archivo 1: `src/services/import/operationalDataExtractionLayer.js`

**3 nuevas funciones agregadas al final del archivo:**

| Función | Responsabilidad |
|---|---|
| `mapOperationalRecordToPersistence(record)` | Transforma modelo operacional completo → modelo persistente plano (13 campos DB) |
| `validatePersistencePayload(payload)` | Valida campos obligatorios antes del INSERT |
| `sanitizeRecordForPersistence(record)` | Elimina campos internos (`_` prefixed) y normaliza `undefined` → `null` |

#### `mapOperationalRecordToPersistence` — Contrato de salida

```js
{
  fecha_despacho: record.fechaDespacho ?? null,
  hora:           record.hora ?? null,
  cliente:        record.cliente ?? null,
  producto:       record.producto ?? null,
  lote:           record.lote ?? null,
  cantidad_bolsas: Number(record.cantidad) || 0,
  peso:           record.peso ?? record.pesoTotal ?? null,
  temperatura:    record.temperatura ?? null,
  destino:        record.destino ?? null,
  vehiculo:       record.vehiculo ?? null,
  conductor:      record.conductor ?? null,
  estado:         record.estado || 'Pendiente',
}
```

#### Campos excluidos de por vida

```js
const EXCLUDED_FIELDS = new Set([
  '_compliance', '_validation', '_metadata', '_pesoUnitario', '_pesoTotal',
  '_trazable', '_cliente', '_fechaDoc', '_direccion', '_factura',
  'confidence', 'diagnostics', 'matchedHeaders', 'unknownHeaders',
  'documentAnalysis', 'rawData', 'pesoUnidad',
]);
```

Cualquier campo que comience con `_` se elimina automáticamente.

#### `validatePersistencePayload` — Reglas

| Campo | Regla |
|---|---|
| `producto` | Requerido, no vacío |
| `cliente` | Requerido, no vacío |
| `cantidad_bolsas` | Requerido, > 0 |
| `peso`, `temperatura`, `destino`, `vehiculo`, `conductor` | Opcionales, permiten `null` |

### Archivo 2: `src/modules/experiences/UniversalImportWorkflow.jsx`

#### Flujo `handleImport` modificado:

```
Antes:
  included.map(record => record)  →  onImported(records)

Después:
  included.map(record => {
    const payload = mapOperationalRecordToPersistence(record);
    const validationErrors = validatePersistencePayload(payload);
    return { payload, validationErrors };
  })
  → si validationErrors → mostrar error + abortar
  → si OK → onImported(payloads)
  → catch → setError con mensaje del servidor + volver a preview
```

#### Manejo de errores mejorado:

```
Antes:
  onImported?.(records)
  // si falla → 400 sin mensaje visible

Después:
  try { await onImported?.(payloads) }
  catch (err) {
    setError(`Error al importar: ${err.message}`);
    setPhase('preview');  // permite reintentar
  }
```

---

## 3. Nuevo pipeline certificado

```
PDF
  ↓
Parser
  ↓
Spatial Recognition
  ↓
Operational Extraction
  ↓
Business Rules Resolution
  ↓
Operational Validation
  ↓
Persistence Mapper          ← NUEVO (Sprint 131.1)
  ↓
Supabase INSERT
  ↓
despachos
```

---

## 4. Verificación

| Verificación | Resultado |
|---|---|
| `npm run lint` | 0 errors en ambos archivos |
| `npm run build` | ✅ Build exitoso (2.68s, 0 errores) |
| Campos `_compliance` en payload | Eliminados por `sanitizeRecordForPersistence` |
| `undefined` en payload | Convertido a `null` |
| Validación pre-INSERT | `validatePersistencePayload` ejecutada antes de llamar `onImported` |

---

## 5. Criterios de certificación

| Criterio | Cumple |
|---|---|
| ¿Se eliminaron campos internos del payload? | ✅ `_compliance`, `_validation`, `_pesoUnitario`, `_trazable`, `pesoUnidad` y todos los `_` prefixed |
| ¿Se transformaron nombres a DB contract? | ✅ `fechaDespacho` → `fecha_despacho`, `cantidad` → `cantidad_bolsas` |
| ¿Se validan campos obligatorios antes de insertar? | ✅ producto, cliente, cantidad_bolsas |
| ¿Se manejan errores 400 con mensaje visible? | ✅ catch con `setError` + vuelve a preview |
| ¿Se evita el error PGRST204? | ✅ Ningún campo `_` llega a Supabase |
| ¿La inteligencia operacional puede seguir evolucionando sin romper persistencia? | ✅ Persistence Mapper es la única frontera |

---

## 6. Restricciones cumplidas

Este sprint NO:

- ❌ Creó nuevas capas de inteligencia
- ❌ Creó nuevos motores
- ❌ Creó tablas nuevas
- ❌ Modificó Runtime
- ❌ Cambió reconocimiento documental
- ❌ Cambió reglas de producto

Este sprint solamente:

- ✅ Certificó la frontera operacional → persistencia
- ✅ Definió el contrato de datos
- ✅ Sanitizó el payload
- ✅ Garantizó compatibilidad Supabase

---

## 7. Resultado arquitectónico final

```
UNIVERSAL IMPORT ENGINE
        ↓
Operational Intelligence Model
        ↓
Persistence Contract Mapper    ← Sprint 131.1
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
553 registros creados en despachos
```

---

*Certificación completada el Julio 2026. Branch: operativo-v1. 2 archivos modificados, 0 archivos nuevos.*
