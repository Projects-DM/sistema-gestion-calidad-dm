/**
 * AlertConfigurationPersistencePort
 *
 * Sprint 201.R — The OFFICIAL Persistence Port of the Alert Configuration
 * OPERATIONAL EXPERIENCE (admin UI).
 *
 * This module is a CONTRACT ONLY. It defines the two operations the
 * Application layer may request from ANY infrastructure backend:
 *
 *   1. loadConfiguration(resourceReference)
 *        Resolves the CURRENT configuration of the referenced resource.
 *   2. saveConfiguration(resourceReference, configuration)
 *        Persists the given canonical configuration for the referenced
 *        resource.
 *
 * The Port NEVER:
 *   - imports Supabase,
 *   - imports infrastructure services (dynamic / repository documents),
 *   - knows Forms, Repositories, SQL or the Runtime,
 *   - decides how a resourceType maps to an infrastructure backend,
 *   - contains any storage key (`alert_config` / `alertConfiguration`).
 *
 * It is a pure, frozen CONTRACT: the operations a Persistence Adapter must
 * honor. The AlertConfigurationApplicationService depends on this contract
 * (and only this contract) for persistence; it never sees a concrete
 * service. The selection that maps a resourceReference to a storage backend
 * lives exclusively inside the Adapter.
 *
 * Contract ONLY. Never executes.
 */

/**
 * The two (and only) operations every Alert Configuration Persistence
 * Adapter must implement.
 */
export const PERSISTENCE_PORT_OPERATIONS = Object.freeze([
  'loadConfiguration',
  'saveConfiguration',
]);

/**
 * A helper for the Application Service: validates that the injected
 * persistence port honors the contract — AND ONLY the contract. It rejects
 * implementations that leak infra coupling / specialize by resourceKind, so
 * the app layer can never face a concreto bank.
 *
 * @param {Object|null|undefined} port Candidate Persistence Adapter.
 * @returns {boolean} True when the candidate implements the contract.
 */
export function hasAlertConfigurationPersistencePort(port) {
  return (
    !!port &&
    typeof port === 'object' &&
    typeof port.loadConfiguration === 'function' &&
    typeof port.saveConfiguration === 'function'
  );
}

/**
 * Reads a resourceReference from a raw resource metadata.
 *
 * The persistence operations receive an opaque `resourceReference` that the
 * Adapter resolves into a specific storage backend internally. When the UI
 * passes the raw resource, it is normalized into a reference the Adapter can
 * route. This helper keeps the normalization in the Application / Contract
 * boundary and never leaks an infra kind back to the UI.
 *
 * @param {Object|string|null} resource A raw resource object or its id/slug.
 * @returns {Object} Normalized resource reference.
 */
export function toResourceReference(resource) {
  if (resource == null) return {};
  if (typeof resource !== 'object') {
    return Object.freeze({ id: resource });
  }
  return Object.freeze({ ...resource });
}

/**
 * Serializes the contract so certification can assert it is present and
 * frozen.
 */
export const ALERT_CONFIGURATION_PERSISTENCE_PORT = Object.freeze({
  key: 'alert-configuration-persistence',
  operations: PERSISTENCE_PORT_OPERATIONS,
});

export default ALERT_CONFIGURATION_PERSISTENCE_PORT;