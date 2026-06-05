/**
 * FormRuntimeHost.tsx (Sprint 33)
 * Runtime integration host: RuntimeBuilder -> FormRendererEngine.
 */

import React from "react";

import type { LayoutDefinition } from "../../layout/contracts/LayoutContracts";
import type { RuntimeValue } from "../../types/runtimeContracts";

import { FormRendererEngine } from "../../form/engine/FormRendererEngine";

import type { FormRuntimeHostProps } from "../contracts/RuntimeHostContracts";
import { getRuntimeBuilder } from "../../builder/provider/RuntimeBuilderProvider";

import type { RuntimeResolvedForm } from "../../builder/contracts/RuntimeBuilderContracts";

const resolveLayout = (layout: LayoutDefinition | undefined): LayoutDefinition | undefined => {
  // Sprint 33 explicitly forbids layout loading.
  return layout;
};

export const FormRuntimeHost: React.FC<FormRuntimeHostProps> = ({
  formId,
  formData,
  onChange,
  disabled,
  errors,
}) => {
  const builder = getRuntimeBuilder();
  const resolved: RuntimeResolvedForm | undefined = builder.resolve(formId);

  const layout = resolveLayout(resolved?.layout);

  if (!resolved || !layout) {
    return null;
  }

  return (
    <FormRendererEngine
      layout={layout}
      formData={resolvedFieldsToFormData(resolved, formData)}
      onChange={onChange}
      disabled={disabled}
      errors={errors}
    />
  );
};

const resolvedFieldsToFormData = (
  resolved: RuntimeResolvedForm,
  baseFormData: Record<string, unknown>
): Record<string, unknown> => {
  // LayoutEngine currently expects field definitions inside formData under __fieldDefs.
  // This host injects that compatibility object without implementing persistence/business logic.
  const __fieldDefs: Record<string, unknown> = {};

  for (const field of resolved.fields) {
    __fieldDefs[field.id] = {
      id: field.id,
      name: field.id,
      label: field.label,
      required: field.required,
      orderIndex: 0,
      fieldType: field.fieldType,
      options: field.options ?? {},
      hidden: false,
      readonly: false,
    };
  }

  return {
    ...baseFormData,
    __fieldDefs,
  };
};

export default FormRuntimeHost;

