export class RuntimeProviderRetryController {
  public async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: unknown,
    policy: { maxRetries: number; retryDelayMs: number }
  ): Promise<T> {
    let attempt = 0;

    while (attempt <= policy.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        if (attempt > policy.maxRetries) {
          throw error;
        }

        await new Promise<void>((r) => setTimeout(() => r(), policy.retryDelayMs));
      }
    }

    // unreachable
    throw new Error("RuntimeProviderRetryController: retry loop exhausted");
  }
}

