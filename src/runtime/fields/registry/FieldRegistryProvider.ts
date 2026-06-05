/**
 * FieldRegistryProvider (Sprint 31)
 * Global accessors for the in-memory FieldRegistry.
 */

import type { RuntimeFieldDefinition } from "../contracts/FieldContracts";

let fieldRegistry: Map<string, RuntimeFieldDefinition> | null = null;

export function getFieldRegistry(): Map<string, RuntimeFieldDefinition> {
  if (!fieldRegistry) {
    fieldRegistry = new Map<string, RuntimeFieldDefinition>();
  }
  return fieldRegistry;
}

export function setFieldRegistry(next: Map<string, RuntimeFieldDefinition>): void {
  fieldRegistry = next;
}

