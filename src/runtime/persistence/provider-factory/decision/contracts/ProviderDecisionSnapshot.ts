import type { ProviderDecisionReason } from "./ProviderDecisionReason";

export type ProviderDecisionSnapshot = {
  providerId: string;
  reason: ProviderDecisionReason;
  confidence: number;
  decisionTimestamp: string;

  /** Score used to compute the decision (future traceability). */
  score: number;

  /** Extensible metadata for future analytics/monitoring/AI. */
  metadata?: Record<string, unknown>;
};

