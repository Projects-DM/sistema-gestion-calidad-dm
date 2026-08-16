/**
 * Sprint 317 — SGC FILTER ADAPTER
 *
 * Convierte un registro dinámico SGC (proyección de getModuleResponses) en el
 * conjunto plano de atributos filtrables que consume el Generic Filter Core.
 * NO consulta, NO persiste, NO muta el registro original.
 */
import { dateKey } from './filterCore.js';

const STATUS_LABELS = {
  pendiente_revision: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  corregido: 'Corregido',
};

const HALLGALO_LABELS = {
  cumple: 'Cumple',
  advertencia: 'Alerta',
  critico: 'Critico',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || '';
}

export function hallazgoLabel(hallazgo) {
  return HALLGALO_LABELS[hallazgo] || hallazgo || '';
}

export function toFilterable(record) {
  const sgcValues = record.sgc_response_values || [];
  const texto = [
    record.sgc_forms?.name,
    record.profiles?.nombre,
    record.computedStatus,
    record.status,
    ...sgcValues.map((v) =>
      [v.value_text, v.value_number, v.value_json?.value, v.sgc_form_fields?.label]
        .filter((x) => x != null && x !== '')
        .join(' '),
    ),
  ]
    .filter((x) => x != null && x !== '')
    .join(' ')
    .toLowerCase();

  return {
    id: record.id,
    formulario: record.sgc_forms?.name || '',
    usuario: record.profiles?.nombre || '',
    rol: record.profiles?.rol || '',
    estado: record.status || '',
    fecha: record.created_at || '',
    fechaKey: dateKey(record.created_at),
    verificacion: record.verified_at ? 'verificado' : 'pendiente',
    hallazgo: record.computedStatus || '',
    texto,
  };
}