/**
 * NormalizationEngine
 *
 * Normalizes the expanded set into a deterministic Capability Set structure.
 *
 * No business logic.
 */

function sortByStableKey(arr, keyFn) {
  return [...arr].sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    if (ka === kb) return 0;
    return ka < kb ? -1 : 1;
  });
}

function pkgKey(p) {
  return p?.packageId ?? p?.id ?? '';
}

export function normalizeCapabilitySet({ resolved, assignments, options } = {}) {
  const expandedPackages = resolved?.expandedPackages || [];
  const normalizedPackages = sortByStableKey(expandedPackages, pkgKey);

  // Capability Set shape is intentionally minimal and metadata-agnostic.
  return {
    capabilitySetId: `capset:${options?.moduleId ?? 'unknown'}`,
    moduleId: options?.moduleId ?? null,
    packages: normalizedPackages.map((p) => ({
      packageId: p.packageId ?? p.id,
      definitionId: p.definitionId,
      contractId: p.contractId,
      manifestId: p.manifestId,
      dependencies: p.dependencies || [],
      version: p.version,
    })),
    assignments: (assignments || []).map((a) => ({
      assignmentId: a.assignmentId ?? a.id,
      moduleId: a.moduleId,
      packageId: a.packageId,
      version: a.version,
      state: a.state,
    })),
  };
}

