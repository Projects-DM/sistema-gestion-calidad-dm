import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

function now() {
  return new Date().toISOString();
}

async function logEvent({ experienceKey, recordId, eventType, eventData, user }) {
  if (!isSupabaseConfigured()) return null;
  const sb = getSupabaseClient();
  const payload = {
    experience_key: experienceKey,
    record_id: recordId || null,
    event_type: eventType,
    event_data: eventData || {},
    user_id: user?.id || null,
    user_name: user?.nombre || user?.email || 'Sistema',
    created_at: now(),
  };
  const { data, error } = await sb.from('operational_audit_log').insert(payload).select('*').single();
  if (error) {
    console.warn('[AuditService] Error logging event:', error.message);
    return null;
  }
  return data;
}

async function getRecordTimeline(experienceKey, recordId) {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('operational_audit_log')
    .select('*')
    .eq('experience_key', experienceKey)
    .eq('record_id', recordId)
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[AuditService] Error fetching timeline:', error.message);
    return [];
  }
  return data || [];
}

async function getExperienceTimeline(experienceKey, { limit = 100 } = {}) {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('operational_audit_log')
    .select('*')
    .eq('experience_key', experienceKey)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[AuditService] Error fetching experience timeline:', error.message);
    return [];
  }
  return data || [];
}

export const auditCreate = (args) => logEvent({ ...args, eventType: 'create' });
export const auditUpdate = (args) => logEvent({ ...args, eventType: 'update' });
export const auditDelete = (args) => logEvent({ ...args, eventType: 'delete' });
export const auditImport = (args) => logEvent({ ...args, eventType: 'import' });
export const auditExport = (args) => logEvent({ ...args, eventType: 'export' });
export const auditCompliance = (args) => logEvent({ ...args, eventType: 'compliance' });
export const auditRuleExecution = (args) => logEvent({ ...args, eventType: 'rule_execution' });
export const auditFlowStep = (args) => logEvent({ ...args, eventType: 'flow_step' });
export const auditApproval = (args) => logEvent({ ...args, eventType: 'record_approved' });
export const auditClosure = (args) => logEvent({ ...args, eventType: 'record_closed' });

export const OperationalAuditService = {
  logEvent,
  getRecordTimeline,
  getExperienceTimeline,
  auditCreate,
  auditUpdate,
  auditDelete,
  auditImport,
  auditExport,
  auditCompliance,
  auditRuleExecution,
  auditFlowStep,
  auditApproval,
  auditClosure,
};