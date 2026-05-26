import type { RuntimeValue } from "../../types/runtimeContracts";
import type { FieldContract } from "../../types/runtimeContracts";

export type ValidationSeverity = "error" | "warning";

export type FieldValidationState = {
  status: "untouched" | "dirty" | "validating" | "valid" | "invalid";
  severity?: ValidationSeverity;
};

export type ValidationMessage = {
  code: string;
  message: string; // standardized message resolved by formatters layer
  severity: ValidationSeverity;
};

export type ValidationError = {
  fieldId: string;
  messages: ValidationMessage[];
};

export type ValidationResult = {
  fieldId: string;
  isValid: boolean;
  errors: ValidationMessage[];
  warningCount: number;
  errorCount: number;
  fieldState?: FieldValidationState;
};

export type ValidationContext = {
  field: FieldContract;
  value: RuntimeValue;
  allValues: Record<string, RuntimeValue>;
  disabled?: boolean;
  // Keep for future (conditional/business rules)
  // evidence?: unknown[];
};

export type FieldValidationOrchestrator = {
  validateField: (ctx: ValidationContext) => ValidationResult;
};
