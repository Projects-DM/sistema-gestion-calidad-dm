import type { ProviderSelectionSnapshot } from "../selection/ProviderSelectionSnapshot";

export type ProviderOrchestrationResult = {
  providerId: string;
  routingDecision?: unknown;
  selectionDecision?: ProviderSelectionSnapshot | null;

  executionAllowed: boolean;
  fallbackAvailable: boolean;

  timestamp: number;
};

