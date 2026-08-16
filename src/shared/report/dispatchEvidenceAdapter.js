/**
 * Sprint 319 — DISPATCH EVIDENCE ADAPTER
 *
 * Transforma registros planos de Despachos (proyección de
 * `operationalRecordsService` consumida por `UniversalOperationalRuntime`)
 * al contrato documental que ya consume `EvidenceReportModel` (Sprint 315).
 *
 * REGLAS (§5, §6, §7, §8, §9, §26):
 *  - PURO: recibe los registros ya cargados; NO consulta (0 fetch, 0 supabase,
 *    0 dynamicService). El informe consume datos existentes, nunca vuelve a
 *    consultar (§3, §23).
 *  - No muta los registros de entrada; devuelve una proyección.
 *  - Conserva identidad canónica (record.id), displayId como identificador
 *    visual, valores, texto, estado, unidades (en el label) y el ORDEN de
 *    entrada (§15). Inventario de 14 campos certificado en Sprint 318 (§7).
 *  - signature_estado (pending/signed) se mapea como CAMPO DOCUMENTAL NORMAL;
 *    NO como firma/href "Ver Firma" porque no existe URL de firma (§8).
 *  - evidences = [] porque Despachos no posee sgc_evidences; el renderer 315
 *    maneja la sección vacía sin modificaciones (§9).
 *  - La normalización de valores la aplica el propio modelo 315 vía
 *    `exportDataNormalizer.normalizeValue` (REUSE §26) — sin segunda lógica.
 *  - Patrón reutilizable (§16): cualquier experiencia futura implementa su
 *    propio EvidenceAdapter con el mismo contrato de salida.
 */
export const DISPATCH_FORM_NAME = 'Despacho';

export const DISPATCH_FIELD_DEFS = [
  { field: 'fecha', label: 'Fecha Despacho', type: 'date' },
  { field: 'hora', label: 'Hora', type: 'time' },
  { field: 'cliente', label: 'Cliente / Razón Social', type: 'text' },
  { field: 'producto', label: 'Producto', type: 'text' },
  { field: 'lote', label: 'Lote', type: 'text' },
  { field: 'cantidad', label: 'Cant. Bolsas', type: 'number' },
  { field: 'peso', label: 'Peso (Kg)', type: 'number' },
  { field: 'temperatura', label: 'Temperatura (°C)', type: 'number' },
  { field: 'destino', label: 'Destino', type: 'text' },
  { field: 'placa', label: 'Vehículo / Placa', type: 'text' },
  { field: 'conductor', label: 'Conductor', type: 'text' },
  { field: 'estado', label: 'Estado', type: 'text' },
  { field: 'observaciones', label: 'Observaciones', type: 'text' },
  { field: 'signature_estado', label: 'Firma Conductor', type: 'text' },
];

export function buildDispatchEvidenceRecord(record) {
  const sgc_response_values = DISPATCH_FIELD_DEFS.map(({ field, label, type }) => {
    const raw = record?.[field];
    return {
      value_text: raw === null || raw === undefined ? '' : String(raw),
      value_number: type === 'number' ? (Number(raw) || null) : null,
      value_boolean: null,
      value_json: null,
      sgc_form_fields: { label, field_type: type, options: {} },
    };
  });

  return {
    id: record.id,
    displayId: record.displayId || '',
    status: record.estado || '',
    created_at: record.created_at || '',
    sgc_forms: { id: 'dispatch', name: DISPATCH_FORM_NAME, module_id: record.module_id || '' },
    profiles: { nombre: record.conductor || '', rol: 'operativo' },
    sgc_evidences: [],
    sgc_response_values,
  };
}

export function buildDispatchEvidenceRecords(records) {
  return (Array.isArray(records) ? records : []).map(buildDispatchEvidenceRecord);
}