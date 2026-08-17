/**
 * UniversalOrderMotor
 *
 * Sprint 44.2B — Fase 1
 * Sprint 328 — Explicit Field Ordering · CONTROLLED METADATA EXTENSION
 * Núcleo puro (sin React, sin Supabase, sin dominio, sin persistencia).
 *
 * Responsabilidad:
 * - Operar sobre una secuencia en memoria (inmutable) y devolver el nuevo orden.
 * - Proveer UNA operación canónica de reordenamiento (moveFieldToOrder).
 * - Proveer la normalización única (normalizeFieldOrder) → 1..N, idempotente.
 *
 * ONE FIELD IDENTITY · ONE EXPLICIT ORDER · ONE REORDER ENGINE · ONE METADATA CONTRACT
 */

/**
 * Convierte un valor a entero positivo válido (>= 1) o null si no lo es.
 * Acepta números y strings numéricas ("12"). Rechaza 0, negativos, decimales
 * y valores no numéricos ("abc", "1.5", "").
 *
 * @param {any} value
 * @returns {number|null}
 */
function toPositiveInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Normaliza la secuencia a un orden canónico contiguo 1..N (idempotente).
 *
 * - Deriva el orden de `field.order` (canónico) o `field.order_index` (columna
 *   física existente); si no existe ninguno (metadata legacy), usa la posición.
 * - NO muta: devuelve una nueva colección con la propiedad `order` = 1..N.
 * - La identidad (id/label/type/...) se conserva exactamente.
 *
 * @template T extends { id: any }
 * @param {T[]} fields
 * @returns {T[]}
 */
export function normalizeFieldOrder(fields) {
  const arr = (Array.isArray(fields) ? fields : []).map((f) => ({ ...f }));
  const decorated = arr.map((field, idx) => {
    const pos = toPositiveInt(field.order) ?? toPositiveInt(field.order_index) ?? idx + 1;
    return { field, pos, idx };
  });
  decorated.sort((a, b) => a.pos - b.pos || a.idx - b.idx);
  return decorated.map(({ field }, i) => ({ ...field, order: i + 1 }));
}

/**
 * OPERACIÓN CANÓNICA DE REORDENAMIENTO.
 *
 * Mueve el campo identificado por fieldId a targetOrder y recalcula 1..N.
 * - targetOrder inválido (0, -1, 1.5, "abc") → colección normalizada sin cambios.
 * - targetOrder fuera de rango → clamp a [1, N].
 * - targetOrder === orden actual → colección normalizada sin cambios (idempotente).
 * - NO muta la entrada.
 *
 * @template T extends { id: any }
 * @param {T[]} fields
 * @param {any} fieldId
 * @param {any} targetOrder
 * @returns {T[]}
 */
export function moveFieldToOrder(fields, fieldId, targetOrder) {
  const normalized = normalizeFieldOrder(fields);
  const target = toPositiveInt(targetOrder);
  if (target === null) return normalized;

  const idx = normalized.findIndex((f) => f && f.id === fieldId);
  if (idx < 0) return normalized;

  const n = normalized.length;
  const clamped = Math.min(Math.max(target, 1), n);
  if (clamped === idx + 1) return normalized;

  const next = normalized.slice();
  const [moved] = next.splice(idx, 1);
  next.splice(clamped - 1, 0, moved);
  return next.map((f, i) => ({ ...f, order: i + 1 }));
}

/**
 * Normaliza la entrada de secuencia a un array
 * sin mutarla.
 *
 * @template T
 * @param {T[]} sequence
 * @returns {T[]}
 */
function asArray(sequence) {
  return Array.isArray(sequence) ? sequence.slice() : [];
}

/**
 * Encuentra el índice del elemento objetivo por targetId.
 * Asume que cada elemento posee una propiedad `id`.
 *
 * @template T extends { id: any } 
 * @param {T[]} sequence
 * @param {any} targetId
 * @returns {number}
 */
function findIndexById(sequence, targetId) {
  return sequence.findIndex((item) => item && item.id === targetId);
}

/**
 * Reordenamiento genérico por operación.
 *
 * Operaciones soportadas (piloto):
 * - { type: 'move', direction: 'up'|'down', targetId }
 *
 * @template T extends { id: any }
 * @param {T[]} sequenceOrdered
 * @param {{ type: 'move', direction: 'up'|'down', targetId: any }} operation
 * @returns {T[]}
 */
const ORDER_OPERATIONS = {
  MOVE: 'move',
};

const MOVE_DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
};

/**
 * Reordenamiento genérico por operación.
 *
 * Contrato de operación (operation):
 * - Debe ser un objeto con:
 *   - operation.type: string literal (actualmente 'move')
 *   - operation.direction: string literal (actualmente 'up'|'down')
 *   - operation.targetId: id del elemento objetivo
 *
 * Operaciones soportadas (piloto):
 * - { type: 'move', direction: 'up'|'down', targetId }
 *
 * Comportamiento frente a operaciones no soportadas:
 * - Si operation.type !== 'move' o operation es inválida, retorna la secuencia original (sin cambios).
 * - Si targetId no existe en la secuencia, retorna la secuencia original.
 *
 * Sprint 328 — TODAS las operaciones convergen en la operación canónica
 * moveFieldToOrder (ONE REORDER ENGINE). No existe una máquina para las flechas
 * y otra para el orden explícito.
 *
 * @template T extends { id: any }
 * @param {T[]} sequenceOrdered
 * @param {{ type: 'move', direction: 'up'|'down', targetId: any }} operation
 * @returns {T[]}
 */
export function reorder(sequenceOrdered, operation) {
  const seq = asArray(sequenceOrdered);

  if (!operation || operation.type !== ORDER_OPERATIONS.MOVE) return seq;

  const { direction, targetId } = operation;
  const idx = findIndexById(seq, targetId);
  if (idx < 0) return seq;

  if (direction === MOVE_DIRECTIONS.UP) return moveUp(seq, targetId);
  if (direction === MOVE_DIRECTIONS.DOWN) return moveDown(seq, targetId);

  return seq;
}

/**
 * Helpers de conveniencia (no exponen dominio/persistencia).
 * Sprint 328 — convergen en moveFieldToOrder (misma operación canónica).
 *
 * @template T extends { id: any }
 * @param {T[]} sequenceOrdered
 * @param {any} targetId
 * @returns {T[]}
 */
export function moveUp(sequenceOrdered, targetId) {
  const normalized = normalizeFieldOrder(sequenceOrdered);
  const current = toPositiveInt(normalized.find((f) => f && f.id === targetId)?.order);
  if (current === null) return normalized;
  return moveFieldToOrder(normalized, targetId, current - 1);
}

/**
 * @template T extends { id: any }
 * @param {T[]} sequenceOrdered
 * @param {any} targetId
 * @returns {T[]}
 */
export function moveDown(sequenceOrdered, targetId) {
  const normalized = normalizeFieldOrder(sequenceOrdered);
  const current = toPositiveInt(normalized.find((f) => f && f.id === targetId)?.order);
  if (current === null) return normalized;
  return moveFieldToOrder(normalized, targetId, current + 1);
}

/**
 * Devuelve una lista de ids en el orden actual.
 * Útil para adaptadores/persistencia futuras.
 *
 * @template T extends { id: any }
 * @param {T[]} sequenceOrdered
 * @returns {any[]}
 */
export function toOrderedIds(sequenceOrdered) {
  return asArray(sequenceOrdered).map((x) => x && x.id);
}

