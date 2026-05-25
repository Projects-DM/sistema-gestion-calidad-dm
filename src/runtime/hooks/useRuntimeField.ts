import { useMemo } from "react";
import type { RuntimeValue, RuntimeContextSnapshot, FieldContract } from "../types/runtimeContracts";
import { useRuntime } from "../context/RuntimeContext";

/**
 * useRuntimeField (Sprint 2):
 * - binds a fieldId to runtime snapshot/actions
 * - supports readonly/hidden via runtime metadata + provider disabled
 */
export function useRuntimeField(fieldDef: FieldContract) {
  const { snapshot, actions } = useRuntime();

  const value = snapshot.values[fieldDef.id] as RuntimeValue;

  const error = snapshot.validationErrors[fieldDef.id];
  const disabled = Boolean(snapshot.disabled || fieldDef.readonly);

  const onChange = (newValue: RuntimeValue) => {
    actions.updateFieldValue(fieldDef.id, newValue);
  };

  const hidden = Boolean(fieldDef.hidden);

  // stable return object to reduce rerenders
  return useMemo(
    () => ({
      fieldDef,
      value,
      disabled,
      hidden,
      error,
      onChange,
    }),
    [fieldDef, value, disabled, hidden, error]
  );
}
