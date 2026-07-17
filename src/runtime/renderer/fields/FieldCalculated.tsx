/**
 * FieldCalculated.tsx (Sprint 25.15)
 * Placeholder renderer for field type: calculated.
 * Pure renderer only — no formulas/calculation engine/runtime orchestration.
 */
import type React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

const FieldCalculated: React.FC<FieldRenderProps> = ({ fieldDef, value, disabled, error }) => {
  const errorId = `${fieldDef.id}-error`;
  const displayValue = value == null ? "No calculated value" : String(value);

  return (
    <div className="runtime-field">
      <label htmlFor={fieldDef.id} className="runtime-field-label">
        {fieldDef.label}
        {fieldDef.required && (
          <span className="runtime-required" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>

      <div
        id={fieldDef.id}
        className={`runtime-calculated-display${error ? " runtime-input-error" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        aria-disabled={disabled}
      >
        {displayValue}
      </div>

      {error ? (
        <span id={errorId} className="runtime-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
};

export default FieldCalculated;

