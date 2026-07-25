import { getSupabaseClient } from '../lib/supabase';

function displayId(uuid, prefix = 'REC') {
  if (!uuid || typeof uuid !== 'string') return `${prefix}-0000`;
  const short = uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${prefix}-${short}`;
}

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function applyFieldMapping(record, mapping) {
  if (!mapping) return record;
  const result = { ...record };
  for (const [canonical, dbField] of Object.entries(mapping)) {
    if (canonical !== dbField) {
      const val = record[canonical];
      if (typeof val === 'string' && val === '') {
        result[dbField] = null;
      } else if (typeof val === 'number') {
        result[dbField] = numOrNull(val);
      } else {
        result[dbField] = val ?? null;
      }
      delete result[canonical];
    }
  }
  return result;
}

function applyFieldMappingToRow(row, reverseMapping) {
  if (!reverseMapping) return row;
  const result = { ...row };
  for (const [dbField, canonical] of Object.entries(reverseMapping)) {
    if (row[dbField] !== undefined) {
      result[canonical] = row[dbField];
      delete result[dbField];
    }
  }
  return result;
}

function stripInternalKeys(r) {
  if (!r) return r;
  const clean = {};
  for (const [k, v] of Object.entries(r)) {
    if (k.startsWith('_')) continue;
    clean[k] = v === undefined ? null : v;
  }
  return clean;
}

export function createOperationalRecordsService(tableName, { prefix = 'REC', fieldMapping, displayFields } = {}) {
  const revMapping = fieldMapping
    ? Object.fromEntries(Object.entries(fieldMapping).map(([k, v]) => [v, k]))
    : null;

  return {
    async fetch() {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase no configurado');
      const { data, error } = await sb
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r) => ({
        ...applyFieldMappingToRow(r, revMapping),
        id: r.id,
        displayId: displayId(r.id, prefix),
        created_at: r.created_at,
      }));
    },

    async insert(record) {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase no configurado');
      const payload = applyFieldMapping(record, fieldMapping);
      const { data, error } = await sb.from(tableName).insert(payload).select('*').single();
      if (error) throw error;
      return { ...applyFieldMappingToRow(data, revMapping), id: data.id, displayId: displayId(data.id, prefix), created_at: data.created_at };
    },

    async update(id, record) {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase no configurado');
      const payload = { ...applyFieldMapping(record, fieldMapping), updated_at: new Date().toISOString() };
      const { data, error } = await sb.from(tableName).update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      return { ...applyFieldMappingToRow(data, revMapping), id: data.id, displayId: displayId(data.id, prefix), created_at: data.created_at };
    },

    async delete(id) {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase no configurado');
      const { error } = await sb.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    async insertBatch(records) {
      const sb = getSupabaseClient();
      if (!sb) throw new Error('Supabase no configurado');
      if (!records?.length) return [];
      const payloads = records.map((r) => stripInternalKeys(applyFieldMapping(r, fieldMapping)));
      const chunkSize = 200;
      const acc = [];
      for (let i = 0; i < payloads.length; i += chunkSize) {
        const chunk = payloads.slice(i, i + chunkSize);
        const { data, error } = await sb.from(tableName).insert(chunk).select('*');
        if (error) throw error;
        acc.push(...(data || []).map((r) => ({
          ...applyFieldMappingToRow(r, revMapping),
          id: r.id,
          displayId: displayId(r.id, prefix),
          created_at: r.created_at,
        })));
      }
      return acc;
    },
  };
}
