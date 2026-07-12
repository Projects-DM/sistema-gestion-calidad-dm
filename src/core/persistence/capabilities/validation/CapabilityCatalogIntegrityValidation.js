/**
 * CapabilityCatalogIntegrityValidation
 * Structural validation only.
 */

export function validateCapabilityCatalog(catalog) {
  if (!catalog) return { ok: false, error: 'CapabilityCatalog is required' };
  if (!catalog.catalogId) return { ok: false, error: 'catalogId is required' };
  if (!catalog.domain) return { ok: false, error: 'domain is required' };
  return { ok: true };
}

