/**
 * FieldRadio.tsx (Sprint 25.8)
 * Atomic renderer for field type: radio.
 * Receives standardized FieldRenderProps — no business logic.
 */
import type React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

type RadioOption = {
  label: string;
  value: string;
};

const FieldRadio: React.FC<FieldRenderProps> = ({ fieldDef, value, onChange, disabled, error }) => {
  const selected = value == null ? "" : String(value);

  const optionsAny = fieldDef.options?.options as unknown;
  const options = Array.isArray(optionsAny) ? (optionsAny as RadioOption[]) : [];

  const errorId = `${fieldDef.id}-error`;

  return (
    <div className="runtime-field">
      <fieldset className="runtime-fieldset" disabled={disabled}>
        <legend className="runtime-field-label">
          {fieldDef.label}
          {fieldDef.required && <span className="runtime-required" aria-hidden="true"> *</span>}
        </legend>

        <div className="runtime-radio-group">
          {options.map((opt) => {
            const optionId = `${fieldDef.id}-${String(opt.value)}`;
            const checked = selected === String(opt.value);

            return (
              <label key={String(opt.value)} htmlFor={optionId} className="runtime-radio-option">
                <input
                  id={optionId}
                  type="radio"
                  name={fieldDef.id}
                  value={String(opt.value)}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(fieldDef.id, String(opt.value))}
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
                />
                <span className="runtime-radio-label">{opt.label}</span>
              </label>
            );
          })}
        </div>

        {error && (
          <span id={errorId} className="runtime-field-error" role="alert">
            {error}
          </span>
        )}
      </fieldset>
    </div>
  );
};

export default FieldRadio;

