/**
 * ModuleCapabilityResolver
 *
 * Primary Core authority to build a Capability Set from persisted capability assignments.
 *
 * Rules:
 * - Depends ONLY on CapabilityPersistenceProvider (injected).
 * - No Supabase, no React, no Runtime, no UI, no modules-specific logic.
 * - Consumes only data returned by the Provider.
 * - Applies dependency resolution, normalization, and structural validation.
 */

import { buildCapabilitySet } from './moduleCapabilityResolution/CapabilitySetBuilder';

export class ModuleCapabilityResolver {
  /**
   * @param {object} deps
   * @param {import('./persistence/capabilities/CapabilityPersistenceProvider').CapabilityPersistenceProvider} deps.persistenceProvider
   */
  constructor({ persistenceProvider } = {}) {
    if (!persistenceProvider) throw new Error('ModuleCapabilityResolver: persistenceProvider is required');
    this.persistenceProvider = persistenceProvider;
  }

  /**
   * Resolves a normalized Capability Set for a module.
   *
   * @param {object} params
   * @param {string} params.moduleId
   */
  async resolveCapabilitySet({ moduleId } = {}) {
    if (!moduleId) throw new Error('ModuleCapabilityResolver.resolveCapabilitySet: moduleId is required');

    // 1) Assignment retrieval (conceptual pipeline step)
    const assignments = await this.persistenceProvider.listAssignmentsByModuleId({ moduleId });

    // 2) Package retrieval by assignment packageId
    const packages = [];
    for (const a of assignments || []) {
      // Provider will decide implementation: in-memory now, real persistence later.
      const pkg = await this.persistenceProvider.getPackageById({ packageId: a.packageId });
      if (pkg) packages.push(pkg);
    }

    // 3) Build Capability Set with dependency resolution + normalization + structural validation
    return buildCapabilitySet({
      packages,
      assignments,
      options: { moduleId },
    });
  }
}

