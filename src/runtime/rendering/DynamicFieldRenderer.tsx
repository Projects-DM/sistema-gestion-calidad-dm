import React from "react";

import type { FieldDefinition, FieldRenderProps } from "./registry/ComponentRegistryBase";
import { ComponentRegistry } from "./registry/ComponentRegistry";
import { normalizeFieldType } from "./registry/FieldTypeNormalizer";


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

  const originalType = fieldDef.fieldType;
  const normalizedType = normalizeFieldType(originalType);
  const component = ComponentRegistry.get(normalizedType);


  const fieldRenderProps: FieldRenderProps = {
    fieldDef,
    value,
    onChange,
    disabled: Boolean(disabled),
    error,
  };

  // Debug (only in browser)
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug("[FieldTypeMapping]", {
      original: originalType,
      normalized: normalizedType,
      componentFound: Boolean(component),
    });
  }


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

