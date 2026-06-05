/**
 * FormRuntimeHost.tsx (Sprint 33)
 * Runtime integration host: RuntimeBuilder -> FormRendererEngine.
 */


import React from "react";

import { FormRendererEngine } from "../../form/engine/FormRendererEngine";

import type { FormRuntimeHostProps } from "../contracts/RuntimeHostContracts";



import { getRuntimeBuilder } from "../../builder/provider/RuntimeBuilderProvider";

import type { RuntimeResolvedForm } from "../../builder/contracts/RuntimeBuilderContracts";

import { useRulesEngine } from "../../rules/engine/useRulesEngine";

import { getRuleRuntimeResolver } from "../../rules/runtime/RuleRuntimeProvider";

import type { FieldRule } from "../../rules/contracts/RuleContracts";


// Layout resolution moved to RuntimeBuilder (Sprint 41)
// Keeping this helper as a no-op to avoid touching broader host logic.
const resolveLayoutById = (_layoutId: string | undefined): undefined => {
  return undefined;
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

  const resolvedRuleIds: string[] | undefined = resolved?.ruleIds;
  const rules: FieldRule[] = resolvedRuleIds?.length
    ? resolvedRuleIds
        .map((ruleId) => getRuleRuntimeResolver().resolve(ruleId))
        .filter((r): r is FieldRule => r != null)
    : [];

  const { hiddenFields, disabledFields, computedValues } = useRulesEngine({ rules, formData });



  // Sprint 37:
  // hiddenFields and disabledFields
  // will be propagated into LayoutEngine

  const mergedFormData: Record<string, unknown> = {
    ...formData,
    ...computedValues,
  };


  const layout = resolved?.layout;


  void hiddenFields;
  void disabledFields;

  if (!resolved || !layout) {
    return null;
  }


  return (
    <FormRendererEngine
      layout={layout}
      formData={resolvedFieldsToFormData(resolved, mergedFormData)}

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

