export type ProviderAnalyticsSnapshot = {
  providerId: string;

  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;

  successRate: number; // 0..1
  failureRate: number; // 0..1

  averageDurationMs: number;
  lastExecutionAt?: string; // ISO 8601
};

