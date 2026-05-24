import React, { createContext, useContext, useMemo, useState } from "react";
import type {
  FormContract,
  RuntimeContextSnapshot,
  RuntimeFieldType,
  RuntimeValue,
  RuntimeUIState,
  ValidationErrorMap,
} from "../types/runtimeContracts";

export type RuntimeActions = {
  setValue: (fieldId: string, value: RuntimeValue) => void;
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

  const setValue = (fieldId: string, value: RuntimeValue) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
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
      setValue,
      setValidationError,
      setDisabled,
    }),
    []
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
