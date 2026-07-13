/**
 * CapabilityPersistenceProvider (Persistence Provider)
 *
 * First operational version (Sprint 59):
 * - Orchestrates access to repositories
 * - Centralizes persistence for capability entities
 * - NO resolution logic
 * - NO business logic
 * - No direct Supabase/Runtime/React coupling
 */

import { validateCapabilityCatalog } from './validation/CapabilityCatalogIntegrityValidation';
import { validateCapabilityContract } from './validation/CapabilityContractIntegrityValidation';
import { validateCapabilityPackage } from './validation/CapabilityPackageIntegrityValidation';
import { validateModuleCapabilityAssignment } from './validation/ModuleCapabilityAssignmentIntegrityValidation';

import { mapCapabilityCatalog } from './mappers/CapabilityCatalogMapper';
import { mapCapabilityDefinition } from './mappers/CapabilityDefinitionMapper';
import { mapCapabilityContract } from './mappers/CapabilityContractMapper';
import { mapCapabilityManifest } from './mappers/CapabilityManifestMapper';
import { mapCapabilityPackage } from './mappers/CapabilityPackageMapper';
import { mapModuleCapabilityAssignment } from './mappers/ModuleCapabilityAssignmentMapper';

export class CapabilityPersistenceProvider {
  /**
   * @param {object} deps
   * @param {object} deps.repositories injected repository contracts
   */
  constructor({ repositories } = {}) {
    if (!repositories) throw new Error('CapabilityPersistenceProvider: repositories are required');

    this.repositories = {
      capabilityCatalogRepository: repositories.capabilityCatalogRepository,
      capabilityDefinitionRepository: repositories.capabilityDefinitionRepository,
      capabilityContractRepository: repositories.capabilityContractRepository,
      capabilityManifestRepository: repositories.capabilityManifestRepository,
      capabilityPackageRepository: repositories.capabilityPackageRepository,
      moduleCapabilityAssignmentRepository: repositories.moduleCapabilityAssignmentRepository,
    };
  }

  /**
   * Catalog persistence
   */
  async getCatalogById({ catalogId } = {}) {
    const raw = await this.repositories.capabilityCatalogRepository.getById({ catalogId });
    const catalog = mapCapabilityCatalog(raw);

    const validation = validateCapabilityCatalog(catalog);
    if (!validation.ok) throw new Error(validation.error);

    return catalog;
  }

  /**
   * Contract persistence (structural)
   */
  async getContractById({ contractId } = {}) {
    const raw = await this.repositories.capabilityContractRepository.getById({ contractId });
    const contract = mapCapabilityContract(raw);

    const validation = validateCapabilityContract(contract);
    if (!validation.ok) throw new Error(validation.error);

    return contract;
  }

  /**
   * Package persistence (structural)
   */
  async getPackageById({ packageId } = {}) {
    const raw = await this.repositories.capabilityPackageRepository.getById({ packageId });
    const pkg = mapCapabilityPackage(raw);

    const validation = validateCapabilityPackage(pkg);
    if (!validation.ok) throw new Error(validation.error);

    return pkg;
  }

  /**
   * Assignment persistence (structural)
   */
  async listAssignmentsByModuleId({ moduleId } = {}) {
    const raws = await this.repositories.moduleCapabilityAssignmentRepository.listByModuleId({ moduleId });
    const assignments = (raws || []).map(mapModuleCapabilityAssignment).filter(Boolean);

    for (const a of assignments) {
      const v = validateModuleCapabilityAssignment(a);
      if (!v.ok) throw new Error(v.error);
    }

    return assignments;
  }

  /**
   * Operational write: replace assignments for a module.
   *
   * Core does not contain business rules.
   * The repository contract and adapters decide atomicity and persistence.
   */
  async replaceAssignmentsForModule({ moduleId, assignments } = {}) {
    if (!moduleId) throw new Error('CapabilityPersistenceProvider.replaceAssignmentsForModule: moduleId is required');
    if (!Array.isArray(assignments)) throw new Error('CapabilityPersistenceProvider.replaceAssignmentsForModule: assignments must be an array');

    // Structural validation (pure, deterministic)
    const validated = assignments.map((a) => {
      const v = validateModuleCapabilityAssignment(a);
      if (!v.ok) throw new Error(v.error);
      return a;
    });

    // Persistence layer contract (no business logic)
    const raws = validated.map((a) => ({
      assignmentId: a.assignmentId,
      moduleId: a.moduleId,
      packageId: a.packageId,
      state: a.state,
      owner: a.owner,
      version: a.version,
    }));

    const result = await this.repositories.moduleCapabilityAssignmentRepository.replaceManyForModule({
      moduleId,
      assignments: raws,
    });

    // Normalize: return domain models when adapter returns raws
    const out = Array.isArray(result)
      ? result.map(mapModuleCapabilityAssignment).filter(Boolean)
      : validated;

    return out;
  }

  /**
   * Operational write: delete all assignments for a module.
   */
  async deleteAssignmentsForModule({ moduleId } = {}) {
    if (!moduleId) throw new Error('CapabilityPersistenceProvider.deleteAssignmentsForModule: moduleId is required');
    const result = await this.repositories.moduleCapabilityAssignmentRepository.deleteManyByModuleId({ moduleId });
    return result;
  }

  /**
   * NOTE: No resolution logic here.
   */
}

