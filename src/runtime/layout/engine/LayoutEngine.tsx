/**
 * LayoutEngine.tsx (Sprint 26.2)
 * Structural renderer for full layouts.
 *
 * Responsibilities:
 * - Render layout sections -> columns -> dynamic fields
 * - Delegates field rendering to DynamicFieldRenderer
 *
 * Restrictions:
 * - No validation, no persistence, no runtime orchestration
 */

import React from "react";

import type { LayoutDefinition } from "../contracts/LayoutContracts";
import type { RuntimeValue } from "../../types/runtimeContracts";

import { DynamicFieldRenderer } from "../../rendering/DynamicFieldRenderer";
import type { DynamicFieldRendererProps } from "../../rendering/DynamicFieldRenderer";

/**
 * LayoutEngine props.
 */
import type { RuntimeFieldDefinition } from "../../fields/contracts/FieldContracts";

export type LayoutEngineProps = {
  layout: LayoutDefinition;
  formData: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
  hiddenFields?: Set<string>;
  disabledFields?: Set<string>;
  fields?: RuntimeFieldDefinition[];
};



/**
 * LayoutEngine component.
 */
export const LayoutEngine: React.FC<LayoutEngineProps> = ({ layout, formData, fields, onChange, disabled, errors, hiddenFields, disabledFields }) => {
  return (
    <div className="runtime-layout">
      {layout.sections.map((section) => (
        <div key={section.id} className="runtime-section">
          {section.title ? <h2>{section.title}</h2> : null}
          {section.description ? <p>{section.description}</p> : null}

          {section.columns.map((column) => (
            <div key={column.id} className="runtime-column" style={{ width: `${column.width}%` }}>
              <div className="runtime-field-container">
                {column.fields.map((fieldRef) => {
                  const fieldId = fieldRef.fieldId;

                  // DynamicFieldRendererProps expects fieldDef to be a FieldContract.
                  // LayoutContracts intentionally only contains references, so the concrete field
                  // contract must be supplied by a higher layer via formData.
                  //
                  // If fields are provided by the runtime, use them.
                  // Compatibility layer: if not, fallback to temporary `__fieldDefs` inside formData.
                  const runtimeFieldDef = fields?.find((f) => f.id === fieldId) as DynamicFieldRendererProps["fieldDef"] | undefined;

                  const fieldDefFromCompat = (formData as Record<string, unknown> & {
                    __fieldDefs?: Record<string, unknown>;
                  }).__fieldDefs?.[fieldId] as DynamicFieldRendererProps["fieldDef"] | undefined;

                  const fieldDef = runtimeFieldDef ?? fieldDefFromCompat;


                  if (hiddenFields?.has(fieldId)) {
                    return null;
                  }

                  if (!fieldDef) {
                    return (
                      <div key={fieldId} className="runtime-field-container">
                        {"Missing field definition"}
                      </div>
                    );
                  }

                  const value = formData[fieldId] as RuntimeValue;
                  const error = errors?.[fieldId];

                  return (
                    <div key={fieldId} className="runtime-field-container">
                      <DynamicFieldRenderer
                        fieldDef={fieldDef}
                        value={value}
                        disabled={Boolean(disabled) || (disabledFields?.has(fieldId) ?? false)}
                        error={error}
                        onChange={(id, nextValue) => onChange(id, nextValue)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default LayoutEngine;

