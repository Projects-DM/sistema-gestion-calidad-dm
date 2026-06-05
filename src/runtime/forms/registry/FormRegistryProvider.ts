/**
 * FormRegistryProvider (Sprint 29)
 * Simple global accessors for the in-memory FormRegistry.
 */

import type { FormDefinition } from "../contracts/FormContracts";

let formRegistry: Map<string, FormDefinition> | null = null;

export function getFormRegistry(): Map<string, FormDefinition> {
  if (!formRegistry) {
    formRegistry = new Map<string, FormDefinition>();
  }
  return formRegistry;
}

export function setFormRegistry(next: Map<string, FormDefinition>): void {
  formRegistry = next;
}

