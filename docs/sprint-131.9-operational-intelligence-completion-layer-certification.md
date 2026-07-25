# Sprint 131.9 — Operational Intelligence Completion Layer (SSOT)

**Tipo:** Operational Intelligence Refinement Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 131.8  
**Archivos modificados:** 2  
**Archivos nuevos:** 0  

---

## 1. Objetivo

Certificar las reglas finales de resolución operacional para lotes, productos trazables, cantidad de bolsas y variantes documentales, sin crear nuevas capas ni motores.

---

## 2. Auditoría — Causa raíz del problema de asignación de lotes

### Hallazgo crítico: fake default `'L26-175'`

**`operationalDataExtractionLayer.js:399`** — `resolveOperationalFields`:

```js
// ❌ Antes
const lote = record.lote || 'L26-175';

// ✅ Después
const lote = record.lote || '';
```

El default `'L26-175'` se inyectaba en CADA fila sin lote explícito. Esto provocaba:

```
normalizeOperationalData
  ↓  row.lote = 'L26-175' (fake default)
  ↓
resolveDocumentLotes
  ↓  extractLotesFromRows → { L26175: N } (frecuencia masiva)
  ↓  findDominantLote → 'L26175'
  ↓  TODOS los productos trazables → L26175
  ↓
  Aunque el documento NO tuviera lotes reales
```

### Flujo corregido

```
Documento sin lotes:
  row.lote = ''  (ya no hay fake default)
  extractLotesFromRows → {} (vacio)
  findDominantLote → null
  TODOS los productos → lote = null  ✅

Documento con lotes reales (ej: L:26175):
  row.lote = 'L:26175'  (extraído por normalizador)
  extractLotesFromRows → { L26175: 1 }
  findDominantLote → 'L26175'
  Productos trazables sin lote explícito → L26175  ✅
  Productos no trazables → null  ✅
```

---

## 3. Cantidad de bolsas basada en peso

### Antes

```js
// operationalDefaultsResolver.js
cantidad: 1  // siempre 1 bolsa
```

### Después

```js
function calcularBolsas(peso) {
  if (!peso || Number(peso) <= 0) return 1;
  return Number(peso) <= 5 ? 1 : 2;
}
```

| Peso total | Bolsas |
|---|---|
| ≤ 5 kg | 1 |
| > 5 kg | 2 |

### Ejemplos

```
2.5 kg  →  1 bolsa
4 kg    →  1 bolsa
5 kg    →  1 bolsa
6 kg    →  2 bolsas
12 kg   →  2 bolsas
```

Se reutiliza el peso calculado existente (Sprint 131.4) sin duplicar lógica.

---

## 4. Variantes documentales de productos

`esTrazable` en `lotResolutionEngine.js` ya soporta todas las variantes con el regex actual:

| Producto en factura | ¿Trazable? |
|---|---|
| `PECHUGA130X10` | ✅ |
| `PECHUGA 130X10` | ✅ |
| `PECHUGA130 X10` | ✅ |
| `PECHUGA 130 X 10` | ✅ |
| `POLLO220X10` | ✅ |
| `POLLO 220 X 10` | ✅ |
| `SALSA BBQ` | ❌ |
| `PECHUGA CAMPESINA` | ❌ |

Gramajes reconocidos: cualquier `<number> X <5|10>` — sin listas fijas.

---

## 5. Implementación

### Archivo 1: `src/services/import/operationalDataExtractionLayer.js`

```diff
- const lote = record.lote || 'L26-175';
+ const lote = record.lote || '';
```

### Archivo 2: `src/services/import/operationalDefaultsResolver.js`

```diff
+ function calcularBolsas(peso) {
+   if (!peso || Number(peso) <= 0) return 1;
+   return Number(peso) <= 5 ? 1 : 2;
+ }
+
  export function resolveOperationalDefaults(record) {
    const r = record || {};
+   const pesoCalculado = r.peso ?? inferirPeso(r.producto, r.cantidad) ?? '';
    return {
      ...
-     cantidad: 1,
+     cantidad: calcularBolsas(pesoCalculado),
-     peso: r.peso ?? inferirPeso(r.producto, r.cantidad) ?? '',
+     peso: pesoCalculado,
      ...
    };
  }
```

---

## 6. Verificación

| Escenario | Antes | Después |
|---|---|---|
| Documento sin lotes → lote | `L26175` (fake) | `null` ✅ |
| Documento con L:26175 → producto trazable | `L26175` | `L26175` ✅ |
| Producto no trazable (SALSA BBQ) | `null` | `null` ✅ |
| Peso 2.5 kg → cantidad | 1 | 1 ✅ |
| Peso 6 kg → cantidad | 1 | 2 ✅ |
| PECHUGA130X10 → esTrazable | ✅ | ✅ |
| PECHUGA CAMPESINA → esTrazable | ❌ | ❌ ✅ |

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores |
| `npm run build` | ✅ Build exitoso (2.65s) |

---

## 7. Criterios de certificación

| Criterio | Cumple |
|---|---|
| ¿Se eliminó el fake default `'L26-175'`? | ✅ `''` |
| ¿Los lotes solo se asignan a productos trazables? | ✅ |
| ¿La cantidad de bolsas depende del peso calculado? | ✅ `calcularBolsas(pesoCalculado)` |
| ¿Se reutiliza la lógica de peso existente? | ✅ Sin duplicación |
| ¿Se reconocen variantes documentales (PECHUGA130X10)? | ✅ `GRAMAJE_PATTERN` con `\s*` |
| ¿Se crearon nuevas capas o motores? | ❌ 0 archivos nuevos |
| ¿Se modificó el Parser? | ❌ |
| ¿Se modificó el Universal Import Engine? | ❌ |

---

*Certificación completada el Julio 2026. Branch: operativo-v1. 2 archivos modificados, 0 archivos nuevos.*
