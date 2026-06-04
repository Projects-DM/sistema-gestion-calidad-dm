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
export type LayoutEngineProps = {
  layout: LayoutDefinition;
  formData: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
};

/**
 * LayoutEngine component.
 */
export const LayoutEngine: React.FC<LayoutEngineProps> = ({ layout, formData, onChange, disabled, errors }) => {
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
                  // If the higher layer stores field definitions inside formData, this contract
                  // will be compatible. Otherwise, consumers should adapt accordingly.
                  const fieldDef = (formData as Record<string, unknown> & {
                    __fieldDefs?: Record<string, unknown>;
                  }).__fieldDefs?.[fieldId] as DynamicFieldRendererProps["fieldDef"] | undefined;

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
                        disabled={Boolean(disabled)}
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

