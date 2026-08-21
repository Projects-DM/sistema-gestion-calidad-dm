/**
 * Sprint 343 — OPERATIONAL LOT RULES
 *
 * Reglas puras y determinísticas del campo canónico `lote` para la operación
 * batch `bulkAssignLot` (Despachos). Sin imports — Node-testable.
 *
 * VAL-01 (obligatorio): '' / '   ' / null / undefined → INVALID_LOT.
 * VAL-02 (normalización): elimina whitespace accidental antes de persistir.
 * VAL-03 (sin semántica nueva): NO se agregan restricciones de formato que no
 *   existan en el contrato de edición individual (create/edit acepta texto libre).
 */
export const INVALID_LOT = 'INVALID_LOT';

export function normalizeLot(raw) {
  return typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
}

export function validateLot(raw) {
  const value = normalizeLot(raw);
  if (!value) {
    return { valid: false, code: INVALID_LOT, message: 'El lote es obligatorio.' };
  }
  return { valid: true, value };
}