export type ProviderAnalyticsSummary = {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;

  successRate: number;
  failureRate: number;

  averageDurationMs: number;
  lastExecutionAt?: string;
};

