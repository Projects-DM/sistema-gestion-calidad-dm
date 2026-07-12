/**
 * CapabilityManifestMapper
 */

import { CapabilityManifest } from '../domainModels/CapabilityManifest';

export function mapCapabilityManifest(raw) {
  if (!raw) return null;
  return new CapabilityManifest({
    manifestId: raw.manifestId ?? raw.id,
    contractId: raw.contractId,
    metadata: raw.metadata,
    runtimeHooks: raw.runtimeHooks,
    permissions: raw.permissions,
    configuration: raw.configuration,
    events: raw.events,
    compatibility: raw.compatibility,
    version: raw.version,
  });
}

