import type { IPersistenceProviderRegistry } from "../contracts/PersistenceProviderRegistryContracts";
import type { IPersistenceProviderResolver, ProviderResolutionInput, ProviderResolutionResult } from "../contracts/PersistenceProviderResolverContracts";
import type { PersistenceProvider } from "../contracts/PersistenceProvider";
import type { PersistenceProviderCapabilities } from "../contracts/PersistenceProviderCapabilities";


function isCapabilitySatisfied(providerCapabilities: PersistenceProviderCapabilities, required?: PersistenceProviderCapabilities): boolean {
  if (!required) return true;

  // Provider must satisfy every explicitly required true capability.
  for (const [key, requiredValue] of Object.entries(required)) {
    if (requiredValue !== true) continue;

    if (providerCapabilities[key] !== true) {
      return false;
    }
  }

  return true;
}

export class RuntimePersistenceProviderResolver implements IPersistenceProviderResolver {
  constructor(private readonly registry: IPersistenceProviderRegistry) {}

  async resolveProvider(input?: ProviderResolutionInput): Promise<ProviderResolutionResult> {
    // Provider selection strategy: capabilities first, then default.
    const environment = input?.environment;
    const requiredCapabilities = input?.requirements?.requiredCapabilities;

    if (requiredCapabilities) {
      return this.resolveByCapabilities({ requiredCapabilities, environment });
    }

    return this.resolveDefaultProvider({ environment });
  }

  async resolveByCapabilities(params: {
    requiredCapabilities?: PersistenceProviderCapabilities;
    environment?: string;
  }): Promise<ProviderResolutionResult> {
    const snapshot = await this.registry.listProviders();

    // Deterministic selection: try providers in registration order.
    // Since registry contract does not specify ordering, we use listProviders() order.
    let best: { provider: PersistenceProvider; reason?: string } | null = null;

    for (const { id } of snapshot.providers) {
      const provider = await this.registry.getProvider({ providerId: id });
      if (!provider) continue;

      const ok = isCapabilitySatisfied(provider.capabilities, params.requiredCapabilities);
      if (!ok) continue;

      // If multiple match, choose the first deterministically.
      best = { provider, reason: "capabilities_match" };
      break;
    }

    if (!best) {
      throw new Error("RuntimePersistenceProviderResolver: no provider satisfies required capabilities");
    }

    return best;
  }

  async resolveDefaultProvider(params?: { environment?: string }): Promise<ProviderResolutionResult> {
    const snapshot = await this.registry.listProviders();

    // Deterministic fallback: first registered provider.
    if (!snapshot.providers.length) {
      throw new Error("RuntimePersistenceProviderResolver: no providers registered");
    }

    const first = snapshot.providers[0];
    const provider = await this.registry.getProvider({ providerId: first.id });

    if (!provider) {
      throw new Error("RuntimePersistenceProviderResolver: default provider not found after listing");
    }

    return { provider, reason: "default_first_registered" };
  }
}

