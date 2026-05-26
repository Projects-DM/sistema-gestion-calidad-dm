import type {
  DraftSnapshotId,
  TransactionDraftSnapshot,
  TransactionId,
  ClientRequestId,
} from "../contracts/transactionContracts";
import { RuntimeTransactionIdStrategy } from "../ids/RuntimeTransactionIdStrategy";
import type { RuntimeValue } from "../../types/runtimeContracts";
import type { TransactionEvidenceItem } from "../contracts/transactionContracts";

/**
 * DraftSnapshotManager (Sprint 5)
 * - Draft snapshots exist in-memory for now (no persistence).
 * - Provides payload rebuild semantics on retry preparation.
 */
export class DraftSnapshotManager {
  static createDraft(params: {
    formId: string;
    userId: string;
    values: Record<string, RuntimeValue>;
    evidences: TransactionEvidenceItem[];
    clientRequestId?: ClientRequestId;
    transactionId?: TransactionId;
  }): TransactionDraftSnapshot {
    const draftSnapshotId: DraftSnapshotId = `draft_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;

    return {
      draftSnapshotId,
      transactionId: params.transactionId,
      clientRequestId: params.clientRequestId,
      capturedAt: new Date().toISOString(),
      values: { ...params.values },
      evidences: [...(params.evidences ?? [])],
      formId: params.formId,
      userId: params.userId,
      workflowContext: {},
      integrity: undefined,
    };
  }

  static newTransactionIdsOrReuse(params: { clientRequestId?: ClientRequestId; draft?: TransactionDraftSnapshot }) {
    const transactionId = params.draft?.transactionId ?? RuntimeTransactionIdStrategy.createTransactionId();
    const correlationId = RuntimeTransactionIdStrategy.createCorrelationId();

    return { transactionId, correlationId };
  }

  static withClientRequestId(draft: TransactionDraftSnapshot, nextClientRequestId?: ClientRequestId) {
    return { ...draft, clientRequestId: nextClientRequestId ?? draft.clientRequestId };
  }

  static rebuildValuesForPayload(draft: TransactionDraftSnapshot): Record<string, RuntimeValue> {
    return { ...draft.values };
  }
}
