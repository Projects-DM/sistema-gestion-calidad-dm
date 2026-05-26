import type { FieldContract, RuntimeValue } from "../../../runtime/types/runtimeContracts";
import type {
  CorrelationId,
  SaveLifecycleEvent,
  SaveLifecycleStage,
  SubmitTransactionPayload,
  TransactionDraftSnapshot,
  TransactionMetadata,
  TransactionResult,
  TransactionKind,
} from "../contracts/transactionContracts";
import { DraftSnapshotManager } from "../draft/DraftSnapshotManager";
import { RuntimePayloadBuilder } from "../payloadBuilders/RuntimePayloadBuilder";
import type { IRuntimePersistenceLayer } from "../persistence/PersistenceBoundary";
import { RuntimeTransactionIdStrategy } from "../ids/RuntimeTransactionIdStrategy";

export type RuntimeSaveOrchestratorParams = {
  kind: TransactionKind;

  formId: string;
  userId: string;

  fields: FieldContract[];
  values: Record<string, RuntimeValue>;

  evidences?: Array<{ storagePath: string; fileType?: string; fileSizeBytes?: number; publicUrl?: string; fieldId?: string; metadata?: Record<string, unknown> }>;

  // Optional idempotency keys (offline-first prep, no persistence yet)
  clientRequestId?: string;

  // Persistence boundary is a port; in Sprint 5 we can pass a mock/in-memory boundary
  persistence: IRuntimePersistenceLayer;
};

export type RuntimeDraftSnapshotState = {
  draft: TransactionDraftSnapshot;
  metadata: TransactionMetadata;
  payload: SubmitTransactionPayload;
};

export class RuntimeSaveOrchestrator {
  /**
   * SaveLifecycleStateMachine (Sprint 5)
   * - Pure orchestration (no DB)
   * - Builds draft snapshot -> builds payload -> calls persistence port
   * - Emits lifecycle events for audit correlation later
   */
  static async save(params: RuntimeSaveOrchestratorParams): Promise<{
    result: TransactionResult;
    events: SaveLifecycleEvent[];
    draftState: RuntimeDraftSnapshotState;
  }> {
    const events: SaveLifecycleEvent[] = [];

    const capturedAt = new Date().toISOString();
    const correlationId = RuntimeTransactionIdStrategy.createCorrelationId();
    const transactionId = RuntimeTransactionIdStrategy.createTransactionId();

    const draft = DraftSnapshotManager.createDraft({
      formId: params.formId,
      userId: params.userId,
      values: params.values,
      evidences: (params.evidences ?? []).map((e) => ({
        fieldId: e.fieldId,
        storagePath: e.storagePath,
        publicUrl: e.publicUrl,
        fileType: e.fileType,
        fileSizeBytes: e.fileSizeBytes,
        metadata: e.metadata,
      })),
      clientRequestId: params.clientRequestId,
      transactionId,
    });

    const metadata: TransactionMetadata = {
      transactionId,
      correlationId,
      clientRequestId: params.clientRequestId,
      draftSnapshotId: draft.draftSnapshotId,
    };

    const pushEvent = (stage: SaveLifecycleStage, details?: Record<string, unknown>) => {
      events.push({
        stage,
        at: new Date().toISOString(),
        transactionId,
        correlationId,
        details,
      });
    };

    pushEvent("draft_snapshot_created", { draftSnapshotId: draft.draftSnapshotId });

    // Payload build (deterministic mapping)
    const payload = RuntimePayloadBuilder.buildSubmitPayload({
      kind: "submit",
      formId: params.formId,
      userId: params.userId,
      capturedAt,
      fields: params.fields,
      values: params.values,
      evidences: (params.evidences ?? []).map((e) => ({
        fieldId: e.fieldId,
        storagePath: e.storagePath,
        publicUrl: e.publicUrl,
        fileType: e.fileType,
        fileSizeBytes: e.fileSizeBytes,
        metadata: e.metadata,
      })),
      metadata: {
        transactionId,
        correlationId,
        clientRequestId: metadata.clientRequestId,
        draftSnapshotId: metadata.draftSnapshotId,
      },
    });

    pushEvent("payload_built", { valueCount: params.fields.length });

    const draftState: RuntimeDraftSnapshotState = { draft, metadata, payload };

    // Persistence boundary call (mock / no real adapter yet)
    pushEvent("persistence_started", { kind: params.kind });

    try {
      const result = await params.persistence.submit(payload);

      pushEvent(result.success ? "persistence_succeeded" : "persistence_failed", {
        retryable: result.retryable,
        responseId: result.responseId,
        error: result.error,
      });

      if (!result.success && result.retryable) {
        // Retry-ready semantics: compensation/queued retry are handled by upper layers later.
        pushEvent("compensation_enqueued", { retryable: result.retryable });
      }

      pushEvent("completed", { success: result.success });
      return { result, events, draftState };
    } catch (err) {
      // Non-contract exception -> treat as retryable (network-style by default)
      const result: TransactionResult = {
        success: false,
        retryable: true,
        transactionId,
        error: {
          code: "UNKNOWN",
          message: err instanceof Error ? err.message : "Unknown persistence failure",
          retryable: true,
        },
      };

      pushEvent("persistence_failed", { retryable: true, error: result.error });
      pushEvent("compensation_enqueued", { retryable: true });
      pushEvent("completed", { success: false });

      return { result, events, draftState };
    }
  }
}
