import { RuntimePersistenceProviderRegistry } from "../registry/RuntimePersistenceProviderRegistry";
import { RuntimePersistenceProviderRegistration } from "../registration/RuntimePersistenceProviderRegistration";
import { RuntimePersistenceProviderResolver } from "../resolver/RuntimePersistenceProviderResolver";
import { RuntimePersistenceProviderFactory } from "../factory/RuntimePersistenceProviderFactory";

/**
 * RuntimePersistenceProviderCompositionRoot
 * Provider-factory composition wiring only.
 *
 * - Creates deterministic in-memory contracts infrastructure (registry/registration/resolver/factory)
 * - Does NOT register any real providers
 * - Does NOT instantiate DB-specific adapters
 */
export class RuntimePersistenceProviderCompositionRoot {
  public readonly registry: RuntimePersistenceProviderRegistry;
  public readonly registration: RuntimePersistenceProviderRegistration;
  public readonly resolver: RuntimePersistenceProviderResolver;
  public readonly factory: RuntimePersistenceProviderFactory;

  /**
   * Initialization result to support future bootstrapping flows.
   * Currently: no providers registered.
   */
  public readonly initResult: {
    providersRegistered: number;
  };

  constructor() {
    this.registry = new RuntimePersistenceProviderRegistry();
    this.registration = new RuntimePersistenceProviderRegistration(this.registry);
    this.resolver = new RuntimePersistenceProviderResolver(this.registry);
    this.factory = new RuntimePersistenceProviderFactory(this.registry, this.resolver);

    this.initResult = {
      providersRegistered: 0,
    };
  }
}

