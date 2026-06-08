import type { RuntimeFieldType } from "../../types/runtimeContracts";

/**
 * FieldTypeNormalizer
 * Sprint 51 (FieldType Compatibility Layer)
 *
 * Normaliza alias históricos de BD hacia un estándar Runtime.
 *
 * Estándar elegido: checkbox, number, file_upload, textarea, multiselect.
 */
export function normalizeFieldType(fieldType: RuntimeFieldType): RuntimeFieldType {
  switch (fieldType) {
    case "boolean":
      return "checkbox";
    case "numeric":
      return "number";
    case "file":
      return "file_upload";
    case "multi_select":
      return "multiselect";
    case "text_area":
      return "textarea";
    default:
      return fieldType;
  }
}

