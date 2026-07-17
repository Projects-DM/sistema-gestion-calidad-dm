import type {
  SubmitTransactionPayload,
  TransactionResult,
  TransactionValueEavItem,
  TransactionKind,
} from "../../../runtime/transaction/contracts/transactionContracts";
import type { IRuntimePersistenceLayer } from "../../../runtime/transaction/persistence/PersistenceBoundary";
import { PersistenceErrorMapper } from "../errors/PersistenceErrorMapper";
import { dynamicService } from "../../../services/dynamicService";

export class SupabaseRuntimeAdapter implements IRuntimePersistenceLayer {
  readonly kind: TransactionKind = "submit";

  async submit(payload: SubmitTransactionPayload): Promise<TransactionResult> {
    try {
      // dynamicService expects:
      // submitFormResponse(formId, userId, valuesObj, evidencesArray)
      const valuesObj = this.mapValuesEavToFlat(payload.values);

      const evidences = (payload.evidences ?? []).map((ev) => ({
        fieldId: ev.fieldId,
        file_url: ev.publicUrl,
        storage_path: ev.storagePath,
        file_type: ev.fileType,
        file_size_bytes: ev.fileSizeBytes,
        metadata: ev.metadata,
      }));

      const response = await dynamicService.submitFormResponse(
        payload.formId,
        payload.userId,
        valuesObj,
        evidences
      );

      return {
        success: true,
        retryable: false,
        transactionId: payload.metadata.transactionId,
        responseId: response?.id,
      };
    } catch (err) {
      const mapped = PersistenceErrorMapper.mapToContract(err);

      return {
        success: false,
        retryable: mapped.retryable,
        transactionId: payload.metadata.transactionId,
        error: mapped,
      };
    }
  }

  private mapValuesEavToFlat(values?: TransactionValueEavItem[]) {
    const out: Record<string, unknown> = {};
    for (const item of values ?? []) {
      switch (item.value.kind) {
        case "text":
          out[item.fieldId] = item.value.valueText;
          break;
        case "number":
          out[item.fieldId] = item.value.valueNumeric;
          break;
        case "boolean":
          out[item.fieldId] = item.value.valueBoolean;
          break;
        case "json":
          out[item.fieldId] = item.value.valueJson;
          break;
        case "null":
          out[item.fieldId] = null;
          break;
        default:
          out[item.fieldId] = null;
      }
    }
    return out;
  }
}
