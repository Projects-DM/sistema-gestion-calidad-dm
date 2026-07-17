/**
 * FieldCheckbox.tsx (Sprint 25.7)
 * Atomic renderer for field type: checkbox.
 * Receives standardized FieldRenderProps — no business logic.
 */
import type React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

const FieldCheckbox: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  const checked = value === true;

  return (
    <div className="runtime-field">
      <label htmlFor={fieldDef.id} className="runtime-field-label">
        {fieldDef.label}
        {fieldDef.required && <span className="runtime-required" aria-hidden="true"> *</span>}
      </label>

      <input
        id={fieldDef.id}
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(fieldDef.id, e.target.checked)}
        className={`runtime-checkbox${error ? " runtime-input-error" : ""}`}
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

export default FieldCheckbox;

