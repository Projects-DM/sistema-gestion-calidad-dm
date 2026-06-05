/**
 * RuntimeBuilder (Sprint 32)
 * Builds RuntimeResolvedForm from runtime metadata registries.
 */

import type { RuntimeFieldDefinition } from "../../fields/contracts/FieldContracts";
import type { RuntimeResolvedForm } from "../contracts/RuntimeBuilderContracts";

import { FieldRegistry } from "../../fields/registry/FieldRegistry";
import { FormRuntimeResolver } from "../../forms/runtime/FormRuntimeResolver";

import { LayoutResolver } from "../../layout/runtime/LayoutRuntimeResolver";

import { getRuleRuntimeResolver } from "../../rules/runtime/RuleRuntimeProvider";


export type RuntimeBuilder = {
  resolve(formId: string): RuntimeResolvedForm | undefined;
  has(formId: string): boolean;
};

const buildFields = (fieldIds: string[]): RuntimeFieldDefinition[] => {
  const out: RuntimeFieldDefinition[] = [];

  for (const fieldId of fieldIds) {
    const def = FieldRegistry.get(fieldId);
    if (!def) continue;
    out.push(def);
  }

  return out;
};

export const RuntimeBuilder: RuntimeBuilder = {
  resolve(formId: string): RuntimeResolvedForm | undefined {
    const runtimeForm = FormRuntimeResolver.resolve(formId);
    if (!runtimeForm) return undefined;

    return {
      formId: runtimeForm.formId,
      formName: runtimeForm.formName,
      layoutId: runtimeForm.layoutId,
      fieldIds: runtimeForm.fieldIds,
      ruleIds: runtimeForm.ruleIds,
      fields: buildFields(runtimeForm.fieldIds),
      layout: LayoutResolver.resolve(runtimeForm.layoutId),
      rules: runtimeForm.ruleIds.map((ruleId) => getRuleRuntimeResolver().resolve(ruleId)).filter((r): r is import("../../rules/contracts/RuleContracts").FieldRule => r != null),
    };

  },

  has(formId: string): boolean {
    return FormRuntimeResolver.has(formId);
  },
};

