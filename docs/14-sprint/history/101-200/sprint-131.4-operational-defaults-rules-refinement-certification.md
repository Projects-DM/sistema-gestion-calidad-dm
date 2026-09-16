# Sprint 131.4 — Operational Defaults Rules Refinement (SSOT)

**Tipo:** Operational Rules Refinement Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 131.1, Sprint 131.2, Sprint 131.3  
**Archivos modificados:** 1  
**Archivos nuevos:** 0  

---

## 1. Objetivo

Refinar las reglas operacionales automáticas del módulo Despachos sin modificar la arquitectura certificada del Universal Import System.

Este sprint NO modifica:

- ❌ Universal Import Engine
- ❌ Parser
- ❌ Normalizer
- ❌ Persistence Layer
- ❌ Runtime
- ❌ PDF Recognition
- ❌ Field Mapping Engine

Únicamente actualiza las reglas certificadas del **Operational Defaults Resolver**.

---

## 2. Reglas certificadas

### Cantidad de bolsas

```
Temporalmente todos los registros importados → cantidad = 1

Queda prohibido:
  - inferir cantidades
  - calcular cantidades
  - utilizar valores ambiguos del documento

Hasta la implementación del motor de agrupación operacional.
```

### Lote

```
Queda oficialmente prohibido inventar lotes.

Si el lote existe (L26-173, L26-180, L25-091, etc.) → persistirlo
Si el lote NO existe → null

No está permitido utilizar:
  L30-72, LXX-XXX, SIN LOTE, LOTE TEMPORAL
```

### Temperatura operacional

```
Solamente se genera automáticamente para productos cárnicos.

Productos certificados:
  PECHUGA, FILETE, POLLO, MUSLO, CONTRAMUSLO, ALA,
  RABADILLA, CHUZO, PIERNA PERNIL, TOCINETA, CARNE CONGELADA

Rango aleatorio:
  -18.0 °C  →  -20.0 °C

Ejemplos válidos: -18.2, -18.7, -19.1, -19.6, -19.9
Ejemplos inválidos: -15, -12, -21, 0, 18

Productos no cárnicos (SALSAS, CONDIMENTOS, EMPAQUES, ADITIVOS, OTROS PRODUCTOS):
  temperatura = null
```

### Peso

```
Sin modificaciones. Se mantiene la lógica certificada del Sprint 131.3:
  - PECHUGA CONGELADA + cantidad → peso = cantidad (kg)
```

### Fecha, Estado, Conductor, Destino, Placa, Observaciones

```
Sin modificaciones respecto al Sprint 131.3:
  - fecha:   new Date()
  - estado:  Pendiente
  - conductor:  Juan Gomez
  - destino:  SIN DEFINIR
  - placa:   NO ASIGNADA
  - observaciones:  IMPORTACION PDF
```

---

## 3. Implementación

### Archivo modificado: `src/services/import/operationalDefaultsResolver.js`

```
Cambios respecto a Sprint 131.3:

1. cantidad: r.cantidad ?? 0  →  1 (siempre)
2. lote:     r.lote ?? ''     →  r.lote ?? null (nunca inventar)
3. temperatura:
   Antes: set fijo de 7 productos → -18 fijo
   Ahora: 11 productos cárnicos → random entre -20.0 y -18.0
          No cárnicos → null
4. peso, fecha, estado, conductor, destino, placa, observaciones:
   Sin cambios
```

#### Nuevas funciones

```js
const CARNICOS = [
  'PECHUGA', 'FILETE', 'POLLO', 'MUSLO', 'CONTRAMUSLO', 'ALA',
  'RABADILLA', 'CHUZO', 'PIERNA PERNIL', 'TOCINETA', 'CARNE CONGELADA',
];

function esCarnico(producto) {
  if (!producto) return false;
  const p = producto.toUpperCase();
  return CARNICOS.some(kw => p.includes(kw));
}

function generarTemperatura() {
  const min = -20.0;
  const max = -18.0;
  const temp = min + Math.random() * (max - min);
  return Math.round(temp * 10) / 10;
}

function resolverTemperatura(producto) {
  if (!producto) return null;
  if (esCarnico(producto)) return generarTemperatura();
  return null;
}
```

#### Salidas esperadas

**PDF con lote (PECHUGA 250 x 10):**
```
Fecha:       2026-07-24
Cliente:     LOLA CARMEN
Producto:    PECHUGA 250 x 10
Lote:        L26-173
Cantidad:    1
Peso:        2.5
Temperatura: -18.7
Destino:     SIN DEFINIR
Conductor:   Juan Gomez
Estado:      Pendiente
```

**PDF sin lote (SALSA BBQ):**
```
Producto:    SALSA BBQ
Lote:        null
Cantidad:    1
Temperatura: null
```

---

## 4. Verificación

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores |
| `npm run build` | ✅ Build exitoso |
| `cantidad` siempre 1 | ✅ `cantidad: 1` (sin condicional) |
| `lote` preservado si existe | ✅ `r.lote ?? null` |
| `lote` null si no existe | ✅ `?? null` |
| Temp cárnicos: -20.0 a -18.0 aleatorio | ✅ `generarTemperatura()` |
| Temp no cárnicos: null | ✅ `resolverTemperatura()` retorna null |
| Peso PECHUGA CONGELADA | ✅ Sin cambios desde Sprint 131.3 |

---

## 5. Criterios de certificación

| Criterio | Cumple |
|---|---|
| ¿Se modificó el Universal Import Engine? | ❌ |
| ¿Se modificó el Parser? | ❌ |
| ¿Se modificó el Persistence Mapper? | ❌ |
| ¿Se inventan lotes? | ❌ `r.lote ?? null` |
| ¿La cantidad siempre es 1? | ✅ |
| ¿La temperatura es aleatoria para cárnicos? | ✅ `Math.random()` en rango [-20.0, -18.0] |
| ¿La temperatura es null para no cárnicos? | ✅ |
| ¿Todas las reglas están centralizadas? | ✅ `operationalDefaultsResolver.js` |

---

*Certificación completada el Julio 2026. Branch: operativo-v1. 1 archivo modificado, 0 archivos nuevos.*
