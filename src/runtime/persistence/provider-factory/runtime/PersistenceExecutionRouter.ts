import type {
  CorrelationId,
  SubmitTransactionPayload,
  TransactionDraftSnapshot,
  TransactionKind,
  TransactionResult,
} from "../../../transaction/contracts/transactionContracts";
import type { IRuntimePersistenceLayer } from "../../../persistence/PersistenceBoundary";


import type { ActivePersistenceProviderManager } from "./ActivePersistenceProviderManager";


/**
 * PersistenceExecutionRouter
 * - Single entry point for runtime persistence API
 * - Always routes through the active provider's persistence port
 * - No direct adapter usage
 * - Extension placeholders reserved for future AI routing/fallback logic
 */
import type { RuntimeExecutionAuditRecorder } from "../audit/RuntimeExecutionAuditRecorder";
import type { RuntimeProviderAnalyticsEngine } from "../analytics/RuntimeProviderAnalyticsEngine";
import type { RuntimeProviderScoringEngine } from "../scoring/RuntimeProviderScoringEngine";

export class PersistenceExecutionRouter {
  constructor(
    private readonly activeProviderManager: ActivePersistenceProviderManager,
    private readonly auditRecorder?: RuntimeExecutionAuditRecorder,
    private readonly analyticsEngine?: RuntimeProviderAnalyticsEngine,
    private readonly scoringEngine?: RuntimeProviderScoringEngine
  ) {}



  private async getPersistencePortAndProviderId(): Promise<{
    port: IRuntimePersistenceLayer;
    providerId: string;
    operationType: import("../../../transaction/contracts/transactionContracts").TransactionKind;
  }> {
    const provider = await this.activeProviderManager.getActiveProviderContract();
    return {
      port: provider.persistence,
      providerId: provider.id,
      // operationType is derived by caller per method
      operationType: "submit" as never,
    };
  }

  async submit(payload: SubmitTransactionPayload): Promise<TransactionResult> {
    if (!this.auditRecorder) {
      return (await this.getPersistencePortAndProviderId()).port.submit(payload);
    }

    const provider = await this.activeProviderManager.getActiveProviderContract();
    const auditStarted = this.auditRecorder.recordExecutionStarted({
      providerId: provider.id,
      operationType: "persistence.submit",
      correlationId: (payload as any)?.correlationId,
      transactionId: (payload as any)?.metadata?.transactionId,
      recoveryId: (payload as any)?.metadata?.recoveryId,
      metadata: { payloadKind: "submit" },
    });

    try {
      const result = await provider.persistence.submit(payload);
      if (result?.success) {
        this.auditRecorder.recordExecutionSucceeded({
          auditId: auditStarted.auditId,
          startedAt: auditStarted.startedAt,
          providerId: provider.id,
          operationType: "persistence.submit",
          correlationId: (payload as any)?.correlationId,
          transactionId: (payload as any)?.metadata?.transactionId,
          recoveryId: (payload as any)?.metadata?.recoveryId,
        });
        this.analyticsEngine?.getProviderAnalytics(provider.id);
        this.scoringEngine?.refreshScores();
      } else {

        this.auditRecorder.recordExecutionFailed({
          auditId: auditStarted.auditId,
          startedAt: auditStarted.startedAt,
          providerId: provider.id,
          operationType: "persistence.submit",
          correlationId: (payload as any)?.correlationId,
          transactionId: (payload as any)?.metadata?.transactionId,
          recoveryId: (payload as any)?.metadata?.recoveryId,
          error: { code: result?.error?.code, message: result?.error?.message, retryable: result?.error?.retryable },
          metadata: { payloadKind: "submit" },
        });
        this.analyticsEngine?.getProviderAnalytics(provider.id);
      }
      return result;
    } catch (e: any) {
      this.auditRecorder.recordExecutionFailed({
        auditId: auditStarted.auditId,
        startedAt: auditStarted.startedAt,
        providerId: provider.id,
        operationType: "persistence.submit",
        correlationId: (payload as any)?.correlationId,
        transactionId: (payload as any)?.metadata?.transactionId,
        recoveryId: (payload as any)?.metadata?.recoveryId,
        error: { message: e?.message ?? String(e), retryable: false },
        metadata: { payloadKind: "submit" },
      });
      throw e;
    }
  }


