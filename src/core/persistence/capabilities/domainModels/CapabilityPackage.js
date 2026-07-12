/**
 * CapabilityPackage (Domain Model)
 *
 * In the certified SSOT, a Capability always represents a composed Package.
 */

export class CapabilityPackage {
  /**
   * @param {object} params
   * @param {string} params.packageId Immutable identity
   * @param {string} params.definitionId
   * @param {string} params.contractId
   * @param {string} params.manifestId
   * @param {object} [params.metadata]
   * @param {object} [params.configuration]
   * @param {object} [params.compatibility]
   * @param {string} [params.documentation]
   * @param {string} [params.lifecycle]
   * @param {string} [params.owner]
   * @param {string} [params.version]
   * @param {string} [params.certification] Certification identifier/state
   * @param {Array<string>} [params.dependencies] Optional conceptual dependency keys
   */
  constructor({
    packageId,
    definitionId,
    contractId,
    manifestId,
    metadata,
    configuration,
    compatibility,
    documentation,
    lifecycle,
    owner,
    version,
    certification,
    dependencies,
  } = {}) {
    if (!packageId) throw new Error('CapabilityPackage: packageId is required');
    if (!definitionId) throw new Error('CapabilityPackage: definitionId is required');
    if (!contractId) throw new Error('CapabilityPackage: contractId is required');
    if (!manifestId) throw new Error('CapabilityPackage: manifestId is required');

    this.packageId = packageId;
    this.definitionId = definitionId;
    this.contractId = contractId;
    this.manifestId = manifestId;
    this.metadata = metadata;
    this.configuration = configuration;
    this.compatibility = compatibility;
    this.documentation = documentation;
    this.lifecycle = lifecycle;
    this.owner = owner;
    this.version = version;
    this.certification = certification;
    this.dependencies = dependencies || [];
  }
}

