import { getSupabaseClient } from '../lib/supabase';

export const dynamicService = {
  async getModules() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_modules')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getModuleBySlug(slug) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_modules')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return data;
  },

  async getFormsByModule(moduleId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_forms')
      .select('*')
      .eq('module_id', moduleId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getFormBySlug(slug) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_forms')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return data;
  },

  async getFormFields(formId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_form_fields')
      .select('*')
      .eq('form_id', formId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return data;
  },

  async submitFormResponse(formId, userId, values, evidences = []) {
    const supabase = getSupabaseClient();
    
    // 1. Insert response
    const { data: response, error: resError } = await supabase
      .from('sgc_form_responses')
      .insert({ form_id: formId, created_by: userId, status: 'pendiente_revision' })
      .select()
      .single();
    
    if (resError) throw resError;

    // 2. Prepare and insert values
    const responseValues = Object.keys(values).map(fieldId => {
      const val = values[fieldId];
      let valueField = 'value_text';
      if (typeof val === 'number') valueField = 'value_number';
      else if (typeof val === 'boolean') valueField = 'value_boolean';
      else if (typeof val === 'object') valueField = 'value_json';

      return {
        response_id: response.id,
        field_id: fieldId,
        [valueField]: val
      };
    });

    if (responseValues.length > 0) {
      const { error: valError } = await supabase
        .from('sgc_response_values')
        .insert(responseValues);
      
      if (valError) throw valError;
    }

    // 3. Insert evidences if any
    if (evidences.length > 0) {
      const evsToInsert = evidences.map(ev => ({
        response_id: response.id,
        file_url: ev.file_url,
        storage_path: ev.storage_path,
        file_type: ev.file_type || 'image/jpeg'
      }));
      const { error: evError } = await supabase
        .from('sgc_evidences')
        .insert(evsToInsert);
        
      if (evError) throw evError;
    }

    // 4. Register Audit Log (Create)
    await supabase.from('sgc_audit_logs').insert({
      response_id: response.id,
      action_type: 'create',
      modified_by: userId,
      new_data: values,
      reason: 'Creación inicial del registro'
    });

    return response;
  },

  async verifyFormResponse(responseId, userId, status, comment) {
    const supabase = getSupabaseClient();
    
    // Update status and verification details
    const { error: updateError } = await supabase
      .from('sgc_form_responses')
      .update({
        status: status,
        verified_by: userId,
        verified_at: new Date().toISOString(),
        verification_comment: comment
      })
      .eq('id', responseId);

    if (updateError) throw updateError;

    // Register Audit Log
    await supabase.from('sgc_audit_logs').insert({
      response_id: responseId,
      action_type: 'verify',
      modified_by: userId,
      new_data: { status, verification_comment: comment },
      reason: `Verificación operativa: ${status}`
    });
  },

  async verifyMultipleFormResponses(responseIds, userId, status, comment) {
    const supabase = getSupabaseClient();
    
    const { error: updateError } = await supabase
      .from('sgc_form_responses')
      .update({
        status: status,
        verified_by: userId,
        verified_at: new Date().toISOString(),
        verification_comment: comment
      })
      .in('id', responseIds);

    if (updateError) throw updateError;

    const auditLogs = responseIds.map(id => ({
      response_id: id,
      action_type: 'verify',
      modified_by: userId,
      new_data: { status, verification_comment: comment },
      reason: `Verificación masiva: ${status}`
    }));

    await supabase.from('sgc_audit_logs').insert(auditLogs);
  },

  async getAuditLogs(responseId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_audit_logs')
      .select(`
        *,
        profiles:modified_by ( nombre, rol )
      `)
      .eq('response_id', responseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    return data;
  },

  async getRecentResponses(limit = 5) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_form_responses')
      .select(`
        id,
        status,
        created_at,
        sgc_forms (name, engine_type)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error('Error fetching recent responses:', error);
      return [];
    }
    return data;
  },

  async getDashboardStats() {
    const supabase = getSupabaseClient();
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const { count: todayCount, error } = await supabase
      .from('sgc_form_responses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
      
    const { count: allCount } = await supabase
      .from('sgc_form_responses')
      .select('*', { count: 'exact', head: true });

    return {
      todayResponses: todayCount || 0,
      totalResponses: allCount || 0,
      incumplimientos: 0, // Mock for now until we parse response values for fails
      alertasActivas: 0
    };
  },

  async getModuleResponses(moduleId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_form_responses')
      .select(`
        id,
        status,
        created_at,
        created_by,
        verified_at,
        verification_comment,
        sgc_forms!inner ( id, name, module_id ),
        profiles:created_by ( nombre, rol ),
        verifier:verified_by ( nombre, rol ),
        sgc_response_values ( field_id, value_text, value_number, value_boolean, sgc_form_fields ( label, field_type, options ) ),
        sgc_evidences ( id, file_url, file_type )
      `)
      .eq('sgc_forms.module_id', moduleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching module responses:', error);
      return [];
    }
    return data;
  }
};
