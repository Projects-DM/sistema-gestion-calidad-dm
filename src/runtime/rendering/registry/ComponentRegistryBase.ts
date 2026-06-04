/**
 * ComponentRegistryBase (Sprint 25.1)
 * Contracts only — UI rendering layer typing.
 */

import type { FieldContract, FieldOptions, RuntimeFieldType, RuntimeValue } from "../../types/runtimeContracts";

/**
 * Universal field definition contract.
 *
 * Minimum properties required by Sprint 25 UI layer:
 * - id
 * - name
 * - label
 * - fieldType
 * - required
 * - options
 */
export type FieldDefinition = {
  id: string;
  name: string;
  label: string;
  fieldType: RuntimeFieldType;
  required: boolean;
  options: FieldOptions;
};

/**
 * Shared props for all field components.
 *
 * Note: this is a pure contract; no rendering/orchestration logic.
 */
export type FieldRenderProps = {
  fieldDef: FieldDefinition;
  value: RuntimeValue;
  onChange: (fieldId: string, value: RuntimeValue) => void;
  disabled: boolean;
  error?: string;
};

/**
 * Typed registry contract.
 *
 * Used later by ComponentRegistry to resolve field component types.
 */
export interface FieldTypeRegistry<TComponent> {
  get(fieldType: RuntimeFieldType): TComponent | undefined;
  set(fieldType: RuntimeFieldType, component: TComponent): void;
}

/**
 * Compatibility helper:
 * If the runtime layer already uses FieldContract as its canonical field definition,
 * it should be structurally compatible with FieldDefinition.
 */
export type FieldDefinitionFromRuntime = FieldContract & FieldDefinition;

