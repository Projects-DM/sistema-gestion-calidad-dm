/**
 * CapabilityContract (Domain Model)
 */

export class CapabilityContract {
  /**
   * @param {object} params
   * @param {string} params.contractId Immutable identity
   * @param {string} params.definitionId Parent definition identity
   * @param {Array<object>} [params.commands]
   * @param {Array<object>} [params.queries]
   * @param {Array<object>} [params.events]
   * @param {object} [params.configuration]
   * @param {Array<object>} [params.inputs]
   * @param {Array<object>} [params.outputs]
   * @param {string} [params.version]
   */
  constructor({
    contractId,
    definitionId,
    commands,
    queries,
    events,
    configuration,
    inputs,
    outputs,
    version,
  } = {}) {
    if (!contractId) throw new Error('CapabilityContract: contractId is required');
    if (!definitionId) throw new Error('CapabilityContract: definitionId is required');
    this.contractId = contractId;
    this.definitionId = definitionId;
    this.commands = commands || [];
    this.queries = queries || [];
    this.events = events || [];
    this.configuration = configuration;
    this.inputs = inputs || [];
    this.outputs = outputs || [];
    this.version = version;
  }
}

