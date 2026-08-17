/**
 * FieldInformative.tsx (Sprint 331)
 * Atomic renderer for the "informative" field type (Texto informativo).
 * Presentational only: displays the label as a heading. No input, no value,
 * no interaction, no innerHTML — plain text for safety.
 */
import type React from "react";
import type { FieldRenderProps } from "../../registry/ComponentRegistryBase";

const FieldInformative: React.FC<FieldRenderProps> = ({ fieldDef }) => {
  return (
    <div className="runtime-field runtime-field-informative">
      <div className="runtime-field-informative-heading">
        {fieldDef.label}
      </div>
    </div>
  );
};

export default FieldInformative;
