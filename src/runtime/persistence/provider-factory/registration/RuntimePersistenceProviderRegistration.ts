import type {
  IPersistenceProviderRegistry,
} from "../contracts/PersistenceProviderRegistryContracts";
import type { PersistenceProvider, PersistenceProviderId } from "../contracts/PersistenceProvider";

/**
 * RuntimePersistenceProviderRegistration
 * - Registration orchestration only (no provider implementations)
 * - Deterministic registration order: preserves input array order
 * - Duplicate prevention: skips providers with already-registered ids
 */
export class RuntimePersistenceProviderRegistration {
  constructor(private readonly registry: IPersistenceProviderRegistry) {}

  async registerProvider(provider: PersistenceProvider): Promise<{ registered: boolean; providerId: PersistenceProviderId }> {
    const existing = await this.registry.getProvider({ providerId: provider.id });
    if (existing) {
      return { registered: false, providerId: provider.id };
    }

    return this.registry.registerProvider({ provider });
  }

  async registerProviders(providers: PersistenceProvider[]): Promise<Array<{ registered: boolean; providerId: PersistenceProviderId }>> {
    const results: Array<{ registered: boolean; providerId: PersistenceProviderId }> = [];

    // Deterministic: iterate in the exact array order.
    for (const p of providers) {
      results.push(await this.registerProvider(p));
    }

    return results;
  }

  async unregisterProvider(providerId: PersistenceProviderId): Promise<{ removed: boolean; providerId: PersistenceProviderId }> {
    return this.registry.unregisterProvider({ providerId });
  }
}

