/**
 * FormRuntimeResolver (Sprint 30)
 * Runtime resolver for resolved FormDefinition → RuntimeFormModel.
 */

import type { FormDefinition } from "../contracts/FormContracts";
import { FormRegistry } from "../registry/FormRegistry";
import type { RuntimeFormModel } from "./FormRuntimeContracts";

export type FormRuntimeResolver = {
  resolve(formId: string): RuntimeFormModel | undefined;
  has(formId: string): boolean;
};

const toRuntimeModel = (form: FormDefinition): RuntimeFormModel => {
  return {
    formId: form.id,
    formName: form.name,
    layoutId: form.layoutId,
    fieldIds: form.fieldIds,
    ruleIds: form.ruleIds ?? [],
  };
};

export const FormRuntimeResolver: FormRuntimeResolver = {
  resolve(formId: string): RuntimeFormModel | undefined {
    const form = FormRegistry.get(formId);
    if (!form) return undefined;
    return toRuntimeModel(form);
  },

  has(formId: string): boolean {
    return FormRegistry.has(formId);
  },
};

