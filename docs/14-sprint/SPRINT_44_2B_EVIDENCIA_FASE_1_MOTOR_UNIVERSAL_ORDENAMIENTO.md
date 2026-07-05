# SPRINT 44.2B — Evidencia de Fase 1 (Motor Universal de Ordenamiento)

> **Fase:** 1 — Construcción del Motor Universal (núcleo puro)
> **Restricciones respetadas:**
> - Sin React
> - Sin Supabase
> - Sin hooks
> - Sin componentes
> - Sin dominio
> - Sin persistencia
> - No se integra todavía con FormBuilder / UI
> - No se modificaron archivos existentes

---

## 1) Archivos creados

1) `src/order-motor/UniversalOrderMotor.js`
- **Responsabilidad:** Motor puro determinístico de reordenamiento sobre una secuencia inmutable.
- **API pública (exportada):**
  - `reorder(sequenceOrdered, operation)`
  - `moveUp(sequenceOrdered, targetId)`
  - `moveDown(sequenceOrdered, targetId)`
  - `toOrderedIds(sequenceOrdered)`
- **Motivo de diseño:**
  - API genérica basada en operación `{ type: 'move', direction: 'up'|'down', targetId }` preparada para extender a futuras estrategias de orden.
  - Retorna nuevas secuencias sin mutar la original.

---

## 2) Archivos modificados
- **Ninguno**

---

## 3) Verificación de invariantes (contrato cumplido)
- Motor puro: **Sí** (funciones determinísticas, sin efectos secundarios)
- Sin React: **Sí**
- Sin Supabase: **Sí**
- Sin hooks: **Sí**
- Sin componentes: **Sí**
- Sin dominio: **Sí** (solo asume que los items tienen una propiedad `id`)
- Sin persistencia: **Sí**
- Inmutable: **Sí** (copia del array antes de swap)
- Determinístico: **Sí** (misma entrada ⇒ misma salida)

---

## 4) Casos validados (especificación)

> Se validó por inspección directa del algoritmo y cubre los casos frontera del piloto.

1) mover arriba
- Caso: targetId en índice 0 => no cambia la secuencia.
- Caso: targetId en índice > 0 => swap con elemento anterior.

2) mover abajo
- Caso: targetId en último índice => no cambia la secuencia.
- Caso: targetId en índice < último => swap con elemento siguiente.

3) primer elemento
- `moveUp(sequence, firstId)` devuelve secuencia igual.

4) último elemento
- `moveDown(sequence, lastId)` devuelve secuencia igual.

5) lista vacía
- `reorder([], operation)` devuelve `[]`.

6) un elemento
- `moveUp([item], item.id)` devuelve el mismo array (no cambia orden).
- `moveDown([item], item.id)` devuelve el mismo array (no cambia orden).

7) dos elementos
- `moveUp([a,b], b.id)` devuelve `[b,a]`.
- `moveDown([a,b], a.id)` devuelve `[b,a]`.

---

## 5) Evidencia de build
- Ejecutado: `vite build` via `npm run build`
- Resultado: **build exitoso** (sin errores de compilación).

---

## 6) API final (resumen)
- `reorder(sequenceOrdered, operation)`
- `moveUp(sequenceOrdered, targetId)`
- `moveDown(sequenceOrdered, targetId)`
- `toOrderedIds(sequenceOrdered)`

---

## 7) Estado del plan para continuar
- **Fase 1 completada: Sí**
- **Lista para iniciar Fase 2: Sí**

---

## 8) Bloqueos encontrados
- Ninguno.

