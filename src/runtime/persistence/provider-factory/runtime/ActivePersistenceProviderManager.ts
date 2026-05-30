import type { IPersistenceProviderRegistry } from "../contracts/PersistenceProviderRegistryContracts";
import type { PersistenceProviderId, PersistenceProvider } from "../contracts/PersistenceProvider";


export type ActiveProviderMode = "manual" | "ai-decided" | "fallback-ready";

export type ActiveProviderMeta = {
  mode: ActiveProviderMode;
};

export type ActiveProviderState = {
  providerId: PersistenceProviderId;
  meta: ActiveProviderMeta;
};

/**
 * ActivePersistenceProviderManager
 * - Runtime control: keeps track of the active provider id
 * - Validates existence through registry contracts
 * - Stores meta for future AI routing/fallback semantics
 *
 * NO provider orchestration, no adapters, no persistence logic.
 */
export class ActivePersistenceProviderManager {
  private active: ActiveProviderState | null = null;

  constructor(private readonly registry: IPersistenceProviderRegistry) {}

  async setActiveProvider(params: {
    providerId: PersistenceProviderId;
    meta?: Partial<ActiveProviderMeta>;
  }): Promise<void> {
    const provider = await this.registry.getProvider({ providerId: params.providerId });
    if (!provider) {
      throw new Error(`ActivePersistenceProviderManager: provider not registered: ${params.providerId}`);
    }

    this.active = {
      providerId: params.providerId,
      meta: {
        mode: params.meta?.mode ?? "manual",
      },
    };
  }

  getActiveProvider(): ActiveProviderState {
    if (!this.active) {
      throw new Error("ActivePersistenceProviderManager: no active provider set");
    }
    return this.active;
  }

  async getActiveProviderContract(): Promise<PersistenceProvider> {
    const state = this.getActiveProvider();
    const provider = await this.registry.getProvider({ providerId: state.providerId });
    if (!provider) {
      // registry became inconsistent after set
      throw new Error(
        `ActivePersistenceProviderManager: active provider no longer registered: ${state.providerId}`
      );
    }
    return provider;
  }
}

