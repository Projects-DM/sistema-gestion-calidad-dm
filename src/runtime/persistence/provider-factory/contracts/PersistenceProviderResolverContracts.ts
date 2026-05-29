import type { PersistenceProvider, PersistenceProviderCapabilities } from "./PersistenceProvider";

export type ProviderSelectionRequirements = {
  /** Capability requirements; provider must satisfy all required true flags. */
  requiredCapabilities?: PersistenceProviderCapabilities;

  /** Optional preferred capabilities weights (future extensibility). */
  capabilityPriority?: Partial<Record<string, number>>;

  /** Runtime environment hint for future selection strategies. */
  environment?: string;

  /** Capability-based selection should prefer these kinds when provided. */
  supportedKinds?: string[];
};

export type ProviderResolutionInput = {
  requirements?: ProviderSelectionRequirements;
  environment?: string;
};

export type ProviderResolutionResult = {
  provider: PersistenceProvider;
  reason?: string;
};

/**
 * PersistenceProviderResolverContracts
 * Contract-only resolver.
 */
export interface IPersistenceProviderResolver {
  resolveProvider(input?: ProviderResolutionInput): Promise<ProviderResolutionResult>;

  resolveByCapabilities(params: {
    requiredCapabilities?: PersistenceProviderCapabilities;
    environment?: string;
  }): Promise<ProviderResolutionResult>;

  resolveDefaultProvider(params?: { environment?: string }): Promise<ProviderResolutionResult>;
}

