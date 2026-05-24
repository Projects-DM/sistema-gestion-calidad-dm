import React, { useMemo } from "react";
import type { RuntimeValue } from "../types/runtimeContracts";
import type { FormContract, FieldContract } from "../types/runtimeContracts";
import { LayoutRendererBase } from "./LayoutRendererBase";

export type RuntimeRendererBaseProps = {
  form: FormContract;
  values: Record<string, RuntimeValue>;
  disabled: boolean;
  validationErrors?: Record<string, string>;
  onChange: (fieldId: string, newValue: RuntimeValue) => void;
  groupBy?: (field: FieldContract) => string;
};

/**
 * RuntimeRendererBase (Sprint 1):
 * - Pure UI layer that turns runtime state into layout + fields.
 * - No conditional business logic (no evidenceRequired rules here).
 */
export function RuntimeRendererBase({
  form,
  values,
  disabled,
  validationErrors,
  onChange,
  groupBy,
}: RuntimeRendererBaseProps) {
  const formFields = useMemo(() => form.fields, [form.fields]);

  return (
    <LayoutRendererBase
      formFields={formFields}
      values={values}
      disabled={disabled}
      validationErrors={validationErrors}
      onChange={onChange}
      groupBy={groupBy}
    />
  );
}
