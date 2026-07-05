/**
 * FormBuilderOrderAdapter
 *
 * Sprint 44.2B — Fase 2
 * Adapter responsable de:
 * - traducir orderedIds (del Motor Universal) -> order_index (sgc_form_fields)
 * - persistir el nuevo orden
 * - recargar usando dynamicService.getFormFields(formId)
 *
 * Restricciones de fase:
 * - No integra con UI.
 * - No modifica el Motor Universal.
 * - dynamicService se usa solo para lectura (recarga).
 */

import { dynamicService } from '../../services/dynamicService';
import { getSupabaseClient } from '../../lib/supabase';

function getClientOrThrow() {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase no está configurado (.env).');
  return sb;
}

/**
 * Normaliza orderedIds removiendo nulos/undefined.
 * No cambia el contrato del adapter: si faltan ids, la persistencia
 * actuará solo sobre los ids provistos.
 *
 * @param {Array<any>} orderedIds
 */
function normalizeOrderedIds(orderedIds) {
  if (!Array.isArray(orderedIds)) return [];
  return orderedIds.filter((x) => x !== null && x !== undefined);
}

/**
 * @typedef {Object} ReorderResult
 * @property {boolean} ok
 * @property {string|undefined} errorMessage
 * @property {Array<any>|undefined} refreshedFields
 */

/**
 * Reordena campos de un formulario.
 *
 * API conceptual:
 * Entradas:
 * - formId: id del formulario
 * - orderedIds: arreglo con los ids (sgc_form_fields.id) en el nuevo orden
 *
 * Salidas:
 * - refreshedFields: lista recargada y ordenada por dynamicService.getFormFields
 *
 * @param {Object} params
 * @param {string|number} params.formId
 * @param {Array<string|number>} params.orderedIds
 * @returns {Promise<ReorderResult>}
 */
export async function reorderFormFieldsOrder({ formId, orderedIds }) {
  try {
    if (formId === null || formId === undefined) {
      return { ok: false, errorMessage: 'formId es requerido' };
    }

    const ids = normalizeOrderedIds(orderedIds);

    const sb = getClientOrThrow();

    // Persistencia: order_index = índice en orderedIds
    // Se ejecuta en paralelo (comportamiento simple y consistente con los
    // patrones existentes del repo).
    const updates = ids.map((id, idx) => {
      return sb
        .from('sgc_form_fields')
        .update({ order_index: idx })
        .eq('id', id)
        .eq('form_id', formId);
    });

    const results = await Promise.all(updates);
    const firstError = results.find((r) => r && r.error);
    if (firstError?.error) throw firstError.error;

    // Recarga: alinear con fuente oficial.
    const refreshedFields = await dynamicService.getFormFields(formId);

    return { ok: true, refreshedFields };
  } catch (e) {
    return {
      ok: false,
      errorMessage: e?.message || 'Error al reordenar campos',
    };
  }
}

