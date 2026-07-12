/**
 * CapabilityContractIntegrityValidation
 */

export function validateCapabilityContract(contract) {
  if (!contract) return { ok: false, error: 'CapabilityContract is required' };
  if (!contract.contractId) return { ok: false, error: 'contractId is required' };
  if (!contract.definitionId) return { ok: false, error: 'definitionId is required' };
  return { ok: true };
}

