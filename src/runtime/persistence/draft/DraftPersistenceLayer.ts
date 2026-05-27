import type {
  CorrelationId,
  TransactionDraftSnapshot,
} from "../../../runtime/transaction/contracts/transactionContracts";
import type { IRuntimePersistenceLayer } from "../../../runtime/transaction/persistence/PersistenceBoundary";

/**
 * DraftPersistenceLayer (Sprint 6 foundation)
 * - Offline-first foundation (in-memory for now)
 * - No provider/DB calls
 *
 * This layer does NOT implement submit; it only provides draft persistence hooks.
 * It is meant to be used/composed by a higher persistence orchestration boundary later.
 */
export class DraftPersistenceLayer implements Pick<IRuntimePersistenceLayer, "loadDraft" | "saveDraft"> {
  private store = new Map<string, TransactionDraftSnapshot>();

  async loadDraft(params: { draftSnapshotId: string }): Promise<TransactionDraftSnapshot | null> {
    return this.store.get(params.draftSnapshotId) ?? null;
  }

  async saveDraft(params: { draft: TransactionDraftSnapshot; correlationId: CorrelationId }): Promise<void> {
    this.store.set(params.draft.draftSnapshotId, params.draft);
  }
}
