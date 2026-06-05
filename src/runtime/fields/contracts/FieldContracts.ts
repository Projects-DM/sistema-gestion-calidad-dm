/**
 * FieldContracts (Sprint 31)
 * Contracts only for runtime field registry.
 */

import type { RuntimeFieldType, FieldOptions } from "../../types/runtimeContracts";

export type RuntimeFieldDefinition = {
  id: string;
  label: string;
  fieldType: RuntimeFieldType;
  required: boolean;
  options?: FieldOptions;
};

