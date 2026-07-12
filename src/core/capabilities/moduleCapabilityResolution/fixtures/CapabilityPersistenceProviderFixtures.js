/**
 * Temporary fixtures / doubles (NOT Core permanent architecture).
 *
 * Purpose: demonstrate ModuleCapabilityResolver operational flow.
 * - In-memory only.
 * - Not connected to Supabase/Runtime.
 */

export function createInMemoryCapabilityPersistenceProviderFixture({ moduleId, seedPackages } = {}) {
  const effectiveModuleId = moduleId ?? 'fixture:module:1';

  const packagesById = new Map((seedPackages || []).map((p) => [p.packageId, p]));

  // For the resolver, assignments are the source of package selection.
  // Each assignment points to a packageId.
  const assignments = [
    {
      assignmentId: 'fixture:assign:1',
      moduleId: effectiveModuleId,
      packageId: (seedPackages?.[0]?.packageId) ?? 'fixture:pkg:1',
      state: 'active',
      owner: 'fixture',
      version: 'v1',
    },
    ...(seedPackages?.[1]
      ? [
          {
            assignmentId: 'fixture:assign:2',
            moduleId: effectiveModuleId,
            packageId: seedPackages[1].packageId,
            state: 'active',
            owner: 'fixture',
            version: 'v1',
          },
        ]
      : []),
  ];

  return {
    // Mimic CapabilityPersistenceProvider interface (only the methods used by ModuleCapabilityResolver)
    async listAssignmentsByModuleId({ moduleId: mid } = {}) {
      if (mid !== effectiveModuleId) return [];
      return assignments;
    },

    async getPackageById({ packageId } = {}) {
      return packagesById.get(packageId) || null;
    },
  };
}

