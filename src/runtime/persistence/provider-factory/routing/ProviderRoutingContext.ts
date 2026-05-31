export interface ProviderRoutingContext {
  operation: "submit" | "loadDraft" | "saveDraft";

  correlationId?: string;
  transactionId?: string;

  metadata?: {
    latencyRequirement?: number;
    reliabilityPriority?: number;
    costPriority?: number;
  };

  previousFailures?: number;
}

