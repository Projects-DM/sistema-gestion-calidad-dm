import type { FieldContract, RuntimeFieldType, RuntimeValue } from "../../types/runtimeContracts";
import type { ValidationMessage, ValidationResult } from "../contracts/validationContracts";
import { DefaultValidationMessages } from "../formatters/validationMessageFormatter";

/**
 * Helper: get label for standardized messages
 */
function labelOf(field: FieldContract): string | undefined {
  return field.label ?? field.name;
}

function isEmptyValue(value: RuntimeValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

function coerceNumber(value: RuntimeValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    if (value.trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isValidType(fieldType: RuntimeFieldType, value: RuntimeValue): boolean {
  switch (fieldType) {
    case "boolean":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number" || (typeof value === "string" && value.trim() !== "");
    case "select":
    case "text":
    case "textarea":
    case "signature":
    case "file_upload":
      return typeof value === "string";
    case "table":
      return Array.isArray(value);
    default:
      // unknown field types: accept as-is
      return true;
  }
}

/**
 * Apply L1/L2 schema-driven rules for a single field.
 * (No workflow/business/evidence rules yet.)
 */
export function validateFieldSchemaRules(params: {
  field: FieldContract;
  value: RuntimeValue;
}): ValidationMessage[] {
  const { field, value } = params;
  const messages: ValidationMessage[] = [];

  const label = labelOf(field);

  // L1: required / nullability
  if (field.required && isEmptyValue(value)) {
    messages.push(DefaultValidationMessages.required(label));
    // If empty, stop further checks to avoid noisy UX
    return messages;
  }

  // If value is empty and not required, skip type/bounds
  if (isEmptyValue(value)) return messages;

  // L1: type compatibility (basic)
  if (!isValidType(field.fieldType, value)) {
    messages.push(DefaultValidationMessages.type(label));
    // continue to bounds only if number can be coerced
  }

  // L2: bounds / ranges (numeric)
  const min = field.options?.min;
  const max = field.options?.max;
  if (field.fieldType === "number" && (typeof min === "number" || typeof max === "number")) {
    const n = coerceNumber(value);
    if (n == null) return messages;

    if (typeof min === "number" && n < min) {
      messages.push(DefaultValidationMessages.min(label, min));
    }
    if (typeof max === "number" && n > max) {
      messages.push(DefaultValidationMessages.max(label, max));
    }
  }

  // L2: string length
  const minLength = field.options?.minLength;
  const maxLength = field.options?.maxLength;
  if ((field.fieldType === "text" || field.fieldType === "textarea") && (typeof minLength === "number" || typeof maxLength === "number")) {
    if (typeof value === "string") {
      if (typeof minLength === "number" && value.length < minLength) {
        messages.push(DefaultValidationMessages.minLength(label, minLength));
      }
      if (typeof maxLength === "number" && value.length > maxLength) {
        messages.push(DefaultValidationMessages.maxLength(label, maxLength));
      }
    }
  }

  // L2: pattern (regex/pattern)
  // FieldOptions currently doesn't define pattern, but we support options.pattern as best-effort.
  const pattern = (field.options as any)?.pattern as string | undefined;
  if (pattern && typeof value === "string") {
    try {
      const re = new RegExp(pattern);
      if (!re.test(value)) {
        messages.push(DefaultValidationMessages.pattern(label));
      }
    } catch {
      // invalid regex metadata: ignore to keep resiliency
    }
  }

  // L2: allowed values
  const choices = field.options?.choices;
  if ((field.fieldType === "select" || field.fieldType === "text") && Array.isArray(choices) && choices.length > 0 && typeof value === "string") {
    if (!choices.includes(value)) {
      messages.push(DefaultValidationMessages.allowedValues(label));
    }
  }

  return messages;
}
