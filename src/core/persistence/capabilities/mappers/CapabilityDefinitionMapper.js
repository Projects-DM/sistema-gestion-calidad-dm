/**
 * CapabilityDefinitionMapper
 */

import { CapabilityDefinition } from '../domainModels/CapabilityDefinition';

export function mapCapabilityDefinition(raw) {
  if (!raw) return null;
  return new CapabilityDefinition({
    definitionId: raw.definitionId ?? raw.id,
    catalogId: raw.catalogId,
    owner: raw.owner,
    purpose: raw.purpose,
    scope: raw.scope,
    responsibilities: raw.responsibilities,
    invariants: raw.invariants,
    restrictions: raw.restrictions,
    dependencies: raw.dependencies,
    version: raw.version,
  });
}

