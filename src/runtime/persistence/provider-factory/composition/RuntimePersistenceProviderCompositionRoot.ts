import { RuntimePersistenceProviderRegistry } from "../registry/RuntimePersistenceProviderRegistry";
import { RuntimePersistenceProviderRegistration } from "../registration/RuntimePersistenceProviderRegistration";
import { RuntimePersistenceProviderResolver } from "../resolver/RuntimePersistenceProviderResolver";
import { RuntimePersistenceProviderFactory } from "../factory/RuntimePersistenceProviderFactory";

/**
 * RuntimePersistenceProviderCompositionRoot
 * Provider-factory composition wiring only.
 *
 * - Creates deterministic in-memory contracts infrastructure (registry/registration/resolver/factory)
 * - Composition scaffolding only; provider bootstrap occurs in RuntimePersistenceBootstrap.
 * - Does NOT register any real providers by default.
 */
export class RuntimePersistenceProviderCompositionRoot {
  public readonly registry: RuntimePersistenceProviderRegistry;
  public readonly registration: RuntimePersistenceProviderRegistration;
  public readonly resolver: RuntimePersistenceProviderResolver;
  public readonly factory: RuntimePersistenceProviderFactory;

  public readonly activeProviderManager;
  public readonly executionRouter;




  /**
   * Initialization result to support future bootstrapping flows.
   */
  public readonly initResult: {
    providersRegistered: number;
  };

  constructor() {
    this.registry = new RuntimePersistenceProviderRegistry();
    this.registration = new RuntimePersistenceProviderRegistration(this.registry);
    this.resolver = new RuntimePersistenceProviderResolver(this.registry);
    this.factory = new RuntimePersistenceProviderFactory(this.registry, this.resolver);

    // Runtime control bindings (future-proof, no orchestration lifecycle)
    const { ActivePersistenceProviderManager } = require("../runtime/ActivePersistenceProviderManager");
    const { PersistenceExecutionRouter } = require("../runtime/PersistenceExecutionRouter");
    this.activeProviderManager = new ActivePersistenceProviderManager(this.registry);
    this.executionRouter = new PersistenceExecutionRouter(this.activeProviderManager);

    this.initResult = {
      providersRegistered: 0,
    };
  }

}


