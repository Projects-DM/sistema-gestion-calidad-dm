import type {
  RuntimeFormModel,
  RuntimeFormSchemaInput,
  RuntimeFieldSchemaInput,
  RuntimeSchemaParserOptions,
} from "../contracts/runtimeSchemaContracts";
import { SchemaNormalizer } from "../normalization/SchemaNormalizer";
import { RuntimeFormFactory } from "../factories/RuntimeFormFactory";

/**
 * RuntimeSchemaParser (Sprint 3):
 * - Interpreta esquema runtime (parcial/incompleto)
 * - Aplica normalización/resiliencia mediante SchemaNormalizer
 * - Produce un RuntimeFormModel rendering-ready mediante RuntimeFormFactory
 *
 * IMPORTANT: NO lógica visual React, NO persistence, NO workflow orchestration.
 */
export class RuntimeSchemaParser {
  private options: RuntimeSchemaParserOptions;

  constructor(options: RuntimeSchemaParserOptions = {}) {
    this.options = options;
  }

  parse(schema: RuntimeFormSchemaInput): RuntimeFormModel {
    // 1) Basic extraction
    const rawEngineType = schema.engineType;
    const rawFields: RuntimeFieldSchemaInput[] = schema.fields ?? [];

    // 2) Normalize (resilience)
    const normalized = SchemaNormalizer.normalizeForm({
      engineType: rawEngineType,
      code: schema.code,
      name: schema.name,
      workflowConfig: schema.workflowConfig,
      security: schema.security,
      aiIntegration: schema.aiIntegration,
      groupByKey: schema.groupByKey,
      fields: rawFields,
      strict: Boolean(this.options.strict),
    });

    // 3) Factory: build runtime model + initial values
    return RuntimeFormFactory.createRuntimeFormModel(normalized);
  }
}

/**
 * Note:
 * The normalization+factory are responsible for producing a contract-compliant
 * RuntimeFormModel using runtime/types contracts.
 *
 * Keep this parser as a thin orchestrator (contract-level), not business logic.
 */
