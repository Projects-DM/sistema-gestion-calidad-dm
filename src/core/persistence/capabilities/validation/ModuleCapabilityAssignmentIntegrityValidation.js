/**
 * ModuleCapabilityAssignmentIntegrityValidation
 */

export function validateModuleCapabilityAssignment(assignment) {
  if (!assignment) return { ok: false, error: 'ModuleCapabilityAssignment is required' };
  if (!assignment.assignmentId) return { ok: false, error: 'assignmentId is required' };
  if (!assignment.moduleId) return { ok: false, error: 'moduleId is required' };
  if (!assignment.packageId) return { ok: false, error: 'packageId is required' };
  return { ok: true };
}

