import { getSupabaseClient } from '../lib/supabase';

const BUCKET_NAME = 'documentos-sgc';

export const documentsService = {
  // === NIVEL 1: PROGRAMAS (Único por módulo) ===
  async getProgram(module) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_programs')
      .select('*')
      .eq('module', module)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async uploadProgram(module, file, userId) {
    const supabase = getSupabaseClient();
    const filePath = `programs/${module}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    const existing = await this.getProgram(module);
    if (existing) {
      await supabase.storage.from(BUCKET_NAME).remove([existing.storage_path]);
      const { data, error } = await supabase
        .from('sgc_programs')
        .update({ name: file.name, file_url: publicUrl, storage_path: filePath, created_by: userId })
        .eq('id', existing.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('sgc_programs')
        .insert({ module, name: file.name, file_url: publicUrl, storage_path: filePath, created_by: userId })
        .select().single();
      if (error) throw error;
      return data;
    }
  },

  async deleteProgram(id, storagePath) {
    const supabase = getSupabaseClient();
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    const { error } = await supabase.from('sgc_programs').delete().eq('id', id);
    if (error) throw error;
  },

  // === NIVEL 2: REGISTROS / CERTIFICADOS (Múltiples por módulo) ===
  async getRecords(module, type) {
    const supabase = getSupabaseClient();

    // Si type es null/undefined, retornamos todos los records del módulo.
    // Esto permite que DocumentManager agrupe por categoría (type) sin perder persistencia.
    let query = supabase
      .from('sgc_records')
      .select('*')
      .eq('module', module);

    if (type !== null && type !== undefined) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async uploadRecord(module, type, file, userId) {
    const supabase = getSupabaseClient();
    const filePath = `records/${module}/${type}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('sgc_records')
      .insert({ module, type, name: file.name, file_url: publicUrl, storage_path: filePath, created_by: userId })
      .select().single();

    if (error) throw error;
    return data;
  },

  async deleteRecord(id, storagePath) {
    const supabase = getSupabaseClient();
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    const { error } = await supabase.from('sgc_records').delete().eq('id', id);
    if (error) throw error;
  }
};
