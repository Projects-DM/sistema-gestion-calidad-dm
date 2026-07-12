/**
 * CapabilitySetStructuralValidation
 *
 * Structural validation only.
 */

export function validateCapabilitySetStructurally({ capabilitySet } = {}) {
  if (!capabilitySet) return { ok: false, error: 'capabilitySet is required' };
  if (!Array.isArray(capabilitySet.packages)) return { ok: false, error: 'capabilitySet.packages must be an array' };
  if (!capabilitySet.capabilitySetId) return { ok: false, error: 'capabilitySetId is required' };

  for (const p of capabilitySet.packages) {
    if (!p.packageId) return { ok: false, error: 'packageId is required for every package' };
    if (!p.contractId) {
      // contractId is required to preserve contract-first capability usage later.
      return { ok: false, error: 'contractId is required for every package' };
    }
  }

  return { ok: true };
}

