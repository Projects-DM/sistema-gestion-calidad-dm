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
   * NOTE: No resolution logic here.
   * This provider only loads persisted capability entities.
   */
}

