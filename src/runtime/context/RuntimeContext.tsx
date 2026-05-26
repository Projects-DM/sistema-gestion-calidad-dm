import React, { createContext, useContext, useMemo, useState } from "react";
import type {
  FormContract,
  RuntimeContextSnapshot,
  RuntimeFieldType,
  RuntimeValue,
  RuntimeUIState,
  ValidationErrorMap,
  FieldContract,
} from "../types/runtimeContracts";

import { FieldValidationOrchestrator } from "../validation/orchestrators/FieldValidationOrchestrator";

export type RuntimeActions = {
  /**
   * Sprint 2: canonical field mutation
   */
  updateFieldValue: (fieldId: string, value: RuntimeValue) => void;

  /**
   * Backward-compatible alias for earlier Sprint 1 wiring.
   */
  setValue: (fieldId: string, value: RuntimeValue) => void;

  /**
   * Legacy escape hatch for non-engine validations (playground smoke tests).
   * Sprint 4 uses orchestrator to set validation errors automatically.
   */
  setValidationError: (fieldId: string, message?: string) => void;
  setDisabled: (disabled: boolean) => void;
};

export type RuntimeProviderProps = {
  form: FormContract;
  initialValues?: Record<string, RuntimeValue>;
  initialDisabled?: boolean;
  initialUIState?: Partial<RuntimeUIState>;
};

const defaultUIState: RuntimeUIState = {
  loading: false,
  saving: false,
  evidenceRequired: false,
  activeTab: undefined,
};

const RuntimeContext = createContext<{
  snapshot: RuntimeContextSnapshot;
  actions: RuntimeActions;
} | null>(null);

export function RuntimeProvider({
  form,
  initialValues,
  initialDisabled = false,
  initialUIState,
  children,
}: React.PropsWithChildren<RuntimeProviderProps>) {
  const [values, setValues] = useState<Record<string, RuntimeValue>>(
    () => initialValues ?? Object.fromEntries(form.fields.map((f) => [f.id, getDefaultValueForFieldType(f.fieldType)]))
  );
  const [validationErrors, setValidationErrors] = useState<ValidationErrorMap>({});
  const [disabled, setDisabledState] = useState<boolean>(initialDisabled);
  const [uiState, setUIState] = useState<RuntimeUIState>(() => ({
    ...defaultUIState,
    ...(initialUIState ?? {}),
  }));

  const orchestrator = useMemo(() => FieldValidationOrchestrator.create(), []);

  const updateFieldValue = (fieldId: string, value: RuntimeValue) => {
    setValues((prev) => {
      // Avoid unnecessary state updates to prevent extra renders
      if (prev[fieldId] === value) return prev;

      const nextValues = { ...prev, [fieldId]: value };

      // Reactive validation: field change -> validation -> validationErrors update
      const fieldDef: FieldContract | undefined = form.fields.find((f) => f.id === fieldId);
      if (fieldDef) {
        const result = orchestrator.validateField({
          field: fieldDef,
          value,
          allValues: nextValues,
          disabled,
        });

        setValidationErrors((prevErrs) => {
          const nextErrs = { ...prevErrs };

          if (!result.isValid && result.errors.length > 0) {
            // Store only the first error message for UI simplicity (Sprint 2 contract).
            // Future: store multi-error structure via a richer UI model.
            nextErrs[fieldId] = result.errors[0].message;
          } else {
            delete nextErrs[fieldId];
          }

          return nextErrs;
        });
      }

      return nextValues;
    });
  };

  const setValue = (fieldId: string, value: RuntimeValue) => {
    updateFieldValue(fieldId, value);
  };

  const setValidationError = (fieldId: string, message?: string) => {
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (!message) delete next[fieldId];
      else next[fieldId] = message;
      return next;
    });
  };

  const setDisabled = (nextDisabled: boolean) => {
    setDisabledState(nextDisabled);
  };

  const snapshot = useMemo<RuntimeContextSnapshot>(
    () => ({
      form,
      values,
      evidences: [],
      validationErrors,
      uiState,
      disabled,
    }),
    [form, values, validationErrors, uiState, disabled]
  );

  const actions = useMemo<RuntimeActions>(
    () => ({
      updateFieldValue,
      setValue,
      setValidationError,
      setDisabled,
    }),
    [updateFieldValue]
  );

  return <RuntimeContext.Provider value={{ snapshot, actions }}>{children}</RuntimeContext.Provider>;
}

export function useRuntime() {
  const ctx = useContext(RuntimeContext);
  if (!ctx) throw new Error("useRuntime must be used within <RuntimeProvider>.");
  return ctx;
}

function getDefaultValueForFieldType(fieldType: RuntimeFieldType): RuntimeValue {
  switch (fieldType) {
    case "boolean":
      return false;
    case "number":
      return "";
    case "select":
    case "text":
    case "textarea":
    case "date":
    case "time":
    case "signature":
    case "file_upload":
      return "";
    case "table":
      return [];
    default:
      return "";
  }
}
