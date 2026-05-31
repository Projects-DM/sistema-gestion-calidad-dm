import type { ProviderSelectionSnapshot } from "./ProviderSelectionSnapshot";
import type { RuntimeProviderDecisionRegistry } from "../decision/RuntimeProviderDecisionRegistry";

/**
 * RuntimeProviderSelectionEngine
 * Uses ONLY RuntimeProviderDecisionRegistry.
 * Initial policy implemented: highest_score
 */
export class RuntimeProviderSelectionEngine {
  constructor(
    private readonly decisionRegistry: RuntimeProviderDecisionRegistry
  ) {}

  public selectHighestScore(): ProviderSelectionSnapshot | null {
    const decisions = this.decisionRegistry.list();
    if (!decisions.length) return null;

    let best = decisions[0];
    for (const d of decisions.slice(1)) {
      // decisions are expected to be sorted/track scores by registry; pick max confidence/score.
      if (typeof d.score === "number" && d.score > (best.score ?? -Infinity)) {
        best = d;
      }
    }

    const timestamp = new Date().toISOString();

    return {
      providerId: best.providerId,
      policy: "highest_score",
      confidence: best.score,
      timestamp,
      score: best.score,
      reason: best.reason,
      metadata: best.metadata,
    };
  }
}

