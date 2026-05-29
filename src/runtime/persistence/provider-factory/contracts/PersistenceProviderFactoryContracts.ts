import type { PersistenceProvider, PersistenceProviderId } from "./PersistenceProvider";
import type { PersistenceProviderCapabilities } from "./PersistenceProviderCapabilities";

export type ProviderDiscoveryContext = {
  /** Runtime environment hint (e.g., browser/node, prod/dev). */
  environment?: string;

  /** Optional configuration identifiers used by future implementations. */
  configId?: string;

  /** Optional capability requirements decided by runtime orchestration. */
  requiredCapabilities?: PersistenceProviderCapabilities;
};

export type PersistenceProviderInstantiationParams = {
  /** Provider id (or reference) to instantiate/select. */
  providerId: PersistenceProviderId;

  /** Discovery/selection context (opaque for implementations). */
  context?: ProviderDiscoveryContext;
};

/**
 * PersistenceProviderFactoryContracts (contract-only)
 * Future implementations must not add coupling to Supabase or specific DBs.
 */
export interface IPersistenceProviderFactory {
  /** Resolve the default provider based on discovery context. */
  createProvider(context?: ProviderDiscoveryContext): Promise<PersistenceProvider>;

  /** Resolve a specific provider by explicit id. */
  createProviderById(params: PersistenceProviderInstantiationParams): Promise<PersistenceProvider>;
}


