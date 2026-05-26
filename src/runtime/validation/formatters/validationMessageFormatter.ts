import type { ValidationMessage, ValidationSeverity } from "../contracts/validationContracts";

export type ValidationMessageSpec = {
  code: string;
  message: string; // already standardized, but keep formatter contract for future i18n
  severity: ValidationSeverity;
};

export function toValidationMessage(spec: ValidationMessageSpec): ValidationMessage {
  return {
    code: spec.code,
    message: spec.message,
    severity: spec.severity,
  };
}

export const DefaultValidationMessages = {
  required: (label: string | undefined) => ({
    code: "VALIDATION_REQUIRED",
    message: `“${label ?? "Campo"}” es obligatorio`,
    severity: "error" as const,
  }),

  type: (label: string | undefined) => ({
    code: "VALIDATION_TYPE_INVALID",
    message: `“${label ?? "Campo"}” tiene un formato inválido`,
    severity: "error" as const,
  }),

  min: (label: string | undefined, min: number) => ({
    code: "VALIDATION_MIN",
    message: `“${label ?? "Campo"}” debe ser ≥ ${min}`,
    severity: "error" as const,
  }),

  max: (label: string | undefined, max: number) => ({
    code: "VALIDATION_MAX",
    message: `“${label ?? "Campo"}” debe ser ≤ ${max}`,
    severity: "error" as const,
  }),

  minLength: (label: string | undefined, min: number) => ({
    code: "VALIDATION_MIN_LENGTH",
    message: `“${label ?? "Campo"}” debe tener al menos ${min} caracteres`,
    severity: "error" as const,
  }),

  maxLength: (label: string | undefined, max: number) => ({
    code: "VALIDATION_MAX_LENGTH",
    message: `“${label ?? "Campo"}” debe tener máximo ${max} caracteres`,
    severity: "error" as const,
  }),

  pattern: (label: string | undefined) => ({
    code: "VALIDATION_PATTERN",
    message: `“${label ?? "Campo"}” no cumple el formato requerido`,
    severity: "error" as const,
  }),

  allowedValues: (label: string | undefined) => ({
    code: "VALIDATION_ALLOWED_VALUES",
    message: `“${label ?? "Campo"}” contiene un valor no permitido`,
    severity: "error" as const,
  }),
};

export function formatMessages(messages: ValidationMessageSpec[]): ValidationMessage[] {
  return messages.map(toValidationMessage);
}
