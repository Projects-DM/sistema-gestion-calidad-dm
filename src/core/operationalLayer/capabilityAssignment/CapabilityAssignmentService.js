/**
 * CapabilityAssignmentService
 *
 * First operational service implementation (SSOT pattern).
 *
 * Responsibilities:
 * - Coordinate operational flow
 * - Invoke Validation Engine
 * - Invoke Transaction Manager
 * - Use ONLY CapabilityPersistenceProvider for persistence
 * - Never access repository contracts directly
 */

import { runOperationalPipeline } from '../OperationPipeline';
import { AssignmentValidationEngine } from './AssignmentValidationEngine';
import { AssignmentTransactionManager } from './AssignmentTransactionManager';

export class CapabilityAssignmentService {
  /**
   * @param {object} deps
   * @param {object} deps.persistenceProvider
   */
  constructor({ persistenceProvider } = {}) {
    if (!persistenceProvider) {
      throw new Error('CapabilityAssignmentService: persistenceProvider is required');
    }

    this.persistenceProvider = persistenceProvider;
    this.validationEngine = new AssignmentValidationEngine();
    this.transactionManager = new AssignmentTransactionManager({
      persistenceProvider,
    });
  }

  /**
   * Replace assignments for a module as a single atomic logical operation.
   *
   * @param {object} params
   * @param {string} params.moduleId
   * @param {Array<object>} params.assignments
   */
  async replaceModuleCapabilityAssignments({ moduleId, assignments } = {}) {
    const applicationContext = {};

    return runOperationalPipeline({
      applicationContext,
      input: {
        moduleId,
        assignments: (assignments || []).map((a) => ({ ...a, moduleId })),
      },
      validationEngine: this.validationEngine,
      transactionManager: this.transactionManager,
    });
  }
}

