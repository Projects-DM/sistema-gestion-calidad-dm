/**
 * AssignmentTransactionManager
 *
 * Transaction manager coordinates Validate -> Execute -> Commit -> Rollback.
 *
 * IMPORTANT: No persistence simulation and no in-memory DB.
 *
 * It is responsible for orchestration only.
 */

import { OperationalLayerErrors } from '../OperationalLayerFoundation';

export class AssignmentTransactionManager {
  /**
   * @param {object} deps
   * @param {object} deps.persistenceProvider
   * @param {(args:{moduleId:string, assignments:Array<object>})=>Promise<any>} deps.persistenceProvider.replaceAssignmentsForModule
   */
  constructor({ persistenceProvider } = {}) {
    if (!persistenceProvider) {
      throw new Error('AssignmentTransactionManager: persistenceProvider is required');
    }
    this.persistenceProvider = persistenceProvider;
  }

  async execute({ input, applicationContext, validation } = {}) {
    const { moduleId, assignments } = (validation && validation.data) || input;

    try {
      // Execute step delegated to persistence provider (adapter-defined atomicity).
      // This transaction manager enforces orchestration semantics and error normalization.
      return await this.persistenceProvider.replaceAssignmentsForModule({
        moduleId,
        assignments,
      });
    } catch (cause) {
      const error = new Error('Assignment transaction failed');
      error.code = OperationalLayerErrors.TRANSACTION_FAILED;
      error.cause = cause;
      throw error;
    }
  }
}

