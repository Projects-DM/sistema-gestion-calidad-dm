/**
 * CapabilityPublicSetAdapter
 *
 * Sprint 61 — Transitional Capability Persistence Provider.
 *
 * Implements the EXACT same public interface as CapabilityPersistenceProvider:
 *   - listAssignmentsByModuleId({ moduleId })  ← used by ModuleCapabilityResolver
 *   - getPackageById({ packageId })            ← used by ModuleCapabilityResolver
 *
 * Internally uses dynamicService and documentRepositoriesService as transitional
 * data sources to build Standard Capability assignments. This is a private
 * implementation detail — the interface is identical to the future real provider.
 *
 * Sprint 62 migration (zero changes to DynamicModule / useCapabilityPublicSet / ModuleCapabilityResolver):
 *
 *   // Sprint 61
 *   const provider = new CapabilityPublicSetAdapter({ moduleSlug });
 *
 *   // Sprint 62+
 *   const provider = new CapabilityPersistenceProvider({ repositories });
 *
 * Rules:
 * - No business logic
 * - No hardcodes by module (capabilities defined in Core, not per-module)
 * - No direct coupling between DynamicModule and services
 * - Adapter is the ONLY consumer of documentRepositoriesService / dynamicService
 *   for capability resolution purposes
 */

import { documentRepositoriesService } from '../../../services/documentRepositoriesService';

import { CapabilityPackageRegistry } from '../CapabilityPackageRegistry';


// ---------------------------------------------------------------------------
// Adapter-side Standard Package resolution
//
// IMPORTANT (SPRINT 62.5 rule):
// - CapabilityPackageRegistry is the authority for public descriptors.
// - This adapter still needs to produce the full internal package structure
//   expected by ModuleCapabilityResolver/CapabilityPublicSetAdapter interface.
// - Therefore, we *derive* the adapter's internal package definitions from
//   the public descriptors (no duplicate registry/catalog maintained here).
// ---------------------------------------------------------------------------

function toInternalPackage({ packageKey, displayName, icon, defaultOrder }) {
  // Map only stable identity from packageKey to adapter-internal identifiers.
  // These identifiers are internal to the adapter and not exposed as
  // "capability package authority".
  const packageId = `pkg:standard:${packageKey}`;
  const definitionId = `def:standard:${packageKey}`;
  const contractId = `contract:standard:${packageKey}`;
  const manifestId = `manifest:standard:${packageKey}`;

  return {
    packageId,
    definitionId,
    contractId,
    manifestId,
    capabilityKey: packageKey,
    label: displayName,
    icon,
    order: defaultOrder,
    uiRole: 'tab',
    version: 'v1',
    dependencies: [],
  };
}

const INTERNAL_PACKAGE_BY_KEY = new Map(
  CapabilityPackageRegistry.listPackages().map((d) => [d.packageKey, toInternalPackage(d)])
);


// ---------------------------------------------------------------------------

export class CapabilityPublicSetAdapter {
  /**
   * @param {object} params
   * @param {string} params.moduleSlug — used internally to determine repository capability availability
   */
  constructor({ moduleSlug } = {}) {
    if (!moduleSlug) {
      throw new Error('CapabilityPublicSetAdapter: moduleSlug is required');
    }
    this._moduleSlug = moduleSlug;
  }

  /**
   * Implements CapabilityPersistenceProvider interface.
   *
   * Returns the active Standard Capability assignments for a module.
   *
   * Standard assignments are always active:
   *   - forms   (Diligenciar Registros)
   *   - records (Historial y Consultas)
   *
   * Conditional assignment:
   *   - repository (Repositorio Documental) — only when the module has at
   *     least one active document repository (determined internally via
   *     documentRepositoriesService, invisible to the caller).
   *
   * @param {object} params
   * @param {string} params.moduleId
   * @returns {Promise<Array<object>>}
   */
  async listAssignmentsByModuleId({ moduleId } = {}) {
    if (!moduleId) return [];

    const assignments = [
      {
        assignmentId: `assign:${moduleId}:forms`,
        moduleId,
        packageId: 'pkg:standard:forms',
        state:       'active',
        version:     'v1',
      },
      {
        assignmentId: `assign:${moduleId}:records`,
        moduleId,
        packageId: 'pkg:standard:records',
        state:       'active',
        version:     'v1',
      },
    ];

    // Repository capability is conditionally assigned based on existing
    // document repositories for this module. This is an internal detail
    // of the adapter — the caller only sees the resulting assignments.
    try {
      const repos = await documentRepositoriesService.getRepositories({
        moduleSlug: this._moduleSlug,
      });
      const hasActiveRepository = (repos || []).some((r) => r.is_active !== false);

      if (hasActiveRepository) {
        assignments.push({
          assignmentId: `assign:${moduleId}:repository`,
          moduleId,
          packageId: 'pkg:standard:repository',
          state:       'active',
          version:     'v1',
        });
      }
    } catch {
      // Graceful degradation: if repository check fails, the capability
      // is simply not assigned. The module remains functional without it.
    }

    return assignments;
  }

  /**
   * Implements CapabilityPersistenceProvider interface.
   *
   * Returns the full package definition for a given packageId.
   * Returns null if the packageId is not a known Standard Capability package.
   *
   * @param {object} params
   * @param {string} params.packageId
   * @returns {Promise<object|null>}
   */
  async getPackageById({ packageId } = {}) {
    if (!packageId) return null;
    // packageId in resolver pipeline is adapter-internal identity: pkg:standard:<packageKey>
    const normalizedKey = String(packageId).replace('pkg:standard:', '');
    return INTERNAL_PACKAGE_BY_KEY.get(normalizedKey) ?? null;
  }

}

