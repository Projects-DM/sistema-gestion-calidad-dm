import type { ProviderDecisionReason } from "./ProviderDecisionReason";
import type { ProviderDecisionSnapshot } from "./ProviderDecisionSnapshot";


export type ProviderDecision = {
  providerId: string;
  reason: ProviderDecisionReason;
  confidence: number;
  decisionTimestamp: string; // ISO 8601
  decisionSnapshot: ProviderDecisionSnapshot;
};

