/**
 * UniversalOrderMotor
 *
 * Sprint 44.2B — Fase 1
 * Núcleo puro (sin React, sin Supabase, sin dominio, sin persistencia).
 *
 * Responsabilidad:
 * - Operar sobre una secuencia en memoria (inmutable) y devolver el nuevo orden.
 * - Proveer una API genérica de reordenamiento.
 */

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
 * Nota: el contrato puede ampliarse en el futuro sin romper compatibilidad,
 * manteniendo este comportamiento para tipos no soportados.
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

  if (direction === MOVE_DIRECTIONS.UP) {
    if (idx === 0) return seq;
    const next = seq.slice();
    const tmp = next[idx - 1];
    next[idx - 1] = next[idx];
    next[idx] = tmp;
    return next;
  }

  if (direction === MOVE_DIRECTIONS.DOWN) {
    if (idx === seq.length - 1) return seq;
    const next = seq.slice();
    const tmp = next[idx + 1];
    next[idx + 1] = next[idx];
    next[idx] = tmp;
    return next;
  }

  return seq;
}

/**
 * Helpers de conveniencia (no exponen dominio/persistencia).
 *
 * @template T extends { id: any }
 * @param {T[]} sequenceOrdered
 * @param {any} targetId
 * @returns {T[]}
 */
export function moveUp(sequenceOrdered, targetId) {
  return reorder(sequenceOrdered, { type: 'move', direction: 'up', targetId });
}

/**
 * @template T extends { id: any }
 * @param {T[]} sequenceOrdered
 * @param {any} targetId
 * @returns {T[]}
 */
export function moveDown(sequenceOrdered, targetId) {
  return reorder(sequenceOrdered, { type: 'move', direction: 'down', targetId });
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

