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

import { ActivePersistenceProviderManager } from "../runtime/ActivePersistenceProviderManager";

import {
  RuntimeProviderAnalyticsRegistry,
  RuntimeProviderAnalyticsEngine,
} from "../analytics";

import { RuntimeProviderDecisionRegistry } from "../decision";

import { PersistenceExecutionRouter } from "../runtime/PersistenceExecutionRouter";

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
    this.activeProviderManager = new ActivePersistenceProviderManager(this.registry);

    // Analytics runtime wiring (Sprint 22.3A)
    const analyticsRegistry = new RuntimeProviderAnalyticsRegistry();
    const analyticsEngine = new RuntimeProviderAnalyticsEngine(this.auditRegistry, analyticsRegistry);

    // IMPORTANT: keep single router instance; inject only analyticsEngine for this sprint.
    const decisionRegistry = new RuntimeProviderDecisionRegistry();

    this.executionRouter = new PersistenceExecutionRouter(
      this.activeProviderManager,
      this.auditRecorder,
      analyticsEngine,
      undefined,
      undefined,
      decisionRegistry,
      undefined,
      undefined
    );



    this.initResult = {
      providersRegistered: 0,
    };
  }

}



