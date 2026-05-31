import type { ProviderSelectionDecision } from "./ProviderSelectionDecision";
import type { ProviderSelectionPolicy } from "./ProviderSelectionPolicy";

export type ProviderSelectionSnapshot = ProviderSelectionDecision & {
  policy: ProviderSelectionPolicy;
  score: number;
  reason: string;
  metadata?: Record<string, unknown>;
};

