/**
 * CapabilityCatalogMapper
 * Maps raw persisted records -> domain model.
 */

import { CapabilityCatalog } from '../domainModels/CapabilityCatalog';

export function mapCapabilityCatalog(raw) {
  if (!raw) return null;
  return new CapabilityCatalog({
    catalogId: raw.catalogId ?? raw.id,
    domain: raw.domain,
    owner: raw.owner,
    state: raw.state,
    lifecycle: raw.lifecycle,
    version: raw.version,
  });
}

