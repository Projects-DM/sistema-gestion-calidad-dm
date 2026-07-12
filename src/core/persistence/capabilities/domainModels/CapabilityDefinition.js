/**
 * CapabilityDefinition (Domain Model)
 */

export class CapabilityDefinition {
  /**
   * @param {object} params
   * @param {string} params.definitionId Immutable identity
   * @param {string} params.catalogId Parent catalog identity
   * @param {string} params.owner Owner identity
   * @param {string} params.purpose Purpose of the capability
   * @param {string} [params.scope] Scope (conceptual)
   * @param {object} [params.responsibilities] Responsibilities
   * @param {object} [params.invariants] Invariants
   * @param {object} [params.restrictions] Restrictions
   * @param {Array<object>} [params.dependencies] Conceptual dependencies
   * @param {string} [params.version]
   */
  constructor({
    definitionId,
    catalogId,
    owner,
    purpose,
    scope,
    responsibilities,
    invariants,
    restrictions,
    dependencies,
    version,
  } = {}) {
    if (!definitionId) throw new Error('CapabilityDefinition: definitionId is required');
    if (!catalogId) throw new Error('CapabilityDefinition: catalogId is required');
    this.definitionId = definitionId;
    this.catalogId = catalogId;
    this.owner = owner;
    this.purpose = purpose;
    this.scope = scope;
    this.responsibilities = responsibilities;
    this.invariants = invariants;
    this.restrictions = restrictions;
    this.dependencies = dependencies || [];
    this.version = version;
  }
}

