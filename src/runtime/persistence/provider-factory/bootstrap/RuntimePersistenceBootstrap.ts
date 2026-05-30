import { RuntimePersistenceProviderCompositionRoot } from "../composition/RuntimePersistenceProviderCompositionRoot";
import { SupabasePersistenceProvider } from "../providers/SupabasePersistenceProvider";
import { MemoryPersistenceProvider } from "../providers/MemoryPersistenceProvider";
import type { PersistenceProvider } from "../contracts/PersistenceProvider";

/**
 * RuntimePersistenceBootstrap
 * Provider-factory bootstrap that registers persistence providers.
 *
 * Deterministic order is preserved: providers are registered in the explicit sequence below.
 */
export class RuntimePersistenceBootstrap {
  private readonly root: RuntimePersistenceProviderCompositionRoot;

  constructor() {
    this.root = new RuntimePersistenceProviderCompositionRoot();
  }

  public async initialize(): Promise<RuntimePersistenceProviderCompositionRoot> {
    // NOTE: deterministic registration order (do not change without governance).
    // 1) Memory provider first (for sprint bootstrap validation)
    const memoryProvider: PersistenceProvider = new MemoryPersistenceProvider();
    await this.root.registration.registerProvider(memoryProvider);

    // 2) Supabase provider next (keeps the previous ability to select Supabase as default/active if already wired).
    const supabaseProvider: PersistenceProvider = new SupabasePersistenceProvider();
    await this.root.registration.registerProvider(supabaseProvider);

    // Active provider bootstrap binding:
    // Establish an initial deterministic active provider during bootstrap.
    // Important: no fallback/AI routing is introduced here.
    // Use the first registered provider (memory) as the active provider.
    await this.root.activeProviderManager.setActiveProvider({
      providerId: memoryProvider.id,
      meta: { mode: "manual" },
    });

    return this.root;
  }

  public get compositionRoot(): RuntimePersistenceProviderCompositionRoot {
    return this.root;
  }
}


