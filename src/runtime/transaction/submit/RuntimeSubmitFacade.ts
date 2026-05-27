import type { FieldContract, RuntimeValue } from "../../types/runtimeContracts";
import type {
  CorrelationId,
  SaveLifecycleEvent,
  SubmitTransactionPayload,
  TransactionDraftSnapshot,
  TransactionKind,
  TransactionMetadata,
  TransactionResult,
} from "../contracts/transactionContracts";
import type { IRuntimePersistenceLayer } from "../persistence/PersistenceBoundary";
import { RuntimeSaveOrchestrator } from "../orchestrators/RuntimeSaveOrchestrator";
import { SaveStateMachine, type SaveState } from "../state/SaveStateMachine";

export type RuntimeSubmitFacadeParams = {
  kind: TransactionKind;
  formId: string;
  userId: string;

  fields: FieldContract[];
  values: Record<string, RuntimeValue>;

  evidences?: Array<{
    storagePath: string;
    fileType?: string;
    fileSizeBytes?: number;
    publicUrl?: string;
    fieldId?: string;
    metadata?: Record<string, unknown>;
  }>;

  clientRequestId?: string;

  persistence: IRuntimePersistenceLayer;

  /**
   * Optional dependency injection: dispatch events only in runtime memory.
   */
  eventDispatcher?: (events: SaveLifecycleEvent[]) => void | Promise<void>;
};

export type RuntimeSubmitFacadeResult = {
  result: TransactionResult;
  draftState: {
    draft: TransactionDraftSnapshot;
    metadata: TransactionMetadata;
    payload: SubmitTransactionPayload;
  };
  events: SaveLifecycleEvent[];
  saveState: SaveState;
};

/**
 * RuntimeSubmitFacade
 * - Centralizes submit orchestration lifecycle in runtime.
 * - Uses existing contracts:
 *   - RuntimeSaveOrchestrator
 *   - SaveStateMachine
 *   - transactionContracts (payload, events, result)
 * - Does NOT introduce persistence/UI logic outside boundaries.
 */
export class RuntimeSubmitFacade {
  static async submit(params: RuntimeSubmitFacadeParams): Promise<RuntimeSubmitFacadeResult> {
    const { events, result, draftState } = await RuntimeSaveOrchestrator.save({
      kind: params.kind,
      formId: params.formId,
      userId: params.userId,
      fields: params.fields,
      values: params.values,
      evidences: (params.evidences ?? []).map((e) => ({
        storagePath: e.storagePath,
        publicUrl: e.publicUrl,
        fileType: e.fileType,
        fileSizeBytes: e.fileSizeBytes,
        fieldId: e.fieldId,
        metadata: e.metadata,
      })),
      clientRequestId: params.clientRequestId,
      persistence: params.persistence,
    });

    const saveState = SaveStateMachine.reduce(events);

    if (params.eventDispatcher) {
      await params.eventDispatcher(events);
    }

    return {
      result,
      events,
      draftState,
      saveState,
    };
  }
}
