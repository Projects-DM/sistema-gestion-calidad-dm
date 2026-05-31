import type { ProviderExecutionFailure } from "./ProviderExecutionFailure";
import type { ProviderFallbackDecision } from "./ProviderFallbackDecision";

import type { RuntimeProviderSelectionEngine } from "../selection/RuntimeProviderSelectionEngine";

import type { RuntimeProviderSelectionRegistry } from "../selection/RuntimeProviderSelectionRegistry";

export class RuntimeProviderFallbackEngine {
  constructor(
    private readonly selectionEngine: RuntimeProviderSelectionEngine,
    private readonly registry: RuntimeProviderSelectionRegistry
  ) {}

  public evaluateFailure(
    failure: ProviderExecutionFailure,
    context: unknown
  ): ProviderFallbackDecision {
    // Sprint 18: deterministic minimal behavior.
    // If selection registry has no snapshots/decisions, stop.
    const latest = this.registry.getLatest?.();
    const nextProviderId = latest?.providerId;

    // If the latest selection is same provider as failed, stop (no deterministic next).
    if (!nextProviderId || nextProviderId === failure.providerId) {
      return { shouldFallback: false, reason: "stop" };
    }

    return {
      shouldFallback: true,
      nextProviderId,
      reason: "failover",
    };
  }
}

