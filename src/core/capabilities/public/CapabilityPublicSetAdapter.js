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

// ---------------------------------------------------------------------------
// Standard Capability Package Catalog
//
// Defines the Core Standard Shell capabilities for DynamicModule.
// These match the certified Standard Capabilities from MODULE_CONTRACT_v1.
//
// Fields:
//   packageId    — unique package identity
//   definitionId — links to the capability definition
//   contractId   — links to the capability contract
//   manifestId   — links to the capability manifest
//   capabilityKey— stable key used by Runtime for UI lookups
//   label        — display label for the UI tab
//   icon         — Lucide icon name for the UI tab
//   order        — display order (ascending)
//   uiRole       — 'tab' | future roles
//   version      — capability version
//   dependencies — declared capability dependencies (none for standard shell)
// ---------------------------------------------------------------------------

const STANDARD_PACKAGES = {
  'pkg:standard:forms': {
    packageId:     'pkg:standard:forms',
    definitionId:  'def:standard:forms',
    contractId:    'contract:standard:forms',
    manifestId:    'manifest:standard:forms',
    capabilityKey: 'forms',
    label:         'Diligenciar Registros',
    icon:          'ListChecks',
    order:         1,
    uiRole:        'tab',
    version:       'v1',
    dependencies:  [],
  },
  'pkg:standard:records': {
    packageId:     'pkg:standard:records',
    definitionId:  'def:standard:records',
    contractId:    'contract:standard:records',
    manifestId:    'manifest:standard:records',
    capabilityKey: 'records',
    label:         'Historial y Consultas',
    icon:          'History',
    order:         2,
    uiRole:        'tab',
    version:       'v1',
    dependencies:  [],
  },
  'pkg:standard:repository': {
    packageId:     'pkg:standard:repository',
    definitionId:  'def:standard:repository',
    contractId:    'contract:standard:repository',
    manifestId:    'manifest:standard:repository',
    capabilityKey: 'repository',
    label:         'Repositorio Documental',
    icon:          'FileText',
    order:         3,
    uiRole:        'tab',
    version:       'v1',
    dependencies:  [],
  },
};

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
    return STANDARD_PACKAGES[packageId] ?? null;
  }
}
