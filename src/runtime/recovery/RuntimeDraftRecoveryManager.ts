import type { CorrelationId, TransactionDraftSnapshot, TransactionId } from "../transaction/contracts/transactionContracts";
import type { RuntimeRecoverySnapshot, RecoveryId, RuntimeRecoveryKind } from "./RuntimeRecoveryContracts";
import { RuntimeRecoveryStateMachine } from "./RuntimeRecoveryStateMachine";

/**
 * RuntimeDraftRecoveryManager
 * - In-memory manager for recovery snapshots based on draft snapshots
 * - Stores:
 *   - transaction snapshot
 *   - retry attempts
 *   - lifecycle state
 *   - timestamps
 *   - correlation metadata
 *
 * No physical persistence. No async. No timers.
 */
export class RuntimeDraftRecoveryManager {
  private snapshotsById = new Map<RecoveryId, RuntimeRecoverySnapshot>();
  private recoveryIdByCorrelationAndTxn = new Map<string, RecoveryId>();

  /**
   * Captures a draft snapshot as a recovery snapshot seed.
   */
  capture(params: {
    kind: RuntimeRecoveryKind;
    draftSnapshot: TransactionDraftSnapshot;
    transactionId: TransactionId;
    correlationId: CorrelationId;
    createdAt: string;
    maxAttempts: number;
  }): { recoveryId: RecoveryId; snapshot: RuntimeRecoverySnapshot; created: boolean } {
    const key = RuntimeDraftRecoveryManager.makeKey(params.transactionId, params.correlationId);

    // idempotent capture: if exists, do not create duplicate snapshots
    const existingId = this.recoveryIdByCorrelationAndTxn.get(key);
    if (existingId) {
      const existing = this.snapshotsById.get(existingId);
      if (existing) {
        return { recoveryId: existingId, snapshot: existing, created: false };
      }
    }

    const recoveryId: RecoveryId = `rec_${params.kind}_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;

    const snapshot: RuntimeRecoverySnapshot = {
      recoveryId,
      kind: params.kind,
      state: "draft_captured",

      transactionId: params.transactionId,
      correlationId: params.correlationId,

      draftSnapshot: params.draftSnapshot,

      attempts: 0,
      maxAttempts: params.maxAttempts,

      createdAt: params.createdAt,
      lastUpdatedAt: params.createdAt,
    };

    this.snapshotsById.set(recoveryId, snapshot);
    this.recoveryIdByCorrelationAndTxn.set(key, recoveryId);

    return { recoveryId, snapshot, created: true };
  }

  getById(recoveryId: RecoveryId): RuntimeRecoverySnapshot | null {
    return this.snapshotsById.get(recoveryId) ?? null;
  }

  /**
   * Updates snapshot deterministically by applying events.
   * Storage remains in-memory only.
   */
  applyEvent(recoveryId: RecoveryId, e: Parameters<typeof RuntimeRecoveryStateMachine.apply>[1]): RuntimeRecoverySnapshot {
    const prev = this.snapshotsById.get(recoveryId);
    if (!prev) {
      throw new Error(`RuntimeDraftRecoveryManager: unknown recoveryId ${recoveryId}`);
    }

    const next = RuntimeRecoveryStateMachine.apply(prev, e);

    // Update attempts counter deterministically based on event type
    const updated: RuntimeRecoverySnapshot = {
      ...next,
      attempts:
        e.type === "retry_enqueued"
          ? prev.attempts + 1
          : prev.attempts,
    };

    this.snapshotsById.set(recoveryId, updated);
    return updated;
  }

  private static makeKey(transactionId: TransactionId, correlationId: CorrelationId) {
    return `${correlationId}::${transactionId}`;
  }
}
