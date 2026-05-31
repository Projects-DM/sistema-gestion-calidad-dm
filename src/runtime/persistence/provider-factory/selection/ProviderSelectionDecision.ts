import type { ProviderSelectionPolicy } from "./ProviderSelectionPolicy";

export type ProviderSelectionDecision = {
  providerId: string;
  policy: ProviderSelectionPolicy;
  confidence: number;
  timestamp: string; // ISO 8601
};

