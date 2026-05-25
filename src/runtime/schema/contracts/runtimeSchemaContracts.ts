import type { FieldContract, FormContract, RuntimeValue, RuntimeFieldType, ValidationErrorMap } from "../../types/runtimeContracts";

export type FieldVisibility = {
  hidden?: boolean;
  readonly?: boolean;
};

export type NormalizationResult = {
  fields: FieldContract[];
  formContract: FormContract;
  initialValues: Record<string, RuntimeValue>;
};

/**
 * Input contracts (from DB metadata / universal schema).
 * Keep permissive to avoid crashes on partial metadata.
 */
export type RuntimeFieldSchemaInput = Partial<Pick<FieldContract, "id" | "name" | "label" | "required" | "orderIndex" | "fieldType" | "options">> & {
  hidden?: boolean;
  readonly?: boolean;

  // Alias support (future DB evolution)
  is_hidden?: boolean;
  is_readonly?: boolean;

  // Engine hints (optional)
  helpText?: string;
  placeholder?: string;
  validation?: ValidationErrorMap | Record<string, unknown>;
};

export type RuntimeFormSchemaInput = Partial<Pick<FormContract, "id" | "code" | "name" | "engineType">> & {
  engineType?: FormContract["engineType"];
  fields?: RuntimeFieldSchemaInput[];

  // Optional workflow/security blocks (kept optional in Sprint 3)
  workflowConfig?: Partial<FormContract["workflowConfig"]>;
  security?: Partial<FormContract["security"]>;
  aiIntegration?: Partial<FormContract["aiIntegration"]>;
  // Optional layout hints
  groupByKey?: string;
};

/**
 * Output contract for the rendering pipeline.
 */
export type RuntimeFormModel = {
  formContract: FormContract;
  normalizedFields: FieldContract[];
  initialValues: Record<string, RuntimeValue>;
  validationErrors: ValidationErrorMap; // base validation errors (empty in Sprint 3)
};

/**
 * Parser options
 */
export type RuntimeSchemaParserOptions = {
  /**
   * If true, parser/normalizer will be strict about required shape.
   * Default false to prioritize resilience.
   */
  strict?: boolean;
};

export type FieldTypeCompatibility = {
  fieldType: RuntimeFieldType;
  /**
   * Whether registry has a renderer for this fieldType.
   * If not, fallback renderer should be used.
   */
  isSupported: boolean;
};
