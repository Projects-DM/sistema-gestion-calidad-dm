import { getSupabaseClient } from '../lib/supabase';

/** Bucket en Supabase Storage (créalo en el dashboard con este nombre). */
export const STORAGE_BUCKET_DOCUMENTOS = 'documentos-calidad';

function inferTipo(filename) {
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.match(/\.(png|jpg|jpeg|webp|gif)$/)) return 'imagen';
  if (lower.match(/\.(xlsx|xls|csv)$/)) return 'excel';
  return 'archivo';
}

/**
 * Sube un archivo a Storage y registra una fila en `documentos`.
 * Requiere bucket `documentos-calidad` y políticas RLS/storage habilitadas.
 */
export async function uploadDocumentoCertificado({
  file,
  modulo = 'calidad',
  nombreOverride,
}) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase no está configurado (.env).');
  if (!file) throw new Error('No se proporcionó archivo.');

  const safeName = String(file.name || 'documento').replace(/[^\w.\-]/g, '_');
  const path = `${modulo}/${Date.now()}_${safeName}`;

  const { error: upErr } = await sb.storage.from(STORAGE_BUCKET_DOCUMENTOS).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (upErr) throw upErr;

  const { data: pub } = sb.storage.from(STORAGE_BUCKET_DOCUMENTOS).getPublicUrl(path);
  const url = pub?.publicUrl || '';

  const nombre = nombreOverride || file.name || safeName;
  const tipo = inferTipo(file.name);

  const { data: row, error: insErr } = await sb
    .from('documentos')
    .insert({
      modulo,
      nombre,
      url,
      tipo,
    })
    .select('*')
    .single();

  if (insErr) throw insErr;
  return row;
}
