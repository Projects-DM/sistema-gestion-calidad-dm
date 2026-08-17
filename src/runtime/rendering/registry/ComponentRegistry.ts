/**
 * ComponentRegistry (Sprint 25.2 / 25.4 update)
 * Registry only — no orchestration, no JSX.
 */

import type { RuntimeFieldType } from "../../types/runtimeContracts";
import type { FieldRenderProps } from "./ComponentRegistryBase";

import FieldText from "../../renderer/fields/FieldText";
import FieldTextarea from "../../renderer/fields/FieldTextarea";
import FieldNumber from "../../renderer/fields/FieldNumber";
import FieldSelect from "../../renderer/fields/FieldSelect";
import FieldCheckbox from "../../renderer/fields/FieldCheckbox";
import FieldRadio from "../../renderer/fields/FieldRadio";
import FieldMultiSelect from "../../renderer/fields/FieldMultiSelect";
import FieldFileUpload from "../../renderer/fields/FieldFileUpload";
import FieldSignature from "../../renderer/fields/FieldSignature";
import FieldCalculated from "../../renderer/fields/FieldCalculated";
import FieldWorkflowStatus from "../../renderer/fields/FieldWorkflowStatus";
import FieldTable from "../../renderer/fields/FieldTable";
import FieldInformative from "../../renderer/fields/FieldInformative";

/**
 * Component type for a given field type.


 * Kept as a prop-typed contract so field components remain strongly typed.
 */
export type FieldComponent = (props: FieldRenderProps) => unknown;

/**
 * Strongly typed field component registry.
 */
export interface IComponentRegistry<TComponent> {
  register(fieldType: RuntimeFieldType, component: TComponent): void;
  get(fieldType: RuntimeFieldType): TComponent | undefined;
  has(fieldType: RuntimeFieldType): boolean;
  getRegisteredTypes(): RuntimeFieldType[];
}

/**
 * Internal registry implementation.
 */
const registry = new Map<RuntimeFieldType, FieldComponent>();

const register = (fieldType: RuntimeFieldType, component: FieldComponent) => {
  registry.set(fieldType, component);
};

const get = (fieldType: RuntimeFieldType): FieldComponent | undefined => {
  return registry.get(fieldType);
};

const has = (fieldType: RuntimeFieldType): boolean => {
  return registry.has(fieldType);
};

const getRegisteredTypes = (): RuntimeFieldType[] => {
  return Array.from(registry.keys());
};

/**
 * Initial registration required by Sprint 25.2 / 25.4:
 * - text -> FieldText
 * - textarea -> FieldTextarea
 */
register("text", FieldText as unknown as FieldComponent);
register("textarea", FieldTextarea as unknown as FieldComponent);
register("number", FieldNumber as unknown as FieldComponent);
register("select", FieldSelect as unknown as FieldComponent);
register("checkbox", FieldCheckbox as unknown as FieldComponent);
register("radio", FieldRadio as unknown as FieldComponent);
register("multiselect", FieldMultiSelect as unknown as FieldComponent);
register("file_upload", FieldFileUpload as unknown as FieldComponent);
register("signature", FieldSignature as unknown as FieldComponent);
register("calculated", FieldCalculated as unknown as FieldComponent);
register("workflow_status", FieldWorkflowStatus as unknown as FieldComponent);
register("table", FieldTable as unknown as FieldComponent);
register("informative", FieldInformative as unknown as FieldComponent);







/**
 * Public API consumed by later rendering/engine layers.
 */

export const ComponentRegistry: IComponentRegistry<FieldComponent> = {
  register,
  get,
  has,
  getRegisteredTypes,
};

