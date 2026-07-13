/**
 * ModuleCapabilityAssignmentRepository (Contract)
 */

export const ModuleCapabilityAssignmentRepository = {
  // Read operations (already part of Read Path)
  async listByModuleId(_params) {
    throw new Error('ModuleCapabilityAssignmentRepository.listByModuleId not implemented');
  },

  async getById(_params) {
    throw new Error('ModuleCapabilityAssignmentRepository.getById not implemented');
  },

  // Operational write operations (SSOT foundation contract)
  // The Core defines the contract; persistence adapters implement it.
  async replaceManyForModule(_params) {
    throw new Error('ModuleCapabilityAssignmentRepository.replaceManyForModule not implemented');
  },

  async deleteManyByModuleId(_params) {
    throw new Error('ModuleCapabilityAssignmentRepository.deleteManyByModuleId not implemented');
  },
};


