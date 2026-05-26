import type { FieldContract, RuntimeValue } from "../../types/runtimeContracts";
import type { ValidationMessage, ValidationResult } from "../contracts/validationContracts";
import { validateFieldSchemaRules } from "../rules/fieldRules";

/**
 * ValidationEngine (Sprint 4):
 * Pure synchronous schema validation for a single field.
 * No persistence, no workflow, no async calls.
 */
export class ValidationEngine {
  static validateField(params: { field: FieldContract; value: RuntimeValue; allValues: Record<string, RuntimeValue> }): ValidationResult {
    const { field, value } = params;

    const errors: ValidationMessage[] = validateFieldSchemaRules({ field, value });
    const isValid = errors.length === 0;

    const errorCount = errors.filter((m) => m.severity === "error").length;
    const warningCount = errors.filter((m) => m.severity === "warning").length;

    return {
      fieldId: field.id,
      isValid,
      errors,
      errorCount,
      warningCount,
    };
  }
}
