import React, { Suspense } from "react";
import type { FieldContract, RuntimeFieldType, RuntimeValue } from "../types/runtimeContracts";

export type FieldRenderProps<TValue = RuntimeValue> = {
  fieldDef: FieldContract;
  value: TValue;
  disabled?: boolean;
  error?: string;
  onChange: (fieldId: string, value: RuntimeValue) => void;
};

export type ComponentRegistryEntry = {
  fieldTypes: RuntimeFieldType[];
  // Component must be compatible with FieldRenderProps (atomics receive standardized props)
  component: React.ComponentType<FieldRenderProps>;
};

type RegistryMap = Partial<Record<RuntimeFieldType, ComponentRegistryEntry>>;

const FallbackInput: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  return (
    <div className="runtime-field">
      <label className="runtime-field-label">{fieldDef.label}</label>
      <input
        className={`runtime-input ${error ? "runtime-input-error" : ""}`}
        type="text"
        value={typeof value === "string" ? value : value == null ? "" : String(value)}
        disabled={disabled}
        onChange={(e) => onChange(fieldDef.id, e.target.value)}
      />
      {error ? <div className="runtime-error">{error}</div> : null}
    </div>
  );
};

export class ComponentRegistryBase {
  private map: RegistryMap = {};

  register(entry: ComponentRegistryEntry) {
    for (const ft of entry.fieldTypes) this.map[ft] = entry;
  }

  resolve(fieldType: RuntimeFieldType) {
    return this.map[fieldType]?.component ?? FallbackInput;
  }

  renderField(fieldDef: FieldContract, props: Omit<FieldRenderProps, "fieldDef">) {
    const Component = this.resolve(fieldDef.fieldType);
    return (
      <Suspense fallback={<div className="runtime-skeleton" />}>
        <Component fieldDef={fieldDef} {...props} />
      </Suspense>
    );
  }
}

export const componentRegistryBase = new ComponentRegistryBase();
