import React from "react";
import type { FieldContract, RuntimeValue } from "../types/runtimeContracts";
import { FieldRendererWithResolver } from "../registry/registryResolver";

export type LayoutRendererProps = {
  formFields: FieldContract[];
  values: Record<string, RuntimeValue>;
  disabled: boolean;
  validationErrors?: Record<string, string>;
  onChange: (fieldId: string, newValue: RuntimeValue) => void;
  /**
   * Optional grouping strategy (Sprint 1 keeps it minimal).
   * If provided, fields are grouped by key and rendered as sections.
   */
  groupBy?: (field: FieldContract) => string;
};

/**
 * Layout rendering base (Sprint 1):
 * - Sorts fields by orderIndex
 * - Optionally groups fields
 * - Delegates actual field UI to the registry resolver
 *
 * IMPORTANT: No workflow/persistence/validation business logic here.
 */
export function LayoutRendererBase({
  formFields,
  values,
  disabled,
  validationErrors,
  onChange,
  groupBy,
}: LayoutRendererProps) {
  const sorted = [...formFields].sort((a, b) => a.orderIndex - b.orderIndex);

  const grouped = groupBy
    ? sorted.reduce<Record<string, FieldContract[]>>((acc, f) => {
        const key = groupBy(f);
        acc[key] = acc[key] ?? [];
        acc[key].push(f);
        return acc;
      }, {})
    : { __default__: sorted };

  const groups = Object.entries(grouped);

  return (
    <div className="runtime-layout">
      {groups.map(([key, fields]) => (
        <section key={key} className="runtime-section" aria-label={key}>
          {groupBy ? <h3 className="runtime-section-title">{key}</h3> : null}
          <div className="runtime-grid">
            {fields.map((fieldDef) => (
              <FieldRendererWithResolver
                key={fieldDef.id}
                fieldDef={fieldDef}
                value={values[fieldDef.id]}
                disabled={disabled}
                error={validationErrors?.[fieldDef.id]}
                onChange={onChange}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
