
import type { FieldContract } from "../types/runtimeContracts";
import { FieldRendererWithResolver } from "../registry/registryResolver";
import { useRuntimeField } from "../hooks/useRuntimeField";

export type LayoutRendererProps = {
  formFields: FieldContract[];
  /**
   * Optional grouping strategy (Sprint 2 keeps it minimal).
   * If provided, fields are grouped by key and rendered as sections.
   */
  groupBy?: (field: FieldContract) => string;
};

/**
 * Layout rendering base (Sprint 2):
 * - Sorts fields by orderIndex
 * - Optionally groups fields
 * - Delegates actual field UI to the registry resolver
 * - Uses useRuntimeField() for centralized state binding
 *
 * IMPORTANT: No workflow/persistence/validation business logic here.
 */
export function LayoutRendererBase({ formFields, groupBy }: LayoutRendererProps) {
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
              <RuntimeBoundField key={fieldDef.id} fieldDef={fieldDef} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RuntimeBoundField({ fieldDef }: { fieldDef: FieldContract }) {
  const { value, disabled, error, onChange } = useRuntimeField(fieldDef);

  if (fieldDef.hidden) return null;

  return (
    <FieldRendererWithResolver
      fieldDef={fieldDef}
      value={value}
      disabled={disabled}
      error={error}
      onChange={onChange}
    />
  );
}
