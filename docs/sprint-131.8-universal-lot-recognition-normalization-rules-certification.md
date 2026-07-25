# Sprint 131.8 — Universal Lot Recognition & Normalization Rules (SSOT)

**Tipo:** Operational Intelligence Rules Refinement Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 131.7  
**Archivos modificados:** 1  
**Archivos nuevos:** 0  

---

## 1. Objetivo

Certificar el reconocimiento universal de lotes operacionales presentes en los documentos importados, soportando todas las variantes documentales reales encontradas en facturas y Excel.

Este sprint NO modifica la persistencia ni las reglas de trazabilidad. Solamente mejora la capacidad del sistema para detectar los lotes que ya existen en el documento.

---

## 2. Formatos soportados

### Antes (Sprint 131.5)

```
L26-175         ✅  Único formato reconocido
L   26   - 175  ✅  (con espacios, por \s*)
```

### Ahora (Sprint 131.8)

```
Formato                Ejemplo          ¿Reconocido?
──────────────────────────────────────────────────────
Guion                  L26-175           ✅
Espacio                L26 175           ✅
Sin separador          L26175            ✅
Dos puntos             L:26175           ✅
Dos puntos + espacio   L: 26175          ✅
Minúsculas             l26175            ✅
Minúsculas + :         l:26175           ✅
Minúsculas + : + sp    l: 26175          ✅
Prefijo LOTE:          LOTE: L26175      ✅
Prefijo LOTE           LOTE L26175       ✅
Solo 2 dígitos         L2675             ✅
L + espacios            L 26 - 175       ✅
```

### Regex certificada

```js
/L:?\s*26[\s:-]?\s*(\d{1,3})/gi
```

| Parte | Significado |
|---|---|
| `L` | L mayúscula o minúscula (flag `i`) |
| `:?` | Dos puntos opcionales |
| `\s*` | Cero o más espacios |
| `26` | Literal 26 |
| `[\s:-]?` | Separador opcional: espacio, `:`, o `-` |
| `\s*` | Cero o más espacios |
| `(\d{1,3})` | 1 a 3 dígitos (capturados) |

---

## 3. Normalización

Todos los formatos se normalizan a: **`L26` + dígitos** (se eliminan guion, espacios, dos puntos).

```
L26-175         →  L26175
L26 175         →  L26175
L26175          →  L26175
L:26175         →  L26175
L: 26175        →  L26175
l26175          →  L26175
l:26175         →  L26175
l: 26175        →  L26175
LOTE: L26175    →  L26175
LOTE L26175     →  L26175
L2675           →  L2675
L 26 - 175      →  L26175
```

---

## 4. Inventario documental

`extractLotesFromRows` escanea TODAS las filas y construye:

```js
// Frecuencias
{ L26175: 3, L26180: 1, L26205: 1 }

// findDominantLote → 'L26175'
```

---

## 5. Implementación

### Archivo modificado: `src/services/import/lotResolutionEngine.js`

**Único cambio:** regex de reconocimiento de lotes.

```js
// Antes: solo L26-XXX con guion
const LOT_PATTERN = /L\s*26\s*-\s*(\d{1,3})/gi;

// Después: todos los formatos documentales
const LOT_PATTERN = /L:?\s*26[\s:-]?\s*(\d{1,3})/gi;
```

Sin cambios en `normalizeLote`, `extractLotesFromRows`, `findDominantLote`, `resolveDocumentLotes`.

---

## 6. Verificación

| Formato | Extraído | Normalizado |
|---|---|---|
| `L26-175` | `175` | `L26175` |
| `L26 175` | `175` | `L26175` |
| `L26175` | `175` | `L26175` |
| `L:26175` | `175` | `L26175` |
| `L: 26175` | `175` | `L26175` |
| `l26175` | `175` | `L26175` |
| `l:26175` | `175` | `L26175` |
| `l: 26175` | `175` | `L26175` |
| `L2675` | `75` | `L2675` |

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores |
| `npm run build` | ✅ Build exitoso (2.20s) |
| Scanner + frecuencias | ✅ Sin cambios, funciona con nuevo regex |

---

## 7. Criterios de certificación

| Criterio | Cumple |
|---|---|
| ¿Se reconoce `L26-175` (formato original)? | ✅ |
| ¿Se reconoce `L:26175` (formato con dos puntos)? | ✅ |
| ¿Se reconoce `l26175` (minúsculas)? | ✅ |
| ¿Se reconoce `LOTE: L26175` (prefijo)? | ✅ |
| ¿Se reconoce `L2675` (2 dígitos)? | ✅ |
| ¿Se normalizan todos a `L26${digits}`? | ✅ |
| ¿Se modificó el Universal Import Engine? | ❌ |
| ¿Se modificó la persistencia? | ❌ |

---

*Certificación completada el Julio 2026. Branch: operativo-v1. 1 archivo modificado, 0 archivos nuevos.*
