import type {
  IPersistenceProviderRegistry,
  PersistenceProviderRegistration,
  PersistenceProviderRegistrySnapshot,
} from "../contracts/PersistenceProviderRegistryContracts";
import type { PersistenceProvider, PersistenceProviderId } from "../contracts/PersistenceProvider";

/**
 * RuntimePersistenceProviderRegistry
 * - Contract-driven in-memory provider registry
 * - Deterministic: no side effects beyond in-memory storage
 * - Provider-agnostic: stores and returns PersistenceProvider contracts only
 */
export class RuntimePersistenceProviderRegistry implements IPersistenceProviderRegistry {
  private providersById = new Map<PersistenceProviderId, PersistenceProvider>();

  async registerProvider(params: PersistenceProviderRegistration): Promise<{
    registered: boolean;
    providerId: PersistenceProviderId;
  }> {
    const provider = params.provider;
    this.providersById.set(provider.id, provider);

    return { registered: true, providerId: provider.id };
  }

  async unregisterProvider(params: { providerId: PersistenceProviderId }): Promise<{
    removed: boolean;
    providerId: PersistenceProviderId;
  }> {
    const existed = this.providersById.delete(params.providerId);
    return { removed: existed, providerId: params.providerId };
  }

  async getProvider(params: { providerId: PersistenceProviderId }): Promise<PersistenceProvider | null> {
    return this.providersById.get(params.providerId) ?? null;
  }

  async listProviders(): Promise<PersistenceProviderRegistrySnapshot> {
    return {
      providers: Array.from(this.providersById.values()).map((p) => ({
        id: p.id,
        displayName: p.displayName,
      })),
    };
  }
}

