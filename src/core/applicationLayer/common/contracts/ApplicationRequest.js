/**
 * ApplicationRequest (Common Contract)
 *
 * Generic request contract for all Application Layer services.
 * Domain-specific requests (e.g., ModuleAdministrationRequest)
 * are built on top of this base contract.
 *
 * Constraints:
 * - Zero external dependencies
 * - No React, Runtime, Supabase, or persistence coupling
 * - Immutable after creation (frozen)
 * - Compatible with multi-tenant, offline, AI, microservices
 */

/**
 * @typedef {object} ApplicationRequest
 * @property {string} contractName - Contract identifier (e.g., 'ApplicationRequest')
 * @property {string} contractVersion - Contract version (e.g., '1.0.0')
 * @property {string} operation - The operation to execute
 * @property {object} [actor] - Who is requesting the operation
 * @property {string} [actor.id] - Actor identifier
 * @property {string} [actor.role] - Actor role
 * @property {string} [actor.email] - Actor email
 * @property {string} [target] - Target entity identity
 * @property {object} [payload] - Operation-specific data
 * @property {string} [correlationId] - Traceability identifier
 * @property {object} [metadata] - Extensible metadata
 */

/**
 * Creates a validated ApplicationRequest.
 *
 * @param {object} params
 * @param {string} params.operation - Required. The operation to execute.
 * @param {object} [params.actor] - Who is requesting
 * @param {string} [params.target] - Target entity identity
 * @param {object} [params.payload] - Operation-specific data
 * @param {string} [params.correlationId] - Traceability ID
 * @param {object} [params.metadata] - Extensible metadata
 * @returns {ApplicationRequest} Frozen request object
 * @throws {Error} If operation is missing
 */
export function createApplicationRequest({
  operation,
  actor,
  target,
  payload,
  correlationId,
  metadata,
} = {}) {
  if (!operation) {
    throw new Error('ApplicationRequest: operation is required');
  }

  return Object.freeze({
    contractName: 'ApplicationRequest',
    contractVersion: '1.0.0',
    operation,
    actor: actor ? Object.freeze({ ...actor }) : undefined,
    target: target || undefined,
    payload: payload ? Object.freeze({ ...payload }) : undefined,
    correlationId: correlationId || undefined,
    metadata: buildMetadata(metadata),
    _createdAt: new Date().toISOString(),
  });
}

/**
 * Builds normalized metadata with extensible structure.
 * @param {object} [metadata] - Raw metadata from caller
 * @returns {object} Normalized frozen metadata
 */
function buildMetadata(metadata) {
  return Object.freeze({
    source: metadata?.source || 'UI',
    featureFlags: metadata?.featureFlags || undefined,
    telemetry: metadata?.telemetry || undefined,
    tracing: metadata?.tracing || undefined,
    audit: metadata?.audit || undefined,
    custom: metadata?.custom || undefined,
  });
}
