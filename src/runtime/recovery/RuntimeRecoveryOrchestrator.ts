import type { RuntimeRecoveryEvent, RuntimeRecoveryKind, RuntimeRecoveryPolicyDecision, RuntimeRecoverySnapshot, RuntimeRecoveryQueueItem, RuntimeRecoveryPolicyDecision as PolicyDecision } from "./RuntimeRecoveryContracts";
import type { IRuntimeRecoveryStorageBoundary } from "./RuntimeRecoveryStorageBoundary";
import type { CorrelationId, TransactionDraftSnapshot, TransactionId, TransactionErrorContract } from "../transaction/contracts/transactionContracts";
import type { TransactionResult } from "../transaction/contracts/transactionContracts";

import { RuntimeRetryPolicyClassifier } from "./RuntimeRetryPolicyClassifier";
import { RuntimeRetryQueue } from "./RuntimeRetryQueue";
import { RuntimeDraftRecoveryManager } from "./RuntimeDraftRecoveryManager";
import { RuntimeRecoveryStateMachine } from "./RuntimeRecoveryStateMachine";

export type RuntimeRecoveryOrchestratorParams = {
  kind: RuntimeRecoveryKind;

  // Input: failure context + retry classification
  transactionId: TransactionId;
  correlationId: CorrelationId;
  draftSnapshot: TransactionDraftSnapshot;

  error?: TransactionErrorContract;

  // limits
  maxAttempts: number;

  // ports
  storage: IRuntimeRecoveryStorageBoundary;
  queue: RuntimeRetryQueue;
  draftRecoveryManager: RuntimeDraftRecoveryManager;

  /**
   * Optional async listener for audit visibility (runtime-only).
   * Should not persist.
   */
  eventSink?: (events: RuntimeRecoveryEvent[]) => void | Promise<void>;
};

export class RuntimeRecoveryOrchestrator {
  static async orchestrate(params: RuntimeRecoveryOrchestratorParams): Promise<{
    snapshot: RuntimeRecoverySnapshot;
    events: RuntimeRecoveryEvent[];
    action: "retry_enqueued" | "recovered" | "failed_permanently";
  }> {
    const now = new Date().toISOString();

    // Initialize snapshot via manager (in-memory) with idempotent capture
    const capture = params.draftRecoveryManager.capture({
      kind: params.kind,
      draftSnapshot: params.draftSnapshot,
      transactionId: params.transactionId,
      correlationId: params.correlationId,
      createdAt: now,
      maxAttempts: params.maxAttempts,
    });

    const recoveryId = capture.recoveryId;
    let snapshot = capture.snapshot;

    const events: RuntimeRecoveryEvent[] = [];

    const policyDecision: PolicyDecision = RuntimeRetryPolicyClassifier.classify({
      retryable: !!params.error?.retryable || params.error?.retryable === true,
      error: params.error,
      attempt: snapshot.attempts + 1,
      maxAttempts: params.maxAttempts,
    });

    // draft captured event
    events.push({
      type: "draft_captured",
      at: now,
      recoveryId,
      transactionId: params.transactionId,
      correlationId: params.correlationId,
      draftSnapshot: params.draftSnapshot,
    });

    // persist snapshot (in-memory boundary in sprint 8; contract-based)
    await params.storage.saveSnapshot(snapshot);

    if (policyDecision.shouldRetry) {
      // Enqueue idempotently in deterministic queue
      const queueItem: RuntimeRecoveryQueueItem = {
        recoveryId,
        transactionId: params.transactionId,
        correlationId: params.correlationId,
        nextAttempt: policyDecision.nextAttempt,
        maxAttempts: params.maxAttempts,
        lastError: params.error,
        draftSnapshot: params.draftSnapshot,
        createdAt: now,
      };

      params.queue.enqueue(queueItem);

      const retryEnqueuedEvent: RuntimeRecoveryEvent = {
        type: "retry_enqueued",
        at: now,
        recoveryId,
        transactionId: params.transactionId,
        correlationId: params.correlationId,
        error: params.error,
      };
      events.push(retryEnqueuedEvent);

      snapshot = RuntimeRecoveryStateMachine.apply(snapshot, retryEnqueuedEvent);

      await params.storage.saveSnapshot(snapshot);

      if (params.eventSink) {
        await params.eventSink(events);
      }

      return { snapshot, events, action: "retry_enqueued" };
    }

    // If not retryable, mark failed permanently
    const failedEvent: RuntimeRecoveryEvent = {
      type: "failed_permanently",
      at: now,
      recoveryId,
      transactionId: params.transactionId,
      correlationId: params.correlationId,
      error: params.error,
    };

    events.push(failedEvent);
    snapshot = RuntimeRecoveryStateMachine.apply(snapshot, failedEvent);

    await params.storage.saveSnapshot(snapshot);

    if (params.eventSink) {
      await params.eventSink(events);
    }

    return { snapshot, events, action: "failed_permanently" };
  }

  static async drainOneAndMarkRecovered(params: {
    storage: IRuntimeRecoveryStorageBoundary;
    queue: RuntimeRetryQueue;
    draftRecoveryManager: RuntimeDraftRecoveryManager;
    eventSink?: (events: RuntimeRecoveryEvent[]) => void | Promise<void>;
  }): Promise<{ action: "recovered" | "nothing"; events: RuntimeRecoveryEvent[] }> {
    const now = new Date().toISOString();
    const next = params.queue.dequeue();

    if (!next) return { action: "nothing", events: [] };

    const recoveredEvent: RuntimeRecoveryEvent = {
      type: "recovered",
      at: now,
      recoveryId: next.recoveryId,
      transactionId: next.transactionId,
      correlationId: next.correlationId,
    };

    const current = params.draftRecoveryManager.getById(next.recoveryId);
    if (!current) {
      // determinism: if snapshot missing, treat as nothing (no side effects)
      return { action: "nothing", events: [] };
    }

    const events: RuntimeRecoveryEvent[] = [
      {
        type: "retry_drained",
        at: now,
        recoveryId: next.recoveryId,
        transactionId: next.transactionId,
        correlationId: next.correlationId,
      },
      recoveredEvent,
    ];

    // apply in-memory
    const updated = RuntimeRecoveryStateMachine.apply(current, recoveredEvent);
    await params.storage.saveSnapshot(updated);

    if (params.eventSink) await params.eventSink(events);

    return { action: "recovered", events };
  }

  /**
   * Optional helper for simulations: return deterministic queue size.
   */
  static getQueueSize(queue: RuntimeRetryQueue): number {
    return queue.size();
  }
}
