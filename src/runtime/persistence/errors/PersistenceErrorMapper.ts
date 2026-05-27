import type { TransactionErrorContract, TransactionErrorCode } from "../../transaction/contracts/transactionContracts";
import type { RuntimePersistenceError } from "../contracts/runtimePersistenceContracts";

export class PersistenceErrorMapper {
  /**
   * Normaliza errores físicos/proveedores a TransactionErrorContract (runtime contract).
   * - No ejecuta side-effects
   * - No hace retry
   */
  static mapToContract(error: unknown): RuntimePersistenceError {
    // Best-effort mapping (unknown provider errors => UNKNOWN retryable by default)
    if (typeof error === "object" && error && "code" in error) {
      const codeRaw = (error as any).code;
      const messageRaw = (error as any).message;

      const code = String(codeRaw ?? "UNKNOWN") as TransactionErrorCode | string;
      const message = String(messageRaw ?? "Unknown persistence error");

      // Retry semantics heuristic: network/availability-ish codes are retryable.
      const retryableCodes = new Set([
        "ETIMEDOUT",
        "ECONNRESET",
        "ENETUNREACH",
        "EAI_AGAIN",
        "DB_UNAVAILABLE",
        "CONNECTION_TIMEOUT",
        "NETWORK_UNAVAILABLE",
        "UNKNOWN",
      ]);

      const retryable = retryableCodes.has(code) || code === "UNKNOWN";

      return {
        code,
        message,
        retryable,
      };
    }

    const message = error instanceof Error ? error.message : "Unknown persistence error";

    return {
      code: "UNKNOWN",
      message,
      retryable: true,
    };
  }
}
