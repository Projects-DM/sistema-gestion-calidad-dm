export type ProviderScoreBreakdown = {
  successRate: number;
  averageDurationMs: number;
  totalExecutions: number;

  successRateScore: number;
  reliabilityScore: number;
  latencyScore: number;
  executionVolumeScore: number;
};

