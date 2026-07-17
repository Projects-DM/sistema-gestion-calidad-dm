/**
 * FieldTextarea.tsx (Sprint 25.4)
 * Atomic renderer for: textarea field type.
 * Receives standardized FieldRenderProps — no business logic.
 */
import type React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

const FieldTextarea: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  const strVal = value == null ? "" : String(value);

  const rows = (fieldDef.options?.rows as number | undefined) ?? 4;
  const placeholder = (fieldDef.options?.placeholder as string | undefined) ?? "";

  return (
    <div className="runtime-field">
      <label htmlFor={fieldDef.id} className="runtime-field-label">
        {fieldDef.label}
        {fieldDef.required && <span className="runtime-required" aria-hidden="true"> *</span>}
      </label>

      <textarea
        id={fieldDef.id}
        required={fieldDef.required}
        disabled={disabled}
        value={strVal}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(fieldDef.id, e.target.value)}
        className={`runtime-textarea${error ? " runtime-input-error" : ""}`}
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

export default FieldTextarea;

