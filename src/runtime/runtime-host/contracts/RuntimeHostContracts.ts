/**
 * RuntimeHostContracts (Sprint 33)
 */

export interface FormRuntimeHostProps {
  formId: string;

  formData: Record<string, unknown>;

  onChange: (fieldId: string, value: unknown) => void;

  disabled?: boolean;

  errors?: Record<string, string>;
}

