import type {
  CorrelationId,
  SubmitTransactionPayload,
  TransactionDraftSnapshot,
  TransactionKind,
  TransactionResult,
} from "../../../transaction/contracts/transactionContracts";



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
import type { RuntimeProviderDecisionEngine } from "../decision/RuntimeProviderDecisionEngine";
import type { RuntimeProviderDecisionRegistry } from "../decision/RuntimeProviderDecisionRegistry";
import type { RuntimeProviderSelectionEngine } from "../selection/RuntimeProviderSelectionEngine";
import type { RuntimeProviderSelectionRegistry } from "../selection/RuntimeProviderSelectionRegistry";

import { EventSafetyLayer } from "./EventSafetyLayer";






export class PersistenceExecutionRouter {
  constructor(
    private readonly activeProviderManager: ActivePersistenceProviderManager,
    private readonly auditRecorder?: RuntimeExecutionAuditRecorder,
    private readonly analyticsEngine?: RuntimeProviderAnalyticsEngine,
    private readonly scoringEngine?: RuntimeProviderScoringEngine,
    private readonly decisionEngine?: RuntimeProviderDecisionEngine,
    private readonly decisionRegistry?: RuntimeProviderDecisionRegistry,
    private readonly selectionEngine?: RuntimeProviderSelectionEngine,
    private readonly selectionRegistry?: RuntimeProviderSelectionRegistry,
    private readonly eventSafetyLayer: EventSafetyLayer = new EventSafetyLayer(),

    /**
     * S23.13 optional in-memory GlobalDedupAnchor.
     * Non-persistent, non-distributed, failure-safe fallback to S23.12.
     */
    private readonly globalDedupAnchor?: { accept: (idempotencyKey: string) => boolean }
  ) {}









  private readonly internalGlobalDedupAnchor = (() => {
    const seen = new Map<string, true>();
    return {
      accept: (idempotencyKey: string) => {
        if (seen.has(idempotencyKey)) return false;
        seen.set(idempotencyKey, true);
        return true;
      }
    };
  })();

  private getInternalGlobalDedupAnchor() {
    return this.internalGlobalDedupAnchor;
  }

  private buildDeterministicCompositeIdempotencyKey(event: any): string {
    const eventType = event.eventType ?? event.type ?? "";
    const correlationId = event.correlationId ?? "";
    const actorId = event.actorId ?? "";
    const responseId = event.payload?.normalized?.responseId ?? "";
    const base = `${eventType}:${correlationId}:${actorId}:${responseId}`;
    let h = 0;
    for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
    return `idem_${h.toString(16)}`;
  }

  private async getPersistencePortAndProviderId(): Promise<{

    port: any;

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

  async submit(payload: SubmitTransactionPayload & { __runtime_internal_event?: any }): Promise<TransactionResult> {
    if (!this.auditRecorder) {
      return (await this.getPersistencePortAndProviderId()).port.submit(payload);
    }


    const provider = await this.activeProviderManager.getActiveProviderContract();
    const translatedEvent = (payload as any)?.__runtime_internal_event;

    // S23.13 GlobalDedupAnchor pre-gate (optional, in-memory, failure-safe)
    let globalAccepted = true;
    if (translatedEvent) {
      try {
        const idempotencyKey = translatedEvent.eventId ?? this.buildDeterministicCompositeIdempotencyKey(translatedEvent);
        const anchor = this.globalDedupAnchor ?? this.getInternalGlobalDedupAnchor();
        if (idempotencyKey && anchor) {
          globalAccepted = anchor.accept(idempotencyKey);
        }
      } catch {
        // Fallback to S23.12 only
        globalAccepted = true;
      }
    }


    if (!globalAccepted) {
      // STOP PIPELINE: no audit write, no analytics refresh, no scoring trigger
      // Persist still proceeds? Spec requires STOP PIPELINE immediately.
      // We stop by throwing a no-op result-like error.
      return { success: true } as TransactionResult;
    }

    // EventSafetyLayer gate (strict)
    let eventAccepted = true;

    if (translatedEvent) {
      const safetyDecision = this.eventSafetyLayer.validateAndProcess(translatedEvent);
      eventAccepted = safetyDecision.kind === "accepted";
      if (!eventAccepted) {
        // Reject taxonomy/correlation or ignore duplicate/replay
        // Skip analytics/scoring refresh; persistence still proceeds.
      }
    }

    // business audit marker only when accepted
    if (translatedEvent && eventAccepted) {
      this.auditRecorder.recordExecutionStarted({
        providerId: provider.id,
        operationType: `business.${translatedEvent.eventType ?? translatedEvent.type}` as any,
        correlationId: translatedEvent.correlationId,
        transactionId: translatedEvent.responseId ?? translatedEvent.transactionId,
        metadata: { payloadKind: translatedEvent.eventType ?? translatedEvent.type },
      });
    }


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
        if (eventAccepted) {
          this.analyticsEngine?.getProviderAnalytics(provider.id);
          this.scoringEngine?.refreshScores();
        }



        const decision = this.decisionEngine?.computeSnapshot();
        if (decision) {
          this.decisionRegistry?.store(decision);
          const selection = this.selectionEngine?.selectHighestScore();
          if (selection) {
            this.selectionRegistry?.store(selection);
            this.activeProviderManager.setActiveProvider({ providerId: selection.providerId });
          }
        }

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
        if (eventAccepted) {
          this.analyticsEngine?.getProviderAnalytics(provider.id);
          this.scoringEngine?.refreshScores();
        }

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

      this.analyticsEngine?.getProviderAnalytics(provider.id);
      this.scoringEngine?.refreshScores();
      const decision = this.decisionEngine?.computeSnapshot();
      if (decision) this.decisionRegistry?.store(decision);

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
      const decision = this.decisionEngine?.computeSnapshot();
      if (decision) this.decisionRegistry?.store(decision);
      return res;
    } catch (e: any) {
      this.analyticsEngine?.getProviderAnalytics(provider.id);
      this.scoringEngine?.refreshScores();

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

