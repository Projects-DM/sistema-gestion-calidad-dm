/**
 * CapabilityPackageMapper
 */

import { CapabilityPackage } from '../domainModels/CapabilityPackage';

export function mapCapabilityPackage(raw) {
  if (!raw) return null;
  return new CapabilityPackage({
    packageId: raw.packageId ?? raw.id,
    definitionId: raw.definitionId,
    contractId: raw.contractId,
    manifestId: raw.manifestId,
    metadata: raw.metadata,
    configuration: raw.configuration,
    compatibility: raw.compatibility,
    documentation: raw.documentation,
    lifecycle: raw.lifecycle,
    owner: raw.owner,
    version: raw.version,
    certification: raw.certification,
    dependencies: raw.dependencies,
  });
}

