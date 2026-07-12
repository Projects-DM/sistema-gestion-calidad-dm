/**
 * ModuleCapabilityAssignment (Domain Model)
 */

export class ModuleCapabilityAssignment {
  /**
   * @param {object} params
   * @param {string} params.assignmentId Immutable identity
   * @param {string} params.moduleId Module identity (slug or id)
   * @param {string} params.packageId Capability Package identity
   * @param {string} [params.state] Assignment state
   * @param {string} [params.owner]
   * @param {string} [params.version]
   */
  constructor({ assignmentId, moduleId, packageId, state, owner, version } = {}) {
    if (!assignmentId) throw new Error('ModuleCapabilityAssignment: assignmentId is required');
    if (!moduleId) throw new Error('ModuleCapabilityAssignment: moduleId is required');
    if (!packageId) throw new Error('ModuleCapabilityAssignment: packageId is required');

    this.assignmentId = assignmentId;
    this.moduleId = moduleId;
    this.packageId = packageId;
    this.state = state;
    this.owner = owner;
    this.version = version;
  }
}

