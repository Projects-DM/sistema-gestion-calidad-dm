import type {
  CorrelationId,
  SubmitTransactionPayload,
  TransactionDraftSnapshot,
  TransactionKind,
  TransactionResult,
} from "../../../transaction/contracts/transactionContracts";
import type { IRuntimePersistenceLayer } from "../../persistence/PersistenceBoundary";

import type { ActivePersistenceProviderManager } from "./ActivePersistenceProviderManager";


/**
 * PersistenceExecutionRouter
 * - Single entry point for runtime persistence API
 * - Always routes through the active provider's persistence port
 * - No direct adapter usage
 * - Extension placeholders reserved for future AI routing/fallback logic
 */
export class PersistenceExecutionRouter {
  constructor(
    private readonly activeProviderManager: ActivePersistenceProviderManager
  ) {}

  private async getPersistencePort(): Promise<IRuntimePersistenceLayer> {
    const provider = await this.activeProviderManager.getActiveProviderContract();
    return provider.persistence;
  }

  async submit(payload: SubmitTransactionPayload): Promise<TransactionResult> {
    // future: AI routing decision hook
    // future: fallback provider selection hook

    return (await this.getPersistencePort()).submit(payload);
  }

  async loadDraft(params: {
    draftSnapshotId: string;
  }): Promise<TransactionDraftSnapshot | null> {
    const port = await this.getPersistencePort();
    if (!port.loadDraft) {
      // contract optional -> treat as not available
      return null;
    }
    return port.loadDraft({ draftSnapshotId: params.draftSnapshotId });
  }

  async saveDraft(params: {
    draft: TransactionDraftSnapshot;
    correlationId: CorrelationId;
  }): Promise<void> {
    const port = await this.getPersistencePort();
    if (!port.saveDraft) {
      return;
    }
    return port.saveDraft({ draft: params.draft, correlationId: params.correlationId });
  }

  /**
   * Reserved: route kind is derived from payload in this sprint.
   * future: add explicit routing by TransactionKind.
   */
  get supportedKinds(): Promise<TransactionKind[]> {
    return this.activeProviderManager
      .getActiveProviderContract()
      .then((p) => p.supportedKinds ?? [p as never]);
  }
}

