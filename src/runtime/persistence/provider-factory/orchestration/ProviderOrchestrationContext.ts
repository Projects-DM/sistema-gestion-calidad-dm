export interface ProviderOrchestrationContext {
  operationType: string;

  correlationId?: string;
  transactionId?: string;

  metadata?: Record<string, unknown>;
}

