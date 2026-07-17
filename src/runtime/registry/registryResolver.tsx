
import type { FieldContract, RuntimeFieldType, RuntimeValue } from "../types/runtimeContracts";
import { componentRegistryBase, type FieldRenderProps } from "./ComponentRegistryBase";

export function getComponentByFieldType(fieldType: RuntimeFieldType) {
  return componentRegistryBase.resolve(fieldType);
}

export function DynamicFieldRenderer(props: FieldRenderProps) {
  const { fieldDef, ...rest } = props;

  return componentRegistryBase.renderField(fieldDef, rest);
}

/**
 * Helper to build consistent FieldRenderProps from runtime snapshot/actions.
 */
export function buildFieldRenderProps(params: {
  fieldDef: FieldContract;
  value: RuntimeValue;
  disabled: boolean;
  error?: string;
  onChange: (fieldId: string, value: RuntimeValue) => void;
}): FieldRenderProps {
  const { fieldDef, value, disabled, error, onChange } = params;
  return { fieldDef, value, disabled, error, onChange };
}

export function FieldRendererWithResolver(props: {
  fieldDef: FieldContract;
  value: RuntimeValue;
  disabled?: boolean;
  error?: string;
  onChange: (fieldId: string, value: RuntimeValue) => void;
}) {
  const { fieldDef, value, disabled, error, onChange } = props;

  // resolution happens inside DynamicFieldRenderer → componentRegistryBase
  return <DynamicFieldRenderer fieldDef={fieldDef} value={value} disabled={disabled} error={error} onChange={onChange} />;
}
