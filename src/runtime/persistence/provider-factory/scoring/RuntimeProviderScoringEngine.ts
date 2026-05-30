import type { ProviderAnalyticsSnapshot } from "../analytics/contracts";
import type { ProviderScoreSnapshot } from "./ProviderScoreSnapshot";
import { RuntimeProviderScoreRegistry } from "./RuntimeProviderScoreRegistry";
import type { RuntimeProviderAnalyticsRegistry } from "../analytics/RuntimeProviderAnalyticsRegistry";

export class RuntimeProviderScoringEngine {
  constructor(
    private readonly analyticsRegistry: RuntimeProviderAnalyticsRegistry,
    private readonly scoreRegistry: RuntimeProviderScoreRegistry
  ) {}


  public refreshScores(): void {
    // Deterministic: compute scores for providers present in analytics registry.
    // Analytics registry may contain empty set until analytics are computed.
    const all = this.analyticsRegistry.getAllProviderAnalytics();
    for (const a of all) {
      this.scoreRegistry.setProviderScore(this.computeScore(a));
    }
  }

  public getProviderScore(providerId: string): ProviderScoreSnapshot | null {
    return this.scoreRegistry.getProviderScore(providerId);
  }

  private computeScore(a: ProviderAnalyticsSnapshot): ProviderScoreSnapshot {
    // successRateScore: based on successRate directly
    const successRateScore = clamp01(a.successRate);

    // latencyScore: lower duration -> higher score
    // normalize with a deterministic curve: best at 0ms, worst at 50000ms+.
    const latencyScore = clamp01(1 - a.averageDurationMs / 50000);

    // reliabilityScore: mirror success rate for now (contract includes separate field for future expansion)
    const reliabilityScore = successRateScore;

    // volumeScore: based on totalExecutions, normalize with log-like cap (deterministic)
    // volumeScore in [0..1], at 0 executions => 0, at >=100 => 1.
    const executionVolumeScore = clamp01(Math.log10((a.totalExecutions ?? 0) + 1) / 2);

    // final formula
    const score =
      successRateScore * 0.70 +
      latencyScore * 0.20 +
      executionVolumeScore * 0.10;

    const breakdown = {
      successRate: a.successRate,
      averageDurationMs: a.averageDurationMs,
      totalExecutions: a.totalExecutions,
      successRateScore,
      reliabilityScore,
      latencyScore,
      executionVolumeScore,
    };

    const snapshot: ProviderScoreSnapshot = {
      providerId: a.providerId,
      score,
      successRateScore,
      reliabilityScore,
      latencyScore,
      executionVolumeScore,
      lastCalculatedAt: new Date().toISOString(),
      breakdown,
    };

    return snapshot;
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

