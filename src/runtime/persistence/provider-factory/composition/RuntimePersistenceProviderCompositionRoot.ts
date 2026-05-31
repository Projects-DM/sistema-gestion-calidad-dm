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
import { RuntimeExecutionAuditRecorder, RuntimeExecutionAuditRegistry } from "../audit";




export class RuntimePersistenceProviderCompositionRoot {
  public readonly registry: RuntimePersistenceProviderRegistry;
  public readonly registration: RuntimePersistenceProviderRegistration;
  public readonly resolver: RuntimePersistenceProviderResolver;
  public readonly factory: RuntimePersistenceProviderFactory;

  public readonly activeProviderManager;
  public readonly executionRouter;

  /**
   * Execution audit observability foundations (in-memory, deterministic, provider-agnostic).
   * Wiring-only; no changes to runtime behavior.
   */
  public readonly auditRegistry: RuntimeExecutionAuditRegistry;
  public readonly auditRecorder: RuntimeExecutionAuditRecorder;

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

    // Execution audit foundations (no DB, no provider coupling)
    this.auditRegistry = new RuntimeExecutionAuditRegistry();
    this.auditRecorder = new RuntimeExecutionAuditRecorder(this.auditRegistry);

    // Runtime control bindings (future-proof, no orchestration lifecycle)
    // IMPORTANT: keep original require-based wiring (existing codebase pattern).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ActivePersistenceProviderManager } = require("../runtime/ActivePersistenceProviderManager");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PersistenceExecutionRouter } = require("../runtime/PersistenceExecutionRouter");
    this.activeProviderManager = new ActivePersistenceProviderManager(this.registry);
    this.executionRouter = new PersistenceExecutionRouter(this.activeProviderManager);


    // Analytics foundations intentionally not wired in Sprint 13.0.
    // (keeping subsystem deterministic + provider-agnostic audit focus)


    this.initResult = {
      providersRegistered: 0,
    };
  }

}



