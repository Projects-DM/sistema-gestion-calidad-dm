/**
 * FieldMultiSelect.tsx (Sprint 25.12)
 * Atomic renderer for field type: multiselect.
 * Receives standardized FieldRenderProps — no business logic.
 */
import type React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

type SelectOption = {
  label: string;
  value: string;
};

const FieldMultiSelect: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  const selectedValues = Array.isArray(value) ? value.map((v) => String(v)) : [];

  const placeholder = (fieldDef.options?.placeholder as string | undefined) ?? "";
  const optionsAny = fieldDef.options?.options as unknown;
  const options = Array.isArray(optionsAny) ? (optionsAny as SelectOption[]) : [];

  const errorId = `${fieldDef.id}-error`;

  return (
    <div className="runtime-field">
      <label htmlFor={fieldDef.id} className="runtime-field-label">
        {fieldDef.label}
        {fieldDef.required && <span className="runtime-required" aria-hidden="true"> *</span>}
      </label>

      <select
        id={fieldDef.id}
        required={fieldDef.required}
        multiple
        disabled={disabled}
        value={selectedValues}
        onChange={(e) => {
          const values = Array.from(e.target.selectedOptions).map((opt) => opt.value);
          onChange(fieldDef.id, values);
        }}
        className={`runtime-select${error ? " runtime-input-error" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      >
        {placeholder ? <option disabled value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>

      {error ? (
        <span id={errorId} className="runtime-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
};

export default FieldMultiSelect;

