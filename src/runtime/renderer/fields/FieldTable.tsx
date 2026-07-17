/**
 * FieldTable.tsx (Sprint 25.17A)
 * Visual-only renderer for field type: table.
 */
import type React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

type TableColumnDef = {
  key: string;
  label: string;
};

type TableRow = Record<string, unknown>;

const FieldTable: React.FC<FieldRenderProps> = ({ fieldDef, value, disabled, error }) => {
  const errorId = `${fieldDef.id}-error`;

  const columns = (fieldDef.options?.columns as TableColumnDef[] | undefined) ?? [];
  const rows = (value as TableRow[] | null | undefined) ?? [];

  const hasColumns = Array.isArray(columns) && columns.length > 0;
  const hasRows = Array.isArray(rows) && rows.length > 0;

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

      <table
        id={fieldDef.id}
        className={`runtime-table${error ? " runtime-input-error" : ""}`}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        aria-disabled={disabled}
      >
        {!hasColumns ? (
          <tbody>
            <tr>
              <td>{"No columns configured"}</td>
            </tr>
          </tbody>
        ) : !hasRows ? (
          <>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{"No rows"}</td>
              </tr>
            </tbody>
          </>
        ) : (
          <>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((c) => (
                    <td key={c.key}>{String((row as TableRow)[c.key] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </>
        )}
      </table>

      {error ? (
        <span id={errorId} className="runtime-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
};

export default FieldTable;

