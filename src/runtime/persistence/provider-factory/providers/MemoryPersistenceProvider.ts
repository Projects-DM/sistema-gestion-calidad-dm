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
 * MemoryPersistenceProvider
 * - First real persistence provider implementation using provider-factory architecture
 * - Fully runtime-first & provider-agnostic (in-memory only)
 * - Supports:
 *   - submit()
 *   - saveDraft()
 *   - loadDraft()
 *
 * IMPORTANT:
 * - No Supabase
 * - No SQL
 * - No changes to transaction/workflow/runtime layers
 */
export class MemoryPersistenceProvider implements PersistenceProvider {
  public readonly id: PersistenceProviderId = "memory";
  public readonly displayName = "Memory Persistence Provider";

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

  public readonly persistence: IRuntimePersistenceLayer = new MemoryPersistenceLayer(this);

  // Internal draft storage (shared with persistence port)
  private readonly draftStore = new Map<string, TransactionDraftSnapshot>();

  private getDraftKey(draftSnapshotId: string): string {
    return draftSnapshotId;
  }

  // Draft hooks used by the in-memory persistence layer
  _loadDraft(draftSnapshotId: string): TransactionDraftSnapshot | null {
    const key = this.getDraftKey(draftSnapshotId);
    return this.draftStore.get(key) ?? null;
  }

  _saveDraft(draftSnapshot: TransactionDraftSnapshot): void {
    const key = this.getDraftKey(draftSnapshot.draftSnapshotId);
    this.draftStore.set(key, draftSnapshot);
  }
}

class MemoryPersistenceLayer implements IRuntimePersistenceLayer {
  readonly kind: TransactionKind;

  constructor(private readonly owner: MemoryPersistenceProvider) {
    // runtime contract requires kind; keep it aligned with supported operations
    this.kind = "submit";
  }

  async submit(payload: SubmitTransactionPayload): Promise<TransactionResult> {
    // In-memory provider: submit is treated as an immediate success.
    // Correlation/transaction identifiers are preserved by contract.

    // Minimal safety: ensure metadata.transactionId exists if provided.
    const transactionId = payload?.metadata?.transactionId ?? "memory-tx";

    const result: TransactionResult = {
      success: true,
      retryable: false,
      transactionId,
      responseId: undefined,
    };

    return result;
  }

  async loadDraft(params: { draftSnapshotId: string }): Promise<TransactionDraftSnapshot | null> {
    return this.owner._loadDraft(params.draftSnapshotId);
  }

  async saveDraft(params: {
    draft: TransactionDraftSnapshot;
    correlationId: CorrelationId;
  }): Promise<void> {
    // Keep the contract shape: store snapshot as-is.
    // correlationId is accepted for future extension; not required for in-memory storage.
    const draft = params.draft;
    if (!draft?.draftSnapshotId) {
      const error: TransactionErrorContract = {
        code: "CONTRACT_VIOLATION",
        message: "MemoryPersistenceProvider: draftSnapshotId missing",
        retryable: false,
      };
      // Throw to keep semantics simple and deterministic.
      throw new Error(error.message);
    }

    this.owner._saveDraft(draft);
  }
}

