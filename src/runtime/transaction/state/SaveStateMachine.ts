import type { CorrelationId, SaveLifecycleEvent, TransactionId } from "../contracts/transactionContracts";

export type SaveState = {
  stage:
    | "draft_snapshot_created"
    | "payload_built"
    | "persistence_started"
    | "persistence_succeeded"
    | "persistence_failed"
    | "compensation_enqueued"
    | "completed";

  transactionId: TransactionId;
  correlationId: CorrelationId;

  // extensible for future offline-first semantics
  lastEventAt?: string;
  [k: string]: unknown;
};

/**
 * SaveStateMachine (Sprint 5)
 * - Pure deterministic state transition model
 * - No persistence, no adapters
 */
export class SaveStateMachine {
  static initial(e: SaveLifecycleEvent): SaveState {
    return {
      stage: e.stage as SaveState["stage"],
      transactionId: e.transactionId,
      correlationId: e.correlationId,
      lastEventAt: e.at,
    };
  }

  static apply(prev: SaveState, e: SaveLifecycleEvent): SaveState {
    // Minimal transition discipline for safety; upper layers can add richer rules later.
    if (prev.transactionId !== e.transactionId) {
      throw new Error("SaveStateMachine: transactionId mismatch");
    }
    if (prev.correlationId !== e.correlationId) {
      throw new Error("SaveStateMachine: correlationId mismatch");
    }

    return {
      ...prev,
      stage: e.stage as SaveState["stage"],
      lastEventAt: e.at,
    };
  }

  static reduce(events: SaveLifecycleEvent[], initialEvent?: SaveLifecycleEvent): SaveState {
    if (!events.length) {
      throw new Error("SaveStateMachine: no events to reduce");
    }
    const seed = initialEvent ?? events[0];
    return events.reduce((acc, ev) => SaveStateMachine.apply(acc, ev), SaveStateMachine.initial(seed));
  }
}
