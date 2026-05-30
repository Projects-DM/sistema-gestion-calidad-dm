import type {
  CorrelationId,
  SubmitTransactionPayload,
  TransactionDraftSnapshot,
  TransactionErrorContract,
  TransactionKind,
  TransactionResult,
} from "../../../transaction/contracts/transactionContracts";
import type { IRuntimePersistenceLayer } from "../../../transaction/persistence/PersistenceBoundary";
import type { PersistenceProviderCapabilities } from "../contracts/PersistenceProviderCapabilities";
import type {
  PersistenceProvider,
  PersistenceProviderId,
} from "../contracts/PersistenceProvider";

/**
 * LocalStoragePersistenceProvider
 * - Runtime-first provider-factory implementation
 * - Draft persistence survives refresh/close/restart (browser localStorage)
 *
 * Constraints:
 * - No Supabase
 * - No UI
 * - No coupling to Recovery/Workflow
 */
export class LocalStoragePersistenceProvider implements PersistenceProvider {
  public readonly id: PersistenceProviderId = "local-storage";
  public readonly displayName = "Local Storage Persistence Provider";

  public readonly capabilities: PersistenceProviderCapabilities = {
    supportsOffline: true,
    supportsRecovery: true,
    supportsSnapshots: true,
    supportsReplay: true,
    supportsTransactions: true,
    supportsAnalytics: false,
  };

  public readonly supportedKinds: TransactionKind[] = [
    "submit",
    "verify",
    "workflow",
    "evidence_registration",
  ];

  public readonly persistence: IRuntimePersistenceLayer = new LocalStoragePersistenceLayer(this);

  private getDraftKey(draftSnapshotId: string): string {
    return `runtime:draft:${draftSnapshotId}`;
  }

  _loadDraft(draftSnapshotId: string): TransactionDraftSnapshot | null {
    const key = this.getDraftKey(draftSnapshotId);
    if (typeof window === "undefined" || !window.localStorage) return null;

    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as TransactionDraftSnapshot;
    } catch {
      return null;
    }
  }

  _saveDraft(draft: TransactionDraftSnapshot): void {
    const key = this.getDraftKey(draft.draftSnapshotId);
    if (typeof window === "undefined" || !window.localStorage) return;

    window.localStorage.setItem(key, JSON.stringify(draft));
  }
}

class LocalStoragePersistenceLayer implements IRuntimePersistenceLayer {
  readonly kind: TransactionKind;

  constructor(private readonly owner: LocalStoragePersistenceProvider) {
    this.kind = "submit";
  }

  async submit(payload: SubmitTransactionPayload): Promise<TransactionResult> {
    // Simple in-browser submit semantics.
    // Persistence of final transaction is out-of-scope for this sprint.
    const transactionId = payload?.metadata?.transactionId ?? "local-storage-tx";

    return {
      success: true,
      retryable: false,
      transactionId,
      responseId: undefined,
    };
  }

  async loadDraft(params: { draftSnapshotId: string }): Promise<TransactionDraftSnapshot | null> {
    return this.owner._loadDraft(params.draftSnapshotId);
  }

  async saveDraft(params: {
    draft: TransactionDraftSnapshot;
    correlationId: CorrelationId;
  }): Promise<void> {
    // correlationId accepted by contract; not required for keying in this sprint.
    const draft = params.draft;
    if (!draft?.draftSnapshotId) {
      const error: TransactionErrorContract = {
        code: "CONTRACT_VIOLATION",
        message: "LocalStoragePersistenceProvider: draftSnapshotId missing",
        retryable: false,
      };
      throw new Error(error.message);
    }

    this.owner._saveDraft(draft);
  }
}

