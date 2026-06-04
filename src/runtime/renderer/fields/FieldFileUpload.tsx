/**
 * FieldFileUpload.tsx (Sprint 25.13)
 * Atomic renderer for field type: file_upload.
 * Receives standardized FieldRenderProps — no business logic.
 */
import React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

const FieldFileUpload: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  const errorId = `${fieldDef.id}-error`;

  const accept = (fieldDef.options?.accept as string | undefined) ?? undefined;
  const multiple = Boolean(fieldDef.options?.multiple);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      onChange(fieldDef.id, null);
      return;
    }

    const selectedFiles: File[] = Array.from(files);
    onChange(fieldDef.id, selectedFiles as unknown as never);
  };

  return (
    <div className="runtime-field">
      <label htmlFor={fieldDef.id} className="runtime-field-label">
        {fieldDef.label}
        {fieldDef.required && <span className="runtime-required" aria-hidden="true"> *</span>}
      </label>

      <input
        id={fieldDef.id}
        type="file"
        required={fieldDef.required}
        disabled={disabled}
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className={`runtime-input${error ? " runtime-input-error" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />

      {error ? (
        <span id={errorId} className="runtime-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
};

export default FieldFileUpload;

