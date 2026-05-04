import { format } from 'date-fns';
import { getSupabaseClient } from '../lib/supabase';

function displayId(uuid) {
  if (!uuid || typeof uuid !== 'string') return 'DESP';
  const short = uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `DESP-${short}`;
}

/** Campos extra del formulario manual van en observaciones para no perder información. */
export function mergeObservacionesExtras(observacionesBase, formData) {
  const base = String(observacionesBase ?? '').trim();
  const parts = [];
  if (formData?.presentacion) parts.push(`Presentación: ${formData.presentacion}`);
  if (formData?.temperatura) parts.push(`Temperatura: ${formData.temperatura}`);
  if (formData?.calidadEmpaque) parts.push(`Calidad empaque: ${formData.calidadEmpaque}`);
  if (formData?.firmaConductor) parts.push(`Firma/CC conductor: ${formData.firmaConductor}`);
  const meta = parts.join(' | ');
  if (!meta) return base;
  if (!base) return meta;
  return `${base}\n${meta}`;
}

export function rowToUi(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayId: displayId(row.id),
    fecha: row.fecha ?? '',
    fechaDespacho: row.fecha ?? '',
    hora: row.hora ?? '',
    cliente: row.cliente ?? '',
    producto: row.producto ?? '',
    lote: row.lote ?? '',
    cantidad: row.cantidad_bolsas ?? '',
    cantidadBolsas: row.cantidad_bolsas ?? '',
    peso: row.peso ?? '',
    destino: row.destino ?? '',
    placa: row.placa ?? '',
    conductor: row.conductor ?? '',
    observaciones: row.observaciones ?? '',
    estado: row.estado ?? 'Completado',
    created_at: row.created_at,
  };
}

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formToInsertPayload(formData, defaults) {
  const fd = formData || {};
  const placa = String(fd.placa || '').trim() || defaults?.placa || 'TRG786';
  const conductor = String(fd.conductor || '').trim() || defaults?.conductor || 'Juan Gómez';

  return {
    fecha: fd.fecha || format(new Date(), 'yyyy-MM-dd'),
    hora: fd.hora ?? '',
    cliente: fd.cliente ?? '',
    producto: fd.producto ?? '',
    lote: fd.lote ?? '',
    cantidad_bolsas: numOrNull(fd.cantidad),
    peso: numOrNull(fd.peso),
    destino: fd.destino ?? '',
    placa,
    conductor,
    observaciones: mergeObservacionesExtras(fd.observaciones, fd),
    estado: 'Completado',
  };
}

export function excelRowToInsertPayload(row, defaults) {
  const placa = String(row?.placa || '').trim() || defaults?.placa || 'TRG786';
  const conductor = String(row?.conductor || '').trim() || defaults?.conductor || 'Juan Gómez';

  return {
    fecha: row?.fechaDespacho || format(new Date(), 'yyyy-MM-dd'),
    hora: row?.hora ?? '',
    cliente: row?.cliente ?? '',
    producto: row?.producto ?? '',
    lote: row?.lote ?? '',
    cantidad_bolsas: numOrNull(row?.cantidadBolsas),
    peso: numOrNull(row?.peso),
    destino: row?.destino ?? '',
    placa,
    conductor,
    observaciones: row?.observaciones ?? '',
    estado: 'Completado',
  };
}

export async function fetchDespachos() {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase no está configurado (.env).');

  const { data, error } = await sb
    .from('despachos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(rowToUi);
}

export async function insertDespacho(payload) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase no está configurado (.env).');

  const { data, error } = await sb.from('despachos').insert(payload).select('*').single();

  if (error) throw error;
  return rowToUi(data);
}

export async function updateDespacho(id, payload) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase no está configurado (.env).');

  const { data, error } = await sb
    .from('despachos')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToUi(data);
}

export async function deleteDespacho(id) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase no está configurado (.env).');

  const { error } = await sb
    .from('despachos')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function insertDespachosBatch(payloads) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase no está configurado (.env).');
  if (!payloads?.length) return [];

  const chunkSize = 200;
  const acc = [];

  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    const { data, error } = await sb.from('despachos').insert(chunk).select('*');
    if (error) throw error;
    acc.push(...(data || []).map(rowToUi));
  }

  return acc;
}