  async loadDraft(params: {
    draftSnapshotId: string;
  }): Promise<TransactionDraftSnapshot | null> {
    if (!this.auditRecorder) {
      const port = (await this.activeProviderManager.getActiveProviderContract()).persistence;
      if (!port.loadDraft) return null;
      return port.loadDraft({ draftSnapshotId: params.draftSnapshotId });
    }

    const provider = await this.activeProviderManager.getActiveProviderContract();
    const auditStarted = this.auditRecorder.recordExecutionStarted({
      providerId: provider.id,
      operationType: "persistence.loadDraft" as any,
      metadata: { payloadKind: "loadDraft" },
    });

    try {
      const port = provider.persistence;
      if (!port.loadDraft) return null;
      const res = await port.loadDraft({ draftSnapshotId: params.draftSnapshotId });
      this.auditRecorder.recordExecutionSucceeded({
        auditId: auditStarted.auditId,
        startedAt: auditStarted.startedAt,
        providerId: provider.id,
        operationType: "persistence.loadDraft" as any,
        metadata: { payloadKind: "loadDraft" },
      });
      this.analyticsEngine?.getProviderAnalytics(provider.id);
      this.scoringEngine?.refreshScores();
      return res;
    } catch (e: any) {
      this.auditRecorder.recordExecutionFailed({
        auditId: auditStarted.auditId,
        startedAt: auditStarted.startedAt,
        providerId: provider.id,
        operationType: "persistence.loadDraft" as any,
        error: { message: e?.message ?? String(e), retryable: false },
        metadata: { payloadKind: "loadDraft" },
      });
      throw e;
    }
  }

  async saveDraft(params: {
    draft: TransactionDraftSnapshot;
    correlationId: CorrelationId;
  }): Promise<void> {
    if (!this.auditRecorder) {
      const port = (await this.activeProviderManager.getActiveProviderContract()).persistence;
      if (!port.saveDraft) return;
      return port.saveDraft({ draft: params.draft, correlationId: params.correlationId });
    }

    const provider = await this.activeProviderManager.getActiveProviderContract();
    const auditStarted = this.auditRecorder.recordExecutionStarted({
      providerId: provider.id,
      operationType: "persistence.saveDraft" as any,
      correlationId: params.correlationId,
      transactionId: (params.draft as any)?.metadata?.transactionId,
      recoveryId: (params.draft as any)?.metadata?.recoveryId,
      metadata: { payloadKind: "saveDraft" },
    });

    try {
      const port = provider.persistence;
      if (!port.saveDraft) return;
      await port.saveDraft({ draft: params.draft, correlationId: params.correlationId });
      this.auditRecorder.recordExecutionSucceeded({
        auditId: auditStarted.auditId,
        startedAt: auditStarted.startedAt,
        providerId: provider.id,
        operationType: "persistence.saveDraft" as any,
        correlationId: params.correlationId,
        transactionId: (params.draft as any)?.metadata?.transactionId,
        recoveryId: (params.draft as any)?.metadata?.recoveryId,
        metadata: { payloadKind: "saveDraft" },
      });
      this.analyticsEngine?.getProviderAnalytics(provider.id);
      this.scoringEngine?.refreshScores();
    } catch (e: any) {

      this.auditRecorder.recordExecutionFailed({
        auditId: auditStarted.auditId,
        startedAt: auditStarted.startedAt,
        providerId: provider.id,
        operationType: "persistence.saveDraft" as any,
        correlationId: params.correlationId,
        transactionId: (params.draft as any)?.metadata?.transactionId,
        recoveryId: (params.draft as any)?.metadata?.recoveryId,
        error: { message: e?.message ?? String(e), retryable: false },
        metadata: { payloadKind: "saveDraft" },
      });
      this.analyticsEngine?.getProviderAnalytics(provider.id);
      throw e;
    }
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

