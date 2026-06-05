/**
 * RuntimeBuilderContracts (Sprint 32)
 * Contracts for runtime builder output.
 */

import type { LayoutDefinition } from "../../layout/contracts/LayoutContracts";
import type { RuntimeFieldDefinition } from "../../fields/contracts/FieldContracts";
import type { FieldRule } from "../../rules/contracts/RuleContracts";


export interface RuntimeResolvedForm {
  formId: string;
  formName: string;
  layoutId: string;
  fieldIds: string[];
  ruleIds: string[];

  layout?: LayoutDefinition;

  rules?: FieldRule[];


  fields: RuntimeFieldDefinition[];
}


