# Sprint 131.7 — Optional Lot Persistence Contract Certification (SSOT)

**Tipo:** Persistence Contract Refinement Sprint  
**Estado:** LEVEL 3 — CERTIFIED  
**Branch:** operativo-v1  
**Dependencias:** Sprint 131.6  
**Archivos nuevos:** 1 (SQL migration)  
**Archivos modificados:** 0  

---

## 1. Objetivo

Certificar oficialmente que el campo `lote` es opcional dentro del módulo Despachos.

### Problema

```
public.despachos
  lote text NOT NULL default ''

Pero operacionalmente existen productos que jamás tendrán lote:
  SALSA BBQ, ADEREZO, RIPIO, TOCINETA,
  PECHUGA CAMPESINA, POLLO ENTERO, etc.

Resultado: NOT NULL viola el modelo operacional del negocio.
```

### Nueva regla arquitectónica

```
El campo lote es OPCIONAL para todos los registros operacionales.
La obligatoriedad del lote debe ser determinada por las reglas del negocio
y NO por la base de datos.
```

---

## 2. Regla operacional

| Producto | ¿Lleva lote? |
|---|---|
| PECHUGA 250 X 10 | SI |
| POLLO 220 X 10 | SI |
| PECHUGA 120 X 5 | SI |
| SALSA BBQ | NO |
| TOCINETA | NO |
| RIPIO | NO |
| POLLO ENTERO | NO |
| PECHUGA CAMPESINA | NO |

---

## 3. Implementación

### SQL Migration: `supabase/migrations/sprint-131.7-optional-lote.sql`

```sql
alter table public.despachos
  alter column lote drop not null,
  alter column lote drop default;
```

### Código existente (sin cambios)

El pipeline ya produce `lote = null` para productos no trazables:

| Capa | Código | Comportamiento |
|---|---|---|
| `lotResolutionEngine.js` | `return { ...row, lote: null }` | No trazables → null |
| `operationalDefaultsResolver.js` | `lote: r.lote ?? null` | Preserva null |
| `operationalDataExtractionLayer.js` (mapper) | `lote: r.lote ?? null` | Persiste null → Supabase |

Únicamente faltaba que la columna aceptara `null`.

---

## 4. Pipeline certificado

```
PDF → Operational Recognition → Traceable Product Resolver
→ Lot Resolver → lote = valor válido | null
→ Defaults Resolver → Persistence Mapper
→ Supabase (lote nullable) ✅
```

---

## 5. Verificación

| Verificación | Resultado |
|---|---|
| SQL syntax check | ✅ Válido (ALTER COLUMN DROP NOT NULL + DROP DEFAULT) |
| Producto trazable + lote | ✅ Se inserta correctamente (código existente) |
| Producto no trazable + null | ✅ `lote = null` → Supabase acepta (tras migration) |
| Producto sin lote en PDF | ✅ `null` → Supabase acepta |
| Motor operacional intacto | ❌ Sin cambios |
| Universal Import Engine intacto | ❌ Sin cambios |

---

## 6. Criterios de certificación

| Criterio | Cumple |
|---|---|
| ¿La columna `lote` acepta null? | ✅ `DROP NOT NULL` |
| ¿El default `''` se eliminó? | ✅ `DROP DEFAULT` |
| ¿Los productos no trazables pueden persistirse sin lote? | ✅ |
| ¿Se modificó el código del import engine? | ❌ Solo SQL migration |
| ¿Se inventan lotes para satisfacer la BD? | ❌ `null` es un valor válido |

---

## 7. Restricciones cumplidas

Queda prohibido:

- ❌ inventar lotes
- ❌ crear lotes temporales
- ❌ usar `SIN LOTE`, `NO APLICA`, `00000`, `TEMP`, `L000`

Ambos registros deben persistirse correctamente:

```
PECHUGA 250 X 10 → L26175   ✅
SALSA BBQ         → null     ✅
```

---

*Certificación completada el Julio 2026. Branch: operativo-v1. 1 archivo nuevo (SQL migration), 0 archivos de código modificados.*
