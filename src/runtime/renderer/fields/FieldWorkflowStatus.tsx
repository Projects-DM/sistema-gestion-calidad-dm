/**
 * FieldWorkflowStatus.tsx (Sprint 25.16)
 * Pure renderer only — visualization for field type: workflow_status.
 */
import type React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

const FieldWorkflowStatus: React.FC<FieldRenderProps> = ({ fieldDef, value, disabled, error }) => {
  const errorId = `${fieldDef.id}-error`;
  const displayValue = value == null ? "No status assigned" : String(value);

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
        className={`runtime-workflow-status${error ? " runtime-input-error" : ""}`}
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

export default FieldWorkflowStatus;

