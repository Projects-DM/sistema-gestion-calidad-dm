import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { setTenantIdProvider, lazyHydrate } from '../core/capabilities/alert/occurrence/persistence/OccurrenceLedgerDurableBoot.js';

/**
 * Sprint 346 — TENANT ID PROVIDER REGISTRATION
 * Registers the tenantId provider with the durable boot module once AuthContext is ready.
 * Sprint 348 — triggers lazy hydration when tenantId becomes available.
 * This ensures the hybrid persistence adapter can access the current tenantId.
 */
export function TenantIdProviderRegistrar() {
  const { tenantId } = useAuth();

  useEffect(() => {
    if (tenantId) {
      setTenantIdProvider(() => tenantId);
      lazyHydrate();
    }
  }, [tenantId]);

  return null;
}

export default TenantIdProviderRegistrar;