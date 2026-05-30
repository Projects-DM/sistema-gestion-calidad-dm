import { RuntimePersistenceProviderCompositionRoot } from "../composition/RuntimePersistenceProviderCompositionRoot";
import { SupabasePersistenceProvider } from "../providers/SupabasePersistenceProvider";
import type { PersistenceProvider } from "../contracts/PersistenceProvider";

/**
 * RuntimePersistenceBootstrap
 * Provider-factory bootstrap that registers the Supabase provider.
 */
export class RuntimePersistenceBootstrap {
  private readonly root: RuntimePersistenceProviderCompositionRoot;

  constructor() {
    this.root = new RuntimePersistenceProviderCompositionRoot();
  }

  public async initialize(): Promise<RuntimePersistenceProviderCompositionRoot> {
    const supabaseProvider: PersistenceProvider = new SupabasePersistenceProvider();

    // register in deterministic order
    await this.root.registration.registerProvider(supabaseProvider);

    return this.root;
  }

  public get compositionRoot(): RuntimePersistenceProviderCompositionRoot {
    return this.root;
  }
}

