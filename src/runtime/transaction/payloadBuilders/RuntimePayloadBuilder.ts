import type { FieldContract, RuntimeValue } from "../../types/runtimeContracts";
import type {
  SubmitTransactionPayload,
  TransactionEvidenceItem,
  TransactionValueEavItem,
  TransactionDraftSnapshot,
} from "../contracts/transactionContracts";

export type PayloadBuildParams = {
  kind: "submit";
  formId: string;
  userId: string;
  capturedAt: string;

  values: Record<string, RuntimeValue>;
  fields: FieldContract[];

  evidences?: TransactionEvidenceItem[];
  metadata: {
    transactionId: string;
    correlationId: string;
    clientRequestId?: string;
    draftSnapshotId?: string;
  };
};

/**
 * RuntimePayloadBuilder (Sprint 5)
 * - Pure builder only (no persistence, no adapters)
 * - Deterministic EAV mapping responsibilities live here
 */
export class RuntimePayloadBuilder {
  static buildSubmitPayload(params: PayloadBuildParams): SubmitTransactionPayload {
    const valuesEav = params.fields
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((field) => {
        const raw = params.values[field.id];

        const valueEav: TransactionValueEavItem = {
          fieldId: field.id,
          fieldType: field.fieldType,
          value: RuntimePayloadBuilder.toValueEav(field, raw),
        };

        return valueEav;
      });

    return {
      kind: "submit",
      formId: params.formId,
      userId: params.userId,
      capturedAt: params.capturedAt,
      metadata: {
        transactionId: params.metadata.transactionId,
        correlationId: params.metadata.correlationId,
        clientRequestId: params.metadata.clientRequestId,
        draftSnapshotId: params.metadata.draftSnapshotId,
      },
      values: valuesEav,
      evidences: params.evidences ?? [],
    };
  }

  /**
   * Draft snapshot -> values used for payload on retry (no side effects)
   */
  static draftToPayloadValues(draft: TransactionDraftSnapshot): Record<string, RuntimeValue> {
    return draft.values;
  }

  private static toValueEav(field: FieldContract, raw: RuntimeValue): TransactionValueEavItem["value"] {
    if (raw === null || raw === undefined) {
      return { kind: "null", valueNull: null };
    }

    // Basic enterprise mapping (no deep coercion yet).
    // Future: normalize types based on fieldType + options
    switch (field.fieldType) {
      case "boolean":
        return { kind: "boolean", valueBoolean: Boolean(raw) };

      case "number":
        // If user passes string, attempt best-effort numeric conversion.
        if (typeof raw === "number") return { kind: "number", valueNumeric: raw };
        if (typeof raw === "string") {
          const n = Number(raw);
          return { kind: "number", valueNumeric: Number.isFinite(n) ? n : NaN };
        }
        return { kind: "number", valueNumeric: NaN };

      case "text":
      case "textarea":
      case "signature":
      case "file_upload":
        return { kind: "text", valueText: typeof raw === "string" ? raw : JSON.stringify(raw) };

      case "select":
        return { kind: "text", valueText: typeof raw === "string" ? raw : JSON.stringify(raw) };

      case "table":
        return { kind: "json", valueJson: raw };

      default:
        // Unknown field types: preserve best-effort as json/text
        return { kind: "json", valueJson: raw };
    }
  }
}
