# Sprint 131.6 — Traceable Products Lot Assignment Rules (SSOT)

**Tipo:** Operational Traceability Rules Refinement Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 131.4, Sprint 131.5  
**Archivos modificados:** 1  
**Archivos nuevos:** 0  

---

## 1. Objetivo

Certificar las reglas definitivas de asignación de lotes únicamente para productos trazables del módulo Despachos.

### Nueva regla arquitectónica

```
El lote NO es un atributo del documento.
El lote es un atributo exclusivo de productos trazables.

Documento → Producto → ¿Es trazable?
  ├─ SI  → Resolver lote
  └─ NO  → lote = null
```

---

## 2. Productos trazables certificados

Un producto es **trazable** únicamente si cumple **ambas** condiciones:

| Condición | Requisito |
|---|---|
| 1. Base cárnica | Contiene `PECHUGA` o `POLLO` |
| 2. Gramaje operacional | Contiene patrón `\d+\s*X\s*\d+` (ej: `250 X 10`, `220 X 5`) |

### Ejemplos trazables

```
PECHUGA 100 X 10    →  ✅ Trazable
PECHUGA 150 X 10    →  ✅ Trazable
PECHUGA 250 X 10    →  ✅ Trazable
POLLO 220 X 10      →  ✅ Trazable
POLLO 300 X 5       →  ✅ Trazable
POLLO 180 X 10      →  ✅ Trazable
```

### Ejemplos NO trazables

```
PECHUGA CAMPESINA   →  ❌ No gramaje
PECHUGA COMPLETA    →  ❌ No gramaje
TOCINETA            →  ❌ No es PECHUGA/POLLO
SALSA BBQ           →  ❌ No es PECHUGA/POLLO
RIPIO               →  ❌ No es PECHUGA/POLLO
ADEREZO             →  ❌ No es PECHUGA/POLLO
CONDIMENTOS         →  ❌ No es PECHUGA/POLLO
POLLO ENTERO        →  ❌ No gramaje
MUSLO               →  ❌ No es PECHUGA/POLLO
ALA                 →  ❌ No es PECHUGA/POLLO
RABADILLA           →  ❌ No es PECHUGA/POLLO
```

### Gramajes operacionales reconocidos

```
80, 90, 100, 120, 130, 150, 180, 200, 210, 220, 250, 300, 400, 500
y cualquier valor numérico acompañado por X 5 o X 10
```

---

## 3. Estrategia de resolución

```
resolveDocumentLotes(rows)
  ↓
  ¿Es trazable?  →  NO  →  lote = null
  ↓
  ¿Tiene lote explícito?  →  L26175
  ↓
  ¿Existe dominante?      →  L26175
  ↓
  null
```

### Casos certificados

| Caso | Producto | Lote doc. | Lote dominante | Resultado |
|---|---|---|---|---|
| 1 | PECHUGA 250 X 10 | L26-175 | — | L26175 |
| 2 | POLLO 220 X 10 | (vacío) | L26175 | L26175 |
| 3 | PECHUGA 250 X 10 | (vacío) | (ninguno) | null |
| 4 | SALSA BBQ | L26-175 | — | null |
| 5 | PECHUGA CAMPESINA | L26-175 | — | null |
| 6 | TOCINETA | L26-175 | — | null |

---

## 4. Implementación

### Archivo modificado: `src/services/import/lotResolutionEngine.js`

```js
const BASE_TRAZABLES = ['PECHUGA', 'POLLO'];
const GRAMAJE_PATTERN = /\d+\s*X\s*\d+/i;

function esTrazable(producto) {
  if (!producto) return false;
  const p = producto.toUpperCase();
  const tieneBase = BASE_TRAZABLES.some(kw => p.includes(kw));
  if (!tieneBase) return false;
  return GRAMAJE_PATTERN.test(p);
}
```

`resolveDocumentLotes` ahora filtra por `esTrazable` antes de asignar lote.

---

## 5. Verificación

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores |
| `npm run build` | ✅ Build exitoso (2.18s) |
| PECHUGA 250 X 10 + L26-175 → L26175 | ✅ |
| POLLO 220 X 10 + dominante L26175 → L26175 | ✅ |
| SALSA BBQ + L26-175 → null | ✅ |
| PECHUGA CAMPESINA + L26-175 → null | ✅ |
| TOCINETA → null | ✅ |

---

## 6. Criterios de certificación

| Criterio | Cumple |
|---|---|
| ¿Solo PECHUGA/POLLO con gramaje reciben lote? | ✅ `esTrazable` ambas condiciones |
| ¿Productos no trazables reciben null? | ✅ |
| ¿No se inventan lotes? | ✅ Solo lotes existentes en doc |
| ¿Se modificó el Universal Import Engine? | ❌ |
| ¿Se modificó el Parser? | ❌ |
| ¿Se crearon nuevas capas arquitectónicas? | ❌ Solo lógica en `lotResolutionEngine.js` |

---

*Certificación completada el Julio 2026. Branch: operativo-v1. 1 archivo modificado, 0 archivos nuevos.*
