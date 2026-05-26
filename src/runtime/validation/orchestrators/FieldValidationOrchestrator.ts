import type { FieldContract, RuntimeValue } from "../../types/runtimeContracts";
import type { ValidationResult, ValidationContext } from "../contracts/validationContracts";
import { ValidationEngine } from "../engine/ValidationEngine";

export class FieldValidationOrchestrator {
  validateField(ctx: ValidationContext): ValidationResult {
    const field = ctx.field;
    const value: RuntimeValue = ctx.value;
    return ValidationEngine.validateField({
      field,
      value,
      allValues: ctx.allValues,
    });
  }

  static create() {
    return new FieldValidationOrchestrator();
  }
}
