import type { ProviderRoutingContext } from "./ProviderRoutingContext";
import type { RuntimeProviderRoutingHistory } from "./RuntimeProviderRoutingHistory";

/**
 * RuntimeProviderRoutingEngine
 * In-memory score computation for adaptive routing (Sprint 19).
 */
export class RuntimeProviderRoutingEngine {
  constructor(
    private readonly history: RuntimeProviderRoutingHistory
  ) {}

  public computeRoutingScore(providerId: string, context: ProviderRoutingContext): number {
    const h = this.history.getProviderHistory(providerId);

    // baseScore is neutral until analytics scoring is implemented.
    const baseScore = 0;

    // required formula:
    // finalScore = baseScore + successRate * 0.3 - failurePenalty
    const successRate = h.successRate;

    // failurePenalty increases with failureCount and previousFailures.
    const failurePenalty = (h.failureCount + (context.previousFailures ?? 0)) * 0.1;

    const finalScore = baseScore + successRate * 0.3 - failurePenalty;
    return finalScore;
  }
}

