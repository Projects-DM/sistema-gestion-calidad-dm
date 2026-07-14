/**
 * ModuleAdministrationOperation (Contract)
 *
 * Official catalog of administrative operations for modules.
 *
 * This contract defines the exhaustive set of operations that
 * the Module Administration Application Layer supports.
 *
 * Constraints:
 * - Zero external dependencies
 * - No React, Runtime, Supabase, or persistence coupling
 * - Immutable after definition
 * - Extensible only via new enum values (never remove existing ones)
 */

/**
 * Contract version for the operation catalog.
 * Increment when operations are added or modified.
 */
export const MODULE_ADMINISTRATION_OPERATION_VERSION = '1.0.0';

/**
 * @readonly
 * @enum {string}
 */
export const ModuleAdministrationOperation = Object.freeze({
  /** Create a new module in Draft state */
  CREATE_MODULE: 'CREATE_MODULE',

  /** Update module metadata (name, slug, description) */
  UPDATE_MODULE_METADATA: 'UPDATE_MODULE_METADATA',

  /** Update module visual configuration (icon, order, visibility) */
  UPDATE_MODULE_VISUAL_CONFIG: 'UPDATE_MODULE_VISUAL_CONFIG',

  /** Replace all capability assignments for a module */
  ASSIGN_CAPABILITIES: 'ASSIGN_CAPABILITIES',

  /** Remove all capability assignments from a module */
  REMOVE_CAPABILITIES: 'REMOVE_CAPABILITIES',

  /** Change module lifecycle state */
  CHANGE_MODULE_STATE: 'CHANGE_MODULE_STATE',

  /** Permanently delete a module */
  DELETE_MODULE: 'DELETE_MODULE',
});

/**
 * Operations that read module data (no side effects).
 * These are included for completeness but are typically handled
 * by direct service calls, not through the operational pipeline.
 */
export const ModuleAdministrationQuery = Object.freeze({
  /** Get a list of all modules */
  GET_MODULES: 'GET_MODULES',

  /** Get modules published to the runtime (is_active + visible + state=operational) */
  GET_RUNTIME_MODULES: 'GET_RUNTIME_MODULES',

  /** Get detailed information for a single module */
  GET_MODULE: 'GET_MODULE',

  /** Get the configuration (forms, fields) of a module */
  GET_MODULE_CONFIGURATION: 'GET_MODULE_CONFIGURATION',
});

/**
 * Check if an operation is a write operation (has side effects).
 * @param {string} operation
 * @returns {boolean}
 */
export function isWriteOperation(operation) {
  return Object.values(ModuleAdministrationOperation).includes(operation);
}

/**
 * Check if an operation is a read operation (no side effects).
 * @param {string} operation
 * @returns {boolean}
 */
export function isReadOperation(operation) {
  return Object.values(ModuleAdministrationQuery).includes(operation);
}

/**
 * Check if a string is a valid operation (write or read).
 * @param {string} operation
 * @returns {boolean}
 */
export function isValidOperation(operation) {
  return isWriteOperation(operation) || isReadOperation(operation);
}
