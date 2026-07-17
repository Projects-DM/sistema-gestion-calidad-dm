import type React from "react";

import type { FieldDefinition, FieldRenderProps } from "./registry/ComponentRegistryBase";
import { ComponentRegistry } from "./registry/ComponentRegistry";

export type DynamicFieldRendererProps = {
  fieldDef: FieldDefinition;
  value: FieldRenderProps["value"];
  onChange: FieldRenderProps["onChange"];
  disabled?: boolean;
  error?: FieldRenderProps["error"];
};

const UnsupportedFieldTypeFallback: React.FC<{ fieldType: string; label: string; error?: string }> = ({
  fieldType,
  label,
  error,
}) => {
  return (
    <div className="runtime-field runtime-field-unsupported">
      <label className="runtime-field-label">{label}</label>
      <div className="runtime-unsupported-warning" role="alert">
        Unsupported field type: {fieldType}
      </div>
      {error ? (
        <div className="runtime-field-error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
};

export function DynamicFieldRenderer(props: DynamicFieldRendererProps) {
  const { fieldDef, value, onChange, disabled, error } = props;

  const component = ComponentRegistry.get(fieldDef.fieldType);

  const fieldRenderProps: FieldRenderProps = {
    fieldDef,
    value,
    onChange,
    disabled: Boolean(disabled),
    error,
  };

  if (!component) {
    return (
      <UnsupportedFieldTypeFallback
        fieldType={String(fieldDef.fieldType)}
        label={fieldDef.label}
        error={error}
      />
    );
  }

  return component(fieldRenderProps) as unknown as React.ReactElement;
}

