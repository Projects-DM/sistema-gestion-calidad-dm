import type { ProviderOrchestrationContext } from "./ProviderOrchestrationContext";
import type { ProviderOrchestrationResult } from "./ProviderOrchestrationResult";

import type { RuntimeProviderOrchestrationRegistry } from "./RuntimeProviderOrchestrationRegistry";

/**
 * RuntimeProviderOrchestrationEngine
 * Coordination ONLY: builds an orchestration result plan.
 * No provider execution.
 */
export class RuntimeProviderOrchestrationEngine {
  constructor(
    private readonly registry: RuntimeProviderOrchestrationRegistry,
    private readonly routing: unknown,
    private readonly decision: unknown,
    private readonly selection: unknown,
    private readonly resilience: unknown
  ) {}

  public orchestrate(context: ProviderOrchestrationContext): ProviderOrchestrationResult {
    // Sprint 20: minimal deterministic integration scaffold.
    // Real routing/decision/selection/resilience outputs are intentionally not invoked here
    // to avoid orchestration logic changes.

    const result: ProviderOrchestrationResult = {
      providerId: "unknown",
      routingDecision: undefined,
      selectionDecision: null,
      executionAllowed: true,
      fallbackAvailable: false,
      timestamp: Date.now(),
    };

    this.registry.store(result);
    return result;
  }
}

