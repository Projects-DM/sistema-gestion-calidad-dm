export type ProviderAnalyticsMetric = {
  providerId: string;
  metricName:
    | "totalExecutions"
    | "successfulExecutions"
    | "failedExecutions"
    | "successRate"
    | "failureRate"
    | "averageDurationMs"
    | "lastExecutionAt";

  metricValue: number | string | undefined;
};

