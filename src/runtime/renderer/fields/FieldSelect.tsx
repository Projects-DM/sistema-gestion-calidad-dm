/**
 * FieldSelect.tsx (Sprint 25.6)
 * Atomic renderer for field type: select.
 * Receives standardized FieldRenderProps — no business logic.
 */
import type React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

type SelectOption = {
  label: string;
  value: string;
};

const FieldSelect: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  const strVal = value == null ? "" : String(value);

  const placeholder = (fieldDef.options?.placeholder as string | undefined) ?? "";
  const optionsAny = fieldDef.options?.options as unknown;
  const options = Array.isArray(optionsAny) ? (optionsAny as SelectOption[]) : [];

  return (
    <div className="runtime-field">
      <label htmlFor={fieldDef.id} className="runtime-field-label">
        {fieldDef.label}
        {fieldDef.required && <span className="runtime-required" aria-hidden="true"> *</span>}
      </label>

      <select
        id={fieldDef.id}
        required={fieldDef.required}
        disabled={disabled}
        value={strVal}
        onChange={(e) => onChange(fieldDef.id, e.target.value)}
        className={`runtime-select${error ? " runtime-input-error" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldDef.id}-error` : undefined}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <span id={`${fieldDef.id}-error`} className="runtime-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

export default FieldSelect;

