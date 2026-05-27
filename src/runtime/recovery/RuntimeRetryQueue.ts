import type { CorrelationId, TransactionId, TransactionDraftSnapshot } from "../transaction/contracts/transactionContracts";
import type { RuntimeRecoveryQueueItem } from "./RuntimeRecoveryContracts";

/**
 * RuntimeRetryQueue (deterministic, in-memory)
 * - Idempotent enqueue by (transactionId + correlationId)
 * - No side effects outside memory
 * - No timers/polling
 */
export class RuntimeRetryQueue {
  private itemsByKey = new Map<string, RuntimeRecoveryQueueItem>();
  private order: string[] = [];

  static makeKey(transactionId: TransactionId, correlationId: CorrelationId) {
    return `${correlationId}::${transactionId}`;
  }

  enqueue(item: RuntimeRecoveryQueueItem): { enqueued: boolean } {
    const key = RuntimeRetryQueue.makeKey(item.transactionId, item.correlationId);

    if (this.itemsByKey.has(key)) {
      // idempotent: do not duplicate
      return { enqueued: false };
    }

    this.itemsByKey.set(key, item);
    this.order.push(key);
    return { enqueued: true };
  }

  /**
   * Returns the next item without removing.
   */
  peek(): RuntimeRecoveryQueueItem | null {
    const key = this.order[0];
    if (!key) return null;
    return this.itemsByKey.get(key) ?? null;
  }

  /**
   * Removes and returns the next queue item.
   */
  dequeue(): RuntimeRecoveryQueueItem | null {
    const key = this.order.shift();
    if (!key) return null;

    const item = this.itemsByKey.get(key) ?? null;
    this.itemsByKey.delete(key);
    return item;
  }

  size(): number {
    return this.order.length;
  }

  /**
   * Deterministic: drains all currently queued items (for simulation/testing).
   */
  drainAll(): RuntimeRecoveryQueueItem[] {
    const out: RuntimeRecoveryQueueItem[] = [];
    while (this.order.length > 0) {
      const next = this.dequeue();
      if (next) out.push(next);
    }
    return out;
  }

  /**
   * Optional lookup by identifiers (helpful for audit UI).
   */
  getBy(transactionId: TransactionId, correlationId: CorrelationId): RuntimeRecoveryQueueItem | null {
    const key = RuntimeRetryQueue.makeKey(transactionId, correlationId);
    return this.itemsByKey.get(key) ?? null;
  }
}
