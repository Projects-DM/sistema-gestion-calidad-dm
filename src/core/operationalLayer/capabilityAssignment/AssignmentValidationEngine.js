/**
 * AssignmentValidationEngine
 *
 * Deterministic pure validation engine for Capability Assignments.
 *
 * NOTE: No Runtime/React/DB coupling.
 */

import { validateModuleCapabilityAssignment } from '../../persistence/capabilities/validation/ModuleCapabilityAssignmentIntegrityValidation';

function normalizeError(error) {
  if (!error) return 'Validation error';
  return String(error);
}

/**
 * @param {object} params
 * @param {object} params.input
 * @param {string} params.input.moduleId
 * @param {Array<object>} params.input.assignments
 */
export class AssignmentValidationEngine {
  async validate({ input } = {}) {
    const { moduleId, assignments } = input || {};

    if (!moduleId) {
      return { ok: false, error: 'moduleId is required' };
    }

    if (!Array.isArray(assignments)) {
      return { ok: false, error: 'assignments must be an array' };
    }

    // 1) Structural integrity
    const normalizedAssignments = [];
    for (const raw of assignments) {
      const v = validateModuleCapabilityAssignment(raw);
      if (!v.ok) return { ok: false, error: v.error };
      if (raw.moduleId !== moduleId) {
        return { ok: false, error: 'assignment.moduleId must match input.moduleId' };
      }

      normalizedAssignments.push(raw);
    }

    // 2) Duplicates
    const seen = new Set();
    for (const a of normalizedAssignments) {
      // Deterministic uniqueness rule:
      // assignmentId is immutable identity.
      const key = String(a.assignmentId);
      if (seen.has(key)) {
        return { ok: false, error: `Duplicate assignmentId: ${key}` };
      }
      seen.add(key);
    }


    // 3) Consistency: packageId presence already validated structurally.
    // 4) Dependencies / SSOT rules:
    // Foundation-level constraint: only validate deterministically what we can
    // from the input payload.

    return {
      ok: true,
      data: {
        moduleId,
        assignments: normalizedAssignments,
      },
    };
  }
}

