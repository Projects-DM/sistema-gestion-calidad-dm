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
import { RuntimeProviderRoutingDecisionEngine, RuntimeProviderRoutingEngine, RuntimeProviderRoutingHistory } from "../routing";

import type { RuntimeProviderOrchestrationEngine } from "../orchestration/RuntimeProviderOrchestrationEngine";
import type { RuntimeProviderOrchestrationRegistry } from "../orchestration/RuntimeProviderOrchestrationRegistry";
import type { RuntimeProviderExecutionCoordinator } from "../orchestration/RuntimeProviderExecutionCoordinator";

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
    const { ActivePersistenceProviderManager } = require("../runtime/ActivePersistenceProviderManager");
    this.activeProviderManager = new ActivePersistenceProviderManager(this.registry);

    // Analytics foundations wiring (runtime-first, provider-agnostic).
    // Uses the existing in-memory audit registry (no DB access).
    const { RuntimeProviderAnalyticsRegistry, RuntimeProviderAnalyticsEngine } = require("../analytics");
    const analyticsRegistry = new RuntimeProviderAnalyticsRegistry();
    const analyticsEngine = new RuntimeProviderAnalyticsEngine(this.auditRegistry, analyticsRegistry);

    // Scoring subsystem (runtime-first, deterministic; consumes analytics registry)
    const { RuntimeProviderScoreRegistry, RuntimeProviderScoringEngine } = require("../scoring");
    const scoreRegistry = new RuntimeProviderScoreRegistry();
    const scoringEngine = new RuntimeProviderScoringEngine(analyticsRegistry, scoreRegistry);


    // IMPORTANT: keep single router instance; inject analytics at construction time.
    const { RuntimeProviderSelectionRegistry, RuntimeProviderSelectionEngine } = require("../selection");
    const selectionRegistry = new RuntimeProviderSelectionRegistry();
    // select engine deterministically from decisions (decision registry is created inside router today)
    const { RuntimeProviderDecisionRegistry } = require("../decision");
    const decisionRegistry = new RuntimeProviderDecisionRegistry();
    const selectionEngine = new RuntimeProviderSelectionEngine(decisionRegistry);

    const { PersistenceExecutionRouter } = require("../runtime/PersistenceExecutionRouter");
    this.executionRouter = new PersistenceExecutionRouter(
      this.activeProviderManager,
      this.auditRecorder,
      analyticsEngine,
      scoringEngine,
      undefined,
      decisionRegistry,
      selectionEngine,
      selectionRegistry
    );

    this.initResult = {
      providersRegistered: 0,
    };
  }

}



