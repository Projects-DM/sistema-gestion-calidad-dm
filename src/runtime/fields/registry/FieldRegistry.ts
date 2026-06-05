/**
 * FieldRegistry (Sprint 31)
 * In-memory registry for RuntimeFieldDefinition.
 */

import type { RuntimeFieldDefinition } from "../contracts/FieldContracts";

const registry = new Map<string, RuntimeFieldDefinition>();

export type RegisterFieldInput = RuntimeFieldDefinition;

export const FieldRegistry = {
  register(field: RegisterFieldInput): void {
    registry.set(field.id, field);
  },

  get(fieldId: string): RuntimeFieldDefinition | undefined {
    return registry.get(fieldId);
  },

  has(fieldId: string): boolean {
    return registry.has(fieldId);
  },

  getAll(): RuntimeFieldDefinition[] {
    return Array.from(registry.values());
  },
};

