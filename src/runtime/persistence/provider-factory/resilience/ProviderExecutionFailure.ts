export interface ProviderExecutionFailure {
  providerId: string;
  operation: string;
  error: unknown;
  retryable: boolean;
  timestamp: number;
  correlationId?: string;
}

