import type { TransactionErrorContract } from "../contracts/transactionContracts";

export type RetryDecision = {
  retryable: boolean;
  retryableErrorCodes?: string[];
};

export class RetryClassification {
  /**
   * Sprint 5:
   * Pure decision helper for transaction layer.
   * No persistence/backoff here; only classify.
   */
  static classify(error: unknown): RetryDecision & { errorContract: TransactionErrorContract } {
    if (typeof error === "object" && error && "code" in error) {
      const code = String((error as any).code ?? "UNKNOWN");
      const message = String((error as any).message ?? "Unknown error");

      // Heuristic best-effort: transport availability errors are typically retryable.
      const retryableCodes = ["ETIMEDOUT", "ECONNRESET", "ENETUNREACH", "EAI_AGAIN", "DB_UNAVAILABLE"];

      const retryable = retryableCodes.includes(code);

      return {
        retryable,
        retryableErrorCodes: retryable ? [code] : undefined,
        errorContract: {
          code,
          message,
          retryable,
        },
      };
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    // Default: treat unknown exceptions as retryable (network-style) for offline-first preparation.
    // Upper layers can refine classification later.
    return {
      retryable: true,
      retryableErrorCodes: ["UNKNOWN"],
      errorContract: {
        code: "UNKNOWN",
        message,
        retryable: true,
      },
    };
  }
}
