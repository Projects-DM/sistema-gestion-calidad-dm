/**
 * ModuleCapabilityAssignmentMapper
 */

import { ModuleCapabilityAssignment } from '../domainModels/ModuleCapabilityAssignment';

export function mapModuleCapabilityAssignment(raw) {
  if (!raw) return null;
  return new ModuleCapabilityAssignment({
    assignmentId: raw.assignmentId ?? raw.id,
    moduleId: raw.moduleId,
    packageId: raw.packageId,
    state: raw.state,
    owner: raw.owner,
    version: raw.version,
  });
}

