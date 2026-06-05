/**
 * FormRegistry (Sprint 29)
 * In-memory registry for FormDefinition.
 */

import type { FormDefinition } from "../contracts/FormContracts";

const registry = new Map<string, FormDefinition>();

export type RegisterFormInput = FormDefinition;

export const FormRegistry = {
  register(form: RegisterFormInput): void {
    registry.set(form.id, form);
  },

  get(formId: string): FormDefinition | undefined {
    return registry.get(formId);
  },

  has(formId: string): boolean {
    return registry.has(formId);
  },

  getAll(): FormDefinition[] {
    return Array.from(registry.values());
  },
};

