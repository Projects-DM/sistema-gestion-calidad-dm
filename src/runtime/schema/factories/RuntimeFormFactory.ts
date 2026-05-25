import type {
  RuntimeFieldSchemaInput,
  RuntimeFormModel,
} from "../contracts/runtimeSchemaContracts";
import type { FieldContract, FormContract, RuntimeValue, ValidationErrorMap } from "../../types/runtimeContracts";
import { SchemaNormalizer } from "../normalization/SchemaNormalizer";

type NormalizedFormInput = {
  engineType?: FormContract["engineType"];
  code?: string;
  name?: string;
  workflowConfig?: FormContract["workflowConfig"];
  security?: FormContract["security"];
  aiIntegration?: FormContract["aiIntegration"];
  groupByKey?: string;
  fields: FieldContract[];
  strict: boolean;
};

function defaultInitialValueForField(field: FieldContract): RuntimeValue {
  switch (field.fieldType) {
    case "boolean":
      return false;
    case "number":
      return "";
    case "table":
      return [];
    default:
      return "";
  }
}

/**
 * RuntimeFormFactory (Sprint 3):
 * Builds a rendering-ready RuntimeFormModel from normalized schema inputs.
 * - NO parsing
 * - NO React
 * - NO persistence / workflow / offline / adapters
 */
export class RuntimeFormFactory {
  static createRuntimeFormModel(normalized: NormalizedFormInput): RuntimeFormModel {
    const initialValues: Record<string, RuntimeValue> = {};

    for (const field of normalized.fields) {
      initialValues[field.id] = defaultInitialValueForField(field);
    }

    const validationErrors: ValidationErrorMap = {};

    const formContract: FormContract = {
      id: String((normalized as any).code ?? "runtime-form-id"),
      code: String(normalized.code ?? "RUNTIME"),
      name: String(normalized.name ?? "Runtime Form"),
      engineType: (normalized.engineType ?? ("BaseGeneric" as any)) as FormContract["engineType"],
      workflowConfig: normalized.workflowConfig ?? {
        requiresApproval: false,
        requiresSignature: false,
        verifierRole: "calidad",
        allowedRoles: ["admin", "quality", "operativo"],
      },
      security: normalized.security ?? {
        requiresStorage: false,
        offlineReady: true,
      },
      aiIntegration: normalized.aiIntegration ?? {
        compatibleIa: false,
        iaTags: [],
      },
      fields: normalized.fields,
    };

    return {
      formContract,
      normalizedFields: normalized.fields,
      initialValues,
      validationErrors,
    };
  }

  /**
   * Convenience: one-shot pipeline without coupling parser.
   * (Not used by RuntimeSchemaParser to keep boundaries strict.)
   */
  static fromSchemaInput(schema: {
    engineType?: RuntimeFormModel["formContract"]["engineType"];
    code?: string;
    name?: string;
    workflowConfig?: any;
    security?: any;
    aiIntegration?: any;
    groupByKey?: string;
    fields?: RuntimeFieldSchemaInput[];
    strict?: boolean;
  }): RuntimeFormModel {
    const normalized = SchemaNormalizer.normalizeForm({
      engineType: schema.engineType,
      code: schema.code,
      name: schema.name,
      workflowConfig: schema.workflowConfig,
      security: schema.security,
      aiIntegration: schema.aiIntegration,
      groupByKey: schema.groupByKey,
      fields: schema.fields ?? [],
      strict: Boolean(schema.strict),
    });

    return RuntimeFormFactory.createRuntimeFormModel(normalized);
  }
}
