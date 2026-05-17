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

  async submitFormResponse(formId, userId, values) {
    const supabase = getSupabaseClient();
    
    // 1. Insert response
    const { data: response, error: resError } = await supabase
      .from('sgc_form_responses')
      .insert({ form_id: formId, created_by: userId })
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

    return response;
  }
};
