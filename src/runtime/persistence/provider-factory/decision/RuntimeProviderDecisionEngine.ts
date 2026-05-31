import type { ProviderDecisionSnapshot } from "./contracts";
import type { ProviderDecisionReason } from "./contracts/ProviderDecisionReason";
import { RuntimeProviderScoreRegistry } from "../scoring/RuntimeProviderScoreRegistry";


/**
 * RuntimeProviderDecisionEngine
 * Decision rule:
 * - select provider with highest score
 * - reason = highest_score
 */
export class RuntimeProviderDecisionEngine {
  constructor(
    private readonly scoreRegistry: RuntimeProviderScoreRegistry
  ) {}

  computeSnapshot(): ProviderDecisionSnapshot | null {
    const snapshots = this.scoreRegistry.getAllProviderScores();
    if (!snapshots.length) return null;

    let best = snapshots[0];
    for (const s of snapshots.slice(1)) {
      if (s.score > best.score) best = s;
    }

    const decisionTimestamp = new Date().toISOString();

    const reason: ProviderDecisionReason = "highest_score";

    const out: ProviderDecisionSnapshot = {
      providerId: best.providerId,
      reason,
      confidence: best.score,
      decisionTimestamp,
      score: best.score,
      metadata: {
        // future extension point
      },
    };

    return out;
  }
}

