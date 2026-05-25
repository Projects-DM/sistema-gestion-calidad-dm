import React, { useMemo, useState } from "react";
import { RuntimeProvider, useRuntime } from "../context/RuntimeContext";
import { RuntimeRendererBase } from "../renderer/RuntimeRendererBase";
import type { FormContract, RuntimeValue } from "../types/runtimeContracts";

function useSandboxFormContract(): FormContract {
  return useMemo<FormContract>(
    () => ({
      id: "sandbox-form-id",
      code: "sandbox",
      name: "Runtime Sandbox - Visual Core",
      engineType: "BaseChecklist",
      workflowConfig: {
        requiresApproval: false,
        requiresSignature: false,
        verifierRole: "calidad",
        allowedRoles: ["admin", "quality", "operativo"],
      },
      security: {
        requiresStorage: false,
        offlineReady: true,
      },
      aiIntegration: {
        compatibleIa: false,
        iaTags: [],
      },
      fields: [
        {
          id: "f-boolean-1",
          name: "area_recepcion",
          label: "Área de Recepción limpia (Cumple)",
          required: true,
          orderIndex: 1,
          fieldType: "boolean",
          options: {},
        },
        {
          id: "f-number-1",
          name: "temperatura",
          label: "Temperatura (°C)",
          required: true,
          orderIndex: 2,
          fieldType: "number",
          options: { unit: "°C", min: 0, max: 100, step: 0.1, placeholder: "0.0" },
        },
        {
          id: "f-text-1",
          name: "observaciones",
          label: "Observaciones",
          required: false,
          orderIndex: 3,
          fieldType: "textarea",
          options: { maxLength: 500, placeholder: "Ingrese observaciones..." },
        },
        {
          id: "f-select-1",
          name: "turno",
          label: "Turno",
          required: false,
          orderIndex: 4,
          fieldType: "select",
          options: { choices: ["Mañana", "Tarde", "Noche"], placeholder: "Seleccione..." },
        },

        // Hidden field validation wiring smoke-test (Sprint 2 requirement)
        {
          id: "f-hidden-1",
          name: "hidden_example",
          label: "Campo oculto (no debe renderizarse)",
          required: false,
          orderIndex: 5,
          fieldType: "text",
          hidden: true,
          options: { placeholder: "no visible" },
        },
      ],
    }),
    []
  );
}

function PlaygroundInner(props: { disabled: boolean; initialValues: Record<string, RuntimeValue> }) {
  const { actions, snapshot } = useRuntime();
  const { disabled, initialValues } = props;

  // Sync provider disabled state with local toggle
  React.useEffect(() => {
    actions.setDisabled(disabled);
  }, [actions, disabled]);

  // minimal "validationErrors base" smoke test
  React.useEffect(() => {
    // Example: if temperature is non-empty but less than 0 (local-only), set error
    const temp = snapshot.values["f-number-1"];
    const tempNum = typeof temp === "number" ? temp : temp === "" ? null : Number(temp);
    if (tempNum != null && Number.isFinite(tempNum) && tempNum < 0) {
      actions.setValidationError("f-number-1", "Temperatura mínima: 0");
    } else {
      actions.setValidationError("f-number-1", undefined);
    }
  }, [actions, snapshot.values]);

  return (
    <RuntimeRendererBase
      form={snapshot.form}
      // LayoutRendererBase pulls values from context via useRuntimeField()
      groupBy={undefined}
    />
  );
}

export function RuntimePlaygroundSandbox() {
  const form = useSandboxFormContract();
  const [disabled, setDisabled] = useState(false);

  const initialValues = useMemo<Record<string, RuntimeValue>>(
    () => ({
      "f-boolean-1": false,
      "f-number-1": "",
      "f-text-1": "",
      "f-select-1": "",
      "f-hidden-1": "",
    }),
    []
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Runtime Sandbox (State Integrated)</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
          Readonly/Disabled (runtime)
        </label>
      </div>

      <RuntimeProvider form={form} initialValues={initialValues} initialDisabled={disabled}>
        <PlaygroundInner disabled={disabled} initialValues={initialValues} />
      </RuntimeProvider>
    </div>
  );
}
