import type {
  RuntimeFormSchemaInput,
  RuntimeFieldSchemaInput,
  RuntimeFormModel,
  RuntimeSchemaParserOptions,
} from "../contracts/runtimeSchemaContracts";
import type { FieldContract, FormContract, RuntimeValue, RuntimeFieldType, ValidationErrorMap } from "../../types/runtimeContracts";

export type NormalizedFormInput = {
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

function getDefaultRuntimeValueForFieldType(fieldType: RuntimeFieldType): RuntimeValue {
  switch (fieldType) {
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

export class SchemaNormalizer {
  /**
   * Normaliza un schema incompleto hacia un conjunto de FieldContract + FormContract seguros.
   * No usa React, no usa persistencia.
   */
  static normalizeForm(input: {
    engineType?: RuntimeFormSchemaInput["engineType"];
    code?: RuntimeFormSchemaInput["code"];
    name?: RuntimeFormSchemaInput["name"];
    workflowConfig?: RuntimeFormSchemaInput["workflowConfig"];
    security?: RuntimeFormSchemaInput["security"];
    aiIntegration?: RuntimeFormSchemaInput["aiIntegration"];
    groupByKey?: RuntimeFormSchemaInput["groupByKey"];
    fields: RuntimeFieldSchemaInput[];
    strict: boolean;
  }): NormalizedFormInput {
    const fields: FieldContract[] = (input.fields ?? []).map((f, idx) => {
      const fieldType = (f.fieldType as RuntimeFieldType) ?? ("text" as RuntimeFieldType);

      // Defaults resilient to partial metadata
      const hidden = Boolean(f.hidden ?? f.is_hidden);
      const readonly = Boolean(f.readonly ?? f.is_readonly);

      const orderIndex = typeof f.orderIndex === "number" ? f.orderIndex : idx;

      const normalized: FieldContract = {
        id: String(f.id ?? `f-${idx}`),
        name: String(f.name ?? f.id ?? `field-${idx}`),
        label: String(f.label ?? f.name ?? `Campo ${idx + 1}`),
        required: Boolean(f.required ?? false),
        orderIndex,
        fieldType,
        hidden,
        readonly,
        options: (f.options ?? {}) as FieldContract["options"],
      };

      return normalized;
    });

    const formContract: FormContract = {
      id: String((input as any).id ?? input.code ?? "runtime-form-id"),
      code: String(input.code ?? "RUNTIME"),
      name: String(input.name ?? "Runtime Form"),
      engineType: (input.engineType ?? ("BaseGeneric" as any)) as FormContract["engineType"],
      workflowConfig: {
        requiresApproval: Boolean(input.workflowConfig?.requiresApproval ?? false),
        requiresSignature: Boolean(input.workflowConfig?.requiresSignature ?? false),
        verifierRole: String(input.workflowConfig?.verifierRole ?? "calidad"),
        allowedRoles: (input.workflowConfig?.allowedRoles as string[] | undefined) ?? ["admin", "quality", "operativo"],
      },
      security: {
        requiresStorage: Boolean(input.security?.requiresStorage ?? false),
        offlineReady: Boolean(input.security?.offlineReady ?? true),
      },
      aiIntegration: {
        compatibleIa: Boolean(input.aiIntegration?.compatibleIa ?? false),
        iaTags: (input.aiIntegration?.iaTags as string[] | undefined) ?? [],
      },
      fields,
    };

    return {
      engineType: formContract.engineType,
      code: formContract.code,
      name: formContract.name,
      workflowConfig: formContract.workflowConfig,
      security: formContract.security,
      aiIntegration: formContract.aiIntegration,
      groupByKey: input.groupByKey,
      fields,
      strict: input.strict,
    };
  }
}
