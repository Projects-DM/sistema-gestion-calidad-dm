# Sprint 131.5 — Operational Lot Resolution Engine Refinement (SSOT)

**Tipo:** Operational Intelligence Rules Refinement Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 131.1 — 131.4  
**Archivos nuevos:** 1  
**Archivos modificados:** 1  

---

## 1. Objetivo

Certificar las reglas definitivas de reconocimiento, normalización y resolución operacional del campo LOTE para el módulo Despachos.

### Reglas arquitectónicas

El lote NO podrá:

- ❌ ser inventado
- ❌ ser generado aleatoriamente
- ❌ inferirse por proximidad numérica
- ❌ provenir de cualquier número del PDF

El lote únicamente podrá obtenerse mediante **patrones operacionales certificados**.

---

## 2. Patrón certificado

```
L\s*26\s*-\s*(\d{1,3})

L     →  Empieza con L
26    →  Seguido de 26
-     →  Guion
\d{1,3} →  1 a 3 dígitos

Ejemplos válidos:
  L26-175  L26-180  L26-091  L26-210  L26-001

Ejemplos inválidos:
  3072     3075     L30-72   L28-100  26-175  175
```

### Normalización

Una vez identificado, se elimina el guion:

```
L26-175  →  L26175
L26-091  →  L26091
L26-180  →  L26180
```

---

## 3. Estrategia de resolución por documento completo

```
PDF
  ↓
Parser
  ↓
Operational Intelligence
  ↓
resolveDocumentLotes(rows)    ← Sprint 131.5 (NUEVO)
  ↓
  extractLotesFromRows(rows)  →  freqs { L26175: 5, L26180: 1 }
  ↓
  findDominantLote(freqs)     →  L26175
  ↓
  Asociación por fila:
    ¿Tiene lote explícito válido?  →  L26175 (normalizado)
    ¿No tiene lote?               →  L26175 (dominante)
    ¿Ningún lote válido?          →  null
  ↓
Operational Defaults Resolver
  ↓
Persistence Mapper
  ↓
Supabase
```

### Casos certificados

| Caso | Descripción | Resultado |
|---|---|---|
| 1 | Producto posee lote explícito válido | `L26180` (normalizado) |
| 2 | Producto sin lote, documento tiene lotes | Lote dominante del documento |
| 3 | Múltiples lotes en el documento | Lote con mayor frecuencia |
| 4 | Ningún lote válido en el documento | `null` |

---

## 4. Implementación

### Archivo nuevo: `src/services/import/lotResolutionEngine.js`

```js
const LOT_PATTERN = /L\s*26\s*-\s*(\d{1,3})/gi;

// Extrae frecuencias de todos los lotes del documento
extractLotesFromRows(rows) → { L26175: 5, L26180: 1 }

// Encuentra el lote con mayor frecuencia
findDominantLote(freqs) → L26175

// Normaliza un lote crudo: L26-175 → L26175
normalizeLote(raw) → L26175 | null

// Resuelve lotes para todas las filas del documento
resolveDocumentLotes(rows) → rows[ { ..., lote: 'L26175' } ]
```

### Archivo modificado: `src/modules/experiences/UniversalImportWorkflow.jsx`

```
Antes:
  normalizeOperationalData → result.rows → preview map

Después:
  normalizeOperationalData → result.rows
  ↓
  resolveDocumentLotes(result.rows)  ← NUEVO
  ↓
  preview map
```

---

## 5. Verificación

| Escenario | Entrada `lote` | Salida `lote` |
|---|---|---|
| L26-175 | `'L26-175'` | `'L26175'` |
| L26-091 | `'L26-091'` | `'L26091'` |
| L26-180 | `'L26-180'` | `'L26180'` |
| L 26 - 175 (con espacios) | `'L 26 - 175'` | `'L26175'` |
| 3072 | `'3072'` | `null` (o dominante) |
| L30-72 | `'L30-72'` | `null` (o dominante) |
| vacío | `''` | `null` (o dominante) |
| Sin lote en fila, doc tiene L26175×8 | `''` | `'L26175'` |
| Sin lote en fila, doc sin lotes | `''` | `null` |

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores en archivos modificados |
| `npm run build` | ✅ Build exitoso |

---

## 6. Criterios de certificación

| Criterio | Cumple |
|---|---|
| ¿Se reconoce solo el patrón `L\s*26\s*-\s*\d{1,3}`? | ✅ |
| ¿Se rechazan patrones como `L30-72`, `3072`, `26-175`? | ✅ (no matchean el regex) |
| ¿Se normaliza eliminando el guion? | ✅ `L26${digits}` |
| ¿Se analiza la frecuencia por documento completo? | ✅ `extractLotesFromRows` |
| ¿Se usa el lote dominante para filas sin lote? | ✅ `findDominantLote` |
| ¿Se retorna `null` si no hay lotes válidos? | ✅ |
| ¿El Universal Import Engine contiene reglas de lote? | ❌ Reside en `lotResolutionEngine.js` |

---

*Certificación completada el Julio 2026. Branch: operativo-v1. 1 archivo nuevo, 1 archivo modificado.*
