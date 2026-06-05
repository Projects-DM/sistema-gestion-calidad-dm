/**
 * FormRuntimeContracts (Sprint 30)
 * Contracts only for runtime resolved form model.
 */

export type RuntimeFormModel = {
  formId: string;
  formName: string;
  layoutId: string;
  fieldIds: string[];
  ruleIds: string[];
};

