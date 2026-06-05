/**
 * RuntimeBuilderContracts (Sprint 32)
 * Contracts for runtime builder output.
 */

import type { LayoutDefinition } from "../../layout/contracts/LayoutContracts";
import type { RuntimeFieldDefinition } from "../../fields/contracts/FieldContracts";

export interface RuntimeResolvedForm {
  formId: string;
  formName: string;
  layoutId: string;
  fieldIds: string[];
  ruleIds: string[];

  /**
   * Optional because Sprint 32 explicitly forbids loading layouts.
   */
  layout?: LayoutDefinition;

  fields: RuntimeFieldDefinition[];
}

