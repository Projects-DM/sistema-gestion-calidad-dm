import type {
  IPersistenceProviderFactory,
  ProviderDiscoveryContext,
  PersistenceProviderInstantiationParams,
} from "../contracts/PersistenceProviderFactoryContracts";
import type { IPersistenceProviderRegistry } from "../contracts/PersistenceProviderRegistryContracts";
import type { IPersistenceProviderResolver } from "../contracts/PersistenceProviderResolverContracts";

/**
 * RuntimePersistenceProviderFactory
 * - Implementation orchestrator for provider selection
 * - Delegates selection logic to resolver
 * - Never instantiates provider implementations
 */
export class RuntimePersistenceProviderFactory implements IPersistenceProviderFactory {
  constructor(
    private readonly registry: IPersistenceProviderRegistry,
    private readonly resolver: IPersistenceProviderResolver
  ) {}

  async createProvider(context?: ProviderDiscoveryContext) {
    const resolved = await this.resolver.resolveProvider({
      environment: context?.environment,
      requirements: context?.requiredCapabilities
        ? {
            requiredCapabilities: context.requiredCapabilities,
          }
        : undefined,
    });

    return resolved.provider;
  }

  async createProviderById(params: PersistenceProviderInstantiationParams) {
    const provider = await this.registry.getProvider({ providerId: params.providerId });
    if (!provider) {
      throw new Error(`RuntimePersistenceProviderFactory: provider not found: ${params.providerId}`);
    }
    return provider;
  }
}


