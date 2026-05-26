import type { CorrelationId, TransactionId } from "../contracts/transactionContracts";

function randomId(prefix: string): string {
  // Pure in-memory id generator for Sprint 5 (no persistence, no crypto deps).
  // Future: replace with UUIDv4 or deterministic hashing if required.
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/**
 * RuntimeTransactionIdStrategy (Sprint 5)
 * - Generates correlation/transaction ids at runtime.
 * - No persistence, no external deps.
 * - Determinism is handled by the orchestrator draft snapshot manager for retries.
 */
export class RuntimeTransactionIdStrategy {
  static createTransactionId(): TransactionId {
    return randomId("tx");
  }

  static createCorrelationId(): CorrelationId {
    return randomId("corr");
  }
}
