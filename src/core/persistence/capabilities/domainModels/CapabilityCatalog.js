/**
 * CapabilityCatalog (Domain Model)
 *
 * Pure domain semantics for Capability Catalog.
 * - No persistence logic
 * - No Supabase/Runtime/React dependencies
 */

export class CapabilityCatalog {
  /**
   * @param {object} params
   * @param {string} params.catalogId Immutable identity
   * @param {string} params.domain Domain name/namespace
   * @param {string} params.owner Owner identity (governance)
   * @param {string} params.state Catalog state (Draft/Certified/Published/Operational/Deprecated/Removed)
   * @param {string} [params.lifecycle] Lifecycle reference
   * @param {number|string} [params.version]
   */
  constructor({ catalogId, domain, owner, state, lifecycle, version } = {}) {
    if (!catalogId) throw new Error('CapabilityCatalog: catalogId is required');
    this.catalogId = catalogId;
    this.domain = domain;
    this.owner = owner;
    this.state = state;
    this.lifecycle = lifecycle;
    this.version = version;
  }
}

