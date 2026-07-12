/**
 * CapabilityContractMapper
 */

import { CapabilityContract } from '../domainModels/CapabilityContract';

export function mapCapabilityContract(raw) {
  if (!raw) return null;
  return new CapabilityContract({
    contractId: raw.contractId ?? raw.id,
    definitionId: raw.definitionId,
    commands: raw.commands,
    queries: raw.queries,
    events: raw.events,
    configuration: raw.configuration,
    inputs: raw.inputs,
    outputs: raw.outputs,
    version: raw.version,
  });
}

