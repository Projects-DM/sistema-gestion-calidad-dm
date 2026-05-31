import type { ProviderExecutionFailure } from "./ProviderExecutionFailure";
import type { ProviderFallbackDecision } from "./ProviderFallbackDecision";

export class RuntimeProviderResilienceOrchestrator {
  constructor(
    private readonly fallbackEngine: {
      evaluateFailure: (failure: ProviderExecutionFailure, context: any) => ProviderFallbackDecision;
    },
    private readonly retryController: {
      executeWithRetry: <T>(fn: () => Promise<T>, context: any, policy: any) => Promise<T>;
    },
    private readonly activeProviderManager: {
      getActiveProviderContract: () => Promise<any>;
      getActiveProvider: () => any;
      setActiveProvider: (params: { providerId: string; meta?: any }) => Promise<void>;
    },
    private readonly auditRecorder: unknown
  ) {}

  public async execute(operation: string, context: any): Promise<any> {
    const executeWithProvider = async () => {
      const provider = await this.activeProviderManager.getActiveProviderContract();
      const fn = provider.persistence?.[operation];
      if (typeof fn !== "function") {
        throw new Error(`Persistence provider does not support operation: ${operation}`);
      }
      return fn.call(provider.persistence, context);
    };

    try {
      const policy = context?.policy ?? {
        maxRetries: 0,
        retryDelayMs: 0,
      };

      return await this.retryController.executeWithRetry(executeWithProvider, context, policy);
    } catch (error) {
      const active = this.activeProviderManager.getActiveProvider();
      const failure: ProviderExecutionFailure = {
        providerId: active.providerId,
        operation,
        error,
        retryable: true,
        timestamp: Date.now(),
        correlationId: context?.correlationId,
      };

      const decision = this.fallbackEngine.evaluateFailure(failure, context);

      if (!decision.shouldFallback || !decision.nextProviderId) {
        throw error;
      }

      await this.activeProviderManager.setActiveProvider({
        providerId: decision.nextProviderId,
        meta: { mode: "fallback" },
      });

      return this.execute(operation, context);
    }
  }
}

