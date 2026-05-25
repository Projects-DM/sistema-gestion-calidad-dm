import React, { useMemo } from "react";
import type { FormContract, RuntimeValue, FieldContract } from "../types/runtimeContracts";
import { LayoutRendererBase } from "./LayoutRendererBase";

export type RuntimeRendererBaseProps = {
  form: FormContract;

  /**
   * Sprint 2: runtime state is bound through useRuntimeField() (inside LayoutRendererBase).
   * These props are kept optional for backward compatibility.
   */
  values?: Record<string, RuntimeValue>;
  disabled?: boolean;
  validationErrors?: Record<string, string>;
  onChange?: (fieldId: string, newValue: RuntimeValue) => void;

  groupBy?: (field: FieldContract) => string;
};

/**
 * RuntimeRendererBase (Sprint 2):
 * - Pure UI layer that turns runtime metadata (form.fields) into layout + dynamic field rendering.
 * - Centralized state wiring happens in LayoutRendererBase/useRuntimeField.
 */
export function RuntimeRendererBase({ form, groupBy }: RuntimeRendererBaseProps) {
  const formFields = useMemo(() => form.fields, [form.fields]);
  return <LayoutRendererBase formFields={formFields} groupBy={groupBy} />;
}
