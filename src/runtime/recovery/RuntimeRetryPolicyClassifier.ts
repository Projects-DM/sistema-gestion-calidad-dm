import type { RetryDecision } from "../transaction/retry/RetryClassification";
import type { RuntimeRecoveryPolicyDecision } from "./RuntimeRecoveryContracts";
import type { TransactionErrorCode, TransactionErrorContract } from "../transaction/contracts/transactionContracts";

export type RetryPolicyClassifierParams = {
  retryable: boolean;
  error?: TransactionErrorContract;
  attempt: number; // 1-based attempt number
  maxAttempts: number;
};

/**
 * RuntimeRetryPolicyClassifier
 * - NO timers / NO backoff
 * - Pure deterministic policy classifier for future retry orchestration
 */
export class RuntimeRetryPolicyClassifier {
  static classify(params: RetryPolicyClassifierParams): RuntimeRecoveryPolicyDecision {
    const nextAttempt = params.attempt;
    const shouldRetry = params.retryable && nextAttempt <= params.maxAttempts;

    const retryReason = RuntimeRetryPolicyClassifier.buildReason(params.error?.code);

    return {
      shouldRetry,
      nextAttempt,
      maxAttempts: params.maxAttempts,
      retryReason,
    };
  }

  private static buildReason(code?: TransactionErrorCode | string): string | undefined {
    if (!code) return undefined;
    if (String(code).toUpperCase() === "UNKNOWN") return "Unknown error (retryable by default)";
    return `Retry due to error code: ${String(code)}`;
  }
}
