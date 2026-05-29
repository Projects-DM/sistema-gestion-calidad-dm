import type { PersistenceProvider, PersistenceProviderId } from "./PersistenceProvider";

export type PersistenceProviderRegistrySnapshot = {
  providers: Array<{ id: PersistenceProviderId; displayName?: string }>;
};

export type PersistenceProviderRegistration = {
  provider: PersistenceProvider;
};

/**
 * PersistenceProviderRegistryContracts
 * Contract-only provider registry.
 */
export interface IPersistenceProviderRegistry {
  registerProvider(params: PersistenceProviderRegistration): Promise<{ registered: boolean; providerId: PersistenceProviderId }>;

  unregisterProvider(params: { providerId: PersistenceProviderId }): Promise<{ removed: boolean; providerId: PersistenceProviderId }>;

  getProvider(params: { providerId: PersistenceProviderId }): Promise<PersistenceProvider | null>;

  listProviders(): Promise<PersistenceProviderRegistrySnapshot>;
}

