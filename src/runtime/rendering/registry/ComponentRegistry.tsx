import type React from "react";

import FieldText from "../../renderer/fields/FieldText";
import type { RuntimeFieldType, RuntimeValue } from "../../types/runtimeContracts";
import type { FieldRenderProps } from "./ComponentRegistryBase";

function createFallback(typeLabel: string): React.FC<FieldRenderProps> {
  const Fallback: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(fieldDef.id, e.target.value as unknown as RuntimeValue);
    };

    return (
      <div className="runtime-field">
        <label htmlFor={fieldDef.id} className="runtime-field-label">
          {fieldDef.label}
          {fieldDef.required ? (
            <span className="runtime-required" aria-hidden="true">
              {" "}*
            </span>
          ) : null}
        </label>

        <input
          id={fieldDef.id}
          type="text"
          disabled={disabled}
          value={value == null ? "" : String(value)}
          placeholder={`Unsupported field type: ${typeLabel}`}
          onChange={handleChange}
          className={`runtime-input${error ? " runtime-input-error" : ""}`}
          aria-invalid={!!error}
        />

        {error ? (
          <span className="runtime-field-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    );
  };

  return Fallback;
}

const fallbackCache = new Map<string, React.ComponentType<FieldRenderProps>>();

function getOrCreateFallback(fieldType: RuntimeFieldType): React.ComponentType<FieldRenderProps> {
  const existing = fallbackCache.get(fieldType);
  if (existing) return existing;

  const comp = createFallback(String(fieldType));
  fallbackCache.set(fieldType, comp);
  return comp;
}

/**
 * ComponentRegistry (Sprint 25)
 * Registry for atomic field components.
 *
 * Note: Sprint 25 currently only guarantees FieldText atomic exists.
 * Other field types resolve to a safe fallback until their atomic components are implemented.
 */
export const ComponentRegistry = {
  getComponent(fieldType: RuntimeFieldType): React.ComponentType<FieldRenderProps> {
    if (fieldType === "text") {
      return FieldText as unknown as React.ComponentType<FieldRenderProps>;
    }
    return getOrCreateFallback(fieldType);
  },
};

