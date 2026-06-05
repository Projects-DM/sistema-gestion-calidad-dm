/**
 * FormContracts (Sprint 29)
 * Contracts only — runtime forms metadata registry.
 */

export type FormDefinition = {
  id: string;
  name: string;
  description?: string;
  layoutId: string;
  fieldIds: string[];
  ruleIds?: string[];
};

