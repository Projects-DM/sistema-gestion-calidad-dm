/**
 * CapabilityPackageIntegrityValidation
 */

export function validateCapabilityPackage(pkg) {
  if (!pkg) return { ok: false, error: 'CapabilityPackage is required' };
  if (!pkg.packageId) return { ok: false, error: 'packageId is required' };
  if (!pkg.definitionId) return { ok: false, error: 'definitionId is required' };
  if (!pkg.contractId) return { ok: false, error: 'contractId is required' };
  if (!pkg.manifestId) return { ok: false, error: 'manifestId is required' };
  return { ok: true };
}

