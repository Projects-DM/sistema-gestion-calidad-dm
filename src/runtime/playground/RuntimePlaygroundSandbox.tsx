import React, { useMemo, useState } from "react";
import { RuntimeProvider } from "../context/RuntimeContext";
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
      ],
    }),
    []
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
    }),
    []
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Runtime Visual Core Sandbox</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
          Disabled (inmutable visual)
        </label>
      </div>

      <RuntimeProvider form={form} initialValues={initialValues} initialDisabled={disabled}>
        <RuntimeRendererBase
          form={form}
          values={initialValues}
          disabled={disabled}
          validationErrors={{}}
          onChange={() => {
            // Sprint 1: playground kept minimal.
            // RuntimeProvider already owns state; RuntimeRendererBase uses values passed in.
            // For a real wiring, we will connect renderer to RuntimeContext snapshot/actions in Sprint 2.
          }}
        />
      </RuntimeProvider>
    </div>
  );
}
