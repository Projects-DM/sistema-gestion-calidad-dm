/**
 * FieldSignature.tsx (Sprint 25.14)
 * Placeholder renderer for field type: signature.
 * Pure renderer only — no persistence/canvas/drawing engine.
 */
import React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

const FieldSignature: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  const errorId = `${fieldDef.id}-error`;

  const handleClick = () => {
    // Placeholder behavior: keep contract compatibility.
    // Future capture engine will replace this with real signature output.
    if (disabled) return;
    onChange(fieldDef.id, value);
  };

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
        className={`runtime-signature-placeholder${error ? " runtime-input-error" : ""}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
      >
        Signature component pending capture engine
      </div>

      {error ? (
        <span id={errorId} className="runtime-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
};

export default FieldSignature;

