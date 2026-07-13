/**
 * ApplicationResult (Common Contract)
 *
 * Generic result contract for all Application Layer services.
 * Every operation returns a Result. Results represent functional outcomes:
 * - success: operation completed as expected
 * - failure: operation failed due to expected reasons (validation, business rules)
 *
 * SSOT Rule:
 *   Validations         → ApplicationResult(success=false)
 *   Unexpected errors   → throw ApplicationError
 *
 * Both mechanisms NEVER coexist for the same error.
 *
 * Constraints:
 * - Zero external dependencies
 * - No React, Runtime, Supabase, or persistence coupling
 * - Immutable after creation (frozen)
 * - Never contains exceptions or stack traces
 */

/**
 * Creates a successful ApplicationResult.
 *
 * @param {object} params
 * @param {*} [params.data] - Operation-specific result data
 * @param {Array<{code: string, message: string}>} [params.warnings] - Non-blocking warnings
 * @param {object} [params.metadata] - Extensible metadata
 * @param {string} [params.correlationId] - Traceability ID
 * @returns {ApplicationResult} Frozen success result
 */
export function createApplicationResult({
  data,
  warnings,
  metadata,
  correlationId,
} = {}) {
  return Object.freeze({
    contractName: 'ApplicationResult',
    contractVersion: '1.0.0',
    success: true,
    data: data !== undefined ? data : null,
    warnings: freezeWarnings(warnings),
    metadata: metadata ? Object.freeze({ ...metadata }) : undefined,
    correlationId: correlationId || undefined,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Creates a failed ApplicationResult.
 *
 * Use this for expected failures (validation errors, business rule violations).
 * For unexpected failures (infrastructure, system), throw ApplicationError instead.
 *
 * @param {object} params
 * @param {string} params.code - Failure code
 * @param {string} params.message - Human-readable failure message
 * @param {*} [params.data] - Partial data if available
 * @param {Array<{code: string, message: string}>} [params.warnings]
 * @param {object} [params.metadata]
 * @param {string} [params.correlationId]
 * @returns {ApplicationResult} Frozen failure result
 */
export function createApplicationFailure({
  code,
  message,
  data,
  warnings,
  metadata,
  correlationId,
} = {}) {
  if (!code) {
    throw new Error('createApplicationFailure: code is required');
  }
  if (!message) {
    throw new Error('createApplicationFailure: message is required');
  }

  return Object.freeze({
    contractName: 'ApplicationResult',
    contractVersion: '1.0.0',
    success: false,
    error: Object.freeze({ code, message }),
    data: data !== undefined ? data : null,
    warnings: freezeWarnings(warnings),
    metadata: metadata ? Object.freeze({ ...metadata }) : undefined,
    correlationId: correlationId || undefined,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Freezes warnings array.
 * @param {Array} [warnings]
 * @returns {Array|undefined}
 */
function freezeWarnings(warnings) {
  if (!warnings || warnings.length === 0) return undefined;
  return Object.freeze(warnings.map((w) => Object.freeze({ ...w })));
}
