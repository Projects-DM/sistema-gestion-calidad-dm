export type ProviderScore = {
  providerId: string;
  score: number;

  successRateScore: number;
  reliabilityScore: number;
  latencyScore: number;
  executionVolumeScore: number;

  lastCalculatedAt: string; // ISO 8601
};

