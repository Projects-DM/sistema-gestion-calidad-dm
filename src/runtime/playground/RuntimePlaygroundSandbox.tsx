import React, { useMemo, useState } from "react";
import { RuntimeProvider, useRuntime } from "../context/RuntimeContext";
import { RuntimeRendererBase } from "../renderer/RuntimeRendererBase";
import type { RuntimeValue } from "../types/runtimeContracts";
import type { RuntimeFormSchemaInput } from "../schema/contracts/runtimeSchemaContracts";
import { RuntimeSchemaParser } from "../schema/parser/RuntimeSchemaParser";
import type { FieldContract } from "../types/runtimeContracts";
import { RuntimeSubmitFacade } from "../transaction/submit/RuntimeSubmitFacade";
import { InMemorySaveLifecycleEventDispatcher } from "../eventing/SaveLifecycleEventDispatcher";
import { SupabaseRuntimeAdapter } from "../persistence/adapters/SupabaseRuntimeAdapter";

function useSandboxSchemaInput(): RuntimeFormSchemaInput {
  return useMemo<RuntimeFormSchemaInput>(
    () => ({
      code: "sandbox",
      name: "Runtime Sandbox - Visual Core",
      engineType: "BaseChecklist",
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

        // Hidden field smoke-test (Sprint 3 expects SchemaNormalizer to respect hidden)
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
      security: {
        requiresStorage: false,
        offlineReady: true,
      },
      aiIntegration: {
        compatibleIa: false,
        iaTags: [],
      },
      workflowConfig: {
        requiresApproval: false,
        requiresSignature: false,
        verifierRole: "calidad",
        allowedRoles: ["admin", "quality", "operativo"],
      },
    }),
    []
  );
}

function PlaygroundInner(props: { disabled: boolean }) {
  const { actions, snapshot } = useRuntime();
  const { disabled } = props;

  const [submitState, setSubmitState] = useState<{
    loading: boolean;
    lastResult?: { success: boolean; responseId?: string };
    lastError?: string;
  }>({ loading: false });

  React.useEffect(() => {
    actions.setDisabled(disabled);
  }, [actions, disabled]);

  // minimal "validationErrors base" smoke test (visual-only)
  React.useEffect(() => {
    const temp = snapshot.values["f-number-1"];
    const tempNum = typeof temp === "number" ? temp : temp === "" ? null : Number(temp);
    if (tempNum != null && Number.isFinite(tempNum) && tempNum < 0) {
      actions.setValidationError("f-number-1", "Temperatura mínima: 0");
    } else {
      actions.setValidationError("f-number-1", undefined);
    }
  }, [actions, snapshot.values]);

  const handleSubmitSmoke = async () => {
    setSubmitState({ loading: true });

    try {
      const dispatcher = new InMemorySaveLifecycleEventDispatcher();
      let capturedEvents = 0;
      dispatcher.subscribe((events) => {
        capturedEvents += events.length;
      });

      // Smoke submit: uses runtime facade + persistence adapter (Supabase adapter is ONLY adapter boundary)
      const adapter = new SupabaseRuntimeAdapter();

      const fields: FieldContract[] = snapshot.form.fields;
      const userId = "playground_user";
      const formId = snapshot.form.id;

      const facadeResult = await RuntimeSubmitFacade.submit({
        kind: "submit",
        formId,
        userId,
        fields,
        values: snapshot.values,
        evidences: [],
        clientRequestId: `playground_${Date.now()}`,
        persistence: adapter,
        eventDispatcher: async (events) => {
          // dispatch into runtime dispatcher (best-effort)
          await dispatcher.dispatch(events);
        },
      });

      setSubmitState({
        loading: false,
        lastResult: { success: facadeResult.result.success, responseId: facadeResult.result.responseId },
        lastError: undefined,
      });
    } catch (err) {
      setSubmitState({
        loading: false,
        lastError: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  return (
    <div className="space-y-4">
      <RuntimeRendererBase form={snapshot.form} groupBy={undefined} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmitSmoke}
          disabled={submitState.loading}
          className="px-4 py-2 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
        >
          {submitState.loading ? "Enviando..." : "Smoke Submit (Runtime Facade)"}
        </button>

        {submitState.lastResult && (
          <div className="text-sm text-gray-700">
            Resultado:{" "}
            <span className={submitState.lastResult.success ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
              {submitState.lastResult.success ? "OK" : "FAIL"}
            </span>
          </div>
        )}

        {submitState.lastError && <div className="text-sm text-red-700">{submitState.lastError}</div>}
      </div>
    </div>
  );
}

export function RuntimePlaygroundSandbox() {
  const schemaInput = useSandboxSchemaInput();
  const [disabled, setDisabled] = useState(false);

  // Sprint 3 pipeline: schema -> parser -> normalized defaults -> runtime model -> provider state
  const runtimeModel = useMemo(() => {
    const parser = new RuntimeSchemaParser({ strict: false });
    return parser.parse(schemaInput);
  }, [schemaInput]);

  const initialValues = runtimeModel.initialValues as Record<string, RuntimeValue>;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Runtime Sandbox (Schema→Runtime Pipeline)</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
          Readonly/Disabled (runtime)
        </label>
      </div>

      <RuntimeProvider form={runtimeModel.formContract} initialValues={initialValues} initialDisabled={disabled}>
        <PlaygroundInner disabled={disabled} />
      </RuntimeProvider>
    </div>
  );
}
