/**
 * FieldNumber.tsx (Sprint 25.5)
 * Atomic numeric renderer for field type: number.
 * Receives standardized FieldRenderProps — no business logic.
 */
import type React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

const FieldNumber: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  const strVal = value == null ? "" : String(value);

  const min = fieldDef.options?.min as number | undefined;
  const max = fieldDef.options?.max as number | undefined;
  const placeholder = (fieldDef.options?.placeholder as string | undefined) ?? "";

  return (
    <div className="runtime-field">
      <label htmlFor={fieldDef.id} className="runtime-field-label">
        {fieldDef.label}
        {fieldDef.required && <span className="runtime-required" aria-hidden="true"> *</span>}
      </label>

      <input
        id={fieldDef.id}
        type="number"
        required={fieldDef.required}
        disabled={disabled}
        value={strVal}
        placeholder={placeholder}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = e.target.value;
          const next = raw === "" ? null : Number(raw);
          onChange(fieldDef.id, next);
        }}
        className={`runtime-input${error ? " runtime-input-error" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldDef.id}-error` : undefined}
      />

      {error && (
        <span id={`${fieldDef.id}-error`} className="runtime-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

export default FieldNumber;

