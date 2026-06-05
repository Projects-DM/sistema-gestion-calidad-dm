/**
 * FormRendererEngine.tsx (Sprint 27)
 * Stateless orchestration layer for full form rendering.
 *
 * Responsibilities:
 * - Render LayoutDefinition structure via LayoutEngine
 * - Bind field values from formData
 * - Delegate each field UI to DynamicFieldRenderer
 * - Handle missing fieldIds without crashing
 */

import React from "react";

import type { LayoutDefinition } from "../../layout/contracts/LayoutContracts";
import type { RuntimeValue } from "../../types/runtimeContracts";

import { LayoutEngine } from "../../layout/engine/LayoutEngine";

export type FormRendererEngineProps = {
  layout: LayoutDefinition;
  formData: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
};

/**
 * FormRendererEngine
 */
export const FormRendererEngine: React.FC<FormRendererEngineProps> = ({
  layout,
  formData,
  onChange,
  disabled,
  errors,
}) => {
  return <LayoutEngine layout={layout} formData={formData as Record<string, RuntimeValue>} onChange={onChange} disabled={disabled} errors={errors} />;
};

export default FormRendererEngine;

