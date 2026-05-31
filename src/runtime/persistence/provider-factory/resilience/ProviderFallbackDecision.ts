export interface ProviderFallbackDecision {
  shouldFallback: boolean;
  nextProviderId?: string;
  reason: "retry" | "failover" | "stop";
}

