/**
 * CapabilityManifest (Domain Model)
 */

export class CapabilityManifest {
  /**
   * @param {object} params
   * @param {string} params.manifestId Immutable identity
   * @param {string} params.contractId Parent contract identity
   * @param {object} [params.metadata]
   * @param {object} [params.runtimeHooks] Conceptual hooks (no implementation)
   * @param {object} [params.permissions] Conceptual permissions
   * @param {object} [params.configuration] Default configuration semantics
   * @param {Array<object>} [params.events]
   * @param {object} [params.compatibility] Compatibility section
   * @param {string} [params.version]
   */
  constructor({
    manifestId,
    contractId,
    metadata,
    runtimeHooks,
    permissions,
    configuration,
    events,
    compatibility,
    version,
  } = {}) {
    if (!manifestId) throw new Error('CapabilityManifest: manifestId is required');
    if (!contractId) throw new Error('CapabilityManifest: contractId is required');
    this.manifestId = manifestId;
    this.contractId = contractId;
    this.metadata = metadata;
    this.runtimeHooks = runtimeHooks;
    this.permissions = permissions;
    this.configuration = configuration;
    this.events = events || [];
    this.compatibility = compatibility;
    this.version = version;
  }
}

