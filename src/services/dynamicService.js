import { getSupabaseClient } from '../lib/supabase.js';

/**
 * Sprint 195 — Existing Query Layer consolidation.
 *
 * getRuntimeModules is the SHARED query layer for `sgc_modules`.
 * The Dashboard (GET_RUNTIME_MODULES via ModuleAdministrationApplicationService)
 * and Alert Runtime (global Dashboard context) both consume THIS same
 * existing query. In-flight de-duplication merges concurrent identical
 * calls into a single network request.
 *
 * NOT a cache: resolved data is never retained; only in-flight requests
 * share their promise.
 */
let runtimeModulesInFlight = null;

export const dynamicService = {
  async getModules() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_modules')
      .select('id, name, slug, state, icon, color, visible, description, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getRuntimeModules() {
    if (runtimeModulesInFlight) return runtimeModulesInFlight;

    const supabase = getSupabaseClient();
    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('sgc_modules')
          .select('id, name, slug, icon, color, order_index, state, visible')
          .eq('is_active', true)
          .eq('visible', true)
          .order('order_index', { ascending: true });
        if (error) throw error;
        return data;
      } finally {
        runtimeModulesInFlight = null;
      }
    })();

    runtimeModulesInFlight = promise;
    return promise;
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

  async getModuleById({ moduleId } = {}) {
    if (moduleId === undefined || moduleId === null || String(moduleId).trim().length === 0) {
      throw new Error('dynamicService.getModuleById: moduleId is required');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_modules')
      .select('*')
      .eq('id', moduleId)
      .single();

    if (error) throw error;
    return data;
  },


  async getFormsByModule(moduleId) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_forms')
      .select('id, name, slug, module_id, engine_type, description, roles_allowed, created_at, alert_config')
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
      .select('id, name, slug, module_id, engine_type, roles_allowed, description, alert_config')
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return data;
  },

  async getModulesFormCounts(moduleIds) {
    if (!moduleIds || moduleIds.length === 0) return {};
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_forms')
      .select('module_id')
      .eq('is_active', true)
      .in('module_id', moduleIds);
    if (error) throw error;
    const counts = {};
    for (const f of (data || [])) {
      counts[f.module_id] = (counts[f.module_id] || 0) + 1;
    }
    return counts;
  },

  async getModulesRepositoryCounts(slugs) {
    if (!slugs || slugs.length === 0) return {};
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_document_repositories')
      .select('module_slug')
      .in('module_slug', slugs);
    if (error) throw error;
    const counts = {};
    for (const r of (data || [])) {
      counts[r.module_slug] = (counts[r.module_slug] || 0) + 1;
    }
    return counts;
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
    const { data: auditInsertData, error: auditError } = await supabase
      .from('sgc_audit_logs')
      .insert({
        response_id: response.id,
        action_type: 'create',
        modified_by: userId,
        new_data: values,
        reason: 'Creación inicial del registro'
      })
      .select()
      .single();

    if (auditError) throw auditError;

    // 5. Runtime bridge hook (no DB schema changes)
    // Emit normalized internal event object (translation happens server-side in runtime injection path).
    // This is deliberately side-effect free regarding existing business logic.
    const internalEvent = {
      type: 'create',
      formId,
      responseId: response.id,
      actorId: userId,
      timestamp: new Date().toISOString(),
      correlationId: response.id,
      auditEventId: auditInsertData?.id,
    };

    return { ...response, __runtime_internal_event: internalEvent };
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
    const { data: auditInsertData, error: auditError } = await supabase
      .from('sgc_audit_logs')
      .insert({
        response_id: responseId,
        action_type: 'verify',
        modified_by: userId,
        new_data: { status, verification_comment: comment },
        reason: `Verificación operativa: ${status}`
      })
      .select()
      .single();

    if (auditError) throw auditError;

    // 4. Runtime bridge hook: return internal normalized event object
    // (consumed by runtime injection path).
    const internalEvent = {
      type: 'verify',
      formId: null,
      responseId,
      actorId: userId,
      timestamp: new Date().toISOString(),
      correlationId: responseId,
      auditEventId: auditInsertData?.id,
    };

    return internalEvent;
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

    // Count non-compliant boolean responses (simple booleans + compliance booleans)
    const { count: boolNonCompliantCount } = await supabase
      .from('sgc_response_values')
      .select('*', { count: 'exact', head: true })
      .eq('value_boolean', false);

    const { count: jsonNonCompliantCount } = await supabase
      .from('sgc_response_values')
      .select('*', { count: 'exact', head: true })
      .not('value_json', 'is', null)
      .filter('value_json->>value', 'eq', 'No cumple');

    return {
      todayResponses: todayCount || 0,
      totalResponses: allCount || 0,
      incumplimientos: (boolNonCompliantCount || 0) + (jsonNonCompliantCount || 0),
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
        sgc_response_values ( field_id, value_text, value_number, value_boolean, value_json, sgc_form_fields ( label, field_type, options ) ),
        sgc_evidences ( id, file_url, file_type )
      `)
      .eq('sgc_forms.module_id', moduleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching module responses:', error);
      return [];
    }
    return data;
  },

  async updateForm(formId, updates) {
    if (!formId) throw new Error('dynamicService.updateForm: formId is required');
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_forms')
      .update(updates)
      .eq('id', formId)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error(`Form with ID "${formId}" not found or update failed.`);
    return data;
  },

  async updateField(fieldId, updates) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_form_fields')
      .update(updates)
      .eq('id', fieldId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateModule({ id, name, slug }) {
    try {
      // Validation
      if (id === undefined || id === null || String(id).trim().length === 0) {
        return { success: false, error: 'El id del módulo es obligatorio.' };
      }
      if (!name || String(name).trim().length < 3) {
        return { success: false, error: 'El nombre del módulo es requerido y debe tener al menos 3 caracteres.' };
      }
      if (!slug || String(slug).trim().length === 0) {
        return { success: false, error: 'El slug del módulo es requerido.' };
      }

      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('sgc_modules')
        .update({
          name: name,
          slug: slug,
        })
      .eq('id', id)
        .select('*');



      if (error) {
        return { success: false, error: error.message };
      }


      // update correcto pero sin filas afectadas
      if (!Array.isArray(data) || data.length === 0) {
        return { success: false, error: 'No se encontró el módulo para actualizar' };
      }

      // actualización exitosa: se espera exactamente 1 fila por id, pero manejamos robustamente
      const updated = data[0];
      return { success: true, updatedModule: updated };
    } catch (e) {
      return { success: false, error: e?.message || 'No fue posible actualizar el módulo.' };
    }
  }
};

