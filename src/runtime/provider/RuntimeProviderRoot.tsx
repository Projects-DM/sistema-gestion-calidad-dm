
import type { FormContract, RuntimeValue } from "../types/runtimeContracts";
import { RuntimeProvider } from "../context/RuntimeContext";
import { RuntimeRendererBase } from "../renderer/RuntimeRendererBase";

export type RuntimeProviderRootProps = {
  form: FormContract;
  initialValues?: Record<string, RuntimeValue>;
  disabled?: boolean;
  validationErrors?: Record<string, string>;
  groupBy?: (field: any) => string;
};

/**
 * Runtime provider architecture (Sprint 1, minimal wiring):
 * - Owns runtime state via RuntimeProvider
 * - Renders RuntimeRendererBase using current state (Sprint 2 will switch to Context snapshot/actions wiring)
 *
 * IMPORTANT: This file intentionally avoids persistence/workflow/validation business logic.
 */
export function RuntimeProviderRoot({
  form,
  initialValues,
  disabled = false,
  validationErrors = {},
  groupBy,
}: RuntimeProviderRootProps) {
  return (
    <RuntimeProvider form={form} initialValues={initialValues} initialDisabled={disabled}>
      <RuntimeRendererBase
        form={form}
        values={initialValues ?? Object.fromEntries(form.fields.map((f) => [f.id, ""]))}
        disabled={disabled}
        validationErrors={validationErrors}
        onChange={() => {
          // Sprint 1 visual core only: state wiring will be tightened in next sprint.
        }}
        groupBy={groupBy}
      />
    </RuntimeProvider>
  );
}
