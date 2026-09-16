File path: src/runtime/form/engine/FormRendererEngine.tsx
Código completo:


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
  hiddenFields?: Set<string>;
  disabledFields?: Set<string>;
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
  hiddenFields,
  disabledFields,
}) => {
  return (
    <LayoutEngine
      layout={layout}
      formData={formData as Record<string, RuntimeValue>}
      onChange={onChange}
      disabled={disabled}
      errors={errors}
      hiddenFields={hiddenFields}
      disabledFields={disabledFields}
    />
  );
};

export default FormRendererEngine;
File path: src/runtime/layout/engine/LayoutEngine.tsx
Código completo:


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
  hiddenFields?: Set<string>;
  disabledFields?: Set<string>;
};


/**
 * LayoutEngine component.
 */
export const LayoutEngine: React.FC<LayoutEngineProps> = ({ layout, formData, onChange, disabled, errors, hiddenFields, disabledFields }) => {
  return (
    <div className="runtime-layout">
      {layout.sections.map((section) => (
        <div key={section.id} className="runtime-section">
          {section.title ? <h2>{section.title}</h2> : null}
          {section.description ? <p>{section.description}</p> : null}

          {section.columns.map((column) => (
            <div key={column.id} className="runtime-column" style={{ width: ${column.width}% }}>
              <div className="runtime-field-container">
                {column.fields.map((fieldRef) => {
                  const fieldId = fieldRef.fieldId;

                  const fieldDef = (formData as Record<string, unknown> & {
                    __fieldDefs?: Record<string, unknown>;
                  }).__fieldDefs?.[fieldId] as DynamicFieldRendererProps["fieldDef"] | undefined;

                  // Ocultar
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

                  // Deshabilitar
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
          ))}
        </div>
      ))}
    </div>
  );
};

export default LayoutEngine;
Explicación (cómo se aplican hiddenFields y disabledFields)
FormRendererEngine:
Propaga hiddenFields y disabledFields hacia LayoutEngine.
LayoutEngine:
Oculta un campo si hiddenFields?.has(fieldId) ⇒ return null
Deshabilita un campo si:
disabled (global) es true, o
disabledFields?.has(fieldId) es true
El valor calculado se pasa a DynamicFieldRenderer vía su prop disabled.
npm run -s build
Se ejecutó npm run -s build y finalizó con éxito (sin errores de compilación).


Task Completed
SPRINT 37 finalizado. Solo se modificaron los archivos permitidos y se aplicó la propagación de hiddenFields/disabledFields.

Entregables (código completo):

src/runtime/form/engine/FormRendererEngine.tsx
src/runtime/layout/engine/LayoutEngine.tsx
Comportamiento:

hiddenFields?.has(fieldId) => ocultar (return null) en LayoutEngine
disabled global o disabledFields?.has(fieldId) => pasar disabled=true a DynamicFieldRenderer
Build:

npm run -s build ejecutado correctamente (✓ built in ~1.26s).

Excelente. 🚀

Si el código compila correctamente, entonces acabas de cruzar uno de los hitos más importantes de toda la arquitectura Runtime.

✅ Verificación Arquitectónica Sprint 37

Objetivo del Sprint:

RulesEngine
   ↓

hiddenFields
disabledFields

   ↓

LayoutEngine

   ↓

UI

Resultado:

✅ FormRendererEngine ahora recibe:

hiddenFields
disabledFields

y los propaga.

✅ LayoutEngine ahora:

Oculta:

if (hiddenFields?.has(fieldId)) {
    return null;
}

Deshabilita:

disabled ||
disabledFields?.has(fieldId)

Eso significa que ya existe:

Rules
 ↓

Visibility
 ↓

Layout
 ↓

Renderer
 ↓

Field Components
Lo que acabamos de ganar

Antes:

Campo A = NO

↓

Rule Engine calcula

↓

NADA ocurre visualmente

Ahora:

Campo A = NO

↓

RulesEngine

↓

hiddenFields

↓

LayoutEngine

↓

Campo desaparece

y también:

Campo A = NO

↓

RulesEngine

↓

disabledFields

↓

DynamicFieldRenderer

↓

Campo bloqueado
Estado actual del Runtime
Metadata Layer
FormRegistry              ✅
FieldRegistry             ✅
LayoutRegistry            ✅
Resolution Layer
FormRuntimeResolver       ✅
LayoutRuntimeResolver     ✅
RuntimeBuilder            ✅
Rules Layer
RuleContracts             ✅
RulesEngine               ✅
useRulesEngine            ✅
Visibility propagation    ✅
Disable propagation       ✅
Computed values           ✅
Rendering Layer
FormRuntimeHost           ✅
FormRendererEngine        ✅
LayoutEngine              ✅
DynamicFieldRenderer      ✅
ComponentRegistry         ✅