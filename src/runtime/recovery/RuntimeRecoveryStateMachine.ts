import type { RuntimeRecoveryEvent, RuntimeRecoverySnapshot } from "./RuntimeRecoveryContracts";

/**
 * RuntimeRecoveryStateMachine (PURE)
 * - Deterministic reducer ONLY
 * - No side-effects
 * - No timers
 * - No storage
 * - No async
 */
export class RuntimeRecoveryStateMachine {
  /**
   * Applies a single recovery event to a snapshot and returns a new snapshot.
   */
  static apply(prev: RuntimeRecoverySnapshot, e: RuntimeRecoveryEvent): RuntimeRecoverySnapshot {
    if (prev.recoveryId !== e.recoveryId) {
      throw new Error("RuntimeRecoveryStateMachine: recoveryId mismatch");
    }
    if (prev.transactionId !== e.transactionId) {
      throw new Error("RuntimeRecoveryStateMachine: transactionId mismatch");
    }
    if (prev.correlationId !== e.correlationId) {
      throw new Error("RuntimeRecoveryStateMachine: correlationId mismatch");
    }

    const state =
      e.type === "draft_captured"
        ? "draft_captured"
        : e.type === "retry_enqueued"
          ? "retry_enqueued"
          : e.type === "retry_drained"
            ? "retry_drained"
            : e.type === "recovered"
              ? "recovered"
              : "failed_permanently";

    const next: RuntimeRecoverySnapshot = {
      ...prev,
      state,
      lastUpdatedAt: e.at,
      lastError: e.type === "retry_enqueued" || e.type === "failed_permanently" ? e.error : prev.lastError,
    };

    return next;
  }

  /**
   * Reduces a list of events onto a seed snapshot (deterministic).
   */
  static reduce(events: RuntimeRecoveryEvent[], seed: RuntimeRecoverySnapshot): RuntimeRecoverySnapshot {
    return events.reduce((acc, e) => RuntimeRecoveryStateMachine.apply(acc, e), seed);
  }
}
