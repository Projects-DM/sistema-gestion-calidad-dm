/**
 * ModuleCapabilityPersistenceAdapter
 *
 * Transitional adapter that implements the CapabilityPersistenceProvider interface
 * expected by the operational pipeline (CapabilityAssignmentService → AssignmentTransactionManager).
 *
 * Storage strategy:
 * - Persists capability assignments as a JSONB array in the sgc_modules.capabilities column.
 * - This avoids creating a separate sgc_module_capability_assignments table during the
 *   transitional phase while still enabling full CRUD through the operational pipeline.
 *
 * Interface contract (consumed by AssignmentTransactionManager):
 *   - replaceAssignmentsForModule({ moduleId, assignments })
 *   - listAssignmentsByModuleId({ moduleId })
 *   - deleteAssignmentsForModule({ moduleId })
 *
 * SSOT:
 * - UI never knows about Supabase (this adapter is injected via ApplicationService constructor)
 * - Core never knows about React
 * - This adapter IS the persistence boundary for capability assignments
 */

import { getSupabaseClient } from '../../../../lib/supabase.js';

export class ModuleCapabilityPersistenceAdapter {
  /**
   * Replace all capability assignments for a module.
   *
   * @param {object} params
   * @param {string} params.moduleId
   * @param {Array<object>} params.assignments - Array of assignment objects
   * @returns {Promise<Array<object>>} Persisted assignments
   */
  async replaceAssignmentsForModule({ moduleId, assignments } = {}) {
    if (!moduleId) throw new Error('ModuleCapabilityPersistenceAdapter.replaceAssignmentsForModule: moduleId is required');
    if (!Array.isArray(assignments)) throw new Error('ModuleCapabilityPersistenceAdapter.replaceAssignmentsForModule: assignments must be an array');

    const supabase = getSupabaseClient();

    const normalized = assignments.map((a) => {
      const base = {
        assignmentId: a.assignmentId,
        moduleId: moduleId,
        packageId: a.packageId,
        state: a.state || 'active',
        owner: a.owner || 'system',
        version: a.version || 'v1',
        orderIndex: a.orderIndex ?? 0,
      };
      if (String(a.packageId || '').replace('pkg:standard:', '') === 'operational-experiences' && Array.isArray(a.enabledExperiences)) {
        base.enabledExperiences = a.enabledExperiences;
      }
      return base;
    });

    const { error } = await supabase
      .from('sgc_modules')
      .update({ capabilities: normalized })
      .eq('id', moduleId);

    if (error) {
      throw new Error(`Failed to persist capabilities: ${error.message}`);
    }

    return normalized;
  }

  /**
   * List capability assignments for a module.
   *
   * @param {object} params
   * @param {string} params.moduleId
   * @returns {Promise<Array<object>>}
   */
  async listAssignmentsByModuleId({ moduleId } = {}) {
    if (!moduleId) return [];

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sgc_modules')
      .select('capabilities')
      .eq('id', moduleId)
      .single();

    if (error) return [];
    return data?.capabilities || [];
  }

  /**
   * Delete all capability assignments for a module.
   *
   * @param {object} params
   * @param {string} params.moduleId
   * @returns {Promise<void>}
   */
  async deleteAssignmentsForModule({ moduleId } = {}) {
    if (!moduleId) throw new Error('ModuleCapabilityPersistenceAdapter.deleteAssignmentsForModule: moduleId is required');

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('sgc_modules')
      .update({ capabilities: [] })
      .eq('id', moduleId);

    if (error) {
      throw new Error(`Failed to delete capabilities: ${error.message}`);
    }
  }
}
