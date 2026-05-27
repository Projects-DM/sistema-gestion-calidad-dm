import type { CorrelationId, TransactionDraftSnapshot, TransactionId, TransactionErrorContract, TransactionKind } from "../transaction/contracts/transactionContracts";

export type RecoveryId = string;

export type RecoveryLifecycleState =
  | "draft_captured"
  | "retry_enqueued"
  | "retry_drained"
  | "recovered"
  | "failed_permanently";

export type RuntimeRecoveryKind =
  | "offline_draft_recovery"
  | "failed_transaction_recovery";

export type RuntimeRecoverySnapshot = {
  recoveryId: RecoveryId;
  kind: RuntimeRecoveryKind;

  // audit/correlation metadata
  transactionId: TransactionId;
  correlationId: CorrelationId;

  // original transaction context
  formId?: string;
  userId?: string;
  transactionKind?: TransactionKind;

  // runtime draft snapshot (metadata-driven)
  draftSnapshot: TransactionDraftSnapshot;

  // retry lifecycle metadata
  attempts: number;
  maxAttempts: number;

  // deterministic timestamps (capturedAt from submit/orchestrator)
  createdAt: string;
  lastUpdatedAt: string;

  // error correlation for audit-ready diagnostics
  lastError?: TransactionErrorContract;

  // deterministic lifecycle state
  state: RecoveryLifecycleState;
};

export type RuntimeRecoveryEvent =
  | {
      type: "draft_captured";
      at: string;
      recoveryId: RecoveryId;
      transactionId: TransactionId;
      correlationId: CorrelationId;
      draftSnapshot: TransactionDraftSnapshot;
    }
  | {
      type: "retry_enqueued";
      at: string;
      recoveryId: RecoveryId;
      transactionId: TransactionId;
      correlationId: CorrelationId;
      error?: TransactionErrorContract;
    }
  | {
      type: "retry_drained";
      at: string;
      recoveryId: RecoveryId;
      transactionId: TransactionId;
      correlationId: CorrelationId;
    }
  | {
      type: "recovered";
      at: string;
      recoveryId: RecoveryId;
      transactionId: TransactionId;
      correlationId: CorrelationId;
    }
  | {
      type: "failed_permanently";
      at: string;
      recoveryId: RecoveryId;
      transactionId: TransactionId;
      correlationId: CorrelationId;
      error?: TransactionErrorContract;
    };

export type RuntimeRecoveryQueueItem = {
  recoveryId: RecoveryId;

  // idempotency identity keys
  transactionId: TransactionId;
  correlationId: CorrelationId;

  // classification for runtime retry attempt selection
  nextAttempt: number;
  maxAttempts: number;

  // error context for audit + policy classifier
  lastError?: TransactionErrorContract;

  // deterministic payload pointer (no physical persistence)
  draftSnapshot: TransactionDraftSnapshot;

  createdAt: string;
};

export type RuntimeRecoveryPolicyDecision = {
  shouldRetry: boolean;
  nextAttempt: number;
  maxAttempts: number;

  // audit-ready classification (no timers/backoff yet)
  retryReason?: string;
};
