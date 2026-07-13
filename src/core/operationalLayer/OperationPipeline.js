/**
 * Operational Write Pipeline (SSOT)
 *
 * This is the generic orchestration contract for all write operations
 * governed by SSOT.
 *
 * It intentionally does NOT depend on Runtime/React/DB.
 */

/**
 * @template TInput
 * @template TResult
 *
 * @param {object} params
 * @param {object} params.applicationContext
 * @param {TInput} params.input
 * @param {object} params.validationEngine
 * @param {(args:{input:TInput, applicationContext:object})=>Promise<{ok:boolean, error?:string, data?:any}>} params.validationEngine.validate
 * @param {object} params.transactionManager
 * @param {(args:{input:TInput, applicationContext:object})=>Promise<TResult>} params.transactionManager.execute
 */
export async function runOperationalPipeline({
  applicationContext,
  input,
  validationEngine,
  transactionManager,
}) {
  const validation = await validationEngine.validate({ input, applicationContext });

  if (!validation.ok) {
    // Standardized pipeline error shape
    const error = new Error(validation.error || 'Operational validation failed');
    error.code = 'OPERATION_VALIDATION_FAILED';
    error.details = validation;
    throw error;
  }

  // Transaction manager encapsulates Validate->Execute->Commit->Rollback semantics.
  // In the current SSOT foundation, validation is already completed.
  // Transaction manager may still re-check invariants if needed.
  return transactionManager.execute({ input, applicationContext, validation });
}

