export interface ProviderFallbackPolicy {
  maxRetries: number;
  retryDelayMs: number;
  retryableOperations: string[];
  fallbackStrategy: "selection" | "score" | "registry";
  stopOnFirstSuccess: boolean;
}

