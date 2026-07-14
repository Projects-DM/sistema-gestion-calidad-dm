/**
 * ApplicationContext (Common Contract)
 *
 * Generic transport context for all Application Layer operations.
 * Carries operational metadata through the entire pipeline:
 * Application → Operational Layer → Persistence → Repository.
 *
 * Designed to evolve without breaking changes:
 * new context fields can be added as optional properties.
 *
 * Constraints:
 * - Zero external dependencies
 * - No React, Runtime, Supabase, or persistence coupling
 * - Immutable after creation (frozen)
 * - Backward compatible (all fields optional except contractVersion)
 */

/**
 * @typedef {object} ApplicationContext
 * @property {string} contractName - Contract identifier
 * @property {string} contractVersion - Contract version
 * @property {string|null} [actorId] - Identity of the actor (UUID from auth, service-account-id, or null). Never a label or origin string.
 * @property {string} [source] - Origin of the operation (e.g., 'ui-create-wizard', 'api', 'ai-agent', 'scheduler', 'offline-sync')
 * @property {string} [actorRole] - Role of the actor
 * @property {string} [actorEmail] - Email of the actor
 * @property {string} [tenantId] - Tenant identifier (multi-tenant)
 * @property {string} [organizationId] - Organization identifier
 * @property {string} [locale] - Preferred locale (e.g., 'es-CO')
 * @property {string} [correlationId] - Distributed trace identifier
 * @property {string} [timestamp] - When the operation was initiated
 * @property {object} [permissions] - Resolved permissions for the actor
 * @property {object} [metadata] - Extensible context metadata
 */

/**
 * Creates a validated ApplicationContext.
 *
 * @param {object} params
 * @param {string|null} [params.actorId] - Identity of the actor (UUID or null). Never a label.
 * @param {string} [params.source] - Origin of the operation (e.g., 'ui-create-wizard', 'api')
 * @param {string} [params.actorRole]
 * @param {string} [params.actorEmail]
 * @param {string} [params.tenantId]
 * @param {string} [params.organizationId]
 * @param {string} [params.locale]
 * @param {string} [params.correlationId]
 * @param {string} [params.timestamp]
 * @param {object} [params.permissions]
 * @param {object} [params.metadata]
 * @returns {ApplicationContext} Frozen context object
 */
export function createApplicationContext({
  actorId,
  source,
  actorRole,
  actorEmail,
  tenantId,
  organizationId,
  locale,
  correlationId,
  timestamp,
  permissions,
  metadata,
} = {}) {
  return Object.freeze({
    contractName: 'ApplicationContext',
    contractVersion: '1.0.0',
    actorId: actorId ?? undefined,
    source: source || undefined,
    actorRole: actorRole || undefined,
    actorEmail: actorEmail || undefined,
    tenantId: tenantId || undefined,
    organizationId: organizationId || undefined,
    locale: locale || undefined,
    correlationId: correlationId || undefined,
    timestamp: timestamp || new Date().toISOString(),
    permissions: permissions ? Object.freeze({ ...permissions }) : undefined,
    metadata: metadata ? Object.freeze({ ...metadata }) : undefined,
  });
}
