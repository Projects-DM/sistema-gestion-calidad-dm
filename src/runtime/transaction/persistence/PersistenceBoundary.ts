import type {
  CorrelationId,
  SubmitTransactionPayload,
  TransactionDraftSnapshot,
  TransactionKind,
  TransactionResult,
} from "../contracts/transactionContracts";

export interface TransactionDraftPersistenceRecord {
  draftSnapshotId: string;
  transactionId?: string;
  correlationId?: string;
  capturedAt: string;

  // future: integrity, offline queue metadata, etc.
}

/**
 * IRuntimePersistenceBoundary (Sprint 5)
 * Pure interfaces for Transaction orchestration.
 * - No Supabase imports
 * - No SQL
 * - No physical persistence implementation yet
 */
export interface IRuntimePersistenceLayer {
  kind: TransactionKind;

  /**
   * Persist a prepared transaction payload.
   * Implementation decides retry/dedup semantics with idempotency keys.
   */
  submit(payload: SubmitTransactionPayload): Promise<TransactionResult>;

  /**
   * Optional: load draft snapshot by id.
   * (Not used in Sprint 5 if we keep in-memory only.)
   */
  loadDraft?(params: { draftSnapshotId: string }): Promise<TransactionDraftSnapshot | null>;

  /**
   * Optional: store/update draft snapshot state for offline-first.
   */
  saveDraft?(params: {
    draft: TransactionDraftSnapshot;
    correlationId: CorrelationId;
  }): Promise<void>;
}
