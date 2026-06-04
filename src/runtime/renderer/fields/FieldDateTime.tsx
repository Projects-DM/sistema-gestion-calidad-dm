/**
 * FieldDateTime.tsx (Sprint 25.11)
 * Atomic renderer for field type: datetime.
 * Receives standardized FieldRenderProps — no business logic.
 */
import React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

const FieldDateTime: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  const strVal = value == null ? "" : String(value);

  const minDateTime = (fieldDef.options?.minDateTime as string | undefined) ?? undefined;
  const maxDateTime = (fieldDef.options?.maxDateTime as string | undefined) ?? undefined;

  const errorId = `${fieldDef.id}-error`;

  return (
    <div className="runtime-field">
      <label htmlFor={fieldDef.id} className="runtime-field-label">
        {fieldDef.label}
        {fieldDef.required && <span className="runtime-required" aria-hidden="true"> *</span>}
      </label>

      <input
        id={fieldDef.id}
        type="datetime-local"
        required={fieldDef.required}
        disabled={disabled}
        value={strVal}
        min={minDateTime}
        max={maxDateTime}
        onChange={(e) => onChange(fieldDef.id, e.target.value)}
        className={`runtime-input${error ? " runtime-input-error" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />

      {error && (
        <span id={errorId} className="runtime-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

export default FieldDateTime;

