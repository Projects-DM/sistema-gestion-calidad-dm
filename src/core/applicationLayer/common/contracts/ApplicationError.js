/**
 * ApplicationError (Common Contract)
 *
 * Generic error contract for all Application Layer services.
 * Represents unexpected errors (infrastructure, system failures).
 *
 * SSOT Rule:
 *   Validations         → ApplicationResult(success=false)
 *   Unexpected errors   → throw ApplicationError
 *
 * Both mechanisms NEVER coexist for the same error.
 *
 * Note: VALIDATION_FAILED exists in ApplicationErrorCode for use with
 * createApplicationFailure() only. It must NEVER be used with
 * throw new ApplicationError() — that would violate the SSOT rule.
 *
 * Constraints:
 * - Zero external dependencies
 * - No React, Runtime, Supabase, or persistence coupling
 * - Extends native Error for proper stack trace capture
 * - Always contains a machine-readable code
 */

/**
 * Standard error codes shared across all Application Layer services.
 * Domain-specific codes are defined in domain-specific contracts.
 */
export const ApplicationErrorCode = Object.freeze({
  /** Request is missing required fields */
  INVALID_REQUEST: 'INVALID_REQUEST',

  /** Operation is not recognized */
  UNKNOWN_OPERATION: 'UNKNOWN_OPERATION',

  /** Entity not found */
  ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',

  /** Entity already exists (duplicate) */
  ENTITY_ALREADY_EXISTS: 'ENTITY_ALREADY_EXISTS',

  /** Actor lacks required permissions */
  UNAUTHORIZED: 'UNAUTHORIZED',

  /** Operation failed due to validation rules */
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  /** Infrastructure or persistence error */
  INFRASTRUCTURE_ERROR: 'INFRASTRUCTURE_ERROR',

  /** Unknown internal error */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

/**
 * Creates an ApplicationError.
 *
 * @param {object} params
 * @param {string} params.code - Error code (from ApplicationErrorCode or domain-specific)
 * @param {string} params.message - Human-readable error message
 * @param {*} [params.details] - Structured error details
 * @param {Error} [params.cause] - Original error (for error chain preservation)
 * @returns {ApplicationError} The error instance
 */
export function createApplicationError({
  code,
  message,
  details,
  cause,
} = {}) {
  if (!code) {
    throw new Error('createApplicationError: code is required');
  }
  if (!message) {
    throw new Error('createApplicationError: message is required');
  }

  return new ApplicationError(code, message, details, cause);
}

/**
 * ApplicationError class.
 * Extends native Error for proper error handling in try/catch blocks.
 */
export class ApplicationError extends Error {
  /**
   * @param {string} code - Machine-readable error code
   * @param {string} message - Human-readable message
   * @param {*} [details] - Structured error details
   * @param {Error} [cause] - Original error for chain preservation
   */
  constructor(code, message, details, cause) {
    super(message);
    this.name = 'ApplicationError';
    this.contractName = 'ApplicationError';
    this.contractVersion = '1.0.0';
    this.code = code;
    this.details = details || undefined;
    this.cause = cause || undefined;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Convert to a plain object for serialization/logging.
   * @returns {object}
   */
  toJSON() {
    return Object.freeze({
      contractName: 'ApplicationError',
      contractVersion: '1.0.0',
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    });
  }
}
