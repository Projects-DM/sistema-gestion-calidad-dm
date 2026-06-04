/**
 * FieldText.tsx (Sprint 25)
 * Atomic renderer for: text, email, search field types.
 * Receives standardized FieldRenderProps — no business logic.
 */
import React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

const FieldText: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  const strVal = value == null ? "" : String(value);

  return (
    <div className="runtime-field">
      <label htmlFor={fieldDef.id} className="runtime-field-label">
        {fieldDef.label}
        {fieldDef.required && <span className="runtime-required" aria-hidden="true"> *</span>}
      </label>
      <input
        id={fieldDef.id}
        type="text"
        required={fieldDef.required}
        disabled={disabled}
        value={strVal}
        placeholder={(fieldDef.options?.placeholder as string) ?? ""}
        onChange={(e) => onChange(fieldDef.id, e.target.value)}
        className={`runtime-input${error ? " runtime-input-error" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldDef.id}-error` : undefined}
        maxLength={(fieldDef.options?.maxLength as number) ?? undefined}
      />
      {error && (
        <span id={`${fieldDef.id}-error`} className="runtime-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

export default FieldText;
